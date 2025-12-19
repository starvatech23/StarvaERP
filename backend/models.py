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
    CRM_MANAGER = "crm_manager"
    CRM_USER = "crm_user"

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
    created_at: Optional[datetime] = None
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
    created_at: Optional[datetime] = None
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
    updated_at: Optional[datetime] = None

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
    created_at: Optional[datetime] = None
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
    is_active: bool = True
    approval_status: ApprovalStatus = ApprovalStatus.PENDING
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    role_name: Optional[str] = None  # Populated from role_id
    team_name: Optional[str] = None  # Populated from team_id
    date_joined: Optional[datetime] = None
    last_login: Optional[datetime] = None
    crm_permissions: Optional[Dict[str, bool]] = None  # CRM permissions for frontend

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
    created_at: Optional[datetime] = None
    created_by: Optional[str] = None
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
    created_at: Optional[datetime] = None
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
    project_code: Optional[str] = None  # Unique ID: STC-MMYY-XXXXX
    location: Optional[str] = None
    address: Optional[str] = None
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
    client_portal_link: Optional[str] = None  # Client portal access link
    address: Optional[str] = None  # Make address optional
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ProjectTeamUpdate(BaseModel):
    team_member_ids: List[str]

# Task Models
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    project_id: str
    milestone_id: Optional[str] = None  # Link to parent milestone
    status: TaskStatus = TaskStatus.PENDING
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: Optional[datetime] = None
    assigned_to: List[str] = []  # User IDs (supports multiple)
    attachments: List[str] = []  # base64 or URLs
    parent_task_id: Optional[str] = None  # For subtasks
    # Construction-specific fields
    work_type: Optional[ConstructionWorkType] = None
    measurement_type: Optional[MeasurementType] = None
    # Gantt chart fields / Timeline
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
    # Cost Tracking (from BOQ/Estimate)
    estimated_cost: Optional[float] = 0.0  # From project estimate/BOQ
    actual_cost: Optional[float] = 0.0  # Actual cost (editable by PM/Engineer)
    cost_variance: Optional[float] = 0.0  # estimated - actual
    boq_reference_id: Optional[str] = None  # Link to BOQ/Estimate line item

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    milestone_id: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[datetime] = None
    assigned_to: Optional[List[str]] = None
    attachments: Optional[List[str]] = None
    planned_start_date: Optional[datetime] = None
    planned_end_date: Optional[datetime] = None
    actual_start_date: Optional[datetime] = None
    actual_end_date: Optional[datetime] = None
    progress_percentage: Optional[float] = None
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None

class TaskResponse(TaskBase):
    id: str
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    assigned_users: List[Dict[str, str]] = []  # [{"id": "", "name": ""}]
    subtasks: List[Dict[str, Any]] = []  # Subtasks
    milestone_name: Optional[str] = None  # Populated from milestone_id
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

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
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None

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
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None

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
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None

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
    created_at: Optional[datetime] = None

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
    role: Optional[UserRole] = None
    is_active: bool = True
    date_joined: Optional[datetime] = None
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
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
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
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
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
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None


# ============= Labour Advance Payment Models =============

class AdvancePaymentStatus(str, Enum):
    REQUESTED = "requested"
    APPROVED = "approved"
    REJECTED = "rejected"
    DISBURSED = "disbursed"
    RECOVERED = "recovered"

class RecoveryMode(str, Enum):
    FULL = "full"
    INSTALLMENT = "installment"

class AdvancePaymentBase(BaseModel):
    worker_id: str
    project_id: str
    amount: float
    reason: str
    recovery_mode: RecoveryMode = RecoveryMode.FULL
    installment_amount: Optional[float] = None
    notes: Optional[str] = None

class AdvancePaymentCreate(AdvancePaymentBase):
    pass

class AdvancePaymentUpdate(BaseModel):
    amount: Optional[float] = None
    reason: Optional[str] = None
    recovery_mode: Optional[RecoveryMode] = None
    installment_amount: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[AdvancePaymentStatus] = None

class AdvancePaymentResponse(AdvancePaymentBase):
    id: str
    status: AdvancePaymentStatus = AdvancePaymentStatus.REQUESTED
    requested_date: Optional[datetime] = None
    approved_date: Optional[datetime] = None
    disbursed_date: Optional[datetime] = None
    approved_by: Optional[str] = None
    approved_by_name: Optional[str] = None
    disbursed_by: Optional[str] = None
    disbursed_by_name: Optional[str] = None
    recovered_amount: float = 0
    worker_name: Optional[str] = None
    project_name: Optional[str] = None
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ============= Labour Weekly Payment Models =============

class WeeklyPaymentStatus(str, Enum):
    DRAFT = "draft"
    PENDING_VALIDATION = "pending_validation"
    VALIDATED = "validated"
    PENDING_PAYMENT = "pending_payment"
    OTP_SENT = "otp_sent"
    PAID = "paid"
    FAILED = "failed"

class PaymentMethodType(str, Enum):
    CASH = "cash"
    BANK_TRANSFER = "bank_transfer"
    UPI = "upi"
    CHEQUE = "cheque"

class WeeklyPaymentBase(BaseModel):
    worker_id: str
    project_id: str
    week_start_date: datetime
    week_end_date: datetime
    days_worked: float = 0
    hours_worked: float = 0
    overtime_hours: float = 0
    base_amount: float = 0
    overtime_amount: float = 0
    bonus_amount: float = 0
    gross_amount: float = 0
    advance_deduction: float = 0
    other_deductions: float = 0
    deduction_notes: Optional[str] = None
    net_amount: float = 0
    notes: Optional[str] = None

