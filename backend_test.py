#!/usr/bin/env python3
"""
Backend API Testing for Budgeting & Estimation - Edit & Export Features
Tests the new endpoints:
1. PUT /api/estimates/{estimate_id}/lines/{line_id} - Update BOQ line item
2. GET /api/estimates/{estimate_id}/export/csv - Export to CSV
3. GET /api/estimates/{estimate_id}/export/pdf - Export to PDF (HTML)
4. Existing endpoints verification
"""

import requests
import json
from datetime import datetime
import sys
import os

# Backend URL from frontend .env
BACKEND_URL = "https://budget-wizard-67.preview.emergentagent.com/api"

# Test credentials - Using CRM Manager as specified in requirements
TEST_CREDENTIALS = {
    "identifier": "crm.manager@test.com",
    "password": "manager123",
    "auth_type": "email"
}

# Fallback credentials
ADMIN_CREDENTIALS = {
    "identifier": "admin@test.com",
    "password": "admin123",
    "auth_type": "email"
}

PM_CREDENTIALS = {
    "identifier": "pm@test.com", 
    "password": "pm123",
    "auth_type": "email"
}

class EstimationTester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.user_id = None
        self.test_project_id = None
        self.test_estimate_id = None
        self.test_line_id = None
        self.results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "message": message,
            "details": details or {},
            "timestamp": datetime.now().isoformat()
        }
        self.results.append(result)
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def authenticate(self):
        """Authenticate with test credentials"""
        # Try CRM Manager credentials first
        credentials_to_try = [TEST_CREDENTIALS, ADMIN_CREDENTIALS, PM_CREDENTIALS]
        
        for creds in credentials_to_try:
            try:
                response = self.session.post(f"{BACKEND_URL}/auth/login", json=creds)
                
                if response.status_code == 200:
                    data = response.json()
                    self.token = data["access_token"]
                    self.user_id = data["user"]["id"]
                    self.session.headers.update({
                        "Authorization": f"Bearer {self.token}"
                    })
                    self.log_result("Authentication", True, f"Logged in as {creds['identifier']}")
                    return True
                    
            except Exception as e:
                continue
                
        self.log_result("Authentication", False, "All login attempts failed")
        return False
    
    def setup_test_data(self):
        """Create test project and estimate for testing"""
        try:
            # Create test project
            project_data = {
                "name": f"Test Estimation Project {datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "description": "Test project for estimation edit & export features",
                "location": "Test Location",
                "status": "planning",
                "start_date": "2024-01-01",
                "end_date": "2024-12-31",
                "budget": 5000000.0
            }
            
            response = self.session.post(f"{BACKEND_URL}/projects", json=project_data)
            if response.status_code == 200:
                project = response.json()
                self.test_project_id = project["id"]
                self.log_result("Test Project Creation", True, f"Created project: {project['name']}")
            else:
                self.log_result("Test Project Creation", False, f"Failed to create project: {response.status_code}",
                              {"response": response.text})
                return False
            
            # Create test estimate
            estimate_data = {
                "project_id": self.test_project_id,
                "version_name": "Test Estimate v1",
                "built_up_area_sqft": 2000.0,
                "num_floors": 2,
                "package_type": "premium",
                "contingency_percent": 10.0,
                "labour_percent_of_material": 25.0,
                "status": "draft"
            }
            
            response = self.session.post(f"{BACKEND_URL}/estimates", json=estimate_data)
            if response.status_code == 200:
                estimate = response.json()
                self.test_estimate_id = estimate["id"]
                # Get first line item for testing
                if estimate.get("lines") and len(estimate["lines"]) > 0:
                    self.test_line_id = estimate["lines"][0]["id"]
                self.log_result("Test Estimate Creation", True, 
                              f"Created estimate with {len(estimate.get('lines', []))} line items")
                return True
            else:
                self.log_result("Test Estimate Creation", False, f"Failed to create estimate: {response.status_code}",
                              {"response": response.text})
                return False
                
        except Exception as e:
            self.log_result("Test Data Setup", False, f"Setup error: {str(e)}")
            return False
    
    def test_existing_endpoints(self):
        """Test existing endpoints to ensure they still work"""
        tests_passed = 0
        total_tests = 3
        
        try:
            # Test 1: POST /api/estimates (already tested in setup, but verify response structure)
            if self.test_estimate_id:
                self.log_result("POST /api/estimates", True, "Estimate creation working correctly")
                tests_passed += 1
            else:
                self.log_result("POST /api/estimates", False, "Estimate creation failed")
            
            # Test 2: GET /api/estimates/{estimate_id}
            response = self.session.get(f"{BACKEND_URL}/estimates/{self.test_estimate_id}")
            if response.status_code == 200:
                estimate = response.json()
                required_fields = ["id", "project_id", "grand_total", "cost_per_sqft", "lines"]
                missing_fields = [field for field in required_fields if field not in estimate]
                
                if not missing_fields and len(estimate.get("lines", [])) > 0:
                    self.log_result("GET /api/estimates/{id}", True, 
                                  f"Retrieved estimate with {len(estimate['lines'])} lines, Grand Total: ₹{estimate['grand_total']:,.2f}")
                    tests_passed += 1
                else:
                    self.log_result("GET /api/estimates/{id}", False, f"Missing fields: {missing_fields}")
            else:
                self.log_result("GET /api/estimates/{id}", False, f"Failed to get estimate: {response.status_code}",
                              {"response": response.text})
            
            # Test 3: GET /api/projects/{project_id}/estimates
            response = self.session.get(f"{BACKEND_URL}/projects/{self.test_project_id}/estimates")
            if response.status_code == 200:
                estimates = response.json()
                if len(estimates) > 0 and estimates[0].get("id") == self.test_estimate_id:
                    self.log_result("GET /api/projects/{id}/estimates", True, 
                                  f"Listed {len(estimates)} estimates for project")
                    tests_passed += 1
                else:
                    self.log_result("GET /api/projects/{id}/estimates", False, "No estimates found or incorrect data")
            else:
                self.log_result("GET /api/projects/{id}/estimates", False, f"Failed to list estimates: {response.status_code}",
                              {"response": response.text})
                
        except Exception as e:
            self.log_result("Existing Endpoints Test", False, f"Error testing existing endpoints: {str(e)}")
        
        return tests_passed, total_tests
    
    def test_line_update_endpoint(self):
        """Test PUT /api/estimates/{estimate_id}/lines/{line_id} - Update BOQ line item"""
        if not self.test_line_id:
            self.log_result("Line Update Test", False, "No test line ID available")
            return False
        
        try:
            # Get original line data first
            response = self.session.get(f"{BACKEND_URL}/estimates/{self.test_estimate_id}")
            if response.status_code != 200:
                self.log_result("Line Update Test - Get Original", False, "Failed to get original estimate")
                return False
            
            original_estimate = response.json()
            original_line = None
            for line in original_estimate.get("lines", []):
                if line["id"] == self.test_line_id:
                    original_line = line
                    break
            
            if not original_line:
                self.log_result("Line Update Test", False, "Test line not found in estimate")
                return False
            
            original_quantity = original_line["quantity"]
            original_rate = original_line["rate"]
            original_amount = original_line["amount"]
            original_total = original_estimate["grand_total"]
            
            # Test updating quantity and rate
            new_quantity = original_quantity * 1.5  # Increase by 50%
            new_rate = original_rate * 1.2  # Increase by 20%
            expected_new_amount = new_quantity * new_rate
            
            # Make the update request
            update_params = {
                "quantity": new_quantity,
                "rate": new_rate
            }
            
            response = self.session.put(
                f"{BACKEND_URL}/estimates/{self.test_estimate_id}/lines/{self.test_line_id}",
                params=update_params
            )
            
            if response.status_code == 200:
                update_result = response.json()
                
                # Verify the response
                if "new_total" in update_result:
                    # Get updated estimate to verify changes
                    response = self.session.get(f"{BACKEND_URL}/estimates/{self.test_estimate_id}")
                    if response.status_code == 200:
                        updated_estimate = response.json()
                        updated_line = None
                        for line in updated_estimate.get("lines", []):
                            if line["id"] == self.test_line_id:
                                updated_line = line
                                break
                        
                        if updated_line:
                            # Verify all changes
                            checks = []
                            checks.append(("quantity", updated_line["quantity"] == new_quantity))
                            checks.append(("rate", updated_line["rate"] == new_rate))
                            checks.append(("amount", abs(updated_line["amount"] - expected_new_amount) < 0.01))
                            checks.append(("is_user_edited", updated_line.get("is_user_edited", False) == True))
                            checks.append(("total_recalculated", updated_estimate["grand_total"] != original_total))
                            
                            failed_checks = [check[0] for check in checks if not check[1]]
                            
                            if not failed_checks:
                                self.log_result("PUT /api/estimates/{id}/lines/{line_id}", True,
                                              f"Line updated successfully. Quantity: {original_quantity}→{new_quantity}, "
                                              f"Rate: ₹{original_rate:,.2f}→₹{new_rate:,.2f}, "
                                              f"Amount: ₹{original_amount:,.2f}→₹{updated_line['amount']:,.2f}, "
                                              f"Total: ₹{original_total:,.2f}→₹{updated_estimate['grand_total']:,.2f}")
                                return True
                            else:
                                self.log_result("PUT /api/estimates/{id}/lines/{line_id}", False,
                                              f"Verification failed for: {', '.join(failed_checks)}",
                                              {"updated_line": updated_line, "expected_amount": expected_new_amount})
                        else:
                            self.log_result("PUT /api/estimates/{id}/lines/{line_id}", False, "Updated line not found")
                    else:
                        self.log_result("PUT /api/estimates/{id}/lines/{line_id}", False, "Failed to get updated estimate")
                else:
                    self.log_result("PUT /api/estimates/{id}/lines/{line_id}", False, "Response missing 'new_total' field")
            else:
                self.log_result("PUT /api/estimates/{id}/lines/{line_id}", False, 
                              f"Update failed: {response.status_code}", {"response": response.text})
                
        except Exception as e:
            self.log_result("PUT /api/estimates/{id}/lines/{line_id}", False, f"Error: {str(e)}")
        
        return False
    
    def test_csv_export_endpoint(self):
        """Test GET /api/estimates/{estimate_id}/export/csv - Export to CSV"""
        try:
            response = self.session.get(f"{BACKEND_URL}/estimates/{self.test_estimate_id}/export/csv")
            
            if response.status_code == 200:
                # Check headers
                content_type = response.headers.get("content-type", "")
                content_disposition = response.headers.get("content-disposition", "")
                
                # Check content
                csv_content = response.text
                
                # Verify CSV structure
                checks = []
                checks.append(("content_type", "text/csv" in content_type))
                checks.append(("content_disposition", "attachment" in content_disposition and ".csv" in content_disposition))
                checks.append(("project_info", "PROJECT ESTIMATE" in csv_content))
                checks.append(("cost_summary", "COST SUMMARY" in csv_content))
                checks.append(("boq_header", "BILL OF QUANTITIES" in csv_content))
                checks.append(("line_items", "Item Name" in csv_content and "Quantity" in csv_content))
                
                failed_checks = [check[0] for check in checks if not check[1]]
                
                if not failed_checks:
                    # Count lines to verify content
                    lines = csv_content.split('\n')
                    non_empty_lines = [line for line in lines if line.strip()]
                    
                    self.log_result("GET /api/estimates/{id}/export/csv", True,
                                  f"CSV export successful. File size: {len(csv_content)} chars, "
                                  f"Lines: {len(non_empty_lines)}, Headers: {content_disposition}")
                    return True
                else:
                    self.log_result("GET /api/estimates/{id}/export/csv", False,
                                  f"CSV validation failed: {', '.join(failed_checks)}",
                                  {"content_preview": csv_content[:500]})
            else:
                self.log_result("GET /api/estimates/{id}/export/csv", False,
                              f"Export failed: {response.status_code}", {"response": response.text})
                
        except Exception as e:
            self.log_result("GET /api/estimates/{id}/export/csv", False, f"Error: {str(e)}")
        
        return False
    
    def test_pdf_export_endpoint(self):
        """Test GET /api/estimates/{estimate_id}/export/pdf - Export to PDF (HTML)"""
        try:
            response = self.session.get(f"{BACKEND_URL}/estimates/{self.test_estimate_id}/export/pdf")
            
            if response.status_code == 200:
                # Check headers
                content_type = response.headers.get("content-type", "")
                content_disposition = response.headers.get("content-disposition", "")
                
                # Check content
                html_content = response.text
                
                # Verify HTML structure
                checks = []
                checks.append(("content_type", "text/html" in content_type))
                checks.append(("content_disposition", "attachment" in content_disposition and ".html" in content_disposition))
                checks.append(("html_structure", "<!DOCTYPE html>" in html_content and "<html>" in html_content))
                checks.append(("css_styling", "<style>" in html_content and "font-family" in html_content))
                checks.append(("project_header", "PROJECT ESTIMATE" in html_content))
                checks.append(("cost_summary", "COST SUMMARY" in html_content))
                checks.append(("boq_table", "BILL OF QUANTITIES" in html_content and "<table>" in html_content))
                checks.append(("professional_styling", "background-color" in html_content and "border" in html_content))
                
                failed_checks = [check[0] for check in checks if not check[1]]
                
                if not failed_checks:
                    # Check for user-edited indicators
                    has_edit_indicator = "✏️" in html_content or "manually edited" in html_content
                    
                    self.log_result("GET /api/estimates/{id}/export/pdf", True,
                                  f"PDF (HTML) export successful. File size: {len(html_content)} chars, "
                                  f"Has edit indicators: {has_edit_indicator}, Headers: {content_disposition}")
                    return True
                else:
                    self.log_result("GET /api/estimates/{id}/export/pdf", False,
                                  f"HTML validation failed: {', '.join(failed_checks)}",
                                  {"content_preview": html_content[:1000]})
            else:
                self.log_result("GET /api/estimates/{id}/export/pdf", False,
                              f"Export failed: {response.status_code}", {"response": response.text})
                
        except Exception as e:
            self.log_result("GET /api/estimates/{id}/export/pdf", False, f"Error: {str(e)}")
        
        return False
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("=" * 80)
        print("BUDGETING & ESTIMATION - EDIT & EXPORT FEATURES TESTING")
        print("=" * 80)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Test Credentials: {TEST_CREDENTIALS['identifier']}")
        print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80)
        
        # Step 1: Authentication
        if not self.authenticate():
            print("\n❌ CRITICAL: Authentication failed. Cannot proceed with tests.")
            return False
        
        # Step 2: Setup test data
        if not self.setup_test_data():
            print("\n❌ CRITICAL: Test data setup failed. Cannot proceed with tests.")
            return False
        
        print(f"\n📋 Test Data Created:")
        print(f"   Project ID: {self.test_project_id}")
        print(f"   Estimate ID: {self.test_estimate_id}")
        print(f"   Test Line ID: {self.test_line_id}")
        
        # Step 3: Test existing endpoints
        print(f"\n🔍 Testing Existing Endpoints...")
        existing_passed, existing_total = self.test_existing_endpoints()
        
        # Step 4: Test new endpoints
        print(f"\n🆕 Testing New Edit & Export Features...")
        
        # Test line update endpoint
        line_update_success = self.test_line_update_endpoint()
        
        # Test CSV export
        csv_export_success = self.test_csv_export_endpoint()
        
        # Test PDF export
        pdf_export_success = self.test_pdf_export_endpoint()
        
        # Calculate results
        new_tests_passed = sum([line_update_success, csv_export_success, pdf_export_success])
        new_tests_total = 3
        
        total_passed = existing_passed + new_tests_passed
        total_tests = existing_total + new_tests_total
        
        # Print summary
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        print(f"Existing Endpoints: {existing_passed}/{existing_total} passed")
        print(f"New Features: {new_tests_passed}/{new_tests_total} passed")
        print(f"OVERALL: {total_passed}/{total_tests} tests passed ({(total_passed/total_tests)*100:.1f}%)")
        
        if total_passed == total_tests:
            print("\n🎉 ALL TESTS PASSED! Edit & Export features are working correctly.")
        else:
            print(f"\n⚠️  {total_tests - total_passed} test(s) failed. See details above.")
        
        # Print detailed results
        print("\nDETAILED RESULTS:")
        for result in self.results:
            print(f"{result['status']}: {result['test']}")
            if result['status'] == "❌ FAIL" and result.get('details'):
                print(f"   Error: {result['message']}")
        
        return total_passed == total_tests

def main():
    """Main test execution"""
    tester = EstimationTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()