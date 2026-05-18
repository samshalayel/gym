import api from './axios'

export const getWorkoutTypes = (params) => api.get('/workouts/types', { params })
export const createWorkoutType = (data) => api.post('/workouts/types', data)
export const updateWorkoutType = (id, data) => api.put(`/workouts/types/${id}`, data)
export const deleteWorkoutType = (id) => api.delete(`/workouts/types/${id}`)

export const getExercises = (params) => api.get('/workouts/exercises', { params })
export const createExercise = (data) => api.post('/workouts/exercises', data)
export const updateExercise = (id, data) => api.put(`/workouts/exercises/${id}`, data)
export const deleteExercise = (id) => api.delete(`/workouts/exercises/${id}`)

export const getWorkoutPlans = (params) => api.get('/workouts/plans', { params })
export const getMemberWorkoutPlans = (memberId) => api.get(`/workouts/plans/by-member/${memberId}`)
export const createWorkoutPlan = (data) => api.post('/workouts/plans', data)
export const updateWorkoutPlan = (id, data) => api.put(`/workouts/plans/${id}`, data)
export const deleteWorkoutPlan = (id) => api.delete(`/workouts/plans/${id}`)
