// Empty state for Home + Challenge picker

const CHALLENGES = [
  {
    id: '60k',
    label: '60K',
    title: 'JUNHO 60K',
    km: 60,
    pace: 'Médio',
    desc: 'Pra quem corre 3-4x por semana. Cerca de 15 km / semana.',
    medal: 'Medalha hexagonal preta com detalhe verde',
    popular: true,
  },
  {
    id: '30k',
    label: '30K',
    title: 'JUNHO 30K',
    km: 30,
    pace: 'Iniciante',
    desc: 'Começando agora? 1 km por dia bate. Bora.',
    medal: 'Medalha redonda dourada · entrada',
  },
  {
    id: '100k',
    label: '100K',
    title: 'JUNHO 100K',
    km: 100,
    pace: 'Avançado',
    desc: 'Pra quem treina pra prova. Mais de 20 km / semana.',
    medal: 'Medalha quadrada com placa metálica gravada',
  },
  {
    id: '150k',
    label: '150K',
    title: 'JUNHO 150K',
    km: 150,
    pace: 'Elite',
    desc: 'Volume de maratonista. Não é pra qualquer um.',
    medal: 'Medalha edição limitada · numerada',
  },
];

// Empty state (replaces hero banner when user has no active challenge)
function HomeEmptyState({ data, onPick }) {
  const { recent, user, rankCity } = data;
  const myRank = rankCity.find(r => r.isMe);
  return (
    <div style={{ background: NSR.bg, paddingBottom: 24 }}>
      {/* Hero — empty */}
      <div style={{
        position: 'relative', padding: '20px 20px 28px',
        background: 'radial-gradient(120% 80% at 80% 0%, rgba(95,184,168,0.18) 0%, transparent 55%), #0E1110',
        borderBottom: `1px solid ${NSR.line}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <NSRPill color="ghost" size="sm">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: NSR.success, display: 'inline-block', marginRight: 4 }} />
            STRAVA · HEALTH SYNC
          </NSRPill>
          <div style={{ fontFamily: NSR.body, fontSize: 11, fontWeight: 700, color: NSR.textMute, letterSpacing: 1.4 }}>
            JUNHO · 2026
          </div>
        </div>

        <div style={{
          fontFamily: NSR.body, fontSize: 11, fontWeight: 700,
          color: 'var(--nsr-brand)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8,
        }}>Olá, {user.name.split(' ')[0]}</div>
        <div style={{
          fontFamily: NSR.display, fontSize: 56, lineHeight: 0.88,
          color: NSR.text, letterSpacing: 1,
        }}>ESCOLHA<br/>SEU<br/>DESAFIO.</div>
        <div style={{
          fontFamily: NSR.body, fontSize: 14, color: NSR.textDim,
          marginTop: 14, lineHeight: 1.5, maxWidth: 280,
        }}>
          Você ainda não entrou no desafio de junho. Escolha sua meta de km — só uma medalha por mês.
        </div>

        {/* placeholder medal silhouette */}
        <div style={{
          position: 'absolute', top: 60, right: 16,
          width: 110, height: 110, borderRadius: '50%',
          border: `2px dashed ${NSR.lineHi}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: NSR.display, fontSize: 14, color: NSR.textMute, letterSpacing: 2,
          opacity: 0.6,
        }}>?</div>

        <button onClick={onPick} style={{
          width: '100%', padding: '16px', marginTop: 24,
          background: 'var(--nsr-brand)', color: '#0A0F0E',
          border: 'none', borderRadius: 14, cursor: 'pointer',
          fontFamily: NSR.display, fontSize: 22, letterSpacing: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          ESCOLHER DESAFIO
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M1 7h12M8 2l5 5-5 5" stroke="#0A0F0E" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>

        <div style={{
          marginTop: 12, fontFamily: NSR.body, fontSize: 11, color: NSR.textMute,
          textAlign: 'center', letterSpacing: 0.4,
        }}>
          Inscrição inclusa no plano · termina em 26 dias
        </div>
      </div>

      {/* Quick options preview */}
      <div style={{ padding: '24px 20px 8px' }}>
        <div style={{
          fontFamily: NSR.body, fontSize: 11, fontWeight: 700, color: NSR.textMute,
          letterSpacing: 1.6, marginBottom: 14,
        }}>METAS DISPONÍVEIS</div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {CHALLENGES.map(c => (
            <div key={c.id} onClick={onPick} style={{
              flexShrink: 0, padding: '12px 14px', borderRadius: 12,
              background: NSR.card, border: `1px solid ${NSR.line}`,
              minWidth: 110, cursor: 'pointer',
            }}>
              <div style={{ fontFamily: NSR.display, fontSize: 28, color: NSR.text, lineHeight: 1, letterSpacing: 0.4 }}>
                {c.label}
              </div>
              <div style={{ fontFamily: NSR.body, fontSize: 10, color: NSR.textMute, marginTop: 6, letterSpacing: 0.8, fontWeight: 700 }}>
                {c.pace.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activities still show */}
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

// Full picker screen
function ChallengePickerScreen({ onBack, onConfirm }) {
  const [selected, setSelected] = React.useState('60k');
  const sel = CHALLENGES.find(c => c.id === selected);
  return (
    <div style={{ background: NSR.bg, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 8px' }}>
        <button onClick={onBack} style={{
          background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer',
          width: 36, height: 36, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M9 1L3 7l6 6" stroke={NSR.text} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div style={{ fontFamily: NSR.body, fontSize: 11, fontWeight: 700, color: 'var(--nsr-brand)', letterSpacing: 2 }}>
          JUNHO · 2026
        </div>
        <div style={{ fontFamily: NSR.display, fontSize: 44, color: NSR.text, lineHeight: 0.95, letterSpacing: 0.5, marginTop: 6 }}>
          ESCOLHA SUA META
        </div>
        <div style={{ fontFamily: NSR.body, fontSize: 13, color: NSR.textDim, marginTop: 8, lineHeight: 1.5 }}>
          Você fica nesse desafio até o fim do mês. Bata a meta, ganhe a medalha.
        </div>
      </div>

      {/* Cards */}
      <div style={{ flex: 1, padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {CHALLENGES.map(c => {
          const isSel = c.id === selected;
          return (
            <div key={c.id} onClick={() => setSelected(c.id)} style={{
              padding: 16, borderRadius: 14, cursor: 'pointer',
              background: isSel ? 'rgba(95,184,168,0.10)' : NSR.card,
              border: `1px solid ${isSel ? 'var(--nsr-brand)' : NSR.line}`,
              position: 'relative',
            }}>
              {c.popular && (
                <div style={{
                  position: 'absolute', top: -8, right: 14,
                  background: 'var(--nsr-brand)', color: '#0A0F0E',
                  padding: '3px 10px', borderRadius: 999,
                  fontFamily: NSR.body, fontSize: 9, fontWeight: 800, letterSpacing: 1,
                }}>MAIS ESCOLHIDO</div>
              )}
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: isSel ? 'var(--nsr-brand)' : 'rgba(255,255,255,0.04)',
                  color: isSel ? '#0A0F0E' : NSR.text,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: NSR.display, fontSize: 22, letterSpacing: 0.4,
                  flexShrink: 0,
                }}>{c.label}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: NSR.display, fontSize: 22, color: NSR.text, letterSpacing: 0.4, lineHeight: 1 }}>
                      {c.km} KM
                    </span>
                    <span style={{ fontFamily: NSR.body, fontSize: 10, fontWeight: 700, color: NSR.textMute, letterSpacing: 1 }}>
                      · {c.pace.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontFamily: NSR.body, fontSize: 12, color: NSR.textDim, marginTop: 4, lineHeight: 1.4 }}>
                    {c.desc}
                  </div>
                </div>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  border: `1.5px solid ${isSel ? 'var(--nsr-brand)' : NSR.lineHi}`,
                  background: isSel ? 'var(--nsr-brand)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>{isSel && <svg width="10" height="8" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="#0A0F0E" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div>
              </div>
            </div>
          );
        })}

        <div style={{
          marginTop: 8, padding: 14, borderRadius: 12,
          background: 'rgba(95,184,168,0.05)', border: '1px solid rgba(95,184,168,0.18)',
          fontFamily: NSR.body, fontSize: 11, color: NSR.textDim, lineHeight: 1.5,
        }}>
          <b style={{ color: NSR.text }}>Atenção:</b> a escolha trava no dia 5 do mês. Depois disso, só no próximo ciclo.
        </div>
      </div>

      {/* CTA */}
      <div style={{
        padding: '14px 20px 24px',
        background: NSR.bg, borderTop: `1px solid ${NSR.line}`,
      }}>
        <button onClick={() => onConfirm && onConfirm(sel.id)} style={{
          width: '100%', padding: '16px',
          background: 'var(--nsr-brand)', color: '#0A0F0E',
          border: 'none', borderRadius: 14, cursor: 'pointer',
          fontFamily: NSR.display, fontSize: 22, letterSpacing: 1,
        }}>
          ENTRAR NO {sel.label}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { HomeEmptyState, ChallengePickerScreen, CHALLENGES });
