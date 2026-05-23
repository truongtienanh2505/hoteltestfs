import axiosClient from './axiosClient';

const userApi = {
  // Lấy danh sách tất cả người dùng
  getAll: () => {
    return axiosClient.get('/UserManagement');
  },
  
  // Thêm mới người dùng
  create: (data) => {
    return axiosClient.post('/UserManagement', data);
  },
  
  // Cập nhật thông tin (Tên, SĐT, Trạng thái)
  update: (id, data) => {
    return axiosClient.put(`/UserManagement/${id}`, data);
  },
  
  // Xóa/Khóa tài khoản
  delete: (id) => {
    return axiosClient.delete(`/UserManagement/${id}`);
  },

  // Đổi quyền (Role)
  changeRole: (id, newRoleId, reason) => {
    console.log("Đang gửi API đổi quyền với reason:", reason); // 👉 Log lý do ra Console để kiểm tra
    return axiosClient.put(`/UserManagement/${id}/change-role`, newRoleId, {
      headers: { 'Content-Type': 'application/json',
        'X-Audit-Reason': encodeURIComponent(reason)
       }
    });
  },

  // ==========================================
  // 👉 3 HÀM DÀNH CHO PHÂN QUYỀN (ROLES)
  // ==========================================
  
  // Lấy quyền của 1 cá nhân
  getUserPermissions: (userId) => {
    return axiosClient.get(`/UserManagement/${userId}/permissions`);
  },
  // Lưu quyền riêng cho cá nhân
  updateUserPermissions: (userId, permissionCodes) => {
    return axiosClient.put(`/UserManagement/${userId}/permissions`, permissionCodes);
  },
  
  // Lấy danh sách chức vụ (Dùng cho Modal Đổi Role)
  getRoles: () => {
    return axiosClient.get('/UserManagement/roles');
  },

  // Lấy danh sách chức vụ kèm theo quyền hạn chi tiết của nó
  getRolesWithPermissions: () => {
    return axiosClient.get('/UserManagement/roles-with-permissions');
  },

  // Cập nhật quyền cho một chức vụ
  updateRolePermissions: (roleId, data) => {
    return axiosClient.put(`/UserManagement/roles/${roleId}/permissions`, data);
  }
};

export default userApi;