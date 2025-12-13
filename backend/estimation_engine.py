"""
Estimation Calculation Engine
Handles all construction quantity calculations with transparent formulas
"""
from typing import Dict, List, Tuple
from models import (
    EstimateBase, EstimateLineBase, BOQCategory, PackageType,
    MaterialPresetResponse, RateTableResponse
)
import math


class EstimationEngine:
    """
    Core calculation engine for construction estimates
    Uses industry-standard formulas and configurable coefficients
    """
    
    def __init__(self, material_preset: MaterialPresetResponse, rate_table: RateTableResponse):
        self.material_preset = material_preset
        self.rate_table = rate_table
    
    def calculate_estimate(self, estimate_input: EstimateBase) -> Tuple[List[EstimateLineBase], Dict]:
        """
        Main calculation method
        Returns: (list of BOQ lines, updated totals dict)
        """
        lines = []
        assumptions = {}
        
        # Extract inputs
        area_sqft = estimate_input.built_up_area_sqft
        area_sqm = area_sqft * 0.0929  # Convert to square meters
        num_floors = estimate_input.num_floors
        floor_height = estimate_input.floor_to_floor_height
        
        # CRITICAL: Built-up area is the FOOTPRINT (area of ONE floor)
        # This is the primary area for all calculations
        # Number of floors only affects repetition of elements, not the base area
        footprint_sqft = area_sqft  # Built-up area IS the footprint
        footprint_sqm = area_sqm
        
        # Calculate building dimensions
        # Assume aspect ratio 1.5:1 for rectangular building
        length_m = math.sqrt(footprint_sqm * 1.5)
        width_m = length_m / 1.5
        perimeter_m = 2 * (length_m + width_m)
        
        # Document assumptions clearly
        assumptions["built_up_area_sqft"] = round(area_sqft, 2)
        assumptions["built_up_area_interpretation"] = "Footprint area (area of ONE floor)"
        assumptions["building_footprint_sqm"] = round(footprint_sqm, 2)
        assumptions["building_length_m"] = round(length_m, 2)
        assumptions["building_width_m"] = round(width_m, 2)
        assumptions["perimeter_m"] = round(perimeter_m, 2)
        assumptions["num_floors"] = num_floors
        assumptions["floor_to_floor_height_ft"] = floor_height
        
        # ========== EXCAVATION & FOUNDATION ==========
        foundation_lines = self._calculate_foundation(
            length_m, width_m, perimeter_m,
            estimate_input.foundation_depth or 4.0,
            assumptions
        )
        lines.extend(foundation_lines)
        
        # ========== SUPERSTRUCTURE (Columns, Beams, Slabs) ==========
        superstructure_lines = self._calculate_superstructure(
            area_sqm, num_floors, floor_height,
            estimate_input.column_spacing or 15.0,
            estimate_input.slab_thickness or 5.0,
            estimate_input.plinth_beam_height or 1.5,
            assumptions
        )
        lines.extend(superstructure_lines)
        
        # ========== MASONRY (Walls) ==========
        masonry_lines = self._calculate_masonry(
            perimeter_m, floor_height, num_floors,
            estimate_input.external_wall_thickness or 9.0,
            estimate_input.internal_wall_thickness or 4.5,
            area_sqft,
            assumptions
        )
        lines.extend(masonry_lines)
        
        # ========== FINISHES ==========
        finish_lines = self._calculate_finishes(area_sqft, perimeter_m, floor_height, num_floors, assumptions)
        lines.extend(finish_lines)
        
        # ========== SERVICES ==========
        service_lines = self._calculate_services(area_sqft, assumptions)
        lines.extend(service_lines)
        
        # Calculate totals
        totals = self._calculate_totals(lines, estimate_input)
        
        return lines, totals, assumptions
    
    def _calculate_foundation(self, length_m: float, width_m: float, perimeter_m: float,
                              depth_ft: float, assumptions: Dict) -> List[EstimateLineBase]:
        """Calculate foundation quantities"""
        lines = []
        depth_m = depth_ft * 0.3048
        
        # 1. Excavation (assume strip footing + some extra)
        footing_width_m = 0.9  # 3 feet typical
        excavation_volume = perimeter_m * footing_width_m * depth_m * 1.2  # 20% extra for slope
        
        lines.append(EstimateLineBase(
            category=BOQCategory.EXCAVATION_FOUNDATION,
            item_name="Excavation for foundation",
            description="Strip footing excavation with slope allowance",
            unit="cum",
            quantity=round(excavation_volume, 2),
            rate=150.0,  # Typical excavation rate
            amount=round(excavation_volume * 150.0, 2),
            formula_used=f"Perimeter({round(perimeter_m,1)}m) × Width(0.9m) × Depth({round(depth_m,2)}m) × 1.2",
            is_user_edited=False
        ))
        
        assumptions["excavation_volume_cum"] = round(excavation_volume, 2)
        
        # 2. PCC (Plain Cement Concrete) - 100mm thick bed
        pcc_volume = perimeter_m * footing_width_m * 0.1
        cement_bags_pcc = pcc_volume * 5.5  # 5.5 bags/cum for lean mix
        
        lines.append(EstimateLineBase(
            category=BOQCategory.EXCAVATION_FOUNDATION,
            item_name="PCC (1:4:8) - 100mm thick",
            description="Plain cement concrete bed below footing",
            unit="cum",
            quantity=round(pcc_volume, 2),
            rate=self.rate_table.cement_per_bag * 5.5 + self.rate_table.sand_per_cum * 0.4 + self.rate_table.aggregate_per_cum * 0.8,
            amount=0,  # Will calculate
            formula_used=f"Perimeter × Width × 0.1m",
            is_user_edited=False
        ))
        lines[-1].amount = round(lines[-1].quantity * lines[-1].rate, 2)
        
        # 3. Footing concrete (RCC)
        footing_height_m = 0.3  # 1 foot typical
        footing_concrete = perimeter_m * footing_width_m * footing_height_m
        footing_concrete *= (1 + self.material_preset.concrete_wastage)
        
        cement_bags_footing = footing_concrete * self.material_preset.cement_per_cum
        steel_footing = footing_concrete * self.material_preset.steel_kg_per_cum_foundation * (1 + self.material_preset.steel_wastage)
        
        # Concrete
        lines.append(EstimateLineBase(
            category=BOQCategory.EXCAVATION_FOUNDATION,
            item_name="RCC Footing (M20)",
            description="Reinforced concrete footing",
            unit="cum",
            quantity=round(footing_concrete, 2),
            rate=self.rate_table.cement_per_bag * self.material_preset.cement_per_cum + 
                 self.rate_table.sand_per_cum * self.material_preset.sand_per_cum +
                 self.rate_table.aggregate_per_cum * self.material_preset.aggregate_per_cum,
            amount=0,
            formula_used=f"Perimeter × Width × Height × Wastage",
            is_user_edited=False
        ))
        lines[-1].amount = round(lines[-1].quantity * lines[-1].rate, 2)
        
        # Steel for footing
        lines.append(EstimateLineBase(
            category=BOQCategory.EXCAVATION_FOUNDATION,
            item_name="Steel reinforcement - Footing",
            description=f"TMT bars @ {self.material_preset.steel_kg_per_cum_foundation} kg/cum",
            unit="kg",
            quantity=round(steel_footing, 2),
            rate=self.rate_table.steel_per_kg,
            amount=round(steel_footing * self.rate_table.steel_per_kg, 2),
            formula_used=f"Concrete volume × {self.material_preset.steel_kg_per_cum_foundation} kg/cum × Wastage",
            is_user_edited=False
        ))
        
        assumptions["footing_concrete_cum"] = round(footing_concrete, 2)
        assumptions["footing_steel_kg"] = round(steel_footing, 2)
        
        return lines
    
    def _calculate_superstructure(self, area_sqm: float, num_floors: int, floor_height_ft: float,
                                  column_spacing_ft: float, slab_thickness_inch: float,
                                  plinth_beam_height_ft: float, assumptions: Dict) -> List[EstimateLineBase]:
        """Calculate superstructure quantities"""
        lines = []
        
        floor_height_m = floor_height_ft * 0.3048
        column_spacing_m = column_spacing_ft * 0.3048
        slab_thickness_m = (slab_thickness_inch / 12) * 0.3048
        
        # Estimate number of columns (grid based on spacing)
        num_columns = math.ceil(area_sqm / (column_spacing_m ** 2)) * 1.5  # Add edge columns
        
        # 1. Columns
        column_size_m = 0.3  # 300mm × 300mm typical
        column_height_m = floor_height_m * num_floors
        column_volume = num_columns * (column_size_m ** 2) * column_height_m
        column_volume *= (1 + self.material_preset.concrete_wastage)
        
        column_steel = column_volume * self.material_preset.steel_kg_per_cum_column * (1 + self.material_preset.steel_wastage)
        
        lines.append(EstimateLineBase(
            category=BOQCategory.SUPERSTRUCTURE,
            item_name="RCC Columns (M20)",
            description=f"300mm × 300mm columns, {num_floors} floors",
            unit="cum",
            quantity=round(column_volume, 2),
            rate=self.rate_table.cement_per_bag * self.material_preset.cement_per_cum + 
                 self.rate_table.sand_per_cum * self.material_preset.sand_per_cum +
                 self.rate_table.aggregate_per_cum * self.material_preset.aggregate_per_cum,
            amount=0,
            formula_used=f"{int(num_columns)} columns × 0.3² × {round(column_height_m,1)}m",
            is_user_edited=False
        ))
        lines[-1].amount = round(lines[-1].quantity * lines[-1].rate, 2)
        
        lines.append(EstimateLineBase(
            category=BOQCategory.SUPERSTRUCTURE,
            item_name="Steel reinforcement - Columns",
            description=f"TMT bars @ {self.material_preset.steel_kg_per_cum_column} kg/cum",
            unit="kg",
            quantity=round(column_steel, 2),
            rate=self.rate_table.steel_per_kg,
            amount=round(column_steel * self.rate_table.steel_per_kg, 2),
            formula_used=f"Column volume × {self.material_preset.steel_kg_per_cum_column} kg/cum",
            is_user_edited=False
        ))
        
        # 2. Beams (assume 20% of slab area as beam plan area per floor)
        # CORRECTED: Use footprint area, not multiplied by floors
        beam_area_per_floor_m = area_sqm * 0.20
        total_beam_area_m = beam_area_per_floor_m * num_floors  # Beams repeated on each floor
        beam_height_m = 0.45  # 450mm typical
        beam_volume = total_beam_area_m * beam_height_m * (1 + self.material_preset.concrete_wastage)
        
        beam_steel = beam_volume * self.material_preset.steel_kg_per_cum_beam * (1 + self.material_preset.steel_wastage)
        
        lines.append(EstimateLineBase(
            category=BOQCategory.SUPERSTRUCTURE,
            item_name="RCC Beams (M20)",
            description=f"Main and secondary beams - {num_floors} floor(s)",
            unit="cum",
            quantity=round(beam_volume, 2),
            rate=self.rate_table.cement_per_bag * self.material_preset.cement_per_cum + 
                 self.rate_table.sand_per_cum * self.material_preset.sand_per_cum +
                 self.rate_table.aggregate_per_cum * self.material_preset.aggregate_per_cum,
            amount=0,
            formula_used=f"Footprint({round(area_sqm,1)}m²) × 20% × {num_floors} floors × 0.45m height",
            is_user_edited=False
        ))
        lines[-1].amount = round(lines[-1].quantity * lines[-1].rate, 2)
        
        lines.append(EstimateLineBase(
            category=BOQCategory.SUPERSTRUCTURE,
            item_name="Steel reinforcement - Beams",
            description=f"TMT bars @ {self.material_preset.steel_kg_per_cum_beam} kg/cum",
            unit="kg",
            quantity=round(beam_steel, 2),
            rate=self.rate_table.steel_per_kg,
            amount=round(beam_steel * self.rate_table.steel_per_kg, 2),
            formula_used=f"Beam volume × {self.material_preset.steel_kg_per_cum_beam} kg/cum",
            is_user_edited=False
        ))
        
        # 3. Slabs
        # CORRECTED: Calculate slab volume per floor, then multiply by number of slabs
        slab_volume_per_floor = area_sqm * slab_thickness_m
        total_slab_volume = slab_volume_per_floor * num_floors * (1 + self.material_preset.concrete_wastage)
        slab_steel = total_slab_volume * self.material_preset.steel_kg_per_cum_slab * (1 + self.material_preset.steel_wastage)
        
        lines.append(EstimateLineBase(
            category=BOQCategory.SUPERSTRUCTURE,
            item_name=f"RCC Slab (M20) - {slab_thickness_inch}\" thick",
            description=f"Floor slabs - {num_floors} slab(s)",
            unit="cum",
            quantity=round(total_slab_volume, 2),
            rate=self.rate_table.cement_per_bag * self.material_preset.cement_per_cum + 
                 self.rate_table.sand_per_cum * self.material_preset.sand_per_cum +
                 self.rate_table.aggregate_per_cum * self.material_preset.aggregate_per_cum,
            amount=0,
            formula_used=f"Footprint({round(area_sqm,1)}m²) × Thickness({round(slab_thickness_m,3)}m) × {num_floors} slabs",
            is_user_edited=False
        ))
        lines[-1].amount = round(lines[-1].quantity * lines[-1].rate, 2)
        
        lines.append(EstimateLineBase(
            category=BOQCategory.SUPERSTRUCTURE,
            item_name="Steel reinforcement - Slabs",
            description=f"TMT bars @ {self.material_preset.steel_kg_per_cum_slab} kg/cum",
            unit="kg",
            quantity=round(slab_steel, 2),
            rate=self.rate_table.steel_per_kg,
            amount=round(slab_steel * self.rate_table.steel_per_kg, 2),
            formula_used=f"Slab volume × {self.material_preset.steel_kg_per_cum_slab} kg/cum",
            is_user_edited=False
        ))
        
        assumptions["num_columns"] = int(num_columns)
        assumptions["column_volume_cum"] = round(column_volume, 2)
        assumptions["beam_volume_cum"] = round(beam_volume, 2)
        assumptions["slab_volume_cum"] = round(total_slab_volume, 2)
        assumptions["total_steel_kg"] = round(column_steel + beam_steel + slab_steel, 2)
        
        return lines
    
    def _calculate_masonry(self, perimeter_m: float, floor_height_ft: float, num_floors: int,
                           external_wall_thickness_inch: float, internal_wall_thickness_inch: float,
                           area_sqft: float, assumptions: Dict) -> List[EstimateLineBase]:
        """Calculate masonry (walls) quantities"""
        lines = []
        
        floor_height_m = floor_height_ft * 0.3048
        
        # External walls
        external_wall_height_m = floor_height_m * num_floors
        external_wall_area_m = perimeter_m * external_wall_height_m
        # Subtract 15% for openings (doors/windows)
        external_wall_area_m *= 0.85
        
        blocks_required = external_wall_area_m * self.material_preset.blocks_per_sqm * (1 + self.material_preset.block_wastage)
        mortar_volume = external_wall_area_m * self.material_preset.mortar_per_sqm
        
        lines.append(EstimateLineBase(
            category=BOQCategory.MASONRY,
            item_name=f"External wall - 8\" hollow blocks",
            description="Blockwork for external walls (85% of gross area)",
            unit="nos",
            quantity=round(blocks_required, 0),
            rate=self.rate_table.block_8inch_per_unit,
            amount=round(blocks_required * self.rate_table.block_8inch_per_unit, 2),
            formula_used=f"Wall area({round(external_wall_area_m,1)}m²) × {self.material_preset.blocks_per_sqm} blocks/m²",
            is_user_edited=False
        ))
        
        # Internal walls (assume 40% of floor area as internal wall area)
        internal_wall_area_m = (area_sqft * 0.0929) * 0.4 * num_floors
        internal_blocks = internal_wall_area_m * self.material_preset.blocks_per_sqm * (1 + self.material_preset.block_wastage)
        
        lines.append(EstimateLineBase(
            category=BOQCategory.MASONRY,
            item_name=f"Internal partition - 4\" hollow blocks",
            description="Blockwork for internal partitions",
            unit="nos",
            quantity=round(internal_blocks, 0),
            rate=self.rate_table.block_8inch_per_unit * 0.6,  # 4" blocks cheaper
            amount=round(internal_blocks * self.rate_table.block_8inch_per_unit * 0.6, 2),
            formula_used=f"Internal wall area(est. 40% of floor area) × blocks/m²",
            is_user_edited=False
        ))
        
        assumptions["external_wall_area_sqm"] = round(external_wall_area_m, 2)
        assumptions["internal_wall_area_sqm"] = round(internal_wall_area_m, 2)
        assumptions["total_blocks"] = round(blocks_required + internal_blocks, 0)
        
        return lines
    
    def _calculate_finishes(self, area_sqft: float, perimeter_m: float, floor_height_ft: float,
                           num_floors: int, assumptions: Dict) -> List[EstimateLineBase]:
        """Calculate finishing work"""
        lines = []
        
        floor_height_m = floor_height_ft * 0.3048
        area_sqm = area_sqft * 0.0929
        perimeter_ft = perimeter_m * 3.281  # Convert perimeter to feet
        
        # ========== PLASTERING ==========
        # Wall area for plastering (internal walls - both sides)
        # Estimate internal wall length as ~60% of perimeter for partitions
        internal_wall_length_m = perimeter_m * 0.6
        internal_wall_area_m = internal_wall_length_m * floor_height_m * num_floors * 2  # Both sides
        
        # External wall area (internal face only for plastering)
        external_wall_area_m = perimeter_m * floor_height_m * num_floors
        
        # Ceiling area
        ceiling_area_m = area_sqm * num_floors
        
        # Total plaster area
        plaster_area_m = internal_wall_area_m + external_wall_area_m + ceiling_area_m
        
        lines.append(EstimateLineBase(
            category=BOQCategory.FINISHES,
            item_name="Internal plastering - 12mm thick",
            description="Cement plaster for walls and ceiling",
            unit="sqm",
            quantity=round(plaster_area_m, 2),
            rate=180.0,  # Typical rate per sqm
            amount=round(plaster_area_m * 180.0, 2),
            formula_used=f"Wall area ({round(internal_wall_area_m + external_wall_area_m, 2)} sqm) + Ceiling ({round(ceiling_area_m, 2)} sqm)",
            is_user_edited=False
        ))
        
        # ========== FLOORING ==========
        # Flooring covers the floor area of all floors
        flooring_area_sqft = area_sqft * num_floors
        
        lines.append(EstimateLineBase(
            category=BOQCategory.FINISHES,
            item_name="Flooring - Vitrified tiles",
            description="600×600mm tiles with adhesive",
            unit="sqft",
            quantity=round(flooring_area_sqft, 2),
            rate=85.0,  # Per sqft installed
            amount=round(flooring_area_sqft * 85.0, 2),
            formula_used=f"Floor area ({area_sqft} sqft) × {num_floors} floors = {round(flooring_area_sqft, 2)} sqft",
            is_user_edited=False
        ))
        
        # ========== PAINTING ==========
        # Painting area = Wall area + Ceiling area (in sqft)
        # Wall area = Perimeter × Floor height × Number of floors
        # Deduct ~15% for doors and windows
        wall_area_sqft = perimeter_ft * floor_height_ft * num_floors * 0.85  # 15% deduction for openings
        
        # Internal partition walls (estimate ~60% of perimeter length, both sides)
        internal_wall_area_sqft = (perimeter_ft * 0.6) * floor_height_ft * num_floors * 2
        
        # Ceiling area
        ceiling_area_sqft = area_sqft * num_floors
        
        # Total painting area
        total_paint_area_sqft = wall_area_sqft + internal_wall_area_sqft + ceiling_area_sqft
        
        lines.append(EstimateLineBase(
            category=BOQCategory.FINISHES,
            item_name="Interior painting - 2 coats",
            description="Acrylic emulsion paint",
            unit="sqft",
            quantity=round(total_paint_area_sqft, 2),
            rate=self.rate_table.painting_per_sqft,
            amount=round(total_paint_area_sqft * self.rate_table.painting_per_sqft, 2),
            formula_used=f"Walls ({round(wall_area_sqft + internal_wall_area_sqft, 2)} sqft) + Ceiling ({round(ceiling_area_sqft, 2)} sqft)",
            is_user_edited=False
        ))
        
        # Store assumptions
        assumptions["plaster_area_sqm"] = round(plaster_area_m, 2)
        assumptions["flooring_area_sqft"] = round(flooring_area_sqft, 2)
        assumptions["painting_wall_area_sqft"] = round(wall_area_sqft + internal_wall_area_sqft, 2)
        assumptions["painting_ceiling_area_sqft"] = round(ceiling_area_sqft, 2)
        assumptions["painting_total_area_sqft"] = round(total_paint_area_sqft, 2)
        
        return lines
    
    def _calculate_services(self, area_sqft: float, assumptions: Dict) -> List[EstimateLineBase]:
        """Calculate MEP (Mechanical, Electrical, Plumbing) services"""
        lines = []
        
        lines.append(EstimateLineBase(
            category=BOQCategory.SERVICES,
            item_name="Electrical work",
            description="Complete electrical installation with fixtures",
            unit="sqft",
            quantity=round(area_sqft, 2),
            rate=self.rate_table.electrical_per_sqft,
            amount=round(area_sqft * self.rate_table.electrical_per_sqft, 2),
            formula_used=f"Total built-up area × rate/sqft",
            is_user_edited=False
        ))
        
        lines.append(EstimateLineBase(
            category=BOQCategory.SERVICES,
            item_name="Plumbing & sanitary work",
            description="Complete plumbing with fixtures",
            unit="sqft",
            quantity=round(area_sqft, 2),
            rate=self.rate_table.plumbing_per_sqft,
            amount=round(area_sqft * self.rate_table.plumbing_per_sqft, 2),
            formula_used=f"Total built-up area × rate/sqft",
            is_user_edited=False
        ))
        
        return lines
    
    def _calculate_totals(self, lines: List[EstimateLineBase], estimate_input: EstimateBase) -> Dict:
        """Calculate summary totals"""
        totals = {}
        
        # Material costs by category
        material_cost = sum(line.amount for line in lines if line.category in [
            BOQCategory.EXCAVATION_FOUNDATION,
            BOQCategory.SUPERSTRUCTURE,
            BOQCategory.MASONRY,
            BOQCategory.FINISHES
        ])
        
        services_cost = sum(line.amount for line in lines if line.category == BOQCategory.SERVICES)
        
        # Labour cost (percentage of material)
        labour_cost = material_cost * (estimate_input.labour_percent_of_material / 100.0)
        
        # Overhead
        subtotal = material_cost + services_cost + labour_cost
        overhead_cost = subtotal * (self.rate_table.contractor_overhead_percent / 100.0)
        
        # Contingency
        subtotal_with_overhead = subtotal + overhead_cost
        contingency_cost = subtotal_with_overhead * (estimate_input.contingency_percent / 100.0)
        
        # Grand total
        grand_total = subtotal_with_overhead + contingency_cost
        
        # Apply material escalation if any
        if estimate_input.material_escalation_percent > 0:
            material_cost *= (1 + estimate_input.material_escalation_percent / 100.0)
            grand_total = material_cost + services_cost + labour_cost + overhead_cost + contingency_cost
        
        cost_per_sqft = grand_total / estimate_input.built_up_area_sqft
        
        totals["total_material_cost"] = round(material_cost, 2)
        totals["total_labour_cost"] = round(labour_cost, 2)
        totals["total_services_cost"] = round(services_cost, 2)
        totals["total_overhead_cost"] = round(overhead_cost, 2)
        totals["contingency_cost"] = round(contingency_cost, 2)
        totals["grand_total"] = round(grand_total, 2)
        totals["cost_per_sqft"] = round(cost_per_sqft, 2)
        
        return totals


