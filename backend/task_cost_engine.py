"""
SiteOps Task Cost Preset Engine
Generates realistic cost estimates for construction tasks using:
1. Pre-defined cost database for common tasks
2. LLM-powered research for custom/unknown tasks
3. Area-based cost calculation
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Indian construction cost presets (2024-2025 rates)
# Costs are in INR per unit (sqft/sqm/cum/rmt/nos)
# Based on standard residential construction in metro cities

TASK_COST_PRESETS = {
    # ============= PRELIMINARY PHASE =============
    "Site Survey": {
        "category": "preliminary",
        "unit": "sqft",
        "material_cost_per_unit": 0,
        "labour_cost_per_unit": 2.5,
        "total_cost_per_unit": 2.5,
        "description": "Site measurement, soil testing coordination, document collection"
    },
    "Soil Testing": {
        "category": "preliminary",
        "unit": "lumpsum",
        "material_cost_per_unit": 15000,
        "labour_cost_per_unit": 5000,
        "total_cost_per_unit": 20000,
        "description": "Soil investigation and geotechnical report"
    },
    "Document Collection": {
        "category": "preliminary",
        "unit": "lumpsum",
        "material_cost_per_unit": 5000,
        "labour_cost_per_unit": 10000,
        "total_cost_per_unit": 15000,
        "description": "Property documents, approvals, NOCs"
    },
    "Statutory Approvals": {
        "category": "preliminary",
        "unit": "lumpsum",
        "material_cost_per_unit": 50000,
        "labour_cost_per_unit": 25000,
        "total_cost_per_unit": 75000,
        "description": "Building permits, municipal approvals, plan sanctions"
    },
    
    # ============= DESIGN PHASE =============
    "Architectural Design": {
        "category": "design",
        "unit": "sqft",
        "material_cost_per_unit": 0,
        "labour_cost_per_unit": 25,
        "total_cost_per_unit": 25,
        "description": "Floor plans, elevations, sections, 3D views"
    },
    "Structural Design": {
        "category": "design",
        "unit": "sqft",
        "material_cost_per_unit": 0,
        "labour_cost_per_unit": 15,
        "total_cost_per_unit": 15,
        "description": "RCC design, foundation design, structural drawings"
    },
    "MEP Design": {
        "category": "design",
        "unit": "sqft",
        "material_cost_per_unit": 0,
        "labour_cost_per_unit": 10,
        "total_cost_per_unit": 10,
        "description": "Electrical, plumbing, HVAC layout design"
    },
    "Design Approval": {
        "category": "design",
        "unit": "lumpsum",
        "material_cost_per_unit": 0,
        "labour_cost_per_unit": 10000,
        "total_cost_per_unit": 10000,
        "description": "Client presentations, revisions, final approval"
    },
    "BOQ Preparation": {
        "category": "design",
        "unit": "lumpsum",
        "material_cost_per_unit": 0,
        "labour_cost_per_unit": 15000,
        "total_cost_per_unit": 15000,
        "description": "Detailed Bill of Quantities with rates"
    },
    
    # ============= CONSTRUCTION PHASE =============
    "Site Preparation": {
        "category": "construction",
        "unit": "sqft",
        "material_cost_per_unit": 5,
        "labour_cost_per_unit": 15,
        "total_cost_per_unit": 20,
        "description": "Site clearing, leveling, temporary facilities"
    },
    "Site Clearing & Leveling": {
        "category": "construction",
        "unit": "sqft",
        "material_cost_per_unit": 5,
        "labour_cost_per_unit": 15,
        "total_cost_per_unit": 20,
        "description": "Clearing vegetation, debris removal, ground leveling"
    },
    "Excavation for Foundation": {
        "category": "construction",
        "unit": "cum",
        "material_cost_per_unit": 50,
        "labour_cost_per_unit": 350,
        "total_cost_per_unit": 400,
        "description": "Earth excavation for foundation trenches"
    },
    "Foundation Work": {
        "category": "construction",
        "unit": "sqft",
        "material_cost_per_unit": 180,
        "labour_cost_per_unit": 70,
        "total_cost_per_unit": 250,
        "description": "PCC, footing, foundation walls"
    },
    "PCC Work": {
        "category": "construction",
        "unit": "sqft",
        "material_cost_per_unit": 45,
        "labour_cost_per_unit": 20,
        "total_cost_per_unit": 65,
        "description": "Plain Cement Concrete 1:4:8 for foundation bed"
    },
    "Footing Reinforcement": {
        "category": "construction",
        "unit": "kg",
        "material_cost_per_unit": 75,
        "labour_cost_per_unit": 15,
        "total_cost_per_unit": 90,
        "description": "Steel reinforcement for footings"
    },
    "Footing Concrete": {
        "category": "construction",
        "unit": "cum",
        "material_cost_per_unit": 5500,
        "labour_cost_per_unit": 1500,
        "total_cost_per_unit": 7000,
        "description": "M25 concrete for footings"
    },
    "Plinth Work": {
        "category": "construction",
        "unit": "sqft",
        "material_cost_per_unit": 120,
        "labour_cost_per_unit": 50,
        "total_cost_per_unit": 170,
        "description": "Plinth beam, DPC, plinth filling"
    },
    "Plinth Beam": {
        "category": "construction",
        "unit": "rmt",
        "material_cost_per_unit": 800,
        "labour_cost_per_unit": 300,
        "total_cost_per_unit": 1100,
        "description": "RCC plinth beam with reinforcement"
    },
    "DPC Work": {
        "category": "construction",
        "unit": "sqft",
        "material_cost_per_unit": 25,
        "labour_cost_per_unit": 10,
        "total_cost_per_unit": 35,
        "description": "Damp proof course 20mm thick"
    },
    "Superstructure": {
        "category": "construction",
        "unit": "sqft",
        "material_cost_per_unit": 350,
        "labour_cost_per_unit": 150,
        "total_cost_per_unit": 500,
        "description": "Columns, beams, slabs RCC work"
    },
    "Column Work": {
        "category": "construction",
        "unit": "nos",
        "material_cost_per_unit": 12000,
        "labour_cost_per_unit": 4000,
        "total_cost_per_unit": 16000,
        "description": "RCC column with M25 concrete and steel"
    },
    "Beam Work": {
        "category": "construction",
        "unit": "rmt",
        "material_cost_per_unit": 1200,
        "labour_cost_per_unit": 400,
        "total_cost_per_unit": 1600,
        "description": "RCC beam with M25 concrete"
    },
    "Slab Casting": {
        "category": "construction",
        "unit": "sqft",
        "material_cost_per_unit": 200,
        "labour_cost_per_unit": 80,
        "total_cost_per_unit": 280,
        "description": "RCC slab 5 inch thick with M25"
    },
    "Masonry Work": {
        "category": "construction",
        "unit": "sqft",
        "material_cost_per_unit": 55,
        "labour_cost_per_unit": 35,
        "total_cost_per_unit": 90,
        "description": "9 inch brick wall with cement mortar"
    },
    "MEP Rough-in": {
        "category": "construction",
        "unit": "sqft",
        "material_cost_per_unit": 80,
        "labour_cost_per_unit": 40,
        "total_cost_per_unit": 120,
        "description": "Electrical conduit, plumbing rough-in"
    },
    
    # ============= FINISHING PHASE =============
    "Plastering": {
        "category": "finishing",
        "unit": "sqft",
        "material_cost_per_unit": 18,
        "labour_cost_per_unit": 14,
        "total_cost_per_unit": 32,
        "description": "Internal and external cement plastering 12mm"
    },
    "Flooring & Tiling": {
        "category": "finishing",
        "unit": "sqft",
        "material_cost_per_unit": 85,
        "labour_cost_per_unit": 35,
        "total_cost_per_unit": 120,
        "description": "Vitrified tiles 600x600mm with fixing"
    },
    "Doors & Windows": {
        "category": "finishing",
        "unit": "sqft",
        "material_cost_per_unit": 450,
        "labour_cost_per_unit": 100,
        "total_cost_per_unit": 550,
        "description": "Wooden doors, UPVC/aluminum windows"
    },
    "Main Door": {
        "category": "finishing",
        "unit": "nos",
        "material_cost_per_unit": 25000,
        "labour_cost_per_unit": 3000,
        "total_cost_per_unit": 28000,
        "description": "Teak wood main door with frame and fittings"
    },
    "Internal Doors": {
        "category": "finishing",
        "unit": "nos",
        "material_cost_per_unit": 12000,
        "labour_cost_per_unit": 2000,
        "total_cost_per_unit": 14000,
        "description": "Flush doors with frame and hardware"
    },
    "Windows": {
        "category": "finishing",
        "unit": "sqft",
        "material_cost_per_unit": 350,
        "labour_cost_per_unit": 80,
        "total_cost_per_unit": 430,
        "description": "UPVC windows with glass and hardware"
    },
    "Painting": {
        "category": "finishing",
        "unit": "sqft",
        "material_cost_per_unit": 18,
        "labour_cost_per_unit": 14,
        "total_cost_per_unit": 32,
        "description": "Interior emulsion paint 2 coats with primer"
    },
    "Electrical Fixtures": {
        "category": "finishing",
        "unit": "point",
        "material_cost_per_unit": 800,
        "labour_cost_per_unit": 300,
        "total_cost_per_unit": 1100,
        "description": "Switches, sockets, wiring per point"
    },
    "Plumbing Fixtures": {
        "category": "finishing",
        "unit": "point",
        "material_cost_per_unit": 2500,
        "labour_cost_per_unit": 800,
        "total_cost_per_unit": 3300,
        "description": "CP fittings, pipes, fixtures per point"
    },
    
    # ============= HANDOVER PHASE =============
    "Final Cleaning": {
        "category": "handover",
        "unit": "sqft",
        "material_cost_per_unit": 3,
        "labour_cost_per_unit": 7,
        "total_cost_per_unit": 10,
        "description": "Site cleaning, debris removal, polishing"
    },
    "Snag List": {
        "category": "handover",
        "unit": "lumpsum",
        "material_cost_per_unit": 20000,
        "labour_cost_per_unit": 10000,
        "total_cost_per_unit": 30000,
        "description": "Defects identification and rectification"
    },
    "Final Inspection": {
        "category": "handover",
        "unit": "lumpsum",
        "material_cost_per_unit": 0,
        "labour_cost_per_unit": 15000,
        "total_cost_per_unit": 15000,
        "description": "Quality check, client walkthrough"
    },
    "Documentation": {
        "category": "handover",
        "unit": "lumpsum",
        "material_cost_per_unit": 10000,
        "labour_cost_per_unit": 15000,
        "total_cost_per_unit": 25000,
        "description": "As-built drawings, warranties, manuals"
    },
    "Key Handover": {
        "category": "handover",
        "unit": "lumpsum",
        "material_cost_per_unit": 5000,
        "labour_cost_per_unit": 5000,
        "total_cost_per_unit": 10000,
        "description": "Formal handover ceremony, key transfer"
    },
}

# Cost multipliers based on finishing grade
FINISHING_GRADE_MULTIPLIERS = {
    "economy": 0.8,
    "standard": 1.0,
    "premium": 1.4,
    "luxury": 2.0,
}

# City-based cost multipliers
CITY_MULTIPLIERS = {
    "mumbai": 1.3,
    "delhi": 1.2,
    "bangalore": 1.15,
    "chennai": 1.1,
    "hyderabad": 1.1,
    "pune": 1.05,
    "kolkata": 1.0,
    "ahmedabad": 0.95,
    "tier2": 0.85,
    "tier3": 0.75,
    "default": 1.0,
}


def get_task_cost_preset(task_title: str) -> Optional[Dict]:
    """
    Get cost preset for a task by matching title.
    Uses fuzzy matching for flexibility.
    """
    task_lower = task_title.lower().strip()
    
    # Direct match first
    for preset_name, preset in TASK_COST_PRESETS.items():
        if preset_name.lower() == task_lower:
            return {"name": preset_name, **preset}
    
    # Partial match
    for preset_name, preset in TASK_COST_PRESETS.items():
        if preset_name.lower() in task_lower or task_lower in preset_name.lower():
            return {"name": preset_name, **preset}
    
    # Keyword matching
    keywords = {
        "excavation": "Excavation for Foundation",
        "foundation": "Foundation Work",
        "footing": "Footing Concrete",
        "plinth": "Plinth Work",
        "column": "Column Work",
        "beam": "Beam Work",
        "slab": "Slab Casting",
        "brick": "Masonry Work",
        "wall": "Masonry Work",
        "plaster": "Plastering",
        "tile": "Flooring & Tiling",
        "floor": "Flooring & Tiling",
        "door": "Internal Doors",
        "window": "Windows",
        "paint": "Painting",
        "electric": "Electrical Fixtures",
        "plumb": "Plumbing Fixtures",
        "clean": "Final Cleaning",
        "survey": "Site Survey",
        "design": "Architectural Design",
        "structural": "Structural Design",
        "mep": "MEP Design",
        "boq": "BOQ Preparation",
        "approval": "Statutory Approvals",
        "clearing": "Site Clearing & Leveling",
        "leveling": "Site Clearing & Leveling",
        "pcc": "PCC Work",
        "dpc": "DPC Work",
        "reinforcement": "Footing Reinforcement",
        "snag": "Snag List",
        "inspection": "Final Inspection",
        "handover": "Key Handover",
        "document": "Documentation",
    }
    
    for keyword, preset_name in keywords.items():
        if keyword in task_lower:
            preset = TASK_COST_PRESETS.get(preset_name)
            if preset:
                return {"name": preset_name, **preset}
    
    return None


def calculate_task_cost(
    task_title: str,
    built_up_area_sqft: float,
    num_floors: int = 1,
    finishing_grade: str = "standard",
    city: str = "default"
) -> Dict:
    """
    Calculate estimated cost for a task based on presets and project parameters.
    
    Args:
        task_title: Name of the task
        built_up_area_sqft: Total built-up area in sqft
        num_floors: Number of floors
        finishing_grade: economy/standard/premium/luxury
        city: City for cost adjustment
    
    Returns:
        Dictionary with estimated costs
    """
    preset = get_task_cost_preset(task_title)
    
    if not preset:
        # Default fallback for unknown tasks
        return {
            "task_title": task_title,
            "preset_found": False,
            "estimated_cost": 0,
            "material_cost": 0,
            "labour_cost": 0,
            "unit": "lumpsum",
            "quantity": 1,
            "note": "No preset found - manual estimation required"
        }
    
    # Get multipliers
    grade_mult = FINISHING_GRADE_MULTIPLIERS.get(finishing_grade.lower(), 1.0)
    city_mult = CITY_MULTIPLIERS.get(city.lower(), 1.0)
    
    # Calculate quantity based on unit type
    unit = preset["unit"]
    if unit == "sqft":
        quantity = built_up_area_sqft
    elif unit == "sqm":
        quantity = built_up_area_sqft / 10.764
    elif unit == "cum":
        # Estimate cubic meters based on area (foundation depth ~1.5m avg)
        quantity = (built_up_area_sqft / 10.764) * 0.15 * num_floors
    elif unit == "rmt":
        # Running meters - estimate perimeter
        side = (built_up_area_sqft / num_floors) ** 0.5
        quantity = side * 4 * num_floors
    elif unit == "nos":
        # Number of items - estimate based on area
        if "column" in preset["name"].lower():
            quantity = max(4, int(built_up_area_sqft / 150))  # ~1 column per 150 sqft
        elif "door" in preset["name"].lower():
            rooms = max(3, int(built_up_area_sqft / 200))
            quantity = rooms + 1  # rooms + 1 main door
        else:
            quantity = max(1, int(built_up_area_sqft / 500))
    elif unit == "point":
        # Electrical/plumbing points
        if "electric" in preset["name"].lower():
            quantity = max(10, int(built_up_area_sqft / 50))  # ~1 point per 50 sqft
        else:
            quantity = max(5, int(built_up_area_sqft / 100))  # plumbing points
    elif unit == "kg":
        # Steel weight - estimate 4kg per sqft for foundations
        quantity = built_up_area_sqft * 0.5
    else:  # lumpsum
        quantity = 1
    
    # Calculate costs with multipliers
    material_cost = preset["material_cost_per_unit"] * quantity * grade_mult * city_mult
    labour_cost = preset["labour_cost_per_unit"] * quantity * city_mult
    total_cost = material_cost + labour_cost
    
    return {
        "task_title": task_title,
        "preset_found": True,
        "preset_name": preset["name"],
        "category": preset["category"],
        "unit": unit,
        "quantity": round(quantity, 2),
        "material_cost_per_unit": round(preset["material_cost_per_unit"] * grade_mult * city_mult, 2),
        "labour_cost_per_unit": round(preset["labour_cost_per_unit"] * city_mult, 2),
        "material_cost": round(material_cost, 2),
        "labour_cost": round(labour_cost, 2),
        "estimated_cost": round(total_cost, 2),
        "grade_multiplier": grade_mult,
        "city_multiplier": city_mult,
        "description": preset["description"]
    }


async def calculate_project_task_costs(
    tasks: List[Dict],
    built_up_area_sqft: float,
    num_floors: int = 1,
    finishing_grade: str = "standard",
    city: str = "default"
) -> Dict:
    """
    Calculate costs for all tasks in a project.
    
    Returns:
        Dictionary with task costs and summary
    """
    task_costs = []
    total_material = 0
    total_labour = 0
    total_cost = 0
    
    for task in tasks:
        title = task.get("title", "Unknown Task")
        cost_data = calculate_task_cost(
            task_title=title,
            built_up_area_sqft=built_up_area_sqft,
            num_floors=num_floors,
            finishing_grade=finishing_grade,
            city=city
        )
        
        cost_data["task_id"] = str(task.get("_id", task.get("id", "")))
        task_costs.append(cost_data)
        
        total_material += cost_data.get("material_cost", 0)
        total_labour += cost_data.get("labour_cost", 0)
        total_cost += cost_data.get("estimated_cost", 0)
    
    return {
        "task_costs": task_costs,
        "summary": {
            "total_tasks": len(tasks),
            "tasks_with_presets": len([t for t in task_costs if t.get("preset_found")]),
            "total_material_cost": round(total_material, 2),
            "total_labour_cost": round(total_labour, 2),
            "total_estimated_cost": round(total_cost, 2),
            "cost_per_sqft": round(total_cost / built_up_area_sqft, 2) if built_up_area_sqft > 0 else 0,
        },
        "parameters": {
            "built_up_area_sqft": built_up_area_sqft,
            "num_floors": num_floors,
            "finishing_grade": finishing_grade,
            "city": city
        }
    }


async def research_task_cost_with_llm(
    task_title: str,
    task_description: str = "",
    built_up_area_sqft: float = 1000,
    city: str = "bangalore"
) -> Dict:
    """
    Use LLM to research and estimate cost for an unknown task type.
    """
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.getenv("EMERGENT_LLM_KEY")
        if not api_key:
            return {"error": "LLM API key not configured"}
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"cost_research_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            system_message="""You are an expert Indian construction cost estimator. 
            Provide realistic cost estimates for residential construction tasks in India.
            Always respond in JSON format with the following structure:
            {
                "task_name": "string",
                "unit": "sqft/sqm/cum/rmt/nos/lumpsum",
                "material_cost_per_unit": number,
                "labour_cost_per_unit": number,
                "total_cost_per_unit": number,
                "assumptions": "string explaining basis",
                "confidence": "high/medium/low"
            }
            Use 2024-2025 Indian market rates. Currency is INR."""
        ).with_model("openai", "gpt-4.1-mini")
        
        prompt = f"""Estimate the cost for this construction task:
        Task: {task_title}
        Description: {task_description}
        Project size: {built_up_area_sqft} sqft
        Location: {city}, India
        
        Provide cost estimate in JSON format."""
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Try to parse JSON from response
        try:
            # Extract JSON from response
            import re
            json_match = re.search(r'\{[^{}]*\}', response, re.DOTALL)
            if json_match:
                cost_data = json.loads(json_match.group())
                cost_data["source"] = "llm_research"
                return cost_data
        except:
            pass
        
        return {
            "task_name": task_title,
            "raw_response": response,
            "source": "llm_research",
            "note": "Could not parse structured response"
        }
        
    except Exception as e:
        logger.error(f"LLM cost research failed: {e}")
        return {"error": str(e)}


def get_all_presets() -> Dict:
    """Return all available cost presets."""
    return {
        "presets": TASK_COST_PRESETS,
        "finishing_grades": FINISHING_GRADE_MULTIPLIERS,
        "city_multipliers": CITY_MULTIPLIERS,
        "total_presets": len(TASK_COST_PRESETS)
    }
