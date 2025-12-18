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
import csv
import io
from fastapi.responses import StreamingResponse, Response

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
    # Labour Payments
    AdvancePaymentCreate, AdvancePaymentUpdate, AdvancePaymentResponse, AdvancePaymentStatus,
    WeeklyPaymentCreate, WeeklyPaymentUpdate, WeeklyPaymentResponse, WeeklyPaymentStatus,
    PaymentOTPLogResponse, PaymentMethodType,
    UserRole, ApprovalStatus,
    RoleCreate, RoleUpdate, RoleResponse,
    PermissionCreate, PermissionUpdate, PermissionResponse, ModuleName,
    SystemSettingCreate, SystemSettingUpdate, SystemSettingResponse,
    MilestoneCreate, MilestoneUpdate, MilestoneResponse, MilestoneStatus,
    DocumentCreate, DocumentUpdate, DocumentResponse, DocumentType,
    BudgetCreate, BudgetUpdate, BudgetResponse, BudgetCategory,
    InvoiceCreate, InvoiceUpdate, InvoiceResponse, InvoiceStatus, InvoiceItemBase,
    PaymentMethod,
    # Estimation Models
    EstimateBase, EstimateCreate, EstimateUpdate, EstimateResponse, EstimateSummary, EstimateStatus,
    EstimateLineCreate, EstimateLineUpdate, EstimateLineResponse, EstimateLineBase, BOQCategory,
    MaterialPresetCreate, MaterialPresetResponse, RateTableCreate, RateTableResponse,
    # Construction Preset Models
    ConstructionPresetCreate, ConstructionPresetUpdate, ConstructionPresetResponse,
    SpecGroupBase, SpecItemBase, BrandBase, PresetAuditLog,
    # Company Settings
    CompanySettings, CompanySettingsUpdate, CompanySettingsResponse,
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
    CRMAuditAction, CRMAuditLogCreate, CRMAuditLogResponse,
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
    ConversationCreate, ConversationResponse, MessageCreate, MessageResponse, MessageAttachment,
    # Status Update Models
    StatusUpdateCreate, StatusUpdateUpdate, StatusUpdateResponse, StatusUpdateFrequency
)
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, require_role, security,
    generate_otp, send_otp_mock, verify_otp_mock
)
from data_export_import import (
    generate_csv_template, export_data_to_csv, parse_csv_import,
    validate_import_data, EXPORT_TEMPLATES
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
        if user:
            return serialize_doc(user)
        return None
    except:
        return None

# ============= CRM Permission System =============

def is_crm_manager(user: dict) -> bool:
    """Check if user has CRM Manager role"""
    role = user.get('role')
    return role in [UserRole.ADMIN, UserRole.CRM_MANAGER]

def is_crm_user(user: dict) -> bool:
    """Check if user has CRM User role or higher"""
    role = user.get('role')
    return role in [UserRole.ADMIN, UserRole.CRM_MANAGER, UserRole.CRM_USER]

def can_delete_lead(user: dict) -> bool:
    """Check if user can delete leads"""
    return is_crm_manager(user)

def can_reassign_lead(user: dict) -> bool:
    """Check if user can reassign leads"""
    return is_crm_manager(user)

def can_update_lead(user: dict, lead: dict) -> bool:
    """Check if user can update a specific lead"""
    if is_crm_manager(user):
        return True
    # CRM Users can only update leads assigned to them
    if is_crm_user(user):
        return str(lead.get('assigned_to')) == user.get('_id')
    return False

def can_change_lead_owner(user: dict) -> bool:
    """Check if user can change lead ownership"""
    return is_crm_manager(user)

async def log_crm_audit(
    user: dict,
    action: CRMAuditAction,
    resource_type: str,
    resource_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    success: bool = True,
    error_message: Optional[str] = None,
    ip_address: Optional[str] = None
):
    """Log CRM audit trail"""
    try:
        audit_log = CRMAuditLogCreate(
            user_id=str(user.get('_id')),
            user_name=user.get('full_name', user.get('email')),
            user_role=user.get('role'),
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            success=success,
            error_message=error_message,
            ip_address=ip_address
        )
        await db.crm_audit_logs.insert_one(audit_log.dict())
    except Exception as e:
        # Don't fail the request if audit logging fails
        logging.error(f"Failed to log CRM audit: {str(e)}")

def require_crm_manager(current_user: dict):
    """Dependency to require CRM Manager role"""
    if not is_crm_manager(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires CRM Manager role"
        )
    return current_user

def require_crm_access(current_user: dict):
    """Dependency to require any CRM access"""
    if not is_crm_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires CRM access"
        )
    return current_user

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
    """Get current logged-in user info with CRM permissions"""
    try:
        current_user = await get_current_user(credentials)
        user_dict = serialize_doc(current_user)
        
        # Get team info if user is in a team
        if user_dict.get("team_id"):
            team = await db.teams.find_one({"_id": ObjectId(user_dict["team_id"])})
            if team:
                user_dict["team_name"] = team["name"]
        
        # Add CRM permissions info for frontend
        user_dict["crm_permissions"] = {
            "is_crm_manager": is_crm_manager(current_user),
            "is_crm_user": is_crm_user(current_user),
            "can_delete_leads": can_delete_lead(current_user),
            "can_reassign_leads": can_reassign_lead(current_user),
            "can_view_all_leads": is_crm_manager(current_user)
        }
        
        return UserResponse(**user_dict)
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

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


async def generate_project_code() -> str:
    """Generate unique project code in format: SCMMYY123456 (SC + MMYY + 6 digits)"""
    now = datetime.utcnow()
    month_year = now.strftime("%m%y")  # e.g., "1225" for December 2025
    prefix = f"SC{month_year}"
    
    # Find the highest sequence number for this month/year
    pattern = f"^{prefix}"
    last_project = await db.projects.find_one(
        {"project_code": {"$regex": pattern}},
        sort=[("project_code", -1)]
    )
    
    if last_project and last_project.get("project_code"):
        # Extract the sequence number from the last code (last 6 digits)
        try:
            last_code = last_project["project_code"]
            last_seq = int(last_code[-6:])  # Get last 6 digits
            next_seq = last_seq + 1
        except:
            next_seq = 1
    else:
        next_seq = 1
    
    # Format: SCMMYY123456 (SC + MMYY + 6 digit sequence)
    return f"{prefix}{next_seq:06d}"


