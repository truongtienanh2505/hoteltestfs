import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import ReviewModal from './ReviewModal';
import { Rate, Tag, Avatar, Button, Empty, Spin, Select } from 'antd';
import { CameraOutlined, MessageOutlined, FilterOutlined } from '@ant-design/icons';

const GOLD = '#b8956a';
const DARK = '#18181b';

export default function CustomerReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('Tất Cả');
  const [selectedRoomType, setSelectedRoomType] = useState('Tất cả');
  const [isFading, setIsFading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/Review/visible');
      setReviews(res.data || []);
    } catch (err) {
      console.error('Failed to fetch reviews', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filter) => {
    if (filter === activeFilter) return;
    setIsFading(true);
    setTimeout(() => {
      setActiveFilter(filter);
      setIsFading(false);
    }, 300);
  };

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) 
    : 0;

  const roomTypes = ['Tất cả', ...new Set(reviews.map(r => r.roomType?.name).filter(Boolean))];

  const filteredReviews = reviews.filter(r => {
    if (selectedRoomType !== 'Tất cả' && r.roomType?.name !== selectedRoomType) return false;
    if (activeFilter === 'Tất Cả') return true;
    if (activeFilter === '5 Sao') return r.rating === 5;
    if (activeFilter === '4 Sao') return r.rating === 4;
    if (activeFilter === '3 Sao') return r.rating === 3;
    if (activeFilter === '2 Sao') return r.rating === 2;
    if (activeFilter === '1 Sao') return r.rating === 1;
    if (activeFilter === 'Có Hình Ảnh') return !!r.imageUrl;
    if (activeFilter === 'Có Bình Luận') return !!r.comment;
    return true;
  });

  const getFilterCount = (filterName) => {
    const baseFilter = reviews.filter(r => selectedRoomType === 'Tất cả' || r.roomType?.name === selectedRoomType);
    if (filterName === 'Tất Cả') return baseFilter.length;
    if (filterName === '5 Sao') return baseFilter.filter(r => r.rating === 5).length;
    if (filterName === '4 Sao') return baseFilter.filter(r => r.rating === 4).length;
    if (filterName === '3 Sao') return baseFilter.filter(r => r.rating === 3).length;
    if (filterName === '2 Sao') return baseFilter.filter(r => r.rating === 2).length;
    if (filterName === '1 Sao') return baseFilter.filter(r => r.rating === 1).length;
    if (filterName === 'Có Hình Ảnh') return baseFilter.filter(r => !!r.imageUrl).length;
    if (filterName === 'Có Bình Luận') return baseFilter.filter(r => !!r.comment).length;
    return 0;
  };

  const filters = [
    'Tất Cả', '5 Sao', '4 Sao', '3 Sao', 'Có Bình Luận', 'Có Hình Ảnh'
  ];

  if (loading) return (
    <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spin size="large" tip="Đang tải đánh giá..." />
    </div>
  );

  return (
    <section style={{ backgroundColor: '#f9f9f9', padding: '60px 24px', fontFamily: "'Inter', sans-serif", minHeight: '80vh' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 400, color: '#18181b', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
            ĐÁNH GIÁ TỪ KHÁCH HÀNG
          </h2>
          <Button 
            type="primary"
            onClick={() => setIsModalOpen(true)}
            style={{ backgroundColor: '#18181b', borderColor: '#18181b', height: 40, padding: '0 24px' }}
          >
            Viết đánh giá của bạn
          </Button>
        </div>
        
        {/* Overview Box */}
        <div style={{ 
          backgroundColor: '#fff', 
          border: '1px solid #e4e4e7', 
          borderRadius: 8, 
          padding: '32px 40px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: 60,
          marginBottom: 32,
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          flexWrap: 'wrap'
        }}>
          
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', color: GOLD }}>
              <span style={{ fontSize: 56, fontWeight: 700, lineHeight: 1 }}>{avgRating}</span>
              <span style={{ fontSize: 24, fontWeight: 500, color: '#71717a', marginLeft: 4 }}>/ 5</span>
            </div>
            <Rate disabled allowHalf defaultValue={parseFloat(avgRating)} style={{ color: GOLD, marginTop: 8 }} />
            <div style={{ fontSize: 13, color: '#71717a', marginTop: 12 }}>
              {reviews.length} Bài đánh giá
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, flex: 1, alignItems: 'center' }}>
            {filters.map(f => (
              <button 
                key={f}
                onClick={() => handleFilterChange(f)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: activeFilter === f ? '#fdf8f3' : '#fff',
                  border: `1px solid ${activeFilter === f ? GOLD : '#e4e4e7'}`,
                  color: activeFilter === f ? GOLD : '#71717a',
                  borderRadius: 999,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: activeFilter === f ? 600 : 400,
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                {f} ({getFilterCount(f)})
              </button>
            ))}

            <Select
              defaultValue="Tất cả"
              style={{ width: 200 }}
              onChange={setSelectedRoomType}
              options={roomTypes.map(rt => ({ value: rt, label: `Loại phòng: ${rt}` }))}
            />
          </div>
        </div>

        {/* Reviews List */}
        <div style={{ 
          opacity: isFading ? 0 : 1, 
          transition: 'opacity 300ms ease-in-out',
          display: 'flex',
          flexDirection: 'column',
          gap: 24
        }}>
          {filteredReviews.length === 0 ? (
            <Empty description="Chưa có đánh giá nào." />
          ) : (
            filteredReviews.map((review) => {
              const fullName = review.user?.fullName || review.user?.username || 'Khách';
              const initial = fullName.charAt(0).toUpperCase();
              
              return (
                <div key={review.id} style={{ 
                  backgroundColor: '#fff',
                  borderRadius: 8,
                  padding: 32,
                  border: '1px solid #e4e4e7',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  display: 'flex',
                  gap: 24
                }}>
                  {/* Avatar */}
                  <div style={{ flexShrink: 0 }}>
                    <Avatar size={48} style={{ backgroundColor: '#f4f4f5', color: '#3f3f46', fontWeight: 600 }}>{initial}</Avatar>
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: '#18181b' }}>{fullName}</div>
                      <div style={{ fontSize: 13, color: '#a1a1aa' }}>
                        {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                    
                    <Rate disabled defaultValue={review.rating} style={{ fontSize: 14, color: GOLD, marginBottom: 12 }} />

                    <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                      {review.roomType?.name && (
                        <Tag color="default">Phòng {review.roomType.name}</Tag>
                      )}
                    </div>

                    <div style={{ fontSize: 15, color: '#3f3f46', lineHeight: 1.6, marginBottom: 16 }}>
                      {review.comment}
                    </div>

                    {review.imageUrl && (
                      <div style={{ marginTop: 12 }}>
                        <img 
                          src={review.imageUrl} 
                          alt="review" 
                          style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8, objectFit: 'cover', cursor: 'pointer' }}
                          onClick={() => window.open(review.imageUrl, '_blank')}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      
      <ReviewModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </section>
  );
}
