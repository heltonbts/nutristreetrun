// NutriStreet Run — App shell (routing + frames)

const { useState, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brand": "#5FB8A8",
  "homeVariant": "banner"
}/*EDITMODE-END*/;

function Phone({ platform, screen, onScreen, homeVariant, brand }) {
  const data = window.NSR_DATA;

  const Frame = platform === 'ios' ? window.IOSDevice : window.AndroidDevice;
  const frameProps = platform === 'ios'
    ? { width: 390, height: 820, dark: true }
    : { width: 412, height: 860, dark: true };

  let content;
  if (screen === 'home') {
    if (homeVariant === 'banner') content = <HomeBannerHero data={data} />;
    else if (homeVariant === 'big') content = <HomeBigNumber data={data} />;
    else content = <HomeRing data={data} />;
  } else if (screen === 'rank') content = <RankingScreen data={data} />;
  else if (screen === 'feed') content = <FeedScreen />;
  else if (screen === 'runs') content = <RunsScreen data={data} />;
  else if (screen === 'medal') content = <MedalsScreen data={data} />;
  else if (screen === 'profile') content = <ProfileScreen data={data} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{
        fontFamily: NSR.body, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)',
        letterSpacing: 2, textTransform: 'uppercase',
      }}>
        {platform === 'ios' ? 'iOS · iPhone 15' : 'Android · Pixel 8'}
      </div>
      <Frame {...frameProps}>
        <div style={{
          height: '100%', display: 'flex', flexDirection: 'column',
          background: NSR.bg, color: NSR.text,
        }}>
          <div style={{ flex: 1, overflow: 'auto', paddingTop: platform === 'ios' ? 50 : 0 }} data-screen-label={screenLabel(screen)}>
            {content}
          </div>
          <NSRBottomNav active={screen} onChange={onScreen} platform={platform} />
        </div>
      </Frame>
    </div>
  );
}

function screenLabel(s) {
  return ({ home: '01 Home', rank: '02 Ranking', feed: '03 Feed', runs: '04 Corridas', medal: 'Medalhas', profile: '05 Perfil' })[s];
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = useState('home');

  useEffect(() => {
    document.documentElement.style.setProperty('--nsr-brand', t.brand);
    NSR.brand = t.brand;
  }, [t.brand]);

  const variants = [
    { id: 'banner', label: 'Banner' },
    { id: 'big', label: 'Number' },
    { id: 'ring', label: 'Ring' },
  ];

  return (
    <>
      <div style={{
        minHeight: '100vh', padding: '40px 20px 60px',
        background: '#050505',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32,
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: 720 }}>
          <div style={{
            fontFamily: NSR.body, fontSize: 11, fontWeight: 700,
            color: 'var(--nsr-brand)', letterSpacing: 2.4, textTransform: 'uppercase',
          }}>Mobile App · Hi-Fi</div>
          <div style={{
            fontFamily: NSR.display, fontSize: 72, color: '#fff',
            lineHeight: 0.9, letterSpacing: 1, marginTop: 8,
          }}>NUTRISTREET RUN</div>
          <div style={{
            fontFamily: NSR.body, fontSize: 14, color: 'rgba(255,255,255,0.55)',
            marginTop: 14, lineHeight: 1.5,
          }}>
            App de corridas virtuais. Inscrição mensal, meta de km, medalha física em casa quando bate a meta.<br/>
            Use a barra inferior pra navegar e os tweaks pra trocar a Home.
          </div>

          {/* Variant switcher */}
          {screen === 'home' && (
            <div style={{
              display: 'inline-flex', marginTop: 22, padding: 4, gap: 4,
              background: 'rgba(255,255,255,0.06)', borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              {variants.map(v => {
                const active = t.homeVariant === v.id;
                return (
                  <button key={v.id} onClick={() => setTweak('homeVariant', v.id)} style={{
                    padding: '8px 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
                    background: active ? 'var(--nsr-brand)' : 'transparent',
                    color: active ? '#0A0A0A' : 'rgba(255,255,255,0.7)',
                    fontFamily: NSR.body, fontSize: 12, fontWeight: 700, letterSpacing: 0.6,
                    whiteSpace: 'nowrap',
                  }}>{v.label}</button>
                );
              })}
            </div>
          )}
        </div>

        {/* Phones side by side */}
        <div style={{
          display: 'flex', gap: 60, flexWrap: 'wrap', justifyContent: 'center',
        }}>
          <Phone platform="ios" screen={screen} onScreen={setScreen} homeVariant={t.homeVariant} brand={t.brand} />
          <Phone platform="android" screen={screen} onScreen={setScreen} homeVariant={t.homeVariant} brand={t.brand} />
        </div>

        <div style={{
          fontFamily: NSR.body, fontSize: 11, color: 'rgba(255,255,255,0.35)',
          letterSpacing: 1, marginTop: 8, textAlign: 'center',
        }}>
          As duas telas estão sincronizadas — toque em qualquer ícone da bottom nav
        </div>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Cor primária">
          <TweakColor
            value={t.brand}
            onChange={v => setTweak('brand', v)}
            options={['#5FB8A8', '#3DA89A', '#7FCEC0', '#A8D8CF', '#F4620A']}
          />
        </TweakSection>
        <TweakSection title="Variação da Home">
          <TweakRadio
            value={t.homeVariant}
            onChange={v => setTweak('homeVariant', v)}
            options={[
              { value: 'banner', label: 'Banner' },
              { value: 'big', label: 'Number' },
              { value: 'ring', label: 'Ring' },
            ]}
          />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
