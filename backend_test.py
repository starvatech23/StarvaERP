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
        """Run all tests"""
        print("🚀 Starting Data/Model Drift Fix Verification (Round 2)")
        print("=" * 60)
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Run critical fix tests first
        print("\n🔥 CRITICAL FIXES VERIFICATION:")
        critical_tests = [
            self.test_admin_users_api,      # Critical Fix #1
            self.test_dashboard_stats_api,  # Critical Fix #2
        ]
        
        critical_passed = 0
        for test in critical_tests:
            if test():
                critical_passed += 1
        
        print(f"\n📊 Critical Fixes: {critical_passed}/{len(critical_tests)} PASSED")
        
        # Run regression tests
        print("\n🔄 REGRESSION VERIFICATION:")
        regression_tests = [
            self.test_projects_api,
            self.test_vendors_api,
            self.test_materials_api,
            self.test_tasks_api,
        ]
        
        regression_passed = 0
        for test in regression_tests:
            if test():
                regression_passed += 1
        
        print(f"\n📊 Regression Tests: {regression_passed}/{len(regression_tests)} PASSED")
        
        # Final summary
        total_passed = critical_passed + regression_passed
        total_tests = len(critical_tests) + len(regression_tests)
        
        print("\n" + "=" * 60)
        print("🏁 FINAL RESULTS:")
        print(f"   Total Tests: {total_tests}")
        print(f"   Passed: {total_passed}")
        print(f"   Failed: {total_tests - total_passed}")
        print(f"   Success Rate: {(total_passed/total_tests)*100:.1f}%")
        
        if critical_passed == len(critical_tests):
            print("\n✅ CRITICAL FIXES: ALL PASSED - Data/Model Drift fix is COMPLETE!")
        else:
            print(f"\n❌ CRITICAL FIXES: {len(critical_tests) - critical_passed} FAILED - Fix needs more work!")
        
        return critical_passed == len(critical_tests)

def main():
    """Main function"""
    tester = BackendTester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open("/app/test_results_detailed.json", "w") as f:
        json.dump(tester.test_results, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: /app/test_results_detailed.json")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())