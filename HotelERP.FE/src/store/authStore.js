import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      permissions: [],
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      login: (userData, token, refreshToken, userPermissions = []) => {
        // PHẢI GIỮ LẠI 2 DÒNG NÀY ĐỂ AXIOS (HOẶC FETCH) NHẶT TOKEN GỬI ĐI API
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refreshToken);

        set({ 
          user: userData, 
          token, 
          refreshToken, 
          permissions: userPermissions, 
          isAuthenticated: true 
        });
      },

      logout: () => {
        // DỌN SẠCH KHI ĐĂNG XUẤT ĐỂ KHÔNG BỊ KẸT
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');

        set({ 
          user: null, 
          token: null, 
          refreshToken: null, 
          permissions: [], 
          isAuthenticated: false 
        });
      },
    }),
    {
      name: 'auth-storage', // Zustand vẫn lưu backup ở đây
    }
  )
);