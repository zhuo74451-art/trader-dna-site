"""Bake Traditional-Chinese identity cards: inpaint the baked Simplified text,
redraw name + classical verse in Traditional, add the permanent QR plate."""
import json, sys, os
import cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont

S = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
ORIG = os.path.join(REPO, 'cinema/assets/identity-cards/source-simplified')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(REPO, 'cinema/assets/identity-cards')
FONT_DIR = os.environ.get('NOTO_CJK_DIR', 'noto-cjk')  # sparse clone of github.com/notofonts/noto-cjk
SERIF_BLACK = f'{FONT_DIR}/Serif/SubsetOTF/TC/NotoSerifTC-Black.otf'
SERIF_BOLD = f'{FONT_DIR}/Serif/SubsetOTF/TC/NotoSerifTC-Bold.otf'
SANS_BOLD = f'{FONT_DIR}/Sans/SubsetOTF/TC/NotoSansTC-Bold.otf'
SANS_MED = f'{FONT_DIR}/Sans/SubsetOTF/TC/NotoSansTC-Medium.otf'
MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'
QR_URL = 'https://82trade-team.github.io/dna/'

types = json.load(open(f'{REPO}/data/types.json'))
OVERRIDES = {  # mirror CLASSICAL_VERSE_OVERRIDES (hant) in scan01-authority-preview.js
    'SAGF': '封侯非我意，但願海波平。',
    'SAHF': '草枯鷹眼疾，雪盡馬蹄輕。',
    'SAHC': '長風破浪會有時，直掛雲帆濟滄海。',
}


def text_mask(gray, box, thresh, keep):
    """Dark components fully inside `box` (x0,y0,x1,y1) passing `keep`."""
    x0, y0, x1, y1 = box
    sub = (gray[y0:y1, x0:x1] < thresh).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(sub, 8)
    mask = np.zeros_like(gray, dtype=np.uint8)
    bbox = None
    for i in range(1, n):
        x, y, w, h, a = stats[i]
        if a < 3:
            continue
        if not keep(x + x0, y + y0, w, h, x1 - x0, y1 - y0, x, y):
            continue
        mask[y0:y1, x0:x1][lab == i] = 255
        bx = (x + x0, y + y0, x + x0 + w, y + y0 + h)
        bbox = bx if bbox is None else (min(bbox[0], bx[0]), min(bbox[1], bx[1]), max(bbox[2], bx[2]), max(bbox[3], bx[3]))
    return mask, bbox


def inside(margin=1):
    def keep(ax, ay, w, h, W, H, x, y):
        return x >= margin and y >= margin and x + w <= W - margin and y + h <= H - margin
    return keep


def verse_lines(draw, font, text, max_w):
    import re
    clauses = re.findall(r'[^，。！？；]+[，。！？；]?', text)
    lines, line = [], ''
    for c in clauses:
        cand = line + c
        if line and draw.textlength(cand, font=font) > max_w:
            lines.append(line); line = c
        else:
            line = cand
    if line:
        lines.append(line)
    if len(lines) <= 2:
        return lines
    out, v = [], ''
    for ch in text:
        if v and draw.textlength(v + ch, font=font) > max_w:
            out.append(v); v = ch
        else:
            v += ch
    if v:
        out.append(v)
    return out[:2]


def qr_plate(px=4):
    p = cv2.QRCodeEncoder_Params(); p.correction_level = cv2.QRCodeEncoder_CORRECT_LEVEL_M
    m = cv2.QRCodeEncoder.create(p).encode(QR_URL)  # includes 2-module quiet zone
    m = cv2.resize(m, (m.shape[1] * px, m.shape[0] * px), interpolation=cv2.INTER_NEAREST)
    qr = Image.fromarray(m).convert('RGB')
    qr = Image.fromarray(np.where(np.array(qr) < 128, 10, 252).astype(np.uint8))
    return qr


