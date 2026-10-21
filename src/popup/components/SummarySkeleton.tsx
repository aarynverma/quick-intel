export default function SummarySkeleton() {
  return (
    <div className="qi-result" style={{ marginTop: 16 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px', borderBottom: '1px solid var(--qi-border)',
      }}>
        <div className="qi-shimmer" style={{ width: 56, height: 22, borderRadius: 999 }} />
        <div className="qi-shimmer" style={{ width: 80, height: 10, borderRadius: 4 }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px 0' }}>
        <div className="qi-shimmer" style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0 }} />
        <div className="qi-shimmer" style={{ flex: 1, height: 11, borderRadius: 4 }} />
      </div>
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div className="qi-shimmer" style={{ width: '90%', height: 13 }} />
        <div className="qi-shimmer" style={{ width: '100%', height: 13 }} />
        <div className="qi-shimmer" style={{ width: '100%', height: 13 }} />
        <div className="qi-shimmer" style={{ width: '75%', height: 13 }} />
        <div className="qi-shimmer" style={{ width: '60%', height: 13 }} />
      </div>
      <div style={{
        display: 'flex', gap: 6, padding: '8px 10px',
        borderTop: '1px solid var(--qi-border)',
        background: 'var(--qi-s2)',
      }}>
        <div className="qi-shimmer" style={{ width: 60, height: 28, borderRadius: 8 }} />
        <div className="qi-shimmer" style={{ width: 60, height: 28, borderRadius: 8 }} />
      </div>
    </div>
  );
}
