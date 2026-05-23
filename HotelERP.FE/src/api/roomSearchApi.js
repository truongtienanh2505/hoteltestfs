import axiosClient from './axiosClient';

/**
 * Tìm kiếm phòng trống theo khoảng thời gian và số khách.
 * @param {{ checkIn: string, checkOut: string, adults: number, children: number, rooms: number }} params
 */
export async function searchRooms({ checkIn, checkOut, adults, children, rooms }) {
  const payload = {
    checkInDate:   checkIn,
    checkOutDate:  checkOut,
    adultsCount:   adults,
    childrenCount: children,
    roomsRequested: rooms,
  };
  const { data } = await axiosClient.post('/BookingEngine/search', payload);
  
  // Wrap the array response into the structure expected by SearchResultsPage.jsx
  return {
    success: true,
    searchParams: {
      checkIn,
      checkOut,
      adults,
      children,
      rooms,
      nights: Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)) || 1
    },
    availableRooms: data
  };
}