@api_router.post("/projects", response_model=ProjectResponse)
async def create_project(
    project: ProjectCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new project"""
    current_user = await get_current_user(credentials)
    
    # Only admin, PM, and CRM Manager can create projects
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.CRM_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins, project managers, and CRM managers can create projects")
    
    project_dict = project.dict()
    
    # Generate unique project code
    project_dict["project_code"] = await generate_project_code()
    
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
        base_url = "https://labourmanage.preview.emergentagent.com"
    return f"{base_url}/client-portal/?projectId={project_id}"


@api_router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_update: ProjectUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a project"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.CRM_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins, project managers, and CRM managers can update projects")
    
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
    
    # Remove gantt_share_tokens to avoid ObjectId serialization issues
    if "gantt_share_tokens" in project_dict:
        del project_dict["gantt_share_tokens"]
    
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
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.CRM_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins, project managers, and CRM managers can manage team")
    
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
    
    # Remove gantt_share_tokens to avoid ObjectId serialization issues
    if "gantt_share_tokens" in project_dict:
        del project_dict["gantt_share_tokens"]
    
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
        
        # Get assigned users for subtask - handle both string and list cases
        assigned_to = subtask_dict.get("assigned_to", [])
        if isinstance(assigned_to, str):
            assigned_to = [assigned_to] if assigned_to else []
        subtask_dict["assigned_to"] = assigned_to
        
        assigned_users = []
        for user_id in assigned_to:
            user = await get_user_by_id(user_id)
            if user:
                assigned_users.append({"id": user["id"], "name": user["full_name"]})
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
        
        # Get milestone name if linked
        if task_dict.get("milestone_id"):
            milestone = await db.milestones.find_one({"_id": ObjectId(task_dict["milestone_id"])})
            task_dict["milestone_name"] = milestone["name"] if milestone else None
        else:
            task_dict["milestone_name"] = None
        
        # Get assigned users - handle both string and list cases
        assigned_to = task_dict.get("assigned_to", [])
        if isinstance(assigned_to, str):
            assigned_to = [assigned_to] if assigned_to else []
        task_dict["assigned_to"] = assigned_to
        
        assigned_users = []
        for user_id in assigned_to:
            user = await get_user_by_id(user_id)
            if user:
                assigned_users.append({"id": user["id"], "name": user["full_name"]})
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
        
        # Get assigned users - handle both string and list cases
        assigned_to = task_dict.get("assigned_to", [])
        if isinstance(assigned_to, str):
            assigned_to = [assigned_to] if assigned_to else []
        task_dict["assigned_to"] = assigned_to
        
        assigned_users = []
        for user_id in assigned_to:
            user = await get_user_by_id(user_id)
            if user:
                assigned_users.append({"id": user["id"], "name": user["full_name"]})
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
    
    # Get assigned users - handle both string and list cases
    assigned_to = task_dict.get("assigned_to", [])
    if isinstance(assigned_to, str):
        assigned_to = [assigned_to] if assigned_to else []
    task_dict["assigned_to"] = assigned_to
    
    assigned_users = []
    for user_id in assigned_to:
        user = await get_user_by_id(user_id)
        if user:
            assigned_users.append({"id": user["id"], "name": user["full_name"]})
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
    
    # Get assigned users - handle both string and list cases
    assigned_to = task_dict.get("assigned_to", [])
    if isinstance(assigned_to, str):
        assigned_to = [assigned_to] if assigned_to else []
    task_dict["assigned_to"] = assigned_to
    
    assigned_users = []
    for user_id in assigned_to:
        user = await get_user_by_id(user_id)
        if user:
            assigned_users.append({"id": user["id"], "name": user["full_name"]})
    task_dict["assigned_users"] = assigned_users
    
    # Send notifications to assigned users
    if assigned_to:
        try:
            from notification_service import NotificationService
            notification_service = NotificationService(db)
            
            # Get project name
            project_name = "Unknown Project"
            if task_dict.get("project_id"):
                project = await db.projects.find_one({"_id": ObjectId(task_dict["project_id"])})
                if project:
                    project_name = project.get("name", "Unknown Project")
            
            for user_id in assigned_to:
                if user_id != str(current_user["_id"]):  # Don't notify self
                    await notification_service.notify_task_assigned(
                        assignee_id=user_id,
                        task_title=task_dict.get("title", "Untitled Task"),
                        task_id=task_dict["id"],
                        project_name=project_name,
                        assigner_name=current_user.get("full_name", "Someone")
                    )
        except Exception as e:
            logger.warning(f"Failed to send task assignment notifications: {str(e)}")
    
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
    
    # Get assigned users - handle both string and list cases
    assigned_to = task_dict.get("assigned_to", [])
    if isinstance(assigned_to, str):
        assigned_to = [assigned_to] if assigned_to else []
    task_dict["assigned_to"] = assigned_to
    
    assigned_users = []
    for user_id in assigned_to:
        user = await get_user_by_id(user_id)
        if user:
            assigned_users.append({"id": user["id"], "name": user["full_name"]})
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
                assigned_users.append({"id": user["id"], "name": user["full_name"]})
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
            assigned_users.append({"id": user["id"], "name": user["full_name"]})
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
            full_name=user_dict.get("full_name", "Unknown"),
            role=user_dict.get("role"),
            is_active=user_dict.get("is_active", True),
            date_joined=user_dict.get("date_joined"),
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


# ============= Labour Advance Payment Routes =============

@api_router.get("/labour/advances", response_model=List[AdvancePaymentResponse])
async def get_advance_payments(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    worker_id: Optional[str] = None,
    project_id: Optional[str] = None,
    status: Optional[str] = None
):
    """Get all advance payments with optional filters"""
    current_user = await get_current_user(credentials)
    
    query = {}
    if worker_id:
        query["worker_id"] = worker_id
    if project_id:
        query["project_id"] = project_id
    if status:
        query["status"] = status
    
    advances = await db.advance_payments.find(query).sort("created_at", -1).to_list(length=500)
    result = []
    for adv in advances:
        adv = serialize_doc(adv)
        # Get worker name
        worker = await db.workers.find_one({"_id": ObjectId(adv["worker_id"])})
        adv["worker_name"] = worker["full_name"] if worker else "Unknown"
        # Get project name
        project = await db.projects.find_one({"_id": ObjectId(adv["project_id"])})
        adv["project_name"] = project["name"] if project else "Unknown"
        # Get approver name
        if adv.get("approved_by"):
            approver = await db.users.find_one({"_id": ObjectId(adv["approved_by"])})
            adv["approved_by_name"] = approver["full_name"] if approver else "Unknown"
        # Get disburser name
        if adv.get("disbursed_by"):
            disburser = await db.users.find_one({"_id": ObjectId(adv["disbursed_by"])})
            adv["disbursed_by_name"] = disburser["full_name"] if disburser else "Unknown"
        # Get creator name
        if adv.get("created_by"):
            creator = await db.users.find_one({"_id": ObjectId(adv["created_by"])})
            adv["created_by_name"] = creator["full_name"] if creator else "Unknown"
        result.append(AdvancePaymentResponse(**adv))
    return result

@api_router.post("/labour/advances", response_model=AdvancePaymentResponse)
async def create_advance_payment(
    advance: AdvancePaymentCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new advance payment request"""
    current_user = await get_current_user(credentials)
    
    # Validate worker exists
    worker = await db.workers.find_one({"_id": ObjectId(advance.worker_id)})
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    # Validate project exists
    project = await db.projects.find_one({"_id": ObjectId(advance.project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check for outstanding advances (max 25% rule)
    outstanding = await db.advance_payments.find({
        "worker_id": advance.worker_id,
        "status": {"$in": ["approved", "disbursed"]}
    }).to_list(length=100)
    
    total_outstanding = sum(
        (adv.get("amount", 0) - adv.get("recovered_amount", 0))
        for adv in outstanding
    )
    
    advance_dict = advance.model_dump()
    advance_dict["status"] = "requested"
    advance_dict["requested_date"] = datetime.utcnow()
    advance_dict["recovered_amount"] = 0
    advance_dict["created_by"] = str(current_user["_id"])
    advance_dict["created_at"] = datetime.utcnow()
    advance_dict["updated_at"] = datetime.utcnow()
    
    result = await db.advance_payments.insert_one(advance_dict)
    advance_dict["id"] = str(result.inserted_id)
    advance_dict["worker_name"] = worker["full_name"]
    advance_dict["project_name"] = project["name"]
    advance_dict["created_by_name"] = current_user["full_name"]
    
    return AdvancePaymentResponse(**advance_dict)

@api_router.put("/labour/advances/{advance_id}/approve", response_model=AdvancePaymentResponse)
async def approve_advance_payment(
    advance_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Approve an advance payment request"""
    current_user = await get_current_user(credentials)
    
    advance = await db.advance_payments.find_one({"_id": ObjectId(advance_id)})
    if not advance:
        raise HTTPException(status_code=404, detail="Advance payment not found")
    
    if advance["status"] != "requested":
        raise HTTPException(status_code=400, detail="Can only approve requested advances")
    
    update_data = {
        "status": "approved",
        "approved_by": str(current_user["_id"]),
        "approved_date": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.advance_payments.update_one(
        {"_id": ObjectId(advance_id)},
        {"$set": update_data}
    )
    
    updated = await db.advance_payments.find_one({"_id": ObjectId(advance_id)})
    updated = serialize_doc(updated)
    
    worker = await db.workers.find_one({"_id": ObjectId(updated["worker_id"])})
    updated["worker_name"] = worker["full_name"] if worker else "Unknown"
    project = await db.projects.find_one({"_id": ObjectId(updated["project_id"])})
    updated["project_name"] = project["name"] if project else "Unknown"
    updated["approved_by_name"] = current_user["full_name"]
    
    return AdvancePaymentResponse(**updated)

@api_router.put("/labour/advances/{advance_id}/reject", response_model=AdvancePaymentResponse)
async def reject_advance_payment(
    advance_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Reject an advance payment request"""
    current_user = await get_current_user(credentials)
    
    advance = await db.advance_payments.find_one({"_id": ObjectId(advance_id)})
    if not advance:
        raise HTTPException(status_code=404, detail="Advance payment not found")
    
    update_data = {
        "status": "rejected",
        "approved_by": str(current_user["_id"]),
        "approved_date": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.advance_payments.update_one(
        {"_id": ObjectId(advance_id)},
        {"$set": update_data}
    )
    
    updated = await db.advance_payments.find_one({"_id": ObjectId(advance_id)})
    updated = serialize_doc(updated)
    
    worker = await db.workers.find_one({"_id": ObjectId(updated["worker_id"])})
    updated["worker_name"] = worker["full_name"] if worker else "Unknown"
    project = await db.projects.find_one({"_id": ObjectId(updated["project_id"])})
    updated["project_name"] = project["name"] if project else "Unknown"
    
    return AdvancePaymentResponse(**updated)

@api_router.put("/labour/advances/{advance_id}/disburse", response_model=AdvancePaymentResponse)
async def disburse_advance_payment(
    advance_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Mark advance payment as disbursed"""
    current_user = await get_current_user(credentials)
    
    advance = await db.advance_payments.find_one({"_id": ObjectId(advance_id)})
    if not advance:
        raise HTTPException(status_code=404, detail="Advance payment not found")
    
    if advance["status"] != "approved":
        raise HTTPException(status_code=400, detail="Can only disburse approved advances")
    
    update_data = {
        "status": "disbursed",
        "disbursed_by": str(current_user["_id"]),
        "disbursed_date": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.advance_payments.update_one(
        {"_id": ObjectId(advance_id)},
        {"$set": update_data}
    )
    
    updated = await db.advance_payments.find_one({"_id": ObjectId(advance_id)})
    updated = serialize_doc(updated)
    
    worker = await db.workers.find_one({"_id": ObjectId(updated["worker_id"])})
    updated["worker_name"] = worker["full_name"] if worker else "Unknown"
    project = await db.projects.find_one({"_id": ObjectId(updated["project_id"])})
    updated["project_name"] = project["name"] if project else "Unknown"
    updated["disbursed_by_name"] = current_user["full_name"]
    
    return AdvancePaymentResponse(**updated)


# ============= Labour Weekly Payment Routes =============

@api_router.get("/labour/payments", response_model=List[WeeklyPaymentResponse])
async def get_weekly_payments(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    worker_id: Optional[str] = None,
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    week_start: Optional[str] = None
):
    """Get all weekly payments with optional filters"""
    current_user = await get_current_user(credentials)
    
    query = {}
    if worker_id:
        query["worker_id"] = worker_id
    if project_id:
        query["project_id"] = project_id
    if status:
        query["status"] = status
    if week_start:
        query["week_start_date"] = {"$gte": datetime.fromisoformat(week_start)}
    
    payments = await db.weekly_payments.find(query).sort("created_at", -1).to_list(length=500)
    result = []
    for pmt in payments:
        pmt = serialize_doc(pmt)
        # Get worker info
        worker = await db.workers.find_one({"_id": ObjectId(pmt["worker_id"])})
        pmt["worker_name"] = worker["full_name"] if worker else "Unknown"
        pmt["worker_phone"] = worker.get("phone", "") if worker else ""
        # Get project name
        project = await db.projects.find_one({"_id": ObjectId(pmt["project_id"])})
        pmt["project_name"] = project["name"] if project else "Unknown"
        # Get validator name
        if pmt.get("validated_by"):
            validator = await db.users.find_one({"_id": ObjectId(pmt["validated_by"])})
            pmt["validated_by_name"] = validator["full_name"] if validator else "Unknown"
        # Get payer name
        if pmt.get("paid_by"):
            payer = await db.users.find_one({"_id": ObjectId(pmt["paid_by"])})
            pmt["paid_by_name"] = payer["full_name"] if payer else "Unknown"
        result.append(WeeklyPaymentResponse(**pmt))
    return result

@api_router.post("/labour/payments", response_model=WeeklyPaymentResponse)
async def create_weekly_payment(
    payment: WeeklyPaymentCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new weekly payment entry"""
    current_user = await get_current_user(credentials)
    
    # Validate worker exists
    worker = await db.workers.find_one({"_id": ObjectId(payment.worker_id)})
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    # Validate project exists
    project = await db.projects.find_one({"_id": ObjectId(payment.project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check for duplicate payment for same week
    existing = await db.weekly_payments.find_one({
        "worker_id": payment.worker_id,
        "week_start_date": payment.week_start_date,
        "week_end_date": payment.week_end_date
    })
    if existing:
        raise HTTPException(status_code=400, detail="Payment already exists for this week")
    
    payment_dict = payment.model_dump()
    payment_dict["status"] = "draft"
    payment_dict["otp_verified"] = False
    payment_dict["otp_attempts"] = 0
    payment_dict["created_by"] = str(current_user["_id"])
    payment_dict["created_at"] = datetime.utcnow()
    payment_dict["updated_at"] = datetime.utcnow()
    
    result = await db.weekly_payments.insert_one(payment_dict)
    payment_dict["id"] = str(result.inserted_id)
    payment_dict["worker_name"] = worker["full_name"]
    payment_dict["worker_phone"] = worker.get("phone", "")
    payment_dict["project_name"] = project["name"]
    
    return WeeklyPaymentResponse(**payment_dict)

@api_router.put("/labour/payments/{payment_id}", response_model=WeeklyPaymentResponse)
async def update_weekly_payment(
    payment_id: str,
    payment_update: WeeklyPaymentUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a weekly payment entry"""
    current_user = await get_current_user(credentials)
    
    existing = await db.weekly_payments.find_one({"_id": ObjectId(payment_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    update_data = {k: v for k, v in payment_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.weekly_payments.update_one(
        {"_id": ObjectId(payment_id)},
        {"$set": update_data}
    )
    
    updated = await db.weekly_payments.find_one({"_id": ObjectId(payment_id)})
    updated = serialize_doc(updated)
    
    worker = await db.workers.find_one({"_id": ObjectId(updated["worker_id"])})
    updated["worker_name"] = worker["full_name"] if worker else "Unknown"
    updated["worker_phone"] = worker.get("phone", "") if worker else ""
    project = await db.projects.find_one({"_id": ObjectId(updated["project_id"])})
    updated["project_name"] = project["name"] if project else "Unknown"
    
    return WeeklyPaymentResponse(**updated)

@api_router.post("/labour/payments/{payment_id}/validate", response_model=WeeklyPaymentResponse)
async def validate_weekly_payment(
    payment_id: str,
    validation_notes: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Validate a weekly payment"""
    current_user = await get_current_user(credentials)
    
    payment = await db.weekly_payments.find_one({"_id": ObjectId(payment_id)})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Validation rules
    errors = []
    if payment.get("days_worked", 0) > 7:
        errors.append("Days worked cannot exceed 7")
    if payment.get("net_amount", 0) <= 0:
        errors.append("Net amount must be positive")
    if payment.get("other_deductions", 0) > payment.get("gross_amount", 0) * 0.5:
        errors.append("Deductions cannot exceed 50% of gross amount")
    
    if errors:
        raise HTTPException(status_code=400, detail={"validation_errors": errors})
    
    update_data = {
        "status": "validated",
        "validated_by": str(current_user["_id"]),
        "validated_at": datetime.utcnow(),
        "validation_notes": validation_notes,
        "updated_at": datetime.utcnow()
    }
    
    await db.weekly_payments.update_one(
        {"_id": ObjectId(payment_id)},
        {"$set": update_data}
    )
    
    updated = await db.weekly_payments.find_one({"_id": ObjectId(payment_id)})
    updated = serialize_doc(updated)
    
    worker = await db.workers.find_one({"_id": ObjectId(updated["worker_id"])})
    updated["worker_name"] = worker["full_name"] if worker else "Unknown"
    updated["worker_phone"] = worker.get("phone", "") if worker else ""
    project = await db.projects.find_one({"_id": ObjectId(updated["project_id"])})
    updated["project_name"] = project["name"] if project else "Unknown"
    updated["validated_by_name"] = current_user["full_name"]
    
    return WeeklyPaymentResponse(**updated)

@api_router.post("/labour/payments/{payment_id}/send-otp")
async def send_payment_otp(
    payment_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Send OTP to worker for payment verification"""
    import random
    import hashlib
    
    current_user = await get_current_user(credentials)
    
    payment = await db.weekly_payments.find_one({"_id": ObjectId(payment_id)})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment["status"] not in ["validated", "pending_payment", "otp_sent"]:
        raise HTTPException(status_code=400, detail="Payment must be validated before sending OTP")
    
    worker = await db.workers.find_one({"_id": ObjectId(payment["worker_id"])})
    if not worker or not worker.get("phone"):
        raise HTTPException(status_code=400, detail="Worker mobile number not found")
    
    # Generate 6-digit OTP
    otp_code = str(random.randint(100000, 999999))
    otp_hash = hashlib.sha256(otp_code.encode()).hexdigest()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    # Store OTP log
    otp_log = {
        "payment_id": payment_id,
        "worker_id": str(payment["worker_id"]),
        "mobile_number": worker["phone"],
        "otp_hash": otp_hash,
        "sent_at": datetime.utcnow(),
        "expires_at": expires_at,
        "verified": False,
        "attempts": 0
    }
    await db.payment_otp_logs.insert_one(otp_log)
    
    # Update payment status
    await db.weekly_payments.update_one(
        {"_id": ObjectId(payment_id)},
        {"$set": {
            "status": "otp_sent",
            "otp_sent_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }}
    )
    
    # In production, send SMS here. For now, return OTP in response (mock)
    return {
        "success": True,
        "message": f"OTP sent to {worker['phone'][-4:].rjust(10, '*')}",
        "expires_in_minutes": 10,
        "otp_for_testing": otp_code  # Remove in production
    }

@api_router.post("/labour/payments/{payment_id}/verify-otp")
async def verify_payment_otp(
    payment_id: str,
    otp: str,
    payment_method: str = "cash",
    payment_reference: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Verify OTP and mark payment as paid"""
    import hashlib
    
    current_user = await get_current_user(credentials)
    
    payment = await db.weekly_payments.find_one({"_id": ObjectId(payment_id)})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment["status"] != "otp_sent":
        raise HTTPException(status_code=400, detail="OTP not sent for this payment")
    
    # Get latest OTP log
    otp_log = await db.payment_otp_logs.find_one(
        {"payment_id": payment_id},
        sort=[("sent_at", -1)]
    )
    
    if not otp_log:
        raise HTTPException(status_code=400, detail="OTP not found")
    
    # Check expiry
    if datetime.utcnow() > otp_log["expires_at"]:
        await db.weekly_payments.update_one(
            {"_id": ObjectId(payment_id)},
            {"$set": {"status": "validated", "updated_at": datetime.utcnow()}}
        )
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")
    
    # Check attempts
    if otp_log["attempts"] >= 3:
        await db.weekly_payments.update_one(
            {"_id": ObjectId(payment_id)},
            {"$set": {"status": "failed", "updated_at": datetime.utcnow()}}
        )
        raise HTTPException(status_code=400, detail="Maximum OTP attempts exceeded")
    
    # Verify OTP
    otp_hash = hashlib.sha256(otp.encode()).hexdigest()
    if otp_hash != otp_log["otp_hash"]:
        await db.payment_otp_logs.update_one(
            {"_id": otp_log["_id"]},
            {"$inc": {"attempts": 1}}
        )
        await db.weekly_payments.update_one(
            {"_id": ObjectId(payment_id)},
            {"$inc": {"otp_attempts": 1}}
        )
        remaining = 3 - (otp_log["attempts"] + 1)
        raise HTTPException(status_code=400, detail=f"Invalid OTP. {remaining} attempts remaining.")
    
    # Mark OTP as verified
    await db.payment_otp_logs.update_one(
        {"_id": otp_log["_id"]},
        {"$set": {"verified": True, "verified_at": datetime.utcnow()}}
    )
    
    # Mark payment as paid
    await db.weekly_payments.update_one(
        {"_id": ObjectId(payment_id)},
        {"$set": {
            "status": "paid",
            "otp_verified": True,
            "otp_verified_at": datetime.utcnow(),
            "paid_by": str(current_user["_id"]),
            "paid_at": datetime.utcnow(),
            "payment_method": payment_method,
            "payment_reference": payment_reference,
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Deduct from any outstanding advances
    if payment.get("advance_deduction", 0) > 0:
        outstanding_advances = await db.advance_payments.find({
            "worker_id": payment["worker_id"],
            "status": "disbursed"
        }).to_list(length=10)
        
        remaining_deduction = payment["advance_deduction"]
        for adv in outstanding_advances:
            if remaining_deduction <= 0:
                break
            to_recover = min(
                remaining_deduction,
                adv["amount"] - adv.get("recovered_amount", 0)
            )
            new_recovered = adv.get("recovered_amount", 0) + to_recover
            new_status = "recovered" if new_recovered >= adv["amount"] else "disbursed"
            
            await db.advance_payments.update_one(
                {"_id": adv["_id"]},
                {"$set": {
                    "recovered_amount": new_recovered,
                    "status": new_status,
                    "updated_at": datetime.utcnow()
                }}
            )
            remaining_deduction -= to_recover
    
    # Get updated payment details for receipt
    updated_payment = await db.weekly_payments.find_one({"_id": ObjectId(payment_id)})
    worker = await db.workers.find_one({"_id": ObjectId(updated_payment["worker_id"])})
    project = await db.projects.find_one({"_id": ObjectId(updated_payment["project_id"])})
    
    # Get project manager name for receipt
    approved_by_name = "Project Manager"
    if project:
        if project.get("project_manager_id"):
            pm = await db.users.find_one({"_id": ObjectId(project["project_manager_id"])})
            if pm:
                approved_by_name = pm.get("full_name", "Project Manager")
        elif project.get("manager_id"):
            pm = await db.users.find_one({"_id": ObjectId(project["manager_id"])})
            if pm:
                approved_by_name = pm.get("full_name", "Project Manager")
    
    receipt_data = {
        "payment_id": payment_id,
        "worker_name": worker["full_name"] if worker else "Unknown",
        "worker_phone": worker.get("phone", "") if worker else "",
        "project_name": project["name"] if project else "Unknown",
        "amount": updated_payment.get("net_amount", 0),
        "gross_amount": updated_payment.get("gross_amount", 0),
        "deductions": updated_payment.get("advance_deduction", 0) + updated_payment.get("other_deductions", 0),
        "week_start": updated_payment.get("week_start_date"),
        "week_end": updated_payment.get("week_end_date"),
        "paid_at": datetime.utcnow().isoformat(),
        "paid_by": current_user["full_name"],
        "approved_by": approved_by_name,
        "payment_method": payment_method,
        "payment_reference": payment_reference,
        "status": "PAID"
    }
    
    # Create notification for project manager/head
    if project:
        # Find project manager or team leads
        manager_ids = []
        if project.get("manager_id"):
            manager_ids.append(project["manager_id"])
        if project.get("team_member_ids"):
            # Get users with manager/head roles from team
            for member_id in project["team_member_ids"]:
                try:
                    member = await db.users.find_one({"_id": ObjectId(member_id)})
                    if member and member.get("role") in ["manager", "head", "director", "admin"]:
                        manager_ids.append(str(member["_id"]))
                except:
                    pass
        
        # Create notification for each manager
        for manager_id in set(manager_ids):
            notification = {
                "user_id": manager_id,
                "title": "Payment Completed",
                "message": f"Payment of ₹{receipt_data['amount']:,.0f} to {receipt_data['worker_name']} has been completed for {receipt_data['project_name']}",
                "type": "payment_completed",
                "data": {
                    "payment_id": payment_id,
                    "worker_name": receipt_data["worker_name"],
                    "amount": receipt_data["amount"],
                    "project_name": receipt_data["project_name"]
                },
                "read": False,
                "created_at": datetime.utcnow()
            }
            await db.notifications.insert_one(notification)
    
    return {
        "success": True,
        "message": "Payment verified and marked as paid",
        "payment_id": payment_id,
        "receipt": receipt_data
    }

@api_router.post("/labour/payments/{payment_id}/upload-receipt")
async def upload_payment_receipt(
    payment_id: str,
    receipt_image: str,  # Base64 encoded image
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Upload receipt screenshot and attach to manager notification"""
    current_user = await get_current_user(credentials)
    
    payment = await db.weekly_payments.find_one({"_id": ObjectId(payment_id)})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment.get("status") != "paid":
        raise HTTPException(status_code=400, detail="Receipt can only be uploaded for paid payments")
    
    # Store the receipt image in the payment record
    await db.weekly_payments.update_one(
        {"_id": ObjectId(payment_id)},
        {"$set": {
            "receipt_image": receipt_image,
            "receipt_uploaded_at": datetime.utcnow(),
            "receipt_uploaded_by": str(current_user["_id"])
        }}
    )
    
    # Update all notifications for this payment to include the receipt image
    await db.notifications.update_many(
        {"data.payment_id": payment_id, "type": "payment_completed"},
        {"$set": {
            "data.receipt_image": receipt_image,
            "data.has_receipt": True
        }}
    )
    
    return {
        "success": True,
        "message": "Receipt uploaded and managers notified"
    }

@api_router.get("/labour/payments/weekly-summary")
async def get_weekly_payment_summary(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    project_id: Optional[str] = None,
    week_start: Optional[str] = None
):
    """Get weekly payment summary"""
    current_user = await get_current_user(credentials)
    
    query = {}
    if project_id:
        query["project_id"] = project_id
    if week_start:
        query["week_start_date"] = {"$gte": datetime.fromisoformat(week_start)}
    
    payments = await db.weekly_payments.find(query).to_list(length=1000)
    
    total_workers = len(set(p["worker_id"] for p in payments))
    total_gross = sum(p.get("gross_amount", 0) for p in payments)
    total_deductions = sum(p.get("advance_deduction", 0) + p.get("other_deductions", 0) for p in payments)
    total_net = sum(p.get("net_amount", 0) for p in payments)
    
    paid_count = len([p for p in payments if p.get("status") == "paid"])
    pending_count = len([p for p in payments if p.get("status") in ["draft", "pending_validation", "validated", "pending_payment", "otp_sent"]])
    failed_count = len([p for p in payments if p.get("status") == "failed"])
    
    return {
        "total_workers": total_workers,
        "total_payments": len(payments),
        "total_gross_amount": total_gross,
        "total_deductions": total_deductions,
        "total_net_amount": total_net,
        "paid_count": paid_count,
        "pending_count": pending_count,
        "failed_count": failed_count
    }


@api_router.get("/labour/payments/{payment_id}/receipt")
async def get_payment_receipt(
    payment_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get receipt data for a paid payment"""
    current_user = await get_current_user(credentials)
    
    payment = await db.weekly_payments.find_one({"_id": ObjectId(payment_id)})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment.get("status") != "paid":
        raise HTTPException(status_code=400, detail="Receipt only available for paid payments")
    
    worker = await db.workers.find_one({"_id": ObjectId(payment["worker_id"])})
    project = await db.projects.find_one({"_id": ObjectId(payment["project_id"])})
    
    # Get paid by user
    paid_by_name = "Unknown"
    if payment.get("paid_by"):
        paid_by_user = await db.users.find_one({"_id": ObjectId(payment["paid_by"])})
        if paid_by_user:
            paid_by_name = paid_by_user.get("full_name", "Unknown")
    
    # Get approved by (project manager)
    approved_by_name = "Project Manager"
    if project:
        if project.get("project_manager_id"):
            pm = await db.users.find_one({"_id": ObjectId(project["project_manager_id"])})
            if pm:
                approved_by_name = pm.get("full_name", "Project Manager")
        elif project.get("manager_id"):
            pm = await db.users.find_one({"_id": ObjectId(project["manager_id"])})
            if pm:
                approved_by_name = pm.get("full_name", "Project Manager")
    
    return {
        "payment_id": payment_id,
        "worker_id": str(payment["worker_id"]),
        "worker_name": worker["full_name"] if worker else "Unknown",
        "worker_phone": worker.get("phone", "") if worker else "",
        "project_name": project["name"] if project else "Unknown",
        "amount": payment.get("net_amount", 0),
        "gross_amount": payment.get("gross_amount", 0),
        "deductions": payment.get("advance_deduction", 0) + payment.get("other_deductions", 0),
        "week_start": payment.get("week_start_date"),
        "week_end": payment.get("week_end_date"),
        "paid_at": payment.get("paid_at"),
        "paid_by": paid_by_name,
        "approved_by": approved_by_name,
        "payment_method": payment.get("payment_method", "cash"),
        "payment_reference": payment.get("payment_reference", ""),
        "receipt_image": payment.get("receipt_image"),
        "status": "PAID"
    }


@api_router.get("/labour/workers/{worker_id}/receipts")
async def get_worker_receipts(
    worker_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all payment receipts for a specific worker"""
    current_user = await get_current_user(credentials)
    
    worker = await db.workers.find_one({"_id": ObjectId(worker_id)})
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    # Get all paid payments for this worker
    paid_payments = await db.weekly_payments.find({
        "worker_id": worker_id,
        "status": "paid"
    }).sort("paid_at", -1).to_list(length=100)
    
    receipts = []
    for payment in paid_payments:
        project = await db.projects.find_one({"_id": ObjectId(payment["project_id"])})
        
        # Get paid by user
        paid_by_name = "Unknown"
        if payment.get("paid_by"):
            paid_by_user = await db.users.find_one({"_id": ObjectId(payment["paid_by"])})
            if paid_by_user:
                paid_by_name = paid_by_user.get("full_name", "Unknown")
        
        receipts.append({
            "payment_id": str(payment["_id"]),
            "project_name": project["name"] if project else "Unknown",
            "amount": payment.get("net_amount", 0),
            "week_start": payment.get("week_start_date"),
            "week_end": payment.get("week_end_date"),
            "paid_at": payment.get("paid_at"),
            "paid_by": paid_by_name,
            "payment_method": payment.get("payment_method", "cash"),
            "has_receipt_image": bool(payment.get("receipt_image"))
        })
    
    return {
        "worker_id": worker_id,
        "worker_name": worker["full_name"],
        "total_receipts": len(receipts),
        "total_paid": sum(r["amount"] for r in receipts),
        "receipts": receipts
    }


@api_router.post("/labour/payments/generate-weekly")
async def generate_weekly_payments(
    week_start: str,
    week_end: str,
    project_id: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Auto-generate weekly payments from attendance data"""
    current_user = await get_current_user(credentials)
    
    start_date = datetime.fromisoformat(week_start)
    end_date = datetime.fromisoformat(week_end)
    
    # Query attendance for the week
    attendance_query = {
        "attendance_date": {"$gte": start_date, "$lte": end_date}
    }
    if project_id:
        attendance_query["project_id"] = project_id
    
    attendances = await db.labor_attendance.find(attendance_query).to_list(length=5000)
    
    # Group by worker and project
    worker_project_data = {}
    for att in attendances:
        key = f"{att['worker_id']}_{att['project_id']}"
        if key not in worker_project_data:
            worker_project_data[key] = {
                "worker_id": att["worker_id"],
                "project_id": att["project_id"],
                "days_worked": 0,
                "hours_worked": 0,
                "overtime_hours": 0,
                "total_wages": 0,
            }
        
        worker_project_data[key]["days_worked"] += 1
        worker_project_data[key]["hours_worked"] += att.get("hours_worked") or 8
        worker_project_data[key]["overtime_hours"] += att.get("overtime_hours") or 0
        worker_project_data[key]["total_wages"] += att.get("wages_earned") or 0
    
    created_payments = []
    skipped_count = 0
    
    for key, data in worker_project_data.items():
        # Check if payment already exists
        existing = await db.weekly_payments.find_one({
            "worker_id": data["worker_id"],
            "project_id": data["project_id"],
            "week_start_date": start_date,
            "week_end_date": end_date
        })
        
        if existing:
            skipped_count += 1
            continue
        
        # Get worker info for rate calculation
        worker = await db.workers.find_one({"_id": ObjectId(data["worker_id"])})
        if not worker:
            continue
        
        base_rate = worker.get("base_rate", 500)
        overtime_rate = base_rate * 1.5 / 8  # 1.5x per overtime hour
        
        base_amount = data["total_wages"] if data["total_wages"] > 0 else (data["days_worked"] * base_rate)
        overtime_amount = data["overtime_hours"] * overtime_rate
        gross_amount = base_amount + overtime_amount
        
        # Check for outstanding advances
        outstanding_advances = await db.advance_payments.find({
            "worker_id": data["worker_id"],
            "status": "disbursed"
        }).to_list(length=10)
        
        advance_deduction = 0
        for adv in outstanding_advances:
            remaining = adv["amount"] - adv.get("recovered_amount", 0)
            if adv.get("recovery_mode") == "installment":
                advance_deduction += min(remaining, adv.get("installment_amount", remaining))
            else:
                advance_deduction += remaining
        
        # Cap deduction at 50% of gross
        advance_deduction = min(advance_deduction, gross_amount * 0.5)
        net_amount = gross_amount - advance_deduction
        
        payment_dict = {
            "worker_id": data["worker_id"],
            "project_id": data["project_id"],
            "week_start_date": start_date,
            "week_end_date": end_date,
            "days_worked": data["days_worked"],
            "hours_worked": data["hours_worked"],
            "overtime_hours": data["overtime_hours"],
            "base_amount": base_amount,
            "overtime_amount": overtime_amount,
            "bonus_amount": 0,
            "gross_amount": gross_amount,
            "advance_deduction": advance_deduction,
            "other_deductions": 0,
            "deduction_notes": "",
            "net_amount": net_amount,
            "status": "draft",
            "otp_verified": False,
            "otp_attempts": 0,
            "created_by": str(current_user["_id"]),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await db.weekly_payments.insert_one(payment_dict)
        payment_dict["id"] = str(result.inserted_id)
        payment_dict["worker_name"] = worker["full_name"]
        
        project = await db.projects.find_one({"_id": ObjectId(data["project_id"])})
        payment_dict["project_name"] = project["name"] if project else "Unknown"
        
        created_payments.append(payment_dict)
    
    return {
        "success": True,
        "created_count": len(created_payments),
        "skipped_count": skipped_count,
        "message": f"Generated {len(created_payments)} payments, {skipped_count} already existed"
    }


@api_router.get("/labour/payments/by-worker")
async def get_payments_by_worker(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    week_start: Optional[str] = None,
    status: Optional[str] = None
):
    """Get payments grouped by worker"""
    current_user = await get_current_user(credentials)
    
    query = {}
    if week_start:
        query["week_start_date"] = {"$gte": datetime.fromisoformat(week_start)}
    if status:
        query["status"] = status
    
    payments = await db.weekly_payments.find(query).sort("created_at", -1).to_list(length=1000)
    
    # Group by worker
    workers_data = {}
    for pmt in payments:
        worker_id = pmt["worker_id"]
        if worker_id not in workers_data:
            worker = await db.workers.find_one({"_id": ObjectId(worker_id)})
            workers_data[worker_id] = {
                "worker_id": worker_id,
                "worker_name": worker["full_name"] if worker else "Unknown",
                "worker_phone": worker.get("phone", "") if worker else "",
                "worker_skill": worker.get("skill_group", "") if worker else "",
                "total_gross": 0,
                "total_net": 0,
                "paid_amount": 0,
                "pending_amount": 0,
                "payments": []
            }
        
        pmt_dict = serialize_doc(pmt)
        project = await db.projects.find_one({"_id": ObjectId(pmt["project_id"])})
        pmt_dict["project_name"] = project["name"] if project else "Unknown"
        
        workers_data[worker_id]["payments"].append(pmt_dict)
        workers_data[worker_id]["total_gross"] += pmt.get("gross_amount", 0)
        workers_data[worker_id]["total_net"] += pmt.get("net_amount", 0)
        
        if pmt.get("status") == "paid":
            workers_data[worker_id]["paid_amount"] += pmt.get("net_amount", 0)
        else:
            workers_data[worker_id]["pending_amount"] += pmt.get("net_amount", 0)
    
    return list(workers_data.values())


@api_router.get("/labour/payments/by-project")
async def get_payments_by_project(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    week_start: Optional[str] = None,
    status: Optional[str] = None
):
    """Get payments grouped by project"""
    current_user = await get_current_user(credentials)
    
    query = {}
    if week_start:
        query["week_start_date"] = {"$gte": datetime.fromisoformat(week_start)}
    if status:
        query["status"] = status
    
    payments = await db.weekly_payments.find(query).sort("created_at", -1).to_list(length=1000)
    
    # Group by project
    projects_data = {}
    for pmt in payments:
        project_id = pmt["project_id"]
        if project_id not in projects_data:
            project = await db.projects.find_one({"_id": ObjectId(project_id)})
            projects_data[project_id] = {
                "project_id": project_id,
                "project_name": project["name"] if project else "Unknown",
                "project_status": project.get("status", "") if project else "",
                "total_workers": set(),
                "total_gross": 0,
                "total_net": 0,
                "paid_amount": 0,
                "pending_amount": 0,
                "payments": []
            }
        
        pmt_dict = serialize_doc(pmt)
        worker = await db.workers.find_one({"_id": ObjectId(pmt["worker_id"])})
        pmt_dict["worker_name"] = worker["full_name"] if worker else "Unknown"
        pmt_dict["worker_phone"] = worker.get("phone", "") if worker else ""
        
        projects_data[project_id]["payments"].append(pmt_dict)
        projects_data[project_id]["total_workers"].add(pmt["worker_id"])
        projects_data[project_id]["total_gross"] += pmt.get("gross_amount", 0)
        projects_data[project_id]["total_net"] += pmt.get("net_amount", 0)
        
        if pmt.get("status") == "paid":
            projects_data[project_id]["paid_amount"] += pmt.get("net_amount", 0)
        else:
            projects_data[project_id]["pending_amount"] += pmt.get("net_amount", 0)
    
    # Convert sets to counts
    result = []
    for proj_data in projects_data.values():
        proj_data["total_workers"] = len(proj_data["total_workers"])
        result.append(proj_data)
    
    return result


# ============= Admin Configuration Routes =============

@api_router.get("/admin/config")
async def get_admin_config(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all admin configurations"""
    current_user = await get_current_user(credentials)
    
    # Only admins can access
    if current_user.get("role") not in ["admin", "director", "head"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    sms_config = await db.admin_config.find_one({"config_type": "sms"})
    whatsapp_config = await db.admin_config.find_one({"config_type": "whatsapp"})
    domain_config = await db.admin_config.find_one({"config_type": "domain_restriction"})
    
    return {
        "sms_config": serialize_doc(sms_config) if sms_config else None,
        "whatsapp_config": serialize_doc(whatsapp_config) if whatsapp_config else None,
        "domain_restriction": serialize_doc(domain_config) if domain_config else None
    }


@api_router.get("/admin/config/sms")
async def get_sms_config(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get SMS configuration"""
    current_user = await get_current_user(credentials)
    if current_user.get("role") not in ["admin", "director", "head"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    config = await db.admin_config.find_one({"config_type": "sms"})
    if not config:
        # Return default config
        return {
            "id": None,
            "provider": "twilio",
            "is_enabled": False,
            "api_key": "",
            "api_secret": "",
            "sender_id": "",
            "template_id": "",
            "webhook_url": ""
        }
    return serialize_doc(config)


@api_router.put("/admin/config/sms")
async def update_sms_config(
    config_data: dict,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update SMS configuration"""
    current_user = await get_current_user(credentials)
    if current_user.get("role") not in ["admin", "director", "head"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    config_data["config_type"] = "sms"
    config_data["updated_at"] = datetime.utcnow()
    config_data["updated_by"] = str(current_user["_id"])
    
    existing = await db.admin_config.find_one({"config_type": "sms"})
    if existing:
        await db.admin_config.update_one(
            {"config_type": "sms"},
            {"$set": config_data}
        )
        config_data["id"] = str(existing["_id"])
    else:
        config_data["created_at"] = datetime.utcnow()
        result = await db.admin_config.insert_one(config_data)
        config_data["id"] = str(result.inserted_id)
    
    return {"success": True, "message": "SMS configuration updated", "config": config_data}


@api_router.get("/admin/config/whatsapp")
async def get_whatsapp_config(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get WhatsApp configuration"""
    current_user = await get_current_user(credentials)
    if current_user.get("role") not in ["admin", "director", "head"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    config = await db.admin_config.find_one({"config_type": "whatsapp"})
    if not config:
        return {
            "id": None,
            "provider": "meta",
            "is_enabled": False,
            "business_account_id": "",
            "phone_number_id": "",
            "access_token": "",
            "webhook_verify_token": "",
            "template_namespace": ""
        }
    return serialize_doc(config)


@api_router.put("/admin/config/whatsapp")
async def update_whatsapp_config(
    config_data: dict,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update WhatsApp configuration"""
    current_user = await get_current_user(credentials)
    if current_user.get("role") not in ["admin", "director", "head"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    config_data["config_type"] = "whatsapp"
    config_data["updated_at"] = datetime.utcnow()
    config_data["updated_by"] = str(current_user["_id"])
    
    existing = await db.admin_config.find_one({"config_type": "whatsapp"})
    if existing:
        await db.admin_config.update_one(
            {"config_type": "whatsapp"},
            {"$set": config_data}
        )
        config_data["id"] = str(existing["_id"])
    else:
        config_data["created_at"] = datetime.utcnow()
        result = await db.admin_config.insert_one(config_data)
        config_data["id"] = str(result.inserted_id)
    
    return {"success": True, "message": "WhatsApp configuration updated", "config": config_data}


@api_router.get("/admin/config/domain-restriction")
async def get_domain_restriction_config(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get domain restriction configuration"""
    current_user = await get_current_user(credentials)
    if current_user.get("role") not in ["admin", "director", "head"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    config = await db.admin_config.find_one({"config_type": "domain_restriction"})
    if not config:
        return {
            "id": None,
            "is_enabled": False,
            "allowed_domains": [],
            "admin_bypass_enabled": True,
            "error_message": "Only corporate email addresses are allowed to access this application."
        }
    return serialize_doc(config)


@api_router.put("/admin/config/domain-restriction")
async def update_domain_restriction_config(
    config_data: dict,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update domain restriction configuration"""
    current_user = await get_current_user(credentials)
    if current_user.get("role") not in ["admin", "director", "head"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Remove any _id or id fields from input
    config_data.pop("_id", None)
    config_data.pop("id", None)
    
    config_data["config_type"] = "domain_restriction"
    config_data["updated_at"] = datetime.utcnow()
    config_data["updated_by"] = str(current_user["_id"])
    
    existing = await db.admin_config.find_one({"config_type": "domain_restriction"})
    if existing:
        await db.admin_config.update_one(
            {"config_type": "domain_restriction"},
            {"$set": config_data}
        )
        config_id = str(existing["_id"])
    else:
        config_data["created_at"] = datetime.utcnow()
        result = await db.admin_config.insert_one(config_data)
        config_id = str(result.inserted_id)
    
    # Return clean response
    return {
        "success": True, 
        "message": "Domain restriction updated", 
        "config": {
            "id": config_id,
            "is_enabled": config_data.get("is_enabled", False),
            "allowed_domains": config_data.get("allowed_domains", []),
            "admin_bypass_enabled": config_data.get("admin_bypass_enabled", True),
            "error_message": config_data.get("error_message", "")
        }
    }


@api_router.post("/admin/config/test-sms")
async def test_sms_config(
    phone_number: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Send a test SMS to verify configuration"""
    current_user = await get_current_user(credentials)
    if current_user.get("role") not in ["admin", "director", "head"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    config = await db.admin_config.find_one({"config_type": "sms"})
    if not config or not config.get("is_enabled"):
        raise HTTPException(status_code=400, detail="SMS is not configured or enabled")
    
    # In production, integrate with actual SMS provider
    # For now, return mock success
    return {
        "success": True,
        "message": f"Test SMS sent to {phone_number}",
        "provider": config.get("provider", "twilio")
    }


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
        
        # Count tasks under this milestone
        task_count = await db.tasks.count_documents({"milestone_id": milestone_dict["id"]})
        completed_task_count = await db.tasks.count_documents({
            "milestone_id": milestone_dict["id"],
            "status": TaskStatus.COMPLETED
        })
        milestone_dict["task_count"] = task_count
        milestone_dict["completed_task_count"] = completed_task_count
        
        # Calculate actual cost from task costs
        pipeline = [
            {"$match": {"milestone_id": milestone_dict["id"]}},
            {"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$actual_cost", 0]}}}}
        ]
        cost_result = await db.tasks.aggregate(pipeline).to_list(1)
        milestone_dict["actual_cost"] = cost_result[0]["total"] if cost_result else 0
        
        # Calculate budget variance
        estimated = milestone_dict.get("estimated_cost", 0) or 0
        actual = milestone_dict.get("actual_cost", 0) or 0
        milestone_dict["budget_variance"] = estimated - actual
        
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
        
        # Get assigned users - handle both string and list cases
        assigned_to = task_dict.get("assigned_to", [])
        if isinstance(assigned_to, str):
            assigned_to = [assigned_to] if assigned_to else []
        task_dict["assigned_to"] = assigned_to
        
        assigned_users = []
        for user_id in assigned_to:
            user = await db.users.find_one({"_id": ObjectId(user_id)})
            if user:
                assigned_users.append({
                    "id": user["id"],
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

@app.get("/api/expenses/{expense_id}")
async def get_expense_by_id(
    expense_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get a single expense by ID"""
    current_user = await get_current_user(credentials)
    
    expense = await db.expenses.find_one({"_id": ObjectId(expense_id)})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    expense_dict = {
        "id": str(expense["_id"]),
        "project_id": expense.get("project_id"),
        "category": expense.get("category"),
        "amount": expense.get("amount"),
        "description": expense.get("description"),
        "expense_date": expense.get("expense_date"),
        "vendor_name": expense.get("vendor_name"),
        "receipt_image": expense.get("receipt_image"),
        "payment_method": expense.get("payment_method"),
        "reference_number": expense.get("reference_number"),
        "notes": expense.get("notes"),
        "created_at": expense.get("created_at"),
        "created_by": expense.get("created_by"),
    }
    
    # Optionally fetch creator name
    if expense.get("created_by"):
        try:
            creator = await db.users.find_one({"_id": ObjectId(expense.get("created_by"))})
            expense_dict["created_by_name"] = creator.get("full_name") if creator else None
        except:
            pass
    
    return expense_dict


@app.put("/api/expenses/{expense_id}")
async def update_expense(
    expense_id: str,
    expense_data: dict,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update an expense"""
    current_user = await get_current_user(credentials)
    
    expense = await db.expenses.find_one({"_id": ObjectId(expense_id)})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    # Only creator or admin can update
    user_role = current_user.get("role") or current_user.get("role_name", "")
    if expense.get("created_by") != current_user.get("id") and user_role not in ["Admin", UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only the creator or admin can edit this expense")
    
    # Update allowed fields
    update_data = {}
    allowed_fields = ["project_id", "category", "amount", "description", "expense_date", 
                      "vendor_name", "receipt_image", "payment_method", "reference_number", "notes"]
    for field in allowed_fields:
        if field in expense_data:
            update_data[field] = expense_data[field]
    
    update_data["updated_at"] = datetime.utcnow()
    
    await db.expenses.update_one(
        {"_id": ObjectId(expense_id)},
        {"$set": update_data}
    )
    
    updated_expense = await db.expenses.find_one({"_id": ObjectId(expense_id)})
    return {
        "id": str(updated_expense["_id"]),
        "project_id": updated_expense.get("project_id"),
        "category": updated_expense.get("category"),
        "amount": updated_expense.get("amount"),
        "description": updated_expense.get("description"),
        "expense_date": updated_expense.get("expense_date"),
        "vendor_name": updated_expense.get("vendor_name"),
        "receipt_image": updated_expense.get("receipt_image"),
        "payment_method": updated_expense.get("payment_method"),
        "reference_number": updated_expense.get("reference_number"),
        "notes": updated_expense.get("notes"),
        "message": "Expense updated successfully"
    }


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



# ============= CRM Dashboard & Analytics =============

@api_router.get("/crm/dashboard/analytics")
async def get_crm_analytics(
    city: Optional[str] = None,
    state: Optional[str] = None,
    status: Optional[str] = None,
    source: Optional[str] = None,
    category_id: Optional[str] = None,
    funnel_id: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to: Optional[str] = None,
    min_value: Optional[float] = None,
    max_value: Optional[float] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get comprehensive CRM analytics with filters"""
    try:
        await get_current_user(credentials)
        
        # Build filter query
        query = {"is_deleted": {"$ne": True}}
        
        if city:
            query["city"] = {"$regex": city, "$options": "i"}
        if state:
            query["state"] = {"$regex": state, "$options": "i"}
        if status:
            query["status"] = status
        if source:
            query["source"] = source
        if category_id:
            query["category_id"] = category_id
        if funnel_id:
            query["funnel_id"] = funnel_id
        if priority:
            query["priority"] = priority
        if assigned_to:
            query["assigned_to"] = assigned_to
        if min_value is not None:
            query["estimated_value"] = {"$gte": min_value}
        if max_value is not None:
            if "estimated_value" in query:
                query["estimated_value"]["$lte"] = max_value
            else:
                query["estimated_value"] = {"$lte": max_value}
        if date_from:
            query["created_at"] = {"$gte": datetime.fromisoformat(date_from)}
        if date_to:
            if "created_at" in query:
                query["created_at"]["$lte"] = datetime.fromisoformat(date_to)
            else:
                query["created_at"] = {"$lte": datetime.fromisoformat(date_to)}
        
        # Total counts
        total_leads = await db.leads.count_documents(query)
        
        # Status breakdown
        status_pipeline = [
            {"$match": query},
            {"$group": {"_id": "$status", "count": {"$sum": 1}, "value": {"$sum": {"$ifNull": ["$estimated_value", 0]}}}}
        ]
        status_breakdown = {}
        async for result in db.leads.aggregate(status_pipeline):
            status_breakdown[result["_id"] or "unknown"] = {"count": result["count"], "value": result["value"]}
        
        # Source breakdown
        source_pipeline = [
            {"$match": query},
            {"$group": {"_id": "$source", "count": {"$sum": 1}}}
        ]
        source_breakdown = {}
        async for result in db.leads.aggregate(source_pipeline):
            source_breakdown[result["_id"] or "unknown"] = result["count"]
        
        # Priority breakdown
        priority_pipeline = [
            {"$match": query},
            {"$group": {"_id": "$priority", "count": {"$sum": 1}}}
        ]
        priority_breakdown = {}
        async for result in db.leads.aggregate(priority_pipeline):
            priority_breakdown[result["_id"] or "unknown"] = result["count"]
        
        # City breakdown (top 10)
        city_pipeline = [
            {"$match": {**query, "city": {"$ne": None, "$ne": ""}}},
            {"$group": {"_id": "$city", "count": {"$sum": 1}, "value": {"$sum": {"$ifNull": ["$estimated_value", 0]}}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        city_breakdown = []
        async for result in db.leads.aggregate(city_pipeline):
            city_breakdown.append({"city": result["_id"], "count": result["count"], "value": result["value"]})
        
        # State breakdown
        state_pipeline = [
            {"$match": {**query, "state": {"$ne": None, "$ne": ""}}},
            {"$group": {"_id": "$state", "count": {"$sum": 1}, "value": {"$sum": {"$ifNull": ["$estimated_value", 0]}}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        state_breakdown = []
        async for result in db.leads.aggregate(state_pipeline):
            state_breakdown.append({"state": result["_id"], "count": result["count"], "value": result["value"]})
        
        # Category breakdown
        category_pipeline = [
            {"$match": {**query, "category_id": {"$ne": None}}},
            {"$group": {"_id": "$category_id", "count": {"$sum": 1}, "value": {"$sum": {"$ifNull": ["$estimated_value", 0]}}}}
        ]
        category_breakdown = []
        async for result in db.leads.aggregate(category_pipeline):
            cat = await db.lead_categories.find_one({"_id": ObjectId(result["_id"])})
            cat_name = cat.get("name", "Unknown") if cat else "Unknown"
            category_breakdown.append({"category_id": result["_id"], "name": cat_name, "count": result["count"], "value": result["value"]})
        
        # Funnel breakdown
        funnel_pipeline = [
            {"$match": {**query, "funnel_id": {"$ne": None}}},
            {"$group": {"_id": "$funnel_id", "count": {"$sum": 1}}}
        ]
        funnel_breakdown = []
        async for result in db.leads.aggregate(funnel_pipeline):
            funnel = await db.crm_funnels.find_one({"_id": ObjectId(result["_id"])})
            funnel_name = funnel.get("name", "Unknown") if funnel else "Unknown"
            funnel_breakdown.append({"funnel_id": result["_id"], "name": funnel_name, "count": result["count"]})
        
        # Monthly trend (last 6 months)
        six_months_ago = datetime.utcnow() - timedelta(days=180)
        trend_pipeline = [
            {"$match": {**query, "created_at": {"$gte": six_months_ago}}},
            {"$group": {
                "_id": {"year": {"$year": "$created_at"}, "month": {"$month": "$created_at"}},
                "count": {"$sum": 1},
                "value": {"$sum": {"$ifNull": ["$estimated_value", 0]}}
            }},
            {"$sort": {"_id.year": 1, "_id.month": 1}}
        ]
        monthly_trend = []
        async for result in db.leads.aggregate(trend_pipeline):
            monthly_trend.append({
                "year": result["_id"]["year"],
                "month": result["_id"]["month"],
                "count": result["count"],
                "value": result["value"]
            })
        
        # Value ranges
        value_ranges = {
            "0-1L": await db.leads.count_documents({**query, "estimated_value": {"$gte": 0, "$lt": 100000}}),
            "1L-5L": await db.leads.count_documents({**query, "estimated_value": {"$gte": 100000, "$lt": 500000}}),
            "5L-10L": await db.leads.count_documents({**query, "estimated_value": {"$gte": 500000, "$lt": 1000000}}),
            "10L-50L": await db.leads.count_documents({**query, "estimated_value": {"$gte": 1000000, "$lt": 5000000}}),
            "50L+": await db.leads.count_documents({**query, "estimated_value": {"$gte": 5000000}})
        }
        
        # Calculate totals
        total_pipeline = [
            {"$match": query},
            {"$group": {"_id": None, "total_value": {"$sum": {"$ifNull": ["$estimated_value", 0]}}}}
        ]
        total_value = 0
        async for result in db.leads.aggregate(total_pipeline):
            total_value = result["total_value"]
        
        won_query = {**query, "status": "won"}
        won_count = await db.leads.count_documents(won_query)
        won_pipeline = [
            {"$match": won_query},
            {"$group": {"_id": None, "won_value": {"$sum": {"$ifNull": ["$estimated_value", 0]}}}}
        ]
        won_value = 0
        async for result in db.leads.aggregate(won_pipeline):
            won_value = result["won_value"]
        
        lost_count = await db.leads.count_documents({**query, "status": "lost"})
        conversion_rate = round((won_count / total_leads * 100), 2) if total_leads > 0 else 0
        
        return {
            "summary": {
                "total_leads": total_leads,
                "total_pipeline_value": total_value,
                "won_leads": won_count,
                "won_value": won_value,
                "lost_leads": lost_count,
                "conversion_rate": conversion_rate,
                "average_deal_value": round(total_value / total_leads, 2) if total_leads > 0 else 0
            },
            "by_status": status_breakdown,
            "by_source": source_breakdown,
            "by_priority": priority_breakdown,
            "by_city": city_breakdown,
            "by_state": state_breakdown,
            "by_category": category_breakdown,
            "by_funnel": funnel_breakdown,
            "by_value_range": value_ranges,
            "monthly_trend": monthly_trend
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get CRM analytics: {str(e)}")


@api_router.get("/crm/dashboard/filters")
async def get_crm_filter_options(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all available filter options for CRM dashboard"""
    try:
        await get_current_user(credentials)
        
        # Get unique cities
        cities = await db.leads.distinct("city", {"city": {"$ne": None, "$ne": ""}, "is_deleted": {"$ne": True}})
        
        # Get unique states
        states = await db.leads.distinct("state", {"state": {"$ne": None, "$ne": ""}, "is_deleted": {"$ne": True}})
        
        # Get categories
        categories = []
        async for cat in db.lead_categories.find({"is_active": {"$ne": False}}):
            categories.append({"id": str(cat["_id"]), "name": cat.get("name", "Unknown")})
        
        # Get funnels
        funnels = []
        async for funnel in db.crm_funnels.find({"is_active": {"$ne": False}}):
            funnels.append({"id": str(funnel["_id"]), "name": funnel.get("name", "Unknown")})
        
        # Get assigned users
        assigned_users = []
        user_ids = await db.leads.distinct("assigned_to", {"assigned_to": {"$ne": None}, "is_deleted": {"$ne": True}})
        for uid in user_ids:
            try:
                user = await db.users.find_one({"_id": ObjectId(uid)})
                if user:
                    assigned_users.append({"id": uid, "name": user.get("full_name", "Unknown")})
            except:
                pass
        
        return {
            "cities": sorted([c for c in cities if c]),
            "states": sorted([s for s in states if s]),
            "categories": categories,
            "funnels": funnels,
            "statuses": ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost", "on_hold"],
            "sources": ["website", "referral", "social_media", "cold_call", "walk_in", "advertisement", "partner", "other"],
            "priorities": ["low", "medium", "high", "urgent"],
            "assigned_users": assigned_users,
            "value_ranges": [
                {"label": "Under ₹1L", "min": 0, "max": 100000},
                {"label": "₹1L - ₹5L", "min": 100000, "max": 500000},
                {"label": "₹5L - ₹10L", "min": 500000, "max": 1000000},
                {"label": "₹10L - ₹50L", "min": 1000000, "max": 5000000},
                {"label": "Above ₹50L", "min": 5000000, "max": None}
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get filter options: {str(e)}")


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
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER, "crm_manager"]:
        raise HTTPException(status_code=403, detail="Only admins, PMs and CRM managers can access CRM")
    
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
    """Get all leads with filtering - CRM role-based access"""
    current_user = await get_current_user(credentials)
    
    # Require CRM access (Admin, CRM Manager, or CRM User)
    require_crm_access(current_user)
    
    # Log audit trail
    await log_crm_audit(
        user=current_user,
        action=CRMAuditAction.READ,
        resource_type="leads",
        details={"filters": {"category_id": category_id, "status": status, "search": search}}
    )
    
    query = {"is_deleted": {"$ne": True}}
    
    # CRM Users can only see leads assigned to them
    if current_user["role"] == UserRole.CRM_USER:
        query["assigned_to"] = str(current_user["_id"])
    
    if category_id:
        query["category_id"] = category_id
    if status:
        query["status"] = status
    if assigned_to and is_crm_manager(current_user):
        # Only managers can filter by assigned_to
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
    """Create a new lead - CRM role-based access"""
    current_user = await get_current_user(credentials)
    
    # Require CRM access (Admin, CRM Manager, or CRM User can create)
    require_crm_access(current_user)
    
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
    
    # Log audit trail
    await log_crm_audit(
        user=current_user,
        action=CRMAuditAction.CREATE,
        resource_type="lead",
        resource_id=lead_id,
        details={"name": lead.name, "category_id": lead.category_id, "status": lead.status}
    )
    
    return LeadResponse(**lead_dict)

@api_router.get("/crm/leads/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get a single lead by ID"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER, "crm_manager"]:
        raise HTTPException(status_code=403, detail="Only admins, PMs and CRM managers can access CRM")
    
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
    """Update a lead with field audit logging - CRM role-based access"""
    current_user = await get_current_user(credentials)
    
    # Require CRM access
    require_crm_access(current_user)
    
    existing = await db.leads.find_one({"_id": ObjectId(lead_id), "is_deleted": {"$ne": True}})
    if not existing:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Check if user can update this lead
    if not can_update_lead(current_user, existing):
        await log_crm_audit(
            user=current_user,
            action=CRMAuditAction.ACCESS_DENIED,
            resource_type="lead",
            resource_id=lead_id,
            success=False,
            error_message="User not authorized to update this lead"
        )
        raise HTTPException(status_code=403, detail="You can only update leads assigned to you")
    
    update_data = lead_update.dict(exclude_unset=True)
    
    # Check if CRM User is trying to change ownership
    if "assigned_to" in update_data and not can_reassign_lead(current_user):
        await log_crm_audit(
            user=current_user,
            action=CRMAuditAction.ACCESS_DENIED,
            resource_type="lead",
            resource_id=lead_id,
            success=False,
            error_message="CRM User cannot reassign leads"
        )
        raise HTTPException(status_code=403, detail="You don't have permission to reassign leads")
    
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
    """Soft delete a lead - CRM Manager only"""
    current_user = await get_current_user(credentials)
    
    # Only CRM Managers can delete leads
    if not can_delete_lead(current_user):
        await log_crm_audit(
            user=current_user,
            action=CRMAuditAction.ACCESS_DENIED,
            resource_type="lead",
            resource_id=lead_id,
            success=False,
            error_message="Only CRM Managers can delete leads"
        )
        raise HTTPException(status_code=403, detail="Only CRM Managers can delete leads")
    
    existing = await db.leads.find_one({"_id": ObjectId(lead_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    await db.leads.update_one(
        {"_id": ObjectId(lead_id)},
        {"$set": {"is_deleted": True, "updated_at": datetime.utcnow()}}
    )
    
    # Log audit trail
    await log_crm_audit(
        user=current_user,
        action=CRMAuditAction.DELETE,
        resource_type="lead",
        resource_id=lead_id,
        details={"lead_name": existing.get("name")}
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
    
    if current_user["role"] not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER, "crm_manager"]:
        raise HTTPException(status_code=403, detail="Only admins, PMs and CRM managers can access CRM")
    
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
    
    # Transfer estimates from lead to project
    estimates_transferred = 0
    try:
        # Find all estimates linked to this lead
        lead_estimates = await db.estimates.find({"lead_id": request.lead_id}).to_list(100)
        
        if lead_estimates:
            # Update estimates to link to the new project
            for estimate in lead_estimates:
                await db.estimates.update_one(
                    {"_id": estimate["_id"]},
                    {"$set": {
                        "project_id": project_id,
                        "updated_at": datetime.utcnow(),
                        "notes": f"{estimate.get('notes', '') or ''}\n[Transferred from Lead on {datetime.utcnow().strftime('%Y-%m-%d')}]".strip()
                    }}
                )
                estimates_transferred += 1
            
            # Create audit log for estimate transfer
            await create_audit_log(
                action_type=AuditActionType.DATA_MIGRATION,
                description=f"Transferred {estimates_transferred} estimate(s) from lead to project",
                entity_type="estimate",
                entity_id=project_id,
                user=current_user,
                new_data={"estimates_count": estimates_transferred, "project_id": project_id}
            )
    except Exception as e:
        print(f"Warning: Failed to transfer estimates: {e}")
    
    message = f"Lead successfully converted to project{' (bank transaction bypassed)' if request.bypass_transaction else ''}"
    if estimates_transferred > 0:
        message += f". {estimates_transferred} estimate(s) transferred."
    
    return MoveLeadToProjectResponse(
        success=True,
        project_id=project_id,
        project_name=request.project_name,
        transaction_id=transaction_id,
        bypassed=request.bypass_transaction,
        message=message
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
    """Authenticate client using project ID/code and mobile number"""
    try:
        project_id = credentials.get("project_id")
        mobile = credentials.get("mobile")
        
        if not project_id or not mobile:
            raise HTTPException(status_code=400, detail="Project ID and mobile number required")
        
        # Find project - support both MongoDB ObjectId and project_code (SCMMYY123456)
        project = None
        
        # Check if it's a project code (starts with SC)
        if project_id.upper().startswith("SC"):
            project = await db.projects.find_one({"project_code": project_id.upper()})
            if project:
                project_id = str(project["_id"])  # Use actual ObjectId for token
        else:
            # Try as MongoDB ObjectId
            try:
                project = await db.projects.find_one({"_id": ObjectId(project_id)})
            except:
                pass
        
        if not project:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Check if mobile matches client_contact, client_phone or owner's phone
        # Normalize the input mobile
        input_mobile = mobile.replace(" ", "").replace("-", "").replace("+", "")
        # Remove leading country code if present (e.g., 91 for India)
        if len(input_mobile) > 10 and input_mobile.startswith("91"):
            input_mobile = input_mobile[2:]
        
        # Get client phone from either client_contact or client_phone field
        client_phone = project.get("client_contact") or project.get("client_phone") or ""
        client_phone = str(client_phone).replace(" ", "").replace("-", "").replace("+", "")
        if len(client_phone) > 10 and client_phone.startswith("91"):
            client_phone = client_phone[2:]
        
        phone_matched = False
        
        # Check client phone
        if client_phone and client_phone == input_mobile:
            phone_matched = True
        
        # Also check owner's phone if client_phone doesn't match
        if not phone_matched:
            owner_id = project.get("owner_id")
            if owner_id:
                owner = await db.users.find_one({"_id": ObjectId(owner_id)})
                if owner:
                    owner_phone = str(owner.get("phone", "")).replace(" ", "").replace("-", "").replace("+", "")
                    if len(owner_phone) > 10 and owner_phone.startswith("91"):
                        owner_phone = owner_phone[2:]
                    if owner_phone and owner_phone == input_mobile:
                        phone_matched = True
        
        if not phone_matched:
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


@api_router.post("/projects/{project_id}/send-client-credentials")
async def send_client_portal_credentials(
    project_id: str,
    send_options: dict,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Send client portal access credentials via WhatsApp, SMS, and/or Email.
    
    send_options:
    - send_whatsapp: bool
    - send_sms: bool
    - send_email: bool
    - client_phone: str (optional, overrides project's client_contact)
    - client_email: str (optional)
    - custom_message: str (optional)
    """
    current_user = await get_current_user(credentials)
    
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get client contact info
    client_phone = send_options.get("client_phone") or project.get("client_contact") or project.get("client_phone")
    client_email = send_options.get("client_email") or project.get("client_email")
    client_name = project.get("client_name", "Client")
    project_name = project.get("name", "Project")
    project_code = project.get("project_code") or project.get("code") or project_id
    
    # Generate client portal link using project_code
    base_url = "https://labourmanage.preview.emergentagent.com"
    portal_link = f"{base_url}/client-portal/?projectId={project_code}"
    
    # Create credential message with project_code
    message = f"""
🏗️ *{project_name}* - Client Portal Access

Dear {client_name},

Your project portal is now ready! You can track progress, view updates, and communicate with the team.

📱 *Portal Link:*
{portal_link}

🔐 *Login Credentials:*
• Phone Number: {client_phone}
• Project Code: {project_code}

Simply click the link and enter your registered phone number to access your project dashboard.

Best regards,
{current_user.get('full_name', 'Project Team')}
"""
    
    results = {
        "whatsapp": {"sent": False, "status": "not_requested"},
        "sms": {"sent": False, "status": "not_requested"},
        "email": {"sent": False, "status": "not_requested"}
    }
    
    # Send via WhatsApp
    if send_options.get("send_whatsapp") and client_phone:
        try:
            # Check if WhatsApp config exists
            whatsapp_config = await db.app_configurations.find_one({"config_type": "whatsapp"})
            if whatsapp_config and whatsapp_config.get("settings", {}).get("enabled"):
                # For now, generate a WhatsApp link (actual API integration can be added)
                clean_phone = client_phone.replace(" ", "").replace("-", "").replace("+", "")
                if not clean_phone.startswith("91"):
                    clean_phone = "91" + clean_phone
                whatsapp_text = message.replace("*", "").replace("\n", "%0A")
                whatsapp_link = f"https://wa.me/{clean_phone}?text={whatsapp_text}"
                results["whatsapp"] = {"sent": True, "status": "link_generated", "link": whatsapp_link}
            else:
                # Generate WhatsApp link even without config
                clean_phone = client_phone.replace(" ", "").replace("-", "").replace("+", "")
                if not clean_phone.startswith("91"):
                    clean_phone = "91" + clean_phone
                import urllib.parse
                whatsapp_text = urllib.parse.quote(message.replace("*", ""))
                whatsapp_link = f"https://wa.me/{clean_phone}?text={whatsapp_text}"
                results["whatsapp"] = {"sent": True, "status": "link_generated", "link": whatsapp_link}
        except Exception as e:
            results["whatsapp"] = {"sent": False, "status": "error", "error": str(e)}
    
    # Send via SMS
    if send_options.get("send_sms") and client_phone:
        try:
            sms_config = await db.app_configurations.find_one({"config_type": "sms"})
            if sms_config and sms_config.get("settings", {}).get("enabled"):
                # SMS would be sent via configured provider (Twilio, etc.)
                # For now, mark as configured but not sent (requires actual SMS API)
                results["sms"] = {"sent": False, "status": "sms_config_found", "message": "SMS API integration pending"}
            else:
                results["sms"] = {"sent": False, "status": "sms_not_configured"}
        except Exception as e:
            results["sms"] = {"sent": False, "status": "error", "error": str(e)}
    
    # Send via Email
    if send_options.get("send_email") and client_email:
        try:
            # Email would be sent via configured provider
            # For now, mark as pending
            results["email"] = {"sent": False, "status": "email_pending", "email": client_email}
        except Exception as e:
            results["email"] = {"sent": False, "status": "error", "error": str(e)}
    
    # Store the credential send record
    credential_record = {
        "project_id": project_id,
        "client_name": client_name,
        "client_phone": client_phone,
        "client_email": client_email,
        "portal_link": portal_link,
        "sent_by": str(current_user["_id"]),
        "sent_by_name": current_user.get("full_name"),
        "send_results": results,
        "created_at": datetime.utcnow()
    }
    await db.client_credential_sends.insert_one(credential_record)
    
    # Update project with client portal link and contact info
    update_fields = {
        "client_portal_link": portal_link,
        "client_credentials_sent_at": datetime.utcnow()
    }
    # Also update client contact info if provided (so login works!)
    if client_phone:
        update_fields["client_contact"] = client_phone
    if client_email:
        update_fields["client_email"] = client_email
    
    await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": update_fields}
    )
    
    # Create notification for the sender
    await db.notifications.insert_one({
        "user_id": str(current_user["_id"]),
        "type": "client_credentials_sent",
        "title": "Client Credentials Sent",
        "message": f"Client portal credentials for {project_name} have been generated",
        "data": {
            "project_id": project_id,
            "client_name": client_name,
            "portal_link": portal_link
        },
        "read": False,
        "created_at": datetime.utcnow()
    })
    
    # Create a conversation for client chat if it doesn't exist
    existing_conversation = await db.conversations.find_one({"project_id": project_id})
    if not existing_conversation:
        conversation_doc = {
            "project_id": project_id,
            "name": f"{project_name} - Client Chat",
            "type": "client_portal",
            "participants": [str(current_user["_id"])],
            "client_name": client_name,
            "client_phone": client_phone,
            "created_by": str(current_user["_id"]),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db.conversations.insert_one(conversation_doc)
    
    return {
        "success": True,
        "project_id": project_id,
        "portal_link": portal_link,
        "client_phone": client_phone,
        "client_email": client_email,
        "results": results,
        "message": message
    }


@api_router.get("/projects/{project_id}/client-credentials-history")
async def get_client_credentials_history(
    project_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get history of credential sends for a project"""
    await get_current_user(credentials)
    
    history = await db.client_credential_sends.find(
        {"project_id": project_id}
    ).sort("created_at", -1).to_list(100)
    
    return [serialize_doc(h) for h in history]


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
        
        # Support both project_code (SCMMYY123456) and MongoDB ObjectId
        project = None
        actual_project_id = project_id
        
        if project_id.upper().startswith("SC"):
            # It's a project code
            project = await db.projects.find_one({"project_code": project_id.upper()})
            if project:
                actual_project_id = str(project["_id"])
        else:
            # Try as MongoDB ObjectId
            try:
                project = await db.projects.find_one({"_id": ObjectId(project_id)})
            except:
                pass
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Use the actual MongoDB ObjectId for queries
        actual_project_id = str(project["_id"])
        
        # Get timeline/milestones for Gantt chart
        milestones = await db.milestones.find(
            {"project_id": actual_project_id}
        ).sort("order", 1).to_list(length=100)
        
        # Get conversation if exists
        conversation = await db.conversations.find_one({"project_id": actual_project_id})
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



# ============= Comprehensive Dashboard API =============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get comprehensive dashboard statistics based on user role"""
    current_user = await get_current_user(credentials)
    user_role = current_user.get("role")
    user_id = str(current_user.get("_id"))
    
    stats = {
        "user": {
            "name": current_user.get("full_name"),
            "role": user_role,
            "email": current_user.get("email")
        },
        "projects": {},
        "tasks": {},
        "crm": {},
        "materials": {},
        "labor": {},
        "finance": {},
        "recent_activity": []
    }
    
    try:
        # Projects Statistics
        if user_role in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
            total_projects = await db.projects.count_documents({})
            active_projects = await db.projects.count_documents({"status": "in_progress"})
            completed_projects = await db.projects.count_documents({"status": "completed"})
            planning_projects = await db.projects.count_documents({"status": "planning"})
            
            stats["projects"] = {
                "total": total_projects,
                "active": active_projects,
                "completed": completed_projects,
                "planning": planning_projects,
                "completion_rate": round((completed_projects / max(total_projects, 1)) * 100, 1)
            }
            
            # Project status distribution
            status_pipeline = [
                {"$group": {"_id": "$status", "count": {"$sum": 1}}}
            ]
            status_dist = await db.projects.aggregate(status_pipeline).to_list(100)
            stats["projects"]["status_distribution"] = {item["_id"]: item["count"] for item in status_dist}
        
        # Tasks Statistics  
        if user_role in [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.ENGINEER]:
            # All tasks
            total_tasks = await db.tasks.count_documents({})
            pending_tasks = await db.tasks.count_documents({"status": "pending"})
            in_progress_tasks = await db.tasks.count_documents({"status": "in_progress"})
            completed_tasks = await db.tasks.count_documents({"status": "completed"})
            
            # My tasks
            my_tasks = await db.tasks.count_documents({"assigned_to": user_id})
            my_pending = await db.tasks.count_documents({"assigned_to": user_id, "status": {"$in": ["pending", "in_progress"]}})
            
            stats["tasks"] = {
                "total": total_tasks,
                "pending": pending_tasks,
                "in_progress": in_progress_tasks,
                "completed": completed_tasks,
                "my_tasks": my_tasks,
                "my_pending": my_pending,
                "completion_rate": round((completed_tasks / max(total_tasks, 1)) * 100, 1)
            }
            
            # Overdue tasks
            from datetime import datetime
            overdue_tasks = await db.tasks.count_documents({
                "status": {"$ne": "completed"},
                "end_date": {"$lt": datetime.utcnow()}
            })
            stats["tasks"]["overdue"] = overdue_tasks
        
        # CRM Statistics
        if user_role in [UserRole.ADMIN, UserRole.CRM_MANAGER, UserRole.CRM_USER]:
            if user_role == UserRole.CRM_USER:
                # CRM Users only see their leads
                lead_query = {"assigned_to": user_id, "is_deleted": {"$ne": True}}
            else:
                lead_query = {"is_deleted": {"$ne": True}}
            
            total_leads = await db.leads.count_documents(lead_query)
            new_leads = await db.leads.count_documents({**lead_query, "status": "new"})
            qualified_leads = await db.leads.count_documents({**lead_query, "status": "qualified"})
            won_leads = await db.leads.count_documents({**lead_query, "status": "won"})
            lost_leads = await db.leads.count_documents({**lead_query, "status": "lost"})
            
            stats["crm"] = {
                "total_leads": total_leads,
                "new_leads": new_leads,
                "qualified_leads": qualified_leads,
                "won_leads": won_leads,
                "lost_leads": lost_leads,
                "conversion_rate": round((won_leads / max(total_leads, 1)) * 100, 1)
            }
            
            # Lead status distribution
            status_pipeline = [
                {"$match": lead_query},
                {"$group": {"_id": "$status", "count": {"$sum": 1}}}
            ]
            lead_status = await db.leads.aggregate(status_pipeline).to_list(100)
            stats["crm"]["status_distribution"] = {item["_id"]: item["count"] for item in lead_status}
            
            # Lead source distribution
            source_pipeline = [
                {"$match": lead_query},
                {"$group": {"_id": "$source", "count": {"$sum": 1}}}
            ]
            lead_sources = await db.leads.aggregate(source_pipeline).to_list(100)
            stats["crm"]["source_distribution"] = {item["_id"]: item["count"] for item in lead_sources}
        
        # Materials & Inventory Statistics
        if user_role in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
            total_materials = await db.materials.count_documents({})
            low_stock_materials = await db.materials.count_documents({
                "$expr": {"$lt": ["$stock_level", "$min_stock_level"]}
            })
            out_of_stock = await db.materials.count_documents({"stock_level": 0})
            
            stats["materials"] = {
                "total": total_materials,
                "low_stock": low_stock_materials,
                "out_of_stock": out_of_stock,
                "stock_alert_rate": round((low_stock_materials / max(total_materials, 1)) * 100, 1)
            }
            
            # Total inventory value
            value_pipeline = [
                {"$project": {"total_value": {"$multiply": ["$stock_level", "$unit_cost"]}}}
            ]
            material_values = await db.materials.aggregate(value_pipeline).to_list(10000)
            total_inventory_value = sum((m.get("total_value") or 0) for m in material_values)
            stats["materials"]["inventory_value"] = round(total_inventory_value, 2)
            
            # Vendors
            total_vendors = await db.vendors.count_documents({})
            stats["materials"]["total_vendors"] = total_vendors
        
        # Labor Statistics
        if user_role in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
            total_workers = await db.workers.count_documents({})
            active_workers = await db.workers.count_documents({"status": "active"})
            
            stats["labor"] = {
                "total_workers": total_workers,
                "active_workers": active_workers
            }
            
            # Today's attendance
            from datetime import datetime, timedelta
            today = datetime.utcnow().date()
            today_attendance = await db.labor_attendance.count_documents({
                "attendance_date": {"$gte": datetime.combine(today, datetime.min.time())}
            })
            stats["labor"]["today_attendance"] = today_attendance
            
            # This month's labor cost
            month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            month_wages_pipeline = [
                {"$match": {"attendance_date": {"$gte": month_start}}},
                {"$group": {"_id": None, "total_wages": {"$sum": "$wages_earned"}}}
            ]
            month_wages_result = await db.labor_attendance.aggregate(month_wages_pipeline).to_list(1)
            month_wages = month_wages_result[0].get("total_wages", 0) if month_wages_result else 0
            month_wages = month_wages or 0  # Handle None
            stats["labor"]["month_wages"] = round(month_wages, 2)
        
        # Finance Statistics
        if user_role in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
            # Total expenses this month
            from datetime import datetime
            month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            expenses_pipeline = [
                {"$match": {"expense_date": {"$gte": month_start}}},
                {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
            ]
            expenses_result = await db.expenses.aggregate(expenses_pipeline).to_list(1)
            month_expenses = expenses_result[0].get("total", 0) if expenses_result else 0
            month_expenses = month_expenses or 0  # Handle None
            
            # Total payments this month
            payments_pipeline = [
                {"$match": {"payment_date": {"$gte": month_start}}},
                {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
            ]
            payments_result = await db.payments.aggregate(payments_pipeline).to_list(1)
            month_payments = payments_result[0].get("total", 0) if payments_result else 0
            month_payments = month_payments or 0  # Handle None
            
            # Total invoices
            total_invoices = await db.invoices.count_documents({})
            pending_invoices = await db.invoices.count_documents({"status": "pending"})
            
            stats["finance"] = {
                "month_expenses": round(month_expenses, 2),
                "month_payments": round(month_payments, 2),
                "total_invoices": total_invoices,
                "pending_invoices": pending_invoices,
                "cash_flow": round(month_payments - month_expenses, 2)
            }
            
            # Payables & Receivables
            try:
                # Payables (vendor bills/purchase orders pending)
                payables_pipeline = [
                    {"$match": {"status": {"$in": ["pending", "partial"]}}},
                    {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
                ]
                payables_result = await db.purchase_orders.aggregate(payables_pipeline).to_list(1)
                total_payables = payables_result[0].get("total", 0) if payables_result else 0
                
                # Receivables (pending invoices to clients)
                receivables_pipeline = [
                    {"$match": {"status": {"$in": ["pending", "sent", "partial"]}}},
                    {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
                ]
                receivables_result = await db.invoices.aggregate(receivables_pipeline).to_list(1)
                total_receivables = receivables_result[0].get("total", 0) if receivables_result else 0
                
                # Overdue amounts
                today = datetime.utcnow()
                overdue_payables_pipeline = [
                    {"$match": {"status": {"$in": ["pending", "partial"]}, "due_date": {"$lt": today}}},
                    {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
                ]
                overdue_payables_result = await db.purchase_orders.aggregate(overdue_payables_pipeline).to_list(1)
                overdue_payables = overdue_payables_result[0].get("total", 0) if overdue_payables_result else 0
                
                overdue_receivables_pipeline = [
                    {"$match": {"status": {"$in": ["pending", "sent", "partial"]}, "due_date": {"$lt": today}}},
                    {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
                ]
                overdue_receivables_result = await db.invoices.aggregate(overdue_receivables_pipeline).to_list(1)
                overdue_receivables = overdue_receivables_result[0].get("total", 0) if overdue_receivables_result else 0
                
                stats["finance"]["payables"] = round(total_payables or 0, 2)
                stats["finance"]["receivables"] = round(total_receivables or 0, 2)
                stats["finance"]["overdue_payables"] = round(overdue_payables or 0, 2)
                stats["finance"]["overdue_receivables"] = round(overdue_receivables or 0, 2)
            except Exception as e:
                print(f"Error calculating payables/receivables: {e}")
        
        # Recent Activity (last 10 items)
        recent_activities = []
        
        # Recent tasks
        recent_tasks = await db.tasks.find({}).sort("created_at", -1).limit(5).to_list(5)
        for task in recent_tasks:
            recent_activities.append({
                "type": "task",
                "action": "created",
                "title": task.get("title", "Unnamed Task"),
                "timestamp": task.get("created_at"),
                "icon": "checkmark-circle"
            })
        
        # Recent leads (if CRM access)
        if user_role in [UserRole.ADMIN, UserRole.CRM_MANAGER, UserRole.CRM_USER]:
            lead_query = {"is_deleted": {"$ne": True}}
            if user_role == UserRole.CRM_USER:
                lead_query["assigned_to"] = user_id
            
            recent_leads = await db.leads.find(lead_query).sort("created_at", -1).limit(3).to_list(3)
            for lead in recent_leads:
                recent_activities.append({
                    "type": "lead",
                    "action": "created",
                    "title": lead.get("name", "Unnamed Lead"),
                    "timestamp": lead.get("created_at"),
                    "icon": "person-add"
                })
        
        # Sort by timestamp
        recent_activities.sort(key=lambda x: x.get("timestamp") or datetime.min, reverse=True)
        stats["recent_activity"] = recent_activities[:10]
        
        return stats
    
    except Exception as e:
        logging.error(f"Error fetching dashboard stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch dashboard statistics")


# ============= Data Export/Import Routes (Admin Only) =============

@api_router.get("/admin/export/template/{data_type}")
async def download_template(
    data_type: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Download CSV template for data import (Admin only)"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        csv_content = generate_csv_template(data_type)
        
        from fastapi.responses import Response
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={data_type}_template.csv"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/admin/export/{data_type}")
async def export_data(
    data_type: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Export data to CSV (Admin only)"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Get data based on type
        if data_type == "leads":
            data = await db.leads.find({"is_deleted": {"$ne": True}}).to_list(10000)
            fields = EXPORT_TEMPLATES["leads"]["fields"]
        
        elif data_type == "projects":
            data = await db.projects.find({}).to_list(10000)
            fields = EXPORT_TEMPLATES["projects"]["fields"]
        
        elif data_type == "vendors":
            data = await db.vendors.find({}).to_list(10000)
            fields = EXPORT_TEMPLATES["vendors"]["fields"]
        
        elif data_type == "materials":
            data = await db.materials.find({}).to_list(10000)
            fields = EXPORT_TEMPLATES["materials"]["fields"]
        
        elif data_type == "workers":
            data = await db.workers.find({}).to_list(10000)
            fields = EXPORT_TEMPLATES["workers"]["fields"]
        
        elif data_type == "tasks":
            data = await db.tasks.find({}).to_list(10000)
            fields = ["id", "title", "description", "status", "priority", "project_id", "milestone_id", "assigned_to", "start_date", "due_date", "estimated_cost", "actual_cost", "created_at"]
        
        elif data_type == "estimates":
            data = await db.estimates.find({}).to_list(10000)
            fields = ["id", "project_id", "lead_id", "version", "version_name", "status", "built_up_area_sqft", "grand_total", "cost_per_sqft", "reviewed_by_name", "reviewed_at", "approved_by_name", "approved_at", "created_at"]
        
        else:
            raise HTTPException(status_code=400, detail=f"Unknown data type: {data_type}")
        
        # Convert to serializable format
        data_list = [serialize_doc(doc) for doc in data]
        
        # Generate CSV
        csv_content = export_data_to_csv(data_list, fields)
        
        from fastapi.responses import Response
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={data_type}_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
            }
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/import/{data_type}")
async def import_data(
    data_type: str,
    file: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Import data from CSV (Admin only)"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Read file content
        content = await file.read()
        file_content = content.decode('utf-8')
        
        # Parse CSV
        parsed_data = parse_csv_import(file_content, data_type)
        
        # Validate data
        errors = validate_import_data(parsed_data, data_type)
        if errors:
            return {
                "success": False,
                "message": "Validation failed",
                "errors": errors[:10],  # Return first 10 errors
                "total_errors": len(errors)
            }
        
        # Import data based on type
        imported_count = 0
        skipped_count = 0
        error_rows = []
        
        for row in parsed_data:
            try:
                # Remove import tracking field
                row_num = row.pop("_import_row", 0)
                
                # Add metadata
                row["created_at"] = datetime.utcnow()
                row["updated_at"] = datetime.utcnow()
                row["created_by"] = str(current_user["_id"])
                
                if data_type == "leads":
                    row["is_deleted"] = False
                    # Check for duplicates
                    existing = await db.leads.find_one({
                        "primary_phone": row.get("primary_phone"),
                        "is_deleted": {"$ne": True}
                    })
                    if existing:
                        skipped_count += 1
                        continue
                    
                    await db.leads.insert_one(row)
                
                elif data_type == "projects":
                    # Check for duplicates
                    existing = await db.projects.find_one({"name": row.get("name")})
                    if existing:
                        skipped_count += 1
                        continue
                    
                    row["team_member_ids"] = []
                    await db.projects.insert_one(row)
                
                elif data_type == "vendors":
                    # Check for duplicates
                    existing = await db.vendors.find_one({"name": row.get("name")})
                    if existing:
                        skipped_count += 1
                        continue
                    
                    await db.vendors.insert_one(row)
                
                elif data_type == "materials":
                    # Check for duplicates
                    existing = await db.materials.find_one({"name": row.get("name")})
                    if existing:
                        skipped_count += 1
                        continue
                    
                    row["stock_level"] = 0
                    await db.materials.insert_one(row)
                
                elif data_type == "workers":
                    # Check for duplicates
                    existing = await db.workers.find_one({"phone": row.get("phone")})
                    if existing:
                        skipped_count += 1
                        continue
                    
                    await db.workers.insert_one(row)
                
                imported_count += 1
            
            except Exception as e:
                error_rows.append(f"Row {row_num}: {str(e)}")
        
        return {
            "success": True,
            "message": f"Import completed",
            "imported": imported_count,
            "skipped": skipped_count,
            "errors": error_rows if error_rows else None
        }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/export-options")
async def get_export_options(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get list of available export/import options (Admin only)"""
    current_user = await get_current_user(credentials)
    
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get counts for each data type
    counts = {}
    
    try:
        counts["leads"] = await db.leads.count_documents({"is_deleted": {"$ne": True}})
        counts["projects"] = await db.projects.count_documents({})
        counts["vendors"] = await db.vendors.count_documents({})
        counts["materials"] = await db.materials.count_documents({})
        counts["workers"] = await db.workers.count_documents({})
        counts["tasks"] = await db.tasks.count_documents({})
        counts["estimates"] = await db.estimates.count_documents({})
    except:
        pass
    
    return {
        "counts": counts,
        "data_types": [
            {
                "id": "leads",
                "name": "Leads",
                "description": "CRM leads with contact information",
                "count": counts.get("leads", 0),
                "fields": len(EXPORT_TEMPLATES["leads"]["fields"])
            },
            {
                "id": "projects",
                "name": "Projects",
                "description": "Construction projects",
                "count": counts.get("projects", 0),
                "fields": len(EXPORT_TEMPLATES["projects"]["fields"])
            },
            {
                "id": "vendors",
                "name": "Vendors",
                "description": "Vendor/supplier information",
                "count": counts.get("vendors", 0),
                "fields": len(EXPORT_TEMPLATES["vendors"]["fields"])
            },
            {
                "id": "materials",
                "name": "Materials",
                "description": "Construction materials inventory",
                "count": counts.get("materials", 0),
                "fields": len(EXPORT_TEMPLATES["materials"]["fields"])
            },
            {
                "id": "workers",
                "name": "Workers",
                "description": "Labour/worker information",
                "count": counts.get("workers", 0),
                "fields": len(EXPORT_TEMPLATES["workers"]["fields"])
            },
            {
                "id": "tasks",
                "name": "Tasks",
                "description": "Project tasks",
                "count": counts.get("tasks", 0),
                "fields": 13
            },
            {
                "id": "estimates",
                "name": "Estimates",
                "description": "Project estimates/BOQ",
                "count": counts.get("estimates", 0),
                "fields": 14
            }
        ]
    }


# Router will be included at the end after all routes are defined

# Socket.IO events
@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")

@app.on_event("startup")
async def startup_scheduler():
    """Start the APScheduler on app startup"""
    from scheduler import setup_scheduler
    logger.info("Starting APScheduler...")
    setup_scheduler(db)
    logger.info("APScheduler started successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    """Shutdown database and scheduler on app shutdown"""
    from scheduler import shutdown_scheduler
    shutdown_scheduler()
    client.close()


# ============= Budgeting & Estimation Routes =============

from estimation_engine import EstimationEngine, get_default_material_preset, get_default_rate_table

@api_router.post("/estimates", response_model=EstimateResponse)
async def create_estimate(
    estimate_data: EstimateCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Create a new estimate for a project or lead
    Auto-generates BOQ using calculation engine
    """
    try:
        current_user = await get_current_user(credentials)
        
        # Verify project or lead exists
        if estimate_data.project_id:
            project = await db.projects.find_one({"_id": ObjectId(estimate_data.project_id)})
            if not project:
                raise HTTPException(status_code=404, detail="Project not found")
        elif estimate_data.lead_id:
            lead = await db.leads.find_one({"_id": ObjectId(estimate_data.lead_id)})
            if not lead:
                raise HTTPException(status_code=404, detail="Lead not found")
        # Allow estimates without project or lead for quick calculations
        
        # Get construction preset if specified (for rate reference)
        construction_preset = None
        if estimate_data.construction_preset_id:
            construction_preset = await db.construction_presets.find_one(
                {"_id": ObjectId(estimate_data.construction_preset_id)}
            )
        
        # Get or create default material preset and rate table
        material_preset_data = None
        if estimate_data.material_preset_id:
            preset = await db.material_presets.find_one({"_id": ObjectId(estimate_data.material_preset_id)})
            if preset:
                material_preset_data = MaterialPresetResponse(**serialize_doc(preset))
        
        if not material_preset_data:
            # Use default preset
            default_preset = get_default_material_preset()
            material_preset_data = MaterialPresetResponse(id="default", **default_preset)
        
        rate_table_data = None
        if estimate_data.rate_table_id:
            rate_table = await db.rate_tables.find_one({"_id": ObjectId(estimate_data.rate_table_id)})
            if rate_table:
                rate_table_data = RateTableResponse(**serialize_doc(rate_table))
        
        if not rate_table_data:
            # Use default rate table, potentially modified by construction preset
            default_rates = get_default_rate_table()
            
            # If construction preset has a rate_per_sqft, adjust base rates proportionally
            if construction_preset and construction_preset.get("rate_per_sqft"):
                preset_rate = construction_preset["rate_per_sqft"]
                # Scale rates based on preset (assuming 2500 is baseline)
                scale_factor = preset_rate / 2500.0
                for key in default_rates:
                    if isinstance(default_rates[key], (int, float)):
                        default_rates[key] = round(default_rates[key] * scale_factor, 2)
            
            # If base_rate_per_sqft is provided explicitly, use it
            if estimate_data.base_rate_per_sqft:
                scale_factor = estimate_data.base_rate_per_sqft / 2500.0
                for key in default_rates:
                    if isinstance(default_rates[key], (int, float)):
                        default_rates[key] = round(default_rates[key] * scale_factor, 2)
            
            rate_table_data = RateTableResponse(
                id="default",
                effective_date=datetime.utcnow(),
                **default_rates
            )
        
        # Initialize calculation engine
        engine = EstimationEngine(material_preset_data, rate_table_data)
        
        # Calculate BOQ
        lines, totals, assumptions = engine.calculate_estimate(estimate_data)
        
        # Update estimate with calculated totals
        estimate_dict = estimate_data.dict()
        estimate_dict.update(totals)
        estimate_dict["assumptions"] = assumptions
        estimate_dict["created_by"] = str(current_user["_id"])
        estimate_dict["created_at"] = datetime.utcnow()
        estimate_dict["updated_at"] = datetime.utcnow()
        
        # Get next version number for this project
        existing_estimates = await db.estimates.find(
            {"project_id": estimate_data.project_id}
        ).sort("version", -1).limit(1).to_list(1)
        
        if existing_estimates:
            estimate_dict["version"] = existing_estimates[0]["version"] + 1
        else:
            estimate_dict["version"] = 1
        
        if not estimate_dict.get("version_name"):
            estimate_dict["version_name"] = f"Estimate v{estimate_dict['version']}"
        
        # Insert estimate
        result = await db.estimates.insert_one(estimate_dict)
        estimate_dict["id"] = str(result.inserted_id)
        
        # Insert BOQ lines
        line_docs = []
        for line in lines:
            line_dict = line.dict()
            line_dict["estimate_id"] = str(result.inserted_id)
            line_docs.append(line_dict)
        
        if line_docs:
            await db.estimate_lines.insert_many(line_docs)
        
        # Fetch complete estimate with lines
        return await get_estimate(str(result.inserted_id), credentials)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create estimate: {str(e)}")


@api_router.get("/estimates/{estimate_id}", response_model=EstimateResponse)
async def get_estimate(
    estimate_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get estimate by ID with all BOQ lines"""
    try:
        current_user = await get_current_user(credentials)
        
        estimate = await db.estimates.find_one({"_id": ObjectId(estimate_id)})
        if not estimate:
            raise HTTPException(status_code=404, detail="Estimate not found")
        
        # Get all BOQ lines
        lines = await db.estimate_lines.find({"estimate_id": estimate_id}).to_list(1000)
        
        estimate_dict = serialize_doc(estimate)
        estimate_dict["lines"] = [EstimateLineResponse(**serialize_doc(line)) for line in lines]
        
        return EstimateResponse(**estimate_dict)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get estimate: {str(e)}")


@api_router.get("/projects/{project_id}/estimates", response_model=List[EstimateSummary])
async def list_project_estimates(
    project_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List all estimates for a project"""
    try:
        current_user = await get_current_user(credentials)
        
        estimates = await db.estimates.find(
            {"project_id": project_id}
        ).sort("version", -1).to_list(100)
        
        return [EstimateSummary(**serialize_doc(est)) for est in estimates]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list estimates: {str(e)}")


@api_router.get("/estimates/by-lead/{lead_id}", response_model=List[EstimateSummary])
async def list_lead_estimates(
    lead_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List all estimates for a lead"""
    try:
        current_user = await get_current_user(credentials)
        
        # Allow CRM users to view estimates for their leads
        if not is_crm_user(current_user):
            raise HTTPException(status_code=403, detail="CRM access required")
        
        estimates = await db.estimates.find(
            {"lead_id": lead_id}
        ).sort("created_at", -1).to_list(100)
        
        return [EstimateSummary(**serialize_doc(est)) for est in estimates]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list lead estimates: {str(e)}")


@api_router.put("/estimates/{estimate_id}", response_model=EstimateResponse)
async def update_estimate(
    estimate_id: str,
    update_data: EstimateUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update estimate metadata (not recalculating BOQ)"""
    try:
        current_user = await get_current_user(credentials)
        
        estimate = await db.estimates.find_one({"_id": ObjectId(estimate_id)})
        if not estimate:
            raise HTTPException(status_code=404, detail="Estimate not found")
        
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        update_dict["updated_at"] = datetime.utcnow()
        update_dict["updated_by"] = str(current_user["_id"])
        
        # If adjustments changed, recalculate totals
        if any(k in update_dict for k in ["contingency_percent", "labour_percent_of_material", "material_escalation_percent"]):
            # Merge updates into estimate
            for key, value in update_dict.items():
                estimate[key] = value
            
            # Get material preset and rate table
            material_preset_data = MaterialPresetResponse(id="default", **get_default_material_preset())
            rate_table_data = RateTableResponse(id="default", effective_date=datetime.utcnow(), **get_default_rate_table())
            
            # Get existing lines
            lines = await db.estimate_lines.find({"estimate_id": estimate_id}).to_list(1000)
            line_objects = [EstimateLineBase(**serialize_doc(line)) for line in lines]
            
            # Recalculate totals
            engine = EstimationEngine(material_preset_data, rate_table_data)
            totals = engine._calculate_totals(line_objects, EstimateBase(**serialize_doc(estimate)))
            update_dict.update(totals)
        
        await db.estimates.update_one(
            {"_id": ObjectId(estimate_id)},
            {"$set": update_dict}
        )
        
        return await get_estimate(estimate_id, credentials)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update estimate: {str(e)}")


@api_router.put("/estimates/{estimate_id}/lines/{line_id}")
async def update_estimate_line(
    estimate_id: str,
    line_id: str,
    quantity: Optional[float] = None,
    rate: Optional[float] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a specific BOQ line item (user override)"""
    try:
        current_user = await get_current_user(credentials)
        
        line = await db.estimate_lines.find_one({"_id": ObjectId(line_id), "estimate_id": estimate_id})
        if not line:
            raise HTTPException(status_code=404, detail="Line item not found")
        
        update_dict = {"is_user_edited": True}
        if quantity is not None:
            update_dict["quantity"] = quantity
        if rate is not None:
            update_dict["rate"] = rate
        
        # Recalculate amount
        new_quantity = quantity if quantity is not None else line["quantity"]
        new_rate = rate if rate is not None else line["rate"]
        update_dict["amount"] = round(new_quantity * new_rate, 2)
        
        await db.estimate_lines.update_one(
            {"_id": ObjectId(line_id)},
            {"$set": update_dict}
        )
        
        # Recalculate estimate totals
        estimate = await db.estimates.find_one({"_id": ObjectId(estimate_id)})
        lines = await db.estimate_lines.find({"estimate_id": estimate_id}).to_list(1000)
        
        material_cost = sum(line["amount"] for line in lines if line["category"] in [
            "excavation_foundation", "superstructure", "masonry", "finishes"
        ])
        services_cost = sum(line["amount"] for line in lines if line["category"] == "services")
        
        labour_cost = material_cost * (estimate["labour_percent_of_material"] / 100.0)
        subtotal = material_cost + services_cost + labour_cost
        overhead_cost = subtotal * 0.10  # 10% overhead
        contingency_cost = (subtotal + overhead_cost) * (estimate["contingency_percent"] / 100.0)
        grand_total = subtotal + overhead_cost + contingency_cost
        cost_per_sqft = grand_total / estimate["built_up_area_sqft"]
        
        await db.estimates.update_one(
            {"_id": ObjectId(estimate_id)},
            {"$set": {
                "total_material_cost": round(material_cost, 2),
                "total_labour_cost": round(labour_cost, 2),
                "total_services_cost": round(services_cost, 2),
                "total_overhead_cost": round(overhead_cost, 2),
                "contingency_cost": round(contingency_cost, 2),
                "grand_total": round(grand_total, 2),
                "cost_per_sqft": round(cost_per_sqft, 2),
                "updated_at": datetime.utcnow(),
                "updated_by": str(current_user["_id"])
            }}
        )
        
        return {"message": "Line updated successfully", "new_total": round(grand_total, 2)}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update line: {str(e)}")


@api_router.delete("/estimates/{estimate_id}")
async def delete_estimate(
    estimate_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete an estimate and its BOQ lines"""
    try:
        current_user = await get_current_user(credentials)
        
        # Only admin or project manager can delete
        if current_user["role"] not in ["admin", "project_manager"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        estimate = await db.estimates.find_one({"_id": ObjectId(estimate_id)})
        if not estimate:
            raise HTTPException(status_code=404, detail="Estimate not found")
        
        # Delete lines first
        await db.estimate_lines.delete_many({"estimate_id": estimate_id})
        
        # Delete estimate
        await db.estimates.delete_one({"_id": ObjectId(estimate_id)})
        
        return {"message": "Estimate deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete estimate: {str(e)}")


# ============= Floor-wise Estimation Routes =============

from floor_estimation import (
    create_floor_wise_estimate, migrate_estimate_to_floor_wise,
    get_floor_display_name, FLOOR_ORDER
)

@api_router.post("/estimates/floor-wise")
async def create_floor_wise_estimate_endpoint(
    estimate_data: EstimateCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Create a floor-wise estimate with proper area division.
    - For leads: Auto-divides total area by number of floors
    - For projects: Uses manual floor configuration if provided
    """
    try:
        current_user = await get_current_user(credentials)
        
        # Verify project or lead exists
        if estimate_data.project_id:
            project = await db.projects.find_one({"_id": ObjectId(estimate_data.project_id)})
            if not project:
                raise HTTPException(status_code=404, detail="Project not found")
        elif estimate_data.lead_id:
            lead = await db.leads.find_one({"_id": ObjectId(estimate_data.lead_id)})
            if not lead:
                raise HTTPException(status_code=404, detail="Lead not found")
        
        # Get presets
        material_preset_data = None
        if estimate_data.material_preset_id:
            preset = await db.material_presets.find_one({"_id": ObjectId(estimate_data.material_preset_id)})
            if preset:
                material_preset_data = MaterialPresetResponse(**serialize_doc(preset))
        
        if not material_preset_data:
            default_preset = get_default_material_preset()
            material_preset_data = MaterialPresetResponse(id="default", **default_preset)
        
        rate_table_data = None
        if estimate_data.rate_table_id:
            rate_table = await db.rate_tables.find_one({"_id": ObjectId(estimate_data.rate_table_id)})
            if rate_table:
                rate_table_data = RateTableResponse(**serialize_doc(rate_table))
        
        if not rate_table_data:
            default_rates = get_default_rate_table()
            rate_table_data = RateTableResponse(
                id="default",
                effective_date=datetime.utcnow(),
                **default_rates
            )
        
        # Generate floor-wise estimate with correct rates
        # Parking: ₹1750/sqft, Basement: ₹1800/sqft
        floors, totals, assumptions = create_floor_wise_estimate(
            estimate_data,
            material_preset_data,
            rate_table_data,
            parking_rate=1750.0,
            basement_rate=1800.0
        )
        
        # Prepare estimate document
        estimate_dict = estimate_data.dict()
        estimate_dict.update(totals)
        estimate_dict["floors"] = floors
        estimate_dict["assumptions"] = assumptions
        estimate_dict["is_floor_wise"] = True
        estimate_dict["created_by"] = str(current_user["_id"])
        estimate_dict["created_at"] = datetime.utcnow()
        estimate_dict["updated_at"] = datetime.utcnow()
        
        # Get next version number
        query = {"project_id": estimate_data.project_id} if estimate_data.project_id else {"lead_id": estimate_data.lead_id}
        existing = await db.estimates.find(query).sort("version", -1).limit(1).to_list(1)
        estimate_dict["version"] = existing[0]["version"] + 1 if existing else 1
        
        if not estimate_dict.get("version_name"):
            estimate_dict["version_name"] = f"Estimate v{estimate_dict['version']}"
        
        # Insert estimate
        result = await db.estimates.insert_one(estimate_dict)
        estimate_dict["id"] = str(result.inserted_id)
        
        # Also store floor lines in separate collection for easy querying
        all_lines = []
        for floor in floors:
            for line in floor.get("lines", []):
                line_copy = line.copy()
                line_copy["estimate_id"] = str(result.inserted_id)
                line_copy["floor_id"] = floor["id"]
                line_copy["floor_type"] = floor["floor_type"]
                # Remove 'id' field to let MongoDB generate _id
                if "id" in line_copy:
                    line_copy["line_id"] = line_copy.pop("id")
                all_lines.append(line_copy)
        
        if all_lines:
            await db.estimate_lines.insert_many(all_lines)
        
        # Serialize response properly
        response_floors = []
        for floor in floors:
            floor_copy = floor.copy()
            # Ensure all values are JSON serializable
            response_floors.append(floor_copy)
        
        return {
            "id": estimate_dict["id"],
            "version": estimate_dict["version"],
            "version_name": estimate_dict["version_name"],
            "floors": response_floors,
            "totals": totals,
            "assumptions": assumptions,
            "message": "Floor-wise estimate created successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create floor-wise estimate: {str(e)}")


@api_router.put("/estimates/{estimate_id}/floors/{floor_id}")
async def update_floor(
    estimate_id: str,
    floor_id: str,
    floor_data: dict,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a specific floor in an estimate (area, rate, or lines)"""
    try:
        current_user = await get_current_user(credentials)
        
        estimate = await db.estimates.find_one({"_id": ObjectId(estimate_id)})
        if not estimate:
            raise HTTPException(status_code=404, detail="Estimate not found")
        
        floors = estimate.get("floors", [])
        floor_index = next((i for i, f in enumerate(floors) if f.get("id") == floor_id), None)
        
        if floor_index is None:
            raise HTTPException(status_code=404, detail="Floor not found")
        
        # Update floor data
        if "area_sqft" in floor_data:
            floors[floor_index]["area_sqft"] = floor_data["area_sqft"]
        if "rate_per_sqft" in floor_data:
            floors[floor_index]["rate_per_sqft"] = floor_data["rate_per_sqft"]
        if "lines" in floor_data:
            floors[floor_index]["lines"] = floor_data["lines"]
            # Recalculate floor total
            floors[floor_index]["floor_total"] = sum(
                line.get("amount", 0) for line in floor_data["lines"]
            )
        
        # Recalculate grand total
        grand_total = sum(f.get("floor_total", 0) for f in floors)
        
        # Update estimate
        await db.estimates.update_one(
            {"_id": ObjectId(estimate_id)},
            {"$set": {
                "floors": floors,
                "grand_total": grand_total,
                "updated_at": datetime.utcnow(),
                "updated_by": str(current_user["_id"])
            }}
        )
        
        return {"message": "Floor updated successfully", "floor": floors[floor_index]}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update floor: {str(e)}")


@api_router.put("/estimates/{estimate_id}/floors/{floor_id}/lines/{line_id}")
async def update_floor_line(
    estimate_id: str,
    floor_id: str,
    line_id: str,
    line_data: dict,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a specific line item within a floor"""
    try:
        current_user = await get_current_user(credentials)
        
        estimate = await db.estimates.find_one({"_id": ObjectId(estimate_id)})
        if not estimate:
            raise HTTPException(status_code=404, detail="Estimate not found")
        
        floors = estimate.get("floors", [])
        floor_index = next((i for i, f in enumerate(floors) if f.get("id") == floor_id), None)
        
        if floor_index is None:
            raise HTTPException(status_code=404, detail="Floor not found")
        
        lines = floors[floor_index].get("lines", [])
        line_index = next((i for i, l in enumerate(lines) if l.get("id") == line_id), None)
        
        if line_index is None:
            raise HTTPException(status_code=404, detail="Line item not found")
        
        # Update line item
        for key in ["quantity", "rate", "description", "notes"]:
            if key in line_data:
                lines[line_index][key] = line_data[key]
        
        # Recalculate amount
        lines[line_index]["amount"] = round(
            lines[line_index].get("quantity", 0) * lines[line_index].get("rate", 0), 2
        )
        lines[line_index]["is_user_edited"] = True
        
        # Update floor total
        floors[floor_index]["floor_total"] = sum(l.get("amount", 0) for l in lines)
        
        # Recalculate grand total
        grand_total = sum(f.get("floor_total", 0) for f in floors)
        
        # Update estimate
        await db.estimates.update_one(
            {"_id": ObjectId(estimate_id)},
            {"$set": {
                "floors": floors,
                "grand_total": grand_total,
                "updated_at": datetime.utcnow(),
                "updated_by": str(current_user["_id"])
            }}
        )
        
        # Also update in estimate_lines collection
        await db.estimate_lines.update_one(
            {"id": line_id, "estimate_id": estimate_id},
            {"$set": {
                "quantity": lines[line_index]["quantity"],
                "rate": lines[line_index]["rate"],
                "amount": lines[line_index]["amount"],
                "is_user_edited": True
            }}
        )
        
        return {"message": "Line item updated successfully", "line": lines[line_index]}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update line item: {str(e)}")


@api_router.post("/estimates/{estimate_id}/migrate-floor-wise")
async def migrate_to_floor_wise(
    estimate_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Migrate an existing estimate to floor-wise format"""
    try:
        current_user = await get_current_user(credentials)
        
        estimate = await db.estimates.find_one({"_id": ObjectId(estimate_id)})
        if not estimate:
            raise HTTPException(status_code=404, detail="Estimate not found")
        
        # Check if already migrated
        if estimate.get("is_floor_wise"):
            return {"message": "Estimate is already floor-wise", "id": estimate_id}
        
        # Get existing lines
        lines = await db.estimate_lines.find({"estimate_id": estimate_id}).to_list(1000)
        
        # Get presets
        material_preset_data = MaterialPresetResponse(id="default", **get_default_material_preset())
        rate_table_data = RateTableResponse(id="default", effective_date=datetime.utcnow(), **get_default_rate_table())
        
        # Migrate
        floors, updated_totals = migrate_estimate_to_floor_wise(
            estimate, 
            [serialize_doc(l) for l in lines],
            material_preset_data,
            rate_table_data
        )
        
        # Update estimate
        await db.estimates.update_one(
            {"_id": ObjectId(estimate_id)},
            {"$set": {
                "floors": floors,
                "is_floor_wise": True,
                **updated_totals,
                "updated_at": datetime.utcnow(),
                "updated_by": str(current_user["_id"])
            }}
        )
        
        return {
            "message": "Estimate migrated to floor-wise format",
            "id": estimate_id,
            "floors": floors,
            "totals": updated_totals
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to migrate estimate: {str(e)}")


@api_router.post("/estimates/migrate-all")
async def migrate_all_estimates(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Migrate all existing estimates to floor-wise format (Admin only)"""
    try:
        current_user = await get_current_user(credentials)
        
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Only admin can migrate all estimates")
        
        # Find all non-floor-wise estimates
        estimates = await db.estimates.find({"is_floor_wise": {"$ne": True}}).to_list(1000)
        
        migrated_count = 0
        errors = []
        
        for estimate in estimates:
            try:
                estimate_id = str(estimate["_id"])
                lines = await db.estimate_lines.find({"estimate_id": estimate_id}).to_list(1000)
                
                material_preset_data = MaterialPresetResponse(id="default", **get_default_material_preset())
                rate_table_data = RateTableResponse(id="default", effective_date=datetime.utcnow(), **get_default_rate_table())
                
                floors, updated_totals = migrate_estimate_to_floor_wise(
                    estimate,
                    [serialize_doc(l) for l in lines],
                    material_preset_data,
                    rate_table_data
                )
                
                await db.estimates.update_one(
                    {"_id": estimate["_id"]},
                    {"$set": {
                        "floors": floors,
                        "is_floor_wise": True,
                        **updated_totals,
                        "updated_at": datetime.utcnow()
                    }}
                )
                
                migrated_count += 1
                
            except Exception as e:
                errors.append({"estimate_id": str(estimate["_id"]), "error": str(e)})
        
        return {
            "message": f"Migration complete. {migrated_count} estimates migrated.",
            "migrated_count": migrated_count,
            "errors": errors
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to migrate estimates: {str(e)}")


# ============= Estimate Review & Approval Workflow =============

@api_router.post("/estimates/{estimate_id}/review")
async def review_estimate(
    estimate_id: str,
    comments: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Mark estimate as reviewed by Project Manager"""
    try:
        current_user = await get_current_user(credentials)
        
        # Project Manager or CRM Manager can review
        if current_user["role"] not in ["admin", "project_manager", "crm_manager"]:
            raise HTTPException(status_code=403, detail="Only Project Manager can review estimates")
        
        estimate = await db.estimates.find_one({"_id": ObjectId(estimate_id)})
        if not estimate:
            raise HTTPException(status_code=404, detail="Estimate not found")
        
        # Check if already approved - can't review after approval
        if estimate.get("approved_by"):
            raise HTTPException(status_code=400, detail="Cannot modify review after approval")
        
        update_data = {
            "reviewed_by": str(current_user["_id"]),
            "reviewed_by_name": current_user.get("full_name", current_user.get("email", "Unknown")),
            "reviewed_at": datetime.utcnow(),
            "review_comments": comments,
            "updated_at": datetime.utcnow(),
            "updated_by": str(current_user["_id"])
        }
        
        await db.estimates.update_one(
            {"_id": ObjectId(estimate_id)},
            {"$set": update_data}
        )
        
        return {"message": "Estimate reviewed successfully", "reviewed_by": update_data["reviewed_by_name"]}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to review estimate: {str(e)}")


@api_router.post("/estimates/{estimate_id}/approve")
async def approve_estimate(
    estimate_id: str,
    comments: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Mark estimate as approved by Project Head/Director"""
    try:
        current_user = await get_current_user(credentials)
        
        # Only admin (director/project head) can approve
        if current_user["role"] not in ["admin"]:
            raise HTTPException(status_code=403, detail="Only Project Head/Director can approve estimates")
        
        estimate = await db.estimates.find_one({"_id": ObjectId(estimate_id)})
        if not estimate:
            raise HTTPException(status_code=404, detail="Estimate not found")
        
        # Must be reviewed first
        if not estimate.get("reviewed_by"):
            raise HTTPException(status_code=400, detail="Estimate must be reviewed before approval")
        
        update_data = {
            "approved_by": str(current_user["_id"]),
            "approved_by_name": current_user.get("full_name", current_user.get("email", "Unknown")),
            "approved_at": datetime.utcnow(),
            "approval_comments": comments,
            "status": "approved",
            "updated_at": datetime.utcnow(),
            "updated_by": str(current_user["_id"])
        }
        
        await db.estimates.update_one(
            {"_id": ObjectId(estimate_id)},
            {"$set": update_data}
        )
        
        return {"message": "Estimate approved successfully", "approved_by": update_data["approved_by_name"]}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to approve estimate: {str(e)}")


@api_router.delete("/estimates/{estimate_id}/review")
async def remove_review(
    estimate_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Remove review from estimate (admin only)"""
    try:
        current_user = await get_current_user(credentials)
        
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Only admin can remove review")
        
        estimate = await db.estimates.find_one({"_id": ObjectId(estimate_id)})
        if not estimate:
            raise HTTPException(status_code=404, detail="Estimate not found")
        
        # Can't remove review if already approved
        if estimate.get("approved_by"):
            raise HTTPException(status_code=400, detail="Cannot remove review after approval. Remove approval first.")
        
        await db.estimates.update_one(
            {"_id": ObjectId(estimate_id)},
            {"$unset": {"reviewed_by": "", "reviewed_by_name": "", "reviewed_at": "", "review_comments": ""}}
        )
        
        return {"message": "Review removed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove review: {str(e)}")


@api_router.delete("/estimates/{estimate_id}/approval")
async def remove_approval(
    estimate_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Remove approval from estimate (admin only)"""
    try:
        current_user = await get_current_user(credentials)
        
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Only admin can remove approval")
        
        estimate = await db.estimates.find_one({"_id": ObjectId(estimate_id)})
        if not estimate:
            raise HTTPException(status_code=404, detail="Estimate not found")
        
        await db.estimates.update_one(
            {"_id": ObjectId(estimate_id)},
            {
                "$unset": {"approved_by": "", "approved_by_name": "", "approved_at": "", "approval_comments": ""},
                "$set": {"status": "draft", "updated_at": datetime.utcnow()}
            }
        )
        
        return {"message": "Approval removed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove approval: {str(e)}")


# ============= Estimate Line Item Management =============

@api_router.post("/estimates/{estimate_id}/lines", response_model=EstimateLineResponse)
async def add_estimate_line(
    estimate_id: str,
    line_data: EstimateLineCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Add a new line item to an estimate"""
    try:
        current_user = await get_current_user(credentials)
        
        estimate = await db.estimates.find_one({"_id": ObjectId(estimate_id)})
        if not estimate:
            raise HTTPException(status_code=404, detail="Estimate not found")
        
        # Can't modify approved estimates
        if estimate.get("status") == "approved":
            raise HTTPException(status_code=400, detail="Cannot modify approved estimates")
        
        # Calculate amount
        amount = line_data.quantity * line_data.rate
        
        # Get next sequence number
        last_line = await db.estimate_lines.find_one(
            {"estimate_id": estimate_id},
            sort=[("sequence", -1)]
        )
        sequence = (last_line.get("sequence", 0) if last_line else 0) + 1
        
        line_doc = {
            "estimate_id": estimate_id,
            "category": line_data.category,
            "item_name": line_data.item_name,
            "description": line_data.description,
            "unit": line_data.unit,
            "quantity": line_data.quantity,
            "rate": line_data.rate,
            "amount": amount,
            "sequence": sequence,
            "created_at": datetime.utcnow(),
            "created_by": str(current_user["_id"])
        }
        
        result = await db.estimate_lines.insert_one(line_doc)
        line_doc["_id"] = result.inserted_id
        
        # Update estimate totals
        await recalculate_estimate_totals(estimate_id)
        
        return EstimateLineResponse(**serialize_doc(line_doc))
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add line item: {str(e)}")


@api_router.put("/estimates/{estimate_id}/lines/{line_id}", response_model=EstimateLineResponse)
async def update_estimate_line_item(
    estimate_id: str,
    line_id: str,
    line_data: EstimateLineUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update an existing line item"""
    try:
        current_user = await get_current_user(credentials)
        
        estimate = await db.estimates.find_one({"_id": ObjectId(estimate_id)})
        if not estimate:
            raise HTTPException(status_code=404, detail="Estimate not found")
        
        # Can't modify approved estimates
        if estimate.get("status") == "approved":
            raise HTTPException(status_code=400, detail="Cannot modify approved estimates")
        
        line = await db.estimate_lines.find_one({"_id": ObjectId(line_id), "estimate_id": estimate_id})
        if not line:
            raise HTTPException(status_code=404, detail="Line item not found")
        
        update_dict = {k: v for k, v in line_data.dict().items() if v is not None}
        
        # Recalculate amount if quantity or rate changed
        quantity = update_dict.get("quantity", line.get("quantity"))
        rate = update_dict.get("rate", line.get("rate"))
        update_dict["amount"] = quantity * rate
        update_dict["updated_at"] = datetime.utcnow()
        update_dict["updated_by"] = str(current_user["_id"])
        
        await db.estimate_lines.update_one(
            {"_id": ObjectId(line_id)},
            {"$set": update_dict}
        )
        
        # Update estimate totals
        await recalculate_estimate_totals(estimate_id)
        
        updated_line = await db.estimate_lines.find_one({"_id": ObjectId(line_id)})
        return EstimateLineResponse(**serialize_doc(updated_line))
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update line item: {str(e)}")


@api_router.delete("/estimates/{estimate_id}/lines/{line_id}")
async def delete_estimate_line_item(
    estimate_id: str,
    line_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a line item from an estimate"""
    try:
        current_user = await get_current_user(credentials)
        
        estimate = await db.estimates.find_one({"_id": ObjectId(estimate_id)})
        if not estimate:
            raise HTTPException(status_code=404, detail="Estimate not found")
        
        # Can't modify approved estimates
        if estimate.get("status") == "approved":
            raise HTTPException(status_code=400, detail="Cannot modify approved estimates")
        
        line = await db.estimate_lines.find_one({"_id": ObjectId(line_id), "estimate_id": estimate_id})
        if not line:
            raise HTTPException(status_code=404, detail="Line item not found")
        
        await db.estimate_lines.delete_one({"_id": ObjectId(line_id)})
        
        # Update estimate totals
        await recalculate_estimate_totals(estimate_id)
        
        return {"message": "Line item deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete line item: {str(e)}")


async def recalculate_estimate_totals(estimate_id: str):
    """Recalculate estimate totals after line item changes"""
    estimate = await db.estimates.find_one({"_id": ObjectId(estimate_id)})
    if not estimate:
        return
    
    lines = await db.estimate_lines.find({"estimate_id": estimate_id}).to_list(1000)
    
    # Calculate subtotal from lines
    material_total = sum(line.get("amount", 0) for line in lines)
    
    # Apply adjustments
    contingency = estimate.get("contingency_percent", 10.0)
    labour_percent = estimate.get("labour_percent_of_material", 35.0)
    escalation = estimate.get("material_escalation_percent", 0.0)
    
    labour_cost = material_total * (labour_percent / 100)
    escalation_cost = material_total * (escalation / 100)
    subtotal = material_total + labour_cost + escalation_cost
    contingency_cost = subtotal * (contingency / 100)
    grand_total = subtotal + contingency_cost
    
    # Calculate cost per sqft
    built_up_area = estimate.get("built_up_area_sqft", 1)
    cost_per_sqft = grand_total / built_up_area if built_up_area > 0 else 0
    
    await db.estimates.update_one(
        {"_id": ObjectId(estimate_id)},
        {"$set": {
            "material_total": material_total,
            "labour_cost": labour_cost,
            "escalation_cost": escalation_cost,
            "contingency_cost": contingency_cost,
            "grand_total": grand_total,
            "cost_per_sqft": cost_per_sqft,
            "updated_at": datetime.utcnow()
        }}
    )


# ============= Company Settings API =============

@api_router.get("/company-settings", response_model=CompanySettingsResponse)
async def get_company_settings(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get company settings"""
    try:
        current_user = await get_current_user(credentials)
        
        settings = await db.company_settings.find_one({})
        if not settings:
            # Return default settings if none exist
            return CompanySettingsResponse(
                id="default",
                company_name="Your Company Name",
                address_line1="",
                city="",
                state="",
                pincode="",
                phone="",
                email="admin@company.com",
                created_at=datetime.utcnow()
            )
        
        return CompanySettingsResponse(**serialize_doc(settings))
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get company settings: {str(e)}")


@api_router.put("/company-settings", response_model=CompanySettingsResponse)
async def update_company_settings(
    settings_data: CompanySettingsUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update company settings (admin only)"""
    try:
        current_user = await get_current_user(credentials)
        
        # Only admin can update company settings
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Only admin can update company settings")
        
        update_dict = {k: v for k, v in settings_data.dict().items() if v is not None}
        update_dict["updated_at"] = datetime.utcnow()
        update_dict["updated_by"] = str(current_user["_id"])
        
        # Check if settings exist
        existing = await db.company_settings.find_one({})
        
        if existing:
            await db.company_settings.update_one(
                {"_id": existing["_id"]},
                {"$set": update_dict}
            )
            settings = await db.company_settings.find_one({"_id": existing["_id"]})
        else:
            # Create new settings
            update_dict["created_at"] = datetime.utcnow()
            result = await db.company_settings.insert_one(update_dict)
            settings = await db.company_settings.find_one({"_id": result.inserted_id})
        
        return CompanySettingsResponse(**serialize_doc(settings))
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update company settings: {str(e)}")


@api_router.post("/company-settings/logo")
async def upload_company_logo(
    file: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Upload company logo"""
    try:
        current_user = await get_current_user(credentials)
        
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Only admin can upload logo")
        
        # Validate file type
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Only image files are allowed")
        
        # Read and encode to base64
        content = await file.read()
        if len(content) > 5 * 1024 * 1024:  # 5MB limit
            raise HTTPException(status_code=400, detail="File size must be less than 5MB")
        
        import base64
        logo_base64 = f"data:{file.content_type};base64,{base64.b64encode(content).decode()}"
        
        # Update settings
        existing = await db.company_settings.find_one({})
        if existing:
            await db.company_settings.update_one(
                {"_id": existing["_id"]},
                {"$set": {"logo_base64": logo_base64, "updated_at": datetime.utcnow()}}
            )
        else:
            await db.company_settings.insert_one({
                "logo_base64": logo_base64,
                "company_name": "Your Company Name",
                "address_line1": "",
                "city": "",
                "state": "",
                "pincode": "",
                "phone": "",
                "email": "admin@company.com",
                "created_at": datetime.utcnow()
            })
        
        return {"message": "Logo uploaded successfully", "logo_base64": logo_base64}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload logo: {str(e)}")


@api_router.get("/estimates/{estimate_id}/export/csv")
async def export_estimate_csv(
    estimate_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Export estimate BOQ to CSV format"""
    try:
        current_user = await get_current_user(credentials)
        
        # Get estimate
        estimate = await db.estimates.find_one({"_id": ObjectId(estimate_id)})
        if not estimate:
            raise HTTPException(status_code=404, detail="Estimate not found")
        
        # Get project details
        project = await db.projects.find_one({"_id": ObjectId(estimate["project_id"])})
        project_name = project.get("name", "Unknown") if project else "Unknown"
        
        # Get all lines
        lines = await db.estimate_lines.find({"estimate_id": estimate_id}).to_list(1000)
        
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header information
        writer.writerow(['PROJECT ESTIMATE - BILL OF QUANTITIES'])
        writer.writerow([])
        writer.writerow(['Project:', project_name])
        writer.writerow(['Version:', estimate.get("version_name", f"Version {estimate.get('version', 1)}")])
        writer.writerow(['Status:', estimate.get("status", "draft").upper()])
        writer.writerow(['Date:', estimate.get("created_at", datetime.utcnow()).strftime('%Y-%m-%d')])
        writer.writerow(['Built-up Area:', f"{estimate.get('built_up_area_sqft', 0)} sqft"])
        writer.writerow(['Number of Floors:', estimate.get('num_floors', 1)])
        writer.writerow([])
        
        # Write summary
        writer.writerow(['COST SUMMARY'])
        writer.writerow(['Description', 'Amount (INR)'])
        writer.writerow(['Total Material Cost', f"₹{estimate.get('total_material_cost', 0):,.2f}"])
        writer.writerow(['Total Labour Cost', f"₹{estimate.get('total_labour_cost', 0):,.2f}"])
        writer.writerow(['Total Services Cost', f"₹{estimate.get('total_services_cost', 0):,.2f}"])
        writer.writerow(['Overhead Cost', f"₹{estimate.get('total_overhead_cost', 0):,.2f}"])
        writer.writerow(['Contingency Cost', f"₹{estimate.get('contingency_cost', 0):,.2f}"])
        writer.writerow(['GRAND TOTAL', f"₹{estimate.get('grand_total', 0):,.2f}"])
        writer.writerow(['Cost per Sqft', f"₹{estimate.get('cost_per_sqft', 0):,.2f}"])
        writer.writerow([])
        
        # Write BOQ header
        writer.writerow(['BILL OF QUANTITIES (BOQ)'])
        writer.writerow(['Category', 'Item Name', 'Description', 'Quantity', 'Unit', 'Rate (INR)', 'Amount (INR)', 'Formula Used', 'User Edited'])
        
        # Write line items grouped by category
        category_names = {
            'excavation_foundation': 'Excavation & Foundation',
            'superstructure': 'Superstructure',
            'masonry': 'Masonry',
            'finishes': 'Finishes',
            'services': 'Services',
            'labour': 'Labour',
            'overheads': 'Overheads',
            'contingency': 'Contingency',
        }
        
        # Group lines by category
        lines_by_category = {}
        for line in lines:
            cat = line.get('category', 'other')
            if cat not in lines_by_category:
                lines_by_category[cat] = []
            lines_by_category[cat].append(line)
        
        # Write each category
        for category, category_lines in lines_by_category.items():
            writer.writerow([])
            writer.writerow([category_names.get(category, category.upper())])
            
            for line in category_lines:
                writer.writerow([
                    category_names.get(category, category),
                    line.get('item_name', ''),
                    line.get('description', ''),
                    f"{line.get('quantity', 0):,.2f}",
                    line.get('unit', ''),
                    f"{line.get('rate', 0):,.2f}",
                    f"{line.get('amount', 0):,.2f}",
                    line.get('formula_used', ''),
                    'Yes' if line.get('is_user_edited', False) else 'No'
                ])
        
        # Prepare response
        output.seek(0)
        csv_content = output.getvalue()
        filename = f"estimate_{project_name.replace(' ', '_')}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
        
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export CSV: {str(e)}")


@api_router.get("/estimates/{estimate_id}/export/pdf")
async def export_estimate_pdf(
    estimate_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Export estimate BOQ to PDF format (simplified HTML-based approach)"""
    try:
        current_user = await get_current_user(credentials)
        
        # Get estimate
        estimate = await db.estimates.find_one({"_id": ObjectId(estimate_id)})
        if not estimate:
            raise HTTPException(status_code=404, detail="Estimate not found")
        
        # Get project details
        project = await db.projects.find_one({"_id": ObjectId(estimate["project_id"])})
        project_name = project.get("name", "Unknown") if project else "Unknown"
        
        # Get all lines
        lines = await db.estimate_lines.find({"estimate_id": estimate_id}).to_list(1000)
        
        # Group lines by category
        category_names = {
            'excavation_foundation': 'Excavation & Foundation',
            'superstructure': 'Superstructure',
            'masonry': 'Masonry',
            'finishes': 'Finishes',
            'services': 'Services',
            'labour': 'Labour',
            'overheads': 'Overheads',
            'contingency': 'Contingency',
        }
        
        lines_by_category = {}
        for line in lines:
            cat = line.get('category', 'other')
            if cat not in lines_by_category:
                lines_by_category[cat] = []
            lines_by_category[cat].append(line)
        
        # Create HTML content
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Estimate - {project_name}</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; }}
                h1 {{ color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }}
                h2 {{ color: #34495e; margin-top: 30px; }}
                .header-info {{ margin: 20px 0; line-height: 1.8; }}
                .header-info div {{ margin: 5px 0; }}
                table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                th {{ background-color: #3498db; color: white; padding: 12px; text-align: left; }}
                td {{ padding: 10px; border-bottom: 1px solid #ddd; }}
                tr:hover {{ background-color: #f5f5f5; }}
                .summary-table {{ width: 50%; }}
                .summary-table th {{ background-color: #2c3e50; }}
                .total-row {{ font-weight: bold; background-color: #ecf0f1; }}
                .category-header {{ background-color: #95a5a6; color: white; font-weight: bold; }}
                .page-break {{ page-break-before: always; }}
            </style>
        </head>
        <body>
            <h1>PROJECT ESTIMATE - BILL OF QUANTITIES</h1>
            
            <div class="header-info">
                <div><strong>Project:</strong> {project_name}</div>
                <div><strong>Version:</strong> {estimate.get("version_name", f"Version {estimate.get('version', 1)}")}</div>
                <div><strong>Status:</strong> {estimate.get("status", "draft").upper()}</div>
                <div><strong>Date:</strong> {estimate.get("created_at", datetime.utcnow()).strftime('%B %d, %Y')}</div>
                <div><strong>Built-up Area:</strong> {estimate.get('built_up_area_sqft', 0):,.0f} sqft</div>
                <div><strong>Number of Floors:</strong> {estimate.get('num_floors', 1)}</div>
            </div>
            
            <h2>COST SUMMARY</h2>
            <table class="summary-table">
                <tr>
                    <th>Description</th>
                    <th>Amount (INR)</th>
                </tr>
                <tr>
                    <td>Total Material Cost</td>
                    <td>₹{estimate.get('total_material_cost', 0):,.2f}</td>
                </tr>
                <tr>
                    <td>Total Labour Cost</td>
                    <td>₹{estimate.get('total_labour_cost', 0):,.2f}</td>
                </tr>
                <tr>
                    <td>Total Services Cost</td>
                    <td>₹{estimate.get('total_services_cost', 0):,.2f}</td>
                </tr>
                <tr>
                    <td>Overhead Cost (10%)</td>
                    <td>₹{estimate.get('total_overhead_cost', 0):,.2f}</td>
                </tr>
                <tr>
                    <td>Contingency Cost</td>
                    <td>₹{estimate.get('contingency_cost', 0):,.2f}</td>
                </tr>
                <tr class="total-row">
                    <td>GRAND TOTAL</td>
                    <td>₹{estimate.get('grand_total', 0):,.2f}</td>
                </tr>
                <tr>
                    <td>Cost per Sqft</td>
                    <td>₹{estimate.get('cost_per_sqft', 0):,.2f}</td>
                </tr>
            </table>
            
            <div class="page-break"></div>
            <h2>BILL OF QUANTITIES (BOQ)</h2>
            <table>
                <tr>
                    <th>Item Name</th>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Rate (INR)</th>
                    <th>Amount (INR)</th>
                </tr>
        """
        
        # Add BOQ lines by category
        for category, category_lines in lines_by_category.items():
            html_content += f"""
                <tr class="category-header">
                    <td colspan="6">{category_names.get(category, category.upper())}</td>
                </tr>
            """
            
            for line in category_lines:
                edited_indicator = " ✏️" if line.get('is_user_edited', False) else ""
                html_content += f"""
                <tr>
                    <td>{line.get('item_name', '')}{edited_indicator}</td>
                    <td>{line.get('description', '')}</td>
                    <td>{line.get('quantity', 0):,.2f}</td>
                    <td>{line.get('unit', '')}</td>
                    <td>₹{line.get('rate', 0):,.2f}</td>
                    <td>₹{line.get('amount', 0):,.2f}</td>
                </tr>
                """
        
        html_content += """
            </table>
            
            <div style="margin-top: 50px; padding-top: 20px; border-top: 2px solid #ccc;">
                <p><em>Note: Items marked with ✏️ have been manually edited by user.</em></p>
                <p><em>Generated on {}</em></p>
            </div>
        </body>
        </html>
        """.format(datetime.utcnow().strftime('%B %d, %Y at %I:%M %p'))
        
        # Return HTML as PDF-ready content
        # Note: In a production environment, you'd use a library like weasyprint or pdfkit
        # For now, we return HTML that can be printed to PDF by the browser
        filename = f"estimate_{project_name.replace(' ', '_')}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.html"
        
        return Response(
            content=html_content,
            media_type="text/html",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export PDF: {str(e)}")


# ============= Material Presets (Admin) =============

@api_router.post("/material-presets", response_model=MaterialPresetResponse)
async def create_material_preset(
    preset_data: MaterialPresetCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create new material preset (Admin only)"""
    try:
        current_user = await get_current_user(credentials)
        
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        preset_dict = preset_data.dict()
        preset_dict["created_by"] = str(current_user["_id"])
        preset_dict["created_at"] = datetime.utcnow()
        preset_dict["updated_at"] = datetime.utcnow()
        
        result = await db.material_presets.insert_one(preset_dict)
        preset_dict["id"] = str(result.inserted_id)
        
        return MaterialPresetResponse(**preset_dict)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create preset: {str(e)}")


@api_router.get("/material-presets", response_model=List[MaterialPresetResponse])
async def list_material_presets(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List all active material presets"""
    try:
        presets = await db.material_presets.find({"is_active": True}).to_list(100)
        return [MaterialPresetResponse(**serialize_doc(p)) for p in presets]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list presets: {str(e)}")


@api_router.get("/material-presets/default")
async def get_default_material_preset_endpoint(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get the default material preset (from DB or fallback to code defaults)"""
    try:
        from estimation_engine import get_default_material_preset
        
        # Try to get from DB first
        preset = await db.material_presets.find_one({"name": "default", "is_active": True})
        
        if preset:
            return serialize_doc(preset)
        else:
            # Return code defaults
            return get_default_material_preset()
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get default preset: {str(e)}")


@api_router.put("/material-presets/default")
async def update_default_material_preset(
    preset_data: dict,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update or create the default material preset (Admin only)"""
    try:
        current_user = await get_current_user(credentials)
        
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check if default preset exists
        existing = await db.material_presets.find_one({"name": "default"})
        
        # Clean the data - remove any _id if present
        if "_id" in preset_data:
            del preset_data["_id"]
        if "id" in preset_data:
            del preset_data["id"]
        
        preset_data["name"] = "default"
        preset_data["is_active"] = True
        preset_data["updated_at"] = datetime.utcnow()
        preset_data["updated_by"] = str(current_user["_id"])
        
        if existing:
            # Update existing
            await db.material_presets.update_one(
                {"name": "default"},
                {"$set": preset_data}
            )
        else:
            # Create new
            preset_data["created_by"] = str(current_user["_id"])
            preset_data["created_at"] = datetime.utcnow()
            result = await db.material_presets.insert_one(preset_data)
        
        return {"message": "Default material preset updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to update preset: {str(e)}")


# ============= Rate Tables (Admin) =============

@api_router.post("/rate-tables", response_model=RateTableResponse)
async def create_rate_table(
    rate_data: RateTableCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create new rate table (Admin only)"""
    try:
        current_user = await get_current_user(credentials)
        
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        rate_dict = rate_data.dict()
        rate_dict["created_by"] = str(current_user["_id"])
        rate_dict["created_at"] = datetime.utcnow()
        rate_dict["updated_at"] = datetime.utcnow()
        
        result = await db.rate_tables.insert_one(rate_dict)
        rate_dict["id"] = str(result.inserted_id)
        
        return RateTableResponse(**rate_dict)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create rate table: {str(e)}")


@api_router.get("/rate-tables", response_model=List[RateTableResponse])
async def list_rate_tables(
    location: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List all active rate tables"""
    try:
        query = {"is_active": True}
        if location:
            query["location"] = location
        
        rate_tables = await db.rate_tables.find(query).sort("effective_date", -1).to_list(100)
        return [RateTableResponse(**serialize_doc(rt)) for rt in rate_tables]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list rate tables: {str(e)}")


@api_router.get("/rate-tables/default")
async def get_default_rate_table_endpoint(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get the default rate table (from DB or fallback to code defaults)"""
    try:
        from estimation_engine import get_default_rate_table
        
        # Try to get from DB first
        rate_table = await db.rate_tables.find_one({"name": "default", "is_active": True})
        
        if rate_table:
            return serialize_doc(rate_table)
        else:
            # Return code defaults
            return get_default_rate_table()
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get default rate table: {str(e)}")


@api_router.put("/rate-tables/default")
async def update_default_rate_table(
    rate_data: dict,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update or create the default rate table (Admin only)"""
    try:
        current_user = await get_current_user(credentials)
        
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check if default rate table exists
        existing = await db.rate_tables.find_one({"name": "default"})
        
        # Clean the data - remove any _id if present
        if "_id" in rate_data:
            del rate_data["_id"]
        if "id" in rate_data:
            del rate_data["id"]
        
        rate_data["name"] = "default"
        rate_data["is_active"] = True
        rate_data["updated_at"] = datetime.utcnow()
        rate_data["updated_by"] = str(current_user["_id"])
        
        if existing:
            # Update existing
            await db.rate_tables.update_one(
                {"name": "default"},
                {"$set": rate_data}
            )
        else:
            # Create new
            rate_data["created_by"] = str(current_user["_id"])
            rate_data["created_at"] = datetime.utcnow()
            rate_data["effective_date"] = datetime.utcnow()
            result = await db.rate_tables.insert_one(rate_data)
        
        return {"message": "Default rate table updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to update rate table: {str(e)}")


# ============= Construction Presets (Admin) =============

@api_router.get("/construction-presets", response_model=List[ConstructionPresetResponse])
async def list_construction_presets(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    region: Optional[str] = None,
    status: Optional[str] = None,
    material_type: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List construction presets with filtering and pagination"""
    try:
        current_user = await get_current_user(credentials)
        
        # Build query
        query = {}
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}}
            ]
        if region:
            query["region"] = {"$regex": region, "$options": "i"}
        if status:
            query["status"] = status
            
        # Count total documents
        total = await db.construction_presets.count_documents(query)
        
        # Get presets with pagination
        skip = (page - 1) * limit
        presets = await db.construction_presets.find(query) \
            .sort("updated_at", -1) \
            .skip(skip) \
            .limit(limit) \
            .to_list(limit)
        
        # Enhance with metadata
        result = []
        for preset in presets:
            # Save ID before serialization (serialize_doc removes _id)
            preset_id = str(preset["_id"])
            preset_dict = serialize_doc(preset)
            
            # Count spec groups and items
            spec_groups_count = len(preset_dict.get("spec_groups", []))
            spec_items_count = sum(len(group.get("spec_items", [])) for group in preset_dict.get("spec_groups", []))
            
            # Count project usage
            usage_count = await db.project_preset_usage.count_documents({
                "preset_id": preset_id,
                "is_active": True
            })
            
            preset_dict.update({
                "spec_groups_count": spec_groups_count,
                "spec_items_count": spec_items_count,
                "project_usage_count": usage_count
            })
            
            result.append(ConstructionPresetResponse(**preset_dict))
            
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list presets: {str(e)}")


@api_router.get("/construction-presets/{preset_id}")
async def get_construction_preset(
    preset_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get a specific construction preset by ID"""
    try:
        current_user = await get_current_user(credentials)
        
        preset = await db.construction_presets.find_one({"_id": ObjectId(preset_id)})
        if not preset:
            raise HTTPException(status_code=404, detail="Construction preset not found")
            
        preset_dict = serialize_doc(preset)
        
        # Add metadata
        spec_groups_count = len(preset_dict.get("spec_groups", []))
        spec_items_count = sum(len(group.get("spec_items", [])) for group in preset_dict.get("spec_groups", []))
        
        usage_count = await db.project_preset_usage.count_documents({
            "preset_id": preset_id,
            "is_active": True
        })
        
        preset_dict.update({
            "spec_groups_count": spec_groups_count,
            "spec_items_count": spec_items_count,
            "project_usage_count": usage_count
        })
        
        return ConstructionPresetResponse(**preset_dict)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get preset: {str(e)}")


@api_router.post("/construction-presets")
async def create_construction_preset(
    preset_data: ConstructionPresetCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new construction preset (Admin/Manager only)"""
    try:
        current_user = await get_current_user(credentials)
        
        if current_user["role"] not in ["admin", "project_manager", "crm_manager"]:
            raise HTTPException(status_code=403, detail="Admin or Manager access required")
        
        # Check for duplicate name in same region
        existing = await db.construction_presets.find_one({
            "name": preset_data.name,
            "region": preset_data.region
        })
        if existing:
            raise HTTPException(status_code=400, detail=f"Preset '{preset_data.name}' already exists in {preset_data.region}")
        
        # Validate rate ranges in spec items
        for group in preset_data.spec_groups or []:
            for item in group.get("spec_items", []):
                if item.get("rate_min", 0) > item.get("rate_max", 0):
                    raise HTTPException(status_code=400, detail=f"Invalid rate range for {item.get('item_name')}: min > max")
        
        preset_dict = preset_data.dict()
        preset_dict.update({
            "version": 1,
            "created_by": str(current_user["_id"]),
            "created_at": datetime.utcnow()
        })
        
        result = await db.construction_presets.insert_one(preset_dict)
        
        # Audit log
        await db.preset_audit_log.insert_one({
            "preset_id": str(result.inserted_id),
            "action": "CREATE",
            "user_id": str(current_user["_id"]),
            "changes": {"created": preset_data.name},
            "timestamp": datetime.utcnow()
        })
        
        return {"message": "Construction preset created successfully", "id": str(result.inserted_id)}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create preset: {str(e)}")


@api_router.put("/construction-presets/{preset_id}")
async def update_construction_preset(
    preset_id: str,
    preset_data: ConstructionPresetUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a construction preset (Admin/Manager only)"""
    try:
        current_user = await get_current_user(credentials)
        
        if current_user["role"] not in ["admin", "project_manager", "crm_manager"]:
            raise HTTPException(status_code=403, detail="Admin or Manager access required")
        
        preset = await db.construction_presets.find_one({"_id": ObjectId(preset_id)})
        if not preset:
            raise HTTPException(status_code=404, detail="Construction preset not found")
        
        # Validate rate ranges if spec_groups provided
        if preset_data.spec_groups:
            for group in preset_data.spec_groups:
                for item in group.get("spec_items", []):
                    if item.get("rate_min", 0) > item.get("rate_max", 0):
                        raise HTTPException(status_code=400, detail=f"Invalid rate range for {item.get('item_name')}")
        
        # Prepare update data
        update_data = {k: v for k, v in preset_data.dict(exclude_unset=True).items() if v is not None}
        update_data.update({
            "updated_by": str(current_user["_id"]),
            "updated_at": datetime.utcnow()
        })
        
        # Check if this is a major change (increment version)
        major_changes = ["rate_per_sqft", "spec_groups"]
        if any(field in update_data for field in major_changes):
            update_data["version"] = preset.get("version", 1) + 1
        
        await db.construction_presets.update_one(
            {"_id": ObjectId(preset_id)},
            {"$set": update_data}
        )
        
        # Audit log
        await db.preset_audit_log.insert_one({
            "preset_id": preset_id,
            "action": "UPDATE",
            "user_id": str(current_user["_id"]),
            "changes": update_data,
            "timestamp": datetime.utcnow()
        })
        
        return {"message": "Construction preset updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update preset: {str(e)}")


@api_router.delete("/construction-presets/{preset_id}")
async def delete_construction_preset(
    preset_id: str,
    confirmation_name: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a construction preset with confirmation (Admin/Manager only)"""
    try:
        current_user = await get_current_user(credentials)
        
        # Role check
        if current_user["role"] not in ["admin", "project_manager", "crm_manager"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions. Only Admins and Managers can delete presets.")
        
        preset = await db.construction_presets.find_one({"_id": ObjectId(preset_id)})
        if not preset:
            raise HTTPException(status_code=404, detail="Construction preset not found")
        
        # Name confirmation
        if confirmation_name != preset["name"]:
            raise HTTPException(status_code=400, detail="Preset name confirmation does not match")
        
        # Check usage
        usage_count = await db.project_preset_usage.count_documents({
            "preset_id": preset_id,
            "is_active": True
        })
        
        if usage_count > 0:
            # Soft delete - mark as archived
            await db.construction_presets.update_one(
                {"_id": ObjectId(preset_id)},
                {"$set": {
                    "status": "archived", 
                    "updated_by": str(current_user["_id"]),
                    "updated_at": datetime.utcnow()
                }}
            )
            message = f"Preset archived (was used by {usage_count} projects)"
        else:
            # Hard delete
            await db.construction_presets.delete_one({"_id": ObjectId(preset_id)})
            message = "Preset deleted successfully"
        
        # Audit log
        await db.preset_audit_log.insert_one({
            "preset_id": preset_id,
            "action": "DELETE",
            "user_id": str(current_user["_id"]),
            "changes": {
                "name": preset["name"],
                "usage_count": usage_count,
                "action": "archived" if usage_count > 0 else "deleted"
            },
            "timestamp": datetime.utcnow()
        })
        
        return {"message": message, "usage_count": usage_count}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete preset: {str(e)}")


@api_router.post("/construction-presets/{preset_id}/duplicate")
async def duplicate_construction_preset(
    preset_id: str,
    new_name: str,
    new_region: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Duplicate a construction preset with new name/region"""
    try:
        current_user = await get_current_user(credentials)
        
        if current_user["role"] not in ["admin", "project_manager", "crm_manager"]:
            raise HTTPException(status_code=403, detail="Admin or Manager access required")
        
        # Get original preset
        original = await db.construction_presets.find_one({"_id": ObjectId(preset_id)})
        if not original:
            raise HTTPException(status_code=404, detail="Original preset not found")
        
        # Prepare duplicate data
        duplicate_data = {k: v for k, v in original.items() if k not in ["_id", "created_at", "updated_at"]}
        duplicate_data.update({
            "name": new_name,
            "region": new_region or original["region"],
            "version": 1,
            "status": "draft",
            "created_by": str(current_user["_id"]),
            "created_at": datetime.utcnow()
        })
        
        # Check for duplicate
        existing = await db.construction_presets.find_one({
            "name": new_name,
            "region": duplicate_data["region"]
        })
        if existing:
            raise HTTPException(status_code=400, detail=f"Preset '{new_name}' already exists in {duplicate_data['region']}")
        
        result = await db.construction_presets.insert_one(duplicate_data)
        
        return {"message": "Preset duplicated successfully", "id": str(result.inserted_id)}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to duplicate preset: {str(e)}")


# ==================== MATERIALS LIBRARY & UPLOAD ENDPOINTS ====================

@api_router.get("/materials-library")
async def get_materials_library(
    category: Optional[str] = None,
    region: str = "Bangalore",
    quality: str = "Standard",
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get comprehensive materials library with 300+ construction materials
    Optionally filter by category, apply regional pricing, and quality preference
    """
    try:
        await get_current_user(credentials)
        
        from materials_library import (
            get_comprehensive_materials_library,
            apply_regional_pricing,
            CATEGORIES
        )
        
        materials = get_comprehensive_materials_library()
        
        # Filter by category if specified
        if category:
            materials = [m for m in materials if m["category"] == category]
        
        # Apply regional pricing
        materials = apply_regional_pricing(materials, region)
        
        return {
            "materials": materials,
            "total_count": len(materials),
            "categories": CATEGORIES,
            "region": region,
            "quality": quality
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load materials library: {str(e)}")


@api_router.get("/materials-library/templates")
async def get_preset_templates(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get available preset templates for different project types
    """
    try:
        await get_current_user(credentials)
        
        from materials_library import get_preset_templates, CATEGORIES
        
        templates = get_preset_templates()
        
        return {
            "templates": templates,
            "categories": CATEGORIES
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load templates: {str(e)}")


@api_router.post("/materials-library/load-template")
async def load_materials_from_template(
    template_name: str,
    region: str = "Bangalore",
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Load materials from a preset template and apply regional pricing
    """
    try:
        await get_current_user(credentials)
        
        from materials_library import (
            get_comprehensive_materials_library,
            get_preset_templates,
            filter_materials_by_template,
            apply_regional_pricing
        )
        
        # Find template
        templates = get_preset_templates()
        template = next((t for t in templates if t["name"] == template_name), None)
        
        if not template:
            raise HTTPException(status_code=404, detail=f"Template '{template_name}' not found")
        
        # Get and filter materials
        all_materials = get_comprehensive_materials_library()
        filtered_materials = filter_materials_by_template(all_materials, template)
        
        # Apply regional pricing
        priced_materials = apply_regional_pricing(filtered_materials, region)
        
        return {
            "template": template,
            "materials": priced_materials,
            "total_count": len(priced_materials),
            "region": region
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load template: {str(e)}")


@api_router.post("/construction-presets/{preset_id}/import-materials")
async def import_materials_to_preset(
    preset_id: str,
    template_name: Optional[str] = None,
    region: str = "Bangalore",
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Import materials from library template into a construction preset
    Creates spec groups and items based on the template
    """
    try:
        current_user = await get_current_user(credentials)
        
        if current_user["role"] not in ["admin", "project_manager", "crm_manager"]:
            raise HTTPException(status_code=403, detail="Admin or Manager access required")
        
        # Verify preset exists
        preset = await db.construction_presets.find_one({"_id": ObjectId(preset_id)})
        if not preset:
            raise HTTPException(status_code=404, detail="Preset not found")
        
        from materials_library import (
            get_comprehensive_materials_library,
            get_preset_templates,
            filter_materials_by_template,
            apply_regional_pricing,
            CATEGORIES
        )
        
        # Get materials
        if template_name:
            templates = get_preset_templates()
            template = next((t for t in templates if t["name"] == template_name), None)
            if not template:
                raise HTTPException(status_code=404, detail=f"Template '{template_name}' not found")
            
            all_materials = get_comprehensive_materials_library()
            materials = filter_materials_by_template(all_materials, template)
        else:
            materials = get_comprehensive_materials_library()
        
        # Apply regional pricing
        materials = apply_regional_pricing(materials, region)
        
        # Group materials by category
        from collections import defaultdict
        grouped = defaultdict(list)
        for mat in materials:
            grouped[mat["category"]].append(mat)
        
        # Create spec groups and items
        spec_groups = []
        for idx, (category, items) in enumerate(grouped.items()):
            category_name = CATEGORIES.get(category, category)
            
            spec_items = []
            for item_idx, item in enumerate(items):
                brands = []
                for brand in item.get("brands", []):
                    brands.append({
                        "brand_id": str(uuid.uuid4())[:8],
                        "brand_name": brand["name"],
                        "brand_rate_min": brand.get("rate", item["rate_min"]) * 0.95,
                        "brand_rate_max": brand.get("rate", item["rate_max"]) * 1.05,
                        "quality_grade": brand.get("grade", "Standard"),
                        "supplier_name": None
                    })
                
                spec_items.append({
                    "item_id": str(uuid.uuid4())[:8],
                    "item_name": item["item_name"],
                    "unit": item["unit"],
                    "rate_min": item["rate_min"],
                    "rate_max": item["rate_max"],
                    "material_type": category,
                    "spec_reference": item.get("specifications", ""),
                    "notes": item.get("description", ""),
                    "is_mandatory": item.get("is_mandatory", False),
                    "order_index": item_idx,
                    "brand_list": brands
                })
            
            spec_groups.append({
                "group_id": str(uuid.uuid4())[:8],
                "group_name": category_name,
                "parent_group_id": None,
                "order_index": idx,
                "spec_items": spec_items
            })
        
        # Update preset with new spec groups
        await db.construction_presets.update_one(
            {"_id": ObjectId(preset_id)},
            {
                "$set": {
                    "spec_groups": spec_groups,
                    "updated_at": datetime.utcnow(),
                    "version": preset.get("version", 1) + 1
                }
            }
        )
        
        return {
            "message": "Materials imported successfully",
            "groups_created": len(spec_groups),
            "items_created": sum(len(g["spec_items"]) for g in spec_groups)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to import materials: {str(e)}")


@api_router.post("/construction-presets/upload/excel")
async def upload_specifications_excel(
    file: UploadFile = File(...),
    preset_id: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Upload specification details from Excel file
    If preset_id provided, imports into existing preset
    Otherwise returns parsed data for preview
    """
    try:
        current_user = await get_current_user(credentials)
        
        if current_user["role"] not in ["admin", "project_manager", "crm_manager"]:
            raise HTTPException(status_code=403, detail="Admin or Manager access required")
        
        # Validate file type
        if not file.filename.endswith(('.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="Only Excel files (.xlsx, .xls) are supported")
        
        import openpyxl
        
        # Read file content
        content = await file.read()
        
        # Parse Excel
        workbook = openpyxl.load_workbook(io.BytesIO(content))
        sheet = workbook.active
        
        # Parse headers (first row)
        headers = []
        for cell in sheet[1]:
            headers.append(str(cell.value).lower().strip() if cell.value else "")
        
        # Map expected columns
        column_map = {
            "item_name": ["item name", "item", "name", "material", "description"],
            "category": ["category", "group", "type"],
            "unit": ["unit", "uom", "measure"],
            "rate_min": ["rate min", "min rate", "rate_min", "minimum rate", "rate"],
            "rate_max": ["rate max", "max rate", "rate_max", "maximum rate"],
            "brand": ["brand", "brands", "manufacturer"],
            "specifications": ["specifications", "specs", "spec", "details"],
            "is_mandatory": ["mandatory", "required", "is_mandatory"],
        }
        
        # Find column indices
        col_indices = {}
        for field, aliases in column_map.items():
            for idx, header in enumerate(headers):
                if header in aliases:
                    col_indices[field] = idx
                    break
        
        if "item_name" not in col_indices:
            raise HTTPException(status_code=400, detail="Excel must have an 'Item Name' or 'Material' column")
        
        # Parse rows
        items = []
        for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            if not row[col_indices["item_name"]]:
                continue
            
            item = {
                "item_name": str(row[col_indices["item_name"]]),
                "category": str(row[col_indices.get("category", 0)] or "General") if "category" in col_indices else "General",
                "unit": str(row[col_indices.get("unit", 0)] or "nos") if "unit" in col_indices else "nos",
                "rate_min": float(row[col_indices.get("rate_min", 0)] or 0) if "rate_min" in col_indices else 0,
                "rate_max": float(row[col_indices.get("rate_max", 0)] or 0) if "rate_max" in col_indices else 0,
                "specifications": str(row[col_indices.get("specifications", 0)] or "") if "specifications" in col_indices else "",
                "is_mandatory": bool(row[col_indices.get("is_mandatory", 0)]) if "is_mandatory" in col_indices else False,
                "brands": []
            }
            
            # Parse brands if column exists
            if "brand" in col_indices and row[col_indices["brand"]]:
                brand_str = str(row[col_indices["brand"]])
                brand_names = [b.strip() for b in brand_str.split(",")]
                for brand_name in brand_names:
                    if brand_name:
                        item["brands"].append({
                            "brand_id": str(uuid.uuid4())[:8],
                            "brand_name": brand_name,
                            "quality_grade": "Standard"
                        })
            
            items.append(item)
        
        # If preset_id provided, import into preset
        if preset_id:
            preset = await db.construction_presets.find_one({"_id": ObjectId(preset_id)})
            if not preset:
                raise HTTPException(status_code=404, detail="Preset not found")
            
            # Group items by category
            from collections import defaultdict
            grouped = defaultdict(list)
            for item in items:
                grouped[item["category"]].append(item)
            
            # Create spec groups
            spec_groups = preset.get("spec_groups", [])
            existing_group_names = {g["group_name"] for g in spec_groups}
            
            for category, cat_items in grouped.items():
                if category not in existing_group_names:
                    spec_items = []
                    for idx, item in enumerate(cat_items):
                        spec_items.append({
                            "item_id": str(uuid.uuid4())[:8],
                            "item_name": item["item_name"],
                            "unit": item["unit"],
                            "rate_min": item["rate_min"],
                            "rate_max": item["rate_max"] or item["rate_min"],
                            "material_type": category,
                            "spec_reference": item["specifications"],
                            "notes": "",
                            "is_mandatory": item["is_mandatory"],
                            "order_index": idx,
                            "brand_list": item["brands"]
                        })
                    
                    spec_groups.append({
                        "group_id": str(uuid.uuid4())[:8],
                        "group_name": category,
                        "parent_group_id": None,
                        "order_index": len(spec_groups),
                        "spec_items": spec_items
                    })
            
            # Update preset
            await db.construction_presets.update_one(
                {"_id": ObjectId(preset_id)},
                {
                    "$set": {
                        "spec_groups": spec_groups,
                        "updated_at": datetime.utcnow(),
                        "version": preset.get("version", 1) + 1
                    }
                }
            )
            
            return {
                "message": "Excel data imported successfully",
                "items_imported": len(items),
                "groups_created": len(grouped)
            }
        
        # Return parsed data for preview
        return {
            "message": "Excel parsed successfully",
            "items": items,
            "total_count": len(items),
            "columns_found": list(col_indices.keys())
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process Excel: {str(e)}")


@api_router.post("/construction-presets/upload/pdf")
async def upload_specifications_pdf(
    file: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Upload specification details from PDF file
    Extracts text and tables from PDF for preview/import
    """
    try:
        current_user = await get_current_user(credentials)
        
        if current_user["role"] not in ["admin", "project_manager", "crm_manager"]:
            raise HTTPException(status_code=403, detail="Admin or Manager access required")
        
        # Validate file type
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
        import pdfplumber
        
        # Read file content
        content = await file.read()
        
        # Parse PDF
        extracted_data = {
            "text": "",
            "tables": [],
            "items": []
        }
        
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page_num, page in enumerate(pdf.pages):
                # Extract text
                text = page.extract_text()
                if text:
                    extracted_data["text"] += f"\n--- Page {page_num + 1} ---\n{text}"
                
                # Extract tables
                tables = page.extract_tables()
                for table in tables:
                    if table and len(table) > 1:
                        # Try to identify table headers
                        headers = [str(cell).lower().strip() if cell else "" for cell in table[0]]
                        
                        # Check if this looks like a materials table
                        material_keywords = ["item", "material", "description", "rate", "unit", "qty", "quantity"]
                        is_materials_table = any(any(kw in h for kw in material_keywords) for h in headers)
                        
                        if is_materials_table:
                            # Find relevant columns
                            name_col = next((i for i, h in enumerate(headers) if any(k in h for k in ["item", "material", "description"])), 0)
                            unit_col = next((i for i, h in enumerate(headers) if "unit" in h), None)
                            rate_col = next((i for i, h in enumerate(headers) if "rate" in h), None)
                            
                            for row in table[1:]:
                                if row and row[name_col]:
                                    item = {
                                        "item_name": str(row[name_col]),
                                        "unit": str(row[unit_col]) if unit_col and row[unit_col] else "nos",
                                        "rate_min": 0,
                                        "rate_max": 0,
                                        "category": "Imported",
                                        "brands": []
                                    }
                                    
                                    # Try to parse rate
                                    if rate_col and row[rate_col]:
                                        try:
                                            rate_str = str(row[rate_col]).replace(",", "").replace("₹", "").strip()
                                            item["rate_min"] = float(rate_str)
                                            item["rate_max"] = float(rate_str)
                                        except:
                                            pass
                                    
                                    extracted_data["items"].append(item)
                        
                        extracted_data["tables"].append({
                            "page": page_num + 1,
                            "headers": headers,
                            "rows": len(table) - 1
                        })
        
        return {
            "message": "PDF parsed successfully",
            "filename": file.filename,
            "pages_processed": len(pdf.pages) if 'pdf' in dir() else 0,
            "tables_found": len(extracted_data["tables"]),
            "items_extracted": len(extracted_data["items"]),
            "items": extracted_data["items"],
            "text_preview": extracted_data["text"][:2000] + "..." if len(extracted_data["text"]) > 2000 else extracted_data["text"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")


# ==================== PROJECT STATUS UPDATES API ====================

@api_router.post("/projects/{project_id}/status-updates", response_model=StatusUpdateResponse)
async def create_status_update(
    project_id: str,
    update_data: StatusUpdateCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new project status update with photos"""
    try:
        current_user = await get_current_user(credentials)
        
        # Verify project exists
        project = await db.projects.find_one({"_id": ObjectId(project_id)})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get task statistics
        total_tasks = await db.tasks.count_documents({"project_id": project_id})
        completed_tasks = await db.tasks.count_documents({"project_id": project_id, "status": "completed"})
        in_progress_tasks = await db.tasks.count_documents({"project_id": project_id, "status": "in_progress"})
        pending_tasks = total_tasks - completed_tasks - in_progress_tasks
        
        update_dict = update_data.dict()
        update_dict["project_id"] = project_id
        update_dict["created_by"] = str(current_user["_id"])
        update_dict["created_at"] = datetime.utcnow()
        update_dict["tasks_completed"] = completed_tasks
        update_dict["tasks_in_progress"] = in_progress_tasks
        update_dict["tasks_pending"] = pending_tasks
        
        # Calculate overall progress if not provided
        if total_tasks > 0 and update_dict.get("overall_progress", 0) == 0:
            update_dict["overall_progress"] = round((completed_tasks / total_tasks) * 100, 1)
        
        result = await db.status_updates.insert_one(update_dict)
        
        created = await db.status_updates.find_one({"_id": result.inserted_id})
        response = serialize_doc(created)
        response["created_by_name"] = current_user["full_name"]
        response["project_name"] = project.get("name")
        
        return StatusUpdateResponse(**response)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create status update: {str(e)}")


@api_router.get("/projects/{project_id}/status-updates", response_model=List[StatusUpdateResponse])
async def get_project_status_updates(
    project_id: str,
    frequency: Optional[str] = None,
    limit: int = 50,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all status updates for a project"""
    try:
        current_user = await get_current_user(credentials)
        
        query = {"project_id": project_id}
        if frequency:
            query["frequency"] = frequency
        
        updates = await db.status_updates.find(query).sort("created_at", -1).limit(limit).to_list(limit)
        
        # Get project info
        project = await db.projects.find_one({"_id": ObjectId(project_id)})
        
        result = []
        for update in updates:
            update_dict = serialize_doc(update)
            
            # Get creator name
            creator = await get_user_by_id(update_dict["created_by"])
            update_dict["created_by_name"] = creator["full_name"] if creator else "Unknown"
            update_dict["project_name"] = project.get("name") if project else None
            
            result.append(StatusUpdateResponse(**update_dict))
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get status updates: {str(e)}")


@api_router.get("/status-updates/all", response_model=List[StatusUpdateResponse])
async def get_all_status_updates(
    frequency: Optional[str] = None,
    limit: int = 100,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all status updates across all projects (for dashboard)"""
    try:
        current_user = await get_current_user(credentials)
        
        query = {}
        if frequency:
            query["frequency"] = frequency
        
        # For vendors, only show public updates
        if current_user["role"] == UserRole.VENDOR:
            query["is_public"] = True
        
        updates = await db.status_updates.find(query).sort("created_at", -1).limit(limit).to_list(limit)
        
        result = []
        for update in updates:
            update_dict = serialize_doc(update)
            
            # Get creator and project info
            creator = await get_user_by_id(update_dict["created_by"])
            project = await db.projects.find_one({"_id": ObjectId(update_dict["project_id"])})
            
            update_dict["created_by_name"] = creator["full_name"] if creator else "Unknown"
            update_dict["project_name"] = project.get("name") if project else None
            
            result.append(StatusUpdateResponse(**update_dict))
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get status updates: {str(e)}")


@api_router.get("/status-updates/{update_id}", response_model=StatusUpdateResponse)
async def get_status_update(
    update_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get a specific status update"""
    try:
        current_user = await get_current_user(credentials)
        
        update = await db.status_updates.find_one({"_id": ObjectId(update_id)})
        if not update:
            raise HTTPException(status_code=404, detail="Status update not found")
        
        update_dict = serialize_doc(update)
        
        # Get creator and project info
        creator = await get_user_by_id(update_dict["created_by"])
        project = await db.projects.find_one({"_id": ObjectId(update_dict["project_id"])})
        
        update_dict["created_by_name"] = creator["full_name"] if creator else "Unknown"
        update_dict["project_name"] = project.get("name") if project else None
        
        return StatusUpdateResponse(**update_dict)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get status update: {str(e)}")


@api_router.put("/status-updates/{update_id}", response_model=StatusUpdateResponse)
async def update_status_update(
    update_id: str,
    update_data: StatusUpdateUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a status update"""
    try:
        current_user = await get_current_user(credentials)
        
        existing = await db.status_updates.find_one({"_id": ObjectId(update_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Status update not found")
        
        # Only creator or admin can update
        if str(existing["created_by"]) != str(current_user["_id"]) and current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Not authorized to update this status")
        
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        update_dict["updated_at"] = datetime.utcnow()
        
        await db.status_updates.update_one(
            {"_id": ObjectId(update_id)},
            {"$set": update_dict}
        )
        
        updated = await db.status_updates.find_one({"_id": ObjectId(update_id)})
        response = serialize_doc(updated)
        
        creator = await get_user_by_id(response["created_by"])
        project = await db.projects.find_one({"_id": ObjectId(response["project_id"])})
        
        response["created_by_name"] = creator["full_name"] if creator else "Unknown"
        response["project_name"] = project.get("name") if project else None
        
        return StatusUpdateResponse(**response)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update status: {str(e)}")


@api_router.delete("/status-updates/{update_id}")
async def delete_status_update(
    update_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a status update"""
    try:
        current_user = await get_current_user(credentials)
        
        existing = await db.status_updates.find_one({"_id": ObjectId(update_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Status update not found")
        
        # Only creator or admin can delete
        if str(existing["created_by"]) != str(current_user["_id"]) and current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Not authorized to delete this status")
        
        await db.status_updates.delete_one({"_id": ObjectId(update_id)})
        
        return {"message": "Status update deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete status: {str(e)}")


@api_router.get("/projects/{project_id}/gantt-data")
async def get_project_gantt_data(
    project_id: str,
    view: str = "weekly",  # daily, weekly, monthly
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get Gantt chart data for a project (milestones and tasks with timeline)"""
    try:
        current_user = await get_current_user(credentials)
        
        # Get project
        project = await db.projects.find_one({"_id": ObjectId(project_id)})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get milestones
        milestones = await db.milestones.find({"project_id": project_id}).sort("order", 1).to_list(100)
        
        # Get tasks
        tasks = await db.tasks.find({"project_id": project_id}).to_list(500)
        
        # Build Gantt data structure
        gantt_items = []
        
        for milestone in milestones:
            m_dict = serialize_doc(milestone)
            
            # Get tasks for this milestone
            milestone_tasks = [t for t in tasks if t.get("milestone_id") == m_dict["id"]]
            
            gantt_items.append({
                "id": m_dict["id"],
                "type": "milestone",
                "name": m_dict["name"],
                "start_date": m_dict.get("start_date") or m_dict.get("created_at"),
                "end_date": m_dict.get("due_date"),
                "progress": m_dict.get("completion_percentage", 0),
                "status": m_dict.get("status"),
                "color": m_dict.get("color", "#8B5CF6"),
                "children": [serialize_doc(t)["id"] for t in milestone_tasks]
            })
            
            # Add tasks under this milestone
            for task in milestone_tasks:
                t_dict = serialize_doc(task)
                gantt_items.append({
                    "id": t_dict["id"],
                    "type": "task",
                    "name": t_dict["title"],
                    "start_date": t_dict.get("planned_start_date") or t_dict.get("created_at"),
                    "end_date": t_dict.get("planned_end_date") or t_dict.get("due_date"),
                    "progress": t_dict.get("progress_percentage", 0),
                    "status": t_dict.get("status"),
                    "parent_id": m_dict["id"],
                    "assigned_to": t_dict.get("assigned_to", [])
                })
        
        # Add unassigned tasks
        unassigned_tasks = [t for t in tasks if not t.get("milestone_id")]
        for task in unassigned_tasks:
            t_dict = serialize_doc(task)
            gantt_items.append({
                "id": t_dict["id"],
                "type": "task",
                "name": t_dict["title"],
                "start_date": t_dict.get("planned_start_date") or t_dict.get("created_at"),
                "end_date": t_dict.get("planned_end_date") or t_dict.get("due_date"),
                "progress": t_dict.get("progress_percentage", 0),
                "status": t_dict.get("status"),
                "parent_id": None,
                "assigned_to": t_dict.get("assigned_to", [])
            })
        
        # Calculate date range based on view
        now = datetime.utcnow()
        if view == "daily":
            start_range = now - timedelta(days=7)
            end_range = now + timedelta(days=7)
        elif view == "weekly":
            start_range = now - timedelta(weeks=4)
            end_range = now + timedelta(weeks=8)
        else:  # monthly
            start_range = now - timedelta(days=90)
            end_range = now + timedelta(days=180)
        
        return {
            "project_id": project_id,
            "project_name": project.get("name"),
            "view": view,
            "date_range": {
                "start": start_range.isoformat(),
                "end": end_range.isoformat()
            },
            "items": gantt_items,
            "summary": {
                "total_milestones": len(milestones),
                "total_tasks": len(tasks),
                "completed_tasks": len([t for t in tasks if t.get("status") == "completed"]),
                "in_progress_tasks": len([t for t in tasks if t.get("status") == "in_progress"])
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get Gantt data: {str(e)}")


# ============= Site Materials Inventory API =============
from models import (
    SiteMaterialCreate, SiteMaterialUpdate, SiteMaterialResponse,
    MaterialCondition, SiteMaterialStatus,
    NotificationCreate, NotificationResponse, NotificationStats,
    NotificationType, NotificationPriority
)
from notification_service import NotificationService

@api_router.post("/site-materials", response_model=dict)
async def add_site_material(
    material: SiteMaterialCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Add material to site inventory (by project engineers)"""
    try:
        user = await get_current_user(credentials)
        
        # Validate that media is provided (at least one photo/video)
        if not material.media_urls or len(material.media_urls) == 0:
            raise HTTPException(status_code=400, detail="At least one photo or video is required")
        
        # Verify project exists
        project = await db.projects.find_one({"_id": ObjectId(material.project_id)})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Create site material entry
        site_material = {
            "project_id": material.project_id,
            "material_type": material.material_type,
            "material_id": material.material_id,
            "quantity": material.quantity,
            "unit": material.unit,
            "cost": material.cost,
            "condition": material.condition.value,
            "notes": material.notes,
            "media_urls": material.media_urls,
            "status": "pending_review",
            "added_by": str(user["_id"]),
            "added_by_name": user.get("full_name", "Unknown"),
            "reviewed_by": None,
            "reviewed_by_name": None,
            "review_notes": None,
            "reviewed_at": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await db.site_materials.insert_one(site_material)
        material_id = str(result.inserted_id)
        
        # Notify managers about new material entry
        notification_service = NotificationService(db)
        
        # Get managers and admins for this project
        manager_ids = []
        managers_cursor = db.users.find({
            "is_active": True,
            "role": {"$in": ["admin", "project_manager"]}
        })
        async for manager in managers_cursor:
            manager_ids.append(str(manager["_id"]))
        
        if manager_ids:
            await notification_service.notify_material_added(
                manager_ids=manager_ids,
                material_type=material.material_type,
                quantity=material.quantity,
                project_name=project.get("name", "Unknown Project"),
                added_by_name=user.get("full_name", "Unknown"),
                material_id=material_id
            )
        
        return {
            "id": material_id,
            "message": "Site material added successfully",
            "status": "pending_review"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add site material: {str(e)}")


@api_router.get("/site-materials", response_model=List[dict])
async def get_site_materials(
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    condition: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get site materials with optional filters"""
    try:
        await get_current_user(credentials)
        
        query = {}
        if project_id:
            query["project_id"] = project_id
        if status:
            query["status"] = status
        if condition:
            query["condition"] = condition
        
        cursor = db.site_materials.find(query).sort("created_at", -1).skip(skip).limit(limit)
        
        materials = []
        async for mat in cursor:
            mat["id"] = str(mat.pop("_id"))
            
            # Get project name
            if mat.get("project_id"):
                try:
                    project = await db.projects.find_one({"_id": ObjectId(mat["project_id"])})
                    mat["project_name"] = project.get("name") if project else None
                except:
                    mat["project_name"] = None
            
            materials.append(mat)
        
        return materials
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get site materials: {str(e)}")


@api_router.get("/site-materials/{material_id}", response_model=dict)
async def get_site_material(
    material_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get a specific site material entry"""
    try:
        await get_current_user(credentials)
        
        material = await db.site_materials.find_one({"_id": ObjectId(material_id)})
        if not material:
            raise HTTPException(status_code=404, detail="Site material not found")
        
        material["id"] = str(material.pop("_id"))
        
        # Get project name
        if material.get("project_id"):
            try:
                project = await db.projects.find_one({"_id": ObjectId(material["project_id"])})
                material["project_name"] = project.get("name") if project else None
            except:
                material["project_name"] = None
        
        return material
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get site material: {str(e)}")


@api_router.put("/site-materials/{material_id}/review", response_model=dict)
async def review_site_material(
    material_id: str,
    status: str,  # "approved" or "rejected"
    review_notes: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Review (approve/reject) a site material entry (managers only)"""
    try:
        user = await get_current_user(credentials)
        
        # Check if user has permission to review
        if user.get("role") not in ["admin", "project_manager", "crm_manager"]:
            raise HTTPException(status_code=403, detail="Only managers can review site materials")
        
        if status not in ["approved", "rejected"]:
            raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")
        
        # Get material
        material = await db.site_materials.find_one({"_id": ObjectId(material_id)})
        if not material:
            raise HTTPException(status_code=404, detail="Site material not found")
        
        # Update material
        update_data = {
            "status": status,
            "reviewed_by": str(user["_id"]),
            "reviewed_by_name": user.get("full_name", "Unknown"),
            "review_notes": review_notes,
            "reviewed_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await db.site_materials.update_one(
            {"_id": ObjectId(material_id)},
            {"$set": update_data}
        )
        
        # Notify the engineer who added the material
        notification_service = NotificationService(db)
        await notification_service.notify_material_reviewed(
            engineer_id=material["added_by"],
            material_type=material["material_type"],
            status=status,
            reviewer_name=user.get("full_name", "Unknown"),
            material_id=material_id
        )
        
        return {
            "message": f"Site material {status} successfully",
            "status": status
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to review site material: {str(e)}")


@api_router.get("/site-materials/project/{project_id}/stats", response_model=dict)
async def get_project_site_materials_stats(
    project_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get statistics for site materials of a project"""
    try:
        await get_current_user(credentials)
        
        total = await db.site_materials.count_documents({"project_id": project_id})
        pending = await db.site_materials.count_documents({"project_id": project_id, "status": "pending_review"})
        approved = await db.site_materials.count_documents({"project_id": project_id, "status": "approved"})
        rejected = await db.site_materials.count_documents({"project_id": project_id, "status": "rejected"})
        
        # Count by condition
        pipeline = [
            {"$match": {"project_id": project_id}},
            {"$group": {"_id": "$condition", "count": {"$sum": 1}}}
        ]
        by_condition = {}
        async for result in db.site_materials.aggregate(pipeline):
            by_condition[result["_id"]] = result["count"]
        
        return {
            "total": total,
            "pending_review": pending,
            "approved": approved,
            "rejected": rejected,
            "by_condition": by_condition
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")


# ============= Material Transfer API =============
from models import MaterialTransferCreate, MaterialTransferResponse, TransferDestination, TransferStatus

@api_router.post("/material-transfers", response_model=dict)
async def create_material_transfer(
    transfer: MaterialTransferCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a material transfer request"""
    try:
        user = await get_current_user(credentials)
        
        # Get the source material
        material = await db.site_materials.find_one({"_id": ObjectId(transfer.site_material_id)})
        if not material:
            raise HTTPException(status_code=404, detail="Site material not found")
        
        if material.get("status") != "approved":
            raise HTTPException(status_code=400, detail="Only approved materials can be transferred")
        
        if transfer.quantity > material.get("quantity", 0):
            raise HTTPException(status_code=400, detail="Transfer quantity exceeds available quantity")
        
        # Validate destination
        destination_project_name = None
        if transfer.destination_type == "project":
            if not transfer.destination_project_id:
                raise HTTPException(status_code=400, detail="Destination project is required for project transfers")
            dest_project = await db.projects.find_one({"_id": ObjectId(transfer.destination_project_id)})
            if not dest_project:
                raise HTTPException(status_code=404, detail="Destination project not found")
            destination_project_name = dest_project.get("name")
        
        # Get source project name
        source_project = await db.projects.find_one({"_id": ObjectId(material["project_id"])})
        source_project_name = source_project.get("name") if source_project else None
        
        # Create transfer record
        transfer_record = {
            "site_material_id": transfer.site_material_id,
            "material_type": material.get("material_type"),
            "quantity": transfer.quantity,
            "unit": material.get("unit", "units"),
            "source_project_id": material.get("project_id"),
            "source_project_name": source_project_name,
            "destination_type": transfer.destination_type,
            "destination_project_id": transfer.destination_project_id,
            "destination_project_name": destination_project_name,
            "status": "pending",
            "notes": transfer.notes,
            "media_urls": transfer.media_urls or [],  # Photos/videos of transfer
            "initiated_by": str(user["_id"]),
            "initiated_by_name": user.get("full_name", "Unknown"),
            "accepted_by": None,
            "accepted_by_name": None,
            "accepted_at": None,
            "rejection_reason": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await db.material_transfers.insert_one(transfer_record)
        transfer_id = str(result.inserted_id)
        
        # Send notification to destination project engineers
        if transfer.destination_type == "project" and transfer.destination_project_id:
            notification_service = NotificationService(db)
            # Find engineers assigned to destination project
            dest_project = await db.projects.find_one({"_id": ObjectId(transfer.destination_project_id)})
            if dest_project and dest_project.get("team_member_ids"):
                for member_id in dest_project["team_member_ids"]:
                    await notification_service.create_notification(
                        user_id=member_id,
                        title="Material Transfer Request",
                        message=f"{transfer.quantity} {material.get('unit')} of {material.get('material_type')} is being transferred from {source_project_name}. Please accept to receive.",
                        notification_type="material_added",
                        priority="high",
                        link=f"/materials/transfers/{transfer_id}",
                        related_entity_type="material_transfer",
                        related_entity_id=transfer_id
                    )
        
        return {
            "id": transfer_id,
            "message": "Transfer request created successfully",
            "status": "pending"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create transfer: {str(e)}")


@api_router.get("/material-transfers", response_model=List[dict])
async def get_material_transfers(
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    direction: Optional[str] = None,  # "incoming" or "outgoing"
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get material transfers"""
    try:
        await get_current_user(credentials)
        
        query = {}
        if status:
            query["status"] = status
        
        if project_id:
            if direction == "incoming":
                query["destination_project_id"] = project_id
            elif direction == "outgoing":
                query["source_project_id"] = project_id
            else:
                query["$or"] = [
                    {"source_project_id": project_id},
                    {"destination_project_id": project_id}
                ]
        
        transfers = []
        async for transfer in db.material_transfers.find(query).sort("created_at", -1):
            transfer["id"] = str(transfer.pop("_id"))
            transfers.append(transfer)
        
        return transfers
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get transfers: {str(e)}")


@api_router.post("/material-transfers/{transfer_id}/accept", response_model=dict)
async def accept_material_transfer(
    transfer_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Accept a material transfer (receiving project engineer)"""
    try:
        user = await get_current_user(credentials)
        
        transfer = await db.material_transfers.find_one({"_id": ObjectId(transfer_id)})
        if not transfer:
            raise HTTPException(status_code=404, detail="Transfer not found")
        
        if transfer.get("status") != "pending":
            raise HTTPException(status_code=400, detail="Transfer is no longer pending")
        
        # Update transfer status
        await db.material_transfers.update_one(
            {"_id": ObjectId(transfer_id)},
            {"$set": {
                "status": "accepted",
                "accepted_by": str(user["_id"]),
                "accepted_by_name": user.get("full_name", "Unknown"),
                "accepted_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )
        
        # Update source material quantity or remove if fully transferred
        source_material = await db.site_materials.find_one({"_id": ObjectId(transfer["site_material_id"])})
        if source_material:
            new_quantity = source_material.get("quantity", 0) - transfer["quantity"]
            if new_quantity <= 0:
                # Mark as transferred (keep for history) but set quantity to 0
                await db.site_materials.update_one(
                    {"_id": ObjectId(transfer["site_material_id"])},
                    {"$set": {
                        "quantity": 0, 
                        "status": "transferred",
                        "transfer_note": f"Fully transferred to {transfer.get('destination_project_name') or transfer.get('destination_type', 'another location')}",
                        "transferred_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }}
                )
            else:
                await db.site_materials.update_one(
                    {"_id": ObjectId(transfer["site_material_id"])},
                    {"$set": {"quantity": new_quantity, "updated_at": datetime.utcnow()}}
                )
        
        # Track finance - check if material is from inventory (has material_id reference)
        is_from_inventory = source_material.get("material_id") is not None if source_material else False
        material_cost = source_material.get("cost", 0) if source_material else 0
        unit_cost = material_cost / source_material.get("quantity", 1) if source_material and source_material.get("quantity", 0) > 0 else 0
        transfer_cost = unit_cost * transfer["quantity"]
        
        # Create finance record for tracking
        finance_record = {
            "type": "material_transfer",
            "transfer_id": transfer_id,
            "material_type": transfer["material_type"],
            "quantity": transfer["quantity"],
            "unit": transfer["unit"],
            "estimated_cost": transfer_cost,
            "source_project_id": transfer.get("source_project_id"),
            "source_project_name": transfer.get("source_project_name"),
            "destination_type": transfer.get("destination_type"),
            "destination_project_id": transfer.get("destination_project_id"),
            "destination_project_name": transfer.get("destination_project_name"),
            "is_from_inventory": is_from_inventory,
            "classification": "project_cost" if is_from_inventory else "company_asset",
            "accepted_by": str(user["_id"]),
            "accepted_by_name": user.get("full_name", "Unknown"),
            "created_at": datetime.utcnow()
        }
        await db.material_transfer_finance.insert_one(finance_record)
        
        # Create new material entry at destination (if project)
        if transfer.get("destination_type") == "project" and transfer.get("destination_project_id"):
            new_material = {
                "project_id": transfer["destination_project_id"],
                "material_type": transfer["material_type"],
                "quantity": transfer["quantity"],
                "unit": transfer["unit"],
                "condition": source_material.get("condition", "good") if source_material else "good",
                "notes": f"Transferred from {transfer.get('source_project_name', 'another project')}",
                "media_urls": source_material.get("media_urls", []) if source_material else [],
                "status": "approved",  # Auto-approved since it's a transfer
                "added_by": str(user["_id"]),
                "added_by_name": user.get("full_name", "Unknown"),
                "transfer_id": transfer_id,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            await db.site_materials.insert_one(new_material)
        
        # Notify the initiator
        notification_service = NotificationService(db)
        await notification_service.create_notification(
            user_id=transfer["initiated_by"],
            title="Transfer Accepted",
            message=f"Your transfer of {transfer['quantity']} {transfer['unit']} {transfer['material_type']} has been accepted by {user.get('full_name', 'the recipient')}",
            notification_type="material_approved",
            priority="normal",
            link=f"/materials/transfers/{transfer_id}"
        )
        
        return {"message": "Transfer accepted successfully", "status": "accepted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to accept transfer: {str(e)}")


@api_router.post("/material-transfers/{transfer_id}/reject", response_model=dict)
async def reject_material_transfer(
    transfer_id: str,
    reason: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Reject a material transfer"""
    try:
        user = await get_current_user(credentials)
        
        transfer = await db.material_transfers.find_one({"_id": ObjectId(transfer_id)})
        if not transfer:
            raise HTTPException(status_code=404, detail="Transfer not found")
        
        if transfer.get("status") != "pending":
            raise HTTPException(status_code=400, detail="Transfer is no longer pending")
        
        await db.material_transfers.update_one(
            {"_id": ObjectId(transfer_id)},
            {"$set": {
                "status": "rejected",
                "rejection_reason": reason,
                "updated_at": datetime.utcnow()
            }}
        )
        
        # Notify the initiator
        notification_service = NotificationService(db)
        await notification_service.create_notification(
            user_id=transfer["initiated_by"],
            title="Transfer Rejected",
            message=f"Your transfer of {transfer['quantity']} {transfer['unit']} {transfer['material_type']} was rejected. Reason: {reason or 'No reason provided'}",
            notification_type="material_rejected",
            priority="normal",
            link=f"/materials/transfers/{transfer_id}"
        )
        
        return {"message": "Transfer rejected", "status": "rejected"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reject transfer: {str(e)}")


# ============= Material Transfer History & Finance API =============

@api_router.get("/material-transfers/history", response_model=List[dict])
async def get_material_transfer_history(
    project_id: Optional[str] = None,
    include_all_statuses: bool = True,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get transfer history for a project or all projects"""
    try:
        await get_current_user(credentials)
        
        query = {}
        if not include_all_statuses:
            query["status"] = {"$in": ["accepted", "rejected"]}
        
        if project_id:
            query["$or"] = [
                {"source_project_id": project_id},
                {"destination_project_id": project_id}
            ]
        
        transfers = []
        async for transfer in db.material_transfers.find(query).sort("created_at", -1).limit(100):
            transfer["id"] = str(transfer.pop("_id"))
            # Add direction indicator
            if project_id:
                if transfer.get("source_project_id") == project_id:
                    transfer["direction"] = "outgoing"
                else:
                    transfer["direction"] = "incoming"
            transfers.append(transfer)
        
        return transfers
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get transfer history: {str(e)}")


@api_router.get("/material-finance/summary", response_model=dict)
async def get_material_finance_summary(
    project_id: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get material finance summary - project costs vs company assets"""
    try:
        user = await get_current_user(credentials)
        
        # Only allow admins and managers to see finance data
        if user.get("role") not in ["admin", "project_manager", "crm_manager"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        query = {}
        if project_id:
            query["$or"] = [
                {"source_project_id": project_id},
                {"destination_project_id": project_id}
            ]
        
        # Aggregate finance data
        project_costs = 0
        company_assets = 0
        total_transfers = 0
        
        async for record in db.material_transfer_finance.find(query):
            total_transfers += 1
            cost = record.get("estimated_cost", 0)
            if record.get("classification") == "project_cost":
                project_costs += cost
            else:
                company_assets += cost
        
        return {
            "total_transfers": total_transfers,
            "project_costs": project_costs,
            "company_assets": company_assets,
            "total_value": project_costs + company_assets,
            "breakdown": {
                "from_inventory": project_costs,
                "non_inventory": company_assets
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get finance summary: {str(e)}")


@api_router.get("/material-finance/records", response_model=List[dict])
async def get_material_finance_records(
    project_id: Optional[str] = None,
    classification: Optional[str] = None,  # "project_cost" or "company_asset"
    skip: int = 0,
    limit: int = 50,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get material finance records for accounting"""
    try:
        user = await get_current_user(credentials)
        
        if user.get("role") not in ["admin", "project_manager", "crm_manager"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        query = {}
        if project_id:
            query["$or"] = [
                {"source_project_id": project_id},
                {"destination_project_id": project_id}
            ]
        if classification:
            query["classification"] = classification
        
        records = []
        async for record in db.material_transfer_finance.find(query).sort("created_at", -1).skip(skip).limit(limit):
            record["id"] = str(record.pop("_id"))
            records.append(record)
        
        return records
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get finance records: {str(e)}")


# ============= Notifications API =============

@api_router.get("/notifications", response_model=List[dict])
async def get_notifications(
    skip: int = 0,
    limit: int = 50,
    unread_only: bool = False,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get notifications for the current user"""
    try:
        user = await get_current_user(credentials)
        user_id = str(user["_id"])
        
        notification_service = NotificationService(db)
        notifications = await notification_service.get_user_notifications(
            user_id=user_id,
            skip=skip,
            limit=limit,
            unread_only=unread_only
        )
        
        return notifications
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get notifications: {str(e)}")


@api_router.get("/notifications/stats", response_model=dict)
async def get_notification_stats(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get notification statistics for the current user"""
    try:
        user = await get_current_user(credentials)
        user_id = str(user["_id"])
        
        notification_service = NotificationService(db)
        stats = await notification_service.get_notification_stats(user_id)
        
        return stats
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get notification stats: {str(e)}")


@api_router.post("/notifications/{notification_id}/read", response_model=dict)
async def mark_notification_read(
    notification_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Mark a notification as read"""
    try:
        user = await get_current_user(credentials)
        user_id = str(user["_id"])
        
        notification_service = NotificationService(db)
        success = await notification_service.mark_as_read(notification_id, user_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        return {"message": "Notification marked as read"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark notification as read: {str(e)}")


@api_router.post("/notifications/read-all", response_model=dict)
async def mark_all_notifications_read(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Mark all notifications as read for the current user"""
    try:
        user = await get_current_user(credentials)
        user_id = str(user["_id"])
        
        notification_service = NotificationService(db)
        count = await notification_service.mark_all_as_read(user_id)
        
        return {"message": f"Marked {count} notifications as read"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark notifications as read: {str(e)}")


@api_router.delete("/notifications/{notification_id}", response_model=dict)
async def delete_notification(
    notification_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a notification"""
    try:
        user = await get_current_user(credentials)
        user_id = str(user["_id"])
        
        notification_service = NotificationService(db)
        success = await notification_service.delete_notification(notification_id, user_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        return {"message": "Notification deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete notification: {str(e)}")


# ============= Scheduled Jobs API (Admin Only) =============

@api_router.post("/admin/trigger-weekly-review", response_model=dict)
async def trigger_weekly_review_notification(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Manually trigger the weekly material review notification (Admin only)"""
    try:
        user = await get_current_user(credentials)
        
        if user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        from notification_service import run_weekly_material_review_notification
        await run_weekly_material_review_notification(db)
        
        return {"message": "Weekly review notification triggered successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to trigger notification: {str(e)}")


@api_router.get("/admin/scheduled-jobs", response_model=List[dict])
async def get_scheduled_jobs(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all scheduled jobs from APScheduler (Admin only)"""
    try:
        user = await get_current_user(credentials)
        
        if user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get jobs from APScheduler
        from scheduler import get_scheduled_jobs as get_scheduler_jobs
        return get_scheduler_jobs()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get scheduled jobs: {str(e)}")


# ============= Project Management Templates API =============

# Standard milestone and task templates data
MILESTONE_TEMPLATES = [
    {
        "name": "Preplanning",
        "description": "Planning and design phase before construction",
        "order": 1,
        "phase": "preplanning",
        "default_duration_days": 30,
        "is_floor_based": False,
        "color": "#6366F1",
        "tasks": [
            {"name": "Preliminary Agreement Signing", "order": 1, "duration": 2, "work_type": "general"},
            {"name": "Site Visits & Survey", "order": 2, "duration": 3, "work_type": "general", "deps": ["Preliminary Agreement Signing"]},
            {"name": "Site Marking", "order": 3, "duration": 2, "work_type": "general", "deps": ["Site Visits & Survey"]},
            {"name": "Preliminary Floor Plan Creation", "order": 4, "duration": 5, "work_type": "general", "deps": ["Site Visits & Survey"]},
            {"name": "Plan Review & Updates", "order": 5, "duration": 3, "work_type": "general", "deps": ["Preliminary Floor Plan Creation"]},
            {"name": "Final Plan Approval", "order": 6, "duration": 2, "work_type": "general", "deps": ["Plan Review & Updates"]},
            {"name": "Preliminary 3D Views (External)", "order": 7, "duration": 5, "work_type": "general", "deps": ["Final Plan Approval"]},
            {"name": "Preliminary 3D Views (Internal)", "order": 8, "duration": 5, "work_type": "general", "deps": ["Final Plan Approval"]},
            {"name": "Detailed 3D Views (External)", "order": 9, "duration": 4, "work_type": "general", "deps": ["Preliminary 3D Views (External)"]},
            {"name": "Detailed 3D Views (Internal)", "order": 10, "duration": 4, "work_type": "general", "deps": ["Preliminary 3D Views (Internal)"]},
            {"name": "Structural Design Initiation", "order": 11, "duration": 5, "work_type": "general", "deps": ["Final Plan Approval"]},
            {"name": "Column Positioning & Orientation", "order": 12, "duration": 3, "work_type": "general", "deps": ["Structural Design Initiation"]},
            {"name": "Finalization of Column Positions", "order": 13, "duration": 2, "work_type": "general", "deps": ["Column Positioning & Orientation"]},
        ]
    },
    {
        "name": "Construction Phase - Structure",
        "description": "Structural construction including foundation, columns, beams and slabs",
        "order": 2,
        "phase": "structure",
        "default_duration_days": 45,
        "is_floor_based": True,
        "color": "#F59E0B",
        "tasks": [
            {"name": "Centre Line Marking", "order": 1, "duration": 1, "work_type": "general", "labour": [{"skill": "helper", "count": 2}]},
            {"name": "Survey & Level Marking", "order": 2, "duration": 2, "work_type": "general", "deps": ["Centre Line Marking"], "labour": [{"skill": "surveyor", "count": 1}, {"skill": "helper", "count": 2}]},
            {"name": "Excavation", "order": 3, "duration": 5, "work_type": "earthwork", "measurement": "volume", "deps": ["Survey & Level Marking"], "labour": [{"skill": "helper", "count": 5}, {"skill": "operator", "count": 1}]},
            {"name": "PCC Work", "order": 4, "duration": 2, "work_type": "concrete_work", "measurement": "volume", "deps": ["Excavation"], "materials": [{"name": "Cement", "qty": 8, "unit": "bags/cum"}, {"name": "Sand", "qty": 0.42, "unit": "cum/cum"}, {"name": "Aggregate", "qty": 0.84, "unit": "cum/cum"}], "labour": [{"skill": "mason", "count": 3}, {"skill": "helper", "count": 4}]},
            {"name": "Anti-Termite Treatment", "order": 5, "duration": 1, "work_type": "general", "deps": ["PCC Work"], "labour": [{"skill": "helper", "count": 2}]},
            {"name": "Footing Reinforcement", "order": 6, "duration": 3, "work_type": "steel_fixing", "measurement": "weight", "deps": ["Anti-Termite Treatment"], "materials": [{"name": "Steel Bars", "qty": 1, "unit": "kg/kg"}, {"name": "Binding Wire", "qty": 0.02, "unit": "kg/kg"}], "labour": [{"skill": "steel_fixer", "count": 3}]},
            {"name": "Footing Formwork", "order": 7, "duration": 2, "work_type": "carpentry", "measurement": "area", "deps": ["Anti-Termite Treatment"], "labour": [{"skill": "carpenter", "count": 2}, {"skill": "helper", "count": 2}]},
            {"name": "Footing Concrete", "order": 8, "duration": 2, "work_type": "concrete_work", "measurement": "volume", "deps": ["Footing Reinforcement", "Footing Formwork"], "materials": [{"name": "RMC M25", "qty": 1, "unit": "cum/cum"}], "labour": [{"skill": "mason", "count": 4}, {"skill": "helper", "count": 6}]},
            {"name": "Column Reinforcement", "order": 9, "duration": 4, "work_type": "steel_fixing", "measurement": "weight", "deps": ["Footing Concrete"], "labour": [{"skill": "steel_fixer", "count": 3}]},
            {"name": "Column Formwork", "order": 10, "duration": 2, "work_type": "carpentry", "measurement": "area", "deps": ["Footing Concrete"], "labour": [{"skill": "carpenter", "count": 3}]},
            {"name": "Column Concrete", "order": 11, "duration": 2, "work_type": "concrete_work", "measurement": "volume", "deps": ["Column Reinforcement", "Column Formwork"], "materials": [{"name": "RMC M25", "qty": 1, "unit": "cum/cum"}], "labour": [{"skill": "mason", "count": 3}, {"skill": "helper", "count": 4}]},
            {"name": "Beam Reinforcement", "order": 12, "duration": 5, "work_type": "steel_fixing", "measurement": "weight", "deps": ["Column Concrete"], "labour": [{"skill": "steel_fixer", "count": 4}]},
            {"name": "Beam Formwork", "order": 13, "duration": 3, "work_type": "carpentry", "measurement": "area", "deps": ["Column Concrete"], "labour": [{"skill": "carpenter", "count": 4}]},
            {"name": "Slab Reinforcement", "order": 14, "duration": 4, "work_type": "steel_fixing", "measurement": "weight", "deps": ["Beam Reinforcement"], "labour": [{"skill": "steel_fixer", "count": 4}]},
            {"name": "Slab Formwork", "order": 15, "duration": 3, "work_type": "carpentry", "measurement": "area", "deps": ["Beam Formwork"], "labour": [{"skill": "carpenter", "count": 4}]},
            {"name": "Beam & Slab Concrete", "order": 16, "duration": 1, "work_type": "concrete_work", "measurement": "volume", "deps": ["Slab Reinforcement", "Slab Formwork"], "materials": [{"name": "RMC M25", "qty": 1, "unit": "cum/cum"}], "labour": [{"skill": "mason", "count": 6}, {"skill": "helper", "count": 10}]},
            {"name": "Curing", "order": 17, "duration": 7, "work_type": "general", "deps": ["Beam & Slab Concrete"], "labour": [{"skill": "helper", "count": 2}]},
            {"name": "Deshuttering", "order": 18, "duration": 2, "work_type": "carpentry", "deps": ["Curing"], "labour": [{"skill": "carpenter", "count": 3}]},
        ]
    },
    {
        "name": "Construction Phase - Finishing",
        "description": "Wall work, plastering and basic finishing",
        "order": 3,
        "phase": "finishing",
        "default_duration_days": 30,
        "is_floor_based": False,
        "color": "#10B981",
        "tasks": [
            {"name": "Brick/Block Work", "order": 1, "duration": 10, "work_type": "brickwork", "measurement": "area", "materials": [{"name": "Bricks", "qty": 55, "unit": "nos/sqm"}, {"name": "Cement", "qty": 0.5, "unit": "bags/sqm"}, {"name": "Sand", "qty": 0.04, "unit": "cum/sqm"}], "labour": [{"skill": "mason", "count": 4}, {"skill": "helper", "count": 4}]},
            {"name": "Electrical Conduit & Chasing", "order": 2, "duration": 5, "work_type": "electrical", "measurement": "length", "deps": ["Brick/Block Work"], "labour": [{"skill": "electrician", "count": 2}, {"skill": "helper", "count": 2}]},
            {"name": "Plumbing Lines (Internal)", "order": 3, "duration": 5, "work_type": "plumbing", "measurement": "length", "deps": ["Brick/Block Work"], "labour": [{"skill": "plumber", "count": 2}, {"skill": "helper", "count": 2}]},
            {"name": "Plumbing Lines (External)", "order": 4, "duration": 3, "work_type": "plumbing", "measurement": "length", "deps": ["Plumbing Lines (Internal)"], "labour": [{"skill": "plumber", "count": 2}]},
            {"name": "Internal Plastering", "order": 5, "duration": 8, "work_type": "plastering", "measurement": "area", "deps": ["Electrical Conduit & Chasing", "Plumbing Lines (Internal)"], "materials": [{"name": "Cement", "qty": 0.15, "unit": "bags/sqm"}, {"name": "Sand", "qty": 0.015, "unit": "cum/sqm"}], "labour": [{"skill": "mason", "count": 4}, {"skill": "helper", "count": 4}]},
            {"name": "External Plastering", "order": 6, "duration": 6, "work_type": "plastering", "measurement": "area", "deps": ["Internal Plastering"], "labour": [{"skill": "mason", "count": 3}, {"skill": "helper", "count": 3}]},
            {"name": "Elevation Detailing", "order": 7, "duration": 5, "work_type": "plastering", "measurement": "area", "deps": ["External Plastering"], "labour": [{"skill": "mason", "count": 2}, {"skill": "helper", "count": 2}]},
        ]
    },
    {
        "name": "Finishing Phase 1",
        "description": "Tiling, fixtures and installations",
        "order": 4,
        "phase": "finishing_2",
        "default_duration_days": 25,
        "is_floor_based": False,
        "color": "#8B5CF6",
        "tasks": [
            {"name": "Floor Tiling", "order": 1, "duration": 8, "work_type": "tiling", "measurement": "area", "materials": [{"name": "Floor Tiles", "qty": 1.05, "unit": "sqm/sqm"}, {"name": "Tile Adhesive", "qty": 4, "unit": "kg/sqm"}, {"name": "Grout", "qty": 0.5, "unit": "kg/sqm"}], "labour": [{"skill": "mason", "count": 3}, {"skill": "helper", "count": 3}]},
            {"name": "Wall Tiling (Bathrooms/Kitchen)", "order": 2, "duration": 5, "work_type": "tiling", "measurement": "area", "deps": ["Floor Tiling"], "labour": [{"skill": "mason", "count": 2}, {"skill": "helper", "count": 2}]},
            {"name": "Primer Application", "order": 3, "duration": 3, "work_type": "painting", "measurement": "area", "deps": ["Wall Tiling (Bathrooms/Kitchen)"], "materials": [{"name": "Primer", "qty": 0.1, "unit": "liters/sqm"}], "labour": [{"skill": "painter", "count": 2}]},
            {"name": "Window Grill Installation", "order": 4, "duration": 3, "work_type": "steel_fixing", "measurement": "count", "labour": [{"skill": "welder", "count": 2}]},
            {"name": "Window Installation", "order": 5, "duration": 4, "work_type": "carpentry", "measurement": "count", "deps": ["Window Grill Installation"], "labour": [{"skill": "carpenter", "count": 2}]},
            {"name": "Door Installation", "order": 6, "duration": 4, "work_type": "carpentry", "measurement": "count", "labour": [{"skill": "carpenter", "count": 2}]},
            {"name": "Sanitary Fixture Installation", "order": 7, "duration": 3, "work_type": "plumbing", "measurement": "count", "deps": ["Floor Tiling"], "labour": [{"skill": "plumber", "count": 2}]},
            {"name": "Electrical Fixture Installation", "order": 8, "duration": 3, "work_type": "electrical", "measurement": "count", "deps": ["Primer Application"], "labour": [{"skill": "electrician", "count": 2}]},
        ]
    },
    {
        "name": "Finishing Phase 2 - Handover",
        "description": "Final finishing, painting and handover",
        "order": 5,
        "phase": "handover",
        "default_duration_days": 15,
        "is_floor_based": False,
        "color": "#EF4444",
        "tasks": [
            {"name": "First Coat Painting", "order": 1, "duration": 4, "work_type": "painting", "measurement": "area", "materials": [{"name": "Paint", "qty": 0.15, "unit": "liters/sqm"}], "labour": [{"skill": "painter", "count": 3}]},
            {"name": "Second Coat Painting", "order": 2, "duration": 3, "work_type": "painting", "measurement": "area", "deps": ["First Coat Painting"], "materials": [{"name": "Paint", "qty": 0.1, "unit": "liters/sqm"}], "labour": [{"skill": "painter", "count": 3}]},
            {"name": "Interior Execution", "order": 3, "duration": 5, "work_type": "general", "deps": ["Second Coat Painting"], "labour": [{"skill": "carpenter", "count": 2}, {"skill": "helper", "count": 2}]},
            {"name": "Final Elevation Finishing", "order": 4, "duration": 3, "work_type": "painting", "measurement": "area", "deps": ["Second Coat Painting"], "labour": [{"skill": "painter", "count": 2}]},
            {"name": "Deep Cleaning", "order": 5, "duration": 2, "work_type": "general", "deps": ["Interior Execution", "Final Elevation Finishing"], "labour": [{"skill": "helper", "count": 4}]},
            {"name": "Final Inspection", "order": 6, "duration": 1, "work_type": "general", "deps": ["Deep Cleaning"]},
            {"name": "Defect Rectification", "order": 7, "duration": 2, "work_type": "general", "deps": ["Final Inspection"]},
            {"name": "Handover Documentation", "order": 8, "duration": 1, "work_type": "general", "deps": ["Defect Rectification"]},
        ]
    }
]

LABOUR_RATES = {
    "mason": {"daily_rate": 800, "description": "Skilled mason for brickwork, plastering, tiling"},
    "carpenter": {"daily_rate": 750, "description": "Skilled carpenter for formwork and woodwork"},
    "electrician": {"daily_rate": 700, "description": "Electrical wiring and fixture installation"},
    "plumber": {"daily_rate": 700, "description": "Plumbing installation and fixture work"},
    "steel_fixer": {"daily_rate": 750, "description": "Reinforcement bar fixing and tying"},
    "painter": {"daily_rate": 650, "description": "Interior and exterior painting"},
    "welder": {"daily_rate": 800, "description": "Metal welding and fabrication"},
    "helper": {"daily_rate": 500, "description": "General helper for all trades"},
    "operator": {"daily_rate": 1200, "description": "Heavy equipment operator (JCB, Crane)"},
    "surveyor": {"daily_rate": 1000, "description": "Land surveying and level marking"},
    "supervisor": {"daily_rate": 1000, "description": "Site supervisor"}
}


@api_router.get("/templates/milestones")
async def get_milestone_templates(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all milestone templates with their tasks"""
    await get_current_user(credentials)
    return MILESTONE_TEMPLATES


@api_router.get("/templates/labour-rates")
async def get_labour_rate_templates(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get standard labour rates"""
    await get_current_user(credentials)
    return LABOUR_RATES


@api_router.post("/projects/create-with-templates")
async def create_project_with_templates(
    project_data: dict,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Create a new project with auto-populated milestones and tasks.
    
    Input:
    - name: Project name
    - client_name: Client name
    - number_of_floors: Number of floors (default: 1)
    - planned_start_date: ISO date string
    - total_built_area: Total built area in sqft (optional)
    - building_type: residential/commercial/industrial (default: residential)
    - project_manager_id: Optional PM ID
    """
    current_user = await get_current_user(credentials)
    
    # Parse input data
    name = project_data.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="Project name is required")
    
    client_name = project_data.get("client_name", "")
    client_contact = project_data.get("client_contact", "")
    client_email = project_data.get("client_email", "")
    number_of_floors = project_data.get("number_of_floors", 1)
    planned_start_date_str = project_data.get("planned_start_date")
    total_built_area = project_data.get("total_built_area", 0)
    building_type = project_data.get("building_type", "residential")
    project_manager_id = project_data.get("project_manager_id")
    description = project_data.get("description", "")
    location = project_data.get("location", "")
    
    if not planned_start_date_str:
        planned_start_date = datetime.utcnow()
    else:
        planned_start_date = datetime.fromisoformat(planned_start_date_str.replace("Z", "+00:00"))
    
    # Generate project code
    project_code = await generate_project_code()
    
    # Calculate estimated end date based on milestones
    total_days = sum(m["default_duration_days"] for m in MILESTONE_TEMPLATES)
    # Add extra days for floor-based milestones
    floor_based_days = sum(m["default_duration_days"] * (number_of_floors - 1) 
                          for m in MILESTONE_TEMPLATES if m["is_floor_based"])
    total_days += floor_based_days
    planned_end_date = planned_start_date + timedelta(days=total_days)
    
    # Create the project
    project_doc = {
        "name": name,
        "code": project_code,
        "project_code": project_code,  # Store in both fields for compatibility
        "description": description,
        "client_name": client_name,
        "client_contact": client_contact,
        "client_email": client_email,
        "location": location,
        "status": "planning",
        "planned_start_date": planned_start_date,
        "planned_end_date": planned_end_date,
        "number_of_floors": number_of_floors,
        "building_type": building_type,
        "total_built_area": total_built_area,
        "project_manager_id": project_manager_id,
        "team_member_ids": [],
        "total_planned_cost": 0,
        "total_actual_cost": 0,
        "material_planned_cost": 0,
        "material_actual_cost": 0,
        "labour_planned_cost": 0,
        "labour_actual_cost": 0,
        "created_by": str(current_user["_id"]),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.projects.insert_one(project_doc)
    project_id = str(result.inserted_id)
    
    # Create milestones and tasks
    current_date = planned_start_date
    created_milestones = []
    created_tasks = []
    task_name_to_id = {}  # For resolving dependencies
    
    for ms_template in MILESTONE_TEMPLATES:
        # Determine how many times to create this milestone (once or per floor)
        floor_iterations = number_of_floors if ms_template["is_floor_based"] else 1
        
        for floor_num in range(floor_iterations):
            floor_label = f" - Floor {floor_num + 1}" if ms_template["is_floor_based"] else ""
            
            milestone_start = current_date
            milestone_end = milestone_start + timedelta(days=ms_template["default_duration_days"])
            
            milestone_doc = {
                "project_id": project_id,
                "name": f"{ms_template['name']}{floor_label}",
                "description": ms_template["description"],
                "order": ms_template["order"] + (floor_num * 10 if ms_template["is_floor_based"] else 0),
                "phase": ms_template["phase"],
                "floor_number": floor_num + 1 if ms_template["is_floor_based"] else None,
                "due_date": milestone_end,
                "start_date": milestone_start,
                "status": "pending",
                "completion_percentage": 0,
                "planned_start_date": milestone_start,
                "planned_end_date": milestone_end,
                "color": ms_template["color"],
                "estimated_cost": 0,
                "actual_cost": 0,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            ms_result = await db.milestones.insert_one(milestone_doc)
            milestone_id = str(ms_result.inserted_id)
            milestone_doc["id"] = milestone_id
            created_milestones.append(milestone_doc)
            
            # Create tasks for this milestone
            task_start = milestone_start
            for task_template in ms_template.get("tasks", []):
                task_name_key = f"{ms_template['name']}{floor_label}:{task_template['name']}"
                task_duration = task_template.get("duration", 1)
                task_end = task_start + timedelta(days=task_duration)
                
                # Resolve dependencies
                dep_ids = []
                for dep_name in task_template.get("deps", []):
                    dep_key = f"{ms_template['name']}{floor_label}:{dep_name}"
                    if dep_key in task_name_to_id:
                        dep_ids.append(task_name_to_id[dep_key])
                
                # Calculate labour cost estimate
                labour_cost = 0
                labour_estimates = []
                for labour in task_template.get("labour", []):
                    skill = labour.get("skill", "helper")
                    count = labour.get("count", 1)
                    daily_rate = LABOUR_RATES.get(skill, {}).get("daily_rate", 500)
                    cost = daily_rate * count * task_duration
                    labour_cost += cost
                    labour_estimates.append({
                        "skill_type": skill,
                        "planned_workers": count,
                        "planned_hours": count * 8 * task_duration,
                        "planned_cost": cost
                    })
                
                task_doc = {
                    "project_id": project_id,
                    "milestone_id": milestone_id,
                    "title": task_template["name"],
                    "description": "",
                    "order": task_template["order"],
                    "status": "pending",
                    "priority": "medium",
                    "work_type": task_template.get("work_type", "general"),
                    "measurement_type": task_template.get("measurement"),
                    "floor_number": floor_num + 1 if ms_template["is_floor_based"] else None,
                    "planned_start_date": task_start,
                    "planned_end_date": task_end,
                    "due_date": task_end,
                    "progress_percentage": 0,
                    "dependencies": dep_ids,
                    "assigned_to": [],
                    "estimated_cost": labour_cost,
                    "actual_cost": 0,
                    "created_by": str(current_user["_id"]),
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                
                task_result = await db.tasks.insert_one(task_doc)
                task_id = str(task_result.inserted_id)
                task_doc["id"] = task_id
                task_name_to_id[task_name_key] = task_id
                created_tasks.append(task_doc)
                
                # Create labour estimates
                for labour_est in labour_estimates:
                    labour_est["task_id"] = task_id
                    labour_est["project_id"] = project_id
                    labour_est["actual_workers"] = 0
                    labour_est["actual_hours"] = 0
                    labour_est["actual_cost"] = 0
                    labour_est["hourly_rate"] = LABOUR_RATES.get(labour_est["skill_type"], {}).get("daily_rate", 500) / 8
                    labour_est["created_at"] = datetime.utcnow()
                    await db.task_labour_estimates.insert_one(labour_est)
                
                # Move to next task (simplified - in reality would use dependencies)
                task_start = task_end
            
            # Update current_date for next milestone
            current_date = milestone_end
    
    # Calculate total planned costs
    total_labour_cost = sum(t.get("estimated_cost", 0) for t in created_tasks)
    await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": {
            "labour_planned_cost": total_labour_cost,
            "total_planned_cost": total_labour_cost
        }}
    )
    
    return {
        "project_id": project_id,
        "project_code": project_code,
        "milestones_created": len(created_milestones),
        "tasks_created": len(created_tasks),
        "total_planned_cost": total_labour_cost,
        "planned_start_date": planned_start_date.isoformat(),
        "planned_end_date": planned_end_date.isoformat(),
        "message": f"Project created with {len(created_milestones)} milestones and {len(created_tasks)} tasks"
    }


@api_router.get("/projects/{project_id}/budget-summary")
async def get_project_budget_summary(
    project_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get comprehensive budget summary with planned vs actual costs"""
    await get_current_user(credentials)
    
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get all milestones
    milestones = await db.milestones.find({"project_id": project_id}).to_list(100)
    
    # Get all tasks with their estimates
    tasks = await db.tasks.find({"project_id": project_id}).to_list(1000)
    
    # Get all labour estimates
    labour_estimates = await db.task_labour_estimates.find({"project_id": project_id}).to_list(1000)
    
    # Get all material estimates
    material_estimates = await db.task_material_estimates.find({"project_id": project_id}).to_list(1000)
    
    # Calculate totals
    total_labour_planned = sum(e.get("planned_cost", 0) for e in labour_estimates)
    total_labour_actual = sum(e.get("actual_cost", 0) for e in labour_estimates)
    total_material_planned = sum(e.get("planned_cost", 0) for e in material_estimates)
    total_material_actual = sum(e.get("actual_cost", 0) for e in material_estimates)
    
    # Build milestone breakdown
    milestone_breakdown = []
    for ms in milestones:
        ms_id = str(ms["_id"])
        ms_tasks = [t for t in tasks if t.get("milestone_id") == ms_id]
        ms_task_ids = [str(t["_id"]) for t in ms_tasks]
        
        ms_labour_planned = sum(e.get("planned_cost", 0) for e in labour_estimates if e.get("task_id") in ms_task_ids)
        ms_labour_actual = sum(e.get("actual_cost", 0) for e in labour_estimates if e.get("task_id") in ms_task_ids)
        ms_material_planned = sum(e.get("planned_cost", 0) for e in material_estimates if e.get("task_id") in ms_task_ids)
        ms_material_actual = sum(e.get("actual_cost", 0) for e in material_estimates if e.get("task_id") in ms_task_ids)
        
        ms_total_planned = ms_labour_planned + ms_material_planned
        ms_total_actual = ms_labour_actual + ms_material_actual
        
        milestone_breakdown.append({
            "milestone_id": ms_id,
            "milestone_name": ms.get("name"),
            "phase": ms.get("phase"),
            "status": ms.get("status"),
            "completion_percentage": ms.get("completion_percentage", 0),
            "task_count": len(ms_tasks),
            "completed_tasks": len([t for t in ms_tasks if t.get("status") == "completed"]),
            "labour_planned": ms_labour_planned,
            "labour_actual": ms_labour_actual,
            "material_planned": ms_material_planned,
            "material_actual": ms_material_actual,
            "total_planned": ms_total_planned,
            "total_actual": ms_total_actual,
            "variance": ms_total_planned - ms_total_actual,
            "variance_percentage": ((ms_total_planned - ms_total_actual) / ms_total_planned * 100) if ms_total_planned > 0 else 0
        })
    
    total_planned = total_labour_planned + total_material_planned
    total_actual = total_labour_actual + total_material_actual
    
    return {
        "project_id": project_id,
        "project_name": project.get("name"),
        "labour": {
            "planned": total_labour_planned,
            "actual": total_labour_actual,
            "variance": total_labour_planned - total_labour_actual,
            "variance_percentage": ((total_labour_planned - total_labour_actual) / total_labour_planned * 100) if total_labour_planned > 0 else 0
        },
        "material": {
            "planned": total_material_planned,
            "actual": total_material_actual,
            "variance": total_material_planned - total_material_actual,
            "variance_percentage": ((total_material_planned - total_material_actual) / total_material_planned * 100) if total_material_planned > 0 else 0
        },
        "total": {
            "planned": total_planned,
            "actual": total_actual,
            "variance": total_planned - total_actual,
            "variance_percentage": ((total_planned - total_actual) / total_planned * 100) if total_planned > 0 else 0
        },
        "milestones": milestone_breakdown
    }


@api_router.get("/projects/{project_id}/deviation-report")
async def get_project_deviation_report(
    project_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get deviation report showing schedule and cost variances"""
    await get_current_user(credentials)
    
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    tasks = await db.tasks.find({"project_id": project_id}).to_list(1000)
    milestones = await db.milestones.find({"project_id": project_id}).to_list(100)
    
    schedule_deviations = []
    cost_deviations = []
    
    for task in tasks:
        task_id = str(task["_id"])
        
        # Schedule deviation
        planned_end = task.get("planned_end_date")
        actual_end = task.get("actual_end_date")
        if planned_end and actual_end:
            variance_days = (actual_end - planned_end).days
            if variance_days > 0:
                severity = "high" if variance_days > 7 else ("medium" if variance_days > 3 else "low")
                # Get milestone name
                ms = next((m for m in milestones if str(m["_id"]) == task.get("milestone_id")), None)
                schedule_deviations.append({
                    "type": "schedule",
                    "severity": severity,
                    "entity_type": "task",
                    "entity_id": task_id,
                    "entity_name": task.get("title"),
                    "milestone_name": ms.get("name") if ms else None,
                    "planned_value": planned_end.isoformat() if planned_end else None,
                    "actual_value": actual_end.isoformat() if actual_end else None,
                    "variance": variance_days,
                    "variance_percentage": 0,
                    "reason": task.get("delay_reason")
                })
        
        # Cost deviation
        estimated_cost = task.get("estimated_cost", 0)
        actual_cost = task.get("actual_cost", 0)
        if estimated_cost > 0 and actual_cost > 0:
            variance = estimated_cost - actual_cost
            variance_pct = (variance / estimated_cost * 100) if estimated_cost > 0 else 0
            if abs(variance_pct) > 10:
                severity = "high" if abs(variance_pct) > 20 else "medium"
                ms = next((m for m in milestones if str(m["_id"]) == task.get("milestone_id")), None)
                cost_deviations.append({
                    "type": "cost",
                    "severity": severity,
                    "entity_type": "task",
                    "entity_id": task_id,
                    "entity_name": task.get("title"),
                    "milestone_name": ms.get("name") if ms else None,
                    "planned_value": estimated_cost,
                    "actual_value": actual_cost,
                    "variance": variance,
                    "variance_percentage": round(variance_pct, 2),
                    "reason": None
                })
    
    # Count by severity
    all_deviations = schedule_deviations + cost_deviations
    high_count = len([d for d in all_deviations if d["severity"] == "high"])
    medium_count = len([d for d in all_deviations if d["severity"] == "medium"])
    low_count = len([d for d in all_deviations if d["severity"] == "low"])
    
    return {
        "project_id": project_id,
        "project_name": project.get("name"),
        "total_deviations": len(all_deviations),
        "high_severity_count": high_count,
        "medium_severity_count": medium_count,
        "low_severity_count": low_count,
        "schedule_deviations": sorted(schedule_deviations, key=lambda x: x["variance"], reverse=True),
        "cost_deviations": sorted(cost_deviations, key=lambda x: abs(x["variance"]), reverse=True)
    }


@api_router.get("/tasks/{task_id}/labour-estimates")
async def get_task_labour_estimates(
    task_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get labour estimates for a task"""
    await get_current_user(credentials)
    
    estimates = await db.task_labour_estimates.find({"task_id": task_id}).to_list(100)
    result = []
    for est in estimates:
        est["id"] = str(est.pop("_id"))
        est["hours_variance"] = est.get("planned_hours", 0) - est.get("actual_hours", 0)
        est["cost_variance"] = est.get("planned_cost", 0) - est.get("actual_cost", 0)
        result.append(est)
    return result


@api_router.put("/tasks/{task_id}/labour-estimates/{estimate_id}")
async def update_task_labour_estimate(
    task_id: str,
    estimate_id: str,
    update_data: dict,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update actual values for a labour estimate"""
    await get_current_user(credentials)
    
    update_fields = {}
    if "actual_workers" in update_data:
        update_fields["actual_workers"] = update_data["actual_workers"]
    if "actual_hours" in update_data:
        update_fields["actual_hours"] = update_data["actual_hours"]
    if "actual_cost" in update_data:
        update_fields["actual_cost"] = update_data["actual_cost"]
    if "notes" in update_data:
        update_fields["notes"] = update_data["notes"]
    
    update_fields["updated_at"] = datetime.utcnow()
    
    await db.task_labour_estimates.update_one(
        {"_id": ObjectId(estimate_id), "task_id": task_id},
        {"$set": update_fields}
    )
    
    # Update task actual cost
    estimates = await db.task_labour_estimates.find({"task_id": task_id}).to_list(100)
    total_actual = sum(e.get("actual_cost", 0) for e in estimates)
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": {"actual_cost": total_actual, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Labour estimate updated", "task_actual_cost": total_actual}


# Include the routers in the main app (after all routes are defined)
app.include_router(api_router)

