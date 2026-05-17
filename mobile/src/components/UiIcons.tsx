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
