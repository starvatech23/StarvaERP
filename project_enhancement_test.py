#!/usr/bin/env python3
"""
Backend API Testing Suite for Project Enhancement Features
Tests the enhanced project APIs with task counts and manager phone integration.
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List

# Configuration
BACKEND_URL = "https://construction-hub-77.preview.emergentagent.com/api"
TEST_USER_EMAIL = "admin@buildflow.com"
TEST_USER_PASSWORD = "admin123"

class ProjectEnhancementTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.auth_token = None
        self.test_data = {}
        self.results = []
        
    def log_result(self, test_name: str, success: bool, message: str, details: Dict = None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details or {},
            "timestamp": datetime.now().isoformat()
        }
        self.results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def authenticate(self) -> bool:
        """Authenticate and get access token"""
        try:
            # Try to register first (in case user doesn't exist)
            register_data = {
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD,
                "full_name": "Test Admin",
                "role": "admin",
                "auth_type": "email"
            }
            
            # Try login first
            login_data = {
                "identifier": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD,
                "auth_type": "email"
            }
            
            response = requests.post(f"{self.base_url}/auth/login", json=login_data)
            
            if response.status_code != 200:
                # Try registration if login fails
                response = requests.post(f"{self.base_url}/auth/register", json=register_data)
            
            if response.status_code in [200, 201]:
                data = response.json()
                self.auth_token = data["access_token"]
                self.log_result("Authentication", True, "Successfully authenticated")
                return True
            else:
                self.log_result("Authentication", False, f"Failed to authenticate: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Authentication", False, f"Authentication error: {str(e)}")
            return False
    
    def get_headers(self) -> Dict[str, str]:
        """Get headers with authentication"""
        return {
            "Authorization": f"Bearer {self.auth_token}",
            "Content-Type": "application/json"
        }
    
    def create_test_user(self, role: str = "project_manager") -> Optional[str]:
        """Create a test user and return user ID"""
        try:
            import random
            timestamp = int(datetime.now().timestamp() * 1000000)  # More unique timestamp
            random_suffix = random.randint(1000, 9999)
            user_data = {
                "email": f"testpm_{timestamp}_{random_suffix}@test.com",
                "password": "testpass123",
                "full_name": f"Test Project Manager {timestamp}",
                "role": role,
                "phone": f"+91987654{(timestamp + random_suffix) % 10000}",
                "auth_type": "email"
            }
            
            response = requests.post(f"{self.base_url}/auth/register", json=user_data)
            if response.status_code in [200, 201]:
                data = response.json()
                user_id = data["user"]["id"]
                self.test_data[f"test_user_{role}"] = {
                    "id": user_id,
                    "email": user_data["email"],
                    "phone": user_data["phone"],
                    "full_name": user_data["full_name"]
                }
                print(f"Created test user {role}: {user_id}")
                return user_id
            else:
                print(f"Failed to create test user: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"Error creating test user: {e}")
            return None
    
    def create_test_project(self, project_manager_id: Optional[str] = None) -> Optional[str]:
        """Create a test project and return project ID"""
        try:
            timestamp = int(datetime.now().timestamp())
            project_data = {
                "name": f"Test Project {timestamp}",
                "location": "Test City",
                "address": "123 Test Street, Test City",
                "client_name": "Test Client Corp",
                "client_contact": "+91-9876543210",
                "status": "planning",
                "budget": 500000.0,
                "description": "Test project for API testing"
            }
            
            if project_manager_id:
                project_data["project_manager_id"] = project_manager_id
            
            response = requests.post(f"{self.base_url}/projects", 
                                   json=project_data, 
                                   headers=self.get_headers())
            
            if response.status_code in [200, 201]:
                data = response.json()
                project_id = data["id"]
                self.test_data["test_project"] = {
                    "id": project_id,
                    "name": project_data["name"],
                    "project_manager_id": project_manager_id
                }
                return project_id
            return None
        except Exception as e:
            print(f"Error creating test project: {e}")
            return None
    
    def create_test_tasks(self, project_id: str, count: int = 5) -> List[str]:
        """Create test tasks for a project"""
        task_ids = []
        try:
            for i in range(count):
                task_data = {
                    "title": f"Test Task {i+1}",
                    "description": f"Description for test task {i+1}",
                    "project_id": project_id,
                    "status": "completed" if i < 2 else "pending",  # 2 completed, 3 pending
                    "priority": "medium"
                }
                
                response = requests.post(f"{self.base_url}/tasks", 
                                       json=task_data, 
                                       headers=self.get_headers())
                
                if response.status_code in [200, 201]:
                    data = response.json()
                    task_ids.append(data["id"])
            
            self.test_data["test_tasks"] = {
                "ids": task_ids,
                "total": count,
                "completed": 2
            }
            return task_ids
        except Exception as e:
            print(f"Error creating test tasks: {e}")
            return []
    
    def test_get_all_projects_enhanced(self):
        """Test GET /api/projects with enhanced fields"""
        try:
            response = requests.get(f"{self.base_url}/projects", headers=self.get_headers())
            
            if response.status_code != 200:
                self.log_result("GET /api/projects", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return
            
            projects = response.json()
            if not projects:
                self.log_result("GET /api/projects", False, "No projects found in response")
                return
            
            # Check first project for enhanced fields
            project = projects[0]
            
            # Check for required enhanced fields
            has_manager_phone = "manager_phone" in project
            has_task_count = "task_count" in project
            
            if has_task_count and project["task_count"]:
                has_total_count = "total" in project["task_count"]
                has_completed_count = "completed" in project["task_count"]
                task_count_valid = has_total_count and has_completed_count
            else:
                task_count_valid = False
            
            success = has_manager_phone and has_task_count and task_count_valid
            
            details = {
                "projects_count": len(projects),
                "sample_project_id": project.get("id"),
                "has_manager_phone": has_manager_phone,
                "manager_phone_value": project.get("manager_phone"),
                "has_task_count": has_task_count,
                "task_count_structure": project.get("task_count"),
                "task_count_valid": task_count_valid
            }
            
            message = "Enhanced fields present and valid" if success else "Missing or invalid enhanced fields"
            self.log_result("GET /api/projects", success, message, details)
            
        except Exception as e:
            self.log_result("GET /api/projects", False, f"Exception: {str(e)}")
    
    def test_get_single_project_enhanced(self):
        """Test GET /api/projects/{id} with enhanced fields"""
        try:
            # Use test project if available, otherwise get first project
            project_id = self.test_data.get("test_project", {}).get("id")
            
            if not project_id:
                # Get first available project
                response = requests.get(f"{self.base_url}/projects", headers=self.get_headers())
                if response.status_code == 200:
                    projects = response.json()
                    if projects:
                        project_id = projects[0]["id"]
            
            if not project_id:
                self.log_result("GET /api/projects/{id}", False, "No project ID available for testing")
                return
            
            response = requests.get(f"{self.base_url}/projects/{project_id}", headers=self.get_headers())
            
            if response.status_code != 200:
                self.log_result("GET /api/projects/{id}", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return
            
            project = response.json()
            
            # Check for enhanced fields
            has_manager_phone = "manager_phone" in project
            has_task_count = "task_count" in project
            
            if has_task_count and project["task_count"]:
                has_total_count = "total" in project["task_count"]
                has_completed_count = "completed" in project["task_count"]
                task_count_valid = has_total_count and has_completed_count
            else:
                task_count_valid = False
            
            success = has_manager_phone and has_task_count and task_count_valid
            
            details = {
                "project_id": project_id,
                "project_name": project.get("name"),
                "has_manager_phone": has_manager_phone,
                "manager_phone_value": project.get("manager_phone"),
                "has_task_count": has_task_count,
                "task_count_structure": project.get("task_count"),
                "task_count_valid": task_count_valid
            }
            
            message = "Single project enhanced fields valid" if success else "Missing or invalid enhanced fields"
            self.log_result("GET /api/projects/{id}", success, message, details)
            
        except Exception as e:
            self.log_result("GET /api/projects/{id}", False, f"Exception: {str(e)}")
    
    def test_create_project_enhanced(self):
        """Test POST /api/projects with enhanced fields"""
        try:
            # Create a test project manager first
            pm_id = self.create_test_user("project_manager")
            
            if not pm_id:
                self.log_result("POST /api/projects", False, "Failed to create test project manager")
                return
            
            timestamp = int(datetime.now().timestamp())
            project_data = {
                "name": f"Enhanced Test Project {timestamp}",
                "location": "Enhanced Test City",
                "address": "456 Enhanced Street, Test City",
                "client_name": "Enhanced Test Client",
                "client_contact": "+91-9876543211",
                "status": "planning",
                "budget": 750000.0,
                "description": "Enhanced project for testing new fields",
                "project_manager_id": pm_id
            }
            
            response = requests.post(f"{self.base_url}/projects", 
                                   json=project_data, 
                                   headers=self.get_headers())
            
            if response.status_code not in [200, 201]:
                self.log_result("POST /api/projects", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return
            
            project = response.json()
            
            # Check enhanced fields in response
            has_manager_phone = "manager_phone" in project
            has_task_count = "task_count" in project
            
            # For new project, task count should be 0/0
            if has_task_count and project["task_count"]:
                total_count = project["task_count"].get("total", -1)
                completed_count = project["task_count"].get("completed", -1)
                task_count_correct = total_count == 0 and completed_count == 0
            else:
                task_count_correct = False
            
            # Manager phone should be populated since we provided project_manager_id
            pm_data = self.test_data.get("test_user_project_manager", {})
            expected_phone = pm_data.get("phone")
            manager_phone_correct = project.get("manager_phone") == expected_phone
            
            success = has_manager_phone and has_task_count and task_count_correct and manager_phone_correct
            
            details = {
                "project_id": project.get("id"),
                "project_name": project.get("name"),
                "project_manager_id": pm_id,
                "expected_phone": expected_phone,
                "has_manager_phone": has_manager_phone,
                "manager_phone_value": project.get("manager_phone"),
                "manager_phone_correct": manager_phone_correct,
                "has_task_count": has_task_count,
                "task_count_structure": project.get("task_count"),
                "task_count_correct": task_count_correct
            }
            
            message = "Project creation with enhanced fields successful" if success else "Enhanced fields missing or incorrect"
            self.log_result("POST /api/projects", success, message, details)
            
            # Store for further testing
            if success:
                self.test_data["enhanced_project"] = {
                    "id": project["id"],
                    "name": project["name"],
                    "project_manager_id": pm_id
                }
            
        except Exception as e:
            self.log_result("POST /api/projects", False, f"Exception: {str(e)}")
    
    def test_update_project_enhanced(self):
        """Test PUT /api/projects/{id} with enhanced fields"""
        try:
            # Use enhanced project if available
            project_id = self.test_data.get("enhanced_project", {}).get("id")
            
            if not project_id:
                self.log_result("PUT /api/projects/{id}", False, "No enhanced project available for testing")
                return
            
            # Create tasks for this project first to test task count updates
            task_ids = self.create_test_tasks(project_id, 3)  # 2 completed, 1 pending
            
            if not task_ids:
                self.log_result("PUT /api/projects/{id}", False, "Failed to create test tasks")
                return
            
            # Update project
            timestamp = int(datetime.now().timestamp())
            update_data = {
                "description": f"Updated description {timestamp}",
                "budget": 800000.0
            }
            
            response = requests.put(f"{self.base_url}/projects/{project_id}", 
                                  json=update_data, 
                                  headers=self.get_headers())
            
            if response.status_code != 200:
                self.log_result("PUT /api/projects/{id}", False, 
                              f"HTTP {response.status_code}: {response.text}")
                return
            
            project = response.json()
            
            # Check enhanced fields
            has_manager_phone = "manager_phone" in project
            has_task_count = "task_count" in project
            
            # Task count should reflect actual tasks (3 total, 2 completed)
            if has_task_count and project["task_count"]:
                total_count = project["task_count"].get("total", -1)
                completed_count = project["task_count"].get("completed", -1)
                task_count_correct = total_count == 3 and completed_count == 2
            else:
                task_count_correct = False
            
            success = has_manager_phone and has_task_count and task_count_correct
            
            details = {
                "project_id": project_id,
                "created_tasks": len(task_ids),
                "has_manager_phone": has_manager_phone,
                "manager_phone_value": project.get("manager_phone"),
                "has_task_count": has_task_count,
                "task_count_structure": project.get("task_count"),
                "expected_total": 3,
                "expected_completed": 2,
                "actual_total": project.get("task_count", {}).get("total"),
                "actual_completed": project.get("task_count", {}).get("completed"),
                "task_count_correct": task_count_correct
            }
            
            message = "Project update with enhanced fields successful" if success else "Enhanced fields missing or incorrect after update"
            self.log_result("PUT /api/projects/{id}", success, message, details)
            
        except Exception as e:
            self.log_result("PUT /api/projects/{id}", False, f"Exception: {str(e)}")
    
    def test_task_count_accuracy(self):
        """Test task count accuracy by creating and modifying tasks"""
        try:
            # Create a new project for this test
            pm_id = self.create_test_user("project_manager")
            if not pm_id:
                self.log_result("Task Count Accuracy", False, "Failed to create project manager")
                return
            
            project_id = self.create_test_project(pm_id)
            if not project_id:
                self.log_result("Task Count Accuracy", False, "Failed to create test project")
                return
            
            # Initially should have 0 tasks
            response = requests.get(f"{self.base_url}/projects/{project_id}", headers=self.get_headers())
            if response.status_code != 200:
                self.log_result("Task Count Accuracy", False, "Failed to get initial project state")
                return
            
            project = response.json()
            initial_total = project.get("task_count", {}).get("total", -1)
            initial_completed = project.get("task_count", {}).get("completed", -1)
            
            if initial_total != 0 or initial_completed != 0:
                self.log_result("Task Count Accuracy", False, 
                              f"Initial task count incorrect: {initial_total}/{initial_completed}, expected 0/0")
                return
            
            # Create 5 tasks (3 pending, 2 completed)
            task_ids = []
            for i in range(5):
                task_data = {
                    "title": f"Accuracy Test Task {i+1}",
                    "description": f"Task {i+1} for accuracy testing",
                    "project_id": project_id,
                    "status": "completed" if i < 2 else "pending",
                    "priority": "medium"
                }
                
                task_response = requests.post(f"{self.base_url}/tasks", 
                                            json=task_data, 
                                            headers=self.get_headers())
                
                if task_response.status_code in [200, 201]:
                    task_ids.append(task_response.json()["id"])
            
            if len(task_ids) != 5:
                self.log_result("Task Count Accuracy", False, f"Failed to create all tasks: {len(task_ids)}/5")
                return
            
            # Check updated counts
            response = requests.get(f"{self.base_url}/projects/{project_id}", headers=self.get_headers())
            if response.status_code != 200:
                self.log_result("Task Count Accuracy", False, "Failed to get updated project state")
                return
            
            project = response.json()
            final_total = project.get("task_count", {}).get("total", -1)
            final_completed = project.get("task_count", {}).get("completed", -1)
            
            # Should be 5 total, 2 completed
            counts_correct = final_total == 5 and final_completed == 2
            
            details = {
                "project_id": project_id,
                "created_tasks": len(task_ids),
                "initial_counts": f"{initial_total}/{initial_completed}",
                "final_counts": f"{final_total}/{final_completed}",
                "expected_counts": "5/2",
                "counts_correct": counts_correct
            }
            
            message = "Task count accuracy verified" if counts_correct else "Task counts do not match expected values"
            self.log_result("Task Count Accuracy", counts_correct, message, details)
            
        except Exception as e:
            self.log_result("Task Count Accuracy", False, f"Exception: {str(e)}")
    
    def test_manager_phone_population(self):
        """Test manager phone population with different scenarios"""
        try:
            # Test 1: Project with project manager
            pm_id = self.create_test_user("project_manager")
            if not pm_id:
                self.log_result("Manager Phone Population", False, "Failed to create project manager")
                return
            
            project_with_pm = self.create_test_project(pm_id)
            if not project_with_pm:
                self.log_result("Manager Phone Population", False, "Failed to create project with PM")
                return
            
            # Test 2: Project without project manager
            project_without_pm = self.create_test_project(None)
            if not project_without_pm:
                self.log_result("Manager Phone Population", False, "Failed to create project without PM")
                return
            
            # Check both projects
            response1 = requests.get(f"{self.base_url}/projects/{project_with_pm}", headers=self.get_headers())
            response2 = requests.get(f"{self.base_url}/projects/{project_without_pm}", headers=self.get_headers())
            
            if response1.status_code != 200 or response2.status_code != 200:
                self.log_result("Manager Phone Population", False, "Failed to retrieve test projects")
                return
            
            project1 = response1.json()
            project2 = response2.json()
            
            # Project with PM should have manager_phone populated
            pm_data = self.test_data.get("test_user_project_manager", {})
            expected_phone = pm_data.get("phone")
            
            has_phone_with_pm = project1.get("manager_phone") == expected_phone
            has_null_without_pm = project2.get("manager_phone") is None
            
            success = has_phone_with_pm and has_null_without_pm
            
            details = {
                "project_with_pm": project_with_pm,
                "project_without_pm": project_without_pm,
                "expected_phone": expected_phone,
                "phone_with_pm": project1.get("manager_phone"),
                "phone_without_pm": project2.get("manager_phone"),
                "has_phone_with_pm": has_phone_with_pm,
                "has_null_without_pm": has_null_without_pm
            }
            
            message = "Manager phone population working correctly" if success else "Manager phone population has issues"
            self.log_result("Manager Phone Population", success, message, details)
            
        except Exception as e:
            self.log_result("Manager Phone Population", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Backend API Tests for Project Enhancements")
        print("=" * 60)
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Run all tests
        print("\n📋 Testing Enhanced Project APIs...")
        self.test_get_all_projects_enhanced()
        self.test_get_single_project_enhanced()
        self.test_create_project_enhanced()
        self.test_update_project_enhanced()
        self.test_task_count_accuracy()
        self.test_manager_phone_population()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.results:
                if not result["success"]:
                    print(f"  • {result['test']}: {result['message']}")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = ProjectEnhancementTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)