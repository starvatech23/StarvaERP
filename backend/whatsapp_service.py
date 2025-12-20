"""
WhatsApp Business API Integration Service
Handles sending messages, documents, and notifications via WhatsApp Cloud API
"""

import os
import aiohttp
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime

logger = logging.getLogger(__name__)

# WhatsApp API Configuration
WHATSAPP_API_VERSION = "v18.0"
WHATSAPP_API_BASE_URL = f"https://graph.facebook.com/{WHATSAPP_API_VERSION}"

# Load credentials from environment
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
WHATSAPP_BUSINESS_PHONE = os.getenv("WHATSAPP_BUSINESS_PHONE", "")


def format_phone_number(phone: str) -> str:
    """
    Format phone number to WhatsApp's required format (without + symbol)
    Example: +91-9886588992 -> 919886588992
    """
    if not phone:
        return ""
    # Remove all non-digit characters
    digits = ''.join(filter(str.isdigit, phone))
    # Ensure it has country code (assume India +91 if not present)
    if len(digits) == 10:
        digits = "91" + digits
    return digits


class WhatsAppService:
    """Service class for WhatsApp Business API operations"""
    
    def __init__(self):
        self.access_token = WHATSAPP_ACCESS_TOKEN
        self.phone_number_id = WHATSAPP_PHONE_NUMBER_ID
        self.api_url = f"{WHATSAPP_API_BASE_URL}/{self.phone_number_id}/messages"
        self.headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
    
    def is_configured(self) -> bool:
        """Check if WhatsApp API is properly configured"""
        return bool(self.access_token and self.phone_number_id)
    
    async def send_text_message(
        self, 
        to_phone: str, 
        message: str,
        preview_url: bool = False
    ) -> Dict[str, Any]:
        """
        Send a text message via WhatsApp
        
        Args:
            to_phone: Recipient phone number (with country code)
            message: Text message content
            preview_url: Whether to show URL preview in message
            
        Returns:
            API response dict with success status and message_id
        """
        if not self.is_configured():
            logger.warning("WhatsApp API not configured - message not sent")
            return {"success": False, "error": "WhatsApp API not configured"}
        
        formatted_phone = format_phone_number(to_phone)
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": formatted_phone,
            "type": "text",
            "text": {
                "preview_url": preview_url,
                "body": message
            }
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.api_url,
                    headers=self.headers,
                    json=payload
                ) as response:
                    result = await response.json()
                    
                    if response.status == 200:
                        message_id = result.get("messages", [{}])[0].get("id", "")
                        logger.info(f"WhatsApp message sent successfully to {formatted_phone}, ID: {message_id}")
                        return {
                            "success": True,
                            "message_id": message_id,
                            "to": formatted_phone
                        }
                    else:
                        error_msg = result.get("error", {}).get("message", "Unknown error")
                        logger.error(f"WhatsApp API error: {error_msg}")
                        return {
                            "success": False,
                            "error": error_msg,
                            "details": result
                        }
        except Exception as e:
            logger.error(f"WhatsApp send error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def send_document(
        self,
        to_phone: str,
        document_url: str,
        filename: str,
        caption: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send a document (PDF, etc.) via WhatsApp
        
        Args:
            to_phone: Recipient phone number
            document_url: Public URL of the document
            filename: Display filename
            caption: Optional caption text
            
        Returns:
            API response dict
        """
        if not self.is_configured():
            logger.warning("WhatsApp API not configured - document not sent")
            return {"success": False, "error": "WhatsApp API not configured"}
        
        formatted_phone = format_phone_number(to_phone)
        
        document_obj = {
            "link": document_url,
            "filename": filename
        }
        if caption:
            document_obj["caption"] = caption
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": formatted_phone,
            "type": "document",
            "document": document_obj
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.api_url,
                    headers=self.headers,
                    json=payload
                ) as response:
                    result = await response.json()
                    
                    if response.status == 200:
                        message_id = result.get("messages", [{}])[0].get("id", "")
                        logger.info(f"WhatsApp document sent to {formatted_phone}, ID: {message_id}")
                        return {
                            "success": True,
                            "message_id": message_id,
                            "to": formatted_phone
                        }
                    else:
                        error_msg = result.get("error", {}).get("message", "Unknown error")
                        logger.error(f"WhatsApp document error: {error_msg}")
                        return {
                            "success": False,
                            "error": error_msg,
                            "details": result
                        }
        except Exception as e:
            logger.error(f"WhatsApp document send error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def send_template_message(
        self,
        to_phone: str,
        template_name: str,
        language_code: str = "en",
        components: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """
        Send a pre-approved template message
        
        Args:
            to_phone: Recipient phone number
            template_name: Name of the approved template
            language_code: Template language code
            components: Template components (header, body, buttons)
            
        Returns:
            API response dict
        """
        if not self.is_configured():
            return {"success": False, "error": "WhatsApp API not configured"}
        
        formatted_phone = format_phone_number(to_phone)
        
        template_obj = {
            "name": template_name,
            "language": {"code": language_code}
        }
        if components:
            template_obj["components"] = components
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": formatted_phone,
            "type": "template",
            "template": template_obj
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.api_url,
                    headers=self.headers,
                    json=payload
                ) as response:
                    result = await response.json()
                    
                    if response.status == 200:
                        message_id = result.get("messages", [{}])[0].get("id", "")
                        return {
                            "success": True,
                            "message_id": message_id,
                            "to": formatted_phone
                        }
                    else:
                        error_msg = result.get("error", {}).get("message", "Unknown error")
                        return {
                            "success": False,
                            "error": error_msg,
                            "details": result
                        }
        except Exception as e:
            return {"success": False, "error": str(e)}


# Singleton instance
whatsapp_service = WhatsAppService()


# Convenience functions for common use cases

async def send_po_notification(
    vendor_phone: str,
    vendor_name: str,
    po_number: str,
    project_name: str,
    total_amount: float,
    items_summary: str,
    delivery_location: str,
    required_by: str
) -> Dict[str, Any]:
    """Send Purchase Order notification to vendor"""
    message = f"""🏗️ *New Purchase Order*

*PO Number:* {po_number}
*Project:* {project_name}

*Items Ordered:*
{items_summary}

*Total Amount:* ₹{total_amount:,.2f}

*Delivery Location:* {delivery_location}
*Required By:* {required_by}

Please confirm receipt of this order and expected delivery timeline.

Thank you for your business!"""
    
    return await whatsapp_service.send_text_message(vendor_phone, message)


async def send_lead_notification(
    to_phone: str,
    lead_name: str,
    lead_phone: str,
    project_type: str,
    source: str
) -> Dict[str, Any]:
    """Send new lead notification"""
    message = f"""📋 *New Lead Received*

*Name:* {lead_name}
*Phone:* {lead_phone}
*Project Type:* {project_type}
*Source:* {source}

Please follow up within 24 hours."""
    
    return await whatsapp_service.send_text_message(to_phone, message)


async def send_followup_reminder(
    to_phone: str,
    lead_name: str,
    followup_type: str,
    scheduled_time: str,
    notes: str
) -> Dict[str, Any]:
    """Send follow-up reminder"""
    message = f"""⏰ *Follow-up Reminder*

*Lead:* {lead_name}
*Type:* {followup_type}
*Scheduled:* {scheduled_time}

*Notes:* {notes}

Don't forget to complete this follow-up!"""
    
    return await whatsapp_service.send_text_message(to_phone, message)


async def send_meeting_invite(
    to_phone: str,
    client_name: str,
    meeting_date: str,
    meeting_time: str,
    location: str,
    agenda: str
) -> Dict[str, Any]:
    """Send meeting invitation via WhatsApp"""
    message = f"""📅 *Meeting Invitation*

Dear {client_name},

You have a scheduled meeting:

*Date:* {meeting_date}
*Time:* {meeting_time}
*Location:* {location}

*Agenda:* {agenda}

Please confirm your attendance.

Best regards,
StarVacon Team"""
    
    return await whatsapp_service.send_text_message(to_phone, message)


async def send_payment_receipt(
    to_phone: str,
    worker_name: str,
    amount: float,
    payment_date: str,
    project_name: str,
    payment_ref: str
) -> Dict[str, Any]:
    """Send labour payment receipt"""
    message = f"""💰 *Payment Receipt*

*Worker:* {worker_name}
*Amount Paid:* ₹{amount:,.2f}
*Date:* {payment_date}
*Project:* {project_name}
*Reference:* {payment_ref}

Thank you for your work!

- StarVacon Team"""
    
    return await whatsapp_service.send_text_message(to_phone, message)


async def send_project_update(
    to_phone: str,
    client_name: str,
    project_name: str,
    update_type: str,
    details: str
) -> Dict[str, Any]:
    """Send project status update"""
    message = f"""🏗️ *Project Update*

Dear {client_name},

*Project:* {project_name}
*Update:* {update_type}

{details}

For any queries, please contact us.

Best regards,
StarVacon Team"""
    
    return await whatsapp_service.send_text_message(to_phone, message)
