#!/usr/bin/env python3
"""
Backend API Testing for Client Portal Login Flow
Tests the complete Client Portal Login flow with new Project Code format
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://labourmanage.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "admin123"

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.test_project_id = None
        self.test_project_code = None
        self.test_client_contact = None
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def make_request(self, method: str, endpoint: str, data: Dict = None, 
                    headers: Dict = None, auth_token: str = None) -> requests.Response:
        """Make HTTP request with proper error handling"""
        url = f"{BASE_URL}{endpoint}"
        
        # Set up headers
        req_headers = {"Content-Type": "application/json"}
        if headers:
            req_headers.update(headers)
        if auth_token:
            req_headers["Authorization"] = f"Bearer {auth_token}"
            
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=req_headers, params=data)
            elif method.upper() == "POST":
                response = self.session.post(url, headers=req_headers, json=data)
            elif method.upper() == "PUT":
                response = self.session.put(url, headers=req_headers, json=data)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=req_headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            self.log(f"Request failed: {str(e)}", "ERROR")
            raise
            
    def authenticate_admin(self) -> bool:
        """Authenticate as admin user"""
        self.log("🔐 Authenticating as admin...")
        
        response = self.make_request("POST", "/auth/login", {
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "auth_type": "email"
        })
        
        if response.status_code == 200:
            data = response.json()
            self.admin_token = data.get("access_token")
            self.log(f"✅ Admin authentication successful")
            return True
        else:
            self.log(f"❌ Admin authentication failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_create_project_with_templates(self) -> bool:
        """Test 1: Create a new project with templates to get fresh project code"""
        self.log("🏗️ Testing: Create project with templates...")
        
        # Generate test data
        test_phone = "+919999888777"
        project_data = {
            "name": f"Test Project {datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "client_name": "Test Client Portal User",
            "client_contact": test_phone,
            "client_email": "testclient@example.com",
            "number_of_floors": 1,
            "planned_start_date": (datetime.utcnow() + timedelta(days=7)).isoformat(),
            "total_built_area": 2000,
            "building_type": "residential",
            "description": "Test project for client portal login testing",
            "location": "Test Location"
        }
        
        response = self.make_request("POST", "/projects/create-with-templates", 
                                   project_data, auth_token=self.admin_token)
        
        if response.status_code == 200:
            data = response.json()
            self.test_project_id = data.get("project_id")
            self.test_project_code = data.get("project_code")
            self.test_client_contact = test_phone
            
            # Verify project code format (SC + MMYY + 6 digits)
            if self.test_project_code and self.test_project_code.startswith("SC"):
                month_year = datetime.utcnow().strftime("%m%y")
                expected_prefix = f"SC{month_year}"
                if self.test_project_code.startswith(expected_prefix) and len(self.test_project_code) == 12:
                    self.log(f"✅ Project created successfully with code: {self.test_project_code}")
                    self.log(f"   Project ID: {self.test_project_id}")
                    self.log(f"   Client Contact: {self.test_client_contact}")
                    return True
                else:
                    self.log(f"❌ Invalid project code format: {self.test_project_code} (Expected: {expected_prefix}XXXXXX with length 12)", "ERROR")
                    return False
            else:
                self.log(f"❌ Project code missing or invalid: {self.test_project_code}", "ERROR")
                return False
        else:
            self.log(f"❌ Project creation failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_verify_project_data(self) -> bool:
        """Test 2: Verify project has correct data saved"""
        self.log("🔍 Testing: Verify project data saved correctly...")
        
        if not self.test_project_id:
            self.log("❌ No test project ID available", "ERROR")
            return False
            
        response = self.make_request("GET", f"/projects/{self.test_project_id}", 
                                   auth_token=self.admin_token)
        
        if response.status_code == 200:
            data = response.json()
            project_code = data.get("project_code")
            client_contact = data.get("client_contact")
            
            # Verify project_code
            if project_code == self.test_project_code:
                self.log(f"✅ Project code verified: {project_code}")
            else:
                self.log(f"❌ Project code mismatch. Expected: {self.test_project_code}, Got: {project_code}", "ERROR")
                return False
                
            # Verify client_contact
            if client_contact == self.test_client_contact:
                self.log(f"✅ Client contact verified: {client_contact}")
            else:
                self.log(f"❌ Client contact mismatch. Expected: {self.test_client_contact}, Got: {client_contact}", "ERROR")
                return False
                
            return True
        else:
            self.log(f"❌ Failed to retrieve project: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_client_portal_login_with_project_code(self) -> bool:
        """Test 3: Test Client Portal Login with Project Code"""
        self.log("🔑 Testing: Client Portal Login with Project Code...")
        
        if not self.test_project_code or not self.test_client_contact:
            self.log("❌ Missing test project code or client contact", "ERROR")
            return False
            
        # Test with project code (new format)
        login_data = {
            "project_id": self.test_project_code,
            "mobile": self.test_client_contact
        }
        
        response = self.make_request("POST", "/client-portal/login", login_data)
        
        if response.status_code == 200:
            data = response.json()
            access_token = data.get("access_token")
            project_name = data.get("project_name")
            client_name = data.get("client_name")
            
            if access_token and project_name and client_name:
                self.log(f"✅ Client portal login successful with project code")
                self.log(f"   Access Token: {access_token[:20]}...")
                self.log(f"   Project Name: {project_name}")
                self.log(f"   Client Name: {client_name}")
                return True
            else:
                self.log(f"❌ Login response missing required fields", "ERROR")
                return False
        else:
            self.log(f"❌ Client portal login failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_client_portal_login_with_mongodb_id(self) -> bool:
        """Test 4: Test Client Portal Login with MongoDB ObjectId (backward compatibility)"""
        self.log("🔑 Testing: Client Portal Login with MongoDB ObjectId...")
        
        if not self.test_project_id or not self.test_client_contact:
            self.log("❌ Missing test project ID or client contact", "ERROR")
            return False
            
        # Test with MongoDB ObjectId (backward compatibility)
        login_data = {
            "project_id": self.test_project_id,
            "mobile": self.test_client_contact
        }
        
        response = self.make_request("POST", "/client-portal/login", login_data)
        
        if response.status_code == 200:
            data = response.json()
            access_token = data.get("access_token")
            project_name = data.get("project_name")
            client_name = data.get("client_name")
            
            if access_token and project_name and client_name:
                self.log(f"✅ Client portal login successful with MongoDB ObjectId")
                self.log(f"   Access Token: {access_token[:20]}...")
                self.log(f"   Project Name: {project_name}")
                self.log(f"   Client Name: {client_name}")
                return True
            else:
                self.log(f"❌ Login response missing required fields", "ERROR")
                return False
        else:
            self.log(f"❌ Client portal login failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_send_client_credentials(self) -> bool:
        """Test 5: Test Send Client Credentials"""
        self.log("📱 Testing: Send Client Credentials...")
        
        if not self.test_project_id:
            self.log("❌ Missing test project ID", "ERROR")
            return False
            
        # Test sending credentials
        send_data = {
            "send_whatsapp": True,
            "send_sms": False,
            "send_email": False,
            "custom_message": "Test message for client portal credentials"
        }
        
        response = self.make_request("POST", f"/projects/{self.test_project_id}/send-client-credentials", 
                                   send_data, auth_token=self.admin_token)
        
        if response.status_code == 200:
            data = response.json()
            message = data.get("message", "")
            whatsapp_link = data.get("whatsapp_link", "")
            
            # Verify the message contains Project Code (not MongoDB ID)
            if self.test_project_code in message:
                self.log(f"✅ Client credentials sent successfully")
                self.log(f"   Message contains Project Code: {self.test_project_code}")
                
                # Verify WhatsApp link is generated
                if whatsapp_link and "wa.me" in whatsapp_link:
                    self.log(f"✅ WhatsApp link generated: {whatsapp_link[:50]}...")
                    return True
                else:
                    self.log(f"⚠️ WhatsApp link not generated or invalid: {whatsapp_link}")
                    # Still consider test passed if message contains project code
                    return True
            else:
                self.log(f"❌ Message does not contain Project Code. Message: {message[:100]}...", "ERROR")
                return False
        else:
            self.log(f"❌ Send client credentials failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def test_invalid_login_scenarios(self) -> bool:
        """Test 6: Test invalid login scenarios"""
        self.log("🚫 Testing: Invalid login scenarios...")
        
        test_cases = [
            {
                "name": "Invalid project code",
                "data": {"project_id": "SC1225999999", "mobile": self.test_client_contact},
                "expected_status": 401
            },
            {
                "name": "Invalid mobile number",
                "data": {"project_id": self.test_project_code, "mobile": "+919999999999"},
                "expected_status": 401
            },
            {
                "name": "Missing project_id",
                "data": {"mobile": self.test_client_contact},
                "expected_status": 400
            },
            {
                "name": "Missing mobile",
                "data": {"project_id": self.test_project_code},
                "expected_status": 400
            }
        ]
        
        all_passed = True
        for test_case in test_cases:
            response = self.make_request("POST", "/client-portal/login", test_case["data"])
            
            if response.status_code == test_case["expected_status"]:
                self.log(f"✅ {test_case['name']}: Correctly rejected with status {response.status_code}")
            else:
                self.log(f"❌ {test_case['name']}: Expected status {test_case['expected_status']}, got {response.status_code}", "ERROR")
                all_passed = False
                
        return all_passed
        
    def run_all_tests(self) -> bool:
        """Run all tests in sequence"""
        self.log("🚀 Starting Client Portal Login Flow Tests...")
        self.log("=" * 60)
        
        tests = [
            ("Admin Authentication", self.authenticate_admin),
            ("Create Project with Templates", self.test_create_project_with_templates),
            ("Verify Project Data", self.test_verify_project_data),
            ("Client Portal Login with Project Code", self.test_client_portal_login_with_project_code),
            ("Client Portal Login with MongoDB ObjectId", self.test_client_portal_login_with_mongodb_id),
            ("Send Client Credentials", self.test_send_client_credentials),
            ("Invalid Login Scenarios", self.test_invalid_login_scenarios)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            self.log(f"\n📋 Running: {test_name}")
            try:
                if test_func():
                    passed += 1
                    self.log(f"✅ {test_name}: PASSED")
                else:
                    self.log(f"❌ {test_name}: FAILED")
            except Exception as e:
                self.log(f"❌ {test_name}: ERROR - {str(e)}", "ERROR")
                
        self.log("\n" + "=" * 60)
        self.log(f"🏁 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            self.log("🎉 ALL TESTS PASSED! Client Portal Login flow is working correctly.")
            return True
        else:
            self.log(f"⚠️ {total - passed} tests failed. Please check the issues above.")
            return False

def main():
    """Main test execution"""
    tester = BackendTester()
    success = tester.run_all_tests()
    
    if success:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()