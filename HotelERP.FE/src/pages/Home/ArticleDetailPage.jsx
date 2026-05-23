import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import articleApi from '../../api/articleApi';

// Chuyển tên danh mục → URL slug ("Tin Tức Khách Sạn" → "tin-tuc-khach-san")
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

// Tạo đường dẫn bài viết với danh mục
function articlePath(categoryName, slug) {
  const catSlug = toCatSlug(categoryName);
  return catSlug ? `/news/${catSlug}/${slug}` : `/news/${slug}`;
}

const G   = '#b8956a';
const DARK = '#111111';
const SF   = { fontFamily: "'Playfair Display', serif" };

function formatDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
}

const FALLBACK = 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200';

/* ─── Reading Progress Bar ───────────────────────────────────── */
function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const calc = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop;
      const total    = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? (scrolled / total) * 100 : 0);
    };
    window.addEventListener('scroll', calc);
    return () => window.removeEventListener('scroll', calc);
  }, []);
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, height: 3, background: 'rgba(255,255,255,0.1)' }}>
      <div style={{ height: '100%', background: `linear-gradient(to right, ${G}, #e8c58a)`, width: `${progress}%`, transition: 'width 80ms linear' }} />
    </div>
  );
}

/* ─── Header ─────────────────────────────────────────────────── */
function Header({ category }) {
  const navigate = useNavigate();
  const [sc, setSc] = useState(false);
  useEffect(() => {
    const fn = () => setSc(window.scrollY > 60);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <header style={{
      position: 'fixed', top: 3, left: 0, right: 0, zIndex: 100,
      background: sc ? DARK : 'linear-gradient(to bottom,rgba(0,0,0,.8),transparent)',
      transition: 'background 400ms', boxShadow: sc ? '0 2px 20px rgba(0,0,0,.5)' : 'none',
      height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 clamp(20px,5vw,80px)',
    }}>
      <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <div style={{ width: 30, height: 30, border: '1px solid white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', ...SF, fontSize: 14, color: 'white' }}>A</div>
        <span style={{ color: 'white', fontSize: 12, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Asteria Resort</span>
      </div>
      <nav style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {[['Trang Chủ', '/'], ['Tin Tức', '/news'], ['Điểm Đến', '/attractions']].map(([l, h]) => (
          <a key={l} href={h} style={{ fontSize: 11, fontWeight: 500, letterSpacing: '1.5px', textTransform: 'uppercase', color: h === '/news' ? G : 'rgba(255,255,255,.75)', textDecoration: 'none', padding: '4px 14px', borderBottom: h === '/news' ? `2px solid ${G}` : '2px solid transparent' }}>{l}</a>
        ))}

      </nav>
    </header>
  );
}

/* ─── Related Article Grid Card (full section below) ────────── */
function RelatedGridCard({ item }) {
  const navigate = useNavigate();
  const [hov, setHov] = useState(false);
  return (
    <Link to={articlePath(item.categoryNames?.[0] || item.categoryName, item.slug)} style={{ textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{ background: '#1a1a1a', border: `1px solid ${hov ? G : 'rgba(255,255,255,.06)'}`, borderRadius: 8, overflow: 'hidden', transition: 'all 280ms', transform: hov ? 'translateY(-4px)' : 'none', boxShadow: hov ? '0 16px 40px rgba(0,0,0,.5)' : 'none' }}
      >
        <div style={{ height: 180, overflow: 'hidden' }}>
          <img src={item.thumbnailUrl || FALLBACK} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: hov ? 'scale(1.06)' : 'scale(1)', transition: 'transform 500ms' }} />
        </div>
        <div style={{ padding: '18px 20px 22px' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
            {(item.categoryNames || (item.categoryName ? [item.categoryName] : [])).map(c => (
              <span key={c} style={{ fontSize: 9, color: G, fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase' }}>
                {c}
              </span>
            ))}
          </div>
          <h3 style={{ ...SF, fontSize: 17, color: 'white', lineHeight: 1.4, margin: '8px 0 6px', fontWeight: 400, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.title}</h3>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.35)' }}>{formatDate(item.publishedAt)}</span>
        </div>
      </div>
    </Link>
  );
}

/* ─── Related Article Mini Card ─────────────────────────────── */
function RelatedCard({ article }) {
  const navigate = useNavigate();
  const [hov, setHov] = useState(false);
  return (
    <div onClick={() => navigate(articlePath(article.categoryNames?.[0] || article.categoryName, article.slug))}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ cursor: 'pointer', display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.07)', transition: 'opacity 200ms', opacity: hov ? 0.78 : 1 }}>
      <div style={{ width: 80, height: 60, borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
        <img src={article.thumbnailUrl || FALLBACK} alt={article.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
          {(article.categoryNames || (article.categoryName ? [article.categoryName] : [])).map(c => (
            <span key={c} style={{ fontSize: 9, color: G, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              {c}
            </span>
          ))}
        </div>
        <p style={{ ...SF, fontSize: 13, color: 'white', margin: '4px 0 4px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{article.title}</p>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{formatDate(article.publishedAt)}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export default function ArticleDetailPage() {
  const { slug, categorySlug } = useParams();
  const navigate      = useNavigate();
  const [article, setArticle]   = useState(null);
  const [related, setRelated]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setLoading(true); setNotFound(false); setArticle(null);

    articleApi.getBySlug(slug, categorySlug)
      .then(res => {
        const d = res.data;
        setArticle(d);
        document.title = d.metaTitle || d.title || 'Asteria Resort';
        let meta = document.querySelector('meta[name="description"]');
        if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
        meta.content = d.metaDescription || d.summary || '';
        articleApi.search('', d.categoryNames?.[0] || d.categoryName || '').then(r => {
          setRelated((r.data || []).filter(a => a.slug !== slug).slice(0, 4));
        }).catch(() => {});
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    return () => { document.title = 'Asteria Resort - Không gian nghỉ dưỡng đẳng cấp'; };
  }, [slug]);

  /* Loading */
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: `2px solid ${G}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 16px' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase' }}>Đang tải bài viết...</p>
      </div>
    </div>
  );

  /* 404 */
  if (notFound) return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
      <h1 style={{ ...SF, color: 'white', fontSize: 64, margin: 0, fontWeight: 400 }}>404</h1>
      <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 15 }}>Không tìm thấy bài viết này.</p>
      <button onClick={() => navigate('/news')} style={{ background: G, color: 'white', border: 'none', padding: '12px 32px', borderRadius: 2, cursor: 'pointer', fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
        Quay lại Tin Tức
      </button>
    </div>
  );

  /* ── ESTIMATE READ TIME ── */
  const wordCount = (article.content || '').replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length;
  const readTime  = Math.max(1, Math.round(wordCount / 220));

  return (
    <div style={{ background: '#fafafa', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <ReadingProgress />
      <Header />

      {/* ════════════════════════════════════════════════════════
          HERO — Full-width cinematic image with title overlay
      ════════════════════════════════════════════════════════ */}
      <div style={{ position: 'relative', height: 'clamp(380px,50vw,580px)', overflow: 'hidden' }}>
        <img
          src={article.thumbnailUrl || FALLBACK}
          alt={article.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.5)' }}
        />
        {/* Multi-layer gradient for depth */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,.6) 0%, rgba(0,0,0,.15) 60%, transparent 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.75) 0%, transparent 55%)' }} />

        {/* ── Breadcrumb ─────────────────────────────────────── */}
        <nav
          aria-label="breadcrumb"
          style={{
            position: 'absolute', top: 84,
            left: 'clamp(24px,5vw,80px)',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
            {/* Home */}
            <Link
              to="/"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,.5)', textDecoration: 'none', fontSize: 11, letterSpacing: '0.04em', paddingBottom: 2, borderBottom: '1px solid transparent', transition: 'color 200ms, border-color 200ms' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,.9)'; e.currentTarget.style.borderBottomColor = 'rgba(255,255,255,.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,.5)'; e.currentTarget.style.borderBottomColor = 'transparent'; }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9,22 9,12 15,12 15,22"/>
              </svg>
              Trang Chủ
            </Link>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="1.5" style={{ margin: '0 6px', flexShrink: 0 }}>
              <polyline points="9,18 15,12 9,6"/>
            </svg>
            {/* Tin Tức */}
            <Link
              to="/news"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,.5)', textDecoration: 'none', fontSize: 11, letterSpacing: '0.04em', paddingBottom: 2, borderBottom: '1px solid transparent', transition: 'color 200ms, border-color 200ms' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,.9)'; e.currentTarget.style.borderBottomColor = 'rgba(255,255,255,.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,.5)'; e.currentTarget.style.borderBottomColor = 'transparent'; }}
            >
              Tin Tức
            </Link>
            {/* Category links removed as requested */}
          </div>
        </nav>


        {/* Title Block */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: '40%', padding: '0 clamp(24px,5vw,80px) 52px' }}>
          {/* Nhiều chuyên mục badges */}
          {article?.categoryNames?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
              {(article.categoryNames || (article.categoryName ? [article.categoryName] : [])).map((cat, i) => (
                <span key={i} style={{ display: 'inline-block', background: G, color: 'white', fontSize: 9, fontWeight: 700, letterSpacing: '.3em', textTransform: 'uppercase', padding: '4px 12px', borderRadius: 2 }}>
                  {cat}
                </span>
              ))}
            </div>
          )}
          <h1 style={{ ...SF, fontSize: 'clamp(26px,3.8vw,52px)', color: 'white', margin: '0 0 18px', fontWeight: 400, lineHeight: 1.2, maxWidth: 640 }}>
            {article.title}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 12, color: 'rgba(255,255,255,.55)' }}>
            <span>📅 {formatDate(article.publishedAt)}</span>
            <span>⏱ {readTime} phút đọc</span>
            {article.tags && (
              <span>🏷 {article.tags.split(',').slice(0, 2).map(t => t.trim()).join(', ')}</span>
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          BODY — 2 column: Article content + Sidebar
      ════════════════════════════════════════════════════════ */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: 'clamp(40px,5vw,64px) clamp(20px,4vw,40px)', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 48, alignItems: 'start' }}>

        {/* ── LEFT: Article Content ── */}
        <article style={{ minWidth: 0, overflow: 'hidden' }}>
          {/* Summary / Pull quote */}
          {article.summary && (
            <blockquote style={{
              borderLeft: `4px solid ${G}`, paddingLeft: 24, margin: '0 0 40px',
              ...SF, fontSize: 'clamp(17px,1.8vw,21px)', color: '#374151', lineHeight: 1.8, fontStyle: 'italic',
            }}>
              {article.summary}
            </blockquote>
          )}

          {/* Main HTML content */}
          <div
            ref={contentRef}
            dangerouslySetInnerHTML={{ __html: article.content || '<p style="color:#9ca3af;font-style:italic">Nội dung đang được cập nhật...</p>' }}
            className="article-prose"
          />

          {/* Tags */}
          {article.tags && (
            <div style={{ marginTop: 48, paddingTop: 28, borderTop: '1px solid #e5e7eb', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.1em', marginRight: 4 }}>Tags:</span>
              {article.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                <span key={tag} style={{ fontSize: 11, padding: '5px 14px', border: `1px solid ${G}44`, borderRadius: 999, color: G, background: `${G}0d`, letterSpacing: '.05em', cursor: 'default' }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Back button */}
          <div style={{ marginTop: 40 }}>
            <button onClick={() => navigate('/news')} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'none', border: `1px solid ${G}`, color: G,
              padding: '12px 28px', borderRadius: 2, cursor: 'pointer',
              fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', transition: 'all 200ms',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = G; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = G; }}>
              ← Quay lại Tin Tức
            </button>
          </div>
        </article>

        {/* ── RIGHT: Sticky Sidebar ── */}
        <aside style={{ position: 'sticky', top: 88, display: 'flex', flexDirection: 'column', gap: 20 }}>


          {/* ── Share Card ── */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '18px 20px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#9ca3af', margin: '0 0 14px' }}>Chia Sẻ Bài Viết</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button title="Facebook"
                onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank')}
                style={{ flex: 1, padding: '11px 0', background: '#eff4ff', color: '#1877F2', border: '1px solid #c7d7fd', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 200ms' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#1877F2'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#1877F2'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#eff4ff'; e.currentTarget.style.color = '#1877F2'; e.currentTarget.style.borderColor = '#c7d7fd'; }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </button>
              <button title="Twitter / X"
                onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(article.title)}`, '_blank')}
                style={{ flex: 1, padding: '11px 0', background: '#f4f4f4', color: '#111', border: '1px solid #e0e0e0', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 200ms' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#111'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#111'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f4f4f4'; e.currentTarget.style.color = '#111'; e.currentTarget.style.borderColor = '#e0e0e0'; }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </button>
              <button title="Sao chép link"
                onClick={() => navigator.clipboard.writeText(window.location.href)}
                style={{ flex: 1, padding: '11px 0', background: `${G}18`, color: G, border: `1px solid ${G}50`, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 200ms' }}
                onMouseEnter={e => { e.currentTarget.style.background = G; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = G; }}
                onMouseLeave={e => { e.currentTarget.style.background = `${G}18`; e.currentTarget.style.color = G; e.currentTarget.style.borderColor = `${G}50`; }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              </button>
            </div>
          </div>

          {/* ── Related in Sidebar (light) ── */}
          {related.length > 0 && (
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 3, height: 14, background: G, borderRadius: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#374151' }}>Bài Liên Quan</span>
              </div>
              {related.map((r, idx) => (
                <div key={r.id} onClick={() => navigate(articlePath(r.categoryName, r.slug))}
                  style={{ display: 'flex', gap: 12, padding: '12px 16px', cursor: 'pointer', borderBottom: idx < related.length - 1 ? '1px solid #f9f9f9' : 'none', transition: 'background 180ms' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: 68, height: 50, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                    <img src={r.thumbnailUrl || FALLBACK} alt={r.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {r.categoryName && <span style={{ fontSize: 9, color: G, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{r.categoryName}</span>}
                    <p style={{ fontSize: 13, color: '#111', margin: '3px 0 3px', lineHeight: 1.4, fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.title}</p>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>{formatDate(r.publishedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── CTA Booking ── */}
          <div style={{ background: '#0f0f0f', borderRadius: 12, padding: '24px 20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: `${G}18`, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -40, left: -20, width: 130, height: 130, borderRadius: '50%', background: `${G}0e`, pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ width: 40, height: 40, background: `${G}25`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.8" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
              </div>
              <p style={{ ...SF, fontSize: 17, color: 'white', margin: '0 0 6px', fontWeight: 400, lineHeight: 1.3 }}>Nghỉ Dưỡng Tại Asteria</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '0 0 18px', lineHeight: 1.7 }}>Tận hưởng ưu đãi độc quyền khi đặt phòng trực tiếp</p>
              <a href="/" style={{ display: 'inline-block', background: G, color: 'white', fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '11px 22px', borderRadius: 3, textDecoration: 'none' }}>
                Đặt Phòng Ngay
              </a>
            </div>
          </div>

        </aside>
      </div>

      {/* ════════════════════════════════════════════════════════
          RELATED SECTION (full width below)
      ════════════════════════════════════════════════════════ */}
      {related.length > 0 && (
        <section style={{ background: DARK, padding: 'clamp(48px,6vw,80px) clamp(20px,5vw,80px)' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div style={{ marginBottom: 36 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.3em', textTransform: 'uppercase', color: G, display: 'block', marginBottom: 10 }}>Cùng Chuyên Mục</span>
              <h2 style={{ ...SF, fontSize: 'clamp(24px,3vw,36px)', color: 'white', margin: 0, fontWeight: 400 }}>Bài Viết Liên Quan</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 24 }}>
              {related.map(r => (
                <div key={r.id} onClick={() => navigate(articlePath(r.categoryNames?.[0] || r.categoryName, r.slug))}
                  style={{ cursor: 'pointer', background: '#111', borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 200ms' }}>
                  <div style={{ aspectRatio: '16/9', overflow: 'hidden' }}>
                    <img src={r.thumbnailUrl || FALLBACK} alt={r.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ padding: 16 }}>
                    <span style={{ fontSize: 9, color: G, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>{r.categoryNames?.[0] || r.categoryName}</span>
                    <h3 style={{ fontSize: 15, color: 'white', margin: '0 0 12px', lineHeight: 1.4, fontWeight: 500 }}>{r.title}</h3>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{formatDate(r.publishedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Article Typography Styles ── */}
      <style>{`
        .article-prose { font-size: 16px; line-height: 1.95; color: #1f2937; word-break: break-word; overflow-wrap: break-word; }
        .article-prose h2 { font-family: 'Playfair Display', serif; font-size: clamp(20px,2.4vw,28px); color: #111; margin: 2.2em 0 0.75em; font-weight: 500; border-left: 3px solid ${G}; padding-left: 16px; }
        .article-prose h3 { font-family: 'Playfair Display', serif; font-size: clamp(17px,2vw,22px); color: #374151; margin: 1.8em 0 0.6em; font-weight: 500; }
        .article-prose p  { margin: 0 0 1.5em; }
        .article-prose img { max-width: 100%; border-radius: 6px; margin: 2em 0; box-shadow: 0 4px 20px rgba(0,0,0,.1); display: block; }
        .article-prose ul, .article-prose ol { padding-left: 1.5em; margin: 0 0 1.5em; }
        .article-prose li { margin-bottom: 0.6em; }
        .article-prose blockquote { border-left: 3px solid ${G}; padding: 12px 20px; margin: 2em 0; color: #6b7280; font-style: italic; background: ${G}08; border-radius: 0 4px 4px 0; }
        .article-prose a  { color: ${G}; text-decoration: none; border-bottom: 1px solid ${G}44; transition: border-color 200ms; }
        .article-prose a:hover { border-color: ${G}; }
        .article-prose strong { font-weight: 600; color: #111; }
        .article-prose hr { border: none; border-top: 1px solid #e5e7eb; margin: 2.5em 0; }
      `}</style>
    </div>
  );
}
