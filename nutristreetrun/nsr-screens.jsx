// NutriStreet Run — Other screens

// ────────────────────────────────────────────────
// RANKING — 3 tabs
// ────────────────────────────────────────────────
function RankingScreen({ data }) {
  const [tab, setTab] = React.useState('city');
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

      {/* Tabs */}
      <div style={{
        display: 'flex', padding: '0 20px', gap: 4, marginBottom: 16,
        borderBottom: `1px solid ${NSR.line}`,
      }}>
        {tabs.map(t => {
          const active = t.id === tab;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 12px', position: 'relative',
              fontFamily: NSR.body, fontSize: 13, fontWeight: 700,
              color: active ? NSR.text : NSR.textMute,
              letterSpacing: 0.4,
            }}>
              {t.label}
              {active && (
                <div style={{
                  position: 'absolute', bottom: -1, left: 12, right: 12,
                  height: 2, background: 'var(--nsr-brand)',
                }} />
              )}
            </button>
          );
        })}
      </div>

      <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.map(item => (
          tab === 'club'
            ? <ClubRankRow key={item.pos} item={item} />
            : <RunnerRankRow key={item.pos} item={item} />
        ))}
      </div>
    </div>
  );
}

function RunnerRankRow({ item }) {
  const me = item.isMe;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', borderRadius: 12,
      background: me ? 'var(--nsr-brand)' : NSR.card,
      border: me ? 'none' : `1px solid ${NSR.line}`,
    }}>
      <div style={{
        fontFamily: NSR.display, fontSize: 28, lineHeight: 1, letterSpacing: 0.4,
        color: me ? '#0A0F0E' : (item.pos <= 3 ? 'var(--nsr-brand)' : NSR.textDim),
        minWidth: 38, textAlign: 'center',
      }}>{item.pos}</div>
      <NSRAvatar initials={item.initials} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: NSR.body, fontSize: 14, fontWeight: 700,
          color: me ? '#0A0F0E' : NSR.text,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{item.name}{me && ' · você'}</div>
        <div style={{
          fontFamily: NSR.body, fontSize: 11, color: me ? 'rgba(10,10,10,0.65)' : NSR.textMute,
          marginTop: 2,
        }}>{item.club}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{
          fontFamily: NSR.display, fontSize: 22, lineHeight: 1, letterSpacing: 0.4,
          color: me ? '#0A0F0E' : NSR.text, whiteSpace: 'nowrap',
        }}>
          {item.km.toFixed(1)}<span style={{ fontSize: 10, fontFamily: NSR.body, fontWeight: 500, opacity: 0.7 }}>&nbsp;km</span>
        </div>
      </div>
    </div>
  );
}

function ClubRankRow({ item }) {
  const me = item.isMe;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 14px', borderRadius: 12,
      background: me ? 'var(--nsr-brand)' : NSR.card,
      border: me ? 'none' : `1px solid ${NSR.line}`,
    }}>
      <div style={{
        fontFamily: NSR.display, fontSize: 28, lineHeight: 1,
        color: me ? '#0A0F0E' : (item.pos <= 3 ? 'var(--nsr-brand)' : NSR.textDim),
        minWidth: 38, textAlign: 'center',
      }}>{item.pos}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: NSR.display, fontSize: 18, color: me ? '#0A0F0E' : NSR.text,
          letterSpacing: 0.4, lineHeight: 1.1,
        }}>{item.name}{me && ' · sua'}</div>
        <div style={{
          fontFamily: NSR.body, fontSize: 11, color: me ? 'rgba(10,10,10,0.65)' : NSR.textMute,
          marginTop: 4, display: 'flex', gap: 10,
        }}>
          <span>{item.city}</span>
          <span>·</span>
          <span>{item.runners} corredores</span>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{
          fontFamily: NSR.display, fontSize: 22, lineHeight: 1,
          color: me ? '#0A0F0E' : NSR.text, whiteSpace: 'nowrap',
        }}>
          {item.km.toLocaleString('pt-BR')}<span style={{ fontSize: 10, fontFamily: NSR.body, fontWeight: 500, opacity: 0.7 }}>&nbsp;km</span>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// MINHAS CORRIDAS
