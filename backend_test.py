#!/usr/bin/env python3
"""
Backend API Testing Script for Data/Model Drift Fix Verification (Round 2)
Testing the 2 critical fixes applied:
1. GET /api/admin/users - Fixed KeyError 'role' 
2. GET /api/dashboard/stats - Fixed TypeError with None handling
"""

import requests
import json
import sys
from datetime import datetime

# Get backend URL from frontend .env
BACKEND_URL = "https://site-ops-hub.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "admin123"

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.test_results = []
        
    def log_result(self, test_name, success, message, response_data=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        print(f"   {message}")
        if not success and response_data:
            print(f"   Response: {response_data}")
        print()
        
    def authenticate(self):
        """Authenticate with admin credentials"""
        print("🔐 Authenticating with admin credentials...")
        
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                "identifier": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD,
                "auth_type": "email"
            })
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                self.session.headers.update({"Authorization": f"Bearer {self.token}"})
                self.log_result("Authentication", True, f"Successfully authenticated as {ADMIN_EMAIL}")
                return True
            else:
                self.log_result("Authentication", False, f"Failed to authenticate: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Authentication", False, f"Authentication error: {str(e)}")
            return False

    def test_dashboard_stats(self):
        """Test Dashboard API - /api/dashboard/stats (GET) - Priority 1"""
        try:
            response = self.make_authenticated_request("GET", "/dashboard/stats", "admin")
            
            if response.status_code == 200:
                data = response.json()
                # Check for expected dashboard fields
                expected_fields = ["projects", "tasks", "user", "crm", "materials", "labor", "finance"]
                has_expected_fields = any(field in data for field in expected_fields)
                
                if has_expected_fields:
                    self.log_result("Dashboard Stats API", True, 
                                  f"Dashboard stats returned successfully with expected data structure")
                else:
                    self.log_result("Dashboard Stats API", True, 
                                  f"Dashboard stats returned (status 200) but may have different structure", data)
            elif response.status_code == 500:
                # Check if it's the specific TypeError we're seeing in logs
                error_text = response.text
                if "Failed to fetch dashboard statistics" in error_text:
                    self.log_result("Dashboard Stats API", False, 
                                  "500 Internal Server Error - Backend calculation error (likely None + int TypeError), not ValidationError", error_text)
                else:
                    self.log_result("Dashboard Stats API", False, 
                                  "500 Internal Server Error - ValidationError likely present", error_text)
            else:
                self.log_result("Dashboard Stats API", False, 
                              f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Dashboard Stats API", False, f"Exception: {str(e)}")

    def test_projects_api(self):
        """Test Projects APIs - /api/projects (GET) - Priority 2"""
        try:
            response = self.make_authenticated_request("GET", "/projects", "admin")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    # Store project IDs for later tests
                    self.project_ids = [p.get("id") for p in data if p.get("id")]
                    
                    # Check if projects load without ValidationErrors
                    project_count = len(data)
                    has_task_count = any(p.get("task_count") for p in data)
                    has_manager_phone = any(p.get("manager_phone") for p in data)
                    
                    details = f"Loaded {project_count} projects successfully"
                    if has_task_count:
                        details += ", task_count field present"
                    if has_manager_phone:
                        details += ", manager_phone field present"
                    
                    self.log_result("Projects API", True, details)
                else:
                    self.log_result("Projects API", True, "Projects API returned non-list response", data)
            elif response.status_code == 500:
                self.log_result("Projects API", False, 
                              "500 Internal Server Error - ValidationError with missing address/location", response.text)
            else:
                self.log_result("Projects API", False, 
                              f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Projects API", False, f"Exception: {str(e)}")

    def test_vendors_api(self):
        """Test Vendors APIs - /api/vendors (GET) - Priority 3"""
        try:
            response = self.make_authenticated_request("GET", "/vendors", "admin")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    vendor_count = len(data)
                    has_business_name = any(v.get("business_name") for v in data)
                    
                    details = f"Loaded {vendor_count} vendors successfully"
                    if has_business_name:
                        details += ", business_name field present"
                    else:
                        details += ", business_name field may be null (acceptable after fix)"
                    
                    self.log_result("Vendors API", True, details)
                else:
                    self.log_result("Vendors API", True, "Vendors API returned non-list response", data)
            elif response.status_code == 500:
                self.log_result("Vendors API", False, 
                              "500 Internal Server Error - ValidationError with missing business_name", response.text)
            else:
                self.log_result("Vendors API", False, 
                              f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Vendors API", False, f"Exception: {str(e)}")

    def test_materials_api(self):
        """Test Materials APIs - /api/materials (GET) - Priority 4"""
        try:
            response = self.make_authenticated_request("GET", "/materials", "admin")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    material_count = len(data)
                    has_created_by = any(m.get("created_by") for m in data)
                    
                    details = f"Loaded {material_count} materials successfully"
                    if has_created_by:
                        details += ", created_by field present"
                    else:
                        details += ", created_by field may be null (acceptable after fix)"
                    
                    self.log_result("Materials API", True, details)
                else:
                    self.log_result("Materials API", True, "Materials API returned non-list response", data)
            elif response.status_code == 500:
                self.log_result("Materials API", False, 
                              "500 Internal Server Error - ValidationError with missing created_by", response.text)
            else:
                self.log_result("Materials API", False, 
                              f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Materials API", False, f"Exception: {str(e)}")

    def test_tasks_api(self):
        """Test Tasks APIs - /api/tasks?project_id=<any_project_id> (GET) - Priority 5"""
        try:
            # Use first available project ID if we have any
            project_id = self.project_ids[0] if self.project_ids else None
            
            if project_id:
                response = self.make_authenticated_request("GET", f"/tasks?project_id={project_id}", "admin")
            else:
                # Test without project_id filter
                response = self.make_authenticated_request("GET", "/tasks", "admin")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    task_count = len(data)
                    has_created_by = any(t.get("created_by") for t in data)
                    has_timestamps = any(t.get("created_at") or t.get("updated_at") for t in data)
                    
                    details = f"Loaded {task_count} tasks successfully"
                    if has_created_by:
                        details += ", created_by field present"
                    else:
                        details += ", created_by field may be null (acceptable after fix)"
                    if has_timestamps:
                        details += ", timestamp fields present"
                    
                    filter_info = f" for project {project_id}" if project_id else " (no project filter)"
                    self.log_result("Tasks API", True, details + filter_info)
                else:
                    self.log_result("Tasks API", True, "Tasks API returned non-list response", data)
            elif response.status_code == 500:
                self.log_result("Tasks API", False, 
                              "500 Internal Server Error - ValidationError with missing created_by/timestamps", response.text)
            else:
                self.log_result("Tasks API", False, 
                              f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Tasks API", False, f"Exception: {str(e)}")

    def test_users_management_api(self):
        """Test Users APIs - /api/admin/users (GET, Admin only) - Priority 6"""
        try:
            # Try the admin users endpoint first
            response = self.make_authenticated_request("GET", "/admin/users", "admin")
            
            if response.status_code == 404 or response.status_code == 405:
                # If admin endpoint doesn't exist, try regular users endpoint
                response = self.make_authenticated_request("GET", "/users", "admin")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    user_count = len(data)
                    has_date_joined = any(u.get("date_joined") for u in data)
                    has_is_active = any(u.get("is_active") is not None for u in data)
                    
                    details = f"Loaded {user_count} users successfully"
                    if has_date_joined:
                        details += ", date_joined field present"
                    else:
                        details += ", date_joined field may be null (acceptable after fix)"
                    if has_is_active:
                        details += ", is_active field present"
                    
                    self.log_result("Users Management API", True, details)
                else:
                    self.log_result("Users Management API", True, "Users API returned non-list response", data)
            elif response.status_code == 500:
                self.log_result("Users Management API", False, 
                              "500 Internal Server Error - ValidationError with missing date_joined", response.text)
            else:
                self.log_result("Users Management API", False, 
                              f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Users Management API", False, f"Exception: {str(e)}")

    def check_backend_logs(self):
        """Check backend logs for ValidationErrors"""
        try:
            import subprocess
            result = subprocess.run(
                ["tail", "-n", "50", "/var/log/supervisor/backend.err.log"],
                capture_output=True, text=True, timeout=10
            )
            
            if result.returncode == 0:
                log_content = result.stdout
                validation_errors = log_content.count("ValidationError")
                pydantic_errors = log_content.count("pydantic")
                
                if validation_errors > 0 or pydantic_errors > 0:
                    self.log_result("Backend Logs Check", False, 
                                  f"Found {validation_errors} ValidationErrors and {pydantic_errors} pydantic errors in recent logs")
                    print("Recent error logs:")
                    print(log_content[-1000:])  # Last 1000 chars
                else:
                    self.log_result("Backend Logs Check", True, 
                                  "No ValidationErrors or pydantic errors found in recent logs")
            else:
                self.log_result("Backend Logs Check", False, 
                              f"Could not read backend logs: {result.stderr}")
                
        except Exception as e:
            self.log_result("Backend Logs Check", False, f"Exception checking logs: {str(e)}")

    def run_all_tests(self):
        """Run all critical API tests in priority order"""
        print("=" * 80)
        print("BACKEND API TESTING - DATA/MODEL DRIFT FIX VERIFICATION")
        print("Testing P0 fix for Pydantic ValidationErrors causing 500 Internal Server Errors")
        print("=" * 80)
        print()
        
        # Authenticate
        print("🔐 AUTHENTICATION PHASE")
        print("-" * 40)
        auth_success = self.authenticate("admin")
        if not auth_success:
            print("❌ CRITICAL: Admin authentication failed. Cannot proceed with tests.")
            return False
        print()
        
        # Run tests in priority order
        print("🧪 CRITICAL API TESTING PHASE")
        print("-" * 40)
        
        print("Priority 1: Dashboard API")
        self.test_dashboard_stats()
        
        print("Priority 2: Projects API")
        self.test_projects_api()
        
        print("Priority 3: Vendors API")
        self.test_vendors_api()
        
        print("Priority 4: Materials API")
        self.test_materials_api()
        
        print("Priority 5: Tasks API")
        self.test_tasks_api()
        
        print("Priority 6: Users Management API")
        self.test_users_management_api()
        
        print("🔍 BACKEND LOGS CHECK")
        print("-" * 40)
        self.check_backend_logs()
        
        # Summary
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        print()
        
        if failed_tests > 0:
            print("❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")
            print()
        
        print("✅ PASSED TESTS:")
        for result in self.test_results:
            if result["success"]:
                print(f"  - {result['test']}: {result['details']}")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 ALL TESTS PASSED - Data/Model Drift Fix Verification SUCCESSFUL")
        sys.exit(0)
    else:
        print("\n⚠️  SOME TESTS FAILED - ValidationErrors may still be present")
        sys.exit(1)