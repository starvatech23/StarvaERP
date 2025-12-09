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

    def test_admin_users_api(self):
        """Test GET /api/admin/users - CRITICAL FIX #1"""
        print("🔍 Testing GET /api/admin/users (Critical Fix #1)...")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/admin/users")
            
            if response.status_code == 200:
                data = response.json()
                user_count = len(data) if isinstance(data, list) else 0
                
                # Check if users have role field handling
                role_issues = []
                for user in data:
                    if isinstance(user, dict):
                        # Check if role field is handled properly (can be None)
                        role = user.get("role")
                        if "role" not in user:
                            role_issues.append(f"User {user.get('id', 'unknown')} missing role field")
                
                if role_issues:
                    self.log_result("GET /api/admin/users", False, 
                                  f"Role field issues found: {'; '.join(role_issues)}", data)
                else:
                    self.log_result("GET /api/admin/users", True, 
                                  f"Successfully retrieved {user_count} users with proper role handling")
                return True
                
            else:
                self.log_result("GET /api/admin/users", False, 
                              f"API returned {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("GET /api/admin/users", False, f"Request failed: {str(e)}")
            return False
    
    def test_dashboard_stats_api(self):
        """Test GET /api/dashboard/stats - CRITICAL FIX #2"""
        print("🔍 Testing GET /api/dashboard/stats (Critical Fix #2)...")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/dashboard/stats")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for aggregation fields that should handle None values
                expected_fields = ["month_wages", "month_expenses", "month_payments", "inventory_value"]
                missing_fields = []
                
                for field in expected_fields:
                    if field not in data:
                        missing_fields.append(field)
                
                if missing_fields:
                    self.log_result("GET /api/dashboard/stats", False, 
                                  f"Missing expected fields: {missing_fields}", data)
                else:
                    # Check if None values are handled properly
                    none_handling_ok = True
                    for field in expected_fields:
                        value = data.get(field)
                        if value is None:
                            print(f"   Note: {field} is None (acceptable with None handling)")
                        elif isinstance(value, (int, float)):
                            print(f"   {field}: {value}")
                        else:
                            print(f"   {field}: {type(value)} - {value}")
                    
                    self.log_result("GET /api/dashboard/stats", True, 
                                  "Dashboard stats returned successfully with proper None handling")
                return True
                
            else:
                self.log_result("GET /api/dashboard/stats", False, 
                              f"API returned {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("GET /api/dashboard/stats", False, f"Request failed: {str(e)}")
            return False
    
    def test_projects_api(self):
        """Test GET /api/projects - Verify still working"""
        print("🔍 Testing GET /api/projects...")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/projects")
            
            if response.status_code == 200:
                data = response.json()
                project_count = len(data) if isinstance(data, list) else 0
                self.log_result("GET /api/projects", True, 
                              f"Successfully retrieved {project_count} projects")
                return True
            else:
                self.log_result("GET /api/projects", False, 
                              f"API returned {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("GET /api/projects", False, f"Request failed: {str(e)}")
            return False
    
    def test_vendors_api(self):
        """Test GET /api/vendors - Verify still working"""
        print("🔍 Testing GET /api/vendors...")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/vendors")
            
            if response.status_code == 200:
                data = response.json()
                vendor_count = len(data) if isinstance(data, list) else 0
                self.log_result("GET /api/vendors", True, 
                              f"Successfully retrieved {vendor_count} vendors")
                return True
            else:
                self.log_result("GET /api/vendors", False, 
                              f"API returned {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("GET /api/vendors", False, f"Request failed: {str(e)}")
            return False
    
    def test_materials_api(self):
        """Test GET /api/materials - Verify still working"""
        print("🔍 Testing GET /api/materials...")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/materials")
            
            if response.status_code == 200:
                data = response.json()
                material_count = len(data) if isinstance(data, list) else 0
                self.log_result("GET /api/materials", True, 
                              f"Successfully retrieved {material_count} materials")
                return True
            else:
                self.log_result("GET /api/materials", False, 
                              f"API returned {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("GET /api/materials", False, f"Request failed: {str(e)}")
            return False
    
    def test_tasks_api(self):
        """Test GET /api/tasks with project_id parameter - Verify still working"""
        print("🔍 Testing GET /api/tasks...")
        
        try:
            # First get projects to get a project_id
            projects_response = self.session.get(f"{BACKEND_URL}/projects")
            if projects_response.status_code == 200:
                projects = projects_response.json()
                if projects and len(projects) > 0:
                    project_id = projects[0].get("id")
                    if project_id:
                        # Test with project_id parameter
                        response = self.session.get(f"{BACKEND_URL}/tasks?project_id={project_id}")
                    else:
                        # Test without parameter
                        response = self.session.get(f"{BACKEND_URL}/tasks")
                else:
                    # Test without parameter if no projects
                    response = self.session.get(f"{BACKEND_URL}/tasks")
            else:
                # Test without parameter if projects API fails
                response = self.session.get(f"{BACKEND_URL}/tasks")
            
            if response.status_code == 200:
                data = response.json()
                task_count = len(data) if isinstance(data, list) else 0
                self.log_result("GET /api/tasks", True, 
                              f"Successfully retrieved {task_count} tasks")
                return True
            else:
                self.log_result("GET /api/tasks", False, 
                              f"API returned {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("GET /api/tasks", False, f"Request failed: {str(e)}")
            return False

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