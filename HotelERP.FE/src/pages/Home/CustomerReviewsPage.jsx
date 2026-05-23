import React, { useEffect } from 'react';
import MainHeader from '../../components/Layout/MainHeader';
import MainFooter from '../../components/Layout/MainFooter';
import CustomerReviews from '../../components/CustomerReviews/CustomerReviews';

export default function CustomerReviewsPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Ý Kiến Khách Hàng - Asteria Resort';
  }, []);

  return (
    <div style={{ background: '#fafafa', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <MainHeader transparent={false} />
      <div style={{ paddingTop: 64 }}>
        <CustomerReviews />
      </div>
      <MainFooter />
    </div>
  );
}
