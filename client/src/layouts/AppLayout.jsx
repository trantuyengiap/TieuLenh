import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AppLayout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-tag">HỆ THỐNG NỘI BỘ</div>
          <div className="sidebar-brand-title">TTCIZ</div>
          <div className="sidebar-brand-sub">Kiểm Tra Tiêu Lệnh</div>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/admin">
            <span>🎯</span>
            <span>Điều Hành</span>
          </NavLink>
          <NavLink to="/led">
            <span>📺</span>
            <span>Màn Hình LED</span>
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="status-indicator">
            <span className="status-dot" />
            <span>Hệ thống hoạt động</span>
          </div>
          <div className="sidebar-user">
            <strong>{user?.fullName || '---'}</strong>
            <p>{user?.role}</p>
          </div>
          <button className="secondary" style={{ width: '100%' }} onClick={logout}>
            ⏻ Đăng Xuất
          </button>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
