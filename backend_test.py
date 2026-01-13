#!/usr/bin/env python3
"""
Backend API Testing Script for SiteOps Construction Management App
Tests the login functionality for Marketing Head user
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BACKEND_URL = "https://authsystem-dash.preview.emergentagent.com/api"

# Test credentials for Marketing Head
TEST_CREDENTIALS = {
    "identifier": "sridiskhaa@starvacon.com",
    "password": "SriDikshaa@123", 
    "auth_type": "email"
}

def log_test_result(test_name, success, details=""):
    """Log test results with timestamp"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"[{timestamp}] {status} - {test_name}")
    if details:
        print(f"    Details: {details}")
    return success

def test_marketing_head_login():
    """Test login functionality for Marketing Head user"""
    print("=" * 80)
    print("TESTING MARKETING HEAD LOGIN FUNCTIONALITY")
    print("=" * 80)
    
    test_results = []
    
    try:
        # Test 1: Login API Call
        print(f"\n🔐 Testing login with credentials: {TEST_CREDENTIALS['identifier']}")
        
        login_url = f"{BACKEND_URL}/auth/login"
        print(f"POST {login_url}")
        
        response = requests.post(
            login_url,
            json=TEST_CREDENTIALS,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"Response Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        # Test 1: Verify HTTP 200 status
        success = log_test_result(
            "Login returns HTTP 200", 
            response.status_code == 200,
            f"Got status code: {response.status_code}"
        )
        test_results.append(success)
        
        if response.status_code != 200:
            print(f"❌ Login failed with status {response.status_code}")
            print(f"Response body: {response.text}")
            return False
        
        # Parse response JSON
        try:
            response_data = response.json()
            print(f"Response JSON: {json.dumps(response_data, indent=2)}")
        except json.JSONDecodeError as e:
            log_test_result("Parse JSON response", False, f"JSON decode error: {e}")
            return False
        
        # Test 2: Verify access_token is present
        access_token = response_data.get("access_token")
        success = log_test_result(
            "Response contains access_token",
            bool(access_token),
            f"access_token present: {bool(access_token)}"
        )
        test_results.append(success)
        
        # Test 3: Verify user object exists
        user_data = response_data.get("user")
        success = log_test_result(
            "Response contains user object",
            bool(user_data),
            f"user object present: {bool(user_data)}"
        )
        test_results.append(success)
        
        if not user_data:
            print("❌ No user object in response")
            return False
        
        # Test 4: Verify user role is marketing_head
        user_role = user_data.get("role")
        success = log_test_result(
            "User role is 'marketing_head'",
            user_role == "marketing_head",
            f"Expected: 'marketing_head', Got: '{user_role}'"
        )
        test_results.append(success)
        
        # Test 5: Verify approval_status is approved
        approval_status = user_data.get("approval_status")
        success = log_test_result(
            "User approval_status is 'approved'",
            approval_status == "approved",
            f"Expected: 'approved', Got: '{approval_status}'"
        )
        test_results.append(success)
        
        # Test 6: Verify full_name is "Sri Dikshaa"
        full_name = user_data.get("full_name")
        success = log_test_result(
            "User full_name is 'Sri Dikshaa'",
            full_name == "Sri Dikshaa",
            f"Expected: 'Sri Dikshaa', Got: '{full_name}'"
        )
        test_results.append(success)
        
        # Additional verification - print all user fields
        print(f"\n📋 Complete User Object:")
        for key, value in user_data.items():
            print(f"    {key}: {value}")
        
        # Summary
        passed_tests = sum(test_results)
        total_tests = len(test_results)
        
        print(f"\n📊 TEST SUMMARY:")
        print(f"    Total Tests: {total_tests}")
        print(f"    Passed: {passed_tests}")
        print(f"    Failed: {total_tests - passed_tests}")
        print(f"    Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if passed_tests == total_tests:
            print(f"\n🎉 ALL TESTS PASSED! Marketing Head login is working correctly.")
            return True
        else:
            print(f"\n⚠️  {total_tests - passed_tests} test(s) failed. See details above.")
            return False
            
    except requests.exceptions.RequestException as e:
        log_test_result("Login API request", False, f"Request error: {e}")
        return False
    except Exception as e:
        log_test_result("Login test execution", False, f"Unexpected error: {e}")
        return False

def main():
    """Main test execution"""
    print("SiteOps Backend API Testing")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Test User: {TEST_CREDENTIALS['identifier']}")
    
    # Run the login test
    success = test_marketing_head_login()
    
    if success:
        print(f"\n✅ MARKETING HEAD LOGIN TEST: PASSED")
        sys.exit(0)
    else:
        print(f"\n❌ MARKETING HEAD LOGIN TEST: FAILED")
        sys.exit(1)

if __name__ == "__main__":
    main()