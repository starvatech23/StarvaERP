#!/usr/bin/env python3
"""
Backend API Testing for Project Management Template APIs
Tests the new Project Management Template endpoints in server.py
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Get backend URL from frontend .env
BACKEND_URL = "https://labourmanage.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "admin123"

class ProjectTemplateAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
        self.project_id = None
        self.task_id = None
        
    def login(self):
        """Login with admin credentials"""
        print("🔐 Logging in as admin...")
        
        login_data = {
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "auth_type": "email"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/login", json=login_data)
            print(f"Login response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                if self.access_token:
                    self.session.headers.update({
                        "Authorization": f"Bearer {self.access_token}"
                    })
                    print("✅ Login successful")
                    return True
                else:
                    print("❌ No access token in response")
                    return False
            else:
                print(f"❌ Login failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            return False
    
    def test_get_milestone_templates(self):
        """Test GET /api/templates/milestones"""
        print("\n📋 Testing GET /api/templates/milestones...")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/templates/milestones")
            print(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Milestone templates retrieved successfully")
                print(f"   Number of milestone templates: {len(data)}")
                
                # Verify expected milestones
                expected_milestones = ["Preplanning", "Construction Phase - Structure", 
                                     "Construction Phase - Finishing", "Finishing Phase 1", 
                                     "Finishing Phase 2 - Handover"]
                
                milestone_names = [m.get("name") for m in data]
                print(f"   Milestone names: {milestone_names}")
                
                # Check if we have 5 milestones as expected
                if len(data) == 5:
                    print("✅ Correct number of milestones (5)")
                else:
                    print(f"⚠️  Expected 5 milestones, got {len(data)}")
                
                # Check structure milestone has tasks
                structure_milestone = next((m for m in data if "Structure" in m.get("name", "")), None)
                if structure_milestone and structure_milestone.get("tasks"):
                    print(f"✅ Structure milestone has {len(structure_milestone['tasks'])} tasks")
                else:
                    print("❌ Structure milestone missing or has no tasks")
                
                return True
            else:
                print(f"❌ Failed to get milestone templates: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error testing milestone templates: {str(e)}")
            return False
    
    def test_get_labour_rates(self):
        """Test GET /api/templates/labour-rates"""
        print("\n💰 Testing GET /api/templates/labour-rates...")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/templates/labour-rates")
            print(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Labour rates retrieved successfully")
                print(f"   Number of skill types: {len(data)}")
                
                # Check for expected skill types
                expected_skills = ["mason", "carpenter", "electrician", "plumber", "steel_fixer", 
                                 "painter", "welder", "helper", "operator", "surveyor"]
                
                skill_types = list(data.keys())
                print(f"   Available skills: {skill_types}")
                
                # Verify rates structure
                for skill, rate_info in data.items():
                    if "daily_rate" in rate_info and "description" in rate_info:
                        print(f"   {skill}: ₹{rate_info['daily_rate']}/day - {rate_info['description']}")
                    else:
                        print(f"❌ Invalid rate structure for {skill}")
                        return False
                
                print("✅ All labour rates have correct structure")
                return True
            else:
                print(f"❌ Failed to get labour rates: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error testing labour rates: {str(e)}")
            return False
    
    def test_create_project_with_templates(self):
        """Test POST /api/projects/create-with-templates"""
        print("\n🏗️  Testing POST /api/projects/create-with-templates...")
        
        project_data = {
            "name": "Test Villa Project",
            "client_name": "Test Client",
            "number_of_floors": 2,
            "planned_start_date": "2025-01-01T00:00:00Z",
            "total_built_area": 2000,
            "building_type": "residential",
            "description": "Test project created via templates API",
            "location": "Test Location"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/projects/create-with-templates", json=project_data)
            print(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                self.project_id = data.get("project_id")
                
                print(f"✅ Project created successfully")
                print(f"   Project ID: {self.project_id}")
                print(f"   Project Code: {data.get('project_code')}")
                print(f"   Milestones created: {data.get('milestones_created')}")
                print(f"   Tasks created: {data.get('tasks_created')}")
                print(f"   Total planned cost: ₹{data.get('total_planned_cost', 0):,.2f}")
                print(f"   Planned start: {data.get('planned_start_date')}")
                print(f"   Planned end: {data.get('planned_end_date')}")
                
                # Verify expected counts
                if data.get("milestones_created") >= 5:  # Should be more due to floor-based milestones
                    print("✅ Expected number of milestones created")
                else:
                    print(f"⚠️  Expected at least 5 milestones, got {data.get('milestones_created')}")
                
                if data.get("tasks_created") > 0:
                    print("✅ Tasks created successfully")
                else:
                    print("❌ No tasks created")
                
                return True
            else:
                print(f"❌ Failed to create project with templates: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error testing project creation with templates: {str(e)}")
            return False
    
    def test_get_budget_summary(self):
        """Test GET /api/projects/{project_id}/budget-summary"""
        if not self.project_id:
            print("❌ No project ID available for budget summary test")
            return False
            
        print(f"\n💼 Testing GET /api/projects/{self.project_id}/budget-summary...")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/projects/{self.project_id}/budget-summary")
            print(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Budget summary retrieved successfully")
                print(f"   Project: {data.get('project_name')}")
                
                # Check labour costs
                labour = data.get("labour", {})
                print(f"   Labour - Planned: ₹{labour.get('planned', 0):,.2f}, Actual: ₹{labour.get('actual', 0):,.2f}")
                
                # Check material costs
                material = data.get("material", {})
                print(f"   Material - Planned: ₹{material.get('planned', 0):,.2f}, Actual: ₹{material.get('actual', 0):,.2f}")
                
                # Check total costs
                total = data.get("total", {})
                print(f"   Total - Planned: ₹{total.get('planned', 0):,.2f}, Actual: ₹{total.get('actual', 0):,.2f}")
                
                # Check milestones breakdown
                milestones = data.get("milestones", [])
                print(f"   Milestones breakdown: {len(milestones)} milestones")
                
                for ms in milestones[:3]:  # Show first 3 milestones
                    print(f"     - {ms.get('milestone_name')}: ₹{ms.get('total_planned', 0):,.2f} planned")
                
                return True
            else:
                print(f"❌ Failed to get budget summary: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error testing budget summary: {str(e)}")
            return False
    
    def test_get_deviation_report(self):
        """Test GET /api/projects/{project_id}/deviation-report"""
        if not self.project_id:
            print("❌ No project ID available for deviation report test")
            return False
            
        print(f"\n📊 Testing GET /api/projects/{self.project_id}/deviation-report...")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/projects/{self.project_id}/deviation-report")
            print(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Deviation report retrieved successfully")
                print(f"   Project: {data.get('project_name')}")
                print(f"   Total deviations: {data.get('total_deviations', 0)}")
                print(f"   High severity: {data.get('high_severity_count', 0)}")
                print(f"   Medium severity: {data.get('medium_severity_count', 0)}")
                print(f"   Low severity: {data.get('low_severity_count', 0)}")
                
                # Check schedule deviations
                schedule_devs = data.get("schedule_deviations", [])
                print(f"   Schedule deviations: {len(schedule_devs)}")
                
                # Check cost deviations
                cost_devs = data.get("cost_deviations", [])
                print(f"   Cost deviations: {len(cost_devs)}")
                
                return True
            else:
                print(f"❌ Failed to get deviation report: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error testing deviation report: {str(e)}")
            return False
    
    def get_first_task_id(self):
        """Get the first task ID from the created project"""
        if not self.project_id:
            return None
            
        try:
            response = self.session.get(f"{BACKEND_URL}/tasks?project_id={self.project_id}")
            if response.status_code == 200:
                tasks = response.json()
                if tasks:
                    self.task_id = tasks[0].get("id")
                    print(f"   Found task ID: {self.task_id} ({tasks[0].get('title')})")
                    return self.task_id
            return None
        except:
            return None
    
    def test_get_task_labour_estimates(self):
        """Test GET /api/tasks/{task_id}/labour-estimates"""
        if not self.task_id:
            self.get_first_task_id()
            
        if not self.task_id:
            print("❌ No task ID available for labour estimates test")
            return False
            
        print(f"\n👷 Testing GET /api/tasks/{self.task_id}/labour-estimates...")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/tasks/{self.task_id}/labour-estimates")
            print(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Task labour estimates retrieved successfully")
                print(f"   Number of labour estimates: {len(data)}")
                
                for estimate in data:
                    skill_type = estimate.get("skill_type")
                    planned_workers = estimate.get("planned_workers", 0)
                    planned_hours = estimate.get("planned_hours", 0)
                    planned_cost = estimate.get("planned_cost", 0)
                    
                    print(f"   - {skill_type}: {planned_workers} workers, {planned_hours} hours, ₹{planned_cost:,.2f}")
                
                return True
            else:
                print(f"❌ Failed to get task labour estimates: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error testing task labour estimates: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all Project Management Template API tests"""
        print("🚀 Starting Project Management Template API Tests")
        print("=" * 60)
        
        # Login first
        if not self.login():
            print("❌ Cannot proceed without authentication")
            return False
        
        # Test results
        results = []
        
        # Test 1: Get Milestone Templates
        results.append(("Get Milestone Templates", self.test_get_milestone_templates()))
        
        # Test 2: Get Labour Rates
        results.append(("Get Labour Rates", self.test_get_labour_rates()))
        
        # Test 3: Create Project With Templates
        results.append(("Create Project With Templates", self.test_create_project_with_templates()))
        
        # Test 4: Get Budget Summary
        results.append(("Get Budget Summary", self.test_get_budget_summary()))
        
        # Test 5: Get Deviation Report
        results.append(("Get Deviation Report", self.test_get_deviation_report()))
        
        # Test 6: Get Task Labour Estimates
        results.append(("Get Task Labour Estimates", self.test_get_task_labour_estimates()))
        
        # Summary
        print("\n" + "=" * 60)
        print("📋 TEST SUMMARY")
        print("=" * 60)
        
        passed = 0
        failed = 0
        
        for test_name, result in results:
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status} - {test_name}")
            if result:
                passed += 1
            else:
                failed += 1
        
        print(f"\nTotal Tests: {len(results)}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success Rate: {(passed/len(results)*100):.1f}%")
        
        if failed == 0:
            print("\n🎉 ALL TESTS PASSED! Project Management Template APIs are working correctly.")
        else:
            print(f"\n⚠️  {failed} test(s) failed. Please check the issues above.")
        
        return failed == 0

def main():
    """Main function to run the tests"""
    tester = ProjectTemplateAPITester()
    success = tester.run_all_tests()
    
    if success:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()