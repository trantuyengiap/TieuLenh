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

  useEffect(() => {
    loadAll().catch((err) => setError(err.message));
  }, []);

  useSocket(
    useMemo(
      () => ({
        'led:update': (payload) => setLedState(payload),
        'session:update': () => loadAll().catch((err) => setError(err.message)),
        'stats:update': () => apiFetch('/stats').then(setStats).catch((err) => setError(err.message)),
      }),
      [],
    ),
  );

  function notifySuccess(text) {
    setMessage(text);
    setError('');
  }

  function notifyError(err) {
    setError(err.message);
    setMessage('');
  }

  async function createUser(event) {
    event.preventDefault();
    try {
      await apiFetch('/users', { method: 'POST', body: JSON.stringify(userForm) });
      setUserForm(initialUser);
      notifySuccess('Đã tạo user trên database dùng chung.');
      await loadAll();
    } catch (err) {
      notifyError(err);
    }
  }

  async function toggleUser(user) {
    try {
      await apiFetch(`/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          fullName: user.fullName,
          role: user.role,
          status: user.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE',
        }),
      });
      notifySuccess('Đã cập nhật trạng thái tài khoản.');
      await loadAll();
    } catch (err) {
      notifyError(err);
    }
  }

  async function resetPassword(userId) {
    const password = window.prompt('Nhập mật khẩu mới (ít nhất 8 ký tự):', 'Admin@123456');
    if (!password) return;
    try {
      await apiFetch(`/users/${userId}/password`, { method: 'PATCH', body: JSON.stringify({ password }) });
      notifySuccess('Đã đổi mật khẩu thành công.');
    } catch (err) {
      notifyError(err);
    }
  }

  async function deleteUser(userId) {
    if (!window.confirm('Xóa user này?')) return;
    try {
      await apiFetch(`/users/${userId}`, { method: 'DELETE' });
      notifySuccess('Đã xóa user khỏi database.');
      await loadAll();
    } catch (err) {
      notifyError(err);
    }
  }

  async function saveEmployee(event) {
    event.preventDefault();
    try {
      await apiFetch('/employees', { method: 'POST', body: JSON.stringify(employeeForm) });
      setEmployeeForm(initialEmployee);
      notifySuccess('Đã thêm nhân viên.');
      await loadAll();
    } catch (err) {
      notifyError(err);
    }
  }

  async function deleteEmployee(id) {
    if (!window.confirm('Xóa nhân viên này?')) return;
    try {
      await apiFetch(`/employees/${id}`, { method: 'DELETE' });
      notifySuccess('Đã xóa nhân viên.');
      await loadAll();
    } catch (err) {
      notifyError(err);
    }
  }

  async function saveCommand(event) {
    event.preventDefault();
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
      notifySuccess('Đã lưu bộ tiêu lệnh.');
      await loadAll();
    } catch (err) {
      notifyError(err);
    }
  }

  function randomStartSuggestion() {
    if (!employees.length || !commands.length) return;
    const employee = employees[Math.floor(Math.random() * employees.length)];
    const compatible = commands.filter((item) => !item.employeeId || item.employeeId === employee.id);
    const command = compatible[0] || commands[0];
    setSessionForm({
      sessionName: `Kiểm tra ${employee.fullName}`,
      mode: 'random',
      employeeId: employee.id,
      commandSetId: command?.id || '',
    });
    setResultForm((prev) => ({ ...prev, employeeId: employee.id, commandSetId: command?.id || '' }));
  }

  async function startSession(event) {
    event.preventDefault();
    try {
      const payload = { ...sessionForm };
      if (payload.mode === 'random' && !payload.employeeId) {
        randomStartSuggestion();
        return;
      }
      await apiFetch('/sessions/start', { method: 'POST', body: JSON.stringify(payload) });
      setResultForm((prev) => ({ ...prev, employeeId: payload.employeeId, commandSetId: payload.commandSetId }));
      notifySuccess('Đã đẩy phiên kiểm tra mới lên màn hình LED realtime.');
      await loadAll();
    } catch (err) {
      notifyError(err);
    }
  }

  async function finalizeResult(event) {
    event.preventDefault();
    if (!activeSession) return;
    try {
      await apiFetch(`/sessions/${activeSession.id}/result`, {
        method: 'POST',
        body: JSON.stringify({ ...resultForm, score: Number(resultForm.score) }),
      });
      notifySuccess('Đã chốt kết quả và đồng bộ tới LED.');
      await loadAll();
    } catch (err) {
      notifyError(err);
    }
  }

  async function resetLed() {
    try {
      await apiFetch('/sessions/reset-led', { method: 'POST' });
      notifySuccess('Đã reset màn hình LED.');
      await loadAll();
    } catch (err) {
      notifyError(err);
    }
  }

  async function exportJson() {
    const data = await apiFetch('/system/export');
    downloadFile('tieulenh-export.json', JSON.stringify(data, null, 2), 'application/json');
  }

  async function exportExcel() {
    const response = await apiFetch('/system/export?format=xlsx');
    const blob = await response.blob();
    downloadBlob('tieulenh-export.xlsx', blob);
  }

  async function importFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await apiFetch('/system/import', { method: 'POST', body: formData });
      notifySuccess('Đã import dữ liệu cũ (JSON/Excel).');
      await loadAll();
    } catch (err) {
      notifyError(err);
    } finally {
      event.target.value = '';
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <h2>Bảng điều khiển quản trị</h2>
          <p>Toàn bộ user, nhân viên, bộ tiêu lệnh, lịch sử và LED đều được đọc/ghi qua server + database thay cho localStorage.</p>
        </div>
        <div className="header-actions">
          <button onClick={randomStartSuggestion} className="secondary">Gợi ý quay số ngẫu nhiên</button>
          <button onClick={resetLed} className="secondary">Reset LED</button>
        </div>
      </header>

      {message ? <div className="success-banner">{message}</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      <section className="stats-grid">
        <div className="stat-card"><strong>{stats?.totals?.users ?? 0}</strong><span>Tài khoản</span></div>
        <div className="stat-card"><strong>{stats?.totals?.employees ?? 0}</strong><span>Nhân viên</span></div>
        <div className="stat-card"><strong>{stats?.totals?.commandSets ?? 0}</strong><span>Bộ tiêu lệnh</span></div>
        <div className="stat-card"><strong>{stats?.totals?.sessions ?? 0}</strong><span>Phiên kiểm tra</span></div>
        <div className="stat-card success"><strong>{stats?.outcomes?.passed ?? 0}</strong><span>Đạt</span></div>
        <div className="stat-card danger"><strong>{stats?.outcomes?.failed ?? 0}</strong><span>Chưa đạt</span></div>
      </section>

      <SectionCard title="Realtime LED" subtitle="Nếu LED reload, trang vẫn lấy trạng thái mới nhất từ server.">
        <pre className="code-block">{JSON.stringify(ledState, null, 2)}</pre>
      </SectionCard>

      <div className="grid-2">
        <SectionCard title="Quản trị người dùng" subtitle="Không còn lưu danh sách user bằng localStorage nữa.">
          <form className="form-grid" onSubmit={createUser}>
            <input placeholder="Username" value={userForm.username} onChange={(e) => setUserForm((p) => ({ ...p, username: e.target.value }))} />
            <input placeholder="Họ tên" value={userForm.fullName} onChange={(e) => setUserForm((p) => ({ ...p, fullName: e.target.value }))} />
            <input type="password" placeholder="Mật khẩu" value={userForm.password} onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))} />
            <select value={userForm.role} onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value }))}>
              <option value="SUPERADMIN">superadmin</option>
              <option value="ADMIN">admin</option>
              <option value="VIEWER">viewer</option>
            </select>
            <select value={userForm.status} onChange={(e) => setUserForm((p) => ({ ...p, status: e.target.value }))}>
              <option value="ACTIVE">Hoạt động</option>
              <option value="LOCKED">Khóa</option>
            </select>
            <button type="submit">Tạo user</button>
          </form>
          <DataTable
            rows={users}
            columns={[
              { key: 'username', label: 'Username' },
              { key: 'fullName', label: 'Họ tên' },
              { key: 'role', label: 'Role' },
              { key: 'status', label: 'Trạng thái' },
              {
                key: 'actions',
                label: 'Thao tác',
                render: (row) => (
                  <div className="inline-actions">
                    <button className="secondary small" onClick={() => toggleUser(row)}>{row.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}</button>
                    <button className="secondary small" onClick={() => resetPassword(row.id)}>Đổi mật khẩu</button>
                    <button className="danger small" onClick={() => deleteUser(row.id)}>Xóa</button>
                  </div>
                ),
              },
            ]}
          />
        </SectionCard>

        <SectionCard title="Quản lý nhân viên" subtitle="Dữ liệu nhân viên tập trung trên database dùng chung cho mọi máy.">
          <form className="form-grid" onSubmit={saveEmployee}>
            <input placeholder="Mã nhân viên" value={employeeForm.employeeCode} onChange={(e) => setEmployeeForm((p) => ({ ...p, employeeCode: e.target.value }))} />
            <input placeholder="Họ tên" value={employeeForm.fullName} onChange={(e) => setEmployeeForm((p) => ({ ...p, fullName: e.target.value }))} />
            <input placeholder="Cấp bậc" value={employeeForm.rank} onChange={(e) => setEmployeeForm((p) => ({ ...p, rank: e.target.value }))} />
            <input placeholder="Chức danh" value={employeeForm.position} onChange={(e) => setEmployeeForm((p) => ({ ...p, position: e.target.value }))} />
            <input placeholder="Đơn vị" value={employeeForm.department} onChange={(e) => setEmployeeForm((p) => ({ ...p, department: e.target.value }))} />
            <textarea placeholder="Ghi chú" value={employeeForm.notes} onChange={(e) => setEmployeeForm((p) => ({ ...p, notes: e.target.value }))} />
            <button type="submit">Thêm nhân viên</button>
          </form>
          <DataTable
            rows={employees}
            columns={[
              { key: 'employeeCode', label: 'Mã' },
              { key: 'fullName', label: 'Họ tên' },
              { key: 'position', label: 'Chức danh' },
              { key: 'department', label: 'Đơn vị' },
              { key: 'results', label: 'Lịch sử', render: (row) => row.results?.length || 0 },
              { key: 'actions', label: 'Thao tác', render: (row) => <button className="danger small" onClick={() => deleteEmployee(row.id)}>Xóa</button> },
            ]}
          />
        </SectionCard>
      </div>

      <div className="grid-2">
        <SectionCard title="Bộ tiêu lệnh" subtitle="Có thể gắn theo nhân viên hoặc chức danh để mở rộng sau này.">
          <form className="form-grid" onSubmit={saveCommand}>
            <input placeholder="Tên bộ tiêu lệnh" value={commandForm.title} onChange={(e) => setCommandForm((p) => ({ ...p, title: e.target.value }))} />
            <input placeholder="Chức danh áp dụng" value={commandForm.position} onChange={(e) => setCommandForm((p) => ({ ...p, position: e.target.value }))} />
            <select value={commandForm.employeeId} onChange={(e) => setCommandForm((p) => ({ ...p, employeeId: e.target.value }))}>
              <option value="">Không gắn riêng cho nhân viên</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
            </select>
            <textarea placeholder="Mô tả" value={commandForm.description} onChange={(e) => setCommandForm((p) => ({ ...p, description: e.target.value }))} />
            {commandForm.items.map((item, index) => (
              <input
                key={index}
                placeholder={`Tiêu lệnh ${index + 1}`}
                value={item}
                onChange={(e) => setCommandForm((prev) => ({
                  ...prev,
                  items: prev.items.map((current, itemIndex) => (itemIndex === index ? e.target.value : current)),
                }))}
              />
            ))}
            <div className="inline-actions">
              <button type="button" className="secondary" onClick={() => setCommandForm((p) => ({ ...p, items: [...p.items, ''] }))}>+ Thêm dòng</button>
              <button type="submit">Lưu bộ tiêu lệnh</button>
            </div>
          </form>
          <DataTable
            rows={commands}
            columns={[
              { key: 'title', label: 'Tên bộ' },
              { key: 'position', label: 'Chức danh' },
              { key: 'employee', label: 'Nhân viên', render: (row) => row.employee?.fullName || 'Dùng chung' },
              { key: 'items', label: 'Số câu lệnh', render: (row) => row.items?.length || 0 },
            ]}
          />
        </SectionCard>

        <SectionCard title="Điều hành kiểm tra" subtitle="Quay số ngẫu nhiên hoặc chọn thủ công, sau đó chốt kết quả realtime.">
          <form className="form-grid" onSubmit={startSession}>
            <input placeholder="Tên phiên kiểm tra" value={sessionForm.sessionName} onChange={(e) => setSessionForm((p) => ({ ...p, sessionName: e.target.value }))} />
            <select value={sessionForm.mode} onChange={(e) => setSessionForm((p) => ({ ...p, mode: e.target.value }))}>
              <option value="random">Ngẫu nhiên</option>
              <option value="manual">Chọn thủ công</option>
            </select>
            <select value={sessionForm.employeeId} onChange={(e) => setSessionForm((p) => ({ ...p, employeeId: e.target.value }))}>
              <option value="">Chọn nhân viên</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
            </select>
            <select value={sessionForm.commandSetId} onChange={(e) => setSessionForm((p) => ({ ...p, commandSetId: e.target.value }))}>
              <option value="">Chọn bộ tiêu lệnh</option>
              {commands.map((command) => <option key={command.id} value={command.id}>{command.title}</option>)}
            </select>
            <button type="submit">Bắt đầu phiên</button>
          </form>

          <form className="form-grid result-form" onSubmit={finalizeResult}>
            <select value={resultForm.employeeId} onChange={(e) => setResultForm((p) => ({ ...p, employeeId: e.target.value }))}>
              <option value="">Chọn nhân viên</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
            </select>
            <select value={resultForm.commandSetId} onChange={(e) => setResultForm((p) => ({ ...p, commandSetId: e.target.value }))}>
              <option value="">Chọn bộ tiêu lệnh</option>
              {commands.map((command) => <option key={command.id} value={command.id}>{command.title}</option>)}
            </select>
            <input type="number" min="0" max="100" value={resultForm.score} onChange={(e) => setResultForm((p) => ({ ...p, score: e.target.value }))} />
            <select value={resultForm.resultStatus} onChange={(e) => setResultForm((p) => ({ ...p, resultStatus: e.target.value }))}>
              <option value="PASSED">Đạt</option>
              <option value="FAILED">Chưa đạt</option>
              <option value="PENDING">Chờ đánh giá</option>
            </select>
            <textarea placeholder="Nhận xét đánh giá" value={resultForm.evaluatorNote} onChange={(e) => setResultForm((p) => ({ ...p, evaluatorNote: e.target.value }))} />
            <button type="submit">Chốt kết quả</button>
          </form>

          <DataTable
            rows={sessions}
            columns={[
              { key: 'sessionName', label: 'Phiên' },
              { key: 'mode', label: 'Chế độ' },
              { key: 'status', label: 'Trạng thái' },
              { key: 'createdAt', label: 'Tạo lúc', render: (row) => new Date(row.createdAt).toLocaleString('vi-VN') },
              { key: 'results', label: 'Kết quả', render: (row) => row.results?.length || 0 },
            ]}
          />
        </SectionCard>
      </div>

      <SectionCard title="Import / Export" subtitle="Hỗ trợ JSON hoặc Excel để chuyển đổi dữ liệu cũ từ bản localStorage sang server/database.">
        <div className="inline-actions">
          <button className="secondary" onClick={exportJson}>Export JSON</button>
          <button className="secondary" onClick={exportExcel}>Export Excel</button>
          <label className="file-input-label">
            Import JSON/Excel
            <input type="file" accept=".json,.xlsx" onChange={importFile} />
          </label>
        </div>
      </SectionCard>
    </div>
  );
}

function downloadFile(filename, content, mimeType) {
  downloadBlob(filename, new Blob([content], { type: mimeType }));
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
