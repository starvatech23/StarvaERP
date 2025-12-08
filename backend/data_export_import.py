"""
Data Export/Import Module
Handles exporting and importing data for the admin module
"""

import csv
import json
import io
from datetime import datetime
from typing import List, Dict, Any
from bson import ObjectId

# Export Templates - Define structure for each data type
EXPORT_TEMPLATES = {
    "leads": {
        "fields": [
            "name", "primary_phone", "email", "source", "status", "priority",
            "category_id", "assigned_to", "budget_min", "budget_max",
            "notes", "whatsapp_consent", "address"
        ],
        "sample_data": {
            "name": "John Doe",
            "primary_phone": "+919876543210",
            "email": "john.doe@example.com",
            "source": "website",
            "status": "new",
            "priority": "medium",
            "category_id": "category_id_here",
            "assigned_to": "user_id_here",
            "budget_min": "1000000",
            "budget_max": "5000000",
            "notes": "Sample lead notes",
            "whatsapp_consent": "true",
            "address": "123 Sample Street, City"
        }
    },
    "projects": {
        "fields": [
            "name", "description", "status", "start_date", "end_date",
            "budget", "address", "client_name", "client_phone", "client_email"
        ],
        "sample_data": {
            "name": "Sample Project",
            "description": "Sample project description",
            "status": "planning",
            "start_date": "2024-01-01",
            "end_date": "2024-12-31",
            "budget": "10000000",
            "address": "123 Project Site, City",
            "client_name": "Client Name",
            "client_phone": "+919876543210",
            "client_email": "client@example.com"
        }
    },
    "vendors": {
        "fields": [
            "name", "category", "contact_person", "phone", "email",
            "address", "rating", "gstin", "pan"
        ],
        "sample_data": {
            "name": "ABC Suppliers Pvt Ltd",
            "category": "concrete",
            "contact_person": "Manager Name",
            "phone": "+919876543210",
            "email": "contact@abc.com",
            "address": "123 Vendor Street, City",
            "rating": "4",
            "gstin": "27AABCU9603R1ZM",
            "pan": "AABCU9603R"
        }
    },
    "materials": {
        "fields": [
            "name", "unit", "category", "description", "unit_cost",
            "min_stock_level", "vendor_id"
        ],
        "sample_data": {
            "name": "Cement",
            "unit": "kg",
            "category": "concrete",
            "description": "Portland Cement Grade 53",
            "unit_cost": "350",
            "min_stock_level": "100",
            "vendor_id": "vendor_id_here"
        }
    },
    "workers": {
        "fields": [
            "name", "phone", "email", "skill", "base_rate",
            "address", "aadhar_number", "emergency_contact"
        ],
        "sample_data": {
            "name": "Worker Name",
            "phone": "+919876543210",
            "email": "worker@example.com",
            "skill": "mason",
            "base_rate": "800",
            "address": "123 Worker Street, City",
            "aadhar_number": "123456789012",
            "emergency_contact": "+919876543211"
        }
    }
}

def generate_csv_template(data_type: str) -> str:
    """Generate CSV template for a specific data type"""
    if data_type not in EXPORT_TEMPLATES:
        raise ValueError(f"Unknown data type: {data_type}")
    
    template = EXPORT_TEMPLATES[data_type]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=template["fields"])
    
    # Write header
    writer.writeheader()
    
    # Write sample data row
    writer.writerow(template["sample_data"])
    
    return output.getvalue()

def export_data_to_csv(data: List[Dict[str, Any]], fields: List[str]) -> str:
    """Export data to CSV format"""
    output = io.StringIO()
    
    if not data:
        # Return empty CSV with headers
        writer = csv.DictWriter(output, fieldnames=fields)
        writer.writeheader()
        return output.getvalue()
    
    writer = csv.DictWriter(output, fieldnames=fields, extrasaction='ignore')
    writer.writeheader()
    
    for row in data:
        # Convert ObjectId to string
        clean_row = {}
        for field in fields:
            value = row.get(field)
            if isinstance(value, ObjectId):
                clean_row[field] = str(value)
            elif isinstance(value, datetime):
                clean_row[field] = value.isoformat()
            elif isinstance(value, bool):
                clean_row[field] = str(value).lower()
            elif value is None:
                clean_row[field] = ""
            else:
                clean_row[field] = str(value)
        
        writer.writerow(clean_row)
    
    return output.getvalue()

