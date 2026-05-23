import React, { useState, useEffect } from 'react';
import reviewApi from '../../api/reviewApi';
import userProfileApi from '../../api/userProfileApi';
import { useAuthStore } from '../../store/authStore';

// --- Inline SVGs ---
const Star = ({ filled, onClick }) => (
  <svg 
    onClick={onClick}
    style={{ 
      width: 32, height: 32, cursor: 'pointer', transition: 'color 0.2s',
      color: filled ? '#b8956a' : '#d9d9d9',
      fill: filled ? '#b8956a' : 'none',
      stroke: filled ? '#b8956a' : '#d9d9d9',
      strokeWidth: 2, marginRight: 8
    }}
    xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
);

const ImageIcon = () => (
  <svg style={{ width: 24, height: 24, color: '#8c8c8c', marginBottom: 8 }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

export default function ReviewModal({ isOpen, onClose }) {
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState([]);
  
  const [formData, setFormData] = useState({ bookingId: '', roomTypeId: 0, rating: 5, comment: '' });
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchEligibleBookings();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const fetchEligibleBookings = async () => {
    try {
      const res = await userProfileApi.getMyBookings();
      const allBookings = res.data?.data || res.data || [];
      // Chỉ lấy booking đã check-out (có thể đánh giá)
      const eligible = allBookings.filter(b =>
        b.status === 'CheckedOut' || b.status === 'Completed' || b.checkOutStatus === 'CheckedOut'
      );
      setBookings(eligible);
      if (eligible.length > 0) {
        const first = eligible[0];
        setFormData(prev => ({
          ...prev,
          bookingId: first.id,
          roomTypeId: first.details?.[0]?.roomTypeId || first.roomTypeId || 0
        }));
      }
    } catch (error) {
      console.error('Failed to fetch bookings', error);
    }
  };

  const handleBookingChange = (e) => {
    const selectedId = parseInt(e.target.value);
    const selected = bookings.find(b => b.id === selectedId);
    setFormData(prev => ({
      ...prev,
      bookingId: selectedId,
      roomTypeId: selected?.details?.[0]?.roomTypeId || selected?.roomTypeId || 0
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.bookingId) {
      alert('Vui lòng chọn một đơn đặt phòng để đánh giá!');
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrl = null;
      let imagePublicId = null;

      // Upload ảnh lên Cloudinary nếu có
      if (selectedFile) {
        const uploadRes = await reviewApi.uploadImage(selectedFile);
        imageUrl = uploadRes.data?.imageUrl || uploadRes.data?.ImageUrl;
        imagePublicId = uploadRes.data?.publicId || uploadRes.data?.PublicId;
      }

      // Gọi API tạo review thực sự
      await reviewApi.create({
        userId: user?.id || null,
        roomTypeId: formData.roomTypeId || 1,
        rating: formData.rating,
        comment: formData.comment,
        imageUrl: imageUrl,
        imagePublicId: imagePublicId
      });

      alert('Cảm ơn bạn, đánh giá của bạn đã được ghi nhận và đang chờ Lễ tân xét duyệt để hiển thị.');
      onClose();
    } catch (error) {
      console.error('Submit review failed:', error);
      alert('Có lỗi xảy ra khi gửi đánh giá. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Nút click ra ngoài để đóng */}
      <div style={{ position: 'absolute', inset: 0 }} onClick={onClose}></div>

      {/* Box Nội Dung */}
      <div style={{
        backgroundColor: '#fff',
        width: '100%',
        maxWidth: 600,
        borderRadius: 8,
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh'
      }}>
        
        {/* Header Modal - Layout giống hình, nút đóng ở ngoài cùng */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 16px 0' }}>
           <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, color: '#8c8c8c', cursor: 'pointer', lineHeight: 1 }}>&times;</button>
        </div>

        {/* Body */}
        <div style={{ padding: '0 40px 30px', overflowY: 'auto' }}>
          
          <h2 style={{ fontSize: 24, fontWeight: 600, color: '#18181b', marginBottom: 12, marginTop: 0, fontFamily: "'Times New Roman', Times, serif", letterSpacing: '0.5px' }}>VIẾT ĐÁNH GIÁ</h2>
          
          <p style={{ color: '#595959', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
            Theo quy định, bạn chỉ có thể viết đánh giá cho các phòng đã hoàn tất lưu trú (Đã Check-out).
          </p>

          <form onSubmit={handleSubmit}>
            
            {/* Đơn đặt phòng của bạn */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#262626', marginBottom: 8 }}>
                Đơn đặt phòng của bạn
              </label>
              <select 
                required
                value={formData.bookingId}
                onChange={handleBookingChange}
                style={{
                  width: '100%', padding: '12px 16px', border: '1px solid #d9d9d9',
                  borderRadius: 6, fontSize: 14, color: '#262626', outline: 'none',
                  backgroundColor: '#fff', cursor: 'pointer', appearance: 'none',
                  backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%238c8c8c%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px top 50%', backgroundSize: '10px auto'
                }}
              >
                <option value="">-- Chọn đơn đặt phòng đã check-out --</option>
                {bookings.length === 0 && (
                  <option disabled value="">Bạn chưa có đơn nào đã check-out</option>
                )}
                {bookings.map(b => (
                  <option key={b.id} value={b.id}>
                    #{b.bookingCode || b.id} — {b.details?.[0]?.roomTypeName || b.roomTypeName || 'Phòng'} (Check-out: {b.checkOutDate ? new Date(b.checkOutDate).toLocaleDateString('vi-VN') : '—'})
                  </option>
                ))}
              </select>
            </div>

            {/* Mức độ hài lòng */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#262626', marginBottom: 8 }}>
                Mức độ hài lòng
              </label>
              <div style={{ display: 'flex' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Star 
                    key={star} 
                    filled={star <= formData.rating} 
                    onClick={() => setFormData({...formData, rating: star})} 
                  />
                ))}
              </div>
            </div>

            {/* Chia sẻ trải nghiệm */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#262626', marginBottom: 8 }}>
                Chia sẻ trải nghiệm (Tùy chọn)
              </label>
              <textarea 
                rows="4"
                placeholder="Phòng có sạch sẽ không? Bữa sáng thế nào? Nhân viên có nhiệt tình không?"
                value={formData.comment}
                onChange={(e) => setFormData({...formData, comment: e.target.value})}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d9d9d9',
                  borderRadius: 6,
                  fontSize: 14,
                  color: '#262626',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              ></textarea>
            </div>

            {/* Thêm hình ảnh */}
            <div style={{ marginBottom: 32 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#262626', marginBottom: 8 }}>
                Thêm hình ảnh
              </label>
              <label style={{
                border: '1px dashed #d9d9d9',
                borderRadius: 6,
                padding: imagePreview ? '8px' : '24px',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: '#fafafa',
                transition: 'border-color 0.3s',
                display: 'block',
                position: 'relative'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#b8956a'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#d9d9d9'}
              >
                <input type="file" accept="image/*" hidden onChange={handleImageChange} />
                
                {imagePreview ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: 160, objectFit: 'contain', borderRadius: 4 }} />
                    <button 
                      type="button"
                      onClick={(e) => { e.preventDefault(); setImagePreview(null); setSelectedFile(null); }}
                      style={{
                        position: 'absolute', top: -8, right: -8, background: '#ff4d4f', color: 'white',
                        border: 'none', borderRadius: '50%', width: 24, height: 24, fontSize: 14, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1
                      }}
                    >
                      &times;
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <ImageIcon />
                    <span style={{ fontSize: 14, color: '#8c8c8c' }}>Tải ảnh lên từ thiết bị</span>
                  </div>
                )}
              </label>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 24, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
              <button 
                type="button" 
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 15,
                  fontWeight: 500,
                  color: '#595959',
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting}
                style={{
                  backgroundColor: '#b8956a',
                  color: 'white',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: 4,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => { if(!isSubmitting) e.currentTarget.style.backgroundColor = '#9a7b52'; }}
                onMouseLeave={(e) => { if(!isSubmitting) e.currentTarget.style.backgroundColor = '#b8956a'; }}
              >
                {isSubmitting ? 'Đang gửi...' : 'Gửi Đánh Giá'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
