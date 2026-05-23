import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, message, Upload, Button } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { equipmentApi } from '../../../api/equipmentApi';

const EquipmentModal = ({ open, onCancel, editingItem, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const categoryWatch = Form.useWatch('category', form);
  const basePriceWatch = Form.useWatch('basePrice', form);
  const isFixed100Pct =
    categoryWatch === 'Đồ ăn' ||
    categoryWatch === 'Đồ uống' ||
    categoryWatch === 'Minibar' ||
    (basePriceWatch !== undefined && basePriceWatch <= 50000);

  useEffect(() => {
    if (isFixed100Pct) {
      form.setFieldsValue({ markupPercentage: 100 });
      if (basePriceWatch !== undefined)
        form.setFieldsValue({ defaultPriceIfLost: basePriceWatch });
    }
  }, [isFixed100Pct, basePriceWatch, form]);

  useEffect(() => {
    if (editingItem && open) {
      const base = editingItem.basePrice || 0;
      const def = editingItem.defaultPriceIfLost || 0;
      const pct = base > 0 ? Math.round((def / base) * 100) : 100;
      form.setFieldsValue({
        itemCode: editingItem.itemCode,
        name: editingItem.name,
        category: editingItem.category,
        unit: editingItem.unit,
        supplier: editingItem.supplier || '',
        totalQuantity: editingItem.totalQuantity,
        basePrice: base,
        defaultPriceIfLost: def,
        markupPercentage: pct,
      });
      setImageUrl(editingItem.imageUrl || '');
    } else {
      form.resetFields();
      setImageUrl('');
    }
  }, [editingItem, open, form]);

  const handleUpload = (info) => {
    const file = info.file;
    if (!file) return false;
    const reader = new FileReader();
    setUploading(true);
    reader.onload = (e) => {
      setImageUrl(e.target.result);
      setUploading(false);
      message.success('Tải ảnh thành công!');
    };
    reader.readAsDataURL(file);
    return false;
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const payload = {
        ...values,
        defaultPriceIfLost: form.getFieldValue('defaultPriceIfLost'),
        imageUrl,
      };
      if (editingItem) {
        await equipmentApi.updateEquipment(editingItem.id, payload);
        message.success('Cập nhật vật tư thành công!');
      } else {
        await equipmentApi.createEquipment(payload);
      }
      onSuccess();
      onCancel();
    } catch (error) {
      if (error.errorFields) return;
      message.error(error?.response?.data?.message || 'Có lỗi xảy ra!');
    } finally {
      setLoading(false);
    }
  };

  const row = { display: 'flex', gap: 12 };
  const mb = { marginBottom: 8 };

  return (
    <Modal
      title={editingItem ? 'Sửa thông tin vật tư' : 'Thêm vật tư mới'}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      okText="Lưu"
      cancelText="Hủy"
      width={560}
    >
      <Form form={form} layout="vertical" size="small" style={{ marginTop: 10 }}>

        {/* ── Ảnh inline ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, ...mb }}>
          <span style={{ fontSize: 12, color: '#555', whiteSpace: 'nowrap' }}>Ảnh vật tư:</span>
          <Upload beforeUpload={() => false} showUploadList={false} onChange={handleUpload} accept="image/*">
            <Button size="small" icon={<UploadOutlined />} loading={uploading}>Chọn ảnh</Button>
          </Upload>
          {imageUrl ? (
            <>
              <img src={imageUrl} alt="preview"
                style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid #d9d9d9' }} />
              <Button size="small" type="link" danger onClick={() => setImageUrl('')}>Xóa</Button>
            </>
          ) : (
            <span style={{ color: '#bbb', fontSize: 11 }}>Chưa có ảnh</span>
          )}
        </div>

        {/* ── Mã VT + Tên ── */}
        <div style={row}>
          <Form.Item name="itemCode" label="Mã vật tư"
            rules={[{ required: true, message: 'Nhập mã!' }]}
            style={{ flex: '0 0 120px', ...mb }}>
            <Input placeholder="VD: HH001" disabled={!!editingItem} />
          </Form.Item>
          <Form.Item name="name" label="Tên vật tư"
            rules={[{ required: true, message: 'Nhập tên!' }]}
            style={{ flex: 1, ...mb }}>
            <Input placeholder="Tên thiết bị / đồ dùng" />
          </Form.Item>
        </div>

        {/* ── Danh mục + ĐVT ── */}
        <div style={row}>
          <Form.Item name="category" label="Danh mục"
            rules={[{ required: true, message: 'Chọn danh mục!' }]}
            style={{ flex: 1, ...mb }}>
            <Select placeholder="Chọn danh mục" options={[
              { value: 'Trang thiết bị', label: 'Trang thiết bị' },
              { value: 'Nội thất', label: 'Nội thất' },
              { value: 'Điện tử', label: 'Điện tử' },
              { value: 'Minibar', label: 'Minibar' },
              { value: 'Đồ uống', label: 'Đồ uống' },
              { value: 'Đồ ăn', label: 'Đồ ăn' },
              { value: 'Khác', label: 'Khác' },
            ]} />
          </Form.Item>
          <Form.Item name="unit" label="Đơn vị tính"
            rules={[{ required: true, message: 'Nhập ĐVT!' }]}
            style={{ flex: 1, ...mb }}>
            <Input placeholder="Cái, Chai, Lon..." />
          </Form.Item>
        </div>

        {/* ── Nhà Cung Cấp ── */}
        <Form.Item name="supplier" label="Nhà Cung Cấp" style={mb}>
          <Input placeholder="VD: Công ty TNHH Việt Thành" />
        </Form.Item>

        {/* ── Tổng SL + Giá nhập ── */}
        <div style={row}>
          <Form.Item name="totalQuantity" label="Tổng số lượng"
            rules={[{ required: true, message: 'Nhập số lượng!' }]}
            style={{ flex: 1, ...mb }}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="basePrice" label="Giá nhập (VND)"
            rules={[{ required: true, message: 'Nhập giá!' }]}
            style={{ flex: 1, ...mb }}>
            <InputNumber
              min={0} step={1000} style={{ width: '100%' }}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(v) => v.replace(/\$\s?|(,*)/g, '')}
              onChange={(val) => {
                const pct = form.getFieldValue('markupPercentage') || 100;
                form.setFieldsValue({ defaultPriceIfLost: Math.round((val || 0) * (pct / 100)) });
              }}
            />
          </Form.Item>
        </div>

        {/* ── Tỉ lệ + Giá đền bù ── */}
        <div style={row}>
          <Form.Item name="markupPercentage" label="Tỉ lệ đền bù (%)" initialValue={100} style={{ flex: 1, ...mb }}>
            <InputNumber
              disabled={isFixed100Pct}
              min={isFixed100Pct ? 100 : 8} max={1000} step={10}
              style={{ width: '100%' }}
              formatter={(v) => `${v}%`}
              parser={(v) => v.replace('%', '')}
              onChange={(val) => {
                const base = form.getFieldValue('basePrice') || 0;
                form.setFieldsValue({ defaultPriceIfLost: Math.round(base * ((val || 0) / 100)) });
              }}
            />
          </Form.Item>
          <Form.Item name="defaultPriceIfLost" label="Giá đền bù thực tế (VND)" style={{ flex: 1, ...mb }}>
            <InputNumber
              min={0} step={1000} disabled style={{ width: '100%' }}
              formatter={(v) => v ? Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0'}
              parser={(v) => v.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>
        </div>

      </Form>
    </Modal>
  );
};

export default EquipmentModal;
