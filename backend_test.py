#!/usr/bin/env python3
"""
Backend API Testing Script for Client Portal Credentials API
Tests the send-client-credentials and client-credentials-history endpoints
"""

import requests
import json
import sys
from datetime import datetime
import urllib.parse

# Configuration
BASE_URL = "https://labourmanage.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "admin123"

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        print()
    
    def authenticate(self):
        """Authenticate and get access token"""
        print("🔐 Authenticating...")
        
        login_data = {
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "auth_type": "email"
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                self.session.headers.update({
                    "Authorization": f"Bearer {self.access_token}"
                })
                self.log_test("Authentication", True, f"Logged in as {data.get('user', {}).get('email')}")
                return True
            else:
                self.log_test("Authentication", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Authentication", False, f"Exception: {str(e)}")
            return False
    
    def get_projects(self):
        """Get list of projects to find a project_id for testing"""
        print("📋 Getting projects list...")
        
        try:
            response = self.session.get(f"{BASE_URL}/projects")
            
            if response.status_code == 200:
                projects = response.json()
                if projects:
                    project = projects[0]  # Use first project
                    project_id = project.get("id")
                    project_name = project.get("name", "Unknown")
                    self.log_test("Get Projects", True, f"Found {len(projects)} projects. Using project: {project_name} (ID: {project_id})")
                    return project_id
                else:
                    self.log_test("Get Projects", False, "No projects found in database")
                    return None
            else:
                self.log_test("Get Projects", False, f"Status: {response.status_code}, Response: {response.text}")
                return None
                
        except Exception as e:
            self.log_test("Get Projects", False, f"Exception: {str(e)}")
            return None
    
    def test_send_client_credentials(self, project_id):
        """Test POST /api/projects/{project_id}/send-client-credentials"""
        print("📱 Testing Send Client Credentials API...")
        
        # Test data as specified in the review request
        test_data = {
            "client_phone": "9876543210",
            "send_whatsapp": True,
            "send_sms": False,
            "send_email": False
        }
        
        try:
            response = self.session.post(
                f"{BASE_URL}/projects/{project_id}/send-client-credentials",
                json=test_data
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify expected response fields
                expected_fields = ["success", "project_id", "portal_link", "client_phone", "results"]
                missing_fields = [field for field in expected_fields if field not in data]
                
                if missing_fields:
                    self.log_test("Send Client Credentials - Response Structure", False, 
                                f"Missing fields: {missing_fields}")
                    return None
                
                # Verify portal link format
                portal_link = data.get("portal_link", "")
                if not portal_link.startswith("https://") or "client-portal" not in portal_link:
                    self.log_test("Send Client Credentials - Portal Link Format", False, 
                                f"Invalid portal link format: {portal_link}")
                    return None
                
                # Verify WhatsApp link generation
                results = data.get("results", {})
                whatsapp_result = results.get("whatsapp", {})
                
                if whatsapp_result.get("sent") and whatsapp_result.get("link"):
                    whatsapp_link = whatsapp_result.get("link")
                    if "wa.me" in whatsapp_link and "9876543210" in whatsapp_link:
                        self.log_test("Send Client Credentials - WhatsApp Link", True, 
                                    f"WhatsApp link generated correctly: {whatsapp_link[:50]}...")
                    else:
                        self.log_test("Send Client Credentials - WhatsApp Link", False, 
                                    f"Invalid WhatsApp link: {whatsapp_link}")
                else:
                    self.log_test("Send Client Credentials - WhatsApp Link", False, 
                                f"WhatsApp link not generated: {whatsapp_result}")
                
                # Verify client phone
                if data.get("client_phone") == "9876543210":
                    self.log_test("Send Client Credentials - Client Phone", True, 
                                f"Client phone correctly set: {data.get('client_phone')}")
                else:
                    self.log_test("Send Client Credentials - Client Phone", False, 
                                f"Client phone mismatch: expected 9876543210, got {data.get('client_phone')}")
                
                self.log_test("Send Client Credentials API", True, 
                            f"Portal link: {portal_link}, Client phone: {data.get('client_phone')}")
                return data
                
            else:
                self.log_test("Send Client Credentials API", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return None
                
        except Exception as e:
            self.log_test("Send Client Credentials API", False, f"Exception: {str(e)}")
            return None
    
    def test_credentials_history(self, project_id):
        """Test GET /api/projects/{project_id}/client-credentials-history"""
        print("📜 Testing Client Credentials History API...")
        
        try:
            response = self.session.get(f"{BASE_URL}/projects/{project_id}/client-credentials-history")
            
            if response.status_code == 200:
                history = response.json()
                
                if isinstance(history, list):
                    if len(history) > 0:
                        # Verify the structure of history records
                        record = history[0]
                        expected_fields = ["project_id", "client_phone", "portal_link", "sent_by", "created_at"]
                        missing_fields = [field for field in expected_fields if field not in record]
                        
                        if missing_fields:
                            self.log_test("Credentials History - Record Structure", False, 
                                        f"Missing fields in history record: {missing_fields}")
                        else:
                            self.log_test("Credentials History - Record Structure", True, 
                                        f"History record contains all expected fields")
                        
                        # Verify project_id matches
                        if record.get("project_id") == project_id:
                            self.log_test("Credentials History - Project ID Match", True, 
                                        f"Project ID matches: {project_id}")
                        else:
                            self.log_test("Credentials History - Project ID Match", False, 
                                        f"Project ID mismatch: expected {project_id}, got {record.get('project_id')}")
                        
                        self.log_test("Client Credentials History API", True, 
                                    f"Retrieved {len(history)} credential send records")
                    else:
                        self.log_test("Client Credentials History API", True, 
                                    "No credential send history found (empty list)")
                else:
                    self.log_test("Client Credentials History API", False, 
                                f"Expected list response, got: {type(history)}")
                
                return history
                
            else:
                self.log_test("Client Credentials History API", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return None
                
        except Exception as e:
            self.log_test("Client Credentials History API", False, f"Exception: {str(e)}")
            return None
    
    def test_database_storage(self, project_id):
        """Test that records are properly stored in database by checking history after send"""
        print("💾 Testing Database Storage...")
        
        # Get history before sending credentials
        history_before = self.test_credentials_history(project_id)
        if history_before is None:
            return False
        
        initial_count = len(history_before) if isinstance(history_before, list) else 0
        
        # Send credentials
        send_result = self.test_send_client_credentials(project_id)
        if not send_result:
            return False
        
        # Get history after sending credentials
        history_after = self.test_credentials_history(project_id)
        if history_after is None:
            return False
        
        final_count = len(history_after) if isinstance(history_after, list) else 0
        
        # Verify record was added
        if final_count > initial_count:
            self.log_test("Database Storage Verification", True, 
                        f"Record count increased from {initial_count} to {final_count}")
            return True
        else:
            self.log_test("Database Storage Verification", False, 
                        f"Record count did not increase: {initial_count} -> {final_count}")
            return False
    
    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Client Portal Credentials API Tests")
        print("=" * 60)
        
        # Step 1: Authenticate
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Step 2: Get a project ID
        project_id = self.get_projects()
        if not project_id:
            print("❌ No projects available for testing. Cannot proceed.")
            return False
        
        # Step 3: Test the APIs
        print(f"🎯 Testing with Project ID: {project_id}")
        print("-" * 40)
        
        # Test database storage (includes both send and history tests)
        self.test_database_storage(project_id)
        
        # Summary
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")
        
        return failed_tests == 0

def main():
    """Main function"""
    tester = APITester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed! Client Portal Credentials API is working correctly.")
        sys.exit(0)
    else:
        print("\n💥 Some tests failed. Please check the issues above.")
        sys.exit(1)

if __name__ == "__main__":
    main()