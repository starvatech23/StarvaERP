#!/usr/bin/env python3
"""
Backend API Testing Script for SiteOps Construction Management App
Testing Marketing Head CRM Access and Profile Picture Update features
"""

import requests
import json
import sys
from datetime import datetime
import base64

# Configuration
BASE_URL = "https://uacmender.preview.emergentagent.com/api"
MARKETING_HEAD_CREDENTIALS = {
    "identifier": "sridikshaa@starvacon.com",
    "password": "SriDikshaa@123",
    "auth_type": "email"
}

class BackendTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.access_token = None
        self.test_results = []
        
    def log_test(self, test_name, success, details="", error_msg=""):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "error": error_msg,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if error_msg:
            print(f"   Error: {error_msg}")
        print()
    
    def make_request(self, method, endpoint, data=None, headers=None):
        """Make HTTP request with proper error handling"""
        url = f"{self.base_url}{endpoint}"
        
        # Add authorization header if token is available
        if self.access_token and headers is None:
            headers = {}
        if self.access_token:
            headers = headers or {}
            headers["Authorization"] = f"Bearer {self.access_token}"
        
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=headers)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, headers=headers)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            return response
        except requests.exceptions.RequestException as e:
            return None, str(e)
    
    def test_marketing_head_login(self):
        """Test Marketing Head login with provided credentials"""
        print("🔐 Testing Marketing Head Login...")
        
        response = self.make_request("POST", "/auth/login", MARKETING_HEAD_CREDENTIALS)
        
        if response is None:
            self.log_test("Marketing Head Login", False, error_msg="Network error during login")
            return False
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.access_token = data.get("access_token")
                user_info = data.get("user", {})
                
                # Verify user role and permissions
                role = user_info.get("role", "")
                role_name = user_info.get("role_name", "")
                email = user_info.get("email", "")
                
                details = f"Email: {email}, Role: {role}, Role Name: {role_name}"
                
                if self.access_token:
                    self.log_test("Marketing Head Login", True, details)
                    return True
                else:
                    self.log_test("Marketing Head Login", False, error_msg="No access token received")
                    return False
                    
            except json.JSONDecodeError:
                self.log_test("Marketing Head Login", False, error_msg="Invalid JSON response")
                return False
        else:
            error_msg = f"HTTP {response.status_code}"
            try:
                error_data = response.json()
                error_msg += f": {error_data.get('detail', 'Unknown error')}"
            except:
                error_msg += f": {response.text}"
            
            self.log_test("Marketing Head Login", False, error_msg=error_msg)
            return False
    
    def test_crm_dashboard_stats(self):
        """Test GET /api/crm/dashboard/stats"""
        print("📊 Testing CRM Dashboard Stats...")
        
        response = self.make_request("GET", "/crm/dashboard/stats")
        
        if response is None:
            self.log_test("CRM Dashboard Stats", False, error_msg="Network error")
            return False
        
        if response.status_code == 200:
            try:
                data = response.json()
                # Check for expected fields in dashboard stats
                expected_fields = ["summary", "by_status", "by_source", "by_priority"]
                missing_fields = [field for field in expected_fields if field not in data]
                
                if missing_fields:
                    self.log_test("CRM Dashboard Stats", False, 
                                error_msg=f"Missing fields: {missing_fields}")
                else:
                    details = f"Retrieved dashboard stats with {len(data)} sections"
                    self.log_test("CRM Dashboard Stats", True, details)
                return len(missing_fields) == 0
            except json.JSONDecodeError:
                self.log_test("CRM Dashboard Stats", False, error_msg="Invalid JSON response")
                return False
        else:
            error_msg = f"HTTP {response.status_code}"
            try:
                error_data = response.json()
                error_msg += f": {error_data.get('detail', 'Unknown error')}"
            except:
                pass
            self.log_test("CRM Dashboard Stats", False, error_msg=error_msg)
            return False
    
    def test_crm_leads_access(self):
        """Test GET /api/crm/leads"""
        print("👥 Testing CRM Leads Access...")
        
        response = self.make_request("GET", "/crm/leads")
        
        if response is None:
            self.log_test("CRM Leads Access", False, error_msg="Network error")
            return False
        
        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list):
                    details = f"Retrieved {len(data)} leads"
                    self.log_test("CRM Leads Access", True, details)
                    return True
                else:
                    self.log_test("CRM Leads Access", False, error_msg="Response is not a list")
                    return False
            except json.JSONDecodeError:
                self.log_test("CRM Leads Access", False, error_msg="Invalid JSON response")
                return False
        else:
            error_msg = f"HTTP {response.status_code}"
            try:
                error_data = response.json()
                error_msg += f": {error_data.get('detail', 'Unknown error')}"
            except:
                pass
            self.log_test("CRM Leads Access", False, error_msg=error_msg)
            return False
    
    def test_crm_lead_update(self):
        """Test PUT /api/crm/leads/{lead_id} - Update any lead"""
        print("✏️ Testing CRM Lead Update...")
        
        # First get leads to find one to update
        response = self.make_request("GET", "/crm/leads")
        
        if response is None or response.status_code != 200:
            self.log_test("CRM Lead Update", False, error_msg="Could not retrieve leads for testing")
            return False
        
        try:
            leads = response.json()
            if not leads or len(leads) == 0:
                self.log_test("CRM Lead Update", False, error_msg="No leads available for testing")
                return False
            
            # Use the first lead for testing
            lead_id = leads[0].get("id")
            if not lead_id:
                self.log_test("CRM Lead Update", False, error_msg="Lead ID not found")
                return False
            
            # Prepare update data
            update_data = {
                "notes": f"Updated by Marketing Head test at {datetime.now().isoformat()}"
            }
            
            # Attempt to update the lead
            response = self.make_request("PUT", f"/crm/leads/{lead_id}", update_data)
            
            if response is None:
                self.log_test("CRM Lead Update", False, error_msg="Network error during update")
                return False
            
            if response.status_code == 200:
                details = f"Successfully updated lead {lead_id}"
                self.log_test("CRM Lead Update", True, details)
                return True
            else:
                error_msg = f"HTTP {response.status_code}"
                try:
                    error_data = response.json()
                    error_msg += f": {error_data.get('detail', 'Unknown error')}"
                except:
                    pass
                self.log_test("CRM Lead Update", False, error_msg=error_msg)
                return False
                
        except json.JSONDecodeError:
            self.log_test("CRM Lead Update", False, error_msg="Invalid JSON response")
            return False
    
    def test_crm_config_access(self):
        """Test GET /api/crm/config"""
        print("⚙️ Testing CRM Config Access...")
        
        response = self.make_request("GET", "/crm/config")
        
        if response is None:
            self.log_test("CRM Config Access", False, error_msg="Network error")
            return False
        
        if response.status_code == 200:
            try:
                data = response.json()
                details = f"Retrieved CRM config with {len(data)} settings" if isinstance(data, dict) else "Retrieved CRM config"
                self.log_test("CRM Config Access", True, details)
                return True
            except json.JSONDecodeError:
                self.log_test("CRM Config Access", False, error_msg="Invalid JSON response")
                return False
        else:
            error_msg = f"HTTP {response.status_code}"
            try:
                error_data = response.json()
                error_msg += f": {error_data.get('detail', 'Unknown error')}"
            except:
                pass
            self.log_test("CRM Config Access", False, error_msg=error_msg)
            return False
    
    def test_crm_funnels_access(self):
        """Test GET /api/crm/funnels"""
        print("🔄 Testing CRM Funnels Access...")
        
        response = self.make_request("GET", "/crm/funnels")
        
        if response is None:
            self.log_test("CRM Funnels Access", False, error_msg="Network error")
            return False
        
        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list):
                    details = f"Retrieved {len(data)} funnels"
                    self.log_test("CRM Funnels Access", True, details)
                    return True
                else:
                    self.log_test("CRM Funnels Access", False, error_msg="Response is not a list")
                    return False
            except json.JSONDecodeError:
                self.log_test("CRM Funnels Access", False, error_msg="Invalid JSON response")
                return False
        else:
            error_msg = f"HTTP {response.status_code}"
            try:
                error_data = response.json()
                error_msg += f": {error_data.get('detail', 'Unknown error')}"
            except:
                pass
            self.log_test("CRM Funnels Access", False, error_msg=error_msg)
            return False
    
    def test_crm_custom_fields_access(self):
        """Test GET /api/crm/custom-fields"""
        print("🏷️ Testing CRM Custom Fields Access...")
        
        response = self.make_request("GET", "/crm/custom-fields")
        
        if response is None:
            self.log_test("CRM Custom Fields Access", False, error_msg="Network error")
            return False
        
        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list):
                    details = f"Retrieved {len(data)} custom fields"
                    self.log_test("CRM Custom Fields Access", True, details)
                    return True
                else:
                    self.log_test("CRM Custom Fields Access", False, error_msg="Response is not a list")
                    return False
            except json.JSONDecodeError:
                self.log_test("CRM Custom Fields Access", False, error_msg="Invalid JSON response")
                return False
        else:
            error_msg = f"HTTP {response.status_code}"
            try:
                error_data = response.json()
                error_msg += f": {error_data.get('detail', 'Unknown error')}"
            except:
                pass
            self.log_test("CRM Custom Fields Access", False, error_msg=error_msg)
            return False
    
    def test_profile_picture_update(self):
        """Test PUT /api/auth/me with profile_photo field"""
        print("🖼️ Testing Profile Picture Update...")
        
        # Create a small test base64 image data
        test_photo_data = "test_photo_base64_data_sample_image_content"
        
        update_data = {
            "profile_photo": test_photo_data
        }
        
        response = self.make_request("PUT", "/auth/me", update_data)
        
        if response is None:
            self.log_test("Profile Picture Update", False, error_msg="Network error during update")
            return False
        
        if response.status_code == 200:
            try:
                data = response.json()
                updated_photo = data.get("profile_photo")
                
                if updated_photo == test_photo_data:
                    details = "Profile photo updated successfully"
                    self.log_test("Profile Picture Update", True, details)
                    return True
                else:
                    self.log_test("Profile Picture Update", False, 
                                error_msg="Profile photo not updated in response")
                    return False
            except json.JSONDecodeError:
                self.log_test("Profile Picture Update", False, error_msg="Invalid JSON response")
                return False
        else:
            error_msg = f"HTTP {response.status_code}"
            try:
                error_data = response.json()
                error_msg += f": {error_data.get('detail', 'Unknown error')}"
            except:
                pass
            self.log_test("Profile Picture Update", False, error_msg=error_msg)
            return False
    
    def test_profile_picture_retrieval(self):
        """Test GET /api/auth/me and verify profile_photo is returned"""
        print("📷 Testing Profile Picture Retrieval...")
        
        response = self.make_request("GET", "/auth/me")
        
        if response is None:
            self.log_test("Profile Picture Retrieval", False, error_msg="Network error")
            return False
        
        if response.status_code == 200:
            try:
                data = response.json()
                profile_photo = data.get("profile_photo")
                
                if profile_photo is not None:
                    details = f"Profile photo field present: {len(str(profile_photo))} chars"
                    self.log_test("Profile Picture Retrieval", True, details)
                    return True
                else:
                    self.log_test("Profile Picture Retrieval", False, 
                                error_msg="Profile photo field not present in response")
                    return False
            except json.JSONDecodeError:
                self.log_test("Profile Picture Retrieval", False, error_msg="Invalid JSON response")
                return False
        else:
            error_msg = f"HTTP {response.status_code}"
            try:
                error_data = response.json()
                error_msg += f": {error_data.get('detail', 'Unknown error')}"
            except:
                pass
            self.log_test("Profile Picture Retrieval", False, error_msg=error_msg)
            return False
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Backend API Tests for Marketing Head CRM Access & Profile Picture Update")
        print("=" * 80)
        
        # Test 1: Marketing Head Login
        login_success = self.test_marketing_head_login()
        
        if not login_success:
            print("❌ Cannot proceed with other tests - login failed")
            return self.generate_summary()
        
        # Test 2-7: CRM Access Tests (only if login successful)
        crm_tests = [
            self.test_crm_dashboard_stats,
            self.test_crm_leads_access,
            self.test_crm_lead_update,
            self.test_crm_config_access,
            self.test_crm_funnels_access,
            self.test_crm_custom_fields_access
        ]
        
        for test_func in crm_tests:
            test_func()
        
        # Test 8-9: Profile Picture Tests
        self.test_profile_picture_update()
        self.test_profile_picture_retrieval()
        
        return self.generate_summary()
    
    def generate_summary(self):
        """Generate test summary"""
        print("=" * 80)
        print("📋 TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["success"]])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        print()
        
        if failed_tests > 0:
            print("❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['error']}")
            print()
        
        print("✅ PASSED TESTS:")
        for result in self.test_results:
            if result["success"]:
                print(f"  - {result['test']}")
        
        return {
            "total": total_tests,
            "passed": passed_tests,
            "failed": failed_tests,
            "success_rate": passed_tests/total_tests*100 if total_tests > 0 else 0,
            "results": self.test_results
        }

def main():
    """Main function to run tests"""
    tester = BackendTester()
    summary = tester.run_all_tests()
    
    # Exit with appropriate code
    if summary["failed"] > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()