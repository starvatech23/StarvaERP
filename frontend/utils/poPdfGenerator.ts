import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Platform, Linking } from 'react-native';

console.log('[PDF Generator] Version 4 loaded - Share/Save focused');

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
  project_id?: string;
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
  const poItems = po?.items || po?.line_items || [];
  const poNumber = po?.po_number || po?.request_number || 'N/A';
  const projectId = po?.project_id || 'N/A';
  const totalAmount = po?.total_amount || po?.total_estimated_amount || 0;
  const requiredDate = po?.required_date || po?.required_by_date || '';
  const notes = po?.notes || po?.description || '';
  const status = po?.status || 'pending';
  
  const itemsHtml = poItems.map((item, index) => {
    const itemName = item?.material_name || item?.item_name || 'Unknown Item';
    const qty = item?.quantity || 0;
    const unit = item?.unit || '';
    const unitPrice = item?.estimated_unit_price || 0;
    const amount = item?.estimated_total || (qty * unitPrice);
    return `
    <tr>
      <td>${index + 1}</td>
      <td>${itemName}</td>
      <td style="text-align: center;">${qty} ${unit}</td>
      <td style="text-align: right;">${formatCurrency(unitPrice)}</td>
      <td style="text-align: right;">${formatCurrency(amount)}</td>
    </tr>`;
  }).join('');

  const statusClass = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending';
  const statusText = (status || 'pending').replace(/_/g, ' ').toUpperCase();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Purchase Order - ${poNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 30px; color: #333; font-size: 12px; }
    .header { border-bottom: 3px solid #F97316; padding-bottom: 15px; margin-bottom: 20px; }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .company { font-size: 24px; font-weight: bold; color: #F97316; }
    .company-sub { font-size: 11px; color: #666; }
    .doc-title { font-size: 20px; font-weight: bold; text-align: right; }
    .po-ref { background: #FFF7ED; border: 1px solid #F97316; padding: 10px 15px; margin-top: 10px; border-radius: 5px; }
    .po-ref-row { display: flex; justify-content: space-between; margin: 3px 0; }
    .po-ref-label { color: #666; }
    .po-ref-value { font-weight: bold; color: #F97316; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 15px; font-size: 10px; font-weight: bold; margin-top: 8px; }
    .status-approved { background: #D1FAE5; color: #065F46; }
    .status-pending { background: #FEF3C7; color: #92400E; }
    .status-rejected { background: #FEE2E2; color: #991B1B; }
    .info-grid { display: flex; gap: 20px; margin-bottom: 20px; }
    .info-box { flex: 1; background: #F9FAFB; padding: 15px; border-radius: 8px; }
    .info-title { font-weight: bold; color: #F97316; margin-bottom: 10px; font-size: 11px; text-transform: uppercase; }
    .info-row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 11px; }
    .info-label { color: #666; }
    .info-value { font-weight: 500; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #F97316; color: white; padding: 10px 8px; text-align: left; font-size: 11px; }
    td { padding: 10px 8px; border-bottom: 1px solid #E5E7EB; }
    .total-section { display: flex; justify-content: flex-end; }
    .total-box { width: 250px; background: #FFF7ED; padding: 15px; border-radius: 8px; border: 1px solid #FDBA74; }
    .total-row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 12px; }
    .grand-total { border-top: 2px solid #F97316; padding-top: 10px; margin-top: 10px; }
    .grand-total .total-value { font-size: 16px; font-weight: bold; color: #F97316; }
    .notes { background: #F3F4F6; padding: 15px; border-radius: 8px; margin-top: 20px; }
    .notes-title { font-weight: bold; margin-bottom: 5px; }
    .footer { margin-top: 40px; display: flex; justify-content: space-between; }
    .sig-box { width: 180px; text-align: center; }
    .sig-line { border-top: 1px solid #999; padding-top: 5px; font-size: 10px; color: #666; margin-top: 50px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-top">
      <div>
        <div class="company">${companyName}</div>
        <div class="company-sub">Construction & Infrastructure</div>
      </div>
      <div class="doc-title">PURCHASE ORDER</div>
    </div>
    <div class="po-ref">
      <div class="po-ref-row">
        <span class="po-ref-label">PO Reference Number:</span>
        <span class="po-ref-value">${poNumber}</span>
      </div>
      <div class="po-ref-row">
        <span class="po-ref-label">Project ID:</span>
        <span class="po-ref-value">${projectId}</span>
      </div>
      <div class="po-ref-row">
        <span class="po-ref-label">Project Name:</span>
        <span class="po-ref-value">${po?.project_name || 'N/A'}</span>
      </div>
      <div><span class="status status-${statusClass}">${statusText}</span></div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <div class="info-title">Order Details</div>
      <div class="info-row"><span class="info-label">Order Date:</span><span class="info-value">${formatDate(po?.created_at)}</span></div>
      <div class="info-row"><span class="info-label">Required By:</span><span class="info-value">${formatDate(requiredDate)}</span></div>
      <div class="info-row"><span class="info-label">Requested By:</span><span class="info-value">${po?.requested_by_name || 'N/A'}</span></div>
    </div>
    <div class="info-box">
      <div class="info-title">Vendor Details</div>
      <div class="info-row"><span class="info-label">Vendor:</span><span class="info-value">${po?.vendor_name || 'N/A'}</span></div>
      <div class="info-row"><span class="info-label">Delivery Location:</span><span class="info-value">${po?.delivery_location || 'N/A'}</span></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40px">#</th>
        <th>Item Description</th>
        <th style="width:80px;text-align:center">Qty</th>
        <th style="width:100px;text-align:right">Unit Price</th>
        <th style="width:100px;text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml || '<tr><td colspan="5" style="text-align:center">No items</td></tr>'}
    </tbody>
  </table>

  <div class="total-section">
    <div class="total-box">
      <div class="total-row"><span>Subtotal:</span><span>${formatCurrency(totalAmount)}</span></div>
      <div class="total-row"><span>Tax (GST):</span><span>As Applicable</span></div>
      <div class="total-row grand-total"><span>Grand Total:</span><span class="total-value">${formatCurrency(totalAmount)}</span></div>
    </div>
  </div>

  ${notes ? `<div class="notes"><div class="notes-title">Notes:</div><div>${notes}</div></div>` : ''}

  <div class="footer">
    <div class="sig-box"><div class="sig-line">Authorized Signature</div></div>
    <div class="sig-box"><div class="sig-line">Approved By</div></div>
  </div>
</body>
</html>`;
};

// Generate PDF and return file URI
export const generatePdfFile = async (po: PORequest): Promise<string | null> => {
  try {
    console.log('[PDF] Generating PDF file...');
    const html = generatePOHtml(po);
    const { uri } = await Print.printToFileAsync({ html });
    console.log('[PDF] PDF created at:', uri);
    return uri;
  } catch (error) {
    console.error('[PDF] Error generating PDF file:', error);
    return null;
  }
};

// Save PDF to device (shows share sheet to save)
export const savePOPdf = async (po: PORequest): Promise<{ success: boolean; error?: string }> => {
  console.log('[PDF] savePOPdf - Save to Device START');
  try {
    if (Platform.OS === 'web') {
      const html = generatePOHtml(po);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
        return { success: true };
      }
      return { success: false, error: 'Could not open window' };
    }

    // Mobile: Generate PDF file first, then share it
    console.log('[PDF] Step 1: Generating PDF file...');
    const pdfUri = await generatePdfFile(po);
    console.log('[PDF] Step 2: PDF URI =', pdfUri);
    
    if (!pdfUri) {
      console.log('[PDF] ERROR: No PDF URI returned');
      return { success: false, error: 'Failed to generate PDF file' };
    }

    console.log('[PDF] Step 3: Checking sharing availability...');
    const canShare = await Sharing.isAvailableAsync();
    console.log('[PDF] Step 4: Can share =', canShare);
    
    if (!canShare) {
      console.log('[PDF] ERROR: Sharing not available');
      return { success: false, error: 'Sharing not available on this device' };
    }

    console.log('[PDF] Step 5: Opening share dialog...');
    await Sharing.shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
    });
    console.log('[PDF] Step 6: Share dialog completed');
    
    return { success: true };
  } catch (error: any) {
    console.error('[PDF] ERROR in savePOPdf:', error?.message || error);
    return { success: false, error: error?.message || 'Failed to save PDF' };
  }
};

// Share PDF via WhatsApp
export const shareViaWhatsApp = async (po: PORequest, phoneNumber?: string): Promise<{ success: boolean; error?: string }> => {
  console.log('[PDF] shareViaWhatsApp called');
  try {
    if (Platform.OS === 'web') {
      const poNumber = po?.po_number || po?.request_number || 'PO';
      const message = `Purchase Order: ${poNumber}\nProject: ${po?.project_name || 'N/A'}\nTotal: ${formatCurrency(po?.total_amount || po?.total_estimated_amount)}`;
      const whatsappUrl = `https://wa.me/${phoneNumber || ''}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      return { success: true };
    }

    // Mobile: Generate PDF first
    console.log('[PDF] Generating PDF for WhatsApp share...');
    const pdfUri = await generatePdfFile(po);
    console.log('[PDF] PDF URI:', pdfUri);
    
    if (!pdfUri) {
      console.log('[PDF] ERROR: PDF generation failed');
      return { success: false, error: 'Failed to generate PDF' };
    }

    // Check if sharing is available
    console.log('[PDF] Checking if sharing is available...');
    const isAvailable = await Sharing.isAvailableAsync();
    console.log('[PDF] Sharing available:', isAvailable);
    
    if (!isAvailable) {
      return { success: false, error: 'Sharing not available' };
    }

    // Share the PDF - user can select WhatsApp from share sheet
    console.log('[PDF] Opening share sheet...');
    await Sharing.shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share PO via WhatsApp',
      UTI: 'com.adobe.pdf',
    });
    console.log('[PDF] Share sheet closed');

    return { success: true };
  } catch (error: any) {
    console.error('[PDF] Error sharing via WhatsApp:', error);
    return { success: false, error: error?.message || 'Failed to share' };
  }
};

// General share function
export const sharePOPdf = async (po: PORequest): Promise<{ success: boolean; error?: string }> => {
  console.log('[PDF] sharePOPdf - General Share');
  try {
    if (Platform.OS === 'web') {
      const html = generatePOHtml(po);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        return { success: true };
      }
      return { success: false, error: 'Could not open window' };
    }

    const pdfUri = await generatePdfFile(po);
    if (!pdfUri) {
      return { success: false, error: 'Failed to generate PDF' };
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      return { success: false, error: 'Sharing not available' };
    }

    await Sharing.shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
    });

    return { success: true };
  } catch (error: any) {
    console.error('[PDF] Error sharing PDF:', error);
    return { success: false, error: error?.message || 'Failed to share' };
  }
};

// Print function
export const printPO = async (po: PORequest): Promise<{ success: boolean; error?: string }> => {
  console.log('[PDF] printPO');
  try {
    const html = generatePOHtml(po);
    await Print.printAsync({ html });
    return { success: true };
  } catch (error: any) {
    console.error('[PDF] Error printing:', error);
    return { success: false, error: error?.message || 'Failed to print' };
  }
};
