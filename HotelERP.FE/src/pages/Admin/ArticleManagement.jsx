import React, { useState, useEffect, useCallback } from 'react';
import {
  Button, Input, Select, Tag, Popconfirm, message, Form,
  Upload, Modal, Tabs, Badge, Tooltip, Drawer, Divider, Row, Col, Empty, Spin
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  EyeOutlined, FileTextOutlined, CheckCircleOutlined,
  ClockCircleOutlined, InboxOutlined, GlobalOutlined,
  TagOutlined, CalendarOutlined, PictureOutlined
} from '@ant-design/icons';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import articleApi, { articleCategoryApi } from '../../api/articleApi';
import { useAuthStore } from '../../store/authStore';

const { TextArea } = Input;
const { Option } = Select;

// ── Status helpers ─────────────────────────────────────────────
const STATUS_CONFIG = {
  Published: { color: '#16a34a', bg: '#dcfce7', label: 'Đã xuất bản', icon: <CheckCircleOutlined /> },
  'Pending Review': { color: '#d97706', bg: '#fef3c7', label: 'Chờ duyệt', icon: <ClockCircleOutlined /> },
  Draft: { color: '#6b7280', bg: '#f3f4f6', label: 'Bản nháp', icon: <InboxOutlined /> },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Draft;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.5px',
      padding: '3px 10px', borderRadius: 20,
      color: cfg.color, background: cfg.bg,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Article Card (Grid View) ────────────────────────────────────
function ArticleCard({ article, onEdit, onDelete, onPreview }) {
  const [hovered, setHovered] = useState(false);
  const fallback = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'white', borderRadius: 12, overflow: 'hidden',
        border: `1px solid ${hovered ? '#b8956a' : '#e5e7eb'}`,
        boxShadow: hovered ? '0 8px 30px rgba(0,0,0,0.1)' : '0 1px 6px rgba(0,0,0,0.05)',
        transition: 'all 250ms ease', display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Thumbnail */}
      <div style={{ height: 160, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        <img
          src={article.thumbnailUrl || fallback}
          alt={article.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 400ms', transform: hovered ? 'scale(1.05)' : 'scale(1)' }}
        />
        <div style={{ position: 'absolute', top: 10, left: 10 }}>
          <StatusBadge status={article.status} />
        </div>
        {/* Category tags — nhiều chuyên mục */}
        {article.categoryNames?.length > 0 && (
          <div style={{ position: 'absolute', bottom: 10, right: 10, display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' }}>
            {article.categoryNames.slice(0, 2).map((cat, i) => (
              <span key={i} style={{ background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 9, padding: '2px 7px', borderRadius: 4, fontWeight: 600 }}>{cat}</span>
            ))}
            {article.categoryNames.length > 2 && (
              <span style={{ background: 'rgba(184,149,106,0.8)', color: 'white', fontSize: 9, padding: '2px 7px', borderRadius: 4, fontWeight: 600 }}>+{article.categoryNames.length - 2}</span>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{
          fontSize: 14, fontWeight: 600, color: '#111', margin: '0 0 6px',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
        }}>
          {article.title}
        </h3>
        {article.summary && (
          <p style={{
            fontSize: 12, color: '#71717a', lineHeight: 1.6, margin: '0 0 10px',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
          }}>
            {article.summary}
          </p>
        )}
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4 }}>
            <CalendarOutlined /> {formatDate(article.publishedAt || article.createdAt)}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <Tooltip title="Xem trước">
              <Button size="small" type="text" icon={<EyeOutlined />} onClick={() => onPreview(article)} />
            </Tooltip>
            <Tooltip title="Chỉnh sửa">
              <Button size="small" type="text" icon={<EditOutlined />} style={{ color: '#1890ff' }} onClick={() => onEdit(article)} />
            </Tooltip>
            <Popconfirm
              title="Xóa bài viết này?"
              description="Hành động này không thể hoàn tác."
              onConfirm={() => onDelete(article.id)}
              okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
            >
              <Tooltip title="Xóa">
                <Button size="small" type="text" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────
export default function ArticleManagement() {
  const [articles, setArticles] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [categories, setCategories] = useState([]);

  // Preview
  const [previewArticle, setPreviewArticle] = useState(null);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await articleApi.getAllForAdmin('', '', 'ALL');
      const data = res.data || [];
      setArticles(data);
    } catch {
      // message.error('Lỗi khi tải danh sách bài viết!');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await articleCategoryApi.getAll();
      setCategories(res.data || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchArticles(); fetchCategories(); }, []);

  // Real-time: tự động làm mới mỗi 30 giây
  useEffect(() => {
    const timer = setInterval(() => { fetchArticles(); }, 30000);
    return () => clearInterval(timer);
  }, [fetchArticles]);

  // Client-side filter
  useEffect(() => {
    let list = [...articles];
    if (search) list = list.filter(a => a.title?.toLowerCase().includes(search.toLowerCase()) || a.summary?.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== 'ALL') list = list.filter(a => a.status === statusFilter);
    // Lọc nhiều chuyên mục: bài viết có ít nhất 1 chuyên mục khớp
    if (categoryFilter !== 'ALL') list = list.filter(a =>
      (a.categoryNames || []).includes(categoryFilter)
    );
    setFiltered(list);
  }, [articles, search, statusFilter, categoryFilter]);

  // Stats
  const stats = {
    total: articles.length,
    published: articles.filter(a => a.status === 'Published').length,
    pending: articles.filter(a => a.status === 'Pending Review').length,
    draft: articles.filter(a => a.status === 'Draft').length,
  };

  const openAdd = () => {
    setEditingId(null);
    form.resetFields();
    setFileList([]);
    setDrawerOpen(true);
  };

  const openEdit = async (record) => {
    setLoading(true);
    try {
      const res = await articleApi.getBySlug(record.slug);
      const d = res.data;
      setEditingId(d.id);
      form.setFieldsValue({
        Title: d.title,
        // Đọc danh sách nhiều chuyên mục
        CategoryNames: d.categoryNames || (d.categoryName ? [d.categoryName] : []),
        Summary: d.summary,
        Content: d.content,
        Tags: d.tags ? d.tags.split(',').map(t => t.trim()) : [],
        Status: d.status || 'Draft',
        MetaTitle: d.metaTitle,
        MetaDescription: d.metaDescription,
      });
      if (d.thumbnailUrl) {
        setFileList([{ uid: '-1', name: 'thumbnail.png', status: 'done', url: d.thumbnailUrl }]);
      } else {
        setFileList([]);
      }
      setDrawerOpen(true);
    } catch {
      message.error('Không thể tải chi tiết bài viết');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await articleApi.delete(id);
      message.success('Đã xóa bài viết!');
      fetchArticles();
    } catch {
      message.error('Lỗi khi xóa bài viết');
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const formData = new FormData();
      formData.append('Title', values.Title);

      // Gửi CategoryNames dạng JSON string — ASP.NET bind List<string> chính xác hơn
      const catNames = values.CategoryNames || [];
      formData.append('CategoryNamesJson', JSON.stringify(catNames));

      if (values.Summary) formData.append('Summary', values.Summary);
      if (values.Content) formData.append('Content', values.Content);
      if (values.Tags?.length) formData.append('Tags', values.Tags.join(', '));
      if (values.Status) formData.append('Status', values.Status);
      if (values.MetaTitle) formData.append('MetaTitle', values.MetaTitle);
      if (values.MetaDescription) formData.append('MetaDescription', values.MetaDescription);
      if (fileList.length && fileList[0].originFileObj) formData.append('Thumbnail', fileList[0].originFileObj);

      setSaving(true);
      if (editingId) {
        await articleApi.update(editingId, formData);
        message.success('Cập nhật bài viết thành công!');
      } else {
        await articleApi.create(formData);
        message.success('Đã tạo bài viết mới!');
      }
      setDrawerOpen(false);
      fetchArticles();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu bài viết!');
    } finally {
      setSaving(false);
    }
  };

  const tabItems = [
    { key: 'ALL', label: <span>Tất cả <Badge count={stats.total} showZero color="#6b7280" /></span> },
    { key: 'Published', label: <span>Đã xuất bản <Badge count={stats.published} showZero color="#16a34a" /></span> },
    { key: 'Pending Review', label: <span>Chờ duyệt <Badge count={stats.pending} showZero color="#d97706" /></span> },
    { key: 'Draft', label: <span>Bản nháp <Badge count={stats.draft} showZero color="#6b7280" /></span> },
  ];

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ color: [] }, { background: [] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ align: [] }],
      ['link', 'image', 'blockquote'],
      ['clean'],
    ],
  };

  return (
    <div style={{ padding: 24, background: '#f8f9fa', minHeight: '100vh' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileTextOutlined style={{ color: '#b8956a' }} /> Quản lý bài viết
          </h1>
          <p style={{ color: '#71717a', fontSize: 13, margin: '4px 0 0' }}>CMS nội dung khách sạn — Đăng, chỉnh sửa và quản lý bài viết</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#16a34a', background: '#dcfce7', padding: '4px 10px', borderRadius: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            Real-time
          </div>
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd} style={{ background: '#111', borderColor: '#111' }}>
            Viết bài mới
          </Button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Tổng bài viết', value: stats.total, color: '#6366f1', bg: '#eef2ff', icon: <FileTextOutlined /> },
          { label: 'Đã xuất bản', value: stats.published, color: '#16a34a', bg: '#dcfce7', icon: <CheckCircleOutlined /> },
          { label: 'Chờ duyệt', value: stats.pending, color: '#d97706', bg: '#fef3c7', icon: <ClockCircleOutlined /> },
          { label: 'Bản nháp', value: stats.draft, color: '#6b7280', bg: '#f3f4f6', icon: <InboxOutlined /> },
        ].map((s) => (
          <div key={s.label} style={{ background: 'white', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: s.color }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#111', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ background: 'white', borderRadius: 12, padding: '16px 20px', marginBottom: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            placeholder="Tìm kiếm bài viết..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 280 }}
            allowClear
          />
          <Select value={categoryFilter} onChange={setCategoryFilter} style={{ width: 180 }}>
            <Option value="ALL">Tất cả chuyên mục</Option>
            {categories.map(c => <Option key={c.id} value={c.name}>{c.name}</Option>)}
          </Select>
          <div style={{ marginLeft: 'auto', color: '#71717a', fontSize: 13 }}>
            Hiển thị <strong>{filtered.length}</strong> / {articles.length} bài viết
          </div>
        </div>
      </div>

      {/* ── Tabs + Grid ── */}
      <Tabs
        activeKey={statusFilter}
        onChange={setStatusFilter}
        items={tabItems}
        style={{ marginBottom: 0 }}
      />

      <div style={{ background: 'white', borderRadius: '0 12px 12px 12px', padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', minHeight: 400 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
        ) : filtered.length === 0 ? (
          <Empty description="Không có bài viết nào" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 60 }} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {filtered.map(article => (
              <ArticleCard
                key={article.id}
                article={article}
                onEdit={openEdit}
                onDelete={handleDelete}
                onPreview={setPreviewArticle}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Editor Drawer ── */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileTextOutlined style={{ color: '#b8956a' }} />
            <span>{editingId ? 'Chỉnh sửa bài viết' : 'Viết bài viết mới'}</span>
          </div>
        }
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={900}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDrawerOpen(false)}>Hủy</Button>
            <Button
              type="primary"
              loading={saving}
              onClick={handleSave}
              style={{ background: '#111', borderColor: '#111' }}
            >
              {editingId ? 'Cập nhật bài viết' : 'Xuất bản bài viết'}
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          {/* Row 1: Title */}
          <Form.Item
            name="Title"
            label={<span style={{ fontWeight: 600 }}>Tiêu đề bài viết</span>}
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề!' }]}
          >
            <Input size="large" placeholder="Nhập tiêu đề hấp dẫn cho bài viết..." />
          </Form.Item>

          {/* Row 2: Category (multi) + Status + Tags */}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="CategoryNames"
                label={
                  <span style={{ fontWeight: 600 }}>
                    Chủ đề / Chuyên mục
                    <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 11, marginLeft: 6 }}>
                      (chọn 1 hoặc nhiều)
                    </span>
                  </span>
                }
              >
                <Select
                  mode="multiple"
                  placeholder="VD: Tin Tức Khách Sạn, Sự Kiện..."
                  showSearch
                  allowClear
                  filterOption={(input, option) =>
                    option?.children?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {categories.map(c => <Option key={c.id} value={c.name}>{c.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="Status" label={<span style={{ fontWeight: 600 }}>Trạng thái</span>} initialValue="Draft">
                <Select>
                  <Option value="Draft"><InboxOutlined /> Bản nháp</Option>
                  <Option value="Pending Review"><ClockCircleOutlined /> Chờ duyệt</Option>
                  <Option value="Published"><CheckCircleOutlined /> Xuất bản ngay</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="Tags" label={<span style={{ fontWeight: 600 }}>Thẻ (Tags)</span>}>
                <Select mode="tags" placeholder="Nhập tag, ấn Enter để thêm" />
              </Form.Item>
            </Col>
          </Row>

          {/* Summary */}
          <Form.Item name="Summary" label={<span style={{ fontWeight: 600 }}>Tóm tắt ngắn</span>}>
            <TextArea rows={3} placeholder="Tóm tắt ngắn gọn nội dung bài viết (hiển thị ở trang danh sách)..." />
          </Form.Item>

          {/* Content */}
          <Form.Item name="Content" label={<span style={{ fontWeight: 600 }}>Nội dung chính</span>}>
            <ReactQuill
              theme="snow"
              modules={quillModules}
              style={{ height: 320, marginBottom: 50 }}
              placeholder="Soạn nội dung bài viết tại đây..."
            />
          </Form.Item>

          {/* Thumbnail */}
          <Form.Item label={<span style={{ fontWeight: 600 }}><PictureOutlined /> Ảnh Bìa (Thumbnail)</span>}>
            <Upload
              listType="picture-card"
              fileList={fileList}
              onChange={({ fileList: f }) => setFileList(f)}
              beforeUpload={() => false}
              maxCount={1}
            >
              {fileList.length < 1 && (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8, fontSize: 12 }}>Tải ảnh lên</div>
                </div>
              )}
            </Upload>
          </Form.Item>

          <Divider><GlobalOutlined /> SEO Metadata</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="MetaTitle" label="Meta Title">
                <Input placeholder="Tiêu đề hiển thị trên Google..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="MetaDescription" label="Meta Description">
                <TextArea rows={2} placeholder="Mô tả ngắn hiển thị trên kết quả tìm kiếm..." />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Drawer>

      {/* ── Preview Modal ── */}
      <Modal
        open={!!previewArticle}
        onCancel={() => setPreviewArticle(null)}
        footer={null}
        width={760}
        title={<span><EyeOutlined /> Xem trước bài viết</span>}
      >
        {previewArticle && (
          <div>
            {previewArticle.thumbnailUrl && (
              <img src={previewArticle.thumbnailUrl} alt="" style={{ width: '100%', height: 240, objectFit: 'cover', borderRadius: 8, marginBottom: 20 }} />
            )}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <StatusBadge status={previewArticle.status} />
              {/* Hiển thị nhiều chuyên mục */}
              {(previewArticle.categoryNames || (previewArticle.categoryName ? [previewArticle.categoryName] : [])).map((cat, i) => (
                <Tag key={i} color="blue">{cat}</Tag>
              ))}
              <span style={{ fontSize: 12, color: '#9ca3af' }}><CalendarOutlined /> {formatDate(previewArticle.publishedAt)}</span>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111', marginBottom: 12 }}>{previewArticle.title}</h2>
            {previewArticle.summary && (
              <p style={{ color: '#52525b', fontSize: 15, lineHeight: 1.7, borderLeft: '3px solid #b8956a', paddingLeft: 14, marginBottom: 16 }}>
                {previewArticle.summary}
              </p>
            )}
            <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.8 }}
              dangerouslySetInnerHTML={{ __html: previewArticle.content || '<i>Không có nội dung</i>' }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
