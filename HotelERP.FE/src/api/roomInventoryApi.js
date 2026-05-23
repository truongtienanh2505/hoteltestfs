import axiosClient from './axiosClient';

export const roomInventoryApi = {
  getRooms: () => axiosClient.get('/Rooms'),

  getInventoryByRoom: (roomId) =>
    axiosClient.get(`/rooms/${roomId}/inventories`),

  addInventory: (roomId, data) =>
    axiosClient.post(`/rooms/${roomId}/inventories`, data),

  updateInventory: (roomId, inventoryId, data) =>
    axiosClient.put(`/rooms/${roomId}/inventories/${inventoryId}`, data),

  deleteInventory: (roomId, inventoryId) =>
    axiosClient.delete(`/rooms/${roomId}/inventories/${inventoryId}`),
};