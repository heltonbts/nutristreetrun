import Svg, { Path } from 'react-native-svg';

import { colors } from '../lib/tokens';

/**
 * Ícones de reação do feed — SVGs próprios.
 * Paths inspirados no design Lucide (MIT) pra serem reconhecíveis na hora,
 * com peso/proporção ajustados pra identidade NSR. Cada ícone responde a:
 *   - active: preenche com brand, contraste interno em brandInk
 *   - inactive: outline em inactiveColor (default textMute)
 */

interface IconProps {
  active?: boolean;
  size?: number;
  /** cor de stroke quando inativo; ativo usa sempre brand */
  inactiveColor?: string;
}

const STROKE = 1.9;

function colorOf(active: boolean | undefined, inactive: string | undefined) {
  return active ? colors.brand : (inactive ?? colors.textMute);
}

/** Fire — chama com a forma ondulada clássica. Reação "fire". */
export function FireIcon({ active, size = 22, inactiveColor }: IconProps) {
  const c = colorOf(active, inactiveColor);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5Z"
        fill={active ? c : 'none'}
        stroke={c}
        strokeWidth={STROKE}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * Clap — joinha (thumbs-up). Universalmente entendido como "curti/apoio".
 * Tipo no backend continua `clap` (compatibilidade); só o visual mudou
 * pra um ícone óbvio em vez do clap simbólico que não estava lendo bem.
 */
export function ClapIcon({ active, size = 22, inactiveColor }: IconProps) {
  const c = colorOf(active, inactiveColor);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* dedo + braço */}
      <Path
        d="M7 22V10"
        stroke={c}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* mão fechada apontando pra cima */}
      <Path
        d="M14 5.88 13 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 16.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L11 2a3.13 3.13 0 0 1 3 3.88Z"
        fill={active ? c : 'none'}
        stroke={c}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Comment — balão de fala com duas linhas representando texto.
 * Substitui o 💬 emoji. Forma quadrada com cauda no canto inferior esquerdo.
 */
export function CommentIcon({ active, size = 22, inactiveColor }: IconProps) {
  const c = colorOf(active, inactiveColor);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* balão com cauda */}
      <Path
        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
        fill={active ? c : 'none'}
        stroke={c}
        strokeWidth={STROKE}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* linhas de texto dentro do balão */}
      <Path
        d="M8 10.5h7M8 13.5h4"
        stroke={active ? colors.brandInk : c}
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
    </Svg>
  );
}
