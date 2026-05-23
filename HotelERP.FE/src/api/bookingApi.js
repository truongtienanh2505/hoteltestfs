import axiosClient from './axiosClient';

// Base URL trên Controller C# là: api/BookingEngine
const bookingApi = {
  // 1. Tìm kiếm phòng trống
  // [HttpPost("search")]
  searchAvailableRooms: (data) => {
    return axiosClient.post('/BookingEngine/search', data);
  },

  // 2. Giữ phòng (Tạm thời)
  // [HttpPost("hold")]
  holdRoom: (data) => {
    return axiosClient.post('/BookingEngine/hold', data);
  },

  // 3. Tạo Đặt phòng nhiều phòng cùng lúc
  // [HttpPost("multi-booking")]
  createMultiBooking: (data) => {
    return axiosClient.post('/BookingEngine/multi-booking', data);
  },

  // 4. Lấy danh sách phòng trống để gán cho khách Check-in (Staff only)
  // [HttpGet("assignable-rooms/{typeId}")]
  getAssignableRooms: (typeId) => {
    return axiosClient.get(`/BookingEngine/assignable-rooms/${typeId}`);
  },

  // 4b. [Cấu trúc B] Lấy phòng vật lý còn trống theo hạng + ngày (Guest dùng được)
  // GET /api/BookingEngine/available-rooms/{typeId}?checkIn=&checkOut=
  getAvailablePhysicalRooms: (typeId, checkIn, checkOut) => {
    return axiosClient.get(`/BookingEngine/available-rooms/${typeId}`, {
      params: { checkIn, checkOut }
    });
  },

  // 5. Ép hủy đặt phòng (Dành cho Admin/Manager)
  forceCancelBooking: (id) => {
    return axiosClient.post(`/BookingEngine/force-cancel/${id}`); 
  },

  // 6. Áp dụng voucher vào booking
  // POST /api/bookings/{bookingId}/apply-voucher
  applyVoucher: (bookingId, voucherCode) => {
    return axiosClient.post(`/bookings/${bookingId}/apply-voucher`, { voucherCode });
  },

  // POST /api/bookings/{bookingId}/remove-voucher
  removeVoucher: (bookingId) => {
    return axiosClient.post(`/bookings/${bookingId}/remove-voucher`);
  },



  // Lấy voucher sinh nhật của user đang đăng nhập để dùng ngay tại màn đặt phòng
  getMyBirthdayVouchers: (subtotal = 0) => {
    return axiosClient.get('/BookingEngine/my-birthday-vouchers', {
      params: { subtotal }
    });
  },

  // 8. Kiểm tra voucher trước khi đặt (Validate)
  // POST /api/BookingEngine/validate-voucher
  validateVoucher: (code, subtotal) => {
    return axiosClient.post('/BookingEngine/validate-voucher', { code, subtotal });
  },

  // 9. Lấy voucher sinh nhật cho user đang đăng nhập (nếu hôm nay là sinh nhật)
  // GET /api/UserProfile/birthday-voucher
  getBirthdayVoucher: () => {
    return axiosClient.get('/UserProfile/birthday-voucher');
  },
};

export default bookingApi;