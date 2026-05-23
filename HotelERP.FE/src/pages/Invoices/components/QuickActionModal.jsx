import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Form, Input, InputNumber, message, Select } from 'antd';
import invoiceApi from '../../../api/invoiceApi';

const normalizeOptions = (items = []) =>
  (Array.isArray(items) ? items : [])
    .map((item) => ({
      bookingDetailId: Number(item.bookingDetailId ?? item.BookingDetailId ?? item.value ?? 0),
      roomNumber: item.roomNumber ?? item.RoomNumber ?? item.label ?? '',
    }))
    .filter((item) => item.bookingDetailId > 0);

const QuickActionModal = ({ open, invoiceId, extraFeeTargets = [], onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [targetsFromInvoice, setTargetsFromInvoice] = useState([]);

  const normalizedPropTargets = useMemo(() => normalizeOptions(extraFeeTargets), [extraFeeTargets]);
  const normalizedLoadedTargets = useMemo(() => normalizeOptions(targetsFromInvoice), [targetsFromInvoice]);

  const targetOptions = normalizedPropTargets.length ? normalizedPropTargets : normalizedLoadedTargets;

  useEffect(() => {
    if (!open) return;

    form.resetFields();
    setTargetsFromInvoice([]);

    const loadInvoiceTargets = async () => {
      if (!invoiceId || normalizedPropTargets.length) return;

      try {
        setLoadingTargets(true);
        const res = await invoiceApi.getInvoiceDetail(invoiceId);
        const payload = res?.data?.data || res?.data || {};
        const ids = payload.bookingDetailIds || payload.BookingDetailIds || [];
        const rooms = payload.roomNumbers || payload.RoomNumbers || [];

        setTargetsFromInvoice(
          ids.map((id, index) => ({
            bookingDetailId: id,
            roomNumber: rooms[index] || `BookingDetail #${id}`,
          }))
        );
      } catch (error) {
        console.error('Load invoice targets error:', error);
      } finally {
        setLoadingTargets(false);
      }
    };

    loadInvoiceTargets();
  }, [open, invoiceId, form, normalizedPropTargets.length]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const bookingDetailId = Number(values.bookingDetailId || 0) || null;

      const res = await invoiceApi.addExtraFee(invoiceId, {
        amount: values.amount,
        reason: values.reason || '',
        bookingDetailId,
      });

      const payload = res?.data?.data || {};
      message.success(res?.data?.message || 'Thêm phụ phí thành công.');

      onSuccess?.(payload);
      onCancel?.();
    } catch (error) {
      if (error?.errorFields) return;

      console.error('Add extra fee error:', error);
      message.error(error?.response?.data?.message || 'Không thêm được phụ phí.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={`Thao tác nhanh • Invoice #${invoiceId}`}
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={submitting}
      okText="Lưu phụ phí"
      cancelText="Đóng"
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="amount"
          label="Số tiền phụ phí"
          rules={[
            { required: true, message: 'Nhập số tiền phụ phí.' },
            { type: 'number', min: 1, message: 'Phụ phí phải lớn hơn 0.' },
          ]}
        >
          <InputNumber
            min={1}
            className="w-full"
            style={{ width: '100%' }}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
            parser={(value) => value.replace(/\./g, '')}
            addonAfter="VND"
          />
        </Form.Item>

        <Form.Item
          name="bookingDetailId"
          label="Tính phụ phí cho phòng nào?"
        >
          <Select
            allowClear
            loading={loadingTargets}
            placeholder="Không chọn: tính chung cho hóa đơn"
            options={targetOptions.map((item) => ({
              value: item.bookingDetailId,
              label: `Phòng ${item.roomNumber || '-'} • BookingDetail #${item.bookingDetailId}`,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="reason"
          label="Lý do"
          rules={[{ max: 500, message: 'Lý do tối đa 500 ký tự.' }]}
        >
          <Input.TextArea
            rows={4}
            placeholder="Ví dụ: phụ thu check-out trễ, phụ thu vệ sinh đặc biệt..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default QuickActionModal;