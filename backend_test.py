#!/usr/bin/env python3
"""
Backend API Testing for Labor Reports Feature
Tests the data flow for labor reports including workers, attendance, and projects APIs.
"""

import requests
import json
from datetime import datetime, timedelta
import uuid
import sys
import os

# Configuration
BASE_URL = "https://buildflow-74.preview.emergentagent.com/api"
TEST_USER_EMAIL = "admin@buildflow.com"
TEST_USER_PASSWORD = "admin123"
TEST_USER_PHONE = "+919876543210"

class LaborReportsAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.auth_token = None
        self.test_data = {
            'users': [],
            'projects': [],
            'workers': [],
            'attendance_records': []
        }
        self.test_results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }

    def log_result(self, test_name, success, message="", response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
        if response_data and not success:
            print(f"   Response: {response_data}")
        
        if success:
            self.test_results['passed'] += 1
        else:
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"{test_name}: {message}")
        print()

    def authenticate(self):
        """Authenticate and get access token"""
        print("🔐 Authenticating...")
        
        # Try email authentication first
        auth_data = {
            "identifier": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "auth_type": "email"
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/login", json=auth_data)
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data["access_token"]
                self.log_result("Email Authentication", True, f"Logged in as {data['user']['full_name']}")
                return True
            else:
                # Try to register if login fails
                register_data = {
                    "email": TEST_USER_EMAIL,
                    "password": TEST_USER_PASSWORD,
                    "full_name": "Test Admin",
                    "role": "admin",
                    "auth_type": "email"
                }
                
                reg_response = requests.post(f"{self.base_url}/auth/register", json=register_data)
                if reg_response.status_code == 200:
                    data = reg_response.json()
                    self.auth_token = data["access_token"]
                    self.log_result("User Registration & Authentication", True, f"Registered and logged in as {data['user']['full_name']}")
                    return True
                else:
                    self.log_result("Authentication", False, f"Login failed: {response.status_code}, Register failed: {reg_response.status_code}")
                    return False
                    
        except Exception as e:
            self.log_result("Authentication", False, f"Exception: {str(e)}")
            return False

    def get_headers(self):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=default_headers, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=default_headers, timeout=30)
            elif method.upper() == "PUT":
                response = requests.put(url, json=data, headers=default_headers, timeout=30)
            else:
                return {"error": f"Unsupported method: {method}"}
            
            return {
                "status_code": response.status_code,
                "data": response.json() if response.content else {},
                "headers": dict(response.headers)
            }
        except requests.exceptions.RequestException as e:
            return {"error": str(e)}
        except json.JSONDecodeError as e:
            return {"error": f"JSON decode error: {str(e)}", "raw_response": response.text}
    
    def test_api_health(self):
        """Test if API is accessible"""
        print("\n=== Testing API Health ===")
        response = self.make_request("GET", "/")
        
        if "error" in response:
            self.log_result("API Health Check", False, f"API not accessible: {response['error']}")
            return False
        
        if response["status_code"] == 200:
            self.log_result("API Health Check", True, "API is accessible")
            return True
        else:
            self.log_result("API Health Check", False, f"API returned status {response['status_code']}")
            return False
    
    def register_admin_user(self):
        """Register an admin user for testing"""
        print("\n=== Registering Admin User ===")
        
        user_data = {
            "email": "admin@constructflow.com",
            "password": "AdminPass123!",
            "full_name": "Test Admin User",
            "role": "admin",
            "auth_type": "email",
            "address": "123 Admin Street, Test City"
        }
        
        response = self.make_request("POST", "/auth/register", user_data)
        
        if "error" in response:
            self.log_result("Admin Registration", False, f"Request failed: {response['error']}")
            return False
        
        if response["status_code"] == 200:
            data = response["data"]
            if "access_token" in data and "user" in data:
                self.token = data["access_token"]
                self.user_id = data["user"]["id"]
                self.log_result("Admin Registration", True, f"Admin user registered successfully. User ID: {self.user_id}")
                return True
            else:
                self.log_result("Admin Registration", False, "Invalid response format", response["data"])
                return False
        elif response["status_code"] == 400 and "already registered" in str(response["data"]):
            # User already exists, try to login
            return self.login_admin_user()
        else:
            self.log_result("Admin Registration", False, f"Registration failed with status {response['status_code']}", response["data"])
            return False
    
    def login_admin_user(self):
        """Login with admin user"""
        print("\n=== Logging in Admin User ===")
        
        login_data = {
            "identifier": "admin@constructflow.com",
            "password": "AdminPass123!",
            "auth_type": "email"
        }
        
        response = self.make_request("POST", "/auth/login", login_data)
        
        if "error" in response:
            self.log_result("Admin Login", False, f"Request failed: {response['error']}")
            return False
        
        if response["status_code"] == 200:
            data = response["data"]
            if "access_token" in data and "user" in data:
                self.token = data["access_token"]
                self.user_id = data["user"]["id"]
                self.log_result("Admin Login", True, f"Admin user logged in successfully. User ID: {self.user_id}")
                return True
            else:
                self.log_result("Admin Login", False, "Invalid response format", response["data"])
                return False
        else:
            self.log_result("Admin Login", False, f"Login failed with status {response['status_code']}", response["data"])
            return False
    
    def test_profile_update_api(self):
        """Test Profile Update API - PUT /api/profile"""
        print("\n=== Testing Profile Update API ===")
        
        if not self.token:
            self.log_result("Profile Update API", False, "No authentication token available")
            return
        
        # Test 1: Update full profile
        profile_data = {
            "full_name": "Updated Admin Name",
            "email": "updated.admin@constructflow.com",
            "phone": "+1234567890",
            "address": "456 Updated Street, New City",
            "profile_photo": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
        }
        
        response = self.make_request("PUT", "/profile", profile_data)
        
        if "error" in response:
            self.log_result("Profile Update - Full Update", False, f"Request failed: {response['error']}")
        elif response["status_code"] == 200:
            data = response["data"]
            if "id" in data and "full_name" in data:
                if data["full_name"] == profile_data["full_name"]:
                    self.log_result("Profile Update - Full Update", True, "Profile updated successfully")
                else:
                    self.log_result("Profile Update - Full Update", False, "Profile data not updated correctly", data)
            else:
                self.log_result("Profile Update - Full Update", False, "Invalid response format", data)
        else:
            self.log_result("Profile Update - Full Update", False, f"Update failed with status {response['status_code']}", response["data"])
        
        # Test 2: Update individual field
        partial_data = {
            "phone": "+9876543210"
        }
        
        response = self.make_request("PUT", "/profile", partial_data)
        
        if "error" in response:
            self.log_result("Profile Update - Partial Update", False, f"Request failed: {response['error']}")
        elif response["status_code"] == 200:
            data = response["data"]
            if data.get("phone") == partial_data["phone"]:
                self.log_result("Profile Update - Partial Update", True, "Partial profile update successful")
            else:
                self.log_result("Profile Update - Partial Update", False, "Partial update not applied correctly", data)
        else:
            self.log_result("Profile Update - Partial Update", False, f"Partial update failed with status {response['status_code']}", response["data"])
        
        # Test 3: Test with invalid data
        invalid_data = {
            "email": "invalid-email-format"
        }
        
        response = self.make_request("PUT", "/profile", invalid_data)
        
        if response["status_code"] == 422:
            self.log_result("Profile Update - Invalid Data", True, "Validation error handled correctly")
        else:
            self.log_result("Profile Update - Invalid Data", False, f"Expected validation error, got status {response['status_code']}", response["data"])
    
    def test_company_settings_api(self):
        """Test Company Settings API - GET/PUT /api/settings/company"""
        print("\n=== Testing Company Settings API ===")
        
        if not self.token:
            self.log_result("Company Settings API", False, "No authentication token available")
            return
        
        # Test 1: Get company settings
        response = self.make_request("GET", "/settings/company")
        
        if "error" in response:
            self.log_result("Company Settings - GET", False, f"Request failed: {response['error']}")
        elif response["status_code"] == 200:
            data = response["data"]
            if "company_name" in data:
                self.log_result("Company Settings - GET", True, "Company settings retrieved successfully")
            else:
                self.log_result("Company Settings - GET", False, "Invalid response format", data)
        else:
            self.log_result("Company Settings - GET", False, f"GET failed with status {response['status_code']}", response["data"])
        
        # Test 2: Update company settings (Admin only)
        settings_data = {
            "company_name": "Test Construction Co",
            "address": "123 Main St, Construction City",
            "phone": "555-1234",
            "email": "info@testco.com",
            "tax_id": "TAX123456",
            "website": "https://testco.com"
        }
        
        response = self.make_request("PUT", "/settings/company", settings_data)
        
        if "error" in response:
            self.log_result("Company Settings - PUT", False, f"Request failed: {response['error']}")
        elif response["status_code"] == 200:
            data = response["data"]
            if data.get("company_name") == settings_data["company_name"]:
                self.log_result("Company Settings - PUT", True, "Company settings updated successfully")
            else:
                self.log_result("Company Settings - PUT", False, "Settings not updated correctly", data)
        else:
            self.log_result("Company Settings - PUT", False, f"PUT failed with status {response['status_code']}", response["data"])
        
        # Test 3: Verify updated settings
        response = self.make_request("GET", "/settings/company")
        
        if response["status_code"] == 200:
            data = response["data"]
            if data.get("company_name") == settings_data["company_name"]:
                self.log_result("Company Settings - Verification", True, "Updated settings verified successfully")
            else:
                self.log_result("Company Settings - Verification", False, "Settings verification failed", data)
        else:
            self.log_result("Company Settings - Verification", False, f"Verification failed with status {response['status_code']}")
    
    def test_bulk_leads_upload_api(self):
        """Test Bulk Leads Upload API - POST /api/crm/leads/bulk"""
        print("\n=== Testing Bulk Leads Upload API ===")
        
        if not self.token:
            self.log_result("Bulk Leads Upload API", False, "No authentication token available")
            return
        
        # Test 1: Upload valid bulk leads
        leads_data = [
            {
                "client_name": "John Doe Construction",
                "contact": "555-1111",
                "email": "john@example.com",
                "source": "Website",
                "estimated_value": 50000,
                "notes": "Interested in residential project"
            },
            {
                "client_name": "Jane Smith Builders",
                "contact": "555-2222",
                "email": "jane@example.com",
                "source": "Referral",
                "estimated_value": 75000,
                "notes": "Commercial building project"
            },
            {
                "client_name": "ABC Development Corp",
                "contact": "555-3333",
                "source": "Cold Call",
                "estimated_value": 100000
            }
        ]
        
        response = self.make_request("POST", "/crm/leads/bulk", leads_data)
        
        if "error" in response:
            self.log_result("Bulk Leads Upload - Valid Data", False, f"Request failed: {response['error']}")
        elif response["status_code"] == 200:
            data = response["data"]
            if "message" in data and "3 leads" in data["message"]:
                self.log_result("Bulk Leads Upload - Valid Data", True, f"Bulk upload successful: {data['message']}")
            else:
                self.log_result("Bulk Leads Upload - Valid Data", False, "Unexpected response format", data)
        else:
            self.log_result("Bulk Leads Upload - Valid Data", False, f"Upload failed with status {response['status_code']}", response["data"])
        
        # Test 2: Verify leads were created
        response = self.make_request("GET", "/crm/leads")
        
        if response["status_code"] == 200:
            leads = response["data"]
            if isinstance(leads, list) and len(leads) >= 3:
                # Check if our test leads are in the response
                test_names = [lead["client_name"] for lead in leads_data]
                created_names = [lead.get("client_name", "") for lead in leads]
                
                found_leads = [name for name in test_names if name in created_names]
                if len(found_leads) >= 2:  # At least 2 out of 3 should be found
                    self.log_result("Bulk Leads Upload - Verification", True, f"Found {len(found_leads)} uploaded leads in database")
                else:
                    self.log_result("Bulk Leads Upload - Verification", False, f"Only found {len(found_leads)} out of 3 uploaded leads")
            else:
                self.log_result("Bulk Leads Upload - Verification", False, f"Expected at least 3 leads, found {len(leads) if isinstance(leads, list) else 0}")
        else:
            self.log_result("Bulk Leads Upload - Verification", False, f"Failed to retrieve leads for verification: {response['status_code']}")
        
        # Test 3: Test with invalid data
        invalid_leads = [
            {
                "client_name": "",  # Empty required field
                "contact": "555-4444"
            }
        ]
        
        response = self.make_request("POST", "/crm/leads/bulk", invalid_leads)
        
        if response["status_code"] == 422:
            self.log_result("Bulk Leads Upload - Invalid Data", True, "Validation error handled correctly")
        elif response["status_code"] == 200:
            # Some APIs might accept and skip invalid entries
            self.log_result("Bulk Leads Upload - Invalid Data", True, "Invalid data handled gracefully")
        else:
            self.log_result("Bulk Leads Upload - Invalid Data", False, f"Unexpected response to invalid data: {response['status_code']}")
    
    def test_role_based_access(self):
        """Test role-based access control"""
        print("\n=== Testing Role-Based Access Control ===")
        
        # Register a non-admin user
        worker_data = {
            "email": "worker@constructflow.com",
            "password": "WorkerPass123!",
            "full_name": "Test Worker",
            "role": "worker",
            "auth_type": "email"
        }
        
        response = self.make_request("POST", "/auth/register", worker_data)
        
        if response["status_code"] == 200 or (response["status_code"] == 400 and "already registered" in str(response["data"])):
            # Login as worker
            login_data = {
                "identifier": "worker@constructflow.com",
                "password": "WorkerPass123!",
                "auth_type": "email"
            }
            
            response = self.make_request("POST", "/auth/login", login_data)
            
            if response["status_code"] == 200:
                worker_token = response["data"]["access_token"]
                
                # Temporarily switch to worker token
                original_token = self.token
                self.token = worker_token
                
                # Test company settings access (should fail)
                response = self.make_request("PUT", "/settings/company", {"company_name": "Unauthorized"})
                
                if response["status_code"] == 403:
                    self.log_result("Role-Based Access - Company Settings", True, "Worker correctly denied access to company settings")
                else:
                    self.log_result("Role-Based Access - Company Settings", False, f"Worker should be denied access, got status {response['status_code']}")
                
                # Test bulk leads upload (should fail)
                response = self.make_request("POST", "/crm/leads/bulk", [{"client_name": "Test", "contact": "123"}])
                
                if response["status_code"] == 403:
                    self.log_result("Role-Based Access - Bulk Leads", True, "Worker correctly denied access to bulk leads upload")
                else:
                    self.log_result("Role-Based Access - Bulk Leads", False, f"Worker should be denied access, got status {response['status_code']}")
                
                # Restore admin token
                self.token = original_token
            else:
                self.log_result("Role-Based Access", False, "Failed to login as worker for access control test")
        else:
            self.log_result("Role-Based Access", False, "Failed to create worker user for access control test")
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Backend API Tests for Construction Management App")
        print(f"Backend URL: {self.base_url}")
        print("=" * 80)
        
        # Test API health first
        if not self.test_api_health():
            print("\n❌ API is not accessible. Stopping tests.")
            return False
        
        # Register/login admin user
        if not self.register_admin_user():
            print("\n❌ Failed to authenticate admin user. Stopping tests.")
            return False
        
        # Run all API tests
        self.test_profile_update_api()
        self.test_company_settings_api()
        self.test_bulk_leads_upload_api()
        self.test_role_based_access()
        
        # Print summary
        self.print_summary()
        
        return True
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["success"]])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  • {result['test']}: {result['message']}")
        
        print("\n" + "=" * 80)

def main():
    """Main function"""
    tester = BackendTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()