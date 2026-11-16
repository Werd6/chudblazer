"""Turn the drawings in art/ into game-ready sprites in public/assets.

For each sprite: removes the background if the source has no transparency
(white backgrounds by flood fill from the edges, so white inside the drawing is
kept; dark/glowing backgrounds listed in DARK_BACKGROUNDS by brightness
threshold plus a rebuilt outline), crops to the visible pixels, optionally
mirrors it, and scales it to a fixed visual size.

    python3 scripts/prepare-sprites.py
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / 'art'
OUT = ROOT / 'public' / 'assets'

# Sizes are sqrt(width * height) of the cropped sprite in texture pixels, 2x the
# in-game size so the game can scale them down smoothly (see PLAYER_SPRITE and
# CHUDS[kind].spriteSize in src/game/config.ts).
SPRITES = [
    # (output name, source, mirror so it faces right, size)
    ('capybara-stand', 'capybara/standing.png', False, 88),
    ('capybara-walk', 'capybara/walking.png', True, 88),
    ('chud-goblin', 'chuds/goblin.jpg', False, 52),
    ('chud-ork', 'chuds/ork.png', False, 88),
    ('chud-troll', 'chuds/troll.png', False, 140),
    ('boss-king-stinky', 'bosses/king-stinky.png', False, 300),
    ('boss-frankenfart', 'bosses/frankenfart.jpg', False, 300),
    ('boss-oogly-boogly', 'bosses/oogly-boogly.png', False, 260),
    ('boss-grosstesque', 'bosses/grosstesque.png', False, 320),
]

# Sources drawn on a dark, glowing background instead of white.
DARK_BACKGROUNDS = {'bosses/frankenfart.jpg'}

PADDING = 2
WHITE_TOLERANCE = 40
EDGE_BAND = 3

DARK_BODY_LUMINANCE = 90   # brighter than this is drawing, not background glow
DARK_LINE_CLOSE = 6        # px; closes the drawing's interior line art into a solid shape
DARK_OUTLINE_WIDTH = 5     # px; outline rebuilt around the solid shape
DARK_OUTLINE_COLOR = (40, 24, 12)


def has_transparency (img: Image.Image) -> bool:
    return 'A' in img.getbands() and img.getchannel('A').getextrema()[0] < 128


def dilate (mask: np.ndarray) -> np.ndarray:
    grown = mask.copy()
    grown[1:, :] |= mask[:-1, :]
    grown[:-1, :] |= mask[1:, :]
    grown[:, 1:] |= mask[:, :-1]
    grown[:, :-1] |= mask[:, 1:]
    return grown


def dilate_by (mask: np.ndarray, steps: int) -> np.ndarray:
    for _ in range(steps):
        mask = dilate(mask)
    return mask


def erode_by (mask: np.ndarray, steps: int) -> np.ndarray:
    return ~dilate_by(~mask, steps)


def flood_from_border (passable: np.ndarray) -> np.ndarray:
    region = np.zeros_like(passable)
    region[[0, -1], :] = passable[[0, -1], :]
    region[:, [0, -1]] = passable[:, [0, -1]]

    while True:
        grown = dilate(region) & passable
        if (grown == region).all():
            return region
        region = grown


def remove_dark_background (img: Image.Image) -> Image.Image:
    rgb = np.asarray(img.convert('RGB')).copy()
    lum = rgb.astype(np.float32) @ np.array([0.299, 0.587, 0.114], dtype=np.float32)

    bright = lum > DARK_BODY_LUMINANCE
    closed = erode_by(dilate_by(bright, DARK_LINE_CLOSE), DARK_LINE_CLOSE)
    solid = ~flood_from_border(~closed)
    silhouette = dilate_by(solid, DARK_OUTLINE_WIDTH)

    rgb[silhouette & ~solid] = DARK_OUTLINE_COLOR
    alpha = silhouette.astype(np.uint8) * 255
    return Image.fromarray(np.dstack([rgb, alpha]), 'RGBA')


def remove_white_background (img: Image.Image) -> Image.Image:
    rgb = np.asarray(img.convert('RGB')).astype(np.float32)
    whitish = (255 - rgb.min(axis=2)) <= WHITE_TOLERANCE
    background = flood_from_border(whitish)

    near = background
    for _ in range(EDGE_BAND):
        near = dilate(near)
    edge = near & ~background

    alpha = np.ones(whitish.shape, dtype=np.float32)
    alpha[background] = 0

    # Edge pixels are the drawing blended over white; recover colour and coverage.
    edge_alpha = ((255 - rgb[edge]).max(axis=1) / 255).clip(1e-3, 1)
    alpha[edge] = edge_alpha
    rgb[edge] = ((rgb[edge] - (1 - edge_alpha[:, None]) * 255) / edge_alpha[:, None]).clip(0, 255)

    return Image.fromarray(np.dstack([rgb, alpha * 255]).round().astype(np.uint8), 'RGBA')


def prepare (source: str, mirror: bool, size: int) -> Image.Image:
    img = Image.open(ART / source)

    if source in DARK_BACKGROUNDS:
        img = remove_dark_background(img)
    elif has_transparency(img):
        img = img.convert('RGBA')
    else:
        img = remove_white_background(img)

    # Some sources have "solid" pixels at ~99% opacity; snap them to fully opaque.
    img.putalpha(img.getchannel('A').point(lambda a: 255 if a > 230 else a))
    img = img.crop(img.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox())

    if mirror:
        img = ImageOps.mirror(img)

    scale = size / (img.width * img.height) ** 0.5
    img = img.resize((round(img.width * scale), round(img.height * scale)), Image.Resampling.LANCZOS)
    return ImageOps.expand(img, PADDING, fill=(0, 0, 0, 0))


def main ():
    OUT.mkdir(parents=True, exist_ok=True)

    for name, source, mirror, size in SPRITES:
        img = prepare(source, mirror, size)
        img.save(OUT / f'{name}.png', optimize=True)
        print(f'{name}.png  {img.width}x{img.height}')


if __name__ == '__main__':
    main()
