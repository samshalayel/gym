import api from './axios'

export const getStaff = (params) => api.get('/staff', { params })
export const getTrainers = () => api.get('/staff/trainers')
export const getStaffDetail = (id) => api.get(`/staff/${id}`)
export const getStaffAttendance = (id, params) => api.get(`/staff/${id}/attendance`, { params })
export const createStaffAttendance = (id, data) => api.post(`/staff/${id}/attendance`, data)
export const updateStaffAttendance = (id, data) => api.put(`/staff/attendance/${id}`, data)
export const createStaff = (data) => api.post('/staff', data)
export const updateStaff = (id, data) => api.put(`/staff/${id}`, data)
export const deleteStaff = (id) => api.delete(`/staff/${id}`)
