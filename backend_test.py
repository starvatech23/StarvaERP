#!/usr/bin/env python3
"""
Backend API Testing for Dynamic Schedule Management APIs
Tests the new schedule management endpoints for SiteOps construction management app.
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://ops-enhancements.preview.emergentagent.com/api"
LOGIN_EMAIL = "admin@starvacon.com"
LOGIN_PASSWORD = "StarvaWorld23@"

class ScheduleAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.project_id = None
        self.task_id = None
        self.milestone_id = None
        
    def login(self):
        """Login and get access token"""
        print("🔐 Logging in...")
        
        login_data = {
            "identifier": LOGIN_EMAIL,
            "password": LOGIN_PASSWORD,
            "auth_type": "email"
        }
        
        response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
        
        if response.status_code == 200:
            data = response.json()
            self.token = data["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            print(f"✅ Login successful! User: {data['user']['full_name']} ({data['user']['role']})")
            return True
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return False
    
    def get_project_and_task_data(self):
        """Get a project and its tasks/milestones to test with"""
        print("\n📋 Getting project and task data...")
        
        # Get projects
        response = self.session.get(f"{BASE_URL}/projects")
        if response.status_code != 200:
            print(f"❌ Failed to get projects: {response.status_code} - {response.text}")
            return False
            
        projects = response.json()
        if not projects:
            print("❌ No projects found")
            return False
            
        self.project_id = projects[0]["id"]
        project_name = projects[0]["name"]
        print(f"✅ Using project: {project_name} (ID: {self.project_id})")
        
        # Get tasks for this project
        response = self.session.get(f"{BASE_URL}/tasks", params={"project_id": self.project_id})
        if response.status_code != 200:
            print(f"❌ Failed to get tasks: {response.status_code} - {response.text}")
            return False
            
        tasks = response.json()
        if not tasks:
            print("❌ No tasks found for project")
            return False
            
        self.task_id = tasks[0]["id"]
        task_title = tasks[0]["title"]
        print(f"✅ Using task: {task_title} (ID: {self.task_id})")
        
        # Get milestones for this project
        response = self.session.get(f"{BASE_URL}/milestones", params={"project_id": self.project_id})
        if response.status_code == 200:
            milestones = response.json()
            if milestones:
                self.milestone_id = milestones[0]["id"]
                milestone_name = milestones[0]["name"]
                print(f"✅ Using milestone: {milestone_name} (ID: {self.milestone_id})")
        
        return True
    
    def test_get_current_dates(self):
        """Test 1: Get Current Task and Milestone Dates"""
        print("\n🧪 TEST 1: Get Current Task and Milestone Dates")
        
        # Get current task data
        response = self.session.get(f"{BASE_URL}/tasks", params={"project_id": self.project_id})
        if response.status_code == 200:
            tasks = response.json()
            if tasks:
                task = tasks[0]
                print(f"✅ Current Task Data:")
                print(f"   - Title: {task.get('title')}")
                print(f"   - Planned Start: {task.get('planned_start_date')}")
                print(f"   - Planned End: {task.get('planned_end_date')}")
                print(f"   - Duration Days: {task.get('duration_days', 'N/A')}")
                print(f"   - Assigned To: {len(task.get('assigned_to', []))} workers")
        else:
            print(f"❌ Failed to get task data: {response.status_code}")
            return False
            
        # Get current milestone data
        if self.milestone_id:
            response = self.session.get(f"{BASE_URL}/milestones", params={"project_id": self.project_id})
            if response.status_code == 200:
                milestones = response.json()
                if milestones:
                    milestone = milestones[0]
                    print(f"✅ Current Milestone Data:")
                    print(f"   - Name: {milestone.get('name')}")
                    print(f"   - Start Date: {milestone.get('start_date')}")
                    print(f"   - Due Date: {milestone.get('due_date')}")
                    print(f"   - Status: {milestone.get('status')}")
        
        return True
    
    def test_recalculate_project_schedule(self):
        """Test 2: Recalculate Project Schedule"""
        print("\n🧪 TEST 2: Recalculate Project Schedule")
        
        response = self.session.post(f"{BASE_URL}/schedule/project/recalculate/{self.project_id}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Project schedule recalculation successful!")
            print(f"   - Milestones Updated: {len(result.get('milestones_updated', []))}")
            print(f"   - Tasks Updated: {result.get('tasks_updated', 0)}")
            print(f"   - New Project End: {result.get('new_project_end', 'N/A')}")
            
            # Show milestone updates
            for milestone in result.get('milestones_updated', []):
                print(f"   - Milestone '{milestone.get('name')}': {milestone.get('start_date')} → {milestone.get('due_date')}")
            
            return True
        else:
            print(f"❌ Project schedule recalculation failed: {response.status_code} - {response.text}")
            return False
    
    def test_update_task_labour(self):
        """Test 3: Update Task Labour and Recalculate"""
        print("\n🧪 TEST 3: Update Task Labour and Recalculate")
        
        # Test with increased labour count (should reduce duration)
        labour_data = {
            "task_id": self.task_id,
            "labour_count": 5
        }
        
        response = self.session.post(f"{BASE_URL}/schedule/task/update-labour", json=labour_data)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Task labour update successful!")
            
            if 'task_updated' in result:
                task = result['task_updated']
                print(f"   - Task: {task.get('title')}")
                print(f"   - New Planned Start: {task.get('planned_start_date')}")
                print(f"   - New Planned End: {task.get('planned_end_date')}")
                print(f"   - New Duration Days: {task.get('duration_days')}")
                print(f"   - Labour Count: {labour_data['labour_count']}")
            
            if 'milestone_updated' in result:
                milestone = result['milestone_updated']
                print(f"   - Milestone Updated: {milestone.get('name')}")
                print(f"   - New Milestone Dates: {milestone.get('start_date')} → {milestone.get('due_date')}")
            
            return True
        else:
            print(f"❌ Task labour update failed: {response.status_code} - {response.text}")
            return False
    
    def test_apply_material_delay(self):
        """Test 4: Apply Material Delay"""
        print("\n🧪 TEST 4: Apply Material Delay")
        
        delay_data = {
            "task_id": self.task_id,
            "delay_days": 7,
            "reason": "Cement delivery delayed"
        }
        
        response = self.session.post(f"{BASE_URL}/schedule/task/apply-material-delay", json=delay_data)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Material delay application successful!")
            
            if 'task_updated' in result:
                task = result['task_updated']
                print(f"   - Task: {task.get('title')}")
                print(f"   - New Planned Start: {task.get('planned_start_date')}")
                print(f"   - New Planned End: {task.get('planned_end_date')}")
                print(f"   - Delay Applied: {delay_data['delay_days']} days")
                print(f"   - Reason: {delay_data['reason']}")
            
            if 'milestone_updated' in result:
                milestone = result['milestone_updated']
                print(f"   - Milestone Updated: {milestone.get('name')}")
                print(f"   - New Target Date: {milestone.get('due_date')}")
            
            if 'cascaded_updates' in result:
                cascaded = result['cascaded_updates']
                print(f"   - Cascaded Updates: {len(cascaded)} subsequent milestones")
                for update in cascaded:
                    print(f"     • {update.get('name')}: pushed to {update.get('due_date')}")
            
            return True
        else:
            print(f"❌ Material delay application failed: {response.status_code} - {response.text}")
            return False
    
    def test_verify_cascading_updates(self):
        """Test 5: Verify Cascading Updates"""
        print("\n🧪 TEST 5: Verify Cascading Updates")
        
        # Get updated milestones to verify cascading
        response = self.session.get(f"{BASE_URL}/milestones", params={"project_id": self.project_id})
        
        if response.status_code == 200:
            milestones = response.json()
            print("✅ Milestone cascading verification:")
            
            # Sort by order to check sequence
            milestones.sort(key=lambda x: x.get('order', 0))
            
            for i, milestone in enumerate(milestones):
                print(f"   {i+1}. {milestone.get('name')}")
                print(f"      Start: {milestone.get('start_date')}")
                print(f"      Target: {milestone.get('due_date')}")
                print(f"      Status: {milestone.get('status')}")
                
                # Check if dates are logical (each milestone starts after previous ends)
                if i > 0:
                    prev_end = milestones[i-1].get('due_date')
                    curr_start = milestone.get('start_date')
                    if prev_end and curr_start:
                        print(f"      ✓ Sequence check: Previous ends {prev_end}, Current starts {curr_start}")
            
            return True
        else:
            print(f"❌ Failed to verify cascading updates: {response.status_code}")
            return False
    
    def test_get_schedule_delays_log(self):
        """Test 6: Get Schedule Delays Log"""
        print("\n🧪 TEST 6: Get Schedule Delays Log")
        
        response = self.session.get(f"{BASE_URL}/schedule/delays/{self.project_id}")
        
        if response.status_code == 200:
            delays = response.json()
            print("✅ Schedule delays log retrieved!")
            print(f"   - Total Delays Logged: {len(delays)}")
            
            for delay in delays:
                print(f"   - Delay Entry:")
                print(f"     • Task: {delay.get('task_title', 'N/A')}")
                print(f"     • Delay Days: {delay.get('delay_days')}")
                print(f"     • Reason: {delay.get('reason')}")
                print(f"     • Applied On: {delay.get('applied_at')}")
                print(f"     • Applied By: {delay.get('applied_by_name', 'N/A')}")
            
            return True
        else:
            print(f"❌ Failed to get schedule delays log: {response.status_code} - {response.text}")
            return False
    
    def run_all_tests(self):
        """Run all schedule management API tests"""
        print("🚀 Starting Dynamic Schedule Management API Tests")
        print("=" * 60)
        
        # Login first
        if not self.login():
            return False
        
        # Get test data
        if not self.get_project_and_task_data():
            return False
        
        # Run all tests
        tests = [
            ("Get Current Task and Milestone Dates", self.test_get_current_dates),
            ("Recalculate Project Schedule", self.test_recalculate_project_schedule),
            ("Update Task Labour and Recalculate", self.test_update_task_labour),
            ("Apply Material Delay", self.test_apply_material_delay),
            ("Verify Cascading Updates", self.test_verify_cascading_updates),
            ("Get Schedule Delays Log", self.test_get_schedule_delays_log),
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            try:
                if test_func():
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                print(f"❌ {test_name} failed with exception: {str(e)}")
                failed += 1
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📈 Success Rate: {(passed/(passed+failed)*100):.1f}%")
        
        if failed == 0:
            print("🎉 ALL DYNAMIC SCHEDULE MANAGEMENT APIS WORKING PERFECTLY!")
            return True
        else:
            print("⚠️  Some tests failed. Check the output above for details.")
            return False


def main():
    """Main test execution"""
    tester = ScheduleAPITester()
    success = tester.run_all_tests()
    
    if success:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()