# Data Export/Import Feature - Complete Guide

## Overview
The Data Export/Import feature allows administrators to bulk export and import data for the following modules:
- **Leads**: CRM leads with contact information
- **Projects**: Construction projects
- **Vendors**: Vendor/supplier information
- **Materials**: Construction materials inventory
- **Workers**: Labour/worker information

## Features

### 1. Template Download
- Download CSV templates with sample data
- Templates include all required fields
- Sample data shows expected format
- Use templates to prepare import files

### 2. Data Export
- Export existing data to CSV format
- Includes all records for selected data type
- File naming: `{datatype}_export_{timestamp}.csv`
- Empty exports return headers only

### 3. Data Import
- Import data from CSV files
- Validates data before importing
- Duplicate detection (skips existing records)
- Error reporting with row numbers
- Batch import with success/failure counts

## Access Requirements

**Admin Only**: This feature is restricted to users with the `admin` role.

## API Endpoints

### Get Export Options
```
GET /api/admin/export/list
```
Returns list of available data types with current record counts.

### Download Template
```
GET /api/admin/export/template/{data_type}
```
Downloads CSV template for specified data type.

**Parameters:**
- `data_type`: One of: leads, projects, vendors, materials, workers

**Returns:** CSV file with headers and sample data

### Export Data
```
GET /api/admin/export/{data_type}
```
Exports all existing data for specified type.

**Parameters:**
- `data_type`: One of: leads, projects, vendors, materials, workers

**Returns:** CSV file with all records

### Import Data
```
POST /api/admin/import/{data_type}
```
Imports data from uploaded CSV file.

**Parameters:**
- `data_type`: One of: leads, projects, vendors, materials, workers
- `file`: CSV file (multipart/form-data)

**Returns:**
```json
{
  "success": true,
  "message": "Import completed",
  "imported": 10,
  "skipped": 2,
  "errors": null
}
```

## CSV Templates

### Leads Template
**Fields:**
- name (required)
- primary_phone (required if no email)
- email (required if no phone)
- source (website, referral, cold_call, social_media, advertisement)
- status (new, contacted, qualified, negotiation, won, lost)
- priority (low, medium, high, urgent)
- category_id
- assigned_to (user ID)
- budget_min
- budget_max
- notes
- whatsapp_consent (true/false)
- address

### Projects Template
**Fields:**
- name (required)
- description
- status (planning, in_progress, on_hold, completed, cancelled)
- start_date (YYYY-MM-DD)
- end_date (YYYY-MM-DD)
- budget
- address
- client_name (required)
- client_phone
- client_email

### Vendors Template
**Fields:**
- name (required)
- category (concrete, steel, electrical, plumbing, hvac, finishing)
- contact_person
- phone (required if no email)
- email (required if no phone)
- address
- rating (1-5)
- gstin
- pan

### Materials Template
**Fields:**
- name (required)
- unit (required) (kg, ton, piece, meter, sq_meter, liter)
- category
- description
- unit_cost
- min_stock_level
- vendor_id

### Workers Template
**Fields:**
- name (required)
- phone (required)
- email
- skill (mason, carpenter, electrician, plumber, painter, helper)
- base_rate
- address
- aadhar_number
- emergency_contact

## Usage Instructions

### Exporting Data

1. **Access Admin Panel**
   - Login as admin
   - Navigate to Admin → Data Management

2. **Select Data Type**
   - View list of available data types
   - Check current record count

3. **Export**
   - Click "Export" button
   - File downloads automatically
   - Filename includes timestamp

### Importing Data

1. **Download Template**
   - Click "Template" button for desired data type
   - Template downloads with sample data

2. **Prepare Data**
   - Open template in spreadsheet software (Excel, Google Sheets)
   - Delete sample data row
   - Add your data following the format
   - Save as CSV

3. **Import**
   - Click "Import" button
   - Select your CSV file
   - Wait for validation and import
   - Check import summary

## Validation Rules

