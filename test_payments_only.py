#!/usr/bin/env python3
"""
Quick test for Payments API to verify the fix
"""

import requests
import json
from datetime import datetime, timedelta

BASE_URL = "https://project-hub-208.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

def test_payments_api():
    # Step 1: Authenticate
    login_data = {
        "identifier": "admin@test.com",
        "password": "admin123",
        "auth_type": "email"
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data, headers=HEADERS)
    if response.status_code != 200:
        print("❌ Authentication failed")
        return False
    
    token = response.json().get('access_token')
    headers = HEADERS.copy()
    headers['Authorization'] = f"Bearer {token}"
    
    print("✅ Authenticated successfully")
    
    # Step 2: Get existing invoices
    response = requests.get(f"{BASE_URL}/invoices", headers=headers)
    if response.status_code != 200:
        print("❌ Failed to get invoices")
        return False
    
    invoices = response.json()
    if not invoices:
        print("❌ No invoices found for testing")
        return False
    
    invoice_id = invoices[0]['id']
    print(f"✅ Found invoice: {invoice_id}")
    
    # Step 3: Test payment creation
    payment_data = {
        "invoice_id": invoice_id,
        "amount": 50000.0,
        "payment_date": datetime.now().isoformat(),
        "payment_method": "bank_transfer",
        "reference_number": f"TEST-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "notes": "Test payment for API verification"
    }
    
    print("🔍 Testing POST /api/payments...")
    response = requests.post(f"{BASE_URL}/payments", json=payment_data, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Payment created successfully: {data.get('id')}")
        print(f"   Amount: ₹{data.get('amount')}")
        print(f"   Method: {data.get('payment_method')}")
        return True
    else:
        print(f"❌ Payment creation failed: Status {response.status_code}")
        print(f"   Response: {response.text}")
        return False

if __name__ == "__main__":
    success = test_payments_api()
    if success:
        print("\n🎉 PAYMENTS API IS NOW WORKING!")
    else:
        print("\n💥 PAYMENTS API STILL HAS ISSUES")