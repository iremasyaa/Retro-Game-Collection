import base64, io, sys
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

U = 100

G = {}

def cap(ch, rows, accent=None, desc=None):
    full = [''] * 12
    if accent:
        for i, r in enumerate(accent):
            full[i] = r
    for i, r in enumerate(rows):
        full[3 + i] = r
    if desc:
        for i, r in enumerate(desc):
            full[10 + i] = r
    G[ch] = full

def raw(ch, start, rows):
    full = [''] * 12
    for i, r in enumerate(rows):
        full[start + i] = r
    G[ch] = full

def S(s):
    return [r for r in s.strip().split('\n')]

cap('A', S("""
.###.
#...#
#...#
#####
#...#
#...#
#...#"""))
cap('B', S("""
####.
#...#
#...#
####.
#...#
#...#
####."""))
cap('C', S("""
.###.
#...#
#....
#....
#....
#...#
.###."""))
cap('D', S("""
####.
#...#
#...#
#...#
#...#
#...#
####."""))
cap('E', S("""
#####
#....
#....
####.
#....
#....
#####"""))
cap('F', S("""
#####
#....
#....
####.
#....
#....
#...."""))
cap('G', S("""
.###.
#...#
#....
#.###
#...#
#...#
.####"""))
cap('H', S("""
#...#
#...#
#...#
#####
#...#
#...#
#...#"""))
cap('I', S("""
.###.
..#..
..#..
..#..
..#..
..#..
.###."""))
cap('J', S("""
..###
...#.
...#.
...#.
...#.
#..#.
.##.."""))
cap('K', S("""
#...#
#..#.
#.#..
##...
#.#..
#..#.
#...#"""))
cap('L', S("""
#....
#....
#....
#....
#....
#....
#####"""))
cap('M', S("""
#...#
##.##
#.#.#
#.#.#
#...#
#...#
#...#"""))
cap('N', S("""
#...#
#...#
##..#
#.#.#
#..##
#...#
#...#"""))
cap('O', S("""
.###.
#...#
#...#
#...#
#...#
#...#
.###."""))
cap('P', S("""
####.
#...#
#...#
####.
#....
#....
#...."""))
cap('Q', S("""
.###.
#...#
#...#
#...#
#.#.#
#..#.
.##.#"""))
cap('R', S("""
####.
#...#
#...#
####.
#.#..
#..#.
#...#"""))
cap('S', S("""
.####
#....
#....
.###.
....#
....#
####."""))
cap('T', S("""
#####
..#..
..#..
..#..
..#..
..#..
..#.."""))
cap('U', S("""
#...#
#...#
#...#
#...#
#...#
#...#
.###."""))
cap('V', S("""
#...#
#...#
#...#
#...#
#...#
.#.#.
..#.."""))
cap('W', S("""
#...#
#...#
#...#
#.#.#
#.#.#
#.#.#
.#.#."""))
cap('X', S("""
#...#
#...#
.#.#.
..#..
.#.#.
#...#
#...#"""))
cap('Y', S("""
#...#
#...#
.#.#.
..#..
..#..
..#..
..#.."""))
cap('Z', S("""
#####
....#
...#.
..#..
.#...
#....
#####"""))

cap('Ç', G['C'][3:10], desc=['..#..', '.##..'])
cap('Ş', G['S'][3:10], desc=['..#..', '.##..'])
cap('Ğ', G['G'][3:10], accent=['#...#', '.###.'])
cap('Ö', G['O'][3:10], accent=['', '.#.#.'])
cap('Ü', G['U'][3:10], accent=['', '.#.#.'])
cap('İ', G['I'][3:10], accent=['', '..#..'])
cap('Â', G['A'][3:10], accent=['..#..', '.#.#.'])
cap('É', G['E'][3:10], accent=['...#.', '..#..'])

def low(ch, rows, desc=None):
    cap(ch, rows, desc=desc)