### Common Rules
- Required fields must not be empty
- Dates must be in ISO format (YYYY-MM-DD)
- Numbers must be valid integers or decimals
- Boolean fields accept: true/false, yes/no, 1/0

### Duplicate Detection
- **Leads**: Duplicate if same `primary_phone` exists
- **Projects**: Duplicate if same `name` exists
- **Vendors**: Duplicate if same `name` exists
- **Materials**: Duplicate if same `name` exists
- **Workers**: Duplicate if same `phone` exists

### Error Handling
- Validation errors show row number
- First 10 errors displayed in UI
- Errors prevent import (no partial imports)
- Fix errors and re-import

## Import Results

**Success Response:**
```
Import Complete
Imported: 15
Skipped (duplicates): 3
Errors: 0
```

**Validation Error Response:**
```
Import Failed
Validation failed

Errors:
Row 3: 'name' is required
Row 5: Invalid date format for start_date
Row 8: Either 'phone' or 'email' is required
```

## Best Practices

### For Export
1. Export data regularly for backups
2. Use exports to analyze data in spreadsheet tools
3. Export before major data changes

### For Import
1. Always download and use the template
2. Test with small batch first (5-10 records)
3. Validate data in spreadsheet before import
4. Check for duplicates before importing
5. Keep backup of import files

### Data Preparation
1. Remove special characters from names
2. Use consistent date format (YYYY-MM-DD)
3. Validate phone numbers (+country code)
4. Check email formats
5. Use correct enum values (status, priority, etc.)

## Troubleshooting

### Import Fails
**Problem**: Validation errors
**Solution**: 
- Check error messages for specific row numbers
- Verify required fields are filled
- Check date formats
- Validate enum values

### Duplicates Skipped
**Problem**: Records marked as duplicates
**Solution**:
- Check existing records in system
- Update existing records via UI instead
- Use different phone/email for new leads

### Template Download Fails
**Problem**: Template won't download
**Solution**:
- Check admin permissions
- Verify network connection
- Try different data type

### File Upload Fails
**Problem**: Import fails immediately
**Solution**:
- Verify file is .csv format
- Check file is not corrupted
- Ensure file size is reasonable (<10MB)

## Security

- ✅ Admin-only access (checked server-side)
- ✅ File type validation (CSV only)
- ✅ Data validation before import
- ✅ No SQL injection (using ODM)
- ✅ Duplicate prevention
- ✅ Error boundaries and try-catch blocks

## Technical Details

### Backend
- **Framework**: FastAPI
- **File Handling**: Python csv module
- **Validation**: Custom validation per data type
- **Storage**: MongoDB (Beanie ODM)

### Frontend
- **Framework**: React Native (Expo)
- **File Picker**: expo-document-picker
- **File System**: expo-file-system
- **Sharing**: expo-sharing

### File Format
- **Format**: CSV (Comma-Separated Values)
- **Encoding**: UTF-8
- **Line Endings**: LF or CRLF
- **Delimiter**: Comma (,)
- **Quote Character**: Double quote (")

## Limitations

- Maximum 10,000 records per export
- CSV files only (no Excel .xlsx support)
- No automatic field mapping
- Imports are synchronous (may be slow for large files)
- No progress indicator during import

## Future Enhancements

- [ ] Excel (.xlsx) support
- [ ] Progress indicator for large imports
- [ ] Async import processing
- [ ] Field mapping UI
- [ ] Import preview before execution
- [ ] Export filters (date range, status, etc.)
- [ ] Scheduled exports
- [ ] Import rollback feature

## Support

For issues or questions:
1. Check error messages carefully
2. Review this documentation
3. Verify data format matches template
4. Contact system administrator

## Files

**Backend:**
- `/app/backend/data_export_import.py`: Export/import logic
- `/app/backend/server.py`: API endpoints

**Frontend:**
- `/app/frontend/app/admin/data-management.tsx`: UI screen

**Templates:**
- Generated dynamically via API
- Stored in: `/app/sample_data/` (for reference)
