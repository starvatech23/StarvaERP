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

class BackendTester:
    def __init__(self):
        self.auth_token = None
        self.headers = HEADERS.copy()
        self.test_data = {}
        self.results = []
        
    def log_result(self, test_name: str, success: bool, message: str, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.results.append(result)
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def authenticate(self):
        """Authenticate and get token"""
        try:
            # Try phone-based authentication first
            phone = "+91-9876543210"
            
            # Step 1: Send OTP
            otp_request = {"phone": phone}
            response = requests.post(f"{BASE_URL}/auth/send-otp", json=otp_request, headers=self.headers)
            
            if response.status_code == 200:
                otp_data = response.json()
                otp = otp_data.get("otp", "123456")  # Use the returned OTP or default
                
                # Step 2: Verify OTP and register/login
                verify_data = {
                    "phone": phone,
                    "otp": otp,
                    "full_name": "Test Admin",
                    "role": "admin"
                }
                
                response = requests.post(f"{BASE_URL}/auth/verify-otp", json=verify_data, headers=self.headers)
                if response.status_code == 200:
                    data = response.json()
                    self.auth_token = data["access_token"]
                    self.headers["Authorization"] = f"Bearer {self.auth_token}"
                    self.log_result("Authentication", True, "Successfully authenticated via phone OTP")
                    return True
            
            # Fallback to email authentication
            register_data = {
                "full_name": "Test Admin",
                "email": "admin@test.com",
                "password": "testpass123",
                "role": "admin",
                "auth_type": "email"
            }
            
            response = requests.post(f"{BASE_URL}/auth/register", json=register_data, headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data["access_token"]
                self.headers["Authorization"] = f"Bearer {self.auth_token}"
                self.log_result("Authentication", True, "Successfully authenticated as admin")
                return True
            elif response.status_code == 400 and "already registered" in response.text:
                # Try login instead
                login_data = {
                    "identifier": "admin@test.com",
                    "password": "testpass123",
                    "auth_type": "email"
                }
                response = requests.post(f"{BASE_URL}/auth/login", json=login_data, headers=self.headers)
                if response.status_code == 200:
                    data = response.json()
                    self.auth_token = data["access_token"]
                    self.headers["Authorization"] = f"Bearer {self.auth_token}"
                    self.log_result("Authentication", True, "Successfully logged in as existing admin")
                    return True
            
            self.log_result("Authentication", False, f"Failed to authenticate: {response.status_code}", response.text)
            return False
            
        except Exception as e:
            self.log_result("Authentication", False, f"Authentication error: {str(e)}")
            return False
    
    def create_test_project(self):
        """Create a test project for inventory testing"""
        try:
            project_data = {
                "name": "Test Construction Site",
                "description": "Test project for materials testing",
                "location": "Test Location",
                "address": "123 Test Street, Test City",
                "client_name": "Test Client Ltd",
                "start_date": datetime.now().isoformat(),
                "end_date": (datetime.now() + timedelta(days=90)).isoformat(),
                "budget": 1000000,
                "status": "planning"
            }
            
            response = requests.post(f"{BASE_URL}/projects", json=project_data, headers=self.headers)
            if response.status_code == 200:
                project = response.json()
                self.test_data["project_id"] = project["id"]
                self.log_result("Test Project Creation", True, f"Created test project: {project['name']}")
                return True
            else:
                self.log_result("Test Project Creation", False, f"Failed to create project: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Test Project Creation", False, f"Project creation error: {str(e)}")
            return False

    # ============= GROUP 1: VENDOR MANAGEMENT TESTS =============
    
    def test_vendor_management(self):
        """Test all vendor CRUD operations"""
        print("\n=== GROUP 1: VENDOR MANAGEMENT TESTS ===")
        
        # Test 1: GET /api/vendors (empty list initially)
        try:
            response = requests.get(f"{BASE_URL}/vendors", headers=self.headers)
            if response.status_code == 200:
                vendors = response.json()
                self.log_result("GET /api/vendors", True, f"Retrieved {len(vendors)} vendors")
            else:
                self.log_result("GET /api/vendors", False, f"Failed: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET /api/vendors", False, f"Error: {str(e)}")
        
        # Test 2: POST /api/vendors - Create test vendors
        test_vendors = [
            {
                "business_name": "Shree Cement Ltd",
                "contact_person": "Rajesh Kumar",
                "phone": "+91-9876543210",
                "email": "rajesh@shreecement.com",
                "address": "Industrial Area, Rajasthan",
                "gst_number": "08AABCS1234C1Z5",
                "pan_number": "AABCS1234C",
                "bank_name": "HDFC Bank",
                "account_number": "12345678901234",
                "ifsc_code": "HDFC0001234",
                "payment_terms": "30 days",
                "is_active": True
            },
            {
                "business_name": "Modern Steel Works",
                "contact_person": "Amit Sharma",
                "phone": "+91-9876543211",
                "email": "amit@modernsteel.com",
                "address": "Steel Complex, Gujarat",
                "gst_number": "24AABCS5678D1Z5",
                "pan_number": "AABCS5678D",
                "bank_name": "SBI Bank",
                "account_number": "56789012345678",
                "ifsc_code": "SBIN0001234",
                "payment_terms": "45 days",
                "is_active": True
            }
        ]
        
        for i, vendor_data in enumerate(test_vendors):
            try:
                response = requests.post(f"{BASE_URL}/vendors", json=vendor_data, headers=self.headers)
                if response.status_code == 200:
                    vendor = response.json()
                    self.test_data[f"vendor_{i+1}_id"] = vendor["id"]
                    vendor_name = vendor.get("business_name", vendor.get("company_name", "Unknown Vendor"))
                    self.log_result(f"POST /api/vendors (Vendor {i+1})", True, f"Created vendor: {vendor_name}")
                else:
                    self.log_result(f"POST /api/vendors (Vendor {i+1})", False, f"Failed: {response.status_code}", response.text)
            except Exception as e:
                self.log_result(f"POST /api/vendors (Vendor {i+1})", False, f"Error: {str(e)}")
        
        # Test 3: GET /api/vendors/{id} - Get specific vendor
        if "vendor_1_id" in self.test_data:
            try:
                vendor_id = self.test_data["vendor_1_id"]
                response = requests.get(f"{BASE_URL}/vendors/{vendor_id}", headers=self.headers)
                if response.status_code == 200:
                    vendor = response.json()
                    vendor_name = vendor.get("business_name", vendor.get("company_name", "Unknown Vendor"))
                    self.log_result("GET /api/vendors/{id}", True, f"Retrieved vendor: {vendor_name}")
                else:
                    self.log_result("GET /api/vendors/{id}", False, f"Failed: {response.status_code}", response.text)
            except Exception as e:
                self.log_result("GET /api/vendors/{id}", False, f"Error: {str(e)}")
        
        # Test 4: PUT /api/vendors/{id} - Update vendor
        if "vendor_1_id" in self.test_data:
            try:
                vendor_id = self.test_data["vendor_1_id"]
                update_data = {
                    "phone": "+91-9876543299",
                    "payment_terms": "60 days"
                }
                response = requests.put(f"{BASE_URL}/vendors/{vendor_id}", json=update_data, headers=self.headers)
                if response.status_code == 200:
                    vendor = response.json()
                    self.log_result("PUT /api/vendors/{id}", True, f"Updated vendor phone: {vendor['phone']}")
                else:
                    self.log_result("PUT /api/vendors/{id}", False, f"Failed: {response.status_code}", response.text)
            except Exception as e:
                self.log_result("PUT /api/vendors/{id}", False, f"Error: {str(e)}")
        
        # Test 5: DELETE /api/vendors/{id} - Create and delete test vendor
        try:
            delete_vendor_data = {
                "business_name": "Test Delete Vendor",
                "contact_person": "Test Person",
                "phone": "+91-9999999999",
                "email": "delete@test.com",
                "address": "Test Address",
                "is_active": True
            }
            
            # Create vendor to delete
            response = requests.post(f"{BASE_URL}/vendors", json=delete_vendor_data, headers=self.headers)
            if response.status_code == 200:
                vendor = response.json()
                delete_vendor_id = vendor["id"]
                
                # Now delete it
                response = requests.delete(f"{BASE_URL}/vendors/{delete_vendor_id}", headers=self.headers)
                if response.status_code == 200:
                    self.log_result("DELETE /api/vendors/{id}", True, "Successfully deleted test vendor")
                else:
                    self.log_result("DELETE /api/vendors/{id}", False, f"Failed: {response.status_code}", response.text)
            else:
                self.log_result("DELETE /api/vendors/{id}", False, "Failed to create vendor for deletion test")
                
        except Exception as e:
            self.log_result("DELETE /api/vendors/{id}", False, f"Error: {str(e)}")

    # ============= GROUP 2: MATERIAL MANAGEMENT TESTS =============
    
    def test_material_management(self):
        """Test all material CRUD operations"""
        print("\n=== GROUP 2: MATERIAL MANAGEMENT TESTS ===")
        
        # Test 1: GET /api/materials (empty list initially)
        try:
            response = requests.get(f"{BASE_URL}/materials", headers=self.headers)
            if response.status_code == 200:
                materials = response.json()
                self.log_result("GET /api/materials", True, f"Retrieved {len(materials)} materials")
            else:
                self.log_result("GET /api/materials", False, f"Failed: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET /api/materials", False, f"Error: {str(e)}")
        
        # Test 2: POST /api/materials - Create test materials
        test_materials = [
            {
                "name": "Portland Cement",
                "category": "cement",
                "unit": "bags",
                "minimum_stock": 100,
                "hsn_code": "25232900",
                "description": "OPC 53 Grade Cement"
            },
            {
                "name": "TMT Steel Bars 12mm",
                "category": "steel",
                "unit": "kg",
                "minimum_stock": 500,
                "hsn_code": "72142000",
                "description": "Fe 500D TMT Bars"
            },
            {
                "name": "River Sand",
                "category": "sand",
                "unit": "cubic_feet",
                "minimum_stock": 1000,
                "hsn_code": "25051000",
                "description": "Fine aggregate for construction"
            }
        ]
        
        for i, material_data in enumerate(test_materials):
            try:
                response = requests.post(f"{BASE_URL}/materials", json=material_data, headers=self.headers)
                if response.status_code == 200:
                    material = response.json()
                    self.test_data[f"material_{i+1}_id"] = material["id"]
                    self.log_result(f"POST /api/materials (Material {i+1})", True, f"Created material: {material['name']}")
                else:
                    self.log_result(f"POST /api/materials (Material {i+1})", False, f"Failed: {response.status_code}", response.text)
            except Exception as e:
                self.log_result(f"POST /api/materials (Material {i+1})", False, f"Error: {str(e)}")
        
        # Test 3: GET /api/materials/{id} - Get specific material
        if "material_1_id" in self.test_data:
            try:
                material_id = self.test_data["material_1_id"]
                response = requests.get(f"{BASE_URL}/materials/{material_id}", headers=self.headers)
                if response.status_code == 200:
                    material = response.json()
                    self.log_result("GET /api/materials/{id}", True, f"Retrieved material: {material['name']}")
                else:
                    self.log_result("GET /api/materials/{id}", False, f"Failed: {response.status_code}", response.text)
            except Exception as e:
                self.log_result("GET /api/materials/{id}", False, f"Error: {str(e)}")
        
        # Test 4: PUT /api/materials/{id} - Update material
        if "material_1_id" in self.test_data:
            try:
                material_id = self.test_data["material_1_id"]
                update_data = {
                    "minimum_stock": 150,
                    "description": "Updated OPC 53 Grade Cement - Premium Quality"
                }
                response = requests.put(f"{BASE_URL}/materials/{material_id}", json=update_data, headers=self.headers)
                if response.status_code == 200:
                    material = response.json()
                    self.log_result("PUT /api/materials/{id}", True, f"Updated material minimum stock: {material['minimum_stock']}")
                else:
                    self.log_result("PUT /api/materials/{id}", False, f"Failed: {response.status_code}", response.text)
            except Exception as e:
                self.log_result("PUT /api/materials/{id}", False, f"Error: {str(e)}")
        
        # Test 5: DELETE /api/materials/{id} - Create and delete test material
        try:
            delete_material_data = {
                "name": "Test Delete Material",
                "category": "other",
                "unit": "pieces",
                "minimum_stock": 10,
                "description": "Material for deletion test"
            }
            
            # Create material to delete
            response = requests.post(f"{BASE_URL}/materials", json=delete_material_data, headers=self.headers)
            if response.status_code == 200:
                material = response.json()
                delete_material_id = material["id"]
                
                # Now delete it
                response = requests.delete(f"{BASE_URL}/materials/{delete_material_id}", headers=self.headers)
                if response.status_code == 200:
                    self.log_result("DELETE /api/materials/{id}", True, "Successfully deleted test material")
                else:
                    self.log_result("DELETE /api/materials/{id}", False, f"Failed: {response.status_code}", response.text)
            else:
                self.log_result("DELETE /api/materials/{id}", False, "Failed to create material for deletion test")
                
        except Exception as e:
            self.log_result("DELETE /api/materials/{id}", False, f"Error: {str(e)}")

    # ============= GROUP 3: SITE INVENTORY TESTS =============
    
    def test_site_inventory(self):
        """Test site inventory management"""
        print("\n=== GROUP 3: SITE INVENTORY TESTS ===")
        
        # Test 1: GET /api/site-inventory (empty list initially)
        try:
            response = requests.get(f"{BASE_URL}/site-inventory", headers=self.headers)
            if response.status_code == 200:
                inventory = response.json()
                self.log_result("GET /api/site-inventory", True, f"Retrieved {len(inventory)} inventory items")
            else:
                self.log_result("GET /api/site-inventory", False, f"Failed: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET /api/site-inventory", False, f"Error: {str(e)}")
        
        # Test 2: POST /api/site-inventory - Create inventory items
        if "project_id" in self.test_data and "material_1_id" in self.test_data:
            try:
                inventory_data = {
                    "project_id": self.test_data["project_id"],
                    "material_id": self.test_data["material_1_id"],
                    "current_stock": 250,
                    "location": "Warehouse A",
                    "last_updated": datetime.now().isoformat()
                }
                
                response = requests.post(f"{BASE_URL}/site-inventory", json=inventory_data, headers=self.headers)
                if response.status_code == 200:
                    inventory = response.json()
                    self.test_data["inventory_1_id"] = inventory["id"]
                    self.log_result("POST /api/site-inventory", True, f"Created inventory item with stock: {inventory['current_stock']}")
                else:
                    self.log_result("POST /api/site-inventory", False, f"Failed: {response.status_code}", response.text)
            except Exception as e:
                self.log_result("POST /api/site-inventory", False, f"Error: {str(e)}")
        
        # Test 3: PUT /api/site-inventory/{id} - Update inventory
        if "inventory_1_id" in self.test_data:
            try:
                inventory_id = self.test_data["inventory_1_id"]
                update_data = {
                    "current_stock": 300,
                    "location": "Warehouse B"
                }
                
                response = requests.put(f"{BASE_URL}/site-inventory/{inventory_id}", json=update_data, headers=self.headers)
                if response.status_code == 200:
                    inventory = response.json()
                    self.log_result("PUT /api/site-inventory/{id}", True, f"Updated inventory stock: {inventory['current_stock']}")
                else:
                    self.log_result("PUT /api/site-inventory/{id}", False, f"Failed: {response.status_code}", response.text)
            except Exception as e:
                self.log_result("PUT /api/site-inventory/{id}", False, f"Error: {str(e)}")

    # ============= GROUP 4: PURCHASE ORDERS & PAYMENT DUES TESTS =============
    
    def test_purchase_orders_and_payment_dues(self):
        """Test purchase orders and payment dues calculation"""
        print("\n=== GROUP 4: PURCHASE ORDERS & PAYMENT DUES TESTS ===")
        
        # Test 1: Create Purchase Orders for payment dues testing
        if "vendor_1_id" in self.test_data and "vendor_2_id" in self.test_data and "material_1_id" in self.test_data:
            
            # Create PO-2025-001 for Shree Cement (₹224,200)
            try:
                po_data_1 = {
                    "po_number": "PO-2025-001",
                    "vendor_id": self.test_data["vendor_1_id"],
                    "project_id": self.test_data["project_id"],
                    "order_date": datetime.now().isoformat(),
                    "expected_delivery": (datetime.now() + timedelta(days=7)).isoformat(),
                    "status": "ordered",
                    "items": [
                        {
                            "material_id": self.test_data["material_1_id"],
                            "quantity": 1000,
                            "unit_price": 220,
                            "total_price": 220000
                        }
                    ],
                    "subtotal": 220000,
                    "tax_amount": 4200,
                    "final_amount": 224200,
                    "notes": "Urgent delivery required"
                }
                
                response = requests.post(f"{BASE_URL}/purchase-orders", json=po_data_1, headers=self.headers)
                if response.status_code == 200:
                    po = response.json()
                    self.test_data["po_1_id"] = po["id"]
                    self.log_result("POST /api/purchase-orders (PO-2025-001)", True, f"Created PO: {po['po_number']} - ₹{po['final_amount']}")
                else:
                    self.log_result("POST /api/purchase-orders (PO-2025-001)", False, f"Failed: {response.status_code}", response.text)
            except Exception as e:
                self.log_result("POST /api/purchase-orders (PO-2025-001)", False, f"Error: {str(e)}")
            
            # Create PO-2025-002 for Modern Steel (₹337,200)
            if "material_2_id" in self.test_data:
                try:
                    po_data_2 = {
                        "po_number": "PO-2025-002",
                        "vendor_id": self.test_data["vendor_2_id"],
                        "project_id": self.test_data["project_id"],
                        "order_date": datetime.now().isoformat(),
                        "expected_delivery": (datetime.now() + timedelta(days=10)).isoformat(),
                        "status": "ordered",
                        "items": [
                            {
                                "material_id": self.test_data["material_2_id"],
                                "quantity": 5000,
                                "unit_price": 65,
                                "total_price": 325000
                            }
                        ],
                        "subtotal": 325000,
                        "tax_amount": 12200,
                        "final_amount": 337200,
                        "notes": "Quality steel required"
                    }
                    
                    response = requests.post(f"{BASE_URL}/purchase-orders", json=po_data_2, headers=self.headers)
                    if response.status_code == 200:
                        po = response.json()
                        self.test_data["po_2_id"] = po["id"]
                        self.log_result("POST /api/purchase-orders (PO-2025-002)", True, f"Created PO: {po['po_number']} - ₹{po['final_amount']}")
                    else:
                        self.log_result("POST /api/purchase-orders (PO-2025-002)", False, f"Failed: {response.status_code}", response.text)
                except Exception as e:
                    self.log_result("POST /api/purchase-orders (PO-2025-002)", False, f"Error: {str(e)}")
        
        # Test 2: GET /api/vendors/all/payment-dues - Check payment dues calculation
        try:
            response = requests.get(f"{BASE_URL}/vendors/all/payment-dues", headers=self.headers)
            if response.status_code == 200:
                dues = response.json()
                
                # Verify total dues calculation
                total_expected = 224200 + 337200  # ₹561,400
                
                # Check if we have dues for our test vendors
                shree_cement_dues = 0
                modern_steel_dues = 0
                
                for vendor_id, amount in dues.items():
                    if vendor_id == self.test_data.get("vendor_1_id"):
                        shree_cement_dues = amount
                    elif vendor_id == self.test_data.get("vendor_2_id"):
                        modern_steel_dues = amount
                
                if shree_cement_dues == 224200 and modern_steel_dues == 337200:
                    self.log_result("GET /api/vendors/all/payment-dues", True, f"Payment dues calculated correctly: Shree Cement ₹{shree_cement_dues}, Modern Steel ₹{modern_steel_dues}")
                else:
                    self.log_result("GET /api/vendors/all/payment-dues", False, f"Payment dues mismatch: Expected Shree Cement ₹224,200 got ₹{shree_cement_dues}, Expected Modern Steel ₹337,200 got ₹{modern_steel_dues}")
                    
            else:
                self.log_result("GET /api/vendors/all/payment-dues", False, f"Failed: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET /api/vendors/all/payment-dues", False, f"Error: {str(e)}")

    # ============= CRITICAL SCENARIO TESTS =============
    
    def test_critical_scenarios(self):
        """Test critical edit flows and scenarios"""
        print("\n=== CRITICAL SCENARIO TESTS ===")
        
        # Scenario 1: Edit Vendor Flow
        print("\n--- Scenario 1: Edit Vendor Flow ---")
        try:
            # Step 1: GET /api/vendors - Get list
            response = requests.get(f"{BASE_URL}/vendors", headers=self.headers)
            if response.status_code == 200:
                vendors = response.json()
                if vendors:
                    first_vendor_id = vendors[0]["id"]
                    
                    # Step 2: GET /api/vendors/{id} - Get details
                    response = requests.get(f"{BASE_URL}/vendors/{first_vendor_id}", headers=self.headers)
                    if response.status_code == 200:
                        vendor = response.json()
                        original_phone = vendor["phone"]
                        
                        # Step 3: PUT /api/vendors/{id} - Update phone number
                        new_phone = "+91-8888888888"
                        update_data = {"phone": new_phone}
                        response = requests.put(f"{BASE_URL}/vendors/{first_vendor_id}", json=update_data, headers=self.headers)
                        
                        if response.status_code == 200:
                            # Step 4: GET /api/vendors/{id} - Verify update
                            response = requests.get(f"{BASE_URL}/vendors/{first_vendor_id}", headers=self.headers)
                            if response.status_code == 200:
                                updated_vendor = response.json()
                                if updated_vendor["phone"] == new_phone:
                                    self.log_result("Scenario 1: Edit Vendor Flow", True, f"Successfully updated vendor phone from {original_phone} to {new_phone}")
                                else:
                                    self.log_result("Scenario 1: Edit Vendor Flow", False, f"Phone update failed: expected {new_phone}, got {updated_vendor['phone']}")
                            else:
                                self.log_result("Scenario 1: Edit Vendor Flow", False, "Failed to verify vendor update")
                        else:
                            self.log_result("Scenario 1: Edit Vendor Flow", False, f"Failed to update vendor: {response.status_code}")
                    else:
                        self.log_result("Scenario 1: Edit Vendor Flow", False, "Failed to get vendor details")
                else:
                    self.log_result("Scenario 1: Edit Vendor Flow", False, "No vendors found for testing")
            else:
                self.log_result("Scenario 1: Edit Vendor Flow", False, "Failed to get vendors list")
        except Exception as e:
            self.log_result("Scenario 1: Edit Vendor Flow", False, f"Error: {str(e)}")
        
        # Scenario 2: Edit Material Flow
        print("\n--- Scenario 2: Edit Material Flow ---")
        try:
            # Step 1: GET /api/materials - Get list
            response = requests.get(f"{BASE_URL}/materials", headers=self.headers)
            if response.status_code == 200:
                materials = response.json()
                if materials:
                    first_material_id = materials[0]["id"]
                    
                    # Step 2: GET /api/materials/{id} - Get details
                    response = requests.get(f"{BASE_URL}/materials/{first_material_id}", headers=self.headers)
                    if response.status_code == 200:
                        material = response.json()
                        original_stock = material["minimum_stock"]
                        
                        # Step 3: PUT /api/materials/{id} - Update minimum_stock
                        new_stock = 200
                        update_data = {"minimum_stock": new_stock}
                        response = requests.put(f"{BASE_URL}/materials/{first_material_id}", json=update_data, headers=self.headers)
                        
                        if response.status_code == 200:
                            # Step 4: GET /api/materials/{id} - Verify update
                            response = requests.get(f"{BASE_URL}/materials/{first_material_id}", headers=self.headers)
                            if response.status_code == 200:
                                updated_material = response.json()
                                if updated_material["minimum_stock"] == new_stock:
                                    self.log_result("Scenario 2: Edit Material Flow", True, f"Successfully updated material minimum stock from {original_stock} to {new_stock}")
                                else:
                                    self.log_result("Scenario 2: Edit Material Flow", False, f"Stock update failed: expected {new_stock}, got {updated_material['minimum_stock']}")
                            else:
                                self.log_result("Scenario 2: Edit Material Flow", False, "Failed to verify material update")
                        else:
                            self.log_result("Scenario 2: Edit Material Flow", False, f"Failed to update material: {response.status_code}")
                    else:
                        self.log_result("Scenario 2: Edit Material Flow", False, "Failed to get material details")
                else:
                    self.log_result("Scenario 2: Edit Material Flow", False, "No materials found for testing")
            else:
                self.log_result("Scenario 2: Edit Material Flow", False, "Failed to get materials list")
        except Exception as e:
            self.log_result("Scenario 2: Edit Material Flow", False, f"Error: {str(e)}")

    # ============= ERROR HANDLING TESTS =============
    
    def test_error_handling(self):
        """Test error handling with invalid data"""
        print("\n=== ERROR HANDLING TESTS ===")
        
        # Test invalid vendor ID (should return 404)
        try:
            response = requests.get(f"{BASE_URL}/vendors/invalid_id_123", headers=self.headers)
            if response.status_code == 404:
                self.log_result("Invalid Vendor ID Test", True, "Correctly returned 404 for invalid vendor ID")
            else:
                self.log_result("Invalid Vendor ID Test", False, f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_result("Invalid Vendor ID Test", False, f"Error: {str(e)}")
        
        # Test invalid material ID (should return 404)
        try:
            response = requests.get(f"{BASE_URL}/materials/invalid_id_123", headers=self.headers)
            if response.status_code == 404:
                self.log_result("Invalid Material ID Test", True, "Correctly returned 404 for invalid material ID")
            else:
                self.log_result("Invalid Material ID Test", False, f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_result("Invalid Material ID Test", False, f"Error: {str(e)}")
        
        # Test invalid data for vendor creation (should return 400)
        try:
            invalid_vendor_data = {
                "company_name": "",  # Empty name should fail
                "contact_person": "Test Person"
            }
            response = requests.post(f"{BASE_URL}/vendors", json=invalid_vendor_data, headers=self.headers)
            if response.status_code in [400, 422]:  # 400 or 422 for validation errors
                self.log_result("Invalid Vendor Data Test", True, f"Correctly returned {response.status_code} for invalid vendor data")
            else:
                self.log_result("Invalid Vendor Data Test", False, f"Expected 400/422, got {response.status_code}")
        except Exception as e:
            self.log_result("Invalid Vendor Data Test", False, f"Error: {str(e)}")

    def run_all_tests(self):
        """Run all test groups"""
        print("🚀 Starting Comprehensive Vendor & Materials Management Backend Testing")
        print("=" * 80)
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Create test project
        if not self.create_test_project():
            print("❌ Test project creation failed. Some tests may not work.")
        
        # Run all test groups
        self.test_vendor_management()
        self.test_material_management()
        self.test_site_inventory()
        self.test_purchase_orders_and_payment_dues()
        self.test_critical_scenarios()
        self.test_error_handling()
        
        # Print summary
        self.print_summary()
        
        return True
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 80)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for r in self.results if "✅ PASS" in r["status"])
        failed = sum(1 for r in self.results if "❌ FAIL" in r["status"])
        total = len(self.results)
        
        print(f"Total Tests: {total}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"Success Rate: {(passed/total*100):.1f}%")
        
        if failed > 0:
            print(f"\n❌ FAILED TESTS ({failed}):")
            for result in self.results:
                if "❌ FAIL" in result["status"]:
                    print(f"   • {result['test']}: {result['message']}")
                    if result["details"]:
                        print(f"     Details: {result['details']}")
        
        print(f"\n✅ PASSED TESTS ({passed}):")
        for result in self.results:
            if "✅ PASS" in result["status"]:
                print(f"   • {result['test']}: {result['message']}")

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 Testing completed successfully!")
    else:
        print("\n💥 Testing failed to complete!")
        sys.exit(1)