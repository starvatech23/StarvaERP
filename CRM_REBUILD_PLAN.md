# CRM Module Rebuild Plan - Phase 2

## Overview
Build a production-ready CRM Lead Management module from scratch with proper authentication, inline editing, activity tracking, and mock integrations.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      CRM Module                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Lead       │  │   Activity   │  │   Category   │      │
│  │  Management  │  │   Timeline   │  │   Funnel     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   WhatsApp   │  │  Click-to-   │  │    Admin     │      │
│  │    (Mock)    │  │    Call      │  │    Config    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 2.1: Backend Models & Data Structures

### 1. Lead Model
```python
class Lead:
    - id: ObjectId
    - name: str (client/company name)
    - primary_phone: str (E.164 format)
    - alternate_phone: Optional[str]
    - email: Optional[EmailStr]
    - city: Optional[str]
    - budget: Optional[float]
    - budget_currency: str (default: INR)
    - requirement: Optional[str] (project description)
    - category_id: str (reference to LeadCategory)
    - status: LeadStatus (new, contacted, qualified, proposal, won, lost)
    - assigned_to: Optional[str] (user_id)
    - source: LeadSource (website, referral, social_media, etc.)
    - priority: LeadPriority (low, medium, high, urgent)
    - tags: List[str]
    - whatsapp_consent: bool
    - last_contacted: Optional[datetime]
    - next_appointment: Optional[datetime]
    - created_by: str
    - created_at: datetime
    - updated_at: datetime
```

### 2. LeadCategory Model (Custom Funnel)
```python
class LeadCategory:
    - id: ObjectId
    - name: str
    - description: Optional[str]
    - color: str (hex color for UI)
    - order: int (for sorting)
    - is_active: bool
    - is_system: bool (system categories can't be deleted)
    - created_at: datetime
    - updated_at: datetime
```

### 3. LeadActivity Model (Timeline)
```python
class LeadActivity:
    - id: ObjectId
    - lead_id: str
    - activity_type: ActivityType (call, whatsapp, email, meeting, note, status_change)
    - title: str
    - description: Optional[str]
    - # Call specific fields
    - call_duration: Optional[int] (seconds)
    - call_outcome: Optional[CallOutcome]
    - # WhatsApp specific
    - whatsapp_message_id: Optional[str]
    - whatsapp_status: Optional[WhatsAppStatus]
    - # Meeting specific
    - meeting_date: Optional[datetime]
    - meeting_location: Optional[str]
    - # Audit fields
    - performed_by: str (user_id)
    - created_at: datetime
```

### 4. LeadFieldAudit Model (Field-Level Changes)
```python
class LeadFieldAudit:
    - id: ObjectId
    - lead_id: str
    - field_name: str
    - old_value: Any
    - new_value: Any
    - changed_by: str (user_id)
    - changed_at: datetime
```

### 5. CRMConfig Model (Admin Settings)
```python
class CRMConfig:
    - id: ObjectId
    - # WhatsApp Mock Settings
    - whatsapp_enabled: bool
    - whatsapp_api_key: Optional[str] (mock)
    - whatsapp_template_on_create: Optional[str]
    - # Telephony Mock Settings
    - telephony_enabled: bool
    - telephony_provider: Optional[str]
    - # Auto-assignment
    - auto_assign_enabled: bool
    - auto_assign_strategy: str (round_robin, least_assigned)
    - updated_by: str
    - updated_at: datetime
```

---

## Phase 2.2: Backend API Routes

### Authentication Strategy
**CRITICAL FIX:** Use proper Depends() pattern to avoid 403 errors
```python
@api_router.post("/api/crm/leads")
async def create_lead(
    lead: LeadCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    current_user = await get_current_user(credentials)
    # Ensure current_user has all required fields
    # Check role using current_user.get("role") or current_user["role"]
```

### Lead Management Routes
1. **GET /api/crm/leads**
   - Query params: category_id, status, assigned_to, source, priority, search
   - Response: List[LeadResponse] with pagination
   - Auth: Admin, PM, Sales

2. **POST /api/crm/leads**
   - Body: LeadCreate
   - Auto-trigger: WhatsApp message if enabled
   - Create activity log entry
   - Response: LeadResponse
   - Auth: Admin, PM, Sales

3. **GET /api/crm/leads/{lead_id}**
   - Response: LeadResponse with activity timeline
   - Auth: Admin, PM, Sales, assigned user

4. **PUT /api/crm/leads/{lead_id}**
   - Body: LeadUpdate (partial updates supported)
   - Create field audit logs for changes
   - Create activity log for status changes
   - Response: LeadResponse
   - Auth: Admin, PM, Sales, assigned user

