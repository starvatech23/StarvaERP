"""
Brevo SMS Service for OTP and notifications
Replaces Twilio SMS integration
"""

import os
import logging
import requests
import json
from typing import Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

# Load Brevo credentials from environment
BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")
BREVO_SMS_SENDER = os.getenv("BREVO_SMS_SENDER", "StarvaTech")


class BrevoSMSService:
    """Service class for Brevo SMS operations"""
    
    def __init__(self):
        self.api_key = BREVO_API_KEY
        self.sender = BREVO_SMS_SENDER
        self.api_url = "https://api.brevo.com/v3/transactionalSMS/sms"
        
        if self.is_configured():
            logger.info("Brevo SMS Service initialized successfully")
        else:
            logger.warning("Brevo SMS API key not configured")
    
    def is_configured(self) -> bool:
        """Check if Brevo SMS is properly configured"""
        return bool(self.api_key)
    
    def format_phone_number(self, phone: str) -> str:
        """
        Format phone number for Brevo (E.164 format without +)
        Example: 9886588992 -> 919886588992
        """
        if not phone:
            return ""
        
        # Remove all non-digit characters
        cleaned = ''.join(c for c in phone if c.isdigit())
        
        # If 10 digits, assume India (91)
        if len(cleaned) == 10:
            return f"91{cleaned}"
        
        # If 11 digits starting with 0, remove 0 and add 91
        if len(cleaned) == 11 and cleaned.startswith('0'):
            return f"91{cleaned[1:]}"
        
        # If already has country code, return as is
        if len(cleaned) >= 11:
            return cleaned
        
        # Otherwise, prepend 91
        return f"91{cleaned}"
    
    def send_sms(
        self,
        to_phone: str,
        message: str
    ) -> Dict[str, Any]:
        """
        Send SMS via Brevo API
        
        Args:
            to_phone: Recipient phone number
            message: SMS message content
            
        Returns:
            Dict with success status, message_id, and any errors
        """
        if not self.is_configured():
            logger.warning("Brevo SMS not configured - SMS not sent")
            return {
                "success": False,
                "error": "Brevo SMS not configured"
            }
        
        formatted_phone = self.format_phone_number(to_phone)
        
        if not formatted_phone:
            return {
                "success": False,
                "error": "Invalid phone number"
            }
        
        try:
            headers = {
                "accept": "application/json",
                "api-key": self.api_key,
                "content-type": "application/json"
            }
            
            payload = {
                "sender": self.sender,
                "recipient": formatted_phone,
                "content": message,
                "tag": "transactional"
            }
            
            response = requests.post(
                self.api_url,
                headers=headers,
                data=json.dumps(payload),
                timeout=30
            )
            
            if response.status_code == 201 or response.status_code == 200:
                result = response.json()
                logger.info(f"Brevo SMS sent successfully to {formatted_phone}, messageId: {result.get('messageId')}")
                
                return {
                    "success": True,
                    "message_id": result.get("messageId"),
                    "message_sid": str(result.get("messageId")),  # For compatibility
                    "to": formatted_phone,
                    "sms_count": result.get("smsCount", 1),
                    "credits_used": result.get("usedCredits"),
                    "credits_remaining": result.get("remainingCredits")
                }
            else:
                error_msg = response.text
                try:
                    error_data = response.json()
                    error_msg = error_data.get("message", response.text)
                except:
                    pass
                
                logger.error(f"Brevo SMS API error: {response.status_code} - {error_msg}")
                return {
                    "success": False,
                    "error": error_msg,
                    "error_code": response.status_code
                }
            
        except requests.exceptions.Timeout:
            logger.error("Brevo SMS API timeout")
            return {
                "success": False,
                "error": "Request timeout"
            }
        except Exception as e:
            logger.error(f"SMS send error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def send_otp(
        self,
        to_phone: str,
        otp_code: str,
        app_name: str = "SiteOps"
    ) -> Dict[str, Any]:
        """
        Send OTP SMS
        
        Args:
            to_phone: Recipient phone number
            otp_code: The OTP code to send
            app_name: App name for the message
            
        Returns:
            Dict with success status
        """
        message = f"Your {app_name} verification code is: {otp_code}. Valid for 10 minutes. Do not share this code."
        return self.send_sms(to_phone, message)
    
    def send_payment_otp(
        self,
        to_phone: str,
        otp_code: str,
        worker_name: str,
        amount: float
    ) -> Dict[str, Any]:
        """
        Send payment verification OTP to worker
        """
        message = f"Hi {worker_name}, your payment verification OTP is: {otp_code}. Amount: Rs.{amount:,.2f}. Valid for 10 minutes."
        return self.send_sms(to_phone, message)
    
    def send_payment_confirmation(
        self,
        to_phone: str,
        worker_name: str,
        amount: float,
        payment_ref: str
    ) -> Dict[str, Any]:
        """
        Send payment confirmation SMS
        """
        message = f"Hi {worker_name}, payment of Rs.{amount:,.2f} has been processed. Ref: {payment_ref}. Thank you! - StarvaTech"
        return self.send_sms(to_phone, message)


# Singleton instance
brevo_sms_service = BrevoSMSService()


# Convenience functions (compatible with old twilio_service interface)
def send_otp_sms(phone: str, otp_code: str) -> Dict[str, Any]:
    """Send OTP via SMS"""
    return brevo_sms_service.send_otp(phone, otp_code)


def send_payment_otp_sms(phone: str, otp_code: str, worker_name: str, amount: float) -> Dict[str, Any]:
    """Send payment OTP via SMS"""
    return brevo_sms_service.send_payment_otp(phone, otp_code, worker_name, amount)


def send_sms(phone: str, message: str) -> Dict[str, Any]:
    """Send general SMS"""
    return brevo_sms_service.send_sms(phone, message)
