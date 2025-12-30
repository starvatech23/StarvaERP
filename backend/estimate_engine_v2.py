"""
SiteOps Estimate Engine v2.0
=============================
Dynamic Estimation System with Lead-to-Project Conversion

This module implements:
1. Lead Estimate creation and management
2. Project Estimate conversion from leads
3. BOQ auto-generation with formulas
4. Material and labor calculations
5. Timeline estimation
6. Milestone and task templates

Based on: ESTIMATE_SYSTEM_SPECIFICATION.md
"""

import math
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from enum import Enum
from pydantic import BaseModel
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

# =============================================================================
# ENUMS & CONSTANTS
# =============================================================================

class EstimateTypeEnum(str, Enum):
    ROUGH = "rough"           # Quick sq.ft based estimate
    DETAILED = "detailed"     # Item-wise BOQ estimate
    FINAL = "final"           # Client approved quotation

class EstimateSourceType(str, Enum):
    LEAD_CONVERSION = "lead_conversion"
    DIRECT_CREATION = "direct_creation"

class ProjectTypeEnum(str, Enum):
    RESIDENTIAL_INDIVIDUAL = "residential_individual"
    RESIDENTIAL_APARTMENT = "residential_apartment"
    COMMERCIAL_OFFICE = "commercial_office"
    COMMERCIAL_RETAIL = "commercial_retail"
    INDUSTRIAL = "industrial"
    MIXED_USE = "mixed_use"

class ConstructionType(str, Enum):
    RCC_FRAMED = "rcc_framed"
    LOAD_BEARING = "load_bearing"
    STEEL_STRUCTURE = "steel_structure"
    PRE_ENGINEERED = "pre_engineered"

class FoundationType(str, Enum):
    ISOLATED_FOOTING = "isolated_footing"
    RAFT_FOUNDATION = "raft_foundation"
    PILE_FOUNDATION = "pile_foundation"
    COMBINED_FOOTING = "combined_footing"

class FinishingGrade(str, Enum):
    ECONOMY = "economy"       # Basic materials
    STANDARD = "standard"     # Good quality materials
    PREMIUM = "premium"       # High-end materials
    LUXURY = "luxury"         # Top-tier materials

class BOQCategoryEnum(str, Enum):
    EXCAVATION = "excavation"
    FOUNDATION = "foundation"
    PLINTH = "plinth"
    SUPERSTRUCTURE = "superstructure"
    MASONRY = "masonry"
    PLASTERING = "plastering"
    FLOORING = "flooring"
    DOORS_WINDOWS = "doors_windows"
    ELECTRICAL = "electrical"
    PLUMBING = "plumbing"
    PAINTING = "painting"
    KITCHEN = "kitchen"
    BATHROOM = "bathroom"
    EXTERIOR = "exterior"
    MISCELLANEOUS = "miscellaneous"

# =============================================================================
# PRODUCTIVITY STANDARDS (India Construction)
# =============================================================================

PRODUCTIVITY_STANDARDS = {
    "excavation_manual": {"unit": "cum", "output_per_day": 3},
    "excavation_machine": {"unit": "cum", "output_per_day": 50},
    "concrete_placement": {"unit": "cum", "output_per_day": 10},
    "brickwork": {"unit": "sqft", "output_per_day": 100},
    "plastering": {"unit": "sqft", "output_per_day": 150},
    "tiling": {"unit": "sqft", "output_per_day": 80},
    "painting": {"unit": "sqft", "output_per_day": 200},
    "reinforcement": {"unit": "kg", "output_per_day": 200},
    "formwork": {"unit": "sqft", "output_per_day": 60},
}

WASTAGE_FACTORS = {
    "cement": 0.05,      # 5% wastage
    "steel": 0.03,       # 3% wastage
    "bricks": 0.05,      # 5% breakage
    "sand": 0.10,        # 10% wastage
    "aggregate": 0.05,   # 5% wastage
    "tiles": 0.08,       # 8% cutting waste
    "paint": 0.05,       # 5% wastage
}

# Labor role ratios
LABOR_RATIOS = {
    "mason_to_helper": 2,           # 2 helpers per mason
    "carpenter_to_helper": 1,       # 1 helper per carpenter
    "plumber_to_helper": 1,         # 1 helper per plumber
    "electrician_to_helper": 1,     # 1 helper per electrician
}

# Base rates per sq.ft (Bangalore market, Dec 2025)
BASE_RATES_PER_SQFT = {
    FinishingGrade.ECONOMY: 1600,
    FinishingGrade.STANDARD: 2000,
    FinishingGrade.PREMIUM: 2800,
    FinishingGrade.LUXURY: 4000,
}

# =============================================================================
# DATA MODELS FOR ESTIMATION
# =============================================================================

class FloorDetail(BaseModel):
    floor_number: int
    floor_name: str  # "Ground Floor", "First Floor", etc.
    area_sqft: float
    rooms: int = 0
    bathrooms: int = 0
    special_items: List[str] = []  # "pooja_room", "car_parking", "balcony", etc.

class EstimateSpecifications(BaseModel):
    project_type: ProjectTypeEnum = ProjectTypeEnum.RESIDENTIAL_INDIVIDUAL
    total_area_sqft: float
    num_floors: int = 1
    floor_details: List[FloorDetail] = []
    construction_type: ConstructionType = ConstructionType.RCC_FRAMED
    foundation_type: FoundationType = FoundationType.ISOLATED_FOOTING
    finishing_grade: FinishingGrade = FinishingGrade.STANDARD
    soil_type: str = "medium"  # soft, medium, hard_rock
    special_requirements: List[str] = []  # "modular_kitchen", "false_ceiling", etc.

class BOQLineItem(BaseModel):
    id: Optional[str] = None
    category: BOQCategoryEnum
    item_code: str
    item_name: str
    description: Optional[str] = None
    unit: str
    quantity: float
    rate: float
    amount: float
    formula_used: Optional[str] = None
    calculation_inputs: Optional[Dict[str, Any]] = None
    is_user_edited: bool = False
    notes: Optional[str] = None
    
    # For project estimates - link to tasks
    linked_task_ids: List[str] = []
    
    # Material breakdown
    materials_breakdown: List[Dict[str, Any]] = []
    
    # Labor breakdown
    labor_breakdown: List[Dict[str, Any]] = []

class EstimateSummaryData(BaseModel):
    subtotal: float = 0
    overhead_percentage: float = 10
    overhead_amount: float = 0
    profit_percentage: float = 15
    profit_amount: float = 0
    total_before_tax: float = 0
    gst_percentage: float = 18
    gst_amount: float = 0
    grand_total: float = 0
    cost_per_sqft: float = 0
    
    # Breakdown
    total_material_cost: float = 0
    total_labor_cost: float = 0
    total_equipment_cost: float = 0
    contingency_amount: float = 0

class PaymentMilestone(BaseModel):
    milestone_name: str
    percentage: float
    amount: float
    
# Default payment schedule
DEFAULT_PAYMENT_SCHEDULE = [
    PaymentMilestone(milestone_name="Agreement", percentage=10, amount=0),
    PaymentMilestone(milestone_name="Foundation Complete", percentage=15, amount=0),
    PaymentMilestone(milestone_name="Slab Complete", percentage=25, amount=0),
    PaymentMilestone(milestone_name="Brickwork Complete", percentage=20, amount=0),
    PaymentMilestone(milestone_name="Finishing Start", percentage=20, amount=0),
    PaymentMilestone(milestone_name="Handover", percentage=10, amount=0),
]

# =============================================================================
# FORMULA EVALUATOR
# =============================================================================

class FormulaEvaluator:
    """
    Safe formula evaluation for estimate calculations.
    Supports basic math operations and construction-specific functions.
    """
    
    @staticmethod
    def evaluate(formula: str, inputs: Dict[str, Any]) -> float:
        """
        Evaluate a formula with given inputs.
        
        Example:
            formula = "area * depth * (1 + wastage)"
            inputs = {"area": 1000, "depth": 0.1, "wastage": 0.05}
            result = 105.0
        """
        try:
            # Create safe namespace with math functions
            safe_namespace = {
                'ceil': math.ceil,
                'floor': math.floor,
                'round': round,
                'max': max,
                'min': min,
                'sqrt': math.sqrt,
                'pi': math.pi,
                **inputs
            }
            
            # Evaluate the formula
            result = eval(formula, {"__builtins__": {}}, safe_namespace)
            return float(result)
        except Exception as e:
            logger.warning(f"Formula evaluation failed: {formula} with inputs {inputs}. Error: {e}")
            return 0.0

