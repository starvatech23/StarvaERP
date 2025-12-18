# Project Management System - Functional Specification

## Overview
A comprehensive construction project management system that automatically links materials and labour estimates to tasks and milestones, supports planned vs. actual tracking, and visualizes deviations efficiently.

---

## 1. Data Models

### 1.1 Project (Enhanced)
```
Project {
  id: ObjectId
  name: string
  code: string (auto-generated: PRJ-YYYY-XXXX)
  client_name: string
  client_contact: string
  status: enum (planning, in_progress, on_hold, completed, cancelled)
  
  // Dates
  planned_start_date: datetime
  planned_end_date: datetime
  actual_start_date: datetime
  actual_end_date: datetime
  
  // Budget Summary (auto-calculated from milestones/tasks)
  total_planned_cost: float
  total_actual_cost: float
  material_planned_cost: float
  material_actual_cost: float
  labour_planned_cost: float
  labour_actual_cost: float
  
  // Settings
  number_of_floors: int (for auto-generating construction tasks)
  building_type: enum (residential, commercial, industrial)
  total_built_area: float (sqft)
  
  // Metadata
  created_by: ObjectId
  created_at: datetime
  updated_at: datetime
}
```

### 1.2 Milestone Template (Pre-defined)
```
MilestoneTemplate {
  id: ObjectId
  name: string
  description: string
  order: int
  phase: enum (preplanning, structure, finishing_1, finishing_2, handover)
  default_duration_days: int
  is_floor_based: boolean (if true, repeat for each floor)
  tasks: [TaskTemplate]
}
```

### 1.3 Task Template (Pre-defined)
```
TaskTemplate {
  id: ObjectId
  milestone_template_id: ObjectId
  name: string
  description: string
  order: int
  default_duration_days: int
  work_type: enum
  measurement_type: enum
  
  // Default material estimates (per unit)
  material_estimates: [{
    material_category: string
    material_name: string
    quantity_per_unit: float
    unit: string
  }]
  
  // Default labour estimates (per unit)
  labour_estimates: [{
    skill_type: string
    hours_per_unit: float
    workers_count: int
  }]
  
  dependencies: [string] // Other task template names
}
```

### 1.4 Project Milestone (Instance)
```
ProjectMilestone {
  id: ObjectId
  project_id: ObjectId
  template_id: ObjectId (nullable - for custom milestones)
  name: string
  description: string
  order: int
  phase: string
  floor_number: int (null for non-floor-based)
  
  // Dates
  planned_start_date: datetime
  planned_end_date: datetime
  actual_start_date: datetime
  actual_end_date: datetime
  
  // Status
  status: enum (pending, in_progress, completed, delayed)
  completion_percentage: float (0-100, auto-calculated)
  
  // Cost Summary (auto-calculated from tasks)
  planned_material_cost: float
  actual_material_cost: float
  planned_labour_cost: float
  actual_labour_cost: float
  total_planned_cost: float
  total_actual_cost: float
  cost_variance: float
  cost_variance_percentage: float
  
  // Dependencies
  depends_on: [ObjectId] // Milestone IDs
}
```

### 1.5 Task (Enhanced with Estimates)
```
Task {
  id: ObjectId
  project_id: ObjectId
  milestone_id: ObjectId
  template_id: ObjectId (nullable)
  title: string
  description: string
  order: int
  floor_number: int
  
  // Work Details
  work_type: enum
  measurement_type: enum
  work_area: float
  work_length: float
  work_breadth: float
  work_height: float
  work_count: int
  calculated_quantity: float (auto-calculated)
  
  // Dates
  planned_start_date: datetime
  planned_end_date: datetime
  actual_start_date: datetime
  actual_end_date: datetime
  
  // Status
  status: enum (pending, in_progress, completed, cancelled)
  priority: enum (low, medium, high, urgent)
  progress_percentage: float (0-100)
  
  // Deviations
  schedule_variance_days: int (auto-calculated)
  is_delayed: boolean
  delay_reason: string
  
  // Dependencies
  dependencies: [ObjectId] // Task IDs
  
  // Assigned
  assigned_to: [ObjectId]
  created_by: ObjectId
  created_at: datetime
  updated_at: datetime
}
```

