import api from './axios'

export const getEquipment = (params) => api.get('/equipment', { params })
export const getEquipmentDetail = (id) => api.get(`/equipment/${id}`)
export const getNeedsMaintenance = () => api.get('/equipment/needs-maintenance')
export const getEquipmentMaintenanceLogs = (id) => api.get(`/equipment/${id}/maintenance-logs`)
export const createEquipmentMaintenanceLog = (id, data) => api.post(`/equipment/${id}/maintenance-logs`, data)
export const updateEquipmentMaintenanceLog = (id, data) => api.put(`/equipment/maintenance-logs/${id}`, data)
export const createEquipment = (data) => api.post('/equipment', data)
export const updateEquipment = (id, data) => api.put(`/equipment/${id}`, data)
export const deleteEquipment = (id) => api.delete(`/equipment/${id}`)
