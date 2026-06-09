import api from './axios'

export const getAttendance = (params) => api.get('/attendance', { params })
export const getEligibleAttendanceMembers = (params) => api.get('/attendance/eligible-members', { params })
export const getAllMembersForAttendance = (params) => api.get('/attendance/all-members', { params })
export const createAttendance = (data) => api.post('/attendance', data)
export const getAttendanceReport = (params) => api.get('/attendance/report', { params })
export const getAttendanceDailySummary = (params) => api.get('/attendance/daily-summary', { params })
export const getMemberAttendanceReport = (memberId) => api.get(`/attendance/report/${memberId}`)
