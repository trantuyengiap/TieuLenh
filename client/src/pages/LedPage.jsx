import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/http';
import { useSocket } from '../hooks/useSocket';

export function LedPage() {
  const [state, setState] = useState(null);
  const [clock, setClock] = useState('');

  useEffect(() => {
    apiFetch('/sessions/current').then((data) => setState(data.ledState)).catch(() => {});
  }, []);

  // Live clock
  useEffect(() => {
    function tick() {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setClock(`${h}:${m}:${s}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useSocket(
    useMemo(() => ({ 'led:update': (payload) => setState(payload) }), []),
  );

  const isIdle = !state || state.status === 'idle';
  const isLive = state?.status === 'live';
  const isCompleted = state?.status === 'completed';

  const employee = state?.employee || state?.result?.employee;
  const commandSet = state?.commandSet || state?.result?.commandSet;
  const result = state?.result;

  return (
    <div className="led-screen">
      {/* Corner decorations */}
      <div className="corner corner-tl" />
      <div className="corner corner-tr" />
      <div className="corner corner-bl" />
      <div className="corner corner-br" />

      {/* Header */}
      <div className="led-header">
        <div className="led-header-logo">TTCIZ</div>
        <div className="led-header-title">Kiểm Tra Tiêu Lệnh</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="led-header-clock">{clock}</div>
          <Link to="/admin">← ADMIN</Link>
        </div>
      </div>

      {/* Body */}
      <div className="led-body">
        {isIdle && (
          <div className="led-idle">
            <div className="led-idle-icon">🎯</div>
            <div className="led-idle-title">SẴN SÀNG</div>
            <div className="led-idle-sub">Chờ nhận dữ liệu từ server</div>
          </div>
        )}

        {(isLive || isCompleted) && (
          <>
            <div className={`led-status-pill ${isCompleted ? 'completed' : ''}`}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: isCompleted ? '#64b5f6' : '#66BB6A', display: 'inline-block', animation: isLive ? 'pulse 1.5s ease-in-out infinite' : 'none' }} />
              {isLive ? 'ĐANG KIỂM TRA' : 'ĐÃ HOÀN THÀNH'}
            </div>

            {state?.sessionName && (
              <div className="led-session-name">{state.sessionName}</div>
            )}

            <div className="led-grid">
              {/* Panel 1: Nhân viên */}
              <div className="led-panel">
                <div className="led-panel-label">Nhân Viên Được Gọi</div>
                {employee ? (
                  <>
                    <div className="led-highlight">{employee.fullName}</div>
                    {employee.employeeCode && (
                      <div style={{
                        display: 'inline-block',
                        background: 'rgba(27,94,32,.15)',
                        border: '1px solid rgba(27,94,32,.4)',
                        color: '#43A047',
                        fontFamily: "'Orbitron', monospace",
                        fontSize: 13,
                        letterSpacing: 3,
                        padding: '4px 16px',
                        borderRadius: 4,
                        marginBottom: 8,
                      }}>
                        {employee.employeeCode}
                      </div>
                    )}
                    <div className="led-sub-text">{employee.position || employee.rank || 'Nhân viên'}</div>
                    {employee.department && (
                      <div className="led-sub-text" style={{ marginTop: 4 }}>{employee.department}</div>
                    )}
                  </>
                ) : (
                  <div className="led-sub-text">Chưa chọn nhân viên</div>
                )}
              </div>

              {/* Panel 2: Bộ tiêu lệnh */}
              <div className="led-panel">
                <div className="led-panel-label">Bộ Tiêu Lệnh</div>
                {commandSet ? (
                  <>
                    <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 11, letterSpacing: 2, color: 'rgba(67,160,71,.6)', marginBottom: 14, textTransform: 'uppercase' }}>
                      {commandSet.title}
                    </div>
                    {commandSet.items && commandSet.items.length > 0 ? (
                      <table className="led-tl-list">
                        <tbody>
                          {commandSet.items.map((item) => (
                            <tr key={item.id}>
                              <td className="led-tl-num">{item.orderIndex}</td>
                              <td className="led-tl-text">{item.content}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="led-sub-text">Không có tiêu lệnh</div>
                    )}
                  </>
                ) : (
                  <div className="led-sub-text">Chưa có bộ tiêu lệnh</div>
                )}
              </div>

              {/* Panel 3: Kết quả */}
              <div className="led-panel">
                <div className="led-panel-label">Kết Quả</div>
                {isLive && !result && (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 11, letterSpacing: 3, color: 'rgba(67,160,71,.4)', animation: 'breathe 2s ease-in-out infinite' }}>
                      CHỜ KẾT QUẢ...
                    </div>
                  </div>
                )}
                {result && (
                  <>
                    <div className={`led-highlight ${result.resultStatus === 'PASSED' ? 'led-verdict-pass' : result.resultStatus === 'FAILED' ? 'led-verdict-fail' : ''}`}>
                      {result.resultStatus === 'PASSED' ? '✓ ĐẠT' : result.resultStatus === 'FAILED' ? '✗ CHƯA ĐẠT' : '⏳ CHỜ ĐÁNH GIÁ'}
                    </div>
                    {result.score != null && (
                      <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 28, color: '#fff', marginBottom: 8 }}>
                        {result.score}<span style={{ fontSize: 14, color: 'rgba(255,255,255,.4)', marginLeft: 4 }}>điểm</span>
                      </div>
                    )}
                    {result.evaluatorNote && (
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', lineHeight: 1.6, fontStyle: 'italic', marginTop: 8 }}>
                        "{result.evaluatorNote}"
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="led-footer-text">
              DỮ LIỆU ĐỒNG BỘ THỜI GIAN THỰC · SOCKET.IO · TTCIZ
            </div>
          </>
        )}
      </div>
    </div>
  );
}
