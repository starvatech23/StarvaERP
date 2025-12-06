from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# Enums for various statuses
class UserRole(str, Enum):
    ADMIN = "admin"
    PROJECT_MANAGER = "project_manager"
    ENGINEER = "engineer"
    WORKER = "worker"
    VENDOR = "vendor"

class ProjectStatus(str, Enum):
    PLANNING = "planning"
    IN_PROGRESS = "in_progress"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

# Removed old CRM LeadStatus enum - will be rebuilt

# Construction Work Type Enum
class ConstructionWorkType(str, Enum):
    EARTHWORK = "earthwork"  # Volume based (LxBxH)
    CONCRETE_WORK = "concrete_work"  # Volume based
    BRICKWORK = "brickwork"  # Area based (wall area)
    BLOCKWORK = "blockwork"  # Area based
    PLASTERING = "plastering"  # Area based
    FLOORING = "flooring"  # Area based
    TILING = "tiling"  # Area based
    PAINTING = "painting"  # Area based
    ELECTRICAL = "electrical"  # Linear or count based
    PLUMBING = "plumbing"  # Linear or count based
    CARPENTRY = "carpentry"  # Area or count based
    STEEL_FIXING = "steel_fixing"  # Weight based
    ROOFING = "roofing"  # Area based
    WATERPROOFING = "waterproofing"  # Area based
    GENERAL = "general"  # No specific calculation

# Work Measurement Type
class MeasurementType(str, Enum):
    AREA = "area"  # Square feet
    VOLUME = "volume"  # Cubic feet (L×B×H)
    LENGTH = "length"  # Linear feet
    COUNT = "count"  # Number of items
    WEIGHT = "weight"  # Kilograms

# Approval Status
class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

# Module Names for Permissions
class ModuleName(str, Enum):
    PROJECTS = "projects"
    TASKS = "tasks"
    LABOR = "labor"
    MATERIALS = "materials"
    VENDORS = "vendors"
    REPORTS = "reports"
    USERS = "users"

# ============= Role Models =============
class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True

class RoleCreate(RoleBase):
    pass

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class RoleResponse(RoleBase):
    id: str
    created_at: datetime
    updated_at: datetime

# ============= Permission Models =============
class PermissionBase(BaseModel):
    role_id: str
    module: ModuleName
    can_view: bool = False
    can_create: bool = False
    can_edit: bool = False
    can_delete: bool = False

class PermissionCreate(PermissionBase):
    pass

class PermissionUpdate(BaseModel):
    can_view: Optional[bool] = None
    can_create: Optional[bool] = None
    can_edit: Optional[bool] = None
    can_delete: Optional[bool] = None

class PermissionResponse(PermissionBase):
    id: str
    created_at: datetime
    updated_at: datetime

# ============= System Settings Models =============
class SystemSettingBase(BaseModel):
    setting_key: str
    setting_value: str
    description: Optional[str] = None

class SystemSettingCreate(SystemSettingBase):
    pass

class SystemSettingUpdate(BaseModel):
    setting_value: Optional[str] = None
    description: Optional[str] = None

class SystemSettingResponse(SystemSettingBase):
    id: str
    updated_at: datetime

# ============= Team/Department Models =============
class TeamBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True

class TeamCreate(TeamBase):
    pass

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class TeamResponse(TeamBase):
    id: str
    created_at: datetime
    updated_at: datetime
    member_count: int = 0  # Number of users in this team

# User Models
class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    full_name: str
    role: Optional[UserRole] = None  # Keep for backward compatibility
    role_id: Optional[str] = None  # New: dynamic role reference
    team_id: Optional[str] = None  # Team/Department reference
    address: Optional[str] = None
    profile_photo: Optional[str] = None  # base64

class UserCreate(UserBase):
    password: Optional[str] = None  # For email auth
    auth_type: str  # 'email' or 'phone'

class UserCreateByAdmin(BaseModel):
    email: EmailStr
    phone: str
    full_name: str
    role_id: str
    team_id: str
    address: Optional[str] = None
    password: Optional[str] = None  # Optional - can be set later

class UserLogin(BaseModel):
    identifier: str  # email or phone
    password: Optional[str] = None  # For email login
    auth_type: str  # 'email' or 'phone'

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    role_id: Optional[str] = None
    team_id: Optional[str] = None
    address: Optional[str] = None
    profile_photo: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: str
    is_active: bool
    approval_status: ApprovalStatus = ApprovalStatus.PENDING
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    role_name: Optional[str] = None  # Populated from role_id
    team_name: Optional[str] = None  # Populated from team_id
    date_joined: datetime
    last_login: Optional[datetime] = None

class UserApprovalRequest(BaseModel):
    user_id: str
    action: str  # 'approve' or 'reject'
    role_id: Optional[str] = None  # Assign role during approval

class OTPRequest(BaseModel):
    phone: str

class OTPVerify(BaseModel):
    phone: str
    otp: str
    full_name: Optional[str] = None
    role: Optional[UserRole] = None

# Token Models
class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# ============= Contact Hierarchy Models =============
class ContactType(str, Enum):
    INTERNAL = "internal"  # Existing user account
    EXTERNAL = "external"  # External contact

class ContactMethod(str, Enum):
    PHONE = "phone"
    EMAIL = "email"
    SMS = "sms"
    WHATSAPP = "whatsapp"

class ProjectRole(str, Enum):
    ARCHITECT = "architect"
    PROJECT_ENGINEER = "project_engineer"
    PROJECT_MANAGER = "project_manager"
    PROJECT_HEAD = "project_head"
    OPERATIONS_EXECUTIVE = "operations_executive"
    OPERATIONS_MANAGER = "operations_manager"
    OPERATIONS_HEAD = "operations_head"

class ProjectContact(BaseModel):
    role: ProjectRole
    type: ContactType
    user_id: Optional[str] = None  # If internal user
    name: str
    phone_mobile: str
    phone_alternate: Optional[str] = None
    email: EmailStr
    office_phone: Optional[str] = None
    preferred_contact_method: ContactMethod = ContactMethod.PHONE
    working_hours: Optional[str] = None  # e.g., "9 AM - 6 PM IST"
    timezone: Optional[str] = None  # e.g., "Asia/Kolkata"
    notes: Optional[str] = None
    is_primary: bool = False  # For roles with multiple contacts
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

