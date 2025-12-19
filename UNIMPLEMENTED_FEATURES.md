# Unimplemented / Incomplete Features List

## Last Updated: June 2025

---

## 1. COMMUNICATION & NOTIFICATIONS (HIGH PRIORITY)

### SMS/OTP Integration
- **Status**: MOCKED
- **Location**: `/app/backend/server.py` (lines 347-360)
- **Description**: OTP sending for phone authentication is mocked. Returns OTP in response instead of actually sending SMS.
- **Missing**: Integration with SMS gateway (Twilio, MSG91, etc.)

### WhatsApp Integration
- **Status**: MOCKED
- **Location**: `/app/backend/server.py` (lines 6741-7297)
- **Description**: WhatsApp message sending is mocked. Creates activity logs but doesn't actually send messages via WhatsApp Business API.
- **Missing**: WhatsApp Business API integration

### Email Integration
- **Status**: MOCKED
- **Location**: `/app/backend/server.py` (line 14959)
- **Description**: Email sending for PO to vendors is mocked. Logs the action but doesn't send actual emails.
- **Missing**: SMTP/SendGrid/SES integration for sending emails

### Push Notifications
- **Status**: PARTIALLY IMPLEMENTED
- **Location**: `/app/frontend/app/notifications/index.tsx`, `/app/backend/server.py` (line 5262)
- **Description**: Notification UI exists, but backend doesn't send actual push notifications.
- **Missing**: Expo Push Notifications / Firebase Cloud Messaging backend integration

---

## 2. PAYMENT & FINANCIAL INTEGRATIONS (MEDIUM PRIORITY)

### Payment Gateway Integration
- **Status**: NOT IMPLEMENTED
- **Description**: No integration with payment gateways (Razorpay, PayU, Stripe)
- **Missing**: Online payment collection for invoices

### Bank Account Verification
- **Status**: NOT IMPLEMENTED
- **Description**: Vendor bank details stored but not verified
- **Missing**: Penny drop verification API integration

### GST Validation
- **Status**: NOT IMPLEMENTED
- **Description**: GST numbers stored but not validated
- **Missing**: GST API integration for vendor GST verification

---

## 3. DOCUMENT MANAGEMENT (MEDIUM PRIORITY)

### Cloud Storage Integration
- **Status**: BASE64 ONLY
- **Location**: `/app/backend/server.py`
- **Description**: Documents stored as base64 in MongoDB
- **Missing**: AWS S3 / Google Cloud Storage integration for large file storage

### Document OCR
- **Status**: NOT IMPLEMENTED
- **Description**: No automatic text extraction from uploaded documents
- **Missing**: OCR integration for invoices, receipts, contracts

### E-Signature
- **Status**: NOT IMPLEMENTED
- **Description**: No digital signature capability for contracts/approvals
- **Missing**: DocuSign/Adobe Sign integration

---

## 4. REPORTING & ANALYTICS (MEDIUM PRIORITY)

### Advanced Reports Export
- **Status**: PARTIALLY IMPLEMENTED
- **Description**: Basic CSV/PDF export exists for estimates. Other reports (financial, labor, material) lack export functionality.
- **Missing**: Comprehensive export for all report types

### Dashboard Customization
- **Status**: NOT IMPLEMENTED
- **Description**: Fixed dashboard layout
- **Missing**: User-customizable dashboard widgets

### Scheduled Reports
- **Status**: NOT IMPLEMENTED
- **Description**: No automated report generation
- **Missing**: Scheduled email reports (daily/weekly/monthly)

---

## 5. PROJECT MANAGEMENT (LOW PRIORITY - PARTIAL)

### Gantt Chart Enhancements
- **Status**: BASIC IMPLEMENTATION
- **Location**: `/app/frontend/app/projects/[id].tsx`
- **Description**: Weekly Gantt preview implemented, but lacks:
  - Drag-and-drop task rescheduling
  - Critical path highlighting
  - Resource leveling view

### Task Dependencies Visualization
- **Status**: BACKEND ONLY
- **Description**: Task dependencies stored in backend but not visually represented
- **Missing**: Dependency arrows/lines in Gantt view

### Resource Management
- **Status**: NOT IMPLEMENTED
- **Description**: No resource allocation/capacity planning
- **Missing**: Resource calendar, workload balancing