class WeeklyPaymentCreate(WeeklyPaymentBase):
    pass

class WeeklyPaymentUpdate(BaseModel):
    days_worked: Optional[float] = None
    hours_worked: Optional[float] = None
    overtime_hours: Optional[float] = None
    base_amount: Optional[float] = None
    overtime_amount: Optional[float] = None
    bonus_amount: Optional[float] = None
    gross_amount: Optional[float] = None
    advance_deduction: Optional[float] = None
    other_deductions: Optional[float] = None
    deduction_notes: Optional[str] = None
    net_amount: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[WeeklyPaymentStatus] = None

class WeeklyPaymentResponse(WeeklyPaymentBase):
    id: str
    status: WeeklyPaymentStatus = WeeklyPaymentStatus.DRAFT
    validated_by: Optional[str] = None
    validated_by_name: Optional[str] = None
    validated_at: Optional[datetime] = None
    validation_notes: Optional[str] = None
    otp_sent_at: Optional[datetime] = None
    otp_verified: bool = False
    otp_verified_at: Optional[datetime] = None
    otp_attempts: int = 0
    paid_by: Optional[str] = None
    paid_by_name: Optional[str] = None
    paid_at: Optional[datetime] = None
    payment_method: Optional[PaymentMethodType] = None
    payment_reference: Optional[str] = None
    worker_name: Optional[str] = None
    worker_phone: Optional[str] = None
    project_name: Optional[str] = None
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ============= Payment OTP Log Models =============

class PaymentOTPLogBase(BaseModel):
    payment_id: str
    worker_id: str
    mobile_number: str

class PaymentOTPLogResponse(PaymentOTPLogBase):
    id: str
    sent_at: datetime
    expires_at: datetime
    verified: bool = False
    verified_at: Optional[datetime] = None
    attempts: int = 0


# ============= Vendor & Materials Management Models =============

# Vendor Models
class VendorBase(BaseModel):
    business_name: Optional[str] = None
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
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

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
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

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
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
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
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
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
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
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
    created_at: Optional[datetime] = None

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
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None

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
    created_at: Optional[datetime] = None

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
    created_at: Optional[datetime] = None


# Milestone Status Enum
class MilestoneStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DELAYED = "delayed"

# Project Milestone Models (Enhanced with Cost Tracking and Dependencies)
class MilestoneBase(BaseModel):
    name: str
    description: Optional[str] = None
    project_id: str
    due_date: datetime
    start_date: Optional[datetime] = None
    status: MilestoneStatus = MilestoneStatus.PENDING
    completion_percentage: float = 0  # 0-100
    order: int = 0  # For ordering milestones
    # Cost Tracking
    estimated_cost: Optional[float] = 0.0  # From BOQ/Estimate
    actual_cost: Optional[float] = 0.0  # Sum of actual task costs
    budget_variance: Optional[float] = 0.0  # estimated - actual
    # Dependencies
    depends_on: List[str] = []  # List of milestone IDs this depends on
    # Color for UI display
    color: Optional[str] = "#3B82F6"

class MilestoneCreate(MilestoneBase):
    pass

class MilestoneUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    start_date: Optional[datetime] = None
    status: Optional[MilestoneStatus] = None
    completion_percentage: Optional[float] = None
    order: Optional[int] = None
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None
    depends_on: Optional[List[str]] = None
    color: Optional[str] = None

