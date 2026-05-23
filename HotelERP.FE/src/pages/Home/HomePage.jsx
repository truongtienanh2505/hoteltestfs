import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Dropdown, Avatar, Space, ConfigProvider, theme, Badge, List, Button, Popover } from 'antd';
import { UserOutlined, LogoutOutlined, DashboardOutlined, SettingOutlined } from '@ant-design/icons';
import AttractionMap from '../../components/Map/AttractionMap';
import articleApi from '../../api/articleApi';
import attractionApi from '../../api/attractionApi';
import axiosClient from '../../api/axiosClient';
import RoomSearchWidget from '../../components/RoomSearch/RoomSearchWidget';
import MainFooter from '../../components/Layout/MainFooter';
import roomTypeApi from '../../api/roomTypeApi';

const SLIDES = [
  { id: 1, img: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=2000', title: "Không gian nghỉ dưỡng đẳng cấp,\nhòa mình cùng thiên nhiên." },
  { id: 2, img: 'https://images.unsplash.com/photo-1542314831-c6a4d4586f37?q=80&w=2000', title: "Đặc quyền hội viên thượng lưu,\ntận hưởng kỳ nghỉ trọn vẹn." },
  { id: 3, img: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=2000', title: "Khám phá tinh hoa ẩm thực,\nđánh thức mọi giác quan." },
  { id: 4, img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2000', title: "Thư giãn tuyệt đối tại Spa,\nthanh lọc tâm hồn và cơ thể." },
];
const G = '#b8956a', D = '#111111';
const SF = { fontFamily: "'Playfair Display',serif" };

function formatVND(n) {
  if (n === null || n === undefined) return '';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}

// Dynamic multiple images list for room gallery slider
function getRoomImages(roomType) {
  if (!roomType) return [];
  let dbImages = [];
  if (roomType.images && roomType.images.length > 0) {
    dbImages = roomType.images.map(img => img.imageUrl).filter(Boolean);
  } else if (roomType.imageUrl) {
    dbImages = [roomType.imageUrl];
  }
  
  if (dbImages.length > 0) {
    return dbImages;
  }
  
  const name = (roomType.name || '').toLowerCase();
  let fallbacks = [];
  
  if (name.includes('tiêu chuẩn') || name.includes('standard')) {
    fallbacks = [
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=1200',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1200',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1200'
    ];
  } else if (name.includes('deluxe')) {
    fallbacks = [
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=1200',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=1200',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=1200'
    ];
  } else if (name.includes('premium') || name.includes('cao cấp')) {
    fallbacks = [
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=1200',
      'https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=1200',
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=1200'
    ];
  } else if (name.includes('suite')) {
    fallbacks = [
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?q=80&w=1200',
      'https://images.unsplash.com/photo-1591088398332-8a7791972843?q=80&w=1200',
      'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?q=80&w=1200'
    ];
  } else if (name.includes('tổng thống') || name.includes('president') || name.includes('biệt thự') || name.includes('villa') || name.includes('hoàng gia')) {
    fallbacks = [
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=1200',
      'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?q=80&w=1200',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=1200',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200'
    ];
  } else {
    fallbacks = [
      'https://images.unsplash.com/photo-1542314831-c6a4d4586f37?q=80&w=1200',
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=1200'
    ];
  }
  
  const uniqueImages = [...dbImages];
  for (const img of fallbacks) {
    if (!uniqueImages.includes(img)) {
      uniqueImages.push(img);
    }
  }
  return uniqueImages;
}

// Chuyển tên danh mục → URL slug
function toCatSlug(name) {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
}
function articlePath(categoryName, slug) {
  const catSlug = toCatSlug(categoryName);
  return catSlug ? `/news/${catSlug}/${slug}` : `/news/${slug}`;
}

/* ═══════════════════════════════════════════════════════════ */
/*  HELPERS                                                     */
/* ═══════════════════════════════════════════════════════════ */
const CLOUDINARY_BASE = 'https://res.cloudinary.com/dfvdvkssv/image/upload/hotel_placeholders';

const getPlaceholderImage = (item) => {
  if (item.imageUrl && (item.imageUrl.startsWith('http') || item.imageUrl.startsWith('https'))) return item.imageUrl;
  
  const name = (item.name || '').toLowerCase();
  const type = (item.type || '').toLowerCase();

  if (name.includes('biển') || name.includes('beach') || name.includes('vịnh')) 
    return `${CLOUDINARY_BASE}/beach_placeholder.jpg`;
  if (name.includes('chợ') || name.includes('market') || name.includes('trung tâm')) 
    return `${CLOUDINARY_BASE}/market_placeholder.jpg`;
  if (name.includes('bảo tàng') || name.includes('museum') || name.includes('triển lãm') || name.includes('di tích')) 
    return `${CLOUDINARY_BASE}/museum_placeholder.jpg`;
  if (name.includes('phố') || name.includes('street') || name.includes('quảng trường')) 
    return `${CLOUDINARY_BASE}/street_placeholder.jpg`;
  if (name.includes('chùa') || name.includes('pagoda') || name.includes('đền') || name.includes('nhà thờ') || name.includes('tháp')) 
    return `${CLOUDINARY_BASE}/pagoda_placeholder.jpg`;
  if (name.includes('vui chơi') || name.includes('park') || name.includes('công viên') || type.includes('giải trí')) 
    return `${CLOUDINARY_BASE}/park_placeholder.jpg`;
  if (name.includes('nhà hàng') || name.includes('ăn uống') || name.includes('food') || name.includes('quán')) 
    return `${CLOUDINARY_BASE}/food_placeholder.jpg`;
  if (name.includes('thác') || name.includes('nước') || name.includes('suối')) 
    return `${CLOUDINARY_BASE}/waterfall_placeholder.jpg`;
  if (name.includes('núi') || name.includes('rừng') || name.includes('đèo')) 
    return `${CLOUDINARY_BASE}/mountain_placeholder.jpg`;
  if (name.includes('golf') || name.includes('sân')) 
    return `${CLOUDINARY_BASE}/golf_placeholder.jpg`;
  if (name.includes('làng') || name.includes('truyền thống') || name.includes('nghề')) 
    return `${CLOUDINARY_BASE}/village_placeholder.jpg`;
  if (name.includes('hoàng hôn') || name.includes('sunset') || name.includes('ngắm')) 
    return `${CLOUDINARY_BASE}/sunset_placeholder.jpg`;
  
  return 'https://res.cloudinary.com/dfvdvkssv/image/upload/v1778288591/hotel_placeholders/market_placeholder.jpg';
};

const MembershipSection = ({ nav }) => {
  const tiers = [
    { name: 'Khách Mới', points: 0, discount: 0, color: '#a1a1aa', icon: '🌱' },
    { name: 'Đồng', points: 500, discount: 2, color: '#cd7f32', icon: '🥉' },
    { name: 'Bạc', points: 1000, discount: 5, color: '#c0c0c0', icon: '🥈' },
    { name: 'Vàng', points: 3000, discount: 8, color: '#ffd700', icon: '🥇' },
    { name: 'Bạch Kim', points: 5000, discount: 10, color: '#e5e4e2', icon: '💎' },
    { name: 'Kim Cương', points: 10000, discount: 15, color: '#b9f2ff', icon: '✨' },
    { name: 'Elite', points: 20000, discount: 20, color: '#ff8c00', icon: '🌟' },
    { name: 'VIP', points: 50000, discount: 25, color: '#ff4500', icon: '👑' },
    { name: 'VVIP', points: 100000, discount: 30, color: '#9400d3', icon: '🔥' },
    { name: 'Signature', points: 200000, discount: 35, color: '#b8956a', icon: '⚜️' },
  ];

  return (
    <section id="member" style={{ background: '#0a0a0a', padding: '120px 24px', color: 'white' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 80 }}>
           <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.4em', textTransform: 'uppercase', color: G, display: 'block', marginBottom: 16 }}>Đặc Quyền Hội Viên</span>
           <h2 style={{ ...SF, fontSize: 'clamp(36px,5vw,56px)', color: 'white', marginBottom: 28, fontWeight: 400 }}>Hội Viên Asteria Rewards</h2>
           <p style={{ maxWidth: 700, margin: '0 auto', color: 'rgba(255,255,255,0.5)', fontSize: 16, lineHeight: 1.8, fontWeight: 300 }}>
             Tham gia chương trình khách hàng thân thiết để tận hưởng thế giới đặc quyền. <br/>
             Giảm giá trực tiếp khi đặt phòng, tích lũy điểm và trải nghiệm những dịch vụ cá nhân hóa đỉnh cao.
           </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 24 }}>
          {tiers.map((t, idx) => (
            <div key={idx} style={{ 
              background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)', 
              border: '1px solid rgba(255,255,255,0.08)', 
              borderRadius: 4, 
              padding: '40px 24px', 
              textAlign: 'center',
              transition: 'all 400ms cubic-bezier(0.25, 1, 0.5, 1)',
              cursor: 'default',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = G;
              e.currentTarget.style.background = 'rgba(184,149,106,0.08)';
              e.currentTarget.style.transform = 'translateY(-10px)';
              e.currentTarget.querySelector('.glow').style.opacity = '0.5';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.background = 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.querySelector('.glow').style.opacity = '0';
            }}>
              <div className="glow" style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at center, ${t.color}33 0%, transparent 70%)`, opacity: 0, transition: 'opacity 400ms' }} />
              <div style={{ fontSize: 36, marginBottom: 20, filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))' }}>{t.icon}</div>
              <h3 style={{ color: t.color, fontSize: 20, marginBottom: 12, fontWeight: 500, letterSpacing: '0.5px' }}>{t.name}</h3>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'white', marginBottom: 16, fontFamily: "'Inter', sans-serif" }}>
                {t.discount}% <span style={{fontSize: 12, fontWeight: 300, color: 'rgba(255,255,255,0.4)', verticalAlign: 'middle', marginLeft: 4}}>ƯU ĐÃI</span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600 }}>Từ {t.points.toLocaleString()} điểm</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 100, background: 'rgba(255,255,255,0.02)', borderRadius: 2, padding: '64px', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
           <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 64, alignItems: 'center' }}>
              <div>
                <h4 style={{ color: G, fontSize: 24, marginBottom: 32, ...SF, fontWeight: 400, letterSpacing: '1px' }}>Quyền lợi hạng thẻ</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 40px' }}>
                   {[
                     { t: 'Đặt phòng ưu đãi', d: 'Giảm giá trực tiếp từ 2% - 35% tùy theo hạng thành viên hiện tại.' },
                     { t: 'Tích lũy linh hoạt', d: 'Nhận 1 điểm cho mỗi 10,000đ chi tiêu tại resort.' },
                     { t: 'Quà tặng sinh nhật', d: 'Voucher nghỉ dưỡng đặc biệt gửi tặng vào tháng sinh nhật.' },
                     { t: 'Ưu tiên dịch vụ', d: 'Check-in sớm, Check-out muộn và nâng hạng phòng miễn phí.' },
                     { t: 'Secret Deals', d: 'Truy cập các gói ưu đãi bí mật không công khai trên Website.' },
                     { t: 'Đội ngũ hỗ trợ 24/7', d: 'Đường dây nóng dành riêng cho hội viên cao cấp.' }
                   ].map((item, i) => (
                     <div key={i} style={{ display: 'flex', gap: 16 }}>
                       <span style={{ color: G, fontSize: 18 }}>✦</span>
                       <div>
                         <div style={{ color: 'white', fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{item.t}</div>
                         <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.5 }}>{item.d}</div>
                       </div>
                     </div>
                   ))}
                </div>
              </div>
              <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: 64 }}>
                <div style={{ width: 60, height: 60, border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 24 }}>✨</div>
                <h5 style={{ color: 'white', fontSize: 18, marginBottom: 16 }}>Gia nhập ngay hôm nay</h5>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>Đăng ký tài khoản để bắt đầu hành trình tích lũy và tận hưởng ưu đãi.</p>
                <button onClick={() => nav('/register')} style={{ background: 'white', color: 'black', border: 'none', padding: '18px 48px', borderRadius: 2, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 300ms', letterSpacing: '2px', textTransform: 'uppercase' }} onMouseEnter={e => { e.target.style.background = G; e.target.style.color = 'white'; }} onMouseLeave={e => { e.target.style.background = 'white'; e.target.style.color = 'black'; }}>Đăng ký hội viên</button>
              </div>
           </div>
        </div>
      </div>
    </section>
  );
};

import MainHeader from '../../components/Layout/MainHeader';

export default function HomePage() {
  const nav = useNavigate();
  const { user, isAuthenticated, logout, login, token, refreshToken, permissions } = useAuthStore();
  const isAdmin = isAuthenticated && (user?.roleName === 'Admin' || user?.role?.name === 'Admin' || user?.role === 'Admin' || user?.roleId === 1);

  // Tự động fetch profile lấy Avatar nếu user thiếu (do login payload chưa đủ)
  useEffect(() => {
    if (isAuthenticated && !user?.membershipTier) {
      axiosClient.get('/UserProfile/my-profile')
        .then(res => {
          const d = res.data?.data || res.data;
          if (d) {
            login({ 
              ...user, 
              avatarUrl: d.avatarUrl || user?.avatarUrl, 
              fullName: d.fullName || user?.fullName,
              membershipTier: d.membershipTier,
              membershipDiscount: d.membershipDiscount,
              loyaltyPoints: d.loyaltyPoints
            }, token, refreshToken, permissions);
          }
        })
        .catch(err => console.log('Could not fetch profile:', err));
    }
  }, [isAuthenticated, token]);

  const [articles, setArticles] = useState([]);
  const [attractions, setAttractions] = useState([]);
  const [cur, setCur] = useState(0);
  const [play, setPlay] = useState(true);
  const [dragStartX, setDragStartX] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);

  // States for room types images slider
  const [roomTypes, setRoomTypes] = useState([]);
  const [selectedRoomTypeIndex, setSelectedRoomTypeIndex] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isHoveringRoomSlider, setIsHoveringRoomSlider] = useState(false);

  const handleDragStart = (e) => {
    setDragStartX(e.type === 'touchstart' ? e.touches[0].clientX : e.clientX);
    setPlay(false);
  };
  const handleDragMove = (e) => {
    if (dragStartX === null) return;
    const currentX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    setDragOffset(currentX - dragStartX);
  };
  const handleDragEnd = () => {
    if (dragStartX === null) return;
    if (dragOffset > 50) setCur(p => (p - 1 + SLIDES.length) % SLIDES.length);
    else if (dragOffset < -50) setCur(p => (p + 1) % SLIDES.length);
    setDragStartX(null);
    setDragOffset(0);
    setPlay(true);
  };

  useEffect(() => { let t; if (play) t = setInterval(() => setCur(p => (p + 1) % SLIDES.length), 5000); return () => clearInterval(t); }, [play, cur]);
  useEffect(() => {
    articleApi.search().then(r => setArticles((r.data || []).slice(0, 6))).catch(() => { });
    attractionApi.getAll().then(r => setAttractions(
      (r.data || [])
        .filter(a => a.status === 'ACTIVE')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    )).catch(() => { });
  }, []);

  // Fetch room types
  useEffect(() => {
    roomTypeApi.getAll()
      .then(data => {
        if (data && data.length > 0) {
          setRoomTypes(data);
        }
      })
      .catch(err => {
        console.error('Error fetching room types:', err);
      });
  }, []);

  // Reset active image index whenever the selected room type changes
  useEffect(() => {
    setActiveImageIndex(0);
  }, [selectedRoomTypeIndex]);

  // Auto-play for room image slider
  useEffect(() => {
    if (isHoveringRoomSlider) return;
    const activeRoom = roomTypes[selectedRoomTypeIndex] || null;
    const imgs = getRoomImages(activeRoom);
    
    if (imgs.length <= 1) return;
    
    const timer = setInterval(() => {
      setActiveImageIndex(prev => (prev + 1) % imgs.length);
    }, 4500);
    
    return () => clearInterval(timer);
  }, [roomTypes, selectedRoomTypeIndex, isHoveringRoomSlider]);
  useEffect(() => {
    document.title = 'Asteria Resort - Không gian nghỉ dưỡng đẳng cấp';
    // Handle anchor scroll if exists
    if (window.location.hash) {
      const id = window.location.hash.substring(1);
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [window.location.hash]);

  // Auto-advance destinations slider mỗi 4 giây, dừng khi hover
  useEffect(() => {
    if (attractions.length === 0) return;
    const CARDS_PER_PAGE = 4;
    const totalPages = Math.ceil(attractions.length / CARDS_PER_PAGE);
    if (totalPages <= 1) return;

    let paused = false;
    const advance = () => {
      if (paused) return;
      const el = document.getElementById('dest-track');
      if (!el) return;
      const idx = parseInt(el.dataset.page || '0');
      const next = (idx + 1) % totalPages;
      el.style.transform = `translateX(-${next * 100}%)`;
      el.dataset.page = String(next);
    };

    const timer = setInterval(advance, 4000);

    // Dừng khi hover vào slider
    const container = document.querySelector('#attractions-sec');
    const onEnter = () => { paused = true; };
    const onLeave = () => { paused = false; };
    if (container) {
      container.addEventListener('mouseenter', onEnter);
      container.addEventListener('mouseleave', onLeave);
    }

    return () => {
      clearInterval(timer);
      if (container) {
        container.removeEventListener('mouseenter', onEnter);
        container.removeEventListener('mouseleave', onLeave);
      }
    };
  }, [attractions]);

  return (
    <div style={{ background: '#fafafa', minHeight: '100vh', fontFamily: "'Inter',sans-serif" }}>
      <MainHeader transparent={true} />

      {/* HERO */}
      <section
        id="hero-sec"
        style={{ position: 'relative', height: '100vh', background: '#000', overflow: 'hidden', cursor: dragStartX !== null ? 'grabbing' : 'grab' }}
        onMouseDown={handleDragStart} onMouseMove={handleDragMove} onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd}
        onTouchStart={handleDragStart} onTouchMove={handleDragMove} onTouchEnd={handleDragEnd}
      >
        {/* ── Sliding image track — CHỈ ảnh di chuyển ── */}
        <div style={{ display: 'flex', height: '100%', width: `${SLIDES.length * 100}%`, transform: `translateX(calc(-${cur * (100 / SLIDES.length)}% + ${dragOffset}px))`, transition: dragStartX === null ? 'transform 600ms cubic-bezier(0.25, 1, 0.5, 1)' : 'none', willChange: 'transform' }}>
          {SLIDES.map((s, i) => (
            <div key={s.id} style={{ width: `${100 / SLIDES.length}%`, height: '100%', position: 'relative' }}>
              <img src={s.img} alt="slide" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: i === cur ? 'scale(1.05)' : 'scale(1)', transition: 'transform 10s ease-out', pointerEvents: 'none' }} />
            </div>
          ))}
        </div>

        {/* ── Gradient overlay cố định ── */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right,rgba(0,0,0,.82) 0%,rgba(0,0,0,.45) 55%,rgba(0,0,0,.1) 100%)', zIndex: 2, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.5) 0%,transparent 50%)', zIndex: 2, pointerEvents: 'none' }} />

        {/* ── Text overlay CỐ ĐỊNH — không di chuyển theo ảnh ── */}
        <div style={{ position: 'absolute', zIndex: 10, top: '50%', left: 'clamp(40px,8vw,160px)', transform: 'translateY(-50%)', color: 'white', maxWidth: 580 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.35em', textTransform: 'uppercase', color: G, display: 'block', marginBottom: 20, opacity: 0.9 }}>Asteria Resort</span>
          <h1 style={{ fontFamily: "'Inter',sans-serif", fontSize: 'clamp(30px,3.6vw,52px)', fontWeight: 700, letterSpacing: '-0.5px', whiteSpace: 'pre-line', lineHeight: 1.15, marginBottom: 24, margin: '0 0 24px' }}>
            {`NGHỈ DƯỠNG\nĐẲNG CẤP THẾ GIỚI`}
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,.75)', lineHeight: 1.85, marginBottom: 40, maxWidth: 460 }}>
            Asteria Resort — nơi hội tụ tinh hoa ẩm thực, spa thư giãn và những trải nghiệm độc đáo dành riêng cho những vị khách tinh tế nhất.
          </p>
        </div>

        {/* Controls */}
        <div style={{ position: 'absolute', bottom: 64, left: 'clamp(40px,8vw,160px)', zIndex: 30, display: 'flex', alignItems: 'center', gap: 32, color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 80, height: 2, background: 'rgba(255,255,255,.3)', position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', background: 'white', width: `${((cur + 1) / SLIDES.length) * 100}%`, transition: 'width 400ms ease' }} />
            </div>
            <span style={{ fontSize: 12, letterSpacing: '2px', opacity: .7, fontFamily: "'Inter',sans-serif" }}>{cur + 1} / {SLIDES.length}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <button onClick={() => setCur(p => (p - 1 + SLIDES.length) % SLIDES.length)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontSize: 12, padding: 8 }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,.7)'}>‹</button>
            <button onClick={() => setPlay(!play)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontSize: 10, display: 'flex', gap: 2, padding: 8 }} onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.7)'}>
              {play ? <><span>❚</span><span>❚</span></> : <span>▶</span>}
            </button>
            <button onClick={() => setCur(p => (p + 1) % SLIDES.length)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontSize: 12, padding: 8 }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,.7)'}>›</button>
          </div>
        </div>
      </section>



      {/* INTRO + ROOM CARDS */}
      <section style={{ background: 'white', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {(() => {
            const FALLBACK_ROOM_TYPES = [
              {
                id: 1,
                name: 'Phòng Tiêu Chuẩn',
                description: 'Không gian nghỉ dưỡng thoải mái, tiện nghi với đầy đủ trang thiết bị hiện đại.',
                basePrice: 500000,
                capacityAdults: 2,
                capacityChildren: 1,
                imageUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=600',
                images: [{ imageUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=600' }]
              },
              {
                id: 2,
                name: 'Phòng Deluxe',
                description: 'Trải nghiệm sự tinh tế với ban công riêng hướng vườn hoa thơ mộng.',
                basePrice: 900000,
                capacityAdults: 2,
                capacityChildren: 2,
                imageUrl: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=600',
                images: [{ imageUrl: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=600' }]
              },
              {
                id: 3,
                name: 'Phòng Premium',
                description: 'Thiết kế sang trọng, tối ưu tầm nhìn bao quát toàn bộ khuôn viên resort.',
                basePrice: 1200000,
                capacityAdults: 2,
                capacityChildren: 2,
                imageUrl: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=600',
                images: [{ imageUrl: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=600' }]
              },
              {
                id: 4,
                name: 'Phòng Gia Đình',
                description: 'Lựa chọn hoàn hảo cho kỳ nghỉ của gia đình nhỏ với hai không gian kết nối.',
                basePrice: 1500000,
                capacityAdults: 4,
                capacityChildren: 2,
                imageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=600',
                images: [{ imageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=600' }]
              },
              {
                id: 5,
                name: 'Biệt Thự Hoàng Gia',
                description: 'Đẳng cấp thượng lưu với hồ bơi riêng biệt, quản gia riêng phục vụ 24/7.',
                basePrice: 8000000,
                capacityAdults: 6,
                capacityChildren: 4,
                imageUrl: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?q=80&w=600',
                images: [{ imageUrl: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?q=80&w=600' }]
              }
            ];

            const displayRoomTypes = roomTypes.length > 0 ? roomTypes : FALLBACK_ROOM_TYPES;
            const activeRoomType = displayRoomTypes[selectedRoomTypeIndex] || displayRoomTypes[0];
            const roomImages = getRoomImages(activeRoomType);

            return (
              <>
                <div className="room-gallery-grid">
                  <div>
                    <span className="section-tag" style={{ color: G, marginBottom: 16 }}>
                      Phòng Nghỉ - {activeRoomType?.name}
                    </span>
                    <h2 style={{ ...SF, fontSize: 'clamp(28px,4vw,44px)', color: '#18181b', marginBottom: 20, lineHeight: 1.2 }}>
                      {activeRoomType?.name || 'Tìm kiếm không gian hoàn hảo cho kỳ nghỉ.'}
                    </h2>
                    <div className="gold-divider" style={{ marginBottom: 24 }} />
                    <p style={{ fontSize: 14, color: '#71717a', lineHeight: 1.9, marginBottom: 20 }}>
                      {activeRoomType?.description || 'Tận hưởng sự yên bình tuyệt đối trong không gian sang trọng được thiết kế tinh tế. Từ ban công riêng tư, quý khách có thể chiêm ngưỡng trọn vẹn vẻ đẹp của bình minh.'}
                    </p>

                    {/* Price & Capacity info box */}
                    <div style={{ background: 'rgba(184,149,106,0.05)', borderLeft: `3px solid ${G}`, padding: '12px 18px', marginBottom: 28, borderRadius: '0 4px 4px 0' }}>
                      <div style={{ fontSize: 12, color: '#71717a', marginBottom: 4 }}>Giá phòng cơ bản:</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: G, fontFamily: "'Playfair Display', serif" }}>
                        {formatVND(activeRoomType?.basePrice)}
                        <span style={{ fontSize: 14, fontWeight: 400, color: '#71717a', fontFamily: "'Inter', sans-serif" }}> / đêm</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#a1a1aa', marginTop: 6, display: 'flex', gap: 12 }}>
                        <span>👥 Sức chứa: {activeRoomType?.capacityAdults} Người lớn</span>
                        {activeRoomType?.capacityChildren > 0 && <span>👶 {activeRoomType.capacityChildren} Trẻ em</span>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                      <div>
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#71717a', display: 'block', marginBottom: 4 }}>Hotline Đặt Phòng</span>
                        <span style={{ fontSize: 22, ...SF, color: G }}>0363 332 841</span>
                      </div>
                      <button 
                        onClick={() => window.dispatchEvent(new CustomEvent('open-booking-widget'))}
                        style={{
                          background: G, color: 'white', border: 'none', padding: '12px 28px',
                          fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                          borderRadius: 2, cursor: 'pointer', transition: 'all 200ms', outline: 'none'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#a3815c'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = G; }}
                      >
                        Đặt phòng ngay
                      </button>
                    </div>
                  </div>

                  {/* Large Image Carousel */}
                  <div 
                    className="room-gallery-carousel"
                    onMouseEnter={() => setIsHoveringRoomSlider(true)}
                    onMouseLeave={() => setIsHoveringRoomSlider(false)}
                  >
                    <img 
                      key={roomImages[activeImageIndex]}
                      src={roomImages[activeImageIndex]} 
                      alt={activeRoomType?.name || "Room"} 
                      className="room-fade-in"
                      onClick={() => {
                        if (roomImages.length > 1) {
                          setActiveImageIndex(prev => (prev + 1) % roomImages.length);
                        }
                      }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'all 500ms ease', cursor: roomImages.length > 1 ? 'pointer' : 'default' }} 
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 40%)', pointerEvents: 'none' }} />
                    
                    {/* Navigation Arrows */}
                    {roomImages.length > 1 && (
                      <>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImageIndex(prev => (prev - 1 + roomImages.length) % roomImages.length);
                          }}
                          style={{
                            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                            width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.6)',
                            border: '1px solid rgba(255,255,255,0.25)', color: 'white', fontSize: 18,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 200ms', outline: 'none', zIndex: 10
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = G; e.currentTarget.style.borderColor = G; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.6)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}
                        >
                          ‹
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImageIndex(prev => (prev + 1) % roomImages.length);
                          }}
                          style={{
                            position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                            width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.6)',
                            border: '1px solid rgba(255,255,255,0.25)', color: 'white', fontSize: 18,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 200ms', outline: 'none', zIndex: 10
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = G; e.currentTarget.style.borderColor = G; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.6)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}
                        >
                          ›
                        </button>
                      </>
                    )}

                    {/* Dot indicators */}
                    {roomImages.length > 1 && (
                      <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6, zIndex: 10 }}>
                        {roomImages.map((_, dotIdx) => (
                          <div 
                            key={dotIdx}
                            onClick={() => setActiveImageIndex(dotIdx)}
                            style={{ 
                              width: dotIdx === activeImageIndex ? 20 : 6, 
                              height: 6, 
                              borderRadius: 3, 
                              background: dotIdx === activeImageIndex ? G : 'rgba(255,255,255,0.5)', 
                              cursor: 'pointer',
                              transition: 'all 300ms ease'
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Horizontal scroll list of room types */}
                <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }}>
                  {displayRoomTypes.map((room, i) => {
                    const isSelected = i === selectedRoomTypeIndex;
                    const imgUrl = room.imageUrl || room.images?.[0]?.imageUrl || 'https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=600';
                    
                    return (
                      <div 
                        key={room.id || i} 
                        onClick={() => {
                          setSelectedRoomTypeIndex(i);
                          setActiveImageIndex(0);
                        }}
                        className={`room-card-item${isSelected ? ' selected' : ''}`}
                      >
                        <img 
                          src={imgUrl} 
                          alt={room.name} 
                          className="room-card-img"
                        />
                        <div className="room-card-overlay" />
                        
                        {/* Price Badge */}
                        <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.65)', border: `1px solid ${G}`, borderRadius: 4, padding: '3px 8px', fontSize: 11, color: 'white', fontWeight: 600 }}>
                          {formatVND(room.basePrice)}
                        </div>
                        
                        <p style={{ 
                          position: 'absolute', 
                          bottom: 16, 
                          left: 16, 
                          right: 16,
                          color: 'white', 
                          ...SF, 
                          fontSize: 16, 
                          fontWeight: 600,
                          margin: 0,
                          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {room.name}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      </section>

      {/* ATTRACTIONS (Destinations style) */}
      <section id="attractions-sec" style={{ background: 'white', padding: '80px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, flexWrap: 'wrap', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <h2 style={{ ...SF, fontSize: 'clamp(32px,4vw,44px)', color: '#18181b', margin: 0, fontWeight: 400 }}>Destinations</h2>
              <div style={{ width: 1, height: 24, background: '#d4d4d8' }} />
              <span style={{ fontSize: 16, color: '#3f3f46', fontWeight: 500 }}>Điểm đến</span>
            </div>
            <button onClick={() => nav('/attractions')} style={{ background: '#18181b', color: 'white', border: 'none', borderRadius: 999, padding: '8px 20px', fontSize: 13, cursor: 'pointer', transition: 'opacity 200ms' }} onMouseEnter={e => e.target.style.opacity = '0.8'} onMouseLeave={e => e.target.style.opacity = '1'}>Nổi bật</button>
          </div>

          <div style={{ width: '100%', height: 1, background: '#e4e4e7', marginBottom: 40 }} />
        </div>

        {attractions.length === 0
          ? <p style={{ textAlign: 'center', color: '#71717a', fontSize: 14 }}>Đang tải...</p>
          : (() => {
              const CARDS_PER_PAGE = 4;
              const GAP = 4;
              // Không duplicate — dùng vòng cung modulo (0 → 1 → ... → 0)
              const srcList = attractions;
              const totalPages = Math.ceil(srcList.length / CARDS_PER_PAGE);

              return (
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 64px', position: 'relative' }}>
                  {/* Arrow trái — nằm trong vùng padding bên trái */}
                  <button id="dest-prev"
                    onClick={() => {
                      const el = document.getElementById('dest-track');
                      const idx = parseInt(el.dataset.page || '0');
                      const next = (idx - 1 + totalPages) % totalPages;
                      el.style.transform = `translateX(-${next * 100}%)`;
                      el.dataset.page = next;
                    }}
                    style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: 40, height: 40, borderRadius: '50%', background: 'white', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 250ms' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#18181b'; e.currentTarget.querySelector('svg').style.stroke = 'white'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.querySelector('svg').style.stroke = '#18181b'; }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#18181b" strokeWidth="2" style={{ transition: 'stroke 250ms' }}><path d="M15 18l-6-6 6-6"/></svg>
                  </button>

                  {/* Arrow phải — nằm trong vùng padding bên phải */}
                  <button id="dest-next"
                    onClick={() => {
                      const el = document.getElementById('dest-track');
                      const idx = parseInt(el.dataset.page || '0');
                      const next = (idx + 1) % totalPages;
                      el.style.transform = `translateX(-${next * 100}%)`;
                      el.dataset.page = next;
                    }}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: 40, height: 40, borderRadius: '50%', background: 'white', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 250ms' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#18181b'; e.currentTarget.querySelector('svg').style.stroke = 'white'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.querySelector('svg').style.stroke = '#18181b'; }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#18181b" strokeWidth="2" style={{ transition: 'stroke 250ms' }}><path d="M9 18l6-6-6-6"/></svg>
                  </button>

                  {/* Track wrapper */}
                  <div style={{ overflow: 'hidden' }}>
                    <div id="dest-track" data-page="0"
                      style={{ display: 'flex', transition: 'transform 550ms cubic-bezier(0.25,1,0.5,1)', willChange: 'transform' }}>
                      {Array.from({ length: totalPages }).map((_, pageIdx) => {
                        const pageCards = srcList.slice(pageIdx * CARDS_PER_PAGE, (pageIdx + 1) * CARDS_PER_PAGE);
                        const colCount = pageCards.length;

                        return (
                          <div key={pageIdx} style={{ minWidth: '100%', display: 'grid', gridTemplateColumns: `repeat(${colCount}, 1fr)`, gap: GAP, padding: `0 ${GAP}px` }}>
                            {pageCards.map((a, ci) => {
                              let galleryUrls = [];
                              try { galleryUrls = a.galleryImages ? JSON.parse(a.galleryImages).filter(Boolean) : []; } catch {}
                              const mainImg = getPlaceholderImage(a);
                              const fallback = 'https://res.cloudinary.com/dfvdvkssv/image/upload/v1778288591/hotel_placeholders/market_placeholder.jpg';
                              const allImgs = [mainImg, ...galleryUrls].slice(0, 4);
                              const totalImgs = allImgs.length;

                              const ImgCell = ({ src, alt }) => (
                                <div style={{ overflow: 'hidden', width: '100%', height: '100%' }}>
                                  <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    onError={ev => { ev.target.onerror = null; ev.target.src = fallback; }} />
                                </div>
                              );

                              const renderCollage = () => {
                                if (totalImgs === 1) return <ImgCell src={allImgs[0]} alt={a.name} />;
                                if (totalImgs === 2) return (
                                  <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 2, width: '100%', height: '100%' }}>
                                    <ImgCell src={allImgs[0]} alt={a.name} />
                                    <ImgCell src={allImgs[1]} alt={a.name + ' 2'} />
                                  </div>
                                );
                                if (totalImgs === 3) return (
                                  <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 2, width: '100%', height: '100%' }}>
                                    <ImgCell src={allImgs[0]} alt={a.name} />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                      <ImgCell src={allImgs[1]} alt={a.name + ' 2'} />
                                      <ImgCell src={allImgs[2]} alt={a.name + ' 3'} />
                                    </div>
                                  </div>
                                );
                                return (
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 2, width: '100%', height: '100%' }}>
                                    <ImgCell src={allImgs[0]} alt={a.name} />
                                    <ImgCell src={allImgs[1]} alt={a.name + ' 2'} />
                                    <ImgCell src={allImgs[2]} alt={a.name + ' 3'} />
                                    <ImgCell src={allImgs[3]} alt={a.name + ' 4'} />
                                  </div>
                                );
                              };

                              return (
                                <div key={a.id + '-p' + pageIdx + '-' + ci}
                                  style={{ position: 'relative', height: 480, overflow: 'hidden', cursor: 'pointer', borderRadius: 0, background: '#111' }}
                                  onMouseEnter={e => {
                                    e.currentTarget.querySelector('.ov-bg').style.background = 'rgba(0,0,0,0.55)';
                                    e.currentTarget.querySelector('.hv-cnt').style.opacity = '1';
                                    e.currentTarget.querySelector('.hv-cnt').style.transform = 'translateY(0)';
                                    e.currentTarget.querySelector('.df-title').style.opacity = '0';
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.querySelector('.ov-bg').style.background = 'linear-gradient(to top,rgba(0,0,0,0.75) 0%,transparent 50%)';
                                    e.currentTarget.querySelector('.hv-cnt').style.opacity = '0';
                                    e.currentTarget.querySelector('.hv-cnt').style.transform = 'translateY(20px)';
                                    e.currentTarget.querySelector('.df-title').style.opacity = '1';
                                  }}
                                  onClick={() => nav('/attractions')}
                                >
                                  {renderCollage()}
                                  <div className="ov-bg" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,0.75) 0%,transparent 50%)', transition: 'background 400ms', pointerEvents: 'none' }} />
                                  <div className="df-title" style={{ position: 'absolute', bottom: 28, left: 20, right: 20, transition: 'opacity 400ms', pointerEvents: 'none' }}>
                                    <h3 style={{ color: 'white', fontSize: 17, fontWeight: 600, margin: 0, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>{a.name}</h3>
                                    {totalImgs > 1 && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>📷 {totalImgs} ảnh</span>}
                                  </div>
                                  <div className="hv-cnt" style={{ position: 'absolute', inset: 0, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', opacity: 0, transform: 'translateY(20px)', transition: 'all 400ms', pointerEvents: 'none' }}>
                                    <h3 style={{ color: 'white', fontSize: 19, fontWeight: 600, marginBottom: 20, textAlign: 'center' }}>{a.name}</h3>
                                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', pointerEvents: 'all' }}>
                                      <button style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.5)', color: 'white', padding: '7px 14px', borderRadius: 999, fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer' }}
                                        onMouseEnter={e => { e.target.style.background = 'white'; e.target.style.color = '#18181b'; }}
                                        onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = 'white'; }}>Xem chi tiết</button>
                                      <button style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.5)', color: 'white', padding: '7px 14px', borderRadius: 999, fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer' }}
                                        onMouseEnter={e => { e.target.style.background = 'white'; e.target.style.color = '#18181b'; }}
                                        onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = 'white'; }}>Bản đồ</button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
      </section>


      {/* NEWS */}
      <section id="news-sec" style={{ background: '#fafafa', padding: '80px 24px 80px', scrollMarginTop: '64px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.3em', textTransform: 'uppercase', color: G, display: 'block', marginBottom: 16 }}>Thông Cáo Báo Chí</span>
              <h2 style={{ ...SF, fontSize: 'clamp(28px,4vw,44px)', color: '#18181b', margin: 0, fontWeight: 400 }}>Tin Tức Mới Nhất Từ Resort</h2>
            </div>
            <button onClick={() => nav('/news')} style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', paddingBottom: 8 }}
              onMouseEnter={e => e.target.style.color = G} onMouseLeave={e => e.target.style.color = '#71717a'}>Xem tất cả</button>
          </div>
          {/* 3 cột cố định — row 1 (3 bài) vừa viewport khi scroll tới #news-sec, row 2 buộc phải kéo thêm */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
            {articles.length === 0 ? <p style={{ color: '#71717a', fontSize: 14, fontStyle: 'italic' }}>Đang tải bài viết...</p> : articles.map(item => (
              <div key={item.id} onClick={() => nav(articlePath(item.categoryNames?.[0] || item.categoryName, item.slug))} style={{ background: 'white', cursor: 'pointer', border: '1px solid #eaeaea', transition: 'box-shadow 300ms' }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 10px 40px rgba(0,0,0,.08)';
                  e.currentTarget.querySelector('img').style.transform = 'scale(1.05)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.querySelector('img').style.transform = 'scale(1)';
                }}>
                <div style={{ height: 240, overflow: 'hidden' }}>
                  <img src={item.thumbnailUrl || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=600'} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 700ms ease' }} />
                </div>
                <div style={{ padding: '24px 24px 32px' }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                    {(item.categoryNames || (item.categoryName ? [item.categoryName] : [])).map(c => (
                      <span key={c} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#b8956a' }}>
                        {c}
                      </span>
                    ))}
                  </div><p style={{ fontSize: 10, color: '#9ca3af', marginBottom: 10, fontWeight: 500 }}>{new Date(item.publishedAt || new Date()).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <h3 style={{ ...SF, fontSize: 20, color: '#18181b', lineHeight: 1.4, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontWeight: 500 }}>{item.title}</h3>
                  <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: G, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Đọc thêm →</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* MEMBERSHIP */}
      <div id="member">
        <MembershipSection nav={nav} />
      </div>

      {/* FOOTER */}
      <MainFooter />


    </div>
  );
}
