import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Spin } from 'antd';
import { SearchOutlined, EnvironmentOutlined } from '@ant-design/icons';
import attractionApi from '../../api/attractionApi';
import MainHeader from '../../components/Layout/MainHeader';
import MainFooter from '../../components/Layout/MainFooter';

// ── Fix default icon bị mất trong Vite/Webpack ──────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const GOLD  = '#b8956a';
const DARK  = '#111111';
const HOTEL = { lat: 10.948386, lng: 106.790938 };

// Icon hotel màu xanh — ghim kiểu Google Maps
const hotelIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:32px;height:40px;filter:drop-shadow(0 3px 6px rgba(0,0,0,.45));">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" width="32" height="40">
      <path d="M16 0C9.373 0 4 5.373 4 12c0 9 12 28 12 28S28 21 28 12C28 5.373 22.627 0 16 0z" fill="#2563eb"/>
      <circle cx="16" cy="12" r="6" fill="white"/>
      <path d="M16 0C9.373 0 4 5.373 4 12c0 9 12 28 12 28S28 21 28 12C28 5.373 22.627 0 16 0z" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
    </svg>
    <div style="position:absolute;top:6px;left:50%;transform:translateX(-50%);">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="#2563eb"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
    </div>
  </div>`,
  iconSize:   [32, 40],
  iconAnchor: [16, 40],
  popupAnchor:[0, -42],
});

// Icon điểm đến — ghim kiểu Google Maps
const attractionIcon = (selected) => L.divIcon({
  className: '',
  html: `<div style="position:relative;width:${selected?40:28}px;height:${selected?52:36}px;filter:drop-shadow(0 3px 8px rgba(0,0,0,.5));transition:all 200ms;">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" width="100%" height="100%">
      <path d="M16 0C9.373 0 4 5.373 4 12c0 9 12 28 12 28S28 21 28 12C28 5.373 22.627 0 16 0z" fill="#ef4444"/>
      <circle cx="16" cy="12" r="6" fill="white"/>
      <circle cx="16" cy="12" r="3" fill="#ef4444"/>
    </svg>
  </div>`,
  iconSize:   [selected ? 40 : 28, selected ? 52 : 36],
  iconAnchor: [selected ? 20 : 14, selected ? 52 : 36],
  popupAnchor:[0, -54],
});

// ── Component di chuyển map tới vị trí ──────────────────────
function FlyToMarker({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo([position.lat, position.lng], 14, { duration: 1 });
  }, [position, map]);
  return null;
}

// ── OSRM Routing (miễn phí, không cần API key) ──────────────
async function fetchRoute(fromLat, fromLng, toLat, toLng) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.[0]) {
      const route = data.routes[0];
      const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      const dist   = (route.distance / 1000).toFixed(1) + ' km';
      const dur    = Math.round(route.duration / 60) + ' phút';
      return { coords, dist, dur };
    }
  } catch {}
  return null;
}

// ── Placeholder ảnh ─────────────────────────────────────────
const CLOUDINARY_BASE = 'https://res.cloudinary.com/dfvdvkssv/image/upload/hotel_placeholders';
function getPlaceholderImage(item) {
  if (item.imageUrl && (item.imageUrl.startsWith('http') || item.imageUrl.startsWith('https'))) return item.imageUrl;
  const name = (item.name || '').toLowerCase();
  const type = (item.type || '').toLowerCase();
  if (name.includes('biển') || name.includes('beach') || name.includes('vịnh')) return `${CLOUDINARY_BASE}/beach_placeholder.jpg`;
  if (name.includes('chợ') || name.includes('market')) return `${CLOUDINARY_BASE}/market_placeholder.jpg`;
  if (name.includes('bảo tàng') || name.includes('di tích')) return `${CLOUDINARY_BASE}/museum_placeholder.jpg`;
  if (name.includes('phố') || name.includes('quảng trường')) return `${CLOUDINARY_BASE}/street_placeholder.jpg`;
  if (name.includes('chùa') || name.includes('đền') || name.includes('nhà thờ')) return `${CLOUDINARY_BASE}/pagoda_placeholder.jpg`;
  if (name.includes('công viên') || type.includes('giải trí')) return `${CLOUDINARY_BASE}/park_placeholder.jpg`;
  if (name.includes('nhà hàng') || name.includes('ăn uống')) return `${CLOUDINARY_BASE}/food_placeholder.jpg`;
  if (name.includes('thác') || name.includes('suối')) return `${CLOUDINARY_BASE}/waterfall_placeholder.jpg`;
  if (name.includes('núi') || name.includes('rừng')) return `${CLOUDINARY_BASE}/mountain_placeholder.jpg`;
  return 'https://res.cloudinary.com/dfvdvkssv/image/upload/v1778288591/hotel_placeholders/market_placeholder.jpg';
}

/* ═══════════════════════════════════════════════════════════ */
export default function AttractionsPage() {
  const navigate = useNavigate();
  const [attractions,        setAttractions]        = useState([]);
  const [loading,            setLoading]            = useState(true);
  const [searchTerm,         setSearchTerm]         = useState('');
  const [selectedCategory,   setSelectedCategory]   = useState('All');
  const [selectedAttraction, setSelectedAttraction] = useState(null);
  const [routeCoords,        setRouteCoords]        = useState(null);
  const [distance,           setDistance]           = useState('');
  const [duration,           setDuration]           = useState('');
  const [routeLoading,       setRouteLoading]       = useState(false);
  const [flyTo,              setFlyTo]              = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Khám phá Điểm đến - Asteria Resort';
    attractionApi.getAll()
      .then(res => setAttractions(res.data.filter(a => a.status !== 'INACTIVE')))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCardClick = useCallback(async (item) => {
    setSelectedAttraction(item);
    setRouteCoords(null);
    setDistance('');
    setDuration('');
    setFlyTo({ lat: Number(item.latitude), lng: Number(item.longitude) });

    if (!item.latitude || !item.longitude) return;
    setRouteLoading(true);
    const result = await fetchRoute(HOTEL.lat, HOTEL.lng, Number(item.latitude), Number(item.longitude));
    if (result) {
      setRouteCoords(result.coords);
      setDistance(result.dist);
      setDuration(result.dur);
    }
    setRouteLoading(false);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  }, []);

  const categories = ['All', ...new Set(attractions.map(a => a.type).filter(Boolean))];
  const filtered   = attractions.filter(i => {
    const matchName = i.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat  = selectedCategory === 'All' || i.type === selectedCategory;
    return matchName && matchCat;
  });

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    setSelectedAttraction(null);
    setRouteCoords(null);
    setDistance('');
    setDuration('');
    setFlyTo(null);
  };

  return (
    <div style={{ background: '#fafafa', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <MainHeader />

      {/* Hero */}
      <div style={{ position: 'relative', height: 360, background: DARK, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src="https://images.unsplash.com/photo-1596436889106-be35e843f6a6?q=80&w=2000&auto=format&fit=crop"
          alt="Attractions" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(17,17,17,0.85), rgba(17,17,17,0.4))' }} />
        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '0 24px', marginTop: 124 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: GOLD, marginBottom: 16 }}>ĐIỂM ĐẾN LÂN CẬN</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, color: 'white', lineHeight: 1.2, marginBottom: 12 }}>Khám Phá Xung Quanh</h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, maxWidth: 540, margin: '0 auto' }}>
            Asteria Resort là điểm xuất phát tuyệt vời để khám phá những kỳ quan và nét văn hóa độc đáo của địa phương.
          </p>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px 64px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }} className="attr-grid">
          <style>{`@media(max-width:768px){ .attr-grid { grid-template-columns: 1fr !important; } }`}</style>

          {/* LEFT — Search & List */}
          <div style={{ background: 'white', borderRadius: 4, padding: 24, border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', position: 'sticky', top: 80, maxHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: '#18181b', marginBottom: 20 }}>Tìm kiếm điểm đến</h2>

            {/* Search input */}
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <SearchOutlined style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa', zIndex: 1 }} />
              <input type="text" placeholder="Nhập tên địa điểm..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '10px 12px 10px 36px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 4, outline: 'none', color: '#111', background: 'white' }}
                onFocus={e => e.target.style.borderColor = GOLD} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
            </div>

            {/* Category filter */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => handleCategoryChange(cat)}
                  style={{ padding: '5px 14px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid', background: selectedCategory === cat ? DARK : 'transparent', color: selectedCategory === cat ? 'white' : '#71717a', borderColor: selectedCategory === cat ? DARK : '#e5e7eb', transition: 'all 200ms' }}>
                  {cat === 'All' ? 'Tất cả' : cat}
                </button>
              ))}
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin size="large" /></div>
              ) : filtered.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#71717a', padding: '40px 0', fontSize: 13 }}>Không tìm thấy địa điểm phù hợp.</p>
              ) : filtered.map(item => (
                <div key={item.id} onClick={() => handleCardClick(item)}
                  style={{ display: 'flex', gap: 14, padding: 12, borderRadius: 4, cursor: 'pointer', border: `1px solid ${selectedAttraction?.id === item.id ? GOLD : '#f0f0f0'}`, background: selectedAttraction?.id === item.id ? '#fdf8f3' : 'white', transition: 'all 200ms' }}>
                  {(() => {
                    let galleryUrls = [];
                    try { galleryUrls = item.galleryImages ? JSON.parse(item.galleryImages).filter(Boolean) : []; } catch {}
                    const fallback = 'https://images.unsplash.com/photo-1596436889106-be35e843f6a6?q=80&w=400';
                    const allImgs = [getPlaceholderImage(item), ...galleryUrls].slice(0, 4);
                    const n = allImgs.length;
                    const Cell = ({ src }) => (
                      <div style={{ overflow: 'hidden', width: '100%', height: '100%' }}>
                        <img src={src} alt={item.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          onError={e => { e.target.onerror = null; e.target.src = fallback; }}
                        />
                      </div>
                    );
                    return (
                      <div style={{ width: 88, height: 88, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: '#f0f0f0' }}>
                        {n === 1 && <Cell src={allImgs[0]} />}
                        {n === 2 && (<div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 1, height: '100%' }}><Cell src={allImgs[0]} /><Cell src={allImgs[1]} /></div>)}
                        {n === 3 && (<div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 1, height: '100%' }}><Cell src={allImgs[0]} /><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}><Cell src={allImgs[1]} /><Cell src={allImgs[2]} /></div></div>)}
                        {n >= 4 && (<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 1, height: '100%' }}><Cell src={allImgs[0]} /><Cell src={allImgs[1]} /><Cell src={allImgs[2]} /><Cell src={allImgs[3]} /></div>)}
                      </div>
                    );
                  })()}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: '#18181b', lineHeight: 1.3, margin: 0 }}>{item.name}</h3>
                      {item.type && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: GOLD, background: '#fdf3e7', padding: '2px 8px', borderRadius: 2, flexShrink: 0 }}>{item.type}</span>}
                    </div>
                    <p style={{ fontSize: 12, color: '#71717a', lineHeight: 1.6, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.description}</p>
                    {item.distanceKm && <p style={{ fontSize: 11, color: GOLD, marginTop: 6, margin: '6px 0 0' }}><EnvironmentOutlined /> Cách resort {item.distanceKm} km</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — OpenStreetMap */}
          <div style={{ background: 'white', borderRadius: 4, border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'sticky', top: 80, height: 'calc(100vh - 120px)', minHeight: 600 }}>
            {/* Map header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa', flexShrink: 0 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#18181b', margin: 0 }}>
                  {selectedAttraction ? `Đường đi: ${selectedAttraction.name}` : 'Bản đồ Khám phá'}
                </h3>
                {routeLoading && <p style={{ fontSize: 12, color: GOLD, margin: '2px 0 0' }}>Đang tìm đường...</p>}
                {!routeLoading && distance && duration && (
                  <p style={{ fontSize: 12, color: '#71717a', margin: '2px 0 0' }}>
                    Khoảng cách: <strong style={{ color: '#18181b' }}>{distance}</strong> • Thời gian lái xe: <strong style={{ color: '#18181b' }}>{duration}</strong>
                  </p>
                )}
              </div>
              {/* Badge OpenStreetMap */}
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '3px 10px', borderRadius: 4 }}>
                OpenStreetMap
              </span>
            </div>

            {/* Leaflet Map */}
            <div style={{ flex: 1, position: 'relative' }}>
              <MapContainer
                center={[HOTEL.lat, HOTEL.lng]}
                zoom={12}
                style={{ width: '100%', height: '100%' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Fly to selected attraction */}
                {flyTo && <FlyToMarker position={flyTo} />}

                {/* Hotel marker */}
                <Marker position={[HOTEL.lat, HOTEL.lng]} icon={hotelIcon}>
                  <Popup>
                    <strong>🏨 Asteria Resort</strong><br />Vị trí khách sạn
                  </Popup>
                </Marker>

                {/* Attraction markers */}
                {attractions.filter(a => a.latitude && a.longitude).map(item => (
                  <Marker
                    key={item.id}
                    position={[Number(item.latitude), Number(item.longitude)]}
                    icon={attractionIcon(selectedAttraction?.id === item.id)}
                    eventHandlers={{ click: () => handleCardClick(item) }}
                  >
                    <Popup>
                      <strong>{item.name}</strong>
                      {item.type && <><br /><span style={{ color: GOLD, fontSize: 11 }}>{item.type}</span></>}
                      {item.distanceKm && <><br /><span style={{ color: '#71717a', fontSize: 11 }}>Cách resort {item.distanceKm} km</span></>}
                    </Popup>
                  </Marker>
                ))}

                {/* Route polyline */}
                {routeCoords && routeCoords.length > 0 && (
                  <Polyline
                    positions={routeCoords}
                    color={GOLD}
                    weight={5}
                    opacity={0.85}
                  />
                )}
              </MapContainer>
            </div>

            {/* Book CTA khi chọn điểm đến */}
            {selectedAttraction && (
              <div style={{ padding: '18px 24px', background: DARK, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', flexShrink: 0 }}>
                <div>
                  <h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: GOLD, margin: '0 0 4px' }}>Sẵn sàng cho chuyến đi?</h4>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', margin: 0 }}>Đặt phòng tại Asteria để bắt đầu hành trình khám phá {selectedAttraction.name}.</p>
                </div>
                <button onClick={() => navigate('/')}
                  style={{ padding: '10px 22px', background: `linear-gradient(135deg, #c9a97a, #9a7b52)`, color: 'white', border: 'none', borderRadius: 2, fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  ĐẶT PHÒNG NGAY →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <MainFooter />
    </div>
  );
}
