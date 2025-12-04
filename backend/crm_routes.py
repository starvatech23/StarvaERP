"""
CRM Lead Management API Routes
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from models import (
    LeadCreate, LeadUpdate, LeadResponse,
    LeadCategoryCreate, LeadCategoryUpdate, LeadCategoryResponse,
    LeadActivityCreate, LeadActivityResponse,
    IntegrationSettingsCreate, IntegrationSettingsUpdate, IntegrationSettingsResponse,
    WhatsAppTemplateCreate, WhatsAppTemplateUpdate, WhatsAppTemplateResponse,
    LeadBulkUpdate, LeadBulkMove, LeadBulkAssign,
    LeadImportItem, LeadImportResponse,
    LeadFilterParams,
    LeadStatus, LeadPriority, LeadSource, LeadActivityType,
    CallOutcome, WhatsAppDeliveryStatus, Currency
)
from utils import (
    normalize_phone_india, validate_phone, truncate_text,
    format_currency, process_template, calculate_time_ago
)
from services import IntegrationServiceFactory

crm_router = APIRouter(prefix="/crm", tags=["CRM"])


# ============= Lead Category Routes =============

@crm_router.post("/categories", response_model=LeadCategoryResponse)
async def create_lead_category(
    category: LeadCategoryCreate,
    current_user: dict = Depends(lambda: {"id": "admin"}),  # Placeholder
    db: AsyncIOMotorDatabase = Depends(lambda: None)  # Placeholder
):
    """Create a new lead category/stage"""
    category_dict = category.dict()
    category_dict["created_at"] = datetime.utcnow()
    category_dict["updated_at"] = datetime.utcnow()
    category_dict["lead_count"] = 0
    
    result = await db.lead_categories.insert_one(category_dict)
    category_dict["id"] = str(result.inserted_id)
    del category_dict["_id"]
    
    return LeadCategoryResponse(**category_dict)


@crm_router.get("/categories", response_model=List[LeadCategoryResponse])
async def list_lead_categories(
    include_inactive: bool = False,
    db: AsyncIOMotorDatabase = Depends(lambda: None)
):
    """List all lead categories"""
    query = {} if include_inactive else {"is_active": True}
    categories = await db.lead_categories.find(query).sort("order", 1).to_list(length=100)
    
    result = []
    for cat in categories:
        # Count leads in this category
        lead_count = await db.leads.count_documents({"lead_category_id": str(cat["_id"])})
        
        cat_dict = {
            "id": str(cat["_id"]),
            **{k: v for k, v in cat.items() if k != "_id"},
            "lead_count": lead_count
        }
        result.append(LeadCategoryResponse(**cat_dict))
    
    return result


@crm_router.put("/categories/{category_id}", response_model=LeadCategoryResponse)
async def update_lead_category(
    category_id: str,
    category: LeadCategoryUpdate,
    current_user: dict = Depends(lambda: {"id": "admin"}),
    db: AsyncIOMotorDatabase = Depends(lambda: None)
):
    """Update a lead category"""
    update_data = {k: v for k, v in category.dict(exclude_unset=True).items()}
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.lead_categories.find_one_and_update(
        {"_id": ObjectId(category_id)},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Category not found")
    
    lead_count = await db.leads.count_documents({"lead_category_id": category_id})
    result["id"] = str(result["_id"])
    result["lead_count"] = lead_count
    del result["_id"]
    
    return LeadCategoryResponse(**result)


@crm_router.delete("/categories/{category_id}")
async def delete_lead_category(
    category_id: str,
    current_user: dict = Depends(lambda: {"id": "admin"}),
    db: AsyncIOMotorDatabase = Depends(lambda: None)
):
    """Delete a lead category (only if no leads assigned)"""
    category = await db.lead_categories.find_one({"_id": ObjectId(category_id)})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    if category.get("is_system"):
        raise HTTPException(status_code=400, detail="Cannot delete system category")
    
    # Check if any leads are in this category
    lead_count = await db.leads.count_documents({"lead_category_id": category_id})
    if lead_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete category with {lead_count} leads. Move or delete leads first."
        )
    
    await db.lead_categories.delete_one({"_id": ObjectId(category_id)})
    return {"message": "Category deleted successfully"}


# ============= Lead Routes =============

@crm_router.post("/leads", response_model=LeadResponse)
async def create_lead(
    lead: LeadCreate,
    current_user: dict = Depends(lambda: {"id": "admin", "full_name": "Admin"}),
    db: AsyncIOMotorDatabase = Depends(lambda: None)
):
    """Create a new lead with phone normalization"""
    # Normalize phone numbers
    primary_norm, primary_raw, primary_valid = normalize_phone_india(lead.primary_phone)
    if not primary_valid:
        raise HTTPException(status_code=400, detail="Invalid primary phone number")
    
    alternate_norm, alternate_raw, alternate_valid = None, None, True
    if lead.alternate_phone:
        alternate_norm, alternate_raw, alternate_valid = normalize_phone_india(lead.alternate_phone)
        if not alternate_valid:
            raise HTTPException(status_code=400, detail="Invalid alternate phone number")
    
    # Create lead document
    lead_dict = lead.dict()
    lead_dict["primary_phone"] = primary_norm
    lead_dict["primary_phone_raw"] = primary_raw
    if lead.alternate_phone:
        lead_dict["alternate_phone"] = alternate_norm
        lead_dict["alternate_phone_raw"] = alternate_raw
    
    lead_dict["created_by"] = current_user["id"]
    lead_dict["created_at"] = datetime.utcnow()
    lead_dict["updated_at"] = datetime.utcnow()
    lead_dict["activities_count"] = 0
    lead_dict["last_activity"] = None
    
    result = await db.leads.insert_one(lead_dict)
    lead_id = str(result.inserted_id)
    
    # Send WhatsApp welcome message if consent given
    if lead.whatsapp_consent and lead_dict["primary_phone"]:
        # Get WhatsApp service
        settings = await db.integration_settings.find({"provider_name": {"$regex": "whatsapp", "$options": "i"}}).to_list(length=10)
        whatsapp_service = IntegrationServiceFactory.get_active_whatsapp_service(settings)
        
        if whatsapp_service:
            # Get welcome template
            template = await db.whatsapp_templates.find_one({"category": "welcome", "is_active": True})
            if template:
                try:
                    # Send WhatsApp message
                    response = await whatsapp_service.send_template_message(
                        to_number=primary_norm,
                        template_name=template["name"],
                        template_variables={"name": lead.name}
                    )
                    
                    # Log activity
                    activity = {
                        "lead_id": lead_id,
                        "activity_type": LeadActivityType.WHATSAPP,
                        "title": "Welcome message sent",
                        "description": "Automated welcome message via WhatsApp",
                        "whatsapp_message_sid": response.get("message_sid"),
                        "whatsapp_delivery_status": WhatsAppDeliveryStatus.SENT,
                        "whatsapp_template_name": template["name"],
                        "created_by": current_user["id"],
                        "created_at": datetime.utcnow()
                    }
                    await db.lead_activities.insert_one(activity)
                except Exception as e:
                    # Log failure but don't fail lead creation
                    print(f"Failed to send WhatsApp: {e}")
    
    # Get populated response
    lead_dict["id"] = lead_id
    lead_dict["created_by_name"] = current_user.get("full_name")
    
    # Get category name
    category = await db.lead_categories.find_one({"_id": ObjectId(lead.lead_category_id)})
    lead_dict["category_name"] = category["name"] if category else None
    
    # Get assigned user name
    if lead.assigned_to:
        user = await db.users.find_one({"_id": ObjectId(lead.assigned_to)})
        lead_dict["assigned_to_name"] = user["full_name"] if user else None
    
    return LeadResponse(**{k: v for k, v in lead_dict.items() if k != "_id"})


@crm_router.get("/leads", response_model=List[LeadResponse])
async def list_leads(
    category_id: Optional[str] = None,
    status: Optional[LeadStatus] = None,
    priority: Optional[LeadPriority] = None,
    assigned_to: Optional[str] = None,
    source: Optional[LeadSource] = None,
    city: Optional[str] = None,
    budget_min: Optional[float] = None,
    budget_max: Optional[float] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncIOMotorDatabase = Depends(lambda: None)
):
    """List leads with filtering"""
    query = {}
    
    if category_id:
        query["lead_category_id"] = category_id
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if assigned_to:
        query["assigned_to"] = assigned_to
    if source:
        query["source"] = source
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if budget_min is not None or budget_max is not None:
        query["budget"] = {}
        if budget_min is not None:
            query["budget"]["$gte"] = budget_min
        if budget_max is not None:
            query["budget"]["$lte"] = budget_max
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"primary_phone": {"$regex": search}},
            {"email": {"$regex": search, "$options": "i"}},
            {"city": {"$regex": search, "$options": "i"}}
        ]
    
    leads = await db.leads.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    
    result = []
    for lead in leads:
        # Get category name
        if lead.get("lead_category_id"):
            category = await db.lead_categories.find_one({"_id": ObjectId(lead["lead_category_id"])})
            lead["category_name"] = category["name"] if category else None
        
        # Get assigned user name
        if lead.get("assigned_to"):
            user = await db.users.find_one({"_id": ObjectId(lead["assigned_to"])})
            lead["assigned_to_name"] = user["full_name"] if user else None
        
        # Get created by name
        if lead.get("created_by"):
            user = await db.users.find_one({"_id": ObjectId(lead["created_by"])})
            lead["created_by_name"] = user["full_name"] if user else None
        
        # Count activities
        activities_count = await db.lead_activities.count_documents({"lead_id": str(lead["_id"])})
        lead["activities_count"] = activities_count
        
        # Get last activity
        last_activity = await db.lead_activities.find_one(
            {"lead_id": str(lead["_id"])},
            sort=[("created_at", -1)]
        )
        lead["last_activity"] = last_activity["created_at"] if last_activity else None
        
        lead["id"] = str(lead["_id"])
        result.append(LeadResponse(**{k: v for k, v in lead.items() if k != "_id"}))
    
    return result


@crm_router.get("/leads/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: str,
    db: AsyncIOMotorDatabase = Depends(lambda: None)
):
    """Get a single lead by ID"""
    lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Get category name
    if lead.get("lead_category_id"):
        category = await db.lead_categories.find_one({"_id": ObjectId(lead["lead_category_id"])})
        lead["category_name"] = category["name"] if category else None
    
    # Get assigned user name
    if lead.get("assigned_to"):
        user = await db.users.find_one({"_id": ObjectId(lead["assigned_to"])})
        lead["assigned_to_name"] = user["full_name"] if user else None
    
    # Get created by name
    if lead.get("created_by"):
        user = await db.users.find_one({"_id": ObjectId(lead["created_by"])})
        lead["created_by_name"] = user["full_name"] if user else None
    
    # Count activities
    activities_count = await db.lead_activities.count_documents({"lead_id": lead_id})
    lead["activities_count"] = activities_count
    
    # Get last activity
    last_activity = await db.lead_activities.find_one(
        {"lead_id": lead_id},
        sort=[("created_at", -1)]
    )
    lead["last_activity"] = last_activity["created_at"] if last_activity else None
    
    lead["id"] = str(lead["_id"])
    return LeadResponse(**{k: v for k, v in lead.items() if k != "_id"})


@crm_router.put("/leads/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: str,
    lead: LeadUpdate,
    current_user: dict = Depends(lambda: {"id": "admin"}),
    db: AsyncIOMotorDatabase = Depends(lambda: None)
):
    """Update a lead"""
    existing_lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
    if not existing_lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    update_data = {k: v for k, v in lead.dict(exclude_unset=True).items()}
    
    # Normalize phone if updated
    if "primary_phone" in update_data:
        primary_norm, primary_raw, primary_valid = normalize_phone_india(update_data["primary_phone"])
        if not primary_valid:
            raise HTTPException(status_code=400, detail="Invalid primary phone number")
        update_data["primary_phone"] = primary_norm
        update_data["primary_phone_raw"] = primary_raw
    
    if "alternate_phone" in update_data and update_data["alternate_phone"]:
        alternate_norm, alternate_raw, alternate_valid = normalize_phone_india(update_data["alternate_phone"])
        if not alternate_valid:
            raise HTTPException(status_code=400, detail="Invalid alternate phone number")
        update_data["alternate_phone"] = alternate_norm
        update_data["alternate_phone_raw"] = alternate_raw
    
    update_data["updated_at"] = datetime.utcnow()
    
    # Log status change activity
    if "status" in update_data and update_data["status"] != existing_lead.get("status"):
        activity = {
            "lead_id": lead_id,
            "activity_type": LeadActivityType.STATUS_CHANGE,
            "title": f"Status changed to {update_data['status']}",
            "description": f"Status changed from {existing_lead.get('status')} to {update_data['status']}",
            "created_by": current_user["id"],
            "created_at": datetime.utcnow()
        }
        await db.lead_activities.insert_one(activity)
    
    result = await db.leads.find_one_and_update(
        {"_id": ObjectId(lead_id)},
        {"$set": update_data},
        return_document=True
    )
    
    return await get_lead(lead_id, db)


@crm_router.delete("/leads/{lead_id}")
async def delete_lead(
    lead_id: str,
    current_user: dict = Depends(lambda: {"id": "admin"}),
    db: AsyncIOMotorDatabase = Depends(lambda: None)
):
    """Delete a lead"""
    result = await db.leads.delete_one({"_id": ObjectId(lead_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Delete associated activities
    await db.lead_activities.delete_many({"lead_id": lead_id})
    
    return {"message": "Lead deleted successfully"}


# ============= Lead Activity Routes =============

@crm_router.post("/leads/{lead_id}/activities", response_model=LeadActivityResponse)
async def create_lead_activity(
    lead_id: str,
    activity: LeadActivityCreate,
    current_user: dict = Depends(lambda: {"id": "admin", "full_name": "Admin"}),
    db: AsyncIOMotorDatabase = Depends(lambda: None)
):
    """Create a new activity for a lead"""
    # Verify lead exists
    lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    activity_dict = activity.dict()
    activity_dict["created_by"] = current_user["id"]
    activity_dict["created_at"] = datetime.utcnow()
    
    result = await db.lead_activities.insert_one(activity_dict)
    
    # Update lead's last_contacted if it's a contact activity
    if activity.activity_type in [LeadActivityType.CALL, LeadActivityType.WHATSAPP, LeadActivityType.EMAIL]:
        await db.leads.update_one(
            {"_id": ObjectId(lead_id)},
            {"$set": {"last_contacted": datetime.utcnow()}}
        )
    
    activity_dict["id"] = str(result.inserted_id)
    activity_dict["created_by_name"] = current_user.get("full_name")
    
    return LeadActivityResponse(**{k: v for k, v in activity_dict.items() if k != "_id"})


@crm_router.get("/leads/{lead_id}/activities", response_model=List[LeadActivityResponse])
async def list_lead_activities(
    lead_id: str,
    activity_type: Optional[LeadActivityType] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncIOMotorDatabase = Depends(lambda: None)
):
    """List all activities for a lead"""
    query = {"lead_id": lead_id}
    if activity_type:
        query["activity_type"] = activity_type
    
    activities = await db.lead_activities.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    
    result = []
    for activity in activities:
        # Get created by name
        if activity.get("created_by"):
            user = await db.users.find_one({"_id": ObjectId(activity["created_by"])})
            activity["created_by_name"] = user["full_name"] if user else None
        
        activity["id"] = str(activity["_id"])
        result.append(LeadActivityResponse(**{k: v for k, v in activity.items() if k != "_id"}))
    
    return result


# More routes will be in the next part due to length...
# (Integration Settings, WhatsApp Templates, Bulk Operations, etc.)
