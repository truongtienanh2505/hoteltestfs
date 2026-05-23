import axiosClient from "./axiosClient";

const momoPaymentApi = {
  createInvoicePayment: (invoiceId, payload = {}) =>
    axiosClient.post(`/payments/momo/invoices/${invoiceId}`, payload),

  createBookingDepositPayment: (bookingId, amount, note = "") =>
    axiosClient.post(`/payments/momo/bookings/${bookingId}/deposit`, {
      amount,
      note,
    }),

  getPaymentStatus: (paymentId) =>
    axiosClient.get(`/payments/momo/payments/${paymentId}`),
};

export default momoPaymentApi;
