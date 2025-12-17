"""
Floor-wise Estimation Module
Handles floor-by-floor cost estimation with proper area calculations

AREA DEFINITIONS:
- Built-up Area = Sum of all floor-wise areas (regular floors + headroom)
- Parking Area = Calculated separately, not part of built-up area
- Total Construction = Built-up cost + Parking cost + Basement cost

COST CALCULATION:
- Each floor's cost = Floor Area × Rate per sqft (based on floor type)
- Total cost = Sum of all floor costs
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
    Basement is a SEPARATE floor below ground.
    Terrace/Headroom is part of built-up area at package rate.
    """
    floors = []
    
    # Basement is a separate floor below ground
    if has_basement:
        floors.append("basement")
    
    # Regular floors (parking is ON ground floor, tracked separately)
    floor_names = ["ground", "first", "second", "third", "fourth", 
                   "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"]
    floors.extend(floor_names[:num_floors])
    
    # Terrace/Headroom is part of built-up area
    if has_terrace:
        floors.append("terrace")
    
    return floors

def is_item_for_floor(item_name: str, floor_type: str, floor_index: int, total_regular_floors: int) -> bool:
    """
    Determine if an item should be included for a specific floor.
    
    Rules:
    - Foundation items: ground floor only
    - Roofing items: top floor only (or terrace)
    - Regular items: all regular floors
    - Parking items: excluded (parking handled separately)
    """
    item_lower = item_name.lower()
    
    # Ground floor only items (foundation work)
    ground_only_keywords = ['excavation', 'foundation', 'footing', 'plinth', 
                           'backfill', 'termite', 'damp proof', 'pcc for foundation']
    if any(kw in item_lower for kw in ground_only_keywords):
        return floor_type == "ground"
    
    # Top floor only items (roofing)
    top_only_keywords = ['roof waterproof', 'parapet']
    if any(kw in item_lower for kw in top_only_keywords):
        # Check if this is the top regular floor or terrace
        is_top_regular = (floor_index == total_regular_floors - 1) and floor_type not in ['basement', 'terrace']
        return is_top_regular or floor_type == "terrace"
    
    # Basement specific - gets structure but limited finishes
    if floor_type == "basement":
        if any(kw in item_lower for kw in ['paint', 'tile', 'window']):
            return False
        return True
    
    # Terrace only gets waterproofing and basic flooring
    if floor_type == "terrace":
        if any(kw in item_lower for kw in ['waterproof', 'floor', 'terrace', 'parapet']):
            return True
        return False
    
    # Regular floors get everything except foundation/roofing
    return True

def calculate_floor_rate(floor_type: str, base_rate: float, parking_rate: float = 1750.0, basement_rate: float = 1800.0) -> float:
    """
    Calculate rate per sqft for a specific floor type.
    
    FIXED RATES:
    - Parking: ₹1750/sqft (separate from built-up)
    - Basement: ₹1800/sqft (separate floor)
    - Headroom/Terrace: Package rate (part of built-up)
    - Regular floors: Package rate
    """
    if floor_type == "parking":
        return parking_rate
    elif floor_type == "basement":
        return basement_rate
    elif floor_type == "terrace":
        return base_rate  # Headroom uses package rate
    return base_rate