### Project Templates
- **Status**: BACKEND ONLY
- **Location**: `/app/backend/server.py` (MILESTONE_TEMPLATES)
- **Description**: Milestone templates exist but:
  - No UI to create/edit templates
  - No template library management

---

## 6. CRM MODULE (LOW PRIORITY - PARTIAL)

### Lead Scoring
- **Status**: NOT IMPLEMENTED
- **Description**: No automatic lead scoring based on interactions
- **Missing**: ML-based or rule-based lead scoring

### Email Campaign Integration
- **Status**: NOT IMPLEMENTED
- **Description**: No bulk email/marketing automation
- **Missing**: Mailchimp/SendGrid campaign integration

### Call Recording
- **Status**: MOCKED
- **Location**: `/app/backend/server.py` (line 7411 - "telephony_provider": "mock")
- **Description**: Call logging exists but no actual call recording
- **Missing**: Telephony integration for call recording

### WhatsApp Business Automation
- **Status**: MOCKED
- **Description**: WhatsApp activities logged but not automated
- **Missing**: WhatsApp Business API for template messages, chatbots

---

## 7. LABOR MODULE (LOW PRIORITY - PARTIAL)

### Biometric Integration
- **Status**: NOT IMPLEMENTED
- **Description**: Manual attendance entry only
- **Missing**: Biometric device integration for attendance

### GPS Location Tracking
- **Status**: NOT IMPLEMENTED
- **Description**: No worker location tracking
- **Missing**: GPS check-in/check-out for site workers

### Payment Receipt Screenshot
- **Status**: PENDING USER VERIFICATION
- **Description**: Feature implemented but not verified by user

---

## 8. ADMIN & SETTINGS (LOW PRIORITY)

### User Activity Logs
- **Status**: PARTIALLY IMPLEMENTED
- **Description**: Some activity logging exists but no comprehensive audit trail
- **Missing**: Full audit log viewer in admin panel

### Backup & Restore
- **Status**: NOT IMPLEMENTED
- **Description**: No automated backup system
- **Missing**: Database backup/restore functionality

### Multi-tenancy
- **Status**: NOT IMPLEMENTED
- **Description**: Single organization setup
- **Missing**: Multi-company/tenant support

### White-labeling
- **Status**: NOT IMPLEMENTED
- **Description**: Fixed branding (StarVacon)
- **Missing**: Customizable branding per organization

---

## 9. MOBILE-SPECIFIC FEATURES

### Offline Mode
- **Status**: NOT IMPLEMENTED
- **Description**: App requires internet connection
- **Missing**: Local data caching, offline sync

### Barcode/QR Scanning
- **Status**: NOT IMPLEMENTED
- **Description**: No material tracking via barcodes
- **Missing**: Material QR code generation and scanning

### Voice Notes
- **Status**: NOT IMPLEMENTED
- **Description**: No audio recording for site notes
- **Missing**: Voice memo attachment to tasks/projects

---

## 10. INTEGRATIONS (NOT STARTED)

### Accounting Software
- **Status**: NOT IMPLEMENTED
- **Missing**: Tally, QuickBooks, Zoho Books integration

### ERP Integration
- **Status**: NOT IMPLEMENTED
- **Missing**: SAP, Oracle integration

### Government Portals
- **Status**: NOT IMPLEMENTED
- **Missing**: e-Way Bill, GST Portal integration

### Maps Integration
- **Status**: NOT IMPLEMENTED
- **Missing**: Google Maps for site location, route planning

---

## SUMMARY BY PRIORITY

### CRITICAL (Should implement soon):
1. Real SMS/OTP integration
2. Real Email integration
3. Push notifications backend

### HIGH PRIORITY:
4. Cloud storage for documents
5. Payment gateway integration
6. GST validation API

### MEDIUM PRIORITY:
7. WhatsApp Business API
8. Advanced report exports
9. Scheduled reports
10. Gantt drag-and-drop

### LOW PRIORITY (Future enhancements):
11. Lead scoring
12. Resource management
13. Offline mode
14. Multi-tenancy
15. Third-party integrations

---

## NOTES

- All "mocked" features have working UI but backend returns simulated responses
- Backend code has TODO comments at relevant locations
- Most features have proper API structure ready for real integration
- Test credentials: admin@test.com / admin123
