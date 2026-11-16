// Pip, always on hand in the side panel: tap for the next tip on this game.

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CREAM, GOLD, PixelText, Portrait } from './pixel';

/** `ask` reads the board for one concrete next move; with nothing to say, Pip falls back on his tips. */
export function PipHelp({ tips, ask }: { tips: string[]; ask?: () => string | null }) {
  const [next, setNext] = useState(0);
  const [tip, setTip] = useState<string | null>(null);
  return (
    <Pressable
      onPress={() => {
        const specific = ask?.();
        if (specific) return setTip(specific);
        setTip(tips[next % tips.length] ?? null);
        setNext(next + 1);
      }}
      accessibilityRole="button"
      accessibilityLabel={tip ? `Pip says: ${tip}. Tap for another tip` : 'Ask Pip for a tip'}
      style={styles.box}
    >
      <Portrait who="pip" size={36} />
      <View style={styles.text}>
        <PixelText size={14} color={GOLD} shadow>
          {tip ? 'Pip' : 'Stuck? Ask Pip'}
        </PixelText>
        {tip && (
          <PixelText size={14} color={CREAM}>
            {tip}
          </PixelText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: 'rgba(0,0,0,0.25)', padding: 6, borderRadius: 4 },
  text: { flex: 1, gap: 2 },
});
