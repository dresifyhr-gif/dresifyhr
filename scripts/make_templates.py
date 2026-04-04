from PIL import Image, ImageDraw, ImageFont
import os

OUTPUT = "C:/Users/vampi/Desktop/Dresify Templates"
os.makedirs(OUTPUT, exist_ok=True)

BG       = (10, 10, 10)
ACCENT   = (226, 255, 84)
WHITE    = (255, 255, 255)
GRAY     = (120, 120, 120)
DARK2    = (20, 20, 20)
DARK3    = (30, 30, 30)

def get_font(size, bold=False):
    font_paths = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/Arial Bold.ttf",
        "C:/Windows/Fonts/calibrib.ttf" if bold else "C:/Windows/Fonts/calibri.ttf",
    ]
    for p in font_paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except:
                pass
    return ImageFont.load_default()

def draw_centered(draw, text, y, font, color, width):
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    x = (width - w) // 2
    draw.text((x, y), text, font=font, fill=color)

def draw_rect_outline(draw, x1, y1, x2, y2, color, width=3):
    for i in range(width):
        draw.rectangle([x1+i, y1+i, x2-i, y2-i], outline=color)

# ─────────────────────────────────────────────
# TEMPLATE 1: Novi dres post (1080x1080)
# ─────────────────────────────────────────────
def make_novi_dres():
    W, H = 1080, 1080
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    # Background grid dots
    for x in range(0, W, 40):
        for y in range(0, H, 40):
            d.ellipse([x-1, y-1, x+1, y+1], fill=(30, 30, 30))

    # Top accent bar
    d.rectangle([0, 0, W, 8], fill=ACCENT)

    # Corner brackets top-left
    d.rectangle([40, 40, 40+60, 40+6], fill=ACCENT)
    d.rectangle([40, 40, 40+6, 40+60], fill=ACCENT)

    # Corner brackets top-right
    d.rectangle([W-100, 40, W-40, 40+6], fill=ACCENT)
    d.rectangle([W-46, 40, W-40, 40+60], fill=ACCENT)

    # Corner brackets bottom-left
    d.rectangle([40, H-46, 40+60, H-40], fill=ACCENT)
    d.rectangle([40, H-100, 40+6, H-40], fill=ACCENT)

    # Corner brackets bottom-right
    d.rectangle([W-100, H-46, W-40, H-40], fill=ACCENT)
    d.rectangle([W-46, H-100, W-46+6, H-40], fill=ACCENT)

    # Center image placeholder box
    box_x, box_y = 240, 160
    box_w, box_h = 600, 580
    d.rectangle([box_x, box_y, box_x+box_w, box_y+box_h], fill=DARK3)
    draw_rect_outline(d, box_x, box_y, box_x+box_w, box_y+box_h, (50,50,50), 2)

    # Placeholder text inside box
    ph_font = get_font(28)
    draw_centered(d, "[ FOTO DRESA ]", box_y + box_h//2 - 20, ph_font, (60,60,60), W)
    ph2_font = get_font(18)
    draw_centered(d, "Dodaj sliku dresa ovdje", box_y + box_h//2 + 20, ph2_font, (50,50,50), W)

    # Liga label
    liga_font = get_font(22)
    draw_centered(d, "LA LIGA  •  SEZONA 2025/26", 760, liga_font, GRAY, W)

    # Club name
    club_font = get_font(54, bold=True)
    draw_centered(d, "FC BARCELONA", 800, club_font, WHITE, W)

    # Player name - big accent
    player_font = get_font(86, bold=True)
    draw_centered(d, "YAMAL", 866, player_font, ACCENT, W)

    # Horizontal divider
    d.rectangle([80, 960, W-80, 963], fill=(40,40,40))

    # Price badge
    badge_w, badge_h = 140, 60
    badge_x = W//2 - badge_w//2
    d.rectangle([badge_x, 972, badge_x+badge_w, 972+badge_h], fill=ACCENT)
    price_font = get_font(36, bold=True)
    draw_centered(d, "20 EUR", 982, price_font, BG, W)

    # Logo bottom left
    logo_font = get_font(26, bold=True)
    d.text((80, 980), "DRES", font=logo_font, fill=WHITE)
    d.text((80 + 76, 980), "IFY", font=logo_font, fill=ACCENT)

    img.save(f"{OUTPUT}/template-novi-dres.png")
    print("Saved: template-novi-dres.png")

# ─────────────────────────────────────────────
# TEMPLATE 2: Giveaway post (1080x1080)
# ─────────────────────────────────────────────
def make_giveaway():
    W, H = 1080, 1080
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    # Background radial feel - concentric rings
    for r in range(500, 0, -60):
        opacity = int(8 * (1 - r/500))
        d.ellipse([W//2-r, H//2-r, W//2+r, H//2+r], outline=(opacity, opacity, opacity))

    # Top bar accent
    d.rectangle([0, 0, W, 8], fill=ACCENT)

    # Giveaway big text
    gw_font = get_font(130, bold=True)
    draw_centered(d, "GIVE", 120, gw_font, WHITE, W)
    draw_centered(d, "AWAY", 250, gw_font, ACCENT, W)

    # Subtitle
    sub_font = get_font(32)
    draw_centered(d, "OSVOJI DRES PO SVOM IZBORU", 400, sub_font, GRAY, W)

    # Divider
    d.rectangle([180, 455, W-180, 458], fill=(50,50,50))

    # Steps
    step_font = get_font(34, bold=True)
    step_desc_font = get_font(28)
    steps = [
        ("01", "PRATI @dresify"),
        ("02", "LAJKAJ OVU OBJAVU"),
        ("03", "TAG 1 PRIJATELJA"),
    ]
    y = 480
    for num, text in steps:
        # Number circle
        d.ellipse([180, y, 230, y+50], fill=ACCENT)
        num_font = get_font(22, bold=True)
        d.text((192, y+8), num, font=num_font, fill=BG)
        # Step text
        d.text((250, y+6), text, font=step_font, fill=WHITE)
        y += 80

    # Winner announcement
    d.rectangle([80, 730, W-80, 732], fill=(40,40,40))
    winner_font = get_font(28)
    draw_centered(d, "DOBITNIK SE OBJAVLJUJE U NEDJELJU", 750, winner_font, GRAY, W)

    # Dres image placeholder
    d.rectangle([340, 800, 740, 970], fill=DARK3)
    draw_rect_outline(d, 340, 800, 740, 970, (50,50,50), 2)
    ph_font = get_font(22)
    draw_centered(d, "[ FOTO DRESA ]", 875, ph_font, (60,60,60), W)

    # Logo bottom left
    d.rectangle([0, H-8, W, H], fill=ACCENT)
    logo_font = get_font(26, bold=True)
    d.text((80, H-50), "DRES", font=logo_font, fill=WHITE)
    d.text((80 + 76, H-50), "IFY", font=logo_font, fill=ACCENT)

    img.save(f"{OUTPUT}/template-giveaway.png")
    print("Saved: template-giveaway.png")

# ─────────────────────────────────────────────
# TEMPLATE 3: Mystery Box (1080x1080)
# ─────────────────────────────────────────────
def make_mystery_box():
    W, H = 1080, 1080
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    # Background dots
    for x in range(0, W, 50):
        for y in range(0, H, 50):
            d.ellipse([x-1, y-1, x+1, y+1], fill=(25,25,25))

    # Top bar
    d.rectangle([0, 0, W, 8], fill=ACCENT)

    # Question marks scattered
    qm_font = get_font(120, bold=True)
    for pos, opacity in [((80, 80), 18), ((860, 100), 15), ((60, 700), 12), ((880, 680), 18)]:
        d.text(pos, "?", font=qm_font, fill=(opacity, opacity, opacity))

    # Box illustration (simple geometric)
    bx, by = 340, 140
    bw, bh = 400, 340
    # Box body
    d.rectangle([bx, by+80, bx+bw, by+bh], fill=DARK3)
    draw_rect_outline(d, bx, by+80, bx+bw, by+bh, (50,50,50), 3)
    # Box lid
    d.rectangle([bx-20, by+40, bx+bw+20, by+100], fill=(35,35,35))
    draw_rect_outline(d, bx-20, by+40, bx+bw+20, by+100, (60,60,60), 3)
    # Ribbon
    d.rectangle([bx+bw//2-15, by+40, bx+bw//2+15, by+bh], fill=ACCENT)
    d.rectangle([bx, by+60, bx+bw, by+90], fill=ACCENT)
    # Question mark on box
    qm2_font = get_font(100, bold=True)
    draw_centered(d, "?", by+120, qm2_font, (50,50,50), W)

    # Title
    title_font = get_font(90, bold=True)
    draw_centered(d, "MYSTERY", 510, title_font, WHITE, W)
    draw_centered(d, "BOX", 600, title_font, ACCENT, W)

    # Value line
    val_font = get_font(30)
    draw_centered(d, "2 DRESA  •  IZNENAĐENJE  •  35 EUR", 710, val_font, GRAY, W)

    # Divider
    d.rectangle([180, 760, W-180, 763], fill=(40,40,40))

    # Original value strikethrough feel
    orig_font = get_font(28)
    draw_centered(d, "vrijednost 40 EUR+  →  ti placas samo 35 EUR", 780, orig_font, (100,100,100), W)

    # CTA
    cta_font = get_font(36, bold=True)
    cta_w = 500
    cta_x = (W - cta_w) // 2
    d.rectangle([cta_x, 830, cta_x+cta_w, 895], fill=ACCENT)
    draw_centered(d, "NARUCI ODMAH", 843, cta_font, BG, W)

    # Limited
    lim_font = get_font(22)
    draw_centered(d, "LIMITIRANO — SAMO 10 KUTIJA", 910, lim_font, (150,150,150), W)

    # Bottom bar
    d.rectangle([0, H-8, W, H], fill=ACCENT)
    logo_font = get_font(26, bold=True)
    d.text((80, H-50), "DRES", font=logo_font, fill=WHITE)
    d.text((80 + 76, H-50), "IFY", font=logo_font, fill=ACCENT)

    img.save(f"{OUTPUT}/template-mystery-box.png")
    print("Saved: template-mystery-box.png")

# ─────────────────────────────────────────────
# TEMPLATE 4: Story (1080x1920)
# ─────────────────────────────────────────────
def make_story():
    W, H = 1080, 1920
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    # Background dots
    for x in range(0, W, 45):
        for y in range(0, H, 45):
            d.ellipse([x-1, y-1, x+1, y+1], fill=(22,22,22))

    # Top bar
    d.rectangle([0, 0, W, 8], fill=ACCENT)

    # Corner brackets
    d.rectangle([60, 60, 60+80, 60+8], fill=ACCENT)
    d.rectangle([60, 60, 60+8, 60+80], fill=ACCENT)
    d.rectangle([W-140, 60, W-60, 60+8], fill=ACCENT)
    d.rectangle([W-68, 60, W-60, 60+80], fill=ACCENT)

    # Image placeholder
    ph_x, ph_y = 80, 140
    ph_w, ph_h = W-160, 900
    d.rectangle([ph_x, ph_y, ph_x+ph_w, ph_y+ph_h], fill=DARK3)
    draw_rect_outline(d, ph_x, ph_y, ph_x+ph_w, ph_y+ph_h, (45,45,45), 3)
    ph_font = get_font(36)
    draw_centered(d, "[ FOTO DRESA ]", ph_y + ph_h//2 - 20, ph_font, (55,55,55), W)

    # Liga
    liga_font = get_font(30)
    draw_centered(d, "LA LIGA  •  2025/26", 1100, liga_font, GRAY, W)

    # Club
    club_font = get_font(72, bold=True)
    draw_centered(d, "FC BARCELONA", 1148, club_font, WHITE, W)

    # Player accent
    player_font = get_font(110, bold=True)
    draw_centered(d, "YAMAL", 1228, player_font, ACCENT, W)

    # Divider
    d.rectangle([80, 1370, W-80, 1373], fill=(40,40,40))

    # Price
    d.rectangle([W//2-100, 1395, W//2+100, 1460], fill=ACCENT)
    price_font = get_font(44, bold=True)
    draw_centered(d, "20 EUR", 1404, price_font, BG, W)

    # CTA swipe up
    swipe_font = get_font(32, bold=True)
    draw_centered(d, "NARUCI PUTEM PORUKE", 1500, swipe_font, WHITE, W)
    arrow_font = get_font(50)
    draw_centered(d, "↑", 1545, arrow_font, ACCENT, W)

    # Delivery info
    info_font = get_font(26)
    draw_centered(d, "Dostava 1-3 dana • Cijela Hrvatska", 1630, info_font, GRAY, W)

    # Bottom bar
    d.rectangle([0, H-10, W, H], fill=ACCENT)

    # Logo
    logo_font = get_font(34, bold=True)
    d.text((80, H-70), "DRES", font=logo_font, fill=WHITE)
    d.text((80+96, H-70), "IFY", font=logo_font, fill=ACCENT)

    img.save(f"{OUTPUT}/template-story.png")
    print("Saved: template-story.png")

make_novi_dres()
make_giveaway()
make_mystery_box()
make_story()
print("\nSvi templati su na Desktopu u folderu 'Dresify Templates'!")
