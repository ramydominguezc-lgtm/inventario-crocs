import { useColorScheme } from 'react-native';

const light = {
  bg: '#FFFFFF',
  surface: '#F5F5F5',
  border: '#F0F0F0',
  borderInput: '#E8E8E8',
  text: '#000000',
  textSub: '#555555',
  textMuted: '#888888',
  textFaint: '#AAAAAA',
  textPlaceholder: '#CCCCCC',
  accent: '#000000',
  accentFg: '#FFFFFF',
  accentMuted: '#333333',
  danger: '#FF3B30',
  warning: '#FF9500',
  success: '#34C759',
  chipBorder: '#E0E0E0',
  chipSelectedBg: '#000000',
  chipSelectedBorder: '#000000',
  chipSelectedText: '#FFFFFF',
  stockBajoBg: '#FFF3E0',
  stockBajoBorder: '#FF9500',
  stockBajoText: '#FF9500',
};

const dark: typeof light = {
  bg: '#000000',
  surface: '#1C1C1E',
  border: '#2C2C2E',
  borderInput: '#3A3A3C',
  text: '#FFFFFF',
  textSub: '#ABABAB',
  textMuted: '#8E8E93',
  textFaint: '#636366',
  textPlaceholder: '#48484A',
  accent: '#FFFFFF',
  accentFg: '#000000',
  accentMuted: '#DDDDDD',
  danger: '#FF453A',
  warning: '#FF9F0A',
  success: '#32D74B',
  chipBorder: '#3A3A3C',
  chipSelectedBg: '#FFFFFF',
  chipSelectedBorder: '#FFFFFF',
  chipSelectedText: '#000000',
  stockBajoBg: '#2C1E00',
  stockBajoBorder: '#FF9F0A',
  stockBajoText: '#FF9F0A',
};

export type Colors = typeof light;

export function useColors(): Colors {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}

export const LOW_STOCK_THRESHOLD = 5;
