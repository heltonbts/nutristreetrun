// Mini phone shell — used inside design canvas artboards.
// Same content as the iOS frame but smaller chrome and no glass nav bar.

function MiniPhone({ children, label, flowId, screen, w = 320, h = 680 }) {
  return (
    <div style={{
      width: w, height: h,
      background: NSR.bg,
      borderRadius: 36,
      overflow: 'hidden',
      position: 'relative',
      boxShadow: '0 0 0 8px #1a1a1a, 0 0 0 9px rgba(255,255,255,0.06), 0 30px 60px rgba(0,0,0,0.4)',
      fontFamily: NSR.body,
      color: NSR.text,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* dynamic island */}
      <div style={{
        position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
        width: 96, height: 28, borderRadius: 18, background: '#000', zIndex: 50,
      }} />
      {/* status bar */}
      <div style={{
        height: 44, padding: '0 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>9:41</span>
        <div style={{ width: 40 }} />
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <svg width="14" height="9" viewBox="0 0 14 9"><rect x="0" y="6" width="2.5" height="3" rx="0.5" fill="#fff"/><rect x="3.5" y="4" width="2.5" height="5" rx="0.5" fill="#fff"/><rect x="7" y="2" width="2.5" height="7" rx="0.5" fill="#fff"/><rect x="10.5" y="0" width="2.5" height="9" rx="0.5" fill="#fff"/></svg>
          <svg width="20" height="9" viewBox="0 0 20 10"><rect x="0.5" y="0.5" width="17" height="9" rx="2.5" stroke="#fff" strokeOpacity="0.5" fill="none"/><rect x="2" y="2" width="14" height="6" rx="1.5" fill="#fff"/></svg>
        </div>
      </div>
      {/* content */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {children}
      </div>
      {/* mini bottom nav */}
      <div style={{
        background: 'rgba(10,10,10,0.92)',
        borderTop: `1px solid ${NSR.line}`,
        padding: '8px 8px 18px',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        flexShrink: 0,
      }}>
        {['home', 'rank', 'feed', 'runs', 'profile'].map(id => {
          const active = id === screen;
          return (
            <div key={id} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              color: active ? 'var(--nsr-brand)' : NSR.textMute, padding: '4px 2px',
            }}>
              {NAV_ICONS[id](active)}
              <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                {({ home: 'Home', rank: 'Rank', feed: 'Feed', runs: 'Runs', profile: 'Perfil' })[id]}
              </span>
            </div>
          );
        })}
      </div>
      {/* home indicator */}
      <div style={{
        position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)',
        width: 110, height: 4, borderRadius: 100, background: 'rgba(255,255,255,0.4)', zIndex: 60,
      }} />
    </div>
  );
}

// Variant of RankingScreen that accepts a forced tab (so we can show all 3)
function RankingForced({ data, tab }) {
  const tabs = [
    { id: 'city', label: 'Cidade' },
    { id: 'state', label: 'Estado' },
    { id: 'club', label: 'Assessorias' },
  ];
  const list = tab === 'city' ? data.rankCity : tab === 'state' ? data.rankState : data.rankClubs;

  return (
    <div style={{ background: NSR.bg, minHeight: '100%' }}>
      <div style={{ padding: '20px 20px 16px' }}>
        <div style={{ fontFamily: NSR.body, fontSize: 11, fontWeight: 700, color: 'var(--nsr-brand)', letterSpacing: 2 }}>
          {data.challenge.monthLabel}
        </div>
        <div style={{ fontFamily: NSR.display, fontSize: 44, color: NSR.text, lineHeight: 0.95, letterSpacing: 0.5, marginTop: 4 }}>
          RANKING
        </div>
      </div>
      <div style={{ display: 'flex', padding: '0 20px', gap: 4, marginBottom: 16, borderBottom: `1px solid ${NSR.line}` }}>
        {tabs.map(t => {
          const active = t.id === tab;
          return (
            <div key={t.id} style={{
              padding: '10px 12px', position: 'relative',
              fontFamily: NSR.body, fontSize: 13, fontWeight: 700,
              color: active ? NSR.text : NSR.textMute, letterSpacing: 0.4,
            }}>
              {t.label}
              {active && (<div style={{ position: 'absolute', bottom: -1, left: 12, right: 12, height: 2, background: 'var(--nsr-brand)' }} />)}
            </div>
          );
        })}
      </div>
      <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.map(item => (
          tab === 'club' ? <ClubRankRow key={item.pos} item={item} /> : <RunnerRankRow key={item.pos} item={item} />
        ))}
      </div>
    </div>
  );
}

// Subscribe wrapper that doesn't depend on profile state
function SubscribeStandalone({ data }) {
  return <SubscribeScreen data={data} onBack={() => {}} />;
}

Object.assign(window, { MiniPhone, RankingForced, SubscribeStandalone });
