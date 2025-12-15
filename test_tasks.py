#!/usr/bin/env python3

import requests
import json

# Test the tasks endpoint
def test_tasks_endpoint():
    base_url = "http://localhost:8001"
    
    # First, let's try to login to get a token
    login_data = {
        "identifier": "admin@example.com",
        "password": "admin123",
        "auth_type": "email"
    }
    
    try:
        # Try to login
        response = requests.post(f"{base_url}/api/auth/login", json=login_data)
        print(f"Login response status: {response.status_code}")
        
        if response.status_code == 200:
            token_data = response.json()
            token = token_data.get("access_token")
            print(f"Got token: {token[:20]}...")
            
            # Now test the tasks endpoint
            headers = {"Authorization": f"Bearer {token}"}
            tasks_response = requests.get(f"{base_url}/api/tasks?project_id=693684308aaf25853f95a92b", headers=headers)
            print(f"Tasks response status: {tasks_response.status_code}")
            
            if tasks_response.status_code == 200:
                tasks = tasks_response.json()
                print(f"Successfully got {len(tasks)} tasks")
                for i, task in enumerate(tasks):
                    print(f"Task {i}: {task.get('title', 'No title')} - assigned_to: {task.get('assigned_to')}")
            else:
                print(f"Tasks error: {tasks_response.text}")
        else:
            print(f"Login error: {response.text}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_tasks_endpoint()