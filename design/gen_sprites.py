#!/usr/bin/env python3
"""
Pixel art sprite generator — webplayer project
Characters: Aiden (player), Goblin (enemy), Elder Eric (NPC)
Style: 32x32px, dark fantasy + warmth contrast, 4~8 color palette per character
"""
from PIL import Image, ImageDraw
import os, shutil

# ─────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────
T   = (0,   0,   0,   0)    # transparent
OL  = (15,  15,  15,  255)  # outline

# Aiden palette (brown hair / green tunic / brown boots)
SK  = (232, 213, 183, 255)  # skin beige
HR  = (101,  67,  33, 255)  # brown hair
HR2 = (130,  90,  45, 255)  # hair highlight
TN  = ( 46, 139,  87, 255)  # green tunic
TND = ( 28,  96,  58, 255)  # tunic dark (shadow/belt)
PT  = ( 75,  48,  18, 255)  # brown pants
BT  = ( 50,  28,   6, 255)  # dark boots
SB  = (200, 202, 215, 255)  # sword blade silver
SHG = (188, 148,  18, 255)  # sword hilt gold
EYE = ( 55,  35,  15, 255)  # eyes

# Goblin palette
GG  = ( 88, 152,  72, 255)  # goblin green skin
GGD = ( 58, 112,  48, 255)  # goblin skin dark
GCL = (112,  78,  32, 255)  # goblin clothes brown
GCD = ( 80,  50,  12, 255)  # clothes dark
GER = (198,  48,  48, 255)  # goblin eyes red
GKN = (168, 172, 182, 255)  # goblin knife blade

# Elder palette
EWH = (222, 222, 222, 255)  # white hair / beard
EGR = (155, 155, 155, 255)  # gray shadow on hair
EBL = ( 52,  98, 182, 255)  # blue robe
EBD = ( 32,  68, 138, 255)  # robe dark (shadow)
EBH = ( 90, 140, 220, 255)  # robe highlight
ESK = (212, 192, 165, 255)  # elder skin (aged)
EST = (132,  94,  42, 255)  # staff brown
ESG = ( 88, 196, 102, 255)  # staff gem green

# ─────────────────────────────────────────────
# Drawing helpers
# ─────────────────────────────────────────────
def frame():
    return Image.new('RGBA', (32, 32), T)

def portrait_frame(w=48, h=48):
    return Image.new('RGBA', (w, h), T)

def sheet(*frames):
    n = len(frames)
    img = Image.new('RGBA', (32 * n, 32), T)
    for i, f in enumerate(frames):
        img.paste(f, (i * 32, 0))
    return img

def R(img, x0, y0, x1, y1, c):
    if x0 > x1 or y0 > y1: return
    ImageDraw.Draw(img).rectangle([x0, y0, x1, y1], fill=c)

def E(img, x0, y0, x1, y1, c):
    ImageDraw.Draw(img).ellipse([x0, y0, x1, y1], fill=c)

def P(img, x, y, c):
    if 0 <= x < img.width and 0 <= y < img.height:
        img.putpixel((x, y), c)

def outline_rect(img, x0, y0, x1, y1, fill, ol=OL):
    R(img, x0, y0, x1, y1, ol)
    R(img, x0+1, y0+1, x1-1, y1-1, fill)

# ═══════════════════════════════════════════════
# AIDEN — front view (facing down)
# ═══════════════════════════════════════════════
def aiden_down(walk_phase=0, breathe=0):
    """
    walk_phase: 0=neutral, 1=left-forward, 2=right-forward
    breathe:    0 or 1 (body shift up for idle breathing)
    """
    img = frame()
    b = breathe

    # Hair / head
    E(img, 11, 2-b, 21, 11-b, HR)
    # Face
    E(img, 12, 5-b, 20, 12-b, SK)
    # Hair highlight center top
    R(img, 14, 3-b, 18, 5-b, HR2)
    # Eyes
    R(img, 13, 7-b, 14, 8-b, EYE)
    R(img, 17, 7-b, 18, 8-b, EYE)

    # Body / tunic
    R(img, 10, 12-b, 22, 22-b, TN)
    R(img, 10, 20-b, 22, 22-b, TND)   # belt shadow

    # Left arm
    R(img, 7, 13-b, 10, 21-b, TN)
    R(img, 7, 18-b, 10, 21-b, SK)     # left hand skin

    # Right arm
    R(img, 22, 13-b, 25, 21-b, TN)
    R(img, 22, 18-b, 25, 21-b, SK)    # right hand skin

    # Sword (right hand, raised vertically)
    R(img, 25, 8-b, 27, 21-b, SB)     # blade
    R(img, 23, 15-b, 28, 17-b, SHG)   # crossguard
    P(img, 26, 7-b, SB)                # blade tip

    # Legs
    base = 22 - b
    if walk_phase == 1:   # left leg forward
        R(img, 10, base-1, 15, base+5, PT)
        R(img, 10, base+3, 15, base+8, BT)
        R(img, 17, base+1, 22, base+7, PT)
        R(img, 17, base+5, 22, base+10, BT)
    elif walk_phase == 2:  # right leg forward
        R(img, 10, base+1, 15, base+7, PT)
        R(img, 10, base+5, 15, base+10, BT)
        R(img, 17, base-1, 22, base+5, PT)
        R(img, 17, base+3, 22, base+8, BT)
    else:                  # neutral
        R(img, 10, base, 15, base+6, PT)
        R(img, 10, base+4, 15, base+9, BT)
        R(img, 17, base, 22, base+6, PT)
        R(img, 17, base+4, 22, base+9, BT)
    return img

