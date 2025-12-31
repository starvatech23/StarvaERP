// Role Management API
export const rolesAPI = {
  getAll: (isActive?: boolean) => api.get('/roles', { params: { is_active: isActive } }),
  getById: (id: string) => api.get(`/roles/${id}`),
  create: (data: any) => api.post('/roles', data),
  update: (id: string, data: any) => api.put(`/roles/${id}`, data),
  delete: (id: string) => api.delete(`/roles/${id}`),
  getPermissions: (roleId: string) => api.get(`/roles/${roleId}/permissions`),
};

// Permission Management API
export const permissionsAPI = {
  create: (data: any) => api.post('/permissions', data),
  update: (id: string, data: any) => api.put(`/permissions/${id}`, data),
  delete: (id: string) => api.delete(`/permissions/${id}`),
};

// User Management API
export const userManagementAPI = {
  getPending: () => api.get('/users/pending'),
  getActive: () => api.get('/users/active'),
  getUser: (userId: string) => api.get(`/users/${userId}`),
  approve: (userId: string, action: string, roleId?: string) => 
    api.post(`/users/${userId}/approve`, { user_id: userId, action, role_id: roleId }),
  update: (userId: string, data: any) => api.put(`/users/${userId}`, data),
  updateUser: (userId: string, data: any) => api.put(`/users/${userId}`, data),
  createUser: (data: any) => api.post('/users/create', data),
};

// System Settings API (RBAC)
export const systemSettingsAPI = {
  getAll: () => api.get('/settings'),
  createOrUpdate: (data: any) => api.post('/settings', data),
};

// Team Management API
export const teamsAPI = {
  getAll: (isActive?: boolean) => api.get('/teams', { params: { is_active: isActive } }),
  getById: (id: string) => api.get(`/teams/${id}`),
  create: (data: any) => api.post('/teams', data),
  update: (id: string, data: any) => api.put(`/teams/${id}`, data),
  delete: (id: string) => api.delete(`/teams/${id}`),
};


import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      // Navigate to login - handled by context
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  sendOTP: (phone: string) => api.post('/auth/send-otp', { phone }),
  verifyOTP: (data: any) => api.post('/auth/verify-otp', data),
  getCurrentUser: () => api.get('/auth/me'),
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  getByRole: (role: string) => api.get(`/users/by-role/${role}`),
};

// Projects API
export const projectsAPI = {
  getAll: () => api.get('/projects'),
  getById: (id: string) => api.get(`/projects/${id}`),
  create: (data: any) => api.post('/projects', data),
  createWithTemplates: (data: any) => api.post('/projects/create-with-templates', data),
  update: (id: string, data: any) => api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  updateTeam: (id: string, teamMemberIds: string[]) => 
    api.put(`/projects/${id}/team`, { team_member_ids: teamMemberIds }),
  getBudgetSummary: (id: string) => api.get(`/projects/${id}/budget-summary`),
  getDeviationReport: (id: string) => api.get(`/projects/${id}/deviation-report`),
  sendClientCredentials: (id: string, options: any) => 
    api.post(`/projects/${id}/send-client-credentials`, options),
  getClientCredentialsHistory: (id: string) => 
    api.get(`/projects/${id}/client-credentials-history`),
};

// Project Templates API
export const templatesAPI = {
  getMilestones: () => api.get('/templates/milestones'),
  getLabourRates: () => api.get('/templates/labour-rates'),
};

// Project Templates API (Extended)
export const projectTemplatesAPI = {
  getMilestones: () => api.get('/templates/milestones'),
  getLabourRates: () => api.get('/templates/labour-rates'),
  createProjectWithTemplates: (data: any) => api.post('/projects/create-with-templates', data),
  updateProjectFloors: (projectId: string, data: any) => api.post(`/projects/${projectId}/update-floors`, data),
};

// Purchase Order Request API
export const poRequestAPI = {
  create: (data: any) => api.post('/purchase-order-requests', data),
  getAll: (params?: any) => api.get('/purchase-order-requests', { params }),
  getById: (id: string) => api.get(`/purchase-order-requests/${id}`),
  approve: (id: string, data: any) => api.post(`/purchase-order-requests/${id}/approve`, data),
  updateVendor: (id: string, data: any) => api.put(`/purchase-order-requests/${id}/vendor`, data),
  sendToVendor: (id: string, data?: any) => api.post(`/purchase-order-requests/${id}/send-to-vendor`, data || {}),
  sendToVendors: (id: string, data: any) => api.post(`/purchase-order-requests/${id}/send-to-vendors`, data),
  getStats: () => api.get('/purchase-order-requests/stats/summary'),
};