class ProjectContactUpdate(BaseModel):
    role: Optional[ProjectRole] = None
    type: Optional[ContactType] = None
    user_id: Optional[str] = None
    name: Optional[str] = None
    phone_mobile: Optional[str] = None
    phone_alternate: Optional[str] = None
    email: Optional[EmailStr] = None
    office_phone: Optional[str] = None
    preferred_contact_method: Optional[ContactMethod] = None
    working_hours: Optional[str] = None
    timezone: Optional[str] = None
    notes: Optional[str] = None
    is_primary: Optional[bool] = None

# ============= Gantt Share Models =============
class GanttSharePermission(str, Enum):
    VIEW_ONLY = "view_only"
    DOWNLOADABLE = "downloadable"
    EMBEDDABLE = "embeddable"

class GanttShareToken(BaseModel):
    token: str
    permissions: List[GanttSharePermission] = [GanttSharePermission.VIEW_ONLY]
    show_contacts: bool = False
    password: Optional[str] = None  # Hashed password
    expires_at: Optional[datetime] = None
    created_at: datetime
    created_by: str
    views_count: int = 0
    downloads_count: int = 0
    last_viewed_at: Optional[datetime] = None
    is_active: bool = True

class GanttShareCreate(BaseModel):
    permissions: List[GanttSharePermission] = [GanttSharePermission.VIEW_ONLY]
    show_contacts: bool = False
    password: Optional[str] = None
    expires_at: Optional[datetime] = None

class GanttShareResponse(BaseModel):
    token: str
    share_url: str
    permissions: List[GanttSharePermission]
    show_contacts: bool
    has_password: bool
    expires_at: Optional[datetime] = None
    created_at: datetime
    views_count: int
    downloads_count: int
    last_viewed_at: Optional[datetime] = None
    is_active: bool

# ============= Contact Audit Models =============
class ContactAudit(BaseModel):
    project_id: str
    contact_snapshot: ProjectContact
    action: str  # "created", "updated", "deleted"
    changed_by: str
    changed_at: datetime
    changes: Optional[Dict[str, Any]] = None  # What fields changed

# Project Models
class ProjectBase(BaseModel):
    name: str
    location: str
    address: str
    client_name: str
    client_contact: Optional[str] = None
    status: ProjectStatus = ProjectStatus.PLANNING
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[float] = None
    description: Optional[str] = None
    photos: List[str] = []  # base64 images

class ProjectCreate(ProjectBase):
    project_manager_id: Optional[str] = None
    team_member_ids: List[str] = []  # List of user IDs in the project team
    contacts: List[ProjectContact] = []  # Contact hierarchy

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    address: Optional[str] = None
    client_name: Optional[str] = None
    client_contact: Optional[str] = None
    status: Optional[ProjectStatus] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[float] = None
    description: Optional[str] = None
    project_manager_id: Optional[str] = None
    team_member_ids: Optional[List[str]] = None
    photos: Optional[List[str]] = None
    contacts: Optional[List[ProjectContact]] = None

class ProjectTeamMember(BaseModel):
    user_id: str
    full_name: str
    role_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class ProjectResponse(ProjectBase):
    id: str
    project_manager_id: Optional[str] = None
    project_manager_name: Optional[str] = None
    manager_phone: Optional[str] = None
    team_member_ids: List[str] = []
    team_members: List[ProjectTeamMember] = []  # Populated team member details
    task_count: Optional[Dict[str, int]] = None
    contacts: List[ProjectContact] = []  # Contact hierarchy
    gantt_share_tokens: List[GanttShareToken] = []  # Active share links
    created_at: datetime
    updated_at: datetime

class ProjectTeamUpdate(BaseModel):
    team_member_ids: List[str]

# Task Models
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    project_id: str
    status: TaskStatus = TaskStatus.PENDING
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: Optional[datetime] = None
    assigned_to: List[str] = []  # User IDs
    attachments: List[str] = []  # base64 or URLs
    parent_task_id: Optional[str] = None  # For subtasks
    # Construction-specific fields
    work_type: Optional[ConstructionWorkType] = None
    measurement_type: Optional[MeasurementType] = None
    # Gantt chart fields
    planned_start_date: Optional[datetime] = None
    planned_end_date: Optional[datetime] = None
    actual_start_date: Optional[datetime] = None
    actual_end_date: Optional[datetime] = None
    progress_percentage: float = 0  # 0-100
    # Work measurement
    work_area: Optional[float] = None  # Square feet
    work_length: Optional[float] = None  # Feet
    work_breadth: Optional[float] = None  # Feet
    work_height: Optional[float] = None  # Feet
    work_count: Optional[int] = None  # Number of items
    dependencies: List[str] = []  # Task IDs that must complete before this one

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[datetime] = None
    assigned_to: Optional[List[str]] = None
    attachments: Optional[List[str]] = None

class TaskResponse(TaskBase):
    id: str
    created_by: str
    created_by_name: Optional[str] = None
    assigned_users: List[Dict[str, str]] = []  # [{"id": "", "name": ""}]
    subtasks: List[Dict[str, Any]] = []  # Subtasks
    created_at: datetime
    updated_at: datetime

# Material Models
# Note: Material and Vendor models moved to end of file for comprehensive implementation

# Attendance Models
class AttendanceBase(BaseModel):
    user_id: str
    project_id: str
    date: datetime
    check_in_time: datetime
    check_out_time: Optional[datetime] = None
    photo: Optional[str] = None  # base64
    location: Optional[str] = None
    notes: Optional[str] = None

class AttendanceCreate(BaseModel):
    project_id: str
    check_in_time: datetime
    photo: Optional[str] = None
    location: Optional[str] = None

class AttendanceCheckout(BaseModel):
    check_out_time: datetime

class AttendanceResponse(AttendanceBase):
    id: str
    user_name: str
    project_name: str

# Work Schedule Models
class WorkScheduleBase(BaseModel):
    project_id: str
    task_id: Optional[str] = None
    assigned_to: List[str] = []  # User IDs
    scheduled_date: datetime
    shift_time: Optional[str] = None
    notes: Optional[str] = None

class WorkScheduleCreate(WorkScheduleBase):
    pass

class WorkScheduleUpdate(BaseModel):
    task_id: Optional[str] = None
    assigned_to: Optional[List[str]] = None
    scheduled_date: Optional[datetime] = None
    shift_time: Optional[str] = None
    notes: Optional[str] = None