// ────────────────────────────────────────────────
function RunsScreen({ data }) {
  const { challenge, recent } = data;
  const monthKm = recent.filter(r => r.counts).reduce((s, r) => s + r.km, 0);
  const monthAct = recent.filter(r => r.counts).length;
  const pct = (monthKm / challenge.goalKm) * 100;

  return (
    <div style={{ background: NSR.bg, minHeight: '100%' }}>
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ fontFamily: NSR.body, fontSize: 11, fontWeight: 700, color: 'var(--nsr-brand)', letterSpacing: 2 }}>
          {challenge.monthLabel}
        </div>
        <div style={{ fontFamily: NSR.display, fontSize: 44, color: NSR.text, lineHeight: 0.95, letterSpacing: 0.5, marginTop: 4 }}>
          MINHAS CORRIDAS
        </div>
      </div>

      {/* Stats grid */}
      <div style={{
        margin: '20px 20px 8px', padding: 20, borderRadius: 16,
        background: NSR.card, border: `1px solid ${NSR.line}`,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 16 }}>
          <NSRStat value={monthKm.toFixed(1)} unit="km" label="Total mês" />
          <NSRStat value={monthAct} label="Atividades válidas" />
          <NSRStat value="5'24″" label="Pace médio" />
          <NSRStat value={`${Math.round(pct)}%`} label="Da meta" />
        </div>
        <NSRBar pct={pct} height={6} />
      </div>

      {/* Sync banner */}
      <div style={{
        margin: '12px 20px 20px', padding: '12px 14px', borderRadius: 12,
        background: 'rgba(61,220,132,0.06)', border: '1px solid rgba(61,220,132,0.2)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: NSR.success }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: NSR.body, fontSize: 12, fontWeight: 700, color: NSR.text }}>
            Sincronizando com Strava + Apple Health
          </div>
          <div style={{ fontFamily: NSR.body, fontSize: 11, color: NSR.textMute, marginTop: 1 }}>
            Última sync: há 2 minutos
          </div>
        </div>
        <span style={{ fontFamily: NSR.body, fontSize: 11, fontWeight: 700, color: NSR.success, letterSpacing: 1 }}>OK</span>
      </div>

      <NSRSection kicker="Maio 2026" title="HISTÓRICO" />
      <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.recent.map(act => <ActivityRow key={act.id} act={act} />)}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// MEDALHAS
// ────────────────────────────────────────────────
function MedalsScreen({ data }) {
  const { medals, user } = data;
  const earned = medals.filter(m => m.status === 'shipped' || m.status === 'delivered').length;

  return (
    <div style={{ background: NSR.bg, minHeight: '100%' }}>
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ fontFamily: NSR.body, fontSize: 11, fontWeight: 700, color: 'var(--nsr-brand)', letterSpacing: 2 }}>
          Coleção · 2026
        </div>
        <div style={{ fontFamily: NSR.display, fontSize: 44, color: NSR.text, lineHeight: 0.95, letterSpacing: 0.5, marginTop: 4 }}>
          MEDALHAS
        </div>
        <div style={{ fontFamily: NSR.body, fontSize: 13, color: NSR.textDim, marginTop: 6 }}>
          <b style={{ color: NSR.text }}>{earned}</b> conquistadas · <b style={{ color: NSR.text }}>{medals.length - earned}</b> pendentes
        </div>
      </div>

      {/* Address card */}
      <div style={{
        margin: '20px 20px', padding: '14px 16px', borderRadius: 12,
        background: NSR.card, border: `1px solid ${NSR.line}`,
        display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'rgba(95,184,168,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1.5C5 1.5 2.5 4 2.5 7c0 4 5.5 7.5 5.5 7.5s5.5-3.5 5.5-7.5c0-3-2.5-5.5-5.5-5.5z"
              stroke="var(--nsr-brand)" strokeWidth="1.5"/>
            <circle cx="8" cy="7" r="2" stroke="var(--nsr-brand)" strokeWidth="1.5"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: NSR.body, fontSize: 11, fontWeight: 700, color: NSR.textMute, letterSpacing: 1.4 }}>
            ENDEREÇO DE ENTREGA
          </div>
          <div style={{ fontFamily: NSR.body, fontSize: 13, color: NSR.text, marginTop: 4, lineHeight: 1.4 }}>
            {user.address}
          </div>
        </div>
        <div style={{ fontFamily: NSR.body, fontSize: 12, fontWeight: 700, color: 'var(--nsr-brand)' }}>
          Editar
        </div>
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
        padding: '0 20px 24px',
      }}>
        {medals.map(m => <MedalCard key={m.id} m={m} />)}
      </div>
    </div>
  );
}

