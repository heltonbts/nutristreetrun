// NutriStreet Run — Canvas app shell
// All screens laid out side-by-side in a Figma-style design canvas.

const { useState, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": "#5FB8A8"
}/*EDITMODE-END*/;

// Wrap a screen in a mini phone for the canvas.
// Use a thin functional helper that returns a DCArtboard at top level
// (NOT wrapped in a div) so DCSection's child enumeration sees it.
function makeBoard({ id, label, flow, screen, w = 320, h = 680, children }) {
  return (
    <DCArtboard key={id} id={id} label={`${flow ? flow + ' · ' : ''}${label}`} width={w} height={h}>
      <MiniPhone screen={screen} w={w} h={h}>
        {children}
      </MiniPhone>
    </DCArtboard>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const data = window.NSR_DATA;

  useEffect(() => {
    document.documentElement.style.setProperty('--nsr-brand', t.brand);
    NSR.brand = t.brand;
  }, [t.brand]);

  return (
    <>
      <DesignCanvas style={{ background: '#f0eee9' }}>
        {/* SECTION 1 — HOME VARIATIONS */}
        <DCSection id="home" title="Home · 3 variações" subtitle="A tela mais importante. Escolha uma direção visual.">
          {makeBoard({ id: 'home-a', label: 'A — Banner editorial', flow: '01.A', screen: 'home', children: <HomeBannerHero data={data} /> })}
          {makeBoard({ id: 'home-a-empty', label: 'A — Sem desafio (vazio)', flow: '01.A·empty', screen: 'home', children: <HomeEmptyState data={data} onPick={() => {}} /> })}
          {makeBoard({ id: 'home-picker', label: 'Escolher desafio', flow: '01.A·picker', screen: 'home', children: <ChallengePickerScreen onBack={() => {}} onConfirm={() => {}} /> })}
          {makeBoard({ id: 'home-b', label: 'B — Big number', flow: '01.B', screen: 'home', children: <HomeBigNumber data={data} /> })}
          {makeBoard({ id: 'home-c', label: 'C — Ring progress', flow: '01.C', screen: 'home', children: <HomeRing data={data} /> })}
        </DCSection>

        {/* SECTION 2 — RANKING */}
        <DCSection id="ranking" title="Ranking · 3 abas" subtitle="Mesma estrutura, conteúdo diferente. Tab persistida no estado.">
          {makeBoard({ id: 'rank-city', label: 'Cidade', flow: '02.1', screen: 'rank', children: <RankingForced data={data} tab="city" /> })}
          {makeBoard({ id: 'rank-state', label: 'Estado', flow: '02.2', screen: 'rank', children: <RankingForced data={data} tab="state" /> })}
          {makeBoard({ id: 'rank-club', label: 'Assessorias', flow: '02.3', screen: 'rank', children: <RankingForced data={data} tab="club" /> })}
        </DCSection>

        {/* SECTION 3 — CORRIDAS + MEDALHAS */}
        <DCSection id="runs-medals" title="Corridas & Medalhas" subtitle="Histórico Strava/Health validado e vitrine de conquistas.">
          {makeBoard({ id: 'runs', label: 'Minhas corridas', flow: '03', screen: 'runs', children: <RunsScreen data={data} /> })}
          {makeBoard({ id: 'medals', label: 'Medalhas', flow: '04', screen: 'medal', children: <MedalsScreen data={data} /> })}
        </DCSection>

        {/* SECTION 4 — PERFIL + INSCRIÇÃO */}
        <DCSection id="profile" title="Perfil & Inscrição" subtitle="Inscrição é subtela do perfil — abre via 'Ver benefícios'.">
          {makeBoard({ id: 'profile-main', label: 'Perfil principal', flow: '05', screen: 'profile', children: <ProfileScreen data={data} /> })}
          {makeBoard({ id: 'subscribe', label: 'Inscrição (subtela)', flow: '05.1', screen: 'profile', children: <SubscribeStandalone data={data} /> })}
        </DCSection>

        {/* SECTION — ONBOARDING */}
        <DCSection id="onboarding" title="Onboarding · Cadastro" subtitle="Primeira experiência. 3 passos antes de cair na Home.">
          {makeBoard({ id: 'login', label: 'Login', flow: '00.0', screen: 'home', children: <LoginScreen /> })}
          {makeBoard({ id: 'onb-welcome', label: 'Boas-vindas', flow: '00.1', screen: 'home', children: <OnboardingWelcome /> })}
          {makeBoard({ id: 'onb-signup', label: 'Dados pessoais', flow: '00.2', screen: 'home', children: <OnboardingSignup /> })}
          {makeBoard({ id: 'onb-club', label: 'Assessoria', flow: '00.3', screen: 'home', children: <OnboardingClub /> })}
          {makeBoard({ id: 'onb-sync', label: 'Strava + Health', flow: '00.4', screen: 'home', children: <SyncConnect /> })}
        </DCSection>

        {/* SECTION — PAGAMENTO EXTERNO */}
        <DCSection id="payment" title="Pagamento · Externo" subtitle="Checkout web (sem taxa de loja). App só confirma o retorno.">
          {makeBoard({ id: 'pay-bridge', label: 'Ponte pro checkout', flow: '06.1', screen: 'profile', children: <PaymentExternalScreen /> })}
          {makeBoard({ id: 'pay-success', label: 'Sucesso pós-retorno', flow: '06.2', screen: 'profile', children: <PaymentSuccessScreen /> })}
        </DCSection>

        {/* SECTION — DETALHE CORRIDA + ENDEREÇO */}
        <DCSection id="details" title="Detalhe da corrida & Endereço" subtitle="Subtelas mais usadas no dia a dia.">
          {makeBoard({ id: 'run-detail', label: 'Detalhe da corrida', flow: '03.1', screen: 'runs', children: <RunDetailScreen /> })}
          {makeBoard({ id: 'address', label: 'Endereço de entrega', flow: '04.1', screen: 'medal', children: <AddressScreen /> })}
        </DCSection>

        {/* SECTION — NOTIFICAÇÕES + FEED */}
        <DCSection id="engagement" title="Notificações & Feed" subtitle="O que faz o usuário voltar fora do dia da corrida.">
          {makeBoard({ id: 'notifications', label: 'Centro de avisos', flow: '07', screen: 'home', children: <NotificationsScreen /> })}
          {makeBoard({ id: 'feed', label: 'Feed da comunidade', flow: '08', screen: 'home', children: <FeedScreen /> })}
        </DCSection>

        {/* SECTION 5 — FLUXOS DE NAVEGAÇÃO */}
        <DCSection id="flows" title="Notas de fluxo" subtitle="Sequência de navegação para o time de dev.">
          <DCArtboard id="flow-note" label="Mapa de navegação" width={520} height={400}>
            <div style={{
              padding: 28, height: '100%', boxSizing: 'border-box',
              background: '#fff',
              fontFamily: '"Inter", system-ui',
              color: '#2a251f',
            }}>
              <div style={{
                fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fontWeight: 700,
                color: '#c96442', letterSpacing: 1.4, marginBottom: 8,
              }}>FLUXO DE NAVEGAÇÃO</div>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1, marginBottom: 18 }}>
                Bottom nav (5 abas) →<br/>cada aba é raiz de pilha
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                <div><b>01 · Home</b> → variação escolhida vira a definitiva</div>
                <div style={{ paddingLeft: 18, color: '#666' }}>↳ tap em "Ver tudo" no ranking → 02</div>
                <div style={{ paddingLeft: 18, color: '#666' }}>↳ tap em "Ver corridas" → 03</div>
                <div style={{ marginTop: 8 }}><b>02 · Ranking</b> → tabs Cidade / Estado / Assessoria</div>
                <div style={{ marginTop: 8 }}><b>03 · Corridas</b> → lista do mês com sync banner</div>
                <div style={{ marginTop: 8 }}><b>04 · Medalhas</b> → grid + endereço editável</div>
                <div style={{ marginTop: 8 }}><b>05 · Perfil</b> → stats + plano</div>
                <div style={{ paddingLeft: 18, color: '#666' }}>↳ "Ver benefícios" → 05.1 (Inscrição)</div>
              </div>
            </div>
          </DCArtboard>

          <DCArtboard id="flow-states" label="Estados das medalhas" width={520} height={400}>
            <div style={{
              padding: 28, height: '100%', boxSizing: 'border-box',
              background: '#fff', fontFamily: '"Inter", system-ui', color: '#2a251f',
            }}>
              <div style={{
                fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fontWeight: 700,
                color: '#c96442', letterSpacing: 1.4, marginBottom: 8,
              }}>ESTADOS · MEDALHA</div>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1, marginBottom: 18 }}>
                4 estados visuais
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
                {[
                  ['progress', 'Em andamento', 'Mês corrente, barra de progresso visível'],
                  ['shipped', 'Enviada', 'Meta cumprida; código de rastreio exibido'],
                  ['delivered', 'Recebida', 'Marcada como entregue; medalha preenchida'],
                  ['missed', 'Não recebida', 'Mês fechado sem bater meta; dessaturada'],
                ].map(([k, label, desc]) => (
                  <div key={k} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <code style={{
                      fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
                      background: '#f0eee9', padding: '4px 8px', borderRadius: 4,
                      minWidth: 72, textAlign: 'center',
                    }}>{k}</code>
                    <div>
                      <b>{label}</b> <span style={{ color: '#666' }}>— {desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DCArtboard>

          <DCArtboard id="flow-tokens" label="Design tokens" width={520} height={400}>
            <div style={{
              padding: 28, height: '100%', boxSizing: 'border-box',
              background: '#fff', fontFamily: '"Inter", system-ui', color: '#2a251f',
            }}>
              <div style={{
                fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fontWeight: 700,
                color: '#c96442', letterSpacing: 1.4, marginBottom: 8,
              }}>TOKENS</div>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1, marginBottom: 18 }}>
                Paleta · tipografia
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {[
                  ['#5FB8A8', 'brand'],
                  ['#0E1110', 'bg'],
                  ['#1C2120', 'card'],
                  ['#ECEFEE', 'text'],
                  ['#3DDC84', 'success'],
                  ['#FF6B6B', 'danger'],
                ].map(([hex, name]) => (
                  <div key={name} style={{ textAlign: 'center' }}>
                    <div style={{ width: 56, height: 56, background: hex, borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)' }} />
                    <div style={{ fontSize: 10, marginTop: 4, fontWeight: 600 }}>{name}</div>
                    <div style={{ fontSize: 9, color: '#888', fontFamily: 'monospace' }}>{hex}</div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid #e6e2dc', paddingTop: 14, fontSize: 13, lineHeight: 1.7 }}>
                <div><b style={{ fontFamily: '"Bebas Neue"', fontSize: 18, letterSpacing: 0.5 }}>BEBAS NEUE</b> — display, números, títulos</div>
                <div><b>Inter</b> — body, labels, UI</div>
                <div style={{ fontFamily: '"JetBrains Mono", monospace' }}><b>JetBrains Mono</b> — códigos, tracking</div>
              </div>
            </div>
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Cor primária">
          <TweakColor
            value={t.brand}
            onChange={v => setTweak('brand', v)}
            options={['#5FB8A8', '#3DA89A', '#7FCEC0', '#A8D8CF', '#F4620A']}
          />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
