from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter
from rembg import remove


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = Path(r"C:\Users\vampi\Desktop\dresovi stock")
OUTPUT_DIR = ROOT / "public" / "dresovi"
PREVIEW_DIR = ROOT / "output" / "processed-product-previews"

PRODUCT_MAPPINGS = [
    {"source": "WhatsApp Image 2026-03-24 at 16.05.27.jpeg", "slug": "brazil-ronaldinho-zuti-sp", "sides": ("front", "back")},
    {"source": "WhatsApp Image 2026-03-24 at 16.05.52.jpeg", "slug": "barcelona-yamal-domaci", "sides": ("front", "back")},
    {"source": "WhatsApp Image 2026-03-24 at 16.06.10.jpeg", "slug": "brazil-kaka-crni", "sides": ("front", "back")},
    {"source": "WhatsApp Image 2026-03-24 at 16.06.10.jpeg", "slug": "brazil-neymar-crni", "sides": ("front",)},
    {"source": "WhatsApp Image 2026-03-24 at 16.06.10.jpeg", "slug": "brazil-ronaldinho-crni", "sides": ("front",)},
    {"source": "WhatsApp Image 2026-03-24 at 16.06.10.jpeg", "slug": "brazil-pele-crni", "sides": ("front",)},
    {"source": "WhatsApp Image 2026-03-24 at 16.06.26.jpeg", "slug": "barcelona-yamal-sareni", "sides": ("front", "back")},
    {"source": "WhatsApp Image 2026-03-24 at 16.06.34.jpeg", "slug": "santos-neymar-bijeli", "sides": ("front", "back")},
    {"source": "WhatsApp Image 2026-03-24 at 16.06.45.jpeg", "slug": "barcelona-yamal-rozo", "sides": ("front", "back")},
    {"source": "WhatsApp Image 2026-03-24 at 16.06.55.jpeg", "slug": "barcelona-neymar-retro-qatar", "sides": ("front", "back")},
    {"source": "WhatsApp Image 2026-03-24 at 16.07.07.jpeg", "slug": "italija-zeleni-posebni", "sides": ("front", "back")},
    {"source": "WhatsApp Image 2026-03-24 at 16.07.18.jpeg", "slug": "barcelona-yamal-crni-rozi", "sides": ("front", "back")},
    {"source": "WhatsApp Image 2026-03-24 at 16.07.18.jpeg", "slug": "barcelona-kobe", "sides": ("front",)},
    {"source": "WhatsApp Image 2026-03-24 at 16.08.21.jpeg", "slug": "barcelona-raphinha", "sides": ("front", "back")},
    {"source": "WhatsApp Image 2026-03-24 at 16.08.33.jpeg", "slug": "dortmund-adeyemi", "sides": ("front", "back")},
    {"source": "WhatsApp Image 2026-03-24 at 16.08.42.jpeg", "slug": "atletico-griezmann", "sides": ("front", "back")},
    {"source": "WhatsApp Image 2026-03-24 at 16.09.14.jpeg", "slug": "psg-kvaratskhelia", "sides": ("front", "back")},
    {"source": "WhatsApp Image 2026-03-24 at 16.09.25.jpeg", "slug": "real-bellingham", "sides": ("front", "back")},
    {"source": "WhatsApp Image 2026-03-24 at 16.09.39.jpeg", "slug": "real-mbappe-2526", "sides": ("front", "back")},
    {"source": "WhatsApp Image 2026-03-24 at 16.09.39.jpeg", "slug": "real-guler", "sides": ("front",)},
    {"source": "WhatsApp Image 2026-03-24 at 16.09.51.jpeg", "slug": "psg-doue-2526", "sides": ("front", "back")},
    {"source": "WhatsApp Image 2026-03-24 at 16.10.09.jpeg", "slug": "psg-doue-bijeli", "sides": ("front", "back")},
    {"source": "WhatsApp Image 2026-03-24 at 16.11.01.jpeg", "slug": "bayern-luis-diaz", "sides": ("front",)},
    {"source": "WhatsApp Image 2026-03-24 at 16.11.01.jpeg", "slug": "bayern-musiala-crveni", "sides": ("front", "back")},
    {"source": "WhatsApp Image 2026-03-24 at 16.11.34 (1).jpeg", "slug": "real-ronaldo-ljubicasti-cl", "sides": ("front", "back")},
    {"source": "WhatsApp Image 2026-03-24 at 16.11.34 (2).jpeg", "slug": "manutd-ronaldo-crveni-ucl", "sides": ("front", "back")},
    {"source": "WhatsApp Image 2026-03-24 at 16.11.34.jpeg", "slug": "real-ronaldo-bijeli-cl", "sides": ("front", "back")},
    {"source": "WhatsApp Image 2026-03-24 at 16.16.13.jpeg", "slug": "intermiami-messi-rozi", "sides": ("front", "back")},
    {"source": "WhatsApp Image 2026-03-24 at.jpeg", "slug": "alnassr-ronaldo-zuti", "sides": ("front", "back")},
]

