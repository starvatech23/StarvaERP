from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import os
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from models import UserRole
import random
import string

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Security
security = HTTPBearer()

# Mock OTP storage (in production, use Redis)
otp_storage = {}

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> dict:
    """Decode and verify a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user from token"""
    from bson import ObjectId
    # Import here to avoid circular dependency
    from server import db
    
    token = credentials.credentials
    payload = decode_token(token)
    user_id: str = payload.get("sub")
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    # Get user from database
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user

def require_role(allowed_roles: list):
    """Decorator to check if user has required role"""
    async def role_checker(credentials: HTTPAuthorizationCredentials = Depends(security)):
        user = await get_current_user(credentials)
        if user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to access this resource"
            )
        return user
    return role_checker

# OTP Functions with Twilio SMS
from twilio_service import send_otp_sms, twilio_sms_service

def normalize_phone(phone: str) -> str:
    """Normalize phone number to just last 10 digits for consistent storage"""
    digits = ''.join(filter(str.isdigit, phone))
    # Return last 10 digits
    return digits[-10:] if len(digits) >= 10 else digits

def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=6))

def send_otp(phone: str, otp: str) -> dict:
    """Send OTP via Twilio SMS"""
    # Normalize phone for storage
    normalized_phone = normalize_phone(phone)
    
    # Store OTP in memory for verification
    otp_storage[normalized_phone] = {
        "otp": otp,
        "created_at": datetime.utcnow(),
        "attempts": 0
    }
    print(f"[OTP] Stored OTP for normalized phone: {normalized_phone}")
    
    # Check if Twilio is configured
    if twilio_sms_service.is_configured():
        result = send_otp_sms(phone, otp)
        if result.get("success"):
            print(f"[TWILIO SMS] OTP sent to {phone}, SID: {result.get('message_sid')}")
            return {"success": True, "provider": "twilio", "message_sid": result.get("message_sid")}
        else:
            print(f"[TWILIO SMS] Failed to send OTP to {phone}: {result.get('error')}")
            # Fall back to mock if Twilio fails
            print(f"[MOCK SMS] Fallback - OTP {otp} for {phone}")
            return {"success": True, "provider": "mock", "otp_for_testing": otp, "twilio_error": result.get("error")}
    else:
        # Mock mode - just store and return OTP for testing
        print(f"[MOCK SMS] Twilio not configured - OTP {otp} for {phone}")
        return {"success": True, "provider": "mock", "otp_for_testing": otp}

def send_otp_mock(phone: str, otp: str) -> bool:
    """Legacy mock OTP sending - stores in memory"""
    result = send_otp(phone, otp)
    return result.get("success", False)

def verify_otp(phone: str, otp: str) -> bool:
    """Verify OTP from storage"""
    # Normalize phone for lookup
    normalized_phone = normalize_phone(phone)
    print(f"[OTP] Verifying OTP for normalized phone: {normalized_phone}")
    print(f"[OTP] Current storage keys: {list(otp_storage.keys())}")
    
    if normalized_phone not in otp_storage:
        print(f"[OTP] Phone not found in storage")
        return False
    
    stored_data = otp_storage[normalized_phone]
    
    # Check if OTP expired (10 minutes)
    if (datetime.utcnow() - stored_data["created_at"]).seconds > 600:
        del otp_storage[normalized_phone]
        print(f"[OTP] OTP expired")
        return False
    
    # Check attempts (max 5)
    if stored_data["attempts"] >= 5:
        del otp_storage[normalized_phone]
        print(f"[OTP] Too many attempts")
        return False
    
    # Verify OTP
    if stored_data["otp"] == otp:
        del otp_storage[normalized_phone]
        print(f"[OTP] OTP verified successfully")
        return True
    else:
        stored_data["attempts"] += 1
        print(f"[OTP] Invalid OTP. Expected: {stored_data['otp']}, Got: {otp}")
        return False

def verify_otp_mock(phone: str, otp: str) -> bool:
    """Legacy verify OTP function"""
    return verify_otp(phone, otp)
