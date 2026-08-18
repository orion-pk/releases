import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8085/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('academy_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle expired / invalid 401 JWT token sessions
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('academy_token');
      localStorage.removeItem('academy_user');
      localStorage.removeItem('academy_login_data');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const loginApi = async (username, password) => {
  const response = await api.post('/login', { username, password });
  return response.data;
};

export const fetchLoginDataApi = async () => {
  const response = await api.get('/login-data');
  return response.data;
};

export const registerApi = async (data) => {
  const response = await api.post('/register', data);
  return response.data;
};

export const fetchUsersApi = async () => {
  const response = await api.get('/users');
  return response.data;
};

export const deleteUserApi = async (userId) => {
  const response = await api.delete(`/users?userId=${userId}`);
  return response.data;
};

export const assignRoleApi = async (userId, roleId) => {
  const response = await api.post('/assign-role', { userId, roleId });
  return response.data;
};

export const assignDirectPermissionApi = async (userId, permissionId, permissionKey) => {
  const payload = { userId };
  if (permissionKey) payload.permissionKey = permissionKey;
  if (permissionId) payload.permissionId = permissionId;
  const response = await api.post('/assign-direct-permission', payload);
  return response.data;
};

export const updateUserStatusApi = async (userId, status, phoneNumber) => {
  const response = await api.post('/update-user-status', { userId, status, phoneNumber });
  return response.data;
};

export const updateUserApi = async (data) => {
  const response = await api.post('/update-user', data);
  return response.data;
};

export const fetchVersionApi = async () => {
  const response = await api.get('/version');
  return response.data;
};

export const checkUpdateApi = async () => {
  const response = await api.get('/check-update');
  return response.data;
};

export const triggerUpdateApi = async () => {
  const response = await api.post('/trigger-update');
  return response.data;
};

export const startDownloadApi = async () => {
  const response = await api.post('/start-download');
  return response.data;
};

export const fetchDownloadProgressApi = async () => {
  const response = await api.get('/download-progress');
  return response.data;
};

export default api;