function MedalCard({ m }) {
  const statusMap = {
    progress: { text: 'EM ANDAMENTO', color: 'var(--nsr-brand)' },
    shipped: { text: 'ENVIADA', color: NSR.success },
    delivered: { text: 'RECEBIDA', color: NSR.success },
    missed: { text: 'NÃO RECEBIDA', color: NSR.textMute },
  }[m.status];
  const goalLabel = m.label.split('·')[1]?.trim() || '60K';

  return (
    <div style={{
      padding: 16, borderRadius: 14,
      background: NSR.card, border: `1px solid ${NSR.line}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
    }}>
      <NSRMedal size={84} label={goalLabel} state={m.status} />
      <div style={{ textAlign: 'center', width: '100%' }}>
        <div style={{ fontFamily: NSR.display, fontSize: 20, color: NSR.text, letterSpacing: 0.4, lineHeight: 1 }}>
          {m.month.toUpperCase()}
        </div>
        <div style={{ fontFamily: NSR.body, fontSize: 11, color: NSR.textDim, marginTop: 3, fontWeight: 600 }}>
          Meta {goalLabel}
        </div>
        <div style={{
          fontFamily: NSR.body, fontSize: 10, fontWeight: 700,
          color: statusMap.color, letterSpacing: 1.2, marginTop: 8,
        }}>{statusMap.text}</div>
      </div>
      {m.status === 'progress' && (
        <div style={{ width: '100%' }}>
          <NSRBar pct={(m.done / m.goal) * 100} height={3} />
          <div style={{ fontFamily: NSR.body, fontSize: 10, color: NSR.textMute, marginTop: 6, textAlign: 'center' }}>
            {m.done.toFixed(1)} / {m.goal} km
          </div>
        </div>
      )}
      {m.tracking && (
        <div style={{
          fontFamily: NSR.mono, fontSize: 9, color: NSR.textMute, letterSpacing: 0.4,
          padding: '4px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 6,
        }}>{m.tracking}</div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────
// PERFIL (com inscrição)
// ────────────────────────────────────────────────
function ProfileScreen({ data }) {
  const { user } = data;
  const [showSubscribe, setShowSubscribe] = React.useState(false);
  const [showMedals, setShowMedals] = React.useState(false);

  if (showSubscribe) return <SubscribeScreen data={data} onBack={() => setShowSubscribe(false)} />;
  if (showMedals) return (
    <div style={{ background: NSR.bg, minHeight: '100%' }}>
      <div style={{ padding: '16px 20px 0' }}>
        <button onClick={() => setShowMedals(false)} style={{
          background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer',
          width: 36, height: 36, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M9 1L3 7l6 6" stroke={NSR.text} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
      <MedalsScreen data={data} />
    </div>
  );

  return (
    <div style={{ background: NSR.bg, minHeight: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '24px 20px 28px',
        background: 'radial-gradient(120% 60% at 100% 0%, rgba(95,184,168,0.14) 0%, transparent 60%), #0E1110',
        borderBottom: `1px solid ${NSR.line}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <NSRAvatar initials={user.initials} size={68} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: NSR.display, fontSize: 28, color: NSR.text, lineHeight: 1, letterSpacing: 0.5 }}>
              {user.name.toUpperCase()}
            </div>
            <div style={{ fontFamily: NSR.body, fontSize: 12, color: NSR.textDim, marginTop: 6 }}>
              {user.city}
            </div>
            <div style={{ fontFamily: NSR.body, fontSize: 12, color: 'var(--nsr-brand)', fontWeight: 700, marginTop: 2 }}>
              {user.assessoria}
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ padding: '20px' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 14,
        }}>
          <div style={{ fontFamily: NSR.body, fontSize: 11, fontWeight: 700, color: NSR.textMute, letterSpacing: 1.6 }}>
            ESTATÍSTICAS · DESDE {user.plan.since.toUpperCase()}
          </div>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1,
          background: NSR.line, borderRadius: 14, overflow: 'hidden',
        }}>
          <div onClick={() => setShowMedals(true)} style={{ background: NSR.card, padding: 18, cursor: 'pointer', position: 'relative' }}>
            <NSRStat value={user.stats.totalMedals} label="Medalhas" />
            <svg width="10" height="10" viewBox="0 0 10 10" style={{ position: 'absolute', top: 14, right: 14 }}>
              <path d="M2 8l6-6M3 2h5v5" stroke="var(--nsr-brand)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ background: NSR.card, padding: 18 }}>
            <NSRStat value={user.stats.totalKm.toFixed(0)} unit="km" label="Total" />
          </div>
          <div style={{ background: NSR.card, padding: 18 }}>
            <NSRStat value={user.stats.monthsActive} label="Meses ativos" />
          </div>
          <div style={{ background: NSR.card, padding: 18 }}>
            <NSRStat value={user.stats.bestRank} label="Melhor rank" />
          </div>
        </div>

        {/* Big shortcut to medals */}
        <button onClick={() => setShowMedals(true)} style={{
          width: '100%', marginTop: 12, padding: '14px 16px',
          background: 'rgba(95,184,168,0.10)', border: '1px solid rgba(95,184,168,0.3)',
          borderRadius: 12, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--nsr-brand)', color: '#0A0F0E',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0,
          }}>🏅</div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontFamily: NSR.body, fontSize: 13, fontWeight: 700, color: NSR.text }}>
              Minhas medalhas
            </div>
            <div style={{ fontFamily: NSR.body, fontSize: 11, color: NSR.textDim, marginTop: 2 }}>
              {user.stats.totalMedals} conquistadas · ver vitrine
            </div>
          </div>
          <svg width="8" height="14" viewBox="0 0 8 14"><path d="M1 1l6 6-6 6" stroke="var(--nsr-brand)" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
        </button>
      </div>

      {/* Plan card */}
      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ fontFamily: NSR.body, fontSize: 11, fontWeight: 700, color: NSR.textMute, letterSpacing: 1.6, marginBottom: 14 }}>
          PLANO ATIVO
        </div>
        <div style={{
          padding: 18, borderRadius: 14,
          background: NSR.card, border: `1px solid ${NSR.lineHi}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: NSR.display, fontSize: 22, color: NSR.text, letterSpacing: 0.5 }}>
                {user.plan.name.toUpperCase()}
              </div>
              <div style={{ fontFamily: NSR.body, fontSize: 12, color: NSR.textDim, marginTop: 4 }}>
                Próxima cobrança: {user.plan.nextCharge}
              </div>
            </div>
            <NSRPill color="success" size="sm">ATIVO</NSRPill>
          </div>
          <div style={{
            marginTop: 14, paddingTop: 14, borderTop: `1px solid ${NSR.line}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ fontFamily: NSR.display, fontSize: 26, color: 'var(--nsr-brand)', letterSpacing: 0.4 }}>
              {user.plan.price.toUpperCase()}
            </div>
            <button onClick={() => setShowSubscribe(true)} style={{
              background: 'transparent', border: `1px solid ${NSR.lineHi}`,
              color: NSR.text, padding: '8px 14px', borderRadius: 999,
              fontFamily: NSR.body, fontSize: 12, fontWeight: 700, letterSpacing: 0.6,
              cursor: 'pointer',
            }}>VER BENEFÍCIOS</button>
          </div>
        </div>
      </div>

      {/* Settings list */}
      <div style={{ padding: '0 20px 24px' }}>
        {[
          ['Endereço de entrega', user.address.split(' — ')[0]],
          ['Conexões', 'Strava · Apple Health'],
          ['Notificações', 'Diárias'],
          ['Ajuda & suporte', null],
          ['Sair', null],
        ].map(([title, sub], i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center',
            padding: '14px 0',
            borderBottom: i < 4 ? `1px solid ${NSR.line}` : 'none',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: NSR.body, fontSize: 14, color: NSR.text, fontWeight: 500 }}>{title}</div>
              {sub && <div style={{ fontFamily: NSR.body, fontSize: 11, color: NSR.textMute, marginTop: 2 }}>{sub}</div>}
            </div>
            <svg width="8" height="14" viewBox="0 0 8 14"><path d="M1 1l6 6-6 6" stroke={NSR.textMute} strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// INSCRIÇÃO (subtela do perfil)
// ────────────────────────────────────────────────
function SubscribeScreen({ data, onBack }) {
  const { benefits } = data;
  return (
    <div style={{ background: NSR.bg, minHeight: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '20px 20px 28px',
        background: 'linear-gradient(180deg, var(--nsr-brand) 0%, rgba(95,184,168,0.04) 100%)',
        position: 'relative',
      }}>
        <button onClick={onBack} style={{
          background: 'rgba(0,0,0,0.2)', border: 'none', cursor: 'pointer',
          width: 36, height: 36, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 16,
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M9 1L3 7l6 6" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div style={{
          fontFamily: NSR.body, fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.6)', letterSpacing: 2,
        }}>PLANO ÚNICO · RENOVAÇÃO MENSAL</div>
        <div style={{
          fontFamily: NSR.display, fontSize: 64, color: '#0A0F0E', lineHeight: 0.85, letterSpacing: 0.5, marginTop: 6,
        }}>NUTRISTREET<br/>RUN</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 18 }}>
          <span style={{ fontFamily: NSR.display, fontSize: 56, color: '#0A0F0E', lineHeight: 1 }}>R$ 49,90</span>
          <span style={{ fontFamily: NSR.body, fontSize: 14, color: 'rgba(0,0,0,0.6)', fontWeight: 600 }}>/mês</span>
        </div>
      </div>

      {/* Benefits */}
      <div style={{ padding: '24px 20px' }}>
        <div style={{ fontFamily: NSR.body, fontSize: 11, fontWeight: 700, color: NSR.textMute, letterSpacing: 1.6, marginBottom: 16 }}>
          O QUE VOCÊ GANHA
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {benefits.map((b, i) => (
            <div key={i} style={{ display: 'flex', gap: 14 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--nsr-brand)', color: '#0A0F0E',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: NSR.display, fontSize: 14, flexShrink: 0,
              }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: NSR.body, fontSize: 14, fontWeight: 700, color: NSR.text }}>{b.t}</div>
                <div style={{ fontFamily: NSR.body, fontSize: 12, color: NSR.textDim, marginTop: 2, lineHeight: 1.4 }}>{b.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How medal works */}
      <div style={{
        margin: '0 20px', padding: 18, borderRadius: 14,
        background: 'rgba(95,184,168,0.05)', border: '1px solid rgba(95,184,168,0.18)',
      }}>
        <div style={{ fontFamily: NSR.display, fontSize: 22, color: NSR.text, letterSpacing: 0.4, marginBottom: 8 }}>
          COMO FUNCIONA A MEDALHA
        </div>
        <div style={{ fontFamily: NSR.body, fontSize: 13, color: NSR.textDim, lineHeight: 1.5 }}>
          Cada mês tem uma meta de km. Cumpriu até o último dia, a medalha física do mês é enviada pro endereço cadastrado — sem custo extra, sem letra miúda. Não cumpriu, a medalha do mês não é emitida.
        </div>
      </div>

      {/* Assessorias */}
      <div style={{
        margin: '16px 20px 24px', padding: 18, borderRadius: 14,
        background: NSR.card, border: `1px solid ${NSR.line}`,
      }}>
        <div style={{ fontFamily: NSR.display, fontSize: 22, color: NSR.text, letterSpacing: 0.4, marginBottom: 8 }}>
          ASSESSORIAS PARTICIPAM DE GRAÇA
        </div>
        <div style={{ fontFamily: NSR.body, fontSize: 13, color: NSR.textDim, lineHeight: 1.5 }}>
          Sua assessoria de corrida pode aparecer no ranking sem pagar nada. Visibilidade pra ela, mais um motivo de orgulho pros corredores.
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '0 20px 24px' }}>
        <button style={{
          width: '100%', padding: '18px',
          background: 'var(--nsr-brand)', color: '#0A0F0E',
          border: 'none', borderRadius: 14, cursor: 'pointer',
          fontFamily: NSR.display, fontSize: 22, letterSpacing: 1,
        }}>ASSINAR AGORA</button>
        <div style={{
          fontFamily: NSR.body, fontSize: 11, color: NSR.textMute,
          textAlign: 'center', marginTop: 10, lineHeight: 1.5,
        }}>
          Renovação automática mensal · Cancele quando quiser
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { RankingScreen, RunsScreen, MedalsScreen, ProfileScreen, SubscribeScreen });
