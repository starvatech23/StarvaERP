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
  Labor Management Module - Reporting Features:
  1. Complete the labor reports screen with weekly/monthly wage reports
  2. Site-wise labour cost breakdown with pie charts
  3. Individual labourer wage tracking with attendance statistics
  4. Advance payments tracking (placeholder)
  5. Add interactive pie chart visualizations for:
     - Site-wise wage distribution
     - Attendance status breakdown (Present/Absent/Overtime)
  Previous completed work includes profile management, company settings, quotations, excel upload, timeline views, and full labor management with attendance tracking.

backend:
  - task: "Labor Management APIs"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "All labor management APIs (workers, attendance, site transfers) are implemented and working. Endpoints include: GET/POST/PUT/DELETE for workers, GET/POST/PUT for attendance records, GET/POST for site transfers."

  - task: "Labor Report Data Endpoints"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Backend APIs for attendance and workers exist. Frontend fetches and calculates wage reports, site-wise costs, and worker statistics client-side. Need to verify data flow for reports."

frontend:
  - task: "Labor Reports Screen"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/labor/reports.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Created comprehensive labor reports screen with weekly/monthly wage reports, site-wise cost breakdown, individual worker wages with attendance statistics. Added pie chart visualizations using react-native-chart-kit for site-wise wage distribution and attendance status breakdown. Features period toggle (weekly/monthly), date navigation, project filtering, overall statistics dashboard, and detailed worker wage cards with P/OT/A tracking."

  - task: "Labor Tab Integration"
    implemented: true
    working: true
    file: "/app/frontend/app/(tabs)/labor.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Labor tab already has Reports tab integrated. Clicking on Reports tab shows a CTA that navigates to /labor/reports screen. Navigation is working correctly."

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