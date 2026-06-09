import api from './axios'

export const getSlots = () => api.get('/schedule/slots')
export const querySchedule = (params) => api.get('/schedule/query', { params })
