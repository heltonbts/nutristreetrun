// NutriStreet Run — MVP additions
// Onboarding, Strava/Health, Address, Run detail, Notifications, Feed, External checkout.

// ────────────────────────────────────────────────
// LOGIN
// ────────────────────────────────────────────────
function LoginScreen() {
  return (
    <div style={{
      background: NSR.bg, minHeight: '100%', padding: '60px 24px 32px',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      backgroundImage: 'radial-gradient(120% 50% at 50% 0%, rgba(95,184,168,0.16) 0%, transparent 60%)',
    }}>
      <div>
        <div style={{
          fontFamily: NSR.body, fontSize: 11, fontWeight: 700,
          color: 'var(--nsr-brand)', letterSpacing: 2.4,
        }}>ENTRAR</div>
        <div style={{
          fontFamily: NSR.display, fontSize: 56, color: NSR.text,
          lineHeight: 0.88, letterSpacing: 0.5, marginTop: 10,
        }}>BEM-VINDO<br/>DE VOLTA.</div>
        <div style={{
          fontFamily: NSR.body, fontSize: 14, color: NSR.textDim,
          marginTop: 14, lineHeight: 1.5,
        }}>
          Sua próxima medalha tá te esperando.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 28 }}>
          {[
            ['E-mail ou celular', 'rafa.mendes@email.com'],
            ['Senha', '••••••••'],
          ].map(([label, val]) => (
            <div key={label}>
              <div style={{ fontFamily: NSR.body, fontSize: 11, fontWeight: 700, color: NSR.textMute, letterSpacing: 1.4, marginBottom: 6 }}>
                {label.toUpperCase()}
              </div>
              <div style={{
                padding: '14px', borderRadius: 12,
                background: NSR.card, border: `1px solid ${NSR.line}`,
                fontFamily: NSR.body, fontSize: 15, color: NSR.text,
              }}>{val}</div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 14, fontFamily: NSR.body, fontSize: 12, color: 'var(--nsr-brand)',
          fontWeight: 600, textAlign: 'right',
        }}>Esqueci minha senha</div>

        <button style={{
          width: '100%', padding: '16px', marginTop: 20,
          background: 'var(--nsr-brand)', color: '#0A0F0E',
          border: 'none', borderRadius: 14, fontFamily: NSR.display, fontSize: 22, letterSpacing: 1,
        }}>ENTRAR</button>

        {/* divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0 16px',
          fontFamily: NSR.body, fontSize: 10, color: NSR.textMute, letterSpacing: 1.2, fontWeight: 700,
        }}>
          <div style={{ flex: 1, height: 1, background: NSR.line }} />
          OU
          <div style={{ flex: 1, height: 1, background: NSR.line }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Continuar com Apple', bg: '#fff', fg: '#000', icon: '' },
            { label: 'Continuar com Google', bg: 'transparent', fg: NSR.text, border: NSR.lineHi, icon: 'G' },
          ].map(b => (
            <button key={b.label} style={{
              width: '100%', padding: '13px',
              background: b.bg, color: b.fg,
              border: b.border ? `1px solid ${b.border}` : 'none',
              borderRadius: 12, fontFamily: NSR.body, fontSize: 14, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <span style={{ fontWeight: 800 }}>{b.icon}</span>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        marginTop: 24, fontFamily: NSR.body, fontSize: 13, color: NSR.textDim,
        textAlign: 'center',
      }}>
        Novo por aqui? <span style={{ color: 'var(--nsr-brand)', fontWeight: 700 }}>Criar conta</span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// ONBOARDING — 3 steps
// ────────────────────────────────────────────────
function OnboardingWelcome() {
  return (
    <div style={{
      background: NSR.bg, minHeight: '100%', padding: '60px 24px 32px',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      backgroundImage: 'radial-gradient(120% 60% at 50% 0%, rgba(95,184,168,0.18) 0%, transparent 60%)',
    }}>
      <div>
        <div style={{
          fontFamily: NSR.body, fontSize: 11, fontWeight: 700,
          color: 'var(--nsr-brand)', letterSpacing: 2.4,
        }}>BEM-VINDO</div>
        <div style={{
          fontFamily: NSR.display, fontSize: 64, color: NSR.text,
          lineHeight: 0.85, letterSpacing: 0.5, marginTop: 12,
        }}>CORRA.<br/>BATA A META.<br/>GANHE A<br/>MEDALHA.</div>
        <div style={{
          fontFamily: NSR.body, fontSize: 14, color: NSR.textDim,
          marginTop: 24, lineHeight: 1.5,
        }}>
          Inscrição mensal de R$ 49,90. Cumpriu a meta de km do mês? A medalha física vai pro endereço cadastrado. Sem letra miúda.
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button style={{
          width: '100%', padding: '16px',
          background: 'var(--nsr-brand)', color: '#0A0F0E',
          border: 'none', borderRadius: 14, cursor: 'pointer',
          fontFamily: NSR.display, fontSize: 22, letterSpacing: 1,
        }}>CRIAR CONTA</button>
        <button style={{
          width: '100%', padding: '14px',
          background: 'transparent', color: NSR.text,
          border: `1px solid ${NSR.lineHi}`, borderRadius: 14, cursor: 'pointer',
          fontFamily: NSR.body, fontSize: 14, fontWeight: 600,
        }}>Já tenho conta</button>
      </div>
    </div>
  );
}

function OnboardingSignup() {
  return (
    <div style={{ background: NSR.bg, minHeight: '100%', padding: '24px 20px' }}>
      <div style={{ fontFamily: NSR.body, fontSize: 11, fontWeight: 700, color: 'var(--nsr-brand)', letterSpacing: 2 }}>
        PASSO 1 DE 3
      </div>
      <div style={{ fontFamily: NSR.display, fontSize: 38, color: NSR.text, lineHeight: 0.95, letterSpacing: 0.5, marginTop: 6 }}>
        QUEM É VOCÊ?
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 28 }}>
        {[
          ['Nome completo', 'Rafael Mendes'],
          ['E-mail', 'rafa.mendes@email.com'],
          ['Celular', '(11) 99876-5432'],
          ['Senha', '••••••••'],
        ].map(([label, val]) => (
          <div key={label}>
            <div style={{ fontFamily: NSR.body, fontSize: 11, fontWeight: 700, color: NSR.textMute, letterSpacing: 1.4, marginBottom: 6 }}>
              {label.toUpperCase()}
            </div>
            <div style={{
              padding: '14px 14px', borderRadius: 12,
              background: NSR.card, border: `1px solid ${NSR.line}`,
              fontFamily: NSR.body, fontSize: 15, color: NSR.text,
            }}>{val}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 28, fontFamily: NSR.body, fontSize: 11, color: NSR.textMute, lineHeight: 1.6 }}>
        Ao continuar, você concorda com os <span style={{ color: 'var(--nsr-brand)' }}>termos de uso</span> e a <span style={{ color: 'var(--nsr-brand)' }}>política de privacidade</span>.
      </div>
      <button style={{
        width: '100%', padding: '16px', marginTop: 24,
        background: 'var(--nsr-brand)', color: '#0A0F0E',
        border: 'none', borderRadius: 14, fontFamily: NSR.display, fontSize: 20, letterSpacing: 1,
      }}>CONTINUAR</button>
    </div>
  );
}

function OnboardingClub() {
  const clubs = [
    { name: 'Pace Livre Run Club', city: 'São Paulo', selected: true },
    { name: 'Avenida Run', city: 'São Paulo' },
    { name: 'Iron Pace SP', city: 'São Paulo' },
    { name: 'NorteSul Runners', city: 'Guarulhos' },
  ];
  return (
    <div style={{ background: NSR.bg, minHeight: '100%', padding: '24px 20px' }}>
      <div style={{ fontFamily: NSR.body, fontSize: 11, fontWeight: 700, color: 'var(--nsr-brand)', letterSpacing: 2 }}>
        PASSO 2 DE 3
      </div>
      <div style={{ fontFamily: NSR.display, fontSize: 38, color: NSR.text, lineHeight: 0.95, letterSpacing: 0.5, marginTop: 6 }}>
        SUA ASSESSORIA
      </div>
      <div style={{ fontFamily: NSR.body, fontSize: 13, color: NSR.textDim, marginTop: 8, lineHeight: 1.5 }}>
        Vincula você ao ranking da sua assessoria. Ela participa de graça.
      </div>

      {/* search */}
      <div style={{
        marginTop: 20, padding: '12px 14px', borderRadius: 12,
        background: NSR.card, border: `1px solid ${NSR.line}`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5" stroke={NSR.textMute} strokeWidth="1.5"/>
          <path d="M11 11l3 3" stroke={NSR.textMute} strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span style={{ fontFamily: NSR.body, fontSize: 14, color: NSR.textMute }}>Buscar assessoria…</span>
      </div>

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {clubs.map(c => (
          <div key={c.name} style={{
            padding: '14px', borderRadius: 12,
            background: c.selected ? 'rgba(95,184,168,0.10)' : NSR.card,
            border: `1px solid ${c.selected ? 'var(--nsr-brand)' : NSR.line}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontFamily: NSR.body, fontSize: 14, fontWeight: 700, color: NSR.text }}>{c.name}</div>
              <div style={{ fontFamily: NSR.body, fontSize: 11, color: NSR.textMute, marginTop: 2 }}>{c.city}</div>
            </div>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              border: `1.5px solid ${c.selected ? 'var(--nsr-brand)' : NSR.lineHi}`,
              background: c.selected ? 'var(--nsr-brand)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{c.selected && <svg width="10" height="8" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="#0A0F0E" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div>
          </div>
        ))}
        <div style={{
          padding: '12px 14px', fontFamily: NSR.body, fontSize: 13, color: NSR.textDim,
          textAlign: 'center', textDecoration: 'underline', marginTop: 4,
        }}>Não tenho assessoria — corro sozinho</div>
      </div>

      <button style={{
        width: '100%', padding: '16px', marginTop: 28,
        background: 'var(--nsr-brand)', color: '#0A0F0E',
        border: 'none', borderRadius: 14, fontFamily: NSR.display, fontSize: 20, letterSpacing: 1,
      }}>CONTINUAR</button>
    </div>
  );
}

// ────────────────────────────────────────────────
// SYNC — Strava + Apple Health
// ────────────────────────────────────────────────
function SyncConnect() {
  const apps = [
    { id: 'strava', name: 'Strava', desc: 'Suas corridas e bikes', connected: true, color: '#FC4C02' },
    { id: 'health', name: 'Apple Health', desc: 'Treinos do Watch + iPhone', connected: false, color: '#FF2D55' },
    { id: 'gfit', name: 'Google Fit', desc: 'Para Android', connected: false, color: '#4285F4' },
  ];
  return (
    <div style={{ background: NSR.bg, minHeight: '100%', padding: '24px 20px' }}>
      <div style={{ fontFamily: NSR.body, fontSize: 11, fontWeight: 700, color: 'var(--nsr-brand)', letterSpacing: 2 }}>
        PASSO 3 DE 3
      </div>
      <div style={{ fontFamily: NSR.display, fontSize: 38, color: NSR.text, lineHeight: 0.95, letterSpacing: 0.5, marginTop: 6 }}>
        CONECTE SEU APP
      </div>
      <div style={{ fontFamily: NSR.body, fontSize: 13, color: NSR.textDim, marginTop: 8, lineHeight: 1.5 }}>
        A gente puxa suas corridas automaticamente. Você não precisa fazer nada extra.
      </div>

      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {apps.map(a => (
          <div key={a.id} style={{
            padding: '16px 14px', borderRadius: 14,
            background: NSR.card, border: `1px solid ${a.connected ? 'rgba(61,220,132,0.4)' : NSR.line}`,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10, background: a.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: NSR.display, fontSize: 18, color: '#fff', flexShrink: 0,
            }}>{a.name[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: NSR.body, fontSize: 15, fontWeight: 700, color: NSR.text }}>{a.name}</div>
              <div style={{ fontFamily: NSR.body, fontSize: 11, color: NSR.textMute, marginTop: 2 }}>{a.desc}</div>
            </div>
            {a.connected ? (
              <NSRPill color="success" size="sm">● CONECTADO</NSRPill>
            ) : (
              <button style={{
                background: 'var(--nsr-brand)', color: '#0A0F0E', border: 'none',
                padding: '8px 14px', borderRadius: 999, fontFamily: NSR.body, fontSize: 11, fontWeight: 700, letterSpacing: 0.6,
              }}>CONECTAR</button>
            )}
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 20, padding: '14px', borderRadius: 12,
        background: 'rgba(95,184,168,0.06)', border: '1px solid rgba(95,184,168,0.2)',
        fontFamily: NSR.body, fontSize: 12, color: NSR.textDim, lineHeight: 1.5,
      }}>
        <b style={{ color: NSR.text }}>O que conta:</b> corridas com pace entre 3'00" e 9'00" /km. Ciclismo, caminhada e treinos indoor não contam pro desafio.
      </div>

      <button style={{
        width: '100%', padding: '16px', marginTop: 24,
        background: 'var(--nsr-brand)', color: '#0A0F0E',
        border: 'none', borderRadius: 14, fontFamily: NSR.display, fontSize: 20, letterSpacing: 1,
      }}>FINALIZAR CADASTRO</button>
    </div>
  );
}

// ────────────────────────────────────────────────
// ADDRESS form
// ────────────────────────────────────────────────
function AddressScreen() {
  const fields = [
    ['CEP', '05433-010', true],
    ['Rua', 'Aspicuelta', false],
    ['Número', '412', false],
    ['Complemento', 'Apto 32', false],
    ['Bairro', 'Vila Madalena', false],
    ['Cidade', 'São Paulo', false],
    ['Estado', 'SP', false],
  ];
  return (
    <div style={{ background: NSR.bg, minHeight: '100%', padding: '24px 20px' }}>
      <div style={{ fontFamily: NSR.body, fontSize: 11, fontWeight: 700, color: 'var(--nsr-brand)', letterSpacing: 2 }}>
        ENTREGA · MEDALHAS
      </div>
      <div style={{ fontFamily: NSR.display, fontSize: 38, color: NSR.text, lineHeight: 0.95, letterSpacing: 0.5, marginTop: 6 }}>
        ENDEREÇO
      </div>
      <div style={{ fontFamily: NSR.body, fontSize: 13, color: NSR.textDim, marginTop: 8, lineHeight: 1.5 }}>
        Pra onde a gente manda sua medalha quando você bater a meta.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 24 }}>
        {fields.map(([label, val, hasIcon]) => (
          <div key={label}>
            <div style={{ fontFamily: NSR.body, fontSize: 11, fontWeight: 700, color: NSR.textMute, letterSpacing: 1.4, marginBottom: 6 }}>
              {label.toUpperCase()}
            </div>
            <div style={{
              padding: '14px 14px', borderRadius: 12,
              background: NSR.card, border: `1px solid ${NSR.line}`,
              display: 'flex', alignItems: 'center', gap: 10,
              fontFamily: NSR.body, fontSize: 15, color: NSR.text,
            }}>
              <span style={{ flex: 1 }}>{val}</span>
              {hasIcon && (
                <span style={{ fontFamily: NSR.body, fontSize: 11, color: 'var(--nsr-brand)', fontWeight: 700 }}>
                  ✓ AUTO
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <button style={{
        width: '100%', padding: '16px', marginTop: 24,
        background: 'var(--nsr-brand)', color: '#0A0F0E',
        border: 'none', borderRadius: 14, fontFamily: NSR.display, fontSize: 20, letterSpacing: 1,
      }}>SALVAR ENDEREÇO</button>
    </div>
  );
}

// ────────────────────────────────────────────────
// RUN DETAIL
// ────────────────────────────────────────────────
function RunDetailScreen() {
  return (
    <div style={{ background: NSR.bg, minHeight: '100%' }}>
      {/* Map placeholder */}
      <div style={{
        height: 280, position: 'relative',
        background: 'linear-gradient(135deg, #1a2a26 0%, #0e1a17 100%)',
        borderBottom: `1px solid ${NSR.line}`,
      }}>
        <svg width="100%" height="100%" viewBox="0 0 320 280" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
          {/* fake streets */}
          <g stroke="rgba(255,255,255,0.06)" strokeWidth="1">
            {Array.from({ length: 10 }).map((_, i) => <line key={'h'+i} x1="0" y1={i * 30} x2="320" y2={i * 30} />)}
            {Array.from({ length: 12 }).map((_, i) => <line key={'v'+i} x1={i * 28} y1="0" x2={i * 28} y2="280" />)}
          </g>
          {/* route */}
          <path d="M 40 240 Q 80 200 60 160 T 120 100 Q 180 70 200 130 T 280 80"
            stroke="var(--nsr-brand)" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="0 0"/>
          <circle cx="40" cy="240" r="6" fill="var(--nsr-brand)" />
          <circle cx="280" cy="80" r="8" fill="#0A0F0E" stroke="var(--nsr-brand)" strokeWidth="3" />
        </svg>
        <div style={{ position: 'absolute', top: 12, left: 12 }}>
          <NSRPill color="success" size="sm">✓ CONTA PARA O DESAFIO</NSRPill>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        <div style={{ fontFamily: NSR.body, fontSize: 11, fontWeight: 700, color: NSR.textMute, letterSpacing: 1.4 }}>
          HOJE · 06:42 · STRAVA
        </div>
        <div style={{ fontFamily: NSR.display, fontSize: 32, color: NSR.text, lineHeight: 1, letterSpacing: 0.5, marginTop: 6 }}>
          CORRIDA MATINAL<br/>IBIRAPUERA
        </div>
      </div>

      <div style={{
        margin: '0 20px', padding: 18, borderRadius: 14,
        background: NSR.card, border: `1px solid ${NSR.line}`,
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16,
      }}>
        <NSRStat value="8.2" unit="km" label="Distância" />
        <NSRStat value="44'15″" label="Tempo" />
        <NSRStat value="5'24″" label="Pace" />
        <NSRStat value="612" label="kcal" />
        <NSRStat value="142" label="Bpm méd." />
        <NSRStat value="68m" label="Elevação" />
      </div>

      {/* splits */}
      <div style={{ padding: '20px', marginTop: 8 }}>
        <div style={{ fontFamily: NSR.body, fontSize: 11, fontWeight: 700, color: NSR.textMute, letterSpacing: 1.4, marginBottom: 12 }}>
          PARCIAIS · POR KM
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            [1, '5\'48"', 0.7], [2, '5\'31"', 0.85], [3, '5\'18"', 1.0],
            [4, '5\'22"', 0.95], [5, '5\'29"', 0.88], [6, '5\'15"', 1.0],
            [7, '5\'24"', 0.92], [8, '5\'31"', 0.85],
          ].map(([k, p, w]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: NSR.mono, fontSize: 11, color: NSR.textMute, width: 16 }}>{k}</span>
              <div style={{ flex: 1, height: 18, background: 'rgba(255,255,255,0.04)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${w * 100}%`, height: '100%', background: 'var(--nsr-brand)', opacity: 0.8 }} />
              </div>
              <span style={{ fontFamily: NSR.mono, fontSize: 12, color: NSR.text, fontWeight: 600, width: 52, textAlign: 'right' }}>{p}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// NOTIFICATIONS
// ────────────────────────────────────────────────
function NotificationsScreen() {
  const items = [
    { icon: '🏅', title: 'Sua medalha foi postada!', desc: 'Medalha de Abril · 50K · BR998213721SP', time: 'há 2h', new: true, brand: true },
    { icon: '⚡', title: 'Faltam 21,6 km e 9 dias', desc: 'Você consegue! Bora pra rua.', time: 'hoje · 06:00', new: true },
    { icon: '🥉', title: 'Você caiu pra #4 em SP', desc: 'Mariana Okabe te ultrapassou agora.', time: 'ontem' },
    { icon: '✓', title: 'Corrida sincronizada', desc: '8.2 km · validada pelo desafio', time: 'ontem' },
    { icon: '💳', title: 'Cobrança em 3 dias', desc: 'R$ 49,90 no Pix · 02 jun', time: '2 dias' },
    { icon: '👥', title: 'Pace Livre subiu pra #3', desc: 'Sua assessoria está bombando', time: '3 dias' },
  ];
  return (
    <div style={{ background: NSR.bg, minHeight: '100%' }}>
      <div style={{ padding: '20px 20px 12px' }}>
        <div style={{ fontFamily: NSR.body, fontSize: 11, fontWeight: 700, color: 'var(--nsr-brand)', letterSpacing: 2 }}>
          AVISOS
        </div>
        <div style={{ fontFamily: NSR.display, fontSize: 44, color: NSR.text, lineHeight: 0.95, letterSpacing: 0.5, marginTop: 4 }}>
          NOTIFICAÇÕES
        </div>
      </div>
      <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((n, i) => (
          <div key={i} style={{
            padding: '14px', borderRadius: 12,
            background: n.brand ? 'rgba(95,184,168,0.08)' : NSR.card,
            border: `1px solid ${n.brand ? 'rgba(95,184,168,0.3)' : NSR.line}`,
            display: 'flex', gap: 12, position: 'relative',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, fontSize: 18,
              background: 'rgba(255,255,255,0.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>{n.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: NSR.body, fontSize: 13, fontWeight: 700, color: NSR.text }}>
                {n.title}
              </div>
              <div style={{ fontFamily: NSR.body, fontSize: 11, color: NSR.textDim, marginTop: 2, lineHeight: 1.4 }}>
                {n.desc}
              </div>
              <div style={{ fontFamily: NSR.body, fontSize: 10, color: NSR.textMute, marginTop: 6, letterSpacing: 0.4 }}>
                {n.time.toUpperCase()}
              </div>
            </div>
            {n.new && (
              <div style={{
                position: 'absolute', top: 16, right: 14,
                width: 8, height: 8, borderRadius: '50%', background: 'var(--nsr-brand)',
              }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// FEED
// ────────────────────────────────────────────────
function FeedScreen() {
  const posts = [
    {
      author: 'Carolina Tavares', initials: 'CT', club: 'Avenida Run',
      time: 'há 30min', km: 12.4, pace: '5\'08"', text: 'Long run dominical no Pacaembu 💪 quem topa amanhã 6h?',
      kudos: 18, comments: 4,
    },
    {
      author: 'Pace Livre Run Club', initials: 'PL', club: 'ASSESSORIA',
      time: 'há 2h', isClub: true,
      text: 'Treino de tiro hoje na pista do Ibirapuera, 19h30. Bora!',
      kudos: 32, comments: 11,
    },
    {
      author: 'Bruno Saldanha', initials: 'BS', club: 'Iron Pace SP',
      time: 'há 4h', km: 8.0, pace: '4\'52"', text: '8 km no pace de prova. Maratona em 6 semanas.',
      kudos: 27, comments: 6,
    },
  ];
  return (
    <div style={{ background: NSR.bg, minHeight: '100%' }}>
      <div style={{ padding: '20px 20px 12px' }}>
        <div style={{ fontFamily: NSR.body, fontSize: 11, fontWeight: 700, color: 'var(--nsr-brand)', letterSpacing: 2 }}>
          COMUNIDADE
        </div>
        <div style={{ fontFamily: NSR.display, fontSize: 44, color: NSR.text, lineHeight: 0.95, letterSpacing: 0.5, marginTop: 4 }}>
          FEED
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: '0 20px 16px', display: 'flex', gap: 6 }}>
        {['Todos', 'Minha assessoria', 'SP'].map((f, i) => (
          <div key={f} style={{
            padding: '6px 12px', borderRadius: 999,
            background: i === 0 ? 'var(--nsr-brand)' : 'rgba(255,255,255,0.06)',
            color: i === 0 ? '#0A0F0E' : NSR.textDim,
            fontFamily: NSR.body, fontSize: 11, fontWeight: 700, letterSpacing: 0.6,
            textTransform: 'uppercase',
          }}>{f}</div>
        ))}
      </div>

      <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {posts.map((p, i) => (
          <div key={i} style={{
            padding: '16px', borderRadius: 14,
            background: NSR.card, border: `1px solid ${NSR.line}`,
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
              <NSRAvatar initials={p.initials} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: NSR.body, fontSize: 13, fontWeight: 700, color: NSR.text }}>
                  {p.author}
                  {p.isClub && <span style={{ fontSize: 9, color: 'var(--nsr-brand)', marginLeft: 6, letterSpacing: 1 }}>● ASSESSORIA</span>}
                </div>
                <div style={{ fontFamily: NSR.body, fontSize: 11, color: NSR.textMute, marginTop: 1 }}>
                  {p.club} · {p.time}
                </div>
              </div>
            </div>

            {p.km && (
              <div style={{
                display: 'flex', gap: 14, padding: '10px 12px', marginBottom: 12,
                background: 'rgba(95,184,168,0.08)', borderRadius: 10, border: '1px solid rgba(95,184,168,0.18)',
              }}>
                <div>
                  <div style={{ fontFamily: NSR.display, fontSize: 22, color: NSR.text, lineHeight: 1, letterSpacing: 0.4 }}>
                    {p.km}<span style={{ fontSize: 11, color: NSR.textDim, fontFamily: NSR.body, fontWeight: 500 }}>&nbsp;km</span>
                  </div>
                  <div style={{ fontFamily: NSR.body, fontSize: 9, color: NSR.textMute, fontWeight: 700, letterSpacing: 1, marginTop: 2 }}>DISTÂNCIA</div>
                </div>
                <div>
                  <div style={{ fontFamily: NSR.display, fontSize: 22, color: NSR.text, lineHeight: 1, letterSpacing: 0.4 }}>
                    {p.pace}
                  </div>
                  <div style={{ fontFamily: NSR.body, fontSize: 9, color: NSR.textMute, fontWeight: 700, letterSpacing: 1, marginTop: 2 }}>PACE</div>
                </div>
              </div>
            )}

            <div style={{ fontFamily: NSR.body, fontSize: 13, color: NSR.text, lineHeight: 1.5 }}>
              {p.text}
            </div>

            <div style={{
              display: 'flex', gap: 18, marginTop: 14, paddingTop: 12,
              borderTop: `1px solid ${NSR.line}`,
              fontFamily: NSR.body, fontSize: 12, color: NSR.textDim, fontWeight: 600,
            }}>
              <span>👏 {p.kudos}</span>
              <span>💬 {p.comments}</span>
              <span style={{ marginLeft: 'auto' }}>↗ Compartilhar</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// PAYMENT (external)
// ────────────────────────────────────────────────
function PaymentExternalScreen() {
  return (
    <div style={{
      background: NSR.bg, minHeight: '100%', padding: '32px 24px',
      display: 'flex', flexDirection: 'column',
      backgroundImage: 'radial-gradient(120% 60% at 50% 0%, rgba(95,184,168,0.14) 0%, transparent 60%)',
    }}>
      <div style={{ fontFamily: NSR.body, fontSize: 11, fontWeight: 700, color: 'var(--nsr-brand)', letterSpacing: 2 }}>
        PAGAMENTO
      </div>
      <div style={{ fontFamily: NSR.display, fontSize: 38, color: NSR.text, lineHeight: 0.95, letterSpacing: 0.5, marginTop: 6 }}>
        FINALIZE NO NAVEGADOR
      </div>
      <div style={{ fontFamily: NSR.body, fontSize: 13, color: NSR.textDim, marginTop: 10, lineHeight: 1.6 }}>
        Pra evitar taxas das lojas de app, sua inscrição é processada no nosso checkout web. Você volta pra cá em 30 segundos.
      </div>

      {/* summary card */}
      <div style={{
        marginTop: 28, padding: 20, borderRadius: 16,
        background: NSR.card, border: `1px solid ${NSR.lineHi}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontFamily: NSR.body, fontSize: 13, color: NSR.textDim }}>
            NutriStreet Run · mensal
          </div>
          <div style={{ fontFamily: NSR.display, fontSize: 28, color: NSR.text, letterSpacing: 0.4 }}>R$ 49,90</div>
        </div>
        <div style={{ borderTop: `1px solid ${NSR.line}`, marginTop: 14, paddingTop: 14, fontFamily: NSR.body, fontSize: 12, color: NSR.textDim, lineHeight: 1.6 }}>
          <div>✓ Renovação automática no dia 02 de cada mês</div>
          <div>✓ Cancele quando quiser direto no app</div>
          <div>✓ Pix recorrente ou cartão de crédito</div>
        </div>
      </div>

      <button style={{
        width: '100%', padding: '18px', marginTop: 24,
        background: 'var(--nsr-brand)', color: '#0A0F0E',
        border: 'none', borderRadius: 14, fontFamily: NSR.display, fontSize: 22, letterSpacing: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      }}>
        ABRIR CHECKOUT
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5 1h8v8M13 1L5 9M3 5v8h8" stroke="#0A0F0E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div style={{
        marginTop: 16, fontFamily: NSR.body, fontSize: 11, color: NSR.textMute,
        textAlign: 'center', lineHeight: 1.5,
      }}>
        Vamos abrir <b style={{ color: NSR.textDim }}>checkout.nutristreetrun.com</b> no seu navegador.<br/>
        Você volta automaticamente quando concluir.
      </div>
    </div>
  );
}

function PaymentSuccessScreen() {
  return (
    <div style={{
      background: NSR.bg, minHeight: '100%', padding: '60px 24px 32px',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      backgroundImage: 'radial-gradient(120% 60% at 50% 0%, rgba(61,220,132,0.18) 0%, transparent 60%)',
    }}>
      <div>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(61,220,132,0.16)', border: '2px solid #3DDC84',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24,
        }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M6 16l7 7 13-15" stroke="#3DDC84" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ fontFamily: NSR.body, fontSize: 11, fontWeight: 700, color: '#3DDC84', letterSpacing: 2 }}>
          INSCRIÇÃO CONFIRMADA
        </div>
        <div style={{ fontFamily: NSR.display, fontSize: 56, color: NSR.text, lineHeight: 0.85, letterSpacing: 0.5, marginTop: 10 }}>
          BORA<br/>CORRER!
        </div>
        <div style={{ fontFamily: NSR.body, fontSize: 14, color: NSR.textDim, marginTop: 18, lineHeight: 1.5 }}>
          Você está dentro do desafio de maio. Meta de 60 km até o dia 31. A medalha física será enviada quando você bater a meta.
        </div>

        <div style={{
          marginTop: 24, padding: 16, borderRadius: 12,
          background: NSR.card, border: `1px solid ${NSR.line}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontFamily: NSR.body, fontSize: 11, fontWeight: 700, color: NSR.textMute, letterSpacing: 1.4 }}>
              PRÓXIMA COBRANÇA
            </div>
            <div style={{ fontFamily: NSR.body, fontSize: 14, fontWeight: 700, color: NSR.text, marginTop: 4 }}>
              02 jun 2026 · R$ 49,90
            </div>
          </div>
          <NSRPill color="success" size="sm">ATIVO</NSRPill>
        </div>
      </div>

      <button style={{
        width: '100%', padding: '16px', marginTop: 24,
        background: 'var(--nsr-brand)', color: '#0A0F0E',
        border: 'none', borderRadius: 14, fontFamily: NSR.display, fontSize: 20, letterSpacing: 1,
      }}>IR PRO APP</button>
    </div>
  );
}

Object.assign(window, {
  LoginScreen,
  OnboardingWelcome, OnboardingSignup, OnboardingClub,
  SyncConnect, AddressScreen, RunDetailScreen,
  NotificationsScreen, FeedScreen,
  PaymentExternalScreen, PaymentSuccessScreen,
});