5. **DELETE /api/crm/leads/{lead_id}**
   - Soft delete (set is_deleted flag)
   - Auth: Admin only

### Lead Category Routes
6. **GET /api/crm/categories**
   - Response: List[LeadCategoryResponse] with lead counts
   - Auth: Admin, PM, Sales

7. **POST /api/crm/categories**
   - Body: LeadCategoryCreate
   - Response: LeadCategoryResponse
   - Auth: Admin only

8. **PUT /api/crm/categories/{category_id}**
   - Body: LeadCategoryUpdate
   - Response: LeadCategoryResponse
   - Auth: Admin only

9. **PUT /api/crm/categories/reorder**
   - Body: List[{id, order}]
   - Update order for all categories
   - Auth: Admin only

### Activity Timeline Routes
10. **GET /api/crm/leads/{lead_id}/activities**
    - Response: List[LeadActivityResponse]
    - Auth: Admin, PM, Sales, assigned user

11. **POST /api/crm/leads/{lead_id}/activities**
    - Body: LeadActivityCreate
    - Support all activity types
    - Response: LeadActivityResponse
    - Auth: Admin, PM, Sales, assigned user

### Bulk Operations
12. **POST /api/crm/leads/bulk-update**
    - Body: {lead_ids: List[str], updates: Dict}
    - Update multiple leads at once
    - Auth: Admin, PM

13. **POST /api/crm/leads/bulk-assign**
    - Body: {lead_ids: List[str], assigned_to: str}
    - Bulk assignment
    - Auth: Admin, PM

14. **POST /api/crm/leads/import**
    - Body: List[LeadImportItem]
    - Bulk import from CSV/Excel
    - Auth: Admin, PM

### CRM Configuration
15. **GET /api/crm/config**
    - Response: CRMConfigResponse
    - Auth: Admin

16. **PUT /api/crm/config**
    - Body: CRMConfigUpdate
    - Response: CRMConfigResponse
    - Auth: Admin only

### Mock Integrations
17. **POST /api/crm/leads/{lead_id}/call**
    - Body: {duration, outcome, notes}
    - Mock call logging
    - Create activity entry
    - Auth: Admin, PM, Sales, assigned user

18. **POST /api/crm/leads/{lead_id}/whatsapp**
    - Body: {message, template_id}
    - Mock WhatsApp send
    - Create activity entry
    - Auth: Admin, PM, Sales, assigned user

---

## Phase 2.3: Frontend Screens

### Mobile-First Design Principles
- **Inline Editing**: Tap any field to edit directly
- **Gesture Support**: Swipe actions for quick operations
- **Touch Targets**: Minimum 44x44 points
- **Bottom Sheets**: For forms and filters
- **Pull-to-Refresh**: On all list screens

### Screen Structure
```
/app/frontend/app/crm/
├── index.tsx                    # Main CRM dashboard
├── leads/
│   ├── index.tsx               # Lead list/board view
│   ├── [id].tsx                # Lead detail with timeline
│   ├── create.tsx              # Create lead form
│   └── import.tsx              # Bulk import screen
├── categories/
│   ├── index.tsx               # Category management
│   └── reorder.tsx             # Drag-to-reorder categories
└── settings/
    └── index.tsx               # CRM configuration (admin)
```

### 1. Lead List Screen (`/crm/leads/index.tsx`)
**Features:**
- Segmented control: List view / Board view (by category)
- Filter bar: Category, Status, Assigned To, Source, Priority
- Search bar with debounce
- Inline-editable lead cards:
  - Tap name → Edit name
  - Tap phone → Click-to-call menu (Call / WhatsApp)
  - Tap email → Email client
  - Tap budget → Edit inline
  - Tap status → Status picker
  - Tap category → Move to category
- Card actions menu (3-dot): Edit, Delete, Assign, Add Activity
- FAB button: Create new lead
- Empty state with CTA

**Board View:**
- Horizontal scrollable columns (one per category)
- Drag-and-drop to move between categories
- Cards show: Name, Phone, Budget, Assigned To avatar

### 2. Lead Detail Screen (`/crm/leads/[id].tsx`)
**Features:**
- Header with back button and edit icon
- Lead info card (all fields inline-editable)
- Action buttons row:
  - Call button → Opens tel: URI
  - WhatsApp button → Opens WhatsApp with pre-filled message
  - Email button → Opens email client
  - Schedule Meeting button → Calendar picker
- Activity Timeline section:
  - Chronological list of all activities
  - Filter: All / Calls / WhatsApp / Meetings / Notes
  - Add Activity FAB
- Field Audit History (collapsible section)

### 3. Create Lead Screen (`/crm/leads/create.tsx`)
**Features:**
- Form with all lead fields
- Phone number validation
- Email validation
- Category picker (required)
- WhatsApp consent toggle
- Auto-send WhatsApp message toggle
- Submit button with loading state
- Cancel button

