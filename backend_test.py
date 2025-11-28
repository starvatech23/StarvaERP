#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Vendor & Materials Management Module
Tests all CRUD operations, payment dues, inventory management, and reporting endpoints
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional

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
    
    def test_vendor_material_rates(self):
        """Test GROUP 3: Vendor Material Rate APIs"""
        print("\n💰 GROUP 3: VENDOR MATERIAL RATE APIS")
        
        # Test 1: Create Vendor Material Rates
        rates_data = [
            {
                "vendor_id": self.test_data["vendor1_id"],
                "material_id": self.test_data["cement_id"],
                "rate_per_unit": 350.0,
                "effective_from": datetime.now().isoformat(),
                "is_active": True,
                "notes": "Bulk rate for cement"
            },
            {
                "vendor_id": self.test_data["vendor2_id"],
                "material_id": self.test_data["steel_id"],
                "rate_per_unit": 65.0,
                "effective_from": datetime.now().isoformat(),
                "is_active": True,
                "notes": "Current market rate for TMT bars"
            }
        ]
        
        rate_ids = []
        for i, rate_data in enumerate(rates_data):
            try:
                response = requests.post(f"{BASE_URL}/vendor-material-rates", json=rate_data, headers=self.headers)
                if response.status_code == 200:
                    rate = response.json()
                    rate_ids.append(rate["id"])
                    self.log_test(f"Create Vendor Rate {i+1}", True, f"Rate: ₹{rate['rate_per_unit']}")
                else:
                    self.log_test(f"Create Vendor Rate {i+1}", False, f"Status: {response.status_code}")
                    return False
            except Exception as e:
                self.log_test(f"Create Vendor Rate {i+1}", False, f"Exception: {str(e)}")
                return False
        
        self.test_data["rate_ids"] = rate_ids
        
        # Test 2: Get All Rates
        try:
            response = requests.get(f"{BASE_URL}/vendor-material-rates", headers=self.headers)
            if response.status_code == 200:
                rates = response.json()
                if len(rates) >= 2:
                    self.log_test("Get All Vendor Rates", True, f"Retrieved {len(rates)} rates")
                else:
                    self.log_test("Get All Vendor Rates", False, f"Expected at least 2 rates, got {len(rates)}")
            else:
                self.log_test("Get All Vendor Rates", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Get All Vendor Rates", False, f"Exception: {str(e)}")
        
        # Test 3: Filter by Vendor
        try:
            response = requests.get(f"{BASE_URL}/vendor-material-rates?vendor_id={self.test_data['vendor1_id']}", headers=self.headers)
            if response.status_code == 200:
                rates = response.json()
                vendor1_rates = [r for r in rates if r["vendor_id"] == self.test_data["vendor1_id"]]
                if len(vendor1_rates) >= 1:
                    self.log_test("Filter Rates by Vendor", True, f"Found {len(vendor1_rates)} rates for vendor 1")
                else:
                    self.log_test("Filter Rates by Vendor", False, f"Expected at least 1 rate, got {len(vendor1_rates)}")
            else:
                self.log_test("Filter Rates by Vendor", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Filter Rates by Vendor", False, f"Exception: {str(e)}")
        
        return True
    
    def test_site_inventory(self):
        """Test GROUP 4: Site Inventory APIs"""
        print("\n📦 GROUP 4: SITE INVENTORY APIS")
        
        # Test 1: Create Site Inventory
        inventory_data = [
            {
                "project_id": self.test_data["project_id"],
                "material_id": self.test_data["cement_id"],
                "current_stock": 200.0,
                "last_updated": datetime.now().isoformat()
            },
            {
                "project_id": self.test_data["project_id"],
                "material_id": self.test_data["steel_id"],
                "current_stock": 1000.0,
                "last_updated": datetime.now().isoformat()
            }
        ]
        
        inventory_ids = []
        for i, inv_data in enumerate(inventory_data):
            try:
                response = requests.post(f"{BASE_URL}/site-inventory", json=inv_data, headers=self.headers)
                if response.status_code == 200:
                    inventory = response.json()
                    inventory_ids.append(inventory["id"])
                    self.log_test(f"Create Site Inventory {i+1}", True, f"Stock: {inventory['current_stock']}")
                else:
                    self.log_test(f"Create Site Inventory {i+1}", False, f"Status: {response.status_code}")
                    return False
            except Exception as e:
                self.log_test(f"Create Site Inventory {i+1}", False, f"Exception: {str(e)}")
                return False
        
        self.test_data["inventory_ids"] = inventory_ids
        
        # Test 2: Get All Site Inventory
        try:
            response = requests.get(f"{BASE_URL}/site-inventory", headers=self.headers)
            if response.status_code == 200:
                inventory = response.json()
                if len(inventory) >= 2:
                    self.log_test("Get All Site Inventory", True, f"Retrieved {len(inventory)} inventory items")
                else:
                    self.log_test("Get All Site Inventory", False, f"Expected at least 2 items, got {len(inventory)}")
            else:
                self.log_test("Get All Site Inventory", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Get All Site Inventory", False, f"Exception: {str(e)}")
        
        return True
    
    def test_material_requirements(self):
        """Test GROUP 5: Material Requirements APIs"""
        print("\n📋 GROUP 5: MATERIAL REQUIREMENTS APIS")
        
        # Test 1: Create Material Requirements
        requirements_data = [
            {
                "project_id": self.test_data["project_id"],
                "material_id": self.test_data["cement_id"],
                "required_quantity": 500.0,
                "required_by_date": (datetime.now() + timedelta(days=7)).isoformat(),
                "priority": "high",
                "purpose": "Foundation work",
                "is_fulfilled": False,
                "notes": "Urgent requirement for foundation pouring"
            }
        ]
        
        requirement_ids = []
        for i, req_data in enumerate(requirements_data):
            try:
                response = requests.post(f"{BASE_URL}/material-requirements", json=req_data, headers=self.headers)
                if response.status_code == 200:
                    requirement = response.json()
                    requirement_ids.append(requirement["id"])
                    self.log_test(f"Create Material Requirement {i+1}", True, f"Quantity: {requirement['required_quantity']}")
                else:
                    self.log_test(f"Create Material Requirement {i+1}", False, f"Status: {response.status_code}")
                    return False
            except Exception as e:
                self.log_test(f"Create Material Requirement {i+1}", False, f"Exception: {str(e)}")
                return False
        
        self.test_data["requirement_ids"] = requirement_ids
        
        # Test 2: Get All Requirements
        try:
            response = requests.get(f"{BASE_URL}/material-requirements", headers=self.headers)
            if response.status_code == 200:
                requirements = response.json()
                if len(requirements) >= 1:
                    self.log_test("Get All Material Requirements", True, f"Retrieved {len(requirements)} requirements")
                else:
                    self.log_test("Get All Material Requirements", False, f"Expected at least 1 requirement, got {len(requirements)}")
            else:
                self.log_test("Get All Material Requirements", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Get All Material Requirements", False, f"Exception: {str(e)}")
        
        return True
    
    def test_purchase_orders(self):
        """Test GROUP 6: Purchase Order APIs"""
        print("\n🛍️ GROUP 6: PURCHASE ORDER APIS")
        
        # Test 1: Create Purchase Order
        po_data = {
            "po_number": f"PO-{datetime.now().strftime('%Y%m%d')}-001",
            "vendor_id": self.test_data["vendor1_id"],
            "project_id": self.test_data["project_id"],
            "order_date": datetime.now().isoformat(),
            "expected_delivery_date": (datetime.now() + timedelta(days=5)).isoformat(),
            "status": "draft",
            "payment_terms": "Net 30 days",
            "total_amount": 180000.0,
            "tax_amount": 32400.0,
            "discount_amount": 0.0,
            "final_amount": 212400.0,
            "delivery_address": "Test Site, Mumbai, Maharashtra",
            "notes": "Urgent delivery required",
            "items": [
                {
                    "material_id": self.test_data["cement_id"],
                    "quantity": 500.0,
                    "rate_per_unit": 360.0,
                    "amount": 180000.0
                }
            ]
        }
        
        try:
            response = requests.post(f"{BASE_URL}/purchase-orders", json=po_data, headers=self.headers)
            if response.status_code == 200:
                po = response.json()
                self.test_data["po_id"] = po["id"]
                self.log_test("Create Purchase Order", True, f"PO Number: {po['po_number']}")
            else:
                self.log_test("Create Purchase Order", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Create Purchase Order", False, f"Exception: {str(e)}")
            return False
        
        # Test 2: Get All Purchase Orders
        try:
            response = requests.get(f"{BASE_URL}/purchase-orders", headers=self.headers)
            if response.status_code == 200:
                pos = response.json()
                if len(pos) >= 1:
                    self.log_test("Get All Purchase Orders", True, f"Retrieved {len(pos)} purchase orders")
                else:
                    self.log_test("Get All Purchase Orders", False, f"Expected at least 1 PO, got {len(pos)}")
            else:
                self.log_test("Get All Purchase Orders", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Get All Purchase Orders", False, f"Exception: {str(e)}")
        
        return True
    
    def test_material_transactions(self):
        """Test GROUP 7: Material Transaction APIs"""
        print("\n🔄 GROUP 7: MATERIAL TRANSACTION APIS")
        
        # Test 1: Create Material Transactions
        transactions_data = [
            {
                "project_id": self.test_data["project_id"],
                "material_id": self.test_data["cement_id"],
                "transaction_type": "receipt",
                "quantity": 500.0,
                "transaction_date": datetime.now().isoformat(),
                "reference_type": "purchase_order",
                "reference_id": self.test_data.get("po_id"),
                "notes": "Material received from Supreme Cement"
            },
            {
                "project_id": self.test_data["project_id"],
                "material_id": self.test_data["cement_id"],
                "transaction_type": "consumption",
                "quantity": 100.0,
                "transaction_date": datetime.now().isoformat(),
                "reference_type": "task",
                "reference_id": None,
                "notes": "Used for foundation work"
            }
        ]
        
        transaction_ids = []
        for i, txn_data in enumerate(transactions_data):
            try:
                response = requests.post(f"{BASE_URL}/material-transactions", json=txn_data, headers=self.headers)
                if response.status_code == 200:
                    transaction = response.json()
                    transaction_ids.append(transaction["id"])
                    self.log_test(f"Create Material Transaction {i+1}", True, f"Type: {transaction['transaction_type']}, Qty: {transaction['quantity']}")
                else:
                    self.log_test(f"Create Material Transaction {i+1}", False, f"Status: {response.status_code}, Response: {response.text}")
                    return False
            except Exception as e:
                self.log_test(f"Create Material Transaction {i+1}", False, f"Exception: {str(e)}")
                return False
        
        self.test_data["transaction_ids"] = transaction_ids
        
        # Test 2: Get All Transactions
        try:
            response = requests.get(f"{BASE_URL}/material-transactions", headers=self.headers)
            if response.status_code == 200:
                transactions = response.json()
                if len(transactions) >= 2:
                    self.log_test("Get All Material Transactions", True, f"Retrieved {len(transactions)} transactions")
                else:
                    self.log_test("Get All Material Transactions", False, f"Expected at least 2 transactions, got {len(transactions)}")
            else:
                self.log_test("Get All Material Transactions", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Get All Material Transactions", False, f"Exception: {str(e)}")
        
        return True
    
    def test_material_reports(self):
        """Test GROUP 8: Material Spending Reports API"""
        print("\n📊 GROUP 8: MATERIAL SPENDING REPORTS API")
        
        # Test 1: Get Weekly Spending Report
        try:
            response = requests.get(f"{BASE_URL}/material-reports/spending?period=weekly", headers=self.headers)
            if response.status_code == 200:
                report = response.json()
                if "total_spending" in report:
                    self.log_test("Get Weekly Spending Report", True, f"Total spending: ₹{report['total_spending']}")
                else:
                    self.log_test("Get Weekly Spending Report", False, "Missing required fields in response")
            else:
                self.log_test("Get Weekly Spending Report", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Get Weekly Spending Report", False, f"Exception: {str(e)}")
        
        # Test 2: Get Monthly Spending Report
        try:
            response = requests.get(f"{BASE_URL}/material-reports/spending?period=monthly", headers=self.headers)
            if response.status_code == 200:
                report = response.json()
                if "total_spending" in report:
                    self.log_test("Get Monthly Spending Report", True, f"Total spending: ₹{report['total_spending']}")
                else:
                    self.log_test("Get Monthly Spending Report", False, "Missing required fields in response")
            else:
                self.log_test("Get Monthly Spending Report", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Get Monthly Spending Report", False, f"Exception: {str(e)}")
        
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
        
        # Run all test groups
        test_groups = [
            self.test_vendor_management,
            self.test_material_management,
            self.test_vendor_material_rates,
            self.test_site_inventory,
            self.test_material_requirements,
            self.test_purchase_orders,
            self.test_material_transactions,
            self.test_material_reports
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