# 📐 SiteOps Estimate System - Comprehensive Specification

## Dynamic Estimate Module Revamp
**Version:** 2.0  
**Date:** December 2025  
**Author:** Starva Technologies  
**Status:** Specification Document

---

# TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Goals & Objectives](#2-goals--objectives)
3. [System Architecture Overview](#3-system-architecture-overview)
4. [Lead-to-Project Estimate Flow](#4-lead-to-project-estimate-flow)
5. [Data Models](#5-data-models)
6. [Functional Requirements](#6-functional-requirements)
7. [Calculation Engine](#7-calculation-engine)
8. [Auto-Generation Logic](#8-auto-generation-logic)
9. [Real-Time Recalculation System](#9-real-time-recalculation-system)
10. [Data Flow & Dependencies](#10-data-flow--dependencies)
11. [API Specifications](#11-api-specifications)
12. [Edge Cases & Handling](#12-edge-cases--handling)
13. [Examples & Scenarios](#13-examples--scenarios)
14. [Implementation Roadmap](#14-implementation-roadmap)

---

# 1. EXECUTIVE SUMMARY

## 1.1 Purpose

This specification defines a completely revamped Estimate System for SiteOps that creates a **centrally linked, dynamic estimation engine** connecting **CRM leads**, projects, milestones, tasks, materials, and labor. 

**CRITICAL LINKAGE:** Estimates created during the lead/sales stage in the CRM module become the foundation for project estimates when leads convert to projects. This ensures a seamless flow from sales to execution with full traceability.

## 1.2 Key Innovations

| Feature | Description |
|---------|-------------|
| **Lead Estimate → Project Estimate** | Seamless conversion with full history |
| **Centralized Estimate** | Single estimate shared across all project tasks |
| **Auto-Task Generation** | Standardized tasks created at project creation |
| **Dynamic Calculations** | Auto-calculate materials, labor, time per task |
| **Real-Time Recalculation** | Timeline adjustments based on actual conditions |
| **Bidirectional Linking** | Changes propagate across all dependent entities |
| **Estimate Versioning** | Track changes from lead stage through project completion |

## 1.3 Estimate Lifecycle Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ESTIMATE LIFECYCLE FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

  CRM MODULE                              PROJECT MODULE
  ──────────                              ──────────────
       │                                        │
       ▼                                        │
┌──────────────┐                               │
│    LEAD      │                               │
│   Created    │                               │
└──────┬───────┘                               │
       │                                        │
       ▼                                        │
┌──────────────┐                               │
│   LEAD       │  ◄─── Initial client          │
│  ESTIMATE    │       requirements &          │
│  (Draft)     │       rough costing           │
└──────┬───────┘                               │
       │                                        │
       │ Revisions based on                    │
       │ client feedback                       │
       ▼                                        │
┌──────────────┐                               │
│   LEAD       │  ◄─── Detailed estimate       │
│  ESTIMATE    │       shared with client      │
│  (Approved)  │                               │
└──────┬───────┘                               │
       │                                        │
       │ Lead Won! Convert to Project          │
       │                                        │
       ▼                                        ▼
┌─────────────────────────────────────────────────┐
│              PROJECT CREATED                     │
│   • Lead estimate becomes project estimate       │
│   • Estimate linked to all milestones/tasks     │
│   • Auto-generate detailed BOQ                   │
│   • Material & labor calculations               │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│           PROJECT ESTIMATE (Active)              │
│   • Linked to original lead estimate            │
│   • Version history maintained                   │
│   • Real-time recalculations                    │
│   • Task-level material/labor tracking          │
└─────────────────────────────────────────────────┘
```

## 1.4 Business Value

- **Reduce estimation time by 80%** through automation
- **Improve accuracy by 60%** with formula-based calculations
- **Seamless sales-to-execution** with lead estimate conversion
- **Full traceability** from initial quote to project completion
- **Real-time visibility** into schedule impacts
- **Single source of truth** for all project estimates

---

# 2. GOALS & OBJECTIVES

## 2.1 Primary Goals

1. **Lead Estimate Integration**: Estimates created in CRM flow seamlessly to projects
2. **Unified Estimate System**: One estimate per project linked to all milestones/tasks
3. **Auto-Generation**: Standardized tasks auto-created based on project type
4. **Dynamic Calculation**: Materials, labor, duration auto-calculated per task
5. **Real-Time Updates**: Automatic timeline recalculation on condition changes
6. **Full Traceability**: Track estimate from lead stage through project completion

## 2.2 Success Metrics

| Metric | Target |
|--------|--------|
| Lead-to-Project conversion time | < 5 minutes |
| Estimate creation time | < 30 minutes (vs current 4+ hours) |
| Calculation accuracy | ≥ 90% vs actual |
| Timeline prediction accuracy | ≥ 85% |
| User adoption rate | 100% within 3 months |

---

# 3. SYSTEM ARCHITECTURE OVERVIEW

## 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SITEOPS ESTIMATE ENGINE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CRM MODULE                           PROJECT MODULE                        │
│  ┌─────────────┐                     ┌─────────────┐                       │
│  │    LEAD     │                     │   PROJECT   │                       │
│  │  Management │                     │  Creation   │                       │
│  └──────┬──────┘                     └──────┬──────┘                       │
│         │                                   │                               │
│         ▼                                   │                               │
│  ┌─────────────┐     CONVERSION      ┌─────────────┐                       │
│  │    LEAD     │────────────────────▶│   PROJECT   │                       │
│  │  ESTIMATE   │  (Lead Won)         │  ESTIMATE   │                       │
│  │  (Sales)    │                     │ (Execution) │                       │
│  └─────────────┘                     └──────┬──────┘                       │
│                                             │                               │
│                                             ▼                               │
│                           ┌─────────────────────────────────────┐          │
│                           │         CENTRAL ESTIMATE            │          │
│                           │  • Linked to Lead Estimate          │          │
│                           │  • BOQ with Task Links              │          │
│                           │  • Material/Labor Calculations      │          │
│                           └──────────────┬──────────────────────┘          │
│                                          │                                  │
│              ┌───────────────────────────┼───────────────────────┐         │
│              │                           │                       │         │
│              ▼                           ▼                       ▼         │
│       ┌──────────┐              ┌──────────────┐         ┌──────────┐     │
│       │MILESTONES│              │    TASKS     │         │ TIMELINE │     │
│       │ (Phases) │              │   (Work)     │         │(Schedule)│     │
│       └──────────┘              └──────────────┘         └──────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 4. LEAD-TO-PROJECT ESTIMATE FLOW

## 4.1 Estimate Types & Stages

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ESTIMATE TYPES & STAGES                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  STAGE 1: LEAD ESTIMATE (CRM Module)                                        │
│  ─────────────────────────────────────                                      │
│  Purpose: Sales & Client Communication                                       │
│                                                                             │
│  Types:                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │ ROUGH ESTIMATE   │  │ DETAILED ESTIMATE│  │ FINAL QUOTATION  │         │
│  │ (Quick Quote)    │  │ (Item-wise)      │  │ (Client Approved)│         │
│  │                  │  │                  │  │                  │         │
│  │ • Per sq.ft rate │  │ • Floor-wise BOQ │  │ • Approved version│        │
│  │ • Quick calc     │  │ • Material list  │  │ • Client signed  │         │
│  │ • Range pricing  │  │ • Labor breakdown│  │ • Terms agreed   │         │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘         │
│           │                     │                     │                    │
│           └─────────────────────┴─────────────────────┘                    │
│                                 │                                           │
│                    Can have multiple revisions                              │
│                    Version history maintained                               │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  │ LEAD WON → CONVERT TO PROJECT
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STAGE 2: PROJECT ESTIMATE (Project Module)                                 │
│  ──────────────────────────────────────────                                 │
│  Purpose: Execution Planning & Tracking                                      │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PROJECT ESTIMATE                                  │   │
│  │                                                                      │   │
│  │  • Inherits from Lead Estimate (linked via lead_estimate_id)        │   │
│  │  • Enhanced with execution details:                                  │   │
│  │    - Task-level material assignments                                │   │
│  │    - Labor scheduling                                                │   │
│  │    - Timeline with dependencies                                      │   │
│  │    - Vendor assignments                                              │   │
│  │  • Can be modified during execution (tracked changes)               │   │
│  │  • Real-time recalculation support                                  │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 4.2 Lead Estimate Schema (Enhanced)

```javascript
// Collection: lead_estimates (existing, enhanced)
{
  _id: ObjectId,
  estimate_number: "EST-L-2025-001",      // Lead estimate number
  
  // LEAD LINKAGE
  lead_id: ObjectId,                       // Required: Link to CRM lead
  lead_name: "Ramesh Kumar",               // Denormalized for display
  lead_phone: "+919876543210",
  lead_email: "ramesh@email.com",
  
  // ESTIMATE TYPE & STATUS
  estimate_type: "rough|detailed|final",
  status: "draft|sent|reviewed|approved|rejected|converted",
  
  // VERSION CONTROL
  version: 3,
  version_history: [
    {
      version: 1,
      created_at: ISODate,
      created_by: ObjectId,
      changes: "Initial estimate",
      total_amount: 2200000
    },
    {
      version: 2,
      created_at: ISODate,
      created_by: ObjectId,
      changes: "Added extra room as per client request",
      total_amount: 2450000
    }
  ],
  
  // PROJECT SPECIFICATIONS
  specifications: {
    project_type: "residential_individual",
    total_area_sqft: 2500,
    num_floors: 2,
    floor_details: [
      { 
        floor: "Ground", 
        area_sqft: 1200, 
        rooms: 4, 
        bathrooms: 2,
        special_items: ["pooja_room", "car_parking"]
      },
      { 
        floor: "First", 
        area_sqft: 1300, 
        rooms: 3, 
        bathrooms: 2,
        special_items: ["balcony", "terrace_access"]
      }
    ],
    construction_type: "rcc_framed",
    foundation_type: "isolated_footing",
    finishing_grade: "standard",           // economy/standard/premium/luxury
    
    // Additional client requirements
    special_requirements: [
      "Modular kitchen",
      "False ceiling in living room",
      "Wooden flooring in master bedroom"
    ]
  },
  
  // ESTIMATE LINE ITEMS (For detailed/final estimates)
  line_items: [
    {
      _id: ObjectId,
      category: "foundation",
      item_code: "FND-001",
      description: "Foundation work including excavation, PCC, footings",
      unit: "lumpsum",
      quantity: 1,
      rate: 245000,
      amount: 245000,
      notes: "Based on standard soil condition"
    },
    {
      _id: ObjectId,
      category: "structure",
      description: "RCC Structure - Columns, Beams, Slabs",
      unit: "sqft",
      quantity: 2500,
      rate: 850,
      amount: 2125000,
      notes: "M25 grade concrete, Fe500 steel"
    },
    // ... more line items
  ],
  
  // FLOOR-WISE BREAKDOWN (Optional detailed view)
  floor_wise_estimates: [
    {
      floor: "Ground",
      area_sqft: 1200,
      items: [
        { category: "structure", amount: 450000 },
        { category: "masonry", amount: 85000 },
        { category: "flooring", amount: 96000 },
        // ...
      ],
      floor_total: 850000
    },
    {
      floor: "First",
      area_sqft: 1300,
      items: [...],
      floor_total: 920000
    }
  ],
  
  // SUMMARY
  summary: {
    subtotal: 1770000,
    overhead_percentage: 10,
    overhead_amount: 177000,
    profit_percentage: 15,
    profit_amount: 292050,
    total_before_tax: 2239050,
    gst_percentage: 18,
    gst_amount: 403029,
    grand_total: 2642079,
    
    // Per unit calculations
    cost_per_sqft: 1057,
    
    // Payment terms
    payment_schedule: [
      { milestone: "Agreement", percentage: 10, amount: 264208 },
      { milestone: "Foundation Complete", percentage: 15, amount: 396312 },
      { milestone: "Slab Complete", percentage: 25, amount: 660520 },
      { milestone: "Brickwork Complete", percentage: 20, amount: 528416 },
      { milestone: "Finishing Start", percentage: 20, amount: 528416 },
      { milestone: "Handover", percentage: 10, amount: 264208 }
    ]
  },
  
  // CLIENT COMMUNICATION
  client_communication: {
    sent_date: ISODate,
    sent_via: "email|whatsapp|both",
    client_viewed: true,
    client_viewed_at: ISODate,
    client_response: "approved|changes_requested|rejected",
    client_comments: "Please reduce budget by removing false ceiling",
    negotiation_history: [
      {
        date: ISODate,
        original_amount: 2642079,
        requested_amount: 2400000,
        final_amount: 2500000,
        changes_made: "Removed false ceiling, reduced flooring grade"
      }
    ]
  },
  
  // CONVERSION TRACKING
  conversion: {
    converted_to_project: true,
    project_id: ObjectId,                  // Link to created project
    project_estimate_id: ObjectId,         // Link to project estimate
    converted_at: ISODate,
    converted_by: ObjectId,
    conversion_notes: "Client approved with minor modifications"
  },
  
  // AUDIT
  created_by: ObjectId,
  created_at: ISODate,
  updated_at: ISODate,
  approved_by: ObjectId,
  approved_at: ISODate
}
```

## 4.3 Project Estimate Schema (Enhanced with Lead Link)

```javascript
// Collection: project_estimates (enhanced)
{
  _id: ObjectId,
  project_id: ObjectId,
  estimate_number: "EST-P-2025-001",       // Project estimate number
  
  // LEAD ESTIMATE LINKAGE (Critical!)
  source: {
    type: "lead_conversion|direct_creation",
    lead_id: ObjectId,                     // Original lead
    lead_estimate_id: ObjectId,            // Original lead estimate
    lead_estimate_number: "EST-L-2025-001",
    lead_estimate_version: 3,              // Which version was converted
    conversion_date: ISODate,
    
    // What was inherited
    inherited_amount: 2500000,
    inherited_specifications: {...},
    
    // Changes made during/after conversion
    post_conversion_changes: [
      {
        date: ISODate,
        description: "Added compound wall as per client request",
        amount_change: +150000,
        changed_by: ObjectId
      }
    ]
  },
  
  version: 1,
  status: "draft|active|approved|locked",
  
  // SPECIFICATIONS (Inherited + Enhanced)
  specifications: {
    // ... same as lead estimate but with execution details
    project_type: "residential_individual",
    total_area_sqft: 2500,
    // ...
  },
  
  // DETAILED BOQ (Task-linked)
  boq: [
    {
      _id: ObjectId,
      category: "foundation",
      item_code: "FND-001",
      item_name: "PCC for Foundation",
      description: "1:4:8 mix plain cement concrete",
      unit: "cum",
      quantity: 12.5,
      rate: 5500,
      amount: 68750,
      
      // FROM LEAD ESTIMATE
      lead_estimate_line_id: ObjectId,     // Link to original line item
      variance_from_lead: {
        quantity_change: 0,
        rate_change: 0,
        amount_change: 0
      },
      
      // PROJECT EXECUTION DETAILS
      linked_tasks: ["task_id_1", "task_id_2"],
      materials_breakdown: [...],
      labor_breakdown: [...],
      
      // TRACKING
      ordered_quantity: 0,
      delivered_quantity: 0,
      consumed_quantity: 0,
      status: "pending|in_progress|completed"
    },
    // ... more BOQ items
  ],
  
  // SUMMARY WITH COMPARISON
  summary: {
    // Current values
    total_material_cost: 1250000,
    total_labor_cost: 350000,
    total_equipment_cost: 75000,
    overhead_percentage: 10,
    overhead_amount: 167500,
    profit_percentage: 15,
    profit_amount: 276375,
    total_estimate: 2118875,
    cost_per_sqft: 848,
    
    // Comparison with lead estimate
    lead_estimate_comparison: {
      lead_total: 2500000,
      current_total: 2118875,
      variance: -381125,
      variance_percentage: -15.24,
      notes: "Reduced due to material rate negotiation with vendors"
    },
    
    // Actual vs Estimated (Updated during execution)
    actual_vs_estimated: {
      estimated_total: 2118875,
      actual_spent: 0,
      remaining_budget: 2118875,
      variance: 0,
      variance_percentage: 0
    }
  },
  
  // AUDIT TRAIL
  created_by: ObjectId,
  created_at: ISODate,
  updated_at: ISODate,
  
  // VERSION HISTORY
  history: [...]
}
```

## 4.4 Lead-to-Project Conversion Process

```python
# services/estimate_conversion.py

class EstimateConversionService:
    """
    Handles conversion of Lead Estimate to Project Estimate
    """
    
    async def convert_lead_to_project(
        self,
        lead_id: str,
        lead_estimate_id: str,
        project_data: ProjectCreate,
        user_id: str
    ) -> ConversionResult:
        """
        Convert a lead estimate to project estimate when lead is won
        
        Process:
        1. Validate lead and estimate
        2. Create project
        3. Convert lead estimate to project estimate
        4. Generate detailed BOQ from estimate
        5. Auto-generate milestones and tasks
        6. Link tasks to BOQ items
        7. Calculate timeline
        8. Update lead status
        """
        
        # Step 1: Validate
        lead = await get_lead(lead_id)
        lead_estimate = await get_lead_estimate(lead_estimate_id)
        
        if lead_estimate.status not in ["approved", "sent"]:
            raise ValidationError("Only approved/sent estimates can be converted")
        
        if lead_estimate.conversion.converted_to_project:
            raise ValidationError("This estimate has already been converted")
        
        # Step 2: Create Project
        project = await create_project(
            name=project_data.name or f"Project - {lead.name}",
            client_name=lead.name,
            client_phone=lead.phone,
            client_email=lead.email,
            location=lead.location,
            project_type=lead_estimate.specifications.project_type,
            specifications=lead_estimate.specifications,
            budget=lead_estimate.summary.grand_total,
            source_lead_id=lead_id,
            created_by=user_id
        )
        
        # Step 3: Convert Lead Estimate to Project Estimate
        project_estimate = await self._create_project_estimate_from_lead(
            project=project,
            lead_estimate=lead_estimate,
            user_id=user_id
        )
        
        # Step 4: Generate Detailed BOQ
        detailed_boq = await self._generate_detailed_boq(
            project_estimate=project_estimate,
            specifications=lead_estimate.specifications
        )
        project_estimate.boq = detailed_boq
        
        # Step 5: Auto-generate Milestones
        milestones = await self._generate_milestones(
            project=project,
            specifications=lead_estimate.specifications
        )
        
        # Step 6: Auto-generate Tasks and Link to BOQ
        tasks = await self._generate_tasks_with_boq_links(
            project=project,
            milestones=milestones,
            project_estimate=project_estimate
        )
        
        # Step 7: Calculate Timeline
        timeline = await self._calculate_project_timeline(project, tasks)
        
        # Step 8: Update Lead Status
        lead.status = "won"
        lead.converted_project_id = project._id
        await save_lead(lead)
        
        # Step 9: Update Lead Estimate
        lead_estimate.conversion.converted_to_project = True
        lead_estimate.conversion.project_id = project._id
        lead_estimate.conversion.project_estimate_id = project_estimate._id
        lead_estimate.conversion.converted_at = datetime.utcnow()
        lead_estimate.conversion.converted_by = user_id
        lead_estimate.status = "converted"
        await save_lead_estimate(lead_estimate)
        
        # Save project estimate
        await save_project_estimate(project_estimate)
        
        return ConversionResult(
            success=True,
            project_id=str(project._id),
            project_estimate_id=str(project_estimate._id),
            milestones_created=len(milestones),
            tasks_created=len(tasks),
            boq_items=len(detailed_boq),
            timeline=timeline
        )
    
    async def _create_project_estimate_from_lead(
        self,
        project: Project,
        lead_estimate: LeadEstimate,
        user_id: str
    ) -> ProjectEstimate:
        """
        Create project estimate inheriting from lead estimate
        """
        return ProjectEstimate(
            project_id=project._id,
            estimate_number=generate_project_estimate_number(),
            
            # Source tracking
            source={
                "type": "lead_conversion",
                "lead_id": lead_estimate.lead_id,
                "lead_estimate_id": lead_estimate._id,
                "lead_estimate_number": lead_estimate.estimate_number,
                "lead_estimate_version": lead_estimate.version,
                "conversion_date": datetime.utcnow(),
                "inherited_amount": lead_estimate.summary.grand_total,
                "inherited_specifications": lead_estimate.specifications,
                "post_conversion_changes": []
            },
            
            version=1,
            status="active",
            specifications=lead_estimate.specifications,
            boq=[],  # Will be populated
            summary={
                **lead_estimate.summary,
                "lead_estimate_comparison": {
                    "lead_total": lead_estimate.summary.grand_total,
                    "current_total": lead_estimate.summary.grand_total,
                    "variance": 0,
                    "variance_percentage": 0
                },
                "actual_vs_estimated": {
                    "estimated_total": lead_estimate.summary.grand_total,
                    "actual_spent": 0,
                    "remaining_budget": lead_estimate.summary.grand_total,
                    "variance": 0,
                    "variance_percentage": 0
                }
            },
            created_by=user_id,
            created_at=datetime.utcnow()
        )
    
    async def _generate_detailed_boq(
        self,
        project_estimate: ProjectEstimate,
        specifications: dict
    ) -> List[BOQItem]:
        """
        Generate detailed BOQ from specifications
        Expands lead estimate line items into detailed task-level items
        """
        boq_items = []
        calculator = EstimateCalculator(specifications)
        
        # Get BOQ templates for project type
        templates = await get_boq_templates(specifications["project_type"])
        
        for template in templates:
            # Calculate quantity based on specifications
            quantity = calculator.calculate_quantity(
                formula=template["formula"],
                specifications=specifications
            )
            
            if quantity > 0:
                boq_item = BOQItem(
                    category=template["category"],
                    item_code=template["code"],
                    item_name=template["name"],
                    description=template.get("description", ""),
                    unit=template["unit"],
                    quantity=round(quantity, 2),
                    rate=await get_current_rate(template["rate_code"]),
                    calculation_formula=template["formula"],
                    materials_breakdown=calculator.calculate_materials(
                        template["materials"],
                        quantity
                    ),
                    labor_breakdown=calculator.calculate_labor(
                        template["labor"],
                        quantity
                    )
                )
                boq_item.amount = boq_item.quantity * boq_item.rate
                boq_items.append(boq_item)
        
        return boq_items
```

## 4.5 Estimate Comparison & Variance Tracking

```python
# services/estimate_variance.py

class EstimateVarianceService:
    """
    Track variances between lead estimate and project execution
    """
    
    async def calculate_variance(
        self,
        project_estimate_id: str
    ) -> VarianceReport:
        """
        Calculate variance between original lead estimate and current project state
        """
        project_estimate = await get_project_estimate(project_estimate_id)
        
        if not project_estimate.source.lead_estimate_id:
            raise ValidationError("No lead estimate linked to this project")
        
        lead_estimate = await get_lead_estimate(
            project_estimate.source.lead_estimate_id
        )
        
        report = VarianceReport(
            project_estimate_id=project_estimate_id,
            lead_estimate_id=str(lead_estimate._id),
            as_of_date=datetime.utcnow()
        )
        
        # Overall Variance
        report.overall = {
            "lead_estimate_total": lead_estimate.summary.grand_total,
            "current_estimate_total": project_estimate.summary.total_estimate,
            "actual_spent": await self._get_actual_spent(project_estimate.project_id),
            "variance_estimate_vs_lead": (
                project_estimate.summary.total_estimate - 
                lead_estimate.summary.grand_total
            ),
            "variance_actual_vs_estimate": 0  # Updated below
        }
        report.overall["variance_actual_vs_estimate"] = (
            report.overall["actual_spent"] - 
            project_estimate.summary.total_estimate
        )
        
        # Category-wise Variance
        report.by_category = []
        for category in ["foundation", "structure", "masonry", "mep", "finishing"]:
            lead_amount = sum(
                item.amount for item in lead_estimate.line_items 
                if item.category == category
            )
            current_amount = sum(
                item.amount for item in project_estimate.boq 
                if item.category == category
            )
            actual_amount = await self._get_actual_by_category(
                project_estimate.project_id, 
                category
            )
            
            report.by_category.append({
                "category": category,
                "lead_estimate": lead_amount,
                "current_estimate": current_amount,
                "actual_spent": actual_amount,
                "variance_pct": self._calc_variance_pct(lead_amount, actual_amount)
            })
        
        # Material Variance
        report.materials = await self._calculate_material_variance(
            project_estimate
        )
        
        # Labor Variance
        report.labor = await self._calculate_labor_variance(
            project_estimate
        )
        
        return report
    
    async def get_estimate_trail(
        self,
        project_id: str
    ) -> EstimateTrail:
        """
        Get complete trail from lead estimate to current state
        """
        project = await get_project(project_id)
        project_estimate = await get_project_estimate_by_project(project_id)
        
        trail = EstimateTrail(project_id=project_id)
        
        # Lead Estimate Versions
        if project_estimate.source.lead_estimate_id:
            lead_estimate = await get_lead_estimate(
                project_estimate.source.lead_estimate_id
            )
            
            trail.lead_estimates = [
                {
                    "version": v["version"],
                    "date": v["created_at"],
                    "amount": v["total_amount"],
                    "changes": v["changes"]
                }
                for v in lead_estimate.version_history
            ]
            trail.lead_final_amount = lead_estimate.summary.grand_total
            trail.conversion_date = project_estimate.source.conversion_date
        
        # Post-conversion Changes
        trail.post_conversion_changes = project_estimate.source.post_conversion_changes
        
        # Current State
        trail.current_estimate = project_estimate.summary.total_estimate
        trail.actual_spent = await self._get_actual_spent(project_id)
        trail.remaining = trail.current_estimate - trail.actual_spent
        
        return trail
```

## 4.6 API Endpoints for Lead-Project Integration

```yaml
# Lead Estimate to Project Conversion
POST /api/leads/{lead_id}/convert-to-project
Request:
  lead_estimate_id: "est_lead_123"
  project_name: "Villa Project - Whitefield"  # Optional, defaults to lead name
  start_date: "2025-04-01"
  notes: "Client confirmed, starting next month"
Response:
  success: true
  project:
    _id: "proj_456"
    name: "Villa Project - Whitefield"
    estimate_id: "est_proj_789"
  conversion_summary:
    lead_estimate_amount: 2500000
    project_estimate_amount: 2500000
    milestones_created: 10
    tasks_created: 45
    boq_items: 85
    estimated_duration_days: 180

# Get Estimate Lineage/Trail
GET /api/projects/{project_id}/estimate-trail
Response:
  project_id: "proj_456"
  lead_estimates:
    - version: 1
      date: "2025-01-15"
      amount: 2200000
      changes: "Initial estimate"
    - version: 2
      date: "2025-01-20"
      amount: 2400000
      changes: "Added modular kitchen"
    - version: 3
      date: "2025-02-01"
      amount: 2500000
      changes: "Final negotiated amount"
  lead_final_amount: 2500000
  conversion_date: "2025-02-15"
  post_conversion_changes:
    - date: "2025-03-01"
      description: "Added compound wall"
      amount_change: 150000
  current_estimate: 2650000
  actual_spent: 450000
  remaining: 2200000

# Get Variance Report
GET /api/projects/{project_id}/estimate-variance
Response:
  overall:
    lead_estimate_total: 2500000
    current_estimate_total: 2650000
    actual_spent: 450000
    variance_estimate_vs_lead: 150000
    variance_estimate_vs_lead_pct: 6.0
  by_category:
    - category: "foundation"
      lead_estimate: 250000
      current_estimate: 260000
      actual_spent: 245000
      variance_pct: -5.8
    - category: "structure"
      lead_estimate: 800000
      current_estimate: 850000
      actual_spent: 0
      variance_pct: 0
  recommendations:
    - "Foundation completed under budget by 5.8%"
    - "Structure estimate increased - review vendor rates"

# Update Project Estimate (with tracking)
PUT /api/projects/{project_id}/estimate
Request:
  change_description: "Added extra bathroom in first floor"
  changes:
    - boq_item_id: "boq_123"
      field: "quantity"
      old_value: 2
      new_value: 3
    - add_item:
        category: "plumbing"
        description: "Additional bathroom fittings"
        amount: 45000
Response:
  estimate_id: "est_proj_789"
  new_version: 2
  new_total: 2695000
  change_from_lead: +195000 (7.8%)
  change_logged: true
```

## 3.2 Component Interactions

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          DATA FLOW DIAGRAM                                    │
└──────────────────────────────────────────────────────────────────────────────┘

    PROJECT CREATION
           │
           ▼
    ┌──────────────┐
    │ Select Type  │ (Residential/Commercial/Industrial)
    │ Enter Specs  │ (Area, Floors, Rooms, etc.)
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐     ┌─────────────────┐
    │ Auto-Generate│────▶│ CENTRAL ESTIMATE │
    │ Milestones   │     │  • BOQ Items     │
    └──────┬───────┘     │  • Material List │
           │             │  • Labor Plan    │
           ▼             │  • Cost Summary  │
    ┌──────────────┐     └────────┬────────┘
    │ Auto-Generate│              │
    │ Tasks/Phase  │◀─────────────┘
    └──────┬───────┘     (Each task references estimate)
           │
           ▼
    ┌──────────────┐
    │ Calculate    │
    │ Per Task:    │
    │ • Materials  │
    │ • Labor      │
    │ • Duration   │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ Generate     │
    │ Timeline     │
    │ (Gantt)      │
    └──────────────┘
```

---

# 4. DATA MODELS

## 4.1 Master Estimate Schema

```javascript
// Collection: project_estimates
{
  _id: ObjectId,
  project_id: ObjectId,                    // Link to project
  estimate_number: "EST-2025-001",
  version: 1,                              // Version control
  status: "draft|active|approved|locked",
  
  // Project Specifications (Input)
  specifications: {
    project_type: "residential_individual", // From project_types collection
    total_area_sqft: 2500,
    num_floors: 2,
    floor_details: [
      { floor: "Ground", area_sqft: 1200, rooms: 4, bathrooms: 2 },
      { floor: "First", area_sqft: 1300, rooms: 3, bathrooms: 2 }
    ],
    construction_type: "rcc_framed",        // RCC Framed, Load Bearing, Steel
    foundation_type: "isolated_footing",    // Isolated, Raft, Pile
    soil_type: "medium",                    // Soft, Medium, Hard Rock
    quality_grade: "standard",              // Economy, Standard, Premium, Luxury
  },
  
  // Bill of Quantities (BOQ) - Auto Generated
  boq: [
    {
      _id: ObjectId,
      category: "foundation",
      item_code: "FND-001",
      item_name: "PCC for Foundation",
      description: "1:4:8 mix plain cement concrete",
      unit: "cum",
      quantity: 12.5,                       // Auto-calculated
      rate: 5500,
      amount: 68750,
      calculation_formula: "foundation_area * 0.1",
      calculation_inputs: {
        foundation_area: 125,               // sqm
        thickness: 0.1                      // meters
      },
      linked_tasks: ["task_id_1", "task_id_2"],
      materials_breakdown: [
        { material: "OPC Cement", quantity: 31.25, unit: "bags" },
        { material: "Sand", quantity: 18.75, unit: "cft" },
        { material: "Aggregate 40mm", quantity: 37.5, unit: "cft" }
      ],
      labor_breakdown: [
        { role: "mason", count: 2, days: 3 },
        { role: "helper", count: 4, days: 3 }
      ]
    },
    // ... more BOQ items
  ],
  
  // Summary Totals
  summary: {
    total_material_cost: 1250000,
    total_labor_cost: 350000,
    total_equipment_cost: 75000,
    overhead_percentage: 10,
    overhead_amount: 167500,
    profit_percentage: 15,
    profit_amount: 276375,
    total_estimate: 2118875,
    cost_per_sqft: 848
  },
  
  // Assumptions Used
  assumptions: {
    productivity_factors: {
      mason_sqft_per_day: 100,              // Brickwork
      helper_ratio: 2,                       // 2 helpers per mason
      concrete_cum_per_day: 10,             // RMC placement
      plaster_sqft_per_day: 150,
      tile_sqft_per_day: 80,
      paint_sqft_per_day: 200
    },
    wastage_factors: {
      cement: 0.05,                          // 5% wastage
      steel: 0.03,
      bricks: 0.05,
      sand: 0.10,
      tiles: 0.08
    },
    rate_escalation: 0,                      // Future price adjustment %
  },
  
  // Audit Trail
  created_by: ObjectId,
  created_at: ISODate,
  updated_at: ISODate,
  approved_by: ObjectId,
  approved_at: ISODate,
  
  // Version History
  history: [
    {
      version: 1,
      changed_by: ObjectId,
      changed_at: ISODate,
      changes: { field: "specifications.total_area_sqft", old: 2400, new: 2500 }
    }
  ]
}
```

## 4.2 Milestone Template Schema

```javascript
// Collection: milestone_templates
{
  _id: ObjectId,
  project_type: "residential_individual",
  milestone_code: "MS-FND",
  name: "Foundation Work",
  phase: 1,
  order: 1,
  description: "Complete foundation including excavation, PCC, and footings",
  
  // Standard Duration (can be overridden by calculation)
  base_duration_days: 21,
  
  // Tasks within this milestone
  tasks: [
    {
      task_code: "FND-T01",
      name: "Site Clearing & Leveling",
      order: 1,
      description: "Clear site, remove debris, level ground",
      dependencies: [],                      // No dependencies (first task)
      
      // Calculation Rules
      calculation_rules: {
        // Material Calculation
        materials: [],                       // No materials for clearing
        
        // Labor Calculation
        labor: {
          formula: "area / productivity",
          inputs: ["plot_area_sqm"],
          roles: [
            { role: "helper", formula: "ceil(area / 200)", min: 2 }
          ]
        },
        
        // Duration Calculation
        duration: {
          formula: "area / (labor_count * productivity)",
          productivity_sqm_per_man_day: 100,
          min_days: 1,
          max_days: 5
        }
      }
    },
    {
      task_code: "FND-T02",
      name: "Excavation for Foundation",
      order: 2,
      dependencies: ["FND-T01"],             // Depends on site clearing
      
      calculation_rules: {
        materials: [],                       // Earthwork, no materials
        
        labor: {
          roles: [
            { role: "helper", formula: "ceil(excavation_volume / 3)", min: 4 },
            { role: "supervisor", count: 1 }
          ]
        },
        
        duration: {
          formula: "excavation_volume / (helper_count * 3)",
          // Each helper can excavate 3 cum/day
          productivity_cum_per_man_day: 3,
          min_days: 2
        },
        
        // Work Quantification
        work_quantity: {
          metric: "excavation_volume_cum",
          formula: "foundation_area * depth",
          inputs: {
            foundation_area: "from_specs",
            depth: 1.2                       // meters default
          }
        }
      }
    },
    {
      task_code: "FND-T03",
      name: "PCC (Plain Cement Concrete)",
      order: 3,
      dependencies: ["FND-T02"],
      
      calculation_rules: {
        materials: [
          {
            material_code: "MAT-CEM-OPC53",
            name: "OPC Cement 53 Grade",
            unit: "bags",
            formula: "pcc_volume * 6.25",     // 6.25 bags per cum for 1:4:8
            wastage_factor: 0.05
          },
          {
            material_code: "MAT-SND-RVR",
            name: "River Sand",
            unit: "cft",
            formula: "pcc_volume * 1.5 * 35.315", // Convert cum to cft
            wastage_factor: 0.10
          },
          {
            material_code: "MAT-AGG-40",
            name: "Aggregate 40mm",
            unit: "cft",
            formula: "pcc_volume * 3 * 35.315",
            wastage_factor: 0.05
          }
        ],
        
        labor: {
          roles: [
            { role: "mason", formula: "ceil(pcc_volume / 5)", min: 2 },
            { role: "helper", formula: "mason_count * 2", min: 4 }
          ]
        },
        
        duration: {
          formula: "pcc_volume / 10",         // 10 cum per day with team
          min_days: 1,
          curing_days: 7                      // Additional curing time
        },
        
        work_quantity: {
          metric: "pcc_volume_cum",
          formula: "foundation_area * 0.1",   // 100mm thick PCC
          inputs: {
            foundation_area: "from_specs"
          }
        }
      }
    },
    // ... more tasks
  ],
  
  // Milestone-level calculations
  milestone_calculations: {
    total_duration: "sum(task_durations) + buffer",
    buffer_percentage: 10,
    critical_path_tasks: ["FND-T02", "FND-T03", "FND-T05"]
  },
  
  is_active: true,
  created_at: ISODate
}
```

## 4.3 Project Task Schema (Enhanced)

```javascript
// Collection: tasks
{
  _id: ObjectId,
  project_id: ObjectId,
  milestone_id: ObjectId,
  estimate_id: ObjectId,                     // Link to central estimate
  
  // Task Identity
  task_code: "PRJ001-FND-T03",
  name: "PCC (Plain Cement Concrete)",
  description: "1:4:8 mix plain cement concrete for foundation base",
  
  // Status & Progress
  status: "pending|in_progress|completed|blocked|delayed",
  progress_percentage: 0,
  
  // Timeline (Auto-calculated, can be manually adjusted)
  timeline: {
    planned_start: ISODate,
    planned_end: ISODate,
    planned_duration_days: 8,                // 1 day work + 7 curing
    
    actual_start: ISODate,
    actual_end: ISODate,
    actual_duration_days: null,
    
    // Recalculation tracking
    original_planned_start: ISODate,
    original_planned_end: ISODate,
    delay_days: 0,
    delay_reasons: []
  },
  
  // Dependencies
  dependencies: {
    predecessor_tasks: ["task_id_FND_T02"],
    successor_tasks: ["task_id_FND_T04"],
    dependency_type: "finish_to_start",      // FS, SS, FF, SF
    lag_days: 0
  },
  
  // Work Quantification (from estimate)
  work_quantity: {
    metric: "PCC Volume",
    unit: "cum",
    planned_quantity: 12.5,
    completed_quantity: 0,
    remaining_quantity: 12.5,
    calculation_source: "estimate_boq_item_id"
  },
  
  // Material Requirements (from estimate, linked to BOQ)
  materials: {
    boq_reference: "boq_item_id",            // Link to estimate BOQ
    required: [
      {
        material_id: ObjectId,
        material_code: "MAT-CEM-OPC53",
        name: "OPC Cement 53 Grade",
        unit: "bags",
        required_quantity: 82,                // Including wastage
        delivered_quantity: 0,
        consumed_quantity: 0,
        pending_quantity: 82,
        
        // Delivery Schedule
        delivery_schedule: {
          planned_delivery_date: ISODate,
          actual_delivery_date: null,
          delivery_status: "pending|partial|delivered|delayed"
        }
      },
      // ... more materials
    ],
    
    // Material Readiness Status
    readiness_status: "ready|partial|not_ready",
    readiness_percentage: 0,
    blocking_materials: ["MAT-CEM-OPC53"]     // Materials delaying task
  },
  
  // Labor Requirements (from estimate)
  labor: {
    planned: [
      {
        role: "mason",
        skill_code: "SKL-MSN",
        required_count: 3,
        daily_rate: 800,
        planned_days: 1,
        total_cost: 2400
      },
      {
        role: "helper",
        skill_code: "SKL-HLP",
        required_count: 6,
        daily_rate: 500,
        planned_days: 1,
        total_cost: 3000
      }
    ],
    
    actual: [
      {
        date: ISODate,
        workers: [
          { worker_id: ObjectId, role: "mason", hours: 8 },
          // ...
        ],
        total_masons: 2,                      // Less than planned!
        total_helpers: 5
      }
    ],
    
    // Labor Availability Status
    availability_status: "sufficient|partial|insufficient",
    shortfall: {
      mason: 1,                               // 1 mason short
      helper: 1
    }
  },
  
  // Cost Tracking
  cost: {
    estimated_material_cost: 25000,
    estimated_labor_cost: 5400,
    estimated_total: 30400,
    
    actual_material_cost: 0,
    actual_labor_cost: 0,
    actual_total: 0,
    
    variance: 0,
    variance_percentage: 0
  },
  
  // Recalculation Metadata
  recalculation: {
    last_recalculated: ISODate,
    recalculation_trigger: "material_delay|labor_shortage|manual",
    previous_timeline: {
      planned_start: ISODate,
      planned_end: ISODate
    },
    impact_notes: "Delayed by 2 days due to cement delivery delay"
  },
  
  // Audit
  created_at: ISODate,
  updated_at: ISODate,
  created_by: ObjectId
}
```

## 4.4 Material Delivery Tracking Schema

```javascript
// Collection: material_deliveries
{
  _id: ObjectId,
  project_id: ObjectId,
  
  // Delivery Details
  delivery_number: "DEL-2025-001",
  vendor_id: ObjectId,
  po_request_id: ObjectId,
  
  // Materials in this delivery
  items: [
    {
      material_code: "MAT-CEM-OPC53",
      name: "OPC Cement 53 Grade",
      ordered_quantity: 100,
      delivered_quantity: 100,
      unit: "bags",
      unit_price: 380,
      total_amount: 38000
    }
  ],
  
  // Schedule
  schedule: {
    planned_date: ISODate,
    actual_date: ISODate,
    variance_days: 0,                        // Negative = early, Positive = late
    status: "scheduled|in_transit|delivered|delayed|cancelled"
  },
  
  // Impact Analysis (auto-calculated)
  impact: {
    affected_tasks: ["task_id_1", "task_id_2"],
    affected_milestones: ["milestone_id_1"],
    delay_caused_days: 0,
    critical_path_impact: false
  },
  
  created_at: ISODate,
  updated_at: ISODate
}
```

## 4.5 Labor Availability Schema

```javascript
// Collection: labor_availability
{
  _id: ObjectId,
  project_id: ObjectId,
  date: ISODate,
  
  // Daily Availability
  available: [
    {
      role: "mason",
      skill_code: "SKL-MSN",
      planned_count: 5,
      actual_available: 3,
      variance: -2,
      reason: "2 masons on leave"
    },
    {
      role: "helper",
      skill_code: "SKL-HLP",
      planned_count: 10,
      actual_available: 8,
      variance: -2,
      reason: "Transferred to other site"
    }
  ],
  
  // Impact Analysis
  impact: {
    affected_tasks: ["task_id_1"],
    productivity_reduction_percentage: 40,   // 40% less productive
    duration_extension_days: 1,
    needs_recalculation: true
  },
  
  recorded_at: ISODate
}
```

---

# 5. FUNCTIONAL REQUIREMENTS

## 5.1 Project Creation with Auto-Generation

### FR-001: Auto-Generate Estimate on Project Creation

**Trigger:** New project created with specifications

**Process:**
1. User selects project type (e.g., Residential - Individual House)
2. User enters specifications:
   - Total built-up area (sq.ft.)
   - Number of floors
   - Floor-wise breakdown (area, rooms, bathrooms)
   - Construction type (RCC Framed, Load Bearing)
   - Foundation type
   - Quality grade
3. System auto-generates:
   - Central Estimate with BOQ
   - All Milestones from templates
   - All Tasks per milestone
   - Material requirements per task
   - Labor requirements per task
   - Timeline with dependencies

**Acceptance Criteria:**
- [ ] Estimate generated within 5 seconds
- [ ] All standard milestones created
- [ ] All tasks have material/labor calculations
- [ ] Timeline respects dependencies
- [ ] User can review and modify before finalizing

### FR-002: Centralized Estimate Linking

**Requirement:** Single estimate linked to all project entities

**Behavior:**
- One estimate document per project
- Every task references same estimate
- BOQ items linked to specific tasks
- Changes to estimate reflect in all tasks
- Versioning maintains history

### FR-003: Standardized Task Generation

**Requirement:** Auto-create tasks based on project type

**Task Templates by Phase:**

| Phase | Tasks (Examples) |
|-------|------------------|
| Foundation | Site Clearing, Excavation, PCC, Footing Reinforcement, Footing Concrete |
| Plinth | Plinth Beam, Plinth Filling, DPC |
| Superstructure | Column Casting, Beam Work, Slab Casting |
| Brickwork | External Walls, Internal Walls, Lintels |
| MEP Rough-in | Electrical Conduit, Plumbing Lines, Drainage |
| Plastering | Internal Plaster, External Plaster, Ceiling |
| Flooring | Floor Tiles, Wall Tiles, Waterproofing |
| Doors & Windows | Frame Fixing, Shutter Installation, Hardware |
| Painting | Putty, Primer, Paint Coats |
| Finishing | Fixtures, Cleaning, Touch-up |

---

## 5.2 Material Calculation Requirements

### FR-004: Auto-Calculate Material Quantities

**For each task, calculate:**

```
Material Quantity = (Work Quantity × Material Rate) × (1 + Wastage Factor)
```

**Example: Brickwork Task**

| Input | Value |
|-------|-------|
| Wall Area | 1000 sq.ft. (93 sq.m.) |
| Brick Size | 9" × 4" × 3" |
| Mortar Thickness | 10mm |

| Material | Formula | Quantity |
|----------|---------|----------|
| Bricks | Area × 13.5 bricks/sq.ft × 1.05 | 14,175 nos |
| Cement | Area × 0.02 bags/sq.ft × 1.05 | 21 bags |
| Sand | Area × 0.05 cft/sq.ft × 1.10 | 55 cft |

### FR-005: Material Dependency Tracking

**Track for each material:**
- Required quantity (from calculation)
- Ordered quantity (from PO)
- Delivered quantity (from delivery records)
- Consumed quantity (from daily logs)
- Available quantity (delivered - consumed)
- Pending quantity (required - available)

**Alert Conditions:**
- Pending > 0 and task start date approaching
- Delivery delayed beyond task start date
- Consumption rate exceeding estimate

---

## 5.3 Labor Calculation Requirements

### FR-006: Auto-Calculate Labor Requirements

**Formula:**
```
Labor Days = Work Quantity / (Productivity × Labor Count)
Labor Count = ceil(Work Quantity / (Productivity × Target Days))
```

**Productivity Standards (Configurable):**

| Work Type | Unit | Mason Output/Day | Helper Ratio |
|-----------|------|------------------|--------------|
| Brickwork | sq.ft | 100 | 1:2 |
| Plastering | sq.ft | 150 | 1:1 |
| Concrete | cum | 10 | 1:3 |
| Tiling | sq.ft | 80 | 1:1 |
| Painting | sq.ft | 200 | 1:1 |
| Reinforcement | kg | 200 | 1:2 |

**Example: Brickwork (1000 sq.ft)**

```
Target Days = 5
Mason Output = 100 sq.ft/day
Required Masons = ceil(1000 / (100 × 5)) = 2 masons
Required Helpers = 2 × 2 = 4 helpers
Total Labor Cost = (2 × 800 × 5) + (4 × 500 × 5) = ₹18,000
```

### FR-007: Labor Role Breakdown

**Standard Roles per Task Type:**

| Task Type | Roles Required |
|-----------|----------------|
| Excavation | Helpers, JCB Operator |
| Concreting | Mason, Helper, Vibrator Operator |
| Brickwork | Mason, Helper |
| Reinforcement | Bar Bender, Helper |
| Plumbing | Plumber, Helper |
| Electrical | Electrician, Helper |
| Tiling | Tile Fitter, Helper |
| Painting | Painter, Helper |

---

## 5.4 Duration & Timeline Calculation

### FR-008: Auto-Calculate Task Duration

**Formula:**
```
Base Duration = Work Quantity / (Labor Count × Productivity)
Adjusted Duration = Base Duration × Weather Factor × Complexity Factor
Final Duration = Adjusted Duration + Curing/Waiting Time
```

**Factors:**

| Factor | Values |
|--------|--------|
| Weather (Monsoon) | 1.3 (30% slower) |
| Weather (Summer) | 1.1 (10% slower) |
| Weather (Normal) | 1.0 |
| Complexity (High) | 1.2 |
| Complexity (Normal) | 1.0 |

### FR-009: Dependency-Based Scheduling

**Dependency Types:**
- **FS (Finish-to-Start):** Task B starts after Task A finishes
- **SS (Start-to-Start):** Task B starts when Task A starts
- **FF (Finish-to-Finish):** Task B finishes when Task A finishes
- **SF (Start-to-Finish):** Task B finishes when Task A starts

**Algorithm:**
```
For each task in topological order:
  If task has predecessors:
    earliest_start = max(predecessor.end_date + lag) for all predecessors
  Else:
    earliest_start = project_start_date
  
  task.planned_start = earliest_start
  task.planned_end = earliest_start + task.duration
```

---

# 6. CALCULATION ENGINE

## 6.1 Core Calculation Service

```python
# services/estimate_calculator.py

class EstimateCalculator:
    """
    Central calculation engine for estimates, materials, labor, and timelines
    """
    
    def __init__(self, project_id: str):
        self.project = get_project(project_id)
        self.estimate = get_estimate(project_id)
        self.productivity_standards = get_productivity_standards()
        self.material_rates = get_material_rates()
        
    # ==================== MATERIAL CALCULATIONS ====================
    
    def calculate_task_materials(self, task: Task) -> List[MaterialRequirement]:
        """
        Calculate material requirements for a task based on work quantity
        """
        materials = []
        work_qty = task.work_quantity.planned_quantity
        
        for material_rule in task.calculation_rules.materials:
            # Parse formula and substitute values
            quantity = self.evaluate_formula(
                formula=material_rule.formula,
                inputs={
                    'work_quantity': work_qty,
                    'area': self.project.specifications.total_area_sqft,
                    # ... other inputs
                }
            )
            
            # Apply wastage factor
            quantity_with_wastage = quantity * (1 + material_rule.wastage_factor)
            
            materials.append(MaterialRequirement(
                material_code=material_rule.material_code,
                name=material_rule.name,
                unit=material_rule.unit,
                required_quantity=math.ceil(quantity_with_wastage),
                rate=self.material_rates.get(material_rule.material_code),
                amount=math.ceil(quantity_with_wastage) * rate
            ))
        
        return materials
    
    # ==================== LABOR CALCULATIONS ====================
    
    def calculate_task_labor(self, task: Task, target_days: int = None) -> List[LaborRequirement]:
        """
        Calculate labor requirements for a task
        """
        labor = []
        work_qty = task.work_quantity.planned_quantity
        
        for role_rule in task.calculation_rules.labor.roles:
            if role_rule.formula:
                # Dynamic calculation
                count = self.evaluate_formula(
                    formula=role_rule.formula,
                    inputs={
                        'work_quantity': work_qty,
                        'area': work_qty,
                        'productivity': self.productivity_standards.get(role_rule.role),
                        'target_days': target_days or 5,
                        'mason_count': self._get_mason_count(labor)  # For helper ratio
                    }
                )
            else:
                count = role_rule.count
            
            count = max(count, role_rule.get('min', 1))  # Apply minimum
            
            labor.append(LaborRequirement(
                role=role_rule.role,
                skill_code=role_rule.skill_code,
                required_count=math.ceil(count),
                daily_rate=self.labor_rates.get(role_rule.role),
                planned_days=target_days
            ))
        
        return labor
    
    # ==================== DURATION CALCULATIONS ====================
    
    def calculate_task_duration(self, task: Task) -> TaskDuration:
        """
        Calculate task duration based on work quantity and labor
        """
        work_qty = task.work_quantity.planned_quantity
        labor = task.labor.planned
        
        # Get primary worker productivity (usually mason)
        primary_role = self._get_primary_role(task.task_type)
        primary_count = next((l.required_count for l in labor if l.role == primary_role), 1)
        productivity = self.productivity_standards.get(primary_role, {}).get(task.task_type, 100)
        
        # Base duration
        base_duration = work_qty / (primary_count * productivity)
        
        # Apply factors
        weather_factor = self._get_weather_factor(task.planned_start)
        complexity_factor = task.complexity_factor or 1.0
        
        adjusted_duration = base_duration * weather_factor * complexity_factor
        
        # Add curing/waiting time if applicable
        additional_time = task.calculation_rules.duration.get('curing_days', 0)
        
        final_duration = math.ceil(adjusted_duration) + additional_time
        
        return TaskDuration(
            base_duration_days=math.ceil(base_duration),
            adjusted_duration_days=math.ceil(adjusted_duration),
            additional_days=additional_time,
            total_duration_days=final_duration,
            factors_applied={
                'weather': weather_factor,
                'complexity': complexity_factor
            }
        )
    
    # ==================== TIMELINE CALCULATIONS ====================
    
    def calculate_project_timeline(self) -> ProjectTimeline:
        """
        Calculate complete project timeline respecting dependencies
        """
        tasks = get_project_tasks(self.project._id)
        
        # Build dependency graph
        graph = self._build_dependency_graph(tasks)
        
        # Topological sort
        sorted_tasks = self._topological_sort(graph)
        
        # Forward pass - calculate early start/finish
        for task in sorted_tasks:
            predecessors = graph.get_predecessors(task._id)
            
            if not predecessors:
                task.timeline.planned_start = self.project.start_date
            else:
                max_predecessor_end = max(
                    self._get_task_end(p) + timedelta(days=p.dependency_lag or 0)
                    for p in predecessors
                )
                task.timeline.planned_start = max_predecessor_end
            
            task.timeline.planned_end = (
                task.timeline.planned_start + 
                timedelta(days=task.timeline.planned_duration_days)
            )
        
        # Backward pass - calculate late start/finish (for critical path)
        project_end = max(t.timeline.planned_end for t in tasks)
        
        for task in reversed(sorted_tasks):
            successors = graph.get_successors(task._id)
            
            if not successors:
                task.timeline.late_finish = project_end
            else:
                min_successor_start = min(
                    s.timeline.late_start - timedelta(days=s.dependency_lag or 0)
                    for s in successors
                )
                task.timeline.late_finish = min_successor_start
            
            task.timeline.late_start = (
                task.timeline.late_finish - 
                timedelta(days=task.timeline.planned_duration_days)
            )
            
            # Calculate slack
            task.timeline.total_slack = (
                task.timeline.late_start - task.timeline.planned_start
            ).days
            
            task.is_critical = (task.timeline.total_slack == 0)
        
        return ProjectTimeline(
            project_start=self.project.start_date,
            project_end=project_end,
            total_duration_days=(project_end - self.project.start_date).days,
            critical_path_tasks=[t._id for t in tasks if t.is_critical],
            milestones=self._aggregate_milestone_timelines(tasks)
        )
```

## 6.2 Formula Evaluator

```python
# services/formula_evaluator.py

import ast
import operator
import math

class FormulaEvaluator:
    """
    Safe formula evaluation for estimate calculations
    """
    
    ALLOWED_OPERATORS = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.Pow: operator.pow,
        ast.USub: operator.neg,
    }
    
    ALLOWED_FUNCTIONS = {
        'ceil': math.ceil,
        'floor': math.floor,
        'round': round,
        'max': max,
        'min': min,
        'sqrt': math.sqrt,
    }
    
    def evaluate(self, formula: str, inputs: dict) -> float:
        """
        Safely evaluate a formula with given inputs
        
        Example:
            formula = "ceil(area * 13.5 * 1.05)"
            inputs = {"area": 1000}
            result = 14175
        """
        # Replace variable names with values
        expression = formula
        for var, value in inputs.items():
            expression = expression.replace(var, str(value))
        
        # Parse and evaluate
        tree = ast.parse(expression, mode='eval')
        return self._eval_node(tree.body)
    
    def _eval_node(self, node):
        if isinstance(node, ast.Num):
            return node.n
        elif isinstance(node, ast.BinOp):
            left = self._eval_node(node.left)
            right = self._eval_node(node.right)
            op = self.ALLOWED_OPERATORS.get(type(node.op))
            if op is None:
                raise ValueError(f"Unsupported operator: {type(node.op)}")
            return op(left, right)
        elif isinstance(node, ast.UnaryOp):
            operand = self._eval_node(node.operand)
            op = self.ALLOWED_OPERATORS.get(type(node.op))
            return op(operand)
        elif isinstance(node, ast.Call):
            func_name = node.func.id
            if func_name not in self.ALLOWED_FUNCTIONS:
                raise ValueError(f"Unsupported function: {func_name}")
            args = [self._eval_node(arg) for arg in node.args]
            return self.ALLOWED_FUNCTIONS[func_name](*args)
        else:
            raise ValueError(f"Unsupported node type: {type(node)}")
```

---

# 7. AUTO-GENERATION LOGIC

## 7.1 Project Creation Flow

```python
# services/project_generator.py

class ProjectGenerator:
    """
    Auto-generates complete project structure from specifications
    """
    
    async def create_project_with_estimate(
        self,
        project_data: ProjectCreate,
        specifications: ProjectSpecifications
    ) -> Project:
        """
        Main entry point for project creation with auto-generation
        """
        # Step 1: Create base project
        project = await self._create_project(project_data)
        
        # Step 2: Generate central estimate
        estimate = await self._generate_estimate(project, specifications)
        
        # Step 3: Generate milestones from templates
        milestones = await self._generate_milestones(project, specifications)
        
        # Step 4: Generate tasks for each milestone
        tasks = await self._generate_tasks(project, milestones, estimate)
        
        # Step 5: Calculate materials and labor for each task
        await self._calculate_task_resources(tasks, estimate)
        
        # Step 6: Calculate timeline with dependencies
        timeline = await self._calculate_timeline(project, tasks)
        
        # Step 7: Update project with timeline
        await self._update_project_timeline(project, timeline)
        
        return project
    
    async def _generate_estimate(
        self,
        project: Project,
        specs: ProjectSpecifications
    ) -> Estimate:
        """
        Generate BOQ and estimate from specifications
        """
        estimate = Estimate(
            project_id=project._id,
            estimate_number=generate_estimate_number(),
            specifications=specs,
            boq=[],
            summary={}
        )
        
        # Get material calculation rules for project type
        rules = await get_calculation_rules(specs.project_type)
        
        # Calculate each BOQ category
        boq_items = []
        
        # Foundation BOQ
        boq_items.extend(await self._calculate_foundation_boq(specs, rules))
        
        # Structure BOQ
        boq_items.extend(await self._calculate_structure_boq(specs, rules))
        
        # Masonry BOQ
        boq_items.extend(await self._calculate_masonry_boq(specs, rules))
        
        # ... other categories
        
        estimate.boq = boq_items
        estimate.summary = self._calculate_summary(boq_items)
        
        await save_estimate(estimate)
        return estimate
    
    async def _calculate_foundation_boq(
        self,
        specs: ProjectSpecifications,
        rules: CalculationRules
    ) -> List[BOQItem]:
        """
        Calculate foundation-related BOQ items
        """
        items = []
        
        # Calculate foundation area
        foundation_area = specs.total_area_sqft * 0.7 / 10.764  # Convert to sqm, 70% coverage
        
        # PCC
        pcc_volume = foundation_area * 0.1  # 100mm thick
        pcc_item = BOQItem(
            category="foundation",
            item_code="FND-001",
            item_name="PCC for Foundation (1:4:8)",
            unit="cum",
            quantity=round(pcc_volume, 2),
            rate=rules.rates.get("pcc_1_4_8", 5500),
            calculation_formula="foundation_area * 0.1",
            calculation_inputs={"foundation_area": foundation_area}
        )
        pcc_item.amount = pcc_item.quantity * pcc_item.rate
        pcc_item.materials_breakdown = self._calculate_pcc_materials(pcc_volume)
        pcc_item.labor_breakdown = self._calculate_concrete_labor(pcc_volume)
        items.append(pcc_item)
        
        # Footing concrete
        footing_volume = self._calculate_footing_volume(specs)
        footing_item = BOQItem(
            category="foundation",
            item_code="FND-002",
            item_name="RCC for Footings (M25)",
            unit="cum",
            quantity=round(footing_volume, 2),
            rate=rules.rates.get("rcc_m25", 7500),
            # ... similar structure
        )
        items.append(footing_item)
        
        # ... more foundation items
        
        return items
    
    async def _generate_milestones(
        self,
        project: Project,
        specs: ProjectSpecifications
    ) -> List[Milestone]:
        """
        Generate milestones from templates based on project type
        """
        templates = await get_milestone_templates(specs.project_type)
        milestones = []
        
        for template in templates:
            milestone = Milestone(
                project_id=project._id,
                milestone_code=f"{project.code}-{template.milestone_code}",
                name=template.name,
                phase=template.phase,
                order=template.order,
                description=template.description,
                status="pending",
                progress=0,
                # Timeline calculated later
            )
            await save_milestone(milestone)
            milestones.append(milestone)
        
        return milestones
    
    async def _generate_tasks(
        self,
        project: Project,
        milestones: List[Milestone],
        estimate: Estimate
    ) -> List[Task]:
        """
        Generate tasks for each milestone from templates
        """
        all_tasks = []
        task_id_map = {}  # For resolving dependencies
        
        for milestone in milestones:
            template = await get_milestone_template(milestone.milestone_code)
            
            for task_template in template.tasks:
                task = Task(
                    project_id=project._id,
                    milestone_id=milestone._id,
                    estimate_id=estimate._id,
                    task_code=f"{project.code}-{task_template.task_code}",
                    name=task_template.name,
                    description=task_template.description,
                    status="pending",
                    calculation_rules=task_template.calculation_rules,
                )
                
                # Store for dependency resolution
                task_id_map[task_template.task_code] = task
                
                # Resolve dependencies
                task.dependencies.predecessor_tasks = [
                    task_id_map[dep]._id 
                    for dep in task_template.dependencies 
                    if dep in task_id_map
                ]
                
                await save_task(task)
                all_tasks.append(task)
        
        # Update successor references
        await self._update_successor_references(all_tasks)
        
        return all_tasks
```

## 7.2 BOQ Item Templates

```python
# data/boq_templates.py

BOQ_TEMPLATES = {
    "residential_individual": {
        "foundation": [
            {
                "code": "FND-001",
                "name": "Excavation for Foundation",
                "unit": "cum",
                "formula": "foundation_area * depth",
                "default_inputs": {"depth": 1.2},
                "rate_code": "excavation_soft",
                "materials": [],
                "labor": [
                    {"role": "helper", "formula": "ceil(quantity / 3)"}
                ]
            },
            {
                "code": "FND-002",
                "name": "PCC (1:4:8) for Foundation",
                "unit": "cum",
                "formula": "foundation_area * 0.1",
                "rate_code": "pcc_1_4_8",
                "materials": [
                    {"code": "CEM-OPC53", "formula": "quantity * 6.25", "wastage": 0.05},
                    {"code": "SND-RIVER", "formula": "quantity * 1.5 * 35.315", "wastage": 0.10},
                    {"code": "AGG-40MM", "formula": "quantity * 3 * 35.315", "wastage": 0.05}
                ],
                "labor": [
                    {"role": "mason", "formula": "ceil(quantity / 5)", "min": 2},
                    {"role": "helper", "formula": "mason_count * 2"}
                ]
            },
            {
                "code": "FND-003",
                "name": "RCC (M25) for Footings",
                "unit": "cum",
                "formula": "num_footings * footing_volume",
                "default_inputs": {"footing_volume": 0.5},
                "rate_code": "rcc_m25",
                "materials": [
                    {"code": "CEM-OPC53", "formula": "quantity * 8.5", "wastage": 0.05},
                    {"code": "SND-MSAND", "formula": "quantity * 1.5 * 35.315", "wastage": 0.10},
                    {"code": "AGG-20MM", "formula": "quantity * 3 * 35.315", "wastage": 0.05},
                    {"code": "STL-TMT12", "formula": "quantity * 100", "wastage": 0.03}
                ],
                "labor": [
                    {"role": "mason", "formula": "ceil(quantity / 3)", "min": 2},
                    {"role": "bar_bender", "formula": "ceil(quantity / 5)", "min": 1},
                    {"role": "helper", "formula": "(mason_count + bar_bender_count) * 2"}
                ]
            }
        ],
        "structure": [
            # ... column, beam, slab templates
        ],
        "masonry": [
            {
                "code": "MSN-001",
                "name": "Brick Masonry in CM 1:6",
                "unit": "sqft",
                "formula": "wall_area",
                "rate_code": "brickwork_9inch",
                "materials": [
                    {"code": "BRK-RED", "formula": "quantity * 13.5", "wastage": 0.05},
                    {"code": "CEM-OPC53", "formula": "quantity * 0.02", "wastage": 0.05},
                    {"code": "SND-RIVER", "formula": "quantity * 0.05", "wastage": 0.10}
                ],
                "labor": [
                    {"role": "mason", "formula": "ceil(quantity / 100 / target_days)", "min": 1},
                    {"role": "helper", "formula": "mason_count * 2"}
                ]
            }
        ],
        # ... more categories
    }
}
```

---

# 8. REAL-TIME RECALCULATION SYSTEM

## 8.1 Recalculation Triggers

```python
# services/recalculation_engine.py

class RecalculationEngine:
    """
    Handles real-time recalculation of timelines based on actual conditions
    """
    
    # ==================== TRIGGER DEFINITIONS ====================
    
    TRIGGERS = {
        "MATERIAL_DELIVERY_DELAYED": {
            "description": "Material delivery date exceeds planned date",
            "severity": "high",
            "auto_recalculate": True
        },
        "MATERIAL_DELIVERY_PARTIAL": {
            "description": "Delivered quantity less than required",
            "severity": "medium",
            "auto_recalculate": True
        },
        "LABOR_SHORTAGE": {
            "description": "Available labor less than planned",
            "severity": "high",
            "auto_recalculate": True
        },
        "LABOR_EXCESS": {
            "description": "Available labor more than planned",
            "severity": "low",
            "auto_recalculate": False  # Optional optimization
        },
        "TASK_DELAYED": {
            "description": "Task actual start exceeds planned start",
            "severity": "high",
            "auto_recalculate": True
        },
        "PRODUCTIVITY_VARIANCE": {
            "description": "Actual productivity differs from estimate by >20%",
            "severity": "medium",
            "auto_recalculate": True
        },
        "WEATHER_IMPACT": {
            "description": "Weather conditions affecting work",
            "severity": "medium",
            "auto_recalculate": True
        }
    }
    
    # ==================== MATERIAL DELAY HANDLING ====================
    
    async def handle_material_delivery_change(
        self,
        delivery_id: str,
        new_delivery_date: datetime,
        delivered_quantity: float
    ) -> RecalculationResult:
        """
        Handle material delivery delay or quantity change
        
        LOGIC:
        1. Identify all tasks dependent on this material
        2. For each task:
           a. If delivery date > task start date: Task is blocked
           b. Calculate new earliest start date
           c. Cascade delay to all dependent tasks
        3. Recalculate milestone dates
        4. Update project end date
        5. Generate notifications
        """
        delivery = await get_delivery(delivery_id)
        affected_tasks = await self._get_tasks_needing_material(
            delivery.project_id,
            delivery.material_code
        )
        
        result = RecalculationResult(
            trigger="MATERIAL_DELIVERY_DELAYED",
            original_values={},
            new_values={},
            affected_tasks=[],
            affected_milestones=[],
            notifications=[]
        )
        
        for task in affected_tasks:
            # Check if task is impacted
            task_material = next(
                (m for m in task.materials.required 
                 if m.material_code == delivery.material_code),
                None
            )
            
            if not task_material:
                continue
            
            original_start = task.timeline.planned_start
            
            # SCENARIO 1: Delivery delayed beyond task start
            if new_delivery_date > task.timeline.planned_start:
                delay_days = (new_delivery_date - task.timeline.planned_start).days
                
                # Update task timeline
                new_start = new_delivery_date
                new_end = new_start + timedelta(days=task.timeline.planned_duration_days)
                
                result.affected_tasks.append({
                    "task_id": str(task._id),
                    "task_name": task.name,
                    "original_start": original_start,
                    "new_start": new_start,
                    "original_end": task.timeline.planned_end,
                    "new_end": new_end,
                    "delay_days": delay_days,
                    "reason": f"Material delivery delayed: {delivery.material_name}"
                })
                
                # Update task
                task.timeline.planned_start = new_start
                task.timeline.planned_end = new_end
                task.timeline.delay_days += delay_days
                task.timeline.delay_reasons.append({
                    "date": datetime.utcnow(),
                    "reason": "Material delivery delay",
                    "material": delivery.material_code,
                    "days": delay_days
                })
                task.materials.readiness_status = "not_ready"
                task.materials.blocking_materials.append(delivery.material_code)
                
                await save_task(task)
                
                # Cascade to dependent tasks
                await self._cascade_delay_to_successors(task, delay_days, result)
            
            # SCENARIO 2: Partial delivery - may extend task duration
            elif delivered_quantity < task_material.required_quantity:
                shortage_percentage = 1 - (delivered_quantity / task_material.required_quantity)
                
                if shortage_percentage > 0.3:  # More than 30% shortage
                    # Task cannot proceed efficiently
                    task.materials.readiness_status = "partial"
                    task.status = "blocked"
                    
                    result.notifications.append({
                        "type": "material_shortage",
                        "task_id": str(task._id),
                        "message": f"Task '{task.name}' blocked: Only {delivered_quantity} of {task_material.required_quantity} {task_material.unit} delivered"
                    })
        
        # Update milestone timelines
        await self._recalculate_milestone_timelines(delivery.project_id, result)
        
        # Update project end date
        await self._update_project_end_date(delivery.project_id, result)
        
        # Generate notifications
        await self._send_delay_notifications(result)
        
        return result
    
    # ==================== LABOR SHORTAGE HANDLING ====================
    
    async def handle_labor_availability_change(
        self,
        project_id: str,
        date: datetime,
        actual_availability: List[LaborAvailability]
    ) -> RecalculationResult:
        """
        Handle labor availability change
        
        LOGIC:
        1. Compare actual vs planned labor for all active tasks
        2. If shortage:
           a. Calculate reduced productivity
           b. Extend task duration proportionally
           c. Cascade to dependent tasks
        3. If excess:
           a. Optionally compress task duration
           b. Alert for reallocation
        """
        result = RecalculationResult(
            trigger="LABOR_SHORTAGE",
            affected_tasks=[],
            notifications=[]
        )
        
        # Get tasks scheduled for this date
        active_tasks = await get_tasks_for_date(project_id, date)
        
        for task in active_tasks:
            # Compare planned vs actual labor
            for planned_labor in task.labor.planned:
                actual = next(
                    (a for a in actual_availability if a.role == planned_labor.role),
                    None
                )
                
                if not actual:
                    continue
                
                variance = actual.actual_available - planned_labor.required_count
                
                if variance < 0:  # SHORTAGE
                    shortage = abs(variance)
                    shortage_percentage = shortage / planned_labor.required_count
                    
                    # Calculate duration extension
                    # If we have 50% less labor, task takes 100% longer (inverse relationship)
                    # But capped at 3x original duration
                    if shortage_percentage >= 1:
                        # No labor of this type available
                        task.status = "blocked"
                        result.notifications.append({
                            "type": "critical_labor_shortage",
                            "message": f"Task '{task.name}' blocked: No {planned_labor.role} available"
                        })
                        continue
                    
                    productivity_factor = 1 - shortage_percentage
                    duration_extension_factor = min(1 / productivity_factor, 3)
                    
                    original_duration = task.timeline.planned_duration_days
                    new_duration = math.ceil(original_duration * duration_extension_factor)
                    extension_days = new_duration - original_duration
                    
                    if extension_days > 0:
                        new_end = task.timeline.planned_start + timedelta(days=new_duration)
                        
                        result.affected_tasks.append({
                            "task_id": str(task._id),
                            "task_name": task.name,
                            "labor_role": planned_labor.role,
                            "planned_count": planned_labor.required_count,
                            "actual_count": actual.actual_available,
                            "shortage": shortage,
                            "original_duration": original_duration,
                            "new_duration": new_duration,
                            "extension_days": extension_days,
                            "new_end_date": new_end
                        })
                        
                        # Update task
                        task.timeline.planned_duration_days = new_duration
                        task.timeline.planned_end = new_end
                        task.timeline.delay_days += extension_days
                        task.timeline.delay_reasons.append({
                            "date": datetime.utcnow(),
                            "reason": f"Labor shortage: {shortage} {planned_labor.role}(s)",
                            "days": extension_days
                        })
                        task.labor.availability_status = "insufficient"
                        task.labor.shortfall[planned_labor.role] = shortage
                        
                        await save_task(task)
                        
                        # Cascade delay
                        await self._cascade_delay_to_successors(task, extension_days, result)
                
                elif variance > 0:  # EXCESS (optional optimization)
                    excess = variance
                    # Could potentially compress task duration
                    # This is optional and depends on task type
                    result.notifications.append({
                        "type": "labor_excess",
                        "message": f"Task '{task.name}' has {excess} extra {planned_labor.role}(s) available"
                    })
        
        # Update milestone and project timelines
        await self._recalculate_milestone_timelines(project_id, result)
        await self._update_project_end_date(project_id, result)
        await self._send_delay_notifications(result)
        
        return result
    
    # ==================== CASCADE LOGIC ====================
    
    async def _cascade_delay_to_successors(
        self,
        task: Task,
        delay_days: int,
        result: RecalculationResult
    ):
        """
        Propagate delay to all successor tasks (recursive)
        """
        successors = await get_successor_tasks(task._id)
        
        for successor in successors:
            # Check if successor actually needs to move
            # (it might have slack/float)
            if successor.timeline.planned_start <= task.timeline.planned_end:
                # Successor must move
                original_start = successor.timeline.planned_start
                new_start = task.timeline.planned_end + timedelta(days=1)
                actual_delay = (new_start - original_start).days
                
                if actual_delay > 0:
                    new_end = new_start + timedelta(days=successor.timeline.planned_duration_days)
                    
                    result.affected_tasks.append({
                        "task_id": str(successor._id),
                        "task_name": successor.name,
                        "original_start": original_start,
                        "new_start": new_start,
                        "original_end": successor.timeline.planned_end,
                        "new_end": new_end,
                        "delay_days": actual_delay,
                        "reason": f"Cascaded from: {task.name}"
                    })
                    
                    # Update successor
                    successor.timeline.planned_start = new_start
                    successor.timeline.planned_end = new_end
                    successor.timeline.delay_days += actual_delay
                    successor.timeline.delay_reasons.append({
                        "date": datetime.utcnow(),
                        "reason": f"Predecessor delay: {task.name}",
                        "days": actual_delay
                    })
                    
                    await save_task(successor)
                    
                    # Recursively cascade
                    await self._cascade_delay_to_successors(successor, actual_delay, result)
    
    # ==================== MILESTONE RECALCULATION ====================
    
    async def _recalculate_milestone_timelines(
        self,
        project_id: str,
        result: RecalculationResult
    ):
        """
        Recalculate milestone dates based on updated task dates
        """
        milestones = await get_project_milestones(project_id)
        
        for milestone in milestones:
            tasks = await get_milestone_tasks(milestone._id)
            
            if not tasks:
                continue
            
            original_start = milestone.planned_start
            original_end = milestone.planned_end
            
            # Milestone start = earliest task start
            new_start = min(t.timeline.planned_start for t in tasks)
            
            # Milestone end = latest task end
            new_end = max(t.timeline.planned_end for t in tasks)
            
            if new_start != original_start or new_end != original_end:
                result.affected_milestones.append({
                    "milestone_id": str(milestone._id),
                    "milestone_name": milestone.name,
                    "original_start": original_start,
                    "new_start": new_start,
                    "original_end": original_end,
                    "new_end": new_end,
                    "delay_days": (new_end - original_end).days if original_end else 0
                })
                
                milestone.planned_start = new_start
                milestone.planned_end = new_end
                await save_milestone(milestone)
```

## 8.2 Event Listeners

```python
# services/event_handlers.py

from fastapi import BackgroundTasks

class EstimateEventHandlers:
    """
    Event handlers that trigger recalculations
    """
    
    @staticmethod
    async def on_material_delivery_updated(
        delivery_id: str,
        old_date: datetime,
        new_date: datetime,
        quantity: float,
        background_tasks: BackgroundTasks
    ):
        """
        Triggered when material delivery is updated
        """
        if new_date > old_date:
            # Delivery delayed
            background_tasks.add_task(
                RecalculationEngine().handle_material_delivery_change,
                delivery_id,
                new_date,
                quantity
            )
    
    @staticmethod
    async def on_attendance_recorded(
        project_id: str,
        date: datetime,
        attendance_data: List[dict],
        background_tasks: BackgroundTasks
    ):
        """
        Triggered when daily attendance is recorded
        """
        # Convert to labor availability format
        availability = await compile_labor_availability(project_id, date, attendance_data)
        
        # Check for variances
        has_shortage = any(a.variance < 0 for a in availability)
        
        if has_shortage:
            background_tasks.add_task(
                RecalculationEngine().handle_labor_availability_change,
                project_id,
                date,
                availability
            )
    
    @staticmethod
    async def on_task_started(
        task_id: str,
        actual_start: datetime,
        background_tasks: BackgroundTasks
    ):
        """
        Triggered when task actually starts
        """
        task = await get_task(task_id)
        
        if actual_start > task.timeline.planned_start:
            # Task started late
            delay = (actual_start - task.timeline.planned_start).days
            background_tasks.add_task(
                RecalculationEngine().handle_task_delay,
                task_id,
                delay,
                "late_start"
            )
    
    @staticmethod
    async def on_task_progress_updated(
        task_id: str,
        progress: float,
        work_completed: float,
        days_elapsed: int,
        background_tasks: BackgroundTasks
    ):
        """
        Triggered when task progress is updated
        """
        task = await get_task(task_id)
        
        # Calculate actual productivity
        if days_elapsed > 0 and work_completed > 0:
            actual_productivity = work_completed / days_elapsed
            planned_productivity = task.work_quantity.planned_quantity / task.timeline.planned_duration_days
            
            variance = (actual_productivity - planned_productivity) / planned_productivity
            
            if variance < -0.2:  # More than 20% slower
                background_tasks.add_task(
                    RecalculationEngine().handle_productivity_variance,
                    task_id,
                    variance
                )
```

---

# 9. DATA FLOW & DEPENDENCIES

## 9.1 Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ESTIMATE SYSTEM DEPENDENCY GRAPH                      │
└─────────────────────────────────────────────────────────────────────────────┘

    PROJECT SPECIFICATIONS
           │
           │ (Input)
           ▼
    ┌──────────────┐
    │   CENTRAL    │◄───────────────────────────────────────┐
    │   ESTIMATE   │                                         │
    │   (BOQ)      │                                         │
    └──────┬───────┘                                         │
           │                                                 │
           │ (Generates)                                     │
           ▼                                                 │
    ┌──────────────┐         ┌──────────────┐               │
    │  MILESTONES  │────────▶│    TASKS     │               │
    │  (Phases)    │         │  (Work Items)│               │
    └──────────────┘         └──────┬───────┘               │
                                    │                        │
           ┌────────────────────────┼────────────────────┐  │
           │                        │                    │  │
           ▼                        ▼                    ▼  │
    ┌──────────────┐         ┌──────────────┐     ┌──────────────┐
    │  MATERIALS   │         │    LABOR     │     │   TIMELINE   │
    │  REQUIRED    │         │  REQUIRED    │     │   SCHEDULE   │
    └──────┬───────┘         └──────┬───────┘     └──────┬───────┘
           │                        │                    │
           │                        │                    │
           ▼                        ▼                    │
    ┌──────────────┐         ┌──────────────┐           │
    │   MATERIAL   │         │    LABOR     │           │
    │  DELIVERIES  │         │ AVAILABILITY │           │
    │  (PO/GRN)    │         │ (Attendance) │           │
    └──────┬───────┘         └──────┬───────┘           │
           │                        │                    │
           │    (Triggers)          │    (Triggers)      │
           │                        │                    │
           └────────────┬───────────┘                    │
                        │                                │
                        ▼                                │
              ┌──────────────────┐                       │
              │  RECALCULATION   │───────────────────────┘
              │     ENGINE       │  (Updates)
              └──────────────────┘
                        │
                        │ (Generates)
                        ▼
              ┌──────────────────┐
              │  NOTIFICATIONS   │
              │  & ALERTS        │
              └──────────────────┘
```

## 9.2 Data Flow Sequences

### Sequence 1: Material Delivery Delay

```
┌─────────┐    ┌──────────┐    ┌─────────────┐    ┌────────┐    ┌──────────┐
│ Vendor  │    │ Delivery │    │ Recalc      │    │ Tasks  │    │ Notif    │
│ System  │    │ Module   │    │ Engine      │    │        │    │ Service  │
└────┬────┘    └────┬─────┘    └──────┬──────┘    └───┬────┘    └────┬─────┘
     │              │                 │               │              │
     │ Update       │                 │               │              │
     │ Delivery     │                 │               │              │
     │ Date         │                 │               │              │
     │─────────────▶│                 │               │              │
     │              │                 │               │              │
     │              │ Trigger         │               │              │
     │              │ Recalculation   │               │              │
     │              │────────────────▶│               │              │
     │              │                 │               │              │
     │              │                 │ Get Affected  │              │
     │              │                 │ Tasks         │              │
     │              │                 │──────────────▶│              │
     │              │                 │               │              │
     │              │                 │◀──────────────│              │
     │              │                 │ Task List     │              │
     │              │                 │               │              │
     │              │                 │ Calculate     │              │
     │              │                 │ New Dates     │              │
     │              │                 │──────────────▶│              │
     │              │                 │               │ Update       │
     │              │                 │               │ Timelines    │
     │              │                 │               │              │
     │              │                 │ Cascade       │              │
     │              │                 │ To Successors │              │
     │              │                 │──────────────▶│              │
     │              │                 │               │              │
     │              │                 │ Send Alerts   │              │
     │              │                 │──────────────────────────────▶│
     │              │                 │               │              │
     │              │                 │               │              │ Push
     │              │                 │               │              │ Notif
     │              │                 │               │              │─────▶
```

### Sequence 2: Labor Shortage Detection

```
┌──────────┐    ┌────────────┐    ┌─────────────┐    ┌────────┐
│Attendance│    │ Availability│    │ Recalc      │    │ Tasks  │
│ Module   │    │ Calculator  │    │ Engine      │    │        │
└────┬─────┘    └──────┬──────┘    └──────┬──────┘    └───┬────┘
     │                 │                  │               │
     │ Daily           │                  │               │
     │ Attendance      │                  │               │
     │ Recorded        │                  │               │
     │────────────────▶│                  │               │
     │                 │                  │               │
     │                 │ Compare          │               │
     │                 │ Planned vs       │               │
     │                 │ Actual           │               │
     │                 │                  │               │
     │                 │ Shortage         │               │
     │                 │ Detected         │               │
     │                 │─────────────────▶│               │
     │                 │                  │               │
     │                 │                  │ Identify      │
     │                 │                  │ Impacted Tasks│
     │                 │                  │──────────────▶│
     │                 │                  │               │
     │                 │                  │ Calculate     │
     │                 │                  │ Duration      │
     │                 │                  │ Extension     │
     │                 │                  │               │
     │                 │                  │ Update Task   │
     │                 │                  │ Timelines     │
     │                 │                  │──────────────▶│
     │                 │                  │               │
     │                 │                  │ Cascade       │
     │                 │                  │ Updates       │
     │                 │                  │──────────────▶│
```

---

# 10. API SPECIFICATIONS

## 10.1 Estimate APIs

```yaml
# Estimate Generation
POST /api/projects/{project_id}/generate-estimate
Request:
  specifications:
    project_type: "residential_individual"
    total_area_sqft: 2500
    num_floors: 2
    floor_details: [...]
    construction_type: "rcc_framed"
    quality_grade: "standard"
Response:
  estimate_id: "est_123"
  estimate_number: "EST-2025-001"
  boq_items_count: 45
  total_estimate: 2118875
  message: "Estimate generated with 45 BOQ items"

# Get Estimate with Task Links
GET /api/estimates/{estimate_id}?include=tasks,materials,labor
Response:
  _id: "est_123"
  project_id: "proj_456"
  specifications: {...}
  boq: [
    {
      item_code: "FND-001"
      item_name: "PCC for Foundation"
      quantity: 12.5
      rate: 5500
      amount: 68750
      linked_tasks: ["task_789", "task_790"]
      materials_breakdown: [...]
      labor_breakdown: [...]
    }
  ]
  summary: {...}

# Update Estimate (triggers recalculation)
PUT /api/estimates/{estimate_id}
Request:
  specifications:
    total_area_sqft: 2800  # Changed from 2500
Response:
  estimate_id: "est_123"
  version: 2
  recalculation_result:
    tasks_updated: 15
    timeline_impact_days: 5
    cost_change: 125000
```

## 10.2 Recalculation APIs

```yaml
# Trigger Manual Recalculation
POST /api/projects/{project_id}/recalculate
Request:
  trigger: "manual"
  scope: "all" | "timeline_only" | "costs_only"
Response:
  recalculation_id: "recalc_123"
  tasks_affected: 25
  milestones_affected: 5
  new_project_end_date: "2025-08-15"
  notifications_sent: 3

# Get Recalculation History
GET /api/projects/{project_id}/recalculations
Response:
  recalculations: [
    {
      _id: "recalc_123"
      trigger: "MATERIAL_DELIVERY_DELAYED"
      triggered_at: "2025-03-15T10:30:00Z"
      tasks_affected: 8
      delay_caused_days: 3
      details: {...}
    }
  ]

# Material Delivery Impact Preview
POST /api/deliveries/{delivery_id}/impact-preview
Request:
  new_delivery_date: "2025-03-20"
  delivered_quantity: 80
Response:
  impact:
    affected_tasks: [
      {
        task_id: "task_789"
        task_name: "PCC Work"
        current_start: "2025-03-15"
        projected_start: "2025-03-20"
        delay_days: 5
      }
    ]
    cascade_effect: [...]
    project_end_date_change: +5 days
    critical_path_impact: true

# Labor Availability Update
POST /api/projects/{project_id}/labor-availability
Request:
  date: "2025-03-15"
  availability: [
    { role: "mason", planned: 5, actual: 3 },
    { role: "helper", planned: 10, actual: 8 }
  ]
Response:
  recalculation_triggered: true
  recalculation_id: "recalc_124"
  impact_summary:
    tasks_extended: 2
    total_delay_days: 2
```

## 10.3 Task APIs (Enhanced)

```yaml
# Get Task with Full Details
GET /api/tasks/{task_id}?include=materials,labor,timeline,dependencies
Response:
  _id: "task_789"
  task_code: "PRJ001-FND-T03"
  name: "PCC Work"
  
  work_quantity:
    metric: "PCC Volume"
    unit: "cum"
    planned: 12.5
    completed: 0
    remaining: 12.5
    
  materials:
    readiness_status: "ready"
    required: [
      {
        material_code: "MAT-CEM-OPC53"
        name: "OPC Cement"
        required_quantity: 82
        delivered_quantity: 100
        status: "sufficient"
      }
    ]
    
  labor:
    availability_status: "sufficient"
    planned: [
      { role: "mason", count: 3, daily_rate: 800 }
    ]
    
  timeline:
    planned_start: "2025-03-15"
    planned_end: "2025-03-22"
    duration_days: 8
    is_critical: true
    
  dependencies:
    predecessors: ["task_788"]
    successors: ["task_790"]

# Update Task Progress (triggers recalculation if needed)
PUT /api/tasks/{task_id}/progress
Request:
  progress_percentage: 50
  work_completed: 6.25
  materials_consumed: [
    { material_code: "MAT-CEM-OPC53", quantity: 40 }
  ]
  labor_used: [
    { role: "mason", count: 2, hours: 8 }
  ]
Response:
  task_id: "task_789"
  progress: 50
  productivity_variance: -15%
  recalculation_triggered: false
  estimated_completion: "2025-03-24"
```

---

# 11. EDGE CASES & HANDLING

## 11.1 Edge Case Matrix

| ID | Scenario | Handling | Priority |
|----|----------|----------|----------|
| EC-01 | Material delivery cancelled | Block task, notify PM, suggest alternatives | High |
| EC-02 | All laborers absent | Block task, no recalculation (wait for next day) | High |
| EC-03 | Predecessor task not yet created | Skip dependency, add warning | Medium |
| EC-04 | Circular dependency detected | Reject, show error | High |
| EC-05 | Negative duration calculated | Set to minimum 1 day | Medium |
| EC-06 | Material quantity = 0 | Skip material, log warning | Low |
| EC-07 | Labor rate = 0 | Use default rate, log warning | Low |
| EC-08 | Project end date in past | Recalculate from today | Medium |
| EC-09 | Estimate locked but change needed | Create new version | High |
| EC-10 | Multiple delays on same task | Cumulative, track each reason | Medium |
| EC-11 | Task completed early | Optional: Compress successor tasks | Low |
| EC-12 | Weather halt (monsoon) | Bulk delay all outdoor tasks | High |
| EC-13 | Specification change mid-project | Version estimate, recalculate delta | High |
| EC-14 | Formula evaluation error | Use fallback value, alert admin | Medium |
| EC-15 | Concurrent recalculations | Queue and process sequentially | High |

## 11.2 Edge Case Handling Code

```python
# services/edge_case_handler.py

class EdgeCaseHandler:
    
    async def handle_cancelled_delivery(self, delivery_id: str):
        """
        EC-01: Material delivery cancelled
        """
        delivery = await get_delivery(delivery_id)
        affected_tasks = await get_tasks_needing_material(
            delivery.project_id,
            delivery.material_code
        )
        
        for task in affected_tasks:
            task.status = "blocked"
            task.materials.readiness_status = "not_ready"
            task.materials.blocking_materials.append(delivery.material_code)
            await save_task(task)
        
        # Notify Project Manager
        await send_notification(
            recipient=await get_project_manager(delivery.project_id),
            type="critical_material_issue",
            title="Material Delivery Cancelled",
            message=f"Delivery {delivery.delivery_number} cancelled. {len(affected_tasks)} tasks blocked.",
            action_required=True,
            suggested_actions=[
                "Find alternative vendor",
                "Reorder from same vendor",
                "Check site inventory"
            ]
        )
    
    async def handle_circular_dependency(self, task_id: str, proposed_predecessor: str):
        """
        EC-04: Circular dependency detected
        """
        # Check if adding this dependency creates a cycle
        if await self._would_create_cycle(task_id, proposed_predecessor):
            raise ValidationError(
                code="CIRCULAR_DEPENDENCY",
                message=f"Adding {proposed_predecessor} as predecessor would create circular dependency",
                details={
                    "task_id": task_id,
                    "proposed_predecessor": proposed_predecessor,
                    "existing_path": await self._get_dependency_path(proposed_predecessor, task_id)
                }
            )
    
    async def handle_negative_duration(self, task_id: str, calculated_duration: float):
        """
        EC-05: Negative duration calculated
        """
        if calculated_duration <= 0:
            logger.warning(f"Negative duration {calculated_duration} calculated for task {task_id}")
            
            task = await get_task(task_id)
            task.timeline.planned_duration_days = 1  # Minimum 1 day
            task.timeline.calculation_warnings.append({
                "type": "negative_duration_corrected",
                "original_value": calculated_duration,
                "corrected_value": 1,
                "timestamp": datetime.utcnow()
            })
            await save_task(task)
            
            return 1
        
        return calculated_duration
    
    async def handle_weather_halt(self, project_id: str, halt_date: datetime, resume_date: datetime):
        """
        EC-12: Weather halt (monsoon)
        """
        halt_days = (resume_date - halt_date).days
        
        # Get all outdoor tasks scheduled during halt period
        outdoor_task_types = ["excavation", "concrete", "brickwork", "plastering_external"]
        
        affected_tasks = await get_tasks_by_criteria(
            project_id=project_id,
            task_types=outdoor_task_types,
            date_range=(halt_date, resume_date)
        )
        
        result = RecalculationResult(trigger="WEATHER_HALT")
        
        for task in affected_tasks:
            if task.timeline.planned_start >= halt_date and task.timeline.planned_start < resume_date:
                # Task starts during halt - move to after resume
                new_start = resume_date
                new_end = new_start + timedelta(days=task.timeline.planned_duration_days)
                
                result.affected_tasks.append({...})
                
                task.timeline.planned_start = new_start
                task.timeline.planned_end = new_end
                task.timeline.delay_reasons.append({
                    "date": datetime.utcnow(),
                    "reason": "Weather halt (monsoon)",
                    "days": halt_days
                })
                await save_task(task)
                
                # Cascade to successors
                await self._cascade_delay_to_successors(task, halt_days, result)
        
        return result
```

---

# 12. EXAMPLES & SCENARIOS

## 12.1 Example: 2500 sq.ft. Residential House

### Input Specifications

```json
{
  "project_type": "residential_individual",
  "total_area_sqft": 2500,
  "num_floors": 2,
  "floor_details": [
    {"floor": "Ground", "area_sqft": 1200, "rooms": 4, "bathrooms": 2},
    {"floor": "First", "area_sqft": 1300, "rooms": 3, "bathrooms": 2}
  ],
  "construction_type": "rcc_framed",
  "foundation_type": "isolated_footing",
  "quality_grade": "standard"
}
```

### Auto-Generated Estimate Summary

| Category | Amount (₹) |
|----------|------------|
| Foundation | 245,000 |
| Structure (RCC) | 520,000 |
| Brickwork | 185,000 |
| Plastering | 125,000 |
| Flooring | 210,000 |
| Electrical | 145,000 |
| Plumbing | 95,000 |
| Doors & Windows | 180,000 |
| Painting | 85,000 |
| Finishing | 60,000 |
| **Subtotal** | **1,850,000** |
| Overhead (10%) | 185,000 |
| Profit (15%) | 305,250 |
| **Grand Total** | **2,340,250** |
| **Per sq.ft.** | **₹936** |

### Auto-Generated Tasks (Foundation Phase)

| Task | Work Qty | Duration | Materials | Labor |
|------|----------|----------|-----------|-------|
| Site Clearing | 232 sqm | 2 days | - | 4 helpers |
| Excavation | 28 cum | 4 days | - | 8 helpers, 1 JCB |
| PCC | 12.5 cum | 2 days | 82 bags cement, 55 cft sand, 110 cft aggregate | 3 masons, 6 helpers |
| Footing Rebar | 1500 kg | 3 days | 1500 kg TMT | 2 bar benders, 4 helpers |
| Footing Concrete | 18 cum | 2 days | 153 bags cement, 27 cft sand, 54 cft aggregate, RMC | 4 masons, 8 helpers |
| **Total Foundation** | - | **21 days** | - | - |

## 12.2 Scenario: Material Delivery Delay

### Initial State

```
Task: PCC Work
Planned Start: March 15, 2025
Planned End: March 22, 2025 (including 7 days curing)
Required: 82 bags OPC Cement
Status: Ready to start

Successor Tasks:
- Footing Reinforcement: March 17-19
- Footing Concrete: March 20-21
- Plinth Beam: March 23-25
```

### Event: Cement Delivery Delayed

```
Original Delivery Date: March 14, 2025
New Delivery Date: March 18, 2025
Delay: 4 days
```

### Recalculation Result

```
RECALCULATION TRIGGERED: MATERIAL_DELIVERY_DELAYED

Affected Tasks:

1. PCC Work
   - Original Start: March 15 → New Start: March 18
   - Original End: March 22 → New End: March 25
   - Delay: 3 days (4 day delivery delay minus 1 day buffer)
   - Reason: Cement delivery delayed

2. Footing Reinforcement (Successor)
   - Original Start: March 17 → New Start: March 19
   - Original End: March 19 → New End: March 21
   - Delay: 2 days (cascaded)
   - Reason: Predecessor PCC delayed

3. Footing Concrete (Successor)
   - Original Start: March 20 → New Start: March 22
   - Original End: March 21 → New End: March 23
   - Delay: 2 days (cascaded)

4. Plinth Beam (Successor)
   - Original Start: March 23 → New Start: March 25
   - Original End: March 25 → New End: March 27
   - Delay: 2 days (cascaded)

MILESTONE IMPACT:
- Foundation Phase: End delayed by 2 days

PROJECT IMPACT:
- Original End: August 15, 2025
- New End: August 17, 2025
- Total Delay: 2 days

NOTIFICATIONS SENT:
- Project Manager: "3 tasks delayed due to cement delivery"
- Site Engineer: "PCC Work start delayed to March 18"
```

## 12.3 Scenario: Labor Shortage

### Initial State

```
Task: Brickwork - Ground Floor External Walls
Planned Start: April 1, 2025
Work Quantity: 1000 sq.ft.
Planned Duration: 5 days
Planned Labor: 2 masons, 4 helpers
Productivity: 100 sq.ft./mason/day
```

### Event: Labor Shortage on April 1

```
Attendance Recorded:
- Masons: 1 present (1 absent due to illness)
- Helpers: 3 present (1 transferred to other site)

Shortage:
- Masons: 50% (1 instead of 2)
- Helpers: 25% (3 instead of 4)
```

### Recalculation Result

```
RECALCULATION TRIGGERED: LABOR_SHORTAGE

Productivity Impact:
- Mason shortage is critical (primary skill)
- With 1 mason: 100 sq.ft./day instead of 200 sq.ft./day
- Productivity reduced by 50%

Duration Recalculation:
- Original: 1000 sq.ft. / (2 masons × 100 sq.ft./day) = 5 days
- New: 1000 sq.ft. / (1 mason × 100 sq.ft./day) = 10 days
- Extension: 5 days

HOWEVER - If shortage is just for Day 1:
- Day 1: 100 sq.ft. (1 mason)
- Days 2-5: 200 sq.ft./day (2 masons)
- Total in 5 days: 100 + 800 = 900 sq.ft.
- Remaining: 100 sq.ft. = 0.5 extra days
- New Duration: 5.5 days → 6 days

Task Updated:
- Planned Duration: 5 days → 6 days
- Planned End: April 5 → April 6
- Delay: 1 day
- Status: In Progress (not blocked)

NOTIFICATIONS:
- Site Engineer: "Brickwork extended by 1 day due to mason shortage"
- Suggestion: "Consider arranging substitute mason to avoid delay"
```

---

# 13. IMPLEMENTATION ROADMAP

## 13.1 Phase 1: Foundation (Weeks 1-3)

| Task | Duration | Priority |
|------|----------|----------|
| Design database schemas | 3 days | P0 |
| Create calculation engine service | 5 days | P0 |
| Build formula evaluator | 2 days | P0 |
| Implement BOQ templates | 3 days | P0 |
| Create milestone/task templates | 3 days | P0 |
| Unit tests for calculations | 2 days | P0 |

## 13.2 Phase 2: Auto-Generation (Weeks 4-6)

| Task | Duration | Priority |
|------|----------|----------|
| Project creation with auto-generation | 5 days | P0 |
| Material calculation integration | 3 days | P0 |
| Labor calculation integration | 3 days | P0 |
| Timeline calculation with dependencies | 5 days | P0 |
| Frontend: New project wizard | 5 days | P1 |
| Integration tests | 3 days | P0 |

## 13.3 Phase 3: Recalculation Engine (Weeks 7-9)

| Task | Duration | Priority |
|------|----------|----------|
| Recalculation trigger system | 5 days | P0 |
| Material delivery integration | 3 days | P0 |
| Labor availability integration | 3 days | P0 |
| Cascade logic implementation | 4 days | P0 |
| Notification integration | 2 days | P1 |
| Performance optimization | 3 days | P1 |

## 13.4 Phase 4: UI & Polish (Weeks 10-12)

| Task | Duration | Priority |
|------|----------|----------|
| Estimate detail screen | 5 days | P0 |
| Task-material-labor views | 5 days | P0 |
| Timeline visualization | 5 days | P1 |
| Recalculation history view | 3 days | P1 |
| Mobile optimization | 3 days | P1 |
| User acceptance testing | 5 days | P0 |

## 13.5 Estimated Total Effort

| Category | Days |
|----------|------|
| Backend Development | 45 |
| Frontend Development | 25 |
| Testing | 15 |
| Documentation | 5 |
| **Total** | **90 days (~4.5 months)** |

---

# APPENDIX

## A. Glossary

| Term | Definition |
|------|------------|
| BOQ | Bill of Quantities - Itemized list of materials/work |
| PCC | Plain Cement Concrete |
| RCC | Reinforced Cement Concrete |
| cum | Cubic meter |
| cft | Cubic feet |
| sqm | Square meter |
| sqft | Square feet |
| Critical Path | Longest sequence of dependent tasks |
| Slack/Float | Time a task can be delayed without delaying project |

## B. Formulas Reference

```
Material Quantity = Work Qty × Material Rate × (1 + Wastage)
Labor Days = Work Qty / (Worker Count × Productivity)
Task Duration = Labor Days × Weather Factor × Complexity Factor + Curing Time
Productivity = Work Completed / Time Elapsed
Variance = (Actual - Planned) / Planned × 100
```

## C. Productivity Standards (India Construction)

| Work Type | Unit | Output/Worker/Day |
|-----------|------|-------------------|
| Excavation (manual) | cum | 3 |
| Concrete placement | cum | 8-10 |
| Brickwork | sq.ft | 100 |
| Plastering | sq.ft | 150 |
| Tiling | sq.ft | 80 |
| Painting | sq.ft | 200 |
| Reinforcement | kg | 200 |

---

*Document Version: 1.0*  
*Last Updated: December 2025*  
*Classification: Internal - Technical Specification*
