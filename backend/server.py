from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File, UploadFile, Header
from fastapi.security import HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
from pathlib import Path
import socketio
import uuid

# Import models and auth
from models import (
    UserCreate, UserLogin, UserResponse, UserUpdate, UserApprovalRequest, UserCreateByAdmin, Token, OTPRequest, OTPVerify,
    TeamCreate, TeamUpdate, TeamResponse,
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectTeamMember, ProjectTeamUpdate,
    TaskCreate, TaskUpdate, TaskResponse, TaskStatus,
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
    UserProfileUpdate,
    PaymentCreate, PaymentUpdate, PaymentResponse,
    ExpenseCreate, ExpenseUpdate, ExpenseResponse,
    NotificationCreate, NotificationResponse,
    UserRoleUpdate, UserStatusUpdate, UserManagementResponse,
    WorkerCreate, WorkerUpdate, WorkerResponse,
    LaborAttendanceCreate, LaborAttendanceUpdate, LaborAttendanceResponse,
    SiteTransferCreate, SiteTransferResponse,
    UserRole, ApprovalStatus,
    RoleCreate, RoleUpdate, RoleResponse,
    PermissionCreate, PermissionUpdate, PermissionResponse, ModuleName,
    SystemSettingCreate, SystemSettingUpdate, SystemSettingResponse,
    MilestoneCreate, MilestoneUpdate, MilestoneResponse, MilestoneStatus,
    DocumentCreate, DocumentUpdate, DocumentResponse, DocumentType,
    BudgetCreate, BudgetUpdate, BudgetResponse, BudgetCategory,
    InvoiceCreate, InvoiceUpdate, InvoiceResponse, InvoiceStatus, InvoiceItemBase,
    PaymentMethod,
    ProjectContact, ProjectContactUpdate, ProjectRole, ContactType,
    GanttShareCreate, GanttShareResponse, GanttShareToken, GanttSharePermission,
    ContactAudit,
    # CRM Models
    LeadStatus, LeadPriority, LeadSource, LeadActivityType, CallOutcome, WhatsAppStatus, Currency,
    LeadCategoryCreate, LeadCategoryUpdate, LeadCategoryResponse,
    LeadCreate, LeadUpdate, LeadResponse,
    LeadActivityCreate, LeadActivityResponse,
    LeadFieldAuditResponse,
    LeadBulkUpdate, LeadBulkAssign, LeadImportItem, LeadImportResponse,
    CRMConfigUpdate, CRMConfigResponse,
    # Custom Fields & Funnels
    CustomFieldType, CustomFieldCreate, CustomFieldUpdate, CustomFieldResponse,
    FunnelCreate, FunnelUpdate, FunnelResponse, FunnelAnalytics, FunnelStageStats,
    CRMPermission, RolePermissions, PermissionMatrixResponse,
    LeadExportRequest, LeadImportSource, LeadImportRequest, MetaLeadImportConfig,
    SystemLabel, SystemLabelUpdate, SystemLabelsResponse,
    CRMDashboardStats,
    # Phase 4: Move Lead to Project
    BankTransactionCreate, BankTransactionResponse,
    MoveLeadToProjectRequest, MoveLeadToProjectResponse,
    AuditActionType, AuditLogCreate, AuditLogResponse, AuditLogFilter,
    # Chat/Messaging Models
    ConversationCreate, ConversationResponse, MessageCreate, MessageResponse, MessageAttachment
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
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        password_hash = user.get("password_hash", "")
        if not verify_password(credentials.password, password_hash):
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
    
    # Populate project manager name, phone, task counts, and team members
    result = []
    for project in projects:
        project_dict = serialize_doc(project)
        
        # Get project manager info
        if project_dict.get("project_manager_id"):
            pm = await get_user_by_id(project_dict["project_manager_id"])
            if pm:
                project_dict["project_manager_name"] = pm["full_name"]
                project_dict["manager_phone"] = pm.get("phone")
        
        # Get team members info
        team_members = []
        team_member_ids = project_dict.get("team_member_ids", [])
        for member_id in team_member_ids:
            member = await get_user_by_id(member_id)
            if member:
                # Get role name if role_id exists
                role_name = None
                if member.get("role_id"):
                    try:
                        # role_id can be either string or ObjectId
                        role_id = member["role_id"]
                        if isinstance(role_id, str):
                            role = await db.roles.find_one({"_id": ObjectId(role_id)})
                        else:
                            role = await db.roles.find_one({"_id": role_id})
                        role_name = role["name"] if role else None
                    except Exception as e:
                        print(f"Error getting role: {e}")
                        role_name = None
                elif member.get("role"):
                    role_name = member["role"]
                
                team_members.append(ProjectTeamMember(
                    user_id=member.get("id", str(member.get("_id", ""))),
                    full_name=member.get("full_name", ""),
                    role_name=role_name,
                    phone=member.get("phone"),
                    email=member.get("email")
                ))
        project_dict["team_members"] = team_members
        
        # Get task counts for this project
        total_tasks = await db.tasks.count_documents({"project_id": project_dict["id"]})
        completed_tasks = await db.tasks.count_documents({
            "project_id": project_dict["id"],
            "status": TaskStatus.COMPLETED
        })
        project_dict["task_count"] = {
            "total": total_tasks,
            "completed": completed_tasks
        }
        
        # Remove gantt_share_tokens to avoid ObjectId serialization issues
        # This field will be populated separately via the gantt-share endpoints
        if "gantt_share_tokens" in project_dict:
            del project_dict["gantt_share_tokens"]
        
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
    
    # Get project manager info
    if project_dict.get("project_manager_id"):
        pm = await get_user_by_id(project_dict["project_manager_id"])
        if pm:
            project_dict["project_manager_name"] = pm["full_name"]
            project_dict["manager_phone"] = pm.get("phone")
    
    # Get task counts for this project
    total_tasks = await db.tasks.count_documents({"project_id": project_dict["id"]})
    completed_tasks = await db.tasks.count_documents({
        "project_id": project_dict["id"],
        "status": TaskStatus.COMPLETED
    })
    project_dict["task_count"] = {
        "total": total_tasks,
        "completed": completed_tasks
    }
    
    # Remove gantt_share_tokens to avoid ObjectId serialization issues
    # This field will be populated separately via the gantt-share endpoints
    if "gantt_share_tokens" in project_dict:
        del project_dict["gantt_share_tokens"]
    
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
    
    # Get project manager info
    if project_dict.get("project_manager_id"):
        pm = await get_user_by_id(project_dict["project_manager_id"])
        if pm:
            project_dict["project_manager_name"] = pm["full_name"]
            project_dict["manager_phone"] = pm.get("phone")
    
    # Get task counts for this project (initially 0)
    total_tasks = await db.tasks.count_documents({"project_id": project_dict["id"]})
    completed_tasks = await db.tasks.count_documents({
        "project_id": project_dict["id"],
        "status": TaskStatus.COMPLETED
    })
    project_dict["task_count"] = {
        "total": total_tasks,
        "completed": completed_tasks
    }
    
    return ProjectResponse(**project_dict)

def generate_client_portal_link(project_id: str, base_url: str = None) -> str:
    """Generate a client portal access link for a project"""
    if not base_url:
        base_url = "https://crmconstruct.preview.emergentagent.com"
    return f"{base_url}/client-portal/?projectId={project_id}"


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
    
    # Generate client portal link if status is being changed to active/confirmed
    if "status" in update_data and update_data["status"] in ["active", "confirmed", "in_progress"]:
        if not existing.get("client_portal_link"):
            client_portal_link = generate_client_portal_link(project_id)
            update_data["client_portal_link"] = client_portal_link
    
    await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": update_data}
    )
    
    updated_project = await db.projects.find_one({"_id": ObjectId(project_id)})
    project_dict = serialize_doc(updated_project)
    
    # Get project manager info
    if project_dict.get("project_manager_id"):
        pm = await get_user_by_id(project_dict["project_manager_id"])
        if pm:
            project_dict["project_manager_name"] = pm["full_name"]
            project_dict["manager_phone"] = pm.get("phone")
    
    # Get task counts for this project
    total_tasks = await db.tasks.count_documents({"project_id": project_dict["id"]})
    completed_tasks = await db.tasks.count_documents({
        "project_id": project_dict["id"],
        "status": TaskStatus.COMPLETED
    })
    project_dict["task_count"] = {
        "total": total_tasks,
        "completed": completed_tasks
    }
    
    return ProjectResponse(**project_dict)


@api_router.put("/projects/{project_id}/team", response_model=ProjectResponse)
async def update_project_team(
    project_id: str,
    team_update: ProjectTeamUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update project team members"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and project managers can manage team")
    
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Verify all team member IDs exist and are approved users
    for member_id in team_update.team_member_ids:
        member = await get_user_by_id(member_id)
        if not member:
            raise HTTPException(status_code=400, detail=f"User {member_id} not found")
        if member.get("approval_status") != "approved":
            raise HTTPException(status_code=400, detail=f"User {member['full_name']} is not approved")
    
    # Update team member IDs
    await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": {"team_member_ids": team_update.team_member_ids, "updated_at": datetime.utcnow()}}
    )
    
    updated_project = await db.projects.find_one({"_id": ObjectId(project_id)})
    project_dict = serialize_doc(updated_project)
    
    # Get project manager info
    if project_dict.get("project_manager_id"):
        pm = await get_user_by_id(project_dict["project_manager_id"])
        if pm:
            project_dict["project_manager_name"] = pm["full_name"]
            project_dict["manager_phone"] = pm.get("phone")
    
    # Get team members info
    team_members = []
    for member_id in project_dict.get("team_member_ids", []):
        member = await get_user_by_id(member_id)
        if member:
            role_name = None
            if member.get("role_id"):
                role = await db.roles.find_one({"_id": ObjectId(member["role_id"])})
                role_name = role["name"] if role else None
            elif member.get("role"):
                role_name = member["role"]
            
            team_members.append(ProjectTeamMember(
                user_id=member["id"],
                full_name=member["full_name"],
                role_name=role_name,
                phone=member.get("phone"),
                email=member.get("email")
            ))
    project_dict["team_members"] = team_members
    
    # Get task counts
    total_tasks = await db.tasks.count_documents({"project_id": project_dict["id"]})
    completed_tasks = await db.tasks.count_documents({
        "project_id": project_dict["id"],
        "status": TaskStatus.COMPLETED
    })
    project_dict["task_count"] = {
        "total": total_tasks,
        "completed": completed_tasks
    }
    
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

# ============= Project Contacts Routes =============

@api_router.get("/projects/{project_id}/contacts")
async def get_project_contacts(
    project_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all contacts for a project"""
    current_user = await get_current_user(credentials)
    
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    contacts = project.get("contacts", [])
    
    # Enrich with user details if internal contact
    enriched_contacts = []
    for contact in contacts:
        contact_dict = dict(contact)
        if contact.get("type") == "internal" and contact.get("user_id"):
            user = await get_user_by_id(contact["user_id"])
            if user:
                contact_dict["user_full_name"] = user.get("full_name")
                contact_dict["user_email"] = user.get("email")
        enriched_contacts.append(contact_dict)
    
    return enriched_contacts

@api_router.post("/projects/{project_id}/contacts")
async def add_project_contact(
    project_id: str,
    contact: ProjectContact,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Add a contact to a project"""
    current_user = await get_current_user(credentials)
    
    # Check permissions
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and project managers can add contacts")
    
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Validate email and phone formats
    import re
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    phone_pattern = r'^\+?[0-9]{10,15}$'
    
    if not re.match(email_pattern, contact.email):
        raise HTTPException(status_code=400, detail="Invalid email format")
    
    if not re.match(phone_pattern, contact.phone_mobile):
        raise HTTPException(status_code=400, detail="Invalid phone number format")
    
    # Add timestamps and audit info
    contact_dict = contact.dict()
    contact_dict["created_at"] = datetime.utcnow()
    contact_dict["updated_at"] = datetime.utcnow()
    contact_dict["created_by"] = str(current_user["_id"])
    contact_dict["updated_by"] = str(current_user["_id"])
    
    # If setting as primary, unset other primary contacts for this role
    if contact.is_primary:
        contacts = project.get("contacts", [])
        for c in contacts:
            if c.get("role") == contact.role:
                c["is_primary"] = False
    
    # Add contact to project
    await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {"$push": {"contacts": contact_dict}}
    )
    
    # Create audit trail
    audit_entry = {
        "project_id": project_id,
        "contact_snapshot": contact_dict,
        "action": "created",
        "changed_by": str(current_user["_id"]),
        "changed_at": datetime.utcnow(),
        "changes": None
    }
    await db.contact_audits.insert_one(audit_entry)
    
    return {"message": "Contact added successfully", "contact": contact_dict}

@api_router.put("/projects/{project_id}/contacts/{contact_index}")
async def update_project_contact(
    project_id: str,
    contact_index: int,
    contact_update: ProjectContactUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a specific contact in a project"""
    current_user = await get_current_user(credentials)
    
    # Check permissions
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and project managers can update contacts")
    
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    contacts = project.get("contacts", [])
    if contact_index < 0 or contact_index >= len(contacts):
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Store old contact for audit
    old_contact = contacts[contact_index].copy()
    
    # Update contact fields
    update_dict = contact_update.dict(exclude_unset=True)
    update_dict["updated_at"] = datetime.utcnow()
    update_dict["updated_by"] = str(current_user["_id"])
    
    # If setting as primary, unset other primary contacts for this role
    if update_dict.get("is_primary"):
        new_role = update_dict.get("role", contacts[contact_index].get("role"))
        for i, c in enumerate(contacts):
            if i != contact_index and c.get("role") == new_role:
                c["is_primary"] = False
    
    contacts[contact_index].update(update_dict)
    
    # Update in database
    await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": {"contacts": contacts}}
    )
    
    # Create audit trail
    changes = {k: {"old": old_contact.get(k), "new": v} for k, v in update_dict.items()}
    audit_entry = {
        "project_id": project_id,
        "contact_snapshot": contacts[contact_index],
        "action": "updated",
        "changed_by": str(current_user["_id"]),
        "changed_at": datetime.utcnow(),
        "changes": changes
    }
    await db.contact_audits.insert_one(audit_entry)
    
    return {"message": "Contact updated successfully", "contact": contacts[contact_index]}

@api_router.delete("/projects/{project_id}/contacts/{contact_index}")
async def delete_project_contact(
    project_id: str,
    contact_index: int,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a contact from a project"""
    current_user = await get_current_user(credentials)
    
    # Check permissions
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and project managers can delete contacts")
    
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    contacts = project.get("contacts", [])
    if contact_index < 0 or contact_index >= len(contacts):
        raise HTTPException(status_code=404, detail="Contact not found")
    
    deleted_contact = contacts.pop(contact_index)
    
    # Update in database
    await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": {"contacts": contacts}}
    )
    
    # Create audit trail
    audit_entry = {
        "project_id": project_id,
        "contact_snapshot": deleted_contact,
        "action": "deleted",
        "changed_by": str(current_user["_id"]),
        "changed_at": datetime.utcnow(),
        "changes": None
    }
    await db.contact_audits.insert_one(audit_entry)
    
    return {"message": "Contact deleted successfully"}

