#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Construction Management App
Testing Phase 1: Project Management APIs and Phase 2: Financial APIs
"""

import requests
import json
import base64
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import uuid

class ConstructionAPITester:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.api_url = f"{self.base_url}/api"
        self.headers = {"Content-Type": "application/json"}
        self.auth_token = None
        self.test_data = {}
        
    def authenticate(self) -> bool:
        """Authenticate and get access token"""
        try:
            # Register a test admin user
            register_data = {
                "full_name": "Test Admin User",
                "email": "testadmin@construction.com",
                "password": "TestPass123!",
                "role": "admin",
                "auth_type": "email"
            }
            
            response = requests.post(f"{self.api_url}/auth/register", json=register_data)
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data["access_token"]
                self.headers["Authorization"] = f"Bearer {self.auth_token}"
                print("✅ Authentication successful")
                return True
            else:
                # Try login if user already exists
                login_data = {
                    "identifier": "testadmin@construction.com",
                    "password": "TestPass123!",
                    "auth_type": "email"
                }
                response = requests.post(f"{self.api_url}/auth/login", json=login_data)
                if response.status_code == 200:
                    data = response.json()
                    self.auth_token = data["access_token"]
                    self.headers["Authorization"] = f"Bearer {self.auth_token}"
                    user_role = data.get("user", {}).get("role", "unknown")
                    print(f"✅ Authentication successful (existing user) - Role: {user_role}")
                    return True
                else:
                    print(f"❌ Authentication failed: {response.text}")
                    return False
        except Exception as e:
            print(f"❌ Authentication error: {str(e)}")
            return False

    def create_test_project(self) -> Optional[str]:
        """Create a test project for testing"""
        try:
            project_data = {
                "name": "Test Construction Project",
                "description": "Test project for API testing",
                "location": "Test City, Test State",
                "address": "123 Test Street, Test City, Test State",
                "client_name": "Test Construction Client",
                "client_contact": "+91-9876543210",
                "start_date": "2024-01-01T00:00:00",
                "end_date": "2024-12-31T23:59:59",
                "budget": 1000000.0,
                "status": "planning"
            }
            
            response = requests.post(f"{self.api_url}/projects", json=project_data, headers=self.headers)
            if response.status_code == 200:
                project = response.json()
                project_id = project["id"]
                self.test_data["project_id"] = project_id
                print(f"✅ Test project created: {project_id}")
                return project_id
            else:
                print(f"❌ Failed to create test project: {response.text}")
                return None
        except Exception as e:
            print(f"❌ Error creating test project: {str(e)}")
            return None

    # ============= PHASE 1: PROJECT MANAGEMENT APIs =============
    
    def test_milestones_apis(self) -> Dict[str, bool]:
        """Test Milestones CRUD APIs"""
        results = {}
        project_id = self.test_data.get("project_id")
        
        if not project_id:
            print("❌ No project ID available for milestone testing")
            return {"milestones_create": False, "milestones_get": False, "milestones_update": False, "milestones_delete": False}
        
        try:
            # 1. POST /api/milestones - Create milestone
            milestone_data = {
                "project_id": project_id,
                "name": "Foundation Complete",
                "description": "Complete foundation work including excavation and concrete pouring",
                "due_date": "2024-03-15T00:00:00",
                "status": "pending",
                "order": 1
            }
            
            response = requests.post(f"{self.api_url}/milestones", json=milestone_data, headers=self.headers)
            if response.status_code == 200:
                milestone = response.json()
                milestone_id = milestone["id"]
                self.test_data["milestone_id"] = milestone_id
                results["milestones_create"] = True
                print(f"✅ Milestone created: {milestone_id}")
            else:
                results["milestones_create"] = False
                print(f"❌ Failed to create milestone: {response.text}")
                
            # 2. GET /api/milestones?project_id=X - Get milestones by project
            response = requests.get(f"{self.api_url}/milestones?project_id={project_id}", headers=self.headers)
            if response.status_code == 200:
                milestones = response.json()
                results["milestones_get"] = len(milestones) > 0
                print(f"✅ Retrieved {len(milestones)} milestones for project")
            else:
                results["milestones_get"] = False
                print(f"❌ Failed to get milestones: {response.text}")
                
            # 3. GET /api/milestones/{id} - Get single milestone
            if milestone_id := self.test_data.get("milestone_id"):
                response = requests.get(f"{self.api_url}/milestones/{milestone_id}", headers=self.headers)
                if response.status_code == 200:
                    milestone = response.json()
                    results["milestones_get_single"] = True
                    print(f"✅ Retrieved single milestone: {milestone['title']}")
                else:
                    results["milestones_get_single"] = False
                    print(f"❌ Failed to get single milestone: {response.text}")
                    
                # 4. PUT /api/milestones/{id} - Update milestone
                update_data = {
                    "title": "Foundation Complete - Updated",
                    "status": "in_progress"
                }
                response = requests.put(f"{self.api_url}/milestones/{milestone_id}", json=update_data, headers=self.headers)
                if response.status_code == 200:
                    results["milestones_update"] = True
                    print("✅ Milestone updated successfully")
                else:
                    results["milestones_update"] = False
                    print(f"❌ Failed to update milestone: {response.text}")
                    
                # 5. DELETE /api/milestones/{id} - Delete milestone
                response = requests.delete(f"{self.api_url}/milestones/{milestone_id}", headers=self.headers)
                if response.status_code == 200:
                    results["milestones_delete"] = True
                    print("✅ Milestone deleted successfully")
                else:
                    results["milestones_delete"] = False
                    print(f"❌ Failed to delete milestone: {response.text}")
            
        except Exception as e:
            print(f"❌ Error in milestone testing: {str(e)}")
            results = {k: False for k in ["milestones_create", "milestones_get", "milestones_get_single", "milestones_update", "milestones_delete"]}
            
        return results

    def test_documents_apis(self) -> Dict[str, bool]:
        """Test Documents CRUD APIs"""
        results = {}
        project_id = self.test_data.get("project_id")
        
        if not project_id:
            print("❌ No project ID available for document testing")
            return {"documents_create": False, "documents_get": False, "documents_update": False, "documents_delete": False}
        
        try:
            # Create sample base64 document data
            sample_content = "This is a test document content for construction project"
            base64_content = base64.b64encode(sample_content.encode()).decode()
            
            # 1. POST /api/documents - Upload document with base64 data
            document_data = {
                "project_id": project_id,
                "name": "Test Contract Document",
                "document_type": "contract",
                "file_data": base64_content,
                "file_name": "test_contract.pdf",
                "description": "Test contract document for API testing",
                "uploaded_by": "placeholder"  # Will be overridden by server
            }
            
            response = requests.post(f"{self.api_url}/documents", json=document_data, headers=self.headers)
            if response.status_code == 200:
                document = response.json()
                document_id = document["id"]
                self.test_data["document_id"] = document_id
                results["documents_create"] = True
                print(f"✅ Document created: {document_id}")
            else:
                results["documents_create"] = False
                print(f"❌ Failed to create document: {response.text}")
                
            # 2. GET /api/documents?project_id=X - Get documents by project
            response = requests.get(f"{self.api_url}/documents?project_id={project_id}", headers=self.headers)
            if response.status_code == 200:
                documents = response.json()
                results["documents_get"] = len(documents) > 0
                print(f"✅ Retrieved {len(documents)} documents for project")
            else:
                results["documents_get"] = False
                print(f"❌ Failed to get documents: {response.text}")
                
            # 3. GET /api/documents?document_type=contract - Filter by type
            response = requests.get(f"{self.api_url}/documents?document_type=contract", headers=self.headers)
            if response.status_code == 200:
                documents = response.json()
                results["documents_filter"] = len(documents) > 0
                print(f"✅ Retrieved {len(documents)} contract documents")
            else:
                results["documents_filter"] = False
                print(f"❌ Failed to filter documents: {response.text}")
                
            # 4. GET /api/documents/{id} - Get single document
            if document_id := self.test_data.get("document_id"):
                response = requests.get(f"{self.api_url}/documents/{document_id}", headers=self.headers)
                if response.status_code == 200:
                    document = response.json()
                    results["documents_get_single"] = True
                    print(f"✅ Retrieved single document: {document['name']}")
                else:
                    results["documents_get_single"] = False
                    print(f"❌ Failed to get single document: {response.text}")
                    
                # 5. PUT /api/documents/{id} - Update document metadata
                update_data = {
                    "name": "Updated Contract Document",
                    "description": "Updated description for contract document"
                }
                response = requests.put(f"{self.api_url}/documents/{document_id}", json=update_data, headers=self.headers)
                if response.status_code == 200:
                    results["documents_update"] = True
                    print("✅ Document updated successfully")
                else:
                    results["documents_update"] = False
                    print(f"❌ Failed to update document: {response.text}")
                    
                # 6. DELETE /api/documents/{id} - Delete document
                response = requests.delete(f"{self.api_url}/documents/{document_id}", headers=self.headers)
                if response.status_code == 200:
                    results["documents_delete"] = True
                    print("✅ Document deleted successfully")
                else:
                    results["documents_delete"] = False
                    print(f"❌ Failed to delete document: {response.text}")
            
        except Exception as e:
            print(f"❌ Error in document testing: {str(e)}")
            results = {k: False for k in ["documents_create", "documents_get", "documents_filter", "documents_get_single", "documents_update", "documents_delete"]}
            
        return results

    def test_gantt_chart_api(self) -> Dict[str, bool]:
        """Test Gantt Chart API"""
        results = {}
        project_id = self.test_data.get("project_id")
        
        if not project_id:
            print("❌ No project ID available for Gantt chart testing")
            return {"gantt_chart": False}
        
        try:
            # GET /api/projects/{project_id}/gantt - Get timeline data
            response = requests.get(f"{self.api_url}/projects/{project_id}/gantt", headers=self.headers)
            if response.status_code == 200:
                gantt_data = response.json()
                has_tasks = "tasks" in gantt_data
                has_milestones = "milestones" in gantt_data
                results["gantt_chart"] = has_tasks and has_milestones
                print(f"✅ Gantt chart data retrieved with {len(gantt_data.get('tasks', []))} tasks and {len(gantt_data.get('milestones', []))} milestones")
            else:
                results["gantt_chart"] = False
                print(f"❌ Failed to get Gantt chart data: {response.text}")
                
        except Exception as e:
            print(f"❌ Error in Gantt chart testing: {str(e)}")
            results["gantt_chart"] = False
            
        return results

    # ============= PHASE 2: FINANCIAL APIs =============
    
    def test_budgets_apis(self) -> Dict[str, bool]:
        """Test Budgets CRUD APIs"""
        results = {}
        project_id = self.test_data.get("project_id")
        
        if not project_id:
            print("❌ No project ID available for budget testing")
            return {"budgets_create": False, "budgets_get": False, "budgets_update": False, "budgets_delete": False}
        
        try:
            # 1. POST /api/budgets - Create budget
            budget_data = {
                "project_id": project_id,
                "category": "materials",
                "allocated_amount": 250000.0,
                "description": "Budget for construction materials"
            }
            
            response = requests.post(f"{self.api_url}/budgets", json=budget_data, headers=self.headers)
            if response.status_code == 200:
                budget = response.json()
                budget_id = budget["id"]
                self.test_data["budget_id"] = budget_id
                results["budgets_create"] = True
                print(f"✅ Budget created: {budget_id} - ₹{budget['allocated_amount']}")
            else:
                results["budgets_create"] = False
                print(f"❌ Failed to create budget: {response.text}")
                
            # 2. GET /api/budgets?project_id=X - Get budgets (should auto-calculate spent_amount)
            response = requests.get(f"{self.api_url}/budgets?project_id={project_id}", headers=self.headers)
            if response.status_code == 200:
                budgets = response.json()
                results["budgets_get"] = len(budgets) > 0
                if budgets:
                    budget = budgets[0]
                    has_spent_amount = "spent_amount" in budget
                    print(f"✅ Retrieved {len(budgets)} budgets with spent_amount calculation: {has_spent_amount}")
                else:
                    print("✅ Retrieved budgets (empty list)")
            else:
                results["budgets_get"] = False
                print(f"❌ Failed to get budgets: {response.text}")
                
            # 3. PUT /api/budgets/{id} - Update budget
            if budget_id := self.test_data.get("budget_id"):
                update_data = {
                    "allocated_amount": 300000.0,
                    "description": "Updated budget for construction materials"
                }
                response = requests.put(f"{self.api_url}/budgets/{budget_id}", json=update_data, headers=self.headers)
                if response.status_code == 200:
                    results["budgets_update"] = True
                    print("✅ Budget updated successfully")
                else:
                    results["budgets_update"] = False
                    print(f"❌ Failed to update budget: {response.text}")
                    
                # 4. DELETE /api/budgets/{id} - Delete budget
                response = requests.delete(f"{self.api_url}/budgets/{budget_id}", headers=self.headers)
                if response.status_code == 200:
                    results["budgets_delete"] = True
                    print("✅ Budget deleted successfully")
                else:
                    results["budgets_delete"] = False
                    print(f"❌ Failed to delete budget: {response.text}")
            
        except Exception as e:
            print(f"❌ Error in budget testing: {str(e)}")
            results = {k: False for k in ["budgets_create", "budgets_get", "budgets_update", "budgets_delete"]}
            
        return results

    def test_expenses_apis(self) -> Dict[str, bool]:
        """Test Expenses CRUD APIs"""
        results = {}
        project_id = self.test_data.get("project_id")
        
        if not project_id:
            print("❌ No project ID available for expense testing")
            return {"expenses_create": False, "expenses_get": False, "expenses_filter": False, "expenses_delete": False}
        
        try:
            # Create sample receipt data
            receipt_content = "Receipt for construction materials purchase"
            receipt_base64 = base64.b64encode(receipt_content.encode()).decode()
            
            # 1. POST /api/expenses - Create expense with receipt
            expense_data = {
                "project_id": project_id,
                "category": "materials",
                "amount": 15000.0,
                "description": "Cement and steel purchase",
                "receipt_image": receipt_base64,
                "vendor_name": "ABC Construction Supplies",
                "expense_date": datetime.now().isoformat()
            }
            
            response = requests.post(f"{self.api_url}/expenses", json=expense_data, headers=self.headers)
            if response.status_code == 200:
                expense = response.json()
                expense_id = expense["id"]
                self.test_data["expense_id"] = expense_id
                results["expenses_create"] = True
                print(f"✅ Expense created: {expense_id} - ₹{expense['amount']}")
            else:
                results["expenses_create"] = False
                print(f"❌ Failed to create expense: {response.text}")
                
            # 2. GET /api/expenses?project_id=X - Get expenses
            response = requests.get(f"{self.api_url}/expenses?project_id={project_id}", headers=self.headers)
            if response.status_code == 200:
                expenses = response.json()
                results["expenses_get"] = len(expenses) > 0
                print(f"✅ Retrieved {len(expenses)} expenses for project")
            else:
                results["expenses_get"] = False
                print(f"❌ Failed to get expenses: {response.text}")
                
            # 3. GET /api/expenses?category=materials&start_date=X&end_date=Y - Filter expenses
            start_date = (datetime.now() - timedelta(days=1)).isoformat()
            end_date = (datetime.now() + timedelta(days=1)).isoformat()
            response = requests.get(f"{self.api_url}/expenses?category=materials&start_date={start_date}&end_date={end_date}", headers=self.headers)
            if response.status_code == 200:
                expenses = response.json()
                results["expenses_filter"] = True
                print(f"✅ Filtered expenses retrieved: {len(expenses)} materials expenses")
            else:
                results["expenses_filter"] = False
                print(f"❌ Failed to filter expenses: {response.text}")
                
            # 4. DELETE /api/expenses/{id} - Delete expense
            if expense_id := self.test_data.get("expense_id"):
                response = requests.delete(f"{self.api_url}/expenses/{expense_id}", headers=self.headers)
                if response.status_code == 200:
                    results["expenses_delete"] = True
                    print("✅ Expense deleted successfully")
                else:
                    results["expenses_delete"] = False
                    print(f"❌ Failed to delete expense: {response.text}")
            
        except Exception as e:
            print(f"❌ Error in expense testing: {str(e)}")
            results = {k: False for k in ["expenses_create", "expenses_get", "expenses_filter", "expenses_delete"]}
            
        return results

    def test_invoices_apis(self) -> Dict[str, bool]:
        """Test Invoices CRUD APIs"""
        results = {}
        project_id = self.test_data.get("project_id")
        
        if not project_id:
            print("❌ No project ID available for invoice testing")
            return {"invoices_create": False, "invoices_get": False, "invoices_get_single": False, "invoices_update": False}
        
        try:
            # 1. POST /api/invoices - Create invoice with line items
            invoice_data = {
                "project_id": project_id,
                "invoice_number": f"INV-{datetime.now().strftime('%Y%m%d')}-001",
                "client_name": "ABC Construction Client",
                "client_email": "client@abcconstruction.com",
                "issue_date": datetime.now().isoformat(),
                "due_date": (datetime.now() + timedelta(days=30)).isoformat(),
                "items": [
                    {
                        "description": "Foundation work",
                        "quantity": 1,
                        "unit_price": 50000.0,
                        "amount": 50000.0
                    },
                    {
                        "description": "Material supply",
                        "quantity": 2,
                        "unit_price": 25000.0,
                        "amount": 50000.0
                    }
                ],
                "subtotal": 100000.0,
                "tax_rate": 18.0,
                "tax_amount": 18000.0,
                "total_amount": 118000.0,
                "status": "draft"
            }
            
            response = requests.post(f"{self.api_url}/invoices", json=invoice_data, headers=self.headers)
            if response.status_code == 200:
                invoice = response.json()
                invoice_id = invoice["id"]
                self.test_data["invoice_id"] = invoice_id
                results["invoices_create"] = True
                print(f"✅ Invoice created: {invoice['invoice_number']} - ₹{invoice['total_amount']}")
            else:
                results["invoices_create"] = False
                print(f"❌ Failed to create invoice: {response.text}")
                
            # 2. GET /api/invoices?project_id=X - Get invoices
            response = requests.get(f"{self.api_url}/invoices?project_id={project_id}", headers=self.headers)
            if response.status_code == 200:
                invoices = response.json()
                results["invoices_get"] = len(invoices) > 0
                print(f"✅ Retrieved {len(invoices)} invoices for project")
            else:
                results["invoices_get"] = False
                print(f"❌ Failed to get invoices: {response.text}")
                
            # 3. GET /api/invoices/{id} - Get invoice with payment history
            if invoice_id := self.test_data.get("invoice_id"):
                response = requests.get(f"{self.api_url}/invoices/{invoice_id}", headers=self.headers)
                if response.status_code == 200:
                    invoice = response.json()
                    has_payment_history = "payment_history" in invoice
                    results["invoices_get_single"] = True
                    print(f"✅ Retrieved single invoice with payment history: {has_payment_history}")
                else:
                    results["invoices_get_single"] = False
                    print(f"❌ Failed to get single invoice: {response.text}")
                    
                # 4. PUT /api/invoices/{id} - Update invoice
                update_data = {
                    "status": "sent",
                    "total_amount": 120000.0
                }
                response = requests.put(f"{self.api_url}/invoices/{invoice_id}", json=update_data, headers=self.headers)
                if response.status_code == 200:
                    results["invoices_update"] = True
                    print("✅ Invoice updated successfully")
                else:
                    results["invoices_update"] = False
                    print(f"❌ Failed to update invoice: {response.text}")
            
        except Exception as e:
            print(f"❌ Error in invoice testing: {str(e)}")
            results = {k: False for k in ["invoices_create", "invoices_get", "invoices_get_single", "invoices_update"]}
            
        return results

    def test_payments_apis(self) -> Dict[str, bool]:
        """Test Payments CRUD APIs"""
        results = {}
        invoice_id = self.test_data.get("invoice_id")
        
        if not invoice_id:
            print("❌ No invoice ID available for payment testing")
            return {"payments_create": False, "payments_get": False}
        
        try:
            # 1. POST /api/payments - Record payment
            payment_data = {
                "invoice_id": invoice_id,
                "amount": 60000.0,
                "payment_method": "bank_transfer",
                "payment_date": datetime.now().isoformat(),
                "reference_number": f"PAY-{datetime.now().strftime('%Y%m%d')}-001",
                "notes": "Partial payment for invoice"
            }
            
            response = requests.post(f"{self.api_url}/payments", json=payment_data, headers=self.headers)
            if response.status_code == 200:
                payment = response.json()
                payment_id = payment["id"]
                self.test_data["payment_id"] = payment_id
                results["payments_create"] = True
                print(f"✅ Payment recorded: {payment['reference_number']} - ₹{payment['amount']}")
            else:
                results["payments_create"] = False
                print(f"❌ Failed to record payment: {response.text}")
                
            # 2. GET /api/payments?invoice_id=X - Get payments for invoice
            response = requests.get(f"{self.api_url}/payments?invoice_id={invoice_id}", headers=self.headers)
            if response.status_code == 200:
                payments = response.json()
                results["payments_get"] = len(payments) > 0
                print(f"✅ Retrieved {len(payments)} payments for invoice")
            else:
                results["payments_get"] = False
                print(f"❌ Failed to get payments: {response.text}")
            
        except Exception as e:
            print(f"❌ Error in payment testing: {str(e)}")
            results = {k: False for k in ["payments_create", "payments_get"]}
            
        return results

    def test_financial_reports_api(self) -> Dict[str, bool]:
        """Test Financial Reports API"""
        results = {}
        project_id = self.test_data.get("project_id")
        
        if not project_id:
            print("❌ No project ID available for financial reports testing")
            return {"financial_reports": False}
        
        try:
            # GET /api/financial-reports/{project_id} - Get comprehensive report
            response = requests.get(f"{self.api_url}/financial-reports/{project_id}", headers=self.headers)
            if response.status_code == 200:
                report = response.json()
                required_fields = ["budget_summary", "expense_summary", "invoice_summary", "payment_summary"]
                has_all_fields = all(field in report for field in required_fields)
                results["financial_reports"] = has_all_fields
                print(f"✅ Financial report retrieved with all required sections: {has_all_fields}")
                print(f"   Report sections: {list(report.keys())}")
            else:
                results["financial_reports"] = False
                print(f"❌ Failed to get financial report: {response.text}")
                
        except Exception as e:
            print(f"❌ Error in financial reports testing: {str(e)}")
            results["financial_reports"] = False
            
        return results

    def run_all_tests(self) -> Dict[str, Any]:
        """Run all API tests and return comprehensive results"""
        print("🚀 Starting Comprehensive Backend API Testing...")
        print("=" * 60)
        
        # Authenticate first
        if not self.authenticate():
            return {"error": "Authentication failed"}
        
        # Create test project
        if not self.create_test_project():
            return {"error": "Failed to create test project"}
        
        all_results = {}
        
        print("\n📋 PHASE 1: PROJECT MANAGEMENT APIs")
        print("-" * 40)
        
        # Test Milestones APIs
        print("\n🎯 Testing Milestones APIs...")
        all_results.update(self.test_milestones_apis())
        
        # Test Documents APIs
        print("\n📄 Testing Documents APIs...")
        all_results.update(self.test_documents_apis())
        
        # Test Gantt Chart API
        print("\n📊 Testing Gantt Chart API...")
        all_results.update(self.test_gantt_chart_api())
        
        print("\n💰 PHASE 2: FINANCIAL APIs")
        print("-" * 40)
        
        # Test Budgets APIs
        print("\n💵 Testing Budgets APIs...")
        all_results.update(self.test_budgets_apis())
        
        # Test Expenses APIs
        print("\n🧾 Testing Expenses APIs...")
        all_results.update(self.test_expenses_apis())
        
        # Test Invoices APIs
        print("\n📋 Testing Invoices APIs...")
        all_results.update(self.test_invoices_apis())
        
        # Test Payments APIs
        print("\n💳 Testing Payments APIs...")
        all_results.update(self.test_payments_apis())
        
        # Test Financial Reports API
        print("\n📊 Testing Financial Reports API...")
        all_results.update(self.test_financial_reports_api())
        
        return all_results

    def print_summary(self, results: Dict[str, Any]):
        """Print test results summary"""
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        
        if "error" in results:
            print(f"❌ CRITICAL ERROR: {results['error']}")
            return
        
        # Group results by category
        categories = {
            "Milestones APIs": [k for k in results.keys() if k.startswith("milestones_")],
            "Documents APIs": [k for k in results.keys() if k.startswith("documents_")],
            "Gantt Chart API": [k for k in results.keys() if k.startswith("gantt_")],
            "Budgets APIs": [k for k in results.keys() if k.startswith("budgets_")],
            "Expenses APIs": [k for k in results.keys() if k.startswith("expenses_")],
            "Invoices APIs": [k for k in results.keys() if k.startswith("invoices_")],
            "Payments APIs": [k for k in results.keys() if k.startswith("payments_")],
            "Financial Reports": [k for k in results.keys() if k.startswith("financial_")]
        }
        
        total_tests = 0
        passed_tests = 0
        
        for category, test_keys in categories.items():
            if test_keys:
                category_passed = sum(1 for key in test_keys if results.get(key, False))
                category_total = len(test_keys)
                total_tests += category_total
                passed_tests += category_passed
                
                status = "✅" if category_passed == category_total else "❌" if category_passed == 0 else "⚠️"
                print(f"{status} {category}: {category_passed}/{category_total} tests passed")
                
                for key in test_keys:
                    test_status = "✅" if results.get(key, False) else "❌"
                    test_name = key.replace("_", " ").title()
                    print(f"   {test_status} {test_name}")
        
        print("-" * 60)
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        print(f"🎯 OVERALL SUCCESS RATE: {passed_tests}/{total_tests} ({success_rate:.1f}%)")
        
        if success_rate >= 90:
            print("🎉 EXCELLENT! All major APIs are working correctly.")
        elif success_rate >= 70:
            print("👍 GOOD! Most APIs are working with minor issues.")
        elif success_rate >= 50:
            print("⚠️  MODERATE! Several APIs need attention.")
        else:
            print("🚨 CRITICAL! Major API issues detected.")


def main():
    """Main function to run the tests"""
    # Use the backend URL from environment
    backend_url = "https://siteflow-11.preview.emergentagent.com"
    
    tester = ConstructionAPITester(backend_url)
    results = tester.run_all_tests()
    tester.print_summary(results)
    
    return results


if __name__ == "__main__":
    main()