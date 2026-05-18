import api from './axios'

export const getOffers = (params) => api.get('/offers', { params })
export const getActiveOffers = () => api.get('/offers/active')
export const getOffer = (id) => api.get(`/offers/${id}`)
export const createOffer = (data) => api.post('/offers', data)
export const updateOffer = (id, data) => api.put(`/offers/${id}`, data)
export const deleteOffer = (id) => api.delete(`/offers/${id}`)
