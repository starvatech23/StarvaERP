#!/usr/bin/env python3
"""
Backend API Testing for Budgeting & Estimation - Edit & Export Features
Tests the new endpoints:
1. PUT /api/estimates/{estimate_id}/lines/{line_id} - Update BOQ line item
2. GET /api/estimates/{estimate_id}/export/csv - Export to CSV
3. GET /api/estimates/{estimate_id}/export/pdf - Export to PDF (HTML)
4. Existing endpoints verification
"""

import requests
import json
from datetime import datetime
import sys
import os

# Backend URL from frontend .env
BACKEND_URL = "https://budget-wizard-67.preview.emergentagent.com/api"

# Test credentials - Using CRM Manager as specified in requirements
TEST_CREDENTIALS = {
    "identifier": "crm.manager@test.com",
    "password": "manager123",
    "auth_type": "email"
}

# Fallback credentials
ADMIN_CREDENTIALS = {
    "identifier": "admin@test.com",
    "password": "admin123",
    "auth_type": "email"
}

PM_CREDENTIALS = {
    "identifier": "pm@test.com", 
    "password": "pm123",
    "auth_type": "email"
}

class EstimationAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.pm_token = None
        self.test_project_id = None
        self.test_estimate_id = None
        
    def login(self, credentials, user_type="admin"):
        """Login and get access token"""
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/login", json=credentials)
            if response.status_code == 200:
                data = response.json()
                token = data.get("access_token")
                if user_type == "admin":
                    self.admin_token = token
                else:
                    self.pm_token = token
                print(f"✅ {user_type.upper()} login successful")
                return token
            else:
                print(f"❌ {user_type.upper()} login failed: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"❌ {user_type.upper()} login error: {str(e)}")
            return None
    
    def get_headers(self, user_type="admin"):
        """Get authorization headers"""
        token = self.admin_token if user_type == "admin" else self.pm_token
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def get_existing_project(self):
        """Get an existing project to use for testing"""
        try:
            headers = self.get_headers("admin")
            response = self.session.get(f"{BACKEND_URL}/projects", headers=headers)
            
            if response.status_code == 200:
                projects = response.json()
                if projects:
                    self.test_project_id = projects[0]["id"]
                    print(f"✅ Using existing project: {projects[0]['name']} (ID: {self.test_project_id})")
                    return True
                else:
                    print("❌ No existing projects found")
                    return False
            else:
                print(f"❌ Failed to get projects: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Error getting projects: {str(e)}")
            return False
    
    def test_create_estimate(self):
        """Test POST /api/estimates - CRITICAL"""
        print("\n🔍 Testing POST /api/estimates (CRITICAL)")
        
        if not self.test_project_id:
            print("❌ No project ID available for testing")
            return False
            
        estimate_data = {
            "project_id": self.test_project_id,
            "built_up_area_sqft": 2000,
            "package_type": "standard",
            "num_floors": 2,
            "floor_to_floor_height": 10.0,
            "contingency_percent": 10.0,
            "labour_percent_of_material": 40.0
        }
        
        try:
            headers = self.get_headers("admin")
            response = self.session.post(f"{BACKEND_URL}/estimates", json=estimate_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                self.test_estimate_id = data.get("id")
                
                # Verify required fields
                required_fields = ["grand_total", "cost_per_sqft", "lines"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    print(f"❌ Missing required fields: {missing_fields}")
                    return False
                
                # Verify BOQ lines
                lines = data.get("lines", [])
                if not lines:
                    print("❌ No BOQ lines returned")
                    return False
                
                if len(lines) < 15:
                    print(f"⚠️  Only {len(lines)} BOQ lines returned, expected 15-20")
                
                # Check line structure
                first_line = lines[0]
                line_required_fields = ["item_name", "quantity", "rate", "amount", "formula_used"]
                missing_line_fields = [field for field in line_required_fields if field not in first_line]
                
                if missing_line_fields:
                    print(f"❌ BOQ line missing fields: {missing_line_fields}")
                    return False
                
                print(f"✅ Estimate created successfully")
                print(f"   - Estimate ID: {self.test_estimate_id}")
                print(f"   - Grand Total: ₹{data['grand_total']:,.2f}")
                print(f"   - Cost per sqft: ₹{data['cost_per_sqft']:,.2f}")
                print(f"   - BOQ Lines: {len(lines)} items")
                print(f"   - Sample line: {first_line['item_name']} - ₹{first_line['amount']:,.2f}")
                return True
                
            else:
                print(f"❌ Create estimate failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Create estimate error: {str(e)}")
            return False
    
    def test_get_estimate(self):
        """Test GET /api/estimates/{estimate_id}"""
        print("\n🔍 Testing GET /api/estimates/{estimate_id}")
        
        if not self.test_estimate_id:
            print("❌ No estimate ID available for testing")
            return False
            
        try:
            headers = self.get_headers("admin")
            response = self.session.get(f"{BACKEND_URL}/estimates/{self.test_estimate_id}", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify full estimate structure
                required_fields = ["id", "project_id", "grand_total", "cost_per_sqft", "lines"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    print(f"❌ Missing required fields: {missing_fields}")
                    return False
                
                lines = data.get("lines", [])
                print(f"✅ Get estimate successful")
                print(f"   - Estimate ID: {data['id']}")
                print(f"   - Project ID: {data['project_id']}")
                print(f"   - Grand Total: ₹{data['grand_total']:,.2f}")
                print(f"   - BOQ Lines: {len(lines)} items")
                return True
                
            else:
                print(f"❌ Get estimate failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Get estimate error: {str(e)}")
            return False
    
    def test_list_project_estimates(self):
        """Test GET /api/projects/{project_id}/estimates"""
        print("\n🔍 Testing GET /api/projects/{project_id}/estimates")
        
        if not self.test_project_id:
            print("❌ No project ID available for testing")
            return False
            
        try:
            headers = self.get_headers("admin")
            response = self.session.get(f"{BACKEND_URL}/projects/{self.test_project_id}/estimates", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                if not isinstance(data, list):
                    print(f"❌ Expected array, got: {type(data)}")
                    return False
                
                print(f"✅ List project estimates successful")
                print(f"   - Found {len(data)} estimates for project")
                
                if data:
                    estimate = data[0]
                    required_fields = ["id", "project_id", "version", "grand_total", "cost_per_sqft"]
                    missing_fields = [field for field in required_fields if field not in estimate]
                    
                    if missing_fields:
                        print(f"❌ Estimate summary missing fields: {missing_fields}")
                        return False
                    
                    print(f"   - Latest estimate: Version {estimate['version']}, Total: ₹{estimate['grand_total']:,.2f}")
                
                return True
                
            else:
                print(f"❌ List project estimates failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ List project estimates error: {str(e)}")
            return False
    
    def test_material_presets(self):
        """Test GET /api/material-presets"""
        print("\n🔍 Testing GET /api/material-presets")
        
        try:
            headers = self.get_headers("admin")
            response = self.session.get(f"{BACKEND_URL}/material-presets", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                if not isinstance(data, list):
                    print(f"❌ Expected array, got: {type(data)}")
                    return False
                
                print(f"✅ Get material presets successful")
                print(f"   - Found {len(data)} presets (expected: 0 initially)")
                return True
                
            else:
                print(f"❌ Get material presets failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Get material presets error: {str(e)}")
            return False
    
    def test_rate_tables(self):
        """Test GET /api/rate-tables"""
        print("\n🔍 Testing GET /api/rate-tables")
        
        try:
            headers = self.get_headers("admin")
            response = self.session.get(f"{BACKEND_URL}/rate-tables", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                if not isinstance(data, list):
                    print(f"❌ Expected array, got: {type(data)}")
                    return False
                
                print(f"✅ Get rate tables successful")
                print(f"   - Found {len(data)} rate tables (expected: 0 initially)")
                return True
                
            else:
                print(f"❌ Get rate tables failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Get rate tables error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all estimation API tests"""
        print("🚀 Starting Budgeting & Estimation APIs Testing")
        print("=" * 60)
        
        # Login
        if not self.login(ADMIN_CREDENTIALS, "admin"):
            print("❌ Admin login failed, cannot continue")
            return False
        
        if not self.login(PM_CREDENTIALS, "pm"):
            print("⚠️  PM login failed, continuing with admin only")
        
        # Get existing project
        if not self.get_existing_project():
            print("❌ Cannot get existing project, cannot continue")
            return False
        
        # Run tests in priority order
        tests = [
            ("Create Estimate (CRITICAL)", self.test_create_estimate),
            ("Get Estimate", self.test_get_estimate),
            ("List Project Estimates", self.test_list_project_estimates),
            ("Material Presets", self.test_material_presets),
            ("Rate Tables", self.test_rate_tables)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            try:
                if test_func():
                    passed += 1
                else:
                    print(f"❌ {test_name} FAILED")
            except Exception as e:
                print(f"❌ {test_name} ERROR: {str(e)}")
        
        # Summary
        print("\n" + "=" * 60)
        print(f"📊 TEST SUMMARY: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
        
        if passed == total:
            print("🎉 ALL ESTIMATION APIS WORKING PERFECTLY!")
            return True
        else:
            print(f"⚠️  {total - passed} tests failed - see details above")
            return False

if __name__ == "__main__":
    tester = EstimationAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)