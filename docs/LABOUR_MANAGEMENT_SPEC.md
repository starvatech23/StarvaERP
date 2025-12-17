# Labour Management Module - Functional Specification

## Document Information
| Field | Value |
|-------|-------|
| Module | Labour Management |
| Version | 1.0 |
| Status | Draft |
| Last Updated | December 2025 |

---

## 1. Executive Summary

This specification outlines the enhancement of the Labour Management module to include:
- Advance Payment functionality
- Weekly Payment tracking with OTP verification
- Site-based access control
- Comprehensive User Access Control (UAC) rules

---

## 2. Module Structure

### 2.1 Current Structure
```
Labour Management
├── Workers (List & Management)
├── Attendance
├── Site Transfers
└── Reports
```

### 2.2 Enhanced Structure
```
Labour Management
├── Workers (List & Management)
├── Attendance
├── Site Transfers
├── Advance Payments [NEW]
├── Payments [NEW]
│   ├── Weekly Payments
│   ├── Payment History
│   └── OTP Verification
├── Reports
└── Settings
```

---

## 3. Feature Specifications

### 3.1 Advance Payments

#### 3.1.1 Overview
Enable advance payment disbursement to labourers against their future wages.

#### 3.1.2 Data Model

```
AdvancePayment {
  id: ObjectId
  worker_id: ObjectId (ref: Workers)
  project_id: ObjectId (ref: Projects)
  amount: Number (required)
  reason: String (required)
  requested_date: DateTime
  approved_date: DateTime (nullable)
  disbursed_date: DateTime (nullable)
  status: Enum ['requested', 'approved', 'rejected', 'disbursed', 'recovered']
  approved_by: ObjectId (ref: Users, nullable)
  disbursed_by: ObjectId (ref: Users, nullable)
  recovery_mode: Enum ['full', 'installment']
  installment_amount: Number (nullable)
  recovered_amount: Number (default: 0)
  notes: String
  created_at: DateTime
  updated_at: DateTime
}
```

#### 3.1.3 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| AP-01 | Create advance payment request for a worker | High |
| AP-02 | Approve/Reject advance payment request | High |
| AP-03 | Record advance disbursement | High |
| AP-04 | Track recovery against weekly payments | High |
| AP-05 | View advance payment history per worker | Medium |
| AP-06 | Generate advance payment reports | Medium |
| AP-07 | Set maximum advance limit per worker | Medium |
| AP-08 | Auto-deduct from weekly payments | High |

#### 3.1.4 Business Rules

1. **Maximum Advance Limit**: Advance cannot exceed 50% of worker's monthly average earnings (configurable)
2. **Outstanding Check**: New advance not allowed if previous advance > 25% outstanding
3. **Approval Required**: All advances above ₹5,000 require Manager approval
4. **Recovery Period**: Default recovery within 4 weeks (configurable)
5. **Project Association**: Advance must be linked to an active project

#### 3.1.5 Advance Payment Workflow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   REQUEST       │────▶│   APPROVAL      │────▶│  DISBURSEMENT   │
│   INITIATED     │     │   PENDING       │     │   COMPLETE      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       ▼                       ▼
        │               ┌─────────────────┐     ┌─────────────────┐
        │               │   REJECTED      │     │   RECOVERY      │
        │               │                 │     │   IN PROGRESS   │
        │               └─────────────────┘     └─────────────────┘
        │                                               │
        └───────────────────────────────────────────────┘
                                                        ▼
                                                ┌─────────────────┐
                                                │   FULLY         │
                                                │   RECOVERED     │
                                                └─────────────────┘