# ═══════════════════════════════════════════════
# AIDEN — back view (facing up)
# ═══════════════════════════════════════════════
def aiden_up(walk_phase=0):
    img = frame()

    # Back of head (all hair)
    E(img, 11, 2, 21, 11, HR)
    R(img, 13, 3, 18, 7, HR2)         # lighter center of hair

    # Back of tunic
    R(img, 10, 11, 22, 21, TN)
    R(img, 10, 19, 22, 21, TND)

    # Left arm (back view)
    R(img, 7, 12, 10, 20, TN)
    R(img, 7, 18, 10, 20, SK)

    # Right arm (back view)
    R(img, 22, 12, 25, 20, TN)
    R(img, 22, 18, 25, 20, SK)

    # Sword visible on right side from back
    R(img, 25, 8, 27, 20, SB)
    R(img, 23, 14, 28, 16, SHG)

    # Legs
    base = 21
    if walk_phase == 1:
        R(img, 10, base-1, 15, base+5, PT)
        R(img, 10, base+3, 15, base+8, BT)
        R(img, 17, base+1, 22, base+7, PT)
        R(img, 17, base+5, 22, base+10, BT)
    elif walk_phase == 2:
        R(img, 10, base+1, 15, base+7, PT)
        R(img, 10, base+5, 15, base+10, BT)
        R(img, 17, base-1, 22, base+5, PT)
        R(img, 17, base+3, 22, base+8, BT)
    else:
        R(img, 10, base, 15, base+6, PT)
        R(img, 10, base+4, 15, base+9, BT)
        R(img, 17, base, 22, base+6, PT)
        R(img, 17, base+4, 22, base+9, BT)
    return img

# ═══════════════════════════════════════════════
# AIDEN — side view (left or right)
# ═══════════════════════════════════════════════
def aiden_side(facing_right=False, walk_phase=0):
    img = frame()

    if facing_right:
        # Head facing right
        E(img, 12, 2, 23, 12, HR)
        E(img, 12, 5, 22, 12, SK)
        R(img, 14, 3, 19, 6, HR2)
        P(img, 20, 7, EYE)
        P(img, 21, 7, EYE)

        # Body
        R(img, 12, 12, 22, 22, TN)
        R(img, 12, 20, 22, 22, TND)

        # Front arm (swings with walk)
        ao = -2 if walk_phase == 1 else (2 if walk_phase == 2 else 0)
        R(img, 20, 13+ao, 23, 21+ao, TN)
        R(img, 20, 18+ao, 23, 21+ao, SK)

        # Back arm (opposite swing)
        R(img, 12, 13-ao, 15, 21-ao, TND)

        # Sword
        R(img, 23, 8, 25, 21, SB)
        R(img, 21, 15, 26, 17, SHG)

        # Legs
        base = 22
        if walk_phase == 1:
            R(img, 14, base-1, 19, base+5, PT)
            R(img, 14, base+3, 19, base+8, BT)
            R(img, 16, base+1, 21, base+7, TND)
            R(img, 16, base+5, 21, base+9, (35,22,5,255))
        elif walk_phase == 2:
            R(img, 14, base+1, 19, base+7, PT)
            R(img, 14, base+5, 19, base+10, BT)
            R(img, 16, base-1, 21, base+5, TND)
            R(img, 16, base+3, 21, base+8, (35,22,5,255))
        else:
            R(img, 14, base, 19, base+6, PT)
            R(img, 14, base+4, 19, base+9, BT)
            R(img, 16, base, 21, base+6, TND)
            R(img, 16, base+4, 21, base+9, (35,22,5,255))
    else:
        # Head facing left
        E(img, 9, 2, 20, 12, HR)
        E(img, 10, 5, 20, 12, SK)
        R(img, 13, 3, 18, 6, HR2)
        P(img, 11, 7, EYE)
        P(img, 12, 7, EYE)

        # Body
        R(img, 10, 12, 20, 22, TN)
        R(img, 10, 20, 20, 22, TND)

        # Front arm
        ao = -2 if walk_phase == 1 else (2 if walk_phase == 2 else 0)
        R(img, 9, 13+ao, 12, 21+ao, TN)
        R(img, 9, 18+ao, 12, 21+ao, SK)

        # Back arm
        R(img, 17, 13-ao, 20, 21-ao, TND)

        # Sword (left-facing: sword on right side of character body)
        R(img, 7, 8, 9, 21, SB)
        R(img, 6, 15, 11, 17, SHG)

        # Legs
        base = 22
        if walk_phase == 1:
            R(img, 11, base-1, 16, base+5, PT)
            R(img, 11, base+3, 16, base+8, BT)
            R(img, 13, base+1, 18, base+7, TND)
            R(img, 13, base+5, 18, base+9, (35,22,5,255))
        elif walk_phase == 2:
            R(img, 11, base+1, 16, base+7, PT)
            R(img, 11, base+5, 16, base+10, BT)
            R(img, 13, base-1, 18, base+5, TND)
            R(img, 13, base+3, 18, base+8, (35,22,5,255))
        else:
            R(img, 11, base, 16, base+6, PT)
            R(img, 11, base+4, 16, base+9, BT)
            R(img, 13, base, 18, base+6, TND)
            R(img, 13, base+4, 18, base+9, (35,22,5,255))
    return img