// Tasks API
export const tasksAPI = {
  getAll: (projectId?: string) => api.get('/tasks', { params: { project_id: projectId } }),
  getById: (id: string) => api.get(`/tasks/${id}`),
  create: (data: any) => api.post('/tasks', data),
  update: (id: string, data: any) => api.put(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
};

// Note: Materials and Vendors APIs moved to end of file with comprehensive material management module

// Attendance API
export const attendanceAPI = {
  getAll: (userId?: string, projectId?: string, date?: string) => 
    api.get('/attendance', { params: { user_id: userId, project_id: projectId, date } }),
  checkIn: (data: any) => api.post('/attendance/check-in', data),
  checkOut: (id: string) => api.post(`/attendance/${id}/check-out`),
};

// Work Schedule API
export const scheduleAPI = {
  getAll: (projectId?: string, date?: string) => 
    api.get('/schedules', { params: { project_id: projectId, date } }),
  create: (data: any) => api.post('/schedules', data),
  update: (id: string, data: any) => api.put(`/schedules/${id}`, data),
  delete: (id: string) => api.delete(`/schedules/${id}`),
};

// CRM APIs - Phase 2 Rebuild
export const crmLeadsAPI = {
  getAll: (params?: any) => api.get('/crm/leads', { params }),
  getById: (id: string) => api.get(`/crm/leads/${id}`),
  create: (data: any) => api.post('/crm/leads', data),
  update: (id: string, data: any) => api.put(`/crm/leads/${id}`, data),
  delete: (id: string) => api.delete(`/crm/leads/${id}`),
  bulkUpdate: (data: any) => api.post('/crm/leads/bulk-update', data),
  bulkAssign: (data: any) => api.post('/crm/leads/bulk-assign', data),
  importLeads: (leads: any[], categoryId: string) => api.post(`/crm/leads/import?default_category_id=${categoryId}`, leads),
};

export const crmActivitiesAPI = {
  getByLead: (leadId: string) => api.get(`/crm/leads/${leadId}/activities`),
  create: (leadId: string, data: any) => api.post(`/crm/leads/${leadId}/activities`, data),
  logCall: (leadId: string, data: any) => api.post(`/crm/leads/${leadId}/call`, data),
  sendWhatsApp: (leadId: string, data: any) => api.post(`/crm/leads/${leadId}/whatsapp`, data),
};

export const crmFollowUpsAPI = {
  getByLead: (leadId: string, status?: string) => 
    api.get(`/crm/leads/${leadId}/follow-ups`, { params: status ? { status } : {} }),
  create: (leadId: string, data: any) => api.post(`/crm/leads/${leadId}/follow-ups`, data),
  update: (followUpId: string, data: any) => api.put(`/crm/follow-ups/${followUpId}`, data),
  delete: (followUpId: string) => api.delete(`/crm/follow-ups/${followUpId}`),
  getDue: () => api.get('/crm/follow-ups/due'),
};

export const crmCategoriesAPI = {
  getAll: () => api.get('/crm/categories'),
  create: (data: any) => api.post('/crm/categories', data),
  update: (id: string, data: any) => api.put(`/crm/categories/${id}`, data),
  reorder: (data: any[]) => api.put('/crm/categories/reorder', data),
};

export const crmConfigAPI = {
  get: () => api.get('/crm/config'),
  update: (data: any) => api.put('/crm/config', data),
};

// CRM Dashboard Stats - See comprehensive crmDashboardAPI definition below (line ~630)

// Custom Fields
export const crmCustomFieldsAPI = {
  getAll: () => api.get('/crm/custom-fields'),
  create: (data: any) => api.post('/crm/custom-fields', data),
  update: (id: string, data: any) => api.put(`/crm/custom-fields/${id}`, data),
  delete: (id: string) => api.delete(`/crm/custom-fields/${id}`),
};

// Funnels
export const crmFunnelsAPI = {
  getAll: () => api.get('/crm/funnels'),
  getById: (id: string) => api.get(`/crm/funnels/${id}`),
  create: (data: any) => api.post('/crm/funnels', data),
  update: (id: string, data: any) => api.put(`/crm/funnels/${id}`, data),
  delete: (id: string) => api.delete(`/crm/funnels/${id}`),
  clone: (id: string, newName: string) => api.post(`/crm/funnels/${id}/clone?new_name=${encodeURIComponent(newName)}`),
  getAnalytics: (id: string) => api.get(`/crm/funnels/${id}/analytics`),
};

// Permission Matrix
export const crmPermissionsAPI = {
  getMatrix: () => api.get('/crm/permissions/matrix'),
};

// Chat/Messaging API
export const chatAPI = {
  getOrCreateConversation: (projectId: string) => api.get(`/projects/${projectId}/conversation`),
  getMessages: (conversationId: string, skip: number = 0, limit: number = 50) => 
    api.get(`/conversations/${conversationId}/messages?skip=${skip}&limit=${limit}`),
  sendMessage: (conversationId: string, data: any) => 
    api.post(`/conversations/${conversationId}/messages`, data),
  uploadAttachment: (file: any) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/messages/upload-attachment', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getUserConversations: () => api.get('/conversations'),
};

// Client Portal API (No auth required)
export const clientPortalAPI = {
  getPortalData: (projectId: string) => api.get(`/client-portal/${projectId}`),
  getMessages: (conversationId: string, skip: number = 0, limit: number = 50) => 
    api.get(`/client-portal/conversation/${conversationId}/messages?skip=${skip}&limit=${limit}`),
  sendMessage: (conversationId: string, data: any, clientName: string = 'Client') => 
    api.post(`/client-portal/conversation/${conversationId}/messages?client_name=${clientName}`, data),
};

// Lead Import/Export
export const crmImportExportAPI = {
  exportLeads: (filter: any) => api.post('/crm/leads/export', filter),
  importLeads: (importRequest: any, leadsData: any[]) => 
    api.post('/crm/leads/import', leadsData, { params: importRequest }),
};

// System Labels
export const crmSystemLabelsAPI = {
  get: () => api.get('/crm/system-labels'),
  update: (labels: any[]) => api.put('/crm/system-labels', labels),
};

// Phase 4: Move Lead to Project & Audit Logs
export const crmMoveToProjectAPI = {
  moveLeadToProject: (data: any) => api.post('/crm/leads/move-to-project', data),
  checkEligibility: (leadId: string) => api.get(`/crm/leads/${leadId}/can-convert`),
};

export const crmAuditLogsAPI = {
  getAll: (params?: any) => api.get('/crm/audit-logs', { params }),
  export: (filter: any) => api.post('/crm/audit-logs/export', filter),
};

// Payments API (Old - kept for compatibility)
// Replaced by enhanced paymentsAPI below

// Expenses API (Old - kept for compatibility)
// Replaced by enhanced expensesAPI below

// Notifications API (Old - kept for compatibility)
// Replaced by enhanced notificationsAPI below

// Activity Log API
export const activityAPI = {
  getAll: (limit?: number) => api.get('/activity', { params: { limit } }),
};


// Milestone API
export const milestonesAPI = {
  create: (data: any) => api.post('/milestones', data),
  getAll: (projectId?: string) => api.get('/milestones', { params: { project_id: projectId } }),
  getById: (id: string) => api.get(`/milestones/${id}`),
  update: (id: string, data: any) => api.put(`/milestones/${id}`, data),
  delete: (id: string) => api.delete(`/milestones/${id}`),
};

// Document API
export const documentsAPI = {
  create: (data: any) => api.post('/documents', data),
  getAll: (projectId?: string, documentType?: string) => api.get('/documents', { params: { project_id: projectId, document_type: documentType } }),
  getById: (id: string) => api.get(`/documents/${id}`),
  update: (id: string, data: any) => api.put(`/documents/${id}`, data),
  delete: (id: string) => api.delete(`/documents/${id}`),
};

// Gantt Chart API
export const ganttAPI = {
  getProjectGantt: (projectId: string) => api.get(`/projects/${projectId}/gantt`),
};


// Financial APIs
export const budgetsAPI = {
  create: (data: any) => api.post('/budgets', data),
  getAll: (projectId?: string) => api.get('/budgets', { params: { project_id: projectId } }),
  update: (id: string, data: any) => api.put(`/budgets/${id}`, data),
  delete: (id: string) => api.delete(`/budgets/${id}`),
};

export const expensesAPI = {
  create: (data: any) => api.post('/expenses', data),
  getAll: (projectId?: string, category?: string, startDate?: string, endDate?: string) => 
    api.get('/expenses', { params: { project_id: projectId, category, start_date: startDate, end_date: endDate } }),
  getById: (id: string) => api.get(`/expenses/${id}`),
  update: (id: string, data: any) => api.put(`/expenses/${id}`, data),
  delete: (id: string) => api.delete(`/expenses/${id}`),
};

export const invoicesAPI = {
  create: (data: any) => api.post('/invoices', data),
  getAll: (projectId?: string, status?: string) => api.get('/invoices', { params: { project_id: projectId, status } }),
  getById: (id: string) => api.get(`/invoices/${id}`),
  update: (id: string, data: any) => api.put(`/invoices/${id}`, data),
};

export const paymentsAPI = {
  create: (data: any) => api.post('/payments', data),
  getAll: (invoiceId?: string) => api.get('/payments', { params: { invoice_id: invoiceId } }),
};

export const financialReportsAPI = {
  getProjectReport: (projectId: string) => api.get(`/financial-reports/${projectId}`),
};


// User Management API (Admin)
export const adminUsersAPI = {
  getAll: () => api.get('/admin/users'),
  updateRole: (userId: string, role: string) => api.put(`/admin/users/${userId}/role`, { role }),
  updateStatus: (userId: string, isActive: boolean) => api.put(`/admin/users/${userId}/status`, { is_active: isActive }),
};

// Reports API
export const reportsAPI = {
  getFinancialReport: (projectId: string) => api.get(`/reports/financial/${projectId}`),
};

// Workers API
export const workersAPI = {
  getAll: (params?: any) => api.get('/workers', { params }),
  getById: (id: string) => api.get(`/workers/${id}`),
  create: (data: any) => api.post('/workers', data),
  update: (id: string, data: any) => api.put(`/workers/${id}`, data),
  delete: (id: string) => api.delete(`/workers/${id}`),
};

// Labor Attendance API
export const laborAttendanceAPI = {
  getAll: (params?: any) => api.get('/labor-attendance', { params }),
  create: (data: any) => api.post('/labor-attendance', data),
  update: (id: string, data: any) => api.put(`/labor-attendance/${id}`, data),
};

// Site Transfers API
export const siteTransfersAPI = {
  getAll: (params?: any) => api.get('/site-transfers', { params }),
  create: (data: any) => api.post('/site-transfers', data),
};

// Labour Advance Payments API
export const advancePaymentsAPI = {
  getAll: (params?: any) => api.get('/labour/advances', { params }),
  create: (data: any) => api.post('/labour/advances', data),
  approve: (id: string) => api.put(`/labour/advances/${id}/approve`),
  reject: (id: string) => api.put(`/labour/advances/${id}/reject`),
  disburse: (id: string) => api.put(`/labour/advances/${id}/disburse`),
};

// Labour Weekly Payments API
export const weeklyPaymentsAPI = {
  getAll: (params?: any) => api.get('/labour/payments', { params }),
  create: (data: any) => api.post('/labour/payments', data),
  update: (id: string, data: any) => api.put(`/labour/payments/${id}`, data),
  validate: (id: string, notes?: string) => api.post(`/labour/payments/${id}/validate`, null, { params: { validation_notes: notes } }),
  sendOTP: (id: string) => api.post(`/labour/payments/${id}/send-otp`),
  verifyOTP: (id: string, otp: string, paymentMethod: string, reference?: string) => 
    api.post(`/labour/payments/${id}/verify-otp`, null, { 
      params: { otp, payment_method: paymentMethod, payment_reference: reference } 
    }),
  uploadReceipt: (id: string, receiptImage: string) => 
    api.post(`/labour/payments/${id}/upload-receipt`, { receipt_image: receiptImage }),
  getReceipt: (id: string) => api.get(`/labour/payments/${id}/receipt`),
  getSummary: (params?: any) => api.get('/labour/payments/weekly-summary', { params }),
  generateWeekly: (weekStart: string, weekEnd: string, projectId?: string) => 
    api.post('/labour/payments/generate-weekly', null, { 
      params: { week_start: weekStart, week_end: weekEnd, project_id: projectId } 
    }),
  getByWorker: (params?: any) => api.get('/labour/payments/by-worker', { params }),
  getByProject: (params?: any) => api.get('/labour/payments/by-project', { params }),
  getWorkerReceipts: (workerId: string) => api.get(`/labour/workers/${workerId}/receipts`),
};

// Admin Config API
export const adminConfigAPI = {
  getAll: () => api.get('/admin/config'),
  getSMSConfig: () => api.get('/admin/config/sms'),
  updateSMSConfig: (data: any) => api.put('/admin/config/sms', data),
  testSMS: (phoneNumber: string) => api.post('/admin/config/test-sms', null, { params: { phone_number: phoneNumber } }),
  getWhatsAppConfig: () => api.get('/admin/config/whatsapp'),
  updateWhatsAppConfig: (data: any) => api.put('/admin/config/whatsapp', data),
  getDomainRestriction: () => api.get('/admin/config/domain-restriction'),
  updateDomainRestriction: (data: any) => api.put('/admin/config/domain-restriction', data),
};

// Vendors API
export const vendorsAPI = {
  getAll: (params?: any) => api.get('/vendors', { params }),
  getById: (id: string) => api.get(`/vendors/${id}`),
  create: (data: any) => api.post('/vendors', data),
  update: (id: string, data: any) => api.put(`/vendors/${id}`, data),
  delete: (id: string) => api.delete(`/vendors/${id}`),
  getPaymentDues: (id: string) => api.get(`/vendors/${id}/payment-dues`),
  getAllPaymentDues: () => api.get('/vendors/all/payment-dues'),
};

// Materials API
export const materialsAPI = {
  getAll: (params?: any) => api.get('/materials', { params }),
  getById: (id: string) => api.get(`/materials/${id}`),
  create: (data: any) => api.post('/materials', data),
  update: (id: string, data: any) => api.put(`/materials/${id}`, data),
  delete: (id: string) => api.delete(`/materials/${id}`),
};

// Vendor Material Rates API
export const vendorMaterialRatesAPI = {
  getAll: (params?: any) => api.get('/vendor-material-rates', { params }),
  create: (data: any) => api.post('/vendor-material-rates', data),
  update: (id: string, data: any) => api.put(`/vendor-material-rates/${id}`, data),
};

// Site Inventory API
export const siteInventoryAPI = {
  getAll: (params?: any) => api.get('/site-inventory', { params }),
  create: (data: any) => api.post('/site-inventory', data),
  update: (id: string, data: any) => api.put(`/site-inventory/${id}`, data),
};

// Inventory API (alias for material scan screen)
export const inventoryAPI = {
  getAll: (params?: any) => api.get('/site-inventory', { params }),
  createTransaction: (data: any) => api.post('/material-transactions', data),
};

// Project Contacts API
export const projectContactsAPI = {
  getAll: (projectId: string) => api.get(`/projects/${projectId}/contacts`),
  add: (projectId: string, data: any) => api.post(`/projects/${projectId}/contacts`, data),
  update: (projectId: string, index: number, data: any) => api.put(`/projects/${projectId}/contacts/${index}`, data),
  delete: (projectId: string, index: number) => api.delete(`/projects/${projectId}/contacts/${index}`),
  validate: (projectId: string) => api.post(`/projects/${projectId}/contacts/validate`),
};

// Gantt Share API
export const ganttShareAPI = {
  create: (projectId: string, data: any) => api.post(`/projects/${projectId}/gantt-share`, data),
  list: (projectId: string) => api.get(`/projects/${projectId}/gantt-share`),
  access: (projectId: string, token: string, password?: string) => 
    api.get(`/projects/${projectId}/gantt-share/${token}`, { params: { password } }),
  revoke: (projectId: string, token: string) => api.delete(`/projects/${projectId}/gantt-share/${token}`),
};

// Material Requirements API
export const materialRequirementsAPI = {
  getAll: (params?: any) => api.get('/material-requirements', { params }),
  create: (data: any) => api.post('/material-requirements', data),
  update: (id: string, data: any) => api.put(`/material-requirements/${id}`, data),
};

// Purchase Orders API
export const purchaseOrdersAPI = {
  getAll: (params?: any) => api.get('/purchase-orders', { params }),
  getById: (id: string) => api.get(`/purchase-orders/${id}`),
  create: (data: any) => api.post('/purchase-orders', data),
  update: (id: string, data: any) => api.put(`/purchase-orders/${id}`, data),
};

// Material Transactions API
export const materialTransactionsAPI = {
  getAll: (params?: any) => api.get('/material-transactions', { params }),
  create: (data: any) => api.post('/material-transactions', data),
};

// Material Reports API
export const materialReportsAPI = {
  getSpendingReport: (params?: any) => api.get('/material-reports/spending', { params }),
};

// Task Material Management API
export const taskMaterialsAPI = {
  getTemplates: (workType?: string) => api.get('/material-templates', { params: { work_type: workType } }),
  estimateMaterials: (taskId: string) => api.post(`/tasks/${taskId}/estimate-materials`),
  linkMaterials: (taskId: string, materials: any[]) => api.post(`/tasks/${taskId}/materials`, materials),
  getTaskMaterials: (taskId: string) => api.get(`/tasks/${taskId}/materials`),
  startWork: (taskId: string) => api.post(`/tasks/${taskId}/start-work`),
  consumeMaterials: (taskId: string, consumption: any[]) => api.post(`/tasks/${taskId}/consume-materials`, consumption),
  completeWork: (taskId: string, progress: number) => api.post(`/tasks/${taskId}/complete-work?progress_percentage=${progress}`),
};

// Gantt Chart API (duplicate removed - see line 213 for actual implementation)



// Budgeting & Estimation API
// Estimate Engine v2 - Quick Calculate API (new dynamic system)
export const estimateV2API = {
  quickCalculate: (data: { 
    total_area_sqft: number; 
    num_floors?: number; 
    finishing_grade?: 'economy' | 'standard' | 'premium' | 'luxury';
    project_type?: string;
  }) => api.post('/estimates/quick-calculate', data),
  getCalculationInputs: (areaSqft: number, numFloors?: number) => 
    api.get(`/estimates/calculation-inputs/${areaSqft}`, { params: { num_floors: numFloors || 1 } }),
  // Lead Estimates
  createLeadEstimate: (data: any) => api.post('/lead-estimates', data),
  getLeadEstimates: (leadId?: string) => api.get('/lead-estimates', { params: { lead_id: leadId } }),
  getLeadEstimate: (estimateId: string) => api.get(`/lead-estimates/${estimateId}`),
  updateLeadEstimateLine: (estimateId: string, lineId: string, data: { quantity?: number; rate?: number }) =>
    api.put(`/lead-estimates/${estimateId}/lines/${lineId}`, data),
  updateLeadEstimateStatus: (estimateId: string, status: string) =>
    api.put(`/lead-estimates/${estimateId}/status`, { status }),
  convertToProject: (estimateId: string, data: any) =>
    api.post(`/lead-estimates/${estimateId}/convert-to-project`, data),
};

export const estimationAPI = {
  create: (data: any) => api.post('/estimates', data),
  createFloorWise: (data: any) => api.post('/estimates/floor-wise', data),
  getById: (estimateId: string) => api.get(`/estimates/${estimateId}`),
  getByProject: (projectId: string) => api.get(`/projects/${projectId}/estimates`),
  getByLead: (leadId: string) => api.get(`/estimates/by-lead/${leadId}`),
  update: (estimateId: string, data: any) => api.put(`/estimates/${estimateId}`, data),
  updateLine: (estimateId: string, lineId: string, quantity?: number, rate?: number) => 
    api.put(`/estimates/${estimateId}/lines/${lineId}`, { quantity, rate }),
  delete: (estimateId: string) => api.delete(`/estimates/${estimateId}`),
  getRateTables: (location?: string) => api.get('/rate-tables', { params: { location } }),
  exportCSV: (estimateId: string) => api.get(`/estimates/${estimateId}/export/csv`, { responseType: 'text' }),
  exportPDF: (estimateId: string) => api.get(`/estimates/${estimateId}/export/pdf`, { responseType: 'text' }),
  getDefaultRateTable: () => api.get('/rate-tables/default'),
  updateDefaultRateTable: (data: any) => api.put('/rate-tables/default', data),
  // Review & Approval workflow
  review: (estimateId: string, comments?: string) => api.post(`/estimates/${estimateId}/review`, { comments }),
  approve: (estimateId: string, comments?: string) => api.post(`/estimates/${estimateId}/approve`, { comments }),
  removeReview: (estimateId: string) => api.delete(`/estimates/${estimateId}/review`),
  // Floor-wise estimate management
  updateFloor: (estimateId: string, floorId: string, data: any) => 
    api.put(`/estimates/${estimateId}/floors/${floorId}`, data),
  updateFloorLine: (estimateId: string, floorId: string, lineId: string, data: any) => 
    api.put(`/estimates/${estimateId}/floors/${floorId}/lines/${lineId}`, data),
  migrateToFloorWise: (estimateId: string) => api.post(`/estimates/${estimateId}/migrate-floor-wise`),
  migrateAll: () => api.post('/estimates/migrate-all'),
  // DEPRECATED: Use constructionPresetsAPI instead - kept for backward compatibility
  getMaterialPresets: () => api.get('/material-presets'),
  createPreset: (data: any) => api.post('/material-presets', data),
  getDefaultMaterialPreset: () => api.get('/material-presets/default'),
  updateDefaultMaterialPreset: (data: any) => api.put('/material-presets/default', data),
};

// Construction Presets API - Primary preset system for estimation
export const constructionPresetsAPI = {
  list: (params?: { page?: number; limit?: number; search?: string; region?: string; status?: string; material_type?: string }) => 
    api.get('/construction-presets', { params }),
  getById: (presetId: string) => api.get(`/construction-presets/${presetId}`),
  create: (data: any) => api.post('/construction-presets', data),
  update: (presetId: string, data: any) => api.put(`/construction-presets/${presetId}`, data),
  delete: (presetId: string, confirmationName: string) => 
    api.delete(`/construction-presets/${presetId}`, { params: { confirmation_name: confirmationName } }),
  duplicate: (presetId: string, newName: string, newRegion?: string) => 
    api.post(`/construction-presets/${presetId}/duplicate`, null, { params: { new_name: newName, new_region: newRegion } }),
  // Materials Library
  getMaterialsLibrary: (params?: { category?: string; region?: string; quality?: string }) =>
    api.get('/materials-library', { params }),
  getTemplates: () => api.get('/materials-library/templates'),
  loadTemplate: (templateName: string, region?: string) =>
    api.post('/materials-library/load-template', null, { params: { template_name: templateName, region } }),
  importMaterials: (presetId: string, templateName?: string, region?: string) =>
    api.post(`/construction-presets/${presetId}/import-materials`, null, { params: { template_name: templateName, region } }),
  // Upload
  uploadExcel: (file: FormData, presetId?: string) =>
    api.post('/construction-presets/upload/excel', file, { 
      headers: { 'Content-Type': 'multipart/form-data' },
      params: presetId ? { preset_id: presetId } : {}
    }),
  uploadPDF: (file: FormData) =>
    api.post('/construction-presets/upload/pdf', file, { 
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
};

// Status Updates API
export const statusUpdatesAPI = {
  create: (projectId: string, data: any) => api.post(`/projects/${projectId}/status-updates`, data),
  getByProject: (projectId: string, frequency?: string, limit?: number) => 
    api.get(`/projects/${projectId}/status-updates`, { params: { frequency, limit } }),
  getAll: (frequency?: string, limit?: number) => 
    api.get('/status-updates/all', { params: { frequency, limit } }),
  getById: (id: string) => api.get(`/status-updates/${id}`),
  update: (id: string, data: any) => api.put(`/status-updates/${id}`, data),
  delete: (id: string) => api.delete(`/status-updates/${id}`),
  getGanttData: (projectId: string, view?: string) => 
    api.get(`/projects/${projectId}/gantt-data`, { params: { view } }),
};

// Company Settings API
export const companySettingsAPI = {
  get: () => api.get('/company-settings'),
  update: (data: any) => api.put('/company-settings', data),
  uploadLogo: (formData: FormData) => api.post('/company-settings/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// Site Materials API
export const siteMaterialsAPI = {
  // Create a new site material entry
  create: (data: {
    project_id: string;
    material_type: string;
    material_id?: string;
    quantity: number;
    unit?: string;
    cost?: number;
    condition: 'new' | 'good' | 'fair' | 'damaged' | 'needs_repair';
    notes?: string;
    media_urls: string[];
  }) => api.post('/site-materials', data),
  
  // Get all site materials with optional filters
  list: (params?: {
    project_id?: string;
    status?: 'pending_review' | 'approved' | 'rejected';
    condition?: string;
    skip?: number;
    limit?: number;
  }) => api.get('/site-materials', { params }),
  
  // Get a specific site material
  getById: (materialId: string) => api.get(`/site-materials/${materialId}`),
  
  // Review (approve/reject) a site material
  review: (materialId: string, status: 'approved' | 'rejected', reviewNotes?: string) =>
    api.put(`/site-materials/${materialId}/review`, null, {
      params: { status, review_notes: reviewNotes }
    }),
  
  // Get stats for a project's site materials
  getProjectStats: (projectId: string) => api.get(`/site-materials/project/${projectId}/stats`),
};

// Material Transfers API
export const materialTransfersAPI = {
  // Create a transfer request
  create: (data: {
    site_material_id: string;
    destination_type: 'project' | 'hq' | 'maintenance';
    destination_project_id?: string;
    quantity: number;
    notes?: string;
    media_urls?: string[];
  }) => api.post('/material-transfers', data),
  
  // Get transfers (optionally by project)
  list: (params?: {
    project_id?: string;
    status?: 'pending' | 'accepted' | 'rejected' | 'cancelled';
    direction?: 'incoming' | 'outgoing';
  }) => api.get('/material-transfers', { params }),
  
  // Accept a transfer
  accept: (transferId: string) => api.post(`/material-transfers/${transferId}/accept`),
  
  // Reject a transfer
  reject: (transferId: string, reason?: string) => 
    api.post(`/material-transfers/${transferId}/reject`, null, { params: { reason } }),
  
  // Get transfer history
  getHistory: (params?: { project_id?: string; include_all_statuses?: boolean }) =>
    api.get('/material-transfers/history', { params }),
};

// Material Finance API
export const materialFinanceAPI = {
  // Get finance summary
  getSummary: (projectId?: string) => 
    api.get('/material-finance/summary', { params: { project_id: projectId } }),
  
  // Get detailed finance records
  getRecords: (params?: {
    project_id?: string;
    classification?: 'project_cost' | 'company_asset';
    skip?: number;
    limit?: number;
  }) => api.get('/material-finance/records', { params }),
};

// CRM Dashboard API
export const crmDashboardAPI = {
  // Get dashboard stats (for main dashboard widget)
  getStats: () => api.get('/crm/dashboard/stats'),
  
  // Get analytics with filters
  getAnalytics: (filters?: {
    city?: string;
    state?: string;
    status?: string;
    source?: string;
    category_id?: string;
    funnel_id?: string;
    priority?: string;
    assigned_to?: string;
    min_value?: number;
    max_value?: number;
    date_from?: string;
    date_to?: string;
  }) => api.get('/crm/dashboard/analytics', { params: filters }),
  
  // Get filter options
  getFilterOptions: () => api.get('/crm/dashboard/filters'),
};

// Notifications API
export const notificationsAPI = {
  // Get notifications for current user
  list: (params?: { skip?: number; limit?: number; unread_only?: boolean }) =>
    api.get('/notifications', { params }),
  
  // Get notification stats (total, unread, by_type)
  getStats: () => api.get('/notifications/stats'),
  
  // Mark single notification as read
  markAsRead: (notificationId: string) => api.post(`/notifications/${notificationId}/read`),
  
  // Mark all notifications as read
  markAllAsRead: () => api.post('/notifications/read-all'),
  
  // Delete a notification
  delete: (notificationId: string) => api.delete(`/notifications/${notificationId}`),
  
  // Admin: Trigger weekly review notification manually
  triggerWeeklyReview: () => api.post('/admin/trigger-weekly-review'),
  
  // Admin: Get scheduled jobs
  getScheduledJobs: () => api.get('/admin/scheduled-jobs'),
};