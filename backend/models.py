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

# User Models
class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    full_name: str
    role: UserRole
    address: Optional[str] = None
    profile_photo: Optional[str] = None  # base64

class UserCreate(UserBase):
    password: Optional[str] = None  # For email auth
    auth_type: str  # 'email' or 'phone'

class UserLogin(BaseModel):
    identifier: str  # email or phone
    password: Optional[str] = None  # For email login
    auth_type: str  # 'email' or 'phone'

class UserResponse(UserBase):
    id: str
    is_active: bool
    date_joined: datetime
    last_login: Optional[datetime] = None

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
    photos: Optional[List[str]] = None

class ProjectResponse(ProjectBase):
    id: str
    project_manager_id: Optional[str] = None
    project_manager_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

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
class MaterialBase(BaseModel):
    name: str
    category: str
    quantity: float
    unit: str  # kg, pcs, bags, etc.
    unit_price: Optional[float] = None
    vendor_id: Optional[str] = None
    project_id: Optional[str] = None
    location: Optional[str] = None
    photos: List[str] = []
    reorder_level: Optional[float] = None

class MaterialCreate(MaterialBase):
    pass

class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    unit_price: Optional[float] = None
    vendor_id: Optional[str] = None
    project_id: Optional[str] = None
    location: Optional[str] = None
    photos: Optional[List[str]] = None
    reorder_level: Optional[float] = None

class MaterialResponse(MaterialBase):
    id: str
    vendor_name: Optional[str] = None
    project_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

# Vendor Models
class VendorBase(BaseModel):
    company_name: str
    contact_person: str
    email: Optional[EmailStr] = None
    phone: str
    address: Optional[str] = None
    materials_supplied: List[str] = []
    rating: Optional[float] = None
    payment_terms: Optional[str] = None

class VendorCreate(VendorBase):
    pass

class VendorUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    materials_supplied: Optional[List[str]] = None
    rating: Optional[float] = None
    payment_terms: Optional[str] = None

class VendorResponse(VendorBase):
    id: str
    created_at: datetime

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
    transfer_time: datetime
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
