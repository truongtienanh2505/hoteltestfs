import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '8px'
};

const defaultCenter = {
  lat: 10.948386, // Trọng tâm ban đầu (Khách sạn Asteria / Đại học Lạc Hồng)
  lng: 106.790938
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
};

export default function AttractionMap({ height = "500px", isFooter = false }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

  const [attractions, setAttractions] = useState([]);
  const [activeMarker, setActiveMarker] = useState(null);
  const [authError, setAuthError] = useState(false);

  // Layout đặc tả cho bản đồ ở chân trang
  const currentContainerStyle = isFooter ? { width: '100%', height: '180px' } : { ...containerStyle, height };

  useEffect(() => {
    // Chain window.gm_authFailure to notify all map instances
    const prevAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      setAuthError(true);
      if (prevAuthFailure) prevAuthFailure();
    };

    return () => {
      window.gm_authFailure = prevAuthFailure;
    };
  }, []);

  useEffect(() => {

    // Chỉ tải dữ liệu Attractions nếu không phải bản đồ của Footer (footer chỉ cần 1 điểm hotel)
    if (!isFooter) {
      fetch('/api/Attraction')
        .then(res => {
          if (!res.ok) throw new Error('Cannot fetch attractions');
          return res.json();
        })
        .then(data => setAttractions(data))
        .catch(err => console.error("Error loading attractions map data:", err));
    }
  }, [isFooter]);

  const handleActiveMarker = (marker) => {
    if (marker === activeMarker) {
      return;
    }
    setActiveMarker(marker);
  };

  const onLoad = useCallback(function callback(map) {
    if (isFooter) {
      map.setZoom(15);
    } else {
      map.setZoom(12);
    }
  }, [isFooter]);

  // Nếu API Key bị lỗi, bị từ chối, lỗi tải script, hoặc không có API Key, chuyển về bản đồ Iframe tĩnh dự phòng
  if (authError || loadError || !import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    return (
      <iframe
        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15668.790518386828!2d106.79093836373703!3d10.948386121980646!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3174d9e03d40cb93%3A0xe5560b4de0c92ec9!2zVHLGsOG7nW5nIMSR4bqhaSBo4buNYyBM4bqhYyBI4buTbmc!5e0!3m2!1svi!2s!4v1714000000000!5m2!1svi!2s"
        width="100%"
        height={currentContainerStyle.height}
        style={{ border: 0, borderRadius: '8px' }}
        allowFullScreen=""
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      ></iframe>
    );
  }

  if (!isLoaded) return <div style={{ height: currentContainerStyle.height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Đang tải bản đồ...</div>;

  return (
    <GoogleMap
      mapContainerStyle={currentContainerStyle}
      center={defaultCenter}
      options={mapOptions}
      onLoad={onLoad}
      onClick={() => setActiveMarker(null)}
    >
      {/* Trong trường hợp là Footer, chỉ hiển thị mỗi vị trí khách sạn */}
      {isFooter && (
        <Marker
          position={defaultCenter}
          onClick={() => handleActiveMarker('hotel')}
        >
          {activeMarker === 'hotel' && (
            <InfoWindow onCloseClick={() => setActiveMarker(null)}>
              <div>
                <h4 style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#000' }}>Asteria Resort</h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#333' }}>Số 10, Huỳnh Văn Nghệ, Biên Hòa</p>
              </div>
            </InfoWindow>
          )}
        </Marker>
      )}

      {/* Trong trường hợp ở Thân trang, map qua các địa điểm danh lam/attractions */}
      {!isFooter && attractions.map(attraction => (
        <Marker
          key={attraction.id}
          position={{ lat: Number(attraction.latitude), lng: Number(attraction.longitude) }}
          title={attraction.name}
          onClick={() => handleActiveMarker(attraction.id)}
        >
          {activeMarker === attraction.id && (
            <InfoWindow onCloseClick={() => setActiveMarker(null)}>
              <div style={{ maxWidth: '200px' }}>
                <h4 style={{ margin: '0 0 5px 0', fontSize: '16px', color: '#333' }}>{attraction.name}</h4>
                {attraction.imageUrl && (
                  <img src={attraction.imageUrl} alt={attraction.name} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px', marginBottom: '5px' }} />
                )}
                {attraction.description && <p style={{ fontSize: '13px', margin: 0, color: '#666' }}>{attraction.description.substring(0, 50)}...</p>}
              </div>
            </InfoWindow>
          )}
        </Marker>
      ))}

      {/* Vị trí khách sạn Asteria ở trang Attraction để làm trung tâm */}
      {!isFooter && (
        <Marker
          position={defaultCenter}
          icon={{
            url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' // Icon khác để phân biệt Khách sạn và Điểm đến
          }}
          title="Asteria Resort"
        />
      )}
    </GoogleMap>
  );
}
