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
