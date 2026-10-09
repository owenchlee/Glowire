// Gran's shop: pets (tools), wire colours, board themes and hats for Pip.

import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import {
  BOARDS,
  type BoardItem,
  HATS,
  type ItemKind,
  PETS,
  type ShopItem,
  WIRES,
  type WireItem,
} from '../game/shop';
import { COLORS } from '../render/theme';
import { Pet } from './characters/Pets';
import { Pip } from './characters/Pip';
import { useGame } from './game';
import { buzz } from './haptics';
import { Button, Sparks, shadow } from './kit';

const TABS: { kind: ItemKind; label: string; items: ShopItem[]; blurb: string }[] = [
  {
    kind: 'pet',
    label: 'Pets',
    items: PETS,
    blurb: 'Pets come with you on jobs. Tap your pet on the job screen to use its trick.',
  },
  { kind: 'wire', label: 'Wires', items: WIRES, blurb: 'Every wire you draw, in a new colour.' },
  { kind: 'board', label: 'Boards', items: BOARDS, blurb: 'Something nicer to build on.' },
  { kind: 'hat', label: 'Hats', items: HATS, blurb: 'Pip deserves to look good.' },
];

export function Shop() {
  const { save, buy, equip } = useGame();
  const [tab, setTab] = useState<ItemKind>('pet');
  const [trying, setTrying] = useState<string | null>(null);
  const [message, setMessage] = useState(
    'Welcome to the shop! Spend your sparks wisely. Or don’t.',
  );
  const current = TABS.find((t) => t.kind === tab)!;
  const equipped = (it: ShopItem) =>
    it.kind === 'pet' ? save.equipped.pet === it.id : save.equipped[it.kind] === it.id;

  const onItem = (it: ShopItem) => {
    if (it.kind === 'hat') setTrying(it.id);
    if (save.owned.includes(it.id)) {
      equip(it.id);
      buzz.tap();
      setMessage(
        it.kind === 'pet' && equipped(it)
          ? `${it.name} is staying home for now.`
          : `${it.name}: ${it.kind === 'pet' ? 'ready for work!' : 'looking good!'}`,
      );
      return;
    }
    if (save.sparks < it.price) {
      buzz.oops();
      setMessage(`${it.name} costs ⚡${it.price}. Finish some jobs to earn more sparks!`);
      return;
    }
    if (buy(it.id)) {
      buzz.win();
      setMessage(`You got ${it.name}! ${it.kind === 'pet' ? it.power : ''}`);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.toolbar}>
        <Button
          label="‹"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
        <Text style={styles.title}>Gran’s Shop</Text>
        <Sparks amount={save.sparks} />
      </View>

      <View style={styles.counter}>
        <Pip size={84} mood="cheer" hat={trying ?? save.equipped.hat} />
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{message}</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable
            key={t.kind}
            onPress={() => setTab(t.kind)}
            style={[styles.tab, tab === t.kind && styles.tabOn]}
          >
            <Text style={[styles.tabText, tab === t.kind && styles.tabTextOn]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.blurb}>{current.blurb}</Text>

      <ScrollView contentContainerStyle={styles.grid}>
        {current.items.map((it) => {
          const owned = save.owned.includes(it.id);
          const on = equipped(it);
          return (
            <Pressable
              key={it.id}
              onPress={() => onItem(it)}
              style={({ pressed }) => [styles.card, on && styles.cardOn, pressed && styles.pressed]}
            >
              <View style={styles.preview}>
                <Preview item={it} />
              </View>
              <Text style={styles.name}>{it.name}</Text>
              <Text style={styles.itemBlurb}>{it.kind === 'pet' ? it.power : it.blurb}</Text>
              <View
                style={[
                  styles.price,
                  owned && styles.priceOwned,
                  on && styles.priceOn,
                  !owned && save.sparks < it.price && styles.pricePoor,
                ]}
              >
                <Text style={[styles.priceText, (owned || on) && styles.priceTextOwned]}>
                  {on
                    ? it.kind === 'pet'
                      ? 'With you ✓'
                      : 'Wearing ✓'
                    : owned
                      ? 'Use'
                      : `⚡ ${it.price}`}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function Preview({ item }: { item: ShopItem }) {
  switch (item.kind) {
    case 'pet':
      return <Pet id={item.id} size={76} />;
    case 'hat':
      return <Pip size={80} hat={item.id} still />;
    case 'wire':
      return <WireSwatch wire={item} />;
    case 'board':
      return <BoardSwatch board={item} />;
  }
}

function WireSwatch({ wire }: { wire: WireItem }) {
  return (
    <Svg width={84} height={70} viewBox="0 0 84 70">
      <Path
        d="M10 56 L10 18 Q10 12 16 12 L68 12 Q74 12 74 18 L74 56"
        stroke={wire.glow}
        strokeWidth={14}
        opacity={0.35}
        fill="none"
        strokeLinecap="round"
      />
      <Path
        d="M10 56 L10 18 Q10 12 16 12 L68 12 Q74 12 74 18 L74 56"
        stroke={wire.color}
        strokeWidth={7}
        fill="none"
        strokeLinecap="round"
      />
      {[22, 42, 62].map((x) => (
        <Circle key={x} cx={x} cy={12} r={2.6} fill="#fff8d6" />
      ))}
      <Circle cx={42} cy={52} r={10} fill="#ff5a5f" />
      <Circle cx={42} cy={52} r={16} fill="#ff7a6e" opacity={0.3} />
    </Svg>
  );
}

function BoardSwatch({ board }: { board: BoardItem }) {
  return (
    <Svg width={84} height={70} viewBox="0 0 84 70">
      <Rect x={2} y={2} width={80} height={66} rx={10} fill={board.backdrop} />
      <Rect x={12} y={8} width={60} height={56} rx={8} fill={board.side} />
      {[0, 1, 2].map((y) =>
        [0, 1, 2].map((x) => (
          <Rect
            key={`${x}${y}`}
            x={16 + x * 18}
            y={12 + y * 16.5}
            width={16.5}
            height={15}
            rx={2}
            fill={(x + y) % 2 ? board.cellB : board.cellA}
          />
        )),
      )}
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  title: { flex: 1, fontSize: 22, fontWeight: '900', color: COLORS.text },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  bubble: { flex: 1, borderRadius: 18, padding: 12, backgroundColor: COLORS.card, ...shadow },
  bubbleText: { fontSize: 14, lineHeight: 19, fontWeight: '700', color: COLORS.text },
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingTop: 12 },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#e9dfd3',
    alignItems: 'center',
  },
  tabOn: { backgroundColor: '#7a5ad6' },
  tabText: { fontSize: 14, fontWeight: '800', color: COLORS.textSoft },
  tabTextOn: { color: '#fff' },
  blurb: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSoft,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 12, paddingBottom: 40 },
  card: {
    width: '47.5%',
    borderRadius: 22,
    padding: 12,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    gap: 4,
    ...shadow,
  },
  cardOn: { borderWidth: 3, borderColor: '#7a5ad6' },
  pressed: { transform: [{ scale: 0.97 }] },
  preview: { height: 86, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '900', color: COLORS.text, textAlign: 'center' },
  itemBlurb: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: COLORS.textSoft,
    textAlign: 'center',
    minHeight: 32,
  },
  price: {
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#ffc93c',
  },
  priceOwned: { backgroundColor: '#e9dfd3' },
  priceOn: { backgroundColor: COLORS.success },
  pricePoor: { opacity: 0.5 },
  priceText: { fontSize: 14, fontWeight: '900', color: COLORS.text },
  priceTextOwned: { color: COLORS.text },
});