class WorkScheduleResponse(WorkScheduleBase):
    id: str
    project_name: str
    task_title: Optional[str] = None
    assigned_users: List[Dict[str, str]] = []
    created_by: str
    created_at: datetime

# Removed old CRM models - will be rebuilt

# User Profile Update
class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    profile_photo: Optional[str] = None

# Payment & Financial Models
class PaymentStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    PARTIAL = "partial"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

class PaymentType(str, Enum):
    CLIENT_PAYMENT = "client_payment"
    VENDOR_PAYMENT = "vendor_payment"
    EXPENSE = "expense"
    SALARY = "salary"
    OTHER = "other"

class PaymentBase(BaseModel):
    project_id: str
    payment_type: PaymentType
    amount: float
    payment_date: datetime
    status: PaymentStatus = PaymentStatus.PENDING
    description: Optional[str] = None
    invoice_number: Optional[str] = None
    payment_method: Optional[str] = None  # cash, bank_transfer, cheque, etc.
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentUpdate(BaseModel):
    amount: Optional[float] = None
    payment_date: Optional[datetime] = None
    status: Optional[PaymentStatus] = None
    description: Optional[str] = None
    payment_method: Optional[str] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class PaymentResponse(PaymentBase):
    id: str
    project_name: str
    created_by: str
    created_by_name: Optional[str] = None
    created_at: datetime

# Expense Models
class ExpenseCategory(str, Enum):
    MATERIALS = "materials"
    LABOR = "labor"
    EQUIPMENT = "equipment"
    TRANSPORTATION = "transportation"
    PERMITS = "permits"
    UTILITIES = "utilities"
    SUBCONTRACTOR = "subcontractor"
    OTHER = "other"

class ExpenseBase(BaseModel):
    project_id: str
    category: ExpenseCategory
    amount: float
    expense_date: datetime
    vendor_id: Optional[str] = None
    description: str
    receipt_photo: Optional[str] = None  # base64
    is_approved: bool = False

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    category: Optional[ExpenseCategory] = None
    amount: Optional[float] = None
    expense_date: Optional[datetime] = None
    vendor_id: Optional[str] = None
    description: Optional[str] = None
    receipt_photo: Optional[str] = None
    is_approved: Optional[bool] = None

class ExpenseResponse(ExpenseBase):
    id: str
    project_name: str
    vendor_name: Optional[str] = None
    created_by: str
    created_by_name: Optional[str] = None
    created_at: datetime

# Notification Models
class NotificationType(str, Enum):
    TASK_ASSIGNED = "task_assigned"
    TASK_COMPLETED = "task_completed"
    PROJECT_UPDATE = "project_update"
    LEAD_STATUS_CHANGE = "lead_status_change"
    PAYMENT_DUE = "payment_due"
    LOW_STOCK = "low_stock"
    ATTENDANCE_ALERT = "attendance_alert"
    GENERAL = "general"

class NotificationBase(BaseModel):
    user_id: str
    notification_type: NotificationType
    title: str
    message: str
    reference_id: Optional[str] = None  # ID of related entity
    reference_type: Optional[str] = None  # project, task, lead, etc.
    is_read: bool = False

class NotificationCreate(NotificationBase):
    pass

class NotificationResponse(NotificationBase):
    id: str
    created_at: datetime

# Removed Activity Log Models - will be rebuilt if needed

# User Management Models
class UserRoleUpdate(BaseModel):
    role: UserRole

class UserStatusUpdate(BaseModel):
    is_active: bool

class UserManagementResponse(BaseModel):
    id: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    full_name: str
    role: UserRole
    is_active: bool
    date_joined: datetime
    last_login: Optional[datetime] = None
    total_projects: int = 0
    total_tasks: int = 0

# Labor/Worker Management Models
class SkillGroup(str, Enum):
    MASON = "mason"
    CARPENTER = "carpenter"
    ELECTRICIAN = "electrician"
    PLUMBER = "plumber"
    PAINTER = "painter"
    WELDER = "welder"
    HELPER = "helper"
    MACHINE_OPERATOR = "machine_operator"
    SUPERVISOR = "supervisor"
    OTHER = "other"

class PayScale(str, Enum):
    DAILY = "daily"
    HOURLY = "hourly"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    CONTRACT = "contract"

class WorkerStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ON_LEAVE = "on_leave"
    TERMINATED = "terminated"

class WorkerBase(BaseModel):
    full_name: str
    phone: str
    email: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    
    # Skill and Pay
    skill_group: SkillGroup
    pay_scale: PayScale
    base_rate: float  # Rate per day/hour/week/month
    
    # Documents
    aadhaar_number: Optional[str] = None
    aadhaar_photo: Optional[str] = None  # base64
    pan_number: Optional[str] = None
    pan_photo: Optional[str] = None  # base64
    photo: Optional[str] = None  # Worker photo
    
    # Bank Details
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    account_holder_name: Optional[str] = None
    
    # Status
    status: WorkerStatus = WorkerStatus.ACTIVE
    current_site_id: Optional[str] = None
    notes: Optional[str] = None

class WorkerCreate(WorkerBase):
    pass

class WorkerUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    skill_group: Optional[SkillGroup] = None
    pay_scale: Optional[PayScale] = None
    base_rate: Optional[float] = None
    aadhaar_number: Optional[str] = None
    aadhaar_photo: Optional[str] = None
    pan_number: Optional[str] = None
    pan_photo: Optional[str] = None
    photo: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    account_holder_name: Optional[str] = None
    status: Optional[WorkerStatus] = None
    current_site_id: Optional[str] = None
    notes: Optional[str] = None

class WorkerResponse(WorkerBase):
    id: str
    current_site_name: Optional[str] = None
    created_by: str
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

# Labor Attendance Models
class AttendanceStatus(str, Enum):
    PRESENT = "present"
    ABSENT = "absent"
    HALF_DAY = "half_day"
    ON_LEAVE = "on_leave"

class LaborAttendanceBase(BaseModel):
    worker_id: str
    project_id: str
    attendance_date: datetime
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    status: AttendanceStatus = AttendanceStatus.PRESENT
    hours_worked: Optional[float] = None
    overtime_hours: Optional[float] = None
    wages_earned: Optional[float] = None
    check_in_photo: Optional[str] = None  # base64
    check_out_photo: Optional[str] = None  # base64
    notes: Optional[str] = None

