from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List
from datetime import datetime
from bson import ObjectId
import socketio

# Import models and auth
from models import (
    UserCreate, UserLogin, UserResponse, Token, OTPRequest, OTPVerify,
    ProjectCreate, ProjectUpdate, ProjectResponse,
    TaskCreate, TaskUpdate, TaskResponse,
    MaterialCreate, MaterialUpdate, MaterialResponse,
    VendorCreate, VendorUpdate, VendorResponse,
    AttendanceCreate, AttendanceCheckout, AttendanceResponse,
    WorkScheduleCreate, WorkScheduleUpdate, WorkScheduleResponse,
    LeadCreate, LeadUpdate, LeadResponse,
    QuotationCreate, QuotationUpdate, QuotationResponse,
    UserRole
)
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, require_role, security,
    generate_otp, send_otp_mock, verify_otp_mock
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'construction_db')]

# Create the main app
app = FastAPI(title="Construction Management API")

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)
socket_app = socketio.ASGIApp(sio, app)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Helper functions
def serialize_doc(doc):
    """Convert MongoDB document to JSON serializable format"""
    if doc is None:
        return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc

async def get_user_by_id(user_id: str):
    """Get user by ID"""
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        return user
    except:
        return None

# ============= Authentication Routes =============

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    """Register a new user with email/password or phone"""
    
    # Check if user exists
    if user_data.auth_type == "email":
        if not user_data.email or not user_data.password:
            raise HTTPException(status_code=400, detail="Email and password required")
        
        existing = await db.users.find_one({"email": user_data.email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create user with hashed password
        user_dict = user_data.dict(exclude={"password", "auth_type"})
        user_dict["password_hash"] = get_password_hash(user_data.password)
        user_dict["is_active"] = True
        user_dict["date_joined"] = datetime.utcnow()
        user_dict["last_login"] = datetime.utcnow()
        
    elif user_data.auth_type == "phone":
        if not user_data.phone:
            raise HTTPException(status_code=400, detail="Phone number required")
        
        existing = await db.users.find_one({"phone": user_data.phone})
        if existing:
            raise HTTPException(status_code=400, detail="Phone already registered")
        
        # Create user without password (OTP verified)
        user_dict = user_data.dict(exclude={"password", "auth_type"})
        user_dict["is_active"] = True
        user_dict["date_joined"] = datetime.utcnow()
        user_dict["last_login"] = datetime.utcnow()
    else:
        raise HTTPException(status_code=400, detail="Invalid auth type")
    
    # Insert user
    result = await db.users.insert_one(user_dict)
    user_dict["_id"] = result.inserted_id
    
    # Create token
    access_token = create_access_token(data={"sub": str(result.inserted_id)})
    
    # Prepare response
    user_response = UserResponse(
        id=str(user_dict["_id"]),
        email=user_dict.get("email"),
        phone=user_dict.get("phone"),
        full_name=user_dict["full_name"],
        role=user_dict["role"],
        address=user_dict.get("address"),
        profile_photo=user_dict.get("profile_photo"),
        is_active=user_dict["is_active"],
        date_joined=user_dict["date_joined"],
        last_login=user_dict.get("last_login")
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user_response)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login with email/password or phone/OTP"""
    
    if credentials.auth_type == "email":
        # Email login
        user = await db.users.find_one({"email": credentials.identifier})
        if not user or not verify_password(credentials.password, user.get("password_hash", "")):
            raise HTTPException(status_code=401, detail="Invalid email or password")
    
    elif credentials.auth_type == "phone":
        # Phone login (after OTP verification)
        user = await db.users.find_one({"phone": credentials.identifier})
        if not user:
            raise HTTPException(status_code=401, detail="Phone number not registered")
    else:
        raise HTTPException(status_code=400, detail="Invalid auth type")
    
    # Update last login
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    # Create token
    access_token = create_access_token(data={"sub": str(user["_id"])})
    
    # Prepare response
    user_response = UserResponse(
        id=str(user["_id"]),
        email=user.get("email"),
        phone=user.get("phone"),
        full_name=user["full_name"],
        role=user["role"],
        address=user.get("address"),
        profile_photo=user.get("profile_photo"),
        is_active=user["is_active"],
        date_joined=user["date_joined"],
        last_login=user.get("last_login")
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user_response)

@api_router.post("/auth/send-otp")
async def send_otp(request: OTPRequest):
    """Send OTP to phone number (mock for now)"""
    otp = generate_otp()
    success = send_otp_mock(request.phone, otp)
    
    if success:
        return {"message": "OTP sent successfully", "otp": otp}  # Remove otp in production
    else:
        raise HTTPException(status_code=500, detail="Failed to send OTP")

@api_router.post("/auth/verify-otp", response_model=Token)
async def verify_otp(request: OTPVerify):
    """Verify OTP and register/login user"""
    
    if not verify_otp_mock(request.phone, request.otp):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    # Check if user exists
    user = await db.users.find_one({"phone": request.phone})
    
    if not user:
        # Register new user
        if not request.full_name or not request.role:
            raise HTTPException(status_code=400, detail="Full name and role required for registration")
        
        user_dict = {
            "phone": request.phone,
            "full_name": request.full_name,
            "role": request.role,
            "is_active": True,
            "date_joined": datetime.utcnow(),
            "last_login": datetime.utcnow()
        }
        result = await db.users.insert_one(user_dict)
        user_dict["_id"] = result.inserted_id
        user = user_dict
    else:
        # Update last login
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_login": datetime.utcnow()}}
        )
    
    # Create token
    access_token = create_access_token(data={"sub": str(user["_id"])})
    
    # Prepare response
    user_response = UserResponse(
        id=str(user["_id"]),
        email=user.get("email"),
        phone=user.get("phone"),
        full_name=user["full_name"],
        role=user["role"],
        address=user.get("address"),
        profile_photo=user.get("profile_photo"),
        is_active=user["is_active"],
        date_joined=user["date_joined"],
        last_login=user.get("last_login")
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user information"""
    user = await get_current_user(credentials, db)
    return UserResponse(
        id=str(user["_id"]),
        email=user.get("email"),
        phone=user.get("phone"),
        full_name=user["full_name"],
        role=user["role"],
        address=user.get("address"),
        profile_photo=user.get("profile_photo"),
        is_active=user["is_active"],
        date_joined=user["date_joined"],
        last_login=user.get("last_login")
    )

# ============= User Management Routes =============

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all users (admin/PM only)"""
    current_user = await get_current_user(credentials, db)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    users = await db.users.find().to_list(1000)
    return [UserResponse(
        id=str(u["_id"]),
        email=u.get("email"),
        phone=u.get("phone"),
        full_name=u["full_name"],
        role=u["role"],
        address=u.get("address"),
        profile_photo=u.get("profile_photo"),
        is_active=u["is_active"],
        date_joined=u["date_joined"],
        last_login=u.get("last_login")
    ) for u in users]

@api_router.get("/users/by-role/{role}")
async def get_users_by_role(role: UserRole, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get users by role"""
    current_user = await get_current_user(credentials, db)
    
    users = await db.users.find({"role": role}).to_list(1000)
    return [{"id": str(u["_id"]), "name": u["full_name"], "role": u["role"]} for u in users]

# ============= Root Route =============

@api_router.get("/")
async def root():
    return {
        "message": "Construction Management API",
        "version": "1.0.0",
        "status": "running"
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Socket.IO events
@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
