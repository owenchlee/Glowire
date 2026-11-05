// The journal: everything you've found out. Marigold's notebook pages, the secrets you've
// stumbled on (odd things, and the Lantern Lady), and what you know about each townsperson.
// Things not found yet show as "???", so there's always a reason to look harder.

import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CAST } from '../game/cast';
import { GAMES, type GameId } from '../game/games';
import { PERSON_SECRETS, SECRETS, type Secret, secretKey } from '../game/lore';
import { NOTES, type Line } from '../game/story';
import { speakerName } from './Dialog';
import { useGame } from './game';
import {
  CREAM,
  GOLD,
  INK,
  NIGHT,
  NIGHT_DEEP,
  NameTab,
  Panel,
  PixelButton,
  PixelText,
  Portrait,
  TEXT_SOFT,
} from './pixel';

type Tab = 'notebook' | 'secrets' | 'people';

const WORLD_NAMES = { glowtown: 'Glowtown', harbour: 'Driftwood Harbour', mossbell: 'Mossbell Hollow', deep: 'Brightwater Deep' } as const;

/** People with a page in the journal: anyone with a secret to tell. */
const PEOPLE = Object.keys(PERSON_SECRETS);

export function Journal() {
  const { save } = useGame();
  const [tab, setTab] = useState<Tab>('notebook');
  const [open, setOpen] = useState<{ title: string; lines: Line[] } | null>(null);
  const seen = (key: string) => save.seen.includes(key);

  const pages = Object.values(NOTES).sort((a, b) => a.page - b.page);
  const places = Object.values(SECRETS).filter((s) => !s.about);
  const counts = {
    notebook: `${pages.filter((n) => seen(`note:${n.id}`)).length}/${pages.length}`,
    secrets: `${places.filter((s) => seen(secretKey(s.id))).length}/${places.length}`,
    people: `${PEOPLE.filter((p) => seen(secretKey(PERSON_SECRETS[p]!.secret))).length}/${PEOPLE.length}`,
  };

  const entry = (key: string, found: boolean, title: string, sub: string, lines: Line[], who?: string) => (
    <Pressable key={key} onPress={() => found && setOpen({ title, lines })} style={[styles.entry, !found && styles.entryHidden]}>
      {who && <Portrait who={found ? who : 'pip'} size={34} />}
      <View style={styles.flex}>
        <PixelText size={13} color={found ? '#3d2c22' : TEXT_SOFT}>
          {found ? title : '???'}
        </PixelText>
        <PixelText size={10} color={TEXT_SOFT}>
          {sub}
        </PixelText>
      </View>
      {found && (
        <PixelText size={13} color="#3d2c22">
          ›
        </PixelText>
      )}
    </Pressable>
  );

  const byWorld = (list: Secret[]) =>
    (Object.keys(WORLD_NAMES) as (keyof typeof WORLD_NAMES)[]).map((w) => {
      const here = list.filter((s) => s.world === w);
      return (
        <View key={w} style={styles.group}>
          <PixelText size={12} color={GOLD} shadow>
            {WORLD_NAMES[w]}
          </PixelText>
          {here.map((s) => entry(s.id, seen(secretKey(s.id)), s.title, seen(secretKey(s.id)) ? 'Tap to read again' : s.unlock ? `Puzzle prize: score ${s.unlock.score} in ${GAMES[s.unlock.game as GameId]?.title ?? 'a puzzle'}` : 'Not found yet. Look closely…', s.lines))}
        </View>
      );
    });

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <View style={styles.side}>
        <View style={styles.row}>
          <PixelButton label="‹" tone="cream" size={16} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          <PixelText size={18} color={GOLD} shadow style={styles.flex}>
            Journal
          </PixelText>
        </View>
        {(['notebook', 'secrets', 'people'] as const).map((t) => (
          <PixelButton
            key={t}
            label={`${{ notebook: 'Notebook', secrets: 'Secrets', people: 'People' }[t]}  ${counts[t]}`}
            tone={tab === t ? 'gold' : 'teal'}
            size={13}
            onPress={() => {
              setTab(t);
              setOpen(null);
            }}
          />
        ))}
        <View style={styles.flex} />
        <PixelText size={11} color="#c9c3e6" shadow>
          {tab === 'notebook'
            ? 'Marigold hid the pages of her notebook all along the Glowire.'
            : tab === 'secrets'
              ? 'Odd things are going on. Twinkles mark something worth a closer look.'
              : 'Help people, then talk to them again. Some have more to say.'}
        </PixelText>
      </View>

      <View style={styles.main}>
        {open ? (
          <ScrollView contentContainerStyle={styles.reading}>
            <PixelText size={16} color={GOLD} shadow>
              {open.title}
            </PixelText>
            {open.lines.map((l, i) => (
              <View key={i}>
                <NameTab name={speakerName(l.who)} />
                <Panel>
                  <PixelText size={13}>{l.text}</PixelText>
                </Panel>
              </View>
            ))}
            <PixelButton label="Back" tone="cream" size={13} onPress={() => setOpen(null)} />
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {tab === 'notebook' &&
              pages.map((n) =>
                entry(n.id, seen(`note:${n.id}`), `Page ${n.page}: ${n.title}`, seen(`note:${n.id}`) ? 'Marigold’s notebook' : `Page ${n.page} is still out there somewhere`, n.lines),
              )}
            {tab === 'secrets' && byWorld(places)}
            {tab === 'people' &&
              PEOPLE.map((who) => {
                const s = SECRETS[PERSON_SECRETS[who]!.secret]!;
                const found = seen(secretKey(s.id));
                const name = CAST[who]?.name ?? speakerName(who);
                return entry(who, found, `${name}: ${s.title}`, found ? (CAST[who]?.role ?? '') : `${name} knows something. Help them, then ask.`, s.lines, who);
              })}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, flexDirection: 'row', backgroundColor: NIGHT_DEEP },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  side: { width: 250, padding: 12, gap: 8, backgroundColor: NIGHT, borderRightWidth: 2, borderColor: INK },
  main: { flex: 1 },
  list: { padding: 14, gap: 8 },
  group: { gap: 6, marginBottom: 8 },
  reading: { padding: 16, gap: 10, maxWidth: 640 },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    backgroundColor: CREAM,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 4,
  },
  entryHidden: { opacity: 0.55 },
});
