import api from './axios'

export const getMemberProgress = (memberId) => api.get(`/member-progress/by-member/${memberId}`)
export const createMemberProgress = (data) => api.post('/member-progress', data)
export const updateMemberProgress = (id, data) => api.put(`/member-progress/${id}`, data)
export const deleteMemberProgress = (id) => api.delete(`/member-progress/${id}`)
