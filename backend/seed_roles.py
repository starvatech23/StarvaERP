"""
Seed script for initial roles, permissions, and system settings
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'construction_db')

# Modules available in the system
MODULES = [
    'projects',
    'tasks',
    'labor',
    'materials',
    'vendors',
    'reports',
    'users'
]

# Initial roles with their permissions
INITIAL_ROLES = [
    {
        'name': 'Project Manager',
        'description': 'Manages projects, assigns tasks, and oversees operations',
        'is_active': True,
        'permissions': {
            'projects': {'view': True, 'create': True, 'edit': True, 'delete': False},
            'tasks': {'view': True, 'create': True, 'edit': True, 'delete': True},
            'labor': {'view': True, 'create': True, 'edit': True, 'delete': False},
            'materials': {'view': True, 'create': True, 'edit': True, 'delete': False},
            'vendors': {'view': True, 'create': True, 'edit': True, 'delete': False},
            'reports': {'view': True, 'create': False, 'edit': False, 'delete': False},
            'users': {'view': True, 'create': False, 'edit': False, 'delete': False},
        }
    },
    {
        'name': 'Project Engineer',
        'description': 'Executes project tasks and manages on-site activities',
        'is_active': True,
        'permissions': {
            'projects': {'view': True, 'create': False, 'edit': False, 'delete': False},
            'tasks': {'view': True, 'create': False, 'edit': True, 'delete': False},
            'labor': {'view': True, 'create': True, 'edit': True, 'delete': False},
            'materials': {'view': True, 'create': False, 'edit': True, 'delete': False},
            'vendors': {'view': True, 'create': False, 'edit': False, 'delete': False},
            'reports': {'view': True, 'create': False, 'edit': False, 'delete': False},
            'users': {'view': False, 'create': False, 'edit': False, 'delete': False},
        }
    }
]

INITIAL_SETTINGS = [
    {
        'setting_key': 'max_admins',
        'setting_value': '5',
        'description': 'Maximum number of admin users allowed in the system'
    },
    {
        'setting_key': 'require_approval',
        'setting_value': 'true',
        'description': 'Whether new user registrations require admin approval'
    },
    {
        'setting_key': 'default_approval_status',
        'setting_value': 'pending',
        'description': 'Default approval status for new users (pending/approved)'
    }
]

async def seed_roles():
    """Seed initial roles and permissions"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("🌱 Starting role seeding...")
    
    # Check if roles already exist
    existing_roles = await db.roles.count_documents({})
    if existing_roles > 0:
        print(f"⚠️  Found {existing_roles} existing roles. Skipping role seeding.")
        print("To re-seed, delete all roles first: db.roles.deleteMany({})")
        return
    
    # Insert roles and their permissions
    for role_data in INITIAL_ROLES:
        permissions = role_data.pop('permissions')
        
        # Insert role
        role_dict = {
            **role_data,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        result = await db.roles.insert_one(role_dict)
        role_id = str(result.inserted_id)
        
        print(f"✅ Created role: {role_data['name']} (ID: {role_id})")
        
        # Insert permissions for this role
        for module, perms in permissions.items():
            perm_dict = {
                'role_id': role_id,
                'module': module,
                'can_view': perms.get('view', False),
                'can_create': perms.get('create', False),
                'can_edit': perms.get('edit', False),
                'can_delete': perms.get('delete', False),
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            await db.permissions.insert_one(perm_dict)
        
        print(f"  ✅ Created {len(permissions)} permissions for {role_data['name']}")
    
    print(f"\n✨ Successfully seeded {len(INITIAL_ROLES)} roles with permissions!")
    
    client.close()

async def seed_settings():
    """Seed initial system settings"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("\n🌱 Starting system settings seeding...")
    
    for setting in INITIAL_SETTINGS:
        # Check if setting already exists
        existing = await db.system_settings.find_one({'setting_key': setting['setting_key']})
        
        if existing:
            print(f"⚠️  Setting '{setting['setting_key']}' already exists. Skipping.")
            continue
        
        setting_dict = {
            **setting,
            'updated_at': datetime.utcnow()
        }
        await db.system_settings.insert_one(setting_dict)
        print(f"✅ Created setting: {setting['setting_key']} = {setting['setting_value']}")
    
    print(f"\n✨ Successfully seeded {len(INITIAL_SETTINGS)} system settings!")
    
    client.close()

async def main():
    """Main seeding function"""
    print("=" * 60)
    print("  RBAC System Seeding Script")
    print("=" * 60)
    
    await seed_roles()
    await seed_settings()
    
    print("\n" + "=" * 60)
    print("  ✅ All seeding completed successfully!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. You can now create roles via API: POST /api/roles")
    print("2. Admin users can approve pending users via: POST /api/users/{id}/approve")
    print("3. Assign users to roles during approval or via: PUT /api/users/{id}")

if __name__ == "__main__":
    asyncio.run(main())
