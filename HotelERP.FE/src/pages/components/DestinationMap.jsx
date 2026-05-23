import React, { useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '400px'
};

// Tọa độ trung tâm (Ví dụ: Khách sạn của bạn ở TP.HCM)
const center = {
  lat: 10.7769,
  lng: 106.7009
};

// Dữ liệu mẫu các điểm đến xung quanh
const destinations = [
  { id: 1, name: 'Khách sạn của chúng tôi', position: { lat: 10.7769, lng: 106.7009 } },
  { id: 2, name: 'Chợ Bến Thành', position: { lat: 10.7725, lng: 106.6981 } },
  { id: 3, name: 'Nhà thờ Đức Bà', position: { lat: 10.7798, lng: 106.6990 } }
];

export default function DestinationMap() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "YOUR_GOOGLE_MAPS_API_KEY" // Thay thế bằng API Key thật của bạn
  });

  const [map, setMap] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);

  const onLoad = useCallback(function callback(map) {
    const bounds = new window.google.maps.LatLngBounds(center);
    map.fitBounds(bounds);
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback(map) {
    setMap(null);
  }, []);

  if (!isLoaded) return <div>Đang tải bản đồ...</div>;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={14}
      onLoad={onLoad}
      onUnmount={onUnmount}
    >
      {destinations.map(place => (
        <Marker 
          key={place.id} 
          position={place.position} 
          onClick={() => setSelectedPlace(place)}
        />
      ))}

      {selectedPlace && (
        <InfoWindow
          position={selectedPlace.position}
          onCloseClick={() => setSelectedPlace(null)}
        >
          <div>
            <h4>{selectedPlace.name}</h4>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}