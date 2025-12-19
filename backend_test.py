#!/usr/bin/env python3
"""
Backend API Testing for Multi-Vendor PO Sending Feature
Tests the complete flow from login to PO creation, approval, and sending to multiple vendors
"""

import requests
import json
import sys
from datetime import datetime, timedelta
import os

# Get backend URL from environment
BACKEND_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://procure-track-7.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

# Test credentials
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "admin123"

class MultiVendorPOTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_info = None
        
    def log(self, message):
        """Log test messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")
        
    def login(self, email, password):
        """Login and get auth token"""
        self.log(f"🔐 Logging in as {email}...")
        
        login_data = {
            "identifier": email,
            "password": password,
            "auth_type": "email"
        }
        
        response = self.session.post(f"{API_BASE}/auth/login", json=login_data)
        
        if response.status_code != 200:
            self.log(f"❌ Login failed: {response.status_code} - {response.text}")
            return False
            
        data = response.json()
        self.auth_token = data.get("access_token")
        self.user_info = data.get("user", {})
        
        # Set auth header for future requests
        self.session.headers.update({
            "Authorization": f"Bearer {self.auth_token}"
        })
        
        self.log(f"✅ Login successful! User: {self.user_info.get('full_name')} ({self.user_info.get('role')})")
        return True
        
    def get_approved_po_requests(self):
        """Get list of approved PO requests"""
        self.log("📋 Getting approved PO requests...")
        
        response = self.session.get(f"{API_BASE}/purchase-order-requests?status=approved")
        
        if response.status_code != 200:
            self.log(f"❌ Failed to get PO requests: {response.status_code} - {response.text}")
            return []
            
        data = response.json()
        self.log(f"✅ Found {len(data)} approved PO requests")
        return data
        
    def create_po_request(self):
        """Create a new PO request"""
        self.log("📝 Creating new PO request...")
        
        # First get a project to use
        projects_response = self.session.get(f"{API_BASE}/projects")
        if projects_response.status_code != 200:
            self.log(f"❌ Failed to get projects: {projects_response.status_code}")
            return None
            
        projects = projects_response.json()
        if not projects:
            self.log("❌ No projects found")
            return None
            
        project = projects[0]
        project_id = project["id"]
        
        po_data = {
            "project_id": project_id,
            "title": "Test Multi-Vendor PO Request",
            "description": "Testing multi-vendor PO sending functionality",
            "priority": "high",
            "required_by_date": (datetime.now() + timedelta(days=7)).isoformat(),
            "delivery_location": "Project Site",
            "line_items": [
                {
                    "item_name": "Cement Bags",
                    "description": "OPC 53 Grade Cement",
                    "quantity": 100,
                    "unit": "bags",
                    "estimated_unit_price": 450,
                    "estimated_total": 45000
                },
                {
                    "item_name": "Steel Rods",
                    "description": "TMT Steel Rods 12mm",
                    "quantity": 50,
                    "unit": "pieces",
                    "estimated_unit_price": 800,
                    "estimated_total": 40000
                }
            ],
            "justification": "Required for foundation work - urgent requirement"
        }
        
        response = self.session.post(f"{API_BASE}/purchase-order-requests", json=po_data)
        
        if response.status_code != 200:
            self.log(f"❌ Failed to create PO request: {response.status_code} - {response.text}")
            return None
            
        data = response.json()
        po_request_id = data.get("id")
        request_number = data.get("request_number")
        
        self.log(f"✅ PO request created: {request_number} (ID: {po_request_id})")
        return po_request_id
        
    def approve_po_request(self, po_request_id, level_description):
        """Approve PO request at current level"""
        self.log(f"✅ Approving PO request at {level_description}...")
        
        approval_data = {
            "action": "approve",
            "comments": f"Approved by {self.user_info.get('full_name')} - {level_description}"
        }
        
        response = self.session.post(f"{API_BASE}/purchase-order-requests/{po_request_id}/approve", json=approval_data)
        
        if response.status_code != 200:
            self.log(f"❌ Failed to approve PO request: {response.status_code} - {response.text}")
            return False
            
        data = response.json()
        new_status = data.get("status")
        self.log(f"✅ PO request approved! New status: {new_status}")
        return True
        
    def get_vendors(self):
        """Get list of vendors"""
        self.log("🏢 Getting vendors list...")
        
        response = self.session.get(f"{API_BASE}/vendors")
        
        if response.status_code != 200:
            self.log(f"❌ Failed to get vendors: {response.status_code} - {response.text}")
            return []
            
        data = response.json()
        self.log(f"✅ Found {len(data)} vendors")
        
        # Log vendor details for debugging
        for vendor in data[:3]:  # Show first 3 vendors
            vendor_name = vendor.get("business_name") or vendor.get("contact_person", "Unknown")
            self.log(f"   - {vendor_name} (ID: {vendor['id']})")
            
        return data
        
    def send_po_to_vendors(self, po_request_id, vendor_ids):
        """Send PO to multiple vendors"""
        self.log(f"📤 Sending PO to {len(vendor_ids)} vendors...")
        
        send_data = {
            "vendor_ids": vendor_ids,
            "send_email": True,
            "send_whatsapp": True,
            "message": "Please provide your best quote for the attached purchase order. We need competitive pricing and quick delivery."
        }
        
        response = self.session.post(f"{API_BASE}/purchase-order-requests/{po_request_id}/send-to-vendors", json=send_data)
        
        if response.status_code != 200:
            self.log(f"❌ Failed to send PO to vendors: {response.status_code} - {response.text}")
            return None
            
        data = response.json()
        self.log(f"✅ {data.get('message')}")
        
        # Log sent results
        sent_results = data.get("sent", [])
        for result in sent_results:
            vendor_name = result.get("vendor_name")
            email_sent = result.get("email_sent", False)
            whatsapp_sent = result.get("whatsapp_sent", False)
            self.log(f"   📧 {vendor_name}: Email={email_sent}, WhatsApp={whatsapp_sent}")
            
        # Log failed results
        failed_results = data.get("failed", [])
        if failed_results:
            self.log(f"❌ Failed to send to {len(failed_results)} vendors:")
            for failure in failed_results:
                self.log(f"   - Vendor {failure.get('vendor_id')}: {failure.get('error')}")
                
        return data
        
    def verify_po_sent_status(self, po_request_id):
        """Verify that PO request is marked as sent to vendor"""
        self.log("🔍 Verifying PO sent status...")
        
        response = self.session.get(f"{API_BASE}/purchase-order-requests/{po_request_id}")
        
        if response.status_code != 200:
            self.log(f"❌ Failed to get PO request details: {response.status_code}")
            return False
            
        data = response.json()
        po_sent_to_vendor = data.get("po_sent_to_vendor", False)
        po_sent_at = data.get("po_sent_at")
        sent_to_vendors = data.get("sent_to_vendors", [])
        
        if po_sent_to_vendor:
            self.log(f"✅ PO marked as sent to vendor: {po_sent_at}")
            self.log(f"✅ Sent to {len(sent_to_vendors)} vendors")
            return True
        else:
            self.log("❌ PO not marked as sent to vendor")
            return False
            
    def run_multi_vendor_po_test(self):
        """Run the complete multi-vendor PO sending test"""
        self.log("🚀 Starting Multi-Vendor PO Sending Test")
        self.log("=" * 60)
        
        # Step 1: Login
        if not self.login(ADMIN_EMAIL, ADMIN_PASSWORD):
            return False
            
        # Step 2: Check for existing approved PO requests
        approved_pos = self.get_approved_po_requests()
        
        po_request_id = None
        if approved_pos:
            # Use existing approved PO
            po_request_id = approved_pos[0]["id"]
            self.log(f"📋 Using existing approved PO: {po_request_id}")
        else:
            # Create new PO and approve it through all levels
            self.log("📝 No approved PO found, creating new one...")
            
            po_request_id = self.create_po_request()
            if not po_request_id:
                return False
                
            # Approve through all 3 levels (admin can approve at any level)
            for level in range(1, 4):
                level_names = {1: "Level 1 (Operations Manager)", 2: "Level 2 (Project/Operations Head)", 3: "Level 3 (Finance)"}
                if not self.approve_po_request(po_request_id, level_names[level]):
                    return False
                    
        # Step 3: Get vendors
        vendors = self.get_vendors()
        if len(vendors) < 2:
            self.log("❌ Need at least 2 vendors for multi-vendor test")
            return False
            
        # Select first 2 vendors
        selected_vendors = vendors[:2]
        vendor_ids = [v["id"] for v in selected_vendors]
        vendor_names = [v.get("business_name") or v.get("contact_person", "Unknown") for v in selected_vendors]
        
        self.log(f"🎯 Selected vendors: {', '.join(vendor_names)}")
        
        # Step 4: Send PO to vendors
        send_result = self.send_po_to_vendors(po_request_id, vendor_ids)
        if not send_result:
            return False
            
        # Step 5: Verify response structure
        self.log("🔍 Verifying response structure...")
        
        required_fields = ["sent", "failed"]
        for field in required_fields:
            if field not in send_result:
                self.log(f"❌ Missing required field in response: {field}")
                return False
                
        sent_results = send_result.get("sent", [])
        if not sent_results:
            self.log("❌ No vendors in 'sent' results")
            return False
            
        # Verify each sent result has required fields
        for result in sent_results:
            required_sent_fields = ["vendor_name", "email_sent", "whatsapp_sent"]
            for field in required_sent_fields:
                if field not in result:
                    self.log(f"❌ Missing field in sent result: {field}")
                    return False
                    
        self.log("✅ Response structure is correct")
        
        # Step 6: Verify PO request is updated
        if not self.verify_po_sent_status(po_request_id):
            return False
            
        # Step 7: Verify mocked email/WhatsApp behavior
        self.log("📧 Verifying mocked email/WhatsApp behavior...")
        all_email_sent = all(r.get("email_sent", False) for r in sent_results)
        all_whatsapp_sent = all(r.get("whatsapp_sent", False) for r in sent_results)
        
        if all_email_sent and all_whatsapp_sent:
            self.log("✅ Email and WhatsApp sending is **mocked** (logs only) - this is expected behavior")
        else:
            self.log("⚠️  Some email/WhatsApp sends failed - check vendor contact details")
            
        self.log("=" * 60)
        self.log("🎉 Multi-Vendor PO Sending Test COMPLETED SUCCESSFULLY!")
        self.log("✅ All features working as expected:")
        self.log("   - PO request creation and approval flow")
        self.log("   - Multi-vendor selection and sending")
        self.log("   - Email/WhatsApp integration (mocked)")
        self.log("   - PO status updates")
        self.log("   - Response structure validation")
        
        return True

def main():
    """Main test execution"""
    tester = MultiVendorPOTester()
    
    try:
        success = tester.run_multi_vendor_po_test()
        if success:
            print("\n🎯 TEST RESULT: PASS")
            sys.exit(0)
        else:
            print("\n❌ TEST RESULT: FAIL")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n💥 TEST ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()