"""
Floor-wise Estimation Module
Handles floor-by-floor cost estimation with proper area calculations
"""
from typing import Dict, List, Any, Optional, Tuple
from models import (
    EstimateBase, EstimateLineBase, BOQCategory, PackageType,
    MaterialPresetResponse, RateTableResponse,
    FLOOR_DISPLAY_NAMES, FLOOR_SPECIFIC_ITEMS
)
from estimation_engine import EstimationEngine
import uuid

# Floor types and their order
FLOOR_ORDER = [
    "basement",
    "parking",
    "ground",
    "first",
    "second",
    "third",
    "fourth",
    "fifth",
    "sixth",
    "seventh",
    "eighth",
    "ninth",
    "tenth",
    "terrace"
]

def get_floor_number(floor_type: str) -> int:
    """Get numeric order for floor type"""
    order_map = {
        "basement": -1,
        "parking": -2,
        "ground": 0,
        "first": 1,
        "second": 2,
        "third": 3,
        "fourth": 4,
        "fifth": 5,
        "sixth": 6,
        "seventh": 7,
        "eighth": 8,
        "ninth": 9,
        "tenth": 10,
        "terrace": 99
    }
    return order_map.get(floor_type, 0)

def get_floor_display_name(floor_type: str) -> str:
    """Get display name for floor type"""
    return FLOOR_DISPLAY_NAMES.get(floor_type, floor_type.title())

def generate_floor_types(num_floors: int, has_parking: bool = False, 
                         has_basement: bool = False, has_terrace: bool = False) -> List[str]:
    """
    Generate list of floor types based on configuration.
    
    Note: Parking is on the SAME floor as ground floor (not a separate floor).
    It will be tracked separately but counted within ground floor.
    
    Basement is a SEPARATE floor below ground.
    Terrace/Headroom is part of built-up area at package rate.
    """
    floors = []
    
    # Basement is a separate floor below ground
    if has_basement:
        floors.append("basement")
    
    # Regular floors (parking is ON ground floor, not separate)
    floor_names = ["ground", "first", "second", "third", "fourth", 
                   "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"]
    floors.extend(floor_names[:num_floors])
    
    # Terrace/Headroom is part of built-up area
    if has_terrace:
        floors.append("terrace")
    
    return floors

def divide_area_by_floors(total_area: float, num_floors: int) -> float:
    """
    Divide total built-up area by number of floors.
    This is the correct interpretation for lead estimates.
    Example: 1500 sqft with 2 floors = 750 sqft per floor
    """
    if num_floors <= 0:
        return total_area
    return total_area / num_floors

def is_item_for_floor(item_name: str, floor_type: str, floor_index: int, total_floors: int) -> bool:
    """
    Determine if an item should be included for a specific floor.
    
    Rules:
    - Foundation items: ground floor only
    - Roofing items: top floor only
    - Regular items: all regular floors
    - Parking items: parking floor only
    """
    item_lower = item_name.lower()
    
    # Ground floor only items (foundation work)
    ground_only_keywords = ['excavation', 'foundation', 'footing', 'plinth', 
                           'backfill', 'termite', 'damp proof', 'pcc for foundation']
    if any(kw in item_lower for kw in ground_only_keywords):
        return floor_type == "ground"
    
    # Top floor only items
    top_only_keywords = ['roof', 'parapet', 'terrace', 'waterproofing']
    if any(kw in item_lower for kw in top_only_keywords):
        # Last regular floor or terrace
        is_top = (floor_index == total_floors - 1) or floor_type == "terrace"
        return is_top
    
    # Parking specific items
    parking_keywords = ['parking', 'ramp']
    if any(kw in item_lower for kw in parking_keywords):
        return floor_type == "parking"
    
    # Basement specific
    if floor_type == "basement":
        # Basement gets structure but not finishing
        if any(kw in item_lower for kw in ['tile', 'paint', 'finish']):
            return False
        return True
    
    # Parking floors don't need regular finishes
    if floor_type == "parking":
        if any(kw in item_lower for kw in ['tile', 'paint', 'wall', 'door', 'window']):
            return False
        return True
    
    # Terrace only gets waterproofing and flooring
    if floor_type == "terrace":
        if any(kw in item_lower for kw in ['waterproof', 'floor', 'terrace']):
            return True
        return False
    
    # Regular floors get everything except foundation/roofing
    return True