```

---

### 3.2 Payments Section

#### 3.2.1 Overview
New subsection for managing weekly labourer payments with validation and OTP confirmation.

#### 3.2.2 Data Model

```
WeeklyPayment {
  id: ObjectId
  worker_id: ObjectId (ref: Workers)
  project_id: ObjectId (ref: Projects)
  week_start_date: Date
  week_end_date: Date
  
  // Attendance & Work Details
  days_worked: Number
  hours_worked: Number
  overtime_hours: Number
  
  // Earnings Breakdown
  base_amount: Number
  overtime_amount: Number
  bonus_amount: Number
  gross_amount: Number
  
  // Deductions
  advance_deduction: Number (default: 0)
  other_deductions: Number (default: 0)
  deduction_notes: String
  
  // Net Payment
  net_amount: Number
  
  // Payment Status
  status: Enum ['draft', 'pending_validation', 'validated', 'pending_payment', 'otp_sent', 'paid', 'failed']
  
  // Validation
  validated_by: ObjectId (ref: Users, nullable)
  validated_at: DateTime (nullable)
  validation_notes: String
  
  // OTP Verification
  otp_code: String (hashed, nullable)
  otp_sent_at: DateTime (nullable)
  otp_expires_at: DateTime (nullable)
  otp_attempts: Number (default: 0)
  otp_verified: Boolean (default: false)
  otp_verified_at: DateTime (nullable)
  
  // Payment Completion
  paid_by: ObjectId (ref: Users, nullable)
  paid_at: DateTime (nullable)
  payment_method: Enum ['cash', 'bank_transfer', 'upi', 'cheque']
  payment_reference: String
  
  // Audit
  created_by: ObjectId (ref: Users)
  created_at: DateTime
  updated_at: DateTime
}
```

```
PaymentOTPLog {
  id: ObjectId
  payment_id: ObjectId (ref: WeeklyPayment)
  worker_id: ObjectId (ref: Workers)
  mobile_number: String
  otp_code: String (hashed)
  sent_at: DateTime
  expires_at: DateTime
  verified: Boolean
  verified_at: DateTime (nullable)
  attempts: Number
  ip_address: String
  user_agent: String
}
```

#### 3.2.3 Weekly Payment Display Requirements

| Column | Description | Sortable | Filterable |
|--------|-------------|----------|------------|
| Worker Name | Full name with photo | Yes | Yes |
| Worker ID | Unique identifier | Yes | Yes |
| Project/Site | Assigned project | Yes | Yes |
| Week Period | Start - End date | Yes | Yes |
| Days Worked | Number of days | Yes | No |
| Gross Amount | Total earnings | Yes | No |
| Deductions | Total deductions | Yes | No |
| Net Amount | Final payable | Yes | No |
| Status | Payment status badge | Yes | Yes |
| Actions | Pay, View, Edit buttons | No | No |

#### 3.2.4 Payment Status Definitions

| Status | Description | Badge Color | Next Actions |
|--------|-------------|-------------|--------------|
| `draft` | Payment entry created | Gray | Edit, Validate |
| `pending_validation` | Awaiting validation | Yellow | Validate, Reject |
| `validated` | Amount verified | Blue | Initiate Payment |
| `pending_payment` | Ready for payment | Orange | Send OTP |
| `otp_sent` | OTP sent to worker | Purple | Enter OTP |
| `paid` | Successfully paid | Green | View Receipt |
| `failed` | Payment/OTP failed | Red | Retry |

---

### 3.3 Payment Validation

#### 3.3.1 Validation Rules

```
PaymentValidationRules {
  // Amount Validations
  MIN_PAYMENT_AMOUNT: 100          // Minimum ₹100
  MAX_PAYMENT_AMOUNT: 100000       // Maximum ₹1,00,000
  MAX_DAILY_RATE: 2000             // Maximum ₹2,000/day
  MAX_OVERTIME_MULTIPLIER: 2.0     // Max 2x for overtime
  
  // Attendance Validations
  MAX_DAYS_PER_WEEK: 7
  MAX_HOURS_PER_DAY: 12
  MAX_OVERTIME_HOURS_PER_DAY: 4
  
  // Deduction Validations
  MAX_DEDUCTION_PERCENT: 50        // Max 50% of gross
  
  // OTP Validations
  OTP_LENGTH: 6
  OTP_EXPIRY_MINUTES: 10
  MAX_OTP_ATTEMPTS: 3
  OTP_RESEND_COOLDOWN_SECONDS: 60
}
```

#### 3.3.2 Pre-Payment Validation Checklist

| # | Validation | Error Message | Blocking |
|---|------------|---------------|----------|
| 1 | Worker exists and is active | "Worker not found or inactive" | Yes |
| 2 | Project is active | "Project is not active" | Yes |
| 3 | Amount > 0 | "Payment amount must be positive" | Yes |
| 4 | Amount within limits | "Amount exceeds maximum limit" | Yes |
| 5 | Days worked ≤ 7 | "Days worked cannot exceed 7" | Yes |
| 6 | Hours within limit | "Working hours exceed daily limit" | Yes |
| 7 | Deductions ≤ 50% of gross | "Deductions exceed 50% limit" | Yes |
| 8 | No duplicate payment for week | "Payment already exists for this week" | Yes |
| 9 | Worker has valid mobile | "Worker mobile number not registered" | Yes |
| 10 | Attendance records match | "Attendance mismatch detected" | Warning |

#### 3.3.3 Validation Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    PAYMENT VALIDATION FLOW                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Load Payment   │
                    │     Data        │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Run Automated   │
                    │  Validations    │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │  PASS    │  │ WARNING  │  │  FAIL    │
        │          │  │          │  │          │
        └────┬─────┘  └────┬─────┘  └────┬─────┘
             │              │              │
             │              ▼              ▼
             │       ┌──────────┐  ┌──────────┐
             │       │ Manual   │  │ Return   │
             │       │ Override │  │ w/Errors │
             │       └────┬─────┘  └──────────┘
             │              │
             └──────┬───────┘
                    ▼
           ┌─────────────────┐
           │ Mark as         │
           │ VALIDATED       │
           └─────────────────┘
```

