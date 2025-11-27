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
    CompanySettingsUpdate, UserProfileUpdate, BulkLeadItem,
    PaymentCreate, PaymentUpdate, PaymentResponse,
    ExpenseCreate, ExpenseUpdate, ExpenseResponse,
    NotificationCreate, NotificationResponse,
    ActivityLogCreate, ActivityLogResponse,
    UserRoleUpdate, UserStatusUpdate, UserManagementResponse,
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

# ============= Projects Routes =============

@api_router.get("/projects", response_model=List[ProjectResponse])
async def get_projects(
    status: str = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all projects"""
    current_user = await get_current_user(credentials, db)
    
    # Build query
    query = {}
    if status:
        query["status"] = status
    
    # Vendors can't access projects
    if current_user["role"] == UserRole.VENDOR:
        raise HTTPException(status_code=403, detail="Vendors cannot access projects")
    
    projects = await db.projects.find(query).to_list(1000)
    
    # Populate project manager name
    result = []
    for project in projects:
        project_dict = serialize_doc(project)
        if project_dict.get("project_manager_id"):
            pm = await get_user_by_id(project_dict["project_manager_id"])
            project_dict["project_manager_name"] = pm["full_name"] if pm else None
        result.append(ProjectResponse(**project_dict))
    
    return result

@api_router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get project details"""
    current_user = await get_current_user(credentials, db)
    
    if current_user["role"] == UserRole.VENDOR:
        raise HTTPException(status_code=403, detail="Vendors cannot access projects")
    
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project_dict = serialize_doc(project)
    if project_dict.get("project_manager_id"):
        pm = await get_user_by_id(project_dict["project_manager_id"])
        project_dict["project_manager_name"] = pm["full_name"] if pm else None
    
    return ProjectResponse(**project_dict)

@api_router.post("/projects", response_model=ProjectResponse)
async def create_project(
    project: ProjectCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new project"""
    current_user = await get_current_user(credentials, db)
    
    # Only admin and PM can create projects
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and project managers can create projects")
    
    project_dict = project.dict()
    project_dict["created_at"] = datetime.utcnow()
    project_dict["updated_at"] = datetime.utcnow()
    
    result = await db.projects.insert_one(project_dict)
    project_dict["_id"] = result.inserted_id
    
    project_dict = serialize_doc(project_dict)
    if project_dict.get("project_manager_id"):
        pm = await get_user_by_id(project_dict["project_manager_id"])
        project_dict["project_manager_name"] = pm["full_name"] if pm else None
    
    return ProjectResponse(**project_dict)

@api_router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_update: ProjectUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a project"""
    current_user = await get_current_user(credentials, db)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and project managers can update projects")
    
    existing = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = project_update.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": update_data}
    )
    
    updated_project = await db.projects.find_one({"_id": ObjectId(project_id)})
    project_dict = serialize_doc(updated_project)
    
    if project_dict.get("project_manager_id"):
        pm = await get_user_by_id(project_dict["project_manager_id"])
        project_dict["project_manager_name"] = pm["full_name"] if pm else None
    
    return ProjectResponse(**project_dict)

@api_router.delete("/projects/{project_id}")
async def delete_project(
    project_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a project"""
    current_user = await get_current_user(credentials, db)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and project managers can delete projects")
    
    result = await db.projects.delete_one({"_id": ObjectId(project_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {"message": "Project deleted successfully"}

# ============= Tasks Routes =============

@api_router.get("/tasks", response_model=List[TaskResponse])
async def get_tasks(
    project_id: str = None,
    status: str = None,
    assigned_to_me: bool = False,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get tasks with filters"""
    current_user = await get_current_user(credentials, db)
    
    query = {}
    if project_id:
        query["project_id"] = project_id
    if status:
        query["status"] = status
    if assigned_to_me:
        query["assigned_to"] = str(current_user["_id"])
    
    tasks = await db.tasks.find(query).to_list(1000)
    
    result = []
    for task in tasks:
        task_dict = serialize_doc(task)
        
        # Get creator name
        creator = await get_user_by_id(task_dict["created_by"])
        task_dict["created_by_name"] = creator["full_name"] if creator else None
        
        # Get assigned users
        assigned_users = []
        for user_id in task_dict.get("assigned_to", []):
            user = await get_user_by_id(user_id)
            if user:
                assigned_users.append({"id": str(user["_id"]), "name": user["full_name"]})
        task_dict["assigned_users"] = assigned_users
        
        result.append(TaskResponse(**task_dict))
    
    return result

@api_router.get("/tasks/my-tasks", response_model=List[TaskResponse])
async def get_my_tasks(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user's tasks"""
    current_user = await get_current_user(credentials, db)
    
    tasks = await db.tasks.find({"assigned_to": str(current_user["_id"])}).to_list(1000)
    
    result = []
    for task in tasks:
        task_dict = serialize_doc(task)
        
        creator = await get_user_by_id(task_dict["created_by"])
        task_dict["created_by_name"] = creator["full_name"] if creator else None
        
        assigned_users = []
        for user_id in task_dict.get("assigned_to", []):
            user = await get_user_by_id(user_id)
            if user:
                assigned_users.append({"id": str(user["_id"]), "name": user["full_name"]})
        task_dict["assigned_users"] = assigned_users
        
        result.append(TaskResponse(**task_dict))
    
    return result

@api_router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get task details"""
    current_user = await get_current_user(credentials, db)
    
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task_dict = serialize_doc(task)
    
    creator = await get_user_by_id(task_dict["created_by"])
    task_dict["created_by_name"] = creator["full_name"] if creator else None
    
    assigned_users = []
    for user_id in task_dict.get("assigned_to", []):
        user = await get_user_by_id(user_id)
        if user:
            assigned_users.append({"id": str(user["_id"]), "name": user["full_name"]})
    task_dict["assigned_users"] = assigned_users
    
    return TaskResponse(**task_dict)

@api_router.post("/tasks", response_model=TaskResponse)
async def create_task(
    task: TaskCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new task"""
    current_user = await get_current_user(credentials, db)
    
    # Only admin, PM, and engineers can create tasks
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.ENGINEER]:
        raise HTTPException(status_code=403, detail="Only admins, project managers, and engineers can create tasks")
    
    task_dict = task.dict()
    task_dict["created_by"] = str(current_user["_id"])
    task_dict["created_at"] = datetime.utcnow()
    task_dict["updated_at"] = datetime.utcnow()
    
    result = await db.tasks.insert_one(task_dict)
    task_dict["_id"] = result.inserted_id
    
    task_dict = serialize_doc(task_dict)
    task_dict["created_by_name"] = current_user["full_name"]
    
    assigned_users = []
    for user_id in task_dict.get("assigned_to", []):
        user = await get_user_by_id(user_id)
        if user:
            assigned_users.append({"id": str(user["_id"]), "name": user["full_name"]})
    task_dict["assigned_users"] = assigned_users
    
    return TaskResponse(**task_dict)

@api_router.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    task_update: TaskUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a task"""
    current_user = await get_current_user(credentials, db)
    
    existing = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check permissions
    is_creator = str(existing["created_by"]) == str(current_user["_id"])
    is_assigned = str(current_user["_id"]) in existing.get("assigned_to", [])
    is_admin_or_pm = current_user["role"] in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]
    
    if not (is_creator or is_assigned or is_admin_or_pm):
        raise HTTPException(status_code=403, detail="You don't have permission to update this task")
    
    update_data = task_update.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": update_data}
    )
    
    updated_task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    task_dict = serialize_doc(updated_task)
    
    creator = await get_user_by_id(task_dict["created_by"])
    task_dict["created_by_name"] = creator["full_name"] if creator else None
    
    assigned_users = []
    for user_id in task_dict.get("assigned_to", []):
        user = await get_user_by_id(user_id)
        if user:
            assigned_users.append({"id": str(user["_id"]), "name": user["full_name"]})
    task_dict["assigned_users"] = assigned_users
    
    return TaskResponse(**task_dict)

@api_router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a task"""
    current_user = await get_current_user(credentials, db)
    
    existing = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Only creator, admin, or PM can delete
    is_creator = str(existing["created_by"]) == str(current_user["_id"])
    is_admin_or_pm = current_user["role"] in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]
    
    if not (is_creator or is_admin_or_pm):
        raise HTTPException(status_code=403, detail="You don't have permission to delete this task")
    
    result = await db.tasks.delete_one({"_id": ObjectId(task_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"message": "Task deleted successfully"}

# ============= Materials Routes =============

@api_router.get("/materials", response_model=List[MaterialResponse])
async def get_materials(
    project_id: str = None,
    vendor_id: str = None,
    low_stock: bool = False,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get materials with filters"""
    current_user = await get_current_user(credentials, db)
    
    query = {}
    if project_id:
        query["project_id"] = project_id
    if vendor_id:
        query["vendor_id"] = vendor_id
    if low_stock:
        query["$expr"] = {"$lt": ["$quantity", "$reorder_level"]}
    
    materials = await db.materials.find(query).to_list(1000)
    
    result = []
    for material in materials:
        material_dict = serialize_doc(material)
        
        # Get vendor name
        if material_dict.get("vendor_id"):
            vendor = await db.vendors.find_one({"_id": ObjectId(material_dict["vendor_id"])})
            material_dict["vendor_name"] = vendor["company_name"] if vendor else None
        
        # Get project name
        if material_dict.get("project_id"):
            project = await db.projects.find_one({"_id": ObjectId(material_dict["project_id"])})
            material_dict["project_name"] = project["name"] if project else None
        
        result.append(MaterialResponse(**material_dict))
    
    return result

@api_router.get("/materials/{material_id}", response_model=MaterialResponse)
async def get_material(
    material_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get material details"""
    current_user = await get_current_user(credentials, db)
    
    material = await db.materials.find_one({"_id": ObjectId(material_id)})
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    material_dict = serialize_doc(material)
    
    if material_dict.get("vendor_id"):
        vendor = await db.vendors.find_one({"_id": ObjectId(material_dict["vendor_id"])})
        material_dict["vendor_name"] = vendor["company_name"] if vendor else None
    
    if material_dict.get("project_id"):
        project = await db.projects.find_one({"_id": ObjectId(material_dict["project_id"])})
        material_dict["project_name"] = project["name"] if project else None
    
    return MaterialResponse(**material_dict)

@api_router.post("/materials", response_model=MaterialResponse)
async def create_material(
    material: MaterialCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new material"""
    current_user = await get_current_user(credentials, db)
    
    # Workers cannot create materials
    if current_user["role"] == UserRole.WORKER:
        raise HTTPException(status_code=403, detail="Workers cannot create materials")
    
    material_dict = material.dict()
    material_dict["created_at"] = datetime.utcnow()
    material_dict["updated_at"] = datetime.utcnow()
    
    result = await db.materials.insert_one(material_dict)
    material_dict["_id"] = result.inserted_id
    
    material_dict = serialize_doc(material_dict)
    
    if material_dict.get("vendor_id"):
        vendor = await db.vendors.find_one({"_id": ObjectId(material_dict["vendor_id"])})
        material_dict["vendor_name"] = vendor["company_name"] if vendor else None
    
    if material_dict.get("project_id"):
        project = await db.projects.find_one({"_id": ObjectId(material_dict["project_id"])})
        material_dict["project_name"] = project["name"] if project else None
    
    return MaterialResponse(**material_dict)

@api_router.put("/materials/{material_id}", response_model=MaterialResponse)
async def update_material(
    material_id: str,
    material_update: MaterialUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a material"""
    current_user = await get_current_user(credentials, db)
    
    if current_user["role"] == UserRole.WORKER:
        raise HTTPException(status_code=403, detail="Workers cannot update materials")
    
    existing = await db.materials.find_one({"_id": ObjectId(material_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Material not found")
    
    update_data = material_update.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    await db.materials.update_one(
        {"_id": ObjectId(material_id)},
        {"$set": update_data}
    )
    
    updated_material = await db.materials.find_one({"_id": ObjectId(material_id)})
    material_dict = serialize_doc(updated_material)
    
    if material_dict.get("vendor_id"):
        vendor = await db.vendors.find_one({"_id": ObjectId(material_dict["vendor_id"])})
        material_dict["vendor_name"] = vendor["company_name"] if vendor else None
    
    if material_dict.get("project_id"):
        project = await db.projects.find_one({"_id": ObjectId(material_dict["project_id"])})
        material_dict["project_name"] = project["name"] if project else None
    
    return MaterialResponse(**material_dict)

@api_router.delete("/materials/{material_id}")
async def delete_material(
    material_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a material"""
    current_user = await get_current_user(credentials, db)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and project managers can delete materials")
    
    result = await db.materials.delete_one({"_id": ObjectId(material_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Material not found")
    
    return {"message": "Material deleted successfully"}

# ============= Vendors Routes =============

@api_router.get("/vendors", response_model=List[VendorResponse])
async def get_vendors(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all vendors"""
    current_user = await get_current_user(credentials, db)
    
    vendors = await db.vendors.find().to_list(1000)
    return [VendorResponse(**serialize_doc(v)) for v in vendors]

@api_router.get("/vendors/{vendor_id}", response_model=VendorResponse)
async def get_vendor(
    vendor_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get vendor details"""
    current_user = await get_current_user(credentials, db)
    
    vendor = await db.vendors.find_one({"_id": ObjectId(vendor_id)})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    return VendorResponse(**serialize_doc(vendor))

@api_router.post("/vendors", response_model=VendorResponse)
async def create_vendor(
    vendor: VendorCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new vendor"""
    current_user = await get_current_user(credentials, db)
    
    # Only admin, PM, and vendors can create vendor entries
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.VENDOR]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    vendor_dict = vendor.dict()
    vendor_dict["created_at"] = datetime.utcnow()
    
    result = await db.vendors.insert_one(vendor_dict)
    vendor_dict["_id"] = result.inserted_id
    
    return VendorResponse(**serialize_doc(vendor_dict))

@api_router.put("/vendors/{vendor_id}", response_model=VendorResponse)
async def update_vendor(
    vendor_id: str,
    vendor_update: VendorUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a vendor"""
    current_user = await get_current_user(credentials, db)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.VENDOR]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    existing = await db.vendors.find_one({"_id": ObjectId(vendor_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    update_data = vendor_update.dict(exclude_unset=True)
    
    await db.vendors.update_one(
        {"_id": ObjectId(vendor_id)},
        {"$set": update_data}
    )
    
    updated_vendor = await db.vendors.find_one({"_id": ObjectId(vendor_id)})
    return VendorResponse(**serialize_doc(updated_vendor))

@api_router.delete("/vendors/{vendor_id}")
async def delete_vendor(
    vendor_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a vendor"""
    current_user = await get_current_user(credentials, db)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and project managers can delete vendors")
    
    result = await db.vendors.delete_one({"_id": ObjectId(vendor_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    return {"message": "Vendor deleted successfully"}

# ============= Attendance Routes =============

@api_router.get("/attendance", response_model=List[AttendanceResponse])
async def get_attendance(
    user_id: str = None,
    project_id: str = None,
    date: str = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get attendance records"""
    current_user = await get_current_user(credentials, db)
    
    query = {}
    if user_id:
        query["user_id"] = user_id
    elif current_user["role"] in [UserRole.WORKER, UserRole.ENGINEER]:
        # Workers/Engineers see only their own attendance
        query["user_id"] = str(current_user["_id"])
    
    if project_id:
        query["project_id"] = project_id
    if date:
        query["date"] = {"$gte": datetime.fromisoformat(date)}
    
    records = await db.attendance.find(query).to_list(1000)
    
    result = []
    for record in records:
        record_dict = serialize_doc(record)
        
        # Get user and project names
        user = await get_user_by_id(record_dict["user_id"])
        project = await db.projects.find_one({"_id": ObjectId(record_dict["project_id"])})
        
        record_dict["user_name"] = user["full_name"] if user else "Unknown"
        record_dict["project_name"] = project["name"] if project else "Unknown"
        
        result.append(AttendanceResponse(**record_dict))
    
    return result

@api_router.post("/attendance/check-in", response_model=AttendanceResponse)
async def check_in(
    attendance: AttendanceCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Check in to a project"""
    current_user = await get_current_user(credentials, db)
    
    attendance_dict = attendance.dict()
    attendance_dict["user_id"] = str(current_user["_id"])
    attendance_dict["date"] = datetime.utcnow()
    attendance_dict["status"] = "present"
    
    result = await db.attendance.insert_one(attendance_dict)
    attendance_dict["_id"] = result.inserted_id
    
    attendance_dict = serialize_doc(attendance_dict)
    attendance_dict["user_name"] = current_user["full_name"]
    
    project = await db.projects.find_one({"_id": ObjectId(attendance_dict["project_id"])})
    attendance_dict["project_name"] = project["name"] if project else "Unknown"
    
    return AttendanceResponse(**attendance_dict)

@api_router.post("/attendance/{attendance_id}/check-out")
async def check_out(
    attendance_id: str,
    checkout: AttendanceCheckout,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Check out from a project"""
    current_user = await get_current_user(credentials, db)
    
    existing = await db.attendance.find_one({"_id": ObjectId(attendance_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    
    if str(existing["user_id"]) != str(current_user["_id"]):
        if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
            raise HTTPException(status_code=403, detail="Can only check out your own attendance")
    
    await db.attendance.update_one(
        {"_id": ObjectId(attendance_id)},
        {"$set": {"check_out_time": checkout.check_out_time}}
    )
    
    return {"message": "Checked out successfully"}

# ============= Work Schedules Routes =============

@api_router.get("/schedules", response_model=List[WorkScheduleResponse])
async def get_schedules(
    project_id: str = None,
    date: str = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get work schedules"""
    current_user = await get_current_user(credentials, db)
    
    query = {}
    if project_id:
        query["project_id"] = project_id
    if date:
        query["scheduled_date"] = {"$gte": datetime.fromisoformat(date)}
    
    schedules = await db.schedules.find(query).to_list(1000)
    
    result = []
    for schedule in schedules:
        schedule_dict = serialize_doc(schedule)
        
        project = await db.projects.find_one({"_id": ObjectId(schedule_dict["project_id"])})
        schedule_dict["project_name"] = project["name"] if project else "Unknown"
        
        if schedule_dict.get("task_id"):
            task = await db.tasks.find_one({"_id": ObjectId(schedule_dict["task_id"])})
            schedule_dict["task_title"] = task["title"] if task else None
        
        assigned_users = []
        for user_id in schedule_dict.get("assigned_to", []):
            user = await get_user_by_id(user_id)
            if user:
                assigned_users.append({"id": str(user["_id"]), "name": user["full_name"]})
        schedule_dict["assigned_users"] = assigned_users
        
        creator = await get_user_by_id(schedule_dict["created_by"])
        schedule_dict["created_by"] = creator["full_name"] if creator else "Unknown"
        
        result.append(WorkScheduleResponse(**schedule_dict))
    
    return result

@api_router.post("/schedules", response_model=WorkScheduleResponse)
async def create_schedule(
    schedule: WorkScheduleCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a work schedule"""
    current_user = await get_current_user(credentials, db)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.ENGINEER]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    schedule_dict = schedule.dict()
    schedule_dict["created_by"] = str(current_user["_id"])
    schedule_dict["created_at"] = datetime.utcnow()
    
    result = await db.schedules.insert_one(schedule_dict)
    schedule_dict["_id"] = result.inserted_id
    
    schedule_dict = serialize_doc(schedule_dict)
    
    project = await db.projects.find_one({"_id": ObjectId(schedule_dict["project_id"])})
    schedule_dict["project_name"] = project["name"] if project else "Unknown"
    
    if schedule_dict.get("task_id"):
        task = await db.tasks.find_one({"_id": ObjectId(schedule_dict["task_id"])})
        schedule_dict["task_title"] = task["title"] if task else None
    
    assigned_users = []
    for user_id in schedule_dict.get("assigned_to", []):
        user = await get_user_by_id(user_id)
        if user:
            assigned_users.append({"id": str(user["_id"]), "name": user["full_name"]})
    schedule_dict["assigned_users"] = assigned_users
    schedule_dict["created_by"] = current_user["full_name"]
    
    return WorkScheduleResponse(**schedule_dict)

# ============= CRM Leads Routes =============

@api_router.get("/crm/leads", response_model=List[LeadResponse])
async def get_leads(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all CRM leads"""
    current_user = await get_current_user(credentials, db)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and PMs can access CRM")
    
    leads = await db.leads.find().to_list(1000)
    
    result = []
    for lead in leads:
        lead_dict = serialize_doc(lead)
        
        if lead_dict.get("assigned_to"):
            assignee = await get_user_by_id(lead_dict["assigned_to"])
            lead_dict["assigned_to_name"] = assignee["full_name"] if assignee else None
        
        creator = await get_user_by_id(lead_dict["created_by"])
        lead_dict["created_by_name"] = creator["full_name"] if creator else "Unknown"
        
        result.append(LeadResponse(**lead_dict))
    
    return result

@api_router.post("/crm/leads", response_model=LeadResponse)
async def create_lead(
    lead: LeadCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new lead"""
    current_user = await get_current_user(credentials, db)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and PMs can create leads")
    
    lead_dict = lead.dict()
    lead_dict["created_by"] = str(current_user["_id"])
    lead_dict["created_at"] = datetime.utcnow()
    lead_dict["updated_at"] = datetime.utcnow()
    
    result = await db.leads.insert_one(lead_dict)
    lead_dict["_id"] = result.inserted_id
    
    lead_dict = serialize_doc(lead_dict)
    
    if lead_dict.get("assigned_to"):
        assignee = await get_user_by_id(lead_dict["assigned_to"])
        lead_dict["assigned_to_name"] = assignee["full_name"] if assignee else None
    
    lead_dict["created_by_name"] = current_user["full_name"]
    
    return LeadResponse(**lead_dict)

@api_router.put("/crm/leads/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: str,
    lead_update: LeadUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a lead"""
    current_user = await get_current_user(credentials, db)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and PMs can update leads")
    
    existing = await db.leads.find_one({"_id": ObjectId(lead_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    update_data = lead_update.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    await db.leads.update_one(
        {"_id": ObjectId(lead_id)},
        {"$set": update_data}
    )
    
    updated_lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
    lead_dict = serialize_doc(updated_lead)
    
    if lead_dict.get("assigned_to"):
        assignee = await get_user_by_id(lead_dict["assigned_to"])
        lead_dict["assigned_to_name"] = assignee["full_name"] if assignee else None
    
    creator = await get_user_by_id(lead_dict["created_by"])
    lead_dict["created_by_name"] = creator["full_name"] if creator else "Unknown"
    
    return LeadResponse(**lead_dict)

# ============= CRM Quotations Routes =============

@api_router.get("/crm/quotations", response_model=List[QuotationResponse])
async def get_quotations(
    lead_id: str = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get quotations"""
    current_user = await get_current_user(credentials, db)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and PMs can access quotations")
    
    query = {}
    if lead_id:
        query["lead_id"] = lead_id
    
    quotations = await db.quotations.find(query).to_list(1000)
    
    result = []
    for quot in quotations:
        quot_dict = serialize_doc(quot)
        
        lead = await db.leads.find_one({"_id": ObjectId(quot_dict["lead_id"])})
        quot_dict["lead_name"] = lead["client_name"] if lead else "Unknown"
        quot_dict["status"] = quot_dict.get("status", "draft")
        
        creator = await get_user_by_id(quot_dict["created_by"])
        quot_dict["created_by_name"] = creator["full_name"] if creator else "Unknown"
        
        result.append(QuotationResponse(**quot_dict))
    
    return result

@api_router.post("/crm/quotations", response_model=QuotationResponse)
async def create_quotation(
    quotation: QuotationCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a quotation"""
    current_user = await get_current_user(credentials, db)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and PMs can create quotations")
    
    quot_dict = quotation.dict()
    quot_dict["created_by"] = str(current_user["_id"])
    quot_dict["status"] = "draft"
    quot_dict["created_at"] = datetime.utcnow()
    
    result = await db.quotations.insert_one(quot_dict)
    quot_dict["_id"] = result.inserted_id
    
    quot_dict = serialize_doc(quot_dict)
    
    lead = await db.leads.find_one({"_id": ObjectId(quot_dict["lead_id"])})
    quot_dict["lead_name"] = lead["client_name"] if lead else "Unknown"
    quot_dict["created_by_name"] = current_user["full_name"]
    
    return QuotationResponse(**quot_dict)

# ============= Company Settings Routes =============

@api_router.get("/settings/company")
async def get_company_settings(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get company settings"""
    current_user = await get_current_user(credentials, db)
    
    settings = await db.company_settings.find_one({})
    if not settings:
        # Return default settings
        return {
            "company_name": "Construction Company",
            "logo": None,
            "address": None,
            "phone": None,
            "email": None,
            "tax_id": None,
            "website": None
        }
    
    return serialize_doc(settings)

@api_router.put("/settings/company")
async def update_company_settings(
    settings: CompanySettingsUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update company settings (Admin only)"""
    current_user = await get_current_user(credentials, db)
    
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can update company settings")
    
    existing = await db.company_settings.find_one({})
    update_data = settings.dict(exclude_unset=True)
    
    if existing:
        await db.company_settings.update_one(
            {"_id": existing["_id"]},
            {"$set": update_data}
        )
    else:
        await db.company_settings.insert_one(update_data)
    
    updated = await db.company_settings.find_one({})
    return serialize_doc(updated) if updated else update_data

# ============= Profile Routes =============

@api_router.put("/profile")
async def update_profile(
    profile: UserProfileUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update user profile"""
    current_user = await get_current_user(credentials, db)
    
    update_data = profile.dict(exclude_unset=True)
    
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": update_data}
    )
    
    updated_user = await db.users.find_one({"_id": current_user["_id"]})
    
    return UserResponse(
        id=str(updated_user["_id"]),
        email=updated_user.get("email"),
        phone=updated_user.get("phone"),
        full_name=updated_user["full_name"],
        role=updated_user["role"],
        address=updated_user.get("address"),
        profile_photo=updated_user.get("profile_photo"),
        is_active=updated_user["is_active"],
        date_joined=updated_user["date_joined"],
        last_login=updated_user.get("last_login")
    )

# ============= Bulk Leads Upload =============

@api_router.post("/crm/leads/bulk")
async def bulk_upload_leads(
    leads: List[BulkLeadItem],
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Bulk upload leads (Admin/PM only)"""
    current_user = await get_current_user(credentials, db)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and PMs can bulk upload leads")
    
    inserted_count = 0
    for lead_data in leads:
        lead_dict = lead_data.dict()
        lead_dict["created_by"] = str(current_user["_id"])
        lead_dict["status"] = "new"
        lead_dict["created_at"] = datetime.utcnow()
        lead_dict["updated_at"] = datetime.utcnow()
        
        await db.leads.insert_one(lead_dict)
        inserted_count += 1
    
    return {"message": f"Successfully uploaded {inserted_count} leads"}

# ============= Payments Routes =============

@api_router.get("/payments", response_model=List[PaymentResponse])
async def get_payments(
    project_id: str = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get payments"""
    current_user = await get_current_user(credentials, db)
    
    query = {}
    if project_id:
        query["project_id"] = project_id
    
    payments = await db.payments.find(query).to_list(1000)
    
    result = []
    for payment in payments:
        payment_dict = serialize_doc(payment)
        
        project = await db.projects.find_one({"_id": ObjectId(payment_dict["project_id"])})
        payment_dict["project_name"] = project["name"] if project else "Unknown"
        
        creator = await get_user_by_id(payment_dict["created_by"])
        payment_dict["created_by_name"] = creator["full_name"] if creator else "Unknown"
        
        result.append(PaymentResponse(**payment_dict))
    
    return result

@api_router.post("/payments", response_model=PaymentResponse)
async def create_payment(
    payment: PaymentCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a payment"""
    current_user = await get_current_user(credentials, db)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    payment_dict = payment.dict()
    payment_dict["created_by"] = str(current_user["_id"])
    payment_dict["created_at"] = datetime.utcnow()
    
    result = await db.payments.insert_one(payment_dict)
    payment_dict["_id"] = result.inserted_id
    
    payment_dict = serialize_doc(payment_dict)
    
    project = await db.projects.find_one({"_id": ObjectId(payment_dict["project_id"])})
    payment_dict["project_name"] = project["name"] if project else "Unknown"
    payment_dict["created_by_name"] = current_user["full_name"]
    
    # Log activity
    await log_activity(
        db, current_user["_id"], "payment_added",
        f"Added payment of ₹{payment.amount} for project",
        payment_dict["id"], "payment"
    )
    
    return PaymentResponse(**payment_dict)

@api_router.put("/payments/{payment_id}", response_model=PaymentResponse)
async def update_payment(
    payment_id: str,
    payment_update: PaymentUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a payment"""
    current_user = await get_current_user(credentials, db)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    existing = await db.payments.find_one({"_id": ObjectId(payment_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    update_data = payment_update.dict(exclude_unset=True)
    
    await db.payments.update_one(
        {"_id": ObjectId(payment_id)},
        {"$set": update_data}
    )
    
    updated_payment = await db.payments.find_one({"_id": ObjectId(payment_id)})
    payment_dict = serialize_doc(updated_payment)
    
    project = await db.projects.find_one({"_id": ObjectId(payment_dict["project_id"])})
    payment_dict["project_name"] = project["name"] if project else "Unknown"
    
    creator = await get_user_by_id(payment_dict["created_by"])
    payment_dict["created_by_name"] = creator["full_name"] if creator else "Unknown"
    
    return PaymentResponse(**payment_dict)

# ============= Expenses Routes =============

@api_router.get("/expenses", response_model=List[ExpenseResponse])
async def get_expenses(
    project_id: str = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get expenses"""
    current_user = await get_current_user(credentials, db)
    
    query = {}
    if project_id:
        query["project_id"] = project_id
    
    expenses = await db.expenses.find(query).to_list(1000)
    
    result = []
    for expense in expenses:
        expense_dict = serialize_doc(expense)
        
        project = await db.projects.find_one({"_id": ObjectId(expense_dict["project_id"])})
        expense_dict["project_name"] = project["name"] if project else "Unknown"
        
        if expense_dict.get("vendor_id"):
            vendor = await db.vendors.find_one({"_id": ObjectId(expense_dict["vendor_id"])})
            expense_dict["vendor_name"] = vendor["company_name"] if vendor else None
        
        creator = await get_user_by_id(expense_dict["created_by"])
        expense_dict["created_by_name"] = creator["full_name"] if creator else "Unknown"
        
        result.append(ExpenseResponse(**expense_dict))
    
    return result

@api_router.post("/expenses", response_model=ExpenseResponse)
async def create_expense(
    expense: ExpenseCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create an expense"""
    current_user = await get_current_user(credentials, db)
    
    expense_dict = expense.dict()
    expense_dict["created_by"] = str(current_user["_id"])
    expense_dict["created_at"] = datetime.utcnow()
    
    result = await db.expenses.insert_one(expense_dict)
    expense_dict["_id"] = result.inserted_id
    
    expense_dict = serialize_doc(expense_dict)
    
    project = await db.projects.find_one({"_id": ObjectId(expense_dict["project_id"])})
    expense_dict["project_name"] = project["name"] if project else "Unknown"
    
    if expense_dict.get("vendor_id"):
        vendor = await db.vendors.find_one({"_id": ObjectId(expense_dict["vendor_id"])})
        expense_dict["vendor_name"] = vendor["company_name"] if vendor else None
    
    expense_dict["created_by_name"] = current_user["full_name"]
    
    # Log activity
    await log_activity(
        db, current_user["_id"], "expense_added",
        f"Added expense of ₹{expense.amount}",
        expense_dict["id"], "expense"
    )
    
    return ExpenseResponse(**expense_dict)

@api_router.put("/expenses/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: str,
    expense_update: ExpenseUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update an expense"""
    current_user = await get_current_user(credentials, db)
    
    existing = await db.expenses.find_one({"_id": ObjectId(expense_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    # Only creator or admin/PM can update
    is_creator = str(existing["created_by"]) == str(current_user["_id"])
    is_admin_or_pm = current_user["role"] in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]
    
    if not (is_creator or is_admin_or_pm):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    update_data = expense_update.dict(exclude_unset=True)
    
    await db.expenses.update_one(
        {"_id": ObjectId(expense_id)},
        {"$set": update_data}
    )
    
    updated_expense = await db.expenses.find_one({"_id": ObjectId(expense_id)})
    expense_dict = serialize_doc(updated_expense)
    
    project = await db.projects.find_one({"_id": ObjectId(expense_dict["project_id"])})
    expense_dict["project_name"] = project["name"] if project else "Unknown"
    
    if expense_dict.get("vendor_id"):
        vendor = await db.vendors.find_one({"_id": ObjectId(expense_dict["vendor_id"])})
        expense_dict["vendor_name"] = vendor["company_name"] if vendor else None
    
    creator = await get_user_by_id(expense_dict["created_by"])
    expense_dict["created_by_name"] = creator["full_name"] if creator else "Unknown"
    
    return ExpenseResponse(**expense_dict)

# ============= Notifications Routes =============

@api_router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(
    unread_only: bool = False,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get user notifications"""
    current_user = await get_current_user(credentials, db)
    
    query = {"user_id": str(current_user["_id"])}
    if unread_only:
        query["is_read"] = False
    
    notifications = await db.notifications.find(query).sort("created_at", -1).to_list(100)
    
    return [NotificationResponse(**serialize_doc(n)) for n in notifications]

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Mark notification as read"""
    current_user = await get_current_user(credentials, db)
    
    result = await db.notifications.update_one(
        {"_id": ObjectId(notification_id), "user_id": str(current_user["_id"])},
        {"$set": {"is_read": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as read"}

@api_router.put("/notifications/mark-all-read")
async def mark_all_notifications_read(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Mark all notifications as read"""
    current_user = await get_current_user(credentials, db)
    
    await db.notifications.update_many(
        {"user_id": str(current_user["_id"]), "is_read": False},
        {"$set": {"is_read": True}}
    )
    
    return {"message": "All notifications marked as read"}

# ============= Activity Log Routes =============

@api_router.get("/activity", response_model=List[ActivityLogResponse])
async def get_activity_log(
    limit: int = 50,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get activity log"""
    current_user = await get_current_user(credentials, db)
    
    activities = await db.activity_logs.find().sort("created_at", -1).limit(limit).to_list(limit)
    
    result = []
    for activity in activities:
        activity_dict = serialize_doc(activity)
        
        user = await get_user_by_id(activity_dict["user_id"])
        if user:
            activity_dict["user_name"] = user["full_name"]
            activity_dict["user_role"] = user["role"]
        else:
            activity_dict["user_name"] = "Unknown"
            activity_dict["user_role"] = "unknown"
        
        result.append(ActivityLogResponse(**activity_dict))
    
    return result

# ============= User Management Routes =============

@api_router.get("/admin/users", response_model=List[UserManagementResponse])
async def get_all_users_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all users with stats (Admin only)"""
    current_user = await get_current_user(credentials, db)
    
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find().to_list(1000)
    
    result = []
    for user in users:
        user_dict = serialize_doc(user)
        
        # Get stats
        project_count = await db.projects.count_documents({"project_manager_id": user_dict["id"]})
        task_count = await db.tasks.count_documents({"assigned_to": user_dict["id"]})
        
        result.append(UserManagementResponse(
            id=user_dict["id"],
            email=user_dict.get("email"),
            phone=user_dict.get("phone"),
            full_name=user_dict["full_name"],
            role=user_dict["role"],
            is_active=user_dict["is_active"],
            date_joined=user_dict["date_joined"],
            last_login=user_dict.get("last_login"),
            total_projects=project_count,
            total_tasks=task_count
        ))
    
    return result

@api_router.put("/admin/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    role_update: UserRoleUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update user role (Admin only)"""
    current_user = await get_current_user(credentials, db)
    
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"role": role_update.role}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User role updated successfully"}

@api_router.put("/admin/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    status_update: UserStatusUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Activate/Deactivate user (Admin only)"""
    current_user = await get_current_user(credentials, db)
    
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if str(current_user["_id"]) == user_id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_active": status_update.is_active}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User status updated successfully"}

# ============= Financial Reports Routes =============

@api_router.get("/reports/financial/{project_id}")
async def get_project_financial_report(
    project_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get financial report for a project"""
    current_user = await get_current_user(credentials, db)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get all payments
    payments = await db.payments.find({"project_id": project_id}).to_list(1000)
    total_received = sum(p["amount"] for p in payments if p["payment_type"] == "client_payment" and p["status"] == "paid")
    total_pending = sum(p["amount"] for p in payments if p["payment_type"] == "client_payment" and p["status"] == "pending")
    
    # Get all expenses
    expenses = await db.expenses.find({"project_id": project_id}).to_list(1000)
    total_expenses = sum(e["amount"] for e in expenses)
    
    # Get vendor payments
    vendor_payments = [p for p in payments if p["payment_type"] == "vendor_payment"]
    total_vendor_paid = sum(p["amount"] for p in vendor_payments if p["status"] == "paid")
    
    # Calculate profit/loss
    budget = project.get("budget", 0)
    profit_loss = total_received - total_expenses
    
    return {
        "project_id": project_id,
        "project_name": project["name"],
        "budget": budget,
        "total_received": total_received,
        "total_pending": total_pending,
        "total_expenses": total_expenses,
        "total_vendor_paid": total_vendor_paid,
        "profit_loss": profit_loss,
        "budget_utilization": (total_expenses / budget * 100) if budget > 0 else 0,
        "payment_breakdown": {
            "paid": total_received,
            "pending": total_pending,
            "total": total_received + total_pending
        }
    }

# Helper function for logging activities
async def log_activity(db, user_id: str, activity_type: str, description: str, reference_id: str = None, reference_type: str = None):
    """Helper to log activities"""
    activity = {
        "user_id": user_id,
        "activity_type": activity_type,
        "description": description,
        "reference_id": reference_id,
        "reference_type": reference_type,
        "created_at": datetime.utcnow()
    }
    await db.activity_logs.insert_one(activity)

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
