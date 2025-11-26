#!/usr/bin/env python3
"""
Backend API Testing for Construction Management App - Phase 1 Authentication System
Tests all authentication endpoints and user management functionality
"""

import requests
import json
import os
from datetime import datetime
import time

# Get backend URL from environment
BACKEND_URL = os.getenv('EXPO_PUBLIC_BACKEND_URL', 'https://d1fac5b1-21be-4954-a671-7c4584c5db41.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_test_header(test_name):
    print(f"\n{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.BLUE}{Colors.BOLD}Testing: {test_name}{Colors.ENDC}")
    print(f"{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.ENDC}")

def print_success(message):
    print(f"{Colors.GREEN}✅ {message}{Colors.ENDC}")

def print_error(message):
    print(f"{Colors.RED}❌ {message}{Colors.ENDC}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.ENDC}")

def print_info(message):
    print(f"{Colors.BLUE}ℹ️  {message}{Colors.ENDC}")

class ConstructionAppTester:
    def __init__(self):
        self.session = requests.Session()
        self.tokens = {}
        self.users = {}
        self.test_results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
        
    def log_result(self, test_name, success, message="", error_details=""):
        if success:
            self.test_results['passed'] += 1
            print_success(f"{test_name}: {message}")
        else:
            self.test_results['failed'] += 1
            error_msg = f"{test_name}: {message}"
            if error_details:
                error_msg += f" - {error_details}"
            self.test_results['errors'].append(error_msg)
            print_error(error_msg)

    def test_api_health(self):
        """Test API health check endpoint"""
        print_test_header("API Health Check")
        
        try:
            response = self.session.get(f"{API_BASE}/")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'running':
                    self.log_result("Health Check", True, "API is running")
                    print_info(f"API Version: {data.get('version', 'Unknown')}")
                    return True
                else:
                    self.log_result("Health Check", False, f"Unexpected status: {data.get('status')}")
            else:
                self.log_result("Health Check", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_result("Health Check", False, "Connection failed", str(e))
            
        return False

    def test_email_registration(self):
        """Test email registration flow"""
        print_test_header("Email Registration")
        
        # Test data
        test_users = [
            {
                "email": "john.engineer@construction.com",
                "password": "SecurePass123!",
                "full_name": "John Smith",
                "role": "engineer",
                "auth_type": "email",
                "address": "123 Construction Ave, Builder City"
            },
            {
                "email": "sarah.manager@construction.com", 
                "password": "ManagerPass456!",
                "full_name": "Sarah Johnson",
                "role": "project_manager",
                "auth_type": "email"
            },
            {
                "email": "admin@construction.com",
                "password": "AdminPass789!",
                "full_name": "Admin User",
                "role": "admin",
                "auth_type": "email"
            }
        ]
        
        for user_data in test_users:
            try:
                response = self.session.post(f"{API_BASE}/auth/register", json=user_data)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Validate response structure
                    required_fields = ['access_token', 'token_type', 'user']
                    if all(field in data for field in required_fields):
                        user_info = data['user']
                        
                        # Store token and user info
                        self.tokens[user_data['role']] = data['access_token']
                        self.users[user_data['role']] = user_info
                        
                        # Validate user data
                        if (user_info['email'] == user_data['email'] and 
                            user_info['full_name'] == user_data['full_name'] and
                            user_info['role'] == user_data['role']):
                            
                            self.log_result("Email Registration", True, 
                                          f"User {user_data['role']} registered successfully")
                            print_info(f"User ID: {user_info['id']}")
                            print_info(f"Token Type: {data['token_type']}")
                        else:
                            self.log_result("Email Registration", False, 
                                          f"User data mismatch for {user_data['role']}")
                    else:
                        self.log_result("Email Registration", False, 
                                      f"Missing required fields in response for {user_data['role']}")
                        
                elif response.status_code == 400:
                    # Check if it's a duplicate email error
                    error_data = response.json()
                    if "already registered" in error_data.get('detail', ''):
                        print_warning(f"User {user_data['email']} already exists - skipping")
                        # Try to login instead
                        login_data = {
                            "identifier": user_data['email'],
                            "password": user_data['password'],
                            "auth_type": "email"
                        }
                        login_response = self.session.post(f"{API_BASE}/auth/login", json=login_data)
                        if login_response.status_code == 200:
                            login_result = login_response.json()
                            self.tokens[user_data['role']] = login_result['access_token']
                            self.users[user_data['role']] = login_result['user']
                            self.log_result("Email Registration", True, 
                                          f"Existing user {user_data['role']} logged in")
                        else:
                            self.log_result("Email Registration", False, 
                                          f"Failed to login existing user {user_data['role']}")
                    else:
                        self.log_result("Email Registration", False, 
                                      f"Registration failed for {user_data['role']}: {error_data.get('detail')}")
                else:
                    self.log_result("Email Registration", False, 
                                  f"HTTP {response.status_code} for {user_data['role']}")
                    
            except Exception as e:
                self.log_result("Email Registration", False, 
                              f"Exception for {user_data['role']}", str(e))

    def test_email_login(self):
        """Test email login flow"""
        print_test_header("Email Login")
        
        # Test with registered user
        login_data = {
            "identifier": "john.engineer@construction.com",
            "password": "SecurePass123!",
            "auth_type": "email"
        }
        
        try:
            response = self.session.post(f"{API_BASE}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                
                if 'access_token' in data and 'user' in data:
                    user_info = data['user']
                    
                    # Check if last_login was updated
                    if 'last_login' in user_info and user_info['last_login']:
                        self.log_result("Email Login", True, "Login successful with updated timestamp")
                        print_info(f"Last Login: {user_info['last_login']}")
                        
                        # Update stored token
                        self.tokens['engineer'] = data['access_token']
                    else:
                        self.log_result("Email Login", False, "last_login not updated")
                else:
                    self.log_result("Email Login", False, "Missing required fields in response")
            else:
                self.log_result("Email Login", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_result("Email Login", False, "Login request failed", str(e))

    def test_phone_otp_flow(self):
        """Test phone OTP registration and login flow"""
        print_test_header("Phone OTP Flow")
        
        phone_number = "+1234567890"
        
        # Step 1: Send OTP
        try:
            otp_request = {"phone": phone_number}
            response = self.session.post(f"{API_BASE}/auth/send-otp", json=otp_request)
            
            if response.status_code == 200:
                data = response.json()
                
                if 'otp' in data:  # Mock OTP is returned
                    otp_code = data['otp']
                    self.log_result("Send OTP", True, f"OTP sent successfully: {otp_code}")
                    
                    # Step 2: Verify OTP and register
                    verify_data = {
                        "phone": phone_number,
                        "otp": otp_code,
                        "full_name": "Mike Worker",
                        "role": "worker"
                    }
                    
                    verify_response = self.session.post(f"{API_BASE}/auth/verify-otp", json=verify_data)
                    
                    if verify_response.status_code == 200:
                        verify_result = verify_response.json()
                        
                        if 'access_token' in verify_result and 'user' in verify_result:
                            user_info = verify_result['user']
                            
                            # Store token and user info
                            self.tokens['worker'] = verify_result['access_token']
                            self.users['worker'] = user_info
                            
                            if (user_info['phone'] == phone_number and 
                                user_info['full_name'] == "Mike Worker" and
                                user_info['role'] == "worker"):
                                
                                self.log_result("OTP Verification", True, "User registered via OTP")
                                print_info(f"Worker User ID: {user_info['id']}")
                            else:
                                self.log_result("OTP Verification", False, "User data mismatch")
                        else:
                            self.log_result("OTP Verification", False, "Missing required fields")
                    else:
                        self.log_result("OTP Verification", False, f"HTTP {verify_response.status_code}")
                        
                else:
                    self.log_result("Send OTP", False, "OTP not returned in response")
            else:
                self.log_result("Send OTP", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_result("Phone OTP Flow", False, "OTP flow failed", str(e))

    def test_protected_endpoint(self):
        """Test protected endpoint with JWT token"""
        print_test_header("Protected Endpoint Test")
        
        # Test with valid token
        if 'engineer' in self.tokens:
            headers = {"Authorization": f"Bearer {self.tokens['engineer']}"}
            
            try:
                response = self.session.get(f"{API_BASE}/auth/me", headers=headers)
                
                if response.status_code == 200:
                    user_data = response.json()
                    
                    if 'id' in user_data and 'email' in user_data and 'role' in user_data:
                        self.log_result("Protected Endpoint (Valid Token)", True, 
                                      f"User info retrieved: {user_data['full_name']}")
                        print_info(f"User Role: {user_data['role']}")
                        print_info(f"User Email: {user_data['email']}")
                    else:
                        self.log_result("Protected Endpoint (Valid Token)", False, 
                                      "Incomplete user data returned")
                else:
                    self.log_result("Protected Endpoint (Valid Token)", False, 
                                  f"HTTP {response.status_code}")
                    
            except Exception as e:
                self.log_result("Protected Endpoint (Valid Token)", False, 
                              "Request failed", str(e))
        else:
            self.log_result("Protected Endpoint (Valid Token)", False, 
                          "No valid token available")
        
        # Test without token (should return 401)
        try:
            response = self.session.get(f"{API_BASE}/auth/me")
            
            if response.status_code == 401:
                self.log_result("Protected Endpoint (No Token)", True, 
                              "Correctly rejected request without token")
            else:
                self.log_result("Protected Endpoint (No Token)", False, 
                              f"Expected 401, got {response.status_code}")
                
        except Exception as e:
            self.log_result("Protected Endpoint (No Token)", False, 
                          "Request failed", str(e))

    def test_users_endpoint(self):
        """Test users endpoint with role-based access"""
        print_test_header("Users Endpoint (Role-based Access)")
        
        # Test with admin token
        if 'admin' in self.tokens:
            headers = {"Authorization": f"Bearer {self.tokens['admin']}"}
            
            try:
                response = self.session.get(f"{API_BASE}/users", headers=headers)
                
                if response.status_code == 200:
                    users_list = response.json()
                    
                    if isinstance(users_list, list) and len(users_list) > 0:
                        self.log_result("Users List (Admin)", True, 
                                      f"Retrieved {len(users_list)} users")
                        
                        # Check user structure
                        first_user = users_list[0]
                        required_fields = ['id', 'full_name', 'role', 'is_active']
                        if all(field in first_user for field in required_fields):
                            print_info("User data structure is correct")
                        else:
                            print_warning("Some user fields missing")
                            
                    else:
                        self.log_result("Users List (Admin)", False, "Empty or invalid users list")
                else:
                    self.log_result("Users List (Admin)", False, f"HTTP {response.status_code}")
                    
            except Exception as e:
                self.log_result("Users List (Admin)", False, "Request failed", str(e))
        else:
            self.log_result("Users List (Admin)", False, "No admin token available")
        
        # Test users by role
        if 'admin' in self.tokens:
            headers = {"Authorization": f"Bearer {self.tokens['admin']}"}
            
            try:
                response = self.session.get(f"{API_BASE}/users/by-role/engineer", headers=headers)
                
                if response.status_code == 200:
                    engineers = response.json()
                    
                    if isinstance(engineers, list):
                        engineer_count = len(engineers)
                        self.log_result("Users by Role", True, f"Found {engineer_count} engineers")
                        
                        # Verify all returned users are engineers
                        if engineer_count > 0:
                            all_engineers = all(user.get('role') == 'engineer' for user in engineers)
                            if all_engineers:
                                print_info("All returned users have engineer role")
                            else:
                                print_warning("Some returned users don't have engineer role")
                    else:
                        self.log_result("Users by Role", False, "Invalid response format")
                else:
                    self.log_result("Users by Role", False, f"HTTP {response.status_code}")
                    
            except Exception as e:
                self.log_result("Users by Role", False, "Request failed", str(e))

    def test_invalid_credentials(self):
        """Test login with invalid credentials"""
        print_test_header("Invalid Credentials Test")
        
        # Test wrong password
        wrong_password_data = {
            "identifier": "john.engineer@construction.com",
            "password": "WrongPassword123!",
            "auth_type": "email"
        }
        
        try:
            response = self.session.post(f"{API_BASE}/auth/login", json=wrong_password_data)
            
            if response.status_code == 401:
                error_data = response.json()
                if 'detail' in error_data:
                    self.log_result("Wrong Password", True, "Correctly rejected wrong password")
                    print_info(f"Error message: {error_data['detail']}")
                else:
                    self.log_result("Wrong Password", False, "No error message in response")
            else:
                self.log_result("Wrong Password", False, f"Expected 401, got {response.status_code}")
                
        except Exception as e:
            self.log_result("Wrong Password", False, "Request failed", str(e))
        
        # Test non-existent email
        nonexistent_email_data = {
            "identifier": "nonexistent@construction.com",
            "password": "SomePassword123!",
            "auth_type": "email"
        }
        
        try:
            response = self.session.post(f"{API_BASE}/auth/login", json=nonexistent_email_data)
            
            if response.status_code == 401:
                error_data = response.json()
                if 'detail' in error_data:
                    self.log_result("Non-existent Email", True, "Correctly rejected non-existent email")
                    print_info(f"Error message: {error_data['detail']}")
                else:
                    self.log_result("Non-existent Email", False, "No error message in response")
            else:
                self.log_result("Non-existent Email", False, f"Expected 401, got {response.status_code}")
                
        except Exception as e:
            self.log_result("Non-existent Email", False, "Request failed", str(e))

    def test_different_user_roles(self):
        """Test creating users with different roles"""
        print_test_header("Different User Roles Test")
        
        roles_to_test = [
            {"role": "vendor", "name": "Vendor Company", "email": "vendor@construction.com"},
        ]
        
        for role_data in roles_to_test:
            user_data = {
                "email": role_data["email"],
                "password": "TestPass123!",
                "full_name": role_data["name"],
                "role": role_data["role"],
                "auth_type": "email"
            }
            
            try:
                response = self.session.post(f"{API_BASE}/auth/register", json=user_data)
                
                if response.status_code == 200:
                    data = response.json()
                    user_info = data['user']
                    
                    if user_info['role'] == role_data["role"]:
                        self.log_result(f"Role {role_data['role']}", True, 
                                      f"User with role {role_data['role']} created successfully")
                        self.tokens[role_data['role']] = data['access_token']
                        self.users[role_data['role']] = user_info
                    else:
                        self.log_result(f"Role {role_data['role']}", False, 
                                      f"Role mismatch: expected {role_data['role']}, got {user_info['role']}")
                        
                elif response.status_code == 400:
                    error_data = response.json()
                    if "already registered" in error_data.get('detail', ''):
                        print_warning(f"User with role {role_data['role']} already exists")
                        self.log_result(f"Role {role_data['role']}", True, 
                                      f"Role {role_data['role']} already exists (expected)")
                    else:
                        self.log_result(f"Role {role_data['role']}", False, 
                                      f"Registration failed: {error_data.get('detail')}")
                else:
                    self.log_result(f"Role {role_data['role']}", False, 
                                  f"HTTP {response.status_code}")
                    
            except Exception as e:
                self.log_result(f"Role {role_data['role']}", False, 
                              f"Exception for role {role_data['role']}", str(e))

    def run_all_tests(self):
        """Run all authentication tests"""
        print(f"{Colors.BOLD}{Colors.BLUE}")
        print("=" * 80)
        print("CONSTRUCTION MANAGEMENT APP - BACKEND AUTHENTICATION TESTING")
        print("=" * 80)
        print(f"{Colors.ENDC}")
        
        print_info(f"Testing Backend URL: {API_BASE}")
        print_info(f"Test Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Run tests in sequence
        if self.test_api_health():
            self.test_email_registration()
            self.test_email_login()
            self.test_phone_otp_flow()
            self.test_protected_endpoint()
            self.test_users_endpoint()
            self.test_invalid_credentials()
            self.test_different_user_roles()
        else:
            print_error("API health check failed - skipping other tests")
        
        # Print final results
        self.print_final_results()

    def print_final_results(self):
        """Print final test results summary"""
        print(f"\n{Colors.BOLD}{Colors.BLUE}")
        print("=" * 80)
        print("FINAL TEST RESULTS")
        print("=" * 80)
        print(f"{Colors.ENDC}")
        
        total_tests = self.test_results['passed'] + self.test_results['failed']
        success_rate = (self.test_results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        print(f"{Colors.BOLD}Total Tests: {total_tests}{Colors.ENDC}")
        print(f"{Colors.GREEN}Passed: {self.test_results['passed']}{Colors.ENDC}")
        print(f"{Colors.RED}Failed: {self.test_results['failed']}{Colors.ENDC}")
        print(f"{Colors.BOLD}Success Rate: {success_rate:.1f}%{Colors.ENDC}")
        
        if self.test_results['errors']:
            print(f"\n{Colors.RED}{Colors.BOLD}FAILED TESTS:{Colors.ENDC}")
            for i, error in enumerate(self.test_results['errors'], 1):
                print(f"{Colors.RED}{i}. {error}{Colors.ENDC}")
        
        if self.tokens:
            print(f"\n{Colors.GREEN}{Colors.BOLD}GENERATED TOKENS:{Colors.ENDC}")
            for role, token in self.tokens.items():
                print(f"{Colors.GREEN}{role}: {token[:50]}...{Colors.ENDC}")
        
        print(f"\n{Colors.BLUE}Test Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{Colors.ENDC}")

if __name__ == "__main__":
    tester = ConstructionAppTester()
    tester.run_all_tests()