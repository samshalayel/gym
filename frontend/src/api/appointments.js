import api from './axios'

export const getAppointments = (params) => api.get('/appointments', { params })
export const getTodayAppointments = () => api.get('/appointments/today')
export const getMemberAppointments = (memberId) => api.get(`/appointments/by-member/${memberId}`)
export const getAppointment = (id) => api.get(`/appointments/${id}`)
export const createAppointment = (data) => api.post('/appointments', data)
export const updateAppointment = (id, data) => api.put(`/appointments/${id}`, data)
export const deleteAppointment = (id) => api.delete(`/appointments/${id}`)
