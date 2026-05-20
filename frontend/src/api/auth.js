import api from './axios'

export const login = (username, password) => api.post('/auth/login', { username, password })
export const register = (data) => api.post('/auth/register', data)
export const getMe = () => api.get('/auth/me')
export const changePassword = (current_password, new_password) =>
  api.post('/auth/change-password', { current_password, new_password })
