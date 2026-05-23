import axiosClient from './axiosClient';

const articleApi = {
  // GET /api/Articles/search?keyword=&categoryName=
  // Chỉ trả về bài đã Published (dùng cho trang khách)
  search: (keyword = '', categoryName = '') => {
    return axiosClient.get('/Articles/search', {
      params: { keyword, categoryName }
    });
  },

  // GET /api/Articles/{slug}
  getBySlug: (slug, categorySlug) => {
    return axiosClient.get(`/Articles/${slug}`, {
      params: { categorySlug }
    });
  },

  // GET /api/Articles/admin?keyword=&categoryName=&status=ALL
  // Trả về tất cả trạng thái (dùng cho Admin)
  getAllForAdmin: (keyword = '', categoryName = '', status = 'ALL') => {
    return axiosClient.get('/Articles/admin', {
      params: { keyword, categoryName, status }
    });
  },

  // POST /api/Articles — Tạo bài viết mới (FormData vì có upload ảnh)
  // FormData fields: Title, CategoryName, Summary, Content, Tags, Status,
  //                  MetaTitle, MetaDescription, Thumbnail (IFormFile)
  create: (formData) => {
    return axiosClient.post('/Articles', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // PUT /api/Articles/{id} — Cập nhật bài viết (cùng FormData)
  update: (id, formData) => {
    return axiosClient.put(`/Articles/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // DELETE /api/Articles/{id} — Soft delete (status → INACTIVE)
  delete: (id) => {
    return axiosClient.delete(`/Articles/${id}`);
  },

  // POST /api/Articles/{id}/thumbnail — Upload ảnh bìa riêng biệt
  uploadThumbnail: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient.post(`/Articles/${id}/thumbnail`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

// ==========================================
// ARTICLE CATEGORIES API
// Route: api/ArticleCategories
// ==========================================
export const articleCategoryApi = {
  // GET /api/ArticleCategories — Lấy tất cả danh mục (Anonymous)
  getAll: () => {
    return axiosClient.get('/ArticleCategories');
  },

  // POST /api/ArticleCategories — Tạo danh mục mới
  // body: { name: string, status?: 'ACTIVE' | 'INACTIVE' }
  create: (data) => {
    return axiosClient.post('/ArticleCategories', data);
  },

  // PUT /api/ArticleCategories/{id} — Cập nhật danh mục
  // body: { name: string, status?: 'ACTIVE' | 'INACTIVE' }
  update: (id, data) => {
    return axiosClient.put(`/ArticleCategories/${id}`, data);
  },

  // DELETE /api/ArticleCategories/{id} — Xóa danh mục
  delete: (id) => {
    return axiosClient.delete(`/ArticleCategories/${id}`);
  },
};

export default articleApi;
