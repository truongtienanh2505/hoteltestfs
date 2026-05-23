import axiosClient from './axiosClient';

const voucherApi = {
  getAll: async (params) => {
    const response = await axiosClient.get('/admin/vouchers', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await axiosClient.get(`/admin/vouchers/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await axiosClient.post('/admin/vouchers', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await axiosClient.put(`/admin/vouchers/${id}`, data);
    return response.data;
  },

  disable: async (id, reason) => {
    const response = await axiosClient.patch(`/admin/vouchers/${id}/disable`, { reason });
    return response.data;
  },
};

export default voucherApi;
