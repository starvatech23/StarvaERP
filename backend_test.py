#!/usr/bin/env python3
"""
Backend API Testing for Client Portal Link Feature
Tests the client portal link functionality in project management APIs
"""

import requests
import json
import sys
from datetime import datetime
import os

# Get backend URL from environment
BACKEND_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://construct-crm.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_success(message):
    print(f"{Colors.GREEN}✅ {message}{Colors.ENDC}")

def print_error(message):
    print(f"{Colors.RED}❌ {message}{Colors.ENDC}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠️ {message}{Colors.ENDC}")

def print_info(message):
    print(f"{Colors.BLUE}ℹ️ {message}{Colors.ENDC}")

def print_header(message):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{message}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}")

ADMIN_CREDENTIALS = {
    "identifier": "admin@test.com",
    "password": "admin123",
    "auth_type": "email"
}

class CRMTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_results = []
        self.created_resources = {
            "categories": [],
            "leads": [],
            "activities": []
        }
        
    def log_result(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        if response_data:
            result["response_data"] = response_data
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
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json=ADMIN_CREDENTIALS)
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("access_token")
                self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                
                # Verify user has admin role
                user_data = data.get("user", {})
                if user_data.get("role") == "admin":
                    self.log_result("Authentication", True, f"Logged in as admin: {user_data.get('full_name')}")
                    return True
                else:
                    self.log_result("Authentication", False, f"User role is {user_data.get('role')}, need admin")
                    return False
            else:
                # Try to register admin user if login fails
                register_data = {
                    "email": "admin@test.com",
                    "password": "admin123",
                    "full_name": "Admin User",
                    "role": "admin",
                    "auth_type": "email"
                }
                
                reg_response = self.session.post(f"{BASE_URL}/auth/register", json=register_data)
                
                if reg_response.status_code == 200:
                    data = reg_response.json()
                    self.auth_token = data.get("access_token")
                    self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                    self.log_result("Authentication", True, f"Registered and logged in as admin user")
                    return True
                else:
                    self.log_result("Authentication", False, f"Login failed: {response.status_code}, Register failed: {reg_response.status_code}")
                    return False
                
        except Exception as e:
            self.log_result("Authentication", False, f"Authentication error: {str(e)}")
            return False

    def test_lead_categories_apis(self):
        """Test Lead Categories APIs (4 endpoints)"""
        print("=== Testing Lead Categories APIs ===")
        
        # 1. GET /api/crm/categories - List categories with lead counts
        try:
            response = self.session.get(f"{BASE_URL}/crm/categories")
            if response.status_code == 200:
                categories = response.json()
                self.log_result("GET /api/crm/categories", True, 
                              f"Retrieved {len(categories)} categories", categories)
                
                # Verify default categories exist
                category_names = [cat.get('name') for cat in categories]
                expected_categories = ['New Lead', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost']
                missing = [cat for cat in expected_categories if cat not in category_names]
                if not missing:
                    self.log_result("Default Categories Check", True, "All 6 default categories present")
                else:
                    self.log_result("Default Categories Check", False, f"Missing categories: {missing}")
            else:
                self.log_result("GET /api/crm/categories", False, 
                              f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET /api/crm/categories", False, f"Error: {str(e)}")

        # 2. POST /api/crm/categories - Create category (admin only)
        try:
            new_category = {
                "name": f"Test Category {uuid.uuid4().hex[:8]}",
                "description": "Test category for API testing",
                "color": "#FF5733",
                "order_index": 10,
                "is_active": True
            }
            
            response = self.session.post(f"{BASE_URL}/crm/categories", json=new_category)
            if response.status_code == 200:
                created_category = response.json()
                self.created_resources["categories"].append(created_category.get("id"))
                self.log_result("POST /api/crm/categories", True, 
                              f"Created category: {created_category.get('name')}", created_category)
            else:
                self.log_result("POST /api/crm/categories", False, 
                              f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("POST /api/crm/categories", False, f"Error: {str(e)}")

        # 3. PUT /api/crm/categories/{id} - Update category
        if self.created_resources["categories"]:
            try:
                category_id = self.created_resources["categories"][0]
                update_data = {
                    "name": f"Updated Test Category {uuid.uuid4().hex[:8]}",
                    "description": "Updated description",
                    "color": "#33FF57"
                }
                
                response = self.session.put(f"{BASE_URL}/crm/categories/{category_id}", json=update_data)
                if response.status_code == 200:
                    updated_category = response.json()
                    self.log_result("PUT /api/crm/categories/{id}", True, 
                                  f"Updated category: {updated_category.get('name')}", updated_category)
                else:
                    self.log_result("PUT /api/crm/categories/{id}", False, 
                                  f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_result("PUT /api/crm/categories/{id}", False, f"Error: {str(e)}")

        # 4. PUT /api/crm/categories/reorder - Reorder categories
        try:
            # Get current categories first
            response = self.session.get(f"{BASE_URL}/crm/categories")
            if response.status_code == 200:
                categories = response.json()
                category_ids = [cat.get("id") for cat in categories]
                
                # Reverse the order for testing
                reorder_data = {"category_ids": list(reversed(category_ids))}
                
                response = self.session.put(f"{BASE_URL}/crm/categories/reorder", json=reorder_data)
                if response.status_code == 200:
                    self.log_result("PUT /api/crm/categories/reorder", True, 
                                  f"Reordered {len(category_ids)} categories")
                else:
                    self.log_result("PUT /api/crm/categories/reorder", False, 
                                  f"Status: {response.status_code}", response.text)
            else:
                self.log_result("PUT /api/crm/categories/reorder", False, 
                              "Could not get categories for reordering")
        except Exception as e:
            self.log_result("PUT /api/crm/categories/reorder", False, f"Error: {str(e)}")

    def test_lead_crud_apis(self):
        """Test Lead CRUD APIs (5 endpoints)"""
        print("=== Testing Lead CRUD APIs ===")
        
        # Get a category ID for lead creation
        category_id = None
        try:
            response = self.session.get(f"{BASE_URL}/crm/categories")
            if response.status_code == 200:
                categories = response.json()
                if categories:
                    category_id = categories[0].get("id")
        except:
            pass

        # 1. POST /api/crm/leads - Create lead (with auto-WhatsApp option)
        try:
            new_lead = {
                "name": f"John Doe {uuid.uuid4().hex[:8]}",
                "email": f"john.doe.{uuid.uuid4().hex[:8]}@example.com",
                "primary_phone": f"+91987654{uuid.uuid4().hex[:4]}",
                "city": "Mumbai",
                "state": "Maharashtra",
                "category_id": category_id,
                "status": "new",
                "priority": "medium",
                "source": "website",
                "budget": 500000.0,
                "requirement": "Interested in 3BHK apartment construction",
                "notes": "Initial inquiry for residential construction",
                "send_whatsapp": True
            }
            
            response = self.session.post(f"{BASE_URL}/crm/leads", json=new_lead)
            if response.status_code == 200:
                created_lead = response.json()
                self.created_resources["leads"].append(created_lead.get("id"))
                self.log_result("POST /api/crm/leads", True, 
                              f"Created lead: {created_lead.get('name')}", created_lead)
            else:
                self.log_result("POST /api/crm/leads", False, 
                              f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("POST /api/crm/leads", False, f"Error: {str(e)}")

        # Create another lead for testing
        try:
            new_lead2 = {
                "name": f"Jane Smith {uuid.uuid4().hex[:8]}",
                "email": f"jane.smith.{uuid.uuid4().hex[:8]}@example.com",
                "primary_phone": f"+91876543{uuid.uuid4().hex[:4]}",
                "city": "Delhi",
                "state": "Delhi",
                "category_id": category_id,
                "status": "qualified",
                "priority": "high",
                "source": "referral",
                "budget": 750000.0,
                "requirement": "Commercial building construction project"
            }
            
            response = self.session.post(f"{BASE_URL}/crm/leads", json=new_lead2)
            if response.status_code == 200:
                created_lead2 = response.json()
                self.created_resources["leads"].append(created_lead2.get("id"))
        except:
            pass

        # 2. GET /api/crm/leads - List leads with filtering
        try:
            response = self.session.get(f"{BASE_URL}/crm/leads")
            if response.status_code == 200:
                leads = response.json()
                self.log_result("GET /api/crm/leads", True, 
                              f"Retrieved {len(leads)} leads", {"count": len(leads)})
                
                # Test filtering by status
                response = self.session.get(f"{BASE_URL}/crm/leads?status=new")
                if response.status_code == 200:
                    filtered_leads = response.json()
                    self.log_result("GET /api/crm/leads?status=new", True, 
                                  f"Retrieved {len(filtered_leads)} new leads")
                
                # Test filtering by priority
                response = self.session.get(f"{BASE_URL}/crm/leads?priority=high")
                if response.status_code == 200:
                    high_priority_leads = response.json()
                    self.log_result("GET /api/crm/leads?priority=high", True, 
                                  f"Retrieved {len(high_priority_leads)} high priority leads")
                
            else:
                self.log_result("GET /api/crm/leads", False, 
                              f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET /api/crm/leads", False, f"Error: {str(e)}")

        # 3. GET /api/crm/leads/{id} - Get single lead
        if self.created_resources["leads"]:
            try:
                lead_id = self.created_resources["leads"][0]
                response = self.session.get(f"{BASE_URL}/crm/leads/{lead_id}")
                if response.status_code == 200:
                    lead = response.json()
                    self.log_result("GET /api/crm/leads/{id}", True, 
                                  f"Retrieved lead: {lead.get('name')}", lead)
                else:
                    self.log_result("GET /api/crm/leads/{id}", False, 
                                  f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_result("GET /api/crm/leads/{id}", False, f"Error: {str(e)}")

        # 4. PUT /api/crm/leads/{id} - Update lead (creates field audits)
        if self.created_resources["leads"]:
            try:
                lead_id = self.created_resources["leads"][0]
                update_data = {
                    "status": "qualified",
                    "priority": "high",
                    "budget": 600000.0,
                    "notes": "Updated notes - customer showed strong interest"
                }
                
                response = self.session.put(f"{BASE_URL}/crm/leads/{lead_id}", json=update_data)
                if response.status_code == 200:
                    updated_lead = response.json()
                    self.log_result("PUT /api/crm/leads/{id}", True, 
                                  f"Updated lead: {updated_lead.get('name')}", updated_lead)
                else:
                    self.log_result("PUT /api/crm/leads/{id}", False, 
                                  f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_result("PUT /api/crm/leads/{id}", False, f"Error: {str(e)}")

        # 5. DELETE /api/crm/leads/{id} - Soft delete lead
        if len(self.created_resources["leads"]) > 1:
            try:
                lead_id = self.created_resources["leads"][1]  # Use second lead for deletion
                response = self.session.delete(f"{BASE_URL}/crm/leads/{lead_id}")
                if response.status_code == 200:
                    self.log_result("DELETE /api/crm/leads/{id}", True, 
                                  f"Soft deleted lead: {lead_id}")
                else:
                    self.log_result("DELETE /api/crm/leads/{id}", False, 
                                  f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_result("DELETE /api/crm/leads/{id}", False, f"Error: {str(e)}")

    def test_activity_timeline_apis(self):
        """Test Activity Timeline APIs (2 endpoints)"""
        print("=== Testing Activity Timeline APIs ===")
        
        if not self.created_resources["leads"]:
            self.log_result("Activity Timeline Tests", False, "No leads available for testing")
            return
            
        lead_id = self.created_resources["leads"][0]

        # 1. POST /api/crm/leads/{id}/activities - Add activity
        try:
            new_activity = {
                "type": "call",
                "description": "Initial consultation call with client",
                "notes": "Discussed project requirements and budget",
                "scheduled_at": (datetime.now() + timedelta(hours=1)).isoformat(),
                "duration_minutes": 30
            }
            
            response = self.session.post(f"{BASE_URL}/crm/leads/{lead_id}/activities", json=new_activity)
            if response.status_code == 200:
                created_activity = response.json()
                self.created_resources["activities"].append(created_activity.get("id"))
                self.log_result("POST /api/crm/leads/{id}/activities", True, 
                              f"Created activity: {created_activity.get('type')}", created_activity)
            else:
                self.log_result("POST /api/crm/leads/{id}/activities", False, 
                              f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("POST /api/crm/leads/{id}/activities", False, f"Error: {str(e)}")

        # Add another activity
        try:
            email_activity = {
                "type": "email",
                "description": "Sent project proposal",
                "notes": "Detailed proposal with timeline and cost breakdown"
            }
            
            response = self.session.post(f"{BASE_URL}/crm/leads/{lead_id}/activities", json=email_activity)
            if response.status_code == 200:
                created_activity = response.json()
                self.created_resources["activities"].append(created_activity.get("id"))
        except:
            pass

        # 2. GET /api/crm/leads/{id}/activities - Get activity timeline
        try:
            response = self.session.get(f"{BASE_URL}/crm/leads/{lead_id}/activities")
            if response.status_code == 200:
                activities = response.json()
                self.log_result("GET /api/crm/leads/{id}/activities", True, 
                              f"Retrieved {len(activities)} activities", {"count": len(activities)})
            else:
                self.log_result("GET /api/crm/leads/{id}/activities", False, 
                              f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET /api/crm/leads/{id}/activities", False, f"Error: {str(e)}")

    def test_mock_integration_apis(self):
        """Test Mock Integration APIs (2 endpoints)"""
        print("=== Testing Mock Integration APIs ===")
        
        if not self.created_resources["leads"]:
            self.log_result("Mock Integration Tests", False, "No leads available for testing")
            return
            
        lead_id = self.created_resources["leads"][0]

        # 1. POST /api/crm/leads/{id}/call - Log call activity
        try:
            call_data = {
                "duration_minutes": 15,
                "outcome": "interested",
                "notes": "Customer is very interested, wants to schedule site visit"
            }
            
            response = self.session.post(f"{BASE_URL}/crm/leads/{lead_id}/call", json=call_data)
            if response.status_code == 200:
                result = response.json()
                self.log_result("POST /api/crm/leads/{id}/call", True, 
                              f"Logged call: {call_data['outcome']}", result)
            else:
                self.log_result("POST /api/crm/leads/{id}/call", False, 
                              f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("POST /api/crm/leads/{id}/call", False, f"Error: {str(e)}")

        # 2. POST /api/crm/leads/{id}/whatsapp - Send WhatsApp (mock)
        try:
            whatsapp_data = {
                "message": "Thank you for your interest! We'll send you the project details shortly.",
                "template_name": "follow_up"
            }
            
            response = self.session.post(f"{BASE_URL}/crm/leads/{lead_id}/whatsapp", json=whatsapp_data)
            if response.status_code == 200:
                result = response.json()
                self.log_result("POST /api/crm/leads/{id}/whatsapp", True, 
                              f"Sent WhatsApp: {result.get('status')}", result)
            else:
                self.log_result("POST /api/crm/leads/{id}/whatsapp", False, 
                              f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("POST /api/crm/leads/{id}/whatsapp", False, f"Error: {str(e)}")

    def test_bulk_operations_apis(self):
        """Test Bulk Operations APIs (3 endpoints)"""
        print("=== Testing Bulk Operations APIs ===")
        
        if len(self.created_resources["leads"]) < 1:
            self.log_result("Bulk Operations Tests", False, "Not enough leads for bulk testing")
            return

        # 1. POST /api/crm/leads/bulk-update - Bulk update leads
        try:
            bulk_update_data = {
                "lead_ids": self.created_resources["leads"][:1],  # Use first lead
                "updates": {
                    "priority": "urgent",
                    "status": "negotiation"
                }
            }
            
            response = self.session.post(f"{BASE_URL}/crm/leads/bulk-update", json=bulk_update_data)
            if response.status_code == 200:
                result = response.json()
                self.log_result("POST /api/crm/leads/bulk-update", True, 
                              f"Updated {result.get('updated_count', 0)} leads", result)
            else:
                self.log_result("POST /api/crm/leads/bulk-update", False, 
                              f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("POST /api/crm/leads/bulk-update", False, f"Error: {str(e)}")

        # 2. POST /api/crm/leads/bulk-assign - Bulk assign leads
        try:
            # Get current user ID for assignment
            response = self.session.get(f"{BASE_URL}/auth/me")
            if response.status_code == 200:
                user_data = response.json()
                user_id = user_data.get("id")
                
                bulk_assign_data = {
                    "lead_ids": self.created_resources["leads"][:1],  # Use first lead
                    "assigned_to": user_id
                }
                
                response = self.session.post(f"{BASE_URL}/crm/leads/bulk-assign", json=bulk_assign_data)
                if response.status_code == 200:
                    result = response.json()
                    self.log_result("POST /api/crm/leads/bulk-assign", True, 
                                  f"Assigned {result.get('assigned_count', 0)} leads", result)
                else:
                    self.log_result("POST /api/crm/leads/bulk-assign", False, 
                                  f"Status: {response.status_code}", response.text)
            else:
                self.log_result("POST /api/crm/leads/bulk-assign", False, 
                              "Could not get current user for assignment")
        except Exception as e:
            self.log_result("POST /api/crm/leads/bulk-assign", False, f"Error: {str(e)}")

        # 3. POST /api/crm/leads/import - Import leads from CSV
        try:
            import_data = {
                "leads": [
                    {
                        "name": "Import Test Lead 1",
                        "email": "import1@example.com",
                        "phone": "+919876543210",
                        "company": "Import Test Company 1",
                        "source": "import"
                    },
                    {
                        "name": "Import Test Lead 2",
                        "email": "import2@example.com", 
                        "phone": "+919876543211",
                        "company": "Import Test Company 2",
                        "source": "import"
                    }
                ]
            }
            
            response = self.session.post(f"{BASE_URL}/crm/leads/import", json=import_data)
            if response.status_code == 200:
                result = response.json()
                self.log_result("POST /api/crm/leads/import", True, 
                              f"Imported {result.get('successful_count', 0)} leads, {result.get('failed_count', 0)} failed", result)
                
                # Add imported leads to cleanup list
                for lead in result.get('successful_leads', []):
                    if lead.get('id'):
                        self.created_resources["leads"].append(lead['id'])
            else:
                self.log_result("POST /api/crm/leads/import", False, 
                              f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("POST /api/crm/leads/import", False, f"Error: {str(e)}")

    def test_configuration_apis(self):
        """Test Configuration APIs (2 endpoints)"""
        print("=== Testing Configuration APIs ===")
        
        # 1. GET /api/crm/config - Get CRM config
        try:
            response = self.session.get(f"{BASE_URL}/crm/config")
            if response.status_code == 200:
                config = response.json()
                self.log_result("GET /api/crm/config", True, 
                              f"Retrieved CRM config", config)
            else:
                self.log_result("GET /api/crm/config", False, 
                              f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("GET /api/crm/config", False, f"Error: {str(e)}")

        # 2. PUT /api/crm/config - Update CRM config
        try:
            config_update = {
                "whatsapp_enabled": True,
                "whatsapp_api_key": "test_api_key_12345",
                "telephony_enabled": True,
                "telephony_provider": "twilio",
                "auto_assignment_enabled": True,
                "default_lead_source": "website"
            }
            
            response = self.session.put(f"{BASE_URL}/crm/config", json=config_update)
            if response.status_code == 200:
                updated_config = response.json()
                self.log_result("PUT /api/crm/config", True, 
                              f"Updated CRM config", updated_config)
            else:
                self.log_result("PUT /api/crm/config", False, 
                              f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_result("PUT /api/crm/config", False, f"Error: {str(e)}")

    def run_all_tests(self):
        """Run all CRM API tests"""
        print("🚀 Starting Comprehensive CRM Backend API Testing")
        print("=" * 60)
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Run all test suites
        self.test_lead_categories_apis()
        self.test_lead_crud_apis()
        self.test_activity_timeline_apis()
        self.test_mock_integration_apis()
        self.test_bulk_operations_apis()
        self.test_configuration_apis()
        
        # Print summary
        self.print_summary()
        
        return True

    def print_summary(self):
        """Print test summary"""
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["success"]])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        print()
        
        if failed_tests > 0:
            print("❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")
            print()
        
        print("📋 RESOURCES CREATED:")
        print(f"  - Categories: {len(self.created_resources['categories'])}")
        print(f"  - Leads: {len(self.created_resources['leads'])}")
        print(f"  - Activities: {len(self.created_resources['activities'])}")
        print()
        
        # Test results by category
        categories = {
            "Lead Categories APIs": 0,
            "Lead CRUD APIs": 0,
            "Activity Timeline APIs": 0,
            "Mock Integration APIs": 0,
            "Bulk Operations APIs": 0,
            "Configuration APIs": 0
        }
        
        for result in self.test_results:
            test_name = result["test"]
            if "categories" in test_name.lower():
                categories["Lead Categories APIs"] += 1 if result["success"] else 0
            elif any(x in test_name.lower() for x in ["post /api/crm/leads", "get /api/crm/leads", "put /api/crm/leads", "delete /api/crm/leads"]):
                categories["Lead CRUD APIs"] += 1 if result["success"] else 0
            elif "activities" in test_name.lower():
                categories["Activity Timeline APIs"] += 1 if result["success"] else 0
            elif any(x in test_name.lower() for x in ["call", "whatsapp"]):
                categories["Mock Integration APIs"] += 1 if result["success"] else 0
            elif any(x in test_name.lower() for x in ["bulk", "import"]):
                categories["Bulk Operations APIs"] += 1 if result["success"] else 0
            elif "config" in test_name.lower():
                categories["Configuration APIs"] += 1 if result["success"] else 0
        
        print("📈 RESULTS BY API CATEGORY:")
        for category, passed in categories.items():
            print(f"  - {category}: {passed} tests passed")

if __name__ == "__main__":
    tester = CRMTester()
    success = tester.run_all_tests()
    
    if success:
        print("✅ CRM Backend API testing completed successfully!")
    else:
        print("❌ CRM Backend API testing failed!")
        sys.exit(1)