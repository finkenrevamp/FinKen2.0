"""
Email Service for FinKen 2.0
Handles sending emails using Mailjet API
"""

import os
import logging
from typing import Optional
from mailjet_rest import Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

# Mailjet configuration
MAILJET_API_KEY = os.getenv("MAILJET_API_KEY")
MAILJET_API_SECRET = os.getenv("MAILJET_API_SECRET")
SENDER_EMAIL = "noreply@job-fit-ai.com"
SENDER_NAME = "FinKen 2.0"


class EmailService:
    """Email service using Mailjet API"""
    
    def __init__(self):
        """Initialize Mailjet client"""
        if not MAILJET_API_KEY or not MAILJET_API_SECRET:
            raise ValueError("Mailjet API credentials not found in environment variables")
        
        self.client = Client(auth=(MAILJET_API_KEY, MAILJET_API_SECRET), version='v3.1')
        logger.info("Mailjet email service initialized")
    
    def send_email(
        self,
        sender_email: str,
        sender_name: str,
        receiver_email: str,
        receiver_name: str,
        subject: str,
        body: str,
        html_body: Optional[str] = None
    ) -> dict:
        """
        Send an email using Mailjet API
        
        Args:
            sender_email: Email address of the sender (used for Reply-To)
            sender_name: Name of the sender
            receiver_email: Email address of the recipient
            receiver_name: Name of the recipient
            subject: Email subject line
            body: Plain text email body
            html_body: Optional HTML email body
            
        Returns:
            dict: Response from Mailjet API
            
        Raises:
            Exception: If email sending fails
        """
        try:
            # Construct the email data
            email_data = {
                'Messages': [
                    {
                        "From": {
                            "Email": SENDER_EMAIL,
                            "Name": SENDER_NAME
                        },
                        "To": [
                            {
                                "Email": receiver_email,
                                "Name": receiver_name
                            }
                        ],
                        "ReplyTo": {
                            "Email": sender_email,
                            "Name": sender_name
                        },
                        "Subject": subject,
                        "TextPart": body,
                    }
                ]
            }
            
            # Add HTML body if provided
            if html_body:
                email_data['Messages'][0]['HTMLPart'] = html_body
            
            # Send the email
            logger.info(f"Sending email from {sender_email} to {receiver_email} with subject: {subject}")
            result = self.client.send.create(data=email_data)
            
            # Check response status
            if result.status_code == 200:
                logger.info(f"Email sent successfully to {receiver_email}")
                return {
                    "success": True,
                    "message": "Email sent successfully",
                    "data": result.json()
                }
            else:
                logger.error(f"Failed to send email. Status: {result.status_code}, Response: {result.json()}")
                return {
                    "success": False,
                    "message": f"Failed to send email. Status: {result.status_code}",
                    "data": result.json()
                }
                
        except Exception as e:
            logger.error(f"Error sending email: {str(e)}")
            raise Exception(f"Failed to send email: {str(e)}")


# Global email service instance
_email_service_instance: Optional[EmailService] = None


def get_email_service() -> EmailService:
    """
    Get or create the email service singleton instance
    
    Returns:
        EmailService: Email service instance
    """
    global _email_service_instance
    
    if _email_service_instance is None:
        _email_service_instance = EmailService()
    
    return _email_service_instance


def send_email(
    sender_email: str,
    sender_name: str,
    receiver_email: str,
    receiver_name: str,
    subject: str,
    body: str,
    html_body: Optional[str] = None
) -> dict:
    """
    Convenience function to send an email
    
    Args:
        sender_email: Email address of the sender (used for Reply-To)
        sender_name: Name of the sender
        receiver_email: Email address of the recipient
        receiver_name: Name of the recipient
        subject: Email subject line
        body: Plain text email body
        html_body: Optional HTML email body
        
    Returns:
        dict: Response from Mailjet API with success status
        
    Example:
        >>> from services.emailUserFunction import send_email
        >>> result = send_email(
        ...     sender_email="admin@finken.com",
        ...     sender_name="Admin User",
        ...     receiver_email="user@example.com",
        ...     receiver_name="John Doe",
        ...     subject="Welcome to FinKen 2.0",
        ...     body="Hello John, welcome to our system!",
        ...     html_body="<h1>Hello John</h1><p>Welcome to our system!</p>"
        ... )
        >>> print(result['success'])
        True
    """
    email_service = get_email_service()
    return email_service.send_email(
        sender_email=sender_email,
        sender_name=sender_name,
        receiver_email=receiver_email,
        receiver_name=receiver_name,
        subject=subject,
        body=body,
        html_body=html_body
    )


# Additional helper functions for common email scenarios

