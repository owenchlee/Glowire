// The game's 2D look, taken from the village pack's own dialogue boxes: dark ink outlines,
// cream panels with an orange frame, a brown name tab, teal portrait frames, and the
// pack's pixel font. Every screen in every world uses these, so it all feels like one game.

import type { ReactNode } from 'react';
import {
  Image,
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';

import { FACES } from './faces.generated';

export const PIXEL_FONT = 'PixelNormal';

export const INK = '#141b1b';
export const NIGHT = '#1b1f3b';
export const NIGHT_DEEP = '#0d0f1e';
export const CREAM = '#f2ecef';
export const CREAM_SHADE = '#d9cdd6';
export const ORANGE = '#e8955a';
export const ORANGE_DARK = '#b8613a';
export const BROWN = '#8e5040';
export const TEAL = '#5c8a87';
export const TEAL_DARK = '#2e4a4a';
export const GOLD = '#f4c542';
export const GOLD_DARK = '#c48a1c';
export const RED = '#d14b34';
export const GREEN = '#7fb042';
export const TEXT = '#2b2433';
export const TEXT_SOFT = '#6e5f72';

export function PixelText({
  children,
  size = 14,
  color = TEXT,
  style,
  shadow = false,
  numberOfLines,
}: {
  children: ReactNode;
  size?: number;
  color?: string;
  style?: TextStyle;
  /** A hard 1px ink shadow, for text on dark or busy backgrounds. */
  shadow?: boolean;
  numberOfLines?: number;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: PIXEL_FONT,
          fontSize: size,
          lineHeight: Math.round(size * 1.35),
          color,
        },
        shadow && styles.textShadow,
        style,
      ]}
    >
      {Array.isArray(children) ? children.map(spaced) : spaced(children)}
    </Text>
  );
}

/**
 * The pixel font's space has no width, so words run together. An en space is missing from
 * the font too, so the system draws it instead, at a sensible width.
 */
export function wideSpaces(text: string): string {
  return text.replace(/ /g, ' ');
}

const spaced = (c: ReactNode) => (typeof c === 'string' ? wideSpaces(c) : c);

/** A cream panel in an orange frame with an ink outline. */
export function Panel({
  children,
  style,
  tone = 'cream',
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'cream' | 'night';
}) {
  return (
    <View style={[styles.outline, style]}>
      <View style={[styles.frame, tone === 'night' && styles.frameNight]}>
        <View style={[styles.fill, tone === 'night' && styles.fillNight]}>{children}</View>
      </View>
    </View>
  );
}

/** The brown tab that sits on top of a panel, holding a name. */
export function NameTab({ name }: { name: string }) {
  return (
    <View style={styles.tab}>
      <PixelText size={13} color={CREAM} shadow>
        {name}
      </PixelText>
    </View>
  );
}

type ButtonTone = 'orange' | 'gold' | 'teal' | 'cream';
const BUTTON: Record<ButtonTone, { face: string; lip: string; text: string }> = {
  orange: { face: ORANGE, lip: ORANGE_DARK, text: CREAM },
  gold: { face: GOLD, lip: GOLD_DARK, text: TEXT },
  teal: { face: TEAL, lip: TEAL_DARK, text: CREAM },
  cream: { face: CREAM, lip: CREAM_SHADE, text: TEXT },
};

/** A chunky button that presses down. */
export function PixelButton({
  label,
  onPress,
  tone = 'orange',
  size = 14,
  disabled = false,
  style,
  icon,
}: {
  label: string;
  onPress: () => void;
  tone?: ButtonTone;
  size?: number;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: ReactNode;
}) {
  const c = BUTTON[tone];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[disabled && styles.disabled, style]}
    >
      {({ pressed }) => (
        <View style={[styles.buttonOutline, { marginTop: pressed ? 3 : 0 }]}>
          <View
            style={[
              styles.buttonFace,
              { backgroundColor: c.face, borderBottomColor: c.lip, borderBottomWidth: pressed ? 1 : 4 },
            ]}
          >
            {icon}
            <PixelText size={size} color={c.text} shadow={c.text === CREAM}>
              {label}
            </PixelText>
          </View>
        </View>
      )}
    </Pressable>
  );
}

/** A townsperson's portrait in its teal frame. */
export function Portrait({ who, size = 76 }: { who: string; size?: number }) {
  const face = FACES[who];
  return (
    <View style={[styles.faceOutline, { width: size + 10, height: size + 10 }]}>
      <View style={styles.faceFrame}>
        {face !== undefined && <Image source={face} style={{ width: size, height: size }} />}
      </View>
    </View>
  );
}

/** A small dark pill for the HUD: an icon and a number. */
export function Counter({ icon, value, color = GOLD }: { icon: string; value: number | string; color?: string }) {
  return (
    <View style={styles.counter}>
      <PixelText size={14} color={color} shadow>
        {icon}
      </PixelText>
      <PixelText size={14} color={CREAM} shadow>
        {String(value)}
      </PixelText>
    </View>
  );
}

const styles = StyleSheet.create({
  textShadow: {
    textShadowColor: INK,
    textShadowOffset: { width: 1, height: 1.5 },
    textShadowRadius: 0.1,
  },
  outline: { borderWidth: 2, borderColor: INK, borderRadius: 6, backgroundColor: INK },
  frame: { borderWidth: 3, borderColor: ORANGE, borderRadius: 4 },
  frameNight: { borderColor: TEAL },
  fill: { backgroundColor: CREAM, borderRadius: 1, padding: 12 },
  fillNight: { backgroundColor: NIGHT },
  tab: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingTop: 3,
    paddingBottom: 5,
    marginLeft: 8,
    marginBottom: -4,
    backgroundColor: BROWN,
    borderWidth: 2,
    borderColor: INK,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    zIndex: 1,
  },
  buttonOutline: { borderWidth: 2, borderColor: INK, borderRadius: 6, backgroundColor: INK },
  buttonFace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingTop: 7,
    paddingBottom: 5,
    borderRadius: 4,
  },
  disabled: { opacity: 0.45 },
  faceOutline: {
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 5,
    backgroundColor: TEAL,
    padding: 3,
  },
  faceFrame: { flex: 1, backgroundColor: INK, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(13,15,30,0.82)',
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 6,
  },
});
