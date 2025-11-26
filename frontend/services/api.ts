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
};

// Tasks API
export const tasksAPI = {
  getAll: (projectId?: string) => api.get('/tasks', { params: { project_id: projectId } }),
  getById: (id: string) => api.get(`/tasks/${id}`),
  create: (data: any) => api.post('/tasks', data),
  update: (id: string, data: any) => api.put(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
};

// Materials API
export const materialsAPI = {
  getAll: (projectId?: string) => api.get('/materials', { params: { project_id: projectId } }),
  getById: (id: string) => api.get(`/materials/${id}`),
  create: (data: any) => api.post('/materials', data),
  update: (id: string, data: any) => api.put(`/materials/${id}`, data),
  delete: (id: string) => api.delete(`/materials/${id}`),
};

// Vendors API
export const vendorsAPI = {
  getAll: () => api.get('/vendors'),
  getById: (id: string) => api.get(`/vendors/${id}`),
  create: (data: any) => api.post('/vendors', data),
  update: (id: string, data: any) => api.put(`/vendors/${id}`, data),
  delete: (id: string) => api.delete(`/vendors/${id}`),
};

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

// CRM Leads API
export const leadsAPI = {
  getAll: () => api.get('/crm/leads'),
  getById: (id: string) => api.get(`/crm/leads/${id}`),
  create: (data: any) => api.post('/crm/leads', data),
  update: (id: string, data: any) => api.put(`/crm/leads/${id}`, data),
  delete: (id: string) => api.delete(`/crm/leads/${id}`),
};

// CRM Quotations API
export const quotationsAPI = {
  getAll: (leadId?: string) => api.get('/crm/quotations', { params: { lead_id: leadId } }),
  getById: (id: string) => api.get(`/crm/quotations/${id}`),
  create: (data: any) => api.post('/crm/quotations', data),
  update: (id: string, data: any) => api.put(`/crm/quotations/${id}`, data),
  delete: (id: string) => api.delete(`/crm/quotations/${id}`),
};

// Schedules API
export const scheduleAPI = {
  getAll: (projectId?: string, date?: string) => 
    api.get('/schedules', { params: { project_id: projectId, date } }),
  create: (data: any) => api.post('/schedules', data),
  update: (id: string, data: any) => api.put(`/schedules/${id}`, data),
  delete: (id: string) => api.delete(`/schedules/${id}`),
};
