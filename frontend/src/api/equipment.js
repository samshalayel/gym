import api from './axios'

export const getEquipment = (params) => api.get('/equipment', { params })
export const getEquipmentDetail = (id) => api.get(`/equipment/${id}`)
export const getNeedsMaintenance = () => api.get('/equipment/needs-maintenance')
export const createEquipment = (data) => api.post('/equipment', data)
export const updateEquipment = (id, data) => api.put(`/equipment/${id}`, data)
export const deleteEquipment = (id) => api.delete(`/equipment/${id}`)