low('a', S("""
.....
.....
.###.
....#
.####
#...#
.####"""))
low('b', S("""
#....
#....
#.##.
##..#
#...#
#...#
####."""))
low('c', S("""
.....
.....
.###.
#....
#....
#...#
.###."""))
low('d', S("""
....#
....#
.##.#
#..##
#...#
#...#
.####"""))
low('e', S("""
.....
.....
.###.
#...#
#####
#....
.###."""))
low('f', S("""
..##.
.#..#
.#...
###..
.#...
.#...
.#..."""))
low('g', S("""
.....
.....
.####
#...#
#...#
#...#
.####"""), desc=['....#', '.###.'])
low('h', S("""
#....
#....
#.##.
##..#
#...#
#...#
#...#"""))
low('i', S("""
..#..
.....
.##..
..#..
..#..
..#..
.###."""))
low('j', S("""
...#.
.....
..##.
...#.
...#.
...#.
...#."""), desc=['#..#.', '.##..'])
low('k', S("""
#....
#....
#..#.
#.#..
##...
#.#..
#..#."""))
low('l', S("""
.##..
..#..
..#..
..#..
..#..
..#..
.###."""))
low('m', S("""
.....
.....
##.#.
#.#.#
#.#.#
#.#.#
#.#.#"""))
low('n', S("""
.....
.....
#.##.
##..#
#...#
#...#
#...#"""))
low('o', S("""
.....
.....
.###.
#...#
#...#
#...#
.###."""))
low('p', S("""
.....
.....
####.
#...#
#...#
#...#
####."""), desc=['#....', '#....'])
low('q', S("""
.....
.....
.####
#...#
#...#
#...#
.####"""), desc=['....#', '....#'])
low('r', S("""
.....
.....
#.##.
##..#
#....
#....
#...."""))
low('s', S("""
.....
.....
.####
#....
.###.
....#
####."""))
low('t', S("""
.#...
.#...
###..
.#...
.#...
.#..#
..##."""))
low('u', S("""
.....
.....
#...#
#...#
#...#
#..##
.##.#"""))
low('v', S("""
.....
.....
#...#
#...#
#...#
.#.#.
..#.."""))
low('w', S("""
.....
.....
#...#
#...#
#.#.#
#.#.#
.#.#."""))
low('x', S("""
.....
.....
#...#
.#.#.
..#..
.#.#.
#...#"""))
low('y', S("""
.....
.....
#...#
#...#
#...#
#...#
.####"""), desc=['....#', '.###.'])
low('z', S("""
.....
.....
#####
...#.
..#..
.#...
#####"""))

low('ç', G['c'][3:10], desc=['..#..', '.##..'])
low('ş', G['s'][3:10], desc=['..#..', '.##..'])
low('ı', S("""
.....
.....
.##..
..#..
..#..
..#..
.###."""))
low('ö', ['.#.#.', '.....'] + G['o'][5:10])
low('ü', ['.#.#.', '.....'] + G['u'][5:10])
raw('ğ', 2, ['#...#', '.###.', '.....'] + G['g'][5:10] + ['....#', '.###.'])
low('â', ['..#..', '.#.#.'] + G['a'][5:10])
low('é', ['...#.', '..#..'] + G['e'][5:10])

cap('0', S("""
.###.
#...#
#..##
#.#.#
##..#
#...#
.###."""))
cap('1', S("""
..#..
.##..
..#..
..#..
..#..
..#..
.###."""))
cap('2', S("""
.###.
#...#
....#
...#.
..#..
.#...
#####"""))
cap('3', S("""
#####
...#.
..#..
...#.
....#
#...#
.###."""))
cap('4', S("""
...#.
..##.
.#.#.
#..#.
#####
...#.
...#."""))
cap('5', S("""
#####
#....
####.
....#
....#
#...#
.###."""))
cap('6', S("""
..##.
.#...
#....
####.
#...#
#...#
.###."""))
cap('7', S("""
#####
....#
...#.
..#..
.#...
.#...
.#..."""))
cap('8', S("""
.###.
#...#
#...#
.###.
#...#
#...#
.###."""))
cap('9', S("""
.###.
#...#
#...#
.####
....#
...#.
.##.."""))

