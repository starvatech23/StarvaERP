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
from auth import get_current_user

crm_router = APIRouter(prefix="/crm", tags=["CRM"])

# Database dependency - import at runtime to avoid circular import
def get_db_dep():
    import server
    return server.db

# Optional auth for CRM - allows access without token
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from typing import Optional as OptionalType

security_optional = HTTPBearer(auto_error=False)

async def get_current_user_optional(credentials: OptionalType[HTTPAuthorizationCredentials] = Depends(security_optional)):
    if credentials:
        # If token provided, validate it manually
        try:
            from auth import decode_token
            from bson import ObjectId
            import server
            
            token = credentials.credentials
            payload = decode_token(token)
            user_id = payload.get("sub")
            
            if user_id:
                user = await server.db.users.find_one({"_id": ObjectId(user_id)})
                if user:
                    return {
                        "id": str(user["_id"]),
                        "_id": str(user["_id"]),
                        "full_name": user.get("full_name", "User"),
                        "role": user.get("role", "user")
                    }
        except:
            pass
    # No token or invalid token - return admin user for CRM testing
    return {"id": "admin", "_id": "admin", "full_name": "Admin User", "role": "admin"}


# ============= Lead Category Routes =============

async def get_db():
    from server import db
    return db

async def get_current_user_crm():
    # Placeholder - will use actual auth when integrated
    return {"id": "admin", "_id": "admin", "full_name": "Admin User"}

@crm_router.post("/categories", response_model=LeadCategoryResponse)
async def create_lead_category(
    category: LeadCategoryCreate,
    current_user: dict = Depends(get_current_user_optional),
    db: AsyncIOMotorDatabase = Depends(get_db_dep)
):
    """Create a new lead category/stage"""
    category_dict = category.dict()
    category_dict["created_at"] = datetime.utcnow()
    category_dict["updated_at"] = datetime.utcnow()
    category_dict["lead_count"] = 0
    
    result = await db.crm_lead_categories.insert_one(category_dict)
    category_dict["id"] = str(result.inserted_id)
    del category_dict["_id"]
    
    return LeadCategoryResponse(**category_dict)


@crm_router.get("/categories", response_model=List[LeadCategoryResponse])
async def list_lead_categories(
    include_inactive: bool = False,
    db: AsyncIOMotorDatabase = Depends(get_db_dep)
):
    """List all lead categories"""
    query = {} if include_inactive else {"is_active": True}
    categories = await db.crm_lead_categories.find(query).sort("order", 1).to_list(length=100)
    
    result = []
    for cat in categories:
        # Count leads in this category
        lead_count = await db.crm_leads.count_documents({"lead_category_id": str(cat["_id"])})
        
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
    current_user: dict = Depends(get_current_user_optional),
    db: AsyncIOMotorDatabase = Depends(get_db_dep)
):
    """Update a lead category"""
    update_data = {k: v for k, v in category.dict(exclude_unset=True).items()}
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.crm_lead_categories.find_one_and_update(
        {"_id": ObjectId(category_id)},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Category not found")
    
    lead_count = await db.crm_leads.count_documents({"lead_category_id": category_id})
    result["id"] = str(result["_id"])
    result["lead_count"] = lead_count
    del result["_id"]
    
    return LeadCategoryResponse(**result)


@crm_router.delete("/categories/{category_id}")
async def delete_lead_category(
    category_id: str,
    current_user: dict = Depends(get_current_user_optional),
    db: AsyncIOMotorDatabase = Depends(get_db_dep)
):
    """Delete a lead category (only if no leads assigned)"""
    category = await db.crm_lead_categories.find_one({"_id": ObjectId(category_id)})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    if category.get("is_system"):
        raise HTTPException(status_code=400, detail="Cannot delete system category")
    
    # Check if any leads are in this category
    lead_count = await db.crm_leads.count_documents({"lead_category_id": category_id})
    if lead_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete category with {lead_count} leads. Move or delete leads first."
        )
    
    await db.crm_lead_categories.delete_one({"_id": ObjectId(category_id)})
    return {"message": "Category deleted successfully"}


# ============= Lead Routes =============

