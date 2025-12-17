#!/usr/bin/env python3
"""
Backend API Testing for Site Materials and Notifications APIs
Testing the new Site Materials and Notifications APIs as requested.
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://buildtrack-dev.preview.emergentagent.com/api"

# Test credentials
TEST_CREDENTIALS = {
    "crm_manager": {
        "email": "crm.manager@test.com",
        "password": "manager123"
    },
    "engineer": {
        "email": "crm.user1@test.com", 
        "password": "user1123"
    }
}

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.tokens = {}
        self.test_data = {}
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def login(self, user_type: str) -> bool:
        """Login and store token"""
        try:
            creds = TEST_CREDENTIALS[user_type]
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                json={
                    "identifier": creds["email"],
                    "password": creds["password"],
                    "auth_type": "email"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.tokens[user_type] = data["access_token"]
                self.log(f"✅ Login successful for {user_type}: {creds['email']}")
                return True
            else:
                self.log(f"❌ Login failed for {user_type}: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Login error for {user_type}: {str(e)}", "ERROR")
            return False
    
    def get_headers(self, user_type: str) -> Dict[str, str]:
        """Get authorization headers"""
        return {
            "Authorization": f"Bearer {self.tokens[user_type]}",
            "Content-Type": "application/json"
        }
    
    def test_site_materials_api(self) -> bool:
        """Test Site Materials API endpoints"""
        self.log("🧪 TESTING SITE MATERIALS API")
        
        # Test 1: Login as engineer and add site material
        self.log("Test 1a: Login as engineer")
        if not self.login("engineer"):
            return False
            
        self.log("Test 1b: Add site material as engineer")
        material_data = {
            "project_id": "6926d6604dbb9ab5bf39e81a",
            "material_type": "Cement Bags",
            "quantity": 50,
            "unit": "bags", 
            "cost": 15000,
            "condition": "new",
            "notes": "Received from ABC Suppliers",
            "media_urls": ["https://example.com/photo1.jpg"]
        }
        
        try:
            response = self.session.post(
                f"{BASE_URL}/site-materials",
                json=material_data,
                headers=self.get_headers("engineer")
            )
            
            if response.status_code == 200:
                data = response.json()
                self.test_data["material_id"] = data.get("id")
                self.log(f"✅ Site material added successfully: ID {self.test_data['material_id']}, Status: {data.get('status')}")
                
                # Verify status is pending_review
                if data.get("status") == "pending_review":
                    self.log("✅ Material status correctly set to 'pending_review'")
                else:
                    self.log(f"❌ Expected status 'pending_review', got '{data.get('status')}'", "ERROR")
                    return False
            else:
                self.log(f"❌ Failed to add site material: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error adding site material: {str(e)}", "ERROR")
            return False
        
        # Test 2: Get site materials list
        self.log("Test 2: Get site materials list")
        try:
            response = self.session.get(
                f"{BASE_URL}/site-materials?project_id=6926d6604dbb9ab5bf39e81a",
                headers=self.get_headers("engineer")
            )
            
            if response.status_code == 200:
                materials = response.json()
                self.log(f"✅ Retrieved {len(materials)} site materials")
                
                # Verify our material is in the list
                found_material = False
                for material in materials:
                    if material.get("id") == self.test_data.get("material_id"):
                        found_material = True
                        self.log(f"✅ Found newly added material in list: {material.get('material_type')}")
                        break
                
                if not found_material:
                    self.log("❌ Newly added material not found in list", "ERROR")
                    return False
            else:
                self.log(f"❌ Failed to get site materials: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error getting site materials: {str(e)}", "ERROR")
            return False
        
        # Test 3: Login as manager and review material
        self.log("Test 3a: Login as manager")
        if not self.login("crm_manager"):
            return False
            
        self.log("Test 3b: Review material as manager")
        try:
            response = self.session.put(
                f"{BASE_URL}/site-materials/{self.test_data['material_id']}/review?status=approved&review_notes=Verified%20receipt",
                headers=self.get_headers("crm_manager")
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ Material reviewed successfully: {data.get('message')}")
                
                if data.get("status") == "approved":
                    self.log("✅ Material status correctly updated to 'approved'")
                else:
                    self.log(f"❌ Expected status 'approved', got '{data.get('status')}'", "ERROR")
                    return False
            else:
                self.log(f"❌ Failed to review material: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error reviewing material: {str(e)}", "ERROR")
            return False
        
        self.log("✅ ALL SITE MATERIALS API TESTS PASSED")
        return True
    
    def test_notifications_api(self) -> bool:
        """Test Notifications API endpoints"""
        self.log("🧪 TESTING NOTIFICATIONS API")
        
        # Use engineer credentials (should have notifications from material creation)
        if "engineer" not in self.tokens:
            if not self.login("engineer"):
                return False
        
        # Test 1: Get notifications
        self.log("Test 1: Get notifications for user")
        try:
            response = self.session.get(
                f"{BASE_URL}/notifications",
                headers=self.get_headers("engineer")
            )
            
            if response.status_code == 200:
                notifications = response.json()
                self.log(f"✅ Retrieved {len(notifications)} notifications")
                
                # Store a notification ID for later tests
                if notifications:
                    self.test_data["notification_id"] = notifications[0].get("id")
                    self.log(f"✅ Found notification ID for testing: {self.test_data['notification_id']}")
                else:
                    self.log("ℹ️ No notifications found (this is normal for new users)")
                    
            else:
                self.log(f"❌ Failed to get notifications: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error getting notifications: {str(e)}", "ERROR")
            return False
        
        # Test 2: Get notification stats
        self.log("Test 2: Get notification stats")
        try:
            response = self.session.get(
                f"{BASE_URL}/notifications/stats",
                headers=self.get_headers("engineer")
            )
            
            if response.status_code == 200:
                stats = response.json()
                self.log(f"✅ Retrieved notification stats: Total: {stats.get('total', 0)}, Unread: {stats.get('unread', 0)}")
                
                # Verify stats structure
                expected_fields = ["total", "unread"]
                for field in expected_fields:
                    if field not in stats:
                        self.log(f"❌ Missing field '{field}' in stats response", "ERROR")
                        return False
                
                self.log("✅ Notification stats structure is correct")
            else:
                self.log(f"❌ Failed to get notification stats: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error getting notification stats: {str(e)}", "ERROR")
            return False
        
        # Test 3: Mark notification as read (if we have one)
        if self.test_data.get("notification_id"):
            self.log("Test 3: Mark notification as read")
            try:
                response = self.session.post(
                    f"{BASE_URL}/notifications/{self.test_data['notification_id']}/read",
                    headers=self.get_headers("engineer")
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self.log(f"✅ Notification marked as read: {data.get('message')}")
                else:
                    self.log(f"❌ Failed to mark notification as read: {response.status_code} - {response.text}", "ERROR")
                    return False
                    
            except Exception as e:
                self.log(f"❌ Error marking notification as read: {str(e)}", "ERROR")
                return False
        else:
            self.log("ℹ️ Skipping mark as read test - no notification ID available")
        
        # Test 4: Mark all notifications as read
        self.log("Test 4: Mark all notifications as read")
        try:
            response = self.session.post(
                f"{BASE_URL}/notifications/read-all",
                headers=self.get_headers("engineer")
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ All notifications marked as read: {data.get('message')}")
            else:
                self.log(f"❌ Failed to mark all notifications as read: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error marking all notifications as read: {str(e)}", "ERROR")
            return False
        
        self.log("✅ ALL NOTIFICATIONS API TESTS PASSED")
        return True
    
    def test_admin_trigger(self) -> bool:
        """Test Admin trigger endpoint"""
        self.log("🧪 TESTING ADMIN TRIGGER API")
        
        # Test 1: Try as non-admin (should fail)
        self.log("Test 1: Try admin trigger as engineer (should fail)")
        if "engineer" not in self.tokens:
            if not self.login("engineer"):
                return False
        
        try:
            response = self.session.post(
                f"{BASE_URL}/admin/trigger-weekly-review",
                headers=self.get_headers("engineer")
            )
            
            if response.status_code == 403:
                self.log("✅ Correctly blocked non-admin access (403 Forbidden)")
            else:
                self.log(f"❌ Expected 403 for non-admin, got {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error testing non-admin access: {str(e)}", "ERROR")
            return False
        
        # Test 2: Try as manager (should work if manager has admin role)
        self.log("Test 2: Try admin trigger as manager")
        if "crm_manager" not in self.tokens:
            if not self.login("crm_manager"):
                return False
        
        try:
            response = self.session.post(
                f"{BASE_URL}/admin/trigger-weekly-review",
                headers=self.get_headers("crm_manager")
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ Admin trigger successful: {data.get('message')}")
            elif response.status_code == 403:
                self.log("ℹ️ Manager doesn't have admin role - this is expected behavior")
            else:
                self.log(f"❌ Unexpected response for admin trigger: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error testing admin trigger: {str(e)}", "ERROR")
            return False
        
        self.log("✅ ADMIN TRIGGER API TESTS PASSED")
        return True
    
    def run_all_tests(self) -> bool:
        """Run all API tests"""
        self.log("🚀 STARTING COMPREHENSIVE API TESTING")
        self.log(f"Backend URL: {BASE_URL}")
        
        tests = [
            ("Site Materials API", self.test_site_materials_api),
            ("Notifications API", self.test_notifications_api), 
            ("Admin Trigger API", self.test_admin_trigger)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            self.log(f"\n{'='*50}")
            self.log(f"RUNNING: {test_name}")
            self.log(f"{'='*50}")
            
            try:
                if test_func():
                    passed += 1
                    self.log(f"✅ {test_name} - PASSED")
                else:
                    self.log(f"❌ {test_name} - FAILED")
            except Exception as e:
                self.log(f"❌ {test_name} - ERROR: {str(e)}")
        
        self.log(f"\n{'='*50}")
        self.log(f"TEST SUMMARY: {passed}/{total} tests passed")
        self.log(f"{'='*50}")
        
        if passed == total:
            self.log("🎉 ALL TESTS PASSED!")
            return True
        else:
            self.log(f"⚠️ {total - passed} tests failed")
            return False

def main():
    """Main test execution"""
    tester = APITester()
    success = tester.run_all_tests()
    
    if success:
        print("\n✅ Backend API testing completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Backend API testing failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()