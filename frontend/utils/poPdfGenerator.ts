import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Platform, Alert } from 'react-native';

interface POItem {
  material_name: string;
  quantity: number;
  unit: string;
  estimated_unit_price: number;
}

interface PORequest {
  po_number: string;
  project_name?: string;
  project_code?: string;
  vendor_name?: string;
  requested_by_name?: string;
  delivery_location?: string;
  required_date?: string;
  items: POItem[];
  total_amount: number;
  status: string;
  created_at: string;
  notes?: string;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const generatePOHtml = (po: PORequest, companyName: string = 'StarVacon'): string => {
  const itemsHtml = po.items.map((item, index) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;">${index + 1}</td>
      <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;">${item.material_name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: center;">${item.quantity} ${item.unit}</td>
      <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: right;">${formatCurrency(item.estimated_unit_price)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; text-align: right;">${formatCurrency(item.quantity * item.estimated_unit_price)}</td>
    </tr>
  `).join('');

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
          font-family: 'Helvetica Neue', Arial, sans-serif;
          color: #1F2937;
          line-height: 1.5;
          padding: 40px;
          background: #fff;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 3px solid #2563EB;
        }
        .company-name {
          font-size: 28px;
          font-weight: 700;
          color: #2563EB;
        }
        .document-title {
          font-size: 24px;
          font-weight: 600;
          color: #1F2937;
          text-align: right;
        }
        .po-number {
          font-size: 16px;
          color: #6B7280;
          margin-top: 4px;
        }
        .info-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        .info-box {
          width: 48%;
          padding: 20px;
          background: #F9FAFB;
          border-radius: 8px;
        }
        .info-title {
          font-size: 12px;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }
        .info-row {
          margin-bottom: 8px;
        }
        .info-label {
          font-size: 12px;
          color: #6B7280;
        }
        .info-value {
          font-size: 14px;
          font-weight: 500;
          color: #1F2937;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .items-table th {
          background: #2563EB;
          color: white;
          padding: 14px 12px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .items-table th:nth-child(3),
        .items-table th:nth-child(4),
        .items-table th:nth-child(5) {
          text-align: right;
        }
        .items-table td {
          font-size: 14px;
        }
        .total-section {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 40px;
        }
        .total-box {
          width: 300px;
          padding: 20px;
          background: #EFF6FF;
          border-radius: 8px;
          border: 2px solid #2563EB;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .total-label {
          font-size: 14px;
          color: #6B7280;
        }
        .total-value {
          font-size: 14px;
          font-weight: 500;
        }
        .grand-total {
          border-top: 2px solid #2563EB;
          padding-top: 12px;
          margin-top: 12px;
        }
        .grand-total .total-label,
        .grand-total .total-value {
          font-size: 18px;
          font-weight: 700;
          color: #2563EB;
        }
        .notes-section {
          padding: 20px;
          background: #FFFBEB;
          border-radius: 8px;
          border-left: 4px solid #F59E0B;
          margin-bottom: 40px;
        }
        .notes-title {
          font-size: 14px;
          font-weight: 600;
          color: #92400E;
          margin-bottom: 8px;
        }
        .notes-text {
          font-size: 14px;
          color: #78350F;
        }
        .footer {
          margin-top: 60px;
          padding-top: 20px;
          border-top: 1px solid #E5E7EB;
          text-align: center;
          color: #9CA3AF;
          font-size: 12px;
        }
        .signature-section {
          display: flex;
          justify-content: space-between;
          margin-top: 60px;
        }
        .signature-box {
          width: 200px;
          text-align: center;
        }
        .signature-line {
          border-top: 1px solid #1F2937;
          padding-top: 8px;
          margin-top: 60px;
        }
        .signature-label {
          font-size: 12px;
          color: #6B7280;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .status-approved { background: #D1FAE5; color: #065F46; }
        .status-pending { background: #FEF3C7; color: #92400E; }
        .status-rejected { background: #FEE2E2; color: #991B1B; }
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
          <div class="po-number">${po.po_number}</div>
          <div class="status-badge status-${po.status === 'approved' ? 'approved' : po.status === 'rejected' ? 'rejected' : 'pending'}">
            ${po.status.replace(/_/g, ' ').toUpperCase()}
          </div>
        </div>
      </div>

      <div class="info-section">
        <div class="info-box">
          <div class="info-title">Order Details</div>
          <div class="info-row">
            <div class="info-label">Project</div>
            <div class="info-value">${po.project_name || 'N/A'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Project Code</div>
            <div class="info-value">${po.project_code || 'N/A'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Order Date</div>
            <div class="info-value">${formatDate(po.created_at)}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Required By</div>
            <div class="info-value">${formatDate(po.required_date || '')}</div>
          </div>
        </div>
        <div class="info-box">
          <div class="info-title">Delivery Information</div>
          <div class="info-row">
            <div class="info-label">Vendor</div>
            <div class="info-value">${po.vendor_name || 'To Be Assigned'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Delivery Location</div>
            <div class="info-value">${po.delivery_location || 'N/A'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Requested By</div>
            <div class="info-value">${po.requested_by_name || 'N/A'}</div>
          </div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 50px;">#</th>
            <th>Material Description</th>
            <th style="width: 120px; text-align: center;">Quantity</th>
            <th style="width: 120px; text-align: right;">Unit Price</th>
            <th style="width: 120px; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="total-section">
        <div class="total-box">
          <div class="total-row">
            <span class="total-label">Subtotal</span>
            <span class="total-value">${formatCurrency(po.total_amount)}</span>
          </div>
          <div class="total-row">
            <span class="total-label">Tax (GST)</span>
            <span class="total-value">As Applicable</span>
          </div>
          <div class="total-row grand-total">
            <span class="total-label">Grand Total</span>
            <span class="total-value">${formatCurrency(po.total_amount)}</span>
          </div>
        </div>
      </div>

      ${po.notes ? `
      <div class="notes-section">
        <div class="notes-title">Notes & Instructions</div>
        <div class="notes-text">${po.notes}</div>
      </div>
      ` : ''}

      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-line">Prepared By</div>
        </div>
        <div class="signature-box">
          <div class="signature-line">Approved By</div>
        </div>
        <div class="signature-box">
          <div class="signature-line">Received By</div>
        </div>
      </div>

      <div class="footer">
        <p>This is a computer-generated document. No signature is required.</p>
        <p style="margin-top: 8px;">Generated on ${new Date().toLocaleString('en-IN')}</p>
      </div>
    </body>
    </html>
  `;
};

export const generatePOPdf = async (po: PORequest): Promise<string | null> => {
  try {
    const html = generatePOHtml(po);
    
    // On web, printToFileAsync may not work the same way
    if (Platform.OS === 'web') {
      // Return the HTML for web - will use print dialog
      return html;
    }
    
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });
    
    // Move to a more permanent location with proper filename
    const fileName = `PO_${po.po_number.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
    const newUri = `${FileSystem.documentDirectory}${fileName}`;
    
    await FileSystem.moveAsync({
      from: uri,
      to: newUri,
    });
    
    return newUri;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return null;
  }
};

export const savePOPdf = async (po: PORequest): Promise<{ success: boolean; uri?: string; error?: string }> => {
  try {
    // On web, use browser print functionality
    if (Platform.OS === 'web') {
      const html = generatePOHtml(po);
      // Open in new window and print
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
        return { success: true };
      }
      return { success: false, error: 'Could not open print window' };
    }
    
    // On mobile
    const pdfUri = await generatePOPdf(po);
    
    if (!pdfUri) {
      return { success: false, error: 'Failed to generate PDF' };
    }
    
    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    
    if (isAvailable) {
      // On mobile, use sharing to save
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Save PO ${po.po_number}`,
        UTI: 'com.adobe.pdf',
      });
      return { success: true, uri: pdfUri };
    }
    
    return { success: false, error: 'Sharing not available on this device' };
  } catch (error: any) {
    console.error('Error saving PDF:', error);
    return { success: false, error: error.message || 'Failed to save PDF' };
  }
};

export const sharePOPdf = async (
  po: PORequest, 
  options?: { 
    title?: string; 
    message?: string;
  }
): Promise<{ success: boolean; uri?: string; error?: string }> => {
  try {
    const pdfUri = await generatePOPdf(po);
    
    if (!pdfUri) {
      return { success: false, error: 'Failed to generate PDF' };
    }
    
    const isAvailable = await Sharing.isAvailableAsync();
    
    if (!isAvailable) {
      return { success: false, error: 'Sharing not available on this device' };
    }
    
    await Sharing.shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      dialogTitle: options?.title || `Share PO ${po.po_number}`,
      UTI: 'com.adobe.pdf',
    });
    
    return { success: true, uri: pdfUri };
  } catch (error: any) {
    console.error('Error sharing PDF:', error);
    return { success: false, error: error.message || 'Failed to share PDF' };
  }
};

export const printPO = async (po: PORequest): Promise<{ success: boolean; error?: string }> => {
  try {
    const html = generatePOHtml(po);
    await Print.printAsync({ html });
    return { success: true };
  } catch (error: any) {
    console.error('Error printing PO:', error);
    return { success: false, error: error.message || 'Failed to print' };
  }
};
