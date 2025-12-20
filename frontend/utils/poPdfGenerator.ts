import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

// VERSION 3 - Complete rewrite
console.log('[PDF Generator] Version 3 loaded');

interface POItem {
  item_name?: string;
  material_name?: string;
  quantity?: number;
  unit?: string;
  estimated_unit_price?: number;
  estimated_total?: number;
}

interface PORequest {
  po_number?: string;
  request_number?: string;
  project_name?: string;
  project_code?: string;
  vendor_name?: string;
  requested_by_name?: string;
  delivery_location?: string;
  required_date?: string;
  required_by_date?: string;
  items?: POItem[];
  line_items?: POItem[];
  total_amount?: number;
  total_estimated_amount?: number;
  status?: string;
  created_at?: string;
  notes?: string;
  description?: string;
}

const formatCurrency = (amount?: number): string => {
  if (!amount || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'N/A';
  }
};

export const generatePOHtml = (po: PORequest, companyName: string = 'StarVacon'): string => {
  // Safely handle all field mappings
  const poItems = po?.items || po?.line_items || [];
  const poNumber = po?.po_number || po?.request_number || 'N/A';
  const totalAmount = po?.total_amount || po?.total_estimated_amount || 0;
  const requiredDate = po?.required_date || po?.required_by_date || '';
  const notes = po?.notes || po?.description || '';
  const status = po?.status || 'pending';
  
  console.log('[PDF] Generating HTML for PO:', poNumber, 'Items:', poItems.length);
  
  const itemsHtml = poItems.map((item, index) => {
    const itemName = item?.material_name || item?.item_name || 'Unknown Item';
    const qty = item?.quantity || 0;
    const unit = item?.unit || '';
    const unitPrice = item?.estimated_unit_price || 0;
    const amount = item?.estimated_total || (qty * unitPrice);
    return `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;">${index + 1}</td>
      <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;">${itemName}</td>
      <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: center;">${qty} ${unit}</td>
      <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: right;">${formatCurrency(unitPrice)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: right;">${formatCurrency(amount)}</td>
    </tr>
  `;
  }).join('');

  const statusClass = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending';
  const statusText = (status || 'pending').replace(/_/g, ' ').toUpperCase();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #fff;
          color: #1F2937;
          padding: 40px;
          line-height: 1.6;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 2px solid #F97316;
        }
        .company-name {
          font-size: 28px;
          font-weight: 700;
          color: #F97316;
        }
        .document-title {
          font-size: 24px;
          font-weight: 600;
          color: #374151;
        }
        .po-number {
          font-size: 18px;
          color: #6B7280;
          margin-top: 4px;
        }
        .status-badge {
          display: inline-block;
          padding: 6px 16px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          margin-top: 8px;
        }
        .status-approved { background: #D1FAE5; color: #065F46; }
        .status-pending { background: #FEF3C7; color: #92400E; }
        .status-rejected { background: #FEE2E2; color: #991B1B; }
        .info-section {
          display: flex;
          gap: 30px;
          margin-bottom: 30px;
        }
        .info-box {
          flex: 1;
          background: #F9FAFB;
          padding: 20px;
          border-radius: 12px;
        }
        .info-title {
          font-size: 14px;
          font-weight: 600;
          color: #F97316;
          margin-bottom: 12px;
          text-transform: uppercase;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .info-label {
          color: #6B7280;
          font-size: 13px;
        }
        .info-value {
          color: #1F2937;
          font-weight: 500;
          font-size: 13px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th {
          background: #F97316;
          color: white;
          padding: 14px 12px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
        }
        th:first-child { border-radius: 8px 0 0 0; }
        th:last-child { border-radius: 0 8px 0 0; text-align: right; }
        th:nth-child(3), th:nth-child(4) { text-align: center; }
        td { font-size: 13px; }
        .total-section {
          display: flex;
          justify-content: flex-end;
        }
        .total-box {
          width: 300px;
          background: #FFF7ED;
          padding: 20px;
          border-radius: 12px;
          border: 1px solid #FDBA74;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .total-label { color: #9A3412; font-size: 14px; }
        .total-value { font-weight: 600; color: #1F2937; }
        .grand-total {
          border-top: 2px solid #FDBA74;
          padding-top: 12px;
          margin-top: 8px;
        }
        .grand-total .total-label { font-weight: 700; color: #F97316; }
        .grand-total .total-value { font-size: 18px; color: #F97316; }
        .notes-section {
          background: #F3F4F6;
          padding: 20px;
          border-radius: 12px;
          margin-top: 30px;
        }
        .notes-title {
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }
        .notes-text { color: #6B7280; font-size: 13px; }
        .footer {
          margin-top: 50px;
          display: flex;
          justify-content: space-between;
        }
        .signature-box {
          width: 200px;
          text-align: center;
        }
        .signature-line {
          border-top: 1px solid #D1D5DB;
          padding-top: 8px;
          color: #6B7280;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="company-name">${companyName}</div>
          <div style="color: #6B7280; font-size: 12px; margin-top: 4px;">Construction & Infrastructure</div>
        </div>
        <div style="text-align: right;">
          <div class="document-title">PURCHASE ORDER</div>
          <div class="po-number">${poNumber}</div>
          <div class="status-badge status-${statusClass}">${statusText}</div>
        </div>
      </div>

      <div class="info-section">
        <div class="info-box">
          <div class="info-title">Order Details</div>
          <div class="info-row">
            <div class="info-label">Project</div>
            <div class="info-value">${po?.project_name || 'N/A'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Order Date</div>
            <div class="info-value">${formatDate(po?.created_at)}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Required By</div>
            <div class="info-value">${formatDate(requiredDate)}</div>
          </div>
        </div>
        <div class="info-box">
          <div class="info-title">Vendor Details</div>
          <div class="info-row">
            <div class="info-label">Vendor</div>
            <div class="info-value">${po?.vendor_name || 'N/A'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Delivery Location</div>
            <div class="info-value">${po?.delivery_location || 'N/A'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Requested By</div>
            <div class="info-value">${po?.requested_by_name || 'N/A'}</div>
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 50px;">#</th>
            <th>Item Description</th>
            <th style="width: 100px;">Quantity</th>
            <th style="width: 120px;">Unit Price</th>
            <th style="width: 120px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml || '<tr><td colspan="5" style="text-align: center; padding: 20px;">No items</td></tr>'}
        </tbody>
      </table>

      <div class="total-section">
        <div class="total-box">
          <div class="total-row">
            <span class="total-label">Subtotal</span>
            <span class="total-value">${formatCurrency(totalAmount)}</span>
          </div>
          <div class="total-row">
            <span class="total-label">Tax (GST)</span>
            <span class="total-value">As Applicable</span>
          </div>
          <div class="total-row grand-total">
            <span class="total-label">Grand Total</span>
            <span class="total-value">${formatCurrency(totalAmount)}</span>
          </div>
        </div>
      </div>

      ${notes ? `
      <div class="notes-section">
        <div class="notes-title">Notes & Instructions</div>
        <div class="notes-text">${notes}</div>
      </div>
      ` : ''}

      <div class="footer">
        <div class="signature-box">
          <div style="height: 60px;"></div>
          <div class="signature-line">Authorized Signature</div>
        </div>
        <div class="signature-box">
          <div style="height: 60px;"></div>
          <div class="signature-line">Approved By</div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const savePOPdf = async (po: PORequest): Promise<{ success: boolean; error?: string }> => {
  console.log('[PDF] savePOPdf called, Platform:', Platform.OS);
  try {
    const html = generatePOHtml(po);
    console.log('[PDF] HTML generated, calling Print.printAsync...');
    
    await Print.printAsync({ html });
    
    console.log('[PDF] Print dialog shown successfully');
    return { success: true };
  } catch (error: any) {
    console.error('[PDF] Error in savePOPdf:', error);
    return { success: false, error: error?.message || 'Failed to generate PDF' };
  }
};

export const sharePOPdf = async (po: PORequest): Promise<{ success: boolean; error?: string }> => {
  console.log('[PDF] sharePOPdf called, Platform:', Platform.OS);
  try {
    const html = generatePOHtml(po);
    
    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        return { success: true };
      }
      return { success: false, error: 'Could not open window' };
    }
    
    // Mobile - generate PDF file then share
    console.log('[PDF] Generating PDF file...');
    const { uri } = await Print.printToFileAsync({ html });
    console.log('[PDF] PDF file created at:', uri);
    
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      return { success: false, error: 'Sharing not available' };
    }
    
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('[PDF] Error in sharePOPdf:', error);
    return { success: false, error: error?.message || 'Failed to share PDF' };
  }
};

export const printPO = async (po: PORequest): Promise<{ success: boolean; error?: string }> => {
  console.log('[PDF] printPO called');
  try {
    const html = generatePOHtml(po);
    await Print.printAsync({ html });
    return { success: true };
  } catch (error: any) {
    console.error('[PDF] Error in printPO:', error);
    return { success: false, error: error?.message || 'Failed to print' };
  }
};
