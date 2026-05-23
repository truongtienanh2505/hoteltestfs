import React, { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, DatePicker, message } from 'antd';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const VoucherModal = ({ visible, onCancel, onSuccess, editingVoucher }) => {
  const [form] = Form.useForm();
  const isEditing = !!editingVoucher;

  useEffect(() => {
    if (visible) {
      if (editingVoucher) {
        form.setFieldsValue({
          ...editingVoucher,
          status: 'ACTIVE', // Default to Active for easy extension
          validFrom: editingVoucher.validFrom ? dayjs(editingVoucher.validFrom) : null,
          validTo: editingVoucher.validTo ? dayjs(editingVoucher.validTo) : null,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          status: 'ACTIVE',
          discountType: 'PERCENT',
        });
      }
    }
  }, [visible, editingVoucher, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const payload = {
        ...values,
        status: values.status, 
        discountType: values.discountType,
        // Use format to send exact local time string to avoid timezone issues
        validFrom: values.validFrom ? values.validFrom.format('YYYY-MM-DDTHH:mm:ss') : null,
        validTo: values.validTo ? values.validTo.format('YYYY-MM-DDTHH:mm:ss') : null,
        discountValue: Number(values.discountValue),
        minBookingAmount: Number(values.minBookingAmount),
        usageLimit: values.usageLimit ? Number(values.usageLimit) : null,
        reason: values.reason 
      };

      onSuccess(payload);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  return (
    <Modal
      title={isEditing ? 'Chỉnh sửa Voucher' : 'Tạo Voucher mới'}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      width={600}
      okText={isEditing ? 'Cập nhật' : 'Thêm mới'}
      cancelText="Hủy"
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ status: 'ACTIVE', discountType: 'PERCENT' }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Form.Item
            name="code"
            label="Mã Voucher"
            rules={[{ required: true, message: 'Vui lòng nhập mã voucher' }]}
          >
            <Input placeholder="VÍ DỤ: SUMMER2024" disabled={isEditing} />
          </Form.Item>

          <Form.Item
            name="status"
            label="Trạng thái"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="ACTIVE">Hoạt động</Option>
              <Option value="INACTIVE">Vô hiệu hóa</Option>
            </Select>
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Form.Item
            name="discountType"
            label="Loại giảm giá"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="PERCENT">Phần trăm (%)</Option>
              <Option value="FIXED_AMOUNT">Số tiền cố định (VND)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="discountValue"
            label="Giá trị giảm"
            rules={[{ required: true, message: 'Vui lòng nhập giá trị giảm' }]}
          >
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Form.Item
            name="minBookingAmount"
            label="Đơn hàng tối thiểu"
            rules={[{ required: true, message: 'Vui lòng nhập số tiền tối thiểu' }]}
          >
            <InputNumber 
              style={{ width: '100%' }} 
              min={0} 
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item
            name="usageLimit"
            label="Giới hạn sử dụng"
          >
            <InputNumber style={{ width: '100%' }} min={1} placeholder="Không giới hạn nếu trống" />
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Form.Item
            name="validFrom"
            label="Thời gian bắt đầu"
            rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu' }]}
          >
            <DatePicker 
              style={{ width: '100%' }} 
              showTime 
              format="DD/MM/YYYY HH:mm"
              placeholder="Bắt đầu từ..."
            />
          </Form.Item>

          <Form.Item
            name="validTo"
            label="Thời gian kết thúc"
            rules={[{ required: true, message: 'Vui lòng chọn ngày kết thúc' }]}
          >
            <DatePicker 
              style={{ width: '100%' }} 
              showTime 
              format="DD/MM/YYYY HH:mm"
              placeholder="Kết thúc lúc..."
            />
          </Form.Item>
        </div>

        <Form.Item
          name="reason"
          label="Ghi chú / Lý do"
          rules={[{ required: true, message: 'Vui lòng nhập lý do chỉnh sửa để lưu Audit Log' }]}
        >
          <TextArea rows={3} placeholder="Ví dụ: Tri ân khách hàng, Chương trình khuyến mãi hè..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default VoucherModal;