---

### 3.4 OTP Verification System

#### 3.4.1 OTP Generation & Delivery

```
OTP Generation Process:
1. Generate 6-digit random OTP
2. Hash OTP before storing (SHA256)
3. Set expiry time (current + 10 minutes)
4. Send SMS to worker's registered mobile
5. Log OTP attempt in PaymentOTPLog
```

#### 3.4.2 SMS Template

```
[CompanyName] Labour Payment

Dear {worker_name},

Your payment of ₹{amount} for week {week_dates} is ready.

OTP: {otp_code}

Valid for 10 minutes. Do not share this OTP.

- {company_name}
```

#### 3.4.3 OTP Verification Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    OTP VERIFICATION FLOW                         │
└─────────────────────────────────────────────────────────────────┘

  User clicks "Mark as Paid"
           │
           ▼
  ┌─────────────────┐
  │ Validate Worker │──────▶ Invalid ──▶ Show Error
  │ Mobile Number   │
  └────────┬────────┘
           │ Valid
           ▼
  ┌─────────────────┐
  │ Generate OTP    │
  │ (6 digits)      │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Send SMS to     │──────▶ Failed ──▶ Retry/Error
  │ Worker Mobile   │
  └────────┬────────┘
           │ Success
           ▼
  ┌─────────────────┐
  │ Display OTP     │
  │ Input Modal     │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐     ┌─────────────────┐
  │ User Enters OTP │────▶│ Validate OTP    │
  └─────────────────┘     └────────┬────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
              ┌──────────┐  ┌──────────┐  ┌──────────┐
              │  MATCH   │  │ EXPIRED  │  │ INVALID  │
              │          │  │          │  │          │
              └────┬─────┘  └────┬─────┘  └────┬─────┘
                   │              │              │
                   ▼              ▼              ▼
              ┌──────────┐  ┌──────────┐  ┌──────────┐
              │ Mark as  │  │ Resend   │  │ Attempt  │
              │ PAID     │  │ Option   │  │ Counter  │
              └──────────┘  └──────────┘  └────┬─────┘
                                               │
                                    ┌──────────┴──────────┐
                                    │                     │
                                    ▼                     ▼
                              Attempts < 3          Attempts = 3
                                    │                     │
                                    ▼                     ▼
                              ┌──────────┐         ┌──────────┐
                              │ Retry    │         │ LOCKED   │
                              │ Allowed  │         │ (Failed) │
                              └──────────┘         └──────────┘
```

#### 3.4.4 OTP States & UI Behavior

| State | UI Display | Actions Available |
|-------|------------|-------------------|
| Not Sent | "Send OTP" button | Send OTP |
| Sent (Active) | Timer countdown, OTP input field | Enter OTP, Resend (after cooldown) |
| Expired | "OTP Expired" message | Resend OTP |
| Verified | Green checkmark, "Verified" | Complete Payment |
| Failed (Max Attempts) | "Locked" badge, contact admin message | None |

---

## 4. Site-Based Visibility & Access Control

### 4.1 Role Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                      ROLE HIERARCHY                              │
└─────────────────────────────────────────────────────────────────┘

                    ┌─────────────┐
                    │  DIRECTOR   │ ◄── Full Access (All Sites)
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │    HEAD     │ ◄── Full Access (All Sites)
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │   MANAGER   │ ◄── Full Access (All Sites)
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
       ┌──────┴──────┐          ┌──────┴──────┐
       │  PROJECT    │          │   SITE      │
       │  ENGINEER   │          │   ENGINEER  │
       └─────────────┘          └─────────────┘
              │                         │
              └────────────┬────────────┘
                           │
                    ◄── Limited Access (Allocated Sites Only)
```

