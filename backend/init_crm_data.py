"""Initialize CRM with default lead categories"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")

async def init_crm_data():
    client = AsyncIOMotorClient(MONGO_URL)
    db_name = os.getenv('DB_NAME', 'construction_db')
    db = client[db_name]
    
    # Check if categories already exist
    existing_count = await db.lead_categories.count_documents({})
    if existing_count > 0:
        print(f"✅ CRM categories already initialized ({existing_count} categories found)")
        return
    
    # Create default lead categories
    default_categories = [
        {
            "name": "New Leads",
            "description": "Newly created leads that need initial contact",
            "color": "#3B82F6",  # Blue
            "order": 0,
            "is_active": True,
            "is_system": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Contacted",
            "description": "Leads that have been contacted at least once",
            "color": "#8B5CF6",  # Purple
            "order": 1,
            "is_active": True,
            "is_system": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Qualified",
            "description": "Leads that meet our criteria and show interest",
            "color": "#F59E0B",  # Orange
            "order": 2,
            "is_active": True,
            "is_system": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Proposal Sent",
            "description": "Leads who have received a proposal or quotation",
            "color": "#FF6B35",  # Red-Orange
            "order": 3,
            "is_active": True,
            "is_system": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Won",
            "description": "Successful conversions - deals closed",
            "color": "#10B981",  # Green
            "order": 4,
            "is_active": True,
            "is_system": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Lost",
            "description": "Leads that didn't convert",
            "color": "#EF4444",  # Red
            "order": 5,
            "is_active": True,
            "is_system": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    result = await db.lead_categories.insert_many(default_categories)
    print(f"✅ Created {len(result.inserted_ids)} default lead categories")
    
    # Create indexes for better performance
    await db.leads.create_index([("created_at", -1)])
    await db.leads.create_index([("category_id", 1)])
    await db.leads.create_index([("assigned_to", 1)])
    await db.leads.create_index([("status", 1)])
    await db.leads.create_index([("is_deleted", 1)])
    await db.lead_activities.create_index([("lead_id", 1), ("created_at", -1)])
    await db.lead_field_audits.create_index([("lead_id", 1), ("changed_at", -1)])
    
    print("✅ Created database indexes for CRM collections")
    
    client.close()
    print("\n🎉 CRM initialization completed successfully!")

if __name__ == "__main__":
    asyncio.run(init_crm_data())