# =============================================================================
# BOQ TEMPLATES
# =============================================================================

class BOQTemplate:
    """
    Defines standard BOQ items with calculation formulas.
    """
    
    # BOQ templates for residential construction
    RESIDENTIAL_BOQ_TEMPLATES = [
        # EXCAVATION
        {
            "category": BOQCategoryEnum.EXCAVATION,
            "item_code": "EXC-001",
            "item_name": "Excavation for foundation",
            "description": "Excavation in all types of soil for foundation",
            "unit": "cum",
            "formula": "foundation_area * foundation_depth * 1.1",  # 10% extra for working space
            "rate_code": "excavation_rate",
            "default_rate": 150,
        },
        {
            "category": BOQCategoryEnum.EXCAVATION,
            "item_code": "EXC-002",
            "item_name": "Earth disposal",
            "description": "Disposal of excavated earth within 50m",
            "unit": "cum",
            "formula": "foundation_area * foundation_depth * 0.3",  # 30% to dispose
            "rate_code": "earth_disposal_rate",
            "default_rate": 80,
        },
        
        # FOUNDATION
        {
            "category": BOQCategoryEnum.FOUNDATION,
            "item_code": "FND-001",
            "item_name": "PCC for foundation",
            "description": "Plain Cement Concrete 1:4:8 mix below footings",
            "unit": "cum",
            "formula": "foundation_area * 0.075",  # 75mm thick PCC
            "rate_code": "pcc_rate",
            "default_rate": 5500,
            "materials": [
                {"material_code": "CEM-OPC53", "name": "OPC Cement 53 Grade", "unit": "bags", "formula": "quantity * 4.0"},
                {"material_code": "SND-RVR", "name": "River Sand", "unit": "cft", "formula": "quantity * 1.5 * 35.315"},
                {"material_code": "AGG-40", "name": "40mm Aggregate", "unit": "cft", "formula": "quantity * 3.0 * 35.315"},
            ],
            "labor": [
                {"role": "mason", "formula": "ceil(quantity / 5)", "min_count": 1},
                {"role": "helper", "formula": "mason_count * 2", "min_count": 2},
            ],
        },
        {
            "category": BOQCategoryEnum.FOUNDATION,
            "item_code": "FND-002",
            "item_name": "Footing reinforcement",
            "description": "Steel reinforcement for isolated footings Fe500",
            "unit": "kg",
            "formula": "num_columns * avg_footing_steel",  # Approx 40kg per footing
            "rate_code": "steel_rate",
            "default_rate": 90,
        },
        {
            "category": BOQCategoryEnum.FOUNDATION,
            "item_code": "FND-003",
            "item_name": "RCC for footings",
            "description": "M25 grade reinforced concrete for footings",
            "unit": "cum",
            "formula": "num_columns * avg_footing_volume",  # Approx 0.8 cum per footing
            "rate_code": "rcc_rate",
            "default_rate": 7500,
        },
        
        # PLINTH
        {
            "category": BOQCategoryEnum.PLINTH,
            "item_code": "PLN-001",
            "item_name": "Plinth beam",
            "description": "RCC plinth beam M25 grade",
            "unit": "rmt",
            "formula": "perimeter * 1.1",  # 10% extra for internal walls
            "rate_code": "plinth_beam_rate",
            "default_rate": 1200,
        },
        {
            "category": BOQCategoryEnum.PLINTH,
            "item_code": "PLN-002",
            "item_name": "Plinth filling",
            "description": "Sand filling above PCC upto plinth level",
            "unit": "cum",
            "formula": "built_up_area_sqm * 0.45",  # 450mm filling
            "rate_code": "sand_filling_rate",
            "default_rate": 450,
        },
        {
            "category": BOQCategoryEnum.PLINTH,
            "item_code": "PLN-003",
            "item_name": "DPC",
            "description": "Damp proof course - Cement concrete 1:2:4 with waterproofing",
            "unit": "sqm",
            "formula": "built_up_area_sqm",
            "rate_code": "dpc_rate",
            "default_rate": 200,
        },
        
        # SUPERSTRUCTURE
        {
            "category": BOQCategoryEnum.SUPERSTRUCTURE,
            "item_code": "SUP-001",
            "item_name": "RCC columns",
            "description": "RCC columns M25 grade including reinforcement",
            "unit": "cum",
            "formula": "num_columns * column_height * column_area * num_floors",
            "rate_code": "rcc_rate",
            "default_rate": 8500,
        },
        {
            "category": BOQCategoryEnum.SUPERSTRUCTURE,
            "item_code": "SUP-002",
            "item_name": "RCC beams",
            "description": "RCC beams M25 grade including reinforcement",
            "unit": "cum",
            "formula": "total_beam_length * beam_section_area * num_floors",
            "rate_code": "rcc_rate",
            "default_rate": 8500,
        },
        {
            "category": BOQCategoryEnum.SUPERSTRUCTURE,
            "item_code": "SUP-003",
            "item_name": "RCC slab",
            "description": "RCC roof slab M25 grade 125mm thick",
            "unit": "sqm",
            "formula": "built_up_area_sqm * num_floors",
            "rate_code": "slab_rate",
            "default_rate": 1800,
        },
        
        # MASONRY
        {
            "category": BOQCategoryEnum.MASONRY,
            "item_code": "MSN-001",
            "item_name": "External brick wall",
            "description": "230mm thick brick wall with CM 1:4",
            "unit": "sqm",
            "formula": "external_wall_area",
            "rate_code": "brick_wall_230_rate",
            "default_rate": 650,
        },
        {
            "category": BOQCategoryEnum.MASONRY,
            "item_code": "MSN-002",
            "item_name": "Internal brick wall",
            "description": "115mm thick brick wall with CM 1:4",
            "unit": "sqm",
            "formula": "internal_wall_area",
            "rate_code": "brick_wall_115_rate",
            "default_rate": 450,
        },
        
        # PLASTERING
        {
            "category": BOQCategoryEnum.PLASTERING,
            "item_code": "PLS-001",
            "item_name": "Internal plastering",
            "description": "12mm thick cement plaster 1:4 for internal walls",
            "unit": "sqm",
            "formula": "(internal_wall_area + external_wall_area) * 2",  # Both sides
            "rate_code": "internal_plaster_rate",
            "default_rate": 35,
        },
        {
            "category": BOQCategoryEnum.PLASTERING,
            "item_code": "PLS-002",
            "item_name": "External plastering",
            "description": "20mm thick cement plaster 1:4 for external walls",
            "unit": "sqm",
            "formula": "external_wall_area",
            "rate_code": "external_plaster_rate",
            "default_rate": 45,
        },
        {
            "category": BOQCategoryEnum.PLASTERING,
            "item_code": "PLS-003",
            "item_name": "Ceiling plastering",
            "description": "12mm thick cement plaster 1:4 for ceiling",
            "unit": "sqm",
            "formula": "built_up_area_sqm * num_floors",
            "rate_code": "ceiling_plaster_rate",
            "default_rate": 40,
        },
        
        # FLOORING
        {
            "category": BOQCategoryEnum.FLOORING,
            "item_code": "FLR-001",
            "item_name": "Vitrified tile flooring",
            "description": "600x600mm vitrified tiles with 1:4 CM bed",
            "unit": "sqm",
            "formula": "carpet_area_sqm * num_floors * 0.9",  # 90% gets vitrified
            "rate_code": "vitrified_tile_rate",
            "default_rate": 120,
        },
        {
            "category": BOQCategoryEnum.FLOORING,
            "item_code": "FLR-002",
            "item_name": "Bathroom ceramic tiles",
            "description": "300x300mm anti-skid ceramic tiles",
            "unit": "sqm",
            "formula": "total_bathroom_floor_area",
            "rate_code": "ceramic_tile_rate",
            "default_rate": 90,
        },
        {
            "category": BOQCategoryEnum.FLOORING,
            "item_code": "FLR-003",
            "item_name": "Bathroom wall tiles",
            "description": "300x600mm ceramic wall tiles upto dado height",
            "unit": "sqm",
            "formula": "total_bathroom_wall_area",
            "rate_code": "wall_tile_rate",
            "default_rate": 100,
        },
        
        # DOORS & WINDOWS
        {
            "category": BOQCategoryEnum.DOORS_WINDOWS,
            "item_code": "DW-001",
            "item_name": "Main door",
            "description": "Teak wood frame with flush shutter",
            "unit": "nos",
            "formula": "1",  # One per house
            "rate_code": "main_door_rate",
            "default_rate": 25000,
        },
        {
            "category": BOQCategoryEnum.DOORS_WINDOWS,
            "item_code": "DW-002",
            "item_name": "Internal doors",
            "description": "Sal wood frame with flush shutter",
            "unit": "nos",
            "formula": "total_rooms + total_bathrooms",
            "rate_code": "internal_door_rate",
            "default_rate": 12000,
        },
        {
            "category": BOQCategoryEnum.DOORS_WINDOWS,
            "item_code": "DW-003",
            "item_name": "UPVC windows",
            "description": "UPVC sliding windows with glass",
            "unit": "sqft",
            "formula": "total_window_area",
            "rate_code": "upvc_window_rate",
            "default_rate": 650,
        },
        
        # ELECTRICAL
        {
            "category": BOQCategoryEnum.ELECTRICAL,
            "item_code": "ELC-001",
            "item_name": "Electrical wiring",
            "description": "Complete electrical wiring with concealed conduit",
            "unit": "point",
            "formula": "total_rooms * 8 + total_bathrooms * 4",  # Points per room/bathroom
            "rate_code": "electrical_point_rate",
            "default_rate": 1500,
        },
        {
            "category": BOQCategoryEnum.ELECTRICAL,
            "item_code": "ELC-002",
            "item_name": "DB & meter board",
            "description": "Distribution board with MCBs",
            "unit": "nos",
            "formula": "num_floors",
            "rate_code": "db_rate",
            "default_rate": 8000,
        },
        
        # PLUMBING
        {
            "category": BOQCategoryEnum.PLUMBING,
            "item_code": "PLB-001",
            "item_name": "Internal plumbing",
            "description": "Complete internal plumbing with CPVC pipes",
            "unit": "point",
            "formula": "total_bathrooms * 5 + kitchen_count * 3",  # Points per bath/kitchen
            "rate_code": "plumbing_point_rate",
            "default_rate": 2500,
        },
        {
            "category": BOQCategoryEnum.PLUMBING,
            "item_code": "PLB-002",
            "item_name": "Drainage system",
            "description": "PVC drainage pipes and fittings",
            "unit": "rmt",
            "formula": "perimeter + internal_drain_length",
            "rate_code": "drainage_rate",
            "default_rate": 450,
        },
        
        # PAINTING
        {
            "category": BOQCategoryEnum.PAINTING,
            "item_code": "PNT-001",
            "item_name": "Internal painting",
            "description": "Primer + 2 coats acrylic emulsion paint",
            "unit": "sqm",
            "formula": "(internal_wall_area + external_wall_area) * 2 + ceiling_area",
            "rate_code": "internal_paint_rate",
            "default_rate": 35,
        },
        {
            "category": BOQCategoryEnum.PAINTING,
            "item_code": "PNT-002",
            "item_name": "External painting",
            "description": "Primer + 2 coats exterior emulsion paint",
            "unit": "sqm",
            "formula": "external_wall_area",
            "rate_code": "external_paint_rate",
            "default_rate": 40,
        },
        
        # KITCHEN
        {
            "category": BOQCategoryEnum.KITCHEN,
            "item_code": "KIT-001",
            "item_name": "Kitchen platform",
            "description": "Granite platform with stainless steel sink",
            "unit": "rft",
            "formula": "kitchen_platform_length",
            "rate_code": "kitchen_platform_rate",
            "default_rate": 3500,
        },
        
        # BATHROOM
        {
            "category": BOQCategoryEnum.BATHROOM,
            "item_code": "BTH-001",
            "item_name": "Sanitary fittings",
            "description": "Complete sanitary fixtures (WC, basin, shower)",
            "unit": "set",
            "formula": "total_bathrooms",
            "rate_code": "sanitary_set_rate",
            "default_rate": 18000,
        },
        
        # EXTERIOR
        {
            "category": BOQCategoryEnum.EXTERIOR,
            "item_code": "EXT-001",
            "item_name": "Staircase",
            "description": "RCC staircase with granite treads",
            "unit": "nos",
            "formula": "num_floors - 1" if "num_floors > 1" else "0",
            "rate_code": "staircase_rate",
            "default_rate": 75000,
        },
        {
            "category": BOQCategoryEnum.EXTERIOR,
            "item_code": "EXT-002",
            "item_name": "Compound wall",
            "description": "230mm brick wall with MS grill",
            "unit": "rft",
            "formula": "perimeter * 0.75",  # 75% of perimeter
            "rate_code": "compound_wall_rate",
            "default_rate": 1800,
        },
    ]
    
    @classmethod
    def get_templates_for_project_type(cls, project_type: ProjectTypeEnum) -> List[Dict[str, Any]]:
        """Get BOQ templates applicable for a project type."""
        # Currently returning residential templates
        # Can be expanded for commercial, industrial, etc.
        if project_type in [ProjectTypeEnum.RESIDENTIAL_INDIVIDUAL, ProjectTypeEnum.RESIDENTIAL_APARTMENT]:
            return cls.RESIDENTIAL_BOQ_TEMPLATES
        else:
            # Default to residential for now
            return cls.RESIDENTIAL_BOQ_TEMPLATES


