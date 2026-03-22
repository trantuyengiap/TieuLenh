export function SectionCard({ title, subtitle, children }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}
