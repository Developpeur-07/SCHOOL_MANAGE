"""Génère les icônes PWA sans dépendance externe (Python standard uniquement)."""

from pathlib import Path
import math
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "icons"


def png_chunk(kind: bytes, data: bytes) -> bytes:
    return struct.pack("!I", len(data)) + kind + data + struct.pack("!I", zlib.crc32(kind + data) & 0xFFFFFFFF)


def write_png(path: Path, size: int, pixels: bytearray) -> None:
    rows = b"".join(b"\x00" + pixels[y * size * 3:(y + 1) * size * 3] for y in range(size))
    header = struct.pack("!IIBBBBB", size, size, 8, 2, 0, 0, 0)
    path.write_bytes(b"\x89PNG\r\n\x1a\n" + png_chunk(b"IHDR", header) + png_chunk(b"IDAT", zlib.compress(rows, 9)) + png_chunk(b"IEND", b""))


def icon(size: int) -> bytearray:
    pixels = bytearray(size * size * 3)
    for y in range(size):
        ratio = y / max(size - 1, 1)
        color = (round(15 + 2 * ratio), round(118 - 24 * ratio), round(110 - 21 * ratio))
        for x in range(size):
            index = (y * size + x) * 3
            pixels[index:index + 3] = bytes(color)

    def point(x: float, y: float) -> tuple[float, float]:
        return x * size, y * size

    def polygon(vertices, color=(255, 255, 255)) -> None:
        vertices = [point(x, y) for x, y in vertices]
        min_y = max(0, int(min(y for _, y in vertices)))
        max_y = min(size - 1, math.ceil(max(y for _, y in vertices)))
        for y in range(min_y, max_y + 1):
            intersections = []
            for index, (x1, y1) in enumerate(vertices):
                x2, y2 = vertices[(index + 1) % len(vertices)]
                if (y1 <= y < y2) or (y2 <= y < y1):
                    intersections.append(x1 + (y - y1) * (x2 - x1) / (y2 - y1))
            intersections.sort()
            for index in range(0, len(intersections), 2):
                start = max(0, math.ceil(intersections[index]))
                end = min(size - 1, math.floor(intersections[index + 1]))
                for x in range(start, end + 1):
                    offset = (y * size + x) * 3
                    pixels[offset:offset + 3] = bytes(color)

    def circle(cx: float, cy: float, radius: float, color=(255, 255, 255)) -> None:
        center_x, center_y = point(cx, cy)
        r = radius * size
        for y in range(max(0, int(center_y - r)), min(size, math.ceil(center_y + r + 1))):
            for x in range(max(0, int(center_x - r)), min(size, math.ceil(center_x + r + 1))):
                if (x + 0.5 - center_x) ** 2 + (y + 0.5 - center_y) ** 2 <= r ** 2:
                    offset = (y * size + x) * 3
                    pixels[offset:offset + 3] = bytes(color)

    # Mortier stylisé, centré dans la zone sûre maskable.
    polygon([(0.18, 0.39), (0.50, 0.23), (0.82, 0.39), (0.50, 0.55)])
    polygon([(0.31, 0.51), (0.50, 0.605), (0.69, 0.51), (0.69, 0.63), (0.63, 0.70), (0.50, 0.75), (0.37, 0.70), (0.31, 0.63)])
    polygon([(0.80, 0.39), (0.84, 0.39), (0.84, 0.67), (0.80, 0.67)])
    circle(0.82, 0.69, 0.045)
    return pixels


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for filename, size in {
        "icon-192.png": 192,
        "icon-512.png": 512,
        "icon-maskable-512.png": 512,
        "apple-touch-icon.png": 180,
    }.items():
        write_png(OUTPUT / filename, size, icon(size))
        print(f"{filename}: {size}x{size}")


if __name__ == "__main__":
    main()
