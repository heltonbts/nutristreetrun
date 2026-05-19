import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors, font } from '../lib/tokens';

interface HomeBannerProps {
  kicker?: string;
  title?: string;
  subtitle?: string;
  onPress?: () => void;
}

/**
 * Banner fixo da home (Opção B): arte de fundo cobrindo todo o card + escurecimento
 * gradiente da esquerda (zona calma, onde fica o texto) pra direita. A copy é nativa
 * e editável — a imagem (mobile/assets/home-banner.png) é só visual, sem texto.
 * Clicável: leva à tela "Como funciona" (passa onPress).
 */
export function HomeBanner({
  kicker = 'NUTRISTREET RUN',
  title = 'Corra. Coma bem. Evolua.',
  subtitle = 'Rastreie suas corridas por GPS e cumpra desafios mensais de quem corre na rua.',
  onPress,
}: HomeBannerProps) {
  return (
    <Pressable
      style={({ pressed }) => [s.wrap, pressed && onPress && { opacity: 0.85 }]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel="Saiba como o NutriStreet Run funciona"
    >
      <ImageBackground
        source={require('../../assets/home-banner.png')}
        style={s.bg}
        imageStyle={s.bgImage}
        resizeMode="cover"
      >
        {/* Escurecimento gradiente: forte à esquerda (legibilidade), suave à direita */}
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <LinearGradient id="banner-shade" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={colors.bg} stopOpacity={0.92} />
              <Stop offset="0.55" stopColor={colors.bg} stopOpacity={0.6} />
              <Stop offset="1" stopColor={colors.bg} stopOpacity={0.15} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#banner-shade)" />
        </Svg>

        <View style={s.content}>
          <Text style={s.kicker}>{kicker}</Text>
          <Text style={s.title}>{title}</Text>
          <Text style={s.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
          {onPress && <Text style={s.cta}>Como funciona ›</Text>}
        </View>
      </ImageBackground>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
  },
  bg: {
    height: 140,
    justifyContent: 'center',
  },
  bgImage: {
    borderRadius: 16,
  },
  content: {
    paddingHorizontal: 18,
    width: '72%',
  },
  kicker: {
    fontFamily: font.bodyBold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.brand,
    marginBottom: 6,
  },
  title: {
    fontFamily: font.bodyBold,
    fontSize: 19,
    color: colors.text,
    marginBottom: 5,
  },
  subtitle: {
    fontFamily: font.body,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textDim,
  },
  cta: {
    fontFamily: font.bodyBold,
    fontSize: 12,
    color: colors.brand,
    marginTop: 8,
    letterSpacing: 0.3,
  },
});