class LaborAttendanceCreate(LaborAttendanceBase):
    pass

class LaborAttendanceUpdate(BaseModel):
    check_out_time: Optional[datetime] = None
    status: Optional[AttendanceStatus] = None
    hours_worked: Optional[float] = None
    overtime_hours: Optional[float] = None
    wages_earned: Optional[float] = None
    check_out_photo: Optional[str] = None
    notes: Optional[str] = None

class LaborAttendanceResponse(LaborAttendanceBase):
    id: str
    worker_name: str
    project_name: str
    worker_skill: str
    created_by: str
    created_at: datetime
    updated_at: datetime

# Site Transfer Models
class SiteTransferBase(BaseModel):
    worker_id: str
    from_project_id: str
    to_project_id: str
    transfer_date: datetime
    transfer_time: Optional[datetime] = None
    hours_at_from_site: Optional[float] = None
    hours_at_to_site: Optional[float] = None
    wages_from_site: Optional[float] = None
    wages_to_site: Optional[float] = None
    reason: Optional[str] = None
    approved_by: Optional[str] = None

class SiteTransferCreate(SiteTransferBase):
    pass

class SiteTransferResponse(SiteTransferBase):
    id: str
    worker_name: str
    from_project_name: str
    to_project_name: str
    created_by: str
    created_by_name: Optional[str] = None
    created_at: datetime


# ============= Vendor & Materials Management Models =============

# Vendor Models
class VendorBase(BaseModel):
    business_name: str
    contact_person: str
    phone: str
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    payment_terms: Optional[str] = None  # e.g., "Net 30", "Cash on Delivery"
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    account_holder_name: Optional[str] = None
    is_active: bool = True
    notes: Optional[str] = None

class VendorCreate(VendorBase):
    pass

class VendorUpdate(BaseModel):
    business_name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    payment_terms: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    account_holder_name: Optional[str] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None

class VendorResponse(VendorBase):
    id: str
    created_by: str
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

# Material Category Enum
class MaterialCategory(str, Enum):
    CEMENT = "cement"
    STEEL = "steel"
    SAND = "sand"
    AGGREGATE = "aggregate"
    BRICKS = "bricks"
    BLOCKS = "blocks"
    TILES = "tiles"
    PAINT = "paint"
    PLUMBING = "plumbing"
    ELECTRICAL = "electrical"
    HARDWARE = "hardware"
    WOOD = "wood"
    GLASS = "glass"
    MISC = "miscellaneous"

# Material Models
class MaterialBase(BaseModel):
    name: str
    category: MaterialCategory
    unit: str  # kg, ton, bag, piece, sqft, cft, liter, etc.
    description: Optional[str] = None
    minimum_stock: Optional[float] = 0
    hsn_code: Optional[str] = None
    is_active: bool = True

class MaterialCreate(MaterialBase):
    pass

class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[MaterialCategory] = None
    unit: Optional[str] = None
    description: Optional[str] = None
    minimum_stock: Optional[float] = None
    hsn_code: Optional[str] = None
    is_active: Optional[bool] = None

class MaterialResponse(MaterialBase):
    id: str
    created_by: str
    created_at: datetime
    updated_at: datetime

# Vendor Material Rate Models
class VendorMaterialRateBase(BaseModel):
    vendor_id: str
    material_id: str
    rate_per_unit: float
    effective_from: datetime
    effective_to: Optional[datetime] = None
    is_active: bool = True
    notes: Optional[str] = None

class VendorMaterialRateCreate(VendorMaterialRateBase):
    pass

class VendorMaterialRateUpdate(BaseModel):
    rate_per_unit: Optional[float] = None
    effective_from: Optional[datetime] = None
    effective_to: Optional[datetime] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None

class VendorMaterialRateResponse(VendorMaterialRateBase):
    id: str
    vendor_name: str
    material_name: str
    material_unit: str
    created_by: str
    created_at: datetime
    updated_at: datetime

# Site Inventory Models
class SiteInventoryBase(BaseModel):
    project_id: str
    material_id: str
    current_stock: float
    last_updated: datetime

class SiteInventoryCreate(SiteInventoryBase):
    pass

class SiteInventoryUpdate(BaseModel):
    current_stock: Optional[float] = None
    last_updated: Optional[datetime] = None

class SiteInventoryResponse(SiteInventoryBase):
    id: str
    project_name: str
    material_name: str
    material_unit: str
    material_category: str
    minimum_stock: float

# Material Requirement Models
class MaterialRequirementBase(BaseModel):
    project_id: str
    material_id: str
    required_quantity: float
    required_by_date: datetime
    priority: TaskPriority = TaskPriority.MEDIUM
    purpose: Optional[str] = None
    is_fulfilled: bool = False
    notes: Optional[str] = None

class MaterialRequirementCreate(MaterialRequirementBase):
    pass

class MaterialRequirementUpdate(BaseModel):
    required_quantity: Optional[float] = None
    required_by_date: Optional[datetime] = None
    priority: Optional[TaskPriority] = None
    purpose: Optional[str] = None
    is_fulfilled: Optional[bool] = None
    notes: Optional[str] = None

class MaterialRequirementResponse(MaterialRequirementBase):
    id: str
    project_name: str
    material_name: str
    material_unit: str
    material_category: str
    created_by: str
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

# Purchase Order Status Enum
class PurchaseOrderStatus(str, Enum):
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    ORDERED = "ordered"
    PARTIALLY_RECEIVED = "partially_received"
    RECEIVED = "received"
    CANCELLED = "cancelled"

# Purchase Order Models
class PurchaseOrderBase(BaseModel):
    po_number: str
    vendor_id: str
    project_id: str
    order_date: datetime
    expected_delivery_date: datetime
    status: PurchaseOrderStatus = PurchaseOrderStatus.DRAFT
    payment_terms: Optional[str] = None
    total_amount: float
    tax_amount: Optional[float] = 0
    discount_amount: Optional[float] = 0
    final_amount: float
    delivery_address: Optional[str] = None
    notes: Optional[str] = None

class PurchaseOrderCreate(PurchaseOrderBase):
    items: List[Dict[str, Any]]  # Will contain material_id, quantity, rate, amount

