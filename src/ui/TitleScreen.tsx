// The home screen: Glowtown at night fills the screen, and the menu sits on the dark side
// of it. Two ways in: the Story (pick a world) and today's Daily Puzzle.

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { currentBrainStreak, currentStreak, dayKey, totalStars } from '../game/save';
import { CREAM, Counter, GOLD, PixelText } from './pixel';
import { useGame } from './game';
import { TitleBackdrop } from './TitleBackdrop';
import { SoundToggle } from './SoundToggle';
import { startMusic } from '../audio/audio';
import { BrainDailyCard, DailyCard, GlowLogo, Rise } from './WorldSelect';

interface Item {
  label: string;
  note?: string;
  big?: boolean;
  go: () => void;
}

export function TitleScreen() {
  const { save } = useGame();
  const [daily, setDaily] = useState(false);
  useEffect(() => startMusic(), []);
  const today = dayKey(new Date());
  const streak = Math.max(currentStreak(save, today), currentBrainStreak(save, today));
  const dailyDone = (save.daily.stars[today] ?? 0) > 0 && (save.brainDaily.stars[today] ?? 0) > 0;

  const items: Item[] = [
    { label: 'Story', note: 'Light the towns back up', big: true, go: () => router.push('/story') },
    {
      label: 'Daily Puzzle',
      note: dailyDone ? 'Done for today ★' : streak > 0 ? `${streak}-day streak` : 'A new one every day',
      big: true,
      go: () => setDaily(true),
    },
    { label: 'Lucky Lantern', go: () => router.push('/casino') },
    { label: 'Shop', go: () => router.push('/shop') },
    { label: 'Journal', go: () => router.push('/journal') },
  ];

  return (
    <View style={styles.screen}>
      <View style={StyleSheet.absoluteFill}>
        <TitleBackdrop />
      </View>
      {/* The menu side fades to night in hard pixel steps, like the light in the world. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {[38, 46, 54, 62].map((left) => (
          <View key={left} style={[styles.shade, { left: `${left}%` }]} />
        ))}
      </View>
      <SafeAreaView style={styles.flex} edges={['left', 'right', 'top', 'bottom']}>
        <View style={styles.counters}>
          <Counter icon="⚡" value={save.sparks} />
          <Counter icon="★" value={totalStars(save)} />
          <SoundToggle />
        </View>
        <View style={styles.side}>
          <Rise index={0}>
            <GlowLogo size={92} />
            <PixelText size={20} color="#c9c3e6" shadow style={styles.tagline}>
              Every light went out at once. Find out why.
            </PixelText>
          </Rise>
          {daily ? (
            <Rise index={1}>
              <View style={styles.dailies}>
                <DailyCard />
                <BrainDailyCard />
              </View>
              <MenuEntry item={{ label: '‹ Back', go: () => setDaily(false) }} />
            </Rise>
          ) : (
            <Menu items={items} />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

/** The menu: hover or arrow keys pick an entry, click / Enter goes. */
function Menu({ items }: { items: Item[] }) {
  const [focus, setFocus] = useState(0);
  // Focus effect, not plain effect: this screen stays mounted under the game, where Space must not open the menu.
  useFocusEffect(useCallback(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 's') setFocus((f) => (f + 1) % items.length);
      else if (e.key === 'ArrowUp' || e.key === 'w') setFocus((f) => (f + items.length - 1) % items.length);
      else if (e.key === 'Enter' || e.key === ' ') items[focus]?.go();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items, focus]));
  return (
    <View style={styles.menu}>
      {items.map((item, i) => (
        <Rise key={item.label} index={i + 1}>
          <MenuEntry item={item} active={i === focus} onHover={() => setFocus(i)} />
        </Rise>
      ))}
    </View>
  );
}

function MenuEntry({ item, active = false, onHover }: { item: Item; active?: boolean; onHover?: () => void }) {
  return (
    <Pressable
      onPress={item.go}
      onHoverIn={onHover}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      style={[styles.entry, item.big && styles.entryBig]}
    >
      <View style={styles.entryRow}>
        <PixelText size={item.big ? 26 : 18} color={GOLD} style={{ ...styles.spark, opacity: active ? 1 : 0 }}>
          ⚡
        </PixelText>
        <PixelText size={item.big ? 44 : 26} color={active ? GOLD : CREAM} shadow>
          {item.label}
        </PixelText>
      </View>
      {item.note && (
        <PixelText size={16} color={active ? '#ffe9a8' : '#a9a2cc'} shadow style={styles.note}>
          {item.note}
        </PixelText>
      )}
      <View style={[styles.underline, !active && styles.hidden]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0d0f1e' },
  flex: { flex: 1 },
  shade: { position: 'absolute', top: 0, bottom: 0, right: 0, backgroundColor: 'rgba(9, 10, 24, 0.24)' },
  counters: { position: 'absolute', top: 14, right: 20, flexDirection: 'row', gap: 8 },
  side: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '42%', minWidth: 300, paddingHorizontal: 28, justifyContent: 'center' },
  tagline: { marginTop: 6, marginBottom: 30 },
  menu: { gap: 8 },
  entry: { paddingVertical: 4, alignSelf: 'flex-start' },
  entryBig: { paddingVertical: 8 },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  spark: { width: 32 },
  hidden: { opacity: 0 },
  note: { marginLeft: 40, marginTop: 2 },
  underline: { height: 4, marginLeft: 40, marginTop: 4, backgroundColor: GOLD, opacity: 0.8 },
  dailies: { gap: 12, marginBottom: 12 },
});
