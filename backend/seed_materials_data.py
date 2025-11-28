#!/usr/bin/env python3
"""
Seed script to populate database with dummy materials management data
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
from bson import ObjectId
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'construction_db')]

async def seed_data():
    print("🌱 Starting materials management data seeding...")
    
    # Get first user as creator
    user = await db.users.find_one()
    if not user:
        print("❌ No users found. Please create a user first.")
        return
    
    user_id = str(user["_id"])
    print(f"✅ Using user: {user.get('full_name', 'Unknown')} ({user_id})")
    
    # Get existing projects
    projects = await db.projects.find().to_list(length=10)
    if not projects:
        print("❌ No projects found. Creating a dummy project...")
        project_data = {
            "name": "Sample Construction Site",
            "description": "Test project for materials management",
            "location": "Mumbai, Maharashtra",
            "start_date": datetime.utcnow(),
            "status": "in_progress",
            "budget": 5000000,
            "manager_id": user_id,
            "team_members": [user_id],
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        result = await db.projects.insert_one(project_data)
        projects = [{"_id": result.inserted_id, **project_data}]
    
    project_ids = [str(p["_id"]) for p in projects[:3]]
    print(f"✅ Found {len(projects)} projects")
    
    # Clear existing materials data
    print("🗑️  Clearing existing materials data...")
    await db.vendors.delete_many({})
    await db.materials.delete_many({})
    await db.vendor_material_rates.delete_many({})
    await db.site_inventory.delete_many({})
    await db.material_requirements.delete_many({})
    await db.purchase_orders.delete_many({})
    await db.purchase_order_items.delete_many({})
    await db.material_transactions.delete_many({})
    
    # 1. Create Vendors
    print("\n📦 Creating vendors...")
    vendors_data = [
        {
            "business_name": "Shree Cement Suppliers",
            "contact_person": "Rajesh Kumar",
            "phone": "+91 98765 43210",
            "email": "rajesh@shreecement.com",
            "address": "Plot 45, Industrial Area",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "400001",
            "gst_number": "27AAAAA0000A1Z5",
            "pan_number": "AAAAA0000A",
            "payment_terms": "Net 30",
            "bank_name": "HDFC Bank",
            "account_number": "50100012345678",
            "ifsc_code": "HDFC0001234",
            "account_holder_name": "Shree Cement Suppliers",
            "is_active": True,
            "notes": "Reliable supplier for bulk cement orders",
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "business_name": "Modern Steel Trading Co.",
            "contact_person": "Amit Sharma",
            "phone": "+91 98888 77777",
            "email": "amit@modernsteel.com",
            "address": "Warehouse 12, MIDC Area",
            "city": "Pune",
            "state": "Maharashtra",
            "pincode": "411019",
            "gst_number": "27BBBBB0000B1Z5",
            "pan_number": "BBBBB0000B",
            "payment_terms": "Cash on Delivery",
            "bank_name": "ICICI Bank",
            "account_number": "60200098765432",
            "ifsc_code": "ICIC0006789",
            "account_holder_name": "Modern Steel Trading Co.",
            "is_active": True,
            "notes": "Best rates for TMT bars and steel",
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "business_name": "BuildMax Materials Hub",
            "contact_person": "Priya Patel",
            "phone": "+91 99999 11111",
            "email": "priya@buildmax.com",
            "address": "Shop 7, Builder's Market",
            "city": "Ahmedabad",
            "state": "Gujarat",
            "pincode": "380001",
            "gst_number": "24CCCCC0000C1Z5",
            "pan_number": "CCCCC0000C",
            "payment_terms": "Net 15",
            "bank_name": "State Bank of India",
            "account_number": "30000012345678",
            "ifsc_code": "SBIN0001234",
            "account_holder_name": "BuildMax Materials Hub",
            "is_active": True,
            "notes": "One-stop shop for all building materials",
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "business_name": "Kalyan Hardware & Paints",
            "contact_person": "Suresh Reddy",
            "phone": "+91 97777 22222",
            "email": "suresh@kalyanhardware.com",
            "address": "MG Road, Shop 45",
            "city": "Bangalore",
            "state": "Karnataka",
            "pincode": "560001",
            "gst_number": "29DDDDD0000D1Z5",
            "pan_number": "DDDDD0000D",
            "payment_terms": "Net 45",
            "is_active": True,
            "notes": "Specialized in paints and hardware items",
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    vendor_ids = []
    for vendor_data in vendors_data:
        result = await db.vendors.insert_one(vendor_data)
        vendor_ids.append(str(result.inserted_id))
        print(f"  ✓ Created vendor: {vendor_data['business_name']}")
    
    # 2. Create Materials
    print("\n🧱 Creating materials...")
    materials_data = [
        {
            "name": "Portland Cement (OPC 53)",
            "category": "cement",
            "unit": "bag",
            "description": "High strength ordinary Portland cement, 50kg bags",
            "minimum_stock": 50,
            "hsn_code": "25232990",
            "is_active": True,
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "TMT Steel Bars 12mm",
            "category": "steel",
            "unit": "kg",
            "description": "Fe 500D grade TMT reinforcement bars",
            "minimum_stock": 1000,
            "hsn_code": "72142000",
            "is_active": True,
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "M-Sand (Manufactured Sand)",
            "category": "sand",
            "unit": "ton",
            "description": "Fine aggregate for concrete and masonry",
            "minimum_stock": 10,
            "hsn_code": "25051000",
            "is_active": True,
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "20mm Aggregate",
            "category": "aggregate",
            "unit": "ton",
            "description": "Coarse aggregate for concrete mix",
            "minimum_stock": 15,
            "hsn_code": "25171000",
            "is_active": True,
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Red Clay Bricks",
            "category": "bricks",
            "unit": "piece",
            "description": "Standard size 9x4x3 inch red bricks",
            "minimum_stock": 5000,
            "hsn_code": "69041000",
            "is_active": True,
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Asian Paints Apex Exterior",
            "category": "paint",
            "unit": "liter",
            "description": "Weather resistant exterior emulsion",
            "minimum_stock": 20,
            "hsn_code": "32091020",
            "is_active": True,
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "PVC Pipes 2 inch",
            "category": "plumbing",
            "unit": "piece",
            "description": "Schedule 40 PVC pipes, 6 meter length",
            "minimum_stock": 50,
            "hsn_code": "39173100",
            "is_active": True,
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Electrical Copper Wire 2.5mm",
            "category": "electrical",
            "unit": "meter",
            "description": "Single core copper conductor wire",
            "minimum_stock": 500,
            "hsn_code": "85441100",
            "is_active": True,
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    material_ids = []
    for material_data in materials_data:
        result = await db.materials.insert_one(material_data)
        material_ids.append(str(result.inserted_id))
        print(f"  ✓ Created material: {material_data['name']}")
    
    # 3. Create Vendor Material Rates
    print("\n💰 Creating vendor material rates...")
    rates_data = [
        # Cement from Vendor 1
        {"vendor_id": vendor_ids[0], "material_id": material_ids[0], "rate_per_unit": 380},
        # Steel from Vendor 2
        {"vendor_id": vendor_ids[1], "material_id": material_ids[1], "rate_per_unit": 58},
        # Sand and Aggregate from Vendor 3
        {"vendor_id": vendor_ids[2], "material_id": material_ids[2], "rate_per_unit": 1800},
        {"vendor_id": vendor_ids[2], "material_id": material_ids[3], "rate_per_unit": 2200},
        # Bricks from Vendor 3
        {"vendor_id": vendor_ids[2], "material_id": material_ids[4], "rate_per_unit": 8},
        # Paint from Vendor 4
        {"vendor_id": vendor_ids[3], "material_id": material_ids[5], "rate_per_unit": 450},
        # Pipes from Vendor 4
        {"vendor_id": vendor_ids[3], "material_id": material_ids[6], "rate_per_unit": 280},
        # Wire from Vendor 4
        {"vendor_id": vendor_ids[3], "material_id": material_ids[7], "rate_per_unit": 12},
    ]
    
    for rate_data in rates_data:
        rate_doc = {
            **rate_data,
            "effective_from": datetime.utcnow() - timedelta(days=30),
            "is_active": True,
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db.vendor_material_rates.insert_one(rate_doc)
        print(f"  ✓ Created rate for material {rate_data['material_id'][:8]}...")
    
    # 4. Create Site Inventory
    print("\n📊 Creating site inventory...")
    inventory_data = [
        # Project 1
        {"project_id": project_ids[0], "material_id": material_ids[0], "current_stock": 120},  # Cement
        {"project_id": project_ids[0], "material_id": material_ids[1], "current_stock": 2500},  # Steel
        {"project_id": project_ids[0], "material_id": material_ids[2], "current_stock": 25},  # Sand
        {"project_id": project_ids[0], "material_id": material_ids[4], "current_stock": 8000},  # Bricks
        # Project 2 (if exists)
        {"project_id": project_ids[1] if len(project_ids) > 1 else project_ids[0], 
         "material_id": material_ids[0], "current_stock": 45},  # Low stock
        {"project_id": project_ids[1] if len(project_ids) > 1 else project_ids[0], 
         "material_id": material_ids[3], "current_stock": 18},  # Aggregate
        {"project_id": project_ids[1] if len(project_ids) > 1 else project_ids[0], 
         "material_id": material_ids[5], "current_stock": 15},  # Paint - Low stock
    ]
    
    for inv_data in inventory_data:
        inv_doc = {
            **inv_data,
            "last_updated": datetime.utcnow()
        }
        await db.site_inventory.insert_one(inv_doc)
        print(f"  ✓ Created inventory for project {inv_data['project_id'][:8]}...")
    
    # 5. Create Purchase Orders
    print("\n📝 Creating purchase orders...")
    po_data = [
        {
            "po_number": f"PO-2025-001",
            "vendor_id": vendor_ids[0],
            "project_id": project_ids[0],
            "order_date": datetime.utcnow() - timedelta(days=15),
            "expected_delivery_date": datetime.utcnow() + timedelta(days=7),
            "status": "ordered",
            "payment_terms": "Net 30",
            "total_amount": 190000,
            "tax_amount": 34200,
            "discount_amount": 0,
            "final_amount": 224200,
            "delivery_address": "Construction Site, Mumbai",
            "created_by": user_id,
            "created_at": datetime.utcnow() - timedelta(days=15),
            "updated_at": datetime.utcnow()
        },
        {
            "po_number": f"PO-2025-002",
            "vendor_id": vendor_ids[1],
            "project_id": project_ids[0],
            "order_date": datetime.utcnow() - timedelta(days=10),
            "expected_delivery_date": datetime.utcnow() + timedelta(days=5),
            "status": "received",
            "payment_terms": "Cash on Delivery",
            "total_amount": 290000,
            "tax_amount": 52200,
            "discount_amount": 5000,
            "final_amount": 337200,
            "created_by": user_id,
            "created_at": datetime.utcnow() - timedelta(days=10),
            "updated_at": datetime.utcnow()
        }
    ]
    
    for po in po_data:
        po_result = await db.purchase_orders.insert_one(po)
        po_id = str(po_result.inserted_id)
        
        # Create PO items
        if po["po_number"] == "PO-2025-001":
            items = [
                {"purchase_order_id": po_id, "material_id": material_ids[0], 
                 "quantity": 500, "rate_per_unit": 380, "amount": 190000, "received_quantity": 0,
                 "created_at": datetime.utcnow()}
            ]
        else:
            items = [
                {"purchase_order_id": po_id, "material_id": material_ids[1], 
                 "quantity": 5000, "rate_per_unit": 58, "amount": 290000, "received_quantity": 5000,
                 "created_at": datetime.utcnow()}
            ]
        
        for item in items:
            await db.purchase_order_items.insert_one(item)
        
        print(f"  ✓ Created PO: {po['po_number']} (₹{po['final_amount']:,})")
    
    # 6. Create Material Requirements
    print("\n📋 Creating material requirements...")
    req_data = [
        {
            "project_id": project_ids[0],
            "material_id": material_ids[0],
            "required_quantity": 200,
            "required_by_date": datetime.utcnow() + timedelta(days=14),
            "priority": "high",
            "purpose": "Foundation work phase 2",
            "is_fulfilled": False,
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "project_id": project_ids[0],
            "material_id": material_ids[5],
            "required_quantity": 50,
            "required_by_date": datetime.utcnow() + timedelta(days=30),
            "priority": "medium",
            "purpose": "Exterior painting work",
            "is_fulfilled": False,
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    for req in req_data:
        await db.material_requirements.insert_one(req)
        print(f"  ✓ Created requirement for material {req['material_id'][:8]}...")
    
    print("\n✅ Data seeding completed successfully!")
    print(f"\n📊 Summary:")
    print(f"  • Vendors: {len(vendors_data)}")
    print(f"  • Materials: {len(materials_data)}")
    print(f"  • Vendor Rates: {len(rates_data)}")
    print(f"  • Inventory Records: {len(inventory_data)}")
    print(f"  • Purchase Orders: {len(po_data)}")
    print(f"  • Material Requirements: {len(req_data)}")
    print(f"\n🎉 You can now test the materials management features!")

if __name__ == "__main__":
    asyncio.run(seed_data())
    client.close()
