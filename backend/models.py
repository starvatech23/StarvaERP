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

class LeadStatus(str, Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    PROPOSAL = "proposal"
    WON = "won"
    LOST = "lost"

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

# CRM Models
class LeadBase(BaseModel):
    client_name: str
    contact: str
    email: Optional[EmailStr] = None
    source: Optional[str] = None
    status: LeadStatus = LeadStatus.NEW
    estimated_value: Optional[float] = None
    follow_up_date: Optional[datetime] = None
    notes: Optional[str] = None

class LeadCreate(LeadBase):
    assigned_to: Optional[str] = None

class LeadUpdate(BaseModel):
    client_name: Optional[str] = None
    contact: Optional[str] = None
    email: Optional[EmailStr] = None
    source: Optional[str] = None
    status: Optional[LeadStatus] = None
    estimated_value: Optional[float] = None
    assigned_to: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    notes: Optional[str] = None

class LeadResponse(LeadBase):
    id: str
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    created_by: str
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

# Quotation Models
class QuotationItem(BaseModel):
    description: str
    quantity: float
    unit_price: float
    total: float

class QuotationBase(BaseModel):
    lead_id: str
    project_type: str
    items: List[QuotationItem]
    total_amount: float
    valid_until: datetime
    terms: Optional[str] = None

class QuotationCreate(QuotationBase):
    pass

class QuotationUpdate(BaseModel):
    project_type: Optional[str] = None
    items: Optional[List[QuotationItem]] = None
    total_amount: Optional[float] = None
    valid_until: Optional[datetime] = None
    terms: Optional[str] = None
    status: Optional[str] = None

class QuotationResponse(QuotationBase):
    id: str
    lead_name: str
    status: str  # draft, sent, accepted, rejected
    created_by: str
    created_by_name: Optional[str] = None
    sent_date: Optional[datetime] = None
    created_at: datetime

# Company Settings Models
class CompanySettings(BaseModel):
    company_name: str
    logo: Optional[str] = None  # base64
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    tax_id: Optional[str] = None
    website: Optional[str] = None

class CompanySettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    logo: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    tax_id: Optional[str] = None
    website: Optional[str] = None

# Enhanced Quotation Item with Tax
class QuotationItemWithTax(BaseModel):
    description: str
    quantity: float
    unit_price: float
    tax_rate: float = 0  # percentage
    subtotal: float
    tax_amount: float
    total: float

# Bulk Lead Upload
class BulkLeadItem(BaseModel):
    client_name: str
    contact: str
    email: Optional[EmailStr] = None
    source: Optional[str] = None
    estimated_value: Optional[float] = None
    notes: Optional[str] = None

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

# Activity Log Models
class ActivityType(str, Enum):
    PROJECT_CREATED = "project_created"
    PROJECT_UPDATED = "project_updated"
    TASK_CREATED = "task_created"
    TASK_UPDATED = "task_updated"
    PAYMENT_ADDED = "payment_added"
    EXPENSE_ADDED = "expense_added"
    LEAD_CREATED = "lead_created"
    LEAD_UPDATED = "lead_updated"
    USER_JOINED = "user_joined"
    OTHER = "other"

class ActivityLogBase(BaseModel):
    user_id: str
    activity_type: ActivityType
    description: str
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class ActivityLogCreate(ActivityLogBase):
    pass

class ActivityLogResponse(ActivityLogBase):
    id: str
    user_name: str
    user_role: str
    created_at: datetime

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

