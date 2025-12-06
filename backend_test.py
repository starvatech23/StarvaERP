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

class BackendTester:
    def __init__(self):
        self.auth_token = None
        self.test_project_id = None
        self.passed_tests = 0
        self.failed_tests = 0
        self.total_tests = 0

    def authenticate(self):
        """Authenticate with admin credentials"""
        print_header("AUTHENTICATION")
        
        # Try to find an existing admin user
        try:
            # First try to login with common admin credentials
            login_data = {
                "identifier": "admin@test.com",
                "password": "admin123",
                "auth_type": "email"
            }
            
            response = requests.post(f"{API_BASE}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data["access_token"]
                print_success(f"Authenticated as admin user: {data['user']['full_name']}")
                return True
            else:
                print_warning("Admin login failed, trying to register new admin user")
                
                # Try to register a new admin user
                register_data = {
                    "email": "admin@test.com",
                    "password": "admin123",
                    "full_name": "Test Admin",
                    "role": "admin",
                    "auth_type": "email"
                }
                
                response = requests.post(f"{API_BASE}/auth/register", json=register_data)
                
                if response.status_code == 200:
                    data = response.json()
                    self.auth_token = data["access_token"]
                    print_success(f"Registered and authenticated as new admin: {data['user']['full_name']}")
                    return True
                else:
                    print_error(f"Registration failed: {response.text}")
                    return False
                    
        except Exception as e:
            print_error(f"Authentication error: {str(e)}")
            return False

    def get_headers(self):
        """Get authorization headers"""
        return {
            "Authorization": f"Bearer {self.auth_token}",
            "Content-Type": "application/json"
        }

    def test_get_all_projects_includes_client_portal_link(self):
        """Test GET /api/projects returns client_portal_link field"""
        self.total_tests += 1
        print_info("Testing GET /api/projects - client_portal_link field inclusion")
        
        try:
            response = requests.get(f"{API_BASE}/projects", headers=self.get_headers())
            
            if response.status_code != 200:
                print_error(f"GET /api/projects failed with status {response.status_code}: {response.text}")
                self.failed_tests += 1
                return False
            
            projects = response.json()
            print_info(f"Retrieved {len(projects)} projects")
            
            # Check if projects have client_portal_link field (can be null)
            for project in projects:
                if "client_portal_link" not in project:
                    print_error(f"Project {project.get('id', 'unknown')} missing client_portal_link field")
                    self.failed_tests += 1
                    return False
                
                # If project has confirmed/active/in_progress status, it should have a link
                status = project.get("status", "").lower()
                if status in ["confirmed", "active", "in_progress"] and not project.get("client_portal_link"):
                    print_warning(f"Project {project.get('name', 'unknown')} has status '{status}' but no client_portal_link")
                elif project.get("client_portal_link"):
                    expected_format = f"https://construct-crm.preview.emergentagent.com/client-portal/?projectId={project['id']}"
                    if project["client_portal_link"] != expected_format:
                        print_error(f"Project {project.get('name', 'unknown')} has incorrect link format: {project['client_portal_link']}")
                        self.failed_tests += 1
                        return False
                    else:
                        print_success(f"Project {project.get('name', 'unknown')} has correct client portal link format")
            
            print_success("All projects include client_portal_link field with correct format")
            self.passed_tests += 1
            return True
            
        except Exception as e:
            print_error(f"Error testing GET /api/projects: {str(e)}")
            self.failed_tests += 1
            return False

    def test_get_single_project_includes_client_portal_link(self):
        """Test GET /api/projects/{id} returns client_portal_link field"""
        self.total_tests += 1
        print_info("Testing GET /api/projects/{id} - client_portal_link field inclusion")
        
        try:
            # First get all projects to find one to test
            response = requests.get(f"{API_BASE}/projects", headers=self.get_headers())
            if response.status_code != 200:
                print_error("Could not get projects list for single project test")
                self.failed_tests += 1
                return False
            
            projects = response.json()
            if not projects:
                print_warning("No projects found to test single project endpoint")
                self.failed_tests += 1
                return False
            
            # Test with first project
            project_id = projects[0]["id"]
            response = requests.get(f"{API_BASE}/projects/{project_id}", headers=self.get_headers())
            
            if response.status_code != 200:
                print_error(f"GET /api/projects/{project_id} failed with status {response.status_code}: {response.text}")
                self.failed_tests += 1
                return False
            
            project = response.json()
            
            # Check if project has client_portal_link field
            if "client_portal_link" not in project:
                print_error(f"Single project response missing client_portal_link field")
                self.failed_tests += 1
                return False
            
            # Verify link format if it exists
            if project.get("client_portal_link"):
                expected_format = f"https://construct-crm.preview.emergentagent.com/client-portal/?projectId={project['id']}"
                if project["client_portal_link"] != expected_format:
                    print_error(f"Single project has incorrect link format: {project['client_portal_link']}")
                    self.failed_tests += 1
                    return False
                else:
                    print_success(f"Single project has correct client portal link format")
            
            print_success("Single project endpoint includes client_portal_link field")
            self.passed_tests += 1
            return True
            
        except Exception as e:
            print_error(f"Error testing GET /api/projects/{{id}}: {str(e)}")
            self.failed_tests += 1
            return False

    def create_test_project(self):
        """Create a test project for status update testing"""
        print_info("Creating test project for client portal link testing")
        
        try:
            project_data = {
                "name": f"Client Portal Test Project {datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "description": "Test project for client portal link functionality",
                "status": "planning",
                "start_date": "2024-01-01T00:00:00Z",
                "end_date": "2024-12-31T23:59:59Z",
                "budget": 100000.0,
                "address": "Test Address, Test City"
            }
            
            response = requests.post(f"{API_BASE}/projects", json=project_data, headers=self.get_headers())
            
            if response.status_code != 200:
                print_error(f"Failed to create test project: {response.status_code} - {response.text}")
                return None
            
            project = response.json()
            self.test_project_id = project["id"]
            print_success(f"Created test project: {project['name']} (ID: {self.test_project_id})")
            
            # Verify it doesn't have client_portal_link initially
            if project.get("client_portal_link"):
                print_warning(f"New project unexpectedly has client_portal_link: {project['client_portal_link']}")
            else:
                print_success("New project correctly has no client_portal_link (status: planning)")
            
            return project
            
        except Exception as e:
            print_error(f"Error creating test project: {str(e)}")
            return None

    def test_client_portal_link_generation_on_status_change(self):
        """Test that client_portal_link is generated when status changes to confirmed/active/in_progress"""
        self.total_tests += 1
        print_info("Testing client portal link generation on status change")
        
        try:
            # Create test project
            project = self.create_test_project()
            if not project:
                self.failed_tests += 1
                return False
            
            project_id = project["id"]
            
            # Test 1: Update status to "confirmed" - should generate link
            print_info("Testing status change to 'confirmed'")
            update_data = {"status": "confirmed"}
            response = requests.put(f"{API_BASE}/projects/{project_id}", json=update_data, headers=self.get_headers())
            
            if response.status_code != 200:
                print_error(f"Failed to update project status: {response.status_code} - {response.text}")
                self.failed_tests += 1
                return False
            
            updated_project = response.json()
            
            # Verify client_portal_link was generated
            if not updated_project.get("client_portal_link"):
                print_error("client_portal_link was not generated when status changed to 'confirmed'")
                self.failed_tests += 1
                return False
            
            expected_link = f"https://construct-crm.preview.emergentagent.com/client-portal/?projectId={project_id}"
            if updated_project["client_portal_link"] != expected_link:
                print_error(f"Generated link format incorrect. Expected: {expected_link}, Got: {updated_project['client_portal_link']}")
                self.failed_tests += 1
                return False
            
            print_success(f"✅ Client portal link generated correctly: {updated_project['client_portal_link']}")
            
            # Test 2: Update status again - should NOT regenerate link
            print_info("Testing that link is not regenerated on subsequent updates")
            original_link = updated_project["client_portal_link"]
            
            update_data = {"status": "active"}
            response = requests.put(f"{API_BASE}/projects/{project_id}", json=update_data, headers=self.get_headers())
            
            if response.status_code != 200:
                print_error(f"Failed to update project status to active: {response.status_code} - {response.text}")
                self.failed_tests += 1
                return False
            
            updated_project = response.json()
            
            if updated_project["client_portal_link"] != original_link:
                print_error(f"Client portal link was regenerated when it shouldn't have been. Original: {original_link}, New: {updated_project['client_portal_link']}")
                self.failed_tests += 1
                return False
            
            print_success("✅ Client portal link correctly preserved on subsequent status updates")
            
            # Test 3: Verify link persists in database
            print_info("Verifying link persists in database")
            response = requests.get(f"{API_BASE}/projects/{project_id}", headers=self.get_headers())
            
            if response.status_code != 200:
                print_error(f"Failed to retrieve project: {response.status_code} - {response.text}")
                self.failed_tests += 1
                return False
            
            retrieved_project = response.json()
            
            if retrieved_project["client_portal_link"] != original_link:
                print_error(f"Client portal link not persisted in database. Expected: {original_link}, Got: {retrieved_project.get('client_portal_link')}")
                self.failed_tests += 1
                return False
            
            print_success("✅ Client portal link correctly persisted in database")
            
            self.passed_tests += 1
            return True
            
        except Exception as e:
            print_error(f"Error testing client portal link generation: {str(e)}")
            self.failed_tests += 1
            return False

    def test_client_portal_link_not_generated_for_other_statuses(self):
        """Test that client_portal_link is NOT generated for other statuses"""
        self.total_tests += 1
        print_info("Testing that client portal link is NOT generated for non-qualifying statuses")
        
        try:
            # Create test project
            project_data = {
                "name": f"No Link Test Project {datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "description": "Test project for verifying no link generation",
                "status": "planning",
                "start_date": "2024-01-01T00:00:00Z",
                "end_date": "2024-12-31T23:59:59Z",
                "budget": 50000.0,
                "address": "Test Address, Test City"
            }
            
            response = requests.post(f"{API_BASE}/projects", json=project_data, headers=self.get_headers())
            
            if response.status_code != 200:
                print_error(f"Failed to create test project: {response.status_code} - {response.text}")
                self.failed_tests += 1
                return False
            
            project = response.json()
            project_id = project["id"]
            
            # Test statuses that should NOT generate links
            non_qualifying_statuses = ["planning", "on_hold", "cancelled", "completed"]
            
            for status in non_qualifying_statuses:
                print_info(f"Testing status '{status}' - should not generate link")
                
                update_data = {"status": status}
                response = requests.put(f"{API_BASE}/projects/{project_id}", json=update_data, headers=self.get_headers())
                
                if response.status_code != 200:
                    print_error(f"Failed to update project status to {status}: {response.status_code} - {response.text}")
                    continue
                
                updated_project = response.json()
                
                if updated_project.get("client_portal_link"):
                    print_error(f"client_portal_link was unexpectedly generated for status '{status}': {updated_project['client_portal_link']}")
                    self.failed_tests += 1
                    return False
                
                print_success(f"✅ No client portal link generated for status '{status}' (correct)")
            
            self.passed_tests += 1
            return True
            
        except Exception as e:
            print_error(f"Error testing non-qualifying statuses: {str(e)}")
            self.failed_tests += 1
            return False

    def cleanup_test_projects(self):
        """Clean up test projects created during testing"""
        print_info("Cleaning up test projects")
        
        try:
            # Get all projects
            response = requests.get(f"{API_BASE}/projects", headers=self.get_headers())
            if response.status_code != 200:
                print_warning("Could not retrieve projects for cleanup")
                return
            
            projects = response.json()
            
            # Delete test projects
            deleted_count = 0
            for project in projects:
                if "Test Project" in project.get("name", "") and ("Client Portal" in project.get("name", "") or "No Link" in project.get("name", "")):
                    try:
                        delete_response = requests.delete(f"{API_BASE}/projects/{project['id']}", headers=self.get_headers())
                        if delete_response.status_code == 200:
                            deleted_count += 1
                            print_info(f"Deleted test project: {project['name']}")
                    except Exception as e:
                        print_warning(f"Could not delete test project {project['name']}: {str(e)}")
            
            if deleted_count > 0:
                print_success(f"Cleaned up {deleted_count} test projects")
            else:
                print_info("No test projects to clean up")
                
        except Exception as e:
            print_warning(f"Error during cleanup: {str(e)}")

    def run_all_tests(self):
        """Run all client portal link tests"""
        print_header("CLIENT PORTAL LINK FEATURE TESTING")
        print_info(f"Testing against: {API_BASE}")
        
        # Authenticate
        if not self.authenticate():
            print_error("Authentication failed. Cannot proceed with tests.")
            return False
        
        # Run tests
        tests = [
            ("GET /api/projects includes client_portal_link", self.test_get_all_projects_includes_client_portal_link),
            ("GET /api/projects/{id} includes client_portal_link", self.test_get_single_project_includes_client_portal_link),
            ("Client portal link generation on status change", self.test_client_portal_link_generation_on_status_change),
            ("No link generation for non-qualifying statuses", self.test_client_portal_link_not_generated_for_other_statuses),
        ]
        
        print_header("RUNNING TESTS")
        
        for test_name, test_func in tests:
            print(f"\n{Colors.BOLD}Testing: {test_name}{Colors.ENDC}")
            try:
                test_func()
            except Exception as e:
                print_error(f"Test '{test_name}' failed with exception: {str(e)}")
                self.failed_tests += 1
        
        # Cleanup
        self.cleanup_test_projects()
        
        # Print summary
        print_header("TEST SUMMARY")
        print(f"Total Tests: {self.total_tests}")
        print_success(f"Passed: {self.passed_tests}")
        if self.failed_tests > 0:
            print_error(f"Failed: {self.failed_tests}")
        else:
            print_success("Failed: 0")
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        print(f"Success Rate: {success_rate:.1f}%")
        
        if self.failed_tests == 0:
            print_success("🎉 ALL CLIENT PORTAL LINK TESTS PASSED!")
            return True
        else:
            print_error("❌ SOME TESTS FAILED")
            return False

def main():
    """Main function"""
    tester = BackendTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()