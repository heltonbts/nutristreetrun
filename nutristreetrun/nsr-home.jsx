// NutriStreet Run — Home screen (3 variations)

// ────────────────────────────────────────────────
// HOME variation A — Editorial banner with medal hero
// ────────────────────────────────────────────────
function HomeBannerHero({ data }) {
  const { challenge, recent, user, rankCity } = data;
  const pct = (challenge.doneKm / challenge.goalKm) * 100;
  const myRank = rankCity.find(r => r.isMe);

  return (
    <div style={{ background: NSR.bg, paddingBottom: 24 }}>
      {/* HERO BANNER — full bleed, editorial */}
      <div style={{
        position: 'relative', padding: '20px 20px 28px',
        background: 'radial-gradient(120% 80% at 80% 0%, rgba(95,184,168,0.22) 0%, transparent 55%), #0E1110',
        borderBottom: `1px solid ${NSR.line}`,
      }}>
        {/* sync chip */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <NSRPill color="ghost" size="sm">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: NSR.success, display: 'inline-block', marginRight: 4 }} />
            STRAVA · HEALTH SYNC
          </NSRPill>
          <div style={{ fontFamily: NSR.body, fontSize: 11, fontWeight: 700, color: NSR.textMute, letterSpacing: 1.4 }}>
            {challenge.monthLabel}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: NSR.body, fontSize: 11, fontWeight: 700,
              color: 'var(--nsr-brand)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6,
            }}>Desafio ativo</div>
            <div style={{
              fontFamily: NSR.display, fontSize: 56, lineHeight: 0.88,
              color: NSR.text, letterSpacing: 1,
            }}>{challenge.title}</div>
            <div style={{
              fontFamily: NSR.body, fontSize: 13, color: NSR.textDim,
              marginTop: 8, lineHeight: 1.4,
            }}>{challenge.subtitle}</div>
          </div>
          <NSRMedal size={92} label="60K" state="progress" />
        </div>

        {/* progress block */}
        <div style={{ marginTop: 24 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: NSR.display, fontSize: 38, color: NSR.text, lineHeight: 1 }}>
                {challenge.doneKm.toFixed(1)}
              </span>
              <span style={{ fontFamily: NSR.body, fontSize: 14, color: NSR.textDim }}>
                / {challenge.goalKm} km
              </span>
            </div>
            <div style={{ fontFamily: NSR.body, fontSize: 12, fontWeight: 700, color: 'var(--nsr-brand)', letterSpacing: 1 }}>
              {Math.round(pct)}% COMPLETO
            </div>
          </div>
          <NSRBar pct={pct} height={8} />
          <div style={{
            display: 'flex', justifyContent: 'space-between', marginTop: 12,
            fontFamily: NSR.body, fontSize: 12, color: NSR.textDim,
          }}>
            <span>Faltam <b style={{ color: NSR.text }}>{(challenge.goalKm - challenge.doneKm).toFixed(1)} km</b></span>
            <span><b style={{ color: NSR.text }}>{challenge.daysLeft} dias</b> restantes</span>
          </div>
        </div>
      </div>

      {/* RANKING TEASER */}
      <div style={{ padding: '24px 0 8px' }}>
        <NSRSection kicker="Sua posição" title="RANKING SP" action="Ver tudo →" />
        <div style={{
          margin: '0 20px', padding: 16, borderRadius: 14,
          background: NSR.card, border: `1px solid ${NSR.line}`,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            fontFamily: NSR.display, fontSize: 44, color: 'var(--nsr-brand)',
            lineHeight: 1, minWidth: 56, textAlign: 'center',
          }}>#{myRank.pos}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: NSR.body, fontSize: 14, fontWeight: 700, color: NSR.text }}>
              Você está em {myRank.pos}º na sua cidade
            </div>
            <div style={{ fontFamily: NSR.body, fontSize: 12, color: NSR.textDim, marginTop: 2 }}>
              {(rankCity[myRank.pos - 2].km - myRank.km).toFixed(1)} km para o {myRank.pos - 1}º lugar
            </div>
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITIES */}
      <div style={{ padding: '20px 0 0' }}>
        <NSRSection kicker="Última semana" title="ATIVIDADES" action="Ver corridas →" />
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recent.slice(0, 3).map(act => (
            <ActivityRow key={act.id} act={act} compact />
          ))}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// HOME variation B — Big number focus
