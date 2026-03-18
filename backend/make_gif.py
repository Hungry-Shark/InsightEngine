from PIL import Image
import os

img_path = r"C:\Users\admin\.gemini\antigravity\brain\85cc66b2-9ba9-4a65-92e7-74b38a26a857\3d_gear_base_1773867494179.png"
out_path = r"C:\Users\admin\InsightEngine\frontend\public\favicon.gif"

def make_transparent(img, threshold=240):
    img = img.convert("RGBA")
    data = img.getdata()
    new_data = []
    for item in data:
        if item[0] > threshold and item[1] > threshold and item[2] > threshold:
            new_data.append((0, 0, 0, 0))
        else:
            new_data.append(item)
    img.putdata(new_data)
    return img

img = Image.open(img_path)
img = make_transparent(img, 245)

width, height = img.size
min_dim = min(width, height)
left = (width - min_dim)/2
top = (height - min_dim)/2
right = (width + min_dim)/2
bottom = (height + min_dim)/2
img = img.crop((left, top, right, bottom))
img = img.resize((128, 128), Image.Resampling.LANCZOS)

frames = []
total_frames = 60
for i in range(total_frames):
    angle = (360 / total_frames) * i
    frame = img.rotate(-angle, resample=Image.Resampling.BICUBIC, expand=False)
    # Ensure it stays pure RGBA
    frames.append(frame)

frames[0].save(
    out_path,
    save_all=True,
    append_images=frames[1:],
    duration=60, # 60ms per frame
    loop=0,
    disposal=2,
    transparency=0
)
print("GIF saved at", out_path)