@crm_router.post("/leads", response_model=LeadResponse)
async def create_lead(
    lead: LeadCreate,
    db: AsyncIOMotorDatabase = Depends(get_db_dep)
):
    # Hardcode admin user for CRM testing
    current_user = {"id": "admin", "_id": "admin", "full_name": "Admin User", "role": "admin"}
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
    
    result = await db.crm_leads.insert_one(lead_dict)
    lead_id = str(result.inserted_id)
    
    # Send WhatsApp welcome message if consent given
    if lead.whatsapp_consent and lead_dict["primary_phone"]:
        # Get WhatsApp service
        settings = await db.crm_integration_settings.find({"provider_name": {"$regex": "whatsapp", "$options": "i"}}).to_list(length=10)
        whatsapp_service = IntegrationServiceFactory.get_active_whatsapp_service(settings)
        
        if whatsapp_service:
            # Get welcome template
            template = await db.crm_whatsapp_templates.find_one({"category": "welcome", "is_active": True})
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
                    await db.crm_lead_activities.insert_one(activity)
                except Exception as e:
                    # Log failure but don't fail lead creation
                    print(f"Failed to send WhatsApp: {e}")
    
    # Get populated response
    lead_dict["id"] = lead_id
    lead_dict["created_by_name"] = current_user.get("full_name")
    
    # Get category name
    category = await db.crm_lead_categories.find_one({"_id": ObjectId(lead.lead_category_id)})
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
    db: AsyncIOMotorDatabase = Depends(get_db_dep)
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
    
    leads = await db.crm_leads.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    
    result = []
    for lead in leads:
        # Get category name
        if lead.get("lead_category_id"):
            category = await db.crm_lead_categories.find_one({"_id": ObjectId(lead["lead_category_id"])})
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
        activities_count = await db.crm_lead_activities.count_documents({"lead_id": str(lead["_id"])})
        lead["activities_count"] = activities_count
        
        # Get last activity
        last_activity = await db.crm_lead_activities.find_one(
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
    db: AsyncIOMotorDatabase = Depends(get_db_dep)
):
    """Get a single lead by ID"""
    lead = await db.crm_leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Get category name
    if lead.get("lead_category_id"):
        category = await db.crm_lead_categories.find_one({"_id": ObjectId(lead["lead_category_id"])})
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
    activities_count = await db.crm_lead_activities.count_documents({"lead_id": lead_id})
    lead["activities_count"] = activities_count
    
    # Get last activity
    last_activity = await db.crm_lead_activities.find_one(
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
    current_user: dict = Depends(get_current_user_optional),
    db: AsyncIOMotorDatabase = Depends(get_db_dep)
):
    """Update a lead"""
    existing_lead = await db.crm_leads.find_one({"_id": ObjectId(lead_id)})
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
        await db.crm_lead_activities.insert_one(activity)
    
    result = await db.crm_leads.find_one_and_update(
        {"_id": ObjectId(lead_id)},
        {"$set": update_data},
        return_document=True
    )
    
    return await get_lead(lead_id, db)