### 1.6 Task Material Estimate
```
TaskMaterialEstimate {
  id: ObjectId
  task_id: ObjectId
  project_id: ObjectId
  material_id: ObjectId
  material_name: string
  material_category: string
  
  // Quantities
  planned_quantity: float
  actual_quantity: float
  quantity_variance: float (auto-calculated)
  unit: string
  
  // Costs
  unit_rate: float
  planned_cost: float (planned_quantity * unit_rate)
  actual_cost: float (actual_quantity * unit_rate)
  cost_variance: float (planned - actual)
  
  notes: string
  created_at: datetime
  updated_at: datetime
}
```

### 1.7 Task Labour Estimate
```
TaskLabourEstimate {
  id: ObjectId
  task_id: ObjectId
  project_id: ObjectId
  
  skill_type: string (mason, carpenter, electrician, plumber, helper, etc.)
  
  // Labour Hours
  planned_hours: float
  actual_hours: float
  hours_variance: float
  
  // Worker Count
  planned_workers: int
  actual_workers: int
  
  // Costs
  hourly_rate: float
  planned_cost: float
  actual_cost: float
  cost_variance: float
  
  notes: string
  created_at: datetime
  updated_at: datetime
}
```

---

## 2. Standard Milestone & Task Templates

### Milestone 1: Preplanning (Order: 1, Duration: 30 days)
| Order | Task | Duration | Work Type | Dependencies |
|-------|------|----------|-----------|--------------|
| 1.1 | Preliminary Agreement Signing | 2 days | General | - |
| 1.2 | Site Visits & Survey | 3 days | General | 1.1 |
| 1.3 | Site Marking | 2 days | General | 1.2 |
| 1.4 | Preliminary Floor Plan Creation | 5 days | General | 1.2 |
| 1.5 | Plan Review & Updates | 3 days | General | 1.4 |
| 1.6 | Final Plan Approval | 2 days | General | 1.5 |
| 1.7 | Preliminary 3D Views (External) | 5 days | General | 1.6 |
| 1.8 | Preliminary 3D Views (Internal) | 5 days | General | 1.6 |
| 1.9 | Detailed 3D Views (External) | 4 days | General | 1.7 |
| 1.10 | Detailed 3D Views (Internal) | 4 days | General | 1.8 |
| 1.11 | Structural Design Initiation | 5 days | General | 1.6 |
| 1.12 | Column Positioning & Orientation | 3 days | General | 1.11 |
| 1.13 | Finalization of Column Positions | 2 days | General | 1.12 |