# ═══════════════════════════════════════════════
# AIDEN — attack melee (front/down, sword swing)
# ═══════════════════════════════════════════════
def aiden_attack_melee(phase):
    """
    phase 0: raise sword
    phase 1: swing right
    phase 2: swing down
    phase 3: return
    """
    img = frame()

    # Head (always down-facing)
    E(img, 11, 2, 21, 11, HR)
    E(img, 12, 5, 20, 12, SK)
    R(img, 14, 3, 18, 5, HR2)
    R(img, 13, 7, 14, 8, EYE)
    R(img, 17, 7, 18, 8, EYE)

    # Body
    R(img, 10, 12, 22, 22, TN)
    R(img, 10, 20, 22, 22, TND)

    # Left arm (stable)
    R(img, 7, 13, 10, 21, TN)
    R(img, 7, 18, 10, 21, SK)

    # Legs (neutral)
    R(img, 10, 22, 15, 28, PT)
    R(img, 10, 26, 15, 30, BT)
    R(img, 17, 22, 22, 28, PT)
    R(img, 17, 26, 22, 30, BT)

    # Sword swing per phase
    if phase == 0:   # raise sword high
        R(img, 22, 13, 25, 21, TN)
        R(img, 22, 18, 25, 21, SK)
        R(img, 25, 3, 27, 16, SB)     # blade up
        R(img, 23, 12, 28, 14, SHG)
    elif phase == 1: # swing right diagonal
        R(img, 23, 12, 26, 20, TN)
        R(img, 23, 17, 26, 20, SK)
        R(img, 26, 5, 29, 18, SB)     # blade right
        R(img, 24, 15, 29, 17, SHG)
    elif phase == 2: # swing forward (toward viewer)
        R(img, 22, 14, 25, 22, TN)
        R(img, 22, 19, 25, 22, SK)
        R(img, 20, 20, 30, 23, SB)    # blade horizontal (slash)
        R(img, 23, 18, 28, 20, SHG)
        # swing trail
        R(img, 20, 19, 30, 22, (220,220,230,120))
    else:            # return to ready
        R(img, 22, 13, 25, 21, TN)
        R(img, 22, 18, 25, 21, SK)
        R(img, 25, 8, 27, 21, SB)
        R(img, 23, 15, 28, 17, SHG)
    return img

# ═══════════════════════════════════════════════
# AIDEN — attack ranged (magic cast)
# ═══════════════════════════════════════════════
MAGIC_BLUE  = ( 41, 128, 185, 255)
MAGIC_LIGHT = (100, 180, 230, 255)
MAGIC_GLOW  = (155, 215, 255, 180)