def send_registration_approval_email(
    admin_email: str,
    admin_name: str,
    user_email: str,
    user_name: str,
    username: str,
    temporary_password: str
) -> dict:
    """
    Send registration approval email with login credentials
    
    Args:
        admin_email: Email of the admin who approved the registration
        admin_name: Name of the admin
        user_email: Email of the new user
        user_name: Name of the new user
        username: Assigned username
        temporary_password: Temporary password
        
    Returns:
        dict: Response from email service
    """
    subject = "FinKen 2.0 - Registration Approved"
    
    body = f"""Dear {user_name},

Your registration request for FinKen 2.0 has been approved!

Your login credentials are:
Username: {username}
Temporary Password: {temporary_password}

Please sign in at your earliest convenience and change your password.

If you have any questions, please reply to this email.

Best regards,
FinKen 2.0 Team
"""
    
    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #1976d2;">Welcome to FinKen 2.0!</h2>
            <p>Dear {user_name},</p>
            <p>Your registration request for FinKen 2.0 has been approved!</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Your Login Credentials</h3>
                <p><strong>Username:</strong> {username}</p>
                <p><strong>Temporary Password:</strong> {temporary_password}</p>
            </div>
            
            <p>Please sign in at your earliest convenience and change your password.</p>
            <p>If you have any questions, please reply to this email.</p>
            
            <p>Best regards,<br>FinKen 2.0 Team</p>
        </body>
    </html>
    """
    
    return send_email(
        sender_email=admin_email,
        sender_name=admin_name,
        receiver_email=user_email,
        receiver_name=user_name,
        subject=subject,
        body=body,
        html_body=html_body
    )


def send_registration_rejection_email(
    admin_email: str,
    admin_name: str,
    user_email: str,
    user_name: str,
    reason: str
) -> dict:
    """
    Send registration rejection email
    
    Args:
        admin_email: Email of the admin who rejected the registration
        admin_name: Name of the admin
        user_email: Email of the user
        user_name: Name of the user
        reason: Reason for rejection
        
    Returns:
        dict: Response from email service
    """
    subject = "FinKen 2.0 - Registration Request Update"
    
    body = f"""Dear {user_name},

Thank you for your interest in FinKen 2.0.

After reviewing your registration request, we are unable to approve it at this time.

Reason: {reason}

If you have any questions or would like to discuss this further, please reply to this email.

Best regards,
FinKen 2.0 Team
"""
    
    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #1976d2;">Registration Request Update</h2>
            <p>Dear {user_name},</p>
            <p>Thank you for your interest in FinKen 2.0.</p>
            <p>After reviewing your registration request, we are unable to approve it at this time.</p>
            
            <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
                <p><strong>Reason:</strong> {reason}</p>
            </div>
            
            <p>If you have any questions or would like to discuss this further, please reply to this email.</p>
            
            <p>Best regards,<br>FinKen 2.0 Team</p>
        </body>
    </html>
    """
    
    return send_email(
        sender_email=admin_email,
        sender_name=admin_name,
        receiver_email=user_email,
        receiver_name=user_name,
        subject=subject,
        body=body,
        html_body=html_body
    )


def send_password_expiry_notification(
    admin_email: str,
    admin_name: str,
    user_email: str,
    user_name: str,
    days_until_expiry: int
) -> dict:
    """
    Send password expiry notification
    
    Args:
        admin_email: Email of the admin sending the notification
        admin_name: Name of the admin
        user_email: Email of the user
        user_name: Name of the user
        days_until_expiry: Number of days until password expires
        
    Returns:
        dict: Response from email service
    """
    subject = f"FinKen 2.0 - Password Expiring in {days_until_expiry} Days"
    
    body = f"""Dear {user_name},

This is a reminder that your FinKen 2.0 password will expire in {days_until_expiry} day(s).

Please change your password before it expires to avoid any disruption to your access.

To change your password:
1. Sign in to FinKen 2.0
2. Go to your profile settings
3. Select "Change Password"

If you have any questions, please reply to this email.

Best regards,
FinKen 2.0 Team
"""
    
    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #ff9800;">Password Expiry Notice</h2>
            <p>Dear {user_name},</p>
            <p>This is a reminder that your FinKen 2.0 password will expire in <strong>{days_until_expiry} day(s)</strong>.</p>
            
            <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <p><strong>⚠️ Action Required</strong></p>
                <p>Please change your password before it expires to avoid any disruption to your access.</p>
            </div>
            
            <p><strong>To change your password:</strong></p>
            <ol>
                <li>Sign in to FinKen 2.0</li>
                <li>Go to your profile settings</li>
                <li>Select "Change Password"</li>
            </ol>
            
            <p>If you have any questions, please reply to this email.</p>
            
            <p>Best regards,<br>FinKen 2.0 Team</p>
        </body>
    </html>
    """
    
    return send_email(
        sender_email=admin_email,
        sender_name=admin_name,
        receiver_email=user_email,
        receiver_name=user_name,
        subject=subject,
        body=body,
        html_body=html_body
    )
