#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Project Contact Hierarchy and Gantt Share Link Features
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

# Configuration
BASE_URL = "https://construct-crm.preview.emergentagent.com/api"
TEST_USER_EMAIL = "admin@test.com"
TEST_USER_PASSWORD = "admin123"

class ContactGanttTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_project_id = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test results"""
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
            # Try to login with existing user
            login_data = {
                "identifier": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD,
                "auth_type": "email"
            }
            
            response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data["access_token"]
                self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                self.log_test("Authentication - Login", True, f"Logged in as {data['user']['full_name']}")
                return True
            else:
                # Try to register new user
                register_data = {
                    "email": TEST_USER_EMAIL,
                    "password": TEST_USER_PASSWORD,
                    "full_name": "Test Admin User",
                    "role": "admin",
                    "auth_type": "email"
                }
                
                response = self.session.post(f"{BASE_URL}/auth/register", json=register_data)
                
                if response.status_code == 200:
                    data = response.json()
                    self.auth_token = data["access_token"]
                    self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                    self.log_test("Authentication - Register", True, f"Registered and logged in as {data['user']['full_name']}")
                    return True
                else:
                    self.log_test("Authentication", False, f"Failed to login or register: {response.status_code}", response.text)
                    return False
                    
        except Exception as e:
            self.log_test("Authentication", False, f"Exception during auth: {str(e)}")
            return False

    def setup_test_project(self) -> bool:
        """Create or find a test project"""
        try:
            # First try to get existing projects
            response = self.session.get(f"{BASE_URL}/projects")
            
            if response.status_code == 200:
                projects = response.json()
                if projects:
                    # Use the first project
                    self.test_project_id = projects[0]["id"]
                    self.log_test("Setup - Use Existing Project", True, f"Using project: {projects[0]['name']} (ID: {self.test_project_id})")
                    return True
            
            # Create new project if none exist
            project_data = {
                "name": "Test Project for Contact Hierarchy",
                "description": "Test project for testing contact hierarchy and Gantt share features",
                "start_date": "2024-01-01",
                "end_date": "2024-12-31",
                "status": "active",
                "budget": 1000000.0,
                "address": "123 Test Street, Test City"
            }
            
            response = self.session.post(f"{BASE_URL}/projects", json=project_data)
            
            if response.status_code == 200:
                project = response.json()
                self.test_project_id = project["id"]
                self.log_test("Setup - Create Test Project", True, f"Created project: {project['name']} (ID: {self.test_project_id})")
                return True
            else:
                self.log_test("Setup - Create Test Project", False, f"Failed to create project: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Setup - Test Project", False, f"Exception: {str(e)}")
            return False

    def test_project_contacts_apis(self) -> Dict[str, bool]:
        """Test all Project Contact Hierarchy APIs"""
        results = {}
        
        # Test 1: GET /api/projects/{project_id}/contacts - Initial empty state
        try:
            response = self.session.get(f"{BASE_URL}/projects/{self.test_project_id}/contacts")
            
            if response.status_code == 200:
                contacts = response.json()
                results["get_contacts_empty"] = True
                self.log_test("GET Contacts - Empty State", True, f"Retrieved {len(contacts)} contacts (expected empty)")
            else:
                results["get_contacts_empty"] = False
                self.log_test("GET Contacts - Empty State", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            results["get_contacts_empty"] = False
            self.log_test("GET Contacts - Empty State", False, f"Exception: {str(e)}")

        # Test 2: POST /api/projects/{project_id}/contacts - Add contacts for all 7 required roles
        required_roles = [
            "architect", "project_engineer", "project_manager", 
            "project_head", "operations_executive", "operations_manager", "operations_head"
        ]
        
        contact_test_data = [
            {
                "role": "architect",
                "type": "external",
                "name": "John Smith",
                "phone_mobile": "+1234567890",
                "phone_alternate": "+1234567891",
                "email": "john.smith@architecture.com",
                "office_phone": "+1234567892",
                "preferred_contact_method": "email",
                "working_hours": "9 AM - 6 PM",
                "timezone": "EST",
                "notes": "Lead architect for the project",
                "is_primary": True
            },
            {
                "role": "project_engineer",
                "type": "internal",
                "name": "Sarah Johnson",
                "phone_mobile": "+1234567893",
                "email": "sarah.johnson@company.com",
                "preferred_contact_method": "phone",
                "working_hours": "8 AM - 5 PM",
                "timezone": "EST",
                "notes": "Senior project engineer",
                "is_primary": True
            },
            {
                "role": "project_manager",
                "type": "internal",
                "name": "Mike Davis",
                "phone_mobile": "+1234567894",
                "email": "mike.davis@company.com",
                "preferred_contact_method": "phone",
                "working_hours": "7 AM - 7 PM",
                "timezone": "EST",
                "notes": "Project manager overseeing daily operations",
                "is_primary": True
            },
            {
                "role": "project_head",
                "type": "internal",
                "name": "Lisa Wilson",
                "phone_mobile": "+1234567895",
                "email": "lisa.wilson@company.com",
                "preferred_contact_method": "email",
                "working_hours": "9 AM - 6 PM",
                "timezone": "EST",
                "notes": "Project head responsible for strategic decisions",
                "is_primary": True
            },
            {
                "role": "operations_executive",
                "type": "internal",
                "name": "Robert Brown",
                "phone_mobile": "+1234567896",
                "email": "robert.brown@company.com",
                "preferred_contact_method": "phone",
                "working_hours": "8 AM - 6 PM",
                "timezone": "EST",
                "notes": "Operations executive handling logistics",
                "is_primary": True
            },
            {
                "role": "operations_manager",
                "type": "internal",
                "name": "Emily Taylor",
                "phone_mobile": "+1234567897",
                "email": "emily.taylor@company.com",
                "preferred_contact_method": "email",
                "working_hours": "9 AM - 5 PM",
                "timezone": "EST",
                "notes": "Operations manager coordinating teams",
                "is_primary": True
            },
            {
                "role": "operations_head",
                "type": "internal",
                "name": "David Anderson",
                "phone_mobile": "+1234567898",
                "email": "david.anderson@company.com",
                "preferred_contact_method": "phone",
                "working_hours": "8 AM - 7 PM",
                "timezone": "EST",
                "notes": "Operations head overseeing all operations",
                "is_primary": True
            }
        ]
        
        added_contacts = 0
        for contact_data in contact_test_data:
            try:
                response = self.session.post(f"{BASE_URL}/projects/{self.test_project_id}/contacts", json=contact_data)
                
                if response.status_code == 200:
                    added_contacts += 1
                    result_data = response.json()
                    self.log_test(f"POST Contact - {contact_data['role']}", True, f"Added {contact_data['name']} as {contact_data['role']}")
                else:
                    self.log_test(f"POST Contact - {contact_data['role']}", False, f"Status: {response.status_code}", response.text)
            except Exception as e:
                self.log_test(f"POST Contact - {contact_data['role']}", False, f"Exception: {str(e)}")
        
        results["add_all_contacts"] = added_contacts == 7

        # Test 3: GET /api/projects/{project_id}/contacts - Verify all contacts added
        try:
            response = self.session.get(f"{BASE_URL}/projects/{self.test_project_id}/contacts")
            
            if response.status_code == 200:
                contacts = response.json()
                if len(contacts) == 7:
                    # Verify all required roles are present
                    found_roles = set(contact.get("role") for contact in contacts)
                    missing_roles = set(required_roles) - found_roles
                    
                    if not missing_roles:
                        results["get_contacts_populated"] = True
                        self.log_test("GET Contacts - All Added", True, f"Retrieved {len(contacts)} contacts with all required roles")
                    else:
                        results["get_contacts_populated"] = False
                        self.log_test("GET Contacts - All Added", False, f"Missing roles: {missing_roles}")
                else:
                    results["get_contacts_populated"] = False
                    self.log_test("GET Contacts - All Added", False, f"Expected 7 contacts, got {len(contacts)}")
            else:
                results["get_contacts_populated"] = False
                self.log_test("GET Contacts - All Added", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            results["get_contacts_populated"] = False
            self.log_test("GET Contacts - All Added", False, f"Exception: {str(e)}")

        # Test 4: POST /api/projects/{project_id}/contacts/validate - Should pass with all roles
        try:
            response = self.session.post(f"{BASE_URL}/projects/{self.test_project_id}/contacts/validate")
            
            if response.status_code == 200:
                validation_result = response.json()
                if validation_result.get("valid") == True and not validation_result.get("missing_roles"):
                    results["validate_complete"] = True
                    self.log_test("Validate Contacts - Complete", True, "All required roles are filled")
                else:
                    results["validate_complete"] = False
                    self.log_test("Validate Contacts - Complete", False, f"Validation failed: {validation_result}")
            else:
                results["validate_complete"] = False
                self.log_test("Validate Contacts - Complete", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            results["validate_complete"] = False
            self.log_test("Validate Contacts - Complete", False, f"Exception: {str(e)}")

        # Test 5: PUT /api/projects/{project_id}/contacts/{contact_index} - Update a contact
        try:
            # Update the first contact (architect)
            update_data = {
                "name": "John Smith Jr.",
                "phone_mobile": "+1234567899",
                "notes": "Updated lead architect for the project"
            }
            
            response = self.session.put(f"{BASE_URL}/projects/{self.test_project_id}/contacts/0", json=update_data)
            
            if response.status_code == 200:
                result_data = response.json()
                results["update_contact"] = True
                self.log_test("PUT Contact - Update", True, f"Updated contact: {result_data.get('message', 'Success')}")
            else:
                results["update_contact"] = False
                self.log_test("PUT Contact - Update", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            results["update_contact"] = False
            self.log_test("PUT Contact - Update", False, f"Exception: {str(e)}")

        # Test 6: DELETE /api/projects/{project_id}/contacts/{contact_index} - Remove a contact
        try:
            # Delete the last contact (operations_head)
            response = self.session.delete(f"{BASE_URL}/projects/{self.test_project_id}/contacts/6")
            
            if response.status_code == 200:
                results["delete_contact"] = True
                self.log_test("DELETE Contact", True, "Successfully deleted contact")
            else:
                results["delete_contact"] = False
                self.log_test("DELETE Contact", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            results["delete_contact"] = False
            self.log_test("DELETE Contact", False, f"Exception: {str(e)}")

        # Test 7: POST /api/projects/{project_id}/contacts/validate - Should fail with missing role
        try:
            response = self.session.post(f"{BASE_URL}/projects/{self.test_project_id}/contacts/validate")
            
            if response.status_code == 200:
                validation_result = response.json()
                if validation_result.get("valid") == False and "operations_head" in validation_result.get("missing_roles", []):
                    results["validate_incomplete"] = True
                    self.log_test("Validate Contacts - Incomplete", True, f"Correctly identified missing role: {validation_result.get('missing_roles')}")
                else:
                    results["validate_incomplete"] = False
                    self.log_test("Validate Contacts - Incomplete", False, f"Validation should have failed: {validation_result}")
            else:
                results["validate_incomplete"] = False
                self.log_test("Validate Contacts - Incomplete", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            results["validate_incomplete"] = False
            self.log_test("Validate Contacts - Incomplete", False, f"Exception: {str(e)}")

        return results

    def test_gantt_share_apis(self) -> Dict[str, bool]:
        """Test all Gantt Share Link APIs"""
        results = {}
        share_token = None
        share_token_with_password = None
        
        # Test 1: POST /api/projects/{project_id}/gantt-share - Create share link without password
        try:
            share_data = {
                "permissions": ["view_only", "downloadable"],
                "show_contacts": True,
                "expires_at": (datetime.utcnow() + timedelta(days=30)).isoformat()
            }
            
            response = self.session.post(f"{BASE_URL}/projects/{self.test_project_id}/gantt-share", json=share_data)
            
            if response.status_code == 200:
                share_result = response.json()
                share_token = share_result.get("token")
                if share_token and len(share_token) > 20:  # Token should be 32 bytes urlsafe
                    results["create_share_no_password"] = True
                    self.log_test("POST Gantt Share - No Password", True, f"Created share link with token: {share_token[:10]}...")
                else:
                    results["create_share_no_password"] = False
                    self.log_test("POST Gantt Share - No Password", False, f"Invalid token generated: {share_token}")
            else:
                results["create_share_no_password"] = False
                self.log_test("POST Gantt Share - No Password", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            results["create_share_no_password"] = False
            self.log_test("POST Gantt Share - No Password", False, f"Exception: {str(e)}")

        # Test 2: POST /api/projects/{project_id}/gantt-share - Create share link with password
        try:
            share_data_with_password = {
                "permissions": ["view_only", "downloadable", "embeddable"],
                "show_contacts": False,
                "password": "secure123",
                "expires_at": (datetime.utcnow() + timedelta(days=7)).isoformat()
            }
            
            response = self.session.post(f"{BASE_URL}/projects/{self.test_project_id}/gantt-share", json=share_data_with_password)
            
            if response.status_code == 200:
                share_result = response.json()
                share_token_with_password = share_result.get("token")
                has_password = share_result.get("has_password", False)
                
                if share_token_with_password and has_password:
                    results["create_share_with_password"] = True
                    self.log_test("POST Gantt Share - With Password", True, f"Created password-protected share link")
                else:
                    results["create_share_with_password"] = False
                    self.log_test("POST Gantt Share - With Password", False, f"Password protection not working: has_password={has_password}")
            else:
                results["create_share_with_password"] = False
                self.log_test("POST Gantt Share - With Password", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            results["create_share_with_password"] = False
            self.log_test("POST Gantt Share - With Password", False, f"Exception: {str(e)}")

        # Test 3: GET /api/projects/{project_id}/gantt-share - List all share links
        try:
            response = self.session.get(f"{BASE_URL}/projects/{self.test_project_id}/gantt-share")
            
            if response.status_code == 200:
                share_links = response.json()
                if len(share_links) >= 2:  # Should have at least 2 links created above
                    results["list_share_links"] = True
                    self.log_test("GET Gantt Share Links", True, f"Retrieved {len(share_links)} share links")
                else:
                    results["list_share_links"] = False
                    self.log_test("GET Gantt Share Links", False, f"Expected at least 2 links, got {len(share_links)}")
            else:
                results["list_share_links"] = False
                self.log_test("GET Gantt Share Links", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            results["list_share_links"] = False
            self.log_test("GET Gantt Share Links", False, f"Exception: {str(e)}")

        # Test 4: GET /api/projects/{project_id}/gantt-share/{token} - Access via token (no password)
        if share_token:
            try:
                # Create a new session without auth for public access
                public_session = requests.Session()
                response = public_session.get(f"{BASE_URL}/projects/{self.test_project_id}/gantt-share/{share_token}")
                
                if response.status_code == 200:
                    gantt_data = response.json()
                    if "project" in gantt_data and "tasks" in gantt_data and "milestones" in gantt_data:
                        results["access_share_no_password"] = True
                        self.log_test("GET Gantt Share Access - No Password", True, "Successfully accessed Gantt data via share link")
                    else:
                        results["access_share_no_password"] = False
                        self.log_test("GET Gantt Share Access - No Password", False, f"Invalid Gantt data structure: {list(gantt_data.keys())}")
                else:
                    results["access_share_no_password"] = False
                    self.log_test("GET Gantt Share Access - No Password", False, f"Status: {response.status_code}", response.text)
            except Exception as e:
                results["access_share_no_password"] = False
                self.log_test("GET Gantt Share Access - No Password", False, f"Exception: {str(e)}")

        # Test 5: GET /api/projects/{project_id}/gantt-share/{token} - Access with wrong password (should fail)
        if share_token_with_password:
            try:
                public_session = requests.Session()
                response = public_session.get(f"{BASE_URL}/projects/{self.test_project_id}/gantt-share/{share_token_with_password}?password=wrongpassword")
                
                if response.status_code == 403:
                    results["access_share_wrong_password"] = True
                    self.log_test("GET Gantt Share Access - Wrong Password", True, "Correctly rejected wrong password")
                else:
                    results["access_share_wrong_password"] = False
                    self.log_test("GET Gantt Share Access - Wrong Password", False, f"Should have rejected wrong password, got status: {response.status_code}")
            except Exception as e:
                results["access_share_wrong_password"] = False
                self.log_test("GET Gantt Share Access - Wrong Password", False, f"Exception: {str(e)}")

        # Test 6: GET /api/projects/{project_id}/gantt-share/{token} - Access with correct password
        if share_token_with_password:
            try:
                public_session = requests.Session()
                response = public_session.get(f"{BASE_URL}/projects/{self.test_project_id}/gantt-share/{share_token_with_password}?password=secure123")
                
                if response.status_code == 200:
                    gantt_data = response.json()
                    if "project" in gantt_data and "permissions" in gantt_data:
                        results["access_share_correct_password"] = True
                        self.log_test("GET Gantt Share Access - Correct Password", True, "Successfully accessed password-protected Gantt data")
                    else:
                        results["access_share_correct_password"] = False
                        self.log_test("GET Gantt Share Access - Correct Password", False, f"Invalid data structure: {list(gantt_data.keys())}")
                else:
                    results["access_share_correct_password"] = False
                    self.log_test("GET Gantt Share Access - Correct Password", False, f"Status: {response.status_code}", response.text)
            except Exception as e:
                results["access_share_correct_password"] = False
                self.log_test("GET Gantt Share Access - Correct Password", False, f"Exception: {str(e)}")

        # Test 7: DELETE /api/projects/{project_id}/gantt-share/{token} - Revoke share link
        if share_token:
            try:
                response = self.session.delete(f"{BASE_URL}/projects/{self.test_project_id}/gantt-share/{share_token}")
                
                if response.status_code == 200:
                    results["revoke_share_link"] = True
                    self.log_test("DELETE Gantt Share - Revoke", True, "Successfully revoked share link")
                else:
                    results["revoke_share_link"] = False
                    self.log_test("DELETE Gantt Share - Revoke", False, f"Status: {response.status_code}", response.text)
            except Exception as e:
                results["revoke_share_link"] = False
                self.log_test("DELETE Gantt Share - Revoke", False, f"Exception: {str(e)}")

        # Test 8: Verify revoked link is inaccessible
        if share_token and results.get("revoke_share_link"):
            try:
                public_session = requests.Session()
                response = public_session.get(f"{BASE_URL}/projects/{self.test_project_id}/gantt-share/{share_token}")
                
                if response.status_code == 404:
                    results["verify_revoked_link"] = True
                    self.log_test("Verify Revoked Link", True, "Revoked link is correctly inaccessible")
                else:
                    results["verify_revoked_link"] = False
                    self.log_test("Verify Revoked Link", False, f"Revoked link still accessible, status: {response.status_code}")
            except Exception as e:
                results["verify_revoked_link"] = False
                self.log_test("Verify Revoked Link", False, f"Exception: {str(e)}")

        return results

    def run_all_tests(self):
        """Run all tests and generate summary"""
        print("=" * 80)
        print("BACKEND API TESTING - PROJECT CONTACT HIERARCHY & GANTT SHARE LINKS")
        print("=" * 80)
        print()
        
        # Step 1: Authentication
        if not self.authenticate():
            print("❌ CRITICAL: Authentication failed. Cannot proceed with tests.")
            return False
        
        # Step 2: Setup test project
        if not self.setup_test_project():
            print("❌ CRITICAL: Test project setup failed. Cannot proceed with tests.")
            return False
        
        print("=" * 50)
        print("TESTING PROJECT CONTACT HIERARCHY APIS")
        print("=" * 50)
        
        # Step 3: Test Project Contact Hierarchy APIs
        contact_results = self.test_project_contacts_apis()
        
        print("=" * 50)
        print("TESTING GANTT SHARE LINK APIS")
        print("=" * 50)
        
        # Step 4: Test Gantt Share Link APIs
        gantt_results = self.test_gantt_share_apis()
        
        # Generate summary
        print("=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        
        total_tests = 0
        passed_tests = 0
        
        print("\n📋 PROJECT CONTACT HIERARCHY RESULTS:")
        for test_name, success in contact_results.items():
            total_tests += 1
            if success:
                passed_tests += 1
            status = "✅ PASS" if success else "❌ FAIL"
            print(f"  {status}: {test_name}")
        
        print("\n🔗 GANTT SHARE LINK RESULTS:")
        for test_name, success in gantt_results.items():
            total_tests += 1
            if success:
                passed_tests += 1
            status = "✅ PASS" if success else "❌ FAIL"
            print(f"  {status}: {test_name}")
        
        success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        
        print(f"\n📊 OVERALL RESULTS:")
        print(f"   Total Tests: {total_tests}")
        print(f"   Passed: {passed_tests}")
        print(f"   Failed: {total_tests - passed_tests}")
        print(f"   Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print(f"\n🎉 EXCELLENT: {success_rate:.1f}% success rate - APIs are working well!")
        elif success_rate >= 60:
            print(f"\n⚠️  GOOD: {success_rate:.1f}% success rate - Minor issues detected")
        else:
            print(f"\n🚨 CRITICAL: {success_rate:.1f}% success rate - Major issues detected")
        
        return success_rate >= 60

def main():
    """Main test execution"""
    tester = ContactGanttTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n✅ Backend testing completed successfully!")
        return True
    else:
        print("\n❌ Backend testing completed with critical issues!")
        return False

if __name__ == "__main__":
    main()