// Small shared pieces: buttons, the sparks counter, rows of stars.

import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { COLORS } from '../render/theme';

export const shadow = {
  shadowColor: '#6e5f8a',
  shadowOpacity: 0.12,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
};

export function Button({
  label,
  onPress,
  disabled = false,
  primary = false,
  tone,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  /** A background colour for special buttons (daily, shop…). */
  tone?: string;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        primary && styles.primary,
        tone ? { backgroundColor: tone } : null,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.buttonText, (primary || tone) && styles.lightText]}>{label}</Text>
    </Pressable>
  );
}

export function Sparks({ amount, dark = false }: { amount: number; dark?: boolean }) {
  return (
    <View style={[styles.pill, dark && styles.pillDark]}>
      <Text style={styles.bolt}>⚡</Text>
      <Text style={[styles.pillText, dark && styles.lightText]}>{amount}</Text>
    </View>
  );
}

export function Stars({
  earned,
  size = 16,
  dark = false,
}: {
  earned: number;
  size?: number;
  dark?: boolean;
}) {
  return (
    <View style={styles.stars}>
      {[0, 1, 2].map((i) => (
        <Text
          key={i}
          style={{
            fontSize: size,
            lineHeight: size * 1.2,
            color: i < earned ? '#ffc93c' : dark ? 'rgba(255,255,255,0.28)' : '#d9cfe0',
          }}
        >
          ★
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    ...shadow,
  },
  primary: { backgroundColor: COLORS.success },
  pressed: { transform: [{ scale: 0.95 }] },
  disabled: { opacity: 0.4 },
  buttonText: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  lightText: { color: '#fff' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    ...shadow,
  },
  pillDark: { backgroundColor: 'rgba(255,255,255,0.14)', shadowOpacity: 0 },
  bolt: { fontSize: 14 },
  pillText: { fontSize: 15, fontWeight: '900', color: COLORS.text },
  stars: { flexDirection: 'row', gap: 1 },
});
