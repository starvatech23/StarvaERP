from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timedelta
from bson import ObjectId
import socketio

# Import models and auth
from models import (
    UserCreate, UserLogin, UserResponse, Token, OTPRequest, OTPVerify,
    ProjectCreate, ProjectUpdate, ProjectResponse,
    TaskCreate, TaskUpdate, TaskResponse,
    MaterialCreate, MaterialUpdate, MaterialResponse, MaterialCategory,
    VendorCreate, VendorUpdate, VendorResponse,
    VendorMaterialRateCreate, VendorMaterialRateUpdate, VendorMaterialRateResponse,
    SiteInventoryCreate, SiteInventoryUpdate, SiteInventoryResponse,
    MaterialRequirementCreate, MaterialRequirementUpdate, MaterialRequirementResponse,
    PurchaseOrderCreate, PurchaseOrderUpdate, PurchaseOrderResponse, PurchaseOrderStatus,
    PurchaseOrderItemCreate, PurchaseOrderItemUpdate, PurchaseOrderItemResponse,
    MaterialTransactionCreate, MaterialTransactionResponse, TransactionType,
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
    WorkerCreate, WorkerUpdate, WorkerResponse,
    LaborAttendanceCreate, LaborAttendanceUpdate, LaborAttendanceResponse,
    SiteTransferCreate, SiteTransferResponse,
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

# Dependency to get database
async def get_database():
    return db

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
    user = await get_current_user(credentials)
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
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
    users = await db.users.find({"role": role}).to_list(1000)
    return [{"id": str(u["_id"]), "name": u["full_name"], "role": u["role"]} for u in users]

# ============= Projects Routes =============

@api_router.get("/projects", response_model=List[ProjectResponse])
async def get_projects(
    status: str = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all projects"""
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and project managers can delete projects")
    
    result = await db.projects.delete_one({"_id": ObjectId(project_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {"message": "Project deleted successfully"}

# ============= Tasks Routes =============

async def get_task_subtasks(task_id: str):
    """Helper function to get subtasks"""
    subtasks = await db.tasks.find({"parent_task_id": task_id}).to_list(100)
    result = []
    for subtask in subtasks:
        subtask_dict = serialize_doc(subtask)
        
        # Get assigned users for subtask
        assigned_users = []
        for user_id in subtask_dict.get("assigned_to", []):
            user = await get_user_by_id(user_id)
            if user:
                assigned_users.append({"id": str(user["_id"]), "name": user["full_name"]})
        subtask_dict["assigned_users"] = assigned_users
        result.append(subtask_dict)
    
    return result

@api_router.get("/tasks", response_model=List[TaskResponse])
async def get_tasks(
    project_id: str = None,
    status: str = None,
    assigned_to_me: bool = False,
    parent_only: bool = True,  # By default, only get parent tasks
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get tasks with filters"""
    current_user = await get_current_user(credentials)
    
    query = {}
    if project_id:
        query["project_id"] = project_id
    if status:
        query["status"] = status
    if assigned_to_me:
        query["assigned_to"] = str(current_user["_id"])
    
    # Filter parent tasks only (no subtasks)
    if parent_only:
        query["parent_task_id"] = None
    
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
        
        # Get subtasks
        task_dict["subtasks"] = await get_task_subtasks(task_dict["id"])
        
        result.append(TaskResponse(**task_dict))
    
    return result

@api_router.get("/tasks/my-tasks", response_model=List[TaskResponse])
async def get_my_tasks(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user's tasks"""
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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
    
    # Get subtasks
    task_dict["subtasks"] = await get_task_subtasks(task_dict["id"])
    
    return TaskResponse(**task_dict)

@api_router.post("/tasks", response_model=TaskResponse)
async def create_task(
    task: TaskCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new task"""
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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

# ============= Old Materials and Vendors Routes Removed - Using New Implementation Below =============

# ============= Attendance Routes =============

@api_router.get("/attendance", response_model=List[AttendanceResponse])
async def get_attendance(
    user_id: str = None,
    project_id: str = None,
    date: str = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get attendance records"""
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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
    current_user = await get_current_user(credentials)
    
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

# ============= Workers/Labor Management Routes =============

@api_router.get("/workers", response_model=List[WorkerResponse])
async def get_workers(
    status: str = None,
    skill_group: str = None,
    project_id: str = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all workers"""
    current_user = await get_current_user(credentials)
    
    query = {}
    if status:
        query["status"] = status
    if skill_group:
        query["skill_group"] = skill_group
    if project_id:
        query["current_site_id"] = project_id
    
    workers = await db.workers.find(query).to_list(1000)
    
    result = []
    for worker in workers:
        worker_dict = serialize_doc(worker)
        
        # Get current site name
        if worker_dict.get("current_site_id"):
            project = await db.projects.find_one({"_id": ObjectId(worker_dict["current_site_id"])})
            worker_dict["current_site_name"] = project["name"] if project else None
        
        # Get creator name
        creator = await get_user_by_id(worker_dict["created_by"])
        worker_dict["created_by_name"] = creator["full_name"] if creator else None
        
        result.append(WorkerResponse(**worker_dict))
    
    return result

@api_router.post("/workers", response_model=WorkerResponse)
async def create_worker(
    worker: WorkerCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new worker"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and project managers can add workers")
    
    worker_dict = worker.dict()
    worker_dict["created_by"] = str(current_user["_id"])
    worker_dict["created_at"] = datetime.utcnow()
    worker_dict["updated_at"] = datetime.utcnow()
    
    result = await db.workers.insert_one(worker_dict)
    worker_dict["_id"] = result.inserted_id
    
    worker_dict = serialize_doc(worker_dict)
    worker_dict["created_by_name"] = current_user["full_name"]
    worker_dict["current_site_name"] = None
    
    return WorkerResponse(**worker_dict)

@api_router.get("/workers/{worker_id}", response_model=WorkerResponse)
async def get_worker(
    worker_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get worker details"""
    current_user = await get_current_user(credentials)
    
    worker = await db.workers.find_one({"_id": ObjectId(worker_id)})
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    worker_dict = serialize_doc(worker)
    
    if worker_dict.get("current_site_id"):
        project = await db.projects.find_one({"_id": ObjectId(worker_dict["current_site_id"])})
        worker_dict["current_site_name"] = project["name"] if project else None
    
    creator = await get_user_by_id(worker_dict["created_by"])
    worker_dict["created_by_name"] = creator["full_name"] if creator else None
    
    return WorkerResponse(**worker_dict)

@api_router.put("/workers/{worker_id}", response_model=WorkerResponse)
async def update_worker(
    worker_id: str,
    worker_update: WorkerUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a worker"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and project managers can update workers")
    
    existing = await db.workers.find_one({"_id": ObjectId(worker_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    update_data = worker_update.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    await db.workers.update_one(
        {"_id": ObjectId(worker_id)},
        {"$set": update_data}
    )
    
    updated_worker = await db.workers.find_one({"_id": ObjectId(worker_id)})
    worker_dict = serialize_doc(updated_worker)
    
    if worker_dict.get("current_site_id"):
        project = await db.projects.find_one({"_id": ObjectId(worker_dict["current_site_id"])})
        worker_dict["current_site_name"] = project["name"] if project else None
    
    creator = await get_user_by_id(worker_dict["created_by"])
    worker_dict["created_by_name"] = creator["full_name"] if creator else None
    
    return WorkerResponse(**worker_dict)

@api_router.delete("/workers/{worker_id}")
async def delete_worker(
    worker_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a worker"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can delete workers")
    
    result = await db.workers.delete_one({"_id": ObjectId(worker_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    return {"message": "Worker deleted successfully"}

# ============= Labor Attendance Routes =============

@api_router.get("/labor-attendance", response_model=List[LaborAttendanceResponse])
async def get_labor_attendance(
    project_id: str = None,
    worker_id: str = None,
    date: str = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get labor attendance records"""
    current_user = await get_current_user(credentials)
    
    query = {}
    if project_id:
        query["project_id"] = project_id
    if worker_id:
        query["worker_id"] = worker_id
    if date:
        # Filter by date
        start_date = datetime.fromisoformat(date)
        end_date = start_date + timedelta(days=1)
        query["attendance_date"] = {"$gte": start_date, "$lt": end_date}
    
    attendances = await db.labor_attendance.find(query).to_list(1000)
    
    result = []
    for attendance in attendances:
        attendance_dict = serialize_doc(attendance)
        
        # Get worker details
        worker = await db.workers.find_one({"_id": ObjectId(attendance_dict["worker_id"])})
        attendance_dict["worker_name"] = worker["full_name"] if worker else "Unknown"
        attendance_dict["worker_skill"] = worker["skill_group"] if worker else "unknown"
        
        # Get project name
        project = await db.projects.find_one({"_id": ObjectId(attendance_dict["project_id"])})
        attendance_dict["project_name"] = project["name"] if project else "Unknown"
        
        result.append(LaborAttendanceResponse(**attendance_dict))
    
    return result

@api_router.post("/labor-attendance", response_model=LaborAttendanceResponse)
async def create_labor_attendance(
    attendance: LaborAttendanceCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Mark attendance for a worker"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and project managers can mark attendance")
    
    # Get worker details for wage calculation
    worker = await db.workers.find_one({"_id": ObjectId(attendance.worker_id)})
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    attendance_dict = attendance.dict()
    attendance_dict["created_by"] = str(current_user["_id"])
    attendance_dict["created_at"] = datetime.utcnow()
    attendance_dict["updated_at"] = datetime.utcnow()
    
    # Calculate wages if hours worked is provided
    if attendance_dict.get("hours_worked"):
        worker_rate = worker.get("base_rate", 0)
        pay_scale = worker.get("pay_scale", "daily")
        
        if pay_scale == "hourly":
            attendance_dict["wages_earned"] = attendance_dict["hours_worked"] * worker_rate
        elif pay_scale == "daily":
            attendance_dict["wages_earned"] = worker_rate  # Full day rate
    
    result = await db.labor_attendance.insert_one(attendance_dict)
    attendance_dict["_id"] = result.inserted_id
    
    attendance_dict = serialize_doc(attendance_dict)
    attendance_dict["worker_name"] = worker["full_name"]
    attendance_dict["worker_skill"] = worker["skill_group"]
    
    project = await db.projects.find_one({"_id": ObjectId(attendance.project_id)})
    attendance_dict["project_name"] = project["name"] if project else "Unknown"
    
    return LaborAttendanceResponse(**attendance_dict)

@api_router.put("/labor-attendance/{attendance_id}", response_model=LaborAttendanceResponse)
async def update_labor_attendance(
    attendance_id: str,
    attendance_update: LaborAttendanceUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update attendance (e.g., checkout)"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and project managers can update attendance")
    
    existing = await db.labor_attendance.find_one({"_id": ObjectId(attendance_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    
    update_data = attendance_update.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    # Recalculate wages if hours changed
    if "hours_worked" in update_data:
        worker = await db.workers.find_one({"_id": ObjectId(existing["worker_id"])})
        if worker:
            worker_rate = worker.get("base_rate", 0)
            pay_scale = worker.get("pay_scale", "daily")
            
            if pay_scale == "hourly":
                update_data["wages_earned"] = update_data["hours_worked"] * worker_rate
            elif pay_scale == "daily":
                update_data["wages_earned"] = worker_rate
    
    await db.labor_attendance.update_one(
        {"_id": ObjectId(attendance_id)},
        {"$set": update_data}
    )
    
    updated_attendance = await db.labor_attendance.find_one({"_id": ObjectId(attendance_id)})
    attendance_dict = serialize_doc(updated_attendance)
    
    worker = await db.workers.find_one({"_id": ObjectId(attendance_dict["worker_id"])})
    attendance_dict["worker_name"] = worker["full_name"] if worker else "Unknown"
    attendance_dict["worker_skill"] = worker["skill_group"] if worker else "unknown"
    
    project = await db.projects.find_one({"_id": ObjectId(attendance_dict["project_id"])})
    attendance_dict["project_name"] = project["name"] if project else "Unknown"
    
    return LaborAttendanceResponse(**attendance_dict)

# ============= Site Transfer Routes =============

@api_router.get("/site-transfers", response_model=List[SiteTransferResponse])
async def get_site_transfers(
    worker_id: str = None,
    date: str = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get site transfer records"""
    current_user = await get_current_user(credentials)
    
    query = {}
    if worker_id:
        query["worker_id"] = worker_id
    if date:
        start_date = datetime.fromisoformat(date)
        end_date = start_date + timedelta(days=1)
        query["transfer_date"] = {"$gte": start_date, "$lt": end_date}
    
    transfers = await db.site_transfers.find(query).to_list(1000)
    
    result = []
    for transfer in transfers:
        transfer_dict = serialize_doc(transfer)
        
        # Get worker name
        worker = await db.workers.find_one({"_id": ObjectId(transfer_dict["worker_id"])})
        transfer_dict["worker_name"] = worker["full_name"] if worker else "Unknown"
        
        # Get project names
        from_project = await db.projects.find_one({"_id": ObjectId(transfer_dict["from_project_id"])})
        transfer_dict["from_project_name"] = from_project["name"] if from_project else "Unknown"
        
        to_project = await db.projects.find_one({"_id": ObjectId(transfer_dict["to_project_id"])})
        transfer_dict["to_project_name"] = to_project["name"] if to_project else "Unknown"
        
        # Get creator name
        creator = await get_user_by_id(transfer_dict["created_by"])
        transfer_dict["created_by_name"] = creator["full_name"] if creator else None
        
        result.append(SiteTransferResponse(**transfer_dict))
    
    return result

@api_router.post("/site-transfers", response_model=SiteTransferResponse)
async def create_site_transfer(
    transfer: SiteTransferCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Transfer worker from one site to another"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and project managers can transfer workers")
    
    # Get worker details
    worker = await db.workers.find_one({"_id": ObjectId(transfer.worker_id)})
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    transfer_dict = transfer.dict()
    transfer_dict["created_by"] = str(current_user["_id"])
    transfer_dict["created_at"] = datetime.utcnow()
    transfer_dict["approved_by"] = str(current_user["_id"])
    
    # Calculate split wages if hours provided
    if transfer_dict.get("hours_at_from_site") and transfer_dict.get("hours_at_to_site"):
        worker_rate = worker.get("base_rate", 0)
        pay_scale = worker.get("pay_scale", "daily")
        
        if pay_scale == "hourly":
            transfer_dict["wages_from_site"] = transfer_dict["hours_at_from_site"] * worker_rate
            transfer_dict["wages_to_site"] = transfer_dict["hours_at_to_site"] * worker_rate
        elif pay_scale == "daily":
            total_hours = transfer_dict["hours_at_from_site"] + transfer_dict["hours_at_to_site"]
            if total_hours > 0:
                transfer_dict["wages_from_site"] = (transfer_dict["hours_at_from_site"] / total_hours) * worker_rate
                transfer_dict["wages_to_site"] = (transfer_dict["hours_at_to_site"] / total_hours) * worker_rate
    
    result = await db.site_transfers.insert_one(transfer_dict)
    transfer_dict["_id"] = result.inserted_id
    
    # Update worker's current site
    await db.workers.update_one(
        {"_id": ObjectId(transfer.worker_id)},
        {"$set": {"current_site_id": transfer.to_project_id}}
    )
    
    transfer_dict = serialize_doc(transfer_dict)
    transfer_dict["worker_name"] = worker["full_name"]
    
    from_project = await db.projects.find_one({"_id": ObjectId(transfer.from_project_id)})
    transfer_dict["from_project_name"] = from_project["name"] if from_project else "Unknown"
    
    to_project = await db.projects.find_one({"_id": ObjectId(transfer.to_project_id)})
    transfer_dict["to_project_name"] = to_project["name"] if to_project else "Unknown"
    
    transfer_dict["created_by_name"] = current_user["full_name"]
    
    return SiteTransferResponse(**transfer_dict)



# ============= Vendor Management Routes =============

@api_router.get("/vendors", response_model=List[VendorResponse])
async def get_all_vendors(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    is_active: Optional[bool] = None
):
    """Get all vendors"""
    current_user = await get_current_user(credentials)
    
    query = {}
    if is_active is not None:
        query["is_active"] = is_active
    
    vendors = await db.vendors.find(query).to_list(length=1000)
    result = []
    for vendor in vendors:
        vendor = serialize_doc(vendor)
        # Handle vendors without created_by field (from old implementation)
        if "created_by" not in vendor:
            vendor["created_by"] = "unknown"
            vendor["created_by_name"] = "Unknown"
        else:
            creator = await db.users.find_one({"_id": ObjectId(vendor["created_by"])})
            vendor["created_by_name"] = creator["full_name"] if creator else "Unknown"
        result.append(VendorResponse(**vendor))
    return result

@api_router.post("/vendors", response_model=VendorResponse)
async def create_vendor(
    vendor: VendorCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new vendor (Admin/PM only)"""
    current_user = await get_current_user(credentials)
    
    # Only admin, PM can create vendors
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and project managers can create vendors")
    
    vendor_dict = vendor.dict()
    vendor_dict["created_by"] = str(current_user["_id"])
    vendor_dict["created_at"] = datetime.utcnow()
    vendor_dict["updated_at"] = datetime.utcnow()
    
    result = await db.vendors.insert_one(vendor_dict)
    vendor_dict["_id"] = result.inserted_id
    vendor_dict = serialize_doc(vendor_dict)
    vendor_dict["created_by_name"] = current_user["full_name"]
    
    return VendorResponse(**vendor_dict)

@api_router.get("/vendors/{vendor_id}", response_model=VendorResponse)
async def get_vendor(
    vendor_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get a specific vendor"""
    current_user = await get_current_user(credentials)
    
    vendor = await db.vendors.find_one({"_id": ObjectId(vendor_id)})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    vendor = serialize_doc(vendor)
    creator = await db.users.find_one({"_id": ObjectId(vendor["created_by"])})
    vendor["created_by_name"] = creator["full_name"] if creator else "Unknown"
    
    return VendorResponse(**vendor)

@api_router.put("/vendors/{vendor_id}", response_model=VendorResponse)
async def update_vendor(
    vendor_id: str,
    vendor: VendorUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a vendor (Admin/PM only)"""
    current_user = await get_current_user(credentials)
    
    # Only admin, PM can update vendors
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and project managers can update vendors")
    update_data = {k: v for k, v in vendor.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.vendors.update_one(
        {"_id": ObjectId(vendor_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    updated_vendor = await db.vendors.find_one({"_id": ObjectId(vendor_id)})
    updated_vendor = serialize_doc(updated_vendor)
    creator = await db.users.find_one({"_id": ObjectId(updated_vendor["created_by"])})
    updated_vendor["created_by_name"] = creator["full_name"] if creator else "Unknown"
    
    return VendorResponse(**updated_vendor)

@api_router.delete("/vendors/{vendor_id}")
async def delete_vendor(
    vendor_id: str,
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """Delete a vendor (Admin only)"""
    result = await db.vendors.delete_one({"_id": ObjectId(vendor_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return {"message": "Vendor deleted successfully"}

# ============= Material Management Routes =============

@api_router.get("/materials", response_model=List[MaterialResponse])
async def get_all_materials(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    category: Optional[MaterialCategory] = None,
    is_active: Optional[bool] = None
):
    """Get all materials"""
    current_user = await get_current_user(credentials)
    
    query = {}
    if category:
        query["category"] = category
    if is_active is not None:
        query["is_active"] = is_active
    
    materials = await db.materials.find(query).to_list(length=1000)
    result = []
    for material in materials:
        material = serialize_doc(material)
        # Handle materials without created_by field (from old implementation)
        if "created_by" not in material:
            material["created_by"] = "unknown"
        result.append(MaterialResponse(**material))
    return result

@api_router.post("/materials", response_model=MaterialResponse)
async def create_material(
    material: MaterialCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new material (Admin/PM only)"""
    current_user = await get_current_user(credentials)
    
    # Only admin, PM can create materials
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and project managers can create materials")
    
    material_dict = material.dict()
    material_dict["created_by"] = str(current_user["_id"])
    material_dict["created_at"] = datetime.utcnow()
    material_dict["updated_at"] = datetime.utcnow()
    
    result = await db.materials.insert_one(material_dict)
    material_dict["_id"] = result.inserted_id
    material_dict = serialize_doc(material_dict)
    
    return MaterialResponse(**material_dict)

@api_router.get("/materials/{material_id}", response_model=MaterialResponse)
async def get_material(
    material_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific material"""
    material = await db.materials.find_one({"_id": ObjectId(material_id)})
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    material = serialize_doc(material)
    return MaterialResponse(**material)

@api_router.put("/materials/{material_id}", response_model=MaterialResponse)
async def update_material(
    material_id: str,
    material: MaterialUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a material (Admin/PM only)"""
    current_user = await get_current_user(credentials)
    
    # Only admin, PM can update materials
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and project managers can update materials")
    update_data = {k: v for k, v in material.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.materials.update_one(
        {"_id": ObjectId(material_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Material not found")
    
    updated_material = await db.materials.find_one({"_id": ObjectId(material_id)})
    updated_material = serialize_doc(updated_material)
    
    return MaterialResponse(**updated_material)

@api_router.delete("/materials/{material_id}")
async def delete_material(
    material_id: str,
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """Delete a material (Admin only)"""
    result = await db.materials.delete_one({"_id": ObjectId(material_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Material not found")
    return {"message": "Material deleted successfully"}

# ============= Vendor Material Rate Routes =============

@api_router.get("/vendor-material-rates", response_model=List[VendorMaterialRateResponse])
async def get_vendor_material_rates(
    current_user: dict = Depends(get_current_user),
    vendor_id: Optional[str] = None,
    material_id: Optional[str] = None,
    is_active: Optional[bool] = None
):
    """Get vendor material rates"""
    query = {}
    if vendor_id:
        query["vendor_id"] = vendor_id
    if material_id:
        query["material_id"] = material_id
    if is_active is not None:
        query["is_active"] = is_active
    
    rates = await db.vendor_material_rates.find(query).to_list(length=1000)
    result = []
    for rate in rates:
        rate = serialize_doc(rate)
        
        vendor = await db.vendors.find_one({"_id": ObjectId(rate["vendor_id"])})
        rate["vendor_name"] = vendor["business_name"] if vendor else "Unknown"
        
        material = await db.materials.find_one({"_id": ObjectId(rate["material_id"])})
        rate["material_name"] = material["name"] if material else "Unknown"
        rate["material_unit"] = material["unit"] if material else "unit"
        
        result.append(VendorMaterialRateResponse(**rate))
    return result

@api_router.post("/vendor-material-rates", response_model=VendorMaterialRateResponse)
async def create_vendor_material_rate(
    rate: VendorMaterialRateCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new vendor material rate (Admin/PM only)"""
    current_user = await get_current_user(credentials)
    
    # Only admin, PM can create rates
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and project managers can create vendor material rates")
    rate_dict = rate.dict()
    rate_dict["created_by"] = str(current_user["_id"])
    rate_dict["created_at"] = datetime.utcnow()
    rate_dict["updated_at"] = datetime.utcnow()
    
    result = await db.vendor_material_rates.insert_one(rate_dict)
    rate_dict["_id"] = result.inserted_id
    rate_dict = serialize_doc(rate_dict)
    
    vendor = await db.vendors.find_one({"_id": ObjectId(rate_dict["vendor_id"])})
    rate_dict["vendor_name"] = vendor["business_name"] if vendor else "Unknown"
    
    material = await db.materials.find_one({"_id": ObjectId(rate_dict["material_id"])})
    rate_dict["material_name"] = material["name"] if material else "Unknown"
    rate_dict["material_unit"] = material["unit"] if material else "unit"
    
    return VendorMaterialRateResponse(**rate_dict)

@api_router.put("/vendor-material-rates/{rate_id}", response_model=VendorMaterialRateResponse)
async def update_vendor_material_rate(
    rate_id: str,
    rate: VendorMaterialRateUpdate,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.PROJECT_MANAGER]))
):
    """Update a vendor material rate (Admin/PM only)"""
    update_data = {k: v for k, v in rate.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.vendor_material_rates.update_one(
        {"_id": ObjectId(rate_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Rate not found")
    
    updated_rate = await db.vendor_material_rates.find_one({"_id": ObjectId(rate_id)})
    updated_rate = serialize_doc(updated_rate)
    
    vendor = await db.vendors.find_one({"_id": ObjectId(updated_rate["vendor_id"])})
    updated_rate["vendor_name"] = vendor["business_name"] if vendor else "Unknown"
    
    material = await db.materials.find_one({"_id": ObjectId(updated_rate["material_id"])})
    updated_rate["material_name"] = material["name"] if material else "Unknown"
    updated_rate["material_unit"] = material["unit"] if material else "unit"
    
    return VendorMaterialRateResponse(**updated_rate)

# ============= Site Inventory Routes =============

@api_router.get("/site-inventory", response_model=List[SiteInventoryResponse])
async def get_site_inventory(
    current_user: dict = Depends(get_current_user),
    project_id: Optional[str] = None,
    material_id: Optional[str] = None
):
    """Get site inventory"""
    query = {}
    if project_id:
        query["project_id"] = project_id
    if material_id:
        query["material_id"] = material_id
    
    inventory = await db.site_inventory.find(query).to_list(length=1000)
    result = []
    for item in inventory:
        item = serialize_doc(item)
        
        project = await db.projects.find_one({"_id": ObjectId(item["project_id"])})
        item["project_name"] = project["name"] if project else "Unknown"
        
        material = await db.materials.find_one({"_id": ObjectId(item["material_id"])})
        item["material_name"] = material["name"] if material else "Unknown"
        item["material_unit"] = material["unit"] if material else "unit"
        item["material_category"] = material["category"] if material else "misc"
        item["minimum_stock"] = material.get("minimum_stock", 0) if material else 0
        
        result.append(SiteInventoryResponse(**item))
    return result

@api_router.post("/site-inventory", response_model=SiteInventoryResponse)
async def create_site_inventory(
    inventory: SiteInventoryCreate,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.PROJECT_MANAGER]))
):
    """Create or update site inventory (Admin/PM only)"""
    # Check if inventory already exists for this project-material combination
    existing = await db.site_inventory.find_one({
        "project_id": inventory.project_id,
        "material_id": inventory.material_id
    })
    
    if existing:
        # Update existing inventory
        await db.site_inventory.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "current_stock": inventory.current_stock,
                "last_updated": inventory.last_updated
            }}
        )
        inventory_dict = await db.site_inventory.find_one({"_id": existing["_id"]})
    else:
        # Create new inventory
        inventory_dict = inventory.dict()
        result = await db.site_inventory.insert_one(inventory_dict)
        inventory_dict["_id"] = result.inserted_id
    
    inventory_dict = serialize_doc(inventory_dict)
    
    project = await db.projects.find_one({"_id": ObjectId(inventory_dict["project_id"])})
    inventory_dict["project_name"] = project["name"] if project else "Unknown"
    
    material = await db.materials.find_one({"_id": ObjectId(inventory_dict["material_id"])})
    inventory_dict["material_name"] = material["name"] if material else "Unknown"
    inventory_dict["material_unit"] = material["unit"] if material else "unit"
    inventory_dict["material_category"] = material["category"] if material else "misc"
    inventory_dict["minimum_stock"] = material.get("minimum_stock", 0) if material else 0
    
    return SiteInventoryResponse(**inventory_dict)

@api_router.put("/site-inventory/{inventory_id}", response_model=SiteInventoryResponse)
async def update_site_inventory(
    inventory_id: str,
    inventory: SiteInventoryUpdate,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.ENGINEER]))
):
    """Update site inventory"""
    update_data = {k: v for k, v in inventory.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.site_inventory.update_one(
        {"_id": ObjectId(inventory_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Inventory not found")
    
    updated_inventory = await db.site_inventory.find_one({"_id": ObjectId(inventory_id)})
    updated_inventory = serialize_doc(updated_inventory)
    
    project = await db.projects.find_one({"_id": ObjectId(updated_inventory["project_id"])})
    updated_inventory["project_name"] = project["name"] if project else "Unknown"
    
    material = await db.materials.find_one({"_id": ObjectId(updated_inventory["material_id"])})
    updated_inventory["material_name"] = material["name"] if material else "Unknown"
    updated_inventory["material_unit"] = material["unit"] if material else "unit"
    updated_inventory["material_category"] = material["category"] if material else "misc"
    updated_inventory["minimum_stock"] = material.get("minimum_stock", 0) if material else 0
    
    return SiteInventoryResponse(**updated_inventory)

# ============= Material Requirement Routes =============

@api_router.get("/material-requirements", response_model=List[MaterialRequirementResponse])
async def get_material_requirements(
    current_user: dict = Depends(get_current_user),
    project_id: Optional[str] = None,
    is_fulfilled: Optional[bool] = None
):
    """Get material requirements"""
    query = {}
    if project_id:
        query["project_id"] = project_id
    if is_fulfilled is not None:
        query["is_fulfilled"] = is_fulfilled
    
    requirements = await db.material_requirements.find(query).to_list(length=1000)
    result = []
    for req in requirements:
        req = serialize_doc(req)
        
        project = await db.projects.find_one({"_id": ObjectId(req["project_id"])})
        req["project_name"] = project["name"] if project else "Unknown"
        
        material = await db.materials.find_one({"_id": ObjectId(req["material_id"])})
        req["material_name"] = material["name"] if material else "Unknown"
        req["material_unit"] = material["unit"] if material else "unit"
        req["material_category"] = material["category"] if material else "misc"
        
        creator = await db.users.find_one({"_id": ObjectId(req["created_by"])})
        req["created_by_name"] = creator["full_name"] if creator else "Unknown"
        
        result.append(MaterialRequirementResponse(**req))
    return result

@api_router.post("/material-requirements", response_model=MaterialRequirementResponse)
async def create_material_requirement(
    requirement: MaterialRequirementCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new material requirement"""
    requirement_dict = requirement.dict()
    requirement_dict["created_by"] = str(current_user["_id"])
    requirement_dict["created_at"] = datetime.utcnow()
    requirement_dict["updated_at"] = datetime.utcnow()
    
    result = await db.material_requirements.insert_one(requirement_dict)
    requirement_dict["_id"] = result.inserted_id
    requirement_dict = serialize_doc(requirement_dict)
    
    project = await db.projects.find_one({"_id": ObjectId(requirement_dict["project_id"])})
    requirement_dict["project_name"] = project["name"] if project else "Unknown"
    
    material = await db.materials.find_one({"_id": ObjectId(requirement_dict["material_id"])})
    requirement_dict["material_name"] = material["name"] if material else "Unknown"
    requirement_dict["material_unit"] = material["unit"] if material else "unit"
    requirement_dict["material_category"] = material["category"] if material else "misc"
    
    requirement_dict["created_by_name"] = current_user["full_name"]
    
    return MaterialRequirementResponse(**requirement_dict)

@api_router.put("/material-requirements/{requirement_id}", response_model=MaterialRequirementResponse)
async def update_material_requirement(
    requirement_id: str,
    requirement: MaterialRequirementUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a material requirement"""
    update_data = {k: v for k, v in requirement.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.material_requirements.update_one(
        {"_id": ObjectId(requirement_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Requirement not found")
    
    updated_req = await db.material_requirements.find_one({"_id": ObjectId(requirement_id)})
    updated_req = serialize_doc(updated_req)
    
    project = await db.projects.find_one({"_id": ObjectId(updated_req["project_id"])})
    updated_req["project_name"] = project["name"] if project else "Unknown"
    
    material = await db.materials.find_one({"_id": ObjectId(updated_req["material_id"])})
    updated_req["material_name"] = material["name"] if material else "Unknown"
    updated_req["material_unit"] = material["unit"] if material else "unit"
    updated_req["material_category"] = material["category"] if material else "misc"
    
    creator = await db.users.find_one({"_id": ObjectId(updated_req["created_by"])})
    updated_req["created_by_name"] = creator["full_name"] if creator else "Unknown"
    
    return MaterialRequirementResponse(**updated_req)

# ============= Purchase Order Routes =============

@api_router.get("/purchase-orders", response_model=List[PurchaseOrderResponse])
async def get_purchase_orders(
    current_user: dict = Depends(get_current_user),
    project_id: Optional[str] = None,
    vendor_id: Optional[str] = None,
    status: Optional[PurchaseOrderStatus] = None
):
    """Get purchase orders"""
    query = {}
    if project_id:
        query["project_id"] = project_id
    if vendor_id:
        query["vendor_id"] = vendor_id
    if status:
        query["status"] = status
    
    orders = await db.purchase_orders.find(query).to_list(length=1000)
    result = []
    for order in orders:
        order = serialize_doc(order)
        
        vendor = await db.vendors.find_one({"_id": ObjectId(order["vendor_id"])})
        order["vendor_name"] = vendor["business_name"] if vendor else "Unknown"
        
        project = await db.projects.find_one({"_id": ObjectId(order["project_id"])})
        order["project_name"] = project["name"] if project else "Unknown"
        
        creator = await db.users.find_one({"_id": ObjectId(order["created_by"])})
        order["created_by_name"] = creator["full_name"] if creator else "Unknown"
        
        # Get PO items
        items = await db.purchase_order_items.find({"purchase_order_id": order["id"]}).to_list(length=100)
        order["items"] = []
        for item in items:
            item = serialize_doc(item)
            material = await db.materials.find_one({"_id": ObjectId(item["material_id"])})
            item["material_name"] = material["name"] if material else "Unknown"
            item["material_unit"] = material["unit"] if material else "unit"
            order["items"].append(item)
        
        result.append(PurchaseOrderResponse(**order))
    return result

@api_router.post("/purchase-orders", response_model=PurchaseOrderResponse)
async def create_purchase_order(
    order: PurchaseOrderCreate,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.PROJECT_MANAGER]))
):
    """Create a new purchase order (Admin/PM only)"""
    order_dict = order.dict()
    items = order_dict.pop("items")  # Remove items from main dict
    
    order_dict["created_by"] = str(current_user["_id"])
    order_dict["created_at"] = datetime.utcnow()
    order_dict["updated_at"] = datetime.utcnow()
    
    result = await db.purchase_orders.insert_one(order_dict)
    order_dict["_id"] = result.inserted_id
    order_id = str(result.inserted_id)
    
    # Create PO items
    for item in items:
        item["purchase_order_id"] = order_id
        item["created_at"] = datetime.utcnow()
        await db.purchase_order_items.insert_one(item)
    
    order_dict = serialize_doc(order_dict)
    
    vendor = await db.vendors.find_one({"_id": ObjectId(order_dict["vendor_id"])})
    order_dict["vendor_name"] = vendor["business_name"] if vendor else "Unknown"
    
    project = await db.projects.find_one({"_id": ObjectId(order_dict["project_id"])})
    order_dict["project_name"] = project["name"] if project else "Unknown"
    
    order_dict["created_by_name"] = current_user["full_name"]
    
    # Get created items
    created_items = await db.purchase_order_items.find({"purchase_order_id": order_id}).to_list(length=100)
    order_dict["items"] = []
    for item in created_items:
        item = serialize_doc(item)
        material = await db.materials.find_one({"_id": ObjectId(item["material_id"])})
        item["material_name"] = material["name"] if material else "Unknown"
        item["material_unit"] = material["unit"] if material else "unit"
        order_dict["items"].append(item)
    
    return PurchaseOrderResponse(**order_dict)

@api_router.put("/purchase-orders/{order_id}", response_model=PurchaseOrderResponse)
async def update_purchase_order(
    order_id: str,
    order: PurchaseOrderUpdate,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.PROJECT_MANAGER]))
):
    """Update a purchase order (Admin/PM only)"""
    update_data = {k: v for k, v in order.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.purchase_orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    updated_order = await db.purchase_orders.find_one({"_id": ObjectId(order_id)})
    updated_order = serialize_doc(updated_order)
    
    vendor = await db.vendors.find_one({"_id": ObjectId(updated_order["vendor_id"])})
    updated_order["vendor_name"] = vendor["business_name"] if vendor else "Unknown"
    
    project = await db.projects.find_one({"_id": ObjectId(updated_order["project_id"])})
    updated_order["project_name"] = project["name"] if project else "Unknown"
    
    creator = await db.users.find_one({"_id": ObjectId(updated_order["created_by"])})
    updated_order["created_by_name"] = creator["full_name"] if creator else "Unknown"
    
    # Get PO items
    items = await db.purchase_order_items.find({"purchase_order_id": updated_order["id"]}).to_list(length=100)
    updated_order["items"] = []
    for item in items:
        item = serialize_doc(item)
        material = await db.materials.find_one({"_id": ObjectId(item["material_id"])})
        item["material_name"] = material["name"] if material else "Unknown"
        item["material_unit"] = material["unit"] if material else "unit"
        updated_order["items"].append(item)
    
    return PurchaseOrderResponse(**updated_order)

# ============= Material Transaction Routes =============

@api_router.get("/material-transactions", response_model=List[MaterialTransactionResponse])
async def get_material_transactions(
    current_user: dict = Depends(get_current_user),
    project_id: Optional[str] = None,
    material_id: Optional[str] = None,
    transaction_type: Optional[TransactionType] = None
):
    """Get material transactions"""
    query = {}
    if project_id:
        query["project_id"] = project_id
    if material_id:
        query["material_id"] = material_id
    if transaction_type:
        query["transaction_type"] = transaction_type
    
    transactions = await db.material_transactions.find(query).sort("transaction_date", -1).to_list(length=1000)
    result = []
    for txn in transactions:
        txn = serialize_doc(txn)
        
        project = await db.projects.find_one({"_id": ObjectId(txn["project_id"])})
        txn["project_name"] = project["name"] if project else "Unknown"
        
        material = await db.materials.find_one({"_id": ObjectId(txn["material_id"])})
        txn["material_name"] = material["name"] if material else "Unknown"
        txn["material_unit"] = material["unit"] if material else "unit"
        
        creator = await db.users.find_one({"_id": ObjectId(txn["created_by"])})
        txn["created_by_name"] = creator["full_name"] if creator else "Unknown"
        
        result.append(MaterialTransactionResponse(**txn))
    return result

@api_router.post("/material-transactions", response_model=MaterialTransactionResponse)
async def create_material_transaction(
    transaction: MaterialTransactionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new material transaction and update inventory"""
    transaction_dict = transaction.dict()
    transaction_dict["created_by"] = str(current_user["_id"])
    transaction_dict["created_at"] = datetime.utcnow()
    
    # Create transaction
    result = await db.material_transactions.insert_one(transaction_dict)
    transaction_dict["_id"] = result.inserted_id
    
    # Update site inventory based on transaction type
    existing_inventory = await db.site_inventory.find_one({
        "project_id": transaction.project_id,
        "material_id": transaction.material_id
    })
    
    if transaction.transaction_type in [TransactionType.RECEIPT, TransactionType.TRANSFER_IN]:
        # Add to inventory
        if existing_inventory:
            new_stock = existing_inventory["current_stock"] + transaction.quantity
            await db.site_inventory.update_one(
                {"_id": existing_inventory["_id"]},
                {"$set": {"current_stock": new_stock, "last_updated": transaction.transaction_date}}
            )


# ============= Task Material Management Routes =============

@api_router.get("/material-templates")
async def get_material_templates(
    work_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get material consumption templates"""
    query = {"is_active": True}
    if work_type:
        query["work_type"] = work_type
    
    templates = await db.material_consumption_templates.find(query).to_list(length=1000)
    return [serialize_doc(t) for t in templates]

@api_router.post("/tasks/{task_id}/estimate-materials")
async def estimate_task_materials(
    task_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Auto-calculate material requirements based on task work type and measurements"""
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if not task.get("work_type"):
        raise HTTPException(status_code=400, detail="Task must have a work_type set")
    
    # Get templates for this work type
    templates = await db.material_consumption_templates.find({
        "work_type": task["work_type"],
        "is_active": True
    }).to_list(length=100)
    
    if not templates:
        return {"message": "No templates found for this work type", "estimates": []}
    
    # Calculate work quantity based on measurement type
    work_quantity = 0
    measurement_type = task.get("measurement_type")
    
    if measurement_type == "area":
        work_quantity = task.get("work_area", 0)
    elif measurement_type == "volume":
        # Calculate L x B x H
        l = task.get("work_length", 0)
        b = task.get("work_breadth", 0)
        h = task.get("work_height", 0)
        work_quantity = l * b * h
    elif measurement_type == "length":
        work_quantity = task.get("work_length", 0)
    elif measurement_type == "count":
        work_quantity = task.get("work_count", 0)
    elif measurement_type == "weight":
        work_quantity = task.get("work_count", 0)  # Weight in kg
    
    if work_quantity == 0:
        raise HTTPException(status_code=400, detail="Task has no work measurements set")
    
    # Calculate material requirements
    estimates = []
    for template in templates:
        # Get rate per base unit (usually per 100 for area, per 1 for others)
        rate = template["consumption_rate"]
        template_measurement = template["measurement_type"]
        
        # Adjust for base quantities (templates are usually per 100 sqft, etc.)
        if template_measurement == "area":
            estimated_qty = (work_quantity / 100) * rate
        elif template_measurement == "volume":
            # Template is per cubic meter (35.3 cft)
            work_qty_cum = work_quantity / 35.3
            estimated_qty = work_qty_cum * rate
        elif template_measurement == "weight":
            # Template is per 1000 kg
            estimated_qty = (work_quantity / 1000) * rate
        else:
            estimated_qty = work_quantity * rate
        
        # Find matching material in inventory
        material = await db.materials.find_one({
            "category": template["material_category"],
            "is_active": True
        })
        
        estimate = {
            "material_category": template["material_category"],
            "material_name": template["material_name"],
            "estimated_quantity": round(estimated_qty, 2),
            "unit": template["unit"],
            "template_description": template["description"],
            "material_id": str(material["_id"]) if material else None
        }
        estimates.append(estimate)
    
    return {
        "task_id": task_id,
        "work_type": task["work_type"],
        "work_quantity": work_quantity,
        "measurement_type": measurement_type,
        "estimates": estimates
    }

@api_router.post("/tasks/{task_id}/materials")
async def link_materials_to_task(
    task_id: str,
    materials: List[dict],
    current_user: dict = Depends(get_current_user)
):
    """Link materials to a task with estimated quantities"""
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Clear existing material estimates for this task
    await db.task_material_estimates.delete_many({"task_id": task_id})
    
    # Create new estimates
    created_estimates = []
    for material_data in materials:
        estimate_doc = {
            "task_id": task_id,
            "material_id": material_data["material_id"],
            "estimated_quantity": material_data["estimated_quantity"],
            "actual_quantity": 0,
            "unit": material_data["unit"],
            "notes": material_data.get("notes", ""),
            "created_at": datetime.utcnow()
        }
        result = await db.task_material_estimates.insert_one(estimate_doc)
        estimate_doc["_id"] = result.inserted_id
        
        # Get material details
        material = await db.materials.find_one({"_id": ObjectId(material_data["material_id"])})
        estimate_doc["material_name"] = material["name"] if material else "Unknown"
        estimate_doc["material_category"] = material["category"] if material else "unknown"
        
        created_estimates.append(serialize_doc(estimate_doc))
    
    return {"message": f"Linked {len(created_estimates)} materials to task", "estimates": created_estimates}

@api_router.get("/tasks/{task_id}/materials")
async def get_task_materials(
    task_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get materials linked to a task"""
    estimates = await db.task_material_estimates.find({"task_id": task_id}).to_list(length=100)
    
    result = []
    for estimate in estimates:
        estimate = serialize_doc(estimate)
        material = await db.materials.find_one({"_id": ObjectId(estimate["material_id"])})
        estimate["material_name"] = material["name"] if material else "Unknown"
        estimate["material_category"] = material["category"] if material else "unknown"
        result.append(estimate)
    
    return result

@api_router.post("/tasks/{task_id}/start-work")
async def start_task_work(
    task_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark task as started and reserve materials from inventory"""
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Update task with actual start date
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": {
            "actual_start_date": datetime.utcnow(),
            "status": "in_progress"
        }}
    )
    
    # Get material estimates
    estimates = await db.task_material_estimates.find({"task_id": task_id}).to_list(length=100)
    
    # Check inventory availability
    project_id = task["project_id"]
    insuffic ient_materials = []
    
    for estimate in estimates:
        inventory = await db.site_inventory.find_one({
            "project_id": project_id,
            "material_id": estimate["material_id"]
        })
        
        if not inventory or inventory["current_stock"] < estimate["estimated_quantity"]:
            material = await db.materials.find_one({"_id": ObjectId(estimate["material_id"])})
            insufficient_materials.append({
                "material_name": material["name"] if material else "Unknown",
                "required": estimate["estimated_quantity"],
                "available": inventory["current_stock"] if inventory else 0
            })
    
    if insufficient_materials:
        return {
            "status": "warning",
            "message": "Insufficient materials in inventory",
            "task_started": True,
            "insufficient_materials": insufficient_materials
        }
    
    return {
        "status": "success",
        "message": "Task started successfully",
        "task_started": True
    }

@api_router.post("/tasks/{task_id}/consume-materials")
async def record_material_consumption(
    task_id: str,
    consumption_data: List[dict],
    current_user: dict = Depends(get_current_user)
):
    """Record actual material consumption and update inventory"""
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    project_id = task["project_id"]
    transactions_created = []
    
    for consumption in consumption_data:
        material_id = consumption["material_id"]
        quantity = consumption["quantity"]
        
        # Update actual quantity in estimates
        await db.task_material_estimates.update_one(
            {"task_id": task_id, "material_id": material_id},
            {"$inc": {"actual_quantity": quantity}}
        )
        
        # Create material transaction
        transaction = {
            "project_id": project_id,
            "material_id": material_id,
            "transaction_type": "consumption",
            "quantity": quantity,
            "transaction_date": datetime.utcnow(),
            "reference_type": "task",
            "reference_id": task_id,
            "notes": f"Consumed for task: {task.get('title', 'Unknown')}",
            "created_by": str(current_user["_id"]),
            "created_at": datetime.utcnow()
        }
        result = await db.material_transactions.insert_one(transaction)
        
        # Update inventory
        inventory = await db.site_inventory.find_one({
            "project_id": project_id,
            "material_id": material_id
        })
        
        if inventory:
            new_stock = max(0, inventory["current_stock"] - quantity)
            await db.site_inventory.update_one(
                {"_id": inventory["_id"]},
                {"$set": {"current_stock": new_stock, "last_updated": datetime.utcnow()}}
            )
        
        transactions_created.append(str(result.inserted_id))
    
    return {
        "message": f"Recorded consumption of {len(consumption_data)} materials",
        "transactions": transactions_created
    }

@api_router.post("/tasks/{task_id}/complete-work")
async def complete_task_work(
    task_id: str,
    progress_percentage: float = 100,
    current_user: dict = Depends(get_current_user)
):
    """Mark task as completed with actual end date"""
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": {
            "actual_end_date": datetime.utcnow(),
            "progress_percentage": progress_percentage,
            "status": "completed" if progress_percentage >= 100 else "in_progress"
        }}
    )
    
    # Get material usage summary
    estimates = await db.task_material_estimates.find({"task_id": task_id}).to_list(length=100)
    
    summary = []
    for estimate in estimates:
        material = await db.materials.find_one({"_id": ObjectId(estimate["material_id"])})
        variance = estimate["actual_quantity"] - estimate["estimated_quantity"]
        variance_pct = (variance / estimate["estimated_quantity"] * 100) if estimate["estimated_quantity"] > 0 else 0
        
        summary.append({
            "material_name": material["name"] if material else "Unknown",
            "estimated": estimate["estimated_quantity"],
            "actual": estimate["actual_quantity"],
            "variance": variance,
            "variance_percentage": round(variance_pct, 2),
            "unit": estimate["unit"]
        })
    
    return {
        "message": "Task completed",
        "progress": progress_percentage,
        "material_summary": summary
    }

@api_router.get("/projects/{project_id}/gantt-data")
async def get_project_gantt_data(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all tasks with timeline data for Gantt chart"""
    tasks = await db.tasks.find({"project_id": project_id}).to_list(length=1000)
    
    gantt_data = []
    for task in tasks:
        task = serialize_doc(task)
        
        # Get assigned user names
        assigned_names = []
        if task.get("assigned_to"):
            for user_id in task["assigned_to"]:
                user = await db.users.find_one({"_id": ObjectId(user_id)})
                if user:
                    assigned_names.append(user["full_name"])
        
        # Get dependency task titles
        dep_titles = []
        if task.get("dependencies"):
            for dep_id in task["dependencies"]:
                dep_task = await db.tasks.find_one({"_id": ObjectId(dep_id)})
                if dep_task:
                    dep_titles.append(dep_task["title"])
        
        gantt_item = {
            "id": task["id"],
            "title": task["title"],
            "planned_start": task.get("planned_start_date"),
            "planned_end": task.get("planned_end_date"),
            "actual_start": task.get("actual_start_date"),
            "actual_end": task.get("actual_end_date"),
            "progress": task.get("progress_percentage", 0),
            "status": task.get("status", "todo"),
            "assigned_to": assigned_names,
            "dependencies": dep_titles,
            "work_type": task.get("work_type"),
            "priority": task.get("priority", "medium")
        }
        gantt_data.append(gantt_item)
    
    return {
        "project_id": project_id,
        "tasks": gantt_data
    }

        else:
            # Create new inventory entry
            await db.site_inventory.insert_one({
                "project_id": transaction.project_id,
                "material_id": transaction.material_id,
                "current_stock": transaction.quantity,
                "last_updated": transaction.transaction_date
            })
    elif transaction.transaction_type in [TransactionType.CONSUMPTION, TransactionType.TRANSFER_OUT, TransactionType.RETURN]:
        # Subtract from inventory
        if existing_inventory:
            new_stock = max(0, existing_inventory["current_stock"] - transaction.quantity)
            await db.site_inventory.update_one(
                {"_id": existing_inventory["_id"]},
                {"$set": {"current_stock": new_stock, "last_updated": transaction.transaction_date}}
            )
    elif transaction.transaction_type == TransactionType.ADJUSTMENT:
        # Direct adjustment
        if existing_inventory:
            await db.site_inventory.update_one(
                {"_id": existing_inventory["_id"]},
                {"$set": {"current_stock": transaction.quantity, "last_updated": transaction.transaction_date}}
            )
        else:
            await db.site_inventory.insert_one({
                "project_id": transaction.project_id,
                "material_id": transaction.material_id,
                "current_stock": transaction.quantity,
                "last_updated": transaction.transaction_date
            })
    
    transaction_dict = serialize_doc(transaction_dict)
    
    project = await db.projects.find_one({"_id": ObjectId(transaction_dict["project_id"])})
    transaction_dict["project_name"] = project["name"] if project else "Unknown"
    
    material = await db.materials.find_one({"_id": ObjectId(transaction_dict["material_id"])})
    transaction_dict["material_name"] = material["name"] if material else "Unknown"
    transaction_dict["material_unit"] = material["unit"] if material else "unit"
    
    transaction_dict["created_by_name"] = current_user["full_name"]
    
    return MaterialTransactionResponse(**transaction_dict)

# ============= Vendor Payment Dues Route =============

@api_router.get("/vendors/{vendor_id}/payment-dues")
async def get_vendor_payment_dues(
    vendor_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get total payment dues for a vendor"""
    # Get all purchase orders for this vendor
    orders = await db.purchase_orders.find({
        "vendor_id": vendor_id,
        "status": {"$in": ["pending", "approved", "ordered", "partially_received", "received"]}
    }).to_list(length=1000)
    
    total_dues = 0
    for order in orders:
        # Assuming orders are unpaid unless marked otherwise
        # You can add a 'paid' field to track payment status
        total_dues += order.get("final_amount", 0)
    
    return {
        "vendor_id": vendor_id,
        "total_dues": total_dues,
        "order_count": len(orders)
    }

@api_router.get("/vendors/all/payment-dues")
async def get_all_vendors_payment_dues(
    current_user: dict = Depends(get_current_user)
):
    """Get payment dues for all vendors"""
    vendors = await db.vendors.find().to_list(length=1000)
    vendor_dues = {}
    
    for vendor in vendors:
        vendor_id = str(vendor["_id"])
        orders = await db.purchase_orders.find({
            "vendor_id": vendor_id,
            "status": {"$in": ["pending", "approved", "ordered", "partially_received", "received"]}
        }).to_list(length=1000)
        
        total_dues = sum(order.get("final_amount", 0) for order in orders)
        vendor_dues[vendor_id] = {
            "total_dues": total_dues,
            "order_count": len(orders)
        }
    
    return vendor_dues

# ============= Material Reports Routes =============

@api_router.get("/material-reports/spending")
async def get_material_spending_report(
    current_user: dict = Depends(get_current_user),
    project_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    period: str = "weekly"  # weekly or monthly
):
    """Get material spending reports"""
    # Parse dates
    if period == "weekly":
        end = datetime.utcnow() if not end_date else datetime.fromisoformat(end_date)
        start = end - timedelta(days=7) if not start_date else datetime.fromisoformat(start_date)
    else:  # monthly
        end = datetime.utcnow() if not end_date else datetime.fromisoformat(end_date)
        start = end - timedelta(days=30) if not start_date else datetime.fromisoformat(start_date)
    
    # Build query
    query = {
        "status": {"$in": ["received", "partially_received"]},
        "order_date": {"$gte": start, "$lte": end}
    }
    if project_id:
        query["project_id"] = project_id
    
    # Get all purchase orders in date range
    orders = await db.purchase_orders.find(query).to_list(length=1000)
    
    # Calculate spending by category, site, and vendor
    category_spending = {}
    site_spending = {}
    vendor_spending = {}
    total_spending = 0
    
    for order in orders:
        total_spending += order.get("final_amount", 0)
        
        # Site spending
        project = await db.projects.find_one({"_id": ObjectId(order["project_id"])})
        site_name = project["name"] if project else "Unknown"
        site_spending[site_name] = site_spending.get(site_name, 0) + order.get("final_amount", 0)
        
        # Vendor spending
        vendor = await db.vendors.find_one({"_id": ObjectId(order["vendor_id"])})
        vendor_name = vendor["business_name"] if vendor else "Unknown"
        vendor_spending[vendor_name] = vendor_spending.get(vendor_name, 0) + order.get("final_amount", 0)
        
        # Category spending
        items = await db.purchase_order_items.find({"purchase_order_id": str(order["_id"])}).to_list(length=100)
        for item in items:
            material = await db.materials.find_one({"_id": ObjectId(item["material_id"])})
            if material:
                category = material.get("category", "misc")
                category_spending[category] = category_spending.get(category, 0) + item.get("amount", 0)
    
    return {
        "period": period,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "total_spending": total_spending,
        "category_spending": category_spending,
        "site_spending": site_spending,
        "vendor_spending": vendor_spending
    }

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