cap(' ', ['.....'] * 7)
cap('!', S("""
..#..
..#..
..#..
..#..
..#..
.....
..#.."""))
cap('"', S("""
.#.#.
.#.#.
.....
.....
.....
.....
....."""))
cap('#', S("""
.#.#.
.#.#.
#####
.#.#.
#####
.#.#.
.#.#."""))
cap('$', S("""
..#..
.####
#.#..
.###.
..#.#
####.
..#.."""))
cap('%', S("""
##...
##..#
...#.
..#..
.#...
#..##
...##"""))
cap('&', S("""
.##..
#..#.
#.#..
.#...
#.#.#
#..#.
.##.#"""))
cap("'", S("""
..#..
..#..
.....
.....
.....
.....
....."""))
cap('(', S("""
...#.
..#..
.#...
.#...
.#...
..#..
...#."""))
cap(')', S("""
.#...
..#..
...#.
...#.
...#.
..#..
.#..."""))
cap('*', S("""
.....
..#..
#.#.#
.###.
#.#.#
..#..
....."""))
cap('+', S("""
.....
..#..
..#..
#####
..#..
..#..
....."""))
cap(',', ['.....'] * 5 + ['.##..', '..#..'], desc=['.#...', '.....'])
cap('-', S("""
.....
.....
.....
.###.
.....
.....
....."""))
cap('.', ['.....'] * 5 + ['.##..', '.##..'])
cap('/', S("""
.....
....#
...#.
..#..
.#...
#....
....."""))
cap(':', S("""
.....
.##..
.##..
.....
.##..
.##..
....."""))
cap(';', S("""
.....
.##..
.##..
.....
.##..
..#..
.#..."""))
cap('<', S("""
...#.
..#..
.#...
#....
.#...
..#..
...#."""))
cap('=', S("""
.....
.....
#####
.....
#####
.....
....."""))
cap('>', S("""
.#...
..#..
...#.
....#
...#.
..#..
.#..."""))
cap('?', S("""
.###.
#...#
....#
...#.
..#..
.....
..#.."""))
cap('@', S("""
.###.
#...#
....#
.##.#
#.#.#
#.#.#
.###."""))
cap('[', S("""
.###.
.#...
.#...
.#...
.#...
.#...
.###."""))
cap(']', S("""
.###.
...#.
...#.
...#.
...#.
...#.
.###."""))
cap('_', ['.....'] * 6 + ['#####'])
cap('|', ['..#..'] * 7)
cap('\\', S("""
.....
#....
.#...
..#..
...#.
....#
....."""))
cap('^', S("""
..#..
.#.#.
#...#
.....
.....
.....
....."""))
cap('~', S("""
.....
.....
.#..#
#.##.
.....
.....
....."""))

cap('←', S("""
.....
..#..
.#...
#####
.#...
..#..
....."""))
cap('→', S("""
.....
..#..
...#.
#####
...#.
..#..
....."""))
cap('↑', S("""
..#..
.###.
#.#.#
..#..
..#..
..#..
....."""))
cap('↓', S("""
.....
..#..
..#..
..#..
#.#.#
.###.
..#.."""))
cap('◀', S("""
....#
...##
..###
.####
..###
...##
....#"""))
cap('▶', S("""
#....
##...
###..
####.
###..
##...
#...."""))
cap('▲', S("""
.....
.....
..#..
.###.
#####
.....
....."""))
cap('▼', S("""
.....
.....
#####
.###.
..#..
.....
....."""))
cap('♥', S("""
.....
.#.#.
#####
#####
.###.
..#..
....."""))
cap('♦', S("""
.....
..#..
.###.
#####
.###.
..#..
....."""))
cap('♣', S("""
.###.
.###.
#.#.#
#####
#.#.#
..#..
.###."""))
cap('♠', S("""
..#..
.###.
#####
#####
#.#.#
..#..
.###."""))
cap('★', S("""
..#..
..#..
#####
.###.
.#.#.
#...#
....."""))
cap('♪', S("""
..##.
..#.#
..#..
..#..
.##..
###..
.#..."""))
cap('✓', S("""
.....
....#
...#.
#.#..
.#...
.....
....."""))
cap('×', S("""
.....
#...#
.#.#.
..#..
.#.#.
#...#
....."""))
cap('·', S("""
.....
.....
.....
.##..
.##..
.....
....."""))
cap('•', S("""
.....
.....
.###.
.###.
.###.
.....
....."""))
cap('…', ['.....'] * 6 + ['#.#.#'])
cap('–', S("""
.....
.....
.....
#####
.....
.....
....."""))
cap('—', G['–'][3:10])
cap('°', S("""
.##..
#..#.
.##..
.....
.....
.....
....."""))
cap('■', S("""
.....
#####
#####
#####
#####
#####
....."""))
cap('□', S("""
.....
#####
#...#
#...#
#...#
#####
....."""))
cap('●', S("""
.....
.###.
#####
#####
#####
.###.
....."""))
cap('○', S("""
.....
.###.
#...#
#...#
#...#
.###.
....."""))
cap('↺', S("""
.##.#
#..##
#.###
#....
#...#
.###.
....."""))
cap('ⅰ', ['.....'] * 7)
del G['ⅰ']

ALIASES = {'“': '"', '”': '"', '‘': "'", '’': "'", '„': '"', '´': "'", '`': "'"}

def bitmap(spec, bold):
    rows = []
    for r in spec:
        r = (r or '').ljust(5, '.')
        bits = [c == '#' for c in r]
        if bold:
            bits = bits + [False]
            bits = [bits[i] or (i > 0 and bits[i - 1]) for i in range(len(bits))]
        rows.append(bits)
    return rows

