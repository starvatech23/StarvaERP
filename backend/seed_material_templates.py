#!/usr/bin/env python3
"""
Seed script to populate construction material consumption templates
Based on industry standards for construction work
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
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

async def seed_templates():
    print("🌱 Starting material consumption templates seeding...")
    
    # Clear existing templates
    await db.material_consumption_templates.delete_many({})
    
    templates = [
        # PLASTERING (per 100 sq ft, 12mm thick)
        {
            "work_type": "plastering",
            "material_category": "cement",
            "material_name": "Cement (any grade)",
            "consumption_rate": 1.5,  # bags per 100 sqft
            "unit": "bag",
            "measurement_type": "area",
            "description": "12mm thick plastering on walls",
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        {
            "work_type": "plastering",
            "material_category": "sand",
            "material_name": "Sand (fine)",
            "consumption_rate": 4.3,  # cu ft per 100 sqft
            "unit": "cft",
            "measurement_type": "area",
            "description": "12mm thick plastering on walls",
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        
        # BRICKWORK (per 100 sq ft, 9" wall)
        {
            "work_type": "brickwork",
            "material_category": "bricks",
            "material_name": "Red bricks",
            "consumption_rate": 1000,  # pieces per 100 sqft
            "unit": "piece",
            "measurement_type": "area",
            "description": "9 inch thick brick wall",
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        {
            "work_type": "brickwork",
            "material_category": "cement",
            "material_name": "Cement",
            "consumption_rate": 0.6,  # bags per 100 sqft
            "unit": "bag",
            "measurement_type": "area",
            "description": "9 inch thick brick wall mortar",
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        {
            "work_type": "brickwork",
            "material_category": "sand",
            "material_name": "Sand",
            "consumption_rate": 4.3,  # cft per 100 sqft
            "unit": "cft",
            "measurement_type": "area",
            "description": "9 inch brick wall mortar",
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        
        # CONCRETE WORK (per 1 cubic meter M20 grade)
        {
            "work_type": "concrete_work",
            "material_category": "cement",
            "material_name": "Cement OPC 53",
            "consumption_rate": 7,  # bags per cum
            "unit": "bag",
            "measurement_type": "volume",
            "description": "M20 grade concrete mix",
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        {
            "work_type": "concrete_work",
            "material_category": "sand",
            "material_name": "Sand (coarse)",
            "consumption_rate": 27.2,  # cft per cum (0.77 cum)
            "unit": "cft",
            "measurement_type": "volume",
            "description": "M20 grade concrete mix",
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        {
            "work_type": "concrete_work",
            "material_category": "aggregate",
            "material_name": "20mm Aggregate",
            "consumption_rate": 48.7,  # cft per cum (1.38 cum)
            "unit": "cft",
            "measurement_type": "volume",
            "description": "M20 grade concrete mix",
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        
        # FLOORING/TILING (per 100 sq ft)
        {
            "work_type": "flooring",
            "material_category": "tiles",
            "material_name": "Floor tiles",
            "consumption_rate": 110,  # sqft per 100 sqft (10% wastage)
            "unit": "sqft",
            "measurement_type": "area",
            "description": "Floor tiling with 10% wastage",
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        {
            "work_type": "flooring",
            "material_category": "cement",
            "material_name": "Cement",
            "consumption_rate": 0.8,  # bags per 100 sqft
            "unit": "bag",
            "measurement_type": "area",
            "description": "Tile adhesive/bedding",
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        {
            "work_type": "flooring",
            "material_category": "sand",
            "material_name": "Sand",
            "consumption_rate": 2,  # cft per 100 sqft
            "unit": "cft",
            "measurement_type": "area",
            "description": "Tile bedding",
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        
        # TILING (walls, per 100 sq ft)
        {
            "work_type": "tiling",
            "material_category": "tiles",
            "material_name": "Wall tiles",
            "consumption_rate": 110,  # sqft per 100 sqft
            "unit": "sqft",
            "measurement_type": "area",
            "description": "Wall tiling with 10% wastage",
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        {
            "work_type": "tiling",
            "material_category": "cement",
            "material_name": "Cement",
            "consumption_rate": 0.8,
            "unit": "bag",
            "measurement_type": "area",
            "description": "Tile adhesive",
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        
        # PAINTING (per 100 sq ft, 2 coats)
        {
            "work_type": "painting",
            "material_category": "paint",
            "material_name": "Emulsion paint",
            "consumption_rate": 1,  # liter per 100 sqft (2 coats)
            "unit": "liter",
            "measurement_type": "area",
            "description": "2 coats of emulsion paint",
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        
        # STEEL FIXING (per 1000 kg of steel)
        {
            "work_type": "steel_fixing",
            "material_category": "steel",
            "material_name": "TMT bars",
            "consumption_rate": 1000,  # kg per 1000 kg (base quantity)
            "unit": "kg",
            "measurement_type": "weight",
            "description": "Reinforcement steel",
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        {
            "work_type": "steel_fixing",
            "material_category": "hardware",
            "material_name": "Binding wire",
            "consumption_rate": 8,  # kg per 1000 kg steel
            "unit": "kg",
            "measurement_type": "weight",
            "description": "For tying steel bars",
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        
        # EARTHWORK (per 100 cubic feet)
        {
            "work_type": "earthwork",
            "material_category": "miscellaneous",
            "material_name": "Labor/machinery",
            "consumption_rate": 1,  # unit per 100 cft
            "unit": "unit",
            "measurement_type": "volume",
            "description": "Excavation work",
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        
        # BLOCKWORK (per 100 sq ft, 6" wall)
        {
            "work_type": "blockwork",
            "material_category": "blocks",
            "material_name": "Concrete blocks 6\"",
            "consumption_rate": 125,  # pieces per 100 sqft
            "unit": "piece",
            "measurement_type": "area",
            "description": "6 inch concrete block wall",
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        {
            "work_type": "blockwork",
            "material_category": "cement",
            "material_name": "Cement",
            "consumption_rate": 0.5,  # bags per 100 sqft
            "unit": "bag",
            "measurement_type": "area",
            "description": "Block laying mortar",
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        
        # WATERPROOFING (per 100 sq ft)
        {
            "work_type": "waterproofing",
            "material_category": "miscellaneous",
            "material_name": "Waterproofing compound",
            "consumption_rate": 1.5,  # kg per 100 sqft
            "unit": "kg",
            "measurement_type": "area",
            "description": "Liquid waterproofing membrane",
            "is_active": True,
            "created_at": datetime.utcnow()
        },
    ]
    
    result = await db.material_consumption_templates.insert_many(templates)
    
    print(f"\n✅ Created {len(result.inserted_ids)} material consumption templates")
    print("\n📋 Templates by work type:")
    
    work_types = {}
    for template in templates:
        wt = template["work_type"]
        if wt not in work_types:
            work_types[wt] = []
        work_types[wt].append(f"  - {template['material_name']}: {template['consumption_rate']} {template['unit']}")
    
    for work_type, materials in work_types.items():
        print(f"\n{work_type.upper()}:")
        for material in materials:
            print(material)
    
    print("\n🎉 Material consumption templates seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_templates())
    client.close()
