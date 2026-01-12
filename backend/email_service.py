"""
Email Service for SiteOps using SendGrid

This module handles all email sending functionality including:
- Password reset emails
- Notification emails
- Welcome emails
"""

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class EmailDeliveryError(Exception):
    """Custom exception for email delivery failures"""
    pass

class EmailService:
    """SendGrid Email Service wrapper"""
    
    def __init__(self):
        self.api_key = os.getenv('SENDGRID_API_KEY')
        self.sender_email = os.getenv('SENDER_EMAIL', 'noreply@starvacon.com')
        self.sender_name = os.getenv('SENDER_NAME', 'SiteOps')
        self.is_configured = bool(self.api_key)
        
        if not self.is_configured:
            logger.warning("SendGrid API key not configured. Emails will be logged only.")
    
    def send_email(
        self, 
        to_email: str, 
        subject: str, 
        html_content: str,
        plain_content: Optional[str] = None
    ) -> bool:
        """
        Send an email via SendGrid
        
        Args:
            to_email: Recipient email address
            subject: Email subject line
            html_content: HTML email content
            plain_content: Plain text email content (optional)
        
        Returns:
            True if email was sent successfully
        """
        # Log the email for debugging
        logger.info(f"Email to: {to_email}, Subject: {subject}")
        
        if not self.is_configured:
            # Mock mode - just log the email
            logger.info(f"[MOCK EMAIL] To: {to_email}")
            logger.info(f"[MOCK EMAIL] Subject: {subject}")
            logger.info(f"[MOCK EMAIL] Content: {html_content[:200]}...")
            return True
        
        try:
            message = Mail(
                from_email=(self.sender_email, self.sender_name),
                to_emails=to_email,
                subject=subject,
                html_content=html_content
            )
            
            if plain_content:
                message.plain_text_content = plain_content
            
            sg = SendGridAPIClient(self.api_key)
            response = sg.send(message)
            
            if response.status_code in [200, 201, 202]:
                logger.info(f"Email sent successfully to {to_email}")
                return True
            else:
                logger.error(f"Failed to send email. Status: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Email delivery failed: {str(e)}")
            raise EmailDeliveryError(f"Failed to send email: {str(e)}")
    
    def send_password_reset_email(
        self, 
        to_email: str, 
        reset_token: str,
        full_name: str,
        reset_url_base: Optional[str] = None
    ) -> bool:
        """
        Send password reset email
        
        Args:
            to_email: Recipient email
            reset_token: The password reset token
            full_name: User's full name
            reset_url_base: Base URL for reset link (defaults to app URL)
        """
        if not reset_url_base:
            reset_url_base = os.getenv('FRONTEND_BASE_URL', 'https://authsystem-dash.preview.emergentagent.com')
        
        reset_link = f"{reset_url_base}/reset-password?token={reset_token}"
        
        subject = "Reset Your SiteOps Password"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #2563EB; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 30px; background-color: #f9fafb; }}
                .button {{ 
                    display: inline-block; 
                    background-color: #2563EB; 
                    color: white; 
                    padding: 12px 30px; 
                    text-decoration: none; 
                    border-radius: 6px;
                    margin: 20px 0;
                }}
                .footer {{ padding: 20px; text-align: center; color: #666; font-size: 12px; }}
                .warning {{ color: #DC2626; font-size: 14px; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏗️ SiteOps</h1>
                </div>
                <div class="content">
                    <h2>Password Reset Request</h2>
                    <p>Hello {full_name},</p>
                    <p>We received a request to reset your password for your SiteOps account. Click the button below to create a new password:</p>
                    
                    <p style="text-align: center;">
                        <a href="{reset_link}" class="button">Reset Password</a>
                    </p>
                    
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px;">
                        {reset_link}
                    </p>
                    
                    <p class="warning">
                        ⚠️ This link will expire in 1 hour. If you didn't request this password reset, please ignore this email or contact support if you have concerns.
                    </p>
                </div>
                <div class="footer">
                    <p>© 2025 SiteOps by Starvacon. All rights reserved.</p>
                    <p>This is an automated message, please do not reply directly.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        plain_content = f"""
        Password Reset Request
        
        Hello {full_name},
        
        We received a request to reset your password for your SiteOps account.
        
        Click here to reset your password: {reset_link}
        
        This link will expire in 1 hour.
        
        If you didn't request this password reset, please ignore this email.
        
        © 2025 SiteOps by Starvacon
        """
        
        return self.send_email(to_email, subject, html_content, plain_content)
    
    def send_welcome_email(self, to_email: str, full_name: str, temp_password: Optional[str] = None) -> bool:
        """Send welcome email to new users"""
        subject = "Welcome to SiteOps!"
        
        password_section = ""
        if temp_password:
            password_section = f"""
            <p><strong>Your temporary password:</strong> {temp_password}</p>
            <p>Please change this password after your first login.</p>
            """
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #2563EB; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 30px; background-color: #f9fafb; }}
                .footer {{ padding: 20px; text-align: center; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏗️ SiteOps</h1>
                </div>
                <div class="content">
                    <h2>Welcome to SiteOps!</h2>
                    <p>Hello {full_name},</p>
                    <p>Your SiteOps account has been created successfully. You can now access the application using your email address.</p>
                    {password_section}
                    <p>If you have any questions, please contact your administrator.</p>
                </div>
                <div class="footer">
                    <p>© 2025 SiteOps by Starvacon. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, html_content)

# Create singleton instance
email_service = EmailService()
