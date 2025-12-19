#!/usr/bin/env python3
"""
Backend API Testing for Purchase Order Request APIs
Tests the multi-level approval workflow for PO requests
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

# Configuration
BACKEND_URL = "https://construsync.preview.emergentagent.com/api"

# Test credentials from review request
TEST_CREDENTIALS = {
    "admin": {"email": "admin@test.com", "password": "admin123"},
    "manager": {"email": "crm.manager@test.com", "password": "test123"}
}

class PurchaseOrderRequestTester:
    def __init__(self):
        self.session = requests.Session()
        self.tokens = {}
        self.test_data = {}
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def login(self, role: str) -> bool:
        """Login and get access token"""
        try:
            creds = TEST_CREDENTIALS[role]
            response = self.session.post(
                f"{BACKEND_URL}/auth/login",
                json={
                    "identifier": creds["email"],
                    "password": creds["password"],
                    "auth_type": "email"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.tokens[role] = data["access_token"]
                self.log(f"✅ Login successful for {role}: {creds['email']}")
                return True
            else:
                self.log(f"❌ Login failed for {role}: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Login error for {role}: {str(e)}", "ERROR")
            return False
    
    def get_headers(self, role: str) -> Dict[str, str]:
        """Get authorization headers for role"""
        return {
            "Authorization": f"Bearer {self.tokens[role]}",
            "Content-Type": "application/json"
        }
    
    def get_projects(self, role: str) -> Optional[list]:
        """Get available projects"""
        try:
            response = self.session.get(
                f"{BACKEND_URL}/projects",
                headers=self.get_headers(role)
            )
            
            if response.status_code == 200:
                projects = response.json()
                self.log(f"✅ Retrieved {len(projects)} projects")
                return projects
            else:
                self.log(f"❌ Failed to get projects: {response.status_code} - {response.text}", "ERROR")
                return None
                
        except Exception as e:
            self.log(f"❌ Error getting projects: {str(e)}", "ERROR")
            return None
    
    def test_create_po_request(self, role: str, project_id: str) -> Optional[str]:
        """Test POST /api/purchase-order-requests"""
        self.log("🧪 Testing PO Request Creation...")
        
        try:
            # Create realistic PO request data
            po_request_data = {
                "project_id": project_id,
                "title": "Construction Materials for Foundation Work",
                "description": "Required materials for foundation work including cement, steel bars, and aggregates",
                "priority": "high",
                "required_by_date": (datetime.now() + timedelta(days=7)).isoformat(),
                "delivery_location": "Construction Site - Main Gate",
                "line_items": [
                    {
                        "item_name": "Portland Cement (50kg bags)",
                        "quantity": 100,
                        "unit": "bags",
                        "estimated_unit_price": 350.0,
                        "estimated_total": 35000.0,
                        "specifications": "Grade 53, OPC"
                    },
                    {
                        "item_name": "TMT Steel Bars (12mm)",
                        "quantity": 50,
                        "unit": "pieces",
                        "estimated_unit_price": 650.0,
                        "estimated_total": 32500.0,
                        "specifications": "Fe 500D grade"
                    },
                    {
                        "item_name": "Coarse Aggregates (20mm)",
                        "quantity": 10,
                        "unit": "cubic meters",
                        "estimated_unit_price": 1200.0,
                        "estimated_total": 12000.0,
                        "specifications": "Clean, graded aggregates"
                    }
                ],
                "justification": "Foundation work scheduled to start next week. Current inventory insufficient.",
                "vendor_suggestions": ["Shree Cement Ltd", "Modern Steel Works"],
                "attachments": []
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/purchase-order-requests",
                headers=self.get_headers(role),
                json=po_request_data
            )
            
            if response.status_code == 200:
                data = response.json()
                request_id = data.get("id")
                request_number = data.get("request_number")
                status = data.get("status")
                
                self.log(f"✅ PO Request created successfully!")
                self.log(f"   Request ID: {request_id}")
                self.log(f"   Request Number: {request_number}")
                self.log(f"   Status: {status}")
                
                # Verify request number format (POR-MMYY-XXXXXX)
                if request_number and request_number.startswith("POR"):
                    self.log(f"✅ Request number format correct: {request_number}")
                else:
                    self.log(f"❌ Invalid request number format: {request_number}", "ERROR")
                
                # Verify initial status
                if status == "pending_ops_manager":
                    self.log(f"✅ Initial status correct: {status}")
                else:
                    self.log(f"❌ Unexpected initial status: {status}", "ERROR")
                
                self.test_data["po_request_id"] = request_id
                self.test_data["request_number"] = request_number
                return request_id
                
            else:
                self.log(f"❌ PO Request creation failed: {response.status_code} - {response.text}", "ERROR")
                return None
                
        except Exception as e:
            self.log(f"❌ Error creating PO request: {str(e)}", "ERROR")
            return None
    
    def test_list_po_requests(self, role: str) -> bool:
        """Test GET /api/purchase-order-requests"""
        self.log("🧪 Testing PO Request Listing...")
        
        try:
            # Test basic listing
            response = self.session.get(
                f"{BACKEND_URL}/purchase-order-requests",
                headers=self.get_headers(role)
            )
            
            if response.status_code == 200:
                requests_list = response.json()
                self.log(f"✅ Retrieved {len(requests_list)} PO requests")
                
                # Test filtering by status
                test_statuses = ["pending_ops_manager", "pending_head_approval", "pending_finance", "approved", "rejected"]
                
                for status in test_statuses:
                    response = self.session.get(
                        f"{BACKEND_URL}/purchase-order-requests?status={status}",
                        headers=self.get_headers(role)
                    )
                    
                    if response.status_code == 200:
                        filtered_requests = response.json()
                        self.log(f"✅ Status filter '{status}': {len(filtered_requests)} requests")
                    else:
                        self.log(f"❌ Status filter '{status}' failed: {response.status_code}", "ERROR")
                        return False
                
                return True
                
            else:
                self.log(f"❌ PO Request listing failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error listing PO requests: {str(e)}", "ERROR")
            return False
    
    def test_get_po_request_details(self, role: str, request_id: str) -> bool:
        """Test GET /api/purchase-order-requests/{id}"""
        self.log("🧪 Testing PO Request Details Retrieval...")
        
        try:
            response = self.session.get(
                f"{BACKEND_URL}/purchase-order-requests/{request_id}",
                headers=self.get_headers(role)
            )
            
            if response.status_code == 200:
                po_request = response.json()
                
                # Verify required fields
                required_fields = ["id", "request_number", "project_id", "title", "description", 
                                 "priority", "line_items", "status", "approvals", "total_estimated_amount"]
                
                missing_fields = [field for field in required_fields if field not in po_request]
                
                if not missing_fields:
                    self.log(f"✅ PO Request details retrieved successfully")
                    self.log(f"   Request Number: {po_request.get('request_number')}")
                    self.log(f"   Status: {po_request.get('status')}")
                    self.log(f"   Total Amount: ₹{po_request.get('total_estimated_amount', 0):,.2f}")
                    self.log(f"   Line Items: {len(po_request.get('line_items', []))}")
                    self.log(f"   Approvals: {len(po_request.get('approvals', []))}")
                    return True
                else:
                    self.log(f"❌ Missing required fields: {missing_fields}", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ PO Request details retrieval failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error getting PO request details: {str(e)}", "ERROR")
            return False
    
    def test_approve_po_request(self, role: str, request_id: str, action: str = "approve", comments: str = "") -> bool:
        """Test POST /api/purchase-order-requests/{id}/approve"""
        self.log(f"🧪 Testing PO Request {action.title()}...")
        
        try:
            approval_data = {
                "action": action,
                "comments": comments or f"{action.title()} by {role} - automated test"
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/purchase-order-requests/{request_id}/approve",
                headers=self.get_headers(role),
                json=approval_data
            )
            
            if response.status_code == 200:
                result = response.json()
                message = result.get("message", "")
                new_status = result.get("status", "")
                next_level = result.get("next_level")
                po_number = result.get("po_number")
                
                self.log(f"✅ PO Request {action} successful!")
                self.log(f"   Message: {message}")
                self.log(f"   New Status: {new_status}")
                
                if next_level:
                    self.log(f"   Next Level: {next_level}")
                
                if po_number:
                    self.log(f"   PO Number Generated: {po_number}")
                    self.test_data["po_number"] = po_number
                
                return True
                
            else:
                self.log(f"❌ PO Request {action} failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error {action}ing PO request: {str(e)}", "ERROR")
            return False
    
    def test_approval_workflow(self) -> bool:
        """Test the complete 3-level approval workflow"""
        self.log("🧪 Testing Complete Approval Workflow...")
        
        if not self.test_data.get("po_request_id"):
            self.log("❌ No PO request ID available for workflow test", "ERROR")
            return False
        
        request_id = self.test_data["po_request_id"]
        
        # Level 1: Operations Manager approval (using admin role)
        self.log("📋 Level 1: Operations Manager Approval")
        if not self.test_approve_po_request("admin", request_id, "approve", "Approved for L1 - Operations Manager"):
            return False
        
        # Verify status changed to pending_head_approval
        if not self.verify_status_change(request_id, "pending_head_approval"):
            return False
        
        # Level 2: Project/Ops Head approval (requires TWO approvals)
        self.log("📋 Level 2: First Head Approval (Project Head)")
        if not self.test_approve_po_request("admin", request_id, "approve", "Approved for L2 - Project Head"):
            return False
        
        # Verify status is still pending_head_approval (waiting for second approval)
        if not self.verify_status_change(request_id, "pending_head_approval"):
            return False
        
        self.log("📋 Level 2: Second Head Approval (Operations Head)")
        if not self.test_approve_po_request("admin", request_id, "approve", "Approved for L2 - Operations Head"):
            return False
        
        # Now verify status changed to pending_finance
        if not self.verify_status_change(request_id, "pending_finance"):
            return False
        
        # Level 3: Finance approval (using admin role)
        self.log("📋 Level 3: Finance Approval")
        if not self.test_approve_po_request("admin", request_id, "approve", "Approved for L3 - Finance Head"):
            return False
        
        # Verify final status is approved and PO number is generated
        if not self.verify_status_change(request_id, "approved"):
            return False
        
        # Check if PO number was generated by fetching the request details
        try:
            response = self.session.get(
                f"{BACKEND_URL}/purchase-order-requests/{request_id}",
                headers=self.get_headers("admin")
            )
            
            if response.status_code == 200:
                po_request = response.json()
                po_number = po_request.get("po_number")
                
                if po_number:
                    self.log(f"✅ Complete workflow successful! PO Number: {po_number}")
                    self.test_data["po_number"] = po_number
                    return True
                else:
                    self.log("❌ PO number not found in request details after final approval", "ERROR")
                    return False
            else:
                self.log("❌ Failed to fetch request details to verify PO number", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error verifying PO number: {str(e)}", "ERROR")
            return False
    
    def verify_status_change(self, request_id: str, expected_status: str) -> bool:
        """Verify that PO request status has changed"""
        try:
            response = self.session.get(
                f"{BACKEND_URL}/purchase-order-requests/{request_id}",
                headers=self.get_headers("admin")
            )
            
            if response.status_code == 200:
                po_request = response.json()
                current_status = po_request.get("status")
                
                if current_status == expected_status:
                    self.log(f"✅ Status correctly changed to: {current_status}")
                    return True
                else:
                    self.log(f"❌ Status mismatch. Expected: {expected_status}, Got: {current_status}", "ERROR")
                    return False
            else:
                self.log(f"❌ Failed to verify status: {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Error verifying status: {str(e)}", "ERROR")
            return False
    
    def test_rejection_workflow(self) -> bool:
        """Test PO request rejection"""
        self.log("🧪 Testing Rejection Workflow...")
        
        # Create another PO request for rejection test
        projects = self.get_projects("admin")
        if not projects:
            self.log("❌ No projects available for rejection test", "ERROR")
            return False
        
        project_id = projects[0]["id"]
        
        # Create a new PO request
        rejection_request_id = self.test_create_po_request("admin", project_id)
        if not rejection_request_id:
            return False
        
        # Reject at Level 1
        self.log("📋 Testing Rejection at Level 1")
        if not self.test_approve_po_request("admin", rejection_request_id, "reject", "Budget exceeded - rejecting request"):
            return False
        
        # Verify status changed to rejected
        if not self.verify_status_change(rejection_request_id, "rejected"):
            return False
        
        self.log("✅ Rejection workflow successful!")
        return True
    
    def run_all_tests(self) -> bool:
        """Run all PO request tests"""
        self.log("🚀 Starting Purchase Order Request API Testing...")
        
        # Login with test credentials
        if not self.login("admin"):
            return False
        
        # Try manager login but don't fail if it doesn't work
        manager_login_success = self.login("manager")
        if not manager_login_success:
            self.log("⚠️ Manager login failed, continuing with admin only", "WARN")
        
        # Get available projects
        projects = self.get_projects("admin")
        if not projects:
            self.log("❌ No projects available for testing", "ERROR")
            return False
        
        project_id = projects[0]["id"]
        self.log(f"📋 Using project: {projects[0].get('name', 'Unknown')} (ID: {project_id})")
        
        # Test 1: Create PO Request
        request_id = self.test_create_po_request("admin", project_id)
        if not request_id:
            return False
        
        # Test 2: List PO Requests
        if not self.test_list_po_requests("admin"):
            return False
        
        # Test 3: Get PO Request Details
        if not self.test_get_po_request_details("admin", request_id):
            return False
        
        # Test 4: Complete Approval Workflow
        if not self.test_approval_workflow():
            return False
        
        # Test 5: Rejection Workflow
        if not self.test_rejection_workflow():
            return False
        
        self.log("🎉 All Purchase Order Request API tests completed successfully!")
        return True

def main():
    """Main test execution"""
    tester = PurchaseOrderRequestTester()
    
    try:
        success = tester.run_all_tests()
        
        if success:
            print("\n" + "="*80)
            print("✅ PURCHASE ORDER REQUEST API TESTING COMPLETE")
            print("="*80)
            print("All tests passed successfully!")
            print(f"Test Data Summary:")
            print(f"  - PO Request ID: {tester.test_data.get('po_request_id', 'N/A')}")
            print(f"  - Request Number: {tester.test_data.get('request_number', 'N/A')}")
            print(f"  - Final PO Number: {tester.test_data.get('po_number', 'N/A')}")
            return 0
        else:
            print("\n" + "="*80)
            print("❌ PURCHASE ORDER REQUEST API TESTING FAILED")
            print("="*80)
            print("Some tests failed. Check the logs above for details.")
            return 1
            
    except KeyboardInterrupt:
        print("\n❌ Testing interrupted by user")
        return 1
    except Exception as e:
        print(f"\n❌ Unexpected error during testing: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())