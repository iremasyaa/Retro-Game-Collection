import { m4, compose, qid, normalMat, qeuler } from './math.js';

class Builder {
  constructor() { this.p = []; this.u = []; }
  tri(a, b, c, ua = [0, 0], ub = [0, 0], uc = [0, 0]) { this.p.push(a, b, c); this.u.push(ua, ub, uc); }
  quad(a, b, c, d, ua, ub, uc, ud) { this.tri(a, b, c, ua, ub, uc); this.tri(a, c, d, ua, uc, ud); }
  build() {
    const n = this.p.length;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    for (let i = 0; i < n; i += 3) {
      const a = this.p[i], b = this.p[i + 1], c = this.p[i + 2];
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      for (let k = 0; k < 3; k++) {
        const p = this.p[i + k], t = this.u[i + k];
        pos.set(p, (i + k) * 3); nor[(i + k) * 3] = nx; nor[(i + k) * 3 + 1] = ny; nor[(i + k) * 3 + 2] = nz;
        uv[(i + k) * 2] = t[0]; uv[(i + k) * 2 + 1] = t[1];
      }
    }
    return { pos, nor, uv, count: n };
  }
}

export function box(w, h, d, faceUV) {
  const b = new Builder();
  const x = w / 2, y = h / 2, z = d / 2;
  const F = [
    [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]],
    [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]],
    [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z]],
    [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]],
    [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]],
    [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]],
  ];
  F.forEach((f, i) => {
    const r = faceUV ? faceUV[i] : [0, 0, 1, 1];
    b.quad(f[0], f[1], f[2], f[3], [r[0], r[3]], [r[2], r[3]], [r[2], r[1]], [r[0], r[1]]);
  });
  return b.build();
}

export function plane(w, d) {
  const b = new Builder();
  const x = w / 2, z = d / 2;
  b.quad([-x, 0, z], [x, 0, z], [x, 0, -z], [-x, 0, -z], [0, 1], [1, 1], [1, 0], [0, 0]);
  return b.build();
}

export function lathe(profile, segs = 12, phase = 0) {
  const b = new Builder();
  for (let s = 0; s < segs; s++) {
    const a0 = phase + (s / segs) * Math.PI * 2, a1 = phase + ((s + 1) / segs) * Math.PI * 2;
    const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
    for (let i = 0; i < profile.length - 1; i++) {
      const [r0, y0] = profile[i], [r1, y1] = profile[i + 1];
      const p00 = [r0 * c0, y0, r0 * s0], p01 = [r0 * c1, y0, r0 * s1];
      const p10 = [r1 * c0, y1, r1 * s0], p11 = [r1 * c1, y1, r1 * s1];
      if (r0 > 1e-6 && r1 > 1e-6) b.quad(p00, p10, p11, p01);
      else if (r0 > 1e-6) b.tri(p00, p10, p01);
      else if (r1 > 1e-6) b.tri(p00, p10, p11);
    }
  }
  return b.build();
}

export function cylinder(rTop, rBot, h, segs = 16, caps = true) {
  const prof = [];
  if (caps) prof.push([0, 0]);
  prof.push([rBot, 0], [rTop, h]);
  if (caps) prof.push([0, h]);
  return lathe(prof, segs);
}

export function sphere(r, segs = 10, rings = 6) {
  const prof = [];
  for (let i = 0; i <= rings; i++) { const a = -Math.PI / 2 + (i / rings) * Math.PI; prof.push([Math.cos(a) * r, Math.sin(a) * r]); }
  prof[0][0] = 0; prof[rings][0] = 0;
  return lathe(prof, segs);
}

export function torus(R, r, segs = 16, tube = 6) {
  const b = new Builder();
  const P = (i, j) => {
    const u = (i / segs) * Math.PI * 2, v = (j / tube) * Math.PI * 2;
    return [(R + r * Math.cos(v)) * Math.cos(u), r * Math.sin(v), (R + r * Math.cos(v)) * Math.sin(u)];
  };
  for (let i = 0; i < segs; i++) for (let j = 0; j < tube; j++) b.quad(P(i, j), P(i, j + 1), P(i + 1, j + 1), P(i + 1, j));
  return b.build();
}