### 4.2 Access Control Matrix

| Role | View All Sites | View Own Sites | Create Payment | Validate | Approve Advance | Override Validation | Mark Paid |
|------|---------------|----------------|----------------|----------|-----------------|---------------------|-----------|
| Director | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Head | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manager | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Project Engineer | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Site Engineer | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Accountant | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### 4.3 Site Allocation Model

```
UserSiteAllocation {
  id: ObjectId
  user_id: ObjectId (ref: Users)
  project_id: ObjectId (ref: Projects)
  site_id: ObjectId (ref: Sites, nullable)
  role_at_site: String
  allocated_from: Date
  allocated_to: Date (nullable)
  is_active: Boolean
  allocated_by: ObjectId (ref: Users)
  created_at: DateTime
}
```

### 4.4 Data Filtering Logic

```python
def get_accessible_projects(user):
    """
    Returns list of project IDs the user can access
    """
    # Full access roles
    if user.role in ['director', 'head', 'manager', 'admin']:
        return get_all_active_projects()
    
    # Limited access roles
    if user.role in ['project_engineer', 'site_engineer']:
        allocations = UserSiteAllocation.find({
            'user_id': user.id,
            'is_active': True,
            'allocated_to': {'$gte': today()} or None
        })
        return [a.project_id for a in allocations]
    
    return []

def filter_payments_by_access(user, query):
    """
    Apply site-based filtering to payment queries
    """
    accessible_projects = get_accessible_projects(user)
    query['project_id'] = {'$in': accessible_projects}
    return query
```

---

## 5. User Access Control (UAC) - Admin Panel Configuration

### 5.1 UAC Structure for Payments Section

```
LabourPaymentsUAC {
  module: "labour_management"
  section: "payments"
  
  permissions: {
    // View Permissions
    view_payments: Boolean
    view_all_sites: Boolean
    view_payment_details: Boolean
    view_otp_logs: Boolean
    view_reports: Boolean
    
    // Create/Edit Permissions
    create_payment: Boolean
    edit_draft_payment: Boolean
    edit_validated_payment: Boolean
    delete_payment: Boolean
    
    // Validation Permissions
    validate_payment: Boolean
    reject_payment: Boolean
    override_validation: Boolean
    
    // Payment Execution Permissions
    initiate_payment: Boolean
    send_otp: Boolean
    mark_as_paid: Boolean
    mark_as_failed: Boolean
    
    // Advance Payment Permissions
    request_advance: Boolean
    approve_advance: Boolean
    reject_advance: Boolean
    disburse_advance: Boolean
    
    // Administrative
    configure_validation_rules: Boolean
    export_data: Boolean
    bulk_operations: Boolean
  }
}
```

### 5.2 Default Role Permissions

#### 5.2.1 Director / Head

```json
{
  "role": "director",
  "labour_payments": {
    "view_payments": true,
    "view_all_sites": true,
    "view_payment_details": true,
    "view_otp_logs": true,
    "view_reports": true,
    "create_payment": true,
    "edit_draft_payment": true,
    "edit_validated_payment": true,
    "delete_payment": true,
    "validate_payment": true,
    "reject_payment": true,
    "override_validation": true,
    "initiate_payment": true,
    "send_otp": true,
    "mark_as_paid": true,
    "mark_as_failed": true,
    "request_advance": true,
    "approve_advance": true,
    "reject_advance": true,
    "disburse_advance": true,
    "configure_validation_rules": true,
    "export_data": true,
    "bulk_operations": true
  }
}
```

#### 5.2.2 Manager

```json
{
  "role": "manager",
  "labour_payments": {
    "view_payments": true,
    "view_all_sites": true,
    "view_payment_details": true,
    "view_otp_logs": true,
    "view_reports": true,
    "create_payment": true,
    "edit_draft_payment": true,
    "edit_validated_payment": false,
    "delete_payment": false,
    "validate_payment": true,
    "reject_payment": true,
    "override_validation": true,
    "initiate_payment": true,
    "send_otp": true,
    "mark_as_paid": true,
    "mark_as_failed": true,
    "request_advance": true,
    "approve_advance": true,
    "reject_advance": true,
    "disburse_advance": true,
    "configure_validation_rules": false,
    "export_data": true,
    "bulk_operations": true
  }
}
```