CARD_WIDTH = 1200
CARD_HEIGHT = 1500


def find_foreground_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    arr = np.asarray(image.convert("RGB"), dtype=np.int16)
    h, w, _ = arr.shape
    patch = max(18, min(h, w) // 16)
    corners = np.concatenate(
        [
            arr[:patch, :patch].reshape(-1, 3),
            arr[:patch, -patch:].reshape(-1, 3),
            arr[-patch:, :patch].reshape(-1, 3),
            arr[-patch:, -patch:].reshape(-1, 3),
        ],
        axis=0,
    )
    background_color = np.median(corners, axis=0)
    distance = np.sqrt(((arr - background_color) ** 2).sum(axis=2))

    threshold = 34.0
    background_like = distance < threshold
    visited = np.zeros((h, w), dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    def enqueue(x: int, y: int) -> None:
        if 0 <= x < w and 0 <= y < h and not visited[y, x] and background_like[y, x]:
            visited[y, x] = True
            queue.append((x, y))

    for x in range(w):
        enqueue(x, 0)
        enqueue(x, h - 1)
    for y in range(h):
        enqueue(0, y)
        enqueue(w - 1, y)

    while queue:
        x, y = queue.popleft()
        enqueue(x - 1, y)
        enqueue(x + 1, y)
        enqueue(x, y - 1)
        enqueue(x, y + 1)

    foreground = ~visited
    ys, xs = np.where(foreground)

    if len(xs) == 0 or len(ys) == 0:
        return (0, 0, w, h)

    x0, x1 = xs.min(), xs.max()
    y0, y1 = ys.min(), ys.max()
    pad_x = max(12, int((x1 - x0) * 0.08))
    pad_y = max(12, int((y1 - y0) * 0.08))

    return (
        max(0, x0 - pad_x),
        max(0, y0 - pad_y),
        min(w, x1 + pad_x),
        min(h, y1 + pad_y),
    )


def isolate_panel(source: Image.Image, side: str) -> Image.Image:
    width, height = source.size
    top = int(height * 0.04)
    bottom = int(height * 0.72)

    if side == "front":
        left = int(width * 0.03)
        right = int(width * 0.47)
    else:
        left = int(width * 0.56)
        right = int(width * 0.97)

    crop = source.crop((left, top, right, bottom)).convert("RGBA")
    bbox = find_foreground_bbox(crop)
    subject = crop.crop(bbox)
    subject = ImageEnhance.Contrast(subject).enhance(1.08)
    subject = ImageEnhance.Color(subject).enhance(1.06)
    subject = ImageEnhance.Brightness(subject).enhance(1.03)
    subject = remove(subject).convert("RGBA")

    # Remove tiny carpet remnants.
    subject = trim_alpha(subject)
    return subject


def trim_alpha(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = alpha.point(lambda p: 255 if p > 16 else 0).getbbox()
    if not bbox:
        return image
    return image.crop(bbox)


def build_background() -> Image.Image:
    background = Image.new("RGBA", (CARD_WIDTH, CARD_HEIGHT), "#0a0a0a")
    overlay = Image.new("RGBA", (CARD_WIDTH, CARD_HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.rectangle((0, 0, CARD_WIDTH, CARD_HEIGHT), fill=(12, 12, 12, 255))
    draw.ellipse(
        (-140, -220, CARD_WIDTH + 160, CARD_HEIGHT * 0.92),
        fill=(245, 245, 245, 16),
    )
    draw.ellipse(
        (CARD_WIDTH * 0.15, CARD_HEIGHT * 0.06, CARD_WIDTH * 0.85, CARD_HEIGHT * 0.72),
        fill=(255, 255, 255, 22),
    )
    draw.ellipse(
        (CARD_WIDTH * 0.24, CARD_HEIGHT * 0.18, CARD_WIDTH * 0.76, CARD_HEIGHT * 0.62),
        fill=(232, 255, 60, 15),
    )
    background = Image.alpha_composite(background, overlay.filter(ImageFilter.GaussianBlur(46)))
    vignette = Image.new("L", (CARD_WIDTH, CARD_HEIGHT), 0)
    ImageDraw.Draw(vignette).ellipse(
        (-220, -160, CARD_WIDTH + 220, CARD_HEIGHT + 280),
        fill=255,
    )
    vignette = ImageChops.invert(vignette).filter(ImageFilter.GaussianBlur(80))
    background.putalpha(255)
    background = Image.composite(Image.new("RGBA", background.size, "#050505"), background, vignette)
    return background


def compose_product_card(subject: Image.Image) -> Image.Image:
    canvas = build_background()
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(shadow)
    draw.ellipse(
        (CARD_WIDTH * 0.25, CARD_HEIGHT * 0.79, CARD_WIDTH * 0.75, CARD_HEIGHT * 0.89),
        fill=(0, 0, 0, 95),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(36))
    canvas = Image.alpha_composite(canvas, shadow)

    max_width = int(CARD_WIDTH * 0.82)
    max_height = int(CARD_HEIGHT * 0.76)
    ratio = min(max_width / subject.width, max_height / subject.height)
    resized = subject.resize(
        (max(1, int(subject.width * ratio)), max(1, int(subject.height * ratio))),
        Image.Resampling.LANCZOS,
    )

    x = (CARD_WIDTH - resized.width) // 2
    y = int(CARD_HEIGHT * 0.1) + max(0, (max_height - resized.height) // 2)
    canvas.alpha_composite(resized, (x, y))

    light = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(light).ellipse(
        (CARD_WIDTH * 0.18, CARD_HEIGHT * 0.02, CARD_WIDTH * 0.82, CARD_HEIGHT * 0.72),
        fill=(255, 255, 255, 18),
    )
    canvas = Image.alpha_composite(canvas, light.filter(ImageFilter.GaussianBlur(70)))
    return canvas.convert("RGB")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

    for item in PRODUCT_MAPPINGS:
        source_path = SOURCE_DIR / item["source"]
        slug = item["slug"]
        if not source_path.exists():
            print(f"Missing source: {source_path}")
            continue

        source = Image.open(source_path).convert("RGB")
        product_dir = OUTPUT_DIR / slug
        product_dir.mkdir(parents=True, exist_ok=True)

        for side in item["sides"]:
            isolated = isolate_panel(source, side)
            final = compose_product_card(isolated)
            final.save(product_dir / f"{side}.webp", "WEBP", quality=88, method=6)

        # Quick preview strip for manual checks.
        preview = Image.new("RGB", (CARD_WIDTH * 2 + 40, CARD_HEIGHT), "#050505")
        preview.paste(Image.open(product_dir / "front.webp").convert("RGB"), (0, 0))
        if (product_dir / "back.webp").exists():
            preview.paste(Image.open(product_dir / "back.webp").convert("RGB"), (CARD_WIDTH + 40, 0))
        preview.save(PREVIEW_DIR / f"{slug}.jpg", quality=90)
        print(f"Processed {slug}")


if __name__ == "__main__":
    main()
