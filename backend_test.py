#!/usr/bin/env python3
"""
Backend Testing Script for SiteOps API
=====================================

This script tests two specific features:
1. Estimate Engine v2 - Flooring & Painting Area Fix
2. Auto-Create Project Milestones & Tasks

Usage: python3 backend_test.py
"""

import sys
import os
import requests
import json
from datetime import datetime
from typing import Dict, Any, List

# Add backend directory to path for imports
sys.path.append('/app/backend')

# Import the estimate engine for direct testing
from estimate_engine_v2 import (
    EstimateCalculator, 
    EstimateSpecifications, 
    ProjectTypeEnum, 
    FinishingGrade
)

# Configuration
BACKEND_URL = "https://ops-enhancements.preview.emergentagent.com/api"
ADMIN_CREDENTIALS = {
    "identifier": "admin@starvacon.com",
    "password": "StarvaWorld23@",
    "auth_type": "email"
}

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
        self.test_results = []
        
    def log_result(self, test_name: str, success: bool, message: str, details: Dict = None):
        """Log test result"""
        result = {
            "test_name": test_name,
            "success": success,
            "message": message,
            "details": details or {},
            "timestamp": datetime.utcnow().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        print(f"   {message}")
        if details:
            print(f"   Details: {json.dumps(details, indent=2)}")
        print()
    
    def authenticate(self) -> bool:
        """Authenticate with admin credentials"""
        try:
            response = self.session.post(
                f"{BACKEND_URL}/auth/login",
                json=ADMIN_CREDENTIALS,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                self.session.headers.update({
                    "Authorization": f"Bearer {self.access_token}"
                })
                self.log_result(
                    "Authentication", 
                    True, 
                    f"Successfully authenticated as {ADMIN_CREDENTIALS['identifier']}"
                )
                return True
            else:
                self.log_result(
                    "Authentication", 
                    False, 
                    f"Authentication failed: {response.status_code} - {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Authentication", 
                False, 
                f"Authentication error: {str(e)}"
            )
            return False
    
    def test_estimate_engine_flooring_fix(self):
        """
        Test Feature 1: Estimate Engine v2 - Flooring & Painting Area Fix
        
        Issue: User reported flooring area showing 1066 sqft instead of ~3200 sqft 
        for a 3200 sqft built-up area.
        
        Fix: Changed carpet_area_sqm and paint_area to equal built_up_area_sqm directly (1:1 ratio).
        """
        print("=" * 60)
        print("TESTING FEATURE 1: Estimate Engine v2 - Flooring & Painting Area Fix")
        print("=" * 60)
        
        try:
            # Create specifications for 3200 sqft residential project
            specs = EstimateSpecifications(
                project_type=ProjectTypeEnum.RESIDENTIAL_INDIVIDUAL,
                total_area_sqft=3200,
                num_floors=1,
                finishing_grade=FinishingGrade.STANDARD
            )
            
            # Create calculator
            calc = EstimateCalculator(specs)
            inputs = calc.get_calculation_inputs()
            
            # Test the key values
            built_up_area_sqft = inputs["built_up_area_sqft"]
            carpet_area_sqm = inputs["carpet_area_sqm"]
            paint_area = inputs["paint_area"]
            
            # Convert to sqft for comparison
            carpet_area_sqft = carpet_area_sqm * 10.764
            paint_area_sqft = paint_area * 10.764
            
            print(f"Input: {built_up_area_sqft} sqft built-up area")
            print(f"carpet_area_sqm (flooring): {carpet_area_sqm:.2f} sqm = {carpet_area_sqft:.0f} sqft")
            print(f"paint_area: {paint_area:.2f} sqm = {paint_area_sqft:.0f} sqft")
            
            # Check if flooring area is approximately equal to built-up area (allowing 5% tolerance)
            flooring_tolerance = abs(carpet_area_sqft - built_up_area_sqft) / built_up_area_sqft
            painting_tolerance = abs(paint_area_sqft - built_up_area_sqft) / built_up_area_sqft
            
            if flooring_tolerance <= 0.05:  # 5% tolerance
                self.log_result(
                    "Flooring Area Calculation",
                    True,
                    f"Flooring area correctly calculated: {carpet_area_sqft:.0f} sqft ≈ {built_up_area_sqft} sqft (tolerance: {flooring_tolerance:.2%})",
                    {
                        "built_up_area_sqft": built_up_area_sqft,
                        "carpet_area_sqft": round(carpet_area_sqft),
                        "tolerance": f"{flooring_tolerance:.2%}"
                    }
                )
            else:
                self.log_result(
                    "Flooring Area Calculation",
                    False,
                    f"Flooring area incorrect: {carpet_area_sqft:.0f} sqft vs expected {built_up_area_sqft} sqft (tolerance: {flooring_tolerance:.2%})",
                    {
                        "built_up_area_sqft": built_up_area_sqft,
                        "carpet_area_sqft": round(carpet_area_sqft),
                        "tolerance": f"{flooring_tolerance:.2%}"
                    }
                )
            
            if painting_tolerance <= 0.05:  # 5% tolerance
                self.log_result(
                    "Painting Area Calculation",
                    True,
                    f"Painting area correctly calculated: {paint_area_sqft:.0f} sqft ≈ {built_up_area_sqft} sqft (tolerance: {painting_tolerance:.2%})",
                    {
                        "built_up_area_sqft": built_up_area_sqft,
                        "paint_area_sqft": round(paint_area_sqft),
                        "tolerance": f"{painting_tolerance:.2%}"
                    }
                )
            else:
                self.log_result(
                    "Painting Area Calculation",
                    False,
                    f"Painting area incorrect: {paint_area_sqft:.0f} sqft vs expected {built_up_area_sqft} sqft (tolerance: {painting_tolerance:.2%})",
                    {
                        "built_up_area_sqft": built_up_area_sqft,
                        "paint_area_sqft": round(paint_area_sqft),
                        "tolerance": f"{painting_tolerance:.2%}"
                    }
                )
            
            # Test BOQ generation to verify flooring line item
            boq_items = calc.calculate_boq()
            flooring_item = None
            
            for item in boq_items:
                if item.item_code == 'FLR-001':  # Vitrified Tile flooring
                    flooring_item = item
                    break
            
            if flooring_item:
                flooring_boq_sqft = flooring_item.quantity * 10.764
                boq_tolerance = abs(flooring_boq_sqft - built_up_area_sqft) / built_up_area_sqft
                
                print(f"FLR-001 Vitrified Tile: {flooring_item.quantity:.2f} sqm = {flooring_boq_sqft:.0f} sqft")
                
                if boq_tolerance <= 0.05:
                    self.log_result(
                        "BOQ Flooring Line Item",
                        True,
                        f"BOQ flooring quantity correct: {flooring_boq_sqft:.0f} sqft ≈ {built_up_area_sqft} sqft",
                        {
                            "item_code": flooring_item.item_code,
                            "quantity_sqm": flooring_item.quantity,
                            "quantity_sqft": round(flooring_boq_sqft),
                            "tolerance": f"{boq_tolerance:.2%}"
                        }
                    )
                else:
                    self.log_result(
                        "BOQ Flooring Line Item",
                        False,
                        f"BOQ flooring quantity incorrect: {flooring_boq_sqft:.0f} sqft vs expected {built_up_area_sqft} sqft",
                        {
                            "item_code": flooring_item.item_code,
                            "quantity_sqm": flooring_item.quantity,
                            "quantity_sqft": round(flooring_boq_sqft),
                            "tolerance": f"{boq_tolerance:.2%}"
                        }
                    )
            else:
                self.log_result(
                    "BOQ Flooring Line Item",
                    False,
                    "FLR-001 Vitrified Tile flooring item not found in BOQ"
                )
                
        except Exception as e:
            self.log_result(
                "Estimate Engine Test",
                False,
                f"Error testing estimate engine: {str(e)}"
            )
    
    def test_auto_create_milestones_tasks(self):
        """
        Test Feature 2: Auto-Create Project Milestones & Tasks
        
        When a project is created, 5 milestones with 26 total tasks should be auto-created.
        """
        print("=" * 60)
        print("TESTING FEATURE 2: Auto-Create Project Milestones & Tasks")
        print("=" * 60)
        
        try:
            # Create a test project
            project_data = {
                "name": f"Test Project - Auto Milestones {datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
                "description": "Test project for milestone and task auto-creation",
                "client_name": "Test Client",
                "client_phone": "+919876543210",
                "client_email": "test@example.com",
                "location": "Test Location",
                "address": "Test Address",
                "project_type": "residential",
                "status": "planning",
                "start_date": datetime.utcnow().isoformat(),
                "estimated_budget": 1000000.0,
                "total_area_sqft": 2000.0
            }
            
            # Create project via API
            response = self.session.post(
                f"{BACKEND_URL}/projects",
                json=project_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code != 200:
                self.log_result(
                    "Project Creation",
                    False,
                    f"Failed to create project: {response.status_code} - {response.text}"
                )
                return
            
            project_response = response.json()
            project_id = project_response.get("id")
            task_count = project_response.get("task_count", {})
            
            self.log_result(
                "Project Creation",
                True,
                f"Project created successfully with ID: {project_id}",
                {
                    "project_id": project_id,
                    "project_name": project_response.get("name"),
                    "task_count": task_count
                }
            )
            
            # Check if task_count is populated
            total_tasks = task_count.get("total", 0)
            if total_tasks > 0:
                self.log_result(
                    "Task Count in Project Response",
                    True,
                    f"Project response includes task_count.total = {total_tasks}",
                    {"task_count": task_count}
                )
            else:
                self.log_result(
                    "Task Count in Project Response",
                    False,
                    f"Project response missing or zero task_count.total: {total_tasks}",
                    {"task_count": task_count}
                )
            
            # Get milestones for the project
            milestones_response = self.session.get(
                f"{BACKEND_URL}/milestones",
                params={"project_id": project_id}
            )
            
            if milestones_response.status_code == 200:
                milestones = milestones_response.json()
                milestone_count = len(milestones)
                
                # Check milestone names
                expected_milestone_names = ["Preliminary", "Design", "Construction", "Finishing", "Handover"]
                actual_milestone_names = [m.get("name") for m in milestones]
                
                if milestone_count == 5:
                    self.log_result(
                        "Milestone Count",
                        True,
                        f"Correct number of milestones created: {milestone_count}",
                        {
                            "milestone_count": milestone_count,
                            "milestone_names": actual_milestone_names
                        }
                    )
                else:
                    self.log_result(
                        "Milestone Count",
                        False,
                        f"Incorrect number of milestones: {milestone_count} (expected 5)",
                        {
                            "milestone_count": milestone_count,
                            "milestone_names": actual_milestone_names
                        }
                    )
                
                # Check milestone names
                names_match = all(name in actual_milestone_names for name in expected_milestone_names)
                if names_match:
                    self.log_result(
                        "Milestone Names",
                        True,
                        "All expected milestone names found",
                        {
                            "expected": expected_milestone_names,
                            "actual": actual_milestone_names
                        }
                    )
                else:
                    self.log_result(
                        "Milestone Names",
                        False,
                        "Milestone names don't match expected",
                        {
                            "expected": expected_milestone_names,
                            "actual": actual_milestone_names
                        }
                    )
                    
            else:
                self.log_result(
                    "Milestone Retrieval",
                    False,
                    f"Failed to retrieve milestones: {milestones_response.status_code} - {milestones_response.text}"
                )
            
            # Get tasks for the project
            tasks_response = self.session.get(
                f"{BACKEND_URL}/tasks",
                params={"project_id": project_id}
            )
            
            if tasks_response.status_code == 200:
                tasks = tasks_response.json()
                task_count_actual = len(tasks)
                
                if task_count_actual == 26:
                    self.log_result(
                        "Task Count",
                        True,
                        f"Correct number of tasks created: {task_count_actual}",
                        {
                            "task_count": task_count_actual,
                            "sample_tasks": [t.get("title") for t in tasks[:5]]  # Show first 5 tasks
                        }
                    )
                else:
                    self.log_result(
                        "Task Count",
                        False,
                        f"Incorrect number of tasks: {task_count_actual} (expected 26)",
                        {
                            "task_count": task_count_actual,
                            "sample_tasks": [t.get("title") for t in tasks[:5]]  # Show first 5 tasks
                        }
                    )
                
                # Verify tasks are distributed across milestones
                milestone_task_distribution = {}
                for task in tasks:
                    milestone_id = task.get("milestone_id")
                    if milestone_id:
                        milestone_task_distribution[milestone_id] = milestone_task_distribution.get(milestone_id, 0) + 1
                
                if len(milestone_task_distribution) > 0:
                    self.log_result(
                        "Task Distribution",
                        True,
                        f"Tasks distributed across {len(milestone_task_distribution)} milestones",
                        {"distribution": milestone_task_distribution}
                    )
                else:
                    self.log_result(
                        "Task Distribution",
                        False,
                        "No tasks found with milestone assignments"
                    )
                    
            else:
                self.log_result(
                    "Task Retrieval",
                    False,
                    f"Failed to retrieve tasks: {tasks_response.status_code} - {tasks_response.text}"
                )
                
        except Exception as e:
            self.log_result(
                "Auto-Create Milestones & Tasks Test",
                False,
                f"Error testing auto-creation: {str(e)}"
            )
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Backend Testing for SiteOps API")
        print("=" * 80)
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return
        
        # Test Feature 1: Estimate Engine v2 - Flooring & Painting Area Fix
        self.test_estimate_engine_flooring_fix()
        
        # Test Feature 2: Auto-Create Project Milestones & Tasks
        self.test_auto_create_milestones_tasks()
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("=" * 80)
        print("🏁 TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        print()
        
        if failed_tests > 0:
            print("❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   • {result['test_name']}: {result['message']}")
            print()
        
        print("✅ PASSED TESTS:")
        for result in self.test_results:
            if result["success"]:
                print(f"   • {result['test_name']}: {result['message']}")
        
        print("\n" + "=" * 80)
        
        # Save detailed results to file
        with open('/app/backend_test_results.json', 'w') as f:
            json.dump(self.test_results, f, indent=2, default=str)
        
        print("📄 Detailed results saved to: /app/backend_test_results.json")


if __name__ == "__main__":
    tester = BackendTester()
    tester.run_all_tests()