#### 5.2.3 Project Engineer

```json
{
  "role": "project_engineer",
  "labour_payments": {
    "view_payments": true,
    "view_all_sites": false,
    "view_payment_details": true,
    "view_otp_logs": false,
    "view_reports": true,
    "create_payment": true,
    "edit_draft_payment": true,
    "edit_validated_payment": false,
    "delete_payment": false,
    "validate_payment": true,
    "reject_payment": false,
    "override_validation": false,
    "initiate_payment": true,
    "send_otp": true,
    "mark_as_paid": true,
    "mark_as_failed": false,
    "request_advance": true,
    "approve_advance": false,
    "reject_advance": false,
    "disburse_advance": false,
    "configure_validation_rules": false,
    "export_data": true,
    "bulk_operations": false
  }
}
```

#### 5.2.4 Site Engineer

```json
{
  "role": "site_engineer",
  "labour_payments": {
    "view_payments": true,
    "view_all_sites": false,
    "view_payment_details": true,
    "view_otp_logs": false,
    "view_reports": false,
    "create_payment": true,
    "edit_draft_payment": true,
    "edit_validated_payment": false,
    "delete_payment": false,
    "validate_payment": false,
    "reject_payment": false,
    "override_validation": false,
    "initiate_payment": true,
    "send_otp": true,
    "mark_as_paid": true,
    "mark_as_failed": false,
    "request_advance": true,
    "approve_advance": false,
    "reject_advance": false,
    "disburse_advance": false,
    "configure_validation_rules": false,
    "export_data": false,
    "bulk_operations": false
  }
}
```

#### 5.2.5 Accountant

```json
{
  "role": "accountant",
  "labour_payments": {
    "view_payments": true,
    "view_all_sites": true,
    "view_payment_details": true,
    "view_otp_logs": true,
    "view_reports": true,
    "create_payment": false,
    "edit_draft_payment": false,
    "edit_validated_payment": false,
    "delete_payment": false,
    "validate_payment": true,
    "reject_payment": true,
    "override_validation": false,
    "initiate_payment": false,
    "send_otp": false,
    "mark_as_paid": true,
    "mark_as_failed": true,
    "request_advance": false,
    "approve_advance": false,
    "reject_advance": false,
    "disburse_advance": true,
    "configure_validation_rules": false,
    "export_data": true,
    "bulk_operations": false
  }
}
```

### 5.3 Admin Panel UAC Configuration UI

#### 5.3.1 Permission Groups Display

