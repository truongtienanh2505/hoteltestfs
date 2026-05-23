import React, { useEffect, useRef, useState } from 'react';
import { useSignalR } from '../../../hooks/useSignalR.jsx';

const normalizeStayDays = (value, hasCharge = false) => {
  const n = Number(value || 0);

  if (n >= 1) return Math.floor(n);

  // Nếu chưa đủ 1 ngày nhưng đã phát sinh tiền phòng / đã nhận phòng trả luôn trong ngày
  if (hasCharge) return 1;

  return 0;
};

const formatStayDays = (value, hasCharge = false) => {
  return `${normalizeStayDays(value, hasCharge)} ngày`;
};

import {
  Modal,
  Form,
  Input,
  Select,
  message,
  Typography,
  Descriptions,
  Divider,
  Row,
  Col,
  Card,
  Spin,
  Button,
  Tag,
  Alert,
} from 'antd';
import invoiceApi from '../../../api/invoiceApi';
import momoPaymentApi from '../../../api/momoPaymentApi';
import MomoPaymentPanel from '../../../components/payments/MomoPaymentPanel';

const { Title, Text } = Typography;

const paymentOptions = [
  { value: 'Cash', label: 'Tiền mặt' },
  { value: 'Bank Transfer', label: 'Chuyển khoản' },
  { value: 'VNPay', label: 'VNPay' },
  { value: 'Momo', label: 'Momo' },
  { value: 'Credit Card', label: 'Thẻ tín dụng' },
];

const money = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value || 0);

const getValue = (obj, ...keys) => {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) return obj[key];
  }
  return undefined;
};

