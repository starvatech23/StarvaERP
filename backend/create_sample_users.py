import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from passlib.context import CryptContext
import os

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_sample_users():
    # Connect to MongoDB
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongo_url)
    db = client.construction_db
    
    # Get all roles
    roles = await db.roles.find().to_list(100)
    print(f"\n📋 Found {len(roles)} roles in system:")
    for role in roles:
        print(f"  - {role['name']} (ID: {role['_id']})")
    
    # Sample users data
    sample_users = [
        {
            "email": "admin@test.com",
            "full_name": "Admin User",
            "phone": "+1234567890",
            "role_name": "admin",
            "password": "admin123"
        },
        {
            "email": "pm@test.com",
            "full_name": "Project Manager",
            "phone": "+1234567891",
            "role_name": "project_manager",
            "password": "pm123"
        },
        {
            "email": "engineer@test.com",
            "full_name": "Site Engineer",
            "phone": "+1234567892",
            "role_name": "engineer",
            "password": "engineer123"
        },
        {
            "email": "supervisor@test.com",
            "full_name": "Site Supervisor",
            "phone": "+1234567893",
            "role_name": "supervisor",
            "password": "supervisor123"
        },
        {
            "email": "accountant@test.com",
            "full_name": "Accountant User",
            "phone": "+1234567894",
            "role_name": "accountant",
            "password": "accountant123"
        },
        {
            "email": "worker@test.com",
            "full_name": "Site Worker",
            "phone": "+1234567895",
            "role_name": "worker",
            "password": "worker123"
        }
    ]
    
    print("\n🔨 Creating sample users...\n")
    
    created_count = 0
    skipped_count = 0
    
    for user_data in sample_users:
        # Check if user already exists
        existing = await db.users.find_one({"email": user_data["email"]})
        if existing:
            print(f"⚠️  User {user_data['email']} already exists - skipping")
            skipped_count += 1
            continue
        
        # Find role by name (case insensitive)
        role = None
        for r in roles:
            if r['name'].lower().replace('_', ' ') == user_data['role_name'].lower().replace('_', ' '):
                role = r
                break
        
        # If exact match not found, try partial match
        if not role:
            for r in roles:
                if user_data['role_name'].lower() in r['name'].lower():
                    role = r
                    break
        
        if not role:
            print(f"❌ Role '{user_data['role_name']}' not found for {user_data['email']}")
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
            "approval_status": "approved",  # Important: Set as approved so they appear in dropdowns
            "team_id": None,
            "created_at": None,
            "updated_at": None
        }
        
        result = await db.users.insert_one(new_user)
        created_count += 1
        print(f"✅ Created user: {user_data['full_name']} ({user_data['email']}) - Role: {role['name']}")
        print(f"   📧 Email: {user_data['email']}")
        print(f"   🔑 Password: {user_data['password']}")
        print(f"   📱 Phone: {user_data['phone']}\n")
    
    # Summary
    total_users = await db.users.count_documents({"approval_status": "approved"})
    print(f"\n{'='*60}")
    print(f"✨ Summary:")
    print(f"   - Created: {created_count} new users")
    print(f"   - Skipped: {skipped_count} existing users")
    print(f"   - Total approved users in system: {total_users}")
    print(f"{'='*60}\n")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_sample_users())