class MilestoneResponse(MilestoneBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    task_count: int = 0  # Number of tasks under this milestone
    completed_task_count: int = 0  # Number of completed tasks

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


# Project Status Update Models (for daily/weekly/monthly status sharing)
class StatusUpdateFrequency(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"

class StatusUpdateBase(BaseModel):
    project_id: str
    title: str
    description: Optional[str] = None
    frequency: StatusUpdateFrequency = StatusUpdateFrequency.DAILY
    photos: List[str] = []  # Base64 encoded images or URLs
    # Progress summary
    overall_progress: float = 0  # 0-100
    milestones_summary: Optional[str] = None
    tasks_completed: int = 0
    tasks_in_progress: int = 0
    tasks_pending: int = 0
    # Selected tasks for this update
    selected_tasks: List[str] = []  # Task IDs included in this update
    # Cost summary
    budget_spent: Optional[float] = 0
    budget_remaining: Optional[float] = 0
    # Issues/blockers
    issues: Optional[str] = None
    next_steps: Optional[str] = None
    # Weather conditions (for construction)
    weather: Optional[str] = None
    # Visibility
    is_public: bool = False  # If true, visible to clients

class StatusUpdateCreate(StatusUpdateBase):
    pass

class StatusUpdateUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    frequency: Optional[StatusUpdateFrequency] = None
    photos: Optional[List[str]] = None
    overall_progress: Optional[float] = None
    milestones_summary: Optional[str] = None
    tasks_completed: Optional[int] = None
    tasks_in_progress: Optional[int] = None
    tasks_pending: Optional[int] = None
    budget_spent: Optional[float] = None
    budget_remaining: Optional[float] = None
    issues: Optional[str] = None
    next_steps: Optional[str] = None
    weather: Optional[str] = None
    is_public: Optional[bool] = None

class StatusUpdateResponse(StatusUpdateBase):
    id: str
    created_by: str
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    project_name: Optional[str] = None


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
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
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
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
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
    recorded_by: Optional[str] = None
    recorded_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
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
    created_at: Optional[datetime] = None
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
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
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
    performed_by: Optional[str] = None
    performed_by_name: Optional[str] = None
    created_at: Optional[datetime] = None

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
    updated_by: Optional[str] = None
    updated_by_name: Optional[str] = None
    updated_at: Optional[datetime] = None


# ============= CRM Audit Log =============

class CRMAuditAction(str, Enum):
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    ASSIGN = "assign"
    STATUS_CHANGE = "status_change"
    EXPORT = "export"
    BULK_UPDATE = "bulk_update"
    ACCESS_DENIED = "access_denied"

class CRMAuditLogBase(BaseModel):
    user_id: str
    user_name: str
    user_role: str
    action: CRMAuditAction
    resource_type: str  # "lead", "contact", "project", etc.
    resource_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    success: bool = True
    error_message: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class CRMAuditLogCreate(CRMAuditLogBase):
    pass

class CRMAuditLogResponse(CRMAuditLogBase):
    id: str


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
    created_at: Optional[datetime] = None
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
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
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
    created_at: Optional[datetime] = None

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
    created_at: Optional[datetime] = None
    updated_at: datetime

class MessageResponse(MessageBase):
    id: str
    conversation_id: str
    sender_id: str
    sender_name: str
    sender_role: str
    is_read: bool
    read_by: List[str]
    created_at: Optional[datetime] = None
    updated_at: datetime

class ConversationBase(BaseModel):
    project_id: str
    project_name: str
    participants: List[str]  # List of user IDs
    participant_names: List[str] = []  # List of user names for display

class ConversationCreate(ConversationBase):
    pass

class Conversation(ConversationBase):
    id: str
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    last_message_sender: Optional[str] = None
    unread_count: Dict[str, int] = {}  # user_id -> count
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: datetime
    created_by: Optional[str] = None

class ConversationResponse(ConversationBase):
    id: str
    last_message: Optional[str]
    last_message_at: Optional[datetime]
    last_message_sender: Optional[str]
    unread_count: Dict[str, int]
    is_active: bool
    created_at: Optional[datetime] = None
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
    created_at: Optional[datetime] = None

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



# ============= Budgeting & Estimation Models =============

class PackageType(str, Enum):
    STANDARD = "standard"
    PREMIUM = "premium"
    CUSTOM = "custom"

class EstimateStatus(str, Enum):
    DRAFT = "draft"
    APPROVED = "approved"
    REVISED = "revised"
    ARCHIVED = "archived"

class BOQCategory(str, Enum):
    EXCAVATION_FOUNDATION = "excavation_foundation"
    SUPERSTRUCTURE = "superstructure"
    MASONRY = "masonry"
    FINISHES = "finishes"
    SERVICES = "services"
    LABOUR = "labour"
    OVERHEADS = "overheads"
    CONTINGENCY = "contingency"

# Material Preset - Admin configurable coefficients
class MaterialPresetBase(BaseModel):
    name: str  # e.g., "Standard Mix 1:2:4"
    description: Optional[str] = None
    # Cost per sqft estimates
    cost_per_sqft_basic: Optional[float] = 1800.0  # Basic package
    cost_per_sqft_standard: Optional[float] = 2200.0  # Standard package
    cost_per_sqft_premium: Optional[float] = 2800.0  # Premium package
    cost_per_sqft_luxury: Optional[float] = 3500.0  # Luxury package
    # Concrete mix ratios
    cement_per_cum: float = 7.0  # bags per cubic meter
    sand_per_cum: float = 0.42  # cum per cum of concrete
    aggregate_per_cum: float = 0.84  # cum per cum of concrete
    # Steel coefficients


# ============= Project Management Templates =============

class ProjectPhase(str, Enum):
    PREPLANNING = "preplanning"
    STRUCTURE = "structure"
    FINISHING = "finishing"
    FINISHING_2 = "finishing_2"
    HANDOVER = "handover"

class BuildingType(str, Enum):
    RESIDENTIAL = "residential"
    COMMERCIAL = "commercial"
    INDUSTRIAL = "industrial"
    MIXED_USE = "mixed_use"

class SkillType(str, Enum):
    MASON = "mason"
    CARPENTER = "carpenter"
    ELECTRICIAN = "electrician"
    PLUMBER = "plumber"
    STEEL_FIXER = "steel_fixer"
    PAINTER = "painter"
    WELDER = "welder"
    HELPER = "helper"
    OPERATOR = "operator"
    SURVEYOR = "surveyor"
    SUPERVISOR = "supervisor"

# Milestone Template (Pre-defined)
class MilestoneTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    order: int
    phase: ProjectPhase
    default_duration_days: int = 30
    is_floor_based: bool = False  # If true, repeat for each floor
    color: str = "#3B82F6"

class MilestoneTemplateCreate(MilestoneTemplateBase):
    pass

class MilestoneTemplateResponse(MilestoneTemplateBase):
    id: str
    created_at: Optional[datetime] = None

# Task Template Material Estimate
class TaskTemplateMaterial(BaseModel):
    material_category: str
    material_name: str
    quantity_per_unit: float  # Quantity per sqm/cum/unit
    unit: str

# Task Template Labour Estimate
class TaskTemplateLabour(BaseModel):
    skill_type: SkillType
    workers_count: int = 1
    hours_per_day: float = 8.0

# Task Template (Pre-defined)
class TaskTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    order: int
    default_duration_days: int = 1
    work_type: Optional[ConstructionWorkType] = ConstructionWorkType.GENERAL
    measurement_type: Optional[MeasurementType] = None
    material_estimates: List[TaskTemplateMaterial] = []
    labour_estimates: List[TaskTemplateLabour] = []
    dependencies: List[str] = []  # Task template names that must complete first

class TaskTemplateCreate(TaskTemplateBase):
    milestone_template_id: str

class TaskTemplateResponse(TaskTemplateBase):
    id: str
    milestone_template_id: str
    created_at: Optional[datetime] = None

# Task Labour Estimate (Instance)
class TaskLabourEstimateBase(BaseModel):
    task_id: str
    project_id: str
    skill_type: SkillType
    planned_workers: int = 1
    actual_workers: int = 0
    planned_hours: float = 0
    actual_hours: float = 0
    hourly_rate: float = 0  # Will be calculated from daily rate / 8
    planned_cost: float = 0
    actual_cost: float = 0
    notes: Optional[str] = None

class TaskLabourEstimateCreate(TaskLabourEstimateBase):
    pass

class TaskLabourEstimateUpdate(BaseModel):
    actual_workers: Optional[int] = None
    actual_hours: Optional[float] = None
    actual_cost: Optional[float] = None
    notes: Optional[str] = None

class TaskLabourEstimateResponse(TaskLabourEstimateBase):
    id: str
    hours_variance: float = 0
    cost_variance: float = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# Labour Rate Template (Standard rates)
class LabourRateTemplate(BaseModel):
    skill_type: SkillType
    daily_rate: float
    hourly_rate: float  # daily_rate / 8
    efficiency_factor: float = 1.0
    description: str
    is_active: bool = True

class LabourRateTemplateResponse(LabourRateTemplate):
    id: str
    created_at: Optional[datetime] = None

# Enhanced Milestone (with cost tracking)
class ProjectMilestoneEnhanced(BaseModel):
    project_id: str
    template_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    order: int
    phase: ProjectPhase
    floor_number: Optional[int] = None
    
    # Dates
    planned_start_date: Optional[datetime] = None
    planned_end_date: Optional[datetime] = None
    actual_start_date: Optional[datetime] = None
    actual_end_date: Optional[datetime] = None
    
    # Status
    status: MilestoneStatus = MilestoneStatus.PENDING
    completion_percentage: float = 0
    
    # Cost Summary (auto-calculated)
    planned_material_cost: float = 0
    actual_material_cost: float = 0
    planned_labour_cost: float = 0
    actual_labour_cost: float = 0
    total_planned_cost: float = 0
    total_actual_cost: float = 0
    cost_variance: float = 0
    cost_variance_percentage: float = 0
    
    # Dependencies
    depends_on: List[str] = []
    color: str = "#3B82F6"

class ProjectMilestoneEnhancedResponse(ProjectMilestoneEnhanced):
    id: str
    task_count: int = 0
    completed_task_count: int = 0
    schedule_variance_days: int = 0
    is_delayed: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# Project Budget Summary
class ProjectBudgetSummary(BaseModel):
    project_id: str
    project_name: str
    
    # Material costs
    planned_material_cost: float = 0
    actual_material_cost: float = 0
    material_variance: float = 0
    material_variance_percentage: float = 0
    
    # Labour costs
    planned_labour_cost: float = 0
    actual_labour_cost: float = 0
    labour_variance: float = 0
    labour_variance_percentage: float = 0
    
    # Total costs
    total_planned_cost: float = 0
    total_actual_cost: float = 0
    total_variance: float = 0
    total_variance_percentage: float = 0
    
    # Milestone breakdown
    milestones: List[Dict[str, Any]] = []


# ============= Purchase Order Request Models =============

class PORequestStatus(str, Enum):
    DRAFT = "draft"
    PENDING_OPS_MANAGER = "pending_ops_manager"  # Level 1
    PENDING_HEAD_APPROVAL = "pending_head_approval"  # Level 2 (Project Head + Ops Head)
    PENDING_FINANCE = "pending_finance"  # Level 3
    APPROVED = "approved"
    REJECTED = "rejected"
    PO_CREATED = "po_created"

class POPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class POLineItem(BaseModel):
    material_id: Optional[str] = None
    material_name: str
    description: Optional[str] = None
    quantity: float
    unit: str
    estimated_unit_price: float = 0
    estimated_total: float = 0
    specifications: Optional[str] = None

class POApproval(BaseModel):
    level: int  # 1=Ops Manager, 2=Heads, 3=Finance
    approved_by: str
    approved_by_name: str
    approved_at: datetime
    status: str  # approved/rejected
    comments: Optional[str] = None

class PurchaseOrderRequestBase(BaseModel):
    project_id: str
    title: str
    description: Optional[str] = None
    priority: POPriority = POPriority.MEDIUM
    required_by_date: Optional[datetime] = None
    delivery_location: Optional[str] = None
    line_items: List[POLineItem] = []
    total_estimated_amount: float = 0
    justification: Optional[str] = None
    vendor_suggestions: Optional[List[str]] = None
    attachments: Optional[List[str]] = None

class PurchaseOrderRequestCreate(PurchaseOrderRequestBase):
    pass

class PurchaseOrderRequestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[POPriority] = None
    required_by_date: Optional[datetime] = None
    delivery_location: Optional[str] = None
    line_items: Optional[List[POLineItem]] = None
    total_estimated_amount: Optional[float] = None
    justification: Optional[str] = None
    vendor_suggestions: Optional[List[str]] = None

class PurchaseOrderRequestResponse(PurchaseOrderRequestBase):
    id: str
    request_number: str  # POR-MMYY-XXXXXX
    status: PORequestStatus
    project_name: Optional[str] = None
    requested_by: str
    requested_by_name: Optional[str] = None
    current_approval_level: int = 0
    approvals: List[POApproval] = []
    rejection_reason: Optional[str] = None
    rejected_by: Optional[str] = None
    rejected_by_name: Optional[str] = None
    po_number: Optional[str] = None  # Generated after final approval
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class POApprovalAction(BaseModel):
    action: str  # "approve" or "reject"
    comments: Optional[str] = None


# Deviation Report Item
class DeviationItem(BaseModel):
    type: str  # "schedule" or "cost"
    severity: str  # "low", "medium", "high"
    entity_type: str  # "task", "milestone", "project"
    entity_id: str
    entity_name: str
    milestone_name: Optional[str] = None
    planned_value: float
    actual_value: float
    variance: float
    variance_percentage: float
    reason: Optional[str] = None

class DeviationReport(BaseModel):
    project_id: str
    project_name: str
    total_deviations: int = 0
    high_severity_count: int = 0
    medium_severity_count: int = 0
    low_severity_count: int = 0
    schedule_deviations: List[DeviationItem] = []
    cost_deviations: List[DeviationItem] = []

# Project Creation with Templates Request
class ProjectCreateWithTemplates(BaseModel):
    name: str
    client_name: str
    client_contact: Optional[str] = None
    location: Optional[str] = None
    number_of_floors: int = 1
    building_type: BuildingType = BuildingType.RESIDENTIAL
    total_built_area: float = 0  # in sqft
    planned_start_date: datetime
    description: Optional[str] = None
    project_manager_id: Optional[str] = None

    steel_kg_per_cum_foundation: float = 80.0  # kg/m³
    steel_kg_per_cum_column: float = 150.0
    steel_kg_per_cum_beam: float = 120.0
    steel_kg_per_cum_slab: float = 100.0
    # Masonry
    blocks_per_sqm: float = 12.5  # for 8" block
    mortar_per_sqm: float = 0.02  # cum per sqm
    # Wastage factors
    concrete_wastage: float = 0.05  # 5%
    steel_wastage: float = 0.08  # 8%
    block_wastage: float = 0.05  # 5%
    is_active: bool = True

class MaterialPresetCreate(MaterialPresetBase):
    pass

class MaterialPresetResponse(MaterialPresetBase):
    id: str
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# Rate Table - Admin configurable rates by location/date
class RateTableBase(BaseModel):
    name: str  # e.g., "Bangalore Q4 2025"
    location: str
    effective_date: datetime
    # Material rates (per unit)
    cement_per_bag: float = 400.0  # INR
    sand_per_cum: float = 1200.0
    aggregate_per_cum: float = 1400.0
    steel_per_kg: float = 65.0
    block_8inch_per_unit: float = 45.0
    brick_per_unit: float = 8.0
    # Labour rates
    labour_per_sqft: float = 45.0
    # Services
    electrical_per_sqft: float = 120.0
    plumbing_per_sqft: float = 80.0
    painting_per_sqft: float = 35.0
    # Overheads
    contractor_overhead_percent: float = 10.0
    is_active: bool = True

class RateTableCreate(RateTableBase):
    pass

class RateTableResponse(RateTableBase):
    id: str
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# Estimate Line Item (BOQ Item)
class EstimateLineBase(BaseModel):
    category: BOQCategory
    item_name: str  # e.g., "Excavation for foundation"
    description: Optional[str] = None
    unit: str  # cum, sqm, sqft, kg, nos, etc.
    quantity: float
    rate: float  # rate per unit
    amount: float  # quantity * rate
    formula_used: Optional[str] = None  # e.g., "Length × Width × Depth"
    is_user_edited: bool = False  # Track if user overrode auto-calculation
    notes: Optional[str] = None

class EstimateLineCreate(EstimateLineBase):
    pass

class EstimateLineResponse(EstimateLineBase):
    id: str

# Main Estimate Model
class EstimateBase(BaseModel):
    project_id: Optional[str] = None  # Optional - can be linked to project or lead
    lead_id: Optional[str] = None  # Optional - for estimates created from leads
    version: int = 1
    version_name: Optional[str] = None  # e.g., "Initial Estimate", "Revised v2"
    status: EstimateStatus = EstimateStatus.DRAFT
    
    # Input parameters
    built_up_area_sqft: float
    package_type: PackageType
    num_floors: int = 1
    floor_to_floor_height: float = 10.0  # feet
    
    # Floor-wise configuration (NEW)
    floors: Optional[List[Dict[str, Any]]] = None  # List of floor configurations
    has_parking: bool = False
    parking_floors: int = 0  # Number of parking floors
    parking_area_sqft: float = 0.0  # Total parking area
    has_basement: bool = False
    basement_area_sqft: float = 0.0
    has_terrace: bool = False
    terrace_area_sqft: float = 0.0
    
    # Area calculation mode (NEW)
    area_mode: str = "auto"  # "auto" for leads (divide total), "manual" for projects
    
    # Optional advanced inputs
    foundation_depth: Optional[float] = 4.0  # feet
    plinth_beam_height: Optional[float] = 1.5  # feet
    external_wall_thickness: Optional[float] = 9.0  # inches
    internal_wall_thickness: Optional[float] = 4.5  # inches
    slab_thickness: Optional[float] = 5.0  # inches
    column_spacing: Optional[float] = 15.0  # feet (bay size)
    
    # Construction preset for rate reference
    construction_preset_id: Optional[str] = None
    base_rate_per_sqft: Optional[float] = None  # Override rate from preset
    parking_rate_per_sqft: Optional[float] = None  # Separate rate for parking (NEW)
    
    # Coefficients & assumptions
    material_preset_id: Optional[str] = None
    rate_table_id: Optional[str] = None
    parking_rate_table_id: Optional[str] = None  # Separate parking rate table (NEW)
    
    # Adjustments (user can modify)
    contingency_percent: float = 10.0
    labour_percent_of_material: float = 40.0
    material_escalation_percent: float = 0.0
    
    # Calculated totals (populated by backend)
    total_material_cost: float = 0.0
    total_labour_cost: float = 0.0
    total_services_cost: float = 0.0
    total_overhead_cost: float = 0.0
    contingency_cost: float = 0.0
    grand_total: float = 0.0
    cost_per_sqft: float = 0.0
    
    # Floor-wise totals (NEW)
    parking_total: float = 0.0  # Total cost for parking floors
    basement_total: float = 0.0  # Total cost for basement
    terrace_total: float = 0.0  # Total cost for terrace
    
    # Metadata
    assumptions: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    
    # Migration flag (NEW)
    is_floor_wise: bool = False  # True if migrated to floor-wise format

class EstimateCreate(EstimateBase):
    pass

class EstimateUpdate(BaseModel):
    version_name: Optional[str] = None
    status: Optional[EstimateStatus] = None
    contingency_percent: Optional[float] = None
    labour_percent_of_material: Optional[float] = None
    material_escalation_percent: Optional[float] = None
    notes: Optional[str] = None

# Model for adding/updating individual line items
class EstimateLineCreate(BaseModel):
    category: BOQCategory
    item_name: str
    description: Optional[str] = None
    unit: str
    quantity: float
    rate: float

class EstimateLineUpdate(BaseModel):
    item_name: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    quantity: Optional[float] = None
    rate: Optional[float] = None

class EstimateResponse(EstimateBase):
    id: str
    lines: List[EstimateLineResponse] = []  # BOQ line items
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None
    # Review & Approval workflow
    reviewed_by: Optional[str] = None
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_comments: Optional[str] = None
    approved_by: Optional[str] = None
    approved_by_name: Optional[str] = None
    approved_at: Optional[datetime] = None
    approval_comments: Optional[str] = None
    # Client Summary for sharing (NEW)
    summary: Optional[Dict[str, Any]] = None

class EstimateSummary(BaseModel):
    id: str
    project_id: Optional[str] = None
    lead_id: Optional[str] = None
    version: int
    version_name: Optional[str] = None
    status: EstimateStatus
    grand_total: float
    cost_per_sqft: float
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Review & Approval info
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    approved_by_name: Optional[str] = None
    approved_at: Optional[datetime] = None


# ============= Floor-wise Estimate Models =============

class FloorType(str, Enum):
    GROUND = "ground"
    FIRST = "first"
    SECOND = "second"
    THIRD = "third"
    FOURTH = "fourth"
    FIFTH = "fifth"
    SIXTH = "sixth"
    SEVENTH = "seventh"
    EIGHTH = "eighth"
    NINTH = "ninth"
    TENTH = "tenth"
    PARKING = "parking"
    BASEMENT = "basement"
    TERRACE = "terrace"

# Floor names mapping for display
FLOOR_DISPLAY_NAMES = {
    "ground": "Ground Floor",
    "first": "First Floor",
    "second": "Second Floor",
    "third": "Third Floor",
    "fourth": "Fourth Floor",
    "fifth": "Fifth Floor",
    "sixth": "Sixth Floor",
    "seventh": "Seventh Floor",
    "eighth": "Eighth Floor",
    "ninth": "Ninth Floor",
    "tenth": "Tenth Floor",
    "parking": "Parking Floor",
    "basement": "Basement",
    "terrace": "Terrace/Headroom",
}

# Items auto-assigned to specific floors
FLOOR_SPECIFIC_ITEMS = {
    "ground_only": [
        "Excavation for foundation",
        "PCC for foundation",
        "RCC Footing",
        "RCC Plinth Beam",
        "Foundation Steel Reinforcement",
        "Backfilling",
        "Anti-termite treatment",
        "Damp proof course",
    ],
    "top_floor_only": [
        "Roof waterproofing",
        "Roof insulation",
        "Parapet wall",
        "Terrace flooring",
    ],
    "all_floors": [
        "RCC Columns",
        "RCC Beams",
        "RCC Slab",
        "Steel Reinforcement",
        "Block/Brick Masonry",
        "Internal Plastering",
        "External Plastering",
        "Flooring",
        "Wall Tiling",
        "Painting",
        "Electrical wiring",
        "Electrical points",
        "Plumbing",
        "Doors",
        "Windows",
        "UPVC/Aluminium Frames",
    ],
    "parking_specific": [
        "Parking flooring",
        "Parking marking",
        "Parking drainage",
        "Parking lighting",
        "Ramp construction",
    ],
}

class EstimateFloorLine(BaseModel):
    """Line item within a floor"""
    id: Optional[str] = None
    category: BOQCategory
    item_name: str
    description: Optional[str] = None
    unit: str
    quantity: float
    rate: float
    amount: float
    formula_used: Optional[str] = None
    is_user_edited: bool = False
    is_auto_assigned: bool = True  # True if system assigned, False if user added
    notes: Optional[str] = None

class EstimateFloor(BaseModel):
    """Floor within an estimate"""
    id: Optional[str] = None
    floor_type: str  # ground, first, second, parking, etc.
    floor_name: str  # Display name
    floor_number: int = 0  # For ordering (0 = ground, 1 = first, -1 = basement, etc.)
    area_sqft: float
    rate_per_sqft: Optional[float] = None  # Override rate for this floor
    is_parking: bool = False
    is_basement: bool = False
    is_terrace: bool = False
    
    # Calculated totals for this floor
    material_cost: float = 0.0
    labour_cost: float = 0.0
    services_cost: float = 0.0
    floor_total: float = 0.0
    
    # Line items for this floor
    lines: List[EstimateFloorLine] = []

class EstimateFloorCreate(BaseModel):
    """Input for creating a floor"""
    floor_type: str
    area_sqft: float
    rate_per_sqft: Optional[float] = None
    is_parking: bool = False

class EstimateFloorUpdate(BaseModel):
    """Input for updating a floor"""
    area_sqft: Optional[float] = None
    rate_per_sqft: Optional[float] = None

class ParkingRateTable(BaseModel):
    """Separate rate table for parking areas"""
    name: str = "Default Parking Rates"
    location: Optional[str] = None
    # Parking specific rates (typically 50-70% of regular rates)
    rate_multiplier: float = 0.6  # 60% of regular floor rates
    flooring_per_sqft: float = 45.0
    drainage_per_sqft: float = 15.0
    lighting_per_sqft: float = 25.0
    marking_per_sqft: float = 8.0
    ramp_per_sqft: float = 80.0  # Ramp area rate
    is_active: bool = True

class ParkingRateTableResponse(ParkingRateTable):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ============= Company Settings =============

class CompanySettings(BaseModel):
    company_name: str
    logo_url: Optional[str] = None  # URL or base64 encoded image
    logo_base64: Optional[str] = None  # Base64 encoded logo for documents
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: str = "India"
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    # Bank details for invoices
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_branch: Optional[str] = None
    # Document settings
    estimate_terms: Optional[str] = None  # Default terms for estimates
    invoice_terms: Optional[str] = None  # Default terms for invoices
    # Branding
    primary_color: Optional[str] = "#F97316"  # Orange
    secondary_color: Optional[str] = "#1F2937"  # Dark gray

class CompanySettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    logo_url: Optional[str] = None
    logo_base64: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_branch: Optional[str] = None
    estimate_terms: Optional[str] = None
    invoice_terms: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None

class CompanySettingsResponse(CompanySettings):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None


# ============= Construction Presets =============

class ConstructionPresetBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = None
    region: str = Field(..., min_length=2, max_length=100)
    effective_date: datetime
    rate_per_sqft: float = Field(..., ge=0)
    currency: str = Field(default="INR", pattern="^(INR|USD|EUR)$")
    status: str = Field(default="draft", pattern="^(draft|active|archived)$")

class ConstructionPresetCreate(ConstructionPresetBase):
    spec_groups: Optional[List[Dict]] = []

class ConstructionPresetUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = None
    region: Optional[str] = Field(None, min_length=2)
    effective_date: Optional[datetime] = None
    rate_per_sqft: Optional[float] = Field(None, ge=0)
    status: Optional[str] = Field(None, pattern="^(draft|active|archived)$")
    spec_groups: Optional[List[Dict]] = None

class ConstructionPresetResponse(ConstructionPresetBase):
    id: str
    version: int = 1
    created_by: str
    updated_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    spec_groups_count: int = 0
    spec_items_count: int = 0
    project_usage_count: int = 0
    spec_groups: Optional[List[Dict]] = []

class SpecGroupBase(BaseModel):
    group_name: str = Field(..., max_length=100)
    parent_group_id: Optional[str] = None
    order_index: int = 0

class SpecItemBase(BaseModel):
    item_name: str = Field(..., max_length=200)
    unit: str = Field(..., pattern="^(bag|kg|cubic_ft|sqft|unit|meter|liter)$")
    rate_min: float = Field(..., ge=0)
    rate_max: float = Field(..., ge=0)
    currency: str = Field(default="INR")
    material_type: str = Field(..., pattern="^(Brick|Block|Cement|Steel|Finishing|Plumbing|Electrical|Aggregate|Other)$")
    spec_reference: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=1000)
    is_mandatory: bool = True
    supplier_source: Optional[str] = None
    source_url: Optional[str] = None
    source_date: Optional[datetime] = None

class BrandBase(BaseModel):
    brand_name: str = Field(..., max_length=100)
    brand_rate_min: Optional[float] = Field(None, ge=0)
    brand_rate_max: Optional[float] = Field(None, ge=0)
    quality_grade: Optional[str] = None
    supplier_name: Optional[str] = None
    availability_regions: Optional[List[str]] = []

class PresetAuditLog(BaseModel):
    preset_id: str
    action: str = Field(..., pattern="^(CREATE|UPDATE|DELETE|ACTIVATE|ARCHIVE)$")
    user_id: str
    changes: Optional[Dict] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)