def get_default_material_preset() -> Dict:
    """Return default material preset for quick estimates"""
    return {
        "name": "Standard Mix",
        "cement_per_cum": 7.0,
        "sand_per_cum": 0.42,
        "aggregate_per_cum": 0.84,
        "steel_kg_per_cum_foundation": 80.0,
        "steel_kg_per_cum_column": 150.0,
        "steel_kg_per_cum_beam": 120.0,
        "steel_kg_per_cum_slab": 100.0,
        "blocks_per_sqm": 12.5,
        "mortar_per_sqm": 0.02,
        "concrete_wastage": 0.05,
        "steel_wastage": 0.08,
        "block_wastage": 0.05
    }

def get_default_rate_table() -> Dict:
    """Return default rate table for quick estimates"""
    return {
        "name": "Standard Rates 2025",
        "location": "Default",
        "cement_per_bag": 400.0,
        "sand_per_cum": 1200.0,
        "aggregate_per_cum": 1400.0,
        "steel_per_kg": 65.0,
        "block_8inch_per_unit": 45.0,
        "brick_per_unit": 8.0,
        "labour_per_sqft": 45.0,
        "electrical_per_sqft": 120.0,
        "plumbing_per_sqft": 80.0,
        "painting_per_sqft": 35.0,
        "contractor_overhead_percent": 10.0
    }
