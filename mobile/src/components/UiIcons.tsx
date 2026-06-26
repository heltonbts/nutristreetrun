import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '../lib/tokens';

/**
 * Ícones utilitários da UI (ações genéricas: criar, fechar, foto...).
 * Mesma família visual dos ReactionIcons: viewBox 24, stroke arredondado,
 * paths inspirados no Lucide pra serem reconhecíveis na hora.
 */

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/** "+" — usado em botões de criar/adicionar. */
export function PlusIcon({ size = 22, color = colors.text, strokeWidth = 2.4 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** Sino — central de notificações. */
export function BellIcon({ size = 22, color = colors.text, strokeWidth = 1.9 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Path
        d="M13.7 21a2 2 0 0 1-3.4 0"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** "✕" — usado em botões de fechar modal ou remover item. */
export function CloseIcon({ size = 20, color = colors.text, strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 6l12 12M18 6L6 18"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * Runner — corredor em movimento (substitui 🏃 nas linhas de atividade).
 * Outline puro pra casar com o resto da família (Fire/Clap/Comment).
 */
export function RunnerGlyph({ size = 22, color = colors.text, strokeWidth = 1.9 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* cabeça */}
      <Circle cx={15} cy={5} r={1.9} stroke={color} strokeWidth={strokeWidth} fill="none" />
      {/* tronco inclinado pra frente */}
      <Path d="M14.5 7.5 11 13" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* braço da frente (esticado pra frente e cima) */}
      <Path d="M14 9 18 11" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* braço de trás (dobrado pra trás) */}
      <Path d="M13 9.5 9 9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* perna da frente (joelho dobrado, pé apoiando) */}
      <Path
        d="M11 13 15 17 13.5 21"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* perna de trás (esticada empurrando) */}
      <Path
        d="M11 13 8 17 9 21"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Câmera — botão de adicionar foto. */
export function CameraIcon({ size = 22, color = colors.text, strokeWidth = 1.9 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14.5 4h-5L8 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4L14.5 4Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Circle cx={12} cy={13} r={3.5} stroke={color} strokeWidth={strokeWidth} fill="none" />
    </Svg>
  );
}

// ─── Stats icons (cartões de detalhe da corrida) ──────────────────────────────
// Família visual coesa: outline puro, viewBox 24, strokeWidth padrão 1.7.

/** Cronômetro — duração da corrida. */
export function StopwatchIcon({ size = 22, color = colors.text, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M10 2h4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M12 14V9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx={12} cy={14} r={8} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

/** Distância — bandeira/pino indicando trajeto. */
export function DistanceIcon({ size = 22, color = colors.text, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s-7-6.5-7-12a7 7 0 1 1 14 0c0 5.5-7 12-7 12Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={9} r={2.5} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

/** Pace — relógio com pequena seta indicando ritmo. */
export function PaceIcon({ size = 22, color = colors.text, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={strokeWidth} />
      <Path d="M12 7v5l3 2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** Velocidade — velocímetro estilizado (semicírculo + ponteiro). */
export function SpeedIcon({ size = 22, color = colors.text, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 17a8 8 0 1 1 16 0"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path d="M12 17 16 9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx={12} cy={17} r={1.3} fill={color} />
    </Svg>
  );
}

/** Chama — calorias (intencionalmente diferente do FireIcon de reação:
 *  esta é monoline, sem chama interna; menos chamativa, "decora" o stat). */
export function FlameStatIcon({ size = 22, color = colors.text, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Montanha — elevação (gain/loss/max). */
export function MountainIcon({ size = 22, color = colors.text, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 19 9 9l4 6 2-3 6 7Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Gota — hidratação / desidratação (estimativa). */
export function DropletIcon({ size = 22, color = colors.text, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.5c-3.5 4-6.5 7.2-6.5 11.5a6.5 6.5 0 0 0 13 0c0-4.3-3-7.5-6.5-11.5Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Pause — duas barras verticais (tempo parado). */
export function PauseIcon({ size = 22, color = colors.text, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={strokeWidth} />
      <Path d="M10 8.5v7M14 8.5v7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** Coração — frequência cardíaca. Outline (filled fica confuso em stat card). */
export function HeartIcon({ size = 22, color = colors.text, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s-7.5-5-7.5-11A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7.5 3c0 6-7.5 11-7.5 11Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
