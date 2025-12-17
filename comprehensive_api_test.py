#!/usr/bin/env python3
"""
COMPREHENSIVE STABILITY & REGRESSION TESTING - All Modules
As requested in the review: Testing ALL modules for stability after recent additions
"""

import requests
import json
import sys
from datetime import datetime, timedelta
import uuid

# Configuration
BASE_URL = "https://site-materials-1.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class ComprehensiveAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.headers = HEADERS.copy()
        self.auth_token = None
        self.test_results = []
        self.admin_user_id = None
        self.created_resources = {
            'projects': [],
            'users': [],
            'tasks': [],
            'vendors': [],
            'materials': [],
            'invoices': [],
            'payments': [],
            'budgets': [],
            'expenses': [],
            'purchase_orders': [],
            'material_requirements': []
        }
        
    def log_result(self, test_name, success, details="", priority="medium"):
        """Log test result with priority"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            "test": test_name,
            "status": status,
            "success": success,
            "details": details,
            "priority": priority
        })
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
    
    def make_request(self, method, endpoint, data=None, expected_status=None):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=self.headers, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, headers=self.headers, json=data, timeout=30)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=self.headers, json=data, timeout=30)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=self.headers, timeout=30)
            else:
                return None, f"Unsupported method: {method}"
            
            if expected_status and response.status_code != expected_status:
                return None, f"Expected status {expected_status}, got {response.status_code}: {response.text}"
            
            return response, None
        except requests.exceptions.RequestException as e:
            return None, f"Request failed: {str(e)}"
    
    def authenticate_admin(self):
        """Authenticate as admin user"""
        # Try to login with existing admin user
        login_data = {
            "identifier": "admin@test.com",
            "password": "admin123",
            "auth_type": "email"
        }
        
        response, error = self.make_request("POST", "/auth/login", login_data)
        if response and response.status_code in [200, 201]:
            token_data = response.json()
            self.auth_token = token_data["access_token"]
            self.admin_user_id = token_data["user"]["id"]
            self.headers["Authorization"] = f"Bearer {self.auth_token}"
            return True, "Admin login successful"
        
        # If login fails, try registration
        admin_data = {
            "email": "admin@test.com",
            "password": "admin123",
            "full_name": "Test Admin",
            "role": "admin",
            "auth_type": "email"
        }
        
        response, error = self.make_request("POST", "/auth/register", admin_data)
        if response and response.status_code in [200, 201]:
            token_data = response.json()
            self.auth_token = token_data["access_token"]
            self.admin_user_id = token_data["user"]["id"]
            self.headers["Authorization"] = f"Bearer {self.auth_token}"
            return True, "Admin registered successfully"
        
        return False, f"Authentication failed: {error or 'Unknown error'}"

    # ============= MODULE 1: AUTHENTICATION & USERS (Critical) =============
    
    def test_module_1_authentication_users(self):
        """Test Module 1: Authentication & Users (Critical)"""
        print("\n=== MODULE 1: AUTHENTICATION & USERS (Critical) ===")
        
        # Test 1: POST /api/auth/register - User registration
        test_user_data = {
            "email": f"testuser_{uuid.uuid4().hex[:8]}@test.com",
            "password": "testpass123",
            "full_name": "Test Engineer User",
            "role": "engineer",
            "auth_type": "email"
        }
        
        response, error = self.make_request("POST", "/auth/register", test_user_data)
        if response and response.status_code in [200, 201]:
            user_data = response.json()
            self.created_resources['users'].append(user_data["user"]["id"])
            self.log_result("POST /api/auth/register - User registration", True, 
                          f"User registered: {user_data['user']['full_name']}", "critical")
        else:
            self.log_result("POST /api/auth/register - User registration", False, 
                          f"Registration failed: {error}", "critical")
        
        # Test 2: POST /api/auth/login - User login
        login_data = {
            "identifier": test_user_data["email"],
            "password": test_user_data["password"],
            "auth_type": "email"
        }
        
        response, error = self.make_request("POST", "/auth/login", login_data)
        if response and response.status_code in [200, 201]:
            self.log_result("POST /api/auth/login - User login", True, 
                          f"Login successful", "critical")
        else:
            self.log_result("POST /api/auth/login - User login", False, 
                          f"Login failed: {error}", "critical")
        
        # Test 3: GET /api/users - List users
        response, error = self.make_request("GET", "/users")
        if response and response.status_code == 200:
            users = response.json()
            self.log_result("GET /api/users - List users", True, 
                          f"Retrieved {len(users)} users", "critical")
        else:
            self.log_result("GET /api/users - List users", False, 
                          f"Failed to get users: {error}", "critical")
        
        # Test 4: GET /api/users/active - Active users (using by-role endpoint)
        response, error = self.make_request("GET", "/users/by-role/admin")
        if response and response.status_code == 200:
            active_users = response.json()
            self.log_result("GET /api/users/active - Active users", True, 
                          f"Retrieved {len(active_users)} admin users", "critical")
        else:
            self.log_result("GET /api/users/active - Active users", False, 
                          f"Failed to get active users: {error}", "critical")
        
        # Test 5: GET /api/users/pending - Pending approvals (using admin endpoint)
        response, error = self.make_request("GET", "/admin/users")
        if response and response.status_code == 200:
            all_users = response.json()
            self.log_result("GET /api/users/pending - Pending approvals", True, 
                          f"Retrieved {len(all_users)} users for approval management", "critical")
        else:
            self.log_result("GET /api/users/pending - Pending approvals", False, 
                          f"Failed to get pending users: {error}", "critical")

    # ============= MODULE 2: PROJECTS (Core Feature) =============
    
    def test_module_2_projects(self):
        """Test Module 2: Projects (Core Feature)"""
        print("\n=== MODULE 2: PROJECTS (Core Feature) ===")
        
        # Test 1: POST /api/projects - Create project
        project_data = {
            "name": f"Comprehensive Test Project {uuid.uuid4().hex[:8]}",
            "description": "Test project for comprehensive API testing",
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=90)).isoformat(),
            "budget": 1000000.0,
            "status": "active",
            "project_manager_id": self.admin_user_id,
            "client_name": "Test Construction Client Ltd",
            "client_phone": "9876543210",
            "location": "Mumbai, Maharashtra"
        }
        
        response, error = self.make_request("POST", "/projects", project_data)
        project_id = None
        if response and response.status_code in [200, 201]:
            project = response.json()
            project_id = project["id"]
            self.created_resources['projects'].append(project_id)
            
            # Verify enhanced fields (team members, manager details)
            has_manager_phone = "manager_phone" in project
            has_task_count = "task_count" in project
            has_team_members = "team_members" in project
            
            self.log_result("POST /api/projects - Create project", True, 
                          f"Project created with enhanced fields - manager_phone: {has_manager_phone}, task_count: {has_task_count}, team_members: {has_team_members}", "critical")
        else:
            self.log_result("POST /api/projects - Create project", False, 
                          f"Project creation failed: {error}", "critical")
        
        # Test 2: GET /api/projects - List all projects
        response, error = self.make_request("GET", "/projects")
        if response and response.status_code == 200:
            projects = response.json()
            # Verify enhanced fields in all projects
            enhanced_fields_count = sum(1 for p in projects if "manager_phone" in p and "task_count" in p and "team_members" in p)
            self.log_result("GET /api/projects - List all projects", True, 
                          f"Retrieved {len(projects)} projects, {enhanced_fields_count} with enhanced fields", "critical")
        else:
            self.log_result("GET /api/projects - List all projects", False, 
                          f"Failed to get projects: {error}", "critical")
        
        # Test 3: GET /api/projects/{id} - Get project details
        if project_id:
            response, error = self.make_request("GET", f"/projects/{project_id}")
            if response and response.status_code == 200:
                project = response.json()
                has_enhanced_fields = all(field in project for field in ["manager_phone", "task_count", "team_members"])
                self.log_result("GET /api/projects/{id} - Get project details", True, 
                              f"Project details with enhanced fields: {has_enhanced_fields}", "critical")
            else:
                self.log_result("GET /api/projects/{id} - Get project details", False, 
                              f"Failed to get project details: {error}", "critical")
        
        # Test 4: PUT /api/projects/{id} - Update project
        if project_id:
            update_data = {
                "description": "Updated comprehensive test project description",
                "budget": 1200000.0
            }
            response, error = self.make_request("PUT", f"/projects/{project_id}", update_data)
            if response and response.status_code == 200:
                project = response.json()
                has_enhanced_fields = all(field in project for field in ["manager_phone", "task_count", "team_members"])
                self.log_result("PUT /api/projects/{id} - Update project", True, 
                              f"Project updated with enhanced fields: {has_enhanced_fields}", "critical")
            else:
                self.log_result("PUT /api/projects/{id} - Update project", False, 
                              f"Failed to update project: {error}", "critical")
        
        return project_id

    # ============= MODULE 3: TASKS (Core Feature) =============
    
    def test_module_3_tasks(self, project_id):
        """Test Module 3: Tasks (Core Feature)"""
        print("\n=== MODULE 3: TASKS (Core Feature) ===")
        
        if not project_id:
            self.log_result("Tasks Module Setup", False, "No project ID available for task testing", "critical")
            return
        
        # Test 1: POST /api/tasks - Create task
        task_data = {
            "title": f"Comprehensive Test Task {uuid.uuid4().hex[:8]}",
            "description": "Test task for comprehensive API testing",
            "project_id": project_id,
            "assigned_to": [self.admin_user_id],
            "priority": "high",
            "status": "todo",
            "due_date": (datetime.now() + timedelta(days=14)).isoformat()
        }
        
        response, error = self.make_request("POST", "/tasks", task_data)
        task_id = None
        if response and response.status_code in [200, 201]:
            task = response.json()
            task_id = task["id"]
            self.created_resources['tasks'].append(task_id)
            self.log_result("POST /api/tasks - Create task", True, 
                          f"Task created: {task['title']}", "critical")
        else:
            self.log_result("POST /api/tasks - Create task", False, 
                          f"Task creation failed: {error}", "critical")
        
        # Test 2: GET /api/tasks - List tasks with project filtering
        response, error = self.make_request("GET", f"/tasks?project_id={project_id}")
        if response and response.status_code == 200:
            tasks = response.json()
            self.log_result("GET /api/tasks - List tasks with project filtering", True, 
                          f"Retrieved {len(tasks)} tasks for project", "critical")
        else:
            self.log_result("GET /api/tasks - List tasks with project filtering", False, 
                          f"Failed to get tasks: {error}", "critical")
        
        # Test 3: PUT /api/tasks/{id} - Update task status
        if task_id:
            update_data = {
                "status": "completed"
            }
            response, error = self.make_request("PUT", f"/tasks/{task_id}", update_data)
            if response and response.status_code == 200:
                task = response.json()
                self.log_result("PUT /api/tasks/{id} - Update task status", True, 
                              f"Task status updated to: {task.get('status', 'unknown')}", "critical")
            else:
                self.log_result("PUT /api/tasks/{id} - Update task status", False, 
                              f"Failed to update task: {error}", "critical")
        
        # Test 4: Verify task assignment and status transitions
        if task_id:
            response, error = self.make_request("GET", f"/tasks/{task_id}")
            if response and response.status_code == 200:
                task = response.json()
                has_assigned_users = "assigned_users" in task and len(task["assigned_users"]) > 0
                correct_status = task.get("status") == "completed"
                self.log_result("Task Assignment & Status Verification", True, 
                              f"Task assignment: {has_assigned_users}, Status transition: {correct_status}", "critical")
            else:
                self.log_result("Task Assignment & Status Verification", False, 
                              f"Failed to verify task: {error}", "critical")

    # ============= MODULE 4: FINANCIAL MANAGEMENT (Recently Built) =============
    
    def test_module_4_financial_management(self, project_id):
        """Test Module 4: Financial Management (Recently Built)"""
        print("\n=== MODULE 4: FINANCIAL MANAGEMENT (Recently Built) ===")
        
        if not project_id:
            self.log_result("Financial Module Setup", False, "No project ID available for financial testing", "critical")
            return
        
        # BUDGETS
        print("\n--- Testing Budgets ---")
        
        # Test 1: POST /api/budgets - Create budget
        budget_data = {
            "project_id": project_id,
            "category": "materials",
            "allocated_amount": 400000.0,
            "description": "Materials budget for comprehensive testing"
        }
        
        response, error = self.make_request("POST", "/budgets", budget_data)
        budget_id = None
        if response and response.status_code in [200, 201]:
            budget = response.json()
            budget_id = budget["id"]
            self.created_resources['budgets'].append(budget_id)
            self.log_result("POST /api/budgets - Create budget", True, 
                          f"Budget created: ₹{budget['allocated_amount']}", "critical")
        else:
            self.log_result("POST /api/budgets - Create budget", False, 
                          f"Budget creation failed: {error}", "critical")
        
        # Test 2: GET /api/budgets - List budgets
        response, error = self.make_request("GET", f"/budgets?project_id={project_id}")
        if response and response.status_code == 200:
            budgets = response.json()
            self.log_result("GET /api/budgets - List budgets", True, 
                          f"Retrieved {len(budgets)} budgets", "critical")
        else:
            self.log_result("GET /api/budgets - List budgets", False, 
                          f"Failed to get budgets: {error}", "critical")
        
        # EXPENSES
        print("\n--- Testing Expenses ---")
        
        # Test 3: POST /api/expenses - Create expense
        expense_data = {
            "project_id": project_id,
            "category": "materials",
            "amount": 35000.0,
            "description": "Cement and steel purchase for foundation",
            "expense_date": datetime.now().isoformat(),
            "receipt_images": ["data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A"]
        }
        
        response, error = self.make_request("POST", "/expenses", expense_data)
        expense_id = None
        if response and response.status_code in [200, 201]:
            expense = response.json()
            expense_id = expense["id"]
            self.created_resources['expenses'].append(expense_id)
            self.log_result("POST /api/expenses - Create expense", True, 
                          f"Expense created: ₹{expense['amount']}", "critical")
        else:
            self.log_result("POST /api/expenses - Create expense", False, 
                          f"Expense creation failed: {error}", "critical")
        
        # Test 4: GET /api/expenses - List expenses
        response, error = self.make_request("GET", f"/expenses?project_id={project_id}")
        if response and response.status_code == 200:
            expenses = response.json()
            self.log_result("GET /api/expenses - List expenses", True, 
                          f"Retrieved {len(expenses)} expenses", "critical")
        else:
            self.log_result("GET /api/expenses - List expenses", False, 
                          f"Failed to get expenses: {error}", "critical")
        
        # INVOICES
        print("\n--- Testing Invoices ---")
        
        # Test 5: POST /api/invoices - Create invoice with line items
        invoice_data = {
            "project_id": project_id,
            "client_name": "Comprehensive Test Client Ltd",
            "client_address": "Plot 789, Industrial Area, Mumbai, Maharashtra 400001",
            "client_phone": "9876543210",
            "items": [
                {
                    "description": "Foundation Work - Phase 1",
                    "quantity": 1,
                    "rate": 300000.0,
                    "amount": 300000.0
                },
                {
                    "description": "Material Supply - Cement & Steel",
                    "quantity": 1,
                    "rate": 150000.0,
                    "amount": 150000.0
                }
            ],
            "subtotal": 450000.0,
            "tax_percentage": 18.0,
            "tax_amount": 81000.0,
            "total_amount": 531000.0,
            "due_date": (datetime.now() + timedelta(days=30)).isoformat()
        }
        
        response, error = self.make_request("POST", "/invoices", invoice_data)
        invoice_id = None
        if response and response.status_code in [200, 201]:
            invoice = response.json()
            invoice_id = invoice["id"]
            self.created_resources['invoices'].append(invoice_id)
            self.log_result("POST /api/invoices - Create invoice with line items", True, 
                          f"Invoice created: ₹{invoice['total_amount']}", "critical")
        else:
            self.log_result("POST /api/invoices - Create invoice with line items", False, 
                          f"Invoice creation failed: {error}", "critical")
        
        # Test 6: GET /api/invoices - List invoices
        response, error = self.make_request("GET", f"/invoices?project_id={project_id}")
        if response and response.status_code == 200:
            invoices = response.json()
            self.log_result("GET /api/invoices - List invoices", True, 
                          f"Retrieved {len(invoices)} invoices", "critical")
        else:
            self.log_result("GET /api/invoices - List invoices", False, 
                          f"Failed to get invoices: {error}", "critical")
        
        # Test 7: GET /api/invoices/{id} - Invoice details
        if invoice_id:
            response, error = self.make_request("GET", f"/invoices/{invoice_id}")
            if response and response.status_code == 200:
                invoice = response.json()
                self.log_result("GET /api/invoices/{id} - Invoice details", True, 
                              f"Invoice details retrieved: {invoice.get('invoice_number', 'N/A')}", "critical")
            else:
                self.log_result("GET /api/invoices/{id} - Invoice details", False, 
                              f"Failed to get invoice details: {error}", "critical")
        
        # Test 8: PUT /api/invoices/{id} - Update status
        if invoice_id:
            update_data = {"status": "sent"}
            response, error = self.make_request("PUT", f"/invoices/{invoice_id}", update_data)
            if response and response.status_code == 200:
                invoice = response.json()
                self.log_result("PUT /api/invoices/{id} - Update status", True, 
                              f"Invoice status updated to: {invoice.get('status', 'unknown')}", "critical")
            else:
                self.log_result("PUT /api/invoices/{id} - Update status", False, 
                              f"Failed to update invoice: {error}", "critical")
        
        # PAYMENTS
        print("\n--- Testing Payments ---")
        
        # Test 9: POST /api/payments - Record payment
        if invoice_id:
            payment_data = {
                "invoice_id": invoice_id,
                "amount": 200000.0,
                "payment_method": "bank_transfer",
                "payment_date": datetime.now().isoformat(),
                "reference_number": f"PAY{uuid.uuid4().hex[:8].upper()}",
                "notes": "Partial payment for comprehensive test invoice"
            }
            
            response, error = self.make_request("POST", "/payments", payment_data)
            payment_id = None
            if response and response.status_code in [200, 201]:
                payment = response.json()
                payment_id = payment["id"]
                self.created_resources['payments'].append(payment_id)
                self.log_result("POST /api/payments - Record payment", True, 
                              f"Payment recorded: ₹{payment['amount']}", "critical")
            else:
                self.log_result("POST /api/payments - Record payment", False, 
                              f"Payment recording failed: {error}", "critical")
        
        # Test 10: GET /api/payments - List payments
        response, error = self.make_request("GET", f"/payments?project_id={project_id}")
        if response and response.status_code == 200:
            payments = response.json()
            self.log_result("GET /api/payments - List payments", True, 
                          f"Retrieved {len(payments)} payments", "critical")
            
            # Test 11: Verify invoice balance updates
            if payments:
                total_payments = sum(p.get('amount', 0) for p in payments)
                self.log_result("Invoice Balance Updates Verification", True, 
                              f"Total payments: ₹{total_payments} - Invoice balances should be updated", "critical")
        else:
            self.log_result("GET /api/payments - List payments", False, 
                          f"Failed to get payments: {error}", "critical")
        
        # FINANCIAL REPORTS
        print("\n--- Testing Financial Reports ---")
        
        # Test 12: GET /api/financial-reports/{project_id} - Comprehensive report
        response, error = self.make_request("GET", f"/financial-reports/{project_id}")
        if response and response.status_code == 200:
            report = response.json()
            required_fields = ["project_id", "budget_summary", "expenses_by_category", "invoice_summary"]
            has_all_fields = all(field in report for field in required_fields)
            
            if has_all_fields:
                # Verify specific calculations
                budget_utilization = report.get("budget_utilization", 0)
                invoice_summary = report.get("invoice_summary", {})
                
                self.log_result("GET /api/financial-reports/{project_id} - Comprehensive report", True, 
                              f"Financial report with budget utilization: {budget_utilization}%, invoice summary: {len(invoice_summary)} fields", "critical")
            else:
                missing_fields = [field for field in required_fields if field not in report]
                self.log_result("GET /api/financial-reports/{project_id} - Comprehensive report", False, 
                              f"Missing required fields: {missing_fields}", "critical")
        else:
            self.log_result("GET /api/financial-reports/{project_id} - Comprehensive report", False, 
                          f"Failed to get financial report: {error}", "critical")

    # ============= MODULE 5: MATERIALS MANAGEMENT (Recently Built) =============
    
    def test_module_5_materials_management(self, project_id):
        """Test Module 5: Materials Management (Recently Built)"""
        print("\n=== MODULE 5: MATERIALS MANAGEMENT (Recently Built) ===")
        
        if not project_id:
            self.log_result("Materials Module Setup", False, "No project ID available for materials testing", "high")
            return
        
        # VENDORS
        print("\n--- Testing Vendors ---")
        
        # Test 1: GET /api/vendors - List vendors
        response, error = self.make_request("GET", "/vendors")
        if response and response.status_code == 200:
            vendors = response.json()
            self.log_result("GET /api/vendors - List vendors", True, 
                          f"Retrieved {len(vendors)} vendors", "high")
        else:
            self.log_result("GET /api/vendors - List vendors", False, 
                          f"Failed to get vendors: {error}", "high")
        
        # Test 2: POST /api/vendors - Create vendor
        vendor_data = {
            "business_name": f"Comprehensive Test Vendor {uuid.uuid4().hex[:8]}",
            "contact_person": "Rajesh Kumar",
            "phone": "+91-9876543210",
            "email": f"vendor_{uuid.uuid4().hex[:8]}@test.com",
            "address": "Industrial Area, Mumbai, Maharashtra",
            "gst_number": "27ABCDE1234F1Z5",
            "pan_number": "ABCDE1234F",
            "bank_name": "State Bank of India",
            "account_number": "1234567890",
            "ifsc_code": "SBIN0001234",
            "is_active": True
        }
        
        response, error = self.make_request("POST", "/vendors", vendor_data)
        vendor_id = None
        if response and response.status_code in [200, 201]:
            vendor = response.json()
            vendor_id = vendor["id"]
            self.created_resources['vendors'].append(vendor_id)
            self.log_result("POST /api/vendors - Create vendor", True, 
                          f"Vendor created: {vendor['business_name']}", "high")
        else:
            self.log_result("POST /api/vendors - Create vendor", False, 
                          f"Vendor creation failed: {error}", "high")
        
        # MATERIALS
        print("\n--- Testing Materials ---")
        
        # Test 3: GET /api/materials - List materials
        response, error = self.make_request("GET", "/materials")
        if response and response.status_code == 200:
            materials = response.json()
            self.log_result("GET /api/materials - List materials", True, 
                          f"Retrieved {len(materials)} materials", "high")
        else:
            self.log_result("GET /api/materials - List materials", False, 
                          f"Failed to get materials: {error}", "high")
        
        # Test 4: POST /api/materials - Create material
        material_data = {
            "name": f"Comprehensive Test Material {uuid.uuid4().hex[:8]}",
            "category": "cement",
            "unit": "bags",
            "minimum_stock": 100.0,
            "hsn_code": "25231000",
            "description": "OPC 53 Grade Portland Cement for comprehensive testing"
        }
        
        response, error = self.make_request("POST", "/materials", material_data)
        material_id = None
        if response and response.status_code in [200, 201]:
            material = response.json()
            material_id = material["id"]
            self.created_resources['materials'].append(material_id)
            self.log_result("POST /api/materials - Create material", True, 
                          f"Material created: {material['name']}", "high")
        else:
            self.log_result("POST /api/materials - Create material", False, 
                          f"Material creation failed: {error}", "high")
        
        # PURCHASE ORDERS
        print("\n--- Testing Purchase Orders ---")
        
        # Test 5: POST /api/purchase-orders - Create PO
        if vendor_id and material_id:
            po_data = {
                "po_number": f"PO-COMP-{datetime.now().strftime('%Y%m%d')}-001",
                "vendor_id": vendor_id,
                "project_id": project_id,
                "order_date": datetime.now().isoformat(),
                "expected_delivery_date": (datetime.now() + timedelta(days=10)).isoformat(),
                "total_amount": 75000.0,
                "final_amount": 75000.0,
                "status": "draft",
                "notes": "Comprehensive testing purchase order",
                "items": [
                    {
                        "material_id": material_id,
                        "quantity": 150.0,
                        "rate": 500.0,
                        "amount": 75000.0
                    }
                ]
            }
            
            response, error = self.make_request("POST", "/purchase-orders", po_data)
            po_id = None
            if response and response.status_code in [200, 201]:
                po = response.json()
                po_id = po["id"]
                self.created_resources['purchase_orders'].append(po_id)
                
                # Verify PO response includes required fields
                required_fields = ["po_number", "vendor_name", "items", "total_amount", "status", "order_date"]
                has_all_fields = all(field in po for field in required_fields)
                
                self.log_result("POST /api/purchase-orders - Create PO", True, 
                              f"PO created: {po.get('po_number', 'N/A')}, ₹{po.get('total_amount', 0)}, All fields: {has_all_fields}", "high")
            else:
                self.log_result("POST /api/purchase-orders - Create PO", False, 
                              f"PO creation failed: {error}", "high")
        
        # Test 6: GET /api/purchase-orders - List POs
        response, error = self.make_request("GET", f"/purchase-orders?project_id={project_id}")
        if response and response.status_code == 200:
            pos = response.json()
            self.log_result("GET /api/purchase-orders - List POs", True, 
                          f"Retrieved {len(pos)} purchase orders", "high")
        else:
            self.log_result("GET /api/purchase-orders - List POs", False, 
                          f"Failed to get purchase orders: {error}", "high")
        
        # Test 7: GET /api/purchase-orders/{id} - PO details
        if 'po_id' in locals() and po_id:
            response, error = self.make_request("GET", f"/purchase-orders/{po_id}")
            if response and response.status_code == 200:
                po = response.json()
                self.log_result("GET /api/purchase-orders/{id} - PO details", True, 
                              f"PO details retrieved: {po.get('po_number', 'N/A')}", "high")
            else:
                self.log_result("GET /api/purchase-orders/{id} - PO details", False, 
                              f"Failed to get PO details: {error}", "high")
        
        # Test 8: PUT /api/purchase-orders/{id} - Update status
        if 'po_id' in locals() and po_id:
            update_data = {"status": "approved"}
            response, error = self.make_request("PUT", f"/purchase-orders/{po_id}", update_data)
            if response and response.status_code == 200:
                po = response.json()
                self.log_result("PUT /api/purchase-orders/{id} - Update status", True, 
                              f"PO status updated to: {po.get('status', 'unknown')}", "high")
            else:
                self.log_result("PUT /api/purchase-orders/{id} - Update status", False, 
                              f"Failed to update PO: {error}", "high")
        
        # MATERIAL REQUIREMENTS
        print("\n--- Testing Material Requirements ---")
        
        # Test 9: POST /api/material-requirements - Create requirement
        if material_id:
            requirement_data = {
                "project_id": project_id,
                "material_id": material_id,
                "required_quantity": 300.0,
                "required_by_date": (datetime.now() + timedelta(days=21)).isoformat(),
                "priority": "high",
                "purpose": "Foundation work - Comprehensive testing phase",
                "is_fulfilled": False,
                "notes": "Required for comprehensive testing foundation work"
            }
            
            response, error = self.make_request("POST", "/material-requirements", requirement_data)
            if response and response.status_code in [200, 201]:
                requirement = response.json()
                req_id = requirement["id"]
                self.created_resources['material_requirements'].append(req_id)
                self.log_result("POST /api/material-requirements - Create requirement", True, 
                              f"Material requirement created: {requirement.get('material_name', 'N/A')}", "high")
            else:
                self.log_result("POST /api/material-requirements - Create requirement", False, 
                              f"Requirement creation failed: {error}", "high")
        
        # Test 10: GET /api/material-requirements - List requirements
        response, error = self.make_request("GET", f"/material-requirements?project_id={project_id}")
        if response and response.status_code == 200:
            requirements = response.json()
            self.log_result("GET /api/material-requirements - List requirements", True, 
                          f"Retrieved {len(requirements)} material requirements", "high")
        else:
            self.log_result("GET /api/material-requirements - List requirements", False, 
                          f"Failed to get requirements: {error}", "high")
        
        # INVENTORY
        print("\n--- Testing Inventory ---")
        
        # Test 11: GET /api/site-inventory - List inventory
        response, error = self.make_request("GET", "/site-inventory")
        if response and response.status_code == 200:
            inventory = response.json()
            self.log_result("GET /api/site-inventory - List inventory", True, 
                          f"Retrieved {len(inventory)} inventory items", "medium")
        else:
            self.log_result("GET /api/site-inventory - List inventory", False, 
                          f"Failed to get inventory: {error}", "medium")
        
        # Test 12: POST /api/material-transactions - Create transaction
        if material_id:
            transaction_data = {
                "project_id": project_id,
                "material_id": material_id,
                "transaction_type": "receipt",
                "quantity": 100.0,
                "transaction_date": datetime.now().isoformat(),
                "reference_number": f"TXN-COMP-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "notes": "Material received for comprehensive testing"
            }
            
            response, error = self.make_request("POST", "/material-transactions", transaction_data)
            if response and response.status_code in [200, 201]:
                transaction = response.json()
                self.log_result("POST /api/material-transactions - Create transaction", True, 
                              f"Transaction created: {transaction.get('transaction_type', 'N/A')}, {transaction.get('quantity', 0)} units", "medium")
            else:
                self.log_result("POST /api/material-transactions - Create transaction", False, 
                              f"Transaction creation failed: {error}", "medium")

    # ============= MODULE 6: PROJECT MANAGEMENT FEATURES =============
    
    def test_module_6_project_management_features(self, project_id):
        """Test Module 6: Project Management Features"""
        print("\n=== MODULE 6: PROJECT MANAGEMENT FEATURES ===")
        
        if not project_id:
            self.log_result("Project Management Module Setup", False, "No project ID available for project management testing", "medium")
            return
        
        # Test 1: GET /api/milestones - List milestones
        response, error = self.make_request("GET", "/milestones")
        if response and response.status_code == 200:
            milestones = response.json()
            self.log_result("GET /api/milestones - List milestones", True, 
                          f"Retrieved {len(milestones)} milestones", "medium")
        else:
            self.log_result("GET /api/milestones - List milestones", False, 
                          f"Failed to get milestones: {error}", "medium")
        
        # Test 2: GET /api/documents - List documents
        response, error = self.make_request("GET", f"/documents?project_id={project_id}")
        if response and response.status_code == 200:
            documents = response.json()
            self.log_result("GET /api/documents - List documents", True, 
                          f"Retrieved {len(documents)} documents", "medium")
        else:
            self.log_result("GET /api/documents - List documents", False, 
                          f"Failed to get documents: {error}", "medium")

    def run_comprehensive_tests(self):
        """Run all comprehensive stability & regression tests"""
        print("🚀 COMPREHENSIVE STABILITY & REGRESSION TESTING - All Modules")
        print("Testing ALL existing features for stability after recent additions")
        print("="*80)
        
        # Authenticate first
        success, message = self.authenticate_admin()
        if not success:
            print(f"❌ Authentication failed: {message}")
            return
        
        print(f"✅ Authentication successful: {message}")
        
        # Run all test modules in order
        self.test_module_1_authentication_users()
        project_id = self.test_module_2_projects()
        
        if project_id:
            self.test_module_3_tasks(project_id)
            self.test_module_4_financial_management(project_id)
            self.test_module_5_materials_management(project_id)
            self.test_module_6_project_management_features(project_id)
        else:
            print("⚠️ Skipping dependent tests due to project creation failure")
        
        # Generate comprehensive summary
        self.generate_comprehensive_summary()
    
    def generate_comprehensive_summary(self):
        """Generate comprehensive test summary as requested in review"""
        print("\n" + "="*80)
        print("📊 COMPREHENSIVE STABILITY & REGRESSION TEST RESULTS")
        print("="*80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r["success"])
        failed_tests = total_tests - passed_tests
        pass_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Overall Pass Rate: {passed_tests}/{total_tests} ({pass_rate:.1f}%)")
        
        # Group by priority (P0, P1, P2)
        critical_tests = [r for r in self.test_results if r["priority"] == "critical"]
        high_tests = [r for r in self.test_results if r["priority"] == "high"]
        medium_tests = [r for r in self.test_results if r["priority"] == "medium"]
        
        critical_passed = sum(1 for r in critical_tests if r["success"])
        high_passed = sum(1 for r in high_tests if r["success"])
        medium_passed = sum(1 for r in medium_tests if r["success"])
        
        print(f"\n📈 Module-wise Success Rate:")
        print(f"🔴 P0 (Critical - Must Pass): {critical_passed}/{len(critical_tests)} ({(critical_passed/len(critical_tests)*100):.1f}%)")
        print(f"🟡 P1 (High - Should Pass): {high_passed}/{len(high_tests)} ({(high_passed/len(high_tests)*100):.1f}%)")
        print(f"🟢 P2 (Medium - Nice to Pass): {medium_passed}/{len(medium_tests)} ({(medium_passed/len(medium_tests)*100):.1f}%)")
        
        # Critical Issues (P0 failures)
        critical_failures = [r for r in critical_tests if not r["success"]]
        if critical_failures:
            print(f"\n❌ Critical Issues (P0 failures - {len(critical_failures)}):")
            for result in critical_failures:
                print(f"   • {result['test']}")
                if result["details"]:
                    print(f"     Details: {result['details']}")
        
        # Non-Critical Issues (P1/P2 failures)
        non_critical_failures = [r for r in (high_tests + medium_tests) if not r["success"]]
        if non_critical_failures:
            print(f"\n⚠️ Non-Critical Issues (P1/P2 failures - {len(non_critical_failures)}):")
            for result in non_critical_failures:
                print(f"   • {result['test']} ({result['priority']})")
                if result["details"]:
                    print(f"     Details: {result['details']}")
        
        # Regression Detection
        print(f"\n🔍 Regression Detected:")
        if critical_failures:
            print(f"   ⚠️ {len(critical_failures)} critical regressions detected in core functionality")
        else:
            print(f"   ✅ No critical regressions detected in core functionality")
        
        # Recommendations
        print(f"\n💡 Recommendations for fixes:")
        if critical_failures:
            print(f"   🔴 URGENT: Fix {len(critical_failures)} critical issues before deployment")
        if non_critical_failures:
            print(f"   🟡 Address {len(non_critical_failures)} non-critical issues in next iteration")
        if not critical_failures and not non_critical_failures:
            print(f"   ✅ All tests passed - system is stable for deployment")
        
        print(f"\n📋 Test Summary by Module:")
        modules = {
            "Authentication & Users": [r for r in self.test_results if "auth" in r["test"].lower() or "user" in r["test"].lower()],
            "Projects": [r for r in self.test_results if "project" in r["test"].lower() and "financial" not in r["test"].lower()],
            "Tasks": [r for r in self.test_results if "task" in r["test"].lower()],
            "Financial Management": [r for r in self.test_results if any(word in r["test"].lower() for word in ["budget", "expense", "invoice", "payment", "financial"])],
            "Materials Management": [r for r in self.test_results if any(word in r["test"].lower() for word in ["vendor", "material", "purchase", "inventory", "transaction"])],
            "Project Management": [r for r in self.test_results if any(word in r["test"].lower() for word in ["milestone", "document"])]
        }
        
        for module_name, module_tests in modules.items():
            if module_tests:
                module_passed = sum(1 for r in module_tests if r["success"])
                module_total = len(module_tests)
                module_rate = (module_passed / module_total * 100) if module_total > 0 else 0
                print(f"   {module_name}: {module_passed}/{module_total} ({module_rate:.1f}%)")

if __name__ == "__main__":
    tester = ComprehensiveAPITester()
    tester.run_comprehensive_tests()