# =============================================================================
# MILESTONE & TASK TEMPLATES
# =============================================================================

class MilestoneTemplate:
    """
    Defines standard construction milestones and their tasks.
    """
    
    RESIDENTIAL_MILESTONES = [
        {
            "milestone_code": "MS-FND",
            "name": "Foundation Work",
            "phase": 1,
            "order": 1,
            "description": "Complete foundation including excavation, PCC, and footings",
            "base_duration_days": 21,
            "tasks": [
                {
                    "task_code": "FND-T01",
                    "name": "Site Clearing & Leveling",
                    "order": 1,
                    "dependencies": [],
                    "duration_formula": "built_up_area_sqft / 500",  # days
                    "min_duration": 1,
                    "max_duration": 5,
                },
                {
                    "task_code": "FND-T02",
                    "name": "Excavation for Foundation",
                    "order": 2,
                    "dependencies": ["FND-T01"],
                    "duration_formula": "foundation_volume / 30",  # 30 cum per day with machine
                    "min_duration": 2,
                    "max_duration": 10,
                },
                {
                    "task_code": "FND-T03",
                    "name": "PCC (Plain Cement Concrete)",
                    "order": 3,
                    "dependencies": ["FND-T02"],
                    "duration_formula": "pcc_volume / 10",  # 10 cum per day
                    "min_duration": 1,
                    "max_duration": 3,
                    "curing_days": 7,
                },
                {
                    "task_code": "FND-T04",
                    "name": "Footing Reinforcement",
                    "order": 4,
                    "dependencies": ["FND-T03"],
                    "duration_formula": "footing_steel_kg / 200",  # 200 kg per day
                    "min_duration": 2,
                    "max_duration": 5,
                },
                {
                    "task_code": "FND-T05",
                    "name": "Footing Concrete",
                    "order": 5,
                    "dependencies": ["FND-T04"],
                    "duration_formula": "footing_volume / 10",
                    "min_duration": 1,
                    "max_duration": 3,
                    "curing_days": 14,
                },
            ],
        },
        {
            "milestone_code": "MS-PLN",
            "name": "Plinth Work",
            "phase": 2,
            "order": 2,
            "description": "Plinth beam, plinth filling, and DPC",
            "base_duration_days": 14,
            "tasks": [
                {
                    "task_code": "PLN-T01",
                    "name": "Plinth Beam Reinforcement",
                    "order": 1,
                    "dependencies": [],  # After foundation milestone
                    "duration_formula": "plinth_beam_length / 50",  # meters per day
                    "min_duration": 2,
                    "max_duration": 5,
                },
                {
                    "task_code": "PLN-T02",
                    "name": "Plinth Beam Concrete",
                    "order": 2,
                    "dependencies": ["PLN-T01"],
                    "duration_formula": "plinth_volume / 10",
                    "min_duration": 1,
                    "max_duration": 2,
                    "curing_days": 7,
                },
                {
                    "task_code": "PLN-T03",
                    "name": "Plinth Filling",
                    "order": 3,
                    "dependencies": ["PLN-T02"],
                    "duration_formula": "filling_volume / 50",
                    "min_duration": 1,
                    "max_duration": 3,
                },
                {
                    "task_code": "PLN-T04",
                    "name": "DPC Layer",
                    "order": 4,
                    "dependencies": ["PLN-T03"],
                    "duration_formula": "built_up_area_sqm / 100",
                    "min_duration": 1,
                    "max_duration": 2,
                },
            ],
        },
        {
            "milestone_code": "MS-SUP",
            "name": "Superstructure",
            "phase": 3,
            "order": 3,
            "description": "Columns, beams, and slabs for all floors",
            "base_duration_days": 45,
            "tasks": [
                {
                    "task_code": "SUP-T01",
                    "name": "Column Reinforcement",
                    "order": 1,
                    "dependencies": [],  # After plinth milestone
                    "duration_formula": "num_columns * 0.5",  # 0.5 days per column
                    "min_duration": 3,
                    "max_duration": 10,
                    "repeat_per_floor": True,
                },
                {
                    "task_code": "SUP-T02",
                    "name": "Column Concrete",
                    "order": 2,
                    "dependencies": ["SUP-T01"],
                    "duration_formula": "column_volume / 5",
                    "min_duration": 1,
                    "max_duration": 3,
                    "curing_days": 7,
                    "repeat_per_floor": True,
                },
                {
                    "task_code": "SUP-T03",
                    "name": "Beam Reinforcement",
                    "order": 3,
                    "dependencies": ["SUP-T02"],
                    "duration_formula": "beam_steel_kg / 200",
                    "min_duration": 3,
                    "max_duration": 7,
                    "repeat_per_floor": True,
                },
                {
                    "task_code": "SUP-T04",
                    "name": "Slab Formwork",
                    "order": 4,
                    "dependencies": ["SUP-T03"],
                    "duration_formula": "slab_area_sqm / 50",
                    "min_duration": 3,
                    "max_duration": 7,
                    "repeat_per_floor": True,
                },
                {
                    "task_code": "SUP-T05",
                    "name": "Slab Reinforcement",
                    "order": 5,
                    "dependencies": ["SUP-T04"],
                    "duration_formula": "slab_steel_kg / 200",
                    "min_duration": 2,
                    "max_duration": 5,
                    "repeat_per_floor": True,
                },
                {
                    "task_code": "SUP-T06",
                    "name": "Slab Concrete",
                    "order": 6,
                    "dependencies": ["SUP-T05"],
                    "duration_formula": "slab_volume / 30",
                    "min_duration": 1,
                    "max_duration": 2,
                    "curing_days": 21,  # Slab needs longer curing
                    "repeat_per_floor": True,
                },
            ],
        },
        {
            "milestone_code": "MS-MSN",
            "name": "Masonry Work",
            "phase": 4,
            "order": 4,
            "description": "External and internal brick walls",
            "base_duration_days": 21,
            "tasks": [
                {
                    "task_code": "MSN-T01",
                    "name": "External Wall Construction",
                    "order": 1,
                    "dependencies": [],  # After superstructure
                    "duration_formula": "external_wall_area / 100",  # 100 sqm per day
                    "min_duration": 5,
                    "max_duration": 15,
                    "repeat_per_floor": True,
                },
                {
                    "task_code": "MSN-T02",
                    "name": "Internal Wall Construction",
                    "order": 2,
                    "dependencies": ["MSN-T01"],
                    "duration_formula": "internal_wall_area / 100",
                    "min_duration": 5,
                    "max_duration": 15,
                    "repeat_per_floor": True,
                },
                {
                    "task_code": "MSN-T03",
                    "name": "Lintel Casting",
                    "order": 3,
                    "dependencies": ["MSN-T02"],
                    "duration_formula": "num_openings / 5",  # 5 lintels per day
                    "min_duration": 2,
                    "max_duration": 5,
                    "curing_days": 7,
                    "repeat_per_floor": True,
                },
            ],
        },
        {
            "milestone_code": "MS-MEP",
            "name": "MEP Rough-in",
            "phase": 5,
            "order": 5,
            "description": "Electrical conduits and plumbing rough-in",
            "base_duration_days": 14,
            "tasks": [
                {
                    "task_code": "MEP-T01",
                    "name": "Electrical Conduit Work",
                    "order": 1,
                    "dependencies": [],  # After masonry
                    "duration_formula": "electrical_points / 15",  # 15 points per day
                    "min_duration": 3,
                    "max_duration": 10,
                    "repeat_per_floor": True,
                },
                {
                    "task_code": "MEP-T02",
                    "name": "Plumbing Rough-in",
                    "order": 2,
                    "dependencies": [],  # Parallel to electrical
                    "duration_formula": "plumbing_points / 10",  # 10 points per day
                    "min_duration": 3,
                    "max_duration": 10,
                    "repeat_per_floor": True,
                },
                {
                    "task_code": "MEP-T03",
                    "name": "Drainage Pipes",
                    "order": 3,
                    "dependencies": ["MEP-T02"],
                    "duration_formula": "drainage_length / 20",  # 20 rmt per day
                    "min_duration": 2,
                    "max_duration": 5,
                    "repeat_per_floor": True,
                },
            ],
        },
        {
            "milestone_code": "MS-PLS",
            "name": "Plastering",
            "phase": 6,
            "order": 6,
            "description": "Internal and external plastering",
            "base_duration_days": 21,
            "tasks": [
                {
                    "task_code": "PLS-T01",
                    "name": "Internal Plastering",
                    "order": 1,
                    "dependencies": [],  # After MEP
                    "duration_formula": "internal_plaster_area / 150",  # 150 sqm per day
                    "min_duration": 5,
                    "max_duration": 15,
                    "curing_days": 7,
                    "repeat_per_floor": True,
                },
                {
                    "task_code": "PLS-T02",
                    "name": "External Plastering",
                    "order": 2,
                    "dependencies": ["PLS-T01"],
                    "duration_formula": "external_plaster_area / 100",  # 100 sqm per day
                    "min_duration": 3,
                    "max_duration": 10,
                    "curing_days": 7,
                },
                {
                    "task_code": "PLS-T03",
                    "name": "Ceiling Plastering",
                    "order": 3,
                    "dependencies": ["PLS-T01"],
                    "duration_formula": "ceiling_area / 100",
                    "min_duration": 3,
                    "max_duration": 10,
                    "curing_days": 7,
                    "repeat_per_floor": True,
                },
            ],
        },
        {
            "milestone_code": "MS-FLR",
            "name": "Flooring & Tiling",
            "phase": 7,
            "order": 7,
            "description": "Floor tiles, wall tiles, and waterproofing",
            "base_duration_days": 21,
            "tasks": [
                {
                    "task_code": "FLR-T01",
                    "name": "Waterproofing",
                    "order": 1,
                    "dependencies": [],  # After plastering
                    "duration_formula": "waterproof_area / 50",
                    "min_duration": 2,
                    "max_duration": 5,
                    "repeat_per_floor": True,
                },
                {
                    "task_code": "FLR-T02",
                    "name": "Floor Tiling",
                    "order": 2,
                    "dependencies": ["FLR-T01"],
                    "duration_formula": "floor_area / 80",  # 80 sqm per day
                    "min_duration": 5,
                    "max_duration": 15,
                    "repeat_per_floor": True,
                },
                {
                    "task_code": "FLR-T03",
                    "name": "Bathroom Wall Tiles",
                    "order": 3,
                    "dependencies": ["FLR-T01"],
                    "duration_formula": "bathroom_wall_area / 60",
                    "min_duration": 3,
                    "max_duration": 10,
                    "repeat_per_floor": True,
                },
            ],
        },
        {
            "milestone_code": "MS-DW",
            "name": "Doors & Windows",
            "phase": 8,
            "order": 8,
            "description": "Door frames, shutters, and windows",
            "base_duration_days": 14,
            "tasks": [
                {
                    "task_code": "DW-T01",
                    "name": "Door Frame Fixing",
                    "order": 1,
                    "dependencies": [],  # After flooring
                    "duration_formula": "total_doors / 4",  # 4 frames per day
                    "min_duration": 2,
                    "max_duration": 7,
                },
                {
                    "task_code": "DW-T02",
                    "name": "Window Frame Fixing",
                    "order": 2,
                    "dependencies": [],  # Parallel
                    "duration_formula": "total_windows / 4",
                    "min_duration": 2,
                    "max_duration": 7,
                },
                {
                    "task_code": "DW-T03",
                    "name": "Door Shutter Installation",
                    "order": 3,
                    "dependencies": ["DW-T01"],
                    "duration_formula": "total_doors / 6",  # 6 shutters per day
                    "min_duration": 2,
                    "max_duration": 5,
                },
                {
                    "task_code": "DW-T04",
                    "name": "Window Glass & Hardware",
                    "order": 4,
                    "dependencies": ["DW-T02"],
                    "duration_formula": "total_windows / 5",
                    "min_duration": 2,
                    "max_duration": 5,
                },
            ],
        },
        {
            "milestone_code": "MS-PNT",
            "name": "Painting",
            "phase": 9,
            "order": 9,
            "description": "Putty, primer, and painting",
            "base_duration_days": 21,
            "tasks": [
                {
                    "task_code": "PNT-T01",
                    "name": "Wall Putty",
                    "order": 1,
                    "dependencies": [],  # After D&W
                    "duration_formula": "paint_area / 200",
                    "min_duration": 3,
                    "max_duration": 10,
                    "repeat_per_floor": True,
                },
                {
                    "task_code": "PNT-T02",
                    "name": "Primer Coat",
                    "order": 2,
                    "dependencies": ["PNT-T01"],
                    "duration_formula": "paint_area / 300",
                    "min_duration": 2,
                    "max_duration": 5,
                    "repeat_per_floor": True,
                },
                {
                    "task_code": "PNT-T03",
                    "name": "Final Paint Coats",
                    "order": 3,
                    "dependencies": ["PNT-T02"],
                    "duration_formula": "paint_area / 200",
                    "min_duration": 3,
                    "max_duration": 10,
                    "repeat_per_floor": True,
                },
                {
                    "task_code": "PNT-T04",
                    "name": "External Painting",
                    "order": 4,
                    "dependencies": ["PNT-T03"],
                    "duration_formula": "external_wall_area / 150",
                    "min_duration": 3,
                    "max_duration": 7,
                },
            ],
        },
        {
            "milestone_code": "MS-FIN",
            "name": "Finishing & Handover",
            "phase": 10,
            "order": 10,
            "description": "Fixtures, cleaning, and final touches",
            "base_duration_days": 14,
            "tasks": [
                {
                    "task_code": "FIN-T01",
                    "name": "Sanitary Fixtures",
                    "order": 1,
                    "dependencies": [],  # After painting
                    "duration_formula": "total_bathrooms",
                    "min_duration": 2,
                    "max_duration": 7,
                },
                {
                    "task_code": "FIN-T02",
                    "name": "Electrical Fixtures",
                    "order": 2,
                    "dependencies": [],  # Parallel
                    "duration_formula": "electrical_points / 20",
                    "min_duration": 2,
                    "max_duration": 7,
                },
                {
                    "task_code": "FIN-T03",
                    "name": "Kitchen Fittings",
                    "order": 3,
                    "dependencies": [],  # Parallel
                    "duration_formula": "kitchen_count * 2",
                    "min_duration": 2,
                    "max_duration": 5,
                },
                {
                    "task_code": "FIN-T04",
                    "name": "Final Cleaning",
                    "order": 4,
                    "dependencies": ["FIN-T01", "FIN-T02", "FIN-T03"],
                    "duration_formula": "built_up_area_sqft / 500",
                    "min_duration": 1,
                    "max_duration": 3,
                },
                {
                    "task_code": "FIN-T05",
                    "name": "Touch-up & Handover",
                    "order": 5,
                    "dependencies": ["FIN-T04"],
                    "duration_formula": "1",  # Fixed 1 day
                    "min_duration": 1,
                    "max_duration": 2,
                },
            ],
        },
    ]
    
    @classmethod
    def get_milestones_for_project_type(cls, project_type: ProjectTypeEnum) -> List[Dict[str, Any]]:
        """Get milestone templates for a project type."""
        if project_type in [ProjectTypeEnum.RESIDENTIAL_INDIVIDUAL, ProjectTypeEnum.RESIDENTIAL_APARTMENT]:
            return cls.RESIDENTIAL_MILESTONES
        else:
            return cls.RESIDENTIAL_MILESTONES  # Default