@api_router.post("/projects/{project_id}/contacts/validate")
async def validate_required_contacts(
    project_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Validate that all required contact roles are filled"""
    current_user = await get_current_user(credentials)
    
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    contacts = project.get("contacts", [])
    filled_roles = set(c.get("role") for c in contacts)
    
    required_roles = [
        "architect",
        "project_engineer",
        "project_manager", 
        "project_head",
        "operations_executive",
        "operations_manager",
        "operations_head"
    ]
    
    missing_roles = [role for role in required_roles if role not in filled_roles]
    
    if missing_roles:
        return {
            "valid": False,
            "missing_roles": missing_roles,
            "message": f"Missing required roles: {', '.join(missing_roles)}"
        }
    
    return {
        "valid": True,
        "missing_roles": [],
        "message": "All required roles are filled"
    }

# ============= Gantt Share Routes =============

import secrets
import hashlib

@api_router.post("/projects/{project_id}/gantt-share", response_model=GanttShareResponse)
async def create_gantt_share_link(
    project_id: str,
    share_data: GanttShareCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Generate a shareable Gantt link for a project"""
    current_user = await get_current_user(credentials)
    
    # Check permissions
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and project managers can create share links")
    
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Generate secure token
    token = secrets.token_urlsafe(32)
    
    # Hash password if provided
    hashed_password = None
    if share_data.password:
        hashed_password = hashlib.sha256(share_data.password.encode()).hexdigest()
    
    # Create share token document
    user_id = current_user.get("id") or current_user.get("_id") or str(current_user.get("_id"))
    share_token = {
        "token": token,
        "project_id": project_id,
        "permissions": [p.value for p in share_data.permissions],
        "show_contacts": share_data.show_contacts,
        "password": hashed_password,
        "expires_at": share_data.expires_at,
        "created_at": datetime.utcnow(),
        "created_by": user_id,
        "views_count": 0,
        "downloads_count": 0,
        "last_viewed_at": None,
        "is_active": True
    }
    
    await db.gantt_share_tokens.insert_one(share_token)
    
    # Add token to project
    await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {"$push": {"gantt_share_tokens": share_token}}
    )
    
    # Generate share URL - point to public viewer frontend route
    share_url = f"/public-gantt/{project_id}/{token}"
    
    return GanttShareResponse(
        token=token,
        share_url=share_url,
        permissions=share_data.permissions,
        show_contacts=share_data.show_contacts,
        has_password=bool(hashed_password),
        expires_at=share_data.expires_at,
        created_at=share_token["created_at"],
        views_count=0,
        downloads_count=0,
        last_viewed_at=None,
        is_active=True
    )

@api_router.get("/projects/{project_id}/gantt-share/{token}")
async def access_gantt_share(
    project_id: str,
    token: str,
    password: Optional[str] = None
):
    """Access a shared Gantt chart (public endpoint)"""
    # Find share token
    share_token = await db.gantt_share_tokens.find_one({
        "token": token,
        "project_id": project_id,
        "is_active": True
    })
    
    if not share_token:
        raise HTTPException(status_code=404, detail="Share link not found or expired")
    
    # Check expiration
    if share_token.get("expires_at") and datetime.utcnow() > share_token["expires_at"]:
        raise HTTPException(status_code=403, detail="Share link has expired")
    
    # Check password if required
    if share_token.get("password"):
        if not password:
            raise HTTPException(status_code=401, detail="Password required")
        
        hashed_input = hashlib.sha256(password.encode()).hexdigest()
        if hashed_input != share_token["password"]:
            raise HTTPException(status_code=403, detail="Incorrect password")
    
    # Update view count and last viewed
    await db.gantt_share_tokens.update_one(
        {"_id": share_token["_id"]},
        {
            "$inc": {"views_count": 1},
            "$set": {"last_viewed_at": datetime.utcnow()}
        }
    )
    
    # Get project data
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get milestones and tasks for Gantt chart
    milestones = await db.milestones.find({"project_id": project_id}).to_list(100)
    tasks = await db.tasks.find({"project_id": project_id}).to_list(1000)
    
    # Prepare Gantt data
    gantt_data = {
        "project": {
            "id": str(project["_id"]),
            "name": project.get("name"),
            "start_date": project.get("start_date"),
            "end_date": project.get("end_date"),
            "status": project.get("status")
        },
        "milestones": [serialize_doc(m) for m in milestones],
        "tasks": [serialize_doc(t) for t in tasks],
        "permissions": share_token.get("permissions", []),
        "show_contacts": share_token.get("show_contacts", False)
    }
    
    # Include contacts if allowed
    if share_token.get("show_contacts"):
        gantt_data["contacts"] = project.get("contacts", [])
    
    return gantt_data

