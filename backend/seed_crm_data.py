"""
CRM Seed Data Script
Creates sample data for CRM module with proper relationships
Idempotent - can be run multiple times without duplication
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
from bson import ObjectId
import random
from dotenv import load_dotenv
import sys

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from auth import get_password_hash

load_dotenv()

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'construction_db')

# Sample data
LEAD_SOURCES = ["website", "referral", "cold_call", "social_media", "advertisement"]
LEAD_STATUSES = ["new", "contacted", "qualified", "negotiation", "won", "lost"]
LEAD_PRIORITIES = ["low", "medium", "high", "urgent"]
PROJECT_STATUSES = ["planning", "in_progress", "on_hold", "completed", "cancelled"]
VENDOR_CATEGORIES = ["concrete", "steel", "electrical", "plumbing", "hvac", "finishing"]
MATERIAL_UNITS = ["kg", "ton", "piece", "meter", "sq_meter", "liter"]

# Sample names
LEAD_NAMES = [
    "Rajesh Kumar", "Priya Sharma", "Amit Patel", "Sneha Gupta", "Vikram Singh",
    "Anita Desai", "Rohit Mehta", "Kavita Reddy", "Suresh Nair", "Pooja Joshi"
]

VENDOR_NAMES = [
    "Concrete Solutions Pvt Ltd", "Steel Masters India", "Bright Electricals",
    "Aqua Plumbing Services", "Cool Air HVAC", "Premium Finishers"
]

MATERIAL_NAMES = [
    "Cement", "Steel Rods", "Bricks", "Sand", "Aggregate",
    "Electrical Wiring", "PVC Pipes", "Paint", "Tiles", "Glass Panels",
    "AC Units", "Light Fixtures", "Door Frames", "Window Frames", "Nails"
]

PROJECT_NAMES = [
    "Residential Complex - Green Valley",
    "Commercial Tower - Tech Park",
    "Villa Development - Palm Grove",
    "Shopping Mall - City Center",
    "Office Building - Corporate Hub"
]

async def create_test_users(db):
    """Create test CRM Manager and CRM User accounts"""
    print("\n1. Creating test users...")
    
    users = []
    
    # CRM Manager
    manager = await db.users.find_one({"email": "crm.manager@test.com"})
    if not manager:
        manager_data = {
            "email": "crm.manager@test.com",
            "full_name": "CRM Manager",
            "phone": "+919876543210",
            "password_hash": get_password_hash("manager123"),
            "role": "crm_manager",
            "approval_status": "approved",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        result = await db.users.insert_one(manager_data)
        manager_data["_id"] = result.inserted_id
        users.append(manager_data)
        print(f"   ✅ Created CRM Manager: crm.manager@test.com / manager123")
    else:
        users.append(manager)
        print(f"   ⏭️  CRM Manager already exists")
    
    # CRM Users (3)
    for i in range(1, 4):
        user = await db.users.find_one({"email": f"crm.user{i}@test.com"})
        if not user:
            user_data = {
                "email": f"crm.user{i}@test.com",
                "full_name": f"CRM User {i}",
                "phone": f"+9198765432{10+i}",
                "password_hash": get_password_hash(f"user{i}123"),
                "role": "crm_user",
                "approval_status": "approved",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            result = await db.users.insert_one(user_data)
            user_data["_id"] = result.inserted_id
            users.append(user_data)
            print(f"   ✅ Created CRM User {i}: crm.user{i}@test.com / user{i}123")
        else:
            users.append(user)
            print(f"   ⏭️  CRM User {i} already exists")
    
    return users

async def create_lead_category(db):
    """Create a default lead category"""
    print("\n2. Creating lead category...")
    
    category = await db.lead_categories.find_one({"name": "Residential"})
    if not category:
        category_data = {
            "name": "Residential",
            "description": "Residential construction projects",
            "color": "#3B82F6",
            "order": 1,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        result = await db.lead_categories.insert_one(category_data)
        category_data["_id"] = result.inserted_id
        print(f"   ✅ Created category: Residential")
        return category_data
    else:
        print(f"   ⏭️  Category already exists")
        return category

async def create_leads(db, users, category_id):
    """Create 10 sample leads"""
    print("\n3. Creating 10 leads...")
    
    leads = []
    manager = users[0]  # First user is manager
    crm_users = users[1:]  # Rest are CRM users
    
    for i, name in enumerate(LEAD_NAMES):
        # Check if lead already exists
        existing = await db.leads.find_one({"name": name, "is_deleted": {"$ne": True}})
        if existing:
            leads.append(existing)
            print(f"   ⏭️  Lead already exists: {name}")
            continue
        
        # Assign: 3 to manager, 7 to users
        if i < 3:
            assigned_to = str(manager["_id"])
            assigned_to_name = manager["full_name"]
        else:
            user = crm_users[(i - 3) % len(crm_users)]
            assigned_to = str(user["_id"])
            assigned_to_name = user["full_name"]
        
        lead_data = {
            "name": name,
            "primary_phone": f"+9198765{43210 + i}",
            "email": f"{name.lower().replace(' ', '.')}@example.com",
            "source": random.choice(LEAD_SOURCES),
            "status": random.choice(LEAD_STATUSES),
            "priority": random.choice(LEAD_PRIORITIES),
            "category_id": str(category_id),
            "assigned_to": assigned_to,
            "budget_min": random.randint(10, 50) * 100000,
            "budget_max": random.randint(60, 100) * 100000,
            "notes": f"Sample lead for {name}",
            "created_by": str(manager["_id"]),
            "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 30)),
            "updated_at": datetime.utcnow(),
            "is_deleted": False,
            "whatsapp_consent": random.choice([True, False])
        }
        
        result = await db.leads.insert_one(lead_data)
        lead_data["_id"] = result.inserted_id
        leads.append(lead_data)
        
        # Create initial activity
        activity = {
            "lead_id": str(result.inserted_id),
            "activity_type": "note",
            "title": "Lead Created",
            "description": f"Lead created and assigned to {assigned_to_name}",
            "performed_by": str(manager["_id"]),
            "created_at": lead_data["created_at"]
        }
        await db.lead_activities.insert_one(activity)
        
        print(f"   ✅ Created lead: {name} (assigned to {assigned_to_name})")
    
    return leads

async def create_projects(db, leads, manager):
    """Create 5 projects linked to leads"""
    print("\n4. Creating 5 projects...")
    
    projects = []
    
    for i, project_name in enumerate(PROJECT_NAMES):
        # Check if project already exists
        existing = await db.projects.find_one({"name": project_name})
        if existing:
            projects.append(existing)
            print(f"   ⏭️  Project already exists: {project_name}")
            continue
        
        # Link to 1-3 leads
        linked_leads = random.sample(leads, random.randint(1, min(3, len(leads))))
        
        start_date = datetime.utcnow() + timedelta(days=random.randint(1, 30))
        
        project_data = {
            "name": project_name,
            "description": f"Sample project: {project_name}",
            "status": random.choice(PROJECT_STATUSES),
            "start_date": start_date,
            "end_date": start_date + timedelta(days=random.randint(90, 365)),
            "budget": random.randint(50, 200) * 100000,
            "project_manager_id": str(manager["_id"]),
            "address": f"{i+1}, Construction Site Road, City",
            "client_name": linked_leads[0]["name"],
            "client_phone": linked_leads[0]["primary_phone"],
            "team_member_ids": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await db.projects.insert_one(project_data)
        project_data["_id"] = result.inserted_id
        projects.append(project_data)
        
        print(f"   ✅ Created project: {project_name} (linked to {len(linked_leads)} leads)")
    
    return projects

async def create_vendors(db):
    """Create 6 vendors"""
    print("\n5. Creating 6 vendors...")
    
    vendors = []
    
    for i, (name, category) in enumerate(zip(VENDOR_NAMES, VENDOR_CATEGORIES)):
        # Check if vendor already exists
        existing = await db.vendors.find_one({"name": name})
        if existing:
            vendors.append(existing)
            print(f"   ⏭️  Vendor already exists: {name}")
            continue
        
        vendor_data = {
            "name": name,
            "category": category,
            "contact_person": f"Contact Person {i+1}",
            "phone": f"+9198765{43220 + i}",
            "email": f"contact@{name.lower().replace(' ', '')}.com",
            "address": f"{i+1}, Vendor Street, City",
            "rating": random.randint(3, 5),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await db.vendors.insert_one(vendor_data)
        vendor_data["_id"] = result.inserted_id
        vendors.append(vendor_data)
        
        print(f"   ✅ Created vendor: {name} ({category})")
    
    return vendors

async def create_materials(db, vendors):
    """Create 15 materials linked to vendors"""
    print("\n6. Creating 15 materials...")
    
    materials = []
    
    for i, material_name in enumerate(MATERIAL_NAMES):
        # Check if material already exists
        existing = await db.materials.find_one({"name": material_name})
        if existing:
            materials.append(existing)
            print(f"   ⏭️  Material already exists: {material_name}")
            continue
        
        vendor = random.choice(vendors)
        
        material_data = {
            "name": material_name,
            "unit": random.choice(MATERIAL_UNITS),
            "category": vendor["category"],
            "description": f"Sample material: {material_name}",
            "unit_cost": random.randint(10, 1000),
            "stock_level": random.randint(0, 1000),
            "min_stock_level": random.randint(10, 50),
            "vendor_id": str(vendor["_id"]),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await db.materials.insert_one(material_data)
        material_data["_id"] = result.inserted_id
        materials.append(material_data)
        
        print(f"   ✅ Created material: {material_name} (vendor: {vendor['name']})")
    
    return materials

async def create_project_milestones(db, projects, manager):
    """Create 3-6 milestones per project"""
    print("\n7. Creating project milestones/tasks...")
    
    milestone_templates = [
        "Site Preparation",
        "Foundation Work",
        "Structure Framework",
        "Walls & Roofing",
        "Electrical & Plumbing",
        "Finishing Work"
    ]
    
    total_created = 0
    
    for project in projects:
        num_milestones = random.randint(3, 6)
        project_start = project.get("start_date", datetime.utcnow())
        
        for i in range(num_milestones):
            milestone_name = milestone_templates[i % len(milestone_templates)]
            task_name = f"{project['name']} - {milestone_name}"
            
            # Check if milestone already exists
            existing = await db.tasks.find_one({
                "title": task_name,
                "project_id": str(project["_id"])
            })
            if existing:
                continue
            
            start_date = project_start + timedelta(days=i * 30)
            
            milestone_data = {
                "title": task_name,
                "description": f"Milestone: {milestone_name}",
                "project_id": str(project["_id"]),
                "status": random.choice(["pending", "in_progress", "completed"]),
                "priority": random.choice(["low", "medium", "high"]),
                "start_date": start_date,
                "end_date": start_date + timedelta(days=random.randint(20, 40)),
                "assigned_to": str(manager["_id"]),
                "percent_complete": random.randint(0, 100),
                "dependencies": [],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            await db.tasks.insert_one(milestone_data)
            total_created += 1
    
    print(f"   ✅ Created {total_created} milestones across {len(projects)} projects")

async def main():
    """Main seed data creation function"""
    print("="*60)
    print("CRM SEED DATA CREATION")
    print("="*60)
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    try:
        # Create test users
        users = await create_test_users(db)
        manager = users[0]
        
        # Create lead category
        category = await create_lead_category(db)
        
        # Create leads
        leads = await create_leads(db, users, category["_id"])
        
        # Create projects
        projects = await create_projects(db, leads, manager)
        
        # Create vendors
        vendors = await create_vendors(db)
        
        # Create materials
        materials = await create_materials(db, vendors)
        
        # Create project milestones
        await create_project_milestones(db, projects, manager)
        
        print("\n" + "="*60)
        print("SEED DATA CREATION COMPLETE!")
        print("="*60)
        print("\n📊 Summary:")
        print(f"   Users: {len(users)} (1 CRM Manager, {len(users)-1} CRM Users)")
        print(f"   Leads: {len(leads)}")
        print(f"   Projects: {len(projects)}")
        print(f"   Vendors: {len(vendors)}")
        print(f"   Materials: {len(materials)}")
        print("\n🔐 Test Credentials:")
        print("   CRM Manager: crm.manager@test.com / manager123")
        print("   CRM User 1: crm.user1@test.com / user1123")
        print("   CRM User 2: crm.user2@test.com / user2123")
        print("   CRM User 3: crm.user3@test.com / user3123")
        print("\n✅ Script is idempotent - safe to run multiple times!")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(main())