export function extrude(shape, depth, bevel = 0) {
  if (area(shape) < 0) shape = shape.slice().reverse();
  const b = new Builder();
  const z0 = -depth / 2, z1 = depth / 2;
  const tris = earcut(shape);
  for (const [i, j, k] of tris) {
    const A = shape[i], B = shape[j], C = shape[k];
    b.tri([A[0], A[1], z1], [B[0], B[1], z1], [C[0], C[1], z1]);
    b.tri([A[0], A[1], z0], [C[0], C[1], z0], [B[0], B[1], z0]);
  }
  for (let i = 0; i < shape.length; i++) {
    const A = shape[i], B = shape[(i + 1) % shape.length];
    b.quad([A[0], A[1], z0], [B[0], B[1], z0], [B[0], B[1], z1], [A[0], A[1], z1]);
  }
  void bevel;
  return b.build();
}

function area(pts) { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
function earcut(pts) {
  const idx = pts.map((_, i) => i);
  if (area(pts) < 0) idx.reverse();
  const out = [];
  const inside = (p, a, b, c) => {
    const d1 = (p[0] - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (p[1] - b[1]);
    const d2 = (p[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (p[1] - c[1]);
    const d3 = (p[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (p[1] - a[1]);
    const neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(neg && pos);
  };
  let guard = 0;
  while (idx.length > 3 && guard++ < 5000) {
    let cut = false;
    for (let i = 0; i < idx.length; i++) {
      const ia = idx[(i + idx.length - 1) % idx.length], ib = idx[i], ic = idx[(i + 1) % idx.length];
      const a = pts[ia], b = pts[ib], c = pts[ic];
      const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (cross <= 0) continue;
      let ok = true;
      for (const j of idx) { if (j === ia || j === ib || j === ic) continue; if (inside(pts[j], a, b, c)) { ok = false; break; } }
      if (!ok) continue;
      out.push([ia, ib, ic]); idx.splice(i, 1); cut = true; break;
    }
    if (!cut) break;
  }
  if (idx.length === 3) out.push([idx[0], idx[1], idx[2]]);
  return out;
}

export function merge(parts) {
  let n = 0;
  for (const p of parts) n += p.geo.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  const M = m4(), N = new Float32Array(9);
  for (const { geo, t } of parts) {
    if (t) compose(M, t.pos || [0, 0, 0], t.rot ? qeuler(t.rot[0], t.rot[1], t.rot[2]) : qid(), t.scl || [1, 1, 1]);
    else compose(M, [0, 0, 0], qid(), [1, 1, 1]);
    normalMat(N, M);
    for (let i = 0; i < geo.count; i++) {
      const x = geo.pos[i * 3], y = geo.pos[i * 3 + 1], z = geo.pos[i * 3 + 2];
      pos[(o + i) * 3] = M[0] * x + M[4] * y + M[8] * z + M[12];
      pos[(o + i) * 3 + 1] = M[1] * x + M[5] * y + M[9] * z + M[13];
      pos[(o + i) * 3 + 2] = M[2] * x + M[6] * y + M[10] * z + M[14];
      const a = geo.nor[i * 3], b = geo.nor[i * 3 + 1], c = geo.nor[i * 3 + 2];
      let nx = N[0] * a + N[3] * b + N[6] * c, ny = N[1] * a + N[4] * b + N[7] * c, nz = N[2] * a + N[5] * b + N[8] * c;
      const l = Math.hypot(nx, ny, nz) || 1;
      nor[(o + i) * 3] = nx / l; nor[(o + i) * 3 + 1] = ny / l; nor[(o + i) * 3 + 2] = nz / l;
      uv[(o + i) * 2] = geo.uv[i * 2]; uv[(o + i) * 2 + 1] = geo.uv[i * 2 + 1];
    }
    o += geo.count;
  }
  return { pos, nor, uv, count: n };
}
