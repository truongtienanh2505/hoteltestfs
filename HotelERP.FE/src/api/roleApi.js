import axiosClient from './axiosClient'; // Đảm bảo bạn import đúng file cấu hình axios (có chứa Interceptor như slide 5 yêu cầu)

const roleApi = {
  // 1. Lấy danh sách chức vụ
  getAllRoles: () => {
    return axiosClient.get('usermanagement/roles'); // Sửa đường dẫn nếu API của bạn khác
  },

  // 2. Lấy danh sách quyền đã gom nhóm (API ta vừa làm)
  getGroupedPermissions: () => {
    return axiosClient.get('usermanagement/permissions/grouped');
  },

  // 3. Cập nhật quyền cho một chức vụ (API ta vừa làm)
  updateRolePermissions: (roleId, payload) => {
    return axiosClient.put(`usermanagement/roles/${roleId}/permissions`, payload);
  }
};

export default roleApi;