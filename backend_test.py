#!/usr/bin/env python3
"""
Backend Test Suite for Twilio SMS OTP Integration (LOGIN Flow)
Testing endpoints: /api/auth/send-otp and /api/auth/verify-otp
"""

import requests
import json
import time
import os
import sys
from datetime import datetime

# Backend URL from frontend/.env
BACKEND_URL = "https://siteops-deploy.preview.emergentagent.com/api"

# Test phone number as suggested in the review request
TEST_PHONE = "9886588992"

class TwilioOTPTester:
    def __init__(self):
        self.backend_url = BACKEND_URL
        self.test_phone = TEST_PHONE
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        
    def log(self, message):
        """Log with timestamp"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {message}")
        
    def test_send_otp_login(self):
        """Test POST /api/auth/send-otp for login flow"""
        self.log("🔄 Testing LOGIN OTP Send...")
        
        url = f"{self.backend_url}/auth/send-otp"
        payload = {
            "phone": self.test_phone
        }
        
        try:
            response = self.session.post(url, json=payload, timeout=30)
            
            self.log(f"📤 Request: POST {url}")
            self.log(f"📤 Payload: {json.dumps(payload, indent=2)}")
            self.log(f"📥 Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"📥 Response: {json.dumps(data, indent=2)}")
                
                # Check critical fields
                provider = data.get("provider")
                message_sid = data.get("message_sid")
                otp_for_testing = data.get("otp_for_testing")
                twilio_error = data.get("twilio_error")
                
                self.log(f"🔍 Provider: {provider}")
                
                if provider == "twilio":
                    self.log("✅ SUCCESS: Real Twilio SMS was sent!")
                    self.log(f"📱 Twilio Message SID: {message_sid}")
                    return {
                        "success": True,
                        "provider": "twilio",
                        "message_sid": message_sid,
                        "otp_for_testing": None
                    }
                elif provider == "mock":
                    if twilio_error:
                        self.log(f"⚠️  FALLBACK: Twilio failed, using mock mode")
                        self.log(f"❌ Twilio Error: {twilio_error}")
                    else:
                        self.log("⚠️  MOCK MODE: Twilio not configured")
                    
                    self.log(f"🔑 OTP for Testing: {otp_for_testing}")
                    return {
                        "success": True,
                        "provider": "mock",
                        "message_sid": None,
                        "otp_for_testing": otp_for_testing
                    }
                else:
                    self.log(f"❌ UNKNOWN PROVIDER: {provider}")
                    return {"success": False, "error": f"Unknown provider: {provider}"}
                    
            else:
                self.log(f"❌ FAILED: HTTP {response.status_code}")
                try:
                    error_data = response.json()
                    self.log(f"❌ Error: {json.dumps(error_data, indent=2)}")
                except:
                    self.log(f"❌ Error: {response.text}")
                return {"success": False, "error": f"HTTP {response.status_code}"}
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ REQUEST ERROR: {str(e)}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            self.log(f"❌ UNEXPECTED ERROR: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def test_verify_otp_login(self, otp_code):
        """Test POST /api/auth/verify-otp for login flow"""
        self.log(f"🔄 Testing LOGIN OTP Verification with code: {otp_code}")
        
        url = f"{self.backend_url}/auth/verify-otp"
        payload = {
            "phone": self.test_phone,
            "otp": otp_code,
            "full_name": "Test User",
            "role": "engineer"
        }
        
        try:
            response = self.session.post(url, json=payload, timeout=30)
            
            self.log(f"📤 Request: POST {url}")
            self.log(f"📤 Payload: {json.dumps(payload, indent=2)}")
            self.log(f"📥 Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"📥 Response: {json.dumps(data, indent=2)}")
                
                # Check for access token
                access_token = data.get("access_token")
                user_data = data.get("user")
                
                if access_token and user_data:
                    self.log("✅ SUCCESS: OTP verification successful!")
                    self.log(f"🔑 Access Token: {access_token[:20]}...")
                    self.log(f"👤 User: {user_data.get('full_name')} ({user_data.get('role')})")
                    return {"success": True, "access_token": access_token, "user": user_data}
                else:
                    self.log("❌ FAILED: Missing access token or user data")
                    return {"success": False, "error": "Missing access token or user data"}
                    
            else:
                self.log(f"❌ FAILED: HTTP {response.status_code}")
                try:
                    error_data = response.json()
                    self.log(f"❌ Error: {json.dumps(error_data, indent=2)}")
                except:
                    self.log(f"❌ Error: {response.text}")
                return {"success": False, "error": f"HTTP {response.status_code}"}
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ REQUEST ERROR: {str(e)}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            self.log(f"❌ UNEXPECTED ERROR: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def check_backend_logs(self):
        """Check backend logs for Twilio SMS messages"""
        self.log("🔄 Checking backend logs for Twilio SMS messages...")
        
        try:
            # Check supervisor backend logs
            import subprocess
            result = subprocess.run(
                ["tail", "-n", "50", "/var/log/supervisor/backend.out.log"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                logs = result.stdout
                twilio_lines = [line for line in logs.split('\n') if '[TWILIO SMS]' in line or 'MOCK SMS' in line]
                
                if twilio_lines:
                    self.log("📋 Found Twilio/SMS related log entries:")
                    for line in twilio_lines[-5:]:  # Show last 5 entries
                        self.log(f"   {line}")
                else:
                    self.log("📋 No Twilio SMS log entries found in recent logs")
            else:
                self.log("⚠️  Could not read backend logs")
                
        except Exception as e:
            self.log(f"⚠️  Error reading logs: {str(e)}")
    
    def run_comprehensive_test(self):
        """Run comprehensive Twilio OTP integration test"""
        self.log("🚀 Starting Comprehensive Twilio SMS OTP Integration Test")
        self.log("=" * 80)
        self.log(f"📱 Test Phone: {self.test_phone}")
        self.log(f"🌐 Backend URL: {self.backend_url}")
        self.log("=" * 80)
        
        # Test 1: Send OTP
        self.log("\n📋 TEST 1: Send OTP for Login")
        send_result = self.test_send_otp_login()
        
        if not send_result.get("success"):
            self.log("❌ CRITICAL: Send OTP failed - cannot continue with verification test")
            return {
                "send_otp": send_result,
                "verify_otp": {"success": False, "error": "Skipped due to send OTP failure"},
                "overall_success": False
            }
        
        # Test 2: Check backend logs
        self.log("\n📋 TEST 2: Check Backend Logs")
        self.check_backend_logs()
        
        # Test 3: Verify OTP (if we have test OTP)
        verify_result = {"success": False, "error": "No OTP available for testing"}
        
        if send_result.get("otp_for_testing"):
            self.log("\n📋 TEST 3: Verify OTP")
            time.sleep(2)  # Brief pause
            verify_result = self.test_verify_otp_login(send_result["otp_for_testing"])
        else:
            self.log("\n📋 TEST 3: Verify OTP - SKIPPED")
            self.log("⚠️  Real Twilio SMS sent - OTP not available for automated testing")
            self.log("📱 Please check your phone for the SMS and manually verify if needed")
        
        # Summary
        self.log("\n" + "=" * 80)
        self.log("📊 TEST SUMMARY")
        self.log("=" * 80)
        
        provider = send_result.get("provider")
        if provider == "twilio":
            self.log("✅ TWILIO INTEGRATION: WORKING - Real SMS sent via Twilio")
            self.log(f"📱 Message SID: {send_result.get('message_sid')}")
        elif provider == "mock":
            if send_result.get("twilio_error"):
                self.log("⚠️  TWILIO INTEGRATION: FAILED - Falling back to mock mode")
                self.log(f"❌ Twilio Error: {send_result.get('twilio_error')}")
            else:
                self.log("⚠️  TWILIO INTEGRATION: NOT CONFIGURED - Using mock mode")
        
        overall_success = send_result.get("success", False)
        
        return {
            "send_otp": send_result,
            "verify_otp": verify_result,
            "overall_success": overall_success,
            "provider": provider
        }

def main():
    """Main test execution"""
    print("🔧 Twilio SMS OTP Integration Test Suite")
    print("=" * 50)
    
    tester = TwilioOTPTester()
    results = tester.run_comprehensive_test()
    
    # Exit with appropriate code
    if results["overall_success"]:
        print("\n✅ Tests completed successfully")
        sys.exit(0)
    else:
        print("\n❌ Tests failed")
        sys.exit(1)

if __name__ == "__main__":
    main()