import { useState } from "react";

export default function Sidebar({ nav, cur, go, user, logout }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button className="menu-btn" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? '✕' : '☰'}
      </button>
      
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sb-hd">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 42, height: 42, borderRadius: 11, background: 'linear-gradient(135deg,#2563EB,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21, flexShrink: 0 }}>🎓</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>أكاديمية النور</div>
              <div style={{ fontSize: 10, color: 'var(--mu)', marginTop: 1 }}>منصة التعليم المتكاملة</div>
            </div>
          </div>
          <div style={{ marginTop: 12, padding: '9px 12px', background: 'var(--bg)', borderRadius: 9, border: '1px solid var(--bd)' }}>
            <div style={{ fontSize: 11, color: 'var(--mu)' }}>مرحباً</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
          </div>
        </div>
        <div className="sb-nav">
          {nav.map(item => 
            item.divider ? (
              <div key={item.id} style={{ height: 1, background: 'var(--bd)', margin: '5px 0' }}></div>
            ) : (
              <div key={item.id} className={`ni ${cur === item.id ? 'ac' : ''}`} onClick={() => { go(item.id); setIsOpen(false); }}>
                <span className="ni-ic">{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge > 0 && <span style={{ background: 'var(--er)', color: '#fff', borderRadius: 50, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{item.badge}</span>}
              </div>
            )
          )}
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--bd)' }}>
          <button className="btn bgh wf" onClick={logout} style={{ color: 'var(--er)', fontWeight: 700, fontSize: 13 }}>🚪 تسجيل الخروج</button>
        </div>
      </div>
    </>
  );
}