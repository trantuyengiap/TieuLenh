import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { user, login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/admin" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      {/* Stars */}
      <Stars />

      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-logo">
          <div className="login-icon">🏭</div>
          <div className="login-title">TTCIZ</div>
          <div className="login-sub">Hệ Thống Kiểm Tra Tiêu Lệnh</div>
        </div>

        <label>
          Tên đăng nhập
          <input
            type="text"
            placeholder="Nhập tên đăng nhập..."
            autoComplete="username"
            value={form.username}
            onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
          />
        </label>

        <label>
          Mật khẩu
          <input
            type="password"
            placeholder="Nhập mật khẩu..."
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
          />
        </label>

        {error && <div className="error-banner">⚠ {error}</div>}

        <button type="submit" disabled={submitting}>
          {submitting ? '⏳ ĐANG ĐĂNG NHẬP...' : '🔐 ĐĂNG NHẬP'}
        </button>

        <div className="login-note">TTCIZ · HỆ THỐNG NỘI BỘ</div>
      </form>
    </div>
  );
}

function Stars() {
  const stars = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    top: Math.random() * 100,
    left: Math.random() * 100,
    size: Math.random() * 2 + 1,
    delay: Math.random() * 4,
    duration: Math.random() * 3 + 2,
  }));

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      {stars.map((s) => (
        <div
          key={s.id}
          style={{
            position: 'absolute',
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            background: '#43A047',
            borderRadius: '50%',
            opacity: 0.25,
            animation: `pulse ${s.duration}s ${s.delay}s ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}
