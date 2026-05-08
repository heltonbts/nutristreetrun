import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '../lib/tokens';

interface Props {
  userId: string;
  onClose: () => void;
}

const BENEFITS = [
  { t: 'Desafio mensal', d: 'Meta de km que cresce com você. Cumpriu, ganhou medalha.' },
  { t: 'Medalha física em casa', d: 'Cumpriu a meta? A medalha do mês é enviada pro endereço cadastrado, sem custo extra.' },
  { t: 'Ranking real', d: 'Compita por cidade, estado e assessoria. Ranking atualiza em tempo real.' },
  { t: 'Sync automático', d: 'Strava + Apple Health + Google Fit. Você corre, a gente conta.' },
  { t: 'Feed da comunidade', d: 'Veja o que sua assessoria e seus pares estão fazendo.' },
  { t: 'Conteúdo NutriSilva', d: 'Acesso ao ecossistema do nutricionista esportivo Dr. Silva.' },
];

export function SubscribeScreen({ userId, onClose }: Props) {
  const insets = useSafeAreaInsets();

  async function handleCheckout() {
    const base = process.env.EXPO_PUBLIC_CHECKOUT_URL;
    if (!base) {
      Alert.alert('Indisponível', 'Link de pagamento não configurado.');
      return;
    }
    const url = `${base}?ref=${userId}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Erro', 'Não foi possível abrir o link de pagamento.');
    }
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* Header gradiente */}
        <View style={s.headerGrad}>
          <Pressable style={s.backBtn} onPress={onClose}>
            <Text style={s.backArrow}>‹</Text>
          </Pressable>
          <Text style={s.kicker}>PLANO ÚNICO · RENOVAÇÃO MENSAL</Text>
          <Text style={s.bigTitle}>NUTRISTREET{'\n'}RUN</Text>
          <View style={s.priceRow}>
            <Text style={s.price}>R$ 49,90</Text>
            <Text style={s.pricePer}>/mês</Text>
          </View>
        </View>

        {/* Benefícios */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>O QUE VOCÊ GANHA</Text>
          <View style={s.benefitsList}>
            {BENEFITS.map((b, i) => (
              <View key={i} style={s.benefitRow}>
                <View style={s.benefitNum}>
                  <Text style={s.benefitNumText}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.benefitTitle}>{b.t}</Text>
                  <Text style={s.benefitDesc}>{b.d}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Como funciona a medalha */}
        <View style={s.infoCard}>
          <Text style={s.infoTitle}>COMO FUNCIONA A MEDALHA</Text>
          <Text style={s.infoText}>
            Cada mês tem uma meta de km. Cumpriu até o último dia, a medalha física do mês é enviada pro endereço cadastrado — sem custo extra, sem letra miúda. Não cumpriu, a medalha do mês não é emitida.
          </Text>
        </View>

        {/* Assessorias */}
        <View style={s.assessoriaCard}>
          <Text style={s.infoTitle}>ASSESSORIAS PARTICIPAM DE GRAÇA</Text>
          <Text style={s.infoText}>
            Sua assessoria de corrida pode aparecer no ranking sem pagar nada. Visibilidade pra ela, mais um motivo de orgulho pros corredores.
          </Text>
        </View>

        {/* CTA */}
        <View style={s.ctaWrap}>
          <Pressable style={s.ctaBtn} onPress={handleCheckout}>
            <Text style={s.ctaBtnText}>ASSINAR AGORA</Text>
          </Pressable>
          <Text style={s.ctaHint}>Renovação automática mensal · Cancele quando quiser</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  // Header
  headerGrad: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
    backgroundColor: colors.brand,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  backArrow: { color: '#fff', fontSize: 26, lineHeight: 30 },
  kicker: {
    fontFamily: font.bodyBold, fontSize: 11,
    color: 'rgba(0,0,0,0.6)', letterSpacing: 2,
  },
  bigTitle: {
    fontFamily: 'BebasNeue_400Regular', fontSize: 64,
    color: '#0A0F0E', lineHeight: 56, letterSpacing: 0.5, marginTop: 6,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 18 },
  price: {
    fontFamily: 'BebasNeue_400Regular', fontSize: 56,
    color: '#0A0F0E', lineHeight: 58,
  },
  pricePer: { fontFamily: font.bodyBold, fontSize: 14, color: 'rgba(0,0,0,0.6)' },

  // Benefits
  section: { padding: 20, paddingBottom: 4 },
  sectionLabel: {
    fontFamily: font.bodyBold, fontSize: 11,
    color: colors.textMute, letterSpacing: 1.6, marginBottom: 16,
  },
  benefitsList: { gap: 14 },
  benefitRow: { flexDirection: 'row', gap: 14 },
  benefitNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  benefitNumText: {
    fontFamily: 'BebasNeue_400Regular', fontSize: 14,
    color: colors.brandInk, lineHeight: 16,
  },
  benefitTitle: { fontFamily: font.bodyBold, fontSize: 14, color: colors.text },
  benefitDesc: {
    fontFamily: font.body, fontSize: 12,
    color: colors.textDim, marginTop: 2, lineHeight: 17,
  },

  // Info cards
  infoCard: {
    marginHorizontal: 20, marginTop: 20,
    padding: 18, borderRadius: 14,
    backgroundColor: 'rgba(95,184,168,0.05)',
    borderWidth: 1, borderColor: 'rgba(95,184,168,0.18)',
  },
  assessoriaCard: {
    marginHorizontal: 20, marginTop: 12,
    padding: 18, borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.line,
  },
  infoTitle: {
    fontFamily: 'BebasNeue_400Regular', fontSize: 22,
    color: colors.text, letterSpacing: 0.4, marginBottom: 8, lineHeight: 24,
  },
  infoText: {
    fontFamily: font.body, fontSize: 13,
    color: colors.textDim, lineHeight: 20,
  },

  // CTA
  ctaWrap: { padding: 20, paddingTop: 24 },
  ctaBtn: {
    backgroundColor: colors.brand, borderRadius: 14,
    paddingVertical: 18, alignItems: 'center',
  },
  ctaBtnText: {
    fontFamily: 'BebasNeue_400Regular', fontSize: 22,
    color: colors.brandInk, letterSpacing: 1,
  },
  ctaHint: {
    fontFamily: font.body, fontSize: 11,
    color: colors.textMute, textAlign: 'center', marginTop: 10, lineHeight: 16,
  },
});