### 4. Category Management Screen (`/crm/categories/index.tsx`)
**Features:**
- List of categories with lead counts
- Color picker for each category
- Add category button
- Edit/Delete actions
- Reorder button → Navigate to reorder screen

### 5. Reorder Categories Screen (`/crm/categories/reorder.tsx`)
**Features:**
- Drag-and-drop list
- Visual feedback during drag
- Save button
- Cancel button

### 6. CRM Settings Screen (`/crm/settings/index.tsx`)
**Features:**
- WhatsApp Configuration section:
  - Enable/Disable toggle
  - Mock API key input
  - Template message editor
- Telephony Configuration section:
  - Enable/Disable toggle
  - Provider selection
- Auto-Assignment section:
  - Enable/Disable toggle
  - Strategy picker (Round Robin / Least Assigned)
- Save button (Admin only)

---

## Phase 2.4: Implementation Order

### Step 1: Backend Foundation (Day 1)
1. Create all model classes in `models.py`
2. Create enum types (LeadStatus, LeadSource, ActivityType, etc.)
3. Test models with sample data

### Step 2: Core Lead APIs (Day 1-2)
1. Implement GET /api/crm/leads with filtering
2. Implement POST /api/crm/leads with WhatsApp trigger
3. Implement PUT /api/crm/leads with audit logging
4. Implement GET /api/crm/leads/{id}
5. Test all endpoints with curl/Postman

### Step 3: Category & Activity APIs (Day 2)
1. Implement category CRUD
2. Implement activity timeline APIs
3. Implement reorder endpoint
4. Test all endpoints

### Step 4: Frontend Lead List (Day 2-3)
1. Create lead list screen with cards
2. Implement inline editing
3. Implement filters
4. Add click-to-call and WhatsApp actions
5. Test on mobile

### Step 5: Frontend Lead Detail (Day 3)
1. Create lead detail screen
2. Implement activity timeline
3. Add action buttons
4. Test inline editing

### Step 6: Category Management (Day 3-4)
1. Create category management screen
2. Implement reorder screen
3. Test drag-and-drop

### Step 7: Admin Configuration (Day 4)
1. Create settings screen
2. Implement mock integration toggles
3. Test configuration persistence

### Step 8: Bulk Operations (Day 4)
1. Implement bulk update/assign APIs
2. Create import screen
3. Test with sample data

### Step 9: Testing & Polish (Day 5)
1. Comprehensive backend testing with testing agent
2. Frontend UI/UX testing
3. Fix any bugs
4. Polish animations and transitions

---

## Key Differences from Failed Attempt

### ✅ What We're Doing Differently:

1. **Authentication Handling**
   - Previous: Inconsistent use of `current_user.get('role_name')`
   - New: Consistent use of `current_user["role"]` with proper error handling

2. **Route Structure**
   - Previous: All routes mixed in server.py
   - New: Clean, organized routes with clear auth patterns

3. **Testing Approach**
   - Previous: Implemented everything, then tested
   - New: Incremental testing after each API group

4. **Error Handling**
   - Previous: Generic exceptions
   - New: Specific error messages with proper HTTP status codes

5. **Data Validation**
   - Previous: Minimal validation
   - New: Pydantic models with strict validation

---

## Success Criteria

✅ All lead CRUD operations working without 403 errors
✅ Inline editing functional on mobile
✅ Click-to-call and WhatsApp integration working (mock)
✅ Activity timeline displaying correctly
✅ Category management with reorder working
✅ Admin configuration persisting correctly
✅ Field-level audit logs capturing changes
✅ Bulk operations functional
✅ All tests passing (backend and frontend)

---

## Estimated Timeline

- **Phase 2.1-2.2 (Backend):** 2 days
- **Phase 2.3 (Frontend):** 2-3 days
- **Phase 2.4 (Testing & Polish):** 1 day
- **Total:** 5-6 days

---

## Risk Mitigation

1. **Authentication Issues**
   - Mitigation: Test auth on each endpoint immediately after creation
   - Fallback: Use optional auth with manual role checking

2. **Mobile Performance**
   - Mitigation: Use FlashList for lead lists
   - Fallback: Pagination with smaller page sizes

3. **Complex Inline Editing**
   - Mitigation: Start with simple text fields, iterate
   - Fallback: Separate edit screen if inline proves too complex

---

## Next Immediate Action

Once approved, I will:
1. Create comprehensive models in `models.py`
2. Implement core lead APIs with proper authentication
3. Test each endpoint immediately after creation
4. Move to frontend only after backend is verified working

Ready to proceed? 🚀
