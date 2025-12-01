#!/usr/bin/env python3
"""
Generate Splash Screen Assets for Holi Labs Mobile App

This script generates simple placeholder splash screen assets with white backgrounds.
For production, replace these with professionally designed assets.

Requirements:
    pip install Pillow

Usage:
    python3 generate_splash.py
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Color palette
PRIMARY_BLUE = "#428CD4"
WHITE = "#FFFFFF"
TEXT_GRAY = "#666666"

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def create_splash_screen():
    """Create splash screen (1284x2778)"""
    print("Creating splash screen...")
    img = Image.new('RGB', (1284, 2778), hex_to_rgb(WHITE))
    draw = ImageDraw.Draw(img)

    # Try to use a system font, fallback to default
    try:
        font_large = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 120)
        font_small = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 60)
    except:
        try:
            font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 120)
            font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 60)
        except:
            font_large = ImageFont.load_default()
            font_small = ImageFont.load_default()

    # Draw text
    text_main = "Holi Labs"
    text_sub = "AI Medical Scribe"

    # Calculate text positions (centered)
    bbox_main = draw.textbbox((0, 0), text_main, font=font_large)
    bbox_sub = draw.textbbox((0, 0), text_sub, font=font_small)

    text_main_width = bbox_main[2] - bbox_main[0]
    text_sub_width = bbox_sub[2] - bbox_sub[0]

    x_main = (1284 - text_main_width) // 2
    x_sub = (1284 - text_sub_width) // 2

    y_main = 1389 - 100  # Center vertically, offset up
    y_sub = y_main + 150

    # Draw text with colors
    draw.text((x_main, y_main), text_main, fill=hex_to_rgb(PRIMARY_BLUE), font=font_large)
    draw.text((x_sub, y_sub), text_sub, fill=hex_to_rgb(TEXT_GRAY), font=font_small)

    # Draw simple icon (H letter in a circle)
    circle_radius = 100
    circle_center_x = 1284 // 2
    circle_center_y = y_main - 250

    # Draw circle border
    draw.ellipse(
        [circle_center_x - circle_radius, circle_center_y - circle_radius,
         circle_center_x + circle_radius, circle_center_y + circle_radius],
        outline=hex_to_rgb(PRIMARY_BLUE),
        width=8
    )

    # Draw H
    try:
        font_icon = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 150)
    except:
        font_icon = font_large

    h_text = "H"
    bbox_h = draw.textbbox((0, 0), h_text, font=font_icon)
    h_width = bbox_h[2] - bbox_h[0]
    h_height = bbox_h[3] - bbox_h[1]

    draw.text(
        (circle_center_x - h_width // 2, circle_center_y - h_height // 2 - 10),
        h_text,
        fill=hex_to_rgb(PRIMARY_BLUE),
        font=font_icon
    )

    img.save('splash.png', 'PNG')
    print("✓ splash.png created (1284x2778)")

def create_app_icon():
    """Create app icon (1024x1024)"""
    print("Creating app icon...")
    img = Image.new('RGB', (1024, 1024), hex_to_rgb(PRIMARY_BLUE))
    draw = ImageDraw.Draw(img)

    # Draw H in white
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 400)
    except:
        font = ImageFont.load_default()

    text = "H"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    x = (1024 - text_width) // 2
    y = (1024 - text_height) // 2 - 20

    draw.text((x, y), text, fill=hex_to_rgb(WHITE), font=font)

    img.save('icon.png', 'PNG')
    print("✓ icon.png created (1024x1024)")

def create_adaptive_icon():
    """Create Android adaptive icon (1024x1024)"""
    print("Creating adaptive icon...")
    # For simplicity, copy the app icon
    # In production, ensure the icon fits within the safe area (circular mask)
    img = Image.open('icon.png')
    img.save('adaptive-icon.png', 'PNG')
    print("✓ adaptive-icon.png created (1024x1024)")

def create_favicon():
    """Create favicon (48x48)"""
    print("Creating favicon...")
    img = Image.open('icon.png')
    img = img.resize((48, 48), Image.Resampling.LANCZOS)
    img.save('favicon.png', 'PNG')
    print("✓ favicon.png created (48x48)")

def create_notification_icon():
    """Create Android notification icon (96x96)"""
    print("Creating notification icon...")
    img = Image.new('RGBA', (96, 96), (255, 255, 255, 0))  # Transparent
    draw = ImageDraw.Draw(img)

    # Draw white H on transparent background
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 70)
    except:
        font = ImageFont.load_default()

    text = "H"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    x = (96 - text_width) // 2
    y = (96 - text_height) // 2

    draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)

    img.save('notification-icon.png', 'PNG')
    print("✓ notification-icon.png created (96x96)")

def main():
    """Main function to generate all assets"""
    print("\n🎨 Holi Labs - Asset Generator")
    print("=" * 50)
    print("\nGenerating splash screen assets with white backgrounds...")
    print("These are placeholder assets. For production, use professionally designed images.\n")

    # Change to assets directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    # Generate all assets
    create_splash_screen()
    create_app_icon()
    create_adaptive_icon()
    create_favicon()
    create_notification_icon()

    print("\n" + "=" * 50)
    print("✅ All assets generated successfully!")
    print("\nGenerated files:")
    print("  • splash.png (1284x2778) - Splash screen")
    print("  • icon.png (1024x1024) - App icon")
    print("  • adaptive-icon.png (1024x1024) - Android adaptive icon")
    print("  • favicon.png (48x48) - Web favicon")
    print("  • notification-icon.png (96x96) - Android notification icon")
    print("\nNext steps:")
    print("  1. Review the generated assets")
    print("  2. Replace with professionally designed assets for production")
    print("  3. Test on iOS/Android/Web: pnpm run ios|android|web")
    print("=" * 50 + "\n")

if __name__ == "__main__":
    try:
        from PIL import Image, ImageDraw, ImageFont
        main()
    except ImportError:
        print("\n❌ Error: Pillow (PIL) is not installed")
        print("\nPlease install it using:")
        print("  pip3 install Pillow")
        print("\nThen run this script again:")
        print("  python3 generate_splash.py\n")
        exit(1)