const FinalizeInvoiceModal = ({ open, invoiceId, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const paymentMethod = Form.useWatch('paymentMethod', form);

  const [submitting, setSubmitting] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [invoiceDetail, setInvoiceDetail] = useState(null);
  const [creatingMomoPayment, setCreatingMomoPayment] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const pollingRef = useRef(null);
  const createLockRef = useRef(false);
  const lastCreateAtRef = useRef(0);

  // ── SignalR: tự động reload invoice khi có đơn dịch vụ mới ──────────────────
  const { connection } = useSignalR();
  useEffect(() => {
    if (!connection || !open || !invoiceId) return;
    const handler = () => {
      // Có đơn dịch vụ mới → reload chi tiết hóa đơn để tính tiền lại
      fetchInvoiceDetail();
    };
    connection.on('NewServiceOrder', handler);
    return () => connection.off('NewServiceOrder', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection, open, invoiceId]);
  // ───────────────────────────────────────────────────────────────────

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  useEffect(() => {
    if (!open || !invoiceId) return undefined;

    form.setFieldsValue({
      paymentMethod: 'Cash',
      transactionCode: '',
      note: '',
    });

    setPaymentData(null);
    fetchInvoiceDetail();

    return () => {
      stopPolling();
    };
  }, [open, invoiceId]);

  useEffect(() => {
    if (!open) return;

    if (paymentMethod !== 'Momo') {
      setPaymentData(null);
      stopPolling();
    }
  }, [paymentMethod, open]);

  useEffect(() => {
    if (!open || !paymentData?.paymentId) return undefined;

    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => {
      checkPaymentStatus(paymentData.paymentId, false);
    }, 5000);

    return () => {
      stopPolling();
    };
  }, [open, paymentData?.paymentId]);

  const fetchInvoiceDetail = async () => {
    try {
      setLoadingDetail(true);
      const res = await invoiceApi.getInvoiceDetail(invoiceId);
      const payload = res?.data?.data || res?.data || {};
      setInvoiceDetail(payload);
    } catch (error) {
      console.error('Load invoice detail error:', error);
      message.error(error?.response?.data?.message || 'Không tải được chi tiết hóa đơn.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const createMomoPayment = async (force = false) => {
    if (!invoiceId) return;

    if (creatingMomoPayment || createLockRef.current) {
      return;
    }

    if (!force && paymentData?.paymentId) {
      return;
    }

    const now = Date.now();
    const cooldownMs = 8000;
    if (now - lastCreateAtRef.current < cooldownMs) {
      message.warning('Đợi vài giây rồi hãy tạo lại link MoMo để tránh bị MoMo chặn spam.');
      return;
    }

    try {
      const values = await form.validateFields(['paymentMethod', 'note']);
      createLockRef.current = true;
      lastCreateAtRef.current = now;
      setCreatingMomoPayment(true);
      setPaymentData(null);
      stopPolling();

      const res = await momoPaymentApi.createInvoicePayment(invoiceId, {
        note: values.note || '',
      });

      const payload = res?.data?.data || res?.data;

      if (!payload?.paymentId) {
        message.error('Backend chưa trả paymentId MoMo.');
        return;
      }

      setPaymentData(payload);

      if (payload.payUrl) {
        message.success('Đã tạo link thanh toán MoMo mới.');
      } else {
        message.warning('Đã tạo payment MoMo nhưng backend chưa trả payUrl.');
      }
    } catch (error) {
      if (error?.errorFields) return;
      setPaymentData(null);
      stopPolling();
      console.error('Create momo invoice payment error:', error?.response?.status, error?.response?.data || error);
      message.error(
        error?.response?.data?.message ||
          error?.response?.data?.title ||
          'Không tạo được link thanh toán MoMo.'
      );
    } finally {
      setCreatingMomoPayment(false);
      createLockRef.current = false;
    }
  };

  const checkPaymentStatus = async (paymentId = paymentData?.paymentId, showMessage = true) => {
    if (!paymentId) return;

    try {
      setCheckingPayment(true);
      const res = await momoPaymentApi.getPaymentStatus(paymentId);
      const payload = res?.data?.data || res?.data;
      setPaymentData((prev) => ({ ...prev, ...payload }));

      const normalizedStatus = String(payload?.status || '').toUpperCase();
      if (normalizedStatus === 'SUCCESS' || normalizedStatus === 'PAID') {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        if (showMessage) {
          message.success('Khách đã thanh toán MoMo thành công.');
        }
        await fetchInvoiceDetail();
        onSuccess?.(payload);
        onCancel?.();
      } else if (showMessage) {
        message.info(`Trạng thái hiện tại: ${payload?.status || 'PENDING'}`);
      }
    } catch (error) {
      console.error('Check momo payment status error:', error);
      if (showMessage) {
        message.error(error?.response?.data?.message || 'Không kiểm tra được trạng thái thanh toán.');
      }
    } finally {
      setCheckingPayment(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (values.paymentMethod === 'Momo') {
        if (!paymentData?.paymentId) {
          await createMomoPayment(true);
          return;
        }

        await checkPaymentStatus(paymentData.paymentId, true);
        return;
      }

      setSubmitting(true);

      const res = await invoiceApi.finalizeInvoice(invoiceId, {
        paymentMethod: values.paymentMethod,
        transactionCode: values.transactionCode || '',
        note: values.note || '',
      });

      message.success(res?.data?.message || 'Thanh toán và chốt hóa đơn thành công.');
      onSuccess?.(res?.data?.data || res?.data);
      onCancel?.();
    } catch (error) {
      if (error?.errorFields) return;

      console.error('Finalize invoice error:', error);
      message.error(error?.response?.data?.message || 'Không chốt được hóa đơn.');
    } finally {
      setSubmitting(false);
    }
  };

  const bookingId = getValue(invoiceDetail, 'bookingId', 'BookingId') || '-';
  const customerName =
    getValue(invoiceDetail, 'customerName', 'CustomerName', 'guestName', 'GuestName') || 'Khách lẻ';
  const invoiceCode = getValue(invoiceDetail, 'invoiceCode', 'InvoiceCode') || `INV-${invoiceId}`;
  const bookingCode = getValue(invoiceDetail, 'bookingCode', 'BookingCode') || '-';
  const invoiceStatus = getValue(invoiceDetail, 'invoiceStatus', 'InvoiceStatus') || 'DRAFT';
  const paymentStatus = getValue(invoiceDetail, 'paymentStatus', 'PaymentStatus') || 'UNPAID';
  const roomNumbers = getValue(invoiceDetail, 'roomNumbers', 'RoomNumbers') || [];
  const totalStayNights = getValue(invoiceDetail, 'totalStayNights', 'TotalStayNights') || 0;

  const totalRoomAmount = getValue(invoiceDetail, 'totalRoomAmount', 'TotalRoomAmount') || 0;
  const totalServiceAmount = getValue(invoiceDetail, 'totalServiceAmount', 'TotalServiceAmount') || 0;
  const totalDamageAmount = getValue(invoiceDetail, 'totalDamageAmount', 'TotalDamageAmount') || 0;
  const manualAdjustmentAmount = getValue(invoiceDetail, 'manualAdjustmentAmount', 'ManualAdjustmentAmount') || 0;
  const discountAmount = getValue(invoiceDetail, 'discountAmount', 'DiscountAmount') || 0;
  const taxAmount = getValue(invoiceDetail, 'taxAmount', 'TaxAmount') || 0;
  const grossTotal =
    getValue(invoiceDetail, 'grossTotal', 'GrossTotal') ??
    (getValue(invoiceDetail, 'finalTotal', 'FinalTotal') || 0);
  const depositAmount = getValue(invoiceDetail, 'depositAmount', 'DepositAmount') || 0;
  const finalTotal = getValue(invoiceDetail, 'finalTotal', 'FinalTotal') || 0;

  const footerSubmitText = paymentMethod === 'Momo' ? (paymentData?.paymentId ? 'Kiểm tra thanh toán MoMo' : 'Tạo link MoMo') : 'Thanh toán';
  const footerSubmitLoading = paymentMethod === 'Momo' ? checkingPayment : submitting;

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 32 }}>
          <span>Thanh toán hóa đơn • Invoice #{invoiceId || ''}</span>
          <Button
            size="small" type="text" icon={<span style={{ fontSize: 14 }}>🔄</span>}
            loading={loadingDetail}
            onClick={fetchInvoiceDetail}
            style={{ marginLeft: 8, color: '#1677ff' }}
          >
            Cập nhật
          </Button>
        </div>
      }
      open={open}
      onCancel={onCancel}
      width={900}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleSubmit}
          loading={footerSubmitLoading}
        >
          {footerSubmitText}
        </Button>,
      ]}
    >
      <Spin spinning={loadingDetail} tip="Đang tải chi tiết hóa đơn...">
        {invoiceDetail ? (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 20 }}>
              <Descriptions.Item label="Booking ID">
                <Text strong>{bookingId}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Tên khách hàng">
                <Text strong>{customerName}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Mã booking">
                <Text strong>{bookingCode}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Mã hóa đơn">
                <Text strong>{invoiceCode}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Phòng">
                {roomNumbers.length ? roomNumbers.join(', ') : 'Không có'}
              </Descriptions.Item>

              <Descriptions.Item label="Số ngày/đêm đã ở">
                <Text strong>{formatStayDays(totalStayNights, Number(totalRoomAmount || 0) > 0)}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Trạng thái hóa đơn">
                <Tag color={String(invoiceStatus).toUpperCase() === 'PAID' ? 'green' : 'orange'}>
                  {String(invoiceStatus).toUpperCase()}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Trạng thái thanh toán">
                <Tag color={String(paymentStatus).toUpperCase() === 'PAID' ? 'green' : 'gold'}>
                  {String(paymentStatus).toUpperCase()}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <Card title="Chi tiết hóa đơn" size="small" style={{ marginBottom: 20 }}>
              {/* Cảnh báo nếu tiền dịch vụ = 0 nhưng thực tế khách có đơn DV */}
              {Number(totalServiceAmount) === 0 && (
                <Alert
                  type="warning"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message="Tiền dịch vụ đang hiển thị 0 — nếu khách có đặt dịch vụ, nhấn ➡️ Cập nhật để làm mới hóa đơn."
                  action={
                    <Button size="small" onClick={fetchInvoiceDetail} loading={loadingDetail}>
                      🔄 Cập nhật
                    </Button>
                  }
                />
              )}
              <Row gutter={[16, 16]}>

                <Col span={12}><Text>Số ngày/đêm đã ở</Text></Col>
                <Col span={12} style={{ textAlign: 'right' }}><Text strong>{formatStayDays(totalStayNights, Number(totalRoomAmount || 0) > 0)}</Text></Col>

                <Col span={12}><Text>Tiền phòng</Text></Col>
                <Col span={12} style={{ textAlign: 'right' }}><Text strong>{money(totalRoomAmount)}</Text></Col>

                <Col span={12}><Text>Tiền dịch vụ</Text></Col>
                <Col span={12} style={{ textAlign: 'right' }}><Text strong>{money(totalServiceAmount)}</Text></Col>

                <Col span={12}><Text>Phí đền bù</Text></Col>
                <Col span={12} style={{ textAlign: 'right' }}><Text strong>{money(totalDamageAmount)}</Text></Col>

                <Col span={12}><Text>Phụ phí thêm</Text></Col>
                <Col span={12} style={{ textAlign: 'right' }}><Text strong>{money(manualAdjustmentAmount)}</Text></Col>

                <Col span={12}><Text>Giảm giá</Text></Col>
                <Col span={12} style={{ textAlign: 'right' }}><Text strong type="success">-{money(discountAmount)}</Text></Col>

                <Col span={12}><Text>VAT</Text></Col>
                <Col span={12} style={{ textAlign: 'right' }}><Text strong>{money(taxAmount)}</Text></Col>

                <Col span={12}><Text strong>Tổng tiền hóa đơn</Text></Col>
                <Col span={12} style={{ textAlign: 'right' }}><Text strong>{money(grossTotal)}</Text></Col>

                <Col span={12}><Text strong type="warning">Tiền cọc đã thu</Text></Col>
                <Col span={12} style={{ textAlign: 'right' }}><Text strong type="warning">-{money(depositAmount)}</Text></Col>
              </Row>

              <Divider />

              <Row justify="space-between" align="middle">
                <Col>
                  <Title level={4} style={{ margin: 0 }}>Số tiền cần thanh toán</Title>
                </Col>
                <Col>
                  <Title level={3} style={{ margin: 0, color: '#1677ff' }}>{money(finalTotal)}</Title>
                </Col>
              </Row>
            </Card>

            <Form form={form} layout="vertical">
              <Form.Item
                name="paymentMethod"
                label="Phương thức thanh toán"
                rules={[{ required: true, message: 'Chọn phương thức thanh toán.' }]}
              >
                <Select options={paymentOptions} />
              </Form.Item>

              {paymentMethod !== 'Momo' ? (
                <Form.Item
                  name="transactionCode"
                  label="Mã giao dịch"
                  rules={[{ max: 100, message: 'Mã giao dịch tối đa 100 ký tự.' }]}
                >
                  <Input placeholder="Ví dụ: VNPAY-20260410-001" />
                </Form.Item>
              ) : null}

              <Form.Item
                name="note"
                label="Ghi chú thanh toán"
                rules={[{ max: 1000, message: 'Ghi chú tối đa 1000 ký tự.' }]}
              >
                <Input.TextArea
                  rows={4}
                  placeholder={paymentMethod === 'Momo' ? 'Ghi chú sẽ được gửi kèm metadata của payment MoMo.' : 'Ví dụ: khách đã thanh toán đủ, xác nhận xuất hóa đơn.'}
                />
              </Form.Item>
            </Form>

            {paymentMethod === 'Momo' ? (
              <>
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message="Bấm nút bên dưới để tạo link thanh toán MoMo. Không tự động tạo link để tránh lỗi MAX-API SPAM."
                />
                <Button onClick={() => createMomoPayment(true)} loading={creatingMomoPayment}>
                  {paymentData?.paymentId ? 'Tạo lại link MoMo' : 'Tạo link thanh toán MoMo'}
                </Button>

                {paymentData ? (
                  <MomoPaymentPanel
                    paymentData={{ ...paymentData, amount: finalTotal }}
                    checking={checkingPayment}
                    onCheckStatus={() => checkPaymentStatus(paymentData?.paymentId, true)}
                    onRegenerate={() => createMomoPayment(true)}
                  />
                ) : (
                  <Alert
                    type="warning"
                    showIcon
                    style={{ marginTop: 12 }}
                    message="Chưa có link MoMo."
                    description="Bấm Tạo link thanh toán MoMo một lần, sau đó mở link MoMo để thanh toán."
                  />
                )}
              </>
            ) : null}
          </>
        ) : (
          !loadingDetail && (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <Text type="secondary">Không tải được chi tiết hóa đơn.</Text>
            </div>
          )
        )}
      </Spin>
    </Modal>
  );
};

export default FinalizeInvoiceModal;