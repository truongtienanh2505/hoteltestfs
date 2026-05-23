import axiosClient from './axiosClient';

const authApi = {
  // POST /api/Auth/login — Đăng nhập bằng Email + Password
  login: (data) => {
    return axiosClient.post('/Auth/login', data);
  },

  // POST /api/Auth/register — Đăng ký tài khoản mới
  register: (data) => {
    // data: { fullName, email, password, phone? }
    return axiosClient.post('/Auth/register', data);
  },

  // POST /api/Auth/refresh-token — Làm mới Access Token bằng Refresh Token
  refreshToken: (data) => {
    // data: { accessToken, refreshToken }
    return axiosClient.post('/Auth/refresh-token', data);
  },

  // POST /api/Auth/forgot-password — Gửi OTP về email để reset mật khẩu
  forgotPassword: (data) => {
    // data: { email }
    return axiosClient.post('/Auth/forgot-password', data);
  },

  // POST /api/Auth/reset-password-otp — Đặt lại mật khẩu bằng OTP
  resetPasswordWithOtp: (data) => {
    // data: { email, otpCode, newPassword }
    return axiosClient.post('/Auth/reset-password-otp', data);
  },

  // POST /api/Auth/reset-password — Đặt lại mật khẩu bằng token link (từ email Admin)
  resetPasswordWithToken: (data) => {
    // data: { token, newPassword }
    return axiosClient.post('/Auth/reset-password', data);
  },

  // POST /api/Auth/admin/generate-reset-link — Admin tạo link reset mật khẩu cho user
  adminGenerateResetLink: (data) => {
    // data: { email } — Requires Admin role
    return axiosClient.post('/Auth/admin/generate-reset-link', data);
  },
};

export default authApi;