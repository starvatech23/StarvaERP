# CRM Seed Data - Usage Guide

## Overview
This seed data script creates sample CRM data for testing the role-based access control system.

## What Gets Created

### Users (4)
- **1 CRM Manager**: Full access to all CRM features
- **3 CRM Users**: Limited access (read + create own leads)

### Leads (10)
- 3 leads assigned to CRM Manager
- 7 leads assigned to CRM Users (distributed evenly)
- Various statuses: new, contacted, qualified, negotiation, won, lost
- Different priorities: low, medium, high, urgent
- Budget ranges from ₹10L to ₹1Cr

### Projects (5)
- Each linked to 1-3 leads
- Different statuses: planning, in_progress, on_hold, completed, cancelled
- Various budgets and timelines

### Vendors (6)
- Categories: concrete, steel, electrical, plumbing, hvac, finishing
- Contact details and ratings included

### Materials (15)
- Linked to vendors
- Different units: kg, ton, piece, meter, sq_meter, liter
- Stock levels and unit costs included

### Project Milestones (3-6 per project)
- Standard milestones: Site Preparation, Foundation, Structure, Walls, Electrical/Plumbing, Finishing
- Various completion percentages

## How to Run

### Prerequisites
- MongoDB running on localhost:27017 (or set MONGO_URL)
- Python 3.11+ with required packages installed

### Command
```bash
cd /app/backend
python3 seed_crm_data.py
```

### Environment Variables
The script uses:
- `MONGO_URL`: MongoDB connection string (default: mongodb://localhost:27017)
- `DB_NAME`: Database name (default: construction_db)

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| CRM Manager | crm.manager@test.com | manager123 |
| CRM User 1 | crm.user1@test.com | user1123 |
| CRM User 2 | crm.user2@test.com | user2123 |
| CRM User 3 | crm.user3@test.com | user3123 |

## Idempotency

✅ The script is **idempotent** - safe to run multiple times!

- Checks if data already exists before creating
- Won't create duplicates
- Displays "⏭️ Already exists" for existing records
- Displays "✅ Created" for new records

## Testing Scenarios

### Test CRM Manager Access
1. Login as: crm.manager@test.com / manager123
2. Should see ALL 10 leads
3. Can create, update, delete, and reassign any lead
4. Has full access to all CRM features

### Test CRM User Access
1. Login as: crm.user1@test.com / user1123
2. Should see ONLY leads assigned to them (not all 10)
3. Can create new leads
4. Can update their own leads
5. CANNOT delete leads
6. CANNOT reassign leads to others
7. Trying to update/delete others' leads should return 403 Forbidden

### Test Audit Logging
- All CRM actions are logged in `crm_audit_logs` collection
- Includes successful operations and access denied attempts
- View with:
  ```javascript
  db.crm_audit_logs.find().pretty()
  ```

## Sample CSV Files

Located in `/app/sample_data/`:
- `leads_sample.csv`: 10 sample leads with all fields

Use these for testing import functionality.

## Verification

After running the script, verify in MongoDB:
```javascript
use construction_db

// Check users
db.users.find({role: {$in: ["crm_manager", "crm_user"]}}).count()
// Should return: 4

// Check leads
db.leads.find({is_deleted: {$ne: true}}).count()
// Should return: 10

// Check projects
db.projects.find().count()
// Should return: 5

// Check vendors
db.vendors.find().count()
// Should return: 6

// Check materials
db.materials.find().count()
// Should return: 15

// Check tasks/milestones
db.tasks.find().count()
// Should return: ~19 (3-6 per project)
```

## Cleanup

To remove all seed data and start fresh:
```javascript
use construction_db

// Remove test users
db.users.deleteMany({email: {$regex: "crm\\.(manager|user)"}})

// Remove leads created by seed script
db.leads.deleteMany({name: {$in: ["Rajesh Kumar", "Priya Sharma", ...]}})

// Remove seed projects
db.projects.deleteMany({name: {$regex: "Residential Complex|Commercial Tower|Villa Development|Shopping Mall|Office Building"}})

// Remove seed vendors
db.vendors.deleteMany({name: {$regex: "Solutions|Masters|Bright|Aqua|Cool Air|Premium"}})

// Remove seed materials
db.materials.deleteMany({name: {$in: ["Cement", "Steel Rods", "Bricks", ...]}})

// Remove audit logs
db.crm_audit_logs.deleteMany({})

// Remove activities
db.lead_activities.deleteMany({})
```

## Support

For issues or questions about the seed data, check:
1. MongoDB is running and accessible
2. Environment variables are set correctly
3. Required Python packages are installed
4. Database name matches your configuration