class PurchaseOrderUpdate(BaseModel):
    expected_delivery_date: Optional[datetime] = None
    status: Optional[PurchaseOrderStatus] = None
    payment_terms: Optional[str] = None
    total_amount: Optional[float] = None
    tax_amount: Optional[float] = None
    discount_amount: Optional[float] = None
    final_amount: Optional[float] = None
    delivery_address: Optional[str] = None
    notes: Optional[str] = None

class PurchaseOrderResponse(PurchaseOrderBase):
    id: str
    vendor_name: str
    project_name: str
    created_by: str
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[Dict[str, Any]]

# Purchase Order Item Models
class PurchaseOrderItemBase(BaseModel):
    purchase_order_id: str
    material_id: str
    quantity: float
    rate_per_unit: float
    amount: float
    received_quantity: float = 0
    notes: Optional[str] = None

class PurchaseOrderItemCreate(PurchaseOrderItemBase):
    pass

class PurchaseOrderItemUpdate(BaseModel):
    quantity: Optional[float] = None
    rate_per_unit: Optional[float] = None
    amount: Optional[float] = None
    received_quantity: Optional[float] = None
    notes: Optional[str] = None

class PurchaseOrderItemResponse(PurchaseOrderItemBase):
    id: str
    material_name: str
    material_unit: str
    created_at: datetime

# Material Transaction Type Enum
class TransactionType(str, Enum):
    RECEIPT = "receipt"  # Material received
    CONSUMPTION = "consumption"  # Material consumed
    TRANSFER_IN = "transfer_in"  # Transfer from another site
    TRANSFER_OUT = "transfer_out"  # Transfer to another site
    RETURN = "return"  # Return to vendor
    ADJUSTMENT = "adjustment"  # Stock adjustment

# Material Transaction Models
class MaterialTransactionBase(BaseModel):
    project_id: str
    material_id: str
    transaction_type: TransactionType
    quantity: float
    transaction_date: datetime
    reference_type: Optional[str] = None  # 'purchase_order', 'task', etc.
    reference_id: Optional[str] = None
    notes: Optional[str] = None

class MaterialTransactionCreate(MaterialTransactionBase):
    pass

class MaterialTransactionResponse(MaterialTransactionBase):
    id: str
    project_name: str
    material_name: str
    material_unit: str
    created_by: str
    created_by_name: Optional[str] = None
    created_at: datetime

# ============= Task Material Management Models =============

# Task Material Estimation Model
class TaskMaterialEstimate(BaseModel):
    task_id: str
    material_id: str
    estimated_quantity: float
    actual_quantity: float = 0
    unit: str
    notes: Optional[str] = None

class TaskMaterialEstimateResponse(TaskMaterialEstimate):
    id: str
    material_name: str
    material_category: str
    created_at: datetime

# Task Work Measurement Model
class TaskWorkMeasurement(BaseModel):
    work_type: ConstructionWorkType
    measurement_type: MeasurementType
    area: Optional[float] = None  # Square feet
    length: Optional[float] = None  # Feet
    breadth: Optional[float] = None  # Feet
    height: Optional[float] = None  # Feet
    count: Optional[int] = None  # Number of items
    weight: Optional[float] = None  # Kg
    notes: Optional[str] = None

class TaskWorkMeasurementResponse(TaskWorkMeasurement):
    calculated_value: float  # Calculated area/volume based on type

# Material Consumption Rate Template (Industry Standards)
class MaterialConsumptionTemplate(BaseModel):
    work_type: ConstructionWorkType
    material_category: str
    material_name: str
    consumption_rate: float  # Per unit (sqft/cuft/etc)
    unit: str
    measurement_type: MeasurementType
    description: str
    is_active: bool = True

class MaterialConsumptionTemplateResponse(MaterialConsumptionTemplate):
    id: str
    created_at: datetime


# Milestone Status Enum
class MilestoneStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DELAYED = "delayed"

# Project Milestone Models
class MilestoneBase(BaseModel):
    name: str
    description: Optional[str] = None
    project_id: str
    due_date: datetime
    status: MilestoneStatus = MilestoneStatus.PENDING
    completion_percentage: float = 0  # 0-100
    order: int = 0  # For ordering milestones

class MilestoneCreate(MilestoneBase):
    pass

class MilestoneUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[MilestoneStatus] = None
    completion_percentage: Optional[float] = None
    order: Optional[int] = None

