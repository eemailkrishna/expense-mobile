import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEV_URL = 'http://10.0.2.2:8000/api';
const PROD_URL = 'https://antrikshcomputers.co.in/expense/api';

const API_BASE_URL = __DEV__ ? DEV_URL : PROD_URL;

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => client.post('/register', data),
  login: (data) => client.post('/login', data),
  logout: () => client.post('/logout'),
  user: () => client.get('/user'),
};

export const groupsAPI = {
  list: () => client.get('/groups'),
  create: (data) => client.post('/groups', data),
  show: (id) => client.get(`/groups/${id}`),
  addMember: (id, userId) => client.post(`/groups/${id}/add-member`, { user_id: userId }),
  addMemberByMobile: (id, mobile) => client.post(`/groups/${id}/add-member-mobile`, { mobile }),
  close: (id) => client.post(`/groups/${id}/close`),
  destroy: (id) => client.delete(`/groups/${id}`),
  members: (id) => client.get(`/groups/${id}/members`),
  knownUsers: () => client.get('/known-users'),
};

export const profileAPI = {
  updateName: (name) => client.post('/update-profile', { name }),
  changePassword: (data) => client.post('/change-password', data),
};

export const dashboardAPI = {
  get: () => client.get('/dashboard'),
};

export const expensesAPI = {
  create: (groupId, data) => client.post(`/groups/${groupId}/expenses`, data),
  markPaid: (expenseId) => client.post(`/expenses/${expenseId}/mark-paid`),
  destroy: (expenseId) => client.delete(`/expenses/${expenseId}`),
};

export const notificationsAPI = {
  list: () => client.get('/notifications'),
  unreadCount: () => client.get('/notifications/unread-count'),
  markAsRead: (id) => client.post(`/notifications/${id}/read`),
  markAllAsRead: () => client.post('/notifications/read-all'),
};

export default client;
