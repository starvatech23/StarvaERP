// CRM Lead Management API Service
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: `${API_URL}/api/crm`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await import('@react-native-async-storage/async-storage').then(m => 
      m.default.getItem('token')
    );
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ============= Lead Categories API =============
export const leadCategoriesAPI = {
  list: (includeInactive = false) => api.get('/categories', { params: { include_inactive: includeInactive } }),
  create: (data: any) => api.post('/categories', data),
  update: (id: string, data: any) => api.put(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
};

// ============= Leads API =============
export const leadsAPI = {
  list: (params?: any) => api.get('/leads', { params }),
  get: (id: string) => api.get(`/leads/${id}`),
  create: (data: any) => api.post('/leads', data),
  update: (id: string, data: any) => api.put(`/leads/${id}`, data),
  delete: (id: string) => api.delete(`/leads/${id}`),
  export: (params?: any) => api.get('/leads/export', { params }),
  import: (leads: any[], defaultCategoryId: string) => 
    api.post('/leads/import', leads, { params: { default_category_id: defaultCategoryId } }),
};

// ============= Lead Activities API =============
export const leadActivitiesAPI = {
  list: (leadId: string, params?: any) => api.get(`/leads/${leadId}/activities`, { params }),
  create: (leadId: string, data: any) => api.post(`/leads/${leadId}/activities`, data),
};

// ============= Contact Actions API =============
export const contactActionsAPI = {
  initiateCall: (leadId: string, fromNumber?: string) => 
    api.post(`/leads/${leadId}/call`, { from_number: fromNumber }),
  sendWhatsApp: (leadId: string, data: { template_name?: string; message?: string }) => 
    api.post(`/leads/${leadId}/whatsapp`, data),
};

// ============= Bulk Operations API =============
export const bulkOperationsAPI = {
  update: (leadIds: string[], updateData: any) => 
    api.post('/leads/bulk-update', { lead_ids: leadIds, update_data: updateData }),
  move: (leadIds: string[], targetCategoryId: string) => 
    api.post('/leads/bulk-move', { lead_ids: leadIds, target_category_id: targetCategoryId }),
  assign: (leadIds: string[], assignedTo: string) => 
    api.post('/leads/bulk-assign', { lead_ids: leadIds, assigned_to: assignedTo }),
};

// ============= Integration Settings API (Admin) =============
export const integrationSettingsAPI = {
  list: (providerName?: string) => api.get('/settings/integrations', { params: { provider_name: providerName } }),
  create: (data: any) => api.post('/settings/integrations', data),
  update: (id: string, data: any) => api.put(`/settings/integrations/${id}`, data),
  delete: (id: string) => api.delete(`/settings/integrations/${id}`),
};

// ============= WhatsApp Templates API =============
export const whatsappTemplatesAPI = {
  list: (params?: any) => api.get('/whatsapp-templates', { params }),
  create: (data: any) => api.post('/whatsapp-templates', data),
  update: (id: string, data: any) => api.put(`/whatsapp-templates/${id}`, data),
  delete: (id: string) => api.delete(`/whatsapp-templates/${id}`),
};

export default {
  leadCategoriesAPI,
  leadsAPI,
  leadActivitiesAPI,
  contactActionsAPI,
  bulkOperationsAPI,
  integrationSettingsAPI,
  whatsappTemplatesAPI,
};
