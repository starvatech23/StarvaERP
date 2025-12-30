#!/usr/bin/env python3
"""
Backend Test Suite for SiteOps Estimate Engine v2.0 APIs
Testing the new dynamic estimation system for construction projects.
"""

import requests
import json
import os
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://siteops-deploy.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

class EstimateEngineV2Tester:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
        self.test_lead_id = None
        self.test_estimate_id = None
        self.test_project_id = None
        
    def authenticate(self, email: str = "crm.manager@test.com", password: str = "password123") -> bool:
        """Authenticate with the API"""
        try:
            response = self.session.post(f"{API_BASE}/auth/login", json={
                "identifier": email,
                "password": password,
                "auth_type": "email"
            })
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data["access_token"]
                self.session.headers.update({
                    "Authorization": f"Bearer {self.access_token}"
                })
                print(f"✅ Authentication successful for {email}")
                return True
            else:
                print(f"❌ Authentication failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Authentication error: {str(e)}")
            return False
    
    def create_test_lead(self) -> Optional[str]:
        """Create a test lead for estimate testing"""
        try:
            lead_data = {
                "name": "Test Construction Client",
                "phone": "+919876543210",
                "email": "testclient@example.com",
                "source": "direct",
                "priority": "high",
                "status": "new",
                "project_type": "residential_individual",
                "budget_min": 2000000,
                "budget_max": 3000000,
                "location": "Bangalore, Karnataka",
                "notes": "Test lead for Estimate Engine v2.0 testing"
            }
            
            response = self.session.post(f"{API_BASE}/crm/leads", json=lead_data)
            
            if response.status_code == 201:
                data = response.json()
                lead_id = data["id"]
                self.test_lead_id = lead_id
                print(f"✅ Test lead created: {lead_id}")
                return lead_id
            else:
                print(f"❌ Failed to create test lead: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"❌ Error creating test lead: {str(e)}")
            return None
    
    def test_quick_estimate_calculator(self) -> bool:
        """Test 1: Quick Estimate Calculator (No auth required for testing, but use auth anyway)"""
        print("\n🧪 Testing Quick Estimate Calculator...")
        
        try:
            payload = {
                "total_area_sqft": 2500,
                "num_floors": 2,
                "finishing_grade": "standard",
                "project_type": "residential_individual"
            }
            
            response = self.session.post(f"{API_BASE}/estimates/quick-calculate", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                required_fields = ["success", "summary", "boq_by_category"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    print(f"❌ Missing required fields: {missing_fields}")
                    return False
                
                summary = data["summary"]
                boq_by_category = data["boq_by_category"]
                
                # Verify summary has required fields
                summary_fields = ["grand_total", "cost_per_sqft"]
                missing_summary = [field for field in summary_fields if field not in summary]
                
                if missing_summary:
                    print(f"❌ Missing summary fields: {missing_summary}")
                    return False
                
                # Verify we have 14 categories as expected
                if len(boq_by_category) < 10:  # At least 10 categories expected
                    print(f"❌ Expected at least 10 BOQ categories, got {len(boq_by_category)}")
                    return False
                
                # Verify payment schedule exists
                if "payment_schedule" not in summary:
                    print("❌ Payment schedule missing from summary")
                    return False
                
                print(f"✅ Quick estimate generated successfully:")
                print(f"   Grand Total: ₹{summary['grand_total']:,.2f}")
                print(f"   Cost per sqft: ₹{summary['cost_per_sqft']:,.2f}")
                print(f"   BOQ Categories: {len(boq_by_category)}")
                print(f"   Payment Schedule: {len(summary['payment_schedule'])} milestones")
                
                return True
            else:
                print(f"❌ Quick estimate failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Quick estimate error: {str(e)}")
            return False
    
    def test_calculation_inputs_preview(self) -> bool:
        """Test 2: Calculation Inputs Preview"""
        print("\n🧪 Testing Calculation Inputs Preview...")
        
        try:
            response = self.session.get(f"{API_BASE}/estimates/calculation-inputs/2500?num_floors=2")
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                required_fields = ["specifications", "calculation_inputs"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    print(f"❌ Missing required fields: {missing_fields}")
                    return False
                
                calc_inputs = data["calculation_inputs"]
                
                # Verify calculation inputs have expected fields
                expected_inputs = ["foundation_area", "total_built_up_area", "wall_areas"]
                found_inputs = [field for field in expected_inputs if field in calc_inputs]
                
                if len(found_inputs) < 2:  # At least 2 expected inputs
                    print(f"❌ Expected calculation inputs not found. Got: {list(calc_inputs.keys())}")
                    return False
                
                print(f"✅ Calculation inputs retrieved successfully:")
                print(f"   Total inputs: {len(calc_inputs)}")
                print(f"   Sample inputs: {list(calc_inputs.keys())[:5]}")
                
                return True
            else:
                print(f"❌ Calculation inputs failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Calculation inputs error: {str(e)}")
            return False
    
    def test_create_lead_estimate(self) -> bool:
        """Test 3: Create Lead Estimate (Requires existing lead)"""
        print("\n🧪 Testing Create Lead Estimate...")
        
        if not self.test_lead_id:
            print("❌ No test lead available. Creating one...")
            if not self.create_test_lead():
                return False
        
        try:
            payload = {
                "lead_id": self.test_lead_id,
                "estimate_type": "detailed",
                "specifications": {
                    "project_type": "residential_individual",
                    "total_area_sqft": 2500,
                    "num_floors": 2,
                    "construction_type": "rcc_framed",
                    "foundation_type": "isolated_footing",
                    "finishing_grade": "standard",
                    "floor_details": [
                        {
                            "floor_number": 0,
                            "floor_name": "Ground Floor",
                            "area_sqft": 1200,
                            "rooms": 3,
                            "bathrooms": 2
                        },
                        {
                            "floor_number": 1,
                            "floor_name": "First Floor",
                            "area_sqft": 1300,
                            "rooms": 3,
                            "bathrooms": 2
                        }
                    ]
                }
            }
            
            response = self.session.post(f"{API_BASE}/lead-estimates", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                if not data.get("success"):
                    print(f"❌ Lead estimate creation not successful: {data}")
                    return False
                
                estimate = data.get("estimate")
                if not estimate:
                    print("❌ No estimate data in response")
                    return False
                
                # Verify estimate has required fields
                required_fields = ["id", "estimate_number", "line_items", "summary"]
                missing_fields = [field for field in required_fields if field not in estimate]
                
                if missing_fields:
                    print(f"❌ Missing estimate fields: {missing_fields}")
                    return False
                
                # Verify estimate number format (EST-L-YYYY-XXX)
                estimate_number = estimate["estimate_number"]
                if not estimate_number.startswith("EST-L-"):
                    print(f"❌ Invalid estimate number format: {estimate_number}")
                    return False
                
                # Verify we have line items (30+ BOQ items expected)
                line_items = estimate["line_items"]
                if len(line_items) < 20:  # At least 20 line items expected
                    print(f"❌ Expected at least 20 line items, got {len(line_items)}")
                    return False
                
                # Verify summary has grand_total
                summary = estimate["summary"]
                if "grand_total" not in summary:
                    print("❌ Grand total missing from summary")
                    return False
                
                self.test_estimate_id = estimate["id"]
                
                print(f"✅ Lead estimate created successfully:")
                print(f"   Estimate Number: {estimate_number}")
                print(f"   Line Items: {len(line_items)}")
                print(f"   Grand Total: ₹{summary['grand_total']:,.2f}")
                
                return True
            else:
                print(f"❌ Lead estimate creation failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Lead estimate creation error: {str(e)}")
            return False
    
    def test_list_lead_estimates(self) -> bool:
        """Test 4: List Lead Estimates"""
        print("\n🧪 Testing List Lead Estimates...")
        
        if not self.test_lead_id:
            print("❌ No test lead available for listing estimates")
            return False
        
        try:
            response = self.session.get(f"{API_BASE}/lead-estimates?lead_id={self.test_lead_id}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                if "estimates" not in data:
                    print(f"❌ No estimates field in response: {data}")
                    return False
                
                estimates = data["estimates"]
                
                # Should have at least one estimate (the one we created)
                if len(estimates) == 0:
                    print("❌ No estimates found for the test lead")
                    return False
                
                # Verify pagination info
                if "total" not in data:
                    print("❌ Missing pagination total")
                    return False
                
                print(f"✅ Lead estimates listed successfully:")
                print(f"   Total estimates: {data['total']}")
                print(f"   Returned estimates: {len(estimates)}")
                
                return True
            else:
                print(f"❌ List lead estimates failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ List lead estimates error: {str(e)}")
            return False
    
    def test_get_lead_estimate_details(self) -> bool:
        """Test 5: Get Lead Estimate Details"""
        print("\n🧪 Testing Get Lead Estimate Details...")
        
        if not self.test_estimate_id:
            print("❌ No test estimate available for details")
            return False
        
        try:
            response = self.session.get(f"{API_BASE}/lead-estimates/{self.test_estimate_id}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                required_fields = ["id", "estimate_number", "line_items", "summary"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    print(f"❌ Missing estimate detail fields: {missing_fields}")
                    return False
                
                # Verify all BOQ line items are present
                line_items = data["line_items"]
                if len(line_items) == 0:
                    print("❌ No line items in estimate details")
                    return False
                
                print(f"✅ Lead estimate details retrieved successfully:")
                print(f"   Estimate ID: {data['id']}")
                print(f"   Line Items: {len(line_items)}")
                
                return True
            else:
                print(f"❌ Get lead estimate details failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Get lead estimate details error: {str(e)}")
            return False
    
    def test_update_line_item(self) -> bool:
        """Test 6: Update Line Item"""
        print("\n🧪 Testing Update Line Item...")
        
        if not self.test_estimate_id:
            print("❌ No test estimate available for line item update")
            return False
        
        try:
            # First get the estimate to find a line item to update
            response = self.session.get(f"{API_BASE}/lead-estimates/{self.test_estimate_id}")
            
            if response.status_code != 200:
                print("❌ Could not retrieve estimate for line item update")
                return False
            
            estimate_data = response.json()
            line_items = estimate_data.get("line_items", [])
            
            if len(line_items) == 0:
                print("❌ No line items available to update")
                return False
            
            # Get the first line item
            line_item = line_items[0]
            line_id = line_item["id"]
            original_quantity = line_item.get("quantity", 1)
            original_rate = line_item.get("rate", 100)
            
            # Update the line item
            update_payload = {
                "quantity": 15.0,
                "rate": 6000
            }
            
            response = self.session.put(
                f"{API_BASE}/lead-estimates/{self.test_estimate_id}/lines/{line_id}",
                json=update_payload
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify the estimate was updated
                if "estimate" not in data:
                    print("❌ No updated estimate in response")
                    return False
                
                updated_estimate = data["estimate"]
                
                # Verify recalculated totals
                if "summary" not in updated_estimate:
                    print("❌ No summary in updated estimate")
                    return False
                
                summary = updated_estimate["summary"]
                if "grand_total" not in summary:
                    print("❌ No grand_total in updated summary")
                    return False
                
                print(f"✅ Line item updated successfully:")
                print(f"   Updated quantity: {original_quantity} → 15.0")
                print(f"   Updated rate: ₹{original_rate} → ₹6000")
                print(f"   New grand total: ₹{summary['grand_total']:,.2f}")
                
                return True
            else:
                print(f"❌ Update line item failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Update line item error: {str(e)}")
            return False
    
    def test_convert_lead_estimate_to_project(self) -> bool:
        """Test 7: Convert Lead Estimate to Project"""
        print("\n🧪 Testing Convert Lead Estimate to Project...")
        
        if not self.test_estimate_id or not self.test_lead_id:
            print("❌ No test estimate or lead available for conversion")
            return False
        
        try:
            payload = {
                "lead_id": self.test_lead_id,
                "lead_estimate_id": self.test_estimate_id,
                "project_name": "Test Residential Project",
                "start_date": "2025-01-15T00:00:00Z"
            }
            
            response = self.session.post(
                f"{API_BASE}/lead-estimates/{self.test_estimate_id}/convert-to-project",
                json=payload
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                required_fields = ["project_id", "project_estimate_id", "milestones_created", "tasks_created"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    print(f"❌ Missing conversion result fields: {missing_fields}")
                    return False
                
                # Verify milestones and tasks were created
                milestones_created = data["milestones_created"]
                tasks_created = data["tasks_created"]
                
                if milestones_created < 5:  # Expect at least 5 milestones
                    print(f"❌ Expected at least 5 milestones, got {milestones_created}")
                    return False
                
                if tasks_created < 20:  # Expect at least 20 tasks
                    print(f"❌ Expected at least 20 tasks, got {tasks_created}")
                    return False
                
                self.test_project_id = data["project_id"]
                
                print(f"✅ Lead estimate converted to project successfully:")
                print(f"   Project ID: {data['project_id']}")
                print(f"   Project Estimate ID: {data['project_estimate_id']}")
                print(f"   Milestones Created: {milestones_created}")
                print(f"   Tasks Created: {tasks_created}")
                
                return True
            else:
                print(f"❌ Convert to project failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Convert to project error: {str(e)}")
            return False
    
    def test_get_project_estimates(self) -> bool:
        """Test 8: Get Project Estimates"""
        print("\n🧪 Testing Get Project Estimates...")
        
        if not self.test_project_id:
            print("❌ No test project available for project estimates")
            return False
        
        try:
            response = self.session.get(f"{API_BASE}/project-estimates?project_id={self.test_project_id}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                if "estimates" not in data:
                    print(f"❌ No estimates field in project estimates response: {data}")
                    return False
                
                estimates = data["estimates"]
                
                # Should have at least one estimate (the converted one)
                if len(estimates) == 0:
                    print("❌ No project estimates found")
                    return False
                
                # Verify the estimate has source linking back to lead estimate
                estimate = estimates[0]
                if "source" not in estimate:
                    print("❌ No source field in project estimate")
                    return False
                
                source = estimate["source"]
                if "lead_estimate_id" not in source:
                    print("❌ No lead_estimate_id in source")
                    return False
                
                if source["lead_estimate_id"] != self.test_estimate_id:
                    print(f"❌ Source lead_estimate_id mismatch: {source['lead_estimate_id']} != {self.test_estimate_id}")
                    return False
                
                print(f"✅ Project estimates retrieved successfully:")
                print(f"   Total estimates: {len(estimates)}")
                print(f"   Source lead estimate ID: {source['lead_estimate_id']}")
                
                return True
            else:
                print(f"❌ Get project estimates failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Get project estimates error: {str(e)}")
            return False
    
    def run_all_tests(self) -> Dict[str, bool]:
        """Run all Estimate Engine v2.0 tests"""
        print("🚀 Starting Estimate Engine v2.0 API Tests")
        print("=" * 60)
        
        # Authenticate first
        if not self.authenticate():
            return {"authentication": False}
        
        # Run all tests
        test_results = {}
        
        test_results["quick_estimate_calculator"] = self.test_quick_estimate_calculator()
        test_results["calculation_inputs_preview"] = self.test_calculation_inputs_preview()
        test_results["create_lead_estimate"] = self.test_create_lead_estimate()
        test_results["list_lead_estimates"] = self.test_list_lead_estimates()
        test_results["get_lead_estimate_details"] = self.test_get_lead_estimate_details()
        test_results["update_line_item"] = self.test_update_line_item()
        test_results["convert_lead_estimate_to_project"] = self.test_convert_lead_estimate_to_project()
        test_results["get_project_estimates"] = self.test_get_project_estimates()
        
        return test_results
    
    def print_summary(self, results: Dict[str, bool]):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 ESTIMATE ENGINE V2.0 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in results.values() if result)
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status} {test_name.replace('_', ' ').title()}")
        
        print(f"\n🎯 Overall Result: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED! Estimate Engine v2.0 is working perfectly!")
        else:
            print("⚠️  Some tests failed. Please check the issues above.")
        
        return passed == total


def main():
    """Main test execution"""
    tester = EstimateEngineV2Tester()
    results = tester.run_all_tests()
    success = tester.print_summary(results)
    
    # Exit with appropriate code
    exit(0 if success else 1)


if __name__ == "__main__":
    main()