class MilestoneResponse(MilestoneBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

# Document Type Enum
class DocumentType(str, Enum):
    CONTRACT = "contract"
    BLUEPRINT = "blueprint"
    PERMIT = "permit"
    INVOICE = "invoice"
    REPORT = "report"
    PHOTO = "photo"
    OTHER = "other"

# Project Document Models
class DocumentBase(BaseModel):
    name: str
    description: Optional[str] = None
    project_id: str
    document_type: DocumentType
    file_data: str  # base64 encoded file or URL
    file_name: str
    file_size: Optional[int] = None  # in bytes
    mime_type: Optional[str] = None
    uploaded_by: str  # User ID
    tags: List[str] = []  # For categorization

class DocumentCreate(DocumentBase):
    pass

class DocumentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    document_type: Optional[DocumentType] = None
    tags: Optional[List[str]] = None

class DocumentResponse(DocumentBase):
    id: str
    uploaded_at: datetime
    updated_at: Optional[datetime] = None
    uploader_name: Optional[str] = None  # Populated from user data


# Budget Category Enum
class BudgetCategory(str, Enum):
    LABOR = "labor"
    MATERIALS = "materials"
    EQUIPMENT = "equipment"
    SUBCONTRACTORS = "subcontractors"
    PERMITS = "permits"
    OVERHEAD = "overhead"
    CONTINGENCY = "contingency"
    OTHER = "other"

# Project Budget Models
class BudgetBase(BaseModel):
    project_id: str
    category: BudgetCategory
    allocated_amount: float
    description: Optional[str] = None
    fiscal_year: Optional[int] = None

class BudgetCreate(BudgetBase):
    pass

class BudgetUpdate(BaseModel):
    category: Optional[BudgetCategory] = None
    allocated_amount: Optional[float] = None
    description: Optional[str] = None

class BudgetResponse(BudgetBase):
    id: str
    spent_amount: float = 0  # Calculated from expenses
    remaining_amount: float = 0  # allocated - spent
    utilization_percentage: float = 0  # (spent / allocated) * 100
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# Expense Models
class ExpenseBase(BaseModel):
    project_id: str
    category: BudgetCategory
    amount: float
    description: str
    expense_date: datetime
    vendor_name: Optional[str] = None
    receipt_image: Optional[str] = None  # base64 image
    payment_method: Optional[str] = None  # cash, card, transfer, check
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    category: Optional[BudgetCategory] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    expense_date: Optional[datetime] = None
    vendor_name: Optional[str] = None
    receipt_image: Optional[str] = None
    payment_method: Optional[str] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class ExpenseResponse(ExpenseBase):
    id: str
    created_by: str
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

# Invoice Status Enum
class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

# Invoice Models
class InvoiceItemBase(BaseModel):
    description: str
    quantity: float
    unit_price: float
    amount: float  # quantity * unit_price

class InvoiceBase(BaseModel):
    project_id: str
    invoice_number: str
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    client_address: Optional[str] = None
    issue_date: datetime
    due_date: datetime
    items: List[InvoiceItemBase]
    subtotal: float
    tax_percentage: float = 0
    tax_amount: float = 0
    total_amount: float
    notes: Optional[str] = None
    terms: Optional[str] = None

class InvoiceCreate(InvoiceBase):
    pass

class InvoiceUpdate(BaseModel):
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    client_address: Optional[str] = None
    issue_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    items: Optional[List[InvoiceItemBase]] = None
    subtotal: Optional[float] = None
    tax_percentage: Optional[float] = None
    tax_amount: Optional[float] = None
    total_amount: Optional[float] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    status: Optional[InvoiceStatus] = None

class InvoiceResponse(InvoiceBase):
    id: str
    status: InvoiceStatus = InvoiceStatus.DRAFT
    paid_amount: float = 0
    balance_due: float = 0
    created_by: str
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

# Payment Method Enum
class PaymentMethod(str, Enum):
    CASH = "cash"
    CHECK = "check"
    BANK_TRANSFER = "bank_transfer"
    CREDIT_CARD = "credit_card"
    ONLINE = "online"
    OTHER = "other"

# Payment Models
class PaymentBase(BaseModel):
    invoice_id: str
    amount: float
    payment_date: datetime
    payment_method: PaymentMethod
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentUpdate(BaseModel):
    amount: Optional[float] = None
    payment_date: Optional[datetime] = None
    payment_method: Optional[PaymentMethod] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class PaymentResponse(PaymentBase):
    id: str
    invoice_number: Optional[str] = None
    client_name: Optional[str] = None
    recorded_by: str
    recorded_by_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


# ============= CRM Lead Management Models (Phase 2 - Clean Rebuild) =============

# Lead Status Enum
class LeadStatus(str, Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    WON = "won"
    LOST = "lost"
    ON_HOLD = "on_hold"

# Lead Priority Enum
class LeadPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

# Lead Source Enum
class LeadSource(str, Enum):
    WEBSITE = "website"
    REFERRAL = "referral"
    SOCIAL_MEDIA = "social_media"
    COLD_CALL = "cold_call"
    WALK_IN = "walk_in"
    ADVERTISEMENT = "advertisement"
    PARTNER = "partner"
    OTHER = "other"

# Lead Activity Type Enum
class LeadActivityType(str, Enum):
    CALL = "call"
    WHATSAPP = "whatsapp"
    EMAIL = "email"
    MEETING = "meeting"
    NOTE = "note"
    SITE_VISIT = "site_visit"
    STATUS_CHANGE = "status_change"
    FIELD_UPDATE = "field_update"

# Call Outcome Enum
class CallOutcome(str, Enum):
    CONNECTED = "connected"
    BUSY = "busy"
    NO_ANSWER = "no_answer"
    FAILED = "failed"
    VOICEMAIL = "voicemail"
    CALLBACK_REQUESTED = "callback_requested"

# WhatsApp Status Enum
class WhatsAppStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"

# Currency Enum
class Currency(str, Enum):
    INR = "INR"
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"

# ============= Lead Category (Custom Funnel Stages) =============

class LeadCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#6B7280"  # Hex color for UI
    order: int = 0
    is_active: bool = True
    is_system: bool = False  # System categories can't be deleted

class LeadCategoryCreate(LeadCategoryBase):
    pass

class LeadCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None

class LeadCategoryResponse(LeadCategoryBase):
    id: str
    created_at: datetime
    updated_at: datetime
    lead_count: int = 0  # Number of leads in this category

# ============= Lead Model =============

class LeadBase(BaseModel):
    name: str  # Lead/Client name
    primary_phone: str
    alternate_phone: Optional[str] = None
    email: Optional[EmailStr] = None
    city: Optional[str] = None
    state: Optional[str] = None
    budget: Optional[float] = None
    budget_currency: Currency = Currency.INR
    requirement: Optional[str] = None  # Project requirements/description
    category_id: str  # Reference to LeadCategory
    status: LeadStatus = LeadStatus.NEW
    assigned_to: Optional[str] = None  # User ID
    source: LeadSource = LeadSource.OTHER
    priority: LeadPriority = LeadPriority.MEDIUM
    tags: List[str] = []
    whatsapp_consent: bool = False  # Consent for WhatsApp messages
    whatsapp_opt_in_date: Optional[datetime] = None
    last_contacted: Optional[datetime] = None
    next_follow_up: Optional[datetime] = None
    notes: Optional[str] = None
    # Funnel support
    funnel_id: Optional[str] = None  # Reference to Funnel
    funnel_stage: Optional[str] = None  # Current stage in funnel
    # Custom fields
    custom_fields: Optional[Dict[str, Any]] = {}

class LeadCreate(LeadBase):
    send_whatsapp: bool = False  # Auto-send WhatsApp on creation

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    primary_phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    email: Optional[EmailStr] = None
    city: Optional[str] = None
    state: Optional[str] = None
    budget: Optional[float] = None
    budget_currency: Optional[Currency] = None
    requirement: Optional[str] = None
    category_id: Optional[str] = None
    status: Optional[LeadStatus] = None
    assigned_to: Optional[str] = None
    source: Optional[LeadSource] = None
    priority: Optional[LeadPriority] = None
    tags: Optional[List[str]] = None
    whatsapp_consent: Optional[bool] = None
    last_contacted: Optional[datetime] = None
    next_follow_up: Optional[datetime] = None
    notes: Optional[str] = None

class LeadResponse(LeadBase):
    id: str
    assigned_to_name: Optional[str] = None
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    created_by: str
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    last_activity: Optional[datetime] = None
    activities_count: int = 0

# ============= Lead Activity Model (Timeline) =============

class LeadActivityBase(BaseModel):
    lead_id: str
    activity_type: LeadActivityType
    title: str
    description: Optional[str] = None
    # Call specific fields
    call_duration: Optional[int] = None  # seconds
    call_outcome: Optional[CallOutcome] = None
    # WhatsApp specific fields
    whatsapp_message_id: Optional[str] = None
    whatsapp_status: Optional[WhatsAppStatus] = None
    whatsapp_message: Optional[str] = None
    # Meeting specific fields
    meeting_date: Optional[datetime] = None
    meeting_location: Optional[str] = None
    meeting_attendees: Optional[List[str]] = None

class LeadActivityCreate(LeadActivityBase):
    pass

class LeadActivityResponse(LeadActivityBase):
    id: str
    performed_by: str
    performed_by_name: Optional[str] = None
    created_at: datetime

# ============= Lead Field Audit (Field-Level Change Tracking) =============

class LeadFieldAuditBase(BaseModel):
    lead_id: str
    field_name: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None

class LeadFieldAuditResponse(LeadFieldAuditBase):
    id: str
    changed_by: str
    changed_by_name: Optional[str] = None
    changed_at: datetime

# ============= Bulk Operations =============

class LeadBulkUpdate(BaseModel):
    lead_ids: List[str]
    updates: Dict[str, Any]

class LeadBulkAssign(BaseModel):
    lead_ids: List[str]
    assigned_to: str

class LeadImportItem(BaseModel):
    name: str
    primary_phone: str
    alternate_phone: Optional[str] = None
    email: Optional[EmailStr] = None
    city: Optional[str] = None
    budget: Optional[float] = None
    requirement: Optional[str] = None
    source: LeadSource = LeadSource.OTHER
    tags: Optional[List[str]] = []

class LeadImportResponse(BaseModel):
    total: int
    successful: int
    failed: int
    errors: List[str] = []

# ============= CRM Configuration =============

class CRMConfigBase(BaseModel):
    # WhatsApp Mock Settings
    whatsapp_enabled: bool = False
    whatsapp_api_key: Optional[str] = None
    whatsapp_template_on_create: Optional[str] = "Hello {name}, thank you for your interest! We'll get back to you soon."
    # Telephony Mock Settings
    telephony_enabled: bool = False
    telephony_provider: Optional[str] = "mock"
    # Auto-assignment Settings
    auto_assign_enabled: bool = False
    auto_assign_strategy: str = "round_robin"  # or "least_assigned"

class CRMConfigUpdate(BaseModel):
    whatsapp_enabled: Optional[bool] = None
    whatsapp_api_key: Optional[str] = None
    whatsapp_template_on_create: Optional[str] = None
    telephony_enabled: Optional[bool] = None
    telephony_provider: Optional[str] = None
    auto_assign_enabled: Optional[bool] = None
    auto_assign_strategy: Optional[str] = None

class CRMConfigResponse(CRMConfigBase):
    id: str
    updated_by: str
    updated_by_name: Optional[str] = None
    updated_at: datetime


# ============= Custom Fields System =============

class CustomFieldType(str, Enum):
    TEXT = "text"
    NUMBER = "number"
    EMAIL = "email"
    PHONE = "phone"
    DATE = "date"
    DROPDOWN = "dropdown"
    CHECKBOX = "checkbox"
    TEXTAREA = "textarea"

class CustomFieldBase(BaseModel):
    field_name: str
    field_label: str
    field_type: CustomFieldType
    is_required: bool = False
    validation_rules: Optional[Dict[str, Any]] = None
    dropdown_options: Optional[List[str]] = None
    default_value: Optional[str] = None
    visible_to_roles: List[UserRole] = [UserRole.ADMIN, UserRole.PROJECT_MANAGER]
    is_active: bool = True
    order: int = 0

class CustomFieldCreate(CustomFieldBase):
    pass

class CustomFieldUpdate(BaseModel):
    field_label: Optional[str] = None
    is_required: Optional[bool] = None
    validation_rules: Optional[Dict[str, Any]] = None
    dropdown_options: Optional[List[str]] = None
    default_value: Optional[str] = None
    visible_to_roles: Optional[List[UserRole]] = None
    is_active: Optional[bool] = None
    order: Optional[int] = None

class CustomFieldResponse(CustomFieldBase):
    id: str
    created_at: datetime
    updated_at: datetime

# ============= Funnel System =============

class FunnelStageBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#6B7280"
    order: int
    default_probability: float = 0.5  # 0.0 to 1.0
    expected_duration_days: Optional[int] = None

class FunnelBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True
    category_ids: List[str] = []  # Link funnels to specific lead categories
    stages: List[FunnelStageBase]
    custom_field_ids: List[str] = []
    assigned_to_users: List[str] = []
    assigned_to_teams: List[str] = []
    assigned_to_project_types: List[str] = []
    automation_rules: Optional[Dict[str, Any]] = None

class FunnelCreate(FunnelBase):
    pass

class FunnelUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    category_ids: Optional[List[str]] = None
    stages: Optional[List[FunnelStageBase]] = None
    custom_field_ids: Optional[List[str]] = None
    assigned_to_users: Optional[List[str]] = None
    assigned_to_teams: Optional[List[str]] = None
    assigned_to_project_types: Optional[List[str]] = None
    automation_rules: Optional[Dict[str, Any]] = None

class FunnelResponse(FunnelBase):
    id: str
    created_by: str
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    lead_count: int = 0
    category_names: List[str] = []  # Names of linked categories
    conversion_rate: float = 0.0
    conversion_rate: float = 0.0

class FunnelStageStats(BaseModel):
    stage_name: str
    stage_order: int
    lead_count: int
    avg_duration_days: Optional[float] = None
    conversion_rate: float = 0.0

class FunnelAnalytics(BaseModel):
    funnel_id: str
    funnel_name: str
    total_leads: int
    stage_stats: List[FunnelStageStats]
    overall_conversion_rate: float

# ============= Permission Matrix =============

class CRMPermission(str, Enum):
    VIEW_LEADS = "view_leads"
    CREATE_LEADS = "create_leads"
    EDIT_LEADS = "edit_leads"
    DELETE_LEADS = "delete_leads"
    MOVE_TO_PROJECT = "move_to_project"
    BYPASS_REQUIRED_FIELDS = "bypass_required_fields"
    MANAGE_FUNNELS = "manage_funnels"
    MANAGE_CUSTOM_FIELDS = "manage_custom_fields"
    ACCESS_CRM_SETTINGS = "access_crm_settings"
    VIEW_ANALYTICS = "view_analytics"
    EXPORT_LEADS = "export_leads"
    IMPORT_LEADS = "import_leads"

class RolePermissions(BaseModel):
    role: UserRole
    permissions: List[CRMPermission]

class PermissionMatrixResponse(BaseModel):
    matrix: List[RolePermissions]

# ============= Lead Import/Export =============

class LeadExportRequest(BaseModel):
    filter_by_category: Optional[str] = None
    filter_by_status: Optional[LeadStatus] = None
    filter_by_funnel: Optional[str] = None
    format: str = "csv"  # csv or json

class LeadImportSource(str, Enum):
    CSV = "csv"
    META = "meta"
    EXCEL = "excel"

class MetaLeadImportConfig(BaseModel):
    access_token: str
    form_id: str
    since_date: Optional[datetime] = None

class LeadImportRequest(BaseModel):
    source: LeadImportSource
    default_funnel_id: Optional[str] = None
    default_category_id: Optional[str] = None
    meta_config: Optional[MetaLeadImportConfig] = None


# ============= Move Lead to Project with Bank Transaction =============

class BankTransactionBase(BaseModel):
    bank_name: str
    account_number: str  # Will be masked in responses
    transaction_id: str
    amount: float
    transaction_date: datetime
    receipt_attachment: Optional[str] = None  # Base64 or file path
    notes: Optional[str] = None

class BankTransactionCreate(BankTransactionBase):
    pass

class BankTransactionResponse(BankTransactionBase):
    id: str
    account_number_masked: str
    created_at: datetime

class MoveLeadToProjectRequest(BaseModel):
    lead_id: str
    project_name: str
    project_description: Optional[str] = None
    bank_transaction: Optional[BankTransactionCreate] = None
    bypass_transaction: bool = False
    bypass_reason: Optional[str] = None
    copy_fields: List[str] = ["name", "primary_phone", "email", "city", "budget", "requirement"]

class MoveLeadToProjectResponse(BaseModel):
    success: bool
    project_id: str
    project_name: str
    transaction_id: Optional[str] = None
    bypassed: bool = False
    message: str

# ============= Chat/Messaging Models =============

class MessageAttachment(BaseModel):
    file_name: str
    file_url: str
    file_type: str  # image, document, video, etc.
    file_size: int  # in bytes
    uploaded_at: datetime

class MessageBase(BaseModel):
    content: str
    attachments: List[MessageAttachment] = []

class MessageCreate(MessageBase):
    pass

class Message(MessageBase):
    id: str
    conversation_id: str
    sender_id: str
    sender_name: str
    sender_role: str
    is_read: bool = False
    read_by: List[str] = []  # List of user IDs who have read the message
    created_at: datetime
    updated_at: datetime

class MessageResponse(MessageBase):
    id: str
    conversation_id: str
    sender_id: str
    sender_name: str
    sender_role: str
    is_read: bool
    read_by: List[str]
    created_at: datetime
    updated_at: datetime

class ConversationBase(BaseModel):
    project_id: str
    project_name: str
    participants: List[str]  # List of user IDs
    participant_names: List[str] = []  # List of user names for display

class ConversationCreate(ConversationBase):
    pass

class Conversation(Document, ConversationBase):
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    last_message_sender: Optional[str] = None
    unread_count: Dict[str, int] = {}  # user_id -> count
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
    created_by: str
    
    class Settings:
        name = "conversations"

class ConversationResponse(ConversationBase):
    id: str
    last_message: Optional[str]
    last_message_at: Optional[datetime]
    last_message_sender: Optional[str]
    unread_count: Dict[str, int]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

# ============= Audit Logging for Financial Actions =============

class AuditActionType(str, Enum):
    LEAD_TO_PROJECT = "lead_to_project"
    BANK_TRANSACTION = "bank_transaction"
    BYPASS_REQUIRED_FIELD = "bypass_required_field"
    PROJECT_CREATED = "project_created"
    FINANCIAL_ENTRY = "financial_entry"
    FIELD_MODIFIED = "field_modified"
    PERMISSION_OVERRIDE = "permission_override"

class AuditLogBase(BaseModel):
    action_type: AuditActionType
    action_description: str
    entity_type: str  # "lead", "project", "transaction", etc.
    entity_id: str
    user_id: str
    user_role: str
    old_data: Optional[Dict[str, Any]] = None
    new_data: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    bypass_reason: Optional[str] = None
    is_financial_action: bool = False
    is_reversible: bool = True

class AuditLogCreate(AuditLogBase):
    pass

class AuditLogResponse(AuditLogBase):
    id: str
    user_name: str
    created_at: datetime

class AuditLogFilter(BaseModel):
    action_type: Optional[AuditActionType] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    user_id: Optional[str] = None
    is_financial_action: Optional[bool] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

# ============= Project Creation from Lead =============

class ProjectFromLeadBase(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[float] = None
    location: Optional[str] = None
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    client_email: Optional[str] = None
    source_lead_id: str
    initial_payment: Optional[float] = None

# ============= System Labels =============

class SystemLabel(str, Enum):
    LEAD = "lead"
    LEADS = "leads"
    CATEGORY = "category"
    CATEGORIES = "categories"
    FUNNEL = "funnel"
    FUNNELS = "funnels"
    STATUS = "status"
    PRIORITY = "priority"
    SOURCE = "source"

class SystemLabelUpdate(BaseModel):
    label_key: SystemLabel
    custom_value: str

class SystemLabelsResponse(BaseModel):
    labels: Dict[str, str]

# ============= Dashboard Stats =============

class CRMDashboardStats(BaseModel):
    total_leads: int
    leads_by_stage: Dict[str, int]
    leads_by_status: Dict[str, int]
    leads_by_priority: Dict[str, int]
    new_leads_this_week: int
    new_leads_this_month: int
    conversion_rate: float
    avg_lead_value: float
    top_sources: List[Dict[str, Any]]

