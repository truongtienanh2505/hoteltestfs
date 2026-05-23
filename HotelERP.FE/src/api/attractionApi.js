import axiosClient from './axiosClient';

const attractionApi = {
  getAll: () => {
    return axiosClient.get('/Attraction');
  },
  
  getById: (id) => {
    return axiosClient.get(`/Attraction/${id}`);
  },

  create: (data) => {
    // If we're uploading files, make sure the Content-Type is multipart/form-data
    return axiosClient.post('/Attraction', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  update: (id, data) => {
    return axiosClient.put(`/Attraction/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  delete: (id) => {
    return axiosClient.delete(`/Attraction/${id}`);
  },
};

export default attractionApi;
