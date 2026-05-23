import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, Rate, Button, Upload, Card, Typography, Spin } from 'antd';
import { message } from '../../utils/antdGlobal';
import { InboxOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import reviewApi from '../../api/reviewApi';
import userProfileApi from '../../api/userProfileApi';
import { useAuthStore } from '../../store/authStore';
 
const { TextArea } = Input;
const { Dragger } = Upload;
const { Title, Text } = Typography;
 
export default function SubmitReview() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingBooking, setLoadingBooking] = useState(true);
  const [bookingData, setBookingData] = useState(null);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const res = await userProfileApi.getMyBookings();
        const bookings = res.data?.data || [];
        const current = bookings.find(b => b.id.toString() === bookingId);
        if (current) {
          setBookingData(current);
        } else {
          message.error('Không tìm thấy thông tin đặt phòng.');
        }
      } catch (err) {
        message.error('Không thể tải thông tin đặt phòng.');
      } finally {
        setLoadingBooking(false);
      }
    };
    fetchBooking();
  }, [bookingId]);

  const handleUploadChange = (info) => {
    setFileList(info.fileList);
  };

  const onFinish = async (values) => {
    if (!bookingData) {
      message.error('Lỗi dữ liệu đặt phòng.');
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl = null;
      let imagePublicId = null;

      // Upload ảnh đầu tiên nếu có
      if (fileList.length > 0 && fileList[0].originFileObj) {
        const uploadRes = await reviewApi.uploadImage(fileList[0].originFileObj);
        imageUrl = uploadRes.data.imageUrl;
        imagePublicId = uploadRes.data.publicId;
      }

      const reviewData = {
        userId: user?.id,
        roomTypeId: bookingData.details?.[0]?.roomTypeId || 0,
        rating: values.rating,
        comment: values.comment,
        imageUrl: imageUrl,
        imagePublicId: imagePublicId
      };

      await reviewApi.create(reviewData);

      message.success('Cảm ơn bạn đã gửi đánh giá! Bài viết của bạn đang chờ kiểm duyệt.');
      setTimeout(() => navigate('/profile?tab=bookings'), 2000);
    } catch (error) {
      message.error('Gửi đánh giá thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingBooking) {
    return <div style={{ textAlign: 'center', padding: '100px' }}><Spin size="large" /></div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', padding: '100px 20px 60px' }}>
      <Card style={{ maxWidth: 700, margin: '0 auto', background: '#1a1a1a', border: '1px solid #b8956a30', borderRadius: 16 }}>
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate(-1)} 
          style={{ color: '#b8956a', marginBottom: 16 }}
        >
          Quay lại
        </Button>
        
        <Title level={3} style={{ color: '#b8956a', marginBottom: 8 }}>Gửi Đánh Giá Của Bạn</Title>
        <Text style={{ color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 24 }}>
          Mã Booking: <span style={{ color: '#b8956a', fontWeight: 600 }}>#{bookingData?.bookingCode}</span> - {bookingData?.details?.[0]?.roomTypeName}
        </Text>

        <Form form={form} layout="vertical" onFinish={onFinish}>
          
          <Form.Item 
            name="rating" 
            label={<span style={{ color: '#fff' }}>Bạn đánh giá thế nào về kỳ nghỉ này?</span>}
            rules={[{ required: true, message: 'Vui lòng chọn số sao!' }]}
          >
            <Rate style={{ fontSize: 40, color: '#b8956a' }} />
          </Form.Item>
 
          <Form.Item 
            name="comment" 
            label={<span style={{ color: '#fff' }}>Nhận xét chi tiết</span>}
            rules={[{ required: true, message: 'Vui lòng nhập nhận xét của bạn!' }]}
          >
            <TextArea 
              rows={5} 
              placeholder="Chia sẻ trải nghiệm của bạn tại Asteria Resort..." 
              style={{ background: 'transparent', border: '1px solid #b8956a40', color: '#fff' }}
            />
          </Form.Item>
 
          <Form.Item label={<span style={{ color: '#fff' }}>Đính kèm hình ảnh (Tùy chọn)</span>}>
            <Dragger
              multiple={false}
              listType="picture"
              fileList={fileList}
              onChange={handleUploadChange}
              beforeUpload={() => false}
              style={{ background: '#0d0d0d', border: '1px dashed #b8956a50' }}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ color: '#b8956a' }} />
              </p>
              <p className="ant-upload-text" style={{ color: '#fff' }}>Kéo thả hoặc nhấp để chọn ảnh</p>
            </Dragger>
          </Form.Item>
 
          <Form.Item style={{ marginTop: 40 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={submitting} 
              block 
              style={{ height: 50, background: '#b8956a', borderColor: '#b8956a', fontWeight: 700, fontSize: 16 }}
            >
              GỬI ĐÁNH GIÁ NGAY
            </Button>
          </Form.Item>
 
        </Form>
      </Card>
    </div>
  );
}