def aiden_attack_ranged(phase):
    img = frame()

    E(img, 11, 2, 21, 11, HR)
    E(img, 12, 5, 20, 12, SK)
    R(img, 14, 3, 18, 5, HR2)
    R(img, 13, 7, 14, 8, EYE)
    R(img, 17, 7, 18, 8, EYE)

    R(img, 10, 12, 22, 22, TN)
    R(img, 10, 20, 22, 22, TND)

    R(img, 10, 22, 15, 28, PT)
    R(img, 10, 26, 15, 30, BT)
    R(img, 17, 22, 22, 28, PT)
    R(img, 17, 26, 22, 30, BT)

    if phase == 0:   # gathering magic
        R(img, 7, 13, 10, 21, TN)
        R(img, 7, 18, 10, 21, SK)
        R(img, 22, 11, 25, 19, TN)
        R(img, 22, 15, 25, 19, SK)
        E(img, 21, 13, 27, 19, MAGIC_GLOW)  # small magic orb forming
    elif phase == 1: # arm extended
        R(img, 7, 13, 10, 21, TN)
        R(img, 7, 18, 10, 21, SK)
        R(img, 22, 12, 28, 20, TN)           # extended arm
        R(img, 25, 15, 28, 20, SK)
        E(img, 26, 11, 31, 17, MAGIC_LIGHT)  # magic orb charged
    elif phase == 2: # firing
        R(img, 7, 13, 10, 21, TN)
        R(img, 7, 18, 10, 21, SK)
        R(img, 22, 12, 28, 20, TN)
        R(img, 25, 15, 28, 20, SK)
        E(img, 27, 12, 31, 16, MAGIC_BLUE)  # projectile fired
        R(img, 25, 13, 27, 15, MAGIC_LIGHT)  # recoil glow
    else:            # cooldown
        R(img, 7, 13, 10, 21, TN)
        R(img, 7, 18, 10, 21, SK)
        R(img, 22, 13, 25, 21, TN)
        R(img, 22, 18, 25, 21, SK)
        E(img, 22, 14, 26, 18, MAGIC_GLOW)  # fading
    return img