### Milestone 2: Construction Phase - Structure (Per Floor, Duration: 45 days/floor)
| Order | Task | Duration | Work Type | Measurement | Materials | Labour |
|-------|------|----------|-----------|-------------|-----------|--------|
| 2.1 | Centre Line Marking | 1 day | General | - | Paint, String | 2 helpers |
| 2.2 | Survey & Level Marking | 2 days | General | - | Survey equipment | 1 surveyor, 2 helpers |
| 2.3 | Excavation | 5 days | Earthwork | Volume (LxBxD) | - | 5 helpers, 1 operator |
| 2.4 | PCC Work | 2 days | Concrete | Volume | Cement, Sand, Aggregate | 3 masons, 4 helpers |
| 2.5 | Anti-Termite Treatment | 1 day | General | Area | Anti-termite solution | 2 workers |
| 2.6 | Footing Reinforcement | 3 days | Steel Fixing | Weight | Steel bars, Binding wire | 3 steel fixers |
| 2.7 | Footing Formwork | 2 days | Carpentry | Area | Plywood, Nails | 2 carpenters, 2 helpers |
| 2.8 | Footing Concrete | 2 days | Concrete | Volume | Cement, Sand, Aggregate, RMC | 4 masons, 6 helpers |
| 2.9 | Column Reinforcement | 4 days | Steel Fixing | Weight | Steel bars | 3 steel fixers |
| 2.10 | Column Formwork | 2 days | Carpentry | Area | Plywood | 3 carpenters |
| 2.11 | Column Concrete | 2 days | Concrete | Volume | RMC | 3 masons, 4 helpers |
| 2.12 | Beam Reinforcement | 5 days | Steel Fixing | Weight | Steel bars | 4 steel fixers |
| 2.13 | Beam Formwork | 3 days | Carpentry | Area | Plywood, Props | 4 carpenters |
| 2.14 | Slab Reinforcement | 4 days | Steel Fixing | Weight | Steel bars, Mesh | 4 steel fixers |
| 2.15 | Slab Formwork | 3 days | Carpentry | Area | Plywood, Props | 4 carpenters |
| 2.16 | Beam & Slab Concrete | 1 day | Concrete | Volume | RMC | 6 masons, 10 helpers |
| 2.17 | Curing | 7 days | General | Area | Water, Curing compound | 2 helpers |
| 2.18 | Deshuttering | 2 days | Carpentry | Area | - | 3 carpenters |

### Milestone 3: Construction Phase - Finishing (Duration: 30 days)
| Order | Task | Duration | Work Type | Measurement | Materials | Labour |
|-------|------|----------|-----------|-------------|-----------|--------|
| 3.1 | Brick/Block Work | 10 days | Brickwork | Area | Bricks, Cement, Sand | 4 masons, 4 helpers |
| 3.2 | Electrical Conduit & Chasing | 5 days | Electrical | Length | PVC pipes, Wires | 2 electricians, 2 helpers |
| 3.3 | Plumbing Lines (Internal) | 5 days | Plumbing | Length | PVC pipes, Fittings | 2 plumbers, 2 helpers |
| 3.4 | Plumbing Lines (External) | 3 days | Plumbing | Length | PVC pipes | 2 plumbers |
| 3.5 | Internal Plastering | 8 days | Plastering | Area | Cement, Sand | 4 masons, 4 helpers |
| 3.6 | External Plastering | 6 days | Plastering | Area | Cement, Sand | 3 masons, 3 helpers |
| 3.7 | Elevation Detailing | 5 days | Plastering | Area | Cement, Sand, Mouldings | 2 masons, 2 helpers |

### Milestone 4: Finishing Phase 1 (Duration: 25 days)
| Order | Task | Duration | Work Type | Measurement | Materials | Labour |
|-------|------|----------|-----------|-------------|-----------|--------|
| 4.1 | Floor Tiling | 8 days | Tiling | Area | Tiles, Adhesive, Grout | 3 masons, 3 helpers |
| 4.2 | Wall Tiling (Bathrooms/Kitchen) | 5 days | Tiling | Area | Tiles, Adhesive | 2 masons, 2 helpers |
| 4.3 | Primer Application | 3 days | Painting | Area | Primer | 2 painters |
| 4.4 | Window Grill Installation | 3 days | Steel Fixing | Count | MS Grills | 2 welders |
| 4.5 | Window Installation | 4 days | Carpentry | Count | Windows, Hardware | 2 carpenters |
| 4.6 | Door Installation | 4 days | Carpentry | Count | Doors, Hardware | 2 carpenters |
| 4.7 | Sanitary Fixture Installation | 3 days | Plumbing | Count | WC, Basin, Faucets | 2 plumbers |
| 4.8 | Electrical Fixture Installation | 3 days | Electrical | Count | Switches, Sockets | 2 electricians |

