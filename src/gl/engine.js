import { m4, mul, perspective, lookAt, invert, normalMat, compose, qid, hex, ease as EASE } from './math.js';
import { plane } from './geo.js';

const DITHER = `
uniform float uDither; uniform float uLevels;
float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
vec3 dith(vec3 c) {
  if (uDither < 0.5) return c;
  float b = bayer4(gl_FragCoord.xy) - 0.5;
  return floor(c * uLevels + 0.5 + b * 0.9) / uLevels;
}`;

const VS = `
attribute vec3 aPos; attribute vec3 aNor; attribute vec2 aUv;
uniform mat4 uModel; uniform mat4 uVP; uniform mat3 uNM;
varying vec3 vNor; varying vec3 vW; varying vec2 vUv;
void main() { vec4 w = uModel * vec4(aPos, 1.0); vW = w.xyz; vNor = uNM * aNor; vUv = aUv; gl_Position = uVP * w; }`;

const FS_LIT = `precision mediump float;
varying vec3 vNor; varying vec3 vW; varying vec2 vUv;
uniform vec3 uColor; uniform vec3 uEmissive; uniform float uOpacity;
uniform vec3 uLightDir; uniform vec3 uLightCol; uniform vec3 uSky; uniform vec3 uGround;
uniform vec3 uRimCol; uniform float uRim; uniform vec3 uCam; uniform float uSpec; uniform float uShine;
uniform sampler2D uTex; uniform float uUseTex; uniform vec3 uFogCol; uniform vec2 uFog;
${DITHER}
void main() {
  vec3 base = uColor; float a = uOpacity;
  if (uUseTex > 0.5) { vec4 t = texture2D(uTex, vUv); base *= t.rgb; a *= t.a; }
  if (a < 0.02) discard;
  vec3 N = normalize(vNor);
  if (!gl_FrontFacing) N = -N;
  vec3 L = normalize(uLightDir);
  float ndl = max(dot(N, L), 0.0);
  vec3 V = normalize(uCam - vW);
  vec3 H = normalize(L + V);
  float sp = pow(max(dot(N, H), 0.0), uShine) * uSpec * step(0.001, ndl);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0) * uRim;
  vec3 hemi = mix(uGround, uSky, N.y * 0.5 + 0.5);
  vec3 c = base * (hemi + uLightCol * ndl) + uLightCol * sp + uRimCol * rim + uEmissive;
  float d = length(uCam - vW);
  c = mix(c, uFogCol, clamp((d - uFog.x) / (uFog.y - uFog.x), 0.0, 1.0));
  gl_FragColor = vec4(dith(c), a);
}`;

const FS_FX = `precision mediump float;
varying vec3 vNor; varying vec3 vW; varying vec2 vUv;
uniform vec3 uColor; uniform float uOpacity; uniform float uMode; uniform sampler2D uTex;
${DITHER}
void main() {
  vec2 p = vUv - 0.5; float r = length(p) * 2.0;
  float a = uOpacity; vec3 c = uColor;
  if (uMode > 0.5 && uMode < 1.5) a *= clamp(1.0 - r, 0.0, 1.0);
  else if (uMode > 1.5 && uMode < 2.5) a *= clamp(1.0 - abs(r - 0.78) * 7.0, 0.0, 1.0);
  else if (uMode > 2.5 && uMode < 3.5) { vec4 t = texture2D(uTex, vUv); c *= t.rgb; a *= t.a; }
  if (uMode > 3.5) { if (a <= bayer4(gl_FragCoord.xy)) discard; gl_FragColor = vec4(c, 1.0); return; }
  if (a < 0.01) discard;
  gl_FragColor = vec4(dith(c), a);
}`;

const FS_GRID = `precision mediump float;
varying vec3 vNor; varying vec3 vW; varying vec2 vUv;
uniform vec3 uColor; uniform vec3 uColor2; uniform vec3 uBase; uniform float uTime; uniform vec3 uFogCol;
${DITHER}
void main() {
  vec2 q = vW.xz * 0.5 + vec2(0.0, uTime * 0.25);
  vec2 f = abs(fract(q + 0.5) - 0.5);
  float line = 1.0 - smoothstep(0.015, 0.045, min(f.x, f.y));
  float dist = length(vW.xz);
  float fade = 1.0 - smoothstep(7.0, 30.0, dist);
  vec3 lc = mix(uColor, uColor2, smoothstep(4.0, 22.0, dist));
  vec3 c = mix(uBase, lc, line * fade);
  c = mix(c, uFogCol, smoothstep(14.0, 36.0, dist));
  gl_FragColor = vec4(dith(c), 1.0);
}`;