def calculate_floor_rate(floor_type: str, base_rate: float, parking_rate: float = 1750.0, basement_rate: float = 1800.0) -> float:
    """
    Calculate rate per sqft for a specific floor type.
    
    Rates:
    - Parking: ₹1750/sqft (fixed rate, on ground floor)
    - Basement: ₹1800/sqft (fixed rate, separate floor)
    - Headroom/Terrace: Same as package rate (part of built-up area)
    - Regular floors: Package rate (base_rate)
    """
    if floor_type == "parking":
        return parking_rate  # Fixed ₹1750/sqft
    elif floor_type == "basement":
        return basement_rate  # Fixed ₹1800/sqft
    elif floor_type == "terrace":
        return base_rate  # Headroom uses package rate (part of built-up)
    return base_rate

def create_floor_wise_estimate(
    estimate_input: EstimateBase,
    material_preset: MaterialPresetResponse,
    rate_table: RateTableResponse,
    parking_rate: float = 1750.0,  # Fixed ₹1750/sqft for parking
    basement_rate: float = 1800.0   # Fixed ₹1800/sqft for basement
) -> Tuple[List[Dict], Dict, Dict]:
    """
    Create floor-wise estimate with proper area calculations.
    
    Returns:
        - floors: List of floor configurations with line items
        - totals: Overall estimate totals
        - assumptions: Calculation assumptions
    """
    # Initialize the base estimation engine
    engine = EstimationEngine(material_preset, rate_table)
    
    # Determine area calculation mode
    is_lead = bool(estimate_input.lead_id)
    is_project = bool(estimate_input.project_id)
    
    # Generate floor list
    floor_types = generate_floor_types(
        estimate_input.num_floors,
        estimate_input.has_parking,
        estimate_input.has_basement,
        estimate_input.has_terrace
    )
    
    # Calculate area per floor
    if estimate_input.area_mode == "auto" or (is_lead and not estimate_input.floors):
        # Auto mode: Divide total area by number of regular floors
        regular_floors = [f for f in floor_types if f not in ['parking', 'basement', 'terrace']]
        area_per_floor = divide_area_by_floors(
            estimate_input.built_up_area_sqft, 
            len(regular_floors)
        )
    else:
        # Manual mode: Use provided area or equal division
        area_per_floor = estimate_input.built_up_area_sqft / estimate_input.num_floors
    
    # Get base rate
    base_rate = estimate_input.base_rate_per_sqft or 2500.0
    
    # Create modified input for engine calculation (using per-floor area)
    modified_input = estimate_input.copy(deep=True)
    modified_input.built_up_area_sqft = area_per_floor
    modified_input.num_floors = 1  # Calculate for single floor
    
    # Get BOQ lines from engine (for a single floor)
    base_lines, base_totals, assumptions = engine.calculate_estimate(modified_input)
    
    # Build floor-wise structure
    floors = []
    grand_total = 0
    total_material = 0
    total_labour = 0
    total_services = 0
    
    for idx, floor_type in enumerate(floor_types):
        # Determine floor area
        if floor_type == "parking":
            floor_area = estimate_input.parking_area_sqft or area_per_floor
        elif floor_type == "basement":
            floor_area = estimate_input.basement_area_sqft or area_per_floor
        elif floor_type == "terrace":
            floor_area = estimate_input.terrace_area_sqft or (area_per_floor * 0.5)  # Terrace is typically 50% of floor
        else:
            # Check if manual floor config provided
            if estimate_input.floors:
                floor_config = next((f for f in estimate_input.floors if f.get('floor_type') == floor_type), None)
                floor_area = floor_config.get('area_sqft', area_per_floor) if floor_config else area_per_floor
            else:
                floor_area = area_per_floor
        
        # Calculate floor rate
        floor_rate = calculate_floor_rate(floor_type, base_rate, parking_rate_multiplier)
        
        # Check for custom rate override
        if estimate_input.floors:
            floor_config = next((f for f in estimate_input.floors if f.get('floor_type') == floor_type), None)
            if floor_config and floor_config.get('rate_per_sqft'):
                floor_rate = floor_config['rate_per_sqft']
        
        # Filter and scale line items for this floor
        floor_lines = []
        floor_total = 0
        floor_material = 0
        floor_labour = 0
        floor_services = 0
        
        regular_floor_count = len([f for f in floor_types if f not in ['parking', 'basement', 'terrace']])
        
        for line in base_lines:
            # Check if this item applies to this floor
            if not is_item_for_floor(line.item_name, floor_type, idx, regular_floor_count):
                continue
            
            # Scale quantity based on floor area ratio
            area_ratio = floor_area / area_per_floor if area_per_floor > 0 else 1
            
            # Create floor-specific line
            floor_line = {
                "id": str(uuid.uuid4()),
                "category": line.category.value if hasattr(line.category, 'value') else line.category,
                "item_name": line.item_name,
                "description": line.description,
                "unit": line.unit,
                "quantity": round(line.quantity * area_ratio, 2),
                "rate": round(line.rate * (floor_rate / base_rate), 2),  # Adjust rate based on floor type
                "amount": 0,  # Will be calculated
                "formula_used": line.formula_used,
                "is_user_edited": False,
                "is_auto_assigned": True,
                "notes": f"Auto-assigned to {get_floor_display_name(floor_type)}"
            }
            
            # Calculate amount
            floor_line["amount"] = round(floor_line["quantity"] * floor_line["rate"], 2)
            floor_total += floor_line["amount"]
            
            # Track by category
            if floor_line["category"] in ["excavation_foundation", "superstructure", "masonry"]:
                floor_material += floor_line["amount"]
            elif floor_line["category"] == "labour":
                floor_labour += floor_line["amount"]
            elif floor_line["category"] == "services":
                floor_services += floor_line["amount"]
            else:
                floor_material += floor_line["amount"] * 0.6  # Assume 60% material
                floor_labour += floor_line["amount"] * 0.4  # 40% labour
            
            floor_lines.append(floor_line)
        
        # Create floor object
        floor_obj = {
            "id": str(uuid.uuid4()),
            "floor_type": floor_type,
            "floor_name": get_floor_display_name(floor_type),
            "floor_number": get_floor_number(floor_type),
            "area_sqft": floor_area,
            "rate_per_sqft": floor_rate,
            "is_parking": floor_type == "parking",
            "is_basement": floor_type == "basement",
            "is_terrace": floor_type == "terrace",
            "material_cost": round(floor_material, 2),
            "labour_cost": round(floor_labour, 2),
            "services_cost": round(floor_services, 2),
            "floor_total": round(floor_total, 2),
            "lines": floor_lines
        }
        
        floors.append(floor_obj)
        
        # Update grand totals
        grand_total += floor_total
        total_material += floor_material
        total_labour += floor_labour
        total_services += floor_services
    
    # Calculate overall totals with contingency
    contingency = grand_total * (estimate_input.contingency_percent / 100)
    overhead = grand_total * 0.1  # 10% overhead
    
    totals = {
        "total_material_cost": round(total_material, 2),
        "total_labour_cost": round(total_labour, 2),
        "total_services_cost": round(total_services, 2),
        "total_overhead_cost": round(overhead, 2),
        "contingency_cost": round(contingency, 2),
        "grand_total": round(grand_total + contingency + overhead, 2),
        "cost_per_sqft": round((grand_total + contingency + overhead) / estimate_input.built_up_area_sqft, 2),
        "parking_total": sum(f["floor_total"] for f in floors if f["is_parking"]),
        "basement_total": sum(f["floor_total"] for f in floors if f["is_basement"]),
        "terrace_total": sum(f["floor_total"] for f in floors if f["is_terrace"]),
        "is_floor_wise": True
    }
    
    # Update assumptions
    assumptions["area_calculation_mode"] = estimate_input.area_mode
    assumptions["area_per_regular_floor"] = round(area_per_floor, 2)
    assumptions["total_floors_generated"] = len(floor_types)
    assumptions["floor_types"] = floor_types
    assumptions["parking_rate_multiplier"] = parking_rate_multiplier
    
    return floors, totals, assumptions


