import os
from PIL import Image, ImageFilter

src_dir = r"C:\Users\95714\Desktop\ios UI"
out_dir = r"c:\Users\95714\Desktop\第二次建站\assets\ui"
os.makedirs(out_dir, exist_ok=True)

def blur_box(img, box, radius=35):
    # box is (x1, y1, x2, y2)
    x1, y1, x2, y2 = box
    crop = img.crop((x1, y1, x2, y2))
    blurred = crop.filter(ImageFilter.GaussianBlur(radius))
    img.paste(blurred, (x1, y1, x2, y2))

# 1. UI01: For You & Daily Picks (preserves top 3 card borders & gaps, hero card container & camera/React badges)
if os.path.exists(os.path.join(src_dir, "UI01.jpg")):
    im1 = Image.open(os.path.join(src_dir, "UI01.jpg")).convert("RGB")
    # Card 1 (Jrm): face & name inside card
    blur_box(im1, (70, 620, 360, 880), radius=28)
    blur_box(im1, (90, 895, 340, 975), radius=16)
    # Card 2 (Jonathan...): face & name inside card
    blur_box(im1, (520, 600, 740, 830), radius=28)
    blur_box(im1, (440, 895, 790, 975), radius=16)
    # Card 3 (Cliveb): face & name inside card
    blur_box(im1, (835, 570, 1185, 900), radius=28)
    blur_box(im1, (880, 895, 1150, 975), radius=16)
    # Hero card: man's face only (leaves card corners, kitchen background, camera 3 badge, and React button intact)
    blur_box(im1, (330, 1470, 850, 2050), radius=38)
    # Bottom nav avatar
    blur_box(im1, (960, 2410, 1060, 2520), radius=25)
    im1.save(os.path.join(out_dir, "ui01-for-you.jpg"), quality=95)
    print("Processed ui01-for-you.jpg (Precision masked)")

# 2. UI02: Daily Picks for Today (preserves card outlines, gutter, milkshake/diner background, and green checkmark badges)
if os.path.exists(os.path.join(src_dir, "UI02.jpg")):
    im2 = Image.open(os.path.join(src_dir, "UI02.jpg")).convert("RGB")
    # Left card face inside card
    blur_box(im2, (0, 970, 270, 1440), radius=35)
    # Left name ...anheart (preserves green checkmark at 255-320!)
    blur_box(im2, (0, 1950, 245, 2045), radius=18)
    # Left location
    blur_box(im2, (0, 2055, 500, 2145), radius=18)
    # Right card face inside card
    blur_box(im2, (585, 920, 1180, 1850), radius=40)
    # Right name Cliveb (preserves green checkmark at 940-1015!)
    blur_box(im2, (620, 1950, 935, 2045), radius=18)
    # Right location
    blur_box(im2, (580, 2055, 1206, 2145), radius=18)
    im2.save(os.path.join(out_dir, "ui02-daily-picks.jpg"), quality=95)
    print("Processed ui02-daily-picks.jpg (Precision masked)")

# 3. UI03: Voice Globe (nav avatar masked)
if os.path.exists(os.path.join(src_dir, "UI03.PNG")):
    im3 = Image.open(os.path.join(src_dir, "UI03.PNG")).convert("RGBA")
    blur_box(im3, (960, 2410, 1060, 2520), radius=25)
    im3.save(os.path.join(out_dir, "ui03-voice.png"))
    print("Processed ui03-voice.png (Precision masked)")

# 4. UI04: 1-on-1 Meetups (preserves Card 1 outline, Oct 3 date badge, Host badges, inter-card gap, Card 2 outline, Oct 4 date badge, Music & Concerts badge)
if os.path.exists(os.path.join(src_dir, "UI04.jpg")):
    im4 = Image.open(os.path.join(src_dir, "UI04.jpg")).convert("RGB")
    # Card 1 avatar & YUMI (preserves Host badge at 585-900 & Oct 3 badge)
    blur_box(im4, (130, 710, 240, 800), radius=25)
    blur_box(im4, (270, 720, 570, 790), radius=18)
    blur_box(im4, (100, 1640, 500, 1705), radius=18)
    # Card 2 avatar & ACHIEVER111 (preserves Host badge at 820-980 & Oct 4 badge)
    blur_box(im4, (130, 1900, 230, 2000), radius=25)
    blur_box(im4, (270, 1915, 810, 1985), radius=18)
    # Card 2 face inside card (preserves card borders and bottom Music & Concerts badge)
    blur_box(im4, (70, 2010, 1130, 2550), radius=38)
    im4.save(os.path.join(out_dir, "ui04-coffee-event.jpg"), quality=95)
    print("Processed ui04-coffee-event.jpg (Precision masked)")

# 5. UI05: Filters (Age 50-99)
if os.path.exists(os.path.join(src_dir, "UI05.PNG")):
    im5 = Image.open(os.path.join(src_dir, "UI05.PNG")).convert("RGBA")
    im5.save(os.path.join(out_dir, "ui05-filters.png"))
    print("Processed ui05-filters.png")

# 6. UI06: Profiles (preserves restaurant scene, Online Recently badge, checkmark badge next to Russ, Photos/About Me tabs, React/Say Hi buttons)
if os.path.exists(os.path.join(src_dir, "UI06.jpg")):
    im6 = Image.open(os.path.join(src_dir, "UI06.jpg")).convert("RGB")
    # Top photo face only (preserves restaurant, OHIO T-shirt, and Online Recently badge)
    blur_box(im6, (320, 0, 780, 420), radius=38)
    # Name Russ only (preserves checkmark badge at 225-280!)
    blur_box(im6, (40, 1240, 225, 1330), radius=18)
    # Location lines
    blur_box(im6, (40, 1360, 1050, 1560), radius=18)
    # Bottom outdoor face (preserves React & Say Hi buttons)
    blur_box(im6, (350, 2420, 600, 2622), radius=30)
    im6.save(os.path.join(out_dir, "ui06-profile.jpg"), quality=95)
    print("Processed ui06-profile.jpg (Precision masked)")

# 7. UI07: Conversation Starters (preserves back button, prompt cards, text box)
if os.path.exists(os.path.join(src_dir, "UI07.PNG")):
    im7 = Image.open(os.path.join(src_dir, "UI07.PNG")).convert("RGBA")
    # Header username Angelo
    blur_box(im7, (340, 230, 650, 320), radius=20)
    # Message avatar
    blur_box(im7, (70, 490, 270, 690), radius=30)
    im7.save(os.path.join(out_dir, "ui07-conversation-starters.png"))
    print("Processed ui07-conversation-starters.png (Precision masked)")

print("All 7 assets thoroughly masked with precision UI outline retention.")
