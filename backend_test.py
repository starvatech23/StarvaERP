#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Vendor & Materials Management Module
Tests all 8 major API groups with complete workflow scenarios
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any
import sys

# Configuration
BASE_URL = "https://buildflow-74.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class VendorMaterialsAPITester:
    def __init__(self):
        self.auth_token = None
        self.headers = HEADERS.copy()
        self.test_data = {}
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
    
    def authenticate(self):
        """Authenticate and get access token"""
        print("\n🔐 AUTHENTICATION")
        
        # Register a test admin user
        register_data = {
            "email": "admin@buildflow.com",
            "password": "admin123",
            "full_name": "Test Admin",
            "role": "admin",
            "auth_type": "email"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/auth/register", json=register_data)
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data["access_token"]
                self.headers["Authorization"] = f"Bearer {self.auth_token}"
                self.log_test("Admin Registration", True, "Admin user registered successfully")
                return True
            else:
                # Try login if user already exists
                login_data = {
                    "identifier": "admin@buildflow.com",
                    "password": "admin123",
                    "auth_type": "email"
                }
                response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
                if response.status_code == 200:
                    data = response.json()
                    self.auth_token = data["access_token"]
                    self.headers["Authorization"] = f"Bearer {self.auth_token}"
                    self.log_test("Admin Login", True, "Admin user logged in successfully")
                    return True
                else:
                    self.log_test("Authentication", False, f"Failed: {response.text}")
                    return False
        except Exception as e:
            self.log_test("Authentication", False, f"Exception: {str(e)}")
            return False
    
    def create_test_project(self):
        """Create a test project for inventory and requirements"""
        print("\n🏗️ CREATING TEST PROJECT")
        
        project_data = {
            "name": "Materials Test Project",
            "location": "Mumbai",
            "address": "Test Site, Mumbai, Maharashtra",
            "client_name": "ABC Construction Ltd",
            "client_contact": "+91-9876543210",
            "status": "in_progress",
            "budget": 5000000.0,
            "description": "Test project for materials management testing"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/projects", json=project_data, headers=self.headers)
            if response.status_code == 200:
                project = response.json()
                self.test_data["project_id"] = project["id"]
                self.test_data["project_name"] = project["name"]
                self.log_test("Test Project Creation", True, f"Project ID: {project['id']}")
                return True
            else:
                self.log_test("Test Project Creation", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Test Project Creation", False, f"Exception: {str(e)}")
            return False
    
    def test_vendor_management(self):
        """Test GROUP 1: Vendor Management APIs"""
        print("\n📋 GROUP 1: VENDOR MANAGEMENT APIS")
        
        # Test 1: Create Vendor
        vendor_data = {
            "business_name": "Supreme Cement Suppliers",
            "contact_person": "Rajesh Kumar",
            "phone": "+91-9876543210",
            "email": "rajesh@supremecement.com",
            "address": "Industrial Area, Sector 15",
            "city": "Gurgaon",
            "state": "Haryana",
            "pincode": "122001",
            "gst_number": "07ABCDE1234F1Z5",
            "pan_number": "ABCDE1234F",
            "payment_terms": "Net 30 days",
            "bank_name": "HDFC Bank",
            "account_number": "12345678901234",
            "ifsc_code": "HDFC0001234",
            "account_holder_name": "Supreme Cement Suppliers",
            "is_active": True,
            "notes": "Reliable cement supplier with good quality products"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/vendors", json=vendor_data, headers=self.headers)
            if response.status_code == 200:
                vendor = response.json()
                self.test_data["vendor1_id"] = vendor["id"]
                self.log_test("Create Vendor", True, f"Vendor ID: {vendor['id']}")
            else:
                self.log_test("Create Vendor", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Create Vendor", False, f"Exception: {str(e)}")
            return False
        
        # Create second vendor
        vendor2_data = {
            "business_name": "Steel World Industries",
            "contact_person": "Amit Sharma",
            "phone": "+91-9876543211",
            "email": "amit@steelworld.com",
            "address": "Steel Market, Phase 2",
            "city": "Delhi",
            "state": "Delhi",
            "pincode": "110001",
            "gst_number": "07FGHIJ5678K2L6",
            "pan_number": "FGHIJ5678K",
            "payment_terms": "Cash on Delivery",
            "bank_name": "SBI Bank",
            "account_number": "98765432109876",
            "ifsc_code": "SBIN0001234",
            "account_holder_name": "Steel World Industries",
            "is_active": True,
            "notes": "Steel and iron supplier"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/vendors", json=vendor2_data, headers=self.headers)
            if response.status_code == 200:
                vendor2 = response.json()
                self.test_data["vendor2_id"] = vendor2["id"]
                self.log_test("Create Second Vendor", True, f"Vendor ID: {vendor2['id']}")
            else:
                self.log_test("Create Second Vendor", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Create Second Vendor", False, f"Exception: {str(e)}")
            return False
        
        # Test 2: Get All Vendors
        try:
            response = requests.get(f"{BASE_URL}/vendors", headers=self.headers)
            if response.status_code == 200:
                vendors = response.json()
                if len(vendors) >= 2:
                    self.log_test("Get All Vendors", True, f"Retrieved {len(vendors)} vendors")
                else:
                    self.log_test("Get All Vendors", False, f"Expected at least 2 vendors, got {len(vendors)}")
            else:
                self.log_test("Get All Vendors", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Get All Vendors", False, f"Exception: {str(e)}")
        
        # Test 3: Get Specific Vendor
        try:
            response = requests.get(f"{BASE_URL}/vendors/{self.test_data['vendor1_id']}", headers=self.headers)
            if response.status_code == 200:
                vendor = response.json()
                if vendor["business_name"] == "Supreme Cement Suppliers":
                    self.log_test("Get Specific Vendor", True, f"Retrieved vendor: {vendor['business_name']}")
                else:
                    self.log_test("Get Specific Vendor", False, "Vendor data mismatch")
            else:
                self.log_test("Get Specific Vendor", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Get Specific Vendor", False, f"Exception: {str(e)}")
        
        # Test 4: Update Vendor
        update_data = {
            "payment_terms": "Net 15 days",
            "notes": "Updated payment terms - reliable supplier"
        }
        
        try:
            response = requests.put(f"{BASE_URL}/vendors/{self.test_data['vendor1_id']}", json=update_data, headers=self.headers)
            if response.status_code == 200:
                vendor = response.json()
                if vendor["payment_terms"] == "Net 15 days":
                    self.log_test("Update Vendor", True, "Payment terms updated successfully")
                else:
                    self.log_test("Update Vendor", False, "Update not reflected")
            else:
                self.log_test("Update Vendor", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Update Vendor", False, f"Exception: {str(e)}")
        
        return True
    
    def test_material_management(self):
        """Test GROUP 2: Material Management APIs"""
        print("\n🧱 GROUP 2: MATERIAL MANAGEMENT APIS")
        
        # Test 1: Create Materials
        materials_data = [
            {
                "name": "OPC Cement 53 Grade",
                "category": "cement",
                "unit": "bag",
                "description": "High quality cement for construction",
                "minimum_stock": 100.0,
                "hsn_code": "25231000",
                "is_active": True
            },
            {
                "name": "TMT Steel Bars 12mm",
                "category": "steel",
                "unit": "kg",
                "description": "Thermo-mechanically treated steel bars",
                "minimum_stock": 500.0,
                "hsn_code": "72142000",
                "is_active": True
            },
            {
                "name": "River Sand",
                "category": "sand",
                "unit": "cft",
                "description": "Fine river sand for construction",
                "minimum_stock": 50.0,
                "hsn_code": "25051000",
                "is_active": True
            }
        ]
        
        material_ids = []
        for i, material_data in enumerate(materials_data):
            try:
                response = requests.post(f"{BASE_URL}/materials", json=material_data, headers=self.headers)
                if response.status_code == 200:
                    material = response.json()
                    material_ids.append(material["id"])
                    self.log_test(f"Create Material {i+1}", True, f"Material: {material['name']}")
                else:
                    self.log_test(f"Create Material {i+1}", False, f"Status: {response.status_code}")
                    return False
            except Exception as e:
                self.log_test(f"Create Material {i+1}", False, f"Exception: {str(e)}")
                return False
        
        self.test_data["material_ids"] = material_ids
        self.test_data["cement_id"] = material_ids[0]
        self.test_data["steel_id"] = material_ids[1]
        self.test_data["sand_id"] = material_ids[2]
        
        # Test 2: Get All Materials
        try:
            response = requests.get(f"{BASE_URL}/materials", headers=self.headers)
            if response.status_code == 200:
                materials = response.json()
                if len(materials) >= 3:
                    self.log_test("Get All Materials", True, f"Retrieved {len(materials)} materials")
                else:
                    self.log_test("Get All Materials", False, f"Expected at least 3 materials, got {len(materials)}")
            else:
                self.log_test("Get All Materials", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Get All Materials", False, f"Exception: {str(e)}")
        
        # Test 3: Get Material by Category
        try:
            response = requests.get(f"{BASE_URL}/materials?category=cement", headers=self.headers)
            if response.status_code == 200:
                materials = response.json()
                cement_materials = [m for m in materials if m["category"] == "cement"]
                if len(cement_materials) >= 1:
                    self.log_test("Filter Materials by Category", True, f"Found {len(cement_materials)} cement materials")
                else:
                    self.log_test("Filter Materials by Category", False, "No cement materials found")
            else:
                self.log_test("Filter Materials by Category", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Filter Materials by Category", False, f"Exception: {str(e)}")
        
        # Test 4: Update Material
        update_data = {
            "minimum_stock": 150.0,
            "description": "Premium quality OPC cement 53 grade"
        }
        
        try:
            response = requests.put(f"{BASE_URL}/materials/{self.test_data['cement_id']}", json=update_data, headers=self.headers)
            if response.status_code == 200:
                material = response.json()
                if material["minimum_stock"] == 150.0:
                    self.log_test("Update Material", True, "Minimum stock updated successfully")
                else:
                    self.log_test("Update Material", False, "Update not reflected")
            else:
                self.log_test("Update Material", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Update Material", False, f"Exception: {str(e)}")
        
        return True
    
    def run_all_tests(self):
        """Run all test groups"""
        print("🚀 STARTING COMPREHENSIVE VENDOR & MATERIALS MANAGEMENT API TESTING")
        print("="*80)
        
        # Authentication
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Create test project
        if not self.create_test_project():
            print("❌ Test project creation failed. Cannot proceed with tests.")
            return False
        
        # Run test groups
        test_groups = [
            self.test_vendor_management,
            self.test_material_management
        ]
        
        for test_group in test_groups:
            try:
                test_group()
            except Exception as e:
                print(f"❌ Test group failed with exception: {str(e)}")
        
        # Print summary
        passed, failed = self.print_summary()
        
        return failed == 0
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*80)
        print("🎯 VENDOR & MATERIALS MANAGEMENT API TESTING SUMMARY")
        print("="*80)
        
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t["success"]])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS:")
            for test in self.test_results:
                if not test["success"]:
                    print(f"   • {test['test']}: {test['details']}")
        
        print("\n🎉 TESTING COMPLETED!")
        return passed_tests, failed_tests

if __name__ == "__main__":
    tester = VendorMaterialsAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)