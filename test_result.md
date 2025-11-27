#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Building a comprehensive construction management mobile app. Current work focuses on:
  
  Vendor & Materials Management Module (NEW - COMPREHENSIVE):
  1. Vendor Management: Add vendor business details (name, contact, GST, PAN, bank details, payment terms)
  2. Material Master: Material catalog with categories, units, minimum stock levels
  3. Vendor Material Rates: Track vendor-specific rates for each material with effective dates
  4. Site Inventory: Current stock tracking at each site with low stock alerts
  5. Material Requirements: Future material needs per site with priority levels
  6. Purchase Orders: Create POs with multiple items, track delivery status
  7. Material Transactions: Track receipts, consumption, transfers, returns with auto inventory updates
  8. Material Reports with Charts:
     - Weekly/monthly spending reports by category, site, and vendor
     - Pie charts for category-wise and site-wise spending distribution
     - Bar charts for top vendor spending
     - Low stock alerts dashboard
  
  Previously completed: Labor reports with wage tracking, profile management, quotations, timeline views, and full labor management.

backend:
  - task: "Vendor Management APIs"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Comprehensive vendor CRUD APIs with business details, GST, PAN, bank info. Endpoints: GET/POST/PUT/DELETE /api/vendors. Includes filtering by active status and proper authentication/authorization (Admin/PM only for modifications)."

  - task: "Material Management APIs"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Material master CRUD with categories (cement, steel, sand, etc.), units, minimum stock. Endpoints: GET/POST/PUT/DELETE /api/materials. Supports category filtering."

  - task: "Vendor Material Rate APIs"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Track vendor-specific rates for materials with effective dates. GET/POST/PUT /api/vendor-material-rates. Supports filtering by vendor_id, material_id, and active status."

  - task: "Site Inventory APIs"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Site inventory tracking with current stock levels. GET/POST/PUT /api/site-inventory. Auto-creates or updates inventory for project-material combinations. Includes low stock detection."

  - task: "Material Requirements APIs"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Future material requirements planning per site. GET/POST/PUT /api/material-requirements. Supports priority levels and fulfillment tracking."

  - task: "Purchase Order APIs"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Complete PO management with line items. GET/POST/PUT /api/purchase-orders. Creates PO with multiple items, tracks status (draft, pending, ordered, received, etc.). Admin/PM only."

  - task: "Material Transaction APIs"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Transaction tracking with auto inventory updates. POST /api/material-transactions. Supports receipt, consumption, transfer_in, transfer_out, return, adjustment. Automatically updates site_inventory based on transaction type."

  - task: "Material Spending Reports API"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Comprehensive spending analysis API. GET /api/material-reports/spending with weekly/monthly periods, project filtering. Returns total spending, category_spending, site_spending, vendor_spending aggregations."

frontend:
  - task: "Materials Tab Main Screen"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/(tabs)/materials.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Created materials main screen with 4 tabs: Vendors, Materials, Inventory, Reports. Vendors tab shows vendor cards with business name, contact, GST badge, phone/email. Materials tab displays material cards with category icons, color-coded badges, unit info. Inventory tab shows site inventory with low stock alerts (red badges). Reports tab has CTA button to navigate to detailed reports."

  - task: "Material Reports Screen with Charts"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/materials/reports.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Comprehensive material reports screen with weekly/monthly spending analysis. Features: Period toggle, date navigation, project filtering, total spending dashboard. Three interactive chart sections: (1) Category-wise spending with pie chart toggle, (2) Site-wise spending with pie chart toggle, (3) Top vendors bar chart. Additional low stock alerts section at bottom. Uses react-native-chart-kit for PieChart and BarChart visualizations."

  - task: "API Services for Materials"
    implemented: true
    working: "NA"
    file: "/app/frontend/services/api.ts"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Added 8 new API service modules: vendorsAPI (getAll, getById, create, update, delete), materialsAPI (same CRUD), vendorMaterialRatesAPI (getAll, create, update), siteInventoryAPI (getAll, create, update), materialRequirementsAPI (getAll, create, update), purchaseOrdersAPI (getAll, create, update), materialTransactionsAPI (getAll, create), materialReportsAPI (getSpendingReport with params)."

metadata:
  created_by: "main_agent"
  version: "2.0"
  test_sequence: 2
  run_ui: false

test_plan:
  current_focus:
    - "Labor Report Data Endpoints"
    - "Labor Reports Screen"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "Implemented Labor Reports feature with comprehensive wage tracking and visualizations. Created reports screen at /app/frontend/app/labor/reports.tsx with: (1) Weekly/Monthly period toggle, (2) Date navigation with previous/next, (3) Project filtering dropdown, (4) Overall statistics dashboard showing total wages, workers, hours, and attendance rate, (5) Attendance distribution with pie chart toggle, (6) Site-wise wage breakdown with pie chart visualization, (7) Individual worker wage cards with detailed P/OT/A stats and Mark Paid buttons, (8) Advance payments placeholder. Installed react-native-chart-kit for pie charts. Backend APIs for workers and attendance already exist and working. Reports screen fetches data and performs client-side calculations. Ready for backend testing to verify data flow."
  - agent: "testing"
    message: "✅ BACKEND TESTING COMPLETE - Labor Reports backend data flow is fully functional! All 13 comprehensive tests passed with 100% success rate. Verified all required APIs: GET /api/workers (returns workers with base rates, skill groups, site names), GET /api/labor-attendance (returns attendance with wages_earned, hours_worked, overtime_hours), GET /api/projects (returns projects for filtering). All filtering works correctly (by project, worker, date). Authentication properly enforced. Report calculations verified for total wages, status counts, worker-wise totals, and site-wise breakdowns. Created comprehensive test data including 3 workers with different skills, 1 project, and 21 attendance records with varied patterns. Backend is ready for frontend integration. Main agent should now focus on frontend testing or summarize completion."