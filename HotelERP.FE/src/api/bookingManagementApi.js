import axiosClient from './axiosClient';

const bookingManagementApi = {
  // Lấy khách đến hôm nay
  getTodayArrivals: () => {
    return axiosClient.get('/booking-management/today-arrivals');
  },

  // Lấy khách đang lưu trú
  getInHouseGuests: () => {
    return axiosClient.get('/booking-management/in-house');
  },

  // Lấy danh sách phòng có thể check-out (hỗ trợ lọc theo ngày, không có ngày = tất cả phòng đang ở)
  getDepartures: (params = {}) => {
    return axiosClient.get('/booking-management/departures', { params });
  },

  // Lấy khách dự kiến rời đi hôm nay (backward compat)
  getTodayDepartures: () => {
    return axiosClient.get('/booking-management/departures');
  },

  // Cập nhật trạng thái cho từng phòng lẻ (Check-in, Check-out, etc.)
  updateDetailStatus: (detailId, newStatus) => {
    return axiosClient.put(`/booking-management/details/${detailId}/status`, { newStatus });
  },

  // Lấy tất cả bookings (có phân trang/lọc)
  searchBookings: (params) => {
    return axiosClient.get('/booking-management', { params });
  },

  // Cập nhật trạng thái nguyên 1 booking
  updateBookingStatus: (bookingId, newStatus) => {
    return axiosClient.put(`/booking-management/${bookingId}/status`, { newStatus });
  },

  // Đổi phòng cho khách
  changeRoom: (detailId, newRoomId) => {
    return axiosClient.put(`/booking-management/details/${detailId}/change-room`, { newRoomId });
  },

  // Nạp cọc
  addDeposit: (bookingId, amount) => {
    return axiosClient.put(`/booking-management/${bookingId}/deposit`, { amount });
  },

  // =====================================
  // DỊCH VỤ (ORDER SERVICE)
  // =====================================

  // Lấy danh sách dịch vụ ACTIVE nhóm theo danh mục
  getServices: () => {
    return axiosClient.get('/booking-management/services');
  },

  // Lấy lịch sử đơn dịch vụ của một BookingDetail (phòng cụ thể)
  getOrdersByBookingDetail: (bookingDetailId) => {
    return axiosClient.get(`/booking-management/details/${bookingDetailId}/orders`);
  },

  // Tạo đơn dịch vụ mới
  // - Khách in-house: { bookingDetailId, items: [{serviceId, quantity}], notes }
  // - Khách vãng lai POS: { bookingDetailId: null, guestName (tùy chọn), items, notes }
  createOrder: (data) => {
    return axiosClient.post('/booking-management/orders', data);
  },

  // Cập nhật trạng thái đơn: Booked → InProgress → Completed | Cancelled
  updateOrderStatus: (orderId, newStatus, notes = null) => {
    return axiosClient.put(`/booking-management/orders/${orderId}/status`, { newStatus, notes });
  },

  // Cross-check khách in-house theo số phòng (xác minh trước khi tạo đơn)
  crossCheckGuestByRoom: (roomNumber) => {
    return axiosClient.get(`/booking-management/rooms/${encodeURIComponent(roomNumber)}/in-house-guest`);
  },

  // Ghi nợ đơn dịch vụ vào folio phòng (thanh toán khi check-out)
  postOrderToFolio: (orderId) => {
    return axiosClient.post(`/booking-management/orders/${orderId}/post-to-folio`);
  },

  // Hủy một dòng dịch vụ riêng lẻ trong đơn (item-level cancel)
  cancelOrderDetail: (detailId, reason = null) => {
    return axiosClient.delete(`/booking-management/order-details/${detailId}`, {
      data: { reason },
    });
  },
};

export default bookingManagementApi;
