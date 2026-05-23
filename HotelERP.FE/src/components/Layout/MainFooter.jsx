import React from 'react';

export default function MainFooter() {
  return (
    <footer style={{ background: '#111111', color: 'rgba(255,255,255,0.7)', padding: '80px 24px 40px', fontFamily: "'Times New Roman', Times, serif", borderTop: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 64, flexWrap: 'wrap', gap: 24 }}>
          <h2 style={{ fontSize: 'clamp(24px,3vw,32px)', color: 'white', letterSpacing: '1px', margin: 0 }}>ASTERIA RESORT</h2>
          <div style={{ display: 'flex', gap: 24 }}>
          </div>
        </div>

        {/* Links Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 40, marginBottom: 64, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 64 }}>
          <div>
            <h4 style={{ color: 'white', fontSize: 15, letterSpacing: '1px', marginBottom: 24, textTransform: 'uppercase' }}>ĐIỂM ĐẾN</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Về Asteria', href: '#' },
                { label: 'Thương hiệu Asteria', href: '#' },
                { label: 'Ý kiến khách hàng', href: '/reviews' }
              ].map(t => (
                <a key={t.label} href={t.href} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none', transition: 'color 200ms' }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.7)'}>{t.label}</a>
              ))}
            </div>
          </div>
          <div>
            <h4 style={{ color: 'white', fontSize: 15, letterSpacing: '1px', marginBottom: 24, textTransform: 'uppercase' }}>CÔNG TY</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {['Tập đoàn Asteria', 'Giới thiệu'].map(t => (
                <a key={t} href="#" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none', transition: 'color 200ms' }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.7)'}>{t}</a>
              ))}
            </div>
          </div>
          <div>
            <h4 style={{ color: 'white', fontSize: 15, letterSpacing: '1px', marginBottom: 24, textTransform: 'uppercase' }}>HOTLINE</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <a href="tel:0966008647" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none', transition: 'color 200ms' }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.7)'}>Hotline: 0966008647</a>
            </div>
          </div>
          <div>
            <h4 style={{ color: 'white', fontSize: 15, letterSpacing: '1px', marginBottom: 24, textTransform: 'uppercase' }}>ĐIỀU KHOẢN & CHÍNH SÁCH</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {['Điều khoản khách sạn', 'Điều khoản dịch vụ'].map(t => (
                <a key={t} href="#" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none', transition: 'color 200ms' }} onMouseEnter={e => e.target.style.color = 'white'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.7)'}>{t}</a>
              ))}
            </div>
          </div>
          <div>
            <h4 style={{ color: 'white', fontSize: 15, letterSpacing: '1px', marginBottom: 24, textTransform: 'uppercase' }}>LIÊN HỆ</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 1.8 }}>
              <span>Số 10, Huỳnh Văn Nghệ, phường Bửu Long, TP. Biên Hòa, tỉnh Đồng Nai</span>
              <div style={{ marginTop: 8, borderRadius: 4, overflow: 'hidden', height: 150 }}>
                <iframe width="100%" height="100%" src="https://www.openstreetmap.org/export/embed.html?bbox=106.80086374282837%2C10.95238632123278%2C106.80337429046632%2C10.954163829628468&amp;layer=mapnik&amp;marker=10.953275%2C106.802119" style={{ border: 0 }}></iframe>
              </div>
              <small style={{ marginTop: 4, display: 'block' }}><a href="https://www.openstreetmap.org/?mlat=10.953275&amp;mlon=106.802119#map=19/10.953275/106.802119" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'underline' }}>Xem Bản đồ Rộng hơn</a></small>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