### Milestone 5: Finishing Phase 2 - Handover (Duration: 15 days)
| Order | Task | Duration | Work Type | Measurement | Materials | Labour |
|-------|------|----------|-----------|-------------|-----------|--------|
| 5.1 | First Coat Painting | 4 days | Painting | Area | Paint | 3 painters |
| 5.2 | Second Coat Painting | 3 days | Painting | Area | Paint | 3 painters |
| 5.3 | Interior Execution | 5 days | General | - | Various | 4 workers |
| 5.4 | Final Elevation Finishing | 3 days | Painting | Area | External paint | 2 painters |
| 5.5 | Deep Cleaning | 2 days | General | Area | Cleaning supplies | 4 helpers |
| 5.6 | Final Inspection | 1 day | General | - | - | PM, Engineer |
| 5.7 | Defect Rectification | 2 days | General | - | Various | As needed |
| 5.8 | Handover Documentation | 1 day | General | - | - | Admin |

---

## 3. Material Consumption Rates (Industry Standard)

### Concrete Work (per cubic meter)
| Material | Quantity | Unit |
|----------|----------|------|
| Cement (M20 grade) | 8 bags | bags |
| Sand | 0.42 | cum |
| Aggregate (20mm) | 0.84 | cum |
| Water | 180 | liters |

### Brickwork (per sqm, 230mm thick)
| Material | Quantity | Unit |
|----------|----------|------|
| Bricks | 55 | nos |
| Cement | 0.5 | bags |
| Sand | 0.04 | cum |

### Plastering (per sqm, 12mm thick)
| Material | Quantity | Unit |
|----------|----------|------|
| Cement | 0.15 | bags |
| Sand | 0.015 | cum |

### Tiling (per sqm)
| Material | Quantity | Unit |
|----------|----------|------|
| Tiles | 1.05 | sqm |
| Tile Adhesive | 4 | kg |
| Grout | 0.5 | kg |

### Painting (per sqm)
| Material | Quantity | Unit |
|----------|----------|------|
| Primer | 0.1 | liters |
| Paint (2 coats) | 0.25 | liters |

---

## 4. Labour Rates (Per Day)

| Skill Type | Daily Rate (₹) | Efficiency Factor |
|------------|----------------|-------------------|
| Mason | 800 | 1.0 |
| Carpenter | 750 | 1.0 |
| Electrician | 700 | 1.0 |
| Plumber | 700 | 1.0 |
| Steel Fixer | 750 | 1.0 |
| Painter | 650 | 1.0 |
| Welder | 800 | 1.0 |
| Helper | 500 | 0.5 |
| Operator (JCB/Crane) | 1200 | 1.0 |
| Surveyor | 1000 | 1.0 |

---

## 5. Workflows

### 5.1 Project Creation with Auto-Preload
```
1. User creates new project with:
   - Basic info (name, client, location)
   - Number of floors
   - Building type
   - Planned start date
   
2. System auto-generates:
   - All milestone templates instantiated for the project
   - For floor-based milestones (Structure), repeat per floor
   - Calculate tentative dates based on:
     - Project start date
     - Default task durations
     - Dependencies
   
3. System auto-populates:
   - Material estimates based on building area and task types
   - Labour estimates based on task types and durations
   
4. All auto-generated data is fully editable
```

### 5.2 Task-Estimate Auto-Linkage
```
On Task Creation/Update:
1. If work measurements provided (area/volume/count):
   - Fetch material consumption templates for work_type
   - Calculate: estimated_quantity = measurement * consumption_rate
   - Create/update TaskMaterialEstimate records
   
2. Based on task duration and work type:
   - Fetch labour templates
   - Calculate: planned_hours = duration * workers * 8
   - Create/update TaskLabourEstimate records
   
3. Recalculate milestone totals
4. Recalculate project totals
```

### 5.3 Actual Value Recording
```
1. Site Engineer records actual values:
   - Actual material quantities used
   - Actual labour hours/workers
   - Actual start/end dates
   
2. System auto-calculates:
   - Variance = Planned - Actual
   - Variance % = (Variance / Planned) * 100
   - Update milestone and project summaries
```

