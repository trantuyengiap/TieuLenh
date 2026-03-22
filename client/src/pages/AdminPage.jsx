import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api/http';
import { DataTable } from '../components/DataTable';
import { SectionCard } from '../components/SectionCard';
import { useSocket } from '../hooks/useSocket';

const initialUser = { username: '', fullName: '', password: '', role: 'ADMIN', status: 'ACTIVE' };
const initialEmployee = { employeeCode: '', fullName: '', rank: '', position: '', department: '', notes: '' };
const initialCommand = { title: '', position: '', description: '', employeeId: '', items: [''] };
const initialSession = { sessionName: '', mode: 'random', employeeId: '', commandSetId: '' };
const initialResult = { employeeId: '', commandSetId: '', score: 80, resultStatus: 'PASSED', evaluatorNote: '' };

// ===== MODAL COMPONENT =====
function Modal({ title, onClose, children }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-title">{title}</div>
        {children}
      </div>
    </div>
  );
}

export function AdminPage() {
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [commands, setCommands] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [ledState, setLedState] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [userForm, setUserForm] = useState(initialUser);
  const [employeeForm, setEmployeeForm] = useState(initialEmployee);
  const [commandForm, setCommandForm] = useState(initialCommand);
  const [sessionForm, setSessionForm] = useState(initialSession);
  const [resultForm, setResultForm] = useState(initialResult);

  // Modal state (replaces window.prompt / window.confirm)
  const [pwModal, setPwModal] = useState(null); // { userId }
  const [pwInput, setPwInput] = useState('');
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
  const [confirmDeleteEmployee, setConfirmDeleteEmployee] = useState(null);

  const activeSession = sessions[0];

  async function loadAll() {
    const [usersData, employeesData, commandsData, sessionsData, statsData, ledData] = await Promise.all([
      apiFetch('/users'),
      apiFetch('/employees'),
      apiFetch('/commands'),
      apiFetch('/sessions'),
      apiFetch('/stats'),
      apiFetch('/sessions/current'),
    ]);
    setUsers(usersData);
    setEmployees(employeesData);
    setCommands(commandsData);
    setSessions(sessionsData);
    setStats(statsData);
    setLedState(ledData.ledState);
  }

  useEffect(() => { loadAll().catch((err) => setError(err.message)); }, []);

  useSocket(
    useMemo(() => ({
      'led:update': (payload) => setLedState(payload),
      'session:update': () => loadAll().catch((err) => setError(err.message)),
      'stats:update': () => apiFetch('/stats').then(setStats).catch((err) => setError(err.message)),
    }), []),
  );

  function notifySuccess(text) { setMessage(text); setError(''); setTimeout(() => setMessage(''), 4000); }
  function notifyError(err) { setError(err.message); setMessage(''); }

  // ===== USERS =====
  async function createUser(e) {
    e.preventDefault();
    try {
      await apiFetch('/users', { method: 'POST', body: JSON.stringify(userForm) });
      setUserForm(initialUser);
      notifySuccess('✓ Đã tạo tài khoản thành công.');
      await loadAll();
    } catch (err) { notifyError(err); }
  }

  async function toggleUser(user) {
    try {
      await apiFetch(`/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ fullName: user.fullName, role: user.role, status: user.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE' }),
      });
      notifySuccess('✓ Đã cập nhật trạng thái tài khoản.');
      await loadAll();
    } catch (err) { notifyError(err); }
  }

  async function doResetPassword() {
    if (!pwModal) return;
    if (!pwInput || pwInput.length < 8) { setError('Mật khẩu phải có ít nhất 8 ký tự.'); return; }
    try {
      await apiFetch(`/users/${pwModal.userId}/password`, { method: 'PATCH', body: JSON.stringify({ password: pwInput }) });
      notifySuccess('✓ Đã đổi mật khẩu thành công.');
      setPwModal(null); setPwInput('');
    } catch (err) { notifyError(err); }
  }

  async function doDeleteUser() {
    if (!confirmDeleteUser) return;
    try {
      await apiFetch(`/users/${confirmDeleteUser}`, { method: 'DELETE' });
      notifySuccess('✓ Đã xóa tài khoản.');
      setConfirmDeleteUser(null);
      await loadAll();
    } catch (err) { notifyError(err); }
  }

  // ===== EMPLOYEES =====
  async function saveEmployee(e) {
    e.preventDefault();
    try {
      await apiFetch('/employees', { method: 'POST', body: JSON.stringify(employeeForm) });
      setEmployeeForm(initialEmployee);
      notifySuccess('✓ Đã thêm nhân viên.');
      await loadAll();
    } catch (err) { notifyError(err); }
  }

  async function doDeleteEmployee() {
    if (!confirmDeleteEmployee) return;
    try {
      await apiFetch(`/employees/${confirmDeleteEmployee}`, { method: 'DELETE' });
      notifySuccess('✓ Đã xóa nhân viên.');
      setConfirmDeleteEmployee(null);
      await loadAll();
    } catch (err) { notifyError(err); }
  }

  // ===== COMMANDS =====
  async function saveCommand(e) {
    e.preventDefault();
    try {
      await apiFetch('/commands', {
        method: 'POST',
        body: JSON.stringify({
          ...commandForm,
          employeeId: commandForm.employeeId || null,
          items: commandForm.items.filter(Boolean).map((content) => ({ content })),
        }),
      });
      setCommandForm(initialCommand);
      notifySuccess('✓ Đã lưu bộ tiêu lệnh.');
      await loadAll();
    } catch (err) { notifyError(err); }
  }

  // ===== SESSIONS =====
  function randomStartSuggestion() {
    if (!employees.length || !commands.length) return;
    const emp = employees[Math.floor(Math.random() * employees.length)];
    const compatible = commands.filter((c) => !c.employeeId || c.employeeId === emp.id);
    const cmd = compatible[0] || commands[0];
    setSessionForm({ sessionName: `Kiểm tra ${emp.fullName}`, mode: 'random', employeeId: emp.id, commandSetId: cmd?.id || '' });
    setResultForm((p) => ({ ...p, employeeId: emp.id, commandSetId: cmd?.id || '' }));
  }

  async function startSession(e) {
    e.preventDefault();
    try {
      const payload = { ...sessionForm };
      if (payload.mode === 'random' && !payload.employeeId) { randomStartSuggestion(); return; }
      await apiFetch('/sessions/start', { method: 'POST', body: JSON.stringify(payload) });
      setResultForm((p) => ({ ...p, employeeId: payload.employeeId, commandSetId: payload.commandSetId }));
      notifySuccess('✓ Đã bắt đầu phiên kiểm tra — LED đang cập nhật.');
      await loadAll();
    } catch (err) { notifyError(err); }
  }

  async function finalizeResult(e) {
    e.preventDefault();
    if (!activeSession) return;
    try {
      await apiFetch(`/sessions/${activeSession.id}/result`, {
        method: 'POST',
        body: JSON.stringify({ ...resultForm, score: Number(resultForm.score) }),
      });
      notifySuccess('✓ Đã chốt kết quả — đồng bộ LED.');
      await loadAll();
    } catch (err) { notifyError(err); }
  }

  async function resetLed() {
    try {
      await apiFetch('/sessions/reset-led', { method: 'POST' });
      notifySuccess('✓ Đã reset màn hình LED.');
      await loadAll();
    } catch (err) { notifyError(err); }
  }

  // ===== IMPORT/EXPORT =====
  async function exportJson() {
    const data = await apiFetch('/system/export');
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'tieulenh-export.json'; a.click();
    URL.revokeObjectURL(url);
  }

  async function importFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await apiFetch('/system/import', { method: 'POST', body: formData });
      notifySuccess('✓ Đã import dữ liệu.');
      await loadAll();
    } catch (err) { notifyError(err); }
    finally { e.target.value = ''; }
  }

  return (
    <div className="page-stack">
      {/* Header */}
      <header className="page-header">
        <div>
          <h2>Bảng Điều Khiển</h2>
          <p>Quản lý nhân viên, tiêu lệnh, phiên kiểm tra và màn hình LED realtime.</p>
        </div>
        <div className="header-actions">
          <button className="secondary" onClick={randomStartSuggestion}>🎲 Gợi Ý Ngẫu Nhiên</button>
          <button className="secondary" onClick={resetLed}>↺ Reset LED</button>
        </div>
      </header>

      {message && <div className="success-banner">{message}</div>}
      {error && <div className="error-banner">⚠ {error}</div>}

      {/* Stats */}
      <section className="stats-grid">
        <div className="stat-card"><strong>{stats?.totals?.users ?? 0}</strong><span>Tài Khoản</span></div>
        <div className="stat-card"><strong>{stats?.totals?.employees ?? 0}</strong><span>Nhân Viên</span></div>
        <div className="stat-card"><strong>{stats?.totals?.commandSets ?? 0}</strong><span>Bộ Tiêu Lệnh</span></div>
        <div className="stat-card"><strong>{stats?.totals?.sessions ?? 0}</strong><span>Phiên</span></div>
        <div className="stat-card success"><strong>{stats?.outcomes?.passed ?? 0}</strong><span>Đạt</span></div>
        <div className="stat-card danger"><strong>{stats?.outcomes?.failed ?? 0}</strong><span>Chưa Đạt</span></div>
      </section>

      {/* LED State */}
      <SectionCard title="Trạng Thái LED Realtime" subtitle="Reload trang vẫn khôi phục đúng trạng thái mới nhất từ server.">
        <pre className="code-block">{JSON.stringify(ledState, null, 2)}</pre>
      </SectionCard>

      {/* Users & Employees */}
      <div className="grid-2">
        <SectionCard title="Quản Trị Tài Khoản" subtitle="Tài khoản được lưu trên database dùng chung.">
          <form className="form-grid" onSubmit={createUser}>
            <input placeholder="Username" value={userForm.username} onChange={(e) => setUserForm((p) => ({ ...p, username: e.target.value }))} required />
            <input placeholder="Họ tên" value={userForm.fullName} onChange={(e) => setUserForm((p) => ({ ...p, fullName: e.target.value }))} required />
            <input type="password" placeholder="Mật khẩu (≥ 8 ký tự)" value={userForm.password} onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))} required />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <select value={userForm.role} onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value }))}>
                <option value="SUPERADMIN">Superadmin</option>
                <option value="ADMIN">Admin</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <select value={userForm.status} onChange={(e) => setUserForm((p) => ({ ...p, status: e.target.value }))}>
                <option value="ACTIVE">Hoạt động</option>
                <option value="LOCKED">Khóa</option>
              </select>
            </div>
            <button type="submit">+ Tạo Tài Khoản</button>
          </form>
          <DataTable
            rows={users}
            columns={[
              { key: 'username', label: 'Username' },
              { key: 'fullName', label: 'Họ tên' },
              { key: 'role', label: 'Vai trò', render: (row) => <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 9, letterSpacing: 1.5, color: '#43A047', textTransform: 'uppercase' }}>{row.role}</span> },
              { key: 'status', label: 'Trạng thái', render: (row) => <span className={row.status === 'ACTIVE' ? 'status-active' : 'status-locked'}>{row.status === 'ACTIVE' ? '● Hoạt động' : '● Khóa'}</span> },
              {
                key: 'actions', label: 'Thao tác',
                render: (row) => (
                  <div className="inline-actions">
                    <button className="secondary small" onClick={() => toggleUser(row)}>{row.status === 'ACTIVE' ? 'Khóa' : 'Mở'}</button>
                    <button className="secondary small" onClick={() => { setPwModal({ userId: row.id }); setPwInput(''); }}>Đổi MK</button>
                    <button className="danger small" onClick={() => setConfirmDeleteUser(row.id)}>Xóa</button>
                  </div>
                ),
              },
            ]}
          />
        </SectionCard>

        <SectionCard title="Quản Lý Nhân Viên" subtitle="Dữ liệu tập trung trên database dùng chung cho mọi máy.">
          <form className="form-grid" onSubmit={saveEmployee}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input placeholder="Mã nhân viên" value={employeeForm.employeeCode} onChange={(e) => setEmployeeForm((p) => ({ ...p, employeeCode: e.target.value }))} required />
              <input placeholder="Họ tên" value={employeeForm.fullName} onChange={(e) => setEmployeeForm((p) => ({ ...p, fullName: e.target.value }))} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input placeholder="Cấp bậc" value={employeeForm.rank} onChange={(e) => setEmployeeForm((p) => ({ ...p, rank: e.target.value }))} />
              <input placeholder="Chức danh" value={employeeForm.position} onChange={(e) => setEmployeeForm((p) => ({ ...p, position: e.target.value }))} />
            </div>
            <input placeholder="Đơn vị" value={employeeForm.department} onChange={(e) => setEmployeeForm((p) => ({ ...p, department: e.target.value }))} />
            <textarea placeholder="Ghi chú" value={employeeForm.notes} onChange={(e) => setEmployeeForm((p) => ({ ...p, notes: e.target.value }))} style={{ minHeight: 64 }} />
            <button type="submit">+ Thêm Nhân Viên</button>
          </form>
          <DataTable
            rows={employees}
            columns={[
              { key: 'employeeCode', label: 'Mã', render: (row) => <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 11, color: '#43A047' }}>{row.employeeCode}</span> },
              { key: 'fullName', label: 'Họ tên' },
              { key: 'position', label: 'Chức danh' },
              { key: 'department', label: 'Đơn vị' },
              { key: 'results', label: 'Lịch sử', render: (row) => row.results?.length || 0 },
              { key: 'actions', label: '', render: (row) => <button className="danger small" onClick={() => setConfirmDeleteEmployee(row.id)}>Xóa</button> },
            ]}
          />
        </SectionCard>
      </div>

      {/* Commands & Sessions */}
      <div className="grid-2">
        <SectionCard title="Bộ Tiêu Lệnh" subtitle="Có thể gắn theo nhân viên hoặc dùng chung cho nhiều người.">
          <form className="form-grid" onSubmit={saveCommand}>
            <input placeholder="Tên bộ tiêu lệnh" value={commandForm.title} onChange={(e) => setCommandForm((p) => ({ ...p, title: e.target.value }))} required />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input placeholder="Chức danh áp dụng" value={commandForm.position} onChange={(e) => setCommandForm((p) => ({ ...p, position: e.target.value }))} />
              <select value={commandForm.employeeId} onChange={(e) => setCommandForm((p) => ({ ...p, employeeId: e.target.value }))}>
                <option value="">Dùng chung</option>
                {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.fullName}</option>)}
              </select>
            </div>
            <textarea placeholder="Mô tả bộ tiêu lệnh" value={commandForm.description} onChange={(e) => setCommandForm((p) => ({ ...p, description: e.target.value }))} style={{ minHeight: 60 }} />

            <div style={{ borderTop: '1px solid rgba(27,94,32,.2)', paddingTop: 10 }}>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 9, letterSpacing: 3, color: '#43A047', marginBottom: 8, textTransform: 'uppercase' }}>Danh Sách Tiêu Lệnh</div>
              {commandForm.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 12, color: '#43A047', minWidth: 24, textAlign: 'center' }}>{idx + 1}</span>
                  <input
                    placeholder={`Nội dung tiêu lệnh ${idx + 1}`}
                    value={item}
                    onChange={(e) => setCommandForm((p) => ({ ...p, items: p.items.map((v, i) => i === idx ? e.target.value : v) }))}
                  />
                  {commandForm.items.length > 1 && (
                    <button type="button" className="danger small" style={{ flexShrink: 0, padding: '6px 10px' }}
                      onClick={() => setCommandForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))}>✕</button>
                  )}
                </div>
              ))}
            </div>

            <div className="inline-actions">
              <button type="button" className="secondary" onClick={() => setCommandForm((p) => ({ ...p, items: [...p.items, ''] }))}>+ Thêm dòng</button>
              <button type="submit">💾 Lưu Bộ Tiêu Lệnh</button>
            </div>
          </form>

          <DataTable
            rows={commands}
            columns={[
              { key: 'title', label: 'Tên bộ' },
              { key: 'position', label: 'Chức danh' },
              { key: 'employee', label: 'Nhân viên', render: (row) => row.employee?.fullName || <span style={{ color: 'var(--dim)' }}>Dùng chung</span> },
              { key: 'items', label: 'Số TL', render: (row) => <span style={{ fontFamily: "'Orbitron', monospace", color: '#43A047' }}>{row.items?.length || 0}</span> },
            ]}
          />
        </SectionCard>

        <SectionCard title="Điều Hành Kiểm Tra" subtitle="Bắt đầu phiên mới, chốt kết quả và đồng bộ LED realtime.">
          {/* Start session form */}
          <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 9, letterSpacing: 3, color: '#43A047', marginBottom: 12, textTransform: 'uppercase' }}>Bắt Đầu Phiên Mới</div>
          <form className="form-grid" onSubmit={startSession} style={{ marginBottom: 24 }}>
            <input placeholder="Tên phiên kiểm tra" value={sessionForm.sessionName} onChange={(e) => setSessionForm((p) => ({ ...p, sessionName: e.target.value }))} required />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <select value={sessionForm.mode} onChange={(e) => setSessionForm((p) => ({ ...p, mode: e.target.value }))}>
                <option value="random">Ngẫu nhiên</option>
                <option value="manual">Thủ công</option>
              </select>
              <select value={sessionForm.employeeId} onChange={(e) => setSessionForm((p) => ({ ...p, employeeId: e.target.value }))}>
                <option value="">Chọn nhân viên</option>
                {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.fullName}</option>)}
              </select>
            </div>
            <select value={sessionForm.commandSetId} onChange={(e) => setSessionForm((p) => ({ ...p, commandSetId: e.target.value }))}>
              <option value="">Chọn bộ tiêu lệnh</option>
              {commands.map((cmd) => <option key={cmd.id} value={cmd.id}>{cmd.title}</option>)}
            </select>
            <button type="submit">▶ Bắt Đầu Phiên</button>
          </form>

          {/* Finalize result form */}
          <div style={{ borderTop: '1px solid rgba(27,94,32,.2)', paddingTop: 20 }}>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 9, letterSpacing: 3, color: activeSession ? '#43A047' : '#5A6680', marginBottom: 12, textTransform: 'uppercase' }}>
              Chốt Kết Quả {activeSession ? `— ${activeSession.sessionName}` : '(Chưa có phiên hoạt động)'}
            </div>
            <form className="form-grid" onSubmit={finalizeResult}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <select value={resultForm.employeeId} onChange={(e) => setResultForm((p) => ({ ...p, employeeId: e.target.value }))}>
                  <option value="">Chọn nhân viên</option>
                  {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.fullName}</option>)}
                </select>
                <select value={resultForm.commandSetId} onChange={(e) => setResultForm((p) => ({ ...p, commandSetId: e.target.value }))}>
                  <option value="">Chọn bộ tiêu lệnh</option>
                  {commands.map((cmd) => <option key={cmd.id} value={cmd.id}>{cmd.title}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input type="number" min="0" max="100" placeholder="Điểm số (0–100)" value={resultForm.score} onChange={(e) => setResultForm((p) => ({ ...p, score: e.target.value }))} />
                <select value={resultForm.resultStatus} onChange={(e) => setResultForm((p) => ({ ...p, resultStatus: e.target.value }))}>
                  <option value="PASSED">✓ Đạt</option>
                  <option value="FAILED">✗ Chưa đạt</option>
                  <option value="PENDING">⏳ Chờ đánh giá</option>
                </select>
              </div>
              <textarea placeholder="Nhận xét đánh giá (tuỳ chọn)" value={resultForm.evaluatorNote} onChange={(e) => setResultForm((p) => ({ ...p, evaluatorNote: e.target.value }))} style={{ minHeight: 60 }} />
              <button type="submit" disabled={!activeSession}>✓ Chốt Kết Quả</button>
            </form>
          </div>

          {/* Session history */}
          <div style={{ borderTop: '1px solid rgba(27,94,32,.2)', paddingTop: 20, marginTop: 4 }}>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 9, letterSpacing: 3, color: '#5A6680', marginBottom: 12, textTransform: 'uppercase' }}>Lịch Sử Phiên</div>
            <DataTable
              rows={sessions.slice(0, 8)}
              columns={[
                { key: 'sessionName', label: 'Phiên' },
                { key: 'mode', label: 'Chế độ', render: (row) => <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 9, letterSpacing: 1 }}>{row.mode}</span> },
                { key: 'status', label: 'Trạng thái', render: (row) => <span className={row.status === 'LIVE' ? 'status-active' : ''}>{row.status}</span> },
                { key: 'createdAt', label: 'Tạo lúc', render: (row) => new Date(row.createdAt).toLocaleString('vi-VN') },
                { key: 'results', label: 'Kết quả', render: (row) => row.results?.length || 0 },
              ]}
            />
          </div>
        </SectionCard>
      </div>

      {/* Import / Export */}
      <SectionCard title="Import / Export Dữ Liệu" subtitle="Hỗ trợ JSON để chuyển dữ liệu giữa các môi trường.">
        <div className="inline-actions">
          <button className="secondary" onClick={exportJson}>📤 Export JSON</button>
          <label className="file-input-label">
            📥 Import JSON/Excel
            <input type="file" accept=".json,.xlsx" onChange={importFile} />
          </label>
        </div>
      </SectionCard>

      {/* === MODALS === */}

      {/* Password Reset Modal */}
      {pwModal && (
        <Modal title="🔑 ĐỔI MẬT KHẨU" onClose={() => setPwModal(null)}>
          <div style={{ display: 'grid', gap: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--dim2)' }}>Nhập mật khẩu mới cho tài khoản. Yêu cầu ít nhất 8 ký tự.</p>
            <input
              type="password"
              placeholder="Mật khẩu mới (≥ 8 ký tự)"
              value={pwInput}
              onChange={(e) => setPwInput(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') doResetPassword(); }}
            />
            {error && <div className="error-banner" style={{ fontSize: 12 }}>⚠ {error}</div>}
          </div>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setPwModal(null)}>Hủy</button>
            <button onClick={doResetPassword}>✓ Xác Nhận</button>
          </div>
        </Modal>
      )}

      {/* Confirm Delete User Modal */}
      {confirmDeleteUser && (
        <Modal title="⚠ XÁC NHẬN XÓA TÀI KHOẢN" onClose={() => setConfirmDeleteUser(null)}>
          <p style={{ fontSize: 13, color: 'var(--dim2)', lineHeight: 1.6 }}>
            Hành động này không thể hoàn tác. Tài khoản sẽ bị xóa vĩnh viễn khỏi hệ thống.
          </p>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setConfirmDeleteUser(null)}>Hủy</button>
            <button className="danger" onClick={doDeleteUser}>🗑 Xóa</button>
          </div>
        </Modal>
      )}

      {/* Confirm Delete Employee Modal */}
      {confirmDeleteEmployee && (
        <Modal title="⚠ XÁC NHẬN XÓA NHÂN VIÊN" onClose={() => setConfirmDeleteEmployee(null)}>
          <p style={{ fontSize: 13, color: 'var(--dim2)', lineHeight: 1.6 }}>
            Nhân viên và toàn bộ lịch sử kiểm tra liên quan sẽ bị xóa vĩnh viễn.
          </p>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setConfirmDeleteEmployee(null)}>Hủy</button>
            <button className="danger" onClick={doDeleteEmployee}>🗑 Xóa</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
