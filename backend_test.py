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
        self.base_url = BASE_URL
        self.auth_token = None
        self.test_data = {
            'users': [],
            'projects': [],
            'workers': [],
            'attendance_records': []
        }
        self.test_results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }

    def log_result(self, test_name, success, message="", response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
        if response_data and not success:
            print(f"   Response: {response_data}")
        
        if success:
            self.test_results['passed'] += 1
        else:
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"{test_name}: {message}")
        print()

    def authenticate(self):
        """Authenticate and get access token"""
        print("🔐 Authenticating...")
        
        # Try email authentication first
        auth_data = {
            "identifier": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "auth_type": "email"
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/login", json=auth_data)
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data["access_token"]
                self.log_result("Email Authentication", True, f"Logged in as {data['user']['full_name']}")
                return True
            else:
                # Try to register if login fails
                register_data = {
                    "email": TEST_USER_EMAIL,
                    "password": TEST_USER_PASSWORD,
                    "full_name": "Test Admin",
                    "role": "admin",
                    "auth_type": "email"
                }
                
                reg_response = requests.post(f"{self.base_url}/auth/register", json=register_data)
                if reg_response.status_code == 200:
                    data = reg_response.json()
                    self.auth_token = data["access_token"]
                    self.log_result("User Registration & Authentication", True, f"Registered and logged in as {data['user']['full_name']}")
                    return True
                else:
                    self.log_result("Authentication", False, f"Login failed: {response.status_code}, Register failed: {reg_response.status_code}")
                    return False
                    
        except Exception as e:
            self.log_result("Authentication", False, f"Exception: {str(e)}")
            return False

    def get_headers(self):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {self.auth_token}"}

    def test_projects_api(self):
        """Test GET /api/projects endpoint"""
        print("📋 Testing Projects API...")
        
        try:
            response = requests.get(f"{self.base_url}/projects", headers=self.get_headers())
            
            if response.status_code == 200:
                projects = response.json()
                self.log_result("GET /api/projects", True, f"Retrieved {len(projects)} projects")
                
                # Verify response structure
                if projects:
                    project = projects[0]
                    required_fields = ['id', 'name']
                    missing_fields = [field for field in required_fields if field not in project]
                    
                    if missing_fields:
                        self.log_result("Projects Response Structure", False, f"Missing fields: {missing_fields}")
                    else:
                        self.log_result("Projects Response Structure", True, "All required fields present")
                        # Store test projects
                        self.test_data['projects'] = projects[:3]  # Keep first 3 for testing
                else:
                    # Create a test project if none exist
                    self.create_test_project()
                    
            else:
                self.log_result("GET /api/projects", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("GET /api/projects", False, f"Exception: {str(e)}")

    def create_test_project(self):
        """Create a test project for testing"""
        project_data = {
            "name": "Test Construction Site",
            "location": "Mumbai",
            "address": "Test Address, Mumbai",
            "client_name": "Test Client",
            "client_contact": "+919876543210",
            "status": "in_progress",
            "budget": 1000000.0,
            "description": "Test project for labor reports"
        }
        
        try:
            response = requests.post(f"{self.base_url}/projects", json=project_data, headers=self.get_headers())
            if response.status_code == 200:
                project = response.json()
                self.test_data['projects'] = [project]
                self.log_result("Create Test Project", True, f"Created project: {project['name']}")
            else:
                self.log_result("Create Test Project", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Create Test Project", False, f"Exception: {str(e)}")

    def test_workers_api(self):
        """Test GET /api/workers endpoint"""
        print("👷 Testing Workers API...")
        
        try:
            response = requests.get(f"{self.base_url}/workers", headers=self.get_headers())
            
            if response.status_code == 200:
                workers = response.json()
                self.log_result("GET /api/workers", True, f"Retrieved {len(workers)} workers")
                
                # Verify response structure
                if workers:
                    worker = workers[0]
                    required_fields = ['id', 'full_name', 'phone', 'skill_group', 'base_rate', 'pay_scale']
                    missing_fields = [field for field in required_fields if field not in worker]
                    
                    if missing_fields:
                        self.log_result("Workers Response Structure", False, f"Missing fields: {missing_fields}")
                    else:
                        self.log_result("Workers Response Structure", True, "All required fields present")
                        # Store test workers
                        self.test_data['workers'] = workers[:3]  # Keep first 3 for testing
                else:
                    # Create test workers if none exist
                    self.create_test_workers()
                    
            else:
                self.log_result("GET /api/workers", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("GET /api/workers", False, f"Exception: {str(e)}")

    def create_test_workers(self):
        """Create test workers for testing"""
        test_workers = [
            {
                "full_name": "Rajesh Kumar",
                "phone": "+919876543211",
                "skill_group": "mason",
                "pay_scale": "daily",
                "base_rate": 800.0,
                "status": "active",
                "current_site_id": self.test_data['projects'][0]['id'] if self.test_data['projects'] else None
            },
            {
                "full_name": "Suresh Sharma",
                "phone": "+919876543212",
                "skill_group": "carpenter",
                "pay_scale": "daily",
                "base_rate": 900.0,
                "status": "active",
                "current_site_id": self.test_data['projects'][0]['id'] if self.test_data['projects'] else None
            },
            {
                "full_name": "Amit Singh",
                "phone": "+919876543213",
                "skill_group": "electrician",
                "pay_scale": "daily",
                "base_rate": 1000.0,
                "status": "active",
                "current_site_id": self.test_data['projects'][0]['id'] if self.test_data['projects'] else None
            }
        ]
        
        created_workers = []
        for worker_data in test_workers:
            try:
                response = requests.post(f"{self.base_url}/workers", json=worker_data, headers=self.get_headers())
                if response.status_code == 200:
                    worker = response.json()
                    created_workers.append(worker)
                    self.log_result(f"Create Test Worker: {worker_data['full_name']}", True, f"Created worker with ID: {worker['id']}")
                else:
                    self.log_result(f"Create Test Worker: {worker_data['full_name']}", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_result(f"Create Test Worker: {worker_data['full_name']}", False, f"Exception: {str(e)}")
        
        self.test_data['workers'] = created_workers

    def test_labor_attendance_api(self):
        """Test GET /api/labor-attendance endpoint"""
        print("📅 Testing Labor Attendance API...")
        
        try:
            response = requests.get(f"{self.base_url}/labor-attendance", headers=self.get_headers())
            
            if response.status_code == 200:
                attendance_records = response.json()
                self.log_result("GET /api/labor-attendance", True, f"Retrieved {len(attendance_records)} attendance records")
                
                # Verify response structure
                if attendance_records:
                    record = attendance_records[0]
                    required_fields = ['id', 'worker_id', 'worker_name', 'worker_skill', 'project_id', 'project_name', 
                                     'attendance_date', 'status', 'hours_worked', 'overtime_hours', 'wages_earned']
                    missing_fields = [field for field in required_fields if field not in record]
                    
                    if missing_fields:
                        self.log_result("Labor Attendance Response Structure", False, f"Missing fields: {missing_fields}")
                    else:
                        self.log_result("Labor Attendance Response Structure", True, "All required fields present")
                        self.test_data['attendance_records'] = attendance_records[:5]  # Keep first 5 for testing
                else:
                    # Create test attendance records if none exist
                    self.create_test_attendance_records()
                    
            else:
                self.log_result("GET /api/labor-attendance", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("GET /api/labor-attendance", False, f"Exception: {str(e)}")

    def create_test_attendance_records(self):
        """Create test attendance records"""
        if not self.test_data['workers'] or not self.test_data['projects']:
            self.log_result("Create Test Attendance Records", False, "No workers or projects available for creating attendance records")
            return
        
        # Create attendance records for the last 7 days
        created_records = []
        for i in range(7):  # Last 7 days
            date = datetime.now() - timedelta(days=i)
            
            for worker in self.test_data['workers']:
                # Vary attendance patterns
                if i % 3 == 0:  # Absent every 3rd day
                    status = "absent"
                    hours_worked = 0
                    overtime_hours = 0
                    wages_earned = 0
                elif i % 5 == 0:  # Overtime every 5th day
                    status = "present"
                    hours_worked = 8
                    overtime_hours = 2
                    wages_earned = worker['base_rate'] + (worker['base_rate'] * 0.5 * 2)  # 1.5x for overtime
                else:  # Regular day
                    status = "present"
                    hours_worked = 8
                    overtime_hours = 0
                    wages_earned = worker['base_rate']
                
                attendance_data = {
                    "worker_id": worker['id'],
                    "project_id": self.test_data['projects'][0]['id'],
                    "attendance_date": date.isoformat(),
                    "status": status,
                    "hours_worked": hours_worked,
                    "overtime_hours": overtime_hours,
                    "wages_earned": wages_earned,
                    "check_in_time": date.replace(hour=8, minute=0).isoformat() if status == "present" else None,
                    "check_out_time": date.replace(hour=17, minute=0).isoformat() if status == "present" else None
                }
                
                try:
                    response = requests.post(f"{self.base_url}/labor-attendance", json=attendance_data, headers=self.get_headers())
                    if response.status_code == 200:
                        record = response.json()
                        created_records.append(record)
                    else:
                        self.log_result(f"Create Attendance Record for {worker['full_name']}", False, f"HTTP {response.status_code}: {response.text}")
                except Exception as e:
                    self.log_result(f"Create Attendance Record for {worker['full_name']}", False, f"Exception: {str(e)}")
        
        if created_records:
            self.test_data['attendance_records'] = created_records
            self.log_result("Create Test Attendance Records", True, f"Created {len(created_records)} attendance records")

    def test_labor_attendance_filtering(self):
        """Test labor attendance API with filters"""
        print("🔍 Testing Labor Attendance API Filters...")
        
        if not self.test_data['projects'] or not self.test_data['workers']:
            self.log_result("Labor Attendance Filtering", False, "No test data available for filtering tests")
            return
        
        # Test filtering by project
        try:
            project_id = self.test_data['projects'][0]['id']
            response = requests.get(f"{self.base_url}/labor-attendance?project_id={project_id}", headers=self.get_headers())
            
            if response.status_code == 200:
                records = response.json()
                self.log_result("Filter by Project ID", True, f"Retrieved {len(records)} records for project")
            else:
                self.log_result("Filter by Project ID", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Filter by Project ID", False, f"Exception: {str(e)}")
        
        # Test filtering by worker
        try:
            worker_id = self.test_data['workers'][0]['id']
            response = requests.get(f"{self.base_url}/labor-attendance?worker_id={worker_id}", headers=self.get_headers())
            
            if response.status_code == 200:
                records = response.json()
                self.log_result("Filter by Worker ID", True, f"Retrieved {len(records)} records for worker")
            else:
                self.log_result("Filter by Worker ID", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Filter by Worker ID", False, f"Exception: {str(e)}")
        
        # Test filtering by date
        try:
            today = datetime.now().strftime("%Y-%m-%d")
            response = requests.get(f"{self.base_url}/labor-attendance?date={today}", headers=self.get_headers())
            
            if response.status_code == 200:
                records = response.json()
                self.log_result("Filter by Date", True, f"Retrieved {len(records)} records for today")
            else:
                self.log_result("Filter by Date", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Filter by Date", False, f"Exception: {str(e)}")

    def test_report_data_calculations(self):
        """Test that data can be used for report calculations"""
        print("📊 Testing Report Data Calculations...")
        
        if not self.test_data['workers'] or not self.test_data['attendance_records']:
            self.log_result("Report Data Calculations", False, "Insufficient test data for calculations")
            return
        
        try:
            # Calculate total wages earned
            total_wages = sum(record.get('wages_earned', 0) for record in self.test_data['attendance_records'])
            
            # Count attendance statuses
            status_counts = {}
            for record in self.test_data['attendance_records']:
                status = record.get('status', 'unknown')
                status_counts[status] = status_counts.get(status, 0) + 1
            
            # Calculate worker-wise totals
            worker_totals = {}
            for record in self.test_data['attendance_records']:
                worker_name = record.get('worker_name', 'Unknown')
                if worker_name not in worker_totals:
                    worker_totals[worker_name] = {
                        'total_wages': 0,
                        'days_present': 0,
                        'days_absent': 0,
                        'overtime_days': 0
                    }
                
                worker_totals[worker_name]['total_wages'] += record.get('wages_earned', 0)
                if record.get('status') == 'present':
                    worker_totals[worker_name]['days_present'] += 1
                elif record.get('status') == 'absent':
                    worker_totals[worker_name]['days_absent'] += 1
                
                if record.get('overtime_hours', 0) > 0:
                    worker_totals[worker_name]['overtime_days'] += 1
            
            # Site-wise calculations (assuming single site for test data)
            site_wages = {}
            for record in self.test_data['attendance_records']:
                project_name = record.get('project_name', 'Unknown')
                site_wages[project_name] = site_wages.get(project_name, 0) + record.get('wages_earned', 0)
            
            self.log_result("Report Data Calculations", True, 
                          f"Calculated: Total wages: ₹{total_wages}, Status counts: {status_counts}, "
                          f"Workers: {len(worker_totals)}, Sites: {len(site_wages)}")
            
        except Exception as e:
            self.log_result("Report Data Calculations", False, f"Exception: {str(e)}")

    def test_authentication_requirements(self):
        """Test that APIs require proper authentication"""
        print("🔒 Testing Authentication Requirements...")
        
        # Test without auth token
        try:
            response = requests.get(f"{self.base_url}/workers")
            if response.status_code == 401 or response.status_code == 403:
                self.log_result("Workers API Authentication", True, "Properly requires authentication")
            else:
                self.log_result("Workers API Authentication", False, f"Expected 401/403, got {response.status_code}")
        except Exception as e:
            self.log_result("Workers API Authentication", False, f"Exception: {str(e)}")
        
        try:
            response = requests.get(f"{self.base_url}/labor-attendance")
            if response.status_code == 401 or response.status_code == 403:
                self.log_result("Labor Attendance API Authentication", True, "Properly requires authentication")
            else:
                self.log_result("Labor Attendance API Authentication", False, f"Expected 401/403, got {response.status_code}")
        except Exception as e:
            self.log_result("Labor Attendance API Authentication", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all test scenarios"""
        print("🚀 Starting Labor Reports Backend API Tests")
        print("=" * 60)
        
        # Step 1: Authentication
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return
        
        # Step 2: Test Projects API
        self.test_projects_api()
        
        # Step 3: Test Workers API
        self.test_workers_api()
        
        # Step 4: Test Labor Attendance API
        self.test_labor_attendance_api()
        
        # Step 5: Test API Filtering
        self.test_labor_attendance_filtering()
        
        # Step 6: Test Report Calculations
        self.test_report_data_calculations()
        
        # Step 7: Test Authentication Requirements
        self.test_authentication_requirements()
        
        # Print Summary
        print("=" * 60)
        print("📋 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {self.test_results['passed']}")
        print(f"❌ Failed: {self.test_results['failed']}")
        
        if self.test_results['errors']:
            print("\n🔍 FAILED TESTS:")
            for error in self.test_results['errors']:
                print(f"   • {error}")
        
        success_rate = (self.test_results['passed'] / (self.test_results['passed'] + self.test_results['failed'])) * 100
        print(f"\n📊 Success Rate: {success_rate:.1f}%")
        
        if self.test_results['failed'] == 0:
            print("\n🎉 All tests passed! Labor Reports backend APIs are working correctly.")
        else:
            print(f"\n⚠️  {self.test_results['failed']} test(s) failed. Please review the issues above.")

if __name__ == "__main__":
    tester = LaborReportsAPITester()
    tester.run_all_tests()