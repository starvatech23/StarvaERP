import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from passlib.context import CryptContext
import os

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def setup_test_data():
    # Connect to MongoDB
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongo_url)
    db = client.construction_db
    
    print("\n" + "="*60)
    print("🚀 Setting up Test Data")
    print("="*60 + "\n")
    
    # Step 1: Create Roles
    print("📋 Step 1: Creating Roles...")
    
    roles_data = [
        {
            "name": "Admin",
            "description": "Full system access",
            "is_active": True
        },
        {
            "name": "Project Manager",
            "description": "Manages projects and teams",
            "is_active": True
        },
        {
            "name": "Engineer",
            "description": "Site engineer",
            "is_active": True
        },
        {
            "name": "Supervisor",
            "description": "Site supervisor",
            "is_active": True
        },
        {
            "name": "Accountant",
            "description": "Financial management",
            "is_active": True
        },
        {
            "name": "Worker",
            "description": "Site worker",
            "is_active": True
        }
    ]
    
    roles_created = 0
    role_map = {}
    
    for role_data in roles_data:
        existing = await db.roles.find_one({"name": role_data["name"]})
        if existing:
            print(f"  ⚠️  Role '{role_data['name']}' already exists")
            role_map[role_data["name"]] = existing
        else:
            result = await db.roles.insert_one(role_data)
            role_data["_id"] = result.inserted_id
            role_map[role_data["name"]] = role_data
            roles_created += 1
            print(f"  ✅ Created role: {role_data['name']}")
    
    print(f"\n  Summary: {roles_created} roles created, {len(roles_data) - roles_created} already existed\n")
    
    # Step 2: Create Sample Users
    print("👥 Step 2: Creating Sample Users...")
    
    sample_users = [
        {
            "email": "admin@test.com",
            "full_name": "Admin User",
            "phone": "+1234567890",
            "role_name": "Admin",
            "password": "admin123"
        },
        {
            "email": "pm1@test.com",
            "full_name": "John Smith (PM)",
            "phone": "+1234567891",
            "role_name": "Project Manager",
            "password": "pm123"
        },
        {
            "email": "pm2@test.com",
            "full_name": "Sarah Johnson (PM)",
            "phone": "+1234567892",
            "role_name": "Project Manager",
            "password": "pm123"
        },
        {
            "email": "engineer1@test.com",
            "full_name": "Mike Wilson (Engineer)",
            "phone": "+1234567893",
            "role_name": "Engineer",
            "password": "engineer123"
        },
        {
            "email": "engineer2@test.com",
            "full_name": "Emily Davis (Engineer)",
            "phone": "+1234567894",
            "role_name": "Engineer",
            "password": "engineer123"
        },
        {
            "email": "supervisor@test.com",
            "full_name": "Robert Brown (Supervisor)",
            "phone": "+1234567895",
            "role_name": "Supervisor",
            "password": "supervisor123"
        },
        {
            "email": "accountant@test.com",
            "full_name": "Lisa Anderson (Accountant)",
            "phone": "+1234567896",
            "role_name": "Accountant",
            "password": "accountant123"
        },
        {
            "email": "worker1@test.com",
            "full_name": "David Martinez (Worker)",
            "phone": "+1234567897",
            "role_name": "Worker",
            "password": "worker123"
        },
        {
            "email": "worker2@test.com",
            "full_name": "James Garcia (Worker)",
            "phone": "+1234567898",
            "role_name": "Worker",
            "password": "worker123"
        }
    ]
    
    created_count = 0
    skipped_count = 0
    
    for user_data in sample_users:
        # Check if user already exists
        existing = await db.users.find_one({"email": user_data["email"]})
        if existing:
            print(f"  ⚠️  User {user_data['email']} already exists - skipping")
            skipped_count += 1
            continue
        
        # Get role
        role = role_map.get(user_data["role_name"])
        if not role:
            print(f"  ❌ Role '{user_data['role_name']}' not found for {user_data['email']}")
            skipped_count += 1
            continue
        
        # Create user document
        hashed_password = pwd_context.hash(user_data["password"])
        
        new_user = {
            "email": user_data["email"],
            "full_name": user_data["full_name"],
            "phone": user_data["phone"],
            "password_hash": hashed_password,
            "role_id": str(role["_id"]),
            "is_active": True,
            "approval_status": "approved",
            "team_id": None,
            "created_at": None,
            "updated_at": None
        }
        
        result = await db.users.insert_one(new_user)
        created_count += 1
        print(f"  ✅ {user_data['full_name']:<30} | {user_data['email']:<25} | Password: {user_data['password']}")
    
    print(f"\n  Summary: {created_count} users created, {skipped_count} skipped\n")
    
    # Step 3: Create Sample Teams
    print("🏢 Step 3: Creating Sample Teams...")
    
    teams_data = [
        {
            "name": "Operations",
            "description": "Operations team",
            "is_active": True
        },
        {
            "name": "Engineering",
            "description": "Engineering team",
            "is_active": True
        },
        {
            "name": "Finance",
            "description": "Finance team",
            "is_active": True
        }
    ]
    
    teams_created = 0
    for team_data in teams_data:
        existing = await db.teams.find_one({"name": team_data["name"]})
        if existing:
            print(f"  ⚠️  Team '{team_data['name']}' already exists")
        else:
            await db.teams.insert_one(team_data)
            teams_created += 1
            print(f"  ✅ Created team: {team_data['name']}")
    
    print(f"\n  Summary: {teams_created} teams created, {len(teams_data) - teams_created} already existed\n")
    
    # Final Summary
    total_users = await db.users.count_documents({"approval_status": "approved"})
    total_roles = await db.roles.count_documents({})
    total_teams = await db.teams.count_documents({})
    
    print("\n" + "="*60)
    print("✨ Setup Complete!")
    print("="*60)
    print(f"  📊 Total Approved Users: {total_users}")
    print(f"  📋 Total Roles: {total_roles}")
    print(f"  🏢 Total Teams: {total_teams}")
    print("="*60)
    print("\n💡 Test Credentials:")
    print("  Admin:      admin@test.com / admin123")
    print("  PM:         pm1@test.com / pm123")
    print("  Engineer:   engineer1@test.com / engineer123")
    print("  Supervisor: supervisor@test.com / supervisor123")
    print("  Accountant: accountant@test.com / accountant123")
    print("  Worker:     worker1@test.com / worker123")
    print("="*60 + "\n")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(setup_test_data())
