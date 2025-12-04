"""
Integration services for telephony and WhatsApp
Mocked implementations that can be replaced with real API calls
"""
import logging
from typing import Optional, Dict, Any
from datetime import datetime
from utils import generate_token, process_template

logger = logging.getLogger(__name__)

# ============= Base Service Class =============

class BaseIntegrationService:
    """Base class for integration services"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.test_mode = config.get('test_mode', True)
        self.is_active = config.get('is_active', False)
    
    def is_configured(self) -> bool:
        """Check if service is properly configured"""
        return self.is_active and not self.test_mode


# ============= Telephony Service (Mock Twilio/Plivo) =============

class TelephonyService(BaseIntegrationService):
    """
    Telephony service for making calls
    Mocked implementation - can be replaced with real Twilio/Plivo integration
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.provider = config.get('provider_name', 'twilio')
        self.account_sid = config.get('account_sid')
        self.auth_token = config.get('auth_token')
        self.from_number = config.get('phone_number')
    
    async def initiate_call(
        self,
        to_number: str,
        from_number: Optional[str] = None,
        callback_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Initiate an outbound call
        
        Returns:
            {
                'call_sid': str,
                'status': str,
                'success': bool,
                'message': str
            }
        """
        if self.test_mode:
            # Mock response
            call_sid = f"CA{generate_token(16)}"
            logger.info(f"[MOCK] Initiating call to {to_number} from {from_number or self.from_number}")
            return {
                'call_sid': call_sid,
                'status': 'queued',
                'success': True,
                'message': 'Call initiated (MOCK)',
                'to': to_number,
                'from': from_number or self.from_number,
                'timestamp': datetime.utcnow().isoformat()
            }
        
        # Real Twilio implementation would go here
        # from twilio.rest import Client
        # client = Client(self.account_sid, self.auth_token)
        # call = client.calls.create(
        #     to=to_number,
        #     from_=from_number or self.from_number,
        #     url=callback_url or 'http://demo.twilio.com/docs/voice.xml'
        # )
        # return {
        #     'call_sid': call.sid,
        #     'status': call.status,
        #     'success': True,
        #     'message': 'Call initiated'
        # }
        
        raise NotImplementedError("Real telephony integration not configured")
    
    async def get_call_status(self, call_sid: str) -> Dict[str, Any]:
        """Get call status and details"""
        if self.test_mode:
            # Mock response
            logger.info(f"[MOCK] Getting status for call {call_sid}")
            return {
                'call_sid': call_sid,
                'status': 'completed',
                'duration': 120,  # seconds
                'outcome': 'connected',
                'recording_url': None,
                'timestamp': datetime.utcnow().isoformat()
            }
        
        raise NotImplementedError("Real telephony integration not configured")
    
    async def get_recording(self, call_sid: str) -> Optional[str]:
        """Get call recording URL"""
        if self.test_mode:
            logger.info(f"[MOCK] No recording available for mock call {call_sid}")
            return None
        
        raise NotImplementedError("Real telephony integration not configured")


# ============= WhatsApp Service (Mock WhatsApp Business API) =============

class WhatsAppService(BaseIntegrationService):
    """
    WhatsApp messaging service
    Mocked implementation - can be replaced with real WhatsApp Business API
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.provider = config.get('provider_name', 'whatsapp_business')
        self.phone_number_id = config.get('whatsapp_phone_number_id')
        self.business_account_id = config.get('whatsapp_business_account_id')
        self.access_token = config.get('whatsapp_access_token')
        self.from_number = config.get('whatsapp_number')
    
    async def send_template_message(
        self,
        to_number: str,
        template_name: str,
        template_variables: Dict[str, str],
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Send a WhatsApp template message
        
        Returns:
            {
                'message_sid': str,
                'status': str,
                'success': bool,
                'message': str
            }
        """
        if self.test_mode:
            # Mock response
            message_sid = f"WA{generate_token(16)}"
            logger.info(f"[MOCK] Sending WhatsApp template '{template_name}' to {to_number}")
            logger.info(f"[MOCK] Variables: {template_variables}")
            return {
                'message_sid': message_sid,
                'status': 'sent',
                'success': True,
                'message': 'WhatsApp message sent (MOCK)',
                'to': to_number,
                'template': template_name,
                'timestamp': datetime.utcnow().isoformat()
            }
        
        # Real WhatsApp Business API implementation would go here
        # import requests
        # url = f"https://graph.facebook.com/v18.0/{self.phone_number_id}/messages"
        # headers = {
        #     "Authorization": f"Bearer {self.access_token}",
        #     "Content-Type": "application/json"
        # }
        # data = {
        #     "messaging_product": "whatsapp",
        #     "to": to_number,
        #     "type": "template",
        #     "template": {
        #         "name": template_name,
        #         "language": {"code": language},
        #         "components": [...]  # Build from template_variables
        #     }
        # }
        # response = requests.post(url, headers=headers, json=data)
        # return response.json()
        
        raise NotImplementedError("Real WhatsApp integration not configured")
    
    async def send_text_message(
        self,
        to_number: str,
        message: str
    ) -> Dict[str, Any]:
        """Send a plain text WhatsApp message"""
        if self.test_mode:
            # Mock response
            message_sid = f"WA{generate_token(16)}"
            logger.info(f"[MOCK] Sending WhatsApp text to {to_number}: {message[:50]}...")
            return {
                'message_sid': message_sid,
                'status': 'sent',
                'success': True,
                'message': 'WhatsApp message sent (MOCK)',
                'to': to_number,
                'timestamp': datetime.utcnow().isoformat()
            }
        
        raise NotImplementedError("Real WhatsApp integration not configured")
    
    async def send_document(
        self,
        to_number: str,
        document_url: str,
        filename: str,
        caption: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send a document via WhatsApp"""
        if self.test_mode:
            # Mock response
            message_sid = f"WA{generate_token(16)}"
            logger.info(f"[MOCK] Sending WhatsApp document '{filename}' to {to_number}")
            return {
                'message_sid': message_sid,
                'status': 'sent',
                'success': True,
                'message': 'WhatsApp document sent (MOCK)',
                'to': to_number,
                'filename': filename,
                'timestamp': datetime.utcnow().isoformat()
            }
        
        raise NotImplementedError("Real WhatsApp integration not configured")
    
    async def get_message_status(self, message_sid: str) -> Dict[str, Any]:
        """Get WhatsApp message delivery status"""
        if self.test_mode:
            # Mock response with delivery progression
            logger.info(f"[MOCK] Getting status for WhatsApp message {message_sid}")
            return {
                'message_sid': message_sid,
                'status': 'delivered',  # sent, delivered, read, failed
                'delivered_at': datetime.utcnow().isoformat(),
                'read_at': None,
                'timestamp': datetime.utcnow().isoformat()
            }
        
        raise NotImplementedError("Real WhatsApp integration not configured")


# ============= Service Factory =============

class IntegrationServiceFactory:
    """Factory to create integration service instances"""
    
    @staticmethod
    def create_telephony_service(config: Dict[str, Any]) -> TelephonyService:
        """Create telephony service instance"""
        return TelephonyService(config)
    
    @staticmethod
    def create_whatsapp_service(config: Dict[str, Any]) -> WhatsAppService:
        """Create WhatsApp service instance"""
        return WhatsAppService(config)
    
    @staticmethod
    def get_active_telephony_service(settings_list: list) -> Optional[TelephonyService]:
        """Get the active/default telephony service from settings list"""
        for setting in settings_list:
            if setting.get('provider_name') in ['twilio', 'plivo'] and setting.get('is_active'):
                return IntegrationServiceFactory.create_telephony_service(setting)
        return None
    
    @staticmethod
    def get_active_whatsapp_service(settings_list: list) -> Optional[WhatsAppService]:
        """Get the active/default WhatsApp service from settings list"""
        for setting in settings_list:
            if 'whatsapp' in setting.get('provider_name', '').lower() and setting.get('is_active'):
                return IntegrationServiceFactory.create_whatsapp_service(setting)
        return None
