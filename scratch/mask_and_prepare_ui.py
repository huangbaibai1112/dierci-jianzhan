import os
from PIL import Image, ImageFilter

src_dir = r"C:\Users\95714\Desktop\ios UI"
out_dir = r"c:\Users\95714\Desktop\第二次建站\assets\ui"
os.makedirs(out_dir, exist_ok=True)

def blur_box(img, box, radius=28):
    # box is (x1, y1, x2, y2)
    crop = img.crop(box)
    blurred = crop.filter(ImageFilter.GaussianBlur(radius))
    img.paste(blurred, box)

# 1. UI01: Daily Picks + For You
if os.path.exists(os.path.join(src_dir, "UI01.jpg")):
    img1 = Image.open(os.path.join(src_dir, "UI01.jpg")).convert("RGB")
    # Blur top 3 thumbnail faces and names
    blur_box(img1, (30, 560, 400, 1030), radius=25)
    blur_box(img1, (430, 560, 800, 1030), radius=25)
    blur_box(img1, (830, 560, 1190, 1030), radius=25)
    # Blur main hero card face (leave warm background, kitchen & smile area softly blurred)
    blur_box(img1, (260, 1300, 950, 1950), radius=35)
    # Blur bottom right small profile avatar
    blur_box(img1, (950, 2380, 1080, 2530), radius=15)
    img1.save(os.path.join(out_dir, "ui01-for-you.jpg"), quality=90)
    print("Processed ui01-for-you.jpg")

# 2. UI02: Daily Picks for Today
if os.path.exists(os.path.join(src_dir, "UI02.jpg")):
    img2 = Image.open(os.path.join(src_dir, "UI02.jpg")).convert("RGB")
    # Blur left and right card faces and names
    blur_box(img2, (0, 720, 640, 1680), radius=32)
    blur_box(img2, (680, 720, 1206, 1680), radius=32)
    img2.save(os.path.join(out_dir, "ui02-daily-picks.jpg"), quality=90)
    print("Processed ui02-daily-picks.jpg")

# 3. UI03: Voice Globe (Pure feature, no face except tiny bottom avatar)
if os.path.exists(os.path.join(src_dir, "UI03.PNG")):
    img3 = Image.open(os.path.join(src_dir, "UI03.PNG")).convert("RGBA")
    blur_box(img3, (950, 2380, 1080, 2530), radius=15)
    img3.save(os.path.join(out_dir, "ui03-voice.png"))
    print("Processed ui03-voice.png")

# 4. UI04: 1-on-1 Coffee & Tea Event
if os.path.exists(os.path.join(src_dir, "UI04.jpg")):
    img4 = Image.open(os.path.join(src_dir, "UI04.jpg")).convert("RGB")
    # Top card has romantic wine/tea glasses, only tiny host avatar at top-left
    blur_box(img4, (100, 260, 420, 310), radius=12) # host avatar and name
    # Bottom card has man's face: blur it
    blur_box(img4, (80, 1720, 1120, 2620), radius=35)
    img4.save(os.path.join(out_dir, "ui04-coffee-event.jpg"), quality=90)
    print("Processed ui04-coffee-event.jpg")

# 5. UI05: Filters (Age 50-99, Pure settings UI)
if os.path.exists(os.path.join(src_dir, "UI05.PNG")):
    img5 = Image.open(os.path.join(src_dir, "UI05.PNG")).convert("RGBA")
    img5.save(os.path.join(out_dir, "ui05-filters.png"))
    print("Processed ui05-filters.png")

# 6. UI06: Profile View (Russ 56)
if os.path.exists(os.path.join(src_dir, "UI06.jpg")):
    img6 = Image.open(os.path.join(src_dir, "UI06.jpg")).convert("RGB")
    # Blur face in top photo
    blur_box(img6, (300, 0, 950, 600), radius=32)
    # Blur name "Russ"
    blur_box(img6, (60, 470, 250, 520), radius=15)
    img6.save(os.path.join(out_dir, "ui06-profile.jpg"), quality=90)
    print("Processed ui06-profile.jpg")

# 7. UI07: Conversation Starters (Angelo)
if os.path.exists(os.path.join(src_dir, "UI07.PNG")):
    img7 = Image.open(os.path.join(src_dir, "UI07.PNG")).convert("RGBA")
    # Blur sender name "Angelo" at top
    blur_box(img7, (220, 80, 400, 130), radius=15)
    # Blur tiny avatar
    blur_box(img7, (45, 185, 160, 250), radius=18)
    img7.save(os.path.join(out_dir, "ui07-conversation-starters.png"))
    print("Processed ui07-conversation-starters.png")

print("All 7 iOS UI assets masked and saved safely.")