def contours(rows):
    H = len(rows)
    W = max(len(r) for r in rows)

    def filled(x, row):
        return 0 <= row < H and 0 <= x < len(rows[row]) and rows[row][x]

    edges = {}

    def add(a, b):
        edges.setdefault(a, []).append(b)

    for row in range(H):
        for x in range(W):
            if not filled(x, row):
                continue
            y0 = (9 - row)
            y1 = y0 + 1
            if not filled(x - 1, row):
                add((x, y0), (x, y1))
            if not filled(x, row - 1):
                add((x, y1), (x + 1, y1))
            if not filled(x + 1, row):
                add((x + 1, y1), (x + 1, y0))
            if not filled(x, row + 1):
                add((x + 1, y0), (x, y0))
    loops = []
    while edges:
        start = next(iter(edges))
        loop = [start]
        cur = start
        prev_dir = None
        while True:
            outs = edges[cur]
            if len(outs) == 1:
                nxt = outs[0]
            else:
                def turn_score(p):
                    d = (p[0] - cur[0], p[1] - cur[1])
                    if prev_dir is None:
                        return 0
                    cross = prev_dir[0] * d[1] - prev_dir[1] * d[0]
                    return cross
                outs.sort(key=turn_score)
                nxt = outs[0]
            outs.remove(nxt)
            if not outs:
                del edges[cur]
            prev_dir = (nxt[0] - cur[0], nxt[1] - cur[1])
            cur = nxt
            if cur == start:
                break
            loop.append(cur)
        simp = []
        n = len(loop)
        for i in range(n):
            a, b, c = loop[i - 1], loop[i], loop[(i + 1) % n]
            if (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) != 0:
                simp.append(b)
        loops.append(simp)
    return loops

def build(bold, family, style, weight):
    adv = 7 if bold else 6
    order = ['.notdef']
    cmap = {}
    glyphs = {}
    metrics = {}
    pen = TTGlyphPen(None)
    for (x0, y0, x1, y1) in [(0, 0, 5, 7)]:
        pen.moveTo((x0 * U, y0 * U)); pen.lineTo((x0 * U, y1 * U)); pen.lineTo((x1 * U, y1 * U)); pen.lineTo((x1 * U, y0 * U)); pen.closePath()
    glyphs['.notdef'] = pen.glyph()
    metrics['.notdef'] = (adv * U, 0)
    for ch, spec in G.items():
        name = 'uni%04X' % ord(ch)
        order.append(name)
        cmap[ord(ch)] = name
        pen = TTGlyphPen(None)
        loops = contours(bitmap(spec, bold))
        for lp in loops:
            pen.moveTo((lp[0][0] * U, lp[0][1] * U))
            for p in lp[1:]:
                pen.lineTo((p[0] * U, p[1] * U))
            pen.closePath()
        g = pen.glyph()
        glyphs[name] = g
        xmin = min((p[0] for lp in loops for p in lp), default=0) * U
        metrics[name] = (adv * U, xmin)
    for a, b in ALIASES.items():
        cmap[ord(a)] = 'uni%04X' % ord(b)
    cmap[0x00A0] = 'uni0020'
    fb = FontBuilder(1200, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=1000, descent=-200)
    fb.setupNameTable({'familyName': family, 'styleName': style, 'uniqueFontIdentifier': family + '-' + style,
                       'fullName': family + ' ' + style, 'psName': family + '-' + style, 'version': 'Version 1.0'})
    fb.setupOS2(sTypoAscender=1000, sTypoDescender=-200, sTypoLineGap=0, usWinAscent=1000, usWinDescent=200,
                usWeightClass=weight, fsType=0, sxHeight=500, sCapHeight=700, achVendID='RTRO')
    fb.setupPost(isFixedPitch=1)
    fb.setupDummyDSIG = None
    buf = io.BytesIO()
    fb.font.flavor = 'woff'
    fb.font.save(buf)
    return buf.getvalue(), fb

if __name__ == '__main__':
    out_css = sys.argv[1]
    out_ttf = sys.argv[2] if len(sys.argv) > 2 else None
    css = []
    for bold, weight, style in [(False, 400, 'Regular'), (True, 700, 'Bold')]:
        data, fb = build(bold, 'RetroPix', style, weight)
        b64 = base64.b64encode(data).decode()
        css.append("@font-face{font-family:'RetroPix';src:url(data:font/woff;base64,%s) format('woff');font-weight:%d;font-style:normal;font-display:block}" % (b64, weight))
        if out_ttf:
            fb.font.flavor = None
            fb.font.save(out_ttf.replace('.ttf', '-%s.ttf' % style))
    with open(out_css, 'w') as f:
        f.write('\n'.join(css) + '\n')
    print('glyphs:', len(G), 'css bytes:', sum(len(c) for c in css))
