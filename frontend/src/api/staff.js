import api from './axios'

export const getStaff = (params) => api.get('/staff', { params })
export const getTrainers = () => api.get('/staff/trainers')
export const getStaffDetail = (id) => api.get(`/staff/${id}`)
export const createStaff = (data) => api.post('/staff', data)
export const updateStaff = (id, data) => api.put(`/staff/${id}`, data)
export const deleteStaff = (id) => api.delete(`/staff/${id}`)
