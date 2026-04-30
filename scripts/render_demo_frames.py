#!/usr/bin/env python3
"""Render scene frames for the WorkProof demo video.

Two kinds of scenes:

1. Static screenshot scenes — one PNG, held for `duration` seconds. The full
   docs/screenshots/<name>.png is shown, no zoom/crop.

2. Typing animation scene — many PNGs at 30 fps showing a synthetic, on-brand
   claim form being filled out character-by-character. ffmpeg concats them
   with a per-frame duration. This gives judges a "live demo" feel without
   needing a screen recording.

Output → docs/.video_frames/  +  concat.txt for ffmpeg.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SS = ROOT / "docs" / "screenshots"
OUT = ROOT / "docs" / ".video_frames"
if OUT.exists():
    for p in OUT.iterdir():
        p.unlink()
OUT.mkdir(exist_ok=True)

W, H = 1920, 1080
BG = (11, 13, 18)
PANEL = (20, 24, 33)
PANEL_BORDER = (44, 52, 70)
INPUT_BG = (15, 18, 26)
INPUT_BORDER = (60, 70, 92)
INPUT_BORDER_FOCUS = (88, 232, 178)
TITLE_FG = (255, 255, 255)
SUB_FG = (184, 193, 217)
LABEL_FG = (160, 172, 196)
INPUT_FG = (235, 240, 250)
PLACEHOLDER = (90, 100, 122)
ACCENT = (88, 232, 178)
BUTTON_BG = (88, 232, 178)
BUTTON_FG = (8, 14, 12)

FONT_REG  = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"

step_font   = ImageFont.truetype(FONT_BOLD, 50)
sub_font    = ImageFont.truetype(FONT_REG,  30)
brand_font  = ImageFont.truetype(FONT_BOLD, 24)
form_title  = ImageFont.truetype(FONT_BOLD, 44)
form_label  = ImageFont.truetype(FONT_BOLD, 24)
form_input  = ImageFont.truetype(FONT_REG,  30)
button_font = ImageFont.truetype(FONT_BOLD, 30)
caption     = ImageFont.truetype(FONT_REG,  26)

BAR_TOP = 110
BAR_BOT = 100


def draw_chrome(canvas: Image.Image, top: str, bottom: str) -> Image.Image:
    """Top + bottom translucent bars with caption text + brand mark."""
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.rectangle([0, 0, W, BAR_TOP],         fill=(11, 13, 18, 225))
    od.rectangle([0, H - BAR_BOT, W, H],     fill=(11, 13, 18, 225))
    od.rectangle([0, BAR_TOP - 3, W, BAR_TOP], fill=(*ACCENT, 200))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB")
    d = ImageDraw.Draw(canvas)
    d.text((50, 30), top, font=step_font, fill=TITLE_FG)
    d.text((50, H - BAR_BOT + 35), bottom, font=sub_font, fill=SUB_FG)
    brand = "WorkProof  -  Midnight Network"
    bw = d.textlength(brand, font=brand_font)
    d.text((W - bw - 50, 45), brand, font=brand_font, fill=ACCENT)
    return canvas


def fit_screenshot(canvas: Image.Image, img_name: str) -> Image.Image:
    src = Image.open(SS / img_name).convert("RGB")
    inner_w = W - 80
    inner_h = H - BAR_TOP - BAR_BOT - 40
    scale = min(inner_w / src.width, inner_h / src.height)
    new_w, new_h = int(src.width * scale), int(src.height * scale)
    src = src.resize((new_w, new_h), Image.LANCZOS)
    x = (W - new_w) // 2
    y = BAR_TOP + 20 + (inner_h - new_h) // 2
    canvas.paste(src, (x, y))
    return canvas


def render_static(idx: int, img: str, top: str, bot: str) -> Path:
    canvas = Image.new("RGB", (W, H), BG)
    canvas = fit_screenshot(canvas, img)
    canvas = draw_chrome(canvas, top, bot)
    out = OUT / f"scene_{idx:03d}.png"
    canvas.save(out, "PNG")
    return out


# ---------------------------------------------------------------------------
# Typing animation
# ---------------------------------------------------------------------------

# Form layout (centered, ~1100 wide on a 1920 canvas).
FORM_W = 1100
FORM_H = 800
FORM_X = (W - FORM_W) // 2
FORM_Y = BAR_TOP + 30

FIELDS = [
    # (label, value, placeholder, full_width=True/False, row, col, width)
    ("Your email",   "alex.morgan@deloitte.com", "name@company.com",   True,  0, 0, FORM_W - 80),
    ("Company",      "Deloitte",                 "Acme Inc",            True,  1, 0, FORM_W - 80),
    ("Role / Title", "Senior Consultant",        "Senior Engineer",     True,  2, 0, FORM_W - 80),
    ("Start date",   "2022-06",                  "YYYY-MM",             False, 3, 0, (FORM_W - 100) // 2),
    ("End date",     "2024-01",                  "YYYY-MM",             False, 3, 1, (FORM_W - 100) // 2),
]

FIELD_LABEL_H = 32
FIELD_INPUT_H = 60
FIELD_GAP_Y   = 28
ROW_Y_OFFSET  = 100   # each row stride
INPUT_PAD_X   = 20
LABEL_OFFSET  = 145   # below form title + helper line


def field_box(row: int, col: int, width: int):
    inner_x = FORM_X + 40
    inner_y = FORM_Y + LABEL_OFFSET + row * (FIELD_LABEL_H + FIELD_INPUT_H + FIELD_GAP_Y)
    if col == 0:
        x = inner_x
    else:
        x = inner_x + (FORM_W - 80 - width) - 0  # right column, simple two-col split
    return x, inner_y, width


def draw_form(canvas: Image.Image, typed: dict, focus_idx: int, cursor_on: bool, show_button: bool):
    d = ImageDraw.Draw(canvas)
    # Panel
    d.rounded_rectangle([FORM_X, FORM_Y, FORM_X + FORM_W, FORM_Y + FORM_H],
                        radius=18, fill=PANEL, outline=PANEL_BORDER, width=2)
    # Title
    d.text((FORM_X + 40, FORM_Y + 28), "Submit an Employment Claim",
           font=form_title, fill=TITLE_FG)
    d.text((FORM_X + 40, FORM_Y + 28 + 56),
           "Identifiers are SHA-256 hashed in your browser before submission.",
           font=caption, fill=SUB_FG)

    # Fields
    for i, (label, value, placeholder, full, row, col, width) in enumerate(FIELDS):
        if full:
            x = FORM_X + 40
            w = FORM_W - 80
        else:
            x, _, w = field_box(row, col, width)
            if col == 1:
                x = FORM_X + 40 + (FORM_W - 80) - w
        y_label = FORM_Y + LABEL_OFFSET + row * (FIELD_LABEL_H + FIELD_INPUT_H + FIELD_GAP_Y)
        y_input = y_label + FIELD_LABEL_H

        d.text((x, y_label), label, font=form_label, fill=LABEL_FG)

        is_focus = (i == focus_idx)
        border = INPUT_BORDER_FOCUS if is_focus else INPUT_BORDER
        d.rounded_rectangle([x, y_input, x + w, y_input + FIELD_INPUT_H],
                            radius=10, fill=INPUT_BG, outline=border,
                            width=2 if is_focus else 1)

        text = typed.get(i, "")
        text_y = y_input + (FIELD_INPUT_H - 36) // 2
        if text:
            d.text((x + INPUT_PAD_X, text_y), text, font=form_input, fill=INPUT_FG)
        elif not is_focus:
            d.text((x + INPUT_PAD_X, text_y), placeholder,
                   font=form_input, fill=PLACEHOLDER)

        if is_focus and cursor_on:
            tw = d.textlength(text, font=form_input) if text else 0
            cx = x + INPUT_PAD_X + int(tw) + 2
            d.line([(cx, text_y + 4), (cx, text_y + 36)], fill=INPUT_FG, width=2)

    # Submit button
    btn_w, btn_h = 260, 64
    bx = FORM_X + 40
    by = FORM_Y + FORM_H - btn_h - 36
    fill = BUTTON_BG if show_button else (50, 60, 78)
    fg   = BUTTON_FG if show_button else (130, 142, 165)
    d.rounded_rectangle([bx, by, bx + btn_w, by + btn_h], radius=12, fill=fill)
    label = "Submit Claim"
    tw = d.textlength(label, font=button_font)
    d.text((bx + (btn_w - tw) // 2, by + (btn_h - 38) // 2),
           label, font=button_font, fill=fg)


def render_typing_frames(start_idx: int, top: str, bot: str) -> list[Path]:
    """Generate per-frame PNGs for a ~10s typing animation at 30fps."""
    frames: list[Path] = []
    fps = 30
    frame_idx = 0

    # Build per-frame plan.
    plan: list[tuple[int, dict, bool]] = []  # (focus_idx, typed_state, cursor_on)
    typed: dict[int, str] = {}

    # Pre-roll: empty form, no focus, 0.6s
    pre = int(0.6 * fps)
    for f in range(pre):
        plan.append((-1, dict(typed), False))

    # Type each field
    for i, (_, value, *_rest) in enumerate(FIELDS):
        # Focus pulse: 0.3s on focused empty field
        focus_pulse = int(0.3 * fps)
        for f in range(focus_pulse):
            cursor_on = (f // 8) % 2 == 0
            plan.append((i, dict(typed), cursor_on))
        # Type chars (3 frames per char ≈ 10cps)
        running = ""
        for ch in value:
            running += ch
            typed[i] = running
            for f in range(3):
                plan.append((i, dict(typed), True))
        # Hold field briefly after finishing
        hold = int(0.3 * fps)
        for f in range(hold):
            cursor_on = (f // 8) % 2 == 0
            plan.append((i, dict(typed), cursor_on))

    # Hover button highlight, 0.6s
    hover = int(0.6 * fps)
    for f in range(hover):
        plan.append((-1, dict(typed), False))

    # Hold final form, button enabled, 0.6s
    final = int(0.6 * fps)
    for f in range(final):
        plan.append((-1, dict(typed), False))

    # Render
    button_active_after = len(plan) - hover - final
    for idx, (focus, typed_state, cursor_on) in enumerate(plan):
        canvas = Image.new("RGB", (W, H), BG)
        show_button = idx >= button_active_after
        draw_form(canvas, typed_state, focus, cursor_on, show_button)
        canvas = draw_chrome(canvas, top, bot)
        out = OUT / f"scene_{start_idx:03d}_t{frame_idx:04d}.png"
        canvas.save(out, "PNG")
        frames.append(out)
        frame_idx += 1

    return frames


# ---------------------------------------------------------------------------
# Scene order
# ---------------------------------------------------------------------------
# Each entry is one of:
#   ("static", img, duration_s, top, bot)
#   ("typing", duration_s_unused, top, bot)   # duration is determined by frames

SCENES = [
    ("static", "home.png",         5,  "WorkProof",
        "Employment proof, without blind trust"),
    ("static", "home.png",         9,  "The problem",
        "Resumes are self-reported  -  LinkedIn is unverified  -  recruiters guess"),
    ("static", "home.png",         11, "The protocol",
        "Candidate commits  >  Verifier signs  >  Recruiter inspects"),

    ("static", "user.png",         5,  "Step 1  -  Open the 'My Claims' tab",
        "Candidate opens the claim portal"),

    ("typing", 0,                      "Step 2  -  Fill in the claim",
        "watch the form fill in real time  -  email + company + role + dates"),

    ("static", "user.png",         8,  "Step 3  -  Submit  >  ZK circuit runs",
        "'claim_employment' commits the claim  -  raw values never leave the page"),

    ("static", "user.png",         9,  "Step 4  -  Trust score + AI flags appear",
        "ai_scoring.py grades the claim 0-100 and surfaces missing signals"),

    ("static", "user.png",         9,  "Step 5  -  Claim ID + proof hash returned",
        "Share the Claim ID with verifiers  -  identity hashed, never stored raw"),

    ("static", "verification.png", 5,  "Step 6  -  Switch to the 'Verify' portal",
        "HR / coworker / domain check picks up the claim"),

    ("static", "verification.png", 10, "Step 7  -  Pick a verification signal",
        "email domain  -  LinkedIn  -  document  -  manual endorsement"),

    ("static", "verification.png", 10, "Step 8  -  Submit  >  audit log updates",
        "'verify_claim' circuit runs  -  trust score recomputes deterministically"),

    ("static", "recruiter.png",    5,  "Step 9  -  Open 'Discover' as a recruiter",
        "Recruiters never log in as the candidate  -  they only inspect"),

    ("static", "recruiter.png",    10, "Step 10  -  Browse verified claims",
        "every claim shows trust score, confidence band, and signals behind it"),

    ("static", "recruiter.png",    10, "Step 11  -  Score visible  -  raw data hidden",
        "no email  -  no real company name in the DB  -  no resume to forge"),

    ("static", "home.png",         12, "Architecture",
        "React + FastAPI + Midnight WASM SDK + optional Docker proof server"),
    ("static", "home.png",         9,  "Built on Midnight Network",
        "Two Compact contracts  -  four circuits  -  25 passing tests"),
]


def main() -> None:
    concat = OUT / "concat.txt"
    total = 0.0
    last_path: Path | None = None
    with concat.open("w") as f:
        for i, scene in enumerate(SCENES):
            kind = scene[0]
            if kind == "static":
                _, img, dur, top, bot = scene
                p = render_static(i, img, top, bot)
                f.write(f"file '{p.as_posix()}'\n")
                f.write(f"duration {dur}\n")
                total += dur
                last_path = p
            else:
                _, _, top, bot = scene
                frames = render_typing_frames(i, top, bot)
                per = 1 / 30
                for fp in frames:
                    f.write(f"file '{fp.as_posix()}'\n")
                    f.write(f"duration {per:.5f}\n")
                total += len(frames) * per
                last_path = frames[-1]
        # concat demuxer requires last file repeated without duration
        f.write(f"file '{last_path.as_posix()}'\n")

    mins = int(total // 60)
    secs = total - mins * 60
    print(f"wrote {len(SCENES)} scenes  total={total:.1f}s  ({mins}:{secs:05.2f})")


if __name__ == "__main__":
    main()