const VS_SKY = `attribute vec2 aP; varying vec2 vP; void main() { vP = aP * 0.5 + 0.5; gl_Position = vec4(aP, 0.9999, 1.0); }`;
const FS_SKY = `precision mediump float;
varying vec2 vP; uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHor; uniform float uTime; uniform vec2 uRes;
${DITHER}
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  float y = vP.y;
  vec3 c = mix(uHor, uMid, smoothstep(0.0, 0.5, y));
  c = mix(c, uTop, smoothstep(0.5, 1.0, y));
  vec2 cell = floor(gl_FragCoord.xy / 2.0);
  float h = hash(cell);
  if (h > 0.996 && y > 0.35) c += vec3(0.6) * (0.5 + 0.5 * sin(uTime * 2.0 + h * 50.0));
  gl_FragColor = vec4(dith(c), 1.0);
}`;

function compile(gl, vs, fs) {
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s));
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'aPos'); gl.bindAttribLocation(p, 1, 'aNor'); gl.bindAttribLocation(p, 2, 'aUv');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
  return { p, u };
}

export class Node {
  constructor(mesh = null, mat = null) {
    this.mesh = mesh; this.mat = mat;
    this.pos = [0, 0, 0]; this.rot = qid(); this.scl = [1, 1, 1];
    this.children = []; this.parent = null; this.visible = true;
    this.world = m4(); this.castShadow = false; this.data = {};
  }
  add(...ns) { for (const n of ns) { if (n.parent) n.parent.remove(n); n.parent = this; this.children.push(n); } return ns[0]; }
  remove(n) { const i = this.children.indexOf(n); if (i >= 0) this.children.splice(i, 1); n.parent = null; }
  traverse(fn) { fn(this); for (const c of this.children) c.traverse(fn); }
}

export function material(o = {}) {
  return Object.assign({
    kind: 'lit', color: [1, 1, 1], emissive: [0, 0, 0], spec: 0.2, shine: 20, rim: 0, opacity: 1,
    tex: null, mode: 0, blend: null, depthWrite: true, depthTest: true, double: false,
  }, o, { color: typeof o.color === 'string' ? hex(o.color) : (o.color || [1, 1, 1]), emissive: typeof o.emissive === 'string' ? hex(o.emissive) : (o.emissive || [0, 0, 0]) });
}

