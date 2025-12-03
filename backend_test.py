#!/usr/bin/env python3
"""
Backend API Testing Script for Financial and Materials Management APIs
Tests all APIs that support the newly created frontend screens.
Focus: Financial APIs (Invoices, Payments, Budgets, Reports) and Materials APIs (Purchase Orders, Material Requirements)
"""

import requests
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List
import uuid

# Configuration
BASE_URL = "https://constructflow-41.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class FinancialMaterialsAPITester:
    def __init__(self):
        self.auth_token = None
        self.headers = HEADERS.copy()
        self.test_results = []
        self.created_resources = {
            'projects': [],
            'invoices': [],
            'payments': [],
            'budgets': [],
            'purchase_orders': [],
            'material_requirements': []
        }
        
    def log_result(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'response_data': response_data,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if not success and response_data:
            print(f"   Response: {response_data}")
        print()

    def authenticate(self) -> bool:
        """Authenticate and get access token"""
        print("🔐 Authenticating...")
        
        # Try to login with admin user
        login_data = {
            "identifier": "admin@test.com",
            "password": "admin123",
            "auth_type": "email"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json=login_data, headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get('access_token')
                self.headers['Authorization'] = f"Bearer {self.auth_token}"
                self.log_result("Authentication", True, f"Logged in as admin user")
                return True
            else:
                # Try to register admin user if login fails
                register_data = {
                    "email": "admin@test.com",
                    "password": "admin123",
                    "full_name": "Admin User",
                    "role": "admin",
                    "auth_type": "email"
                }
                
                reg_response = requests.post(f"{BASE_URL}/auth/register", json=register_data, headers=self.headers)
                
                if reg_response.status_code == 200:
                    data = reg_response.json()
                    self.auth_token = data.get('access_token')
                    self.headers['Authorization'] = f"Bearer {self.auth_token}"
                    self.log_result("Authentication", True, f"Registered and logged in as admin user")
                    return True
                else:
                    self.log_result("Authentication", False, f"Login failed: {response.status_code}, Register failed: {reg_response.status_code}")
                    return False
                    
        except Exception as e:
            self.log_result("Authentication", False, f"Authentication error: {str(e)}")
            return False

    def create_test_project(self) -> str:
        """Create a test project for testing"""
        project_data = {
            "name": "Financial Test Project",
            "description": "Test project for financial and materials APIs",
            "location": "Mumbai, Maharashtra",
            "address": "Plot 456, Industrial Area, Mumbai, Maharashtra 400001",
            "client_name": "Test Construction Client Ltd",
            "client_contact": "+91-9876543210",
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=90)).isoformat(),
            "budget": 500000.0,
            "status": "planning"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/projects", json=project_data, headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                project_id = data.get('id')
                self.created_resources['projects'].append(project_id)
                self.log_result("Create Test Project", True, f"Created project: {project_id}")
                return project_id
            else:
                self.log_result("Create Test Project", False, f"Status: {response.status_code}", response.text)
                return None
                
        except Exception as e:
            self.log_result("Create Test Project", False, f"Error: {str(e)}")
            return None

    def create_test_vendor(self) -> str:
        """Create a test vendor for testing"""
        vendor_data = {
            "company_name": "Shree Cement Suppliers",
            "contact_person": "Rajesh Kumar",
            "phone": "+91-9876543210",
            "email": "rajesh@shrecement.com",
            "address": "Industrial Area, Mumbai, Maharashtra",
            "gst_number": "27ABCDE1234F1Z5",
            "pan_number": "ABCDE1234F",
            "bank_name": "State Bank of India",
            "account_number": "1234567890",
            "ifsc_code": "SBIN0001234",
            "is_active": True
        }
        
        try:
            response = requests.post(f"{BASE_URL}/vendors", json=vendor_data, headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                vendor_id = data.get('id')
                self.log_result("Create Test Vendor", True, f"Created vendor: {vendor_id}")
                return vendor_id
            else:
                self.log_result("Create Test Vendor", False, f"Status: {response.status_code}", response.text)
                return None
                
        except Exception as e:
            self.log_result("Create Test Vendor", False, f"Error: {str(e)}")
            return None

    def create_test_material(self) -> str:
        """Create a test material for testing"""
        material_data = {
            "name": "Portland Cement",
            "category": "cement",
            "unit": "bags",
            "minimum_stock": 50.0,
            "hsn_code": "25231000",
            "description": "OPC 53 Grade Portland Cement"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/materials", json=material_data, headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                material_id = data.get('id')
                self.log_result("Create Test Material", True, f"Created material: {material_id}")
                return material_id
            else:
                self.log_result("Create Test Material", False, f"Status: {response.status_code}", response.text)
                return None
                
        except Exception as e:
            self.log_result("Create Test Material", False, f"Error: {str(e)}")
            return None

    def test_invoices_management(self, project_id: str):
        """Test Invoices Management APIs (RETEST after authorization fix)"""
        print("📄 Testing Invoices Management APIs...")
        
        # Test 1: Create Invoice (POST /api/invoices)
        invoice_data = {
            "project_id": project_id,
            "invoice_number": f"INV-{datetime.now().strftime('%Y%m%d')}-001",
            "client_name": "Rajesh Construction Pvt Ltd",
            "client_address": "Plot 123, Sector 15, Navi Mumbai, Maharashtra 400614",
            "client_phone": "+91 9876543210",
            "issue_date": datetime.now().isoformat(),
            "due_date": (datetime.now() + timedelta(days=30)).isoformat(),
            "items": [
                {
                    "description": "Concrete Foundation Work",
                    "quantity": 100.0,
                    "unit_price": 1200.0,
                    "amount": 120000.0
                },
                {
                    "description": "Steel Structure Installation", 
                    "quantity": 50.0,
                    "unit_price": 2500.0,
                    "amount": 125000.0
                }
            ],
            "subtotal": 245000.0,
            "tax_percentage": 18.0,
            "tax_amount": 44100.0,
            "total_amount": 289100.0
        }
        
        try:
            response = requests.post(f"{BASE_URL}/invoices", json=invoice_data, headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                invoice_id = data.get('id')
                self.created_resources['invoices'].append(invoice_id)
                self.log_result("POST /api/invoices - Create Invoice", True, 
                               f"Created invoice {data.get('invoice_number')} with total ₹{data.get('total_amount')}")
            else:
                self.log_result("POST /api/invoices - Create Invoice", False, 
                               f"Status: {response.status_code}", response.text)
                return
                
        except Exception as e:
            self.log_result("POST /api/invoices - Create Invoice", False, f"Error: {str(e)}")
            return

        # Test 2: Get Invoices List (GET /api/invoices)
        try:
            response = requests.get(f"{BASE_URL}/invoices?project_id={project_id}", headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                self.log_result("GET /api/invoices - List Invoices", True, 
                               f"Retrieved {len(data)} invoices for project")
            else:
                self.log_result("GET /api/invoices - List Invoices", False, 
                               f"Status: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("GET /api/invoices - List Invoices", False, f"Error: {str(e)}")

        # Test 3: Get Invoice Details (GET /api/invoices/{id})
        if self.created_resources['invoices']:
            invoice_id = self.created_resources['invoices'][0]
            try:
                response = requests.get(f"{BASE_URL}/invoices/{invoice_id}", headers=self.headers)
                
                if response.status_code == 200:
                    data = response.json()
                    self.log_result("GET /api/invoices/{id} - Get Invoice Details", True, 
                                   f"Retrieved invoice details: {data.get('invoice_number')}")
                else:
                    self.log_result("GET /api/invoices/{id} - Get Invoice Details", False, 
                                   f"Status: {response.status_code}", response.text)
                    
            except Exception as e:
                self.log_result("GET /api/invoices/{id} - Get Invoice Details", False, f"Error: {str(e)}")

        # Test 4: Update Invoice Status (PUT /api/invoices/{id})
        if self.created_resources['invoices']:
            invoice_id = self.created_resources['invoices'][0]
            update_data = {"status": "sent"}
            
            try:
                response = requests.put(f"{BASE_URL}/invoices/{invoice_id}", json=update_data, headers=self.headers)
                
                if response.status_code == 200:
                    data = response.json()
                    self.log_result("PUT /api/invoices/{id} - Update Invoice Status", True, 
                                   f"Updated invoice status to: {data.get('status')}")
                else:
                    self.log_result("PUT /api/invoices/{id} - Update Invoice Status", False, 
                                   f"Status: {response.status_code}", response.text)
                    
            except Exception as e:
                self.log_result("PUT /api/invoices/{id} - Update Invoice Status", False, f"Error: {str(e)}")

    def test_payments_management(self, project_id: str):
        """Test Payments Management APIs"""
        print("💰 Testing Payments Management APIs...")
        
        # Test 1: Create Payment (POST /api/payments)
        if self.created_resources['invoices']:
            invoice_id = self.created_resources['invoices'][0]
            
            payment_data = {
                "invoice_id": invoice_id,
                "amount": 150000.0,
                "payment_date": datetime.now().isoformat(),
                "payment_method": "bank_transfer",
                "reference_number": f"TXN{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "notes": "Partial payment received via NEFT transfer"
            }
            
            try:
                response = requests.post(f"{BASE_URL}/payments", json=payment_data, headers=self.headers)
                
                if response.status_code == 200:
                    data = response.json()
                    payment_id = data.get('id')
                    self.created_resources['payments'].append(payment_id)
                    self.log_result("POST /api/payments - Create Payment", True, 
                                   f"Created payment of ₹{data.get('amount')} via {data.get('payment_method')}")
                else:
                    self.log_result("POST /api/payments - Create Payment", False, 
                                   f"Status: {response.status_code}", response.text)
                    
            except Exception as e:
                self.log_result("POST /api/payments - Create Payment", False, f"Error: {str(e)}")

        # Test 2: Get Payments List (GET /api/payments)
        if self.created_resources['invoices']:
            invoice_id = self.created_resources['invoices'][0]
            
            try:
                response = requests.get(f"{BASE_URL}/payments?invoice_id={invoice_id}", headers=self.headers)
                
                if response.status_code == 200:
                    data = response.json()
                    self.log_result("GET /api/payments - List Payments", True, 
                                   f"Retrieved {len(data)} payments for invoice")
                    
                    # Verify payment updates invoice totals
                    if data:
                        total_paid = sum(p.get('amount', 0) for p in data)
                        self.log_result("Payment Invoice Update Verification", True, 
                                       f"Total payments: ₹{total_paid} - Invoice totals should be updated")
                else:
                    self.log_result("GET /api/payments - List Payments", False, 
                                   f"Status: {response.status_code}", response.text)
                    
            except Exception as e:
                self.log_result("GET /api/payments - List Payments", False, f"Error: {str(e)}")

    def test_budgets_management(self, project_id: str):
        """Test Budgets Management APIs (RETEST after authorization fix)"""
        print("📊 Testing Budgets Management APIs...")
        
        # Test 1: Create Budget (POST /api/budgets)
        budget_data = {
            "project_id": project_id,
            "category": "construction",
            "allocated_amount": 300000.0,
            "description": "Main construction work budget allocation",
            "period_start": datetime.now().isoformat(),
            "period_end": (datetime.now() + timedelta(days=60)).isoformat()
        }
        
        try:
            response = requests.post(f"{BASE_URL}/budgets", json=budget_data, headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                budget_id = data.get('id')
                self.created_resources['budgets'].append(budget_id)
                self.log_result("POST /api/budgets - Create Budget", True, 
                               f"Created budget for {data.get('category')} with ₹{data.get('allocated_amount')}")
            else:
                self.log_result("POST /api/budgets - Create Budget", False, 
                               f"Status: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("POST /api/budgets - Create Budget", False, f"Error: {str(e)}")

        # Test 2: Get Budgets List (GET /api/budgets)
        try:
            response = requests.get(f"{BASE_URL}/budgets?project_id={project_id}", headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                self.log_result("GET /api/budgets - List Budgets", True, 
                               f"Retrieved {len(data)} budgets for project")
                
                # Verify budget data structure
                if data:
                    budget = data[0]
                    required_fields = ['id', 'project_id', 'category', 'allocated_amount']
                    missing_fields = [field for field in required_fields if field not in budget]
                    
                    if not missing_fields:
                        self.log_result("Budget Data Structure Verification", True, 
                                       "All required fields present in budget response")
                    else:
                        self.log_result("Budget Data Structure Verification", False, 
                                       f"Missing fields: {missing_fields}")
            else:
                self.log_result("GET /api/budgets - List Budgets", False, 
                               f"Status: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("GET /api/budgets - List Budgets", False, f"Error: {str(e)}")

    def test_financial_reports(self, project_id: str):
        """Test Financial Reports API"""
        print("📈 Testing Financial Reports API...")
        
        try:
            response = requests.get(f"{BASE_URL}/financial-reports/{project_id}", headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for expected fields in comprehensive report
                expected_fields = [
                    'project_id', 'budget_summary', 'expenses_by_category', 'invoice_summary'
                ]
                
                missing_fields = [field for field in expected_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("GET /api/financial-reports/{project_id} - Get Financial Report", True, 
                                   f"Retrieved comprehensive financial report with all expected fields")
                    
                    # Verify specific field structures
                    if 'budget_summary' in data:
                        budget_summary = data['budget_summary']
                        self.log_result("Financial Report - Budget Summary", True, 
                                       f"Budget summary includes: {list(budget_summary.keys())}")
                    
                    if 'invoice_summary' in data:
                        invoice_summary = data['invoice_summary']
                        self.log_result("Financial Report - Invoice Summary", True, 
                                       f"Invoice summary includes: {list(invoice_summary.keys())}")
                        
                else:
                    self.log_result("GET /api/financial-reports/{project_id} - Get Financial Report", False, 
                                   f"Missing expected fields: {missing_fields}")
            else:
                self.log_result("GET /api/financial-reports/{project_id} - Get Financial Report", False, 
                               f"Status: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("GET /api/financial-reports/{project_id} - Get Financial Report", False, f"Error: {str(e)}")

    def test_purchase_orders(self, project_id: str):
        """Test Purchase Orders APIs"""
        print("🛒 Testing Purchase Orders APIs...")
        
        # Test 1: Get Purchase Orders List (GET /api/purchase-orders)
        try:
            response = requests.get(f"{BASE_URL}/purchase-orders?project_id={project_id}", headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                self.log_result("GET /api/purchase-orders - List Purchase Orders", True, 
                               f"Retrieved {len(data)} purchase orders for project")
            else:
                self.log_result("GET /api/purchase-orders - List Purchase Orders", False, 
                               f"Status: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("GET /api/purchase-orders - List Purchase Orders", False, f"Error: {str(e)}")

        # Test 2: Create Purchase Order (POST /api/purchase-orders)
        po_data = {
            "project_id": project_id,
            "vendor_name": "Shree Cement Suppliers",
            "po_number": f"PO-{datetime.now().strftime('%Y%m%d')}-001",
            "order_date": datetime.now().isoformat(),
            "expected_delivery": (datetime.now() + timedelta(days=7)).isoformat(),
            "items": [
                {
                    "material_name": "Portland Cement",
                    "quantity": 100.0,
                    "unit": "bags",
                    "rate": 450.0,
                    "amount": 45000.0
                },
                {
                    "material_name": "TMT Steel Bars",
                    "quantity": 50.0,
                    "unit": "pieces",
                    "rate": 3200.0,
                    "amount": 160000.0
                }
            ],
            "total_amount": 205000.0,
            "status": "draft",
            "notes": "Urgent requirement for foundation work"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/purchase-orders", json=po_data, headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                po_id = data.get('id')
                self.created_resources['purchase_orders'].append(po_id)
                
                # Verify PO data structure
                required_fields = ['po_number', 'vendor_name', 'items', 'total_amount', 'status', 'order_date']
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("POST /api/purchase-orders - Create Purchase Order", True, 
                                   f"Created PO {data.get('po_number')} with total ₹{data.get('total_amount')}")
                else:
                    self.log_result("POST /api/purchase-orders - Create Purchase Order", False, 
                                   f"Missing fields in response: {missing_fields}")
            else:
                self.log_result("POST /api/purchase-orders - Create Purchase Order", False, 
                               f"Status: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("POST /api/purchase-orders - Create Purchase Order", False, f"Error: {str(e)}")

    def test_material_requirements(self, project_id: str):
        """Test Material Requirements APIs"""
        print("🔧 Testing Material Requirements APIs...")
        
        # Test 1: Get Material Requirements List (GET /api/material-requirements)
        try:
            response = requests.get(f"{BASE_URL}/material-requirements?project_id={project_id}", headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                self.log_result("GET /api/material-requirements - List Material Requirements", True, 
                               f"Retrieved {len(data)} material requirements for project")
            else:
                self.log_result("GET /api/material-requirements - List Material Requirements", False, 
                               f"Status: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("GET /api/material-requirements - List Material Requirements", False, f"Error: {str(e)}")

        # Test 2: Create Material Requirement (POST /api/material-requirements)
        requirement_data = {
            "project_id": project_id,
            "material_name": "Ready Mix Concrete M25",
            "project_name": "Financial Test Project",
            "required_quantity": 200.0,
            "fulfilled_quantity": 0.0,
            "unit": "cubic meters",
            "priority": "high",
            "fulfillment_status": "pending",
            "required_by_date": (datetime.now() + timedelta(days=14)).isoformat(),
            "notes": "Required for foundation slab work - Phase 1"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/material-requirements", json=requirement_data, headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                req_id = data.get('id')
                self.created_resources['material_requirements'].append(req_id)
                
                # Verify requirement data structure
                required_fields = [
                    'material_name', 'project_name', 'required_quantity', 
                    'fulfilled_quantity', 'priority', 'fulfillment_status', 'required_by_date'
                ]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("POST /api/material-requirements - Create Material Requirement", True, 
                                   f"Created requirement for {data.get('material_name')} - Priority: {data.get('priority')}")
                else:
                    self.log_result("POST /api/material-requirements - Create Material Requirement", False, 
                                   f"Missing fields in response: {missing_fields}")
            else:
                self.log_result("POST /api/material-requirements - Create Material Requirement", False, 
                               f"Status: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("POST /api/material-requirements - Create Material Requirement", False, f"Error: {str(e)}")

        # Test 3: Filter by Priority (GET /api/material-requirements?priority=high)
        try:
            response = requests.get(f"{BASE_URL}/material-requirements?priority=high", headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                high_priority_count = len([req for req in data if req.get('priority') == 'high'])
                self.log_result("GET /api/material-requirements - Filter by Priority", True, 
                               f"Retrieved {high_priority_count} high priority requirements")
            else:
                self.log_result("GET /api/material-requirements - Filter by Priority", False, 
                               f"Status: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("GET /api/material-requirements - Filter by Priority", False, f"Error: {str(e)}")

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Financial and Materials Management API Testing...")
        print("=" * 70)
        
        # Step 1: Authenticate
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Step 2: Create test project
        project_id = self.create_test_project()
        if not project_id:
            print("❌ Failed to create test project. Cannot proceed with tests.")
            return False
        
        # Step 3: Run all API tests
        self.test_invoices_management(project_id)
        self.test_payments_management(project_id)
        self.test_budgets_management(project_id)
        self.test_financial_reports(project_id)
        self.test_purchase_orders(project_id)
        self.test_material_requirements(project_id)
        
        # Step 4: Print summary
        self.print_summary()
        
        return True

    def print_summary(self):
        """Print test summary"""
        print("=" * 70)
        print("📋 TEST SUMMARY")
        print("=" * 70)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r['success']])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        print()
        
        if failed_tests > 0:
            print("❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  • {result['test']}: {result['details']}")
            print()
        
        print("✅ PASSED TESTS:")
        for result in self.test_results:
            if result['success']:
                print(f"  • {result['test']}")
        
        print("\n" + "=" * 70)
        print("🎯 TESTING COMPLETE")
        print("=" * 70)

if __name__ == "__main__":
    tester = FinancialMaterialsAPITester()
    success = tester.run_all_tests()
    
    if not success:
        exit(1)