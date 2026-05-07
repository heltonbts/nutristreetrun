// NutriStreet Run — Design tokens & shared atoms
// Loaded after React, before screens.

const NSR = {
  // colors — gray base + sea-foam green accent
  bg: '#0E1110',
  bgElev: '#161A19',
  card: '#1C2120',
  cardHi: '#262C2A',
  line: 'rgba(220,232,228,0.08)',
  lineHi: 'rgba(220,232,228,0.16)',
  text: '#ECEFEE',
  textDim: 'rgba(236,239,238,0.62)',
  textMute: 'rgba(236,239,238,0.42)',
  // brand
  brand: '#5FB8A8',  // overridden by tweak — sea-foam / verde água
  brandInk: '#0A0F0E',
  success: '#3DDC84',
  danger: '#FF6B6B',
  // type
  display: '"Bebas Neue", "Oswald", "Impact", system-ui, sans-serif',
  body: '"Inter", -apple-system, system-ui, sans-serif',
  mono: '"JetBrains Mono", "SF Mono", ui-monospace, monospace',
};

// Apply brand color override
window.__setBrand = (hex) => {
  document.documentElement.style.setProperty('--nsr-brand', hex);
  NSR.brand = hex;
};

// ────────────────────────────────────────────────
// Avatar — initials on a deterministic gradient
// ────────────────────────────────────────────────
function NSRAvatar({ initials, size = 40, isMe = false }) {
  // hash initials → hue
  const hue = [...(initials || 'XX')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const bg = isMe
    ? 'var(--nsr-brand)'
    : `linear-gradient(135deg, hsl(${hue} 35% 24%) 0%, hsl(${(hue + 40) % 360} 30% 14%) 100%)`;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: isMe ? '#0A0A0A' : '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: NSR.body, fontWeight: 700, fontSize: size * 0.36,
      letterSpacing: 0.5, flexShrink: 0,
      border: isMe ? 'none' : '1px solid rgba(255,255,255,0.08)',
    }}>{initials}</div>
  );
}

// ────────────────────────────────────────────────
// Stat block — big number + label
// ────────────────────────────────────────────────
function NSRStat({ value, unit, label, align = 'left' }) {
  return (
    <div style={{ textAlign: align }}>
      <div style={{
        fontFamily: NSR.display, fontSize: 42, lineHeight: 0.95,
        color: NSR.text, letterSpacing: 0.5,
        display: 'flex', alignItems: 'baseline', gap: 4,
        justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
        whiteSpace: 'nowrap',
      }}>
        {value}
        {unit && <span style={{ fontSize: 16, color: NSR.textDim, fontFamily: NSR.body, fontWeight: 500 }}>{unit}</span>}
      </div>
      <div style={{
        fontFamily: NSR.body, fontSize: 11, fontWeight: 600,
        color: NSR.textMute, textTransform: 'uppercase',
        letterSpacing: 1.4, marginTop: 6,
      }}>{label}</div>
    </div>
  );
}

