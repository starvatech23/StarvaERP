#!/usr/bin/env python3
"""
Backend API Testing Script for Receipt APIs
Tests the new Receipt APIs in /app/backend/server.py
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://labourmanage.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "admin123"

class ReceiptAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
        self.test_results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def authenticate(self):
        """Authenticate with admin credentials"""
        try:
            auth_data = {
                "identifier": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD,
                "auth_type": "email"
            }
            
            response = self.session.post(f"{BASE_URL}/auth/login", json=auth_data)
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                self.session.headers.update({"Authorization": f"Bearer {self.access_token}"})
                self.log_result("Authentication", True, f"Successfully logged in as {ADMIN_EMAIL}")
                return True
            else:
                self.log_result("Authentication", False, f"Login failed: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Authentication", False, f"Authentication error: {str(e)}")
            return False
    
    def get_paid_payments(self):
        """Get list of paid payments to find valid payment_id for testing"""
        try:
            response = self.session.get(f"{BASE_URL}/labour/payments")
            
            if response.status_code == 200:
                payments = response.json()
                paid_payments = [p for p in payments if p.get("status") == "paid"]
                non_paid_payments = [p for p in payments if p.get("status") != "paid"]
                
                self.log_result("Get Paid Payments", True, 
                              f"Found {len(paid_payments)} paid payments out of {len(payments)} total payments")
                
                result = {
                    "paid": paid_payments[0] if paid_payments else None,
                    "non_paid": non_paid_payments[0] if non_paid_payments else None
                }
                return result
            else:
                self.log_result("Get Paid Payments", False, f"Failed to get payments: {response.status_code}", response.text)
                return None
                
        except Exception as e:
            self.log_result("Get Paid Payments", False, f"Error getting payments: {str(e)}")
            return None
    
    def test_payment_receipt_api(self, payment_id, expected_status="paid"):
        """Test GET /api/labour/payments/{payment_id}/receipt"""
        try:
            response = self.session.get(f"{BASE_URL}/labour/payments/{payment_id}/receipt")
            
            if response.status_code == 200:
                receipt_data = response.json()
                
                # Verify required fields are present
                required_fields = ["worker_name", "amount", "project_name", "paid_by", "approved_by", "paid_at"]
                missing_fields = [field for field in required_fields if field not in receipt_data]
                
                if missing_fields:
                    self.log_result("Payment Receipt API - Field Validation", False, 
                                  f"Missing required fields: {missing_fields}", receipt_data)
                else:
                    self.log_result("Payment Receipt API", True, 
                                  f"Receipt retrieved successfully for payment {payment_id}")
                    self.log_result("Receipt Data Validation", True, 
                                  f"Worker: {receipt_data['worker_name']}, Amount: ₹{receipt_data['amount']}, Project: {receipt_data['project_name']}")
                
                return receipt_data
                
            elif response.status_code == 400:
                # Expected error for non-paid payments
                error_data = response.json()
                if expected_status != "paid":
                    self.log_result("Payment Receipt API - Non-Paid Payment", True, 
                                  f"Correctly returned error for non-paid payment: {error_data.get('detail')}")
                else:
                    self.log_result("Payment Receipt API", False, 
                                  f"Unexpected 400 error: {error_data.get('detail')}")
                return None
                
            elif response.status_code == 404:
                self.log_result("Payment Receipt API", False, f"Payment not found: {payment_id}")
                return None
                
            else:
                self.log_result("Payment Receipt API", False, 
                              f"Unexpected response: {response.status_code}", response.text)
                return None
                
        except Exception as e:
            self.log_result("Payment Receipt API", False, f"Error testing receipt API: {str(e)}")
            return None
    
    def test_worker_receipts_api(self, worker_id):
        """Test GET /api/labour/workers/{worker_id}/receipts"""
        try:
            response = self.session.get(f"{BASE_URL}/labour/workers/{worker_id}/receipts")
            
            if response.status_code == 200:
                receipts_data = response.json()
                
                # Verify required fields are present
                required_fields = ["worker_id", "worker_name", "total_receipts", "total_paid", "receipts"]
                missing_fields = [field for field in required_fields if field not in receipts_data]
                
                if missing_fields:
                    self.log_result("Worker Receipts API - Field Validation", False, 
                                  f"Missing required fields: {missing_fields}", receipts_data)
                else:
                    total_receipts = receipts_data["total_receipts"]
                    total_paid = receipts_data["total_paid"]
                    worker_name = receipts_data["worker_name"]
                    
                    self.log_result("Worker Receipts API", True, 
                                  f"Worker receipts retrieved successfully for {worker_name}")
                    self.log_result("Worker Receipts Summary", True, 
                                  f"Total receipts: {total_receipts}, Total paid: ₹{total_paid}")
                    
                    # Validate individual receipt structure
                    if receipts_data["receipts"]:
                        sample_receipt = receipts_data["receipts"][0]
                        receipt_required_fields = ["payment_id", "project_name", "amount", "paid_at", "paid_by"]
                        receipt_missing_fields = [field for field in receipt_required_fields if field not in sample_receipt]
                        
                        if receipt_missing_fields:
                            self.log_result("Individual Receipt Validation", False, 
                                          f"Missing fields in receipt: {receipt_missing_fields}", sample_receipt)
                        else:
                            self.log_result("Individual Receipt Validation", True, 
                                          f"Receipt structure valid: {sample_receipt['project_name']}, ₹{sample_receipt['amount']}")
                    else:
                        self.log_result("Worker Receipts - Empty List", True, 
                                      f"No receipts found for worker {worker_name} (valid response)")
                
                return receipts_data
                
            elif response.status_code == 404:
                self.log_result("Worker Receipts API", False, f"Worker not found: {worker_id}")
                return None
                
            else:
                self.log_result("Worker Receipts API", False, 
                              f"Unexpected response: {response.status_code}", response.text)
                return None
                
        except Exception as e:
            self.log_result("Worker Receipts API", False, f"Error testing worker receipts API: {str(e)}")
            return None
    
    def test_receipt_apis_comprehensive(self):
        """Run comprehensive tests for Receipt APIs"""
        print("🧪 Starting Receipt APIs Testing...")
        print("=" * 60)
        
        # Step 1: Authenticate
        if not self.authenticate():
            return False
        
        # Step 2: Get payments to find valid test data
        payments_data = self.get_paid_payments()
        if not payments_data:
            self.log_result("Test Setup", False, "No payments available for testing")
            return False
        
        paid_payment = payments_data.get("paid")
        non_paid_payment = payments_data.get("non_paid")
        
        # Step 3: Test with paid payment
        if paid_payment:
            payment_id = paid_payment.get("id")
            worker_id = paid_payment.get("worker_id")
            payment_status = paid_payment.get("status")
            
            print(f"\n📋 Testing with Paid Payment:")
            print(f"   Payment ID: {payment_id}")
            print(f"   Worker ID: {worker_id}")
            print(f"   Payment Status: {payment_status}")
            print()
            
            # Test Payment Receipt API
            print("🔍 Testing Payment Receipt API (Paid Payment)...")
            receipt_data = self.test_payment_receipt_api(payment_id, payment_status)
            
            # Test Worker Receipts API
            if worker_id:
                print("\n🔍 Testing Worker Receipts API...")
                worker_receipts = self.test_worker_receipts_api(worker_id)
        else:
            self.log_result("Paid Payment Test", False, "No paid payments available for testing")
        
        # Step 4: Test with non-paid payment (should return error)
        if non_paid_payment:
            non_paid_id = non_paid_payment.get("id")
            non_paid_status = non_paid_payment.get("status")
            
            print(f"\n📋 Testing with Non-Paid Payment:")
            print(f"   Payment ID: {non_paid_id}")
            print(f"   Payment Status: {non_paid_status}")
            print()
            
            print("🔍 Testing Payment Receipt API (Non-Paid Payment - Should Return Error)...")
            self.test_payment_receipt_api(non_paid_id, non_paid_status)
        else:
            self.log_result("Non-Paid Payment Test", True, "No non-paid payments available (all payments are paid)")
        
        return True
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["success"]])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   • {result['test']}: {result['message']}")
        
        print("\n" + "=" * 60)

def main():
    """Main test execution"""
    tester = ReceiptAPITester()
    
    try:
        success = tester.test_receipt_apis_comprehensive()
        tester.print_summary()
        
        # Return appropriate exit code
        failed_tests = len([r for r in tester.test_results if not r["success"]])
        sys.exit(0 if failed_tests == 0 else 1)
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Testing interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n💥 Unexpected error during testing: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()