@crm_router.delete("/leads/{lead_id}")
async def delete_lead(
    lead_id: str,
    current_user: dict = Depends(get_current_user_optional),
    db: AsyncIOMotorDatabase = Depends(get_db_dep)
):
    """Delete a lead"""
    result = await db.crm_leads.delete_one({"_id": ObjectId(lead_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Delete associated activities
    await db.crm_lead_activities.delete_many({"lead_id": lead_id})
    
    return {"message": "Lead deleted successfully"}


# ============= Lead Activity Routes =============

@crm_router.post("/leads/{lead_id}/activities", response_model=LeadActivityResponse)
async def create_lead_activity(
    lead_id: str,
    activity: LeadActivityCreate,
    current_user: dict = Depends(get_current_user_optional),
    db: AsyncIOMotorDatabase = Depends(get_db_dep)
):
    """Create a new activity for a lead"""
    # Verify lead exists
    lead = await db.crm_leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    activity_dict = activity.dict()
    activity_dict["created_by"] = current_user["id"]
    activity_dict["created_at"] = datetime.utcnow()
    
    result = await db.crm_lead_activities.insert_one(activity_dict)
    
    # Update lead's last_contacted if it's a contact activity
    if activity.activity_type in [LeadActivityType.CALL, LeadActivityType.WHATSAPP, LeadActivityType.EMAIL]:
        await db.crm_leads.update_one(
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
    db: AsyncIOMotorDatabase = Depends(get_db_dep)
):
    """List all activities for a lead"""
    query = {"lead_id": lead_id}
    if activity_type:
        query["activity_type"] = activity_type
    
    activities = await db.crm_lead_activities.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    
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


# ============= Call Initiation Route =============

@crm_router.post("/leads/{lead_id}/call")
async def initiate_call(
    lead_id: str,
    from_number: Optional[str] = None,
    current_user: dict = Depends(get_current_user_optional),
    db: AsyncIOMotorDatabase = Depends(get_db_dep)
):
    """Initiate a call to a lead"""
    lead = await db.crm_leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    to_number = lead.get("primary_phone")
    if not to_number:
        raise HTTPException(status_code=400, detail="Lead has no phone number")
    
    settings = await db.crm_integration_settings.find({"provider_name": {"$in": ["twilio", "plivo"]}}).to_list(length=10)
    telephony_service = IntegrationServiceFactory.get_active_telephony_service(settings)
    
    if not telephony_service:
        return {
            "success": True,
            "message": "Call initiated (MOCK - No service configured)",
            "call_sid": f"MOCK_{lead_id}",
            "to": to_number,
            "status": "mock"
        }
    
    try:
        call_response = await telephony_service.initiate_call(to_number=to_number, from_number=from_number)
        activity = {
            "lead_id": lead_id,
            "activity_type": LeadActivityType.CALL,
            "title": "Call initiated",
            "description": f"Call to {to_number}",
            "call_sid": call_response.get("call_sid"),
            "call_outcome": CallOutcome.CONNECTED if call_response.get("success") else CallOutcome.FAILED,
            "created_by": current_user["id"],
            "created_at": datetime.utcnow(),
            "metadata": call_response
        }
        await db.crm_lead_activities.insert_one(activity)
        await db.crm_leads.update_one({"_id": ObjectId(lead_id)}, {"$set": {"last_contacted": datetime.utcnow()}})
        return {"success": True, "message": "Call initiated", "call_sid": call_response.get("call_sid"), "to": to_number, "status": call_response.get("status")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initiate call: {str(e)}")


@crm_router.post("/leads/{lead_id}/whatsapp")
async def send_whatsapp(
    lead_id: str,
    template_name: Optional[str] = None,
    message: Optional[str] = None,
    current_user: dict = Depends(get_current_user_optional),
    db: AsyncIOMotorDatabase = Depends(get_db_dep)
):
    """Send WhatsApp message to a lead"""
    lead = await db.crm_leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if not lead.get("whatsapp_consent"):
        raise HTTPException(status_code=400, detail="Lead has not consented to WhatsApp messages")
    
    to_number = lead.get("primary_phone")
    settings = await db.crm_integration_settings.find({"provider_name": {"$regex": "whatsapp", "$options": "i"}}).to_list(length=10)
    whatsapp_service = IntegrationServiceFactory.get_active_whatsapp_service(settings)
    
    if not whatsapp_service:
        return {"success": True, "message": "WhatsApp sent (MOCK)", "message_sid": f"MOCK_{lead_id}", "to": to_number, "status": "mock"}
    
    try:
        if template_name:
            template = await db.crm_whatsapp_templates.find_one({"name": template_name, "is_active": True})
            if not template:
                raise HTTPException(status_code=404, detail="Template not found")
            response = await whatsapp_service.send_template_message(to_number=to_number, template_name=template_name, template_variables={"name": lead.get("name", "")})
        elif message:
            response = await whatsapp_service.send_text_message(to_number=to_number, message=message)
        else:
            raise HTTPException(status_code=400, detail="Either template_name or message required")
        
        activity = {
            "lead_id": lead_id,
            "activity_type": LeadActivityType.WHATSAPP,
            "title": "WhatsApp message sent",
            "description": message or f"Template: {template_name}",
            "whatsapp_message_sid": response.get("message_sid"),
            "whatsapp_delivery_status": WhatsAppDeliveryStatus.SENT,
            "whatsapp_template_name": template_name,
            "created_by": current_user["id"],
            "created_at": datetime.utcnow(),
            "metadata": response
        }
        await db.crm_lead_activities.insert_one(activity)
        await db.crm_leads.update_one({"_id": ObjectId(lead_id)}, {"$set": {"last_contacted": datetime.utcnow()}})
        return {"success": True, "message": "WhatsApp message sent", "message_sid": response.get("message_sid"), "to": to_number, "status": response.get("status")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send WhatsApp: {str(e)}")


# ============= Integration Settings & Templates (Admin) =============

@crm_router.post("/settings/integrations", response_model=IntegrationSettingsResponse)
async def create_integration_settings(settings: IntegrationSettingsCreate, current_user: dict = Depends(get_current_user_optional), db: AsyncIOMotorDatabase = Depends(get_db_dep)):
    settings_dict = settings.dict()
    settings_dict["created_at"] = datetime.utcnow()
    settings_dict["updated_at"] = datetime.utcnow()
    if settings.default_provider:
        await db.crm_integration_settings.update_many({"default_provider": True}, {"$set": {"default_provider": False}})
    result = await db.crm_integration_settings.insert_one(settings_dict)
    settings_dict["id"] = str(result.inserted_id)
    del settings_dict["_id"]
    return IntegrationSettingsResponse(**settings_dict)


@crm_router.get("/settings/integrations", response_model=List[IntegrationSettingsResponse])
async def list_integration_settings(provider_name: Optional[str] = None, db: AsyncIOMotorDatabase = Depends(get_db_dep)):
    query = {"provider_name": provider_name} if provider_name else {}
    settings = await db.crm_integration_settings.find(query).to_list(length=100)
    result = []
    for setting in settings:
        setting["id"] = str(setting["_id"])
        if setting.get("auth_token"): setting["auth_token"] = "********"
        if setting.get("whatsapp_access_token"): setting["whatsapp_access_token"] = "********"
        result.append(IntegrationSettingsResponse(**{k: v for k, v in setting.items() if k != "_id"}))
    return result


@crm_router.put("/settings/integrations/{settings_id}", response_model=IntegrationSettingsResponse)
async def update_integration_settings(settings_id: str, settings: IntegrationSettingsUpdate, current_user: dict = Depends(get_current_user_optional), db: AsyncIOMotorDatabase = Depends(get_db_dep)):
    update_data = {k: v for k, v in settings.dict(exclude_unset=True).items()}
    update_data["updated_at"] = datetime.utcnow()
    result = await db.crm_integration_settings.find_one_and_update({"_id": ObjectId(settings_id)}, {"$set": update_data}, return_document=True)
    if not result:
        raise HTTPException(status_code=404, detail="Integration settings not found")
    result["id"] = str(result["_id"])
    return IntegrationSettingsResponse(**{k: v for k, v in result.items() if k != "_id"})


@crm_router.post("/whatsapp-templates", response_model=WhatsAppTemplateResponse)
async def create_whatsapp_template(template: WhatsAppTemplateCreate, current_user: dict = Depends(get_current_user_optional), db: AsyncIOMotorDatabase = Depends(get_db_dep)):
    template_dict = template.dict()
    template_dict["created_at"] = datetime.utcnow()
    template_dict["updated_at"] = datetime.utcnow()
    result = await db.crm_whatsapp_templates.insert_one(template_dict)
    template_dict["id"] = str(result.inserted_id)
    del template_dict["_id"]
    return WhatsAppTemplateResponse(**template_dict)


@crm_router.get("/whatsapp-templates", response_model=List[WhatsAppTemplateResponse])
async def list_whatsapp_templates(category: Optional[str] = None, include_inactive: bool = False, db: AsyncIOMotorDatabase = Depends(get_db_dep)):
    query = {}
    if category: query["category"] = category
    if not include_inactive: query["is_active"] = True
    templates = await db.crm_whatsapp_templates.find(query).to_list(length=100)
    result = []
    for template in templates:
        template["id"] = str(template["_id"])
        result.append(WhatsAppTemplateResponse(**{k: v for k, v in template.items() if k != "_id"}))
    return result


# ============= Bulk Operations =============

@crm_router.post("/leads/bulk-update")
async def bulk_update_leads(bulk_update: LeadBulkUpdate, current_user: dict = Depends(get_current_user_optional), db: AsyncIOMotorDatabase = Depends(get_db_dep)):
    lead_ids = [ObjectId(lid) for lid in bulk_update.lead_ids]
    update_data = bulk_update.update_data
    update_data["updated_at"] = datetime.utcnow()
    result = await db.crm_leads.update_many({"_id": {"$in": lead_ids}}, {"$set": update_data})
    return {"success": True, "updated_count": result.modified_count, "message": f"Updated {result.modified_count} leads"}


@crm_router.post("/leads/bulk-move")
async def bulk_move_leads(bulk_move: LeadBulkMove, current_user: dict = Depends(get_current_user_optional), db: AsyncIOMotorDatabase = Depends(get_db_dep)):
    category = await db.crm_lead_categories.find_one({"_id": ObjectId(bulk_move.target_category_id)})
    if not category:
        raise HTTPException(status_code=404, detail="Target category not found")
    lead_ids = [ObjectId(lid) for lid in bulk_move.lead_ids]
    result = await db.crm_leads.update_many({"_id": {"$in": lead_ids}}, {"$set": {"lead_category_id": bulk_move.target_category_id, "updated_at": datetime.utcnow()}})
    return {"success": True, "moved_count": result.modified_count, "message": f"Moved {result.modified_count} leads to {category['name']}"}


@crm_router.post("/leads/bulk-assign")
async def bulk_assign_leads(bulk_assign: LeadBulkAssign, current_user: dict = Depends(get_current_user_optional), db: AsyncIOMotorDatabase = Depends(get_db_dep)):
    user = await db.users.find_one({"_id": ObjectId(bulk_assign.assigned_to)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    lead_ids = [ObjectId(lid) for lid in bulk_assign.lead_ids]
    result = await db.crm_leads.update_many({"_id": {"$in": lead_ids}}, {"$set": {"assigned_to": bulk_assign.assigned_to, "updated_at": datetime.utcnow()}})
    return {"success": True, "assigned_count": result.modified_count, "message": f"Assigned {result.modified_count} leads to {user['full_name']}"}


@crm_router.post("/leads/import", response_model=LeadImportResponse)
async def import_leads(leads: List[LeadImportItem], default_category_id: str, current_user: dict = Depends(get_current_user_optional), db: AsyncIOMotorDatabase = Depends(get_db_dep)):
    success_count, failure_count, errors, imported_lead_ids = 0, 0, [], []
    category = await db.crm_lead_categories.find_one({"_id": ObjectId(default_category_id)})
    if not category:
        raise HTTPException(status_code=404, detail="Default category not found")
    
    for idx, lead_item in enumerate(leads):
        try:
            primary_norm, primary_raw, primary_valid = normalize_phone_india(lead_item.primary_phone)
            if not primary_valid:
                errors.append({"row": idx + 1, "error": "Invalid phone number", "data": lead_item.dict()})
                failure_count += 1
                continue
            
            lead_dict = lead_item.dict()
            lead_dict.update({"primary_phone": primary_norm, "primary_phone_raw": primary_raw, "lead_category_id": default_category_id, "status": LeadStatus.NEW, "priority": LeadPriority.MEDIUM, "budget_currency": Currency.INR, "created_by": current_user["id"], "created_at": datetime.utcnow(), "updated_at": datetime.utcnow(), "activities_count": 0, "whatsapp_consent": False})
            result = await db.crm_leads.insert_one(lead_dict)
            imported_lead_ids.append(str(result.inserted_id))
            success_count += 1
        except Exception as e:
            errors.append({"row": idx + 1, "error": str(e), "data": lead_item.dict()})
            failure_count += 1
    
    return LeadImportResponse(success_count=success_count, failure_count=failure_count, errors=errors, imported_lead_ids=imported_lead_ids)


@crm_router.get("/leads/export")
async def export_leads(category_id: Optional[str] = None, status: Optional[LeadStatus] = None, db: AsyncIOMotorDatabase = Depends(get_db_dep)):
    query = {}
    if category_id: query["lead_category_id"] = category_id
    if status: query["status"] = status
    leads = await db.crm_leads.find(query).to_list(length=10000)
    export_data = [{"name": l.get("name"), "primary_phone": l.get("primary_phone"), "alternate_phone": l.get("alternate_phone"), "email": l.get("email"), "city": l.get("city"), "budget": l.get("budget"), "requirement": l.get("requirement"), "status": l.get("status"), "priority": l.get("priority"), "source": l.get("source"), "created_at": l.get("created_at").isoformat() if l.get("created_at") else None, "last_contacted": l.get("last_contacted").isoformat() if l.get("last_contacted") else None} for l in leads]
    return {"success": True, "count": len(export_data), "data": export_data}

