import axiosClient from './axiosClient';

export const equipmentApi = {
  getEquipments: (params) => axiosClient.get('/Equipments', { params }),

  getDeletedEquipments: (params) => axiosClient.get('/Equipments', {
    params: { ...params, includeDeleted: true }
  }),

  getSupplierLogs: (id) => axiosClient.get(`/Equipments/${id}/suppliers`),

  createEquipment: (data) => axiosClient.post('/Equipments', data),

  updateEquipment: (id, data) => axiosClient.put(`/Equipments/${id}`, data),

  deleteEquipment: (id) => axiosClient.delete(`/Equipments/${id}`),

  restoreEquipment: (id) => axiosClient.patch(`/Equipments/${id}/restore`),

  importExcel: (formData) => axiosClient.post('/Equipments/import-excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  exportExcel: (params) => axiosClient.get('/Equipments/export-excel', {
    responseType: 'blob',
    params
  }),
};