export function create3D(container, cfg = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'r3d';
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;image-rendering:pixelated;image-rendering:crisp-edges';
  container.appendChild(canvas);
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, stencil: false, depth: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  if (!gl) throw new Error('WebGL desteklenmiyor');
  const progLit = compile(gl, VS, FS_LIT);
  const progFx = compile(gl, VS, FS_FX);
  const progGrid = compile(gl, VS, FS_GRID);
  const progSky = compile(gl, VS_SKY, FS_SKY);
  const skyBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const env = {
    lightDir: norm([0.35, 1.0, 0.6]), lightCol: [0.92, 0.86, 0.78], sky: [0.34, 0.31, 0.52], ground: [0.13, 0.09, 0.18],
    rimCol: hex('#ff4fa3'), fogCol: hex('#1a0f2e'), fog: [26, 60],
    skyTop: hex('#0b0920'), skyMid: hex('#251046'), skyHor: hex('#7a1d5e'),
    gridA: hex('#ff4fa3'), gridB: hex('#3ee0ff'), gridBase: hex('#0e0718'), floorY: -3,
    shadowCol: [0.05, 0.03, 0.09], shadowY: 0, shadowOpacity: 0.55,
  };
  const scene = new Node();
  const cam = {
    target: [0, 0, 0], yaw: 0, pitch: 0.95, dist: 12, fov: 36,
    min: { pitch: 0.25, dist: 6 }, max: { pitch: 1.45, dist: 22 },
    cur: null, eye: [0, 0, 0], view: m4(), proj: m4(), vp: m4(), inv: m4(),
  };
  Object.assign(cam, cfg.camera || {});
  cam.cur = { yaw: cam.yaw, pitch: cam.pitch, dist: cam.dist, target: cam.target.slice() };

  let pixel = cfg.pixel !== false, scale = 3, W = 0, H = 0, time = 0, alive = true, raf = 0, last = 0;
  const frameFns = new Set(), tweens = [], resizeFns = new Set();
  const meshCache = new WeakMap();

  function mesh(geo) {
    if (geo.vb) return geo;
    let m = meshCache.get(geo);
    if (m) return m;
    const mk = (data) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); return b; };
    m = { vb: mk(geo.pos), nb: mk(geo.nor), ub: mk(geo.uv), count: geo.count, geo };
    meshCache.set(geo, m);
    return m;
  }
  function texture(src, { nearest = true, repeat = false } = {}) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    const f = nearest ? gl.NEAREST : gl.LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    const wr = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wr);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wr);
    return { gl: t, update(s) { gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, s); } };
  }
  function node(geo, mat) { return new Node(geo ? mesh(geo) : null, mat ? (mat.kind ? mat : material(mat)) : null); }

  const floor = node(plane(90, 90), material({ kind: 'grid' }));
  floor.pos = [0, env.floorY, 0];
  scene.add(floor);

  function updateCamera(dt) {
    const k = Math.min(1, dt * 9);
    const c = cam.cur;
    let dy = cam.yaw - c.yaw;
    c.yaw += dy * k; c.pitch += (cam.pitch - c.pitch) * k; c.dist += (cam.dist - c.dist) * k;
    for (let i = 0; i < 3; i++) c.target[i] += (cam.target[i] - c.target[i]) * k;
    const cp = Math.cos(c.pitch);
    cam.eye = [c.target[0] + c.dist * cp * Math.sin(c.yaw), c.target[1] + c.dist * Math.sin(c.pitch), c.target[2] + c.dist * cp * Math.cos(c.yaw)];
    lookAt(cam.view, cam.eye, c.target, [0, 1, 0]);
    perspective(cam.proj, (cam.fov * Math.PI) / 180, W / Math.max(1, H), 0.1, 120);
    mul(cam.vp, cam.proj, cam.view);
    invert(cam.inv, cam.vp);
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (pixel) scale = Math.max(2, Math.round(r.height / 330));
    const w = Math.max(1, Math.round(pixel ? r.width / scale : r.width * Math.min(dpr, 2)));
    const h = Math.max(1, Math.round(pixel ? r.height / scale : r.height * Math.min(dpr, 2)));
    if (w !== W || h !== H) {
      W = w; H = h; canvas.width = W; canvas.height = H;
      if (r.width > 0 && r.height > 0) resizeFns.forEach((fn) => fn(r.width / r.height));
    }
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const NM = new Float32Array(9), TMP = m4(), SHADOW = m4();
  function bindMesh(m) {
    gl.bindBuffer(gl.ARRAY_BUFFER, m.vb); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, m.nb); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, m.ub); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
  }
  function common(pr) {
    const u = pr.u;
    gl.uniformMatrix4fv(u.uVP, false, cam.vp);
    if (u.uDither) gl.uniform1f(u.uDither, pixel ? 1 : 0);
    if (u.uLevels) gl.uniform1f(u.uLevels, 14);
  }
  let curProg = null;
  function use(pr) {
    if (curProg === pr) return;
    curProg = pr; gl.useProgram(pr.p); common(pr);
    const u = pr.u;
    if (pr === progLit) {
      gl.uniform3fv(u.uLightDir, env.lightDir); gl.uniform3fv(u.uLightCol, env.lightCol);
      gl.uniform3fv(u.uSky, env.sky); gl.uniform3fv(u.uGround, env.ground); gl.uniform3fv(u.uRimCol, env.rimCol);
      gl.uniform3fv(u.uCam, cam.eye); gl.uniform3fv(u.uFogCol, env.fogCol); gl.uniform2fv(u.uFog, env.fog);
    }
    if (pr === progGrid) {
      gl.uniform3fv(u.uColor, env.gridA); gl.uniform3fv(u.uColor2, env.gridB); gl.uniform3fv(u.uBase, env.gridBase);
      gl.uniform1f(u.uTime, time); gl.uniform3fv(u.uFogCol, env.fogCol);
    }
  }
  function drawNode(n, model) {
    const m = n.mesh, mt = n.mat;
    const pr = mt.kind === 'lit' ? progLit : mt.kind === 'grid' ? progGrid : progFx;
    use(pr);
    const u = pr.u;
    gl.uniformMatrix4fv(u.uModel, false, model);
    if (u.uNM) { normalMat(NM, model); gl.uniformMatrix3fv(u.uNM, false, NM); }
    if (pr === progLit) {
      gl.uniform3fv(u.uColor, mt.color); gl.uniform3fv(u.uEmissive, mt.emissive); gl.uniform1f(u.uOpacity, mt.opacity);
      gl.uniform1f(u.uSpec, mt.spec); gl.uniform1f(u.uShine, mt.shine); gl.uniform1f(u.uRim, mt.rim);
      gl.uniform1f(u.uUseTex, mt.tex ? 1 : 0);
    } else if (pr === progFx) {
      gl.uniform3fv(u.uColor, mt.color); gl.uniform1f(u.uOpacity, mt.opacity); gl.uniform1f(u.uMode, mt.mode);
    }
    if (mt.tex && u.uTex) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, mt.tex.gl); gl.uniform1i(u.uTex, 0); }
    if (mt.double) gl.disable(gl.CULL_FACE); else gl.enable(gl.CULL_FACE);
    bindMesh(m);
    gl.drawArrays(gl.TRIANGLES, 0, m.count);
  }
  const shadowMat = material({ kind: 'fx', mode: 4 });
  function render() {
    gl.viewport(0, 0, W, H);
    gl.clearColor(env.fogCol[0], env.fogCol[1], env.fogCol[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
    gl.useProgram(progSky.p); curProg = null;
    const su = progSky.u;
    gl.uniform3fv(su.uTop, env.skyTop); gl.uniform3fv(su.uMid, env.skyMid); gl.uniform3fv(su.uHor, env.skyHor);
    gl.uniform1f(su.uTime, time); gl.uniform1f(su.uDither, pixel ? 1 : 0); gl.uniform1f(su.uLevels, 14);
    gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.disableVertexAttribArray(1); gl.disableVertexAttribArray(2);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    const opaque = [], trans = [], casters = [];
    const walk = (n, parentWorld) => {
      if (!n.visible) return;
      compose(TMP, n.pos, n.rot, n.scl);
      if (parentWorld) mul(n.world, parentWorld, TMP); else n.world.set(TMP);
      if (n.mesh && n.mat) {
        if (n.mat.blend || n.mat.opacity < 1) trans.push(n); else opaque.push(n);
        if (n.castShadow) casters.push(n);
      }
      for (const c of n.children) walk(c, n.world);
    };
    walk(scene, null);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true);
    for (const n of opaque) drawNode(n, n.world);
    if (casters.length) {
      const d = env.lightDir, hY = env.shadowY;
      SHADOW.set([1, 0, 0, 0, -d[0] / d[1], 0, -d[2] / d[1], 0, 0, 0, 1, 0, (d[0] * hY) / d[1], hY + 0.002, (d[2] * hY) / d[1], 1]);
      shadowMat.color = env.shadowCol; shadowMat.opacity = env.shadowOpacity; shadowMat.double = true;
      gl.depthMask(false);
      gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-2, -2);
      for (const n of casters) {
        if (n.world[13] < hY - 0.05) continue;
        mul(TMP, SHADOW, n.world);
        const keep = n.mat; n.mat = shadowMat; drawNode(n, TMP); n.mat = keep;
      }
      gl.disable(gl.POLYGON_OFFSET_FILL);
      gl.depthMask(true);
    }
    const e = cam.eye;
    trans.sort((a, b) => dist2(b.world, e) - dist2(a.world, e));
    gl.enable(gl.BLEND);
    for (const n of trans) {
      if (n.mat.blend === 'add') gl.blendFunc(gl.SRC_ALPHA, gl.ONE); else gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(!!n.mat.depthWrite && n.mat.blend !== 'add');
      if (n.mat.depthTest === false) gl.disable(gl.DEPTH_TEST); else gl.enable(gl.DEPTH_TEST);
      drawNode(n, n.world);
    }
    gl.depthMask(true); gl.disable(gl.BLEND); gl.enable(gl.DEPTH_TEST);
  }

  function frame(now) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now; time += dt;
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      tw.fn(tw.ease(k));
      if (k >= 1) { tweens.splice(i, 1); if (tw.done) tw.done(); }
    }
    frameFns.forEach((fn) => fn(dt, time));
    if (!W || !H) resize();
    updateCamera(dt);
    render();
  }

  const pointers = new Map();
  let downInfo = null, pinch0 = 0;
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (pointers.size === 1) downInfo = { x: e.clientX, y: e.clientY, moved: false, yaw: cam.yaw, pitch: cam.pitch, button: e.button };
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); if (downInfo) downInfo.moved = true; }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (pinch0 > 0) { cam.dist = clampN(cam.dist * (pinch0 / d), cam.min.dist, cam.max.dist); pinch0 = d; }
      return;
    }
    if (downInfo && pointers.size === 1) {
      const dx = e.clientX - downInfo.x, dy = e.clientY - downInfo.y;
      if (!downInfo.moved && Math.hypot(dx, dy) > 6) downInfo.moved = true;
      if (downInfo.moved && cfg.orbit !== false) {
        cam.yaw = downInfo.yaw - dx * 0.008;
        cam.pitch = clampN(downInfo.pitch + dy * 0.006, cam.min.pitch, cam.max.pitch);
      }
      return;
    }
    if (e.pointerType === 'mouse' && api.onHover) api.onHover(ray(e.clientX, e.clientY), e);
  });
  const up = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size === 0 && downInfo) {
      const d = downInfo; downInfo = null;
      if (!d.moved && d.button === 0 && api.onPick) api.onPick(ray(e.clientX, e.clientY), e);
    }
    if (pointers.size < 2) pinch0 = 0;
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); downInfo = null; });
  canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && api.onHover) api.onHover(null, e); });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); cam.dist = clampN(cam.dist * Math.exp(e.deltaY * 0.0012), cam.min.dist, cam.max.dist); }, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  function ray(cx, cy) {
    const r = canvas.getBoundingClientRect();
    const nx = ((cx - r.left) / r.width) * 2 - 1, ny = -(((cy - r.top) / r.height) * 2 - 1);
    const p0 = unproject(nx, ny, -1), p1 = unproject(nx, ny, 1);
    const d = norm([p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]]);
    return { o: p0, d };
  }
  function unproject(x, y, z) {
    const m = cam.inv;
    const w = m[3] * x + m[7] * y + m[11] * z + m[15];
    return [(m[0] * x + m[4] * y + m[8] * z + m[12]) / w, (m[1] * x + m[5] * y + m[9] * z + m[13]) / w, (m[2] * x + m[6] * y + m[10] * z + m[14]) / w];
  }

  const api = {
    canvas, gl, scene, cam, env, Node, material, mesh, node, texture,
    onPick: null, onHover: null,
    ray,
    project(p) {
      const m = cam.vp, x = p[0], y = p[1], z = p[2];
      const w = m[3] * x + m[7] * y + m[11] * z + m[15];
      const nx = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w, ny = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
      const r = canvas.getBoundingClientRect();
      return [r.left + (nx * 0.5 + 0.5) * r.width, r.top + (1 - (ny * 0.5 + 0.5)) * r.height];
    },
    hitY(r, y) { if (!r || Math.abs(r.d[1]) < 1e-6) return null; const t = (y - r.o[1]) / r.d[1]; return t > 0 ? [r.o[0] + r.d[0] * t, y, r.o[2] + r.d[2] * t] : null; },
    hitCyl(r, cx, cz, rad, y0, y1) {
      const ox = r.o[0] - cx, oz = r.o[2] - cz, dx = r.d[0], dz = r.d[2];
      const a = dx * dx + dz * dz, b = 2 * (ox * dx + oz * dz), c = ox * ox + oz * oz - rad * rad;
      const disc = b * b - 4 * a * c;
      if (a < 1e-9 || disc < 0) return -1;
      const s = Math.sqrt(disc);
      for (const t of [(-b - s) / (2 * a), (-b + s) / (2 * a)]) { if (t <= 0) continue; const y = r.o[1] + r.d[1] * t; if (y >= y0 && y <= y1) return t; }
      if (Math.abs(r.d[1]) > 1e-6) { const t = (y1 - r.o[1]) / r.d[1]; if (t > 0) { const x = r.o[0] + r.d[0] * t - cx, z = r.o[2] + r.d[2] * t - cz; if (x * x + z * z <= rad * rad) return t; } }
      return -1;
    },
    tween(dur, fn, o = {}) { const tw = { t: 0, dur: Math.max(0.001, dur), fn, ease: o.ease || EASE.inOut, done: o.done }; tweens.push(tw); fn(0); return tw; },
    get busy() { return tweens.length > 0; },
    onFrame(fn) { frameFns.add(fn); return () => frameFns.delete(fn); },
    onResize(fn) { resizeFns.add(fn); const r = canvas.getBoundingClientRect(); if (r.width > 0 && r.height > 0) fn(r.width / r.height); return () => resizeFns.delete(fn); },
    setPixel(v) { pixel = v; W = H = 0; resize(); },
    get time() { return time; },
    snapCamera() { cam.cur = { yaw: cam.yaw, pitch: cam.pitch, dist: cam.dist, target: cam.target.slice() }; },
    destroy() {
      alive = false; cancelAnimationFrame(raf); ro.disconnect();
      const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext();
      canvas.remove();
    },
  };
  resize();
  raf = requestAnimationFrame(frame);
  if (window.__retroDebug) window.__r3d = api;
  return api;
}

const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
function norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
function dist2(w, e) { const dx = w[12] - e[0], dy = w[13] - e[1], dz = w[14] - e[2]; return dx * dx + dy * dy + dz * dz; }

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  draw(g, w, h);
  return c;
}
export { EASE as ease };
