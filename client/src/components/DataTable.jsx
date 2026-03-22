export function DataTable({ rows = [], columns = [] }) {
  if (!rows.length) {
    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>{columns.map((col) => <th key={col.key}>{col.label}</th>)}</tr>
          </thead>
          <tbody>
            <tr>
              <td className="empty-cell" colSpan={columns.length}>
                Chưa có dữ liệu
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map((col) => <th key={col.key}>{col.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i}>
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render ? col.render(row) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
