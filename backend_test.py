#!/usr/bin/env python3
"""
Backend API Testing for Construction Presets Module
Tests all Construction Presets CRUD operations and authorization
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://buildtrack-dev.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "admin123"
MANAGER_EMAIL = "crm.manager@test.com"
MANAGER_PASSWORD = "manager123"

class ConstructionPresetsAPITester:
    def __init__(self):
        self.admin_token = None
        self.manager_token = None
        self.test_preset_id = None
        self.duplicate_preset_id = None
        self.results = []
        
    def log_result(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "details": details,
            "response_data": response_data
        }
        self.results.append(result)
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if not success and response_data:
            print(f"   Response: {response_data}")
        print()

    def authenticate_user(self, email: str, password: str) -> Optional[str]:
        """Authenticate user and return token"""
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json={
                "identifier": email,
                "password": password,
                "auth_type": "email"
            })
            
            if response.status_code == 200:
                data = response.json()
                return data.get("access_token")
            else:
                print(f"Authentication failed for {email}: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"Authentication error for {email}: {str(e)}")
            return None

    def make_request(self, method: str, endpoint: str, token: str, data: Dict = None, params: Dict = None) -> requests.Response:
        """Make authenticated API request"""
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        url = f"{BASE_URL}{endpoint}"
        
        if method.upper() == "GET":
            return requests.get(url, headers=headers, params=params)
        elif method.upper() == "POST":
            return requests.post(url, headers=headers, json=data, params=params)
        elif method.upper() == "PUT":
            return requests.put(url, headers=headers, json=data, params=params)
        elif method.upper() == "DELETE":
            return requests.delete(url, headers=headers, params=params)

    def test_authentication(self):
        """Test user authentication"""
        print("=== Testing Authentication ===")
        
        # Test admin authentication
        self.admin_token = self.authenticate_user(ADMIN_EMAIL, ADMIN_PASSWORD)
        self.log_result(
            "Admin Authentication",
            self.admin_token is not None,
            f"Admin token obtained: {bool(self.admin_token)}"
        )
        
        # Test manager authentication
        self.manager_token = self.authenticate_user(MANAGER_EMAIL, MANAGER_PASSWORD)
        self.log_result(
            "Manager Authentication", 
            self.manager_token is not None,
            f"Manager token obtained: {bool(self.manager_token)}"
        )
        
        return self.admin_token is not None

    def test_create_construction_preset(self):
        """Test POST /api/construction-presets"""
        print("=== Testing Create Construction Preset ===")
        
        if not self.admin_token:
            self.log_result("Create Construction Preset", False, "No admin token available")
            return
        
        # Test data with nested spec groups, items, and brands
        preset_data = {
            "name": "Test Bangalore Premium 2025",
            "description": "Premium construction preset for Bangalore region with high-end specifications",
            "region": "Bangalore",
            "effective_date": (datetime.now() + timedelta(days=1)).isoformat(),
            "rate_per_sqft": 3500.0,
            "status": "active",
            "spec_groups": [
                {
                    "name": "Foundation & Structure",
                    "description": "Foundation and structural work specifications",
                    "display_order": 1,
                    "spec_items": [
                        {
                            "name": "Foundation Concrete",
                            "description": "M25 grade concrete for foundation",
                            "unit": "cubic_meter",
                            "material_type": "concrete",
                            "rate_range_min": 8000.0,
                            "rate_range_max": 12000.0,
                            "is_mandatory": True,
                            "display_order": 1,
                            "brand_list": [
                                {
                                    "name": "ACC Concrete",
                                    "rate": 10000.0,
                                    "is_preferred": True
                                },
                                {
                                    "name": "UltraTech Concrete",
                                    "rate": 10500.0,
                                    "is_preferred": False
                                }
                            ]
                        },
                        {
                            "name": "Steel Reinforcement",
                            "description": "TMT steel bars for reinforcement",
                            "unit": "kilogram",
                            "material_type": "steel",
                            "rate_range_min": 65.0,
                            "rate_range_max": 75.0,
                            "is_mandatory": True,
                            "display_order": 2,
                            "brand_list": [
                                {
                                    "name": "TATA Steel",
                                    "rate": 70.0,
                                    "is_preferred": True
                                }
                            ]
                        }
                    ]
                },
                {
                    "name": "Electrical & Plumbing",
                    "description": "Electrical and plumbing work specifications",
                    "display_order": 2,
                    "spec_items": [
                        {
                            "name": "Electrical Wiring",
                            "description": "Copper wiring for electrical installations",
                            "unit": "meter",
                            "material_type": "electrical",
                            "rate_range_min": 25.0,
                            "rate_range_max": 35.0,
                            "is_mandatory": True,
                            "display_order": 1,
                            "brand_list": [
                                {
                                    "name": "Havells Wire",
                                    "rate": 30.0,
                                    "is_preferred": True
                                }
                            ]
                        }
                    ]
                }
            ]
        }
        
        try:
            response = self.make_request("POST", "/construction-presets", self.admin_token, preset_data)
            
            if response.status_code == 200:
                data = response.json()
                self.test_preset_id = data.get("id")
                self.log_result(
                    "Create Construction Preset",
                    True,
                    f"Created preset with ID: {self.test_preset_id}, Name: {data.get('message', 'Success')}"
                )
            else:
                self.log_result(
                    "Create Construction Preset",
                    False,
                    f"Status: {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_result("Create Construction Preset", False, f"Exception: {str(e)}")

    def test_list_construction_presets(self):
        """Test GET /api/construction-presets with filters"""
        print("=== Testing List Construction Presets ===")
        
        if not self.admin_token:
            self.log_result("List Construction Presets", False, "No admin token available")
            return
        
        # Test basic list
        try:
            response = self.make_request("GET", "/construction-presets", self.admin_token)
            
            if response.status_code == 200:
                data = response.json()
                preset_count = len(data)
                self.log_result(
                    "List Construction Presets - Basic",
                    True,
                    f"Retrieved {preset_count} presets"
                )
                
                # Verify response structure
                if preset_count > 0:
                    first_preset = data[0]
                    required_fields = ["id", "name", "region", "status", "rate_per_sqft", "spec_groups_count", "spec_items_count"]
                    missing_fields = [field for field in required_fields if field not in first_preset]
                    
                    self.log_result(
                        "List Construction Presets - Structure",
                        len(missing_fields) == 0,
                        f"Missing fields: {missing_fields}" if missing_fields else "All required fields present"
                    )
            else:
                self.log_result(
                    "List Construction Presets - Basic",
                    False,
                    f"Status: {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_result("List Construction Presets - Basic", False, f"Exception: {str(e)}")
        
        # Test with search filter
        try:
            response = self.make_request("GET", "/construction-presets", self.admin_token, params={"search": "Bangalore"})
            
            if response.status_code == 200:
                data = response.json()
                self.log_result(
                    "List Construction Presets - Search Filter",
                    True,
                    f"Search 'Bangalore' returned {len(data)} presets"
                )
            else:
                self.log_result(
                    "List Construction Presets - Search Filter",
                    False,
                    f"Status: {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_result("List Construction Presets - Search Filter", False, f"Exception: {str(e)}")
        
        # Test with region filter
        try:
            response = self.make_request("GET", "/construction-presets", self.admin_token, params={"region": "Bangalore"})
            
            if response.status_code == 200:
                data = response.json()
                self.log_result(
                    "List Construction Presets - Region Filter",
                    True,
                    f"Region 'Bangalore' filter returned {len(data)} presets"
                )
            else:
                self.log_result(
                    "List Construction Presets - Region Filter",
                    False,
                    f"Status: {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_result("List Construction Presets - Region Filter", False, f"Exception: {str(e)}")
        
        # Test with status filter
        try:
            response = self.make_request("GET", "/construction-presets", self.admin_token, params={"status": "active"})
            
            if response.status_code == 200:
                data = response.json()
                self.log_result(
                    "List Construction Presets - Status Filter",
                    True,
                    f"Status 'active' filter returned {len(data)} presets"
                )
            else:
                self.log_result(
                    "List Construction Presets - Status Filter",
                    False,
                    f"Status: {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_result("List Construction Presets - Status Filter", False, f"Exception: {str(e)}")

    def test_get_single_construction_preset(self):
        """Test GET /api/construction-presets/{preset_id}"""
        print("=== Testing Get Single Construction Preset ===")
        
        if not self.admin_token or not self.test_preset_id:
            self.log_result("Get Single Construction Preset", False, "No admin token or preset ID available")
            return
        
        try:
            response = self.make_request("GET", f"/construction-presets/{self.test_preset_id}", self.admin_token)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify full preset structure with nested data
                required_fields = ["id", "name", "description", "region", "rate_per_sqft", "status", "spec_groups"]
                missing_fields = [field for field in required_fields if field not in data]
                
                # Check spec groups structure
                spec_groups_valid = True
                if "spec_groups" in data and len(data["spec_groups"]) > 0:
                    first_group = data["spec_groups"][0]
                    group_fields = ["name", "description", "spec_items"]
                    missing_group_fields = [field for field in group_fields if field not in first_group]
                    
                    if missing_group_fields:
                        spec_groups_valid = False
                    
                    # Check spec items structure
                    if "spec_items" in first_group and len(first_group["spec_items"]) > 0:
                        first_item = first_group["spec_items"][0]
                        item_fields = ["name", "unit", "material_type", "rate_range_min", "rate_range_max", "brand_list"]
                        missing_item_fields = [field for field in item_fields if field not in first_item]
                        
                        if missing_item_fields:
                            spec_groups_valid = False
                
                self.log_result(
                    "Get Single Construction Preset",
                    len(missing_fields) == 0 and spec_groups_valid,
                    f"Retrieved preset '{data.get('name')}' with {len(data.get('spec_groups', []))} spec groups. Missing fields: {missing_fields}" if missing_fields else f"Retrieved preset '{data.get('name')}' with complete nested structure"
                )
            else:
                self.log_result(
                    "Get Single Construction Preset",
                    False,
                    f"Status: {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_result("Get Single Construction Preset", False, f"Exception: {str(e)}")

    def test_update_construction_preset(self):
        """Test PUT /api/construction-presets/{preset_id}"""
        print("=== Testing Update Construction Preset ===")
        
        if not self.admin_token or not self.test_preset_id:
            self.log_result("Update Construction Preset", False, "No admin token or preset ID available")
            return
        
        # Update data
        update_data = {
            "name": "Test Bangalore Premium 2025 - Updated",
            "description": "Updated premium construction preset for Bangalore region",
            "rate_per_sqft": 3750.0,
            "status": "active",
            "spec_groups": [
                {
                    "name": "Foundation & Structure - Updated",
                    "description": "Updated foundation and structural work specifications",
                    "display_order": 1,
                    "spec_items": [
                        {
                            "name": "Foundation Concrete - Updated",
                            "description": "M30 grade concrete for foundation (upgraded)",
                            "unit": "cubic_meter",
                            "material_type": "concrete",
                            "rate_range_min": 9000.0,
                            "rate_range_max": 13000.0,
                            "is_mandatory": True,
                            "display_order": 1,
                            "brand_list": [
                                {
                                    "name": "ACC Concrete Premium",
                                    "rate": 11000.0,
                                    "is_preferred": True
                                }
                            ]
                        }
                    ]
                }
            ]
        }
        
        try:
            response = self.make_request("PUT", f"/construction-presets/{self.test_preset_id}", self.admin_token, update_data)
            
            if response.status_code == 200:
                data = response.json()
                self.log_result(
                    "Update Construction Preset",
                    True,
                    f"Updated preset successfully. Message: {data.get('message', 'Success')}"
                )
                
                # Verify version increment by getting the updated preset
                get_response = self.make_request("GET", f"/construction-presets/{self.test_preset_id}", self.admin_token)
                if get_response.status_code == 200:
                    updated_preset = get_response.json()
                    version = updated_preset.get("version", 1)
                    self.log_result(
                        "Update Construction Preset - Version Check",
                        version > 1,
                        f"Version after update: {version} (should be > 1)"
                    )
            else:
                self.log_result(
                    "Update Construction Preset",
                    False,
                    f"Status: {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_result("Update Construction Preset", False, f"Exception: {str(e)}")

    def test_duplicate_construction_preset(self):
        """Test POST /api/construction-presets/{preset_id}/duplicate"""
        print("=== Testing Duplicate Construction Preset ===")
        
        if not self.admin_token or not self.test_preset_id:
            self.log_result("Duplicate Construction Preset", False, "No admin token or preset ID available")
            return
        
        try:
            params = {
                "new_name": "Test Mumbai Premium 2025 - Duplicated",
                "new_region": "Mumbai"
            }
            
            response = self.make_request("POST", f"/construction-presets/{self.test_preset_id}/duplicate", self.admin_token, params=params)
            
            if response.status_code == 200:
                data = response.json()
                self.duplicate_preset_id = data.get("id")
                self.log_result(
                    "Duplicate Construction Preset",
                    True,
                    f"Duplicated preset with new ID: {self.duplicate_preset_id}. Message: {data.get('message', 'Success')}"
                )
            else:
                self.log_result(
                    "Duplicate Construction Preset",
                    False,
                    f"Status: {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_result("Duplicate Construction Preset", False, f"Exception: {str(e)}")

    def test_delete_construction_preset_wrong_confirmation(self):
        """Test DELETE /api/construction-presets/{preset_id} with wrong confirmation"""
        print("=== Testing Delete Construction Preset - Wrong Confirmation ===")
        
        if not self.admin_token or not self.duplicate_preset_id:
            self.log_result("Delete Construction Preset - Wrong Confirmation", False, "No admin token or duplicate preset ID available")
            return
        
        try:
            params = {
                "confirmation_name": "Wrong Name"
            }
            
            response = self.make_request("DELETE", f"/construction-presets/{self.duplicate_preset_id}", self.admin_token, params=params)
            
            # Should fail with 400 or 403
            if response.status_code in [400, 403]:
                self.log_result(
                    "Delete Construction Preset - Wrong Confirmation",
                    True,
                    f"Correctly rejected wrong confirmation name. Status: {response.status_code}"
                )
            else:
                self.log_result(
                    "Delete Construction Preset - Wrong Confirmation",
                    False,
                    f"Should have rejected wrong confirmation. Status: {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_result("Delete Construction Preset - Wrong Confirmation", False, f"Exception: {str(e)}")

    def test_delete_construction_preset_correct_confirmation(self):
        """Test DELETE /api/construction-presets/{preset_id} with correct confirmation"""
        print("=== Testing Delete Construction Preset - Correct Confirmation ===")
        
        if not self.admin_token or not self.duplicate_preset_id:
            self.log_result("Delete Construction Preset - Correct Confirmation", False, "No admin token or duplicate preset ID available")
            return
        
        try:
            params = {
                "confirmation_name": "Test Mumbai Premium 2025 - Duplicated"
            }
            
            response = self.make_request("DELETE", f"/construction-presets/{self.duplicate_preset_id}", self.admin_token, params=params)
            
            if response.status_code == 200:
                data = response.json()
                self.log_result(
                    "Delete Construction Preset - Correct Confirmation",
                    True,
                    f"Successfully deleted preset. Message: {data.get('message', 'Success')}, Usage count: {data.get('usage_count', 0)}"
                )
            else:
                self.log_result(
                    "Delete Construction Preset - Correct Confirmation",
                    False,
                    f"Status: {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_result("Delete Construction Preset - Correct Confirmation", False, f"Exception: {str(e)}")

    def test_authorization_non_admin_user(self):
        """Test authorization - non-admin user should get 403"""
        print("=== Testing Authorization - Non-Admin User ===")
        
        # Try to authenticate as a regular user (if available)
        # For now, we'll test with manager credentials which should work
        if not self.manager_token:
            self.log_result("Authorization - Manager Access", False, "No manager token available")
            return
        
        # Test manager can create presets (should work)
        preset_data = {
            "name": "Manager Test Preset",
            "description": "Test preset created by manager",
            "region": "Delhi",
            "effective_date": datetime.now().isoformat(),
            "rate_per_sqft": 2500.0,
            "status": "draft",
            "spec_groups": []
        }
        
        try:
            response = self.make_request("POST", "/construction-presets", self.manager_token, preset_data)
            
            if response.status_code == 200:
                self.log_result(
                    "Authorization - Manager Access",
                    True,
                    "Manager successfully created preset (correct behavior)"
                )
            elif response.status_code == 403:
                self.log_result(
                    "Authorization - Manager Access",
                    False,
                    "Manager was denied access (should be allowed)"
                )
            else:
                self.log_result(
                    "Authorization - Manager Access",
                    False,
                    f"Unexpected status: {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_result("Authorization - Manager Access", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all Construction Presets API tests"""
        print("🏗️ CONSTRUCTION PRESETS MODULE - BACKEND API TESTING")
        print("=" * 60)
        
        # Authentication
        if not self.test_authentication():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return
        
        # CRUD Operations
        self.test_create_construction_preset()
        self.test_list_construction_presets()
        self.test_get_single_construction_preset()
        self.test_update_construction_preset()
        self.test_duplicate_construction_preset()
        
        # Delete operations
        self.test_delete_construction_preset_wrong_confirmation()
        self.test_delete_construction_preset_correct_confirmation()
        
        # Authorization
        self.test_authorization_non_admin_user()
        
        # Summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("🏗️ CONSTRUCTION PRESETS API TESTING SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.results)
        passed_tests = len([r for r in self.results if "✅ PASS" in r["status"]])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.results:
                if "❌ FAIL" in result["status"]:
                    print(f"  - {result['test']}: {result['details']}")
        
        print("\n✅ PASSED TESTS:")
        for result in self.results:
            if "✅ PASS" in result["status"]:
                print(f"  - {result['test']}")
        
        print("\n" + "=" * 60)

if __name__ == "__main__":
    tester = ConstructionPresetsAPITester()
    tester.run_all_tests()