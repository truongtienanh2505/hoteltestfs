import React, { useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { setAntdStatic } from './utils/antdGlobal';
import { App as AntdApp, ConfigProvider, theme } from 'antd';
import AdminRoutes from './routes/AdminRoutes.jsx';
import HomePage from './pages/Home/HomePage';
import FloatingSidebar from './components/Layout/FloatingSidebar';

import LoginPage from './pages/Auth/Login';
import RegisterPage from './pages/Auth/Register';
import ForgotPasswordPage from './pages/Auth/ForgotPassword';
import NewsPage from './pages/Home/NewsPage';
import ArticleDetailPage from './pages/Home/ArticleDetailPage';
import UserProfile from './pages/Profile/UserProfile';
import AttractionsPage from './pages/Home/AttractionsPage';
import SearchResultsPage from './pages/Home/SearchResultsPage';
import GuestBookingPage from './pages/Booking/GuestBookingPage';
import CustomerReviewsPage from './pages/Home/CustomerReviewsPage';
import SubmitReview from './pages/Customer/SubmitReview';

const StaticSetter = () => {
  const { message, notification, modal } = AntdApp.useApp();
  useEffect(() => {
    setAntdStatic(message, notification, modal);
  }, [message, notification, modal]);
  return null;
};

/* ── Page transition: fade-in + instant scroll reset ── */
const GOLD = '#b8956a';

function PageTransition({ children }) {
  const location = useLocation();
  const [visible, setVisible] = useState(true);
  const [barWidth, setBarWidth] = useState(0);
  const prevKey = useRef(location.key);

  useEffect(() => {
    if (location.key === prevKey.current) return;
    prevKey.current = location.key;

    // Reset scroll instantly before fade
    window.scrollTo(0, 0);

    // Loading bar
    setBarWidth(0);
    setVisible(false);
    const t1 = setTimeout(() => setBarWidth(70), 10);
    const t2 = setTimeout(() => { setBarWidth(100); setVisible(true); }, 120);
    const t3 = setTimeout(() => setBarWidth(0), 420);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [location.key]);

  return (
    <>
      {/* Top loading bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 2, zIndex: 9999,
        pointerEvents: 'none',
      }}>
        <div style={{
          height: '100%',
          width: `${barWidth}%`,
          background: `linear-gradient(to right, ${GOLD}, #e8c58a)`,
          transition: barWidth === 0 ? 'none' : barWidth < 100 ? 'width 300ms ease' : 'width 200ms ease',
          boxShadow: barWidth > 0 ? `0 0 8px ${GOLD}88` : 'none',
        }} />
      </div>
      {/* Page content with fade */}
      <div
        key={location.key}
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 180ms ease',
          willChange: 'opacity',
        }}
      >
        {children}
      </div>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <FloatingSidebar />
      <Routes>
        <Route path="/*" element={
          <ConfigProvider
            theme={{
              algorithm: theme.darkAlgorithm,
              token: {
                colorPrimary: '#b8956a',
                borderRadius: 8,
                colorBgBase: '#0d0d0d',
              },
            }}
          >
            <AntdApp>
              <StaticSetter />
              <PageTransition>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/news" element={<NewsPage />} />
                  <Route path="/news/:categorySlug/:slug" element={<ArticleDetailPage />} />
                  <Route path="/news/:slug" element={<ArticleDetailPage />} />
                  <Route path="/attractions" element={<AttractionsPage />} />
                  <Route path="/reviews" element={<CustomerReviewsPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/profile" element={<UserProfile />} />
                  <Route path="/rooms/search-results" element={<SearchResultsPage />} />
                  <Route path="/booking/new" element={<GuestBookingPage />} />
                  <Route path="/booking/:bookingId/review" element={<SubmitReview />} />
                </Routes>
              </PageTransition>
            </AntdApp>
          </ConfigProvider>
        } />

        <Route path="/admin/*" element={
          <ConfigProvider
            theme={{
              algorithm: theme.defaultAlgorithm,
              token: {
                borderRadius: 4,
              },
            }}
          >
            <AntdApp>
              <StaticSetter />
              <AdminRoutes />
            </AntdApp>
          </ConfigProvider>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;