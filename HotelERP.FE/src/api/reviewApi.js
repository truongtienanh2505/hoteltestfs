import axiosClient from './axiosClient';

const reviewApi = {
  getVisible: () => axiosClient.get('/Review/visible'),
  getAllForAdmin: () => axiosClient.get('/Review/admin-all'),
  create: (data) => axiosClient.post('/Review', data),
  
  // Admin moderation endpoints
  approve: (id) => axiosClient.put(`/Review/${id}/approve`),
  hide: (id, reason) => axiosClient.put(`/Review/${id}/hide`, null, {
    headers: { 'X-Audit-Reason': encodeURIComponent(reason || 'Nội dung không phù hợp') }
  }),
  delete: (id) => axiosClient.delete(`/Review/${id}`),

  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient.post('/Review/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

export default reviewApi;