@api_router.get("/projects/{project_id}/gantt-share")
async def list_gantt_shares(
    project_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List all active share links for a project"""
    current_user = await get_current_user(credentials)
    
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    shares = await db.gantt_share_tokens.find({
        "project_id": project_id,
        "is_active": True
    }).to_list(100)
    
    # Manually serialize each share document to avoid ObjectId issues
    result = []
    for share in shares:
        token = share.get("token", "")
        share_dict = {
            "id": str(share["_id"]),
            "token": token,
            "share_url": f"/public-gantt/{project_id}/{token}",  # Point to public viewer frontend route
            "project_id": share.get("project_id", ""),
            "permissions": share.get("permissions", []),
            "show_contacts": share.get("show_contacts", False),
            "has_password": bool(share.get("password")),
            "expires_at": share.get("expires_at").isoformat() if share.get("expires_at") else None,
            "created_at": share.get("created_at").isoformat() if share.get("created_at") else None,
            "created_by": str(share.get("created_by", "")),
            "views_count": share.get("views_count", 0),
            "downloads_count": share.get("downloads_count", 0),
            "last_viewed_at": share.get("last_viewed_at").isoformat() if share.get("last_viewed_at") else None,
            "is_active": share.get("is_active", True)
        }
        result.append(share_dict)
    
    return result

@api_router.delete("/projects/{project_id}/gantt-share/{token}")
async def revoke_gantt_share(
    project_id: str,
    token: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Revoke a Gantt share link"""
    current_user = await get_current_user(credentials)
    
    # Check permissions
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and project managers can revoke share links")
    
    result = await db.gantt_share_tokens.update_one(
        {"token": token, "project_id": project_id},
        {"$set": {"is_active": False}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Share link not found")
    
    return {"message": "Share link revoked successfully"}

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
        # Find invoices for this project first
        invoices = await db.invoices.find({"project_id": project_id}).to_list(1000)
        invoice_ids = [str(inv["_id"]) for inv in invoices]
        query["invoice_id"] = {"$in": invoice_ids}
    
    payments = await db.payments.find(query).to_list(1000)
    
    result = []
    for payment in payments:
        payment_dict = serialize_doc(payment)
        
        # Get invoice to get project info
        invoice = await db.invoices.find_one({"_id": ObjectId(payment_dict.get("invoice_id"))}) if payment_dict.get("invoice_id") else None
        if invoice:
            payment_dict["invoice_number"] = invoice.get("invoice_number")
            payment_dict["project_id"] = invoice.get("project_id")
            project = await db.projects.find_one({"_id": ObjectId(invoice["project_id"])}) if invoice.get("project_id") else None
            payment_dict["project_name"] = project["name"] if project else "Unknown"
        else:
            payment_dict["project_name"] = "Unknown"
        
        # Handle both 'recorded_by' and 'created_by' fields for backwards compatibility
        recorder_id = payment_dict.get("recorded_by") or payment_dict.get("created_by")
        if recorder_id:
            creator = await get_user_by_id(recorder_id)
            payment_dict["recorded_by_name"] = creator["full_name"] if creator else "Unknown"
        else:
            payment_dict["recorded_by_name"] = "Unknown"
        
        # Ensure required fields exist
        if "recorded_by" not in payment_dict:
            payment_dict["recorded_by"] = recorder_id or "unknown"
        
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
    
    # Get invoice to get project info (payments are linked to invoices, not directly to projects)
    invoice = await db.invoices.find_one({"_id": ObjectId(payment_dict.get("invoice_id"))}) if payment_dict.get("invoice_id") else None
    if invoice:
        payment_dict["invoice_number"] = invoice.get("invoice_number")
        payment_dict["project_id"] = invoice.get("project_id")
        project = await db.projects.find_one({"_id": ObjectId(invoice["project_id"])}) if invoice.get("project_id") else None
        payment_dict["project_name"] = project["name"] if project else "Unknown"
    else:
        payment_dict["project_name"] = "Unknown"
    
    payment_dict["created_by_name"] = current_user["full_name"]
    
    # Ensure required fields exist for PaymentResponse
    if "recorded_by" not in payment_dict:
        payment_dict["recorded_by"] = payment_dict.get("created_by", str(current_user["_id"]))
    
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
    insufficient_materials = []
    
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

# ============= Role Management Routes =============

@api_router.get("/roles", response_model=List[RoleResponse])
async def get_roles(
    is_active: bool = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all roles"""
    current_user = await get_current_user(credentials)
    
    # Only admin can view roles
    if current_user.get("role") != UserRole.ADMIN and current_user.get("role_name") != "Admin":
        raise HTTPException(status_code=403, detail="Only admins can view roles")
    
    query = {}
    if is_active is not None:
        query["is_active"] = is_active
    
    roles = await db.roles.find(query).to_list(1000)
    return [RoleResponse(**serialize_doc(role)) for role in roles]

@api_router.post("/roles", response_model=RoleResponse)
async def create_role(
    role: RoleCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    
):
    """Create a new role"""
    current_user = await get_current_user(credentials)
    
    if current_user.get("role") != UserRole.ADMIN and current_user.get("role_name") != "Admin":
        raise HTTPException(status_code=403, detail="Only admins can create roles")
    
    # Check if role name already exists
    existing = await db.roles.find_one({"name": role.name})
    if existing:
        raise HTTPException(status_code=400, detail="Role name already exists")
    
    role_dict = role.dict()
    role_dict["created_at"] = datetime.utcnow()
    role_dict["updated_at"] = datetime.utcnow()
    
    result = await db.roles.insert_one(role_dict)
    role_dict["_id"] = result.inserted_id
    
    return RoleResponse(**serialize_doc(role_dict))

@api_router.put("/roles/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: str,
    role_update: RoleUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    
):
    """Update a role"""
    current_user = await get_current_user(credentials)
    
    if current_user.get("role") != UserRole.ADMIN and current_user.get("role_name") != "Admin":
        raise HTTPException(status_code=403, detail="Only admins can update roles")
    
    existing = await db.roles.find_one({"_id": ObjectId(role_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Role not found")
    
    update_data = role_update.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    await db.roles.update_one({"_id": ObjectId(role_id)}, {"$set": update_data})
    
    updated = await db.roles.find_one({"_id": ObjectId(role_id)})
    return RoleResponse(**serialize_doc(updated))

@api_router.delete("/roles/{role_id}")
async def delete_role(
    role_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    
):
    """Delete a role"""
    current_user = await get_current_user(credentials)
    
    if current_user.get("role") != UserRole.ADMIN and current_user.get("role_name") != "Admin":
        raise HTTPException(status_code=403, detail="Only admins can delete roles")
    
    # Check if role is in use
    users_with_role = await db.users.count_documents({"role_id": role_id})
    if users_with_role > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete role. {users_with_role} users are assigned to this role")
    
    result = await db.roles.delete_one({"_id": ObjectId(role_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Role not found")
    
    return {"message": "Role deleted successfully"}

# ============= Permission Management Routes =============

@api_router.get("/roles/{role_id}/permissions", response_model=List[PermissionResponse])
async def get_role_permissions(
    role_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    
):
    """Get all permissions for a role"""
    current_user = await get_current_user(credentials)
    
    if current_user.get("role") != UserRole.ADMIN and current_user.get("role_name") != "Admin":
        raise HTTPException(status_code=403, detail="Only admins can view permissions")
    
    permissions = await db.permissions.find({"role_id": role_id}).to_list(1000)
    return [PermissionResponse(**serialize_doc(perm)) for perm in permissions]

@api_router.post("/permissions", response_model=PermissionResponse)
async def create_permission(
    permission: PermissionCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    
):
    """Create or update a permission"""
    current_user = await get_current_user(credentials)
    
    if current_user.get("role") != UserRole.ADMIN and current_user.get("role_name") != "Admin":
        raise HTTPException(status_code=403, detail="Only admins can manage permissions")
    
    # Check if permission already exists
    existing = await db.permissions.find_one({
        "role_id": permission.role_id,
        "module": permission.module
    })
    
    if existing:
        # Update existing permission
        update_data = permission.dict()
        update_data["updated_at"] = datetime.utcnow()
        
        await db.permissions.update_one(
            {"_id": existing["_id"]},
            {"$set": update_data}
        )
        
        updated = await db.permissions.find_one({"_id": existing["_id"]})
        return PermissionResponse(**serialize_doc(updated))
    else:
        # Create new permission
        perm_dict = permission.dict()
        perm_dict["created_at"] = datetime.utcnow()
        perm_dict["updated_at"] = datetime.utcnow()
        
        result = await db.permissions.insert_one(perm_dict)
        perm_dict["_id"] = result.inserted_id
        
        return PermissionResponse(**serialize_doc(perm_dict))

@api_router.delete("/permissions/{permission_id}")
async def delete_permission(
    permission_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    
):
    """Delete a permission"""
    current_user = await get_current_user(credentials)
    
    if current_user.get("role") != UserRole.ADMIN and current_user.get("role_name") != "Admin":
        raise HTTPException(status_code=403, detail="Only admins can delete permissions")
    
    result = await db.permissions.delete_one({"_id": ObjectId(permission_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    return {"message": "Permission deleted successfully"}

# ============= User Management & Approval Routes =============

@api_router.get("/users/pending", response_model=List[UserResponse])
async def get_pending_users(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    
):
    """Get all pending users waiting for approval"""
    current_user = await get_current_user(credentials)
    
    if current_user.get("role") != UserRole.ADMIN and current_user.get("role_name") != "Admin":
        raise HTTPException(status_code=403, detail="Only admins can view pending users")
    
    users = await db.users.find({"approval_status": ApprovalStatus.PENDING}).to_list(1000)
    
    result = []
    for user in users:
        user_dict = serialize_doc(user)
        # Get role name if role_id exists
        if user_dict.get("role_id"):
            role = await db.roles.find_one({"_id": ObjectId(user_dict["role_id"])})
            user_dict["role_name"] = role["name"] if role else None
        # Get team name if team_id exists
        if user_dict.get("team_id"):
            team = await db.teams.find_one({"_id": ObjectId(user_dict["team_id"])})
            user_dict["team_name"] = team["name"] if team else None
        result.append(UserResponse(**user_dict))
    
    return result

@api_router.get("/users/active", response_model=List[UserResponse])
async def get_active_users(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    
):
    """Get all active/approved users - accessible by Admin and Project Manager"""
    current_user = await get_current_user(credentials)
    
    # Allow both Admin and Project Manager to view users for project assignment
    allowed_roles = [UserRole.ADMIN, "Admin", "Project Manager", "project_manager"]
    if current_user.get("role") not in allowed_roles and current_user.get("role_name") not in allowed_roles:
        raise HTTPException(status_code=403, detail="Only admins and project managers can view all users")
    
    users = await db.users.find({"approval_status": ApprovalStatus.APPROVED}).to_list(1000)
    
    result = []
    for user in users:
        user_dict = serialize_doc(user)
        # Get role name if role_id exists
        if user_dict.get("role_id"):
            role = await db.roles.find_one({"_id": ObjectId(user_dict["role_id"])})
            user_dict["role_name"] = role["name"] if role else None
        # Get team name if team_id exists
        if user_dict.get("team_id"):
            team = await db.teams.find_one({"_id": ObjectId(user_dict["team_id"])})
            user_dict["team_name"] = team["name"] if team else None
        result.append(UserResponse(**user_dict))
    
    return result

@api_router.post("/users/{user_id}/approve")
async def approve_user(
    user_id: str,
    approval: UserApprovalRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    
):
    """Approve or reject a user"""
    current_user = await get_current_user(credentials)
    
    if current_user.get("role") != UserRole.ADMIN and current_user.get("role_name") != "Admin":
        raise HTTPException(status_code=403, detail="Only admins can approve users")
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if approval.action == "approve":
        update_data = {
            "approval_status": ApprovalStatus.APPROVED,
            "approved_by": current_user["id"],
            "approved_at": datetime.utcnow()
        }
        
        # Assign role if provided
        if approval.role_id:
            update_data["role_id"] = approval.role_id
        
        await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
        
        # TODO: Send notification (email/SMS) to user
        
        return {"message": "User approved successfully"}
    
    elif approval.action == "reject":
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"approval_status": ApprovalStatus.REJECTED}}
        )
        return {"message": "User rejected"}
    
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'approve' or 'reject'")

@api_router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    
):
    """Update user details"""
    current_user = await get_current_user(credentials)
    
    # Admin or the user themselves can update
    if current_user.get("role") != UserRole.ADMIN and current_user.get("role_name") != "Admin" and current_user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this user")
    
    existing = await db.users.find_one({"_id": ObjectId(user_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_update.dict(exclude_unset=True)
    
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
    
    updated = await db.users.find_one({"_id": ObjectId(user_id)})
    user_dict = serialize_doc(updated)
    
    # Get role name
    if user_dict.get("role_id"):
        role = await db.roles.find_one({"_id": ObjectId(user_dict["role_id"])})
        user_dict["role_name"] = role["name"] if role else None
    
    return UserResponse(**user_dict)

# ============= System Settings Routes =============

@api_router.get("/settings", response_model=List[SystemSettingResponse])
async def get_settings(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    
):
    """Get all system settings"""
    current_user = await get_current_user(credentials)
    
    if current_user.get("role") != UserRole.ADMIN and current_user.get("role_name") != "Admin":
        raise HTTPException(status_code=403, detail="Only admins can view settings")
    
    settings = await db.system_settings.find().to_list(1000)
    return [SystemSettingResponse(**serialize_doc(s)) for s in settings]

@api_router.post("/settings", response_model=SystemSettingResponse)
async def create_or_update_setting(
    setting: SystemSettingCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    
):
    """Create or update a system setting"""
    current_user = await get_current_user(credentials)
    
    if current_user.get("role") != UserRole.ADMIN and current_user.get("role_name") != "Admin":
        raise HTTPException(status_code=403, detail="Only admins can manage settings")
    
    existing = await db.system_settings.find_one({"setting_key": setting.setting_key})
    
    if existing:
        # Update
        update_data = setting.dict()
        update_data["updated_at"] = datetime.utcnow()
        
        await db.system_settings.update_one(
            {"setting_key": setting.setting_key},
            {"$set": update_data}
        )
        
        updated = await db.system_settings.find_one({"setting_key": setting.setting_key})
        return SystemSettingResponse(**serialize_doc(updated))
    else:
        # Create
        setting_dict = setting.dict()
        setting_dict["updated_at"] = datetime.utcnow()
        
        result = await db.system_settings.insert_one(setting_dict)
        setting_dict["_id"] = result.inserted_id
        
        return SystemSettingResponse(**serialize_doc(setting_dict))


# ============= Team Management Routes =============

@api_router.get("/teams", response_model=List[TeamResponse])
async def get_teams(
    is_active: bool = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all teams"""
    current_user = await get_current_user(credentials)
    
    if current_user.get("role") != UserRole.ADMIN and current_user.get("role_name") != "Admin":
        raise HTTPException(status_code=403, detail="Only admins can view teams")
    
    query = {}
    if is_active is not None:
        query["is_active"] = is_active
    
    teams = await db.teams.find(query).to_list(1000)
    
    # Count members in each team
    result = []
    for team in teams:
        team_dict = serialize_doc(team)
        member_count = await db.users.count_documents({"team_id": team_dict["id"]})
        team_dict["member_count"] = member_count
        result.append(TeamResponse(**team_dict))
    
    return result

@api_router.post("/teams", response_model=TeamResponse)
async def create_team(
    team: TeamCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new team"""
    current_user = await get_current_user(credentials)
    
    if current_user.get("role") != UserRole.ADMIN and current_user.get("role_name") != "Admin":
        raise HTTPException(status_code=403, detail="Only admins can create teams")
    
    # Check if team name already exists
    existing = await db.teams.find_one({"name": team.name})
    if existing:
        raise HTTPException(status_code=400, detail="Team name already exists")
    
    team_dict = team.dict()
    team_dict["created_at"] = datetime.utcnow()
    team_dict["updated_at"] = datetime.utcnow()
    
    result = await db.teams.insert_one(team_dict)
    team_dict["_id"] = result.inserted_id
    team_dict["member_count"] = 0
    
    return TeamResponse(**serialize_doc(team_dict))

@api_router.get("/teams/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get team by ID"""
    current_user = await get_current_user(credentials)
    
    if current_user.get("role") != UserRole.ADMIN and current_user.get("role_name") != "Admin":
        raise HTTPException(status_code=403, detail="Only admins can view teams")
    
    team = await db.teams.find_one({"_id": ObjectId(team_id)})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    team_dict = serialize_doc(team)
    member_count = await db.users.count_documents({"team_id": team_dict["id"]})
    team_dict["member_count"] = member_count
    
    return TeamResponse(**team_dict)

@api_router.put("/teams/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: str,
    team_update: TeamUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a team"""
    current_user = await get_current_user(credentials)
    
    if current_user.get("role") != UserRole.ADMIN and current_user.get("role_name") != "Admin":
        raise HTTPException(status_code=403, detail="Only admins can update teams")
    
    existing = await db.teams.find_one({"_id": ObjectId(team_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Team not found")
    
    update_data = team_update.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    await db.teams.update_one({"_id": ObjectId(team_id)}, {"$set": update_data})
    
    updated = await db.teams.find_one({"_id": ObjectId(team_id)})
    team_dict = serialize_doc(updated)
    member_count = await db.users.count_documents({"team_id": team_dict["id"]})
    team_dict["member_count"] = member_count
    
    return TeamResponse(**team_dict)

@api_router.delete("/teams/{team_id}")
async def delete_team(
    team_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a team"""
    current_user = await get_current_user(credentials)
    
    if current_user.get("role") != UserRole.ADMIN and current_user.get("role_name") != "Admin":
        raise HTTPException(status_code=403, detail="Only admins can delete teams")
    
    # Check if team has users
    users_in_team = await db.users.count_documents({"team_id": team_id})
    if users_in_team > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete team. {users_in_team} users are assigned to this team"
        )
    
    result = await db.teams.delete_one({"_id": ObjectId(team_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Team not found")
    
    return {"message": "Team deleted successfully"}

# ============= Add User by Admin Route =============

@api_router.post("/users/create", response_model=UserResponse)
async def create_user_by_admin(
    user_data: UserCreateByAdmin,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Admin creates a new user directly (auto-approved)"""
    current_user = await get_current_user(credentials)
    
    if current_user.get("role") != UserRole.ADMIN and current_user.get("role_name") != "Admin":
        raise HTTPException(status_code=403, detail="Only admins can create users")
    
    # Verify role exists
    role = await db.roles.find_one({"_id": ObjectId(user_data.role_id)})
    if not role:
        raise HTTPException(status_code=400, detail="Role not found")
    
    # Verify team exists
    team = await db.teams.find_one({"_id": ObjectId(user_data.team_id)})
    if not team:
        raise HTTPException(status_code=400, detail="Team not found")
    
    # Check if email already exists
    existing_email = await db.users.find_one({"email": user_data.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if phone already exists
    existing_phone = await db.users.find_one({"phone": user_data.phone})
    if existing_phone:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    # Create user with auto-approval
    user_dict = {
        "email": user_data.email,
        "phone": user_data.phone,
        "full_name": user_data.full_name,
        "role_id": user_data.role_id,
        "team_id": user_data.team_id,
        "address": user_data.address,
        "approval_status": ApprovalStatus.APPROVED,
        "approved_by": current_user.get("id"),
        "approved_at": datetime.utcnow(),
        "is_active": True,
        "date_joined": datetime.utcnow(),
        "last_login": None,
    }
    
    # Hash password if provided
    if user_data.password:
        user_dict["password"] = pwd_context.hash(user_data.password)
    
    result = await db.users.insert_one(user_dict)
    user_dict["_id"] = result.inserted_id
    
    # Prepare response with role and team names
    response_dict = serialize_doc(user_dict)
    response_dict["role_name"] = role["name"]
    response_dict["team_name"] = team["name"]
    
    return UserResponse(**response_dict)


# Router will be included after all routes are defined

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# MILESTONE APIs
# ============================================

@app.post("/api/milestones")
async def create_milestone(
    milestone: MilestoneCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new milestone"""
    current_user = await get_current_user(credentials)
    
    # Check role - handle both role and role_name fields
    user_role = current_user.get("role") or current_user.get("role_name", "")
    if user_role not in ["Admin", "Project Manager", UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins and project managers can create milestones")
    
    milestone_dict = milestone.dict()
    milestone_dict["created_at"] = datetime.utcnow()
    milestone_dict["updated_at"] = datetime.utcnow()
    milestone_dict["completed_at"] = None
    
    result = await db.milestones.insert_one(milestone_dict)
    milestone_dict["id"] = str(result.inserted_id)
    milestone_dict.pop("_id", None)
    
    return milestone_dict

@app.get("/api/milestones")
async def get_milestones(
    project_id: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all milestones, optionally filtered by project"""
    current_user = await get_current_user(credentials)
    
    query = {}
    if project_id:
        query["project_id"] = project_id
    
    milestones = await db.milestones.find(query).sort("order", 1).to_list(1000)
    
    result = []
    for milestone in milestones:
        milestone_dict = serialize_doc(milestone)
        result.append(milestone_dict)
    
    return result

@app.get("/api/milestones/{milestone_id}")
async def get_milestone(
    milestone_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get a specific milestone"""
    current_user = await get_current_user(credentials)
    
    milestone = await db.milestones.find_one({"_id": ObjectId(milestone_id)})
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    return serialize_doc(milestone)

@app.put("/api/milestones/{milestone_id}")
async def update_milestone(
    milestone_id: str,
    milestone_update: MilestoneUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a milestone"""
    current_user = await get_current_user(credentials)
    
    # Check role - handle both role and role_name fields
    user_role = current_user.get("role") or current_user.get("role_name", "")
    if user_role not in ["Admin", "Project Manager", UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins and project managers can update milestones")
    
    milestone = await db.milestones.find_one({"_id": ObjectId(milestone_id)})
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    update_data = {k: v for k, v in milestone_update.dict(exclude_unset=True).items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    # Mark completion timestamp
    if update_data.get("status") == MilestoneStatus.COMPLETED and milestone.get("status") != MilestoneStatus.COMPLETED:
        update_data["completed_at"] = datetime.utcnow()
    
    await db.milestones.update_one(
        {"_id": ObjectId(milestone_id)},
        {"$set": update_data}
    )
    
    updated_milestone = await db.milestones.find_one({"_id": ObjectId(milestone_id)})
    return serialize_doc(updated_milestone)

@app.delete("/api/milestones/{milestone_id}")
async def delete_milestone(
    milestone_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a milestone"""
    current_user = await get_current_user(credentials)
    
    # Check role - handle both role and role_name fields
    user_role = current_user.get("role") or current_user.get("role_name", "")
    if user_role not in ["Admin", "Project Manager", UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins and project managers can delete milestones")
    
    result = await db.milestones.delete_one({"_id": ObjectId(milestone_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    return {"message": "Milestone deleted successfully"}

# ============================================
# DOCUMENT APIs
# ============================================

@app.post("/api/documents")
async def create_document(
    document: DocumentCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Upload a new document"""
    current_user = await get_current_user(credentials)
    
    document_dict = document.dict()
    document_dict["uploaded_at"] = datetime.utcnow()
    document_dict["updated_at"] = datetime.utcnow()
    document_dict["uploaded_by"] = current_user.get("id")
    
    result = await db.documents.insert_one(document_dict)
    document_dict["id"] = str(result.inserted_id)
    document_dict.pop("_id", None)
    
    # Add uploader name
    document_dict["uploader_name"] = current_user.get("full_name")
    
    return document_dict

@app.get("/api/documents")
async def get_documents(
    project_id: Optional[str] = None,
    document_type: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all documents, optionally filtered"""
    current_user = await get_current_user(credentials)
    
    query = {}
    if project_id:
        query["project_id"] = project_id
    if document_type:
        query["document_type"] = document_type
    
    documents = await db.documents.find(query).sort("uploaded_at", -1).to_list(1000)
    
    result = []
    for doc in documents:
        doc_dict = serialize_doc(doc)
        
        # Get uploader name
        if doc_dict.get("uploaded_by"):
            uploader = await db.users.find_one({"_id": ObjectId(doc_dict["uploaded_by"])})
            doc_dict["uploader_name"] = uploader.get("full_name") if uploader else None
        
        result.append(doc_dict)
    
    return result

@app.get("/api/documents/{document_id}")
async def get_document(
    document_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get a specific document"""
    current_user = await get_current_user(credentials)
    
    document = await db.documents.find_one({"_id": ObjectId(document_id)})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc_dict = serialize_doc(document)
    
    # Get uploader name
    if doc_dict.get("uploaded_by"):
        uploader = await db.users.find_one({"_id": ObjectId(doc_dict["uploaded_by"])})
        doc_dict["uploader_name"] = uploader.get("full_name") if uploader else None
    
    return doc_dict

@app.put("/api/documents/{document_id}")
async def update_document(
    document_id: str,
    document_update: DocumentUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update document metadata (not the file itself)"""
    current_user = await get_current_user(credentials)
    
    document = await db.documents.find_one({"_id": ObjectId(document_id)})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Only uploader or admin can update
    user_role = current_user.get("role") or current_user.get("role_name", "")
    if document.get("uploaded_by") != current_user.get("id") and user_role not in ["Admin", UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only the uploader or admin can update this document")
    
    update_data = {k: v for k, v in document_update.dict(exclude_unset=True).items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.documents.update_one(
        {"_id": ObjectId(document_id)},
        {"$set": update_data}
    )
    
    updated_document = await db.documents.find_one({"_id": ObjectId(document_id)})
    return serialize_doc(updated_document)

@app.delete("/api/documents/{document_id}")
async def delete_document(
    document_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a document"""
    current_user = await get_current_user(credentials)
    
    document = await db.documents.find_one({"_id": ObjectId(document_id)})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Only uploader or admin can delete
    user_role = current_user.get("role") or current_user.get("role_name", "")
    if document.get("uploaded_by") != current_user.get("id") and user_role not in ["Admin", UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only the uploader or admin can delete this document")
    
    result = await db.documents.delete_one({"_id": ObjectId(document_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {"message": "Document deleted successfully"}

# ============================================
# GANTT CHART / TIMELINE APIs
# ============================================

@app.get("/api/projects/{project_id}/gantt")
async def get_project_gantt(
    project_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get Gantt chart data for a project"""
    current_user = await get_current_user(credentials)
    
    # Get all tasks for the project
    tasks = await db.tasks.find({"project_id": project_id}).sort("planned_start_date", 1).to_list(1000)
    
    # Get milestones
    milestones = await db.milestones.find({"project_id": project_id}).sort("order", 1).to_list(1000)
    
    gantt_tasks = []
    for task in tasks:
        task_dict = serialize_doc(task)
        
        # Get assigned users
        assigned_users = []
        for user_id in task_dict.get("assigned_to", []):
            user = await db.users.find_one({"_id": ObjectId(user_id)})
            if user:
                assigned_users.append({
                    "id": str(user["_id"]),
                    "full_name": user.get("full_name")
                })
        
        gantt_tasks.append({
            "id": task_dict["id"],
            "title": task_dict["title"],
            "start_date": task_dict.get("planned_start_date"),
            "end_date": task_dict.get("planned_end_date"),
            "actual_start_date": task_dict.get("actual_start_date"),
            "actual_end_date": task_dict.get("actual_end_date"),
            "progress": task_dict.get("progress_percentage", 0),
            "status": task_dict.get("status"),
            "priority": task_dict.get("priority"),
            "dependencies": task_dict.get("dependencies", []),
            "assigned_to": assigned_users,
            "parent_task_id": task_dict.get("parent_task_id")
        })
    
    gantt_milestones = []
    for milestone in milestones:
        milestone_dict = serialize_doc(milestone)
        gantt_milestones.append({
            "id": milestone_dict["id"],
            "name": milestone_dict["name"],
            "due_date": milestone_dict.get("due_date"),
            "status": milestone_dict.get("status"),
            "completion_percentage": milestone_dict.get("completion_percentage", 0)
        })
    
    return {
        "tasks": gantt_tasks,
        "milestones": gantt_milestones
    }



# ============================================
# BUDGET APIs
# ============================================

@app.post("/api/budgets")
async def create_budget(
    budget: BudgetCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a budget for a project"""
    current_user = await get_current_user(credentials)
    
    # Check role - handle both role and role_name fields
    user_role = current_user.get("role") or current_user.get("role_name", "")
    if user_role not in ["Admin", "Project Manager", UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins and project managers can create budgets")
    
    budget_dict = budget.dict()
    budget_dict["created_at"] = datetime.utcnow()
    budget_dict["updated_at"] = datetime.utcnow()
    
    result = await db.budgets.insert_one(budget_dict)
    budget_dict["id"] = str(result.inserted_id)
    budget_dict.pop("_id", None)
    
    # Calculate spent amount
    budget_dict["spent_amount"] = 0
    budget_dict["remaining_amount"] = budget_dict["allocated_amount"]
    budget_dict["utilization_percentage"] = 0
    
    return budget_dict

@app.get("/api/budgets")
async def get_budgets(
    project_id: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all budgets, optionally filtered by project"""
    current_user = await get_current_user(credentials)
    
    query = {}
    if project_id:
        query["project_id"] = project_id
    
    budgets = await db.budgets.find(query).to_list(1000)
    
    result = []
    for budget in budgets:
        budget_dict = serialize_doc(budget)
        
        # Calculate spent amount from expenses
        spent = await db.expenses.aggregate([
            {
                "$match": {
                    "project_id": budget_dict["project_id"],
                    "category": budget_dict["category"]
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total": {"$sum": "$amount"}
                }
            }
        ]).to_list(1)
        
        spent_amount = spent[0]["total"] if spent else 0
        budget_dict["spent_amount"] = spent_amount
        budget_dict["remaining_amount"] = budget_dict["allocated_amount"] - spent_amount
        budget_dict["utilization_percentage"] = (spent_amount / budget_dict["allocated_amount"] * 100) if budget_dict["allocated_amount"] > 0 else 0
        
        result.append(budget_dict)
    
    return result

@app.put("/api/budgets/{budget_id}")
async def update_budget(
    budget_id: str,
    budget_update: BudgetUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a budget"""
    current_user = await get_current_user(credentials)
    
    # Check role - handle both role and role_name fields
    user_role = current_user.get("role") or current_user.get("role_name", "")
    if user_role not in ["Admin", "Project Manager", UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins and project managers can update budgets")
    
    update_data = {k: v for k, v in budget_update.dict(exclude_unset=True).items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.budgets.update_one({"_id": ObjectId(budget_id)}, {"$set": update_data})
    
    updated_budget = await db.budgets.find_one({"_id": ObjectId(budget_id)})
    return serialize_doc(updated_budget)

@app.delete("/api/budgets/{budget_id}")
async def delete_budget(
    budget_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a budget"""
    current_user = await get_current_user(credentials)
    
    # Check role - handle both role and role_name fields
    user_role = current_user.get("role") or current_user.get("role_name", "")
    if user_role not in ["Admin", "Project Manager", UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins and project managers can delete budgets")
    
    result = await db.budgets.delete_one({"_id": ObjectId(budget_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    return {"message": "Budget deleted successfully"}

# ============================================
# EXPENSE APIs
# ============================================

@app.post("/api/expenses")
async def create_expense(
    expense: ExpenseCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create an expense"""
    current_user = await get_current_user(credentials)
    
    expense_dict = expense.dict()
    expense_dict["created_by"] = current_user.get("id")
    expense_dict["created_at"] = datetime.utcnow()
    expense_dict["updated_at"] = datetime.utcnow()
    
    result = await db.expenses.insert_one(expense_dict)
    expense_dict["id"] = str(result.inserted_id)
    expense_dict.pop("_id", None)
    expense_dict["created_by_name"] = current_user.get("full_name")
    
    return expense_dict

@app.get("/api/expenses")
async def get_expenses(
    project_id: Optional[str] = None,
    category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all expenses with optional filters"""
    current_user = await get_current_user(credentials)
    
    query = {}
    if project_id:
        query["project_id"] = project_id
    if category:
        query["category"] = category
    if start_date and end_date:
        query["expense_date"] = {
            "$gte": datetime.fromisoformat(start_date.replace('Z', '+00:00')),
            "$lte": datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        }
    
    expenses = await db.expenses.find(query).sort("expense_date", -1).to_list(1000)
    
    result = []
    for expense in expenses:
        expense_dict = serialize_doc(expense)
        
        # Get creator name
        if expense_dict.get("created_by"):
            creator = await db.users.find_one({"_id": ObjectId(expense_dict["created_by"])})
            expense_dict["created_by_name"] = creator.get("full_name") if creator else None
        
        result.append(expense_dict)
    
    return result

@app.delete("/api/expenses/{expense_id}")
async def delete_expense(
    expense_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete an expense"""
    current_user = await get_current_user(credentials)
    
    expense = await db.expenses.find_one({"_id": ObjectId(expense_id)})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    # Only creator or admin can delete
    user_role = current_user.get("role") or current_user.get("role_name", "")
    if expense.get("created_by") != current_user.get("id") and user_role not in ["Admin", UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only the creator or admin can delete this expense")
    
    await db.expenses.delete_one({"_id": ObjectId(expense_id)})
    return {"message": "Expense deleted successfully"}

# ============================================
# INVOICE APIs
# ============================================

@app.post("/api/invoices")
async def create_invoice(
    invoice: InvoiceCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create an invoice"""
    current_user = await get_current_user(credentials)
    
    # Check role - handle both role and role_name fields
    user_role = current_user.get("role") or current_user.get("role_name", "")
    if user_role not in ["Admin", "Project Manager", UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins and project managers can create invoices")
    
    invoice_dict = invoice.dict()
    invoice_dict["status"] = InvoiceStatus.DRAFT
    invoice_dict["paid_amount"] = 0
    invoice_dict["balance_due"] = invoice_dict["total_amount"]
    invoice_dict["created_by"] = current_user.get("id")
    invoice_dict["created_at"] = datetime.utcnow()
    invoice_dict["updated_at"] = datetime.utcnow()
    
    result = await db.invoices.insert_one(invoice_dict)
    invoice_dict["id"] = str(result.inserted_id)
    invoice_dict.pop("_id", None)
    invoice_dict["created_by_name"] = current_user.get("full_name")
    
    return invoice_dict

@app.get("/api/invoices")
async def get_invoices(
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all invoices with optional filters"""
    current_user = await get_current_user(credentials)
    
    query = {}
    if project_id:
        query["project_id"] = project_id
    if status:
        query["status"] = status
    
    invoices = await db.invoices.find(query).sort("issue_date", -1).to_list(1000)
    
    result = []
    for invoice in invoices:
        invoice_dict = serialize_doc(invoice)
        
        # Get creator name
        if invoice_dict.get("created_by"):
            creator = await db.users.find_one({"_id": ObjectId(invoice_dict["created_by"])})
            invoice_dict["created_by_name"] = creator.get("full_name") if creator else None
        
        # Calculate paid amount and update status
        payments = await db.payments.aggregate([
            {"$match": {"invoice_id": invoice_dict["id"]}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(1)
        
        paid_amount = payments[0]["total"] if payments else 0
        invoice_dict["paid_amount"] = paid_amount
        invoice_dict["balance_due"] = invoice_dict["total_amount"] - paid_amount
        
        # Auto-update status
        if paid_amount >= invoice_dict["total_amount"]:
            invoice_dict["status"] = InvoiceStatus.PAID
        elif datetime.utcnow() > datetime.fromisoformat(str(invoice_dict["due_date"]).replace('Z', '+00:00')) and invoice_dict["status"] != InvoiceStatus.PAID:
            invoice_dict["status"] = InvoiceStatus.OVERDUE
        
        result.append(invoice_dict)
    
    return result

@app.get("/api/invoices/{invoice_id}")
async def get_invoice(
    invoice_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get a specific invoice"""
    current_user = await get_current_user(credentials)
    
    invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    invoice_dict = serialize_doc(invoice)
    
    # Get payments for this invoice
    payments = await db.payments.find({"invoice_id": invoice_id}).to_list(100)
    invoice_dict["payments"] = [serialize_doc(p) for p in payments]
    
    return invoice_dict

@app.put("/api/invoices/{invoice_id}")
async def update_invoice(
    invoice_id: str,
    invoice_update: InvoiceUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update an invoice"""
    current_user = await get_current_user(credentials)
    
    # Check role - handle both role and role_name fields
    user_role = current_user.get("role") or current_user.get("role_name", "")
    if user_role not in ["Admin", "Project Manager", UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins and project managers can update invoices")
    
    update_data = {k: v for k, v in invoice_update.dict(exclude_unset=True).items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.invoices.update_one({"_id": ObjectId(invoice_id)}, {"$set": update_data})
    
    updated_invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    return serialize_doc(updated_invoice)

# ============================================
# PAYMENT APIs
# ============================================

@app.post("/api/payments")
async def create_payment(
    payment: PaymentCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Record a payment for an invoice"""
    current_user = await get_current_user(credentials)
    
    # Check role - handle both role and role_name fields
    user_role = current_user.get("role") or current_user.get("role_name", "")
    if user_role not in ["Admin", "Project Manager", "Accountant", UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins, project managers, and accountants can record payments")
    
    # Verify invoice exists
    invoice = await db.invoices.find_one({"_id": ObjectId(payment.invoice_id)})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    payment_dict = payment.dict()
    payment_dict["recorded_by"] = current_user.get("id")
    payment_dict["created_at"] = datetime.utcnow()
    payment_dict["updated_at"] = datetime.utcnow()
    
    result = await db.payments.insert_one(payment_dict)
    payment_dict["id"] = str(result.inserted_id)
    payment_dict.pop("_id", None)
    payment_dict["invoice_number"] = invoice.get("invoice_number")
    payment_dict["client_name"] = invoice.get("client_name")
    payment_dict["recorded_by_name"] = current_user.get("full_name")
    
    return payment_dict

@app.get("/api/payments")
async def get_payments(
    invoice_id: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all payments"""
    current_user = await get_current_user(credentials)
    
    query = {}
    if invoice_id:
        query["invoice_id"] = invoice_id
    
    payments = await db.payments.find(query).sort("payment_date", -1).to_list(1000)
    
    result = []
    for payment in payments:
        payment_dict = serialize_doc(payment)
        
        # Get invoice details
        invoice = await db.invoices.find_one({"_id": ObjectId(payment_dict["invoice_id"])})
        if invoice:
            payment_dict["invoice_number"] = invoice.get("invoice_number")
            payment_dict["client_name"] = invoice.get("client_name")
        
        # Get recorder name
        if payment_dict.get("recorded_by"):
            recorder = await db.users.find_one({"_id": ObjectId(payment_dict["recorded_by"])})
            payment_dict["recorded_by_name"] = recorder.get("full_name") if recorder else None
        
        result.append(payment_dict)
    
    return result

# ============================================
# FINANCIAL REPORTS APIs
# ============================================

@app.get("/api/financial-reports/{project_id}")
async def get_financial_report(
    project_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get comprehensive financial report for a project"""
    current_user = await get_current_user(credentials)
    
    # Budget vs Actual
    budgets = await db.budgets.find({"project_id": project_id}).to_list(100)
    budget_summary = []
    total_allocated = 0
    total_spent = 0
    
    for budget in budgets:
        spent = await db.expenses.aggregate([
            {
                "$match": {
                    "project_id": project_id,
                    "category": budget["category"]
                }
            },
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(1)
        
        spent_amount = spent[0]["total"] if spent else 0
        total_allocated += budget["allocated_amount"]
        total_spent += spent_amount
        
        budget_summary.append({
            "category": budget["category"],
            "allocated": budget["allocated_amount"],
            "spent": spent_amount,
            "remaining": budget["allocated_amount"] - spent_amount,
            "utilization": (spent_amount / budget["allocated_amount"] * 100) if budget["allocated_amount"] > 0 else 0
        })
    
    # Expenses by category
    expenses_by_category = await db.expenses.aggregate([
        {"$match": {"project_id": project_id}},
        {"$group": {
            "_id": "$category",
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1}
        }}
    ]).to_list(100)
    
    # Invoices summary
    invoices = await db.invoices.find({"project_id": project_id}).to_list(100)
    invoice_summary = {
        "total": len(invoices),
        "draft": 0,
        "sent": 0,
        "paid": 0,
        "overdue": 0,
        "total_amount": 0,
        "paid_amount": 0,
        "outstanding": 0
    }
    
    for invoice in invoices:
        invoice_summary[invoice["status"]] += 1
        invoice_summary["total_amount"] += invoice["total_amount"]
        
        # Get paid amount
        payments = await db.payments.aggregate([
            {"$match": {"invoice_id": str(invoice["_id"])}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(1)
        
        paid = payments[0]["total"] if payments else 0
        invoice_summary["paid_amount"] += paid
    
    invoice_summary["outstanding"] = invoice_summary["total_amount"] - invoice_summary["paid_amount"]
    
    return {
        "project_id": project_id,
        "budget_summary": budget_summary,
        "total_budget": total_allocated,
        "total_spent": total_spent,
        "budget_remaining": total_allocated - total_spent,
        "budget_utilization": (total_spent / total_allocated * 100) if total_allocated > 0 else 0,
        "expenses_by_category": expenses_by_category,
        "invoice_summary": invoice_summary
    }



# ============= CRM Lead Management Routes =============

# Helper function to get category with lead count
async def get_category_with_count(category_doc):
    category_id = str(category_doc["_id"])
    category_dict = serialize_doc(category_doc)
    lead_count = await db.leads.count_documents({"category_id": category_id, "is_deleted": {"$ne": True}})
    category_dict["lead_count"] = lead_count
    return LeadCategoryResponse(**category_dict)

# Helper function to send mock WhatsApp
async def send_mock_whatsapp(lead_id: str, lead_name: str, message: str, performed_by: str):
    """Mock WhatsApp send - creates activity log"""
    activity = {
        "lead_id": lead_id,
        "activity_type": LeadActivityType.WHATSAPP,
        "title": "WhatsApp Message Sent",
        "description": f"Sent: {message}",
        "whatsapp_message_id": f"mock_wa_{ObjectId()}",
        "whatsapp_status": WhatsAppStatus.SENT,
        "whatsapp_message": message,
        "performed_by": performed_by,
        "created_at": datetime.utcnow()
    }
    result = await db.lead_activities.insert_one(activity)
    return str(result.inserted_id)

# ============= Lead Category Routes =============

@api_router.get("/crm/categories", response_model=List[LeadCategoryResponse])
async def get_lead_categories(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all lead categories with lead counts"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and PMs can access CRM")
    
    categories = await db.lead_categories.find({"is_active": True}).sort("order", 1).to_list(100)
    
    result = []
    for cat in categories:
        result.append(await get_category_with_count(cat))
    
    return result

@api_router.post("/crm/categories", response_model=LeadCategoryResponse)
async def create_lead_category(
    category: LeadCategoryCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new lead category (Admin only)"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can create categories")
    
    cat_dict = category.dict()
    cat_dict["created_at"] = datetime.utcnow()
    cat_dict["updated_at"] = datetime.utcnow()
    
    result = await db.lead_categories.insert_one(cat_dict)
    cat_dict["_id"] = result.inserted_id
    
    return await get_category_with_count(cat_dict)

@api_router.put("/crm/categories/{category_id}", response_model=LeadCategoryResponse)
async def update_lead_category(
    category_id: str,
    category_update: LeadCategoryUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a lead category (Admin only)"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can update categories")
    
    existing = await db.lead_categories.find_one({"_id": ObjectId(category_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    
    if existing.get("is_system") and category_update.name:
        raise HTTPException(status_code=400, detail="Cannot rename system categories")
    
    update_data = category_update.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    await db.lead_categories.update_one(
        {"_id": ObjectId(category_id)},
        {"$set": update_data}
    )
    
    updated_cat = await db.lead_categories.find_one({"_id": ObjectId(category_id)})
    return await get_category_with_count(updated_cat)

@api_router.put("/crm/categories/reorder")
async def reorder_categories(
    reorder_data: List[dict],
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Reorder categories (Admin only)"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can reorder categories")
    
    for item in reorder_data:
        await db.lead_categories.update_one(
            {"_id": ObjectId(item["id"])},
            {"$set": {"order": item["order"], "updated_at": datetime.utcnow()}}
        )
    
    return {"message": "Categories reordered successfully"}

# ============= Lead CRUD Routes =============

@api_router.get("/crm/leads", response_model=List[LeadResponse])
async def get_leads(
    category_id: str = None,
    status: LeadStatus = None,
    assigned_to: str = None,
    source: LeadSource = None,
    priority: LeadPriority = None,
    search: str = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all leads with filtering"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and PMs can access CRM")
    
    query = {"is_deleted": {"$ne": True}}
    
    if category_id:
        query["category_id"] = category_id
    if status:
        query["status"] = status
    if assigned_to:
        query["assigned_to"] = assigned_to
    if source:
        query["source"] = source
    if priority:
        query["priority"] = priority
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"primary_phone": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    leads = await db.leads.find(query).sort("created_at", -1).to_list(1000)
    
    result = []
    for lead in leads:
        lead_dict = serialize_doc(lead)
        
        # Get category info
        if lead_dict.get("category_id"):
            category = await db.lead_categories.find_one({"_id": ObjectId(lead_dict["category_id"])})
            if category:
                lead_dict["category_name"] = category["name"]
                lead_dict["category_color"] = category.get("color", "#6B7280")
        
        # Get assigned user info
        if lead_dict.get("assigned_to"):
            assignee = await get_user_by_id(lead_dict["assigned_to"])
            lead_dict["assigned_to_name"] = assignee["full_name"] if assignee else None
        
        # Get created by info
        creator = await get_user_by_id(lead_dict["created_by"])
        lead_dict["created_by_name"] = creator["full_name"] if creator else "Unknown"
        
        # Get activity stats
        activities_count = await db.lead_activities.count_documents({"lead_id": lead_dict["id"]})
        lead_dict["activities_count"] = activities_count
        
        last_activity = await db.lead_activities.find_one(
            {"lead_id": lead_dict["id"]},
            sort=[("created_at", -1)]
        )
        lead_dict["last_activity"] = last_activity["created_at"] if last_activity else None
        
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
    
    # Check if category exists
    category = await db.lead_categories.find_one({"_id": ObjectId(lead.category_id)})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    lead_dict = lead.dict(exclude={"send_whatsapp"})
    lead_dict["created_by"] = str(current_user["_id"])
    lead_dict["created_at"] = datetime.utcnow()
    lead_dict["updated_at"] = datetime.utcnow()
    lead_dict["is_deleted"] = False
    
    if lead.whatsapp_consent and not lead_dict.get("whatsapp_opt_in_date"):
        lead_dict["whatsapp_opt_in_date"] = datetime.utcnow()
    
    result = await db.leads.insert_one(lead_dict)
    lead_dict["_id"] = result.inserted_id
    lead_id = str(result.inserted_id)
    
    # Send WhatsApp if enabled and requested
    if lead.send_whatsapp and lead.whatsapp_consent:
        config = await db.crm_config.find_one({})
        if config and config.get("whatsapp_enabled"):
            template = config.get("whatsapp_template_on_create", "Hello {name}, thank you for your interest!")
            message = template.replace("{name}", lead.name)
            await send_mock_whatsapp(lead_id, lead.name, message, str(current_user["_id"]))
    
    # Create initial activity log
    activity = {
        "lead_id": lead_id,
        "activity_type": LeadActivityType.NOTE,
        "title": "Lead Created",
        "description": f"Lead created by {current_user['full_name']}",
        "performed_by": str(current_user["_id"]),
        "created_at": datetime.utcnow()
    }
    await db.lead_activities.insert_one(activity)
    
    # Prepare response
    lead_dict = serialize_doc(lead_dict)
    lead_dict["category_name"] = category["name"]
    lead_dict["category_color"] = category.get("color", "#6B7280")
    lead_dict["created_by_name"] = current_user["full_name"]
    lead_dict["activities_count"] = 1
    lead_dict["last_activity"] = datetime.utcnow()
    
    if lead_dict.get("assigned_to"):
        assignee = await get_user_by_id(lead_dict["assigned_to"])
        lead_dict["assigned_to_name"] = assignee["full_name"] if assignee else None
    
    return LeadResponse(**lead_dict)

@api_router.get("/crm/leads/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get a single lead by ID"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and PMs can access CRM")
    
    lead = await db.leads.find_one({"_id": ObjectId(lead_id), "is_deleted": {"$ne": True}})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    lead_dict = serialize_doc(lead)
    
    # Get category info
    if lead_dict.get("category_id"):
        category = await db.lead_categories.find_one({"_id": ObjectId(lead_dict["category_id"])})
        if category:
            lead_dict["category_name"] = category["name"]
            lead_dict["category_color"] = category.get("color", "#6B7280")
    
    # Get assigned user info
    if lead_dict.get("assigned_to"):
        assignee = await get_user_by_id(lead_dict["assigned_to"])
        lead_dict["assigned_to_name"] = assignee["full_name"] if assignee else None
    
    # Get created by info
    creator = await get_user_by_id(lead_dict["created_by"])
    lead_dict["created_by_name"] = creator["full_name"] if creator else "Unknown"
    
    # Get activity stats
    activities_count = await db.lead_activities.count_documents({"lead_id": lead_dict["id"]})
    lead_dict["activities_count"] = activities_count
    
    last_activity = await db.lead_activities.find_one(
        {"lead_id": lead_dict["id"]},
        sort=[("created_at", -1)]
    )
    lead_dict["last_activity"] = last_activity["created_at"] if last_activity else None
    
    return LeadResponse(**lead_dict)

@api_router.put("/crm/leads/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: str,
    lead_update: LeadUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a lead with field audit logging"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and PMs can update leads")
    
    existing = await db.leads.find_one({"_id": ObjectId(lead_id), "is_deleted": {"$ne": True}})
    if not existing:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    update_data = lead_update.dict(exclude_unset=True)
    
    # Create field audit logs
    for field_name, new_value in update_data.items():
        old_value = existing.get(field_name)
        if old_value != new_value:
            audit = {
                "lead_id": lead_id,
                "field_name": field_name,
                "old_value": str(old_value) if old_value else None,
                "new_value": str(new_value) if new_value else None,
                "changed_by": str(current_user["_id"]),
                "changed_at": datetime.utcnow()
            }
            await db.lead_field_audits.insert_one(audit)
            
            # Create activity for status change
            if field_name == "status":
                activity = {
                    "lead_id": lead_id,
                    "activity_type": LeadActivityType.STATUS_CHANGE,
                    "title": "Status Changed",
                    "description": f"Status changed from {old_value} to {new_value}",
                    "performed_by": str(current_user["_id"]),
                    "created_at": datetime.utcnow()
                }
                await db.lead_activities.insert_one(activity)
    
    update_data["updated_at"] = datetime.utcnow()
    
    await db.leads.update_one(
        {"_id": ObjectId(lead_id)},
        {"$set": update_data}
    )
    
    # Return updated lead
    return await get_lead(lead_id, credentials)

@api_router.delete("/crm/leads/{lead_id}")
async def delete_lead(
    lead_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Soft delete a lead (Admin only)"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can delete leads")
    
    existing = await db.leads.find_one({"_id": ObjectId(lead_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    await db.leads.update_one(
        {"_id": ObjectId(lead_id)},
        {"$set": {"is_deleted": True, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Lead deleted successfully"}

# ============= Lead Activity Routes =============

@api_router.get("/crm/leads/{lead_id}/activities", response_model=List[LeadActivityResponse])
async def get_lead_activities(
    lead_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get activity timeline for a lead"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and PMs can access CRM")
    
    activities = await db.lead_activities.find({"lead_id": lead_id}).sort("created_at", -1).to_list(1000)
    
    result = []
    for activity in activities:
        activity_dict = serialize_doc(activity)
        
        # Get performed by user info
        user = await get_user_by_id(activity_dict["performed_by"])
        activity_dict["performed_by_name"] = user["full_name"] if user else "Unknown"
        
        result.append(LeadActivityResponse(**activity_dict))
    
    return result

@api_router.post("/crm/leads/{lead_id}/activities", response_model=LeadActivityResponse)
async def create_lead_activity(
    lead_id: str,
    activity: LeadActivityCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Add an activity to a lead's timeline"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and PMs can add activities")
    
    # Check if lead exists
    lead = await db.leads.find_one({"_id": ObjectId(lead_id), "is_deleted": {"$ne": True}})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    activity_dict = activity.dict()
    activity_dict["performed_by"] = str(current_user["_id"])
    activity_dict["created_at"] = datetime.utcnow()
    
    result = await db.lead_activities.insert_one(activity_dict)
    activity_dict["_id"] = result.inserted_id
    
    # Update lead's last_contacted if it's a call or meeting
    if activity.activity_type in [LeadActivityType.CALL, LeadActivityType.MEETING]:
        await db.leads.update_one(
            {"_id": ObjectId(lead_id)},
            {"$set": {"last_contacted": datetime.utcnow()}}
        )
    
    activity_dict = serialize_doc(activity_dict)
    activity_dict["performed_by_name"] = current_user["full_name"]
    
    return LeadActivityResponse(**activity_dict)

# ============= Mock Integration Routes =============

@api_router.post("/crm/leads/{lead_id}/call")
async def log_call(
    lead_id: str,
    call_data: dict,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Log a mock call activity"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    lead = await db.leads.find_one({"_id": ObjectId(lead_id), "is_deleted": {"$ne": True}})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    activity = {
        "lead_id": lead_id,
        "activity_type": LeadActivityType.CALL,
        "title": f"Call - {call_data.get('outcome', 'completed')}",
        "description": call_data.get('notes', ''),
        "call_duration": call_data.get('duration', 0),
        "call_outcome": call_data.get('outcome', 'connected'),
        "performed_by": str(current_user["_id"]),
        "created_at": datetime.utcnow()
    }
    
    result = await db.lead_activities.insert_one(activity)
    
    # Update last_contacted
    await db.leads.update_one(
        {"_id": ObjectId(lead_id)},
        {"$set": {"last_contacted": datetime.utcnow()}}
    )
    
    return {"message": "Call logged successfully", "activity_id": str(result.inserted_id)}

@api_router.post("/crm/leads/{lead_id}/whatsapp")
async def send_whatsapp(
    lead_id: str,
    whatsapp_data: dict,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Send a mock WhatsApp message"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    lead = await db.leads.find_one({"_id": ObjectId(lead_id), "is_deleted": {"$ne": True}})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if not lead.get("whatsapp_consent"):
        raise HTTPException(status_code=400, detail="Lead has not consented to WhatsApp messages")
    
    message = whatsapp_data.get("message", "")
    activity_id = await send_mock_whatsapp(lead_id, lead["name"], message, str(current_user["_id"]))
    
    # Update last_contacted
    await db.leads.update_one(
        {"_id": ObjectId(lead_id)},
        {"$set": {"last_contacted": datetime.utcnow()}}
    )
    
    return {"message": "WhatsApp message sent (mock)", "activity_id": activity_id}

# ============= Bulk Operations Routes =============

@api_router.post("/crm/leads/bulk-update")
async def bulk_update_leads(
    bulk_data: LeadBulkUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Bulk update multiple leads"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    updates = bulk_data.updates
    updates["updated_at"] = datetime.utcnow()
    
    result = await db.leads.update_many(
        {"_id": {"$in": [ObjectId(lid) for lid in bulk_data.lead_ids]}, "is_deleted": {"$ne": True}},
        {"$set": updates}
    )
    
    return {"message": f"Updated {result.modified_count} leads"}

@api_router.post("/crm/leads/bulk-assign")
async def bulk_assign_leads(
    bulk_data: LeadBulkAssign,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Bulk assign leads to a user"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    # Check if assigned user exists
    assignee = await get_user_by_id(bulk_data.assigned_to)
    if not assignee:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.leads.update_many(
        {"_id": {"$in": [ObjectId(lid) for lid in bulk_data.lead_ids]}, "is_deleted": {"$ne": True}},
        {"$set": {"assigned_to": bulk_data.assigned_to, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": f"Assigned {result.modified_count} leads to {assignee['full_name']}"}

@api_router.post("/crm/leads/import", response_model=LeadImportResponse)
async def import_leads(
    leads: List[LeadImportItem],
    default_category_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Bulk import leads from CSV/Excel"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    # Check if category exists
    category = await db.lead_categories.find_one({"_id": ObjectId(default_category_id)})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    successful = 0
    failed = 0
    errors = []
    
    for idx, lead_item in enumerate(leads):
        try:
            lead_dict = lead_item.dict()
            lead_dict["category_id"] = default_category_id
            lead_dict["status"] = LeadStatus.NEW
            lead_dict["priority"] = LeadPriority.MEDIUM
            lead_dict["created_by"] = str(current_user["_id"])
            lead_dict["created_at"] = datetime.utcnow()
            lead_dict["updated_at"] = datetime.utcnow()
            lead_dict["is_deleted"] = False
            
            await db.leads.insert_one(lead_dict)
            successful += 1
        except Exception as e:
            failed += 1
            errors.append(f"Row {idx + 1}: {str(e)}")
    
    return LeadImportResponse(
        total=len(leads),
        successful=successful,
        failed=failed,
        errors=errors
    )

# ============= CRM Configuration Routes =============

@api_router.get("/crm/config", response_model=CRMConfigResponse)
async def get_crm_config(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get CRM configuration"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can access CRM config")
    
    config = await db.crm_config.find_one({})
    
    if not config:
        # Create default config
        default_config = {
            "whatsapp_enabled": False,
            "whatsapp_api_key": None,
            "whatsapp_template_on_create": "Hello {name}, thank you for your interest! We'll get back to you soon.",
            "telephony_enabled": False,
            "telephony_provider": "mock",
            "auto_assign_enabled": False,
            "auto_assign_strategy": "round_robin",
            "updated_by": str(current_user["_id"]),
            "updated_at": datetime.utcnow()
        }
        result = await db.crm_config.insert_one(default_config)
        default_config["_id"] = result.inserted_id
        config = default_config
    
    config_dict = serialize_doc(config)
    
    # Get updated by user info
    user = await get_user_by_id(config_dict["updated_by"])
    config_dict["updated_by_name"] = user["full_name"] if user else "Unknown"
    
    return CRMConfigResponse(**config_dict)

@api_router.put("/crm/config", response_model=CRMConfigResponse)
async def update_crm_config(
    config_update: CRMConfigUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update CRM configuration (Admin only)"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can update CRM config")
    
    existing = await db.crm_config.find_one({})
    
    update_data = config_update.dict(exclude_unset=True)
    update_data["updated_by"] = str(current_user["_id"])
    update_data["updated_at"] = datetime.utcnow()
    
    if existing:
        await db.crm_config.update_one(
            {"_id": existing["_id"]},
            {"$set": update_data}
        )
    else:
        result = await db.crm_config.insert_one(update_data)
        update_data["_id"] = result.inserted_id
    
    return await get_crm_config(credentials)



# ============= Dashboard Stats Route =============

@api_router.get("/crm/dashboard/stats", response_model=CRMDashboardStats)
async def get_crm_dashboard_stats(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get CRM dashboard statistics"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    # Total leads
    total_leads = await db.leads.count_documents({"is_deleted": {"$ne": True}})
    
    # Leads by stage (category)
    leads_by_stage = {}
    categories = await db.lead_categories.find({"is_active": True}).to_list(100)
    for cat in categories:
        count = await db.leads.count_documents({"category_id": str(cat["_id"]), "is_deleted": {"$ne": True}})
        leads_by_stage[cat["name"]] = count
    
    # Leads by status
    leads_by_status = {}
    for status in LeadStatus:
        count = await db.leads.count_documents({"status": status, "is_deleted": {"$ne": True}})
        leads_by_status[status.value] = count
    
    # Leads by priority
    leads_by_priority = {}
    for priority in LeadPriority:
        count = await db.leads.count_documents({"priority": priority, "is_deleted": {"$ne": True}})
        leads_by_priority[priority.value] = count
    
    # New leads this week/month
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    new_leads_this_week = await db.leads.count_documents({
        "created_at": {"$gte": week_ago},
        "is_deleted": {"$ne": True}
    })
    new_leads_this_month = await db.leads.count_documents({
        "created_at": {"$gte": month_ago},
        "is_deleted": {"$ne": True}
    })
    
    # Conversion rate (won / total)
    won_count = await db.leads.count_documents({"status": LeadStatus.WON, "is_deleted": {"$ne": True}})
    conversion_rate = (won_count / total_leads * 100) if total_leads > 0 else 0.0
    
    # Average lead value
    pipeline = [
        {"$match": {"is_deleted": {"$ne": True}, "budget": {"$ne": None}}},
        {"$group": {"_id": None, "avg_value": {"$avg": "$budget"}}}
    ]
    result = await db.leads.aggregate(pipeline).to_list(1)
    avg_lead_value = result[0]["avg_value"] if result else 0.0
    
    # Top sources
    pipeline = [
        {"$match": {"is_deleted": {"$ne": True}}},
        {"$group": {"_id": "$source", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    top_sources = await db.leads.aggregate(pipeline).to_list(5)
    top_sources_list = [{"source": item["_id"], "count": item["count"]} for item in top_sources]
    
    return CRMDashboardStats(
        total_leads=total_leads,
        leads_by_stage=leads_by_stage,
        leads_by_status=leads_by_status,
        leads_by_priority=leads_by_priority,
        new_leads_this_week=new_leads_this_week,
        new_leads_this_month=new_leads_this_month,
        conversion_rate=conversion_rate,
        avg_lead_value=avg_lead_value,
        top_sources=top_sources_list
    )

# ============= Custom Fields Routes =============

@api_router.get("/crm/custom-fields", response_model=List[CustomFieldResponse])
async def get_custom_fields(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all custom fields"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    fields = await db.custom_fields.find({"is_active": True}).sort("order", 1).to_list(100)
    return [CustomFieldResponse(**serialize_doc(field)) for field in fields]

@api_router.post("/crm/custom-fields", response_model=CustomFieldResponse)
async def create_custom_field(
    field: CustomFieldCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a custom field (Admin only)"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can create custom fields")
    
    field_dict = field.dict()
    field_dict["created_at"] = datetime.utcnow()
    field_dict["updated_at"] = datetime.utcnow()
    
    result = await db.custom_fields.insert_one(field_dict)
    field_dict["_id"] = result.inserted_id
    
    return CustomFieldResponse(**serialize_doc(field_dict))

@api_router.put("/crm/custom-fields/{field_id}", response_model=CustomFieldResponse)
async def update_custom_field(
    field_id: str,
    field_update: CustomFieldUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a custom field (Admin only)"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can update custom fields")
    
    existing = await db.custom_fields.find_one({"_id": ObjectId(field_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Custom field not found")
    
    update_data = field_update.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    await db.custom_fields.update_one(
        {"_id": ObjectId(field_id)},
        {"$set": update_data}
    )
    
    updated_field = await db.custom_fields.find_one({"_id": ObjectId(field_id)})
    return CustomFieldResponse(**serialize_doc(updated_field))

@api_router.delete("/crm/custom-fields/{field_id}")
async def delete_custom_field(
    field_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a custom field (Admin only)"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can delete custom fields")
    
    await db.custom_fields.update_one(
        {"_id": ObjectId(field_id)},
        {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Custom field deleted successfully"}

# ============= Funnel Management Routes =============

@api_router.get("/crm/funnels", response_model=List[FunnelResponse])
async def get_funnels(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all funnels"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    funnels = await db.funnels.find({"is_active": True}).to_list(100)
    
    result = []
    for funnel in funnels:
        funnel_dict = serialize_doc(funnel)
        
        # Get creator info
        creator = await get_user_by_id(funnel_dict["created_by"])
        funnel_dict["created_by_name"] = creator["full_name"] if creator else "Unknown"
        
        # Get category names
        category_names = []
        if funnel_dict.get("category_ids"):
            for cat_id in funnel_dict["category_ids"]:
                try:
                    category = await db.lead_categories.find_one({"_id": ObjectId(cat_id)})
                    if category:
                        category_names.append(category["name"])
                except:
                    pass
        funnel_dict["category_names"] = category_names
        
        # Count leads in this funnel
        lead_count = await db.leads.count_documents({"funnel_id": funnel_dict["id"], "is_deleted": {"$ne": True}})
        funnel_dict["lead_count"] = lead_count
        
        # Calculate conversion rate
        won_count = await db.leads.count_documents({"funnel_id": funnel_dict["id"], "status": LeadStatus.WON, "is_deleted": {"$ne": True}})
        funnel_dict["conversion_rate"] = (won_count / lead_count * 100) if lead_count > 0 else 0.0
        
        result.append(FunnelResponse(**funnel_dict))
    
    return result

@api_router.post("/crm/funnels", response_model=FunnelResponse)
async def create_funnel(
    funnel: FunnelCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new funnel (Admin/Manager)"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and managers can create funnels")
    
    funnel_dict = funnel.dict()
    funnel_dict["created_by"] = str(current_user["_id"])
    funnel_dict["created_at"] = datetime.utcnow()
    funnel_dict["updated_at"] = datetime.utcnow()
    
    result = await db.funnels.insert_one(funnel_dict)
    funnel_dict["_id"] = result.inserted_id
    
    funnel_dict = serialize_doc(funnel_dict)
    funnel_dict["created_by_name"] = current_user["full_name"]
    funnel_dict["lead_count"] = 0
    funnel_dict["conversion_rate"] = 0.0
    
    # Get category names
    category_names = []
    if funnel_dict.get("category_ids"):
        for cat_id in funnel_dict["category_ids"]:
            try:
                category = await db.lead_categories.find_one({"_id": ObjectId(cat_id)})
                if category:
                    category_names.append(category["name"])
            except:
                pass
    funnel_dict["category_names"] = category_names
    
    return FunnelResponse(**funnel_dict)

@api_router.get("/crm/funnels/{funnel_id}", response_model=FunnelResponse)
async def get_funnel(
    funnel_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get a single funnel"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    funnel = await db.funnels.find_one({"_id": ObjectId(funnel_id), "is_active": True})
    if not funnel:
        raise HTTPException(status_code=404, detail="Funnel not found")
    
    funnel_dict = serialize_doc(funnel)
    
    creator = await get_user_by_id(funnel_dict["created_by"])
    funnel_dict["created_by_name"] = creator["full_name"] if creator else "Unknown"
    
    lead_count = await db.leads.count_documents({"funnel_id": funnel_dict["id"], "is_deleted": {"$ne": True}})
    funnel_dict["lead_count"] = lead_count
    
    won_count = await db.leads.count_documents({"funnel_id": funnel_dict["id"], "status": LeadStatus.WON, "is_deleted": {"$ne": True}})
    funnel_dict["conversion_rate"] = (won_count / lead_count * 100) if lead_count > 0 else 0.0
    
    return FunnelResponse(**funnel_dict)

@api_router.put("/crm/funnels/{funnel_id}", response_model=FunnelResponse)
async def update_funnel(
    funnel_id: str,
    funnel_update: FunnelUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a funnel (Admin/Manager)"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and managers can update funnels")
    
    existing = await db.funnels.find_one({"_id": ObjectId(funnel_id), "is_active": True})
    if not existing:
        raise HTTPException(status_code=404, detail="Funnel not found")
    
    update_data = funnel_update.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    await db.funnels.update_one(
        {"_id": ObjectId(funnel_id)},
        {"$set": update_data}
    )
    
    return await get_funnel(funnel_id, credentials)

@api_router.delete("/crm/funnels/{funnel_id}")
async def delete_funnel(
    funnel_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a funnel (Admin only)"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can delete funnels")
    
    await db.funnels.update_one(
        {"_id": ObjectId(funnel_id)},
        {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Funnel deleted successfully"}

@api_router.post("/crm/funnels/{funnel_id}/clone", response_model=FunnelResponse)
async def clone_funnel(
    funnel_id: str,
    new_name: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Clone an existing funnel"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and managers can clone funnels")
    
    existing = await db.funnels.find_one({"_id": ObjectId(funnel_id), "is_active": True})
    if not existing:
        raise HTTPException(status_code=404, detail="Funnel not found")
    
    # Clone funnel
    cloned = dict(existing)
    del cloned["_id"]
    cloned["name"] = new_name
    cloned["created_by"] = str(current_user["_id"])
    cloned["created_at"] = datetime.utcnow()
    cloned["updated_at"] = datetime.utcnow()
    
    result = await db.funnels.insert_one(cloned)
    cloned["_id"] = result.inserted_id
    
    cloned_dict = serialize_doc(cloned)
    cloned_dict["created_by_name"] = current_user["full_name"]
    cloned_dict["lead_count"] = 0
    cloned_dict["conversion_rate"] = 0.0
    
    return FunnelResponse(**cloned_dict)

@api_router.get("/crm/funnels/{funnel_id}/analytics", response_model=FunnelAnalytics)
async def get_funnel_analytics(
    funnel_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get funnel analytics with stage statistics"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    funnel = await db.funnels.find_one({"_id": ObjectId(funnel_id), "is_active": True})
    if not funnel:
        raise HTTPException(status_code=404, detail="Funnel not found")
    
    total_leads = await db.leads.count_documents({"funnel_id": funnel_id, "is_deleted": {"$ne": True}})
    
    stage_stats = []
    for stage in funnel.get("stages", []):
        # Count leads in this stage (using funnel_stage field)
        stage_leads = await db.leads.count_documents({
            "funnel_id": funnel_id,
            "funnel_stage": stage["name"],
            "is_deleted": {"$ne": True}
        })
        
        # Calculate average duration (mock for now)
        avg_duration = None
        if stage.get("expected_duration_days"):
            avg_duration = float(stage["expected_duration_days"])
        
        # Calculate stage conversion rate
        conversion_rate = (stage_leads / total_leads * 100) if total_leads > 0 else 0.0
        
        stage_stats.append(FunnelStageStats(
            stage_name=stage["name"],
            stage_order=stage["order"],
            lead_count=stage_leads,
            avg_duration_days=avg_duration,
            conversion_rate=conversion_rate
        ))
    
    # Overall conversion rate
    won_count = await db.leads.count_documents({"funnel_id": funnel_id, "status": LeadStatus.WON, "is_deleted": {"$ne": True}})
    overall_conversion_rate = (won_count / total_leads * 100) if total_leads > 0 else 0.0
    
    return FunnelAnalytics(
        funnel_id=funnel_id,
        funnel_name=funnel["name"],
        total_leads=total_leads,
        stage_stats=stage_stats,
        overall_conversion_rate=overall_conversion_rate
    )

# ============= Permission Matrix Routes =============

@api_router.get("/crm/permissions/matrix", response_model=PermissionMatrixResponse)
async def get_permission_matrix(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get CRM permission matrix for all roles"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can view permission matrix")
    
    # Define default permission matrix
    matrix = [
        RolePermissions(
            role=UserRole.ADMIN,
            permissions=[
                CRMPermission.VIEW_LEADS,
                CRMPermission.CREATE_LEADS,
                CRMPermission.EDIT_LEADS,
                CRMPermission.DELETE_LEADS,
                CRMPermission.MOVE_TO_PROJECT,
                CRMPermission.BYPASS_REQUIRED_FIELDS,
                CRMPermission.MANAGE_FUNNELS,
                CRMPermission.MANAGE_CUSTOM_FIELDS,
                CRMPermission.ACCESS_CRM_SETTINGS,
                CRMPermission.VIEW_ANALYTICS,
                CRMPermission.EXPORT_LEADS,
                CRMPermission.IMPORT_LEADS,
            ]
        ),
        RolePermissions(
            role=UserRole.PROJECT_MANAGER,
            permissions=[
                CRMPermission.VIEW_LEADS,
                CRMPermission.CREATE_LEADS,
                CRMPermission.EDIT_LEADS,
                CRMPermission.MOVE_TO_PROJECT,
                CRMPermission.MANAGE_FUNNELS,
                CRMPermission.ACCESS_CRM_SETTINGS,
                CRMPermission.VIEW_ANALYTICS,
                CRMPermission.EXPORT_LEADS,
                CRMPermission.IMPORT_LEADS,
            ]
        ),
        RolePermissions(
            role=UserRole.WORKER,
            permissions=[]
        ),
        RolePermissions(
            role=UserRole.VENDOR,
            permissions=[]
        ),
    ]
    
    return PermissionMatrixResponse(matrix=matrix)

# ============= Lead Import/Export Routes =============

@api_router.post("/crm/leads/export")
async def export_leads(
    export_request: LeadExportRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Export leads to CSV or JSON"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    # Build query
    query = {"is_deleted": {"$ne": True}}
    if export_request.filter_by_category:
        query["category_id"] = export_request.filter_by_category
    if export_request.filter_by_status:
        query["status"] = export_request.filter_by_status
    if export_request.filter_by_funnel:
        query["funnel_id"] = export_request.filter_by_funnel
    
    leads = await db.leads.find(query).to_list(10000)
    
    if export_request.format == "csv":
        import csv
        import io
        
        output = io.StringIO()
        if leads:
            fieldnames = ["name", "primary_phone", "email", "city", "budget", "status", "priority", "source", "created_at"]
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            
            for lead in leads:
                writer.writerow({
                    "name": lead.get("name", ""),
                    "primary_phone": lead.get("primary_phone", ""),
                    "email": lead.get("email", ""),
                    "city": lead.get("city", ""),
                    "budget": lead.get("budget", ""),
                    "status": lead.get("status", ""),
                    "priority": lead.get("priority", ""),
                    "source": lead.get("source", ""),
                    "created_at": lead.get("created_at", "").isoformat() if lead.get("created_at") else "",
                })
        
        return {"format": "csv", "data": output.getvalue(), "count": len(leads)}
    else:
        # JSON format
        leads_json = [serialize_doc(lead) for lead in leads]
        return {"format": "json", "data": leads_json, "count": len(leads)}

@api_router.post("/crm/leads/import", response_model=LeadImportResponse)
async def import_leads(
    import_request: LeadImportRequest,
    leads_data: List[Dict[str, Any]],
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Import leads from CSV, Excel, or Meta"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    successful = 0
    failed = 0
    errors = []
    
    for idx, lead_data in enumerate(leads_data):
        try:
            # Validate required fields
            if not lead_data.get("name") or not lead_data.get("primary_phone"):
                errors.append(f"Row {idx + 1}: Missing required fields (name or phone)")
                failed += 1
                continue
            
            # Prepare lead document
            lead_dict = {
                "name": lead_data.get("name"),
                "primary_phone": lead_data.get("primary_phone"),
                "alternate_phone": lead_data.get("alternate_phone"),
                "email": lead_data.get("email"),
                "city": lead_data.get("city"),
                "state": lead_data.get("state"),
                "budget": lead_data.get("budget"),
                "budget_currency": lead_data.get("budget_currency", "INR"),
                "requirement": lead_data.get("requirement"),
                "status": LeadStatus.NEW,
                "priority": LeadPriority.MEDIUM,
                "source": lead_data.get("source", LeadSource.OTHER),
                "tags": lead_data.get("tags", []),
                "created_by": str(current_user["_id"]),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "is_deleted": False,
            }
            
            # Set category or funnel
            if import_request.default_category_id:
                lead_dict["category_id"] = import_request.default_category_id
            if import_request.default_funnel_id:
                lead_dict["funnel_id"] = import_request.default_funnel_id
            
            await db.leads.insert_one(lead_dict)
            successful += 1
            
        except Exception as e:
            failed += 1
            errors.append(f"Row {idx + 1}: {str(e)}")
    
    return LeadImportResponse(
        total=len(leads_data),
        successful=successful,
        failed=failed,
        errors=errors[:10]  # Limit to first 10 errors
    )

# ============= System Labels Routes =============

@api_router.get("/crm/system-labels", response_model=SystemLabelsResponse)
async def get_system_labels(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get customizable system labels"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    # Get custom labels from config or use defaults
    config = await db.crm_config.find_one({})
    custom_labels = config.get("system_labels", {}) if config else {}
    
    # Default labels
    default_labels = {
        SystemLabel.LEAD: "Lead",
        SystemLabel.LEADS: "Leads",
        SystemLabel.CATEGORY: "Category",
        SystemLabel.CATEGORIES: "Categories",
        SystemLabel.FUNNEL: "Funnel",
        SystemLabel.FUNNELS: "Funnels",
        SystemLabel.STATUS: "Status",
        SystemLabel.PRIORITY: "Priority",
        SystemLabel.SOURCE: "Source",
    }
    
    # Merge custom labels with defaults
    labels = {k.value: custom_labels.get(k.value, v) for k, v in default_labels.items()}
    
    return SystemLabelsResponse(labels=labels)

@api_router.put("/crm/system-labels")
async def update_system_labels(
    label_updates: List[SystemLabelUpdate],
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update system labels (Admin only)"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can update system labels")
    
    # Get existing config
    config = await db.crm_config.find_one({})
    system_labels = config.get("system_labels", {}) if config else {}
    
    # Update labels
    for label_update in label_updates:
        system_labels[label_update.label_key.value] = label_update.custom_value
    
    # Save to config
    if config:
        await db.crm_config.update_one(
            {"_id": config["_id"]},
            {"$set": {"system_labels": system_labels, "updated_at": datetime.utcnow()}}
        )
    else:
        await db.crm_config.insert_one({
            "system_labels": system_labels,
            "updated_by": str(current_user["_id"]),
            "updated_at": datetime.utcnow()
        })
    
    return {"message": "System labels updated successfully"}


# ============= Audit Logging Routes =============

async def create_audit_log(
    action_type: AuditActionType,
    description: str,
    entity_type: str,
    entity_id: str,
    user: dict,
    old_data: Any = None,
    new_data: Any = None,
    bypass_reason: str = None,
    is_financial: bool = False
):
    """Helper function to create audit log entries"""
    audit_entry = {
        "action_type": action_type,
        "action_description": description,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "user_id": str(user["_id"]),
        "user_role": user["role"],
        "old_data": old_data,
        "new_data": new_data,
        "bypass_reason": bypass_reason,
        "is_financial_action": is_financial,
        "is_reversible": not is_financial,  # Financial actions not reversible
        "created_at": datetime.utcnow()
    }
    result = await db.audit_logs.insert_one(audit_entry)
    return str(result.inserted_id)

@api_router.get("/crm/audit-logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    action_type: Optional[AuditActionType] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    user_id: Optional[str] = None,
    is_financial_action: Optional[bool] = None,
    limit: int = 100,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get audit logs with filtering (Admin only)"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can view audit logs")
    
    query = {}
    if action_type:
        query["action_type"] = action_type
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id
    if user_id:
        query["user_id"] = user_id
    if is_financial_action is not None:
        query["is_financial_action"] = is_financial_action
    
    logs = await db.audit_logs.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    
    result = []
    for log in logs:
        log_dict = serialize_doc(log)
        
        # Get user name
        user = await get_user_by_id(log_dict["user_id"])
        log_dict["user_name"] = user["full_name"] if user else "Unknown"
        
        result.append(AuditLogResponse(**log_dict))
    
    return result

@api_router.post("/crm/audit-logs/export")
async def export_audit_logs(
    filter: AuditLogFilter,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Export audit logs to CSV (Admin only)"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can export audit logs")
    
    query = {}
    if filter.action_type:
        query["action_type"] = filter.action_type
    if filter.entity_type:
        query["entity_type"] = filter.entity_type
    if filter.entity_id:
        query["entity_id"] = filter.entity_id
    if filter.user_id:
        query["user_id"] = filter.user_id
    if filter.is_financial_action is not None:
        query["is_financial_action"] = filter.is_financial_action
    if filter.start_date:
        query["created_at"] = {"$gte": filter.start_date}
    if filter.end_date:
        query.setdefault("created_at", {})["$lte"] = filter.end_date
    
    logs = await db.audit_logs.find(query).sort("created_at", -1).to_list(10000)
    
    import csv
    import io
    
    output = io.StringIO()
    if logs:
        fieldnames = ["created_at", "action_type", "action_description", "entity_type", "entity_id", "user_id", "user_role", "bypass_reason"]
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        
        for log in logs:
            writer.writerow({
                "created_at": log.get("created_at", "").isoformat() if log.get("created_at") else "",
                "action_type": log.get("action_type", ""),
                "action_description": log.get("action_description", ""),
                "entity_type": log.get("entity_type", ""),
                "entity_id": log.get("entity_id", ""),
                "user_id": log.get("user_id", ""),
                "user_role": log.get("user_role", ""),
                "bypass_reason": log.get("bypass_reason", ""),
            })
    
    return {"format": "csv", "data": output.getvalue(), "count": len(logs)}

# ============= Move Lead to Project Routes =============

@api_router.post("/crm/leads/move-to-project", response_model=MoveLeadToProjectResponse)
async def move_lead_to_project(
    request: MoveLeadToProjectRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Move a lead to a project with mandatory bank transaction (or admin bypass)"""
    current_user = await get_current_user(credentials)
    
    # Check permission
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and PMs can move leads to projects")
    
    # Get lead
    lead = await db.leads.find_one({"_id": ObjectId(request.lead_id), "is_deleted": {"$ne": True}})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Validate bank transaction requirement
    if not request.bypass_transaction and not request.bank_transaction:
        raise HTTPException(
            status_code=400,
            detail="Bank transaction details are required. Only admins can bypass this requirement."
        )
    
    # Validate bypass permission
    if request.bypass_transaction:
        if current_user["role"] != UserRole.ADMIN:
            raise HTTPException(
                status_code=403,
                detail="Only admins can bypass the bank transaction requirement"
            )
        if not request.bypass_reason:
            raise HTTPException(
                status_code=400,
                detail="Bypass reason is required when skipping bank transaction"
            )
    
    # Validate bank transaction if provided
    if request.bank_transaction:
        if request.bank_transaction.amount <= 0:
            raise HTTPException(status_code=400, detail="Transaction amount must be positive")
        if request.bank_transaction.transaction_date > datetime.utcnow():
            raise HTTPException(status_code=400, detail="Transaction date cannot be in the future")
    
    # Create project from lead
    project_data = {
        "name": request.project_name,
        "description": request.project_description or lead.get("requirement", ""),
        "start_date": datetime.utcnow(),
        "status": "planning",
        "created_by": str(current_user["_id"]),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "source_lead_id": request.lead_id,
    }
    
    # Copy lead fields to project
    if "name" in request.copy_fields and lead.get("name"):
        project_data["client_name"] = lead["name"]
    if "primary_phone" in request.copy_fields and lead.get("primary_phone"):
        project_data["client_phone"] = lead["primary_phone"]
    if "email" in request.copy_fields and lead.get("email"):
        project_data["client_email"] = lead["email"]
    if "city" in request.copy_fields and lead.get("city"):
        project_data["location"] = lead["city"]
    if "budget" in request.copy_fields and lead.get("budget"):
        project_data["budget"] = lead["budget"]
    
    # Insert project
    project_result = await db.projects.insert_one(project_data)
    project_id = str(project_result.inserted_id)
    
    # Handle bank transaction
    transaction_id = None
    if request.bank_transaction:
        # Mask account number
        account_number = request.bank_transaction.account_number
        masked_account = account_number[:2] + "*" * (len(account_number) - 4) + account_number[-2:]
        
        # Create bank transaction record
        transaction_data = request.bank_transaction.dict()
        transaction_data["project_id"] = project_id
        transaction_data["lead_id"] = request.lead_id
        transaction_data["account_number_masked"] = masked_account
        transaction_data["recorded_by"] = str(current_user["_id"])
        transaction_data["created_at"] = datetime.utcnow()
        
        trans_result = await db.bank_transactions.insert_one(transaction_data)
        transaction_id = str(trans_result.inserted_id)
        
        # Create audit log for bank transaction
        await create_audit_log(
            action_type=AuditActionType.BANK_TRANSACTION,
            description=f"Bank transaction recorded: {request.bank_transaction.bank_name} - {transaction_data['amount']}",
            entity_type="transaction",
            entity_id=transaction_id,
            user=current_user,
            new_data={
                "bank_name": request.bank_transaction.bank_name,
                "amount": request.bank_transaction.amount,
                "transaction_id": request.bank_transaction.transaction_id,
                "project_id": project_id
            },
            is_financial=True
        )
    
    # Create audit log for lead to project move
    await create_audit_log(
        action_type=AuditActionType.LEAD_TO_PROJECT,
        description=f"Lead '{lead.get('name')}' moved to project '{request.project_name}'",
        entity_type="lead",
        entity_id=request.lead_id,
        user=current_user,
        old_data={"status": lead.get("status")},
        new_data={"status": "converted", "project_id": project_id},
        bypass_reason=request.bypass_reason if request.bypass_transaction else None,
        is_financial=True
    )
    
    # If bypassed, create separate audit log
    if request.bypass_transaction:
        await create_audit_log(
            action_type=AuditActionType.BYPASS_REQUIRED_FIELD,
            description=f"Admin bypassed bank transaction requirement. Reason: {request.bypass_reason}",
            entity_type="project",
            entity_id=project_id,
            user=current_user,
            bypass_reason=request.bypass_reason,
            is_financial=True
        )
    
    # Update lead status
    await db.leads.update_one(
        {"_id": ObjectId(request.lead_id)},
        {"$set": {
            "status": LeadStatus.WON,
            "converted_to_project_id": project_id,
            "conversion_date": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Create activity log
    activity = {
        "lead_id": request.lead_id,
        "activity_type": LeadActivityType.STATUS_CHANGE,
        "title": "Converted to Project",
        "description": f"Lead converted to project: {request.project_name}",
        "performed_by": str(current_user["_id"]),
        "created_at": datetime.utcnow()
    }
    await db.lead_activities.insert_one(activity)
    
    return MoveLeadToProjectResponse(
        success=True,
        project_id=project_id,
        project_name=request.project_name,
        transaction_id=transaction_id,
        bypassed=request.bypass_transaction,
        message=f"Lead successfully converted to project{' (bank transaction bypassed)' if request.bypass_transaction else ''}"
    )

@api_router.get("/crm/leads/{lead_id}/can-convert")
async def check_lead_conversion_eligibility(
    lead_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Check if a lead can be converted to a project"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    lead = await db.leads.find_one({"_id": ObjectId(lead_id), "is_deleted": {"$ne": True}})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Check if already converted
    if lead.get("converted_to_project_id"):
        return {
            "can_convert": False,
            "reason": "Lead has already been converted to a project",
            "existing_project_id": lead.get("converted_to_project_id")
        }
    
    # Check lead status
    if lead.get("status") == LeadStatus.LOST:
        return {
            "can_convert": False,
            "reason": "Cannot convert a lost lead to a project"
        }
    
    # Check user permissions
    can_bypass = current_user["role"] == UserRole.ADMIN
    
    return {
        "can_convert": True,
        "can_bypass_transaction": can_bypass,
        "lead_name": lead.get("name"),
        "lead_budget": lead.get("budget"),
        "lead_status": lead.get("status")
    }


# ============= Chat/Messaging Endpoints =============

@api_router.get("/projects/{project_id}/conversation", response_model=ConversationResponse)
async def get_or_create_conversation(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get or create a conversation for a project"""
    # Check if project exists
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if conversation already exists
    existing_conv = await db.conversations.find_one({"project_id": project_id})
    
    if existing_conv:
        conv_dict = serialize_doc(existing_conv)
        # Ensure participants are strings for compatibility
        conv_dict["participants"] = [str(p) for p in conv_dict.get("participants", [])]
        message_count = await db.messages.count_documents({"conversation_id": conv_dict["id"]})
        conv_dict["message_count"] = message_count
        return ConversationResponse(**conv_dict)
    
    # Create new conversation
    # Get all project participants (ensure all IDs are strings)
    participants = []
    participant_names = []
    
    # Add project owner
    if project.get("owner_id"):
        owner_id = str(project["owner_id"])
        participants.append(owner_id)
        owner = await db.users.find_one({"_id": ObjectId(project["owner_id"])})
        if owner:
            participant_names.append(owner.get("full_name", owner.get("name", "Unknown")))
    
    # Add manager
    if project.get("manager_id"):
        manager_id = str(project["manager_id"])
        if manager_id not in participants:
            participants.append(manager_id)
            manager = await db.users.find_one({"_id": ObjectId(project["manager_id"])})
            if manager:
                participant_names.append(manager.get("full_name", manager.get("name", "Unknown")))
    
    # Add current user if not already in
    current_user_id = str(current_user["_id"])
    if current_user_id not in participants:
        participants.append(current_user_id)
        participant_names.append(current_user["full_name"])
    
    conv_doc = {
        "project_id": project_id,
        "project_name": project.get("name", "Unnamed Project"),
        "participants": participants,  # Already strings now
        "participant_names": participant_names,
        "last_message": None,
        "last_message_at": None,
        "last_message_sender": None,
        "unread_count": {p: 0 for p in participants},  # Already strings
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "created_by": str(current_user["_id"])  # Ensure string
    }
    
    result = await db.conversations.insert_one(conv_doc)
    conv_doc["_id"] = result.inserted_id
    
    conv_dict = serialize_doc(conv_doc)
    conv_dict["message_count"] = 0
    
    return ConversationResponse(**conv_dict)


@api_router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_messages(
    conversation_id: str,
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get messages for a conversation"""
    # Verify user is participant
    conversation = await db.conversations.find_one({"_id": ObjectId(conversation_id)})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if str(current_user["_id"]) not in conversation["participants"]:
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")
    
    # Get messages
    messages = await db.messages.find(
        {"conversation_id": conversation_id}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    
    # Mark messages as read
    message_ids = [msg["_id"] for msg in messages]
    current_user_id_str = str(current_user["_id"])
    await db.messages.update_many(
        {
            "_id": {"$in": message_ids},
            "sender_id": {"$ne": current_user_id_str},
            "read_by": {"$ne": current_user_id_str}
        },
        {
            "$addToSet": {"read_by": current_user_id_str},
            "$set": {"is_read": True}
        }
    )
    
    # Reset unread count for current user
    await db.conversations.update_one(
        {"_id": ObjectId(conversation_id)},
        {"$set": {f"unread_count.{current_user_id_str}": 0}}
    )
    
    result = []
    for msg in reversed(messages):  # Reverse to show oldest first
        msg_dict = serialize_doc(msg)
        # Ensure sender_id and read_by are strings for compatibility
        msg_dict["sender_id"] = str(msg_dict.get("sender_id", ""))
        msg_dict["read_by"] = [str(rb) for rb in msg_dict.get("read_by", [])]
        result.append(MessageResponse(**msg_dict))
    
    return result


@api_router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse)
async def send_message(
    conversation_id: str,
    message: MessageCreate,
    current_user: dict = Depends(get_current_user)
):
    """Send a message in a conversation"""
    # Verify conversation and participation
    conversation = await db.conversations.find_one({"_id": ObjectId(conversation_id)})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if str(current_user["_id"]) not in conversation["participants"]:
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")
    
    # Create message
    msg_doc = {
        "conversation_id": conversation_id,
        "sender_id": str(current_user["_id"]),
        "sender_name": current_user["full_name"],
        "sender_role": current_user.get("role", "unknown"),
        "content": message.content,
        "attachments": [att.dict() for att in message.attachments],
        "is_read": False,
        "read_by": [str(current_user["_id"])],  # Sender has read it
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.messages.insert_one(msg_doc)
    msg_doc["_id"] = result.inserted_id
    
    # Update conversation
    unread_counts = conversation.get("unread_count", {})
    for participant_id in conversation["participants"]:
        if participant_id != str(current_user["_id"]):
            # Ensure participant_id is string for dict key
            pid_str = str(participant_id)
            unread_counts[pid_str] = unread_counts.get(pid_str, 0) + 1
    
    await db.conversations.update_one(
        {"_id": ObjectId(conversation_id)},
        {
            "$set": {
                "last_message": message.content[:100],
                "last_message_at": datetime.utcnow(),
                "last_message_sender": current_user["full_name"],
                "unread_count": unread_counts,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    msg_dict = serialize_doc(msg_doc)
    return MessageResponse(**msg_dict)


@api_router.post("/messages/upload-attachment")
async def upload_message_attachment(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a file attachment for messages"""
    try:
        # Create uploads directory if not exists
        upload_dir = Path("/app/backend/uploads/chat")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        file_ext = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = upload_dir / unique_filename
        
        # Save file
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Determine file type
        file_type = "document"
        if file.content_type:
            if file.content_type.startswith("image/"):
                file_type = "image"
            elif file.content_type.startswith("video/"):
                file_type = "video"
            elif file.content_type.startswith("audio/"):
                file_type = "audio"
        
        attachment = {
            "file_name": file.filename,
            "file_url": f"/uploads/chat/{unique_filename}",
            "file_type": file_type,
            "file_size": len(content),
            "uploaded_at": datetime.utcnow().isoformat()
        }
        
        return attachment
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")


@api_router.get("/conversations", response_model=List[ConversationResponse])
async def get_user_conversations(
    current_user: dict = Depends(get_current_user)
):
    """Get all conversations for the current user"""
    conversations = await db.conversations.find(
        {"participants": str(current_user["_id"]), "is_active": True}
    ).sort("last_message_at", -1).to_list(length=100)
    
    result = []
    for conv in conversations:
        conv_dict = serialize_doc(conv)
        message_count = await db.messages.count_documents({"conversation_id": conv_dict["id"]})
        conv_dict["message_count"] = message_count
        result.append(ConversationResponse(**conv_dict))
    
    return result


# ============= Client Portal Endpoints =============

@api_router.post("/client-portal/login")
async def client_portal_login(credentials: dict):
    """Authenticate client using project ID and mobile number"""
    try:
        project_id = credentials.get("project_id")
        mobile = credentials.get("mobile")
        
        if not project_id or not mobile:
            raise HTTPException(status_code=400, detail="Project ID and mobile number required")
        
        # Find project
        project = await db.projects.find_one({"_id": ObjectId(project_id)})
        if not project:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Check if mobile matches client_phone or owner's phone
        client_phone = project.get("client_phone", "").replace(" ", "").replace("-", "").replace("+", "")
        input_mobile = mobile.replace(" ", "").replace("-", "").replace("+", "")
        
        # Also check owner's phone if client_phone doesn't match
        if client_phone != input_mobile:
            # Try to get owner's phone
            owner_id = project.get("owner_id")
            if owner_id:
                owner = await db.users.find_one({"_id": ObjectId(owner_id)})
                if owner:
                    owner_phone = owner.get("phone", "").replace(" ", "").replace("-", "").replace("+", "")
                    if owner_phone != input_mobile:
                        raise HTTPException(status_code=401, detail="Invalid credentials")
            else:
                raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Create a simple token (project_id:mobile)
        import base64
        token = base64.b64encode(f"{project_id}:{mobile}".encode()).decode()
        
        return {
            "access_token": token,
            "project_id": project_id,
            "project_name": project.get("name", ""),
            "client_name": project.get("client_name", "Client")
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def verify_client_token(token: str):
    """Verify client portal token"""
    try:
        import base64
        decoded = base64.b64decode(token).decode()
        project_id, mobile = decoded.split(":")
        
        # Verify project exists
        project = await db.projects.find_one({"_id": ObjectId(project_id)})
        if not project:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        return {"project_id": project_id, "mobile": mobile}
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")


@api_router.get("/client-portal/{project_id}")
async def get_client_portal_data(
    project_id: str,
    authorization: str = Header(None)
):
    """Get project data for client portal (requires auth)"""
    try:
        # Verify token if provided
        if authorization and authorization.startswith("Bearer "):
            token = authorization.replace("Bearer ", "")
            await verify_client_token(token)
        else:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        project = await db.projects.find_one({"_id": ObjectId(project_id)})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get timeline/milestones for Gantt chart
        milestones = await db.milestones.find(
            {"project_id": project_id}
        ).sort("order", 1).to_list(length=100)
        
        # Get conversation if exists
        conversation = await db.conversations.find_one({"project_id": project_id})
        conversation_id = str(conversation["_id"]) if conversation else None
        
        # Serialize project data
        project_dict = serialize_doc(project)
        milestones_list = [serialize_doc(m) for m in milestones]
        
        return {
            "project": project_dict,
            "milestones": milestones_list,
            "conversation_id": conversation_id,
            "has_chat": conversation_id is not None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/client-portal/conversation/{conversation_id}/messages")
async def get_client_messages(
    conversation_id: str,
    skip: int = 0,
    limit: int = 50
):
    """Get messages for client portal (simplified auth)"""
    try:
        conversation = await db.conversations.find_one({"_id": ObjectId(conversation_id)})
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Get messages
        messages = await db.messages.find(
            {"conversation_id": conversation_id}
        ).sort("created_at", 1).skip(skip).limit(limit).to_list(length=limit)
        
        result = []
        for msg in messages:
            msg_dict = serialize_doc(msg)
            msg_dict["sender_id"] = str(msg_dict.get("sender_id", ""))
            msg_dict["read_by"] = [str(rb) for rb in msg_dict.get("read_by", [])]
            result.append(msg_dict)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/client-portal/conversation/{conversation_id}/messages")
async def send_client_message(
    conversation_id: str,
    message: MessageCreate,
    client_name: str = "Client",
    client_id: str = "client_user"
):
    """Send message from client portal"""
    try:
        conversation = await db.conversations.find_one({"_id": ObjectId(conversation_id)})
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Create message
        msg_doc = {
            "conversation_id": conversation_id,
            "sender_id": client_id,
            "sender_name": client_name,
            "sender_role": "client",
            "content": message.content,
            "attachments": [att.dict() for att in message.attachments],
            "is_read": False,
            "read_by": [client_id],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await db.messages.insert_one(msg_doc)
        msg_doc["_id"] = result.inserted_id
        
        # Update conversation
        unread_counts = conversation.get("unread_count", {})
        for participant_id in conversation["participants"]:
            if participant_id != client_id:
                pid_str = str(participant_id)
                unread_counts[pid_str] = unread_counts.get(pid_str, 0) + 1
        
        await db.conversations.update_one(
            {"_id": ObjectId(conversation_id)},
            {
                "$set": {
                    "last_message": message.content[:100],
                    "last_message_at": datetime.utcnow(),
                    "last_message_sender": client_name,
                    "unread_count": unread_counts,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        msg_dict = serialize_doc(msg_doc)
        msg_dict["sender_id"] = str(msg_dict.get("sender_id", ""))
        msg_dict["read_by"] = [str(rb) for rb in msg_dict.get("read_by", [])]
        
        return msg_dict
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Include the routers in the main app (after all routes are defined)
app.include_router(api_router)

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
