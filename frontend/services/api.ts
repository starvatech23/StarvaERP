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
  approve: (userId: string, action: string, roleId?: string) => 
    api.post(`/users/${userId}/approve`, { user_id: userId, action, role_id: roleId }),
  update: (userId: string, data: any) => api.put(`/users/${userId}`, data),
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
  update: (id: string, data: any) => api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  updateTeam: (id: string, teamMemberIds: string[]) => 
    api.put(`/projects/${id}/team`, { team_member_ids: teamMemberIds }),
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

// Payments API (Old - kept for compatibility)
// Replaced by enhanced paymentsAPI below

// Expenses API (Old - kept for compatibility)
// Replaced by enhanced expensesAPI below

// Notifications API
export const notificationsAPI = {
  getAll: (unreadOnly?: boolean) => api.get('/notifications', { params: { unread_only: unreadOnly } }),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/mark-all-read'),
};

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

