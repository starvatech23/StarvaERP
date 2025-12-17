#!/usr/bin/env python3
"""
Backend API Testing Script for CRM Dashboard APIs
Tests authentication and CRM dashboard endpoints
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BACKEND_URL = "https://site-materials-1.preview.emergentagent.com/api"
TEST_CREDENTIALS = {
    "email": "crm.manager@test.com",
    "password": "manager123",
    "auth_type": "email"
}

class CRMDashboardTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.token = None
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        
    def log(self, message, level="INFO"):
        """Log messages with timestamp"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")
        
    def test_login(self):
        """Test login endpoint and get authentication token"""
        self.log("Testing POST /api/auth/login...")
        
        try:
            response = self.session.post(
                f"{self.base_url}/auth/login",
                json=TEST_CREDENTIALS,
                timeout=30
            )
            
            self.log(f"Login response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                user_info = data.get("user", {})
                
                self.log(f"✅ LOGIN SUCCESS: Token obtained")
                self.log(f"   User: {user_info.get('full_name', 'Unknown')}")
                self.log(f"   Role: {user_info.get('role', 'Unknown')}")
                self.log(f"   Email: {user_info.get('email', 'Unknown')}")
                
                # Set authorization header for subsequent requests
                self.session.headers.update({
                    'Authorization': f'Bearer {self.token}'
                })
                
                return True
            else:
                self.log(f"❌ LOGIN FAILED: {response.status_code}", "ERROR")
                try:
                    error_detail = response.json().get("detail", "Unknown error")
                    self.log(f"   Error: {error_detail}", "ERROR")
                except:
                    self.log(f"   Response: {response.text}", "ERROR")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ LOGIN REQUEST FAILED: {str(e)}", "ERROR")
            return False
            
    def test_crm_analytics(self):
        """Test CRM dashboard analytics endpoint"""
        self.log("Testing GET /api/crm/dashboard/analytics...")
        
        try:
            response = self.session.get(
                f"{self.base_url}/crm/dashboard/analytics",
                timeout=30
            )
            
            self.log(f"Analytics response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify expected structure
                required_fields = [
                    "summary", "by_status", "by_source", "by_priority", 
                    "by_city", "by_state", "by_category", "by_funnel", 
                    "by_value_range"
                ]
                
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log("✅ ANALYTICS SUCCESS: All required fields present")
                    
                    # Log summary data
                    summary = data.get("summary", {})
                    self.log(f"   Total Leads: {summary.get('total_leads', 0)}")
                    self.log(f"   Pipeline Value: ₹{summary.get('total_pipeline_value', 0):,.2f}")
                    self.log(f"   Won Leads: {summary.get('won_leads', 0)}")
                    self.log(f"   Conversion Rate: {summary.get('conversion_rate', 0)}%")
                    
                    # Log breakdown counts
                    self.log(f"   Status Breakdown: {len(data.get('by_status', {}))} statuses")
                    self.log(f"   Source Breakdown: {len(data.get('by_source', {}))} sources")
                    self.log(f"   Priority Breakdown: {len(data.get('by_priority', {}))} priorities")
                    self.log(f"   City Breakdown: {len(data.get('by_city', []))} cities")
                    self.log(f"   State Breakdown: {len(data.get('by_state', []))} states")
                    self.log(f"   Category Breakdown: {len(data.get('by_category', []))} categories")
                    self.log(f"   Funnel Breakdown: {len(data.get('by_funnel', []))} funnels")
                    
                    return True
                else:
                    self.log(f"❌ ANALYTICS INCOMPLETE: Missing fields: {missing_fields}", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ ANALYTICS FAILED: {response.status_code}", "ERROR")
                try:
                    error_detail = response.json().get("detail", "Unknown error")
                    self.log(f"   Error: {error_detail}", "ERROR")
                except:
                    self.log(f"   Response: {response.text}", "ERROR")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ ANALYTICS REQUEST FAILED: {str(e)}", "ERROR")
            return False
            
    def test_crm_filters(self):
        """Test CRM dashboard filters endpoint"""
        self.log("Testing GET /api/crm/dashboard/filters...")
        
        try:
            response = self.session.get(
                f"{self.base_url}/crm/dashboard/filters",
                timeout=30
            )
            
            self.log(f"Filters response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify expected structure
                required_fields = [
                    "cities", "states", "categories", "funnels", 
                    "statuses", "sources", "priorities", "assigned_users", 
                    "value_ranges"
                ]
                
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log("✅ FILTERS SUCCESS: All required fields present")
                    
                    # Log filter counts
                    self.log(f"   Cities: {len(data.get('cities', []))} options")
                    self.log(f"   States: {len(data.get('states', []))} options")
                    self.log(f"   Categories: {len(data.get('categories', []))} options")
                    self.log(f"   Funnels: {len(data.get('funnels', []))} options")
                    self.log(f"   Statuses: {len(data.get('statuses', []))} options")
                    self.log(f"   Sources: {len(data.get('sources', []))} options")
                    self.log(f"   Priorities: {len(data.get('priorities', []))} options")
                    self.log(f"   Assigned Users: {len(data.get('assigned_users', []))} options")
                    self.log(f"   Value Ranges: {len(data.get('value_ranges', []))} options")
                    
                    # Verify value_ranges structure
                    value_ranges = data.get('value_ranges', [])
                    if value_ranges and all('label' in vr and 'min' in vr for vr in value_ranges):
                        self.log("   Value ranges structure: ✅ Valid")
                    else:
                        self.log("   Value ranges structure: ❌ Invalid", "ERROR")
                        return False
                    
                    return True
                else:
                    self.log(f"❌ FILTERS INCOMPLETE: Missing fields: {missing_fields}", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ FILTERS FAILED: {response.status_code}", "ERROR")
                try:
                    error_detail = response.json().get("detail", "Unknown error")
                    self.log(f"   Error: {error_detail}", "ERROR")
                except:
                    self.log(f"   Response: {response.text}", "ERROR")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log(f"❌ FILTERS REQUEST FAILED: {str(e)}", "ERROR")
            return False
            
    def test_analytics_with_filters(self):
        """Test analytics endpoint with various filter parameters"""
        self.log("Testing GET /api/crm/dashboard/analytics with filters...")
        
        # Test different filter combinations
        filter_tests = [
            {"status": "won", "description": "Won leads only"},
            {"priority": "urgent", "description": "Urgent priority only"},
            {"status": "won", "priority": "high", "description": "Won + High priority"},
            {"min_value": "100000", "description": "Minimum value ₹1L+"},
            {"max_value": "500000", "description": "Maximum value ₹5L"},
        ]
        
        success_count = 0
        
        for i, test_case in enumerate(filter_tests, 1):
            description = test_case.pop("description")
            self.log(f"  Test {i}/5: {description}")
            
            try:
                response = self.session.get(
                    f"{self.base_url}/crm/dashboard/analytics",
                    params=test_case,
                    timeout=30
                )
                
                if response.status_code == 200:
                    data = response.json()
                    summary = data.get("summary", {})
                    total_leads = summary.get("total_leads", 0)
                    
                    self.log(f"    ✅ SUCCESS: {total_leads} leads found")
                    success_count += 1
                else:
                    self.log(f"    ❌ FAILED: Status {response.status_code}", "ERROR")
                    
            except requests.exceptions.RequestException as e:
                self.log(f"    ❌ REQUEST FAILED: {str(e)}", "ERROR")
        
        if success_count == len(filter_tests):
            self.log("✅ ALL FILTER TESTS PASSED")
            return True
        else:
            self.log(f"❌ FILTER TESTS: {success_count}/{len(filter_tests)} passed", "ERROR")
            return False
            
    def run_all_tests(self):
        """Run all CRM Dashboard API tests"""
        self.log("=" * 60)
        self.log("STARTING CRM DASHBOARD API TESTS")
        self.log("=" * 60)
        
        test_results = []
        
        # Test 1: Authentication
        self.log("\n1. AUTHENTICATION TEST")
        self.log("-" * 30)
        login_success = self.test_login()
        test_results.append(("Authentication", login_success))
        
        if not login_success:
            self.log("❌ AUTHENTICATION FAILED - Stopping tests", "ERROR")
            return False
            
        # Test 2: Analytics Endpoint
        self.log("\n2. ANALYTICS ENDPOINT TEST")
        self.log("-" * 30)
        analytics_success = self.test_crm_analytics()
        test_results.append(("Analytics Endpoint", analytics_success))
        
        # Test 3: Filters Endpoint
        self.log("\n3. FILTERS ENDPOINT TEST")
        self.log("-" * 30)
        filters_success = self.test_crm_filters()
        test_results.append(("Filters Endpoint", filters_success))
        
        # Test 4: Analytics with Filters
        self.log("\n4. ANALYTICS WITH FILTERS TEST")
        self.log("-" * 30)
        filter_analytics_success = self.test_analytics_with_filters()
        test_results.append(("Analytics with Filters", filter_analytics_success))
        
        # Summary
        self.log("\n" + "=" * 60)
        self.log("TEST RESULTS SUMMARY")
        self.log("=" * 60)
        
        passed_tests = 0
        for test_name, success in test_results:
            status = "✅ PASS" if success else "❌ FAIL"
            self.log(f"{test_name}: {status}")
            if success:
                passed_tests += 1
        
        total_tests = len(test_results)
        success_rate = (passed_tests / total_tests) * 100
        
        self.log(f"\nOVERALL: {passed_tests}/{total_tests} tests passed ({success_rate:.1f}%)")
        
        if passed_tests == total_tests:
            self.log("🎉 ALL CRM DASHBOARD TESTS PASSED!", "SUCCESS")
            return True
        else:
            self.log("⚠️  SOME TESTS FAILED - Check logs above", "WARNING")
            return False

def main():
    """Main function to run CRM Dashboard API tests"""
    tester = CRMDashboardTester()
    
    try:
        success = tester.run_all_tests()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        tester.log("\n❌ Tests interrupted by user", "ERROR")
        sys.exit(1)
    except Exception as e:
        tester.log(f"\n❌ Unexpected error: {str(e)}", "ERROR")
        sys.exit(1)

if __name__ == "__main__":
    main()