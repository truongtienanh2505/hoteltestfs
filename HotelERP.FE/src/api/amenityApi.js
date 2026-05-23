import axiosClient from './axiosClient';

const multipartConfig = {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
};

const amenityApi = {
  getAll: async () => {
    const response = await axiosClient.get('/amenities');
    return response.data || [];
  },

  getById: async (id) => {
    const response = await axiosClient.get(`/amenities/${id}`);
    return response.data || null;
  },

  create: async (formData) => {
    const response = await axiosClient.post('/amenities', formData, multipartConfig);
    return response.data;
  },

  update: async (id, formData) => {
    const response = await axiosClient.put(`/amenities/${id}`, formData, multipartConfig);
    return response.data;
  },

  remove: async (id) => {
    const response = await axiosClient.delete(`/amenities/${id}`);
    return response.data;
  },
};

export default amenityApi;