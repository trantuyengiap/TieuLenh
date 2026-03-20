import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AppLayout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <h1>TieuLenh</h1>
          <p>Control Center</p>
        </div>
        <nav>
          <NavLink to="/admin">Trang quản trị</NavLink>
          <NavLink to="/led">Màn hình LED</NavLink>
        </nav>
        <div className="sidebar-footer">
          <div>
            <strong>{user?.fullName}</strong>
            <p>{user?.role}</p>
          </div>
          <button className="secondary" onClick={logout}>Đăng xuất</button>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