```
┌─────────────────────────────────────────────────────────────────┐
│  LABOUR PAYMENTS - USER ACCESS CONTROL                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📋 VIEW PERMISSIONS                                      │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ☑ View Payments List                                    │   │
│  │ ☑ View All Sites (unchecked = own sites only)          │   │
│  │ ☑ View Payment Details                                  │   │
│  │ ☐ View OTP Logs                                         │   │
│  │ ☑ View Reports                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✏️ CREATE/EDIT PERMISSIONS                               │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ☑ Create Payment Entry                                  │   │
│  │ ☑ Edit Draft Payments                                   │   │
│  │ ☐ Edit Validated Payments                               │   │
│  │ ☐ Delete Payments                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✅ VALIDATION PERMISSIONS                                │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ☑ Validate Payment                                      │   │
│  │ ☐ Reject Payment                                        │   │
│  │ ☐ Override Validation Errors                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 💰 PAYMENT EXECUTION PERMISSIONS                         │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ☑ Initiate Payment                                      │   │
│  │ ☑ Send OTP                                              │   │
│  │ ☑ Mark as Paid                                          │   │
│  │ ☐ Mark as Failed                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 💵 ADVANCE PAYMENT PERMISSIONS                           │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ☑ Request Advance                                       │   │
│  │ ☐ Approve Advance                                       │   │
│  │ ☐ Reject Advance                                        │   │
│  │ ☐ Disburse Advance                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ⚙️ ADMINISTRATIVE PERMISSIONS                            │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ☐ Configure Validation Rules                            │   │
│  │ ☑ Export Data                                           │   │
│  │ ☐ Bulk Operations                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Save Changes]  [Reset to Default]  [Cancel]                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. API Specifications

### 6.1 Advance Payments APIs

| Method | Endpoint | Description | Auth Required | Permissions |
|--------|----------|-------------|---------------|-------------|
| GET | `/api/labour/advances` | List advance payments | Yes | view_payments |
| GET | `/api/labour/advances/{id}` | Get advance details | Yes | view_payment_details |
| POST | `/api/labour/advances` | Create advance request | Yes | request_advance |
| PUT | `/api/labour/advances/{id}/approve` | Approve advance | Yes | approve_advance |
| PUT | `/api/labour/advances/{id}/reject` | Reject advance | Yes | reject_advance |
| PUT | `/api/labour/advances/{id}/disburse` | Mark as disbursed | Yes | disburse_advance |
| GET | `/api/labour/workers/{id}/advances` | Worker's advance history | Yes | view_payments |

### 6.2 Weekly Payments APIs

| Method | Endpoint | Description | Auth Required | Permissions |
|--------|----------|-------------|---------------|-------------|
| GET | `/api/labour/payments` | List weekly payments | Yes | view_payments |
| GET | `/api/labour/payments/{id}` | Get payment details | Yes | view_payment_details |
| POST | `/api/labour/payments` | Create payment entry | Yes | create_payment |
| PUT | `/api/labour/payments/{id}` | Update payment | Yes | edit_draft_payment |
| DELETE | `/api/labour/payments/{id}` | Delete payment | Yes | delete_payment |
| POST | `/api/labour/payments/{id}/validate` | Validate payment | Yes | validate_payment |
| POST | `/api/labour/payments/{id}/send-otp` | Send OTP to worker | Yes | send_otp |
| POST | `/api/labour/payments/{id}/verify-otp` | Verify OTP | Yes | mark_as_paid |
| POST | `/api/labour/payments/{id}/mark-paid` | Mark as paid | Yes | mark_as_paid |
| GET | `/api/labour/payments/weekly-summary` | Weekly payment summary | Yes | view_reports |

### 6.3 UAC APIs

| Method | Endpoint | Description | Auth Required | Permissions |
|--------|----------|-------------|---------------|-------------|
| GET | `/api/admin/uac/labour-payments` | Get UAC config | Yes | Admin only |
| PUT | `/api/admin/uac/labour-payments/{role}` | Update role permissions | Yes | Admin only |
| GET | `/api/admin/uac/labour-payments/roles` | List all role configs | Yes | Admin only |

---

## 7. UI/UX Specifications

### 7.1 Payments List Screen

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Labour    Weekly Payments                    [Filter] [+ New]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Week: Dec 9 - Dec 15, 2025              Project: [All Sites ▼] │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ○ Rajesh Kumar          Site A     ₹8,500    [PENDING]  │   │
│  │   ID: WRK-001           5 days     -₹500 adv  [Validate]│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ○ Suresh Patel          Site B     ₹7,200    [VALIDATED]│   │
│  │   ID: WRK-002           6 days     No ded.   [Send OTP] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✓ Amit Singh            Site A     ₹9,000    [PAID]     │   │
│  │   ID: WRK-003           6 days     -₹1000    [Receipt]  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Summary: 15 Workers | ₹1,25,000 Total | 10 Paid | 5 Pending   │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 OTP Verification Modal

```
┌─────────────────────────────────────────────────────────────────┐
│                    Verify Payment OTP                     [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                         📱                                      │
│                                                                 │
│     OTP sent to: +91 98XXX XXX45                               │
│     (Rajesh Kumar's registered mobile)                         │
│                                                                 │
│     ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│     │  4  │ │  7  │ │  2  │ │  _  │ │  _  │ │  _  │           │
│     └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘           │
│                                                                 │
│     Expires in: 08:45                                          │
│                                                                 │
│     Didn't receive? [Resend OTP] (available in 45s)            │
│                                                                 │
│     Payment Amount: ₹8,500                                     │
│                                                                 │
│                    [Verify & Complete Payment]                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 Advance Payment Request Form

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back       Request Advance Payment                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Worker *                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🔍 Search worker by name or ID...                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Selected: Rajesh Kumar (WRK-001)                              │
│  Current Outstanding: ₹2,000                                   │
│  Eligible Advance: Up to ₹8,000                                │
│                                                                 │
│  Project/Site *                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Site A - Green Valley Project                        ▼  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Advance Amount *                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ₹ 5,000                                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Reason *                                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Medical emergency - family member hospitalized          │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Recovery Mode *                                               │
│  ◉ Full (Deduct from next payment)                            │
│  ○ Installment (₹ [____] per week)                            │
│                                                                 │
│  ⚠️ Requires Manager approval (amount > ₹5,000)                │
│                                                                 │
│                    [Submit Request]                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Error Handling

### 8.1 Error Codes

| Code | Message | Resolution |
|------|---------|------------|
| LP001 | Worker not found | Verify worker ID exists |
| LP002 | Project not accessible | Check site allocation |
| LP003 | Payment already exists | View existing payment |
| LP004 | Validation failed | Review validation errors |
| LP005 | OTP expired | Resend OTP |
| LP006 | Invalid OTP | Re-enter correct OTP |
| LP007 | Max OTP attempts exceeded | Contact administrator |
| LP008 | Insufficient permissions | Contact administrator |
| LP009 | Advance limit exceeded | Reduce amount or clear outstanding |
| LP010 | SMS delivery failed | Verify mobile number |

### 8.2 Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "LP004",
    "message": "Payment validation failed",
    "details": [
      {
        "field": "days_worked",
        "issue": "Days worked (8) exceeds maximum (7)",
        "blocking": true
      },
      {
        "field": "overtime_hours",
        "issue": "Overtime exceeds daily limit",
        "blocking": false
      }
    ]
  },
  "timestamp": "2025-12-17T10:30:00Z"
}
```

---

## 9. Audit & Logging

### 9.1 Audit Events

| Event | Data Captured | Retention |
|-------|---------------|-----------|
| Payment Created | User, worker, amount, project | 7 years |
| Payment Validated | User, validation result, notes | 7 years |
| OTP Sent | User, worker mobile, timestamp | 1 year |
| OTP Verified | User, success/failure, attempts | 1 year |
| Payment Completed | User, amount, method, reference | 7 years |
| Advance Requested | User, worker, amount, reason | 7 years |
| Advance Approved/Rejected | User, decision, notes | 7 years |
| Permission Changed | Admin, role, old/new values | 7 years |

### 9.2 Audit Log Schema

```
PaymentAuditLog {
  id: ObjectId
  event_type: String
  entity_type: String ['payment', 'advance', 'uac']
  entity_id: ObjectId
  user_id: ObjectId
  user_name: String
  user_role: String
  action: String
  old_values: Object
  new_values: Object
  ip_address: String
  user_agent: String
  timestamp: DateTime
  project_id: ObjectId (nullable)
}
```

---

## 10. Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Create database models (AdvancePayment, WeeklyPayment, PaymentOTPLog)
- [ ] Implement site-based filtering middleware
- [ ] Set up UAC permission system
- [ ] Create audit logging service

### Phase 2: Advance Payments
- [ ] Advance request API
- [ ] Approval workflow API
- [ ] Disbursement tracking
- [ ] Recovery integration with weekly payments
- [ ] Advance payments UI screens

### Phase 3: Weekly Payments
- [ ] Payment CRUD APIs
- [ ] Validation engine
- [ ] Weekly payment list UI
- [ ] Payment detail/edit UI

### Phase 4: OTP System
- [ ] OTP generation service
- [ ] SMS integration (Twilio/MSG91)
- [ ] OTP verification API
- [ ] OTP UI modal

### Phase 5: Admin Panel
- [ ] UAC configuration UI
- [ ] Permission management APIs
- [ ] Role-based UI rendering
- [ ] Audit log viewer

### Phase 6: Testing & QA
- [ ] Unit tests for validation rules
- [ ] Integration tests for payment flow
- [ ] UAC permission tests
- [ ] OTP flow testing
- [ ] Cross-browser testing

---

## 11. Appendix

### A. Glossary

| Term | Definition |
|------|------------|
| UAC | User Access Control |
| OTP | One-Time Password |
| Advance Payment | Pre-disbursement of wages before work completion |
| Weekly Payment | Regular salary disbursement for work completed in a week |
| Site Allocation | Assignment of user to specific project/site |

### B. Related Documents

- User Roles & Permissions Master Document
- SMS Gateway Integration Guide
- Financial Compliance Requirements
- Data Retention Policy

### C. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 2025 | System | Initial specification |

---

*End of Specification Document*
