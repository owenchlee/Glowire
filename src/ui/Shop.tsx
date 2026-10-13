// Gran's gadget shop: pets that help on jobs, wire glow colours and workbench colours.

import { router } from 'expo-router';
import { useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BOARDS, type BoardItem, type ItemKind, OUTFITS, PETS, type ShopItem, WIRES, type WireItem, outfitSprite } from '../game/shop';
import { FACES } from './faces.generated';
import { useGame } from './game';
import { buzz } from './haptics';
import {
  CREAM,
  Counter,
  GOLD,
  INK,
  NIGHT,
  NIGHT_DEEP,
  NameTab,
  Panel,
  PixelButton,
  PixelText,
  Portrait,
  TEAL,
  TEXT_SOFT,
} from './pixel';

const TABS: { kind: ItemKind; label: string; items: ShopItem[]; blurb: string }[] = [
  {
    kind: 'pet',
    label: 'Pets',
    items: PETS,
    blurb: 'Pets follow you around town and help on jobs. Tap your pet on the job screen.',
  },
  { kind: 'outfit', label: 'Outfits', items: OUTFITS, blurb: 'What you wear around town.' },
  { kind: 'wire', label: 'Wire glow', items: WIRES, blurb: 'The colour your wires glow when current flows.' },
  { kind: 'board', label: 'Workbench', items: BOARDS, blurb: 'The light over your workbench.' },
];

export function Shop() {
  const { save, buy, equip } = useGame();
  const [tab, setTab] = useState<ItemKind>('pet');
  const [message, setMessage] = useState('Welcome, dear! Spend your sparks wisely. Or don’t, I won’t tell.');
  const current = TABS.find((t) => t.kind === tab)!;
  const equipped = (it: ShopItem) => (it.kind === 'pet' ? save.equipped.pet === it.id : save.equipped[it.kind] === it.id);

  const onItem = (it: ShopItem) => {
    if (save.owned.includes(it.id)) {
      equip(it.id);
      buzz.tap();
      setMessage(
        it.kind === 'pet' && equipped(it)
          ? `${it.name} is staying home for now.`
          : `${it.name}: ${it.kind === 'pet' ? 'ready for work!' : 'lovely choice.'}`,
      );
      return;
    }
    if (save.sparks < it.price) {
      buzz.oops();
      setMessage(`${it.name} costs ⚡${it.price}. Fix a few more lights and come back!`);
      return;
    }
    if (buy(it.id)) {
      buzz.win();
      setMessage(`${it.name} is yours! ${it.kind === 'pet' ? it.power : ''}`);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <View style={styles.side}>
        <View style={styles.row}>
          <PixelButton
            label="‹"
            tone="cream"
            size={16}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
          <PixelText size={18} color={GOLD} shadow style={styles.flex}>
            Gran’s Gadgets
          </PixelText>
        </View>
        <Counter icon="⚡" value={save.sparks} />
        <View style={styles.flex} />
        <View style={styles.row}>
          <Portrait who="gran" size={64} />
        </View>
        <View>
          <NameTab name="Gran Watts" />
          <Panel>
            <PixelText size={13}>{message}</PixelText>
          </Panel>
        </View>
      </View>

      <View style={styles.main}>
        <View style={styles.tabs}>
          {TABS.map((t) => (
            <PixelButton key={t.kind} label={t.label} size={13} tone={tab === t.kind ? 'gold' : 'teal'} onPress={() => setTab(t.kind)} />
          ))}
          <PixelButton label="Outfits (soon)" size={13} tone="teal" disabled onPress={() => {}} />
        </View>
        <PixelText size={12} color="#c9c3e6" shadow style={styles.blurb}>
          {current.blurb}
        </PixelText>
        <ScrollView horizontal contentContainerStyle={styles.cards} showsHorizontalScrollIndicator={false}>
          {current.items.map((it) => {
            const owned = save.owned.includes(it.id);
            const on = equipped(it);
            const poor = !owned && save.sparks < it.price;
            return (
              <Panel key={it.id} style={[styles.card, on && styles.cardOn]}>
                <View style={styles.preview}>
                  <Preview item={it} />
                </View>
                <PixelText size={14}>{it.name}</PixelText>
                <PixelText size={11} color={TEXT_SOFT} style={styles.itemBlurb}>
                  {it.kind === 'pet' ? it.power : it.blurb}
                </PixelText>
                <PixelButton
                  label={on ? (it.kind === 'pet' ? 'With you ✓' : 'Using ✓') : owned ? 'Use' : `⚡ ${it.price}`}
                  tone={on ? 'teal' : owned ? 'cream' : 'gold'}
                  size={13}
                  disabled={poor}
                  onPress={() => onItem(it)}
                />
              </Panel>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function Preview({ item }: { item: ShopItem }) {
  switch (item.kind) {
    case 'pet':
      return <Image source={FACES[item.id]} style={styles.face} />;
    case 'wire':
      return <WireSwatch wire={item} />;
    case 'board':
      return <BenchSwatch board={item} />;
    case 'outfit':
      return <Image source={FACES[outfitSprite(item.id)]} style={styles.face} />;
    case 'hat':
      return null;
  }
}

/** A short glowing wire into a lit bulb, drawn in chunky pixels. */
function WireSwatch({ wire }: { wire: WireItem }) {
  return (
    <View style={styles.swatch}>
      <View style={[styles.wireGlow, { backgroundColor: wire.glow }]} />
      <View style={[styles.wire, { backgroundColor: wire.color }]} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.spark, { left: 18 + i * 22 }]} />
      ))}
    </View>
  );
}

function BenchSwatch({ board }: { board: BoardItem }) {
  return (
    <View style={[styles.bench, { backgroundColor: board.side }]}>
      {[0, 1, 2].map((y) => (
        <View key={y} style={styles.benchRow}>
          {[0, 1, 2].map((x) => (
            <View key={x} style={[styles.benchCell, { backgroundColor: (x + y) % 2 ? board.cellB : board.cellA }]} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, flexDirection: 'row', backgroundColor: NIGHT_DEEP },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  side: { width: 250, padding: 12, gap: 8, backgroundColor: NIGHT, borderRightWidth: 2, borderColor: INK },
  main: { flex: 1, paddingTop: 12 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, flexWrap: 'wrap' },
  blurb: { paddingHorizontal: 16, paddingTop: 8 },
  cards: { gap: 14, padding: 14, alignItems: 'flex-start' },
  card: { width: 178 },
  cardOn: { borderColor: TEAL },
  preview: { height: 82, alignItems: 'center', justifyContent: 'center' },
  itemBlurb: { minHeight: 46, marginVertical: 4 },
  face: { width: 76, height: 76, borderWidth: 2, borderColor: INK, borderRadius: 4 },
  swatch: { width: 96, height: 60, justifyContent: 'center' },
  wireGlow: { position: 'absolute', left: 4, right: 4, height: 18, opacity: 0.4, borderRadius: 2 },
  wire: { height: 8, marginHorizontal: 8, borderWidth: 2, borderColor: INK },
  spark: { position: 'absolute', top: 27, width: 6, height: 6, backgroundColor: CREAM },
  bench: { padding: 5, borderWidth: 2, borderColor: INK, borderRadius: 4 },
  benchRow: { flexDirection: 'row' },
  benchCell: { width: 20, height: 18 },
});