// ────────────────────────────────────────────────
// Progress bar
// ────────────────────────────────────────────────
function NSRBar({ pct, height = 6, showPct = false }) {
  const p = Math.min(100, Math.max(0, pct));
  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        height, background: 'rgba(255,255,255,0.08)', borderRadius: 999,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${p}%`,
          background: 'var(--nsr-brand)', borderRadius: 999,
          transition: 'width .6s cubic-bezier(.2,.8,.2,1)',
        }} />
      </div>
      {showPct && (
        <div style={{
          position: 'absolute', right: 0, top: -22,
          fontFamily: NSR.body, fontSize: 12, fontWeight: 700,
          color: NSR.text,
        }}>{Math.round(p)}%</div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────
// Section header (editorial small-caps)
// ────────────────────────────────────────────────
function NSRSection({ kicker, title, action }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      padding: '0 20px', marginBottom: 14,
    }}>
      <div>
        {kicker && (
          <div style={{
            fontFamily: NSR.body, fontSize: 11, fontWeight: 700,
            color: 'var(--nsr-brand)', textTransform: 'uppercase',
            letterSpacing: 1.6, marginBottom: 6,
          }}>{kicker}</div>
        )}
        <div style={{
          fontFamily: NSR.display, fontSize: 26, lineHeight: 1,
          color: NSR.text, letterSpacing: 0.5,
        }}>{title}</div>
      </div>
      {action && (
        <div style={{
          fontFamily: NSR.body, fontSize: 12, fontWeight: 600,
          color: NSR.textDim, letterSpacing: 0.4,
        }}>{action}</div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────
// Medal placeholder — geometric, no real assets
// ────────────────────────────────────────────────
function NSRMedal({ size = 96, label = '60K', state = 'progress' }) {
  const ring = state === 'shipped' || state === 'delivered' ? 'var(--nsr-brand)' : 'rgba(255,255,255,0.18)';
  const fill = state === 'delivered' ? 'var(--nsr-brand)' : state === 'shipped' ? 'rgba(244,98,10,0.18)' : 'rgba(255,255,255,0.04)';
  const ink = state === 'delivered' ? '#0A0A0A' : NSR.text;
  const dim = state === 'missed';
  return (
    <div style={{
      width: size, height: size, position: 'relative',
      opacity: dim ? 0.35 : 1, filter: dim ? 'grayscale(1)' : 'none',
    }}>
      {/* outer hex via clip */}
      <div style={{
        position: 'absolute', inset: 0,
        clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
        background: ring,
      }} />
      <div style={{
        position: 'absolute', inset: 4,
        clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
        background: fill,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: NSR.display, fontSize: size * 0.32, lineHeight: 0.85,
          color: ink, letterSpacing: 0.5,
        }}>{label}</div>
        <div style={{
          fontFamily: NSR.body, fontSize: size * 0.085, fontWeight: 700,
          color: ink, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1.2,
          marginTop: 4,
        }}>NSR</div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// Pill / chip
// ────────────────────────────────────────────────
function NSRPill({ children, color = 'neutral', size = 'md' }) {
  const styles = {
    neutral: { bg: 'rgba(255,255,255,0.08)', fg: NSR.text },
    brand: { bg: 'var(--nsr-brand)', fg: '#0A0A0A' },
    success: { bg: 'rgba(61,220,132,0.14)', fg: NSR.success },
    danger: { bg: 'rgba(255,59,48,0.14)', fg: NSR.danger },
    ghost: { bg: 'transparent', fg: NSR.textDim, br: '1px solid rgba(255,255,255,0.18)' },
  }[color];
  const pad = size === 'sm' ? '4px 8px' : '6px 10px';
  const fs = size === 'sm' ? 10 : 11;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: pad, borderRadius: 999,
      background: styles.bg, color: styles.fg, border: styles.br || 'none',
      fontFamily: NSR.body, fontSize: fs, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: 0.8,
    }}>{children}</span>
  );
}

// ────────────────────────────────────────────────
// Bottom nav (5 icons)
// ────────────────────────────────────────────────
const NAV_ICONS = {
  home: (active) => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 9.5L11 3l8 6.5V19a1 1 0 0 1-1 1h-4v-6h-6v6H4a1 1 0 0 1-1-1V9.5Z"
        stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} strokeLinejoin="round"
        fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.18 : 0}/>
    </svg>
  ),
  rank: (active) => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="11" width="4.5" height="8" rx="1" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.18 : 0}/>
      <rect x="8.75" y="6" width="4.5" height="13" rx="1" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.18 : 0}/>
      <rect x="14.5" y="2" width="4.5" height="17" rx="1" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.18 : 0}/>
    </svg>
  ),
  feed: (active) => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="7.5" cy="8" r="3" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.18 : 0}/>
      <circle cx="15" cy="6" r="2.2" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.18 : 0}/>
      <path d="M2 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M12.5 14c0-2 2-3.5 4-3.5s3.5 1.5 3.5 3.5" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} strokeLinecap="round"/>
    </svg>
  ),
  runs: (active) => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="14.5" cy="3.5" r="2" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.18 : 0}/>
      <path d="M5 18l3-3 2-3 3 1 3 5M9 11l-2-3-3 2M13 13l3-2" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  medal: (active) => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M7 2h8l-2 6h-4L7 2Z" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} strokeLinejoin="round" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.18 : 0}/>
      <circle cx="11" cy="14" r="5.5" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.18 : 0}/>
    </svg>
  ),
  profile: (active) => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="7" r="3.5" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.18 : 0}/>
      <path d="M3.5 19c0-4 3.5-6.5 7.5-6.5s7.5 2.5 7.5 6.5" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} strokeLinecap="round" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.18 : 0}/>
    </svg>
  ),
};

function NSRBottomNav({ active, onChange, platform = 'ios' }) {
  const items = [
    { id: 'home', label: 'Home' },
    { id: 'rank', label: 'Ranking' },
    { id: 'feed', label: 'Feed' },
    { id: 'runs', label: 'Corridas' },
    { id: 'profile', label: 'Perfil' },
  ];
  const bottomPad = platform === 'ios' ? 28 : 12;
  return (
    <div style={{
      background: 'rgba(10,10,10,0.92)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      borderTop: `1px solid ${NSR.line}`,
      padding: `10px 8px ${bottomPad}px`,
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      flexShrink: 0,
    }}>
      {items.map(it => {
        const isActive = active === it.id;
        return (
          <button key={it.id} onClick={() => onChange(it.id)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            padding: '6px 4px', flex: 1,
            color: isActive ? 'var(--nsr-brand)' : NSR.textMute,
            transition: 'color .15s',
          }}>
            {NAV_ICONS[it.id](isActive)}
            <span style={{
              fontFamily: NSR.body, fontSize: 10, fontWeight: 700,
              letterSpacing: 0.6, textTransform: 'uppercase',
            }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

Object.assign(window, {
  NSR, NSRAvatar, NSRStat, NSRBar, NSRSection, NSRMedal, NSRPill, NSRBottomNav,
});