def parse_csv_import(file_content: str, data_type: str) -> List[Dict[str, Any]]:
    """Parse CSV file for import"""
    if data_type not in EXPORT_TEMPLATES:
        raise ValueError(f"Unknown data type: {data_type}")
    
    template = EXPORT_TEMPLATES[data_type]
    expected_fields = set(template["fields"])
    
    # Parse CSV
    input_stream = io.StringIO(file_content)
    reader = csv.DictReader(input_stream)
    
    # Validate headers
    if not reader.fieldnames:
        raise ValueError("CSV file is empty or has no headers")
    
    file_fields = set(reader.fieldnames)
    missing_fields = expected_fields - file_fields
    
    if missing_fields:
        raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")
    
    # Parse rows
    parsed_data = []
    for i, row in enumerate(reader, start=2):  # Start at 2 (after header)
        try:
            parsed_row = parse_csv_row(row, data_type)
            parsed_row["_import_row"] = i  # Track row number for error reporting
            parsed_data.append(parsed_row)
        except ValueError as e:
            raise ValueError(f"Error in row {i}: {str(e)}")
    
    return parsed_data

def parse_csv_row(row: Dict[str, str], data_type: str) -> Dict[str, Any]:
    """Parse a single CSV row based on data type"""
    parsed = {}
    
    for key, value in row.items():
        if not value or value.strip() == "":
            parsed[key] = None
            continue
        
        value = value.strip()
        
        # Type conversions based on field name
        if key.endswith("_date") or key in ["start_date", "end_date"]:
            try:
                parsed[key] = datetime.fromisoformat(value)
            except:
                raise ValueError(f"Invalid date format for {key}: {value}")
        
        elif key in ["budget", "budget_min", "budget_max", "unit_cost", "base_rate", "min_stock_level", "rating"]:
            try:
                parsed[key] = float(value) if "." in value else int(value)
            except:
                raise ValueError(f"Invalid number format for {key}: {value}")
        
        elif key in ["whatsapp_consent"]:
            parsed[key] = value.lower() in ["true", "yes", "1"]
        
        else:
            parsed[key] = value
    
    return parsed

def validate_import_data(data: List[Dict[str, Any]], data_type: str) -> List[str]:
    """Validate imported data and return list of errors"""
    errors = []
    
    for i, row in enumerate(data, start=1):
        row_num = row.get("_import_row", i)
        
        # Required field validation
        if data_type == "leads":
            if not row.get("name"):
                errors.append(f"Row {row_num}: 'name' is required")
            if not row.get("primary_phone") and not row.get("email"):
                errors.append(f"Row {row_num}: Either 'primary_phone' or 'email' is required")
        
        elif data_type == "projects":
            if not row.get("name"):
                errors.append(f"Row {row_num}: 'name' is required")
            if not row.get("client_name"):
                errors.append(f"Row {row_num}: 'client_name' is required")
        
        elif data_type == "vendors":
            if not row.get("name"):
                errors.append(f"Row {row_num}: 'name' is required")
            if not row.get("phone") and not row.get("email"):
                errors.append(f"Row {row_num}: Either 'phone' or 'email' is required")
        
        elif data_type == "materials":
            if not row.get("name"):
                errors.append(f"Row {row_num}: 'name' is required")
            if not row.get("unit"):
                errors.append(f"Row {row_num}: 'unit' is required")
        
        elif data_type == "workers":
            if not row.get("name"):
                errors.append(f"Row {row_num}: 'name' is required")
            if not row.get("phone"):
                errors.append(f"Row {row_num}: 'phone' is required")
    
    return errors
