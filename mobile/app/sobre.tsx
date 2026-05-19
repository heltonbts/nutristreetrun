import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenTransition } from '../src/components/ScreenTransition';
import { colors, font } from '../src/lib/tokens';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <View style={s.step}>
      <View style={s.stepNum}>
        <Text style={s.stepNumText}>{n}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.stepTitle}>{title}</Text>
        <Text style={s.stepDesc}>{desc}</Text>
      </View>
    </View>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.bulletRow}>
      <View style={s.bulletDot} />
      <Text style={s.bulletText}>{children}</Text>
    </View>
  );
}

export default function SobreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <ScreenTransition>
      <ScrollView
        style={s.root}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable
            style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}
            onPress={() => router.back()}
          >
            <Text style={s.backArrow}>←</Text>
            <Text style={s.backLabel}>Voltar</Text>
          </Pressable>
          <Text style={s.headerTitle}>COMO FUNCIONA</Text>
          <View style={{ width: 80 }} />
        </View>

        {/* Hero — a ideia geral */}
        <View style={s.hero}>
          <Text style={s.heroKicker}>NUTRISTREET RUN</Text>
          <Text style={s.heroTitle}>
            Corra na rua.{'\n'}Bata a meta.{'\n'}Ganhe a medalha.
          </Text>
          <Text style={s.heroSub}>
            O NutriStreet Run transforma a sua corrida de rua num desafio mensal com meta clara,
            ranking e comunidade. Você corre onde quiser, o app rastreia por GPS e mede o seu
            progresso até a medalha do mês.
          </Text>
        </View>

        <Section title="A IDEIA">
          <Text style={s.para}>
            Todo mês começa um novo desafio: você escolhe uma meta de quilômetros e tem o mês
            inteiro pra completá-la. Cada corrida válida soma no seu total. Bateu a meta, a medalha
            do mês é sua. É simples de propósito — o foco é criar constância, não competir por
            recorde.
          </Text>
        </Section>

        <Section title="PASSO A PASSO">
          <Step
            n={1}
            title="Escolha o desafio do mês"
            desc="Defina sua meta de km (30K, 60K, 100K ou 150K). Só vale uma medalha por mês."
          />
          <Step
            n={2}
            title="Corra com o GPS ligado"
            desc="Toque em CORRER. O app rastreia distância, pace, tempo e calorias em tempo real — inclusive na tela bloqueada."
          />
          <Step
            n={3}
            title="A corrida soma na meta"
            desc="Ao finalizar, a distância válida entra automaticamente no seu progresso do desafio."
          />
          <Step
            n={4}
            title="Acompanhe e bata a meta"
            desc="Veja seu progresso, ranking e histórico na Home. Complete os km e a medalha do mês é liberada."
          />
        </Section>

        <Section title="O QUE CONTA COMO CORRIDA">
          <Bullet>Corridas rastreadas por GPS dentro do app contam por padrão.</Bullet>
          <Bullet>
            Atividades muito curtas ou com sinal de GPS inconsistente podem ser marcadas como “não
            conta” — isso mantém o ranking justo.
          </Bullet>
          <Bullet>
            Quando uma atividade não conta, o app mostra o motivo direto no histórico.
          </Bullet>
        </Section>

        <Section title="RANKING E COMUNIDADE">
          <Text style={s.para}>
            Todos no mesmo desafio entram num ranking por distância acumulada no mês. No Feed você
            acompanha as corridas da galera e reage a elas. A ideia é puxar uns aos outros — correr
            junto, mesmo cada um na sua rua.
          </Text>
        </Section>

        <Section title="PRIVACIDADE & GPS">
          <Text style={s.para}>
            O GPS é usado só durante a corrida pra medir distância e traçado. O rastreamento roda
            mesmo com o app em segundo plano pra não perder a corrida — e para assim que você
            finaliza.
          </Text>
        </Section>

        <Pressable
          style={({ pressed }) => [s.cta, pressed && { opacity: 0.85 }]}
          onPress={() => router.back()}
        >
          <Text style={s.ctaText}>ENTENDI, BORA CORRER →</Text>
        </Pressable>
      </ScrollView>
    </ScreenTransition>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 80 },
  backArrow: { fontSize: 20, color: colors.brand },
  backLabel: { fontFamily: font.bodyBold, fontSize: 13, color: colors.brand },
  headerTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22,
    color: colors.text,
    letterSpacing: 1,
    lineHeight: 24,
  },

  hero: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 },
  heroKicker: {
    fontFamily: font.bodyBold,
    fontSize: 11,
    color: colors.brand,
    letterSpacing: 2,
    marginBottom: 10,
  },
  heroTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 40,
    lineHeight: 42,
    color: colors.text,
    letterSpacing: 0.5,
  },
  heroSub: {
    fontFamily: font.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textDim,
    marginTop: 14,
  },

  section: { paddingHorizontal: 20, paddingTop: 26 },
  sectionTitle: {
    fontFamily: font.bodyBold,
    fontSize: 12,
    color: colors.textMute,
    letterSpacing: 1.8,
    marginBottom: 14,
  },
  para: {
    fontFamily: font.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textDim,
  },

  step: { flexDirection: 'row', gap: 14, marginBottom: 18 },
  stepNum: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(95,184,168,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(95,184,168,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumText: { fontFamily: font.bodyBold, fontSize: 14, color: colors.brand },
  stepTitle: { fontFamily: font.bodyBold, fontSize: 15, color: colors.text, marginBottom: 3 },
  stepDesc: { fontFamily: font.body, fontSize: 13, lineHeight: 19, color: colors.textDim },

  bulletRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand,
    marginTop: 7,
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    fontFamily: font.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textDim,
  },

  cta: {
    marginHorizontal: 20,
    marginTop: 32,
    backgroundColor: colors.brand,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 20,
    color: colors.brandInk,
    letterSpacing: 1,
  },
});
