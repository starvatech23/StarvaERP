#!/usr/bin/env python3
"""
Backend API Testing for Editable BOQ (Bill of Quantities) - Floor-wise Estimates
Testing the PUT /api/estimates/{estimate_id}/floors/{floor_id}/lines/{line_id} endpoint
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://buildtrack-dev.preview.emergentagent.com/api"
LOGIN_EMAIL = "crm.manager@test.com"
LOGIN_PASSWORD = "manager123"

# Test Data from review request
ESTIMATE_ID = "694250b41b2b03cfcf8b10c4"
FLOOR_ID = "4a70d0e0-7899-451f-a788-d413c2942554"  # Ground Floor
LINE_ID = "6c8e0cee-9acd-4235-9cbe-a116871351be"   # Excavation line

# Test values
NEW_QUANTITY = 75
NEW_RATE = 200
EXPECTED_AMOUNT = NEW_QUANTITY * NEW_RATE  # 15000

class BOQTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_results = []
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
        
        if details:
            print(f"   Details: {details}")
    
    def login(self):
        """Login and get authentication token"""
        try:
            login_data = {
                "identifier": LOGIN_EMAIL,
                "password": LOGIN_PASSWORD,
                "auth_type": "email"
            }
            
            response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("access_token")
                self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                
                user_info = data.get("user", {})
                self.log_test(
                    "Authentication", 
                    True, 
                    f"Successfully logged in as {user_info.get('full_name', LOGIN_EMAIL)}",
                    f"Role: {user_info.get('role')}, Token: {self.auth_token[:20]}..."
                )
                return True
            else:
                self.log_test(
                    "Authentication", 
                    False, 
                    f"Login failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("Authentication", False, f"Login error: {str(e)}")
            return False
    
    def get_estimate_before_update(self):
        """Get estimate data before making changes"""
        try:
            response = self.session.get(f"{BASE_URL}/estimates/{ESTIMATE_ID}")
            
            if response.status_code == 200:
                estimate_data = response.json()
                
                # Find the specific floor and line
                floors = estimate_data.get("floors", [])
                target_floor = None
                target_line = None
                
                for floor in floors:
                    if floor.get("id") == FLOOR_ID:
                        target_floor = floor
                        lines = floor.get("lines", [])
                        for line in lines:
                            if line.get("id") == LINE_ID:
                                target_line = line
                                break
                        break
                
                if target_floor and target_line:
                    original_quantity = target_line.get("quantity", 0)
                    original_rate = target_line.get("rate", 0)
                    original_amount = target_line.get("amount", 0)
                    original_edited = target_line.get("is_user_edited", False)
                    original_grand_total = estimate_data.get("grand_total", 0)
                    
                    self.log_test(
                        "Pre-Update Data Retrieval", 
                        True, 
                        f"Retrieved estimate data successfully",
                        f"Floor: {target_floor.get('name')}, Line: {target_line.get('item_name')}, "
                        f"Original - Qty: {original_quantity}, Rate: ₹{original_rate}, Amount: ₹{original_amount}, "
                        f"Edited: {original_edited}, Grand Total: ₹{original_grand_total}"
                    )
                    
                    return {
                        "estimate": estimate_data,
                        "floor": target_floor,
                        "line": target_line,
                        "original_quantity": original_quantity,
                        "original_rate": original_rate,
                        "original_amount": original_amount,
                        "original_edited": original_edited,
                        "original_grand_total": original_grand_total
                    }
                else:
                    self.log_test(
                        "Pre-Update Data Retrieval", 
                        False, 
                        "Could not find target floor or line item",
                        f"Floor ID: {FLOOR_ID}, Line ID: {LINE_ID}"
                    )
                    return None
            else:
                self.log_test(
                    "Pre-Update Data Retrieval", 
                    False, 
                    f"Failed to get estimate with status {response.status_code}",
                    response.text
                )
                return None
                
        except Exception as e:
            self.log_test("Pre-Update Data Retrieval", False, f"Error: {str(e)}")
            return None
    
    def update_line_item(self):
        """Test the main API: Update line item in floor-wise estimate"""
        try:
            update_data = {
                "quantity": NEW_QUANTITY,
                "rate": NEW_RATE
            }
            
            url = f"{BASE_URL}/estimates/{ESTIMATE_ID}/floors/{FLOOR_ID}/lines/{LINE_ID}"
            response = self.session.put(url, json=update_data)
            
            if response.status_code == 200:
                response_data = response.json()
                updated_line = response_data.get("line", {})
                
                # Verify response contains expected data
                updated_quantity = updated_line.get("quantity")
                updated_rate = updated_line.get("rate")
                updated_amount = updated_line.get("amount")
                is_user_edited = updated_line.get("is_user_edited")
                
                # Validate all expected fields
                validations = [
                    (updated_quantity == NEW_QUANTITY, f"Quantity: expected {NEW_QUANTITY}, got {updated_quantity}"),
                    (updated_rate == NEW_RATE, f"Rate: expected {NEW_RATE}, got {updated_rate}"),
                    (updated_amount == EXPECTED_AMOUNT, f"Amount: expected {EXPECTED_AMOUNT}, got {updated_amount}"),
                    (is_user_edited == True, f"is_user_edited: expected True, got {is_user_edited}")
                ]
                
                all_valid = all(validation[0] for validation in validations)
                validation_details = "; ".join([v[1] for v in validations if not v[0]])
                
                if all_valid:
                    self.log_test(
                        "Line Item Update API", 
                        True, 
                        "Successfully updated line item with correct calculations",
                        f"Updated - Qty: {updated_quantity}, Rate: ₹{updated_rate}, "
                        f"Amount: ₹{updated_amount}, Edited: {is_user_edited}"
                    )
                    return updated_line
                else:
                    self.log_test(
                        "Line Item Update API", 
                        False, 
                        "API response validation failed",
                        validation_details
                    )
                    return None
            else:
                self.log_test(
                    "Line Item Update API", 
                    False, 
                    f"Update failed with status {response.status_code}",
                    response.text
                )
                return None
                
        except Exception as e:
            self.log_test("Line Item Update API", False, f"Error: {str(e)}")
            return None
    
    def verify_persistence(self, original_data):
        """Verify that changes persist when fetching the estimate again"""
        try:
            response = self.session.get(f"{BASE_URL}/estimates/{ESTIMATE_ID}")
            
            if response.status_code == 200:
                estimate_data = response.json()
                
                # Find the updated floor and line
                floors = estimate_data.get("floors", [])
                target_floor = None
                target_line = None
                
                for floor in floors:
                    if floor.get("id") == FLOOR_ID:
                        target_floor = floor
                        lines = floor.get("lines", [])
                        for line in lines:
                            if line.get("id") == LINE_ID:
                                target_line = line
                                break
                        break
                
                if target_floor and target_line:
                    # Verify persistence
                    persisted_quantity = target_line.get("quantity")
                    persisted_rate = target_line.get("rate")
                    persisted_amount = target_line.get("amount")
                    persisted_edited = target_line.get("is_user_edited")
                    
                    # Verify totals recalculation
                    floor_total = target_floor.get("floor_total", 0)
                    grand_total = estimate_data.get("grand_total", 0)
                    original_grand_total = original_data.get("original_grand_total", 0)
                    
                    # Calculate expected change in grand total
                    original_line_amount = original_data.get("original_amount", 0)
                    amount_difference = persisted_amount - original_line_amount
                    expected_grand_total = original_grand_total + amount_difference
                    
                    validations = [
                        (persisted_quantity == NEW_QUANTITY, f"Persisted quantity: expected {NEW_QUANTITY}, got {persisted_quantity}"),
                        (persisted_rate == NEW_RATE, f"Persisted rate: expected {NEW_RATE}, got {persisted_rate}"),
                        (persisted_amount == EXPECTED_AMOUNT, f"Persisted amount: expected {EXPECTED_AMOUNT}, got {persisted_amount}"),
                        (persisted_edited == True, f"Persisted is_user_edited: expected True, got {persisted_edited}"),
                        (abs(grand_total - expected_grand_total) < 0.01, f"Grand total: expected ~₹{expected_grand_total}, got ₹{grand_total}")
                    ]
                    
                    all_valid = all(validation[0] for validation in validations)
                    validation_details = "; ".join([v[1] for v in validations if not v[0]])
                    
                    if all_valid:
                        self.log_test(
                            "Data Persistence Verification", 
                            True, 
                            "All changes persisted correctly with proper total recalculation",
                            f"Floor Total: ₹{floor_total}, Grand Total: ₹{grand_total} "
                            f"(change: +₹{amount_difference})"
                        )
                        return True
                    else:
                        self.log_test(
                            "Data Persistence Verification", 
                            False, 
                            "Persistence validation failed",
                            validation_details
                        )
                        return False
                else:
                    self.log_test(
                        "Data Persistence Verification", 
                        False, 
                        "Could not find target floor or line after update"
                    )
                    return False
            else:
                self.log_test(
                    "Data Persistence Verification", 
                    False, 
                    f"Failed to fetch estimate with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_test("Data Persistence Verification", False, f"Error: {str(e)}")
            return False
    
    def verify_edited_badge_logic(self):
        """Verify that the 'Edited' badge logic works (is_user_edited = true)"""
        try:
            response = self.session.get(f"{BASE_URL}/estimates/{ESTIMATE_ID}")
            
            if response.status_code == 200:
                estimate_data = response.json()
                
                # Count edited vs non-edited lines
                edited_lines = 0
                total_lines = 0
                
                floors = estimate_data.get("floors", [])
                for floor in floors:
                    lines = floor.get("lines", [])
                    for line in lines:
                        total_lines += 1
                        if line.get("is_user_edited", False):
                            edited_lines += 1
                
                # Our target line should be marked as edited
                target_line_edited = False
                for floor in floors:
                    if floor.get("id") == FLOOR_ID:
                        lines = floor.get("lines", [])
                        for line in lines:
                            if line.get("id") == LINE_ID:
                                target_line_edited = line.get("is_user_edited", False)
                                break
                        break
                
                if target_line_edited and edited_lines >= 1:
                    self.log_test(
                        "Edited Badge Logic", 
                        True, 
                        "Edited badge logic working correctly",
                        f"Target line marked as edited: {target_line_edited}, "
                        f"Total edited lines: {edited_lines}/{total_lines}"
                    )
                    return True
                else:
                    self.log_test(
                        "Edited Badge Logic", 
                        False, 
                        "Edited badge logic not working",
                        f"Target line edited: {target_line_edited}, "
                        f"Total edited lines: {edited_lines}/{total_lines}"
                    )
                    return False
            else:
                self.log_test(
                    "Edited Badge Logic", 
                    False, 
                    f"Failed to fetch estimate for badge verification with status {response.status_code}"
                )
                return False
                
        except Exception as e:
            self.log_test("Edited Badge Logic", False, f"Error: {str(e)}")
            return False
    
    def run_comprehensive_test(self):
        """Run the complete test suite"""
        print("=" * 80)
        print("🧪 BACKEND TESTING: Editable BOQ (Floor-wise Estimates)")
        print("=" * 80)
        print(f"Testing API: PUT /api/estimates/{{estimate_id}}/floors/{{floor_id}}/lines/{{line_id}}")
        print(f"Base URL: {BASE_URL}")
        print(f"Estimate ID: {ESTIMATE_ID}")
        print(f"Floor ID: {FLOOR_ID}")
        print(f"Line ID: {LINE_ID}")
        print(f"Test Values: Quantity={NEW_QUANTITY}, Rate=₹{NEW_RATE}")
        print("-" * 80)
        
        # Step 1: Login
        if not self.login():
            print("\n❌ CRITICAL: Authentication failed. Cannot proceed with tests.")
            return False
        
        # Step 2: Get original data
        original_data = self.get_estimate_before_update()
        if not original_data:
            print("\n❌ CRITICAL: Could not retrieve original estimate data. Cannot proceed.")
            return False
        
        # Step 3: Update line item
        updated_line = self.update_line_item()
        if not updated_line:
            print("\n❌ CRITICAL: Line item update failed. Cannot proceed with verification.")
            return False
        
        # Step 4: Verify persistence
        persistence_ok = self.verify_persistence(original_data)
        
        # Step 5: Verify edited badge logic
        badge_logic_ok = self.verify_edited_badge_logic()
        
        # Summary
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
        passed_tests = sum(1 for result in self.test_results if result["success"])
        total_tests = len(self.test_results)
        success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        print("\nDetailed Results:")
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}: {result['message']}")
        
        # Overall assessment
        critical_tests_passed = (
            any(r["test"] == "Line Item Update API" and r["success"] for r in self.test_results) and
            persistence_ok and
            badge_logic_ok
        )
        
        if critical_tests_passed:
            print(f"\n🎉 OVERALL RESULT: ✅ SUCCESS")
            print("The Editable BOQ (Floor-wise Estimates) feature is working correctly!")
            print("✅ Line item updates work")
            print("✅ Amount calculations are correct") 
            print("✅ is_user_edited flag is set properly")
            print("✅ Changes persist correctly")
            print("✅ Totals are recalculated properly")
            return True
        else:
            print(f"\n💥 OVERALL RESULT: ❌ FAILURE")
            print("The Editable BOQ feature has critical issues that need to be addressed.")
            return False

def main():
    """Main test execution"""
    tester = BOQTester()
    success = tester.run_comprehensive_test()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()