### 5.4 Deviation Detection
```
Schedule Deviation:
- If actual_start > planned_start: Task is delayed
- Schedule variance (days) = actual_duration - planned_duration

Cost Deviation:
- Material variance = planned_material_cost - actual_material_cost
- Labour variance = planned_labour_cost - actual_labour_cost
- Total variance = material_variance + labour_variance

Auto-flagging:
- Yellow flag: Variance > 10%
- Red flag: Variance > 20%
```

---

## 6. API Endpoints

### Project APIs
```
POST /api/projects/create-with-templates
  - Creates project with auto-populated milestones and tasks
  - Input: project details, number_of_floors, building_type
  - Output: Full project with all milestones and tasks

GET /api/projects/{id}/budget-summary
  - Returns planned vs actual costs breakdown
  - Includes milestone-level and task-level details

GET /api/projects/{id}/deviation-report
  - Returns all deviations (schedule and cost)
  - Sorted by severity
```

### Milestone APIs
```
GET /api/projects/{id}/milestones
  - Returns all milestones with cost summaries

PUT /api/milestones/{id}
  - Update milestone (dates, status, etc.)
  - Auto-recalculates costs if tasks updated
```

### Task APIs
```
POST /api/tasks
  - Creates task with auto-linked material/labour estimates

PUT /api/tasks/{id}
  - Updates task
  - Auto-updates linked estimates if work measurements change

PUT /api/tasks/{id}/actual-values
  - Records actual measurements, costs
  - Triggers deviation calculation
```

### Estimate APIs
```
GET /api/tasks/{id}/material-estimates
POST /api/tasks/{id}/material-estimates
PUT /api/task-material-estimates/{id}

GET /api/tasks/{id}/labour-estimates
POST /api/tasks/{id}/labour-estimates
PUT /api/task-labour-estimates/{id}
```

### Template APIs
```
GET /api/templates/milestones
GET /api/templates/tasks
GET /api/templates/material-consumption
GET /api/templates/labour-rates
```

---

## 7. UI Components

### 7.1 Project Creation Wizard
- Step 1: Basic project info
- Step 2: Select building type, enter floors
- Step 3: Review auto-generated milestones
- Step 4: Adjust dates if needed
- Step 5: Confirm creation

### 7.2 Gantt Chart View
- Timeline visualization
- Color coding:
  - Green: On track
  - Yellow: Minor delay (<10%)
  - Red: Major delay (>10%)
- Click task to see details

### 7.3 Budget Dashboard
- Summary cards: Total/Material/Labour costs
- Progress bars showing planned vs actual
- Variance indicators with colors

### 7.4 Deviation Report View
- Table with all deviations
- Filters: By milestone, severity, type
- Export to PDF/Excel

### 7.5 Task Detail View
- Task info
- Material estimates table (planned/actual/variance)
- Labour estimates table (planned/actual/variance)
- Quick-entry for actual values

---

## 8. Implementation Priority

### Phase 1 (Core - This Sprint)
1. Create data models for templates
2. Seed standard milestone/task templates
3. Implement project creation with auto-preload
4. Basic budget view

### Phase 2 (Tracking)
1. Actual value recording
2. Deviation calculation
3. Gantt chart integration

### Phase 3 (Advanced)
1. Deviation alerts/notifications
2. PDF reports
3. Analytics dashboard

---

## 9. Database Collections

```
- milestone_templates      (Pre-defined milestone templates)
- task_templates          (Pre-defined task templates)
- material_consumption_templates  (Standard consumption rates)
- labour_rate_templates   (Standard labour rates)
- project_milestones      (Instantiated milestones per project)
- tasks                   (Existing, enhanced)
- task_material_estimates (Material estimates per task)
- task_labour_estimates   (Labour estimates per task)
```
