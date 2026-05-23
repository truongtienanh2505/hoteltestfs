import axiosClient from './axiosClient';

const invoiceApi = {
  getEligibleBookingDetails: (bookingId) =>
    axiosClient.get(`/invoices/bookings/${bookingId}/eligible-details`),

  applyVoucherToBooking: (bookingId, payload) =>
  axiosClient.post(`/invoices/bookings/${bookingId}/voucher`, payload),

getBirthdayVouchersForBooking: (bookingId) =>
  axiosClient.get(`/invoices/bookings/${bookingId}/birthday-vouchers`),

createDraftInvoice: (payload) =>

  
    axiosClient.post('/invoices/draft', payload),

  getInvoiceDetail: (invoiceId) =>
    axiosClient.get(`/invoices/${invoiceId}`),

  addExtraFee: (invoiceId, payload) =>
    axiosClient.post(`/invoices/${invoiceId}/extra-fee`, payload),

  updateDamageCharge: (invoiceId, payload) =>
    axiosClient.put(`/invoices/${invoiceId}/damage-charge`, payload),

  finalizeInvoice: (invoiceId, payload) =>
    axiosClient.post(`/invoices/${invoiceId}/finalize`, payload),

  getAllInvoices: (params) =>
    axiosClient.get('/invoices', { params }),

  // Tạo hóa đơn đã thanh toán cho khách vãng lai (walk-in service)
  createWalkInInvoice: (data) =>
    axiosClient.post('/invoices/walkin-service', data),

  getDraftInvoice: (bookingId) =>
    axiosClient.get(`/invoices/draft/${bookingId}`),

  confirmPayment: (data) =>
    axiosClient.post('/invoices/confirm', data),

  getSummary: () =>
    axiosClient.get('/invoices/summary'),
};

export { invoiceApi };
export default invoiceApi;
