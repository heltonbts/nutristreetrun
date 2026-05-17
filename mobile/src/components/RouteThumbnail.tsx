import polylineCodec from '@mapbox/polyline';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

import { colors } from '../lib/tokens';

/**
 * Mini-desenho do traçado de uma corrida (decodifica o polyline Google e
 * desenha em SVG puro, sem nomes de rua). Usado em listas/cards onde um
 * mapa interativo seria pesado e o objetivo é só "dar identidade visual"
 * à corrida pelo formato do percurso.
 *
 * Fallback: se polyline ausente/curto, devolve null (caller decide o que mostrar).
 */

type LatLng = { lat: number; lng: number };

function decode(encoded: string): LatLng[] {
  try {
    const pairs = polylineCodec.decode(encoded);
    if (pairs.length < 2) return [];
    return pairs.map(([lat, lng]) => ({ lat, lng }));
  } catch {
    return [];
  }
}

function projectPoints(coords: LatLng[], w: number, h: number, pad: number): string {
  let minLat = coords[0].lat;
  let maxLat = coords[0].lat;
  let minLng = coords[0].lng;
  let maxLng = coords[0].lng;
  for (const c of coords) {
    if (c.lat < minLat) minLat = c.lat;
    if (c.lat > maxLat) maxLat = c.lat;
    if (c.lng < minLng) minLng = c.lng;
    if (c.lng > maxLng) maxLng = c.lng;
  }
  const midLat = (minLat + maxLat) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180); // compressão da longitude
  const spanX = Math.max((maxLng - minLng) * kx, 1e-9);
  const spanY = Math.max(maxLat - minLat, 1e-9);
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const scale = Math.min(innerW / spanX, innerH / spanY);
  const drawW = spanX * scale;
  const drawH = spanY * scale;
  const offX = pad + (innerW - drawW) / 2;
  const offY = pad + (innerH - drawH) / 2;
  return coords
    .map((c) => {
      const x = offX + (c.lng - minLng) * kx * scale;
      const y = offY + (maxLat - c.lat) * scale; // y invertido (tela cresce p/ baixo)
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

interface Props {
  encoded: string | null | undefined;
  size: number;
  /** padding interno (default 4) — quanto menor, mais o traço ocupa o espaço */
  padding?: number;
  /** cor da linha (default brand) */
  color?: string;
  strokeWidth?: number;
}

export function RouteThumbnail({
  encoded,
  size,
  padding = 4,
  color = colors.brand,
  strokeWidth = 2,
}: Props) {
  const coords = useMemo(() => (encoded ? decode(encoded) : []), [encoded]);
  const [w, setW] = useState(0);
  const pts = useMemo(
    () => (w > 0 && coords.length > 1 ? projectPoints(coords, w, w, padding) : ''),
    [coords, w, padding],
  );

  if (coords.length < 2) return null;

  return (
    <View style={{ width: size, height: size }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && pts ? (
        <Svg width={w} height={w}>
          <Polyline
            points={pts}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </Svg>
      ) : null}
    </View>
  );
}
