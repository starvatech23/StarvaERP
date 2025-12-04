"""
Utility functions for CRM and construction management
"""
import re
import hashlib
from typing import Optional, Tuple
from datetime import datetime, timedelta

# ============= Phone Number Validation (India E.164) =============

def normalize_phone_india(phone: str) -> Tuple[Optional[str], Optional[str], bool]:
    """
    Normalize Indian phone number to E.164 format (+91XXXXXXXXXX)
    
    Returns:
        Tuple of (normalized_phone, raw_phone, is_valid)
    """
    if not phone:
        return None, None, False
    
    # Remove all non-digit characters
    raw_phone = phone
    phone_digits = re.sub(r'\D', '', phone)
    
    # Check if it starts with country code
    if phone_digits.startswith('91'):
        phone_digits = phone_digits[2:]
    elif phone_digits.startswith('+91'):
        phone_digits = phone_digits[3:]
    elif phone_digits.startswith('0'):
        phone_digits = phone_digits[1:]
    
    # Indian mobile numbers are 10 digits
    if len(phone_digits) != 10:
        return None, raw_phone, False
    
    # Indian mobile numbers start with 6, 7, 8, or 9
    if phone_digits[0] not in ['6', '7', '8', '9']:
        return None, raw_phone, False
    
    # E.164 format: +91XXXXXXXXXX
    normalized = f"+91{phone_digits}"
    return normalized, raw_phone, True


def validate_phone(phone: str, country: str = "IN") -> bool:
    """
    Validate phone number for specific country
    Currently only supports India (IN)
    """
    if country == "IN":
        _, _, is_valid = normalize_phone_india(phone)
        return is_valid
    return False


# ============= Text Processing =============

def truncate_text(text: str, max_length: int = 120, suffix: str = "...") -> str:
    """Truncate text to max length with ellipsis"""
    if not text or len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)].rstrip() + suffix


def format_currency(amount: float, currency: str = "INR") -> str:
    """Format currency amount"""
    symbols = {
        "INR": "₹",
        "USD": "$",
        "EUR": "€",
        "GBP": "£"
    }
    symbol = symbols.get(currency, currency)
    
    # Indian numbering system (lakhs/crores)
    if currency == "INR":
        if amount >= 10000000:  # 1 crore
            return f"{symbol}{amount/10000000:.2f}Cr"
        elif amount >= 100000:  # 1 lakh
            return f"{symbol}{amount/100000:.2f}L"
        else:
            return f"{symbol}{amount:,.2f}"
    
    # Standard formatting for other currencies
    return f"{symbol}{amount:,.2f}"


# ============= Template Processing =============

def process_template(template: str, variables: dict) -> str:
    """
    Replace template variables like {{name}}, {{company}} with actual values
    """
    result = template
    for key, value in variables.items():
        placeholder = f"{{{{{key}}}}}"
        result = result.replace(placeholder, str(value))
    return result


# ============= Hash Generation =============

def hash_password(password: str) -> str:
    """Generate SHA256 hash of password"""
    return hashlib.sha256(password.encode()).hexdigest()


def generate_token(length: int = 32) -> str:
    """Generate secure random token"""
    import secrets
    return secrets.token_urlsafe(length)


# ============= Date/Time Utilities =============

def format_datetime(dt: datetime, timezone: str = "Asia/Kolkata") -> str:
    """Format datetime with timezone"""
    if not dt:
        return ""
    return dt.strftime("%d %b %Y, %I:%M %p")


def calculate_time_ago(dt: datetime) -> str:
    """Calculate human-readable time ago"""
    if not dt:
        return "Never"
    
    now = datetime.utcnow()
    diff = now - dt
    
    if diff.days > 365:
        years = diff.days // 365
        return f"{years} year{'s' if years > 1 else ''} ago"
    elif diff.days > 30:
        months = diff.days // 30
        return f"{months} month{'s' if months > 1 else ''} ago"
    elif diff.days > 0:
        return f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
    elif diff.seconds > 3600:
        hours = diff.seconds // 3600
        return f"{hours} hour{'s' if hours > 1 else ''} ago"
    elif diff.seconds > 60:
        minutes = diff.seconds // 60
        return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
    else:
        return "Just now"


# ============= Validation Helpers =============

def validate_email(email: str) -> bool:
    """Basic email validation"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def sanitize_filename(filename: str) -> str:
    """Sanitize filename for safe storage"""
    # Remove any path separators and special characters
    filename = re.sub(r'[^\w\s.-]', '', filename)
    filename = re.sub(r'[-\s]+', '-', filename)
    return filename.strip('-')


# ============= Data Masking =============

def mask_phone(phone: str) -> str:
    """Mask phone number for privacy: +91XXXXX1234"""
    if not phone or len(phone) < 8:
        return phone
    return f"{phone[:5]}{'X' * (len(phone) - 9)}{phone[-4:]}"


def mask_email(email: str) -> str:
    """Mask email for privacy: ab***@example.com"""
    if not email or '@' not in email:
        return email
    username, domain = email.split('@', 1)
    if len(username) <= 3:
        masked_username = username[0] + '*' * (len(username) - 1)
    else:
        masked_username = username[:2] + '*' * (len(username) - 3) + username[-1]
    return f"{masked_username}@{domain}"
