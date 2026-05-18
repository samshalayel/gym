import api from './axios'

export const getNutritionPlans = (params) => api.get('/nutrition/plans', { params })
export const getMemberNutritionPlans = (memberId) => api.get(`/nutrition/plans/by-member/${memberId}`)
export const getNutritionPlan = (id) => api.get(`/nutrition/plans/${id}`)
export const createNutritionPlan = (data) => api.post('/nutrition/plans', data)
export const updateNutritionPlan = (id, data) => api.put(`/nutrition/plans/${id}`, data)
export const deleteNutritionPlan = (id) => api.delete(`/nutrition/plans/${id}`)
