from PIL import Image, ImageDraw, ImageFont

def create_app_icon(size=(128, 128)):
    img = Image.new("RGBA", size, color=(0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    margin = 4
    draw.ellipse([margin, margin, size[0]-margin, size[1]-margin], fill="#1f1f1f", outline="#FF4D4D", width=4)
    
    try:
        font = ImageFont.truetype("arial.ttf", int(size[0] * 0.6))
    except Exception:
        font = ImageFont.load_default()

    draw.text((size[0]//2, size[1]//2), "R", fill="#FF4D4D", anchor="mm", font=font)
    return img