# =============================================================================
# ESTIMATE CALCULATION ENGINE
# =============================================================================

class EstimateCalculator:
    """
    Central calculation engine for estimates, materials, labor, and timelines.
    """
    
    def __init__(self, specifications: EstimateSpecifications):
        self.specs = specifications
        self.formula_evaluator = FormulaEvaluator()
        
        # Pre-calculate common values
        self._calculate_derived_values()
    
    def _calculate_derived_values(self):
        """Calculate derived values from specifications."""
        total_area_sqft = self.specs.total_area_sqft
        num_floors = self.specs.num_floors
        
        # Convert to metric
        self.built_up_area_sqm = total_area_sqft / 10.764
        
        # Foundation calculations
        self.foundation_area = self.built_up_area_sqm * 1.15  # 15% extra for foundation
        self.foundation_depth = 1.2  # meters (default)
        
        # Perimeter estimation (assuming roughly square building)
        side_length = math.sqrt(self.built_up_area_sqm)
        self.perimeter = side_length * 4
        
        # Column estimation based on spacing
        column_spacing = 4.5  # meters (typical)
        columns_per_side = math.ceil(side_length / column_spacing) + 1
        self.num_columns = columns_per_side * columns_per_side
        
        # Volume calculations
        floor_height = 3.0  # meters (default 10 feet)
        
        # Column dimensions (typical 230mm x 230mm = 0.23m x 0.23m)
        self.column_area = 0.053  # sqm
        self.column_height = floor_height
        
        # Beam calculations
        self.total_beam_length = self.perimeter * num_floors + (side_length * 2) * (columns_per_side - 1) * num_floors
        self.beam_section_area = 0.23 * 0.45  # 230mm x 450mm typical beam
        
        # Wall area calculations
        # External walls (full height minus openings)
        external_wall_height = floor_height * num_floors
        opening_percentage = 0.20  # 20% windows/doors
        self.external_wall_area = self.perimeter * external_wall_height * (1 - opening_percentage)
        
        # Internal walls (rough estimate: 60% of external walls)
        self.internal_wall_area = self.external_wall_area * 0.6
        
        # Floor/ceiling area
        # Per user requirement: Flooring area = Built-up area (1:1)
        self.carpet_area_sqm = self.built_up_area_sqm  # Flooring = built-up area
        self.ceiling_area = self.built_up_area_sqm * num_floors
        
        # Room calculations from floor details or estimate
        total_rooms = 0
        total_bathrooms = 0
        if self.specs.floor_details:
            for floor in self.specs.floor_details:
                total_rooms += floor.rooms
                total_bathrooms += floor.bathrooms
        else:
            # Estimate based on area
            total_rooms = max(3, int(total_area_sqft / 250))  # 1 room per 250 sqft
            total_bathrooms = max(2, int(total_rooms / 2))  # 1 bathroom per 2 rooms
        
        self.total_rooms = total_rooms
        self.total_bathrooms = total_bathrooms
        self.kitchen_count = num_floors  # 1 kitchen per floor typical
        
        # Bathroom area calculations
        bathroom_size = 40  # sqft typical
        self.total_bathroom_floor_area = total_bathrooms * bathroom_size / 10.764  # sqm
        self.total_bathroom_wall_area = total_bathrooms * (bathroom_size * 0.5) * 7 / 10.764  # 7 ft dado height
        
        # Opening calculations
        doors_per_floor = (total_rooms + total_bathrooms) / num_floors if num_floors > 0 else 5
        self.total_doors = int(doors_per_floor * num_floors)
        self.total_windows = int(total_rooms * 1.5)  # 1.5 windows per room average
        self.total_window_area = self.total_windows * 15  # sqft per window
        self.num_openings = self.total_doors + self.total_windows
        
        # Footing calculations
        self.avg_footing_volume = 0.8  # cum per footing (typical)
        self.avg_footing_steel = 40  # kg per footing
        
        # Steel calculations
        # Foundation steel: ~30 kg per cum of concrete
        self.footing_steel_kg = self.num_columns * self.avg_footing_steel
        
        # Slab steel: ~50 kg per sqm of slab
        self.slab_steel_kg = self.built_up_area_sqm * 50 * num_floors
        
        # Beam steel: ~150 kg per cum of concrete
        beam_volume = self.total_beam_length * self.beam_section_area
        self.beam_steel_kg = beam_volume * 150
        
        # Volumes
        self.pcc_volume = self.foundation_area * 0.075  # 75mm PCC
        self.footing_volume = self.num_columns * self.avg_footing_volume
        self.plinth_beam_length = self.perimeter * 1.1
        self.plinth_volume = self.plinth_beam_length * 0.23 * 0.45  # Plinth beam
        self.filling_volume = self.built_up_area_sqm * 0.45
        self.slab_area_sqm = self.built_up_area_sqm
        self.slab_volume = self.slab_area_sqm * 0.125 * num_floors  # 125mm thick slab
        self.column_volume = self.num_columns * self.column_area * self.column_height * num_floors
        
        # Plaster areas
        self.internal_plaster_area = (self.internal_wall_area + self.external_wall_area) * 2  # Both sides
        self.external_plaster_area = self.external_wall_area
        
        # Electrical and plumbing
        self.electrical_points = self.total_rooms * 8 + self.total_bathrooms * 4
        self.plumbing_points = self.total_bathrooms * 5 + self.kitchen_count * 3
        self.drainage_length = self.perimeter + (self.total_bathrooms + self.kitchen_count) * 3
        
        # Kitchen
        self.kitchen_platform_length = self.kitchen_count * 10  # 10 rft per kitchen
        
        # Waterproofing
        self.waterproof_area = self.total_bathroom_floor_area + self.built_up_area_sqm * 0.1  # Bathrooms + terrace
        
        # Paint area (all walls + ceiling)
        self.paint_area = self.internal_plaster_area + self.ceiling_area
        
        # Floor area for tiling
        self.floor_area = self.carpet_area_sqm
        self.bathroom_wall_area = self.total_bathroom_wall_area
        
        # Internal drain length
        self.internal_drain_length = (self.total_bathrooms + self.kitchen_count) * 3  # meters
    
    def get_calculation_inputs(self) -> Dict[str, Any]:
        """Get all calculation inputs as a dictionary for formula evaluation."""
        return {
            "built_up_area_sqft": self.specs.total_area_sqft,
            "built_up_area_sqm": self.built_up_area_sqm,
            "num_floors": self.specs.num_floors,
            "foundation_area": self.foundation_area,
            "foundation_depth": self.foundation_depth,
            "perimeter": self.perimeter,
            "num_columns": self.num_columns,
            "column_area": self.column_area,
            "column_height": self.column_height,
            "column_volume": self.column_volume,
            "total_beam_length": self.total_beam_length,
            "beam_section_area": self.beam_section_area,
            "external_wall_area": self.external_wall_area,
            "internal_wall_area": self.internal_wall_area,
            "carpet_area_sqm": self.carpet_area_sqm,
            "ceiling_area": self.ceiling_area,
            "total_rooms": self.total_rooms,
            "total_bathrooms": self.total_bathrooms,
            "kitchen_count": self.kitchen_count,
            "total_bathroom_floor_area": self.total_bathroom_floor_area,
            "total_bathroom_wall_area": self.total_bathroom_wall_area,
            "total_doors": self.total_doors,
            "total_windows": self.total_windows,
            "total_window_area": self.total_window_area,
            "num_openings": self.num_openings,
            "avg_footing_volume": self.avg_footing_volume,
            "avg_footing_steel": self.avg_footing_steel,
            "footing_steel_kg": self.footing_steel_kg,
            "slab_steel_kg": self.slab_steel_kg,
            "beam_steel_kg": self.beam_steel_kg,
            "pcc_volume": self.pcc_volume,
            "footing_volume": self.footing_volume,
            "plinth_beam_length": self.plinth_beam_length,
            "plinth_volume": self.plinth_volume,
            "filling_volume": self.filling_volume,
            "slab_area_sqm": self.slab_area_sqm,
            "slab_volume": self.slab_volume,
            "internal_plaster_area": self.internal_plaster_area,
            "external_plaster_area": self.external_plaster_area,
            "electrical_points": self.electrical_points,
            "plumbing_points": self.plumbing_points,
            "drainage_length": self.drainage_length,
            "kitchen_platform_length": self.kitchen_platform_length,
            "waterproof_area": self.waterproof_area,
            "paint_area": self.paint_area,
            "floor_area": self.floor_area,
            "bathroom_wall_area": self.bathroom_wall_area,
            "internal_drain_length": self.internal_drain_length,
            "foundation_volume": self.pcc_volume + self.footing_volume,
        }
    
    def calculate_boq(self, rate_overrides: Dict[str, float] = None) -> List[BOQLineItem]:
        """
        Generate BOQ line items from templates.
        """
        rate_overrides = rate_overrides or {}
        inputs = self.get_calculation_inputs()
        boq_items = []
        
        templates = BOQTemplate.get_templates_for_project_type(self.specs.project_type)
        
        for template in templates:
            try:
                # Calculate quantity using formula
                quantity = self.formula_evaluator.evaluate(template["formula"], inputs)
                
                if quantity <= 0:
                    continue
                
                # Get rate
                rate = rate_overrides.get(template["rate_code"], template["default_rate"])
                
                # Calculate amount
                amount = quantity * rate
                
                # Create BOQ item
                boq_item = BOQLineItem(
                    id=str(ObjectId()),
                    category=template["category"],
                    item_code=template["item_code"],
                    item_name=template["item_name"],
                    description=template.get("description", ""),
                    unit=template["unit"],
                    quantity=round(quantity, 2),
                    rate=rate,
                    amount=round(amount, 2),
                    formula_used=template["formula"],
                    calculation_inputs={k: round(v, 2) if isinstance(v, float) else v 
                                       for k, v in inputs.items() if k in template["formula"]},
                )
                
                # Calculate materials breakdown if available
                if "materials" in template:
                    for mat in template["materials"]:
                        mat_qty = self.formula_evaluator.evaluate(
                            mat["formula"], 
                            {"quantity": quantity, **inputs}
                        )
                        boq_item.materials_breakdown.append({
                            "material_code": mat["material_code"],
                            "name": mat["name"],
                            "unit": mat["unit"],
                            "quantity": round(mat_qty * (1 + WASTAGE_FACTORS.get(mat["material_code"], 0.05)), 2)
                        })
                
                # Calculate labor breakdown if available
                if "labor" in template:
                    mason_count = 0
                    for lab in template["labor"]:
                        labor_inputs = {"quantity": quantity, "mason_count": mason_count, **inputs}
                        lab_count = self.formula_evaluator.evaluate(lab["formula"], labor_inputs)
                        lab_count = max(math.ceil(lab_count), lab.get("min_count", 1))
                        
                        if lab["role"] == "mason":
                            mason_count = lab_count
                        
                        boq_item.labor_breakdown.append({
                            "role": lab["role"],
                            "count": lab_count,
                        })
                
                boq_items.append(boq_item)
                
            except Exception as e:
                logger.warning(f"Error calculating BOQ item {template['item_name']}: {e}")
                continue
        
        return boq_items
    
    def calculate_summary(self, boq_items: List[BOQLineItem], 
                         overhead_percent: float = 10,
                         profit_percent: float = 15,
                         gst_percent: float = 18) -> EstimateSummaryData:
        """
        Calculate estimate summary from BOQ items.
        """
        # Sum by category
        subtotal = sum(item.amount for item in boq_items)
        
        # Estimate material vs labor split (typical 60-40)
        total_material_cost = subtotal * 0.6
        total_labor_cost = subtotal * 0.4
        
        # Overhead
        overhead_amount = subtotal * (overhead_percent / 100)
        
        # Profit
        profit_amount = (subtotal + overhead_amount) * (profit_percent / 100)
        
        # Total before tax
        total_before_tax = subtotal + overhead_amount + profit_amount
        
        # GST
        gst_amount = total_before_tax * (gst_percent / 100)
        
        # Grand total
        grand_total = total_before_tax + gst_amount
        
        # Cost per sqft
        cost_per_sqft = grand_total / self.specs.total_area_sqft if self.specs.total_area_sqft > 0 else 0
        
        return EstimateSummaryData(
            subtotal=round(subtotal, 2),
            overhead_percentage=overhead_percent,
            overhead_amount=round(overhead_amount, 2),
            profit_percentage=profit_percent,
            profit_amount=round(profit_amount, 2),
            total_before_tax=round(total_before_tax, 2),
            gst_percentage=gst_percent,
            gst_amount=round(gst_amount, 2),
            grand_total=round(grand_total, 2),
            cost_per_sqft=round(cost_per_sqft, 2),
            total_material_cost=round(total_material_cost, 2),
            total_labor_cost=round(total_labor_cost, 2),
            total_equipment_cost=0,
            contingency_amount=0,
        )
    
    def generate_payment_schedule(self, grand_total: float) -> List[PaymentMilestone]:
        """Generate payment schedule based on grand total."""
        schedule = []
        for milestone in DEFAULT_PAYMENT_SCHEDULE:
            amount = grand_total * (milestone.percentage / 100)
            schedule.append(PaymentMilestone(
                milestone_name=milestone.milestone_name,
                percentage=milestone.percentage,
                amount=round(amount, 2)
            ))
        return schedule


