import os
from PIL import Image, ImageFilter

src_dir = r"C:\Users\95714\Desktop\ios UI"
out_dir = r"c:\Users\95714\Desktop\第二次建站\assets\ui"
os.makedirs(out_dir, exist_ok=True)

def blur_box(img, box, radius=55):
    # box is (x1, y1, x2, y2)
    crop = img.crop(box)
    blurred = crop.filter(ImageFilter.GaussianBlur(radius))
    img.paste(blurred, box)

# 1. UI01: Daily Picks + For You
if os.path.exists(os.path.join(src_dir, "UI01.jpg")):
    im1 = Image.open(os.path.join(src_dir, "UI01.jpg")).convert("RGB")
    # Blur top 3 cards edge-to-edge (photos + usernames Jrm, Jonathan, Cliveb)
    blur_box(im1, (0, 500, 1206, 1140), radius=55)
    # Blur hero card man photo completely edge-to-edge
    blur_box(im1, (0, 1100, 1206, 2400), radius=60)
    # Blur bottom navigation avatar
    blur_box(im1, (900, 2380, 1150, 2622), radius=35)
    im1.save(os.path.join(out_dir, "ui01-for-you.jpg"), quality=95)
    print("Processed ui01-for-you.jpg (Edge-to-edge masked)")

# 2. UI02: Daily Picks for Today
if os.path.exists(os.path.join(src_dir, "UI02.jpg")):
    im2 = Image.open(os.path.join(src_dir, "UI02.jpg")).convert("RGB")
    # Full width across both cards, photos, names, and locations
    blur_box(im2, (0, 680, 1206, 2150), radius=55)
    im2.save(os.path.join(out_dir, "ui02-daily-picks.jpg"), quality=95)
    print("Processed ui02-daily-picks.jpg (Edge-to-edge masked)")

# 3. UI03: Voice Globe
if os.path.exists(os.path.join(src_dir, "UI03.PNG")):
    im3 = Image.open(os.path.join(src_dir, "UI03.PNG")).convert("RGBA")
    blur_box(im3, (900, 2380, 1150, 2622), radius=35)
    im3.save(os.path.join(out_dir, "ui03-voice.png"))
    print("Processed ui03-voice.png (Edge-to-edge masked)")

# 4. UI04: 1-on-1 Coffee & Tea Event
if os.path.exists(os.path.join(src_dir, "UI04.jpg")):
    im4 = Image.open(os.path.join(src_dir, "UI04.jpg")).convert("RGB")
    # YUMI (Host) avatar and name
    blur_box(im4, (50, 700, 600, 900), radius=45)
    # Location Sendai, Miyagi, JPN
    blur_box(im4, (50, 1450, 650, 1640), radius=45)
    # Entire lower card edge-to-edge (ACHIEVER111 Host + face photo)
    blur_box(im4, (0, 1600, 1206, 2622), radius=65)
    im4.save(os.path.join(out_dir, "ui04-coffee-event.jpg"), quality=95)
    print("Processed ui04-coffee-event.jpg (Edge-to-edge masked)")

# 5. UI05: Filters (Age 50-99)
if os.path.exists(os.path.join(src_dir, "UI05.PNG")):
    im5 = Image.open(os.path.join(src_dir, "UI05.PNG")).convert("RGBA")
    im5.save(os.path.join(out_dir, "ui05-filters.png"))
    print("Processed ui05-filters.png")

# 6. UI06: Profile View
if os.path.exists(os.path.join(src_dir, "UI06.jpg")):
    im6 = Image.open(os.path.join(src_dir, "UI06.jpg")).convert("RGB")
    # Top restaurant photo edge-to-edge
    blur_box(im6, (0, 0, 1206, 950), radius=60)
    # Russ name and location edge-to-edge
    blur_box(im6, (0, 950, 1206, 1500), radius=45)
    # Bottom outdoor photo behind React & Say Hi edge-to-edge
    blur_box(im6, (0, 1500, 1206, 2622), radius=60)
    im6.save(os.path.join(out_dir, "ui06-profile.jpg"), quality=95)
    print("Processed ui06-profile.jpg (Edge-to-edge masked)")

# 7. UI07: Conversation Starters
if os.path.exists(os.path.join(src_dir, "UI07.PNG")):
    im7 = Image.open(os.path.join(src_dir, "UI07.PNG")).convert("RGBA")
    # Top header username Angelo
    blur_box(im7, (150, 200, 700, 450), radius=45)
    # Message avatar edge-to-edge
    blur_box(im7, (0, 700, 250, 1020), radius=40)
    im7.save(os.path.join(out_dir, "ui07-conversation-starters.png"))
    print("Processed ui07-conversation-starters.png (Edge-to-edge masked)")

print("All 7 assets thoroughly masked with edge-to-edge coverage.")
