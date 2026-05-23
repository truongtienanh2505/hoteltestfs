import axiosClient from './axiosClient';

const servicesMgmtApi = {
  // ── Services ──────────────────────────────────────────────────
  getAll: (params = {}) => axiosClient.get('/services-management', { params }),
  getById: (id) => axiosClient.get(`/services-management/${id}`),
  create: (data) => axiosClient.post('/services-management', data),
  update: (id, data) => axiosClient.put(`/services-management/${id}`, data),
  deactivate: (id) => axiosClient.delete(`/services-management/${id}`),
  hardDelete: (id) => axiosClient.delete(`/services-management/${id}/hard`),

  // ── Image Upload → Cloudinary (via backend) ───────────────────
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient.post('/services-management/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // ── Categories ────────────────────────────────────────────────
  getCategories: () => axiosClient.get('/services-management/categories'),
  createCategory: (data) => axiosClient.post('/services-management/categories', data),
  updateCategory: (id, data) => axiosClient.put(`/services-management/categories/${id}`, data),
  deleteCategory: (id) => axiosClient.delete(`/services-management/categories/${id}`),
};

export default servicesMgmtApi;