def create_floor_wise_estimate(
    estimate_input: EstimateBase,
    material_preset: MaterialPresetResponse,
    rate_table: RateTableResponse,
    parking_rate: float = 1750.0,
    basement_rate: float = 1800.0
) -> Tuple[List[Dict], Dict, Dict]:
    """
    Create floor-wise estimate with CORRECT area aggregation.
    
    AREA LOGIC:
    - User inputs total built-up area
    - This is divided among regular floors (Ground, First, etc.)
    - Headroom/Terrace is ADDED to built-up (not divided from it)
    - Parking and Basement are SEPARATE areas (not part of built-up division)
    
    COST LOGIC:
    - Each floor: Area × Rate
    - Total Built-up Cost = Sum of all floor costs (regular + terrace)
    - Total Parking Cost = Parking Area × Parking Rate
    - Total Basement Cost = Basement Area × Basement Rate
    - Grand Total = Built-up Cost + Parking Cost + Basement Cost + Overheads
    
    Returns:
        - floors: List of floor configurations with line items
        - totals: Overall estimate totals with proper aggregation
        - assumptions: Calculation assumptions
    """
    # Initialize the base estimation engine
    engine = EstimationEngine(material_preset, rate_table)
    
    # Get base rate
    base_rate = estimate_input.base_rate_per_sqft or 2500.0
    
    # Generate floor list (excludes parking as it's on ground floor)
    floor_types = generate_floor_types(
        estimate_input.num_floors,
        False,  # Parking handled separately
        estimate_input.has_basement,
        estimate_input.has_terrace
    )
    
    # Calculate areas
    # Regular floors = floors that are not basement/terrace
    regular_floors = [f for f in floor_types if f not in ['basement', 'terrace']]
    num_regular_floors = len(regular_floors)
    
    # Per-floor area for regular floors (divide total built-up by number of regular floors)
    area_per_regular_floor = estimate_input.built_up_area_sqft / num_regular_floors if num_regular_floors > 0 else estimate_input.built_up_area_sqft
    
    # Special areas (these are ADDITIONAL, not divided from built-up)
    parking_area = estimate_input.parking_area_sqft if estimate_input.has_parking else 0
    basement_area = estimate_input.basement_area_sqft if estimate_input.has_basement else 0
    terrace_area = estimate_input.terrace_area_sqft if estimate_input.has_terrace else 0
    
    # TOTAL BUILT-UP AREA = (Per floor area × Regular floors) + Terrace
    # Note: The input built_up_area_sqft represents total of regular floors
    # Terrace is additional headroom space
    total_built_up_area = estimate_input.built_up_area_sqft + terrace_area
    
    # Create modified input for engine calculation (calculate for total area)
    # This gives us the base BOQ for the entire building
    modified_input = estimate_input.copy(deep=True)
    modified_input.built_up_area_sqft = area_per_regular_floor  # Per floor for scaling
    modified_input.num_floors = 1
    
    # Get BOQ lines from engine (for a single floor template)
    base_lines, base_totals, assumptions = engine.calculate_estimate(modified_input)
    
    # Track all areas and costs
    floors = []
    total_floor_cost = 0
    total_material = 0
    total_labour = 0
    total_services = 0
    
    # Process each floor type
    for idx, floor_type in enumerate(floor_types):
        # Determine floor area
        if floor_type == "basement":
            floor_area = basement_area
        elif floor_type == "terrace":
            floor_area = terrace_area
        else:
            # Regular floor
            floor_area = area_per_regular_floor
        
        # Get floor rate
        floor_rate = calculate_floor_rate(floor_type, base_rate, parking_rate, basement_rate)
        
        # Filter and scale line items for this floor
        floor_lines = []
        floor_total = 0
        floor_material = 0
        floor_labour = 0
        floor_services = 0
        
        # Only add lines if floor has area
        if floor_area > 0:
            for line in base_lines:
                # Check if this item applies to this floor
                if not is_item_for_floor(line.item_name, floor_type, idx, num_regular_floors):
                    continue
                
                # Scale quantity based on floor area ratio
                area_ratio = floor_area / area_per_regular_floor if area_per_regular_floor > 0 else 1
                
                # For basement/terrace, also adjust rate
                rate_ratio = floor_rate / base_rate if base_rate > 0 else 1
                
                # Create floor-specific line
                line_quantity = round(line.quantity * area_ratio, 2)
                line_rate = round(line.rate * rate_ratio, 2)
                line_amount = round(line_quantity * line_rate, 2)
                
                floor_line = {
                    "id": str(uuid.uuid4()),
                    "category": line.category.value if hasattr(line.category, 'value') else line.category,
                    "item_name": line.item_name,
                    "description": line.description,
                    "unit": line.unit,
                    "quantity": line_quantity,
                    "rate": line_rate,
                    "amount": line_amount,
                    "formula_used": line.formula_used,
                    "is_user_edited": False,
                    "is_auto_assigned": True,
                    "notes": f"Auto-assigned to {get_floor_display_name(floor_type)}"
                }
                
                floor_lines.append(floor_line)
                floor_total += line_amount
                
                # Track by category
                cat = floor_line["category"]
                if cat in ["excavation_foundation", "superstructure", "masonry", "flooring", "finishing"]:
                    floor_material += line_amount * 0.7
                    floor_labour += line_amount * 0.3
                elif cat == "services":
                    floor_services += line_amount
                else:
                    floor_material += line_amount * 0.6
                    floor_labour += line_amount * 0.4
        
        # Create floor object
        floor_obj = {
            "id": str(uuid.uuid4()),
            "floor_type": floor_type,
            "floor_name": get_floor_display_name(floor_type),
            "floor_number": get_floor_number(floor_type),
            "area_sqft": floor_area,
            "rate_per_sqft": floor_rate,
            "is_parking": False,
            "is_basement": floor_type == "basement",
            "is_terrace": floor_type == "terrace",
            "material_cost": round(floor_material, 2),
            "labour_cost": round(floor_labour, 2),
            "services_cost": round(floor_services, 2),
            "floor_total": round(floor_total, 2),
            "lines": floor_lines
        }
        
        floors.append(floor_obj)
        
        # Update totals
        total_floor_cost += floor_total
        total_material += floor_material
        total_labour += floor_labour
        total_services += floor_services
    
    # Add parking as a separate cost item (not a floor with BOQ)
    parking_cost = parking_area * parking_rate if parking_area > 0 else 0
    
    # Calculate overhead and contingency
    subtotal = total_floor_cost + parking_cost
    contingency = subtotal * (estimate_input.contingency_percent / 100)
    overhead = subtotal * 0.1  # 10% overhead
    
    # Grand total
    grand_total = subtotal + contingency + overhead
    
    # Cost per sqft based on total built-up area (excluding parking)
    cost_per_sqft = grand_total / total_built_up_area if total_built_up_area > 0 else 0
    
    # Calculate summary for client (simple area × rate)
    # Built-up amount = Total built-up area × Package rate
    built_up_simple_cost = total_built_up_area * base_rate
    parking_simple_cost = parking_area * parking_rate
    basement_simple_cost = basement_area * basement_rate
    total_simple_cost = built_up_simple_cost + parking_simple_cost
    
    # Build totals dictionary
    totals = {
        "total_material_cost": round(total_material, 2),
        "total_labour_cost": round(total_labour, 2),
        "total_services_cost": round(total_services, 2),
        "total_overhead_cost": round(overhead, 2),
        "contingency_cost": round(contingency, 2),
        "grand_total": round(grand_total, 2),
        "cost_per_sqft": round(cost_per_sqft, 2),
        
        # Floor totals
        "parking_total": round(parking_cost, 2),
        "basement_total": sum(f["floor_total"] for f in floors if f["is_basement"]),
        "terrace_total": sum(f["floor_total"] for f in floors if f["is_terrace"]),
        
        "is_floor_wise": True,
        
        # CLIENT SUMMARY - Simple calculation for sharing
        # This shows: Area × Rate = Amount for each area type
        "summary": {
            # Area breakdown
            "built_up_area": estimate_input.built_up_area_sqft,  # Input by user (regular floors)
            "area_per_floor": round(area_per_regular_floor, 2),
            "num_regular_floors": num_regular_floors,
            "headroom_area": terrace_area,
            "total_built_up_with_headroom": round(total_built_up_area, 2),  # Regular + Terrace
            "parking_area": parking_area,
            "basement_area": basement_area,
            
            # Rates
            "package_rate": base_rate,
            "parking_rate": parking_rate,
            "basement_rate": basement_rate,
            
            # Simple cost calculation (Area × Rate)
            "built_up_amount": round(built_up_simple_cost, 2),  # Total built-up × Package rate
            "parking_amount": round(parking_simple_cost, 2),
            "basement_amount": round(basement_simple_cost, 2),
            "total_construction_cost": round(total_simple_cost + basement_simple_cost, 2),
            
            # Detailed BOQ cost (from line items)
            "detailed_boq_total": round(total_floor_cost, 2),
            "detailed_with_overhead": round(grand_total, 2),
        }
    }
    
    # Update assumptions
    assumptions["area_calculation"] = {
        "input_built_up_area": estimate_input.built_up_area_sqft,
        "num_regular_floors": num_regular_floors,
        "area_per_regular_floor": round(area_per_regular_floor, 2),
        "terrace_area": terrace_area,
        "total_built_up_area": round(total_built_up_area, 2),
        "parking_area": parking_area,
        "basement_area": basement_area,
        "note": "Built-up = (Input area is divided among regular floors) + Terrace. Parking and Basement are separate."
    }
    assumptions["rate_structure"] = {
        "package_rate": base_rate,
        "parking_rate": parking_rate,
        "basement_rate": basement_rate,
    }
    assumptions["cost_calculation"] = {
        "method": "Sum of all floor costs + Parking cost + Overhead + Contingency",
        "floor_cost_formula": "Each floor: Area × Rate adjusted items",
        "parking_cost_formula": f"Parking Area ({parking_area}) × Rate ({parking_rate}) = {parking_cost}",
    }
    
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
    base_rate = estimate.get("base_rate_per_sqft", 2500)
    
    # Calculate area per floor (divide total by number of floors)
    area_per_floor = built_up_area / num_floors if num_floors > 0 else built_up_area
    
    # Generate floor types
    floor_types = generate_floor_types(num_floors, False, False, False)
    
    # Distribute existing lines across floors
    floors = []
    total_cost = 0
    
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
            is_top_only = any(kw in item_name.lower() for kw in ['roof', 'parapet'])
            
            if is_ground_only or is_top_only:
                quantity = line.get("quantity", 0)
            else:
                quantity = line.get("quantity", 0) / num_floors
            
            line_rate = line.get("rate", 0)
            line_amount = round(quantity * line_rate, 2)
            
            floor_line = {
                "id": str(uuid.uuid4()),
                "category": line.get("category"),
                "item_name": item_name,
                "description": line.get("description"),
                "unit": line.get("unit"),
                "quantity": round(quantity, 2),
                "rate": line_rate,
                "amount": line_amount,
                "formula_used": line.get("formula_used"),
                "is_user_edited": line.get("is_user_edited", False),
                "is_auto_assigned": True,
                "notes": f"Migrated to {get_floor_display_name(floor_type)}"
            }
            
            floor_lines.append(floor_line)
            floor_total += line_amount
        
        floor_obj = {
            "id": str(uuid.uuid4()),
            "floor_type": floor_type,
            "floor_name": get_floor_display_name(floor_type),
            "floor_number": get_floor_number(floor_type),
            "area_sqft": area_per_floor,
            "rate_per_sqft": base_rate,
            "is_parking": False,
            "is_basement": False,
            "is_terrace": False,
            "material_cost": 0,
            "labour_cost": 0,
            "services_cost": 0,
            "floor_total": round(floor_total, 2),
            "lines": floor_lines
        }
        
        floors.append(floor_obj)
        total_cost += floor_total
    
    # Calculate updated totals
    contingency = total_cost * 0.1
    overhead = total_cost * 0.1
    grand_total = total_cost + contingency + overhead
    
    updated_totals = {
        "grand_total": round(grand_total, 2),
        "cost_per_sqft": round(grand_total / built_up_area, 2) if built_up_area > 0 else 0,
        "is_floor_wise": True,
        "summary": {
            "built_up_area": built_up_area,
            "area_per_floor": area_per_floor,
            "num_regular_floors": num_floors,
            "headroom_area": 0,
            "total_built_up_with_headroom": built_up_area,
            "parking_area": 0,
            "basement_area": 0,
            "package_rate": base_rate,
            "parking_rate": 1750,
            "basement_rate": 1800,
            "built_up_amount": built_up_area * base_rate,
            "parking_amount": 0,
            "basement_amount": 0,
            "total_construction_cost": built_up_area * base_rate,
            "detailed_boq_total": round(total_cost, 2),
            "detailed_with_overhead": round(grand_total, 2),
        }
    }
    
    return floors, updated_totals
