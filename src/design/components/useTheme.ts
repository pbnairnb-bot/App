import { useColorScheme } from 'react-native';
import { colors, Colors } from '../theme';

/** Current colour set, following the phone's light/dark setting. */
export function useTheme(): Colors {
  return useColorScheme() === 'dark' ? colors.dark : colors.light;
}
