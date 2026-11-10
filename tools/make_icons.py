"""Draw MyWorkout's app icon (a dumbbell on a dark tile) as PNGs, no dependencies."""
import struct, sys, zlib, os

OUT = sys.argv[1]
BG = (13, 15, 18)
FG = (255, 122, 26)

def rrect(x, y, x0, y0, x1, y1, r):
    if x < x0 or x > x1 or y < y0 or y > y1:
        return False
    cx = min(max(x, x0 + r), x1 - r)
    cy = min(max(y, y0 + r), y1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r

# Shapes in a 0..1 unit square.
SHAPES = [
    (0.22, 0.47, 0.78, 0.53, 0.02),   # bar
    (0.25, 0.30, 0.33, 0.70, 0.03),   # inner plates
    (0.67, 0.30, 0.75, 0.70, 0.03),
    (0.16, 0.37, 0.235, 0.63, 0.025), # outer plates
    (0.765, 0.37, 0.84, 0.63, 0.025),
]

def png(size, path):
    ss = 3  # supersampling
    rows = []
    for py in range(size):
        row = bytearray([0])
        for px in range(size):
            hits = 0
            for sy in range(ss):
                for sx in range(ss):
                    x = (px + (sx + .5) / ss) / size
                    y = (py + (sy + .5) / ss) / size
                    if any(rrect(x, y, *s) for s in SHAPES):
                        hits += 1
            a = hits / (ss * ss)
            row += bytes(round(BG[i] * (1 - a) + FG[i] * a) for i in range(3))
        rows.append(bytes(row))
    raw = zlib.compress(b''.join(rows), 9)
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)) +
                chunk(b'IDAT', raw) + chunk(b'IEND', b''))

os.makedirs(OUT, exist_ok=True)
png(180, os.path.join(OUT, 'apple-touch-icon.png'))
png(192, os.path.join(OUT, 'icon-192.png'))
png(512, os.path.join(OUT, 'icon-512.png'))
print('icons ok')