# ═══════════════════════════════════════════════
# AIDEN — dash
# ═══════════════════════════════════════════════
def aiden_dash(phase):
    img = frame()

    # Dash frames lean forward (slightly lower body, legs more extended)
    lean = phase * 2

    E(img, 11, 3+lean//2, 21, 12+lean//2, HR)
    E(img, 12, 5+lean//2, 20, 12+lean//2, SK)
    R(img, 13, 7+lean//2, 18, 7+lean//2, EYE)   # narrowed/closed during dash

    R(img, 10, 12, 22, 21, TN)
    R(img, 10, 19, 22, 21, TND)

    # Arms thrown back during dash
    R(img, 5+phase, 14, 10+phase, 20, TN)
    R(img, 22-phase, 14, 27-phase, 20, TN)

    # Sword trailing behind
    R(img, 4, 10, 6, 21, SB)
    R(img, 3, 15, 8, 17, SHG)

    # Legs extended (running leap)
    if phase == 0:
        R(img, 10, 21, 15, 28, PT)
        R(img, 10, 25, 15, 30, BT)
        R(img, 17, 21, 22, 28, PT)
        R(img, 17, 25, 22, 30, BT)
    elif phase == 1:
        R(img, 8, 21, 14, 28, PT)
        R(img, 8, 25, 14, 30, BT)
        R(img, 18, 19, 24, 26, PT)
        R(img, 18, 23, 24, 28, BT)
    else:  # phase 2 - mid-air
        R(img, 7, 20, 13, 26, PT)
        R(img, 7, 23, 13, 28, BT)
        R(img, 19, 18, 25, 24, PT)
        R(img, 19, 22, 25, 27, BT)

    # Motion trail (ghosting) for phase 1 and 2
    if phase > 0:
        ghost = frame()
        R(ghost, 10+phase*2, 5, 20+phase*2, 28, (255,255,255,50))
    return img

# ═══════════════════════════════════════════════
# AIDEN — hurt
# ═══════════════════════════════════════════════
HURT_RED = (220, 60, 60, 200)

def aiden_hurt(phase):
    img = frame()

    # Head shakes on phase 1
    hx = -2 if phase == 1 else 0

    E(img, 11+hx, 2, 21+hx, 11, HR)
    E(img, 12+hx, 5, 20+hx, 12, SK)
    # Pain expression: squiggly eyebrows
    R(img, 13+hx, 7, 14+hx, 8, EYE)
    R(img, 17+hx, 7, 18+hx, 8, EYE)
    # Red flash overlay on body
    R(img, 10, 12, 22, 22, HURT_RED)
    R(img, 10, 20, 22, 22, TND)

    # Arms raised/flinching
    R(img, 7, 10, 10, 19, TN)
    R(img, 22, 10, 25, 19, TN)

    # Sword dropped slightly
    R(img, 25, 10, 27, 22, SB)
    R(img, 23, 16, 28, 18, SHG)

    # Legs buckling
    R(img, 10, 22, 15, 28, PT)
    R(img, 10, 26, 15, 30, BT)
    R(img, 17, 22, 22, 28, PT)
    R(img, 17, 26, 22, 30, BT)
    return img

# ═══════════════════════════════════════════════
# AIDEN — death (falls down)
# ═══════════════════════════════════════════════
def aiden_death(phase):
    """phase 0-3: character falls and fades"""
    img = frame()

    # Death: character rotates/slumps. Simulate by lowering each body part.
    fall = phase * 4

    alpha_factor = max(50, 255 - phase * 60)

    def fade(c): return (c[0], c[1], c[2], min(alpha_factor, c[3]) if len(c) > 3 else alpha_factor)

    hr = fade(HR); sk = fade(SK); tn = fade(TN); pt = fade(PT); bt = fade(BT)

    if phase < 3:
        # Head tilts
        E(img, 8+fall, 10+fall//2, 20+fall, 20+fall//2, hr)
        E(img, 9+fall, 12+fall//2, 19+fall, 20+fall//2, sk)

        # Body sideways
        R(img, 6+fall, 15+fall//3, 22+fall, 22+fall//3, tn)

        # Arms sprawled
        R(img, 4+fall, 14+fall//3, 8+fall, 20+fall//3, tn)
        R(img, 22+fall, 14+fall//3, 26+fall, 20+fall//3, tn)

        # Legs
        R(img, 10, 22+fall//2, 16, 27+fall//2, pt)
        R(img, 14, 22+fall//2, 20, 27+fall//2, pt)
        R(img, 10, 26+fall//2, 16, 30+fall//2, bt)
        R(img, 14, 26+fall//2, 20, 30+fall//2, bt)
    else:
        # Final: flat on ground, faded
        E(img, 5, 24, 20, 31, hr)
        R(img, 6, 26, 22, 31, tn)
    return img

# ═══════════════════════════════════════════════
# GOBLIN
# ═══════════════════════════════════════════════
def goblin_base_down(walk_phase=0, dead=False):
    img = frame()

    # Head (round, green)
    E(img, 12, 3, 22, 13, GG)
    E(img, 13, 5, 21, 13, GGD)   # darker lower face
    # Ears (pointy)
    R(img, 10, 5, 12, 8, GG)   # left ear
    R(img, 22, 5, 24, 8, GG)   # right ear
    P(img, 10, 4, OL)
    P(img, 23, 4, OL)
    # Eyes (red)
    R(img, 14, 7, 15, 8, GER)
    R(img, 19, 7, 20, 8, GER)
    # Teeth (tiny white)
    P(img, 16, 11, (230,230,220,255))
    P(img, 17, 11, (230,230,220,255))

    # Body (hunched, small)
    R(img, 11, 13, 21, 21, GCL)
    R(img, 11, 19, 21, 21, GCD)  # shadow

    # Arms
    R(img, 8, 14, 11, 20, GCL)
    R(img, 8, 18, 11, 20, GG)   # hand
    R(img, 21, 14, 24, 20, GCL)
    R(img, 21, 18, 24, 20, GG)  # hand

    # Knife (right hand)
    R(img, 24, 12, 26, 22, GKN)  # blade
    R(img, 23, 18, 27, 20, GCL)  # hilt

    if dead:
        return img

    # Legs
    base = 21
    if walk_phase == 1:
        R(img, 12, base-1, 16, base+5, GGD)
        R(img, 12, base+3, 16, base+7, OL)
        R(img, 17, base+1, 21, base+7, GGD)
        R(img, 17, base+5, 21, base+9, OL)
    elif walk_phase == 2:
        R(img, 12, base+1, 16, base+7, GGD)
        R(img, 12, base+5, 16, base+9, OL)
        R(img, 17, base-1, 21, base+5, GGD)
        R(img, 17, base+3, 21, base+7, OL)
    else:
        R(img, 12, base, 16, base+6, GGD)
        R(img, 12, base+4, 16, base+8, OL)
        R(img, 17, base, 21, base+6, GGD)
        R(img, 17, base+4, 21, base+8, OL)
    return img

def goblin_up(walk_phase=0):
    img = frame()
    # Back of head
    E(img, 12, 3, 22, 13, GG)
    R(img, 10, 5, 12, 8, GG)
    R(img, 22, 5, 24, 8, GG)
    # Body back
    R(img, 11, 13, 21, 21, GCL)
    R(img, 11, 19, 21, 21, GCD)
    R(img, 8, 14, 11, 20, GCL)
    R(img, 21, 14, 24, 20, GCL)
    R(img, 24, 12, 26, 22, GKN)
    R(img, 23, 18, 27, 20, GCL)
    base = 21
    if walk_phase == 1:
        R(img, 12, base-1, 16, base+5, GGD)
        R(img, 17, base+1, 21, base+7, GGD)
    elif walk_phase == 2:
        R(img, 12, base+1, 16, base+7, GGD)
        R(img, 17, base-1, 21, base+5, GGD)
    else:
        R(img, 12, base, 16, base+6, GGD)
        R(img, 17, base, 21, base+6, GGD)
    return img

def goblin_side(facing_right=False, walk_phase=0):
    img = frame()
    if facing_right:
        # Head facing right
        E(img, 13, 3, 23, 13, GG)
        E(img, 13, 6, 22, 13, GGD)
        R(img, 22, 5, 25, 8, GG)   # right ear (pointy)
        P(img, 25, 4, OL)
        R(img, 19, 7, 20, 8, GER)  # eye
        P(img, 21, 10, (230,230,220,255))  # tooth

        R(img, 12, 13, 22, 21, GCL)
        R(img, 12, 19, 22, 21, GCD)

        ao = -2 if walk_phase == 1 else (2 if walk_phase == 2 else 0)
        R(img, 20, 14+ao, 24, 20+ao, GCL)
        R(img, 9, 14-ao, 13, 20-ao, GGD)

        # Knife
        R(img, 24, 11, 26, 22, GKN)
        R(img, 22, 17, 27, 19, GCL)

        base = 21
        if walk_phase == 1:
            R(img, 13, base-1, 18, base+6, GGD)
            R(img, 16, base+1, 21, base+8, GGD)
        elif walk_phase == 2:
            R(img, 13, base+1, 18, base+8, GGD)
            R(img, 16, base-1, 21, base+6, GGD)
        else:
            R(img, 13, base, 18, base+7, GGD)
            R(img, 16, base, 21, base+7, GGD)
    else:
        # Head facing left
        E(img, 9, 3, 19, 13, GG)
        E(img, 10, 6, 19, 13, GGD)
        R(img, 7, 5, 10, 8, GG)   # left ear
        P(img, 6, 4, OL)
        R(img, 12, 7, 13, 8, GER)
        P(img, 11, 10, (230,230,220,255))

        R(img, 10, 13, 20, 21, GCL)
        R(img, 10, 19, 20, 21, GCD)

        ao = -2 if walk_phase == 1 else (2 if walk_phase == 2 else 0)
        R(img, 8, 14+ao, 12, 20+ao, GCL)
        R(img, 19, 14-ao, 23, 20-ao, GGD)

        # Knife
        R(img, 6, 11, 8, 22, GKN)
        R(img, 5, 17, 10, 19, GCL)

        base = 21
        if walk_phase == 1:
            R(img, 11, base-1, 16, base+6, GGD)
            R(img, 14, base+1, 19, base+8, GGD)
        elif walk_phase == 2:
            R(img, 11, base+1, 16, base+8, GGD)
            R(img, 14, base-1, 19, base+6, GGD)
        else:
            R(img, 11, base, 16, base+7, GGD)
            R(img, 14, base, 19, base+7, GGD)
    return img

def goblin_attack(phase):
    img = frame()
    # Base body (down-facing)
    E(img, 12, 3, 22, 13, GG)
    E(img, 13, 5, 21, 13, GGD)
    R(img, 10, 5, 12, 8, GG)
    R(img, 22, 5, 24, 8, GG)
    R(img, 14, 7, 15, 8, GER)
    R(img, 19, 7, 20, 8, GER)
    R(img, 11, 13, 21, 21, GCL)
    R(img, 11, 19, 21, 21, GCD)
    R(img, 8, 14, 11, 20, GCL)
    # Legs stable
    R(img, 12, 21, 16, 27, GGD)
    R(img, 17, 21, 21, 27, GGD)

    # Attack arm swing
    if phase == 0:   # wind up
        R(img, 21, 10, 25, 18, GCL)
        R(img, 21, 14, 25, 18, GG)
        R(img, 25, 8, 27, 18, GKN)
        R(img, 23, 13, 28, 15, GCL)
    elif phase == 1: # strike right
        R(img, 22, 11, 28, 17, GCL)
        R(img, 25, 13, 28, 17, GG)
        R(img, 26, 9, 31, 19, GKN)
        R(img, 24, 15, 30, 17, GCL)
    elif phase == 2: # slash down
        R(img, 21, 13, 26, 21, GCL)
        R(img, 21, 18, 26, 21, GG)
        R(img, 24, 18, 29, 24, GKN)
        R(img, 22, 20, 28, 22, GCL)
        # slash trail
        R(img, 23, 17, 30, 25, (200,80,80,80))
    else:            # recover
        R(img, 21, 14, 25, 20, GCL)
        R(img, 24, 12, 26, 22, GKN)
        R(img, 23, 18, 27, 20, GCL)
    return img

def goblin_death(phase):
    img = frame()
    fall = phase * 5
    al = max(60, 255 - phase * 80)
    def fade(c): return (c[0], c[1], c[2], al)
    gg = fade(GG); ggd = fade(GGD); gcl = fade(GCL)

    if phase == 0:
        E(img, 12, 3, 22, 13, gg)
        R(img, 10, 5, 12, 8, gg)
        R(img, 22, 5, 24, 8, gg)
        R(img, 14, 7, 15, 8, GER)
        R(img, 19, 7, 20, 8, GER)
        R(img, 11, 13, 21, 21, gcl)
        R(img, 12, 21, 21, 27, ggd)
    elif phase == 1:
        # Stumbling
        E(img, 10, 7, 21, 17, gg)
        R(img, 10, 17, 22, 23, gcl)
        R(img, 10, 23, 22, 28, ggd)
    else:
        # Flat on ground
        E(img, 8, 22, 23, 30, ggd)
        R(img, 9, 24, 22, 31, gcl)
    return img

# ═══════════════════════════════════════════════
# ELDER ERIC
# ═══════════════════════════════════════════════
def elder_idle(phase):
    """phase 0 or 1 (subtle breathing)"""
    img = frame()
    b = phase  # 0 or 1 breathing

    # White hair (large, flowing)
    E(img, 10, 2-b, 22, 13-b, EWH)
    # Face (older, slightly darker skin)
    E(img, 12, 5-b, 20, 13-b, ESK)
    R(img, 14, 3-b, 18, 6-b, EWH)   # hair top
    # Eyes (wise, slightly squinting)
    R(img, 13, 8-b, 14, 9-b, EYE)
    R(img, 17, 8-b, 18, 9-b, EYE)
    # Beard (long white beard)
    R(img, 12, 11-b, 20, 16-b, EWH)
    E(img, 11, 13-b, 21, 20-b, EWH)  # beard volume

    # Blue robe (wide, flowing)
    R(img, 8, 14-b, 24, 26-b, EBL)
    R(img, 8, 23-b, 24, 26-b, EBD)   # robe shadow at bottom
    R(img, 9, 15-b, 10, 25-b, EBH)   # left highlight
    R(img, 22, 15-b, 23, 25-b, EBD)  # right shadow

    # Arms (robe sleeves)
    R(img, 5, 15-b, 8, 24-b, EBL)
    R(img, 24, 15-b, 27, 24-b, EBL)
    R(img, 5, 22-b, 8, 24-b, ESK)    # left hand
    R(img, 24, 22-b, 27, 24-b, ESK)  # right hand

    # Staff (right side, tall)
    R(img, 27, 6-b, 29, 30-b, EST)   # staff body
    E(img, 25, 4-b, 30, 9-b, ESG)    # staff gem (green crystal)
    P(img, 27, 3-b, (150,240,160,255))  # gem highlight

    # Robe bottom (slightly wider)
    R(img, 7, 25-b, 25, 30-b, EBD)
    return img

def elder_portrait():
    """48×48 portrait for Elder Eric"""
    img = Image.new('RGBA', (48, 48), T)

    # Background (soft blue-gray)
    E(img, 1, 1, 46, 46, (30, 50, 80, 255))

    # White hair (large head, portrait style)
    def Ep(x0,y0,x1,y1,c): ImageDraw.Draw(img).ellipse([x0,y0,x1,y1], fill=c)
    def Rp(x0,y0,x1,y1,c): ImageDraw.Draw(img).rectangle([x0,y0,x1,y1], fill=c)
    def Pp(x,y,c):
        if 0<=x<48 and 0<=y<48: img.putpixel((x,y),c)

    Ep(8,  2, 40, 28, EWH)             # hair / head outline
    Ep(10, 8, 38, 30, ESK)             # face
    Rp(15,  4, 33, 12, EWH)            # hair top

    # Eyes (elder-like, half-closed)
    Rp(14, 17, 17, 19, EYE)
    Rp(31, 17, 34, 19, EYE)
    Pp(15, 16, (80,60,40,200))
    Pp(32, 16, (80,60,40,200))

    # Nose
    Pp(23, 22, (180,150,120,255))
    Pp(24, 22, (180,150,120,255))

    # Smile wrinkles
    Rp(16, 25, 18, 26, (170,140,110,255))
    Rp(29, 25, 31, 26, (170,140,110,255))

    # Beard (long white)
    Ep(12, 24, 36, 46, EWH)
    Rp(13, 28, 35, 47, EWH)
    Ep(14, 26, 34, 42, (200,200,200,255))

    # Blue robe shoulders visible
    Rp(2, 32, 20, 47, EBL)
    Rp(28, 32, 46, 47, EBL)
    Rp(2, 38, 20, 47, EBD)
    Rp(28, 38, 46, 47, EBD)

    # Staff tip at corner
    Rp(43, 2, 46, 32, EST)
    Ep(40, 1, 47, 9, ESG)

    # Border glow (golden)
    ImageDraw.Draw(img).rectangle([0,0,47,47], outline=(190,150,20,255), width=2)

    return img

# ═══════════════════════════════════════════════
# GENERATE ALL FILES
# ═══════════════════════════════════════════════
def ensure_dir(path):
    os.makedirs(path, exist_ok=True)

def main():
    base = os.path.dirname(os.path.abspath(__file__))
    player_dir  = os.path.join(base, 'sprites', 'player')
    enemy_dir   = os.path.join(base, 'sprites', 'enemies')
    npc_dir     = os.path.join(base, 'sprites', 'npc')
    ui_dir      = os.path.join(base, 'ui')

    for d in [player_dir, enemy_dir, npc_dir, ui_dir]:
        ensure_dir(d)

    # ── Player: Aiden ──────────────────────────
    print("Generating Aiden sprites...")

    # idle (2 frames)
    sheet(aiden_down(0, breathe=0), aiden_down(0, breathe=1)).save(
        os.path.join(player_dir, 'player_idle.png'))

    # walk_down (4 frames)
    sheet(aiden_down(1), aiden_down(0), aiden_down(2), aiden_down(0)).save(
        os.path.join(player_dir, 'player_walk_down.png'))

    # walk_up (4 frames)
    sheet(aiden_up(1), aiden_up(0), aiden_up(2), aiden_up(0)).save(
        os.path.join(player_dir, 'player_walk_up.png'))

    # walk_left (4 frames)
    sheet(aiden_side(False,1), aiden_side(False,0),
          aiden_side(False,2), aiden_side(False,0)).save(
        os.path.join(player_dir, 'player_walk_left.png'))

    # walk_right (4 frames)
    sheet(aiden_side(True,1), aiden_side(True,0),
          aiden_side(True,2), aiden_side(True,0)).save(
        os.path.join(player_dir, 'player_walk_right.png'))

    # attack melee (4 frames)
    sheet(*[aiden_attack_melee(i) for i in range(4)]).save(
        os.path.join(player_dir, 'player_attack_melee.png'))

    # attack ranged (4 frames)
    sheet(*[aiden_attack_ranged(i) for i in range(4)]).save(
        os.path.join(player_dir, 'player_attack_ranged.png'))

    # dash (3 frames)
    sheet(*[aiden_dash(i) for i in range(3)]).save(
        os.path.join(player_dir, 'player_dash.png'))

    # hurt (2 frames)
    sheet(aiden_hurt(0), aiden_hurt(1)).save(
        os.path.join(player_dir, 'player_hurt.png'))

    # death (4 frames)
    sheet(*[aiden_death(i) for i in range(4)]).save(
        os.path.join(player_dir, 'player_death.png'))

    print("  Aiden: 10 sprites done.")

    # ── Enemy: Goblin ──────────────────────────
    print("Generating Goblin sprites...")

    sheet(goblin_base_down(1), goblin_base_down(0),
          goblin_base_down(2), goblin_base_down(0)).save(
        os.path.join(enemy_dir, 'goblin_walk_down.png'))

    sheet(goblin_up(1), goblin_up(0),
          goblin_up(2), goblin_up(0)).save(
        os.path.join(enemy_dir, 'goblin_walk_up.png'))

    sheet(goblin_side(False,1), goblin_side(False,0),
          goblin_side(False,2), goblin_side(False,0)).save(
        os.path.join(enemy_dir, 'goblin_walk_left.png'))

    sheet(goblin_side(True,1), goblin_side(True,0),
          goblin_side(True,2), goblin_side(True,0)).save(
        os.path.join(enemy_dir, 'goblin_walk_right.png'))

    sheet(*[goblin_attack(i) for i in range(4)]).save(
        os.path.join(enemy_dir, 'goblin_attack.png'))

    sheet(*[goblin_death(i) for i in range(3)]).save(
        os.path.join(enemy_dir, 'goblin_death.png'))

    print("  Goblin: 6 sprites done.")

    # ── NPC: Elder Eric ────────────────────────
    print("Generating Elder Eric sprites...")

    sheet(elder_idle(0), elder_idle(1)).save(
        os.path.join(npc_dir, 'npc_elder.png'))

    elder_portrait().save(
        os.path.join(ui_dir, 'portrait_elder.png'))

    print("  Elder: 2 files done.")

    # ── Copy to web/public/assets ──────────────
    print("Copying to web/public/assets/sprites/...")
    web_base = os.path.join(base, '..', 'web', 'public', 'assets', 'sprites')
    web_player = os.path.join(web_base, 'player')
    web_enemy  = os.path.join(web_base, 'enemies')
    web_npc    = os.path.join(web_base, 'npc')
    web_ui     = os.path.join(base, '..', 'web', 'public', 'assets', 'ui')

    for src_dir, dst_dir in [
        (player_dir, web_player),
        (enemy_dir,  web_enemy),
        (npc_dir,    web_npc),
    ]:
        ensure_dir(dst_dir)
        for fname in os.listdir(src_dir):
            if fname.endswith('.png'):
                shutil.copy2(os.path.join(src_dir, fname),
                             os.path.join(dst_dir, fname))
                print(f"  copied {fname} → {dst_dir}")

    ensure_dir(web_ui)
    shutil.copy2(os.path.join(ui_dir, 'portrait_elder.png'),
                 os.path.join(web_ui, 'portrait_elder.png'))
    print("  copied portrait_elder.png → web/public/assets/ui/")

    print("\nAll done!")

if __name__ == '__main__':
    main()
