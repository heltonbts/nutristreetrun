import { Circle, Path, Rect, Svg } from 'react-native-svg';

type TabName = 'home' | 'ranking' | 'feed' | 'runs' | 'profile';

export function TabIcon({ name, color }: { name: TabName; color: string }) {
  switch (name) {
    case 'home':
      return (
        <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
          <Path
            d="M3 9.5L11 3l8 6.5V19a1 1 0 0 1-1 1h-4v-6h-6v6H4a1 1 0 0 1-1-1V9.5Z"
            stroke={color}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'ranking':
      return (
        <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
          <Rect x={3} y={11} width={4.5} height={8} rx={1} stroke={color} strokeWidth={1.8} />
          <Rect x={8.75} y={6} width={4.5} height={13} rx={1} stroke={color} strokeWidth={1.8} />
          <Rect x={14.5} y={2} width={4.5} height={17} rx={1} stroke={color} strokeWidth={1.8} />
        </Svg>
      );
    case 'feed':
      return (
        <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
          <Circle cx={7.5} cy={8} r={3} stroke={color} strokeWidth={1.8} />
          <Circle cx={15} cy={6} r={2.2} stroke={color} strokeWidth={1.8} />
          <Path
            d="M2 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M12.5 14c0-2 2-3.5 4-3.5s3.5 1.5 3.5 3.5"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </Svg>
      );
    case 'runs':
      return (
        <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
          <Circle cx={14.5} cy={3.5} r={2} stroke={color} strokeWidth={1.8} />
          <Path
            d="M5 18l3-3 2-3 3 1 3 5M9 11l-2-3-3 2M13 13l3-2"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'profile':
      return (
        <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
          <Circle cx={11} cy={7} r={3.5} stroke={color} strokeWidth={1.8} />
          <Path
            d="M3.5 19c0-4 3.5-6.5 7.5-6.5s7.5 2.5 7.5 6.5"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </Svg>
      );
  }
}
