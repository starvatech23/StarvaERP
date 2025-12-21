/**
 * Web-specific utilities for browser functionality
 * Handles PDF download, printing, file operations for web platform
 */

import { Platform } from 'react-native';

// Check if running on web
export const isWeb = Platform.OS === 'web';

// Generate and download PDF as file on web
export const downloadPdfOnWeb = (html: string, filename: string = 'document.pdf'): boolean => {
  if (!isWeb) return false;
  
  try {
    // Create a new window with the HTML content
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      console.error('[Web] Popup blocked - please allow popups');
      return false;
    }
    
    // Write the HTML with print-optimized styles
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${filename}</title>
        <style>
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${html}
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
    
    return true;
  } catch (error) {
    console.error('[Web] Error downloading PDF:', error);
    return false;
  }
};

// Open WhatsApp Web with message
export const openWhatsAppWeb = (phone: string, message: string): boolean => {
  if (!isWeb) return false;
  
  try {
    // Format phone number (remove spaces, dashes, etc.)
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    return true;
  } catch (error) {
    console.error('[Web] Error opening WhatsApp:', error);
    return false;
  }
};

// Copy text to clipboard
export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (!isWeb) return false;
  
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return true;
  } catch (error) {
    console.error('[Web] Error copying to clipboard:', error);
    return false;
  }
};

// Download file from blob
export const downloadBlob = (blob: Blob, filename: string): void => {
  if (!isWeb) return;
  
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Download file from base64
export const downloadBase64 = (base64: string, filename: string, mimeType: string = 'application/octet-stream'): void => {
  if (!isWeb) return;
  
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  downloadBlob(blob, filename);
};

// Share via Web Share API (if supported)
export const webShare = async (data: { title?: string; text?: string; url?: string }): Promise<boolean> => {
  if (!isWeb) return false;
  
  try {
    if (navigator.share) {
      await navigator.share(data);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[Web] Error sharing:', error);
    return false;
  }
};

// Check if Web Share API is supported
export const canWebShare = (): boolean => {
  return isWeb && typeof navigator !== 'undefined' && !!navigator.share;
};

// Open email client
export const openEmailClient = (to: string, subject: string, body: string): boolean => {
  if (!isWeb) return false;
  
  try {
    const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl);
    return true;
  } catch (error) {
    console.error('[Web] Error opening email client:', error);
    return false;
  }
};

// Open phone dialer
export const openPhoneDialer = (phone: string): boolean => {
  if (!isWeb) return false;
  
  try {
    window.open(`tel:${phone}`);
    return true;
  } catch (error) {
    console.error('[Web] Error opening phone dialer:', error);
    return false;
  }
};

// Print current page
export const printPage = (): void => {
  if (isWeb) {
    window.print();
  }
};

// Get current URL
export const getCurrentUrl = (): string => {
  if (isWeb) {
    return window.location.href;
  }
  return '';
};

// Set page title
export const setPageTitle = (title: string): void => {
  if (isWeb) {
    document.title = title;
  }
};

// Check online status
export const isOnline = (): boolean => {
  if (isWeb) {
    return navigator.onLine;
  }
  return true;
};

// Request notification permission (web)
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isWeb || !('Notification' in window)) return false;
  
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('[Web] Error requesting notification permission:', error);
    return false;
  }
};

// Show web notification
export const showWebNotification = (title: string, options?: NotificationOptions): void => {
  if (!isWeb || !('Notification' in window)) return;
  
  if (Notification.permission === 'granted') {
    new Notification(title, options);
  }
};

// Local storage helpers
export const webStorage = {
  get: (key: string): string | null => {
    if (!isWeb) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  
  set: (key: string, value: string): boolean => {
    if (!isWeb) return false;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  
  remove: (key: string): boolean => {
    if (!isWeb) return false;
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
  
  clear: (): boolean => {
    if (!isWeb) return false;
    try {
      localStorage.clear();
      return true;
    } catch {
      return false;
    }
  }
};