def migrate_estimate_to_floor_wise(
    estimate: Dict,
    lines: List[Dict],
    material_preset: MaterialPresetResponse,
    rate_table: RateTableResponse
) -> Tuple[List[Dict], Dict]:
    """
    Migrate an existing estimate to floor-wise format.
    
    Args:
        estimate: Existing estimate document
        lines: Existing BOQ lines
        material_preset: Material preset to use
        rate_table: Rate table to use
    
    Returns:
        - floors: New floor-wise structure
        - updated_totals: Updated totals dict
    """
    num_floors = estimate.get("num_floors", 1)
    built_up_area = estimate.get("built_up_area_sqft", 1000)
    
    # Calculate area per floor (divide, not multiply)
    area_per_floor = built_up_area / num_floors if num_floors > 0 else built_up_area
    
    # Generate floor types
    floor_types = generate_floor_types(num_floors, False, False, False)
    
    # Distribute existing lines across floors
    floors = []
    
    for idx, floor_type in enumerate(floor_types):
        floor_lines = []
        floor_total = 0
        
        for line in lines:
            item_name = line.get("item_name", "")
            
            # Check if item applies to this floor
            if not is_item_for_floor(item_name, floor_type, idx, num_floors):
                continue
            
            # For ground-only or top-only items, keep full quantity
            # For repeated items, divide quantity by num_floors
            is_ground_only = any(kw in item_name.lower() for kw in ['excavation', 'foundation', 'footing', 'plinth'])
            is_top_only = any(kw in item_name.lower() for kw in ['roof', 'parapet', 'terrace'])
            
            if is_ground_only or is_top_only:
                quantity = line.get("quantity", 0)
            else:
                # Divide quantity among floors
                quantity = line.get("quantity", 0) / num_floors
            
            floor_line = {
                "id": str(uuid.uuid4()),
                "category": line.get("category"),
                "item_name": item_name,
                "description": line.get("description"),
                "unit": line.get("unit"),
                "quantity": round(quantity, 2),
                "rate": line.get("rate", 0),
                "amount": round(quantity * line.get("rate", 0), 2),
                "formula_used": line.get("formula_used"),
                "is_user_edited": line.get("is_user_edited", False),
                "is_auto_assigned": True,
                "notes": f"Migrated to {get_floor_display_name(floor_type)}"
            }
            
            floor_lines.append(floor_line)
            floor_total += floor_line["amount"]
        
        floor_obj = {
            "id": str(uuid.uuid4()),
            "floor_type": floor_type,
            "floor_name": get_floor_display_name(floor_type),
            "floor_number": get_floor_number(floor_type),
            "area_sqft": area_per_floor,
            "rate_per_sqft": estimate.get("base_rate_per_sqft") or (estimate.get("grand_total", 0) / built_up_area if built_up_area > 0 else 2500),
            "is_parking": False,
            "is_basement": False,
            "is_terrace": False,
            "material_cost": 0,  # Will be recalculated
            "labour_cost": 0,
            "services_cost": 0,
            "floor_total": round(floor_total, 2),
            "lines": floor_lines
        }
        
        floors.append(floor_obj)
    
    # Calculate updated totals
    grand_total = sum(f["floor_total"] for f in floors)
    
    updated_totals = {
        "grand_total": round(grand_total * 1.2, 2),  # Add 20% for overheads/contingency
        "cost_per_sqft": round((grand_total * 1.2) / built_up_area, 2) if built_up_area > 0 else 0,
        "is_floor_wise": True
    }
    
    return floors, updated_totals
