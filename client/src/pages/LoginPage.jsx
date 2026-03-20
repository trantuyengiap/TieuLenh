import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { user, login } = useAuth();
  const [form, setForm] = useState({ username: 'superadmin', password: 'Admin@123456' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/admin" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
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
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>TieuLenh Control Center</h1>
        <p>Đăng nhập bằng tài khoản được lưu trên server/database dùng chung.</p>
        <label>
          Tên đăng nhập
          <input value={form.username} onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))} />
        </label>
        <label>
          Mật khẩu
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
          />
        </label>
        {error ? <div className="error-banner">{error}</div> : null}
        <button type="submit" disabled={submitting}>{submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
        <small>Tài khoản mặc định được seed lần đầu: superadmin / Admin@123456</small>
      </form>
    </div>
  );
}