def bake(code):
    src = cv2.imread(f'{ORIG}/{code}.webp', cv2.IMREAD_COLOR)
    gray = cv2.cvtColor(src, cv2.COLOR_BGR2GRAY)
    H, W = gray.shape
    masks = []
    # 1) type name (big black serif)
    nchar = len(types[code]['name'])
    name_mask, name_box = text_mask(gray, (60, 410, 72 + nchar * 96 + 12, 538), 120, inside())
    masks.append(name_mask)
    dy = int(name_box[3]) - 522  # some layouts sit higher
    # 2) tagline (grey sans)
    nobar = lambda ax, ay, w, h, W, H, x, y: not (w > 50 and h < 14) and x >= 1 and y >= 1 and x + w <= W - 1 and y + h <= H - 1
    m, _ = text_mask(gray, (60, 545 + dy, 480, 672 + dy), 175, nobar); masks.append(m)
    # 3) left keyword lists (english + chinese): small glyph components only
    small = lambda ax, ay, w, h, W, H, x, y: w < 40 and h < 26 and x >= 1 and y >= 1 and x + w <= W - 1 and y + h <= H - 1
    m, _ = text_mask(gray, (60, 672 + dy, 320, 886 + dy), 205, small); masks.append(m)
    # 4) footer keyword row
    m, _ = text_mask(gray, (60, 1218, 640, 1310), 170, small); masks.append(m)
    mask = np.maximum.reduce(masks)
    mask = cv2.dilate(mask, np.ones((5, 5), np.uint8), iterations=1)
    clean = cv2.inpaint(src, mask, 7, cv2.INPAINT_TELEA)
    # bottom-right labels ("18 CHOICES / YOUR PATTERN", "82 / CODE"): feathered paper band
    x0, y0, x1, y1 = 690, 1118, 1060, 1335
    band = clean[y0:y1, x0:x1].astype(float)
    col = np.median(band, axis=1)
    col = cv2.GaussianBlur(col[:, None, :].astype(np.float32), (1, 0), sigmaX=0.1, sigmaY=6)[:, 0, :] if False else col
    patch = np.repeat(col[:, None, :], x1 - x0, axis=1)
    alpha = np.ones((y1 - y0, x1 - x0))
    alpha[:26] *= np.linspace(0, 1, 26)[:, None] ** 1.3
    alpha[:, :70] *= np.linspace(0, 1, 70)[None, :]
    clean[y0:y1, x0:x1] = (band * (1 - alpha[..., None]) + patch * alpha[..., None]).astype(np.uint8)
    if code == 'SAGC':  # source art carries a pale box behind the tagline; feather it away
        x0, y0, x1, y1 = 64, 548, 540, 690
        col = clean[y0:y1, 40:56].mean(axis=1)  # paper colour per row, left margin
        patch = np.repeat(col[:, None, :], x1 - x0, axis=1)
        alpha = np.ones((y1 - y0, x1 - x0))
        ramp = np.linspace(1, 0, 90)
        alpha[:, -90:] *= ramp
        alpha[:12] *= np.linspace(0, 1, 12)[:, None]; alpha[-12:] *= np.linspace(1, 0, 12)[:, None]
        region = clean[y0:y1, x0:x1].astype(float)
        clean[y0:y1, x0:x1] = (region * (1 - alpha[..., None]) + patch * alpha[..., None]).astype(np.uint8)

    img = Image.fromarray(cv2.cvtColor(clean, cv2.COLOR_BGR2RGB))
    d = ImageDraw.Draw(img)
    t = types[code]
    name = t['name']
    # name — match original glyph height
    x0, y0, x1, y1 = name_box
    target_h = y1 - y0
    size = 40
    while True:
        f = ImageFont.truetype(SERIF_BLACK, size)
        bb = d.textbbox((0, 0), name, font=f)
        if bb[3] - bb[1] >= target_h or size > 140:
            break
        size += 1
    bb = d.textbbox((0, 0), name, font=f)
    d.text((x0 - bb[0], y1 - bb[3]), name, font=f, fill=(10, 10, 9))
    # verse (same layout rules as the runtime canvas)
    verse = OVERRIDES.get(code) or t['classicalVerse']
    n = len(verse)
    vsize = 24 if n > 22 else 28 if n > 17 else 32 if n > 12 else 36
    vf = ImageFont.truetype(SERIF_BOLD, vsize)
    import re
    clauses = re.findall(r'[^，。！？；]+[，。！？；]?', verse)
    while True:
        vf = ImageFont.truetype(SERIF_BOLD, vsize)
        if d.textlength(verse, font=vf) <= 330:
            lines = [verse]
        else:
            best = None
            for k in range(1, len(clauses)):
                a, b = ''.join(clauses[:k]), ''.join(clauses[k:])
                w = max(d.textlength(a, font=vf), d.textlength(b, font=vf))
                if best is None or w < best[0]:
                    best = (w, [a, b])
            lines = best[1] if best else [verse]
        widest = max(d.textlength(l, font=vf) for l in lines)
        if widest <= 360 or vsize <= 22:
            break
        vsize -= 2
    lh = int(vsize * 1.47) if len(lines) > 1 else 52
    base = (606 if len(lines) > 1 else 626) + dy
    for i, line in enumerate(lines):
        d.text((77, base + i * lh), line, font=vf, fill=(10, 10, 9), anchor='ls')
    # QR plate bottom-right
    qr = qr_plate(4)  # 33 modules * 4 = 132
    q = qr.size[0]
    qx, qy = 1008 - q, 1172
    plate = Image.new('RGB', (q, q), (252, 251, 247))
    img.paste(plate, (qx, qy))
    img.paste(qr, (qx, qy))
    sans = ImageFont.truetype(SANS_BOLD, 19)
    sans_m = ImageFont.truetype(SANS_MED, 15)
    mono = ImageFont.truetype(MONO, 12)
    tx = qx - 18
    d.text((tx, qy + 64), '掃碼測你的', font=sans, fill=(34, 33, 31), anchor='rs')
    d.text((tx, qy + 92), '交易 DNA →', font=sans, fill=(34, 33, 31), anchor='rs')
    d.text((tx, qy + 120), f'82 / {code}', font=mono, fill=(119, 115, 107), anchor='rs')
    img.save(f'{OUT}/{code}.webp', 'WEBP', quality=88, method=6)
    return name_box, size


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for code in types:
        if isinstance(types[code], dict) and 'classicalVerse' in types[code]:
            print(code, bake(code))
