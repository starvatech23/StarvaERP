#!/usr/bin/env python3
"""
Backend API Testing Script for Client Portal Login Flow
Tests the client portal authentication system
"""

import requests
import json
import sys
import os
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://labourmanage.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

# Test credentials
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "admin123"

class ClientPortalTester:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        
    def log(self, message):
        """Log message with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")
        
    def login_admin(self):
        """Login as admin to get access token"""
        self.log("🔐 Logging in as admin...")
        
        login_data = {
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "auth_type": "email"
        }
        
        try:
            response = self.session.post(f"{API_BASE}/auth/login", json=login_data)
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("access_token")
                self.log(f"✅ Admin login successful")
                return True
            else:
                self.log(f"❌ Admin login failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log(f"❌ Admin login error: {str(e)}")
            return False
    
    def get_projects_with_client_info(self):
        """Get projects that have client contact information"""
        self.log("📋 Fetching projects with client contact info...")
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = self.session.get(f"{API_BASE}/projects", headers=headers)
            if response.status_code == 200:
                projects = response.json()
                self.log(f"✅ Retrieved {len(projects)} projects")
                
                # Find projects with client contact info
                projects_with_client = []
                for project in projects:
                    client_contact = project.get("client_contact")
                    client_phone = project.get("client_phone")
                    
                    if client_contact or client_phone:
                        projects_with_client.append({
                            "id": project["id"],
                            "name": project.get("name", "Unnamed Project"),
                            "client_contact": client_contact,
                            "client_phone": client_phone,
                            "client_name": project.get("client_name", "Unknown Client")
                        })
                
                self.log(f"📱 Found {len(projects_with_client)} projects with client contact info:")
                for proj in projects_with_client:
                    self.log(f"   - {proj['name']} (ID: {proj['id'][:8]}...)")
                    self.log(f"     Client: {proj['client_name']}")
                    self.log(f"     Contact: {proj['client_contact'] or proj['client_phone'] or 'None'}")
                
                return projects_with_client
            else:
                self.log(f"❌ Failed to get projects: {response.status_code} - {response.text}")
                return []
        except Exception as e:
            self.log(f"❌ Error getting projects: {str(e)}")
            return []
    
    def test_client_portal_login(self, project_id, mobile):
        """Test client portal login with project ID and mobile"""
        self.log(f"🔑 Testing client portal login...")
        self.log(f"   Project ID: {project_id}")
        self.log(f"   Mobile: {mobile}")
        
        login_data = {
            "project_id": project_id,
            "mobile": mobile
        }
        
        try:
            # Test the correct endpoint: /api/client-portal/login
            response = self.session.post(f"{API_BASE}/client-portal/login", json=login_data)
            
            self.log(f"📡 Response Status: {response.status_code}")
            self.log(f"📡 Response Headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                data = response.json()
                self.log("✅ Client portal login successful!")
                self.log(f"   Access Token: {data.get('access_token', 'None')[:20]}...")
                self.log(f"   Project Name: {data.get('project_name', 'None')}")
                self.log(f"   Client Name: {data.get('client_name', 'None')}")
                return True, data
            else:
                self.log(f"❌ Client portal login failed: {response.status_code}")
                try:
                    error_data = response.json()
                    self.log(f"   Error: {error_data.get('detail', 'Unknown error')}")
                except:
                    self.log(f"   Raw response: {response.text}")
                return False, None
                
        except Exception as e:
            self.log(f"❌ Client portal login error: {str(e)}")
            return False, None
    
    def test_alternative_endpoints(self, project_id, mobile):
        """Test alternative client login endpoints"""
        self.log("🔍 Testing alternative client login endpoints...")
        
        # Test /api/auth/client-portal-login (as mentioned in the request)
        login_data = {
            "project_id": project_id,
            "mobile": mobile
        }
        
        alternative_endpoints = [
            "/auth/client-portal-login",
            "/auth/client-login",
            "/client/login",
            "/portal/login"
        ]
        
        for endpoint in alternative_endpoints:
            try:
                self.log(f"   Testing: {API_BASE}{endpoint}")
                response = self.session.post(f"{API_BASE}{endpoint}", json=login_data)
                
                if response.status_code == 200:
                    self.log(f"✅ Found working endpoint: {endpoint}")
                    data = response.json()
                    return True, endpoint, data
                elif response.status_code == 404:
                    self.log(f"   ❌ Endpoint not found: {endpoint}")
                else:
                    self.log(f"   ❌ Failed ({response.status_code}): {endpoint}")
                    
            except Exception as e:
                self.log(f"   ❌ Error testing {endpoint}: {str(e)}")
        
        return False, None, None
    
    def run_comprehensive_test(self):
        """Run comprehensive client portal login test"""
        self.log("🚀 Starting Client Portal Login Flow Test")
        self.log("=" * 60)
        
        # Step 1: Login as admin
        if not self.login_admin():
            self.log("❌ Cannot proceed without admin access")
            return False
        
        # Step 2: Get projects with client info
        projects = self.get_projects_with_client_info()
        if not projects:
            self.log("❌ No projects with client contact information found")
            return False
        
        # Step 3: Test client portal login with first available project
        test_project = projects[0]
        project_id = test_project["id"]
        mobile = test_project["client_contact"] or test_project["client_phone"]
        
        if not mobile:
            self.log("❌ No mobile number found for test project")
            return False
        
        self.log("\n" + "=" * 60)
        self.log("🧪 TESTING CLIENT PORTAL LOGIN")
        self.log("=" * 60)
        
        # Test main endpoint
        success, data = self.test_client_portal_login(project_id, mobile)
        
        if not success:
            self.log("\n" + "-" * 40)
            self.log("🔍 TESTING ALTERNATIVE ENDPOINTS")
            self.log("-" * 40)
            
            alt_success, alt_endpoint, alt_data = self.test_alternative_endpoints(project_id, mobile)
            
            if alt_success:
                self.log(f"✅ Alternative endpoint works: {alt_endpoint}")
                success = True
                data = alt_data
        
        # Summary
        self.log("\n" + "=" * 60)
        self.log("📊 TEST SUMMARY")
        self.log("=" * 60)
        
        if success:
            self.log("✅ Client Portal Login: WORKING")
            self.log(f"   Endpoint: /api/client-portal/login")
            self.log(f"   Test Project: {test_project['name']}")
            self.log(f"   Test Mobile: {mobile}")
            self.log(f"   Authentication: SUCCESS")
        else:
            self.log("❌ Client Portal Login: FAILED")
            self.log("   Issue: Authentication endpoint not working properly")
            self.log("   Recommendation: Check backend implementation")
        
        return success

def main():
    """Main test execution"""
    tester = ClientPortalTester()
    success = tester.run_comprehensive_test()
    
    if success:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print("\n💥 Tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()