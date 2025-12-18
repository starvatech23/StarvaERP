#!/usr/bin/env python3
"""
Backend API Testing for Labour Payment APIs
Tests all Labour Payment endpoints with realistic data
"""

import requests
import json
import base64
from datetime import datetime, timedelta
import time

# Configuration
BASE_URL = "https://labourmanage.preview.emergentagent.com/api"

# Test credentials
ADMIN_CREDENTIALS = {
    "identifier": "admin@test.com",
    "password": "admin123",
    "auth_type": "email"
}

MANAGER_CREDENTIALS = {
    "identifier": "crm.manager@test.com", 
    "password": "manager123",
    "auth_type": "email"
}

class LabourPaymentAPITester:
    def __init__(self):
        self.admin_token = None
        self.manager_token = None
        self.test_worker_id = None
        self.test_project_id = None
        self.test_payment_id = None
        self.test_otp = None
        
    def login(self, credentials):
        """Login and get access token"""
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json=credentials)
            if response.status_code == 200:
                data = response.json()
                return data.get("access_token")
            else:
                print(f"❌ Login failed: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            return None
    
    def get_headers(self, token):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {token}"}
    
    def setup_test_data(self):
        """Setup test data - get existing worker and project"""
        print("\n🔧 Setting up test data...")
        
        # Login as admin
        self.admin_token = self.login(ADMIN_CREDENTIALS)
        if not self.admin_token:
            print("❌ Failed to login as admin")
            return False
            
        # Login as manager
        self.manager_token = self.login(MANAGER_CREDENTIALS)
        if not self.manager_token:
            print("❌ Failed to login as manager")
            return False
        
        # Get existing workers
        try:
            response = requests.get(f"{BASE_URL}/workers", headers=self.get_headers(self.admin_token))
            if response.status_code == 200:
                workers = response.json()
                if workers:
                    self.test_worker_id = workers[0]["id"]
                    print(f"✅ Using existing worker: {workers[0]['full_name']} (ID: {self.test_worker_id})")
                else:
                    print("❌ No workers found in system")
                    return False
            else:
                print(f"❌ Failed to get workers: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Error getting workers: {str(e)}")
            return False
        
        # Get existing projects
        try:
            response = requests.get(f"{BASE_URL}/projects", headers=self.get_headers(self.admin_token))
            if response.status_code == 200:
                projects = response.json()
                if projects:
                    self.test_project_id = projects[0]["id"]
                    print(f"✅ Using existing project: {projects[0]['name']} (ID: {self.test_project_id})")
                else:
                    print("❌ No projects found in system")
                    return False
            else:
                print(f"❌ Failed to get projects: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Error getting projects: {str(e)}")
            return False
        
        return True
    
    def test_generate_weekly_payments(self):
        """Test POST /api/labour/payments/generate-weekly"""
        print("\n🧪 Testing Generate Weekly Payments...")
        
        # Calculate week dates (current week)
        today = datetime.now()
        week_start = today - timedelta(days=today.weekday())  # Monday
        week_end = week_start + timedelta(days=6)  # Sunday
        
        payload = {
            "week_start": week_start.strftime("%Y-%m-%d"),
            "week_end": week_end.strftime("%Y-%m-%d"),
            "project_id": self.test_project_id
        }
        
        try:
            response = requests.post(
                f"{BASE_URL}/labour/payments/generate-weekly",
                params=payload,
                headers=self.get_headers(self.admin_token)
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Generate Weekly Payments: Created {data.get('created_count', 0)} payments, Skipped {data.get('skipped_count', 0)}")
                return True
            else:
                print(f"❌ Generate Weekly Payments failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Generate Weekly Payments error: {str(e)}")
            return False
    
    def test_get_all_payments(self):
        """Test GET /api/labour/payments"""
        print("\n🧪 Testing Get All Payments...")
        
        try:
            response = requests.get(
                f"{BASE_URL}/labour/payments",
                headers=self.get_headers(self.admin_token)
            )
            
            if response.status_code == 200:
                payments = response.json()
                print(f"✅ Get All Payments: Retrieved {len(payments)} payments")
                
                if payments:
                    # Store first payment ID for later tests
                    self.test_payment_id = payments[0]["id"]
                    print(f"   📝 Sample payment: {payments[0]['worker_name']} - ₹{payments[0]['net_amount']} ({payments[0]['status']})")
                
                return True
            else:
                print(f"❌ Get All Payments failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Get All Payments error: {str(e)}")
            return False
    
    def test_get_payments_by_worker(self):
        """Test GET /api/labour/payments/by-worker"""
        print("\n🧪 Testing Get Payments By Worker...")
        
        try:
            response = requests.get(
                f"{BASE_URL}/labour/payments/by-worker",
                headers=self.get_headers(self.admin_token)
            )
            
            if response.status_code == 200:
                workers_data = response.json()
                print(f"✅ Get Payments By Worker: Retrieved data for {len(workers_data)} workers")
                
                if workers_data:
                    worker = workers_data[0]
                    print(f"   📝 Sample worker: {worker['worker_name']} - Total: ₹{worker['total_net']}, Paid: ₹{worker['paid_amount']}")
                
                return True
            else:
                print(f"❌ Get Payments By Worker failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Get Payments By Worker error: {str(e)}")
            return False
    
    def test_get_payments_by_project(self):
        """Test GET /api/labour/payments/by-project"""
        print("\n🧪 Testing Get Payments By Project...")
        
        try:
            response = requests.get(
                f"{BASE_URL}/labour/payments/by-project",
                headers=self.get_headers(self.admin_token)
            )
            
            if response.status_code == 200:
                projects_data = response.json()
                print(f"✅ Get Payments By Project: Retrieved data for {len(projects_data)} projects")
                
                if projects_data:
                    project = projects_data[0]
                    print(f"   📝 Sample project: {project['project_name']} - Workers: {len(project['total_workers'])}, Total: ₹{project['total_net']}")
                
                return True
            else:
                print(f"❌ Get Payments By Project failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Get Payments By Project error: {str(e)}")
            return False
    
    def test_validate_payment(self):
        """Test POST /api/labour/payments/{id}/validate"""
        print("\n🧪 Testing Validate Payment...")
        
        if not self.test_payment_id:
            print("❌ No payment ID available for validation test")
            return False
        
        try:
            payload = {
                "validation_notes": "Payment validated for testing purposes"
            }
            
            response = requests.post(
                f"{BASE_URL}/labour/payments/{self.test_payment_id}/validate",
                json=payload,
                headers=self.get_headers(self.admin_token)
            )
            
            if response.status_code == 200:
                payment = response.json()
                print(f"✅ Validate Payment: Status changed to '{payment['status']}'")
                print(f"   📝 Validated by: {payment.get('validated_by_name', 'Unknown')}")
                return True
            else:
                print(f"❌ Validate Payment failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Validate Payment error: {str(e)}")
            return False
    
    def test_send_otp(self):
        """Test POST /api/labour/payments/{id}/send-otp"""
        print("\n🧪 Testing Send OTP...")
        
        if not self.test_payment_id:
            print("❌ No payment ID available for OTP test")
            return False
        
        try:
            response = requests.post(
                f"{BASE_URL}/labour/payments/{self.test_payment_id}/send-otp",
                headers=self.get_headers(self.admin_token)
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Send OTP: {data['message']}")
                print(f"   📱 OTP for testing: {data.get('otp_for_testing', 'Not provided')}")
                
                # Store OTP for verification test
                self.test_otp = data.get('otp_for_testing')
                return True
            else:
                print(f"❌ Send OTP failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Send OTP error: {str(e)}")
            return False
    
    def test_verify_otp(self):
        """Test POST /api/labour/payments/{id}/verify-otp"""
        print("\n🧪 Testing Verify OTP...")
        
        if not self.test_payment_id or not self.test_otp:
            print("❌ No payment ID or OTP available for verification test")
            return False
        
        try:
            params = {
                "otp": self.test_otp,
                "payment_method": "bank_transfer",
                "payment_reference": "TXN123456789"
            }
            
            response = requests.post(
                f"{BASE_URL}/labour/payments/{self.test_payment_id}/verify-otp",
                params=params,
                headers=self.get_headers(self.admin_token)
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Verify OTP: {data['message']}")
                
                receipt = data.get('receipt', {})
                if receipt:
                    print(f"   🧾 Receipt generated for {receipt['worker_name']} - ₹{receipt['amount']}")
                    print(f"   📋 Approved by: {receipt.get('approved_by', 'Unknown')}")
                
                return True
            else:
                print(f"❌ Verify OTP failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Verify OTP error: {str(e)}")
            return False
    
    def test_upload_receipt(self):
        """Test POST /api/labour/payments/{id}/upload-receipt"""
        print("\n🧪 Testing Upload Receipt...")
        
        if not self.test_payment_id:
            print("❌ No payment ID available for receipt upload test")
            return False
        
        try:
            # Create a simple base64 encoded image (1x1 pixel PNG)
            sample_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
            
            payload = {
                "receipt_image": sample_image_base64
            }
            
            response = requests.post(
                f"{BASE_URL}/labour/payments/{self.test_payment_id}/upload-receipt",
                json=payload,
                headers=self.get_headers(self.admin_token)
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Upload Receipt: {data['message']}")
                return True
            else:
                print(f"❌ Upload Receipt failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Upload Receipt error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all Labour Payment API tests"""
        print("🚀 Starting Labour Payment API Tests")
        print("=" * 50)
        
        # Setup
        if not self.setup_test_data():
            print("❌ Test setup failed. Exiting.")
            return
        
        # Test results tracking
        tests = [
            ("Generate Weekly Payments", self.test_generate_weekly_payments),
            ("Get All Payments", self.test_get_all_payments),
            ("Get Payments By Worker", self.test_get_payments_by_worker),
            ("Get Payments By Project", self.test_get_payments_by_project),
            ("Validate Payment", self.test_validate_payment),
            ("Send OTP", self.test_send_otp),
            ("Verify OTP", self.test_verify_otp),
            ("Upload Receipt", self.test_upload_receipt)
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
                print(f"❌ {test_name} crashed: {str(e)}")
                failed += 1
            
            # Small delay between tests
            time.sleep(1)
        
        # Summary
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📈 Success Rate: {(passed/(passed+failed)*100):.1f}%")
        
        if failed == 0:
            print("\n🎉 ALL LABOUR PAYMENT APIS WORKING PERFECTLY!")
        else:
            print(f"\n⚠️  {failed} test(s) failed. Check the logs above for details.")

if __name__ == "__main__":
    tester = LabourPaymentAPITester()
    tester.run_all_tests()