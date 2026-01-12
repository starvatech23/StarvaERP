#!/usr/bin/env python3
"""
Backend API Testing for Estimate-Budget Sync Functionality
Testing new endpoints for estimate to project saving with budget sync
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://authsystem-dash.preview.emergentagent.com/api"
LOGIN_EMAIL = "admin@starvacon.com"
LOGIN_PASSWORD = "StarvaWorld23@"

class EstimateBudgetSyncTester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.project_id = None
        self.estimate_id = None
        
    def login(self):
        """Login and get authentication token"""
        print("🔐 Logging in...")
        
        login_data = {
            "identifier": LOGIN_EMAIL,
            "password": LOGIN_PASSWORD,
            "auth_type": "email"
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
            print(f"Login response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                user_info = data.get("user", {})
                print(f"✅ Login successful! User: {user_info.get('full_name')} ({user_info.get('role')})")
                
                # Set authorization header for future requests
                self.session.headers.update({
                    "Authorization": f"Bearer {self.token}",
                    "Content-Type": "application/json"
                })
                return True
            else:
                print(f"❌ Login failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            return False
    
    def get_project_id(self):
        """Get a project ID from the projects list"""
        print("\n📋 Getting project ID...")
        
        try:
            response = self.session.get(f"{BASE_URL}/projects")
            print(f"Projects response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    self.project_id = data[0]["id"]
                    project_name = data[0].get("name", "Unknown")
                    print(f"✅ Using project: {project_name} (ID: {self.project_id})")
                    return True
                else:
                    print("❌ No projects found")
                    return False
            else:
                print(f"❌ Failed to get projects: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error getting projects: {str(e)}")
            return False
    
    def test_save_estimate_to_project(self):
        """Test POST /api/estimates/save-to-project"""
        print("\n🧮 Testing Save Estimate to Project with Budget Sync...")
        
        estimate_data = {
            "project_id": self.project_id,
            "total_area_sqft": 3200,
            "num_floors": 1,
            "finishing_grade": "standard",
            "project_type": "residential_individual",
            "estimate_name": "Test Estimate Budget Sync",
            "sync_to_budget": True
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/estimates/save-to-project", json=estimate_data)
            print(f"Save estimate response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Response data: {json.dumps(data, indent=2)}")
                
                # Check expected response structure
                if data.get("success"):
                    self.estimate_id = data.get("estimate_id")
                    sync_result = data.get("sync_result", {})
                    
                    print(f"✅ Estimate saved successfully!")
                    print(f"   - Estimate ID: {self.estimate_id}")
                    print(f"   - Sync Status: {sync_result.get('synced', False)}")
                    print(f"   - Milestones Updated: {sync_result.get('milestones_updated', 0)}")
                    
                    # Verify expected fields
                    if sync_result.get("synced") and sync_result.get("milestones_updated", 0) > 0:
                        print("✅ Budget sync appears successful")
                        return True
                    else:
                        print("⚠️ Budget sync may not have worked properly")
                        return False
                else:
                    print(f"❌ Estimate save failed: {data}")
                    return False
            else:
                print(f"❌ Save estimate failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error saving estimate: {str(e)}")
            return False
    
    def test_milestone_budget_update(self):
        """Test that milestones have estimated_cost values after sync"""
        print("\n🎯 Testing Milestone Budget Update...")
        
        try:
            response = self.session.get(f"{BASE_URL}/milestones", params={"project_id": self.project_id})
            print(f"Milestones response status: {response.status_code}")
            
            if response.status_code == 200:
                milestones = response.json()
                print(f"Found {len(milestones)} milestones")
                
                milestones_with_cost = 0
                total_estimated_cost = 0
                
                for milestone in milestones:
                    estimated_cost = milestone.get("estimated_cost", 0)
                    milestone_name = milestone.get("name", "Unknown")
                    
                    print(f"   - {milestone_name}: ₹{estimated_cost}")
                    
                    if estimated_cost and estimated_cost > 0:
                        milestones_with_cost += 1
                        total_estimated_cost += estimated_cost
                
                print(f"✅ Milestones with estimated costs: {milestones_with_cost}/{len(milestones)}")
                print(f"✅ Total estimated cost: ₹{total_estimated_cost:,.2f}")
                
                if milestones_with_cost > 0:
                    return True
                else:
                    print("❌ No milestones have estimated_cost values")
                    return False
            else:
                print(f"❌ Failed to get milestones: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error getting milestones: {str(e)}")
            return False
    
    def test_get_project_estimates_v2(self):
        """Test GET /api/projects/{project_id}/estimates-v2"""
        print("\n📊 Testing Get Project Estimates v2...")
        
        try:
            response = self.session.get(f"{BASE_URL}/projects/{self.project_id}/estimates-v2")
            print(f"Estimates v2 response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Response data: {json.dumps(data, indent=2)}")
                
                # Check if our estimate is in the response
                estimates = data if isinstance(data, list) else data.get("estimates", [])
                
                found_estimate = False
                for estimate in estimates:
                    if estimate.get("id") == self.estimate_id:
                        found_estimate = True
                        print(f"✅ Found our estimate in v2 response")
                        print(f"   - Name: {estimate.get('estimate_name', 'N/A')}")
                        print(f"   - Total Area: {estimate.get('total_area_sqft', 'N/A')} sqft")
                        
                        # Check for BOQ breakdown
                        if "boq_lines" in estimate or "lines" in estimate:
                            print(f"   - BOQ breakdown included: ✅")
                        else:
                            print(f"   - BOQ breakdown missing: ⚠️")
                        break
                
                if found_estimate:
                    return True
                else:
                    print(f"❌ Our estimate (ID: {self.estimate_id}) not found in v2 response")
                    return False
            else:
                print(f"❌ Failed to get estimates v2: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error getting estimates v2: {str(e)}")
            return False
    
    def test_budget_summary_integration(self):
        """Test GET /api/projects/{project_id}/budget-summary"""
        print("\n💰 Testing Budget Summary Integration...")
        
        try:
            response = self.session.get(f"{BASE_URL}/projects/{self.project_id}/budget-summary")
            print(f"Budget summary response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Response data: {json.dumps(data, indent=2)}")
                
                # Check for synced budget data
                milestone_breakdown = data.get("milestone_breakdown", [])
                budget_categories = data.get("budget_categories", [])
                
                print(f"✅ Budget summary retrieved successfully")
                print(f"   - Milestone breakdown items: {len(milestone_breakdown)}")
                print(f"   - Budget categories: {len(budget_categories)}")
                
                # Check if milestones have budget data from estimate
                milestones_with_budget = 0
                for milestone in milestone_breakdown:
                    if milestone.get("estimated_cost", 0) > 0:
                        milestones_with_budget += 1
                        print(f"   - {milestone.get('name', 'Unknown')}: ₹{milestone.get('estimated_cost', 0):,.2f}")
                
                if milestones_with_budget > 0:
                    print(f"✅ Found {milestones_with_budget} milestones with synced budget data")
                    return True
                else:
                    print("⚠️ No milestones found with synced budget data")
                    return False
            else:
                print(f"❌ Failed to get budget summary: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error getting budget summary: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all estimate-budget sync tests"""
        print("🚀 Starting Estimate-Budget Sync Testing")
        print("=" * 60)
        
        test_results = []
        
        # Test 1: Login
        if self.login():
            test_results.append(("Login", True))
        else:
            test_results.append(("Login", False))
            return self.print_summary(test_results)
        
        # Test 2: Get Project ID
        if self.get_project_id():
            test_results.append(("Get Project ID", True))
        else:
            test_results.append(("Get Project ID", False))
            return self.print_summary(test_results)
        
        # Test 3: Save Estimate to Project with Budget Sync
        if self.test_save_estimate_to_project():
            test_results.append(("Save Estimate to Project", True))
        else:
            test_results.append(("Save Estimate to Project", False))
        
        # Test 4: Verify Milestone Budget Update
        if self.test_milestone_budget_update():
            test_results.append(("Milestone Budget Update", True))
        else:
            test_results.append(("Milestone Budget Update", False))
        
        # Test 5: Get Project Estimates v2
        if self.test_get_project_estimates_v2():
            test_results.append(("Get Project Estimates v2", True))
        else:
            test_results.append(("Get Project Estimates v2", False))
        
        # Test 6: Verify Budget Summary Integration
        if self.test_budget_summary_integration():
            test_results.append(("Budget Summary Integration", True))
        else:
            test_results.append(("Budget Summary Integration", False))
        
        return self.print_summary(test_results)
    
    def print_summary(self, test_results):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📋 TEST SUMMARY")
        print("=" * 60)
        
        passed = 0
        total = len(test_results)
        
        for test_name, result in test_results:
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name:<30} {status}")
            if result:
                passed += 1
        
        print("-" * 60)
        print(f"TOTAL: {passed}/{total} tests passed ({(passed/total)*100:.1f}%)")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED! Estimate-Budget sync functionality is working correctly.")
            return True
        else:
            print("⚠️ SOME TESTS FAILED! Please check the failed tests above.")
            return False

if __name__ == "__main__":
    tester = EstimateBudgetSyncTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)