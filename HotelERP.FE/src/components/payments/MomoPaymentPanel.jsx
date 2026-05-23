import React from "react";
import { Alert, Button, Card, Space, Tag, Typography, message } from "antd";

const { Text, Link } = Typography;

const statusColor = (status) => {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "SUCCESS" || normalized === "PAID") return "green";
  if (normalized === "FAILED" || normalized === "CANCELLED") return "red";
  return "gold";
};

const MomoPaymentPanel = ({
  paymentData,
  checking = false,
  creating = false,
  onCheckStatus,
  onRefreshQr,
}) => {
  if (!paymentData) return null;

  const payUrl = paymentData.payUrl || "";
  const status = paymentData.status || "PENDING";
  const amount = Number(paymentData.amount || paymentData.amountPaid || 0);

  const openMomoPaymentPage = () => {
    if (!payUrl) {
      message.error("Chưa có link thanh toán MoMo.");
      return;
    }

    window.open(payUrl, "_blank", "noopener,noreferrer");
  };

  const copyPayUrl = async () => {
    if (!payUrl) {
      message.error("Chưa có link thanh toán MoMo.");
      return;
    }

    try {
      await navigator.clipboard.writeText(payUrl);
      message.success("Đã copy link thanh toán MoMo.");
    } catch {
      message.error("Không copy được link thanh toán.");
    }
  };

  return (
    <Card size="small" title="Thanh toán MoMo" style={{ marginTop: 16 }}>
      <Space direction="vertical" style={{ width: "100%" }} align="center" size="middle">
        <Alert
          type="info"
          showIcon
          style={{ width: "100%" }}
          message="Mở trang thanh toán MoMo để quét QR thật"
          description="Hệ thống sẽ mở trang thanh toán do MoMo render. Khách quét QR trên trang MoMo, tránh lỗi QR tự dựng trong web bị hết hạn hoặc không tồn tại."
        />

        <Tag color={statusColor(status)}>{status}</Tag>

        <Text strong>
          Số tiền: {amount.toLocaleString("vi-VN")} VNĐ
        </Text>

        {payUrl ? (
          <Link href={payUrl} target="_blank" rel="noopener noreferrer">
            {payUrl}
          </Link>
        ) : (
          <Text type="danger">Backend chưa trả payUrl.</Text>
        )}

        <Space wrap>
          <Button type="primary" onClick={openMomoPaymentPage} disabled={!payUrl}>
            Mở trang thanh toán MoMo
          </Button>

          <Button onClick={copyPayUrl} disabled={!payUrl}>
            Copy link
          </Button>

          <Button onClick={onCheckStatus} loading={checking}>
            Kiểm tra trạng thái
          </Button>

          <Button onClick={onRefreshQr} loading={creating}>
            Tạo lại link MoMo
          </Button>
        </Space>
      </Space>
    </Card>
  );
};

export default MomoPaymentPanel;
