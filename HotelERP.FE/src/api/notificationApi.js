import axiosClient from './axiosClient'; 

const notificationApi = {
  // Lấy danh sách thông báo
  getAll: () => {
    return axiosClient.get('/Notifications');
  },
  
  // Đánh dấu 1 thông báo đã đọc
  markAsRead: (id) => {
    return axiosClient.put(`/Notifications/${id}/read`);
  },

  // Đánh dấu tất cả đã đọc
  markAllAsRead: () => {
    return axiosClient.put('/Notifications/read-all');
  }
};

export default notificationApi;