// ────────────────────────────────────────────────
function HomeBigNumber({ data }) {
  const { challenge, recent, rankCity } = data;
  const remaining = challenge.goalKm - challenge.doneKm;
  const pct = (challenge.doneKm / challenge.goalKm) * 100;
  const myRank = rankCity.find(r => r.isMe);

  return (
    <div style={{ background: NSR.bg, paddingBottom: 24 }}>
      {/* HERO — number-driven */}
      <div style={{
        padding: '24px 20px 32px',
        background: NSR.bg,
        borderBottom: `1px solid ${NSR.line}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <NSRPill color="brand" size="sm">DESAFIO ATIVO · {challenge.monthLabel}</NSRPill>
          <span style={{ fontFamily: NSR.body, fontSize: 11, fontWeight: 700, color: NSR.success, letterSpacing: 1.2 }}>
            ● SYNC OK
          </span>
        </div>

        <div style={{
          fontFamily: NSR.body, fontSize: 12, fontWeight: 700,
          color: NSR.textMute, letterSpacing: 2, textTransform: 'uppercase',
        }}>Faltam para a medalha</div>
        <div style={{
          fontFamily: NSR.display, fontSize: 168, lineHeight: 0.85,
          color: NSR.text, letterSpacing: -1, marginTop: 4,
        }}>
          {remaining.toFixed(1).split('.')[0]}
          <span style={{ color: 'var(--nsr-brand)' }}>.{remaining.toFixed(1).split('.')[1]}</span>
        </div>
        <div style={{
          fontFamily: NSR.display, fontSize: 28, color: NSR.textDim,
          letterSpacing: 1, marginTop: -4,
        }}>QUILÔMETROS</div>

        <div style={{ marginTop: 28 }}>
          <NSRBar pct={pct} height={4} />
          <div style={{
            display: 'flex', justifyContent: 'space-between', marginTop: 12,
            fontFamily: NSR.body, fontSize: 12,
          }}>
            <span style={{ color: NSR.textDim }}>
              <b style={{ color: NSR.text }}>{challenge.doneKm.toFixed(1)}</b> de {challenge.goalKm} km
            </span>
            <span style={{ color: NSR.textDim }}>
              <b style={{ color: 'var(--nsr-brand)' }}>{challenge.daysLeft} dias</b> restantes
            </span>
          </div>
        </div>
      </div>

      {/* QUICK STATS GRID */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1,
        background: NSR.line, borderBottom: `1px solid ${NSR.line}`,
      }}>
        <div style={{ background: NSR.bg, padding: '20px' }}>
          <NSRStat value={`#${myRank.pos}`} label="Cidade · SP" />
        </div>
        <div style={{ background: NSR.bg, padding: '20px' }}>
          <NSRStat value="5'24″" label="Pace médio" />
        </div>
      </div>

      {/* RECENT */}
      <div style={{ padding: '24px 0 0' }}>
        <NSRSection kicker="Última semana" title="ATIVIDADES" action="Ver tudo →" />
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recent.slice(0, 3).map(act => (
            <ActivityRow key={act.id} act={act} compact />
          ))}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// HOME variation C — Ring progress (Apple Watch-ish)
// ────────────────────────────────────────────────
function HomeRing({ data }) {
  const { challenge, recent, rankCity } = data;
  const pct = (challenge.doneKm / challenge.goalKm) * 100;
  const myRank = rankCity.find(r => r.isMe);

  // ring math
  const r = 96, c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;

  return (
    <div style={{ background: NSR.bg, paddingBottom: 24 }}>
      <div style={{
        padding: '20px 20px 32px',
        background: 'linear-gradient(180deg, rgba(95,184,168,0.06) 0%, transparent 60%), #0E1110',
        borderBottom: `1px solid ${NSR.line}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <div style={{ fontFamily: NSR.body, fontSize: 11, fontWeight: 700, color: 'var(--nsr-brand)', letterSpacing: 2 }}>
              {challenge.monthLabel}
            </div>
            <div style={{ fontFamily: NSR.display, fontSize: 32, color: NSR.text, marginTop: 2, letterSpacing: 0.5 }}>
              {challenge.title}
            </div>
          </div>
          <NSRPill color="ghost" size="sm">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: NSR.success, display: 'inline-block', marginRight: 4 }} />
            SYNC
          </NSRPill>
        </div>

        {/* RING */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0 12px' }}>
          <div style={{ position: 'relative', width: 240, height: 240 }}>
            <svg width="240" height="240" viewBox="0 0 240 240" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="120" cy="120" r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="14" fill="none"/>
              <circle cx="120" cy="120" r={r} stroke="var(--nsr-brand)" strokeWidth="14" fill="none"
                strokeLinecap="round" strokeDasharray={`${dash} ${c}`}
                style={{ transition: 'stroke-dasharray 1s cubic-bezier(.2,.8,.2,1)' }}/>
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ fontFamily: NSR.body, fontSize: 11, fontWeight: 700, color: NSR.textMute, letterSpacing: 1.6 }}>
                COMPLETO
              </div>
              <div style={{ fontFamily: NSR.display, fontSize: 84, lineHeight: 0.85, color: NSR.text, letterSpacing: 0 }}>
                {Math.round(pct)}<span style={{ fontSize: 36, color: 'var(--nsr-brand)' }}>%</span>
              </div>
              <div style={{ fontFamily: NSR.body, fontSize: 13, color: NSR.textDim, marginTop: 4 }}>
                {challenge.doneKm.toFixed(1)} / {challenge.goalKm} km
              </div>
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12,
          padding: '8px 4px 0',
        }}>
          <NSRStat value={(challenge.goalKm - challenge.doneKm).toFixed(1)} unit="km" label="Restante" />
          <NSRStat value={challenge.daysLeft} unit="d" label="Restam" align="left" />
          <NSRStat value={`#${myRank.pos}`} label="SP" align="left" />
        </div>
      </div>

      <div style={{ padding: '24px 0 0' }}>
        <NSRSection kicker="Última semana" title="ATIVIDADES" action="Ver tudo →" />
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recent.slice(0, 3).map(act => (
            <ActivityRow key={act.id} act={act} compact />
          ))}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// Activity row — shared
// ────────────────────────────────────────────────
function ActivityRow({ act, compact = false }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: compact ? '10px 12px' : '14px 14px',
      background: NSR.card, border: `1px solid ${NSR.line}`,
      borderRadius: 12,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: act.counts ? 'rgba(95,184,168,0.12)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${act.counts ? 'rgba(95,184,168,0.28)' : NSR.line}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
          <circle cx="14.5" cy="3.5" r="2" stroke={act.counts ? 'var(--nsr-brand)' : NSR.textMute} strokeWidth="1.8"/>
          <path d="M5 18l3-3 2-3 3 1 3 5M9 11l-2-3-3 2M13 13l3-2"
            stroke={act.counts ? 'var(--nsr-brand)' : NSR.textMute} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: NSR.body, fontSize: 13, fontWeight: 600, color: NSR.text,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{act.title}</div>
        <div style={{ fontFamily: NSR.body, fontSize: 11, color: NSR.textMute, marginTop: 2 }}>
          {act.date} · {act.source}
          {!act.counts && <span style={{ color: NSR.danger, marginLeft: 6 }}>· {act.reason}</span>}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: NSR.display, fontSize: 22, color: NSR.text, lineHeight: 1, letterSpacing: 0.4, whiteSpace: 'nowrap' }}>
          {act.km.toFixed(1)}<span style={{ fontSize: 11, color: NSR.textDim, fontFamily: NSR.body, fontWeight: 500 }}>&nbsp;km</span>
        </div>
        {act.counts ? (
          <div style={{ fontFamily: NSR.body, fontSize: 9, fontWeight: 700, color: 'var(--nsr-brand)', letterSpacing: 0.8, marginTop: 3 }}>
            ✓ CONTA
          </div>
        ) : (
          <div style={{ fontFamily: NSR.body, fontSize: 9, fontWeight: 700, color: NSR.textMute, letterSpacing: 0.8, marginTop: 3 }}>
            NÃO CONTA
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { HomeBannerHero, HomeBigNumber, HomeRing, ActivityRow });