# =============================================================================
# LEAD ESTIMATE SERVICE
# =============================================================================

class LeadEstimateService:
    """
    Service for managing lead estimates.
    """
    
    def __init__(self, db):
        self.db = db
    
    async def create_lead_estimate(
        self,
        lead_id: str,
        specifications: EstimateSpecifications,
        estimate_type: EstimateTypeEnum,
        created_by: str,
        rate_overrides: Dict[str, float] = None
    ) -> Dict[str, Any]:
        """
        Create a new lead estimate with auto-calculated BOQ.
        """
        # Get lead info
        lead = await self.db.leads.find_one({"_id": ObjectId(lead_id)})
        if not lead:
            raise ValueError("Lead not found")
        
        # Create calculator
        calculator = EstimateCalculator(specifications)
        
        # Generate BOQ
        boq_items = calculator.calculate_boq(rate_overrides)
        
        # Calculate summary
        summary = calculator.calculate_summary(boq_items)
        
        # Generate payment schedule
        payment_schedule = calculator.generate_payment_schedule(summary.grand_total)
        
        # Generate estimate number
        count = await self.db.lead_estimates.count_documents({})
        estimate_number = f"EST-L-{datetime.utcnow().strftime('%Y')}-{str(count + 1).zfill(3)}"
        
        # Build estimate document
        estimate_doc = {
            "estimate_number": estimate_number,
            "lead_id": lead_id,
            "lead_name": lead.get("name", ""),
            "lead_phone": lead.get("phone", ""),
            "lead_email": lead.get("email", ""),
            
            "estimate_type": estimate_type.value,
            "status": "draft",
            "version": 1,
            "version_history": [{
                "version": 1,
                "created_at": datetime.utcnow(),
                "created_by": created_by,
                "changes": "Initial estimate",
                "total_amount": summary.grand_total
            }],
            
            "specifications": specifications.dict(),
            "line_items": [item.dict() for item in boq_items],
            
            "summary": {
                **summary.dict(),
                "payment_schedule": [ps.dict() for ps in payment_schedule]
            },
            
            "calculation_inputs": calculator.get_calculation_inputs(),
            
            "conversion": {
                "converted_to_project": False,
                "project_id": None,
                "project_estimate_id": None,
                "converted_at": None,
                "converted_by": None,
            },
            
            "created_by": created_by,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        
        result = await self.db.lead_estimates.insert_one(estimate_doc)
        estimate_doc["_id"] = result.inserted_id
        
        return estimate_doc
    
    async def update_line_item(
        self,
        estimate_id: str,
        line_id: str,
        quantity: Optional[float] = None,
        rate: Optional[float] = None,
        updated_by: str = None
    ) -> Dict[str, Any]:
        """
        Update a specific line item and recalculate totals.
        """
        estimate = await self.db.lead_estimates.find_one({"_id": ObjectId(estimate_id)})
        if not estimate:
            raise ValueError("Estimate not found")
        
        # Find and update the line item
        line_items = estimate.get("line_items", [])
        for item in line_items:
            if item.get("id") == line_id:
                if quantity is not None:
                    item["quantity"] = quantity
                if rate is not None:
                    item["rate"] = rate
                item["amount"] = item["quantity"] * item["rate"]
                item["is_user_edited"] = True
                break
        
        # Recalculate summary
        subtotal = sum(item.get("amount", 0) for item in line_items)
        summary = estimate.get("summary", {})
        overhead_pct = summary.get("overhead_percentage", 10)
        profit_pct = summary.get("profit_percentage", 15)
        gst_pct = summary.get("gst_percentage", 18)
        
        overhead_amount = subtotal * (overhead_pct / 100)
        profit_amount = (subtotal + overhead_amount) * (profit_pct / 100)
        total_before_tax = subtotal + overhead_amount + profit_amount
        gst_amount = total_before_tax * (gst_pct / 100)
        grand_total = total_before_tax + gst_amount
        
        # Get area from specifications
        specs = estimate.get("specifications", {})
        total_area = specs.get("total_area_sqft", 1)
        cost_per_sqft = grand_total / total_area if total_area > 0 else 0
        
        # Update summary
        summary["subtotal"] = round(subtotal, 2)
        summary["overhead_amount"] = round(overhead_amount, 2)
        summary["profit_amount"] = round(profit_amount, 2)
        summary["total_before_tax"] = round(total_before_tax, 2)
        summary["gst_amount"] = round(gst_amount, 2)
        summary["grand_total"] = round(grand_total, 2)
        summary["cost_per_sqft"] = round(cost_per_sqft, 2)
        
        # Recalculate payment schedule
        for payment in summary.get("payment_schedule", []):
            payment["amount"] = round(grand_total * (payment["percentage"] / 100), 2)
        
        # Update version
        new_version = estimate.get("version", 1) + 1
        version_history = estimate.get("version_history", [])
        version_history.append({
            "version": new_version,
            "created_at": datetime.utcnow(),
            "created_by": updated_by,
            "changes": f"Updated line item {line_id}",
            "total_amount": grand_total
        })
        
        # Update in database
        await self.db.lead_estimates.update_one(
            {"_id": ObjectId(estimate_id)},
            {"$set": {
                "line_items": line_items,
                "summary": summary,
                "version": new_version,
                "version_history": version_history,
                "updated_at": datetime.utcnow(),
            }}
        )
        
        return await self.db.lead_estimates.find_one({"_id": ObjectId(estimate_id)})


# =============================================================================
# PROJECT ESTIMATE CONVERSION SERVICE  
# =============================================================================

class EstimateConversionService:
    """
    Service for converting lead estimates to project estimates.
    """
    
    def __init__(self, db):
        self.db = db
    
    async def convert_lead_to_project(
        self,
        lead_id: str,
        lead_estimate_id: str,
        project_name: str,
        start_date: datetime,
        converted_by: str
    ) -> Dict[str, Any]:
        """
        Convert a lead estimate to a project with full estimate, milestones, and tasks.
        """
        # Get lead
        lead = await self.db.leads.find_one({"_id": ObjectId(lead_id)})
        if not lead:
            raise ValueError("Lead not found")
        
        # Get lead estimate
        lead_estimate = await self.db.lead_estimates.find_one({"_id": ObjectId(lead_estimate_id)})
        if not lead_estimate:
            raise ValueError("Lead estimate not found")
        
        if lead_estimate.get("conversion", {}).get("converted_to_project"):
            raise ValueError("This estimate has already been converted to a project")
        
        # Create project
        project_doc = {
            "name": project_name,
            "client_name": lead.get("name", ""),
            "client_contact": lead.get("phone", ""),
            "client_email": lead.get("email", ""),
            "location": lead.get("location", ""),
            "address": lead.get("address", ""),
            
            "status": "planning",
            "start_date": start_date,
            "budget": lead_estimate.get("summary", {}).get("grand_total", 0),
            
            "source_lead_id": lead_id,
            "team_member_ids": [],
            "contacts": [],
            
            "created_by": converted_by,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        
        # Generate project code
        now = datetime.utcnow()
        month_year = now.strftime("%m%y")
        count = await self.db.projects.count_documents({})
        project_doc["project_code"] = f"SC{month_year}{str(count + 1).zfill(6)}"
        
        project_result = await self.db.projects.insert_one(project_doc)
        project_id = str(project_result.inserted_id)
        
        # Create project estimate
        estimate_number = f"EST-P-{datetime.utcnow().strftime('%Y')}-{str(count + 1).zfill(3)}"
        
        project_estimate_doc = {
            "project_id": project_id,
            "estimate_number": estimate_number,
            
            "source": {
                "type": "lead_conversion",
                "lead_id": lead_id,
                "lead_estimate_id": str(lead_estimate["_id"]),
                "lead_estimate_number": lead_estimate.get("estimate_number", ""),
                "lead_estimate_version": lead_estimate.get("version", 1),
                "conversion_date": datetime.utcnow(),
                "inherited_amount": lead_estimate.get("summary", {}).get("grand_total", 0),
                "inherited_specifications": lead_estimate.get("specifications", {}),
                "post_conversion_changes": [],
            },
            
            "version": 1,
            "status": "active",
            "specifications": lead_estimate.get("specifications", {}),
            "boq": lead_estimate.get("line_items", []),  # Copy BOQ from lead estimate
            "summary": lead_estimate.get("summary", {}),
            "calculation_inputs": lead_estimate.get("calculation_inputs", {}),
            
            "created_by": converted_by,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        
        estimate_result = await self.db.project_estimates.insert_one(project_estimate_doc)
        project_estimate_id = str(estimate_result.inserted_id)
        
        # Update lead estimate with conversion info
        await self.db.lead_estimates.update_one(
            {"_id": ObjectId(lead_estimate_id)},
            {"$set": {
                "status": "converted",
                "conversion.converted_to_project": True,
                "conversion.project_id": project_id,
                "conversion.project_estimate_id": project_estimate_id,
                "conversion.converted_at": datetime.utcnow(),
                "conversion.converted_by": converted_by,
                "updated_at": datetime.utcnow(),
            }}
        )
        
        # Update lead status to won
        await self.db.leads.update_one(
            {"_id": ObjectId(lead_id)},
            {"$set": {
                "status": "won",
                "converted_project_id": project_id,
                "updated_at": datetime.utcnow(),
            }}
        )
        
        # Generate milestones and tasks
        specs_dict = lead_estimate.get("specifications", {})
        specifications = EstimateSpecifications(**specs_dict)
        
        milestones_created, tasks_created = await self._generate_milestones_and_tasks(
            project_id=project_id,
            project_estimate_id=project_estimate_id,
            specifications=specifications,
            start_date=start_date,
            created_by=converted_by
        )
        
        return {
            "success": True,
            "project_id": project_id,
            "project_code": project_doc["project_code"],
            "project_estimate_id": project_estimate_id,
            "milestones_created": milestones_created,
            "tasks_created": tasks_created,
            "lead_estimate_amount": lead_estimate.get("summary", {}).get("grand_total", 0),
            "message": f"Successfully converted lead to project with {milestones_created} milestones and {tasks_created} tasks"
        }
    
    async def _generate_milestones_and_tasks(
        self,
        project_id: str,
        project_estimate_id: str,
        specifications: EstimateSpecifications,
        start_date: datetime,
        created_by: str
    ) -> Tuple[int, int]:
        """
        Generate milestones and tasks from templates.
        """
        calculator = EstimateCalculator(specifications)
        inputs = calculator.get_calculation_inputs()
        evaluator = FormulaEvaluator()
        
        templates = MilestoneTemplate.get_milestones_for_project_type(specifications.project_type)
        
        milestones_created = 0
        tasks_created = 0
        
        current_date = start_date
        milestone_end_dates = {}  # Track end dates for dependencies
        
        for milestone_template in templates:
            # Calculate milestone duration
            milestone_duration = milestone_template.get("base_duration_days", 14)
            
            milestone_doc = {
                "project_id": project_id,
                "estimate_id": project_estimate_id,
                "milestone_code": milestone_template["milestone_code"],
                "name": milestone_template["name"],
                "description": milestone_template.get("description", ""),
                "phase": milestone_template.get("phase", 1),
                "order": milestone_template.get("order", 1),
                "status": "pending",
                "start_date": current_date,
                "target_date": current_date + timedelta(days=milestone_duration),
                "progress": 0,
                "created_by": created_by,
                "created_at": datetime.utcnow(),
            }
            
            milestone_result = await self.db.milestones.insert_one(milestone_doc)
            milestone_id = str(milestone_result.inserted_id)
            milestones_created += 1
            
            # Generate tasks for this milestone
            task_start = current_date
            task_end_dates = {}
            
            for task_template in milestone_template.get("tasks", []):
                # Calculate task duration
                try:
                    base_duration = evaluator.evaluate(task_template["duration_formula"], inputs)
                    duration = max(
                        task_template.get("min_duration", 1),
                        min(base_duration, task_template.get("max_duration", 30))
                    )
                except:
                    duration = task_template.get("min_duration", 1)
                
                # Add curing time if applicable
                curing_days = task_template.get("curing_days", 0)
                total_duration = math.ceil(duration) + curing_days
                
                # Handle dependencies
                if task_template.get("dependencies"):
                    max_dep_end = task_start
                    for dep_code in task_template["dependencies"]:
                        if dep_code in task_end_dates:
                            max_dep_end = max(max_dep_end, task_end_dates[dep_code])
                    task_start = max_dep_end
                
                task_end = task_start + timedelta(days=total_duration)
                
                task_doc = {
                    "project_id": project_id,
                    "milestone_id": milestone_id,
                    "estimate_id": project_estimate_id,
                    "task_code": f"{project_id[:8]}-{task_template['task_code']}",
                    "title": task_template["name"],
                    "description": task_template.get("description", ""),
                    "status": "pending",
                    "priority": "medium",
                    "start_date": task_start,
                    "planned_start_date": task_start,
                    "due_date": task_end,
                    "planned_end_date": task_end,
                    "planned_duration_days": total_duration,
                    "dependencies": task_template.get("dependencies", []),
                    "assigned_to": [],
                    "created_by": created_by,
                    "created_at": datetime.utcnow(),
                }
                
                await self.db.tasks.insert_one(task_doc)
                tasks_created += 1
                
                # Track end date
                task_end_dates[task_template["task_code"]] = task_end
                
                # Update task start for next task
                if not task_template.get("dependencies"):
                    task_start = task_end
            
            # Update milestone end date based on last task
            if task_end_dates:
                milestone_end = max(task_end_dates.values())
                await self.db.milestones.update_one(
                    {"_id": milestone_result.inserted_id},
                    {"$set": {"target_date": milestone_end}}
                )
                milestone_end_dates[milestone_template["milestone_code"]] = milestone_end
                current_date = milestone_end
            else:
                current_date = current_date + timedelta(days=milestone_duration)
        
        return milestones_created, tasks_created


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def serialize_estimate_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Convert MongoDB document to JSON serializable format."""
    if doc is None:
        return None
    
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    
    # Convert ObjectId fields
    for field in ["lead_id", "project_id", "created_by", "updated_by"]:
        if field in doc and doc[field]:
            doc[field] = str(doc[field])
    
    # Handle nested ObjectIds
    if "conversion" in doc:
        for field in ["project_id", "project_estimate_id", "converted_by"]:
            if field in doc["conversion"] and doc["conversion"][field]:
                doc["conversion"][field] = str(doc["conversion"][field])
    
    return doc
