import axiosClient from './axiosClient';

const userProfileApi = {
  getMyProfile: () => {
    return axiosClient.get('/UserProfile/my-profile');
  },
  
  updateProfile: (data) => {
    return axiosClient.put('/UserProfile/update-profile', data);
  },
  
  changePassword: (data) => {
    return axiosClient.put('/UserProfile/change-password', data);
  },
  
  uploadAvatar: (formData) => {
    return axiosClient.post('/UserProfile/upload-avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  getMyBookings: () => {
    return axiosClient.get('/UserProfile/my-bookings');
  },
  
  getMyNotifications: () => {
    return axiosClient.get('/UserProfile/my-notifications');
  },
  
  markAllNotificationsRead: () => {
    return axiosClient.put('/UserProfile/my-notifications/read-all');
  },
  
  redeemPoints: (points) => {
    return axiosClient.post('/UserProfile/redeem-points', points);
  },
  
  syncPoints: () => {
    return axiosClient.post('/UserProfile/sync-points');
  },
  
  getMyVouchers: () => {
    return axiosClient.get('/UserProfile/my-vouchers');
  }
};

export default userProfileApi;