# ============= Site Materials Inventory Models =============

class MaterialCondition(str, Enum):
    NEW = "new"
    GOOD = "good"
    FAIR = "fair"
    DAMAGED = "damaged"
    NEEDS_REPAIR = "needs_repair"

class SiteMaterialStatus(str, Enum):
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"

class SiteMaterialBase(BaseModel):
    project_id: str
    material_type: str  # Can be from dropdown or free text
    material_id: Optional[str] = None  # Reference to existing material catalog (if selected)
    quantity: float
    unit: str = "units"
    cost: Optional[float] = None  # Optional
    condition: MaterialCondition = MaterialCondition.NEW
    notes: Optional[str] = None
    media_urls: List[str] = []  # Photo/Video URLs (required at least one)

class SiteMaterialCreate(SiteMaterialBase):
    pass

class SiteMaterialUpdate(BaseModel):
    material_type: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    cost: Optional[float] = None
    condition: Optional[MaterialCondition] = None
    notes: Optional[str] = None
    media_urls: Optional[List[str]] = None
    status: Optional[SiteMaterialStatus] = None
    review_notes: Optional[str] = None

class SiteMaterialResponse(SiteMaterialBase):
    id: str
    status: SiteMaterialStatus = SiteMaterialStatus.PENDING_REVIEW
    added_by: str
    added_by_name: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_by_name: Optional[str] = None
    review_notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    project_name: Optional[str] = None

# ============= Material Transfer Models =============

class TransferDestination(str, Enum):
    PROJECT = "project"
    HQ = "hq"
    MAINTENANCE = "maintenance"

class TransferStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

class MaterialTransferCreate(BaseModel):
    site_material_id: str
    destination_type: TransferDestination
    destination_project_id: Optional[str] = None  # Required if destination_type is PROJECT
    quantity: float
    notes: Optional[str] = None
    media_urls: Optional[List[str]] = []  # Photos/videos taken during transfer

class MaterialTransferResponse(BaseModel):
    id: str
    site_material_id: str
    material_type: str
    quantity: float
    unit: str
    source_project_id: str
    source_project_name: Optional[str] = None
    destination_type: TransferDestination
    destination_project_id: Optional[str] = None
    destination_project_name: Optional[str] = None
    status: TransferStatus = TransferStatus.PENDING
    notes: Optional[str] = None
    initiated_by: str
    initiated_by_name: Optional[str] = None
    accepted_by: Optional[str] = None
    accepted_by_name: Optional[str] = None
    accepted_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

# ============= Notification Models =============

class NotificationType(str, Enum):
    TASK_ASSIGNED = "task_assigned"
    TASK_DUE = "task_due"
    TASK_OVERDUE = "task_overdue"
    TASK_COMPLETED = "task_completed"
    MATERIAL_ADDED = "material_added"
    MATERIAL_REVIEW_REQUIRED = "material_review_required"
    MATERIAL_APPROVED = "material_approved"
    MATERIAL_REJECTED = "material_rejected"
    PROJECT_UPDATE = "project_update"
    EXPENSE_SUBMITTED = "expense_submitted"
    EXPENSE_APPROVED = "expense_approved"
    EXPENSE_REJECTED = "expense_rejected"
    WEEKLY_MATERIAL_REVIEW = "weekly_material_review"
    GENERAL = "general"

class NotificationPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

class NotificationBase(BaseModel):
    user_id: str
    title: str
    message: str
    notification_type: NotificationType = NotificationType.GENERAL
    priority: NotificationPriority = NotificationPriority.NORMAL
    link: Optional[str] = None  # Deep link to related content
    related_entity_type: Optional[str] = None  # e.g., "task", "material", "project"
    related_entity_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class NotificationCreate(NotificationBase):
    pass

class NotificationResponse(NotificationBase):
    id: str
    is_read: bool = False
    read_at: Optional[datetime] = None
    created_at: datetime

class NotificationBulkCreate(BaseModel):
    user_ids: List[str]
    title: str
    message: str
    notification_type: NotificationType = NotificationType.GENERAL
    priority: NotificationPriority = NotificationPriority.NORMAL
    link: Optional[str] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class NotificationStats(BaseModel):
    total: int = 0
    unread: int = 0
    by_type: Dict[str, int] = {}

# ============= Scheduled Jobs Models =============

class ScheduledJobBase(BaseModel):
    job_name: str
    job_type: str  # e.g., "weekly_material_review", "task_reminder"
    schedule: str  # Cron expression or description
    is_active: bool = True
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None

class ScheduledJobResponse(ScheduledJobBase):
    id: str
    created_at: datetime
    updated_at: datetime


# ============= Admin Configuration Models =============

class SMSProviderType(str, Enum):
    TWILIO = "twilio"
    MSG91 = "msg91"
    TEXTLOCAL = "textlocal"
    CUSTOM = "custom"

class SMSConfigBase(BaseModel):
    provider: SMSProviderType = SMSProviderType.TWILIO
    is_enabled: bool = False
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    sender_id: Optional[str] = None
    template_id: Optional[str] = None
    webhook_url: Optional[str] = None

class SMSConfigUpdate(BaseModel):
    provider: Optional[SMSProviderType] = None
    is_enabled: Optional[bool] = None
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    sender_id: Optional[str] = None
    template_id: Optional[str] = None
    webhook_url: Optional[str] = None

class SMSConfigResponse(SMSConfigBase):
    id: str
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None


class WhatsAppConfigBase(BaseModel):
    provider: str = "meta"  # meta, twilio, etc.
    is_enabled: bool = False
    business_account_id: Optional[str] = None
    phone_number_id: Optional[str] = None
    access_token: Optional[str] = None
    webhook_verify_token: Optional[str] = None
    template_namespace: Optional[str] = None

class WhatsAppConfigUpdate(BaseModel):
    provider: Optional[str] = None
    is_enabled: Optional[bool] = None
    business_account_id: Optional[str] = None
    phone_number_id: Optional[str] = None
    access_token: Optional[str] = None
    webhook_verify_token: Optional[str] = None
    template_namespace: Optional[str] = None

class WhatsAppConfigResponse(WhatsAppConfigBase):
    id: str
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None


class DomainRestrictionBase(BaseModel):
    is_enabled: bool = False
    allowed_domains: List[str] = []  # e.g., ["company.com", "corp.company.com"]
    admin_bypass_enabled: bool = True  # Admins can use any email
    error_message: str = "Only corporate email addresses are allowed to access this application."

class DomainRestrictionUpdate(BaseModel):
    is_enabled: Optional[bool] = None
    allowed_domains: Optional[List[str]] = None
    admin_bypass_enabled: Optional[bool] = None
    error_message: Optional[str] = None

class DomainRestrictionResponse(DomainRestrictionBase):
    id: str
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None


class AdminConfigResponse(BaseModel):
    sms_config: Optional[SMSConfigResponse] = None
    whatsapp_config: Optional[WhatsAppConfigResponse] = None
    domain_restriction: Optional[DomainRestrictionResponse] = None
