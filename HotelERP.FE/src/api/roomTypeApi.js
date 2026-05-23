import axiosClient from './axiosClient';

const multipartConfig = {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
};

const roomTypeApi = {
  getAll: async () => {
    const response = await axiosClient.get('/roomtypes');
    return response.data?.data || [];
  },

  getById: async (id) => {
    const response = await axiosClient.get(`/roomtypes/${id}`);
    return response.data?.data || null;
  },

  create: async (formData) => {
    const response = await axiosClient.post('/roomtypes', formData, multipartConfig);
    return response.data;
  },

  update: async (id, formData) => {
    const response = await axiosClient.put(`/roomtypes/${id}`, formData, multipartConfig);
    return response.data;
  },

  remove: async (id) => {
    const response = await axiosClient.delete(`/roomtypes/${id}`);
    return response.data;
  },

  updateAmenities: async (roomTypeId, amenityIds) => {
    const response = await axiosClient.put(`/room-types/${roomTypeId}/amenities`, {
      amenityIds,
    });
    return response.data;
  },
};

export default roomTypeApi;