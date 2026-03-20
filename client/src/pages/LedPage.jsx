import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/http';
import { useSocket } from '../hooks/useSocket';

export function LedPage() {
  const [state, setState] = useState(null);

  useEffect(() => {
    apiFetch('/sessions/current').then((data) => setState(data.ledState));
  }, []);

  useSocket(
    useMemo(
      () => ({
        'led:update': (payload) => setState(payload),
      }),
      [],
    ),
  );

  return (
    <div className="led-screen">
      <div className="led-topbar">
        <h1>Màn hình LED realtime</h1>
        <Link to="/admin" className="secondary">Quay lại quản trị</Link>
      </div>

      <div className="led-body">
        <div className="status-pill">Trạng thái: {state?.status || 'idle'}</div>
        <h2>{state?.sessionName || 'Sẵn sàng nhận dữ liệu từ server'}</h2>
        <div className="led-grid">
          <article className="led-panel">
            <h3>Nhân viên đang được gọi</h3>
            <p className="led-highlight">{state?.employee?.fullName || state?.result?.employee?.fullName || '---'}</p>
            <p>{state?.employee?.position || state?.result?.employee?.position || 'Chưa chọn nhân viên'}</p>
          </article>
          <article className="led-panel">
            <h3>Bộ tiêu lệnh</h3>
            <ul>
              {(state?.commandSet?.items || state?.result?.commandSet?.items || []).map((item) => (
                <li key={item.id}>{item.orderIndex}. {item.content}</li>
              ))}
            </ul>
          </article>
          <article className="led-panel">
            <h3>Kết quả mới nhất</h3>
            <p className="led-highlight">{state?.result?.resultStatus || 'Đang chờ'}</p>
            <p>Điểm: {state?.result?.score ?? '---'}</p>
            <p>Nhận xét: {state?.result?.evaluatorNote || 'Chưa có'}</p>
          </article>
        </div>
        <p className="led-footer">Dữ liệu trên màn hình này luôn lấy từ server + Socket.IO, reload vẫn khôi phục đúng trạng thái mới nhất.</p>
      </div>
    </div>
  );
}
