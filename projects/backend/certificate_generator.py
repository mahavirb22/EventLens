"""
certificate_generator.py — Generate attendance certificates with multiple themes.
Creates high-quality certificate images using PIL/Pillow.
"""

import base64
from datetime import datetime
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont


# Certificate themes color schemes
THEMES = {
    "modern": {
        "bg_color": (245, 247, 250),  # Light blue-gray
        "primary": (99, 102, 241),     # Indigo
        "secondary": (79, 70, 229),    # Dark indigo
        "text": (17, 24, 39),          # Dark gray
        "border": (147, 197, 253),     # Light blue
    },
    "classic": {
        "bg_color": (255, 253, 245),   # Warm white
        "primary": (161, 98, 7),       # Gold
        "secondary": (120, 53, 15),    # Dark brown
        "text": (28, 25, 23),          # Dark brown
        "border": (217, 119, 6),       # Orange
    },
    "elegant": {
        "bg_color": (250, 250, 250),   # Off white
        "primary": (126, 34, 206),     # Purple
        "secondary": (88, 28, 135),    # Dark purple
        "text": (31, 41, 55),          # Dark gray
        "border": (196, 181, 253),     # Light purple
    },
    "minimal": {
        "bg_color": (255, 255, 255),   # Pure white
        "primary": (15, 23, 42),       # Slate
        "secondary": (71, 85, 105),    # Gray
        "text": (15, 23, 42),          # Slate
        "border": (148, 163, 184),     # Light gray
    },
    "gradient": {
        "bg_color": (249, 250, 251),   # Very light gray
        "primary": (236, 72, 153),     # Pink
        "secondary": (219, 39, 119),   # Deep pink
        "text": (17, 24, 39),          # Dark gray
        "border": (251, 207, 232),     # Light pink
        "accent": (251, 146, 60),      # Orange accent
    },
    "corporate": {
        "bg_color": (248, 250, 252),   # Slate white
        "primary": (14, 165, 233),     # Sky blue
        "secondary": (2, 132, 199),    # Darker blue
        "text": (15, 23, 42),          # Slate
        "border": (125, 211, 252),     # Light blue
        "accent": (6, 182, 212),       # Cyan
    },
}


def hex_to_rgb(hex_color: str) -> tuple:
    """Convert hex color to RGB tuple."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def generate_certificate(
    student_name: str,
    event_name: str,
    event_date: str,
    location: str,
    theme: str = "modern",
    custom_colors: dict | None = None,
    tx_id: str = "",
) -> str:
    """
    Generate a certificate image and return as base64 data URL.
    
    Args:
        student_name: Full name of the student
        event_name: Name of the event
        event_date: Event date string
        location: Event location
        theme: Certificate theme (modern, classic, elegant, minimal, gradient, corporate)
        custom_colors: Optional dict with custom color overrides (hex codes)
        tx_id: Blockchain transaction ID for verification
    
    Returns:
        Base64-encoded data URL (data:image/png;base64,...)
    """
    # Certificate dimensions (landscape, high res for printing)
    width, height = 1920, 1080
    
    # Get theme colors
    colors = THEMES.get(theme, THEMES["modern"]).copy()
    
    # Apply custom color overrides if provided
    if custom_colors:
        for key in ['primary_color', 'secondary_color', 'text_color', 'border_color', 'bg_color']:
            if custom_colors.get(key):
                # Map to internal color names
                color_key = key.replace('_color', '') if key != 'bg_color' else 'bg_color'
                colors[color_key] = hex_to_rgb(custom_colors[key])
    
    # Create image
    img = Image.new("RGB", (width, height), colors["bg_color"])
    draw = ImageDraw.Draw(img)
    
    # Draw border
    border_width = 40
    draw.rectangle(
        [border_width, border_width, width - border_width, height - border_width],
        outline=colors["border"],
        width=8,
    )
    
    # Inner decorative border
    inner_border = 60
    draw.rectangle(
        [inner_border, inner_border, width - inner_border, height - inner_border],
        outline=colors["primary"],
        width=2,
    )
    
    # Try to load fonts, fallback to default if not available
    try:
        title_font = ImageFont.truetype("arial.ttf", 80)
        header_font = ImageFont.truetype("arial.ttf", 48)
        name_font = ImageFont.truetype("arialbd.ttf", 96)  # Bold
        body_font = ImageFont.truetype("arial.ttf", 36)
        small_font = ImageFont.truetype("arial.ttf", 24)
    except:
        # Fallback to default font if Arial not available
        title_font = ImageFont.load_default()
        header_font = ImageFont.load_default()
        name_font = ImageFont.load_default()
        body_font = ImageFont.load_default()
        small_font = ImageFont.load_default()
    
    # Helper function to center text
    def draw_centered_text(y, text, font, color):
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        x = (width - text_width) // 2
        draw.text((x, y), text, fill=color, font=font)
    
    # Certificate header
    draw_centered_text(120, "CERTIFICATE OF ATTENDANCE", title_font, colors["primary"])
    
    # EventLens branding
    draw_centered_text(220, "EventLens • Blockchain-Verified Attendance", header_font, colors["text"])
    
    # Decorative line
    line_y = 300
    draw.line([(width // 4, line_y), (3 * width // 4, line_y)], fill=colors["border"], width=3)
    
    # "This certifies that"
    draw_centered_text(350, "This certifies that", body_font, colors["text"])
    
    # Student name (highlighted)
    draw_centered_text(440, student_name.upper(), name_font, colors["secondary"])
    
    # Successfully attended text
    draw_centered_text(580, "has successfully attended", body_font, colors["text"])
    
    # Event name
    draw_centered_text(650, event_name, header_font, colors["primary"])
    
    # Event details
    if event_date:
        try:
            date_obj = datetime.fromisoformat(event_date.replace('Z', '+00:00'))
            formatted_date = date_obj.strftime("%B %d, %Y")
        except:
            formatted_date = event_date
    else:
        formatted_date = datetime.now().strftime("%B %d, %Y")
    
    draw_centered_text(740, f"{location} • {formatted_date}", body_font, colors["text"])
    
    # Verification info
    draw_centered_text(840, "Verified using Multi-Layer AI Authentication", small_font, colors["text"])
    draw_centered_text(880, "GPS Geo-fencing • Gemini Vision • EXIF Analysis • Image Hashing", small_font, colors["text"])
    
    # Blockchain proof
    if tx_id:
        tx_short = f"{tx_id[:8]}...{tx_id[-8:]}" if len(tx_id) > 20 else tx_id
        draw_centered_text(940, f"On-chain Proof: {tx_short}", small_font, colors["border"])
    
    # Footer signature area
    sig_y = height - 150
    draw.line([(250, sig_y), (550, sig_y)], fill=colors["text"], width=2)
    draw.line([(width - 550, sig_y), (width - 250, sig_y)], fill=colors["text"], width=2)
    
    draw_centered_text(sig_y + 20, "Algorand TestNet", small_font, colors["text"])
    
    # Convert to base64
    buffer = BytesIO()
    img.save(buffer, format="PNG", quality=95)
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    return f"data:image/png;base64,{img_base64}"


def get_available_themes() -> list[str]:
    """Return list of available certificate themes."""
    return list(THEMES.keys())
