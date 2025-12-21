"""
Twilio SMS Service for OTP and notifications
"""

import os
import logging
from typing import Optional, Dict, Any
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

# Load Twilio credentials from environment
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")

# Debug logging
print(f"DEBUG: TWILIO_ACCOUNT_SID = {TWILIO_ACCOUNT_SID}")
print(f"DEBUG: TWILIO_AUTH_TOKEN = {'SET' if TWILIO_AUTH_TOKEN else 'NOT SET'}")
print(f"DEBUG: TWILIO_PHONE_NUMBER = {TWILIO_PHONE_NUMBER}")


class TwilioSMSService:
    """Service class for Twilio SMS operations"""
    
    def __init__(self):
        self.account_sid = TWILIO_ACCOUNT_SID
        self.auth_token = TWILIO_AUTH_TOKEN
        self.from_number = TWILIO_PHONE_NUMBER
        self.client = None
        
        if self.is_configured():
            try:
                self.client = Client(self.account_sid, self.auth_token)
                logger.info("Twilio SMS Service initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Twilio client: {e}")
    
    def is_configured(self) -> bool:
        """Check if Twilio is properly configured"""
        return bool(self.account_sid and self.auth_token and self.from_number)
    
    def format_phone_number(self, phone: str) -> str:
        """
        Format phone number to E.164 format
        Example: 9886588992 -> +919886588992
        """
        if not phone:
            return ""
        
        # Remove all non-digit characters except +
        cleaned = ''.join(c for c in phone if c.isdigit() or c == '+')
        
        # If already has +, return as is
        if cleaned.startswith('+'):
            return cleaned
        
        # If 10 digits, assume India (+91)
        if len(cleaned) == 10:
            return f"+91{cleaned}"
        
        # If 11 digits starting with 0, remove 0 and add +91
        if len(cleaned) == 11 and cleaned.startswith('0'):
            return f"+91{cleaned[1:]}"
        
        # If 12 digits starting with 91, add +
        if len(cleaned) == 12 and cleaned.startswith('91'):
            return f"+{cleaned}"
        
        # Otherwise, add + prefix
        return f"+{cleaned}"
    
    def send_sms(
        self,
        to_phone: str,
        message: str
    ) -> Dict[str, Any]:
        """
        Send SMS via Twilio
        
        Args:
            to_phone: Recipient phone number
            message: SMS message content (max 1600 chars)
            
        Returns:
            Dict with success status, message_sid, and any errors
        """
        if not self.is_configured():
            logger.warning("Twilio not configured - SMS not sent")
            return {
                "success": False,
                "error": "Twilio SMS not configured"
            }
        
        if not self.client:
            return {
                "success": False,
                "error": "Twilio client not initialized"
            }
        
        formatted_phone = self.format_phone_number(to_phone)
        
        if not formatted_phone:
            return {
                "success": False,
                "error": "Invalid phone number"
            }
        
        try:
            # Send SMS via Twilio
            twilio_message = self.client.messages.create(
                body=message,
                from_=self.from_number,
                to=formatted_phone
            )
            
            logger.info(f"SMS sent successfully to {formatted_phone}, SID: {twilio_message.sid}")
            
            return {
                "success": True,
                "message_sid": twilio_message.sid,
                "to": formatted_phone,
                "status": twilio_message.status
            }
            
        except TwilioRestException as e:
            logger.error(f"Twilio API error: {e.msg}")
            return {
                "success": False,
                "error": e.msg,
                "error_code": e.code
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
        app_name: str = "StarVacon"
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
        message = f"Hi {worker_name}, payment of Rs.{amount:,.2f} has been processed. Ref: {payment_ref}. Thank you! - StarVacon"
        return self.send_sms(to_phone, message)


# Singleton instance
twilio_sms_service = TwilioSMSService()


# Convenience functions
def send_otp_sms(phone: str, otp_code: str) -> Dict[str, Any]:
    """Send OTP via SMS"""
    return twilio_sms_service.send_otp(phone, otp_code)


def send_payment_otp_sms(phone: str, otp_code: str, worker_name: str, amount: float) -> Dict[str, Any]:
    """Send payment OTP via SMS"""
    return twilio_sms_service.send_payment_otp(phone, otp_code, worker_name, amount)


def send_sms(phone: str, message: str) -> Dict[str, Any]:
    """Send general SMS"""
    return twilio_sms_service.send_sms(phone, message)
