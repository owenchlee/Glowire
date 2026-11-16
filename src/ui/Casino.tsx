// The Lucky Lantern: a little slot machine run by Penny the magpie, with double-or-nothing
// when you win. Sparks only; they are an in-game currency and nothing real is ever at stake.

import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BETS,
  MAX_DOUBLES,
  SLOT_PAIR,
  SLOT_TRIPLE,
  type SlotSymbol,
  gamble,
  spin,
  spinReel,
  surgeChance,
} from '../game/luck';
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
  RED,
  TEAL,
} from './pixel';

const GLYPH: Record<SlotSymbol, string> = {
  plug: '🔌',
  battery: '🔋',
  bulb: '💡',
  bolt: '⚡',
  star: '⭐',
  cloud: '☁️',
};
const PAYS: SlotSymbol[] = ['star', 'bolt', 'bulb', 'battery', 'plug'];
const BULBS = 14;

/** The sign over the machine, with a ring of bulbs that chase round (faster when it's hot). */
function Marquee({ hot }: { hot: boolean }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), hot ? 90 : 260);
    return () => clearInterval(id);
  }, [hot]);
  return (
    <View style={styles.marquee}>
      <View style={styles.bulbs}>
        {Array.from({ length: BULBS }, (_, i) => (
          <View key={i} style={[styles.bulb, (i + tick) % 3 === 0 && styles.bulbOn]} />
        ))}
      </View>
      <PixelText size={34} color={GOLD} shadow style={styles.marqueeText}>
        LUCKY LANTERN
      </PixelText>
    </View>
  );
}

/** A win, popping up big over the reels. */
function WinPop({ amount }: { amount: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(t, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  }, [t]);
  return (
    <Animated.View pointerEvents="none" style={[styles.winPop, { opacity: t, transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }]}>
      <PixelText size={48} color={GOLD} shadow>
        +⚡{amount}
      </PixelText>
    </Animated.View>
  );
}

type Phase = 'idle' | 'spinning' | 'won' | 'flipping';

export function Casino() {
  const { save, commitSave } = useGame();
  const [bet, setBet] = useState<number>(BETS[0]);
  const [reels, setReels] = useState<SlotSymbol[]>(['bulb', 'bolt', 'plug']);
  const [phase, setPhase] = useState<Phase>('idle');
  /** While a spin plays out, the balance shown lags behind the real one. */
  const [shown, setShown] = useState<number | null>(null);
  const [stake, setStake] = useState(0);
  const [doubles, setDoubles] = useState(0);
  const [say, setSay] = useState(
    'Step right up, dear! Three of a kind pays big. Two of a kind gets your bet back.',
  );
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));

  const balance = shown ?? save.sparks;
  const affordable = BETS.filter((b) => b <= save.sparks);
  const activeBet = save.sparks >= bet ? bet : (affordable[affordable.length - 1] ?? BETS[0]);

  const pull = () => {
    const result = spin(save, activeBet, Math.random);
    if (!result) {
      buzz.oops();
      setSay('Not enough sparks, dear. Go fix a light or two and come back!');
      return;
    }
    setPhase('spinning');
    setStake(0);
    setDoubles(0);
    setShown(save.sparks - activeBet);
    commitSave(result.save);
    buzz.tap();
    // Each reel flickers, then lands: left, middle, right.
    const flicker = setInterval(
      () => setReels((r) => r.map((s, i) => (i < landed.current ? s : spinReel(Math.random)))),
      70,
    );
    landed.current = 0;
    result.reels.forEach((sym, i) => {
      later(
        () => {
          landed.current = i + 1;
          setReels((r) => r.map((s, j) => (j === i ? sym : s)));
          buzz.thud();
        },
        600 + i * 450,
      );
    });
    later(
      () => {
        clearInterval(flicker);
        setShown(null);
        if (result.win > 0) {
          buzz.win();
          setStake(result.win);
          setPhase('won');
          setSay(
            result.win > activeBet
              ? `JACKPOT-ish! ⚡${result.win}! Take it, or double or nothing?`
              : `Two of a kind: your ⚡${result.win} comes back. Double or nothing?`,
          );
        } else {
          buzz.oops();
          setPhase('idle');
          setSay(
            [
              'Ooh, so close! Spin again?',
              'Grumble got that one. Again!',
              'The machine is warming up…',
            ][Math.floor(Math.random() * 3)]!,
          );
        }
      },
      600 + 3 * 450 + 100,
    );
  };
  const landed = useRef(0);

  const flip = () => {
    const result = gamble(save, stake, Math.random);
    if (!result) return;
    setPhase('flipping');
    setShown(save.sparks);
    commitSave(result.save);
    setSay('Heads… or tails…');
    later(() => {
      setShown(null);
      if (result.won) {
        buzz.win();
        const next = stake * 2;
        setStake(next);
        setDoubles(doubles + 1);
        setPhase('won');
        setSay(
          doubles + 1 >= MAX_DOUBLES
            ? `Three in a row! ⚡${next} is all yours.`
            : `Doubled to ⚡${next}! Again?`,
        );
      } else {
        buzz.oops();
        setStake(0);
        setPhase('idle');
        setSay('Tails! Easy come, easy go. Spin again?');
      }
    }, 900);
  };

  const collect = () => {
    buzz.tap();
    setPhase('idle');
    setSay(`⚡${stake} in your pocket. Smart!`);
    setStake(0);
  };

  const { luck } = save;
  const busy = phase === 'spinning' || phase === 'flipping';
  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <View style={styles.side}>
        <View style={styles.row}>
          <PixelButton
            label="‹"
            accessibilityLabel="Back"
            tone="cream"
            size={16}
            disabled={busy}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
          <PixelText size={18} color={GOLD} shadow style={styles.flex}>
            Lucky Lantern
          </PixelText>
        </View>
        <Counter icon="⚡" value={balance} />
        <PixelText size={11} color="#b9b2db">
          Next payday Surge chance: {Math.round(surgeChance(luck.dry) * 100)}%
        </PixelText>
        <PixelText size={11} color="#b9b2db">
          Spins {luck.spins} · Biggest win ⚡{luck.biggest} · Surges {luck.surges}
        </PixelText>
        <View style={styles.flex} />
        <View style={styles.row}>
          <Portrait who="penny" size={56} />
        </View>
        <View>
          <NameTab name="Penny" />
          <Panel>
            <PixelText size={12}>{say}</PixelText>
          </Panel>
        </View>
      </View>

      <View style={styles.main}>
        <View style={styles.cabinet}>
          <Marquee hot={phase === 'won' || busy} />
          <View style={styles.reels}>
            {reels.map((s, i) => (
              <View key={i} style={[styles.reel, phase === 'won' && styles.reelWin]}>
                <PixelText size={84}>{GLYPH[s]}</PixelText>
              </View>
            ))}
          </View>
          {phase === 'won' && <WinPop key={stake} amount={stake} />}
          {phase === 'won' ? (
            <View style={styles.row}>
              <PixelText size={16} color={GOLD} shadow>
                You hold ⚡{stake}
              </PixelText>
              <View style={styles.flex} />
              <PixelButton label="Collect" tone="teal" onPress={collect} />
              {doubles < MAX_DOUBLES && save.sparks >= stake && (
                <PixelButton label={`Double ⚡${stake * 2}?`} tone="gold" onPress={flip} />
              )}
            </View>
          ) : (
            <View style={styles.row}>
              {BETS.map((b) => (
                <PixelButton
                  key={b}
                  label={`⚡${b}`}
                  size={13}
                  tone={b === activeBet ? 'gold' : 'cream'}
                  disabled={busy || b > save.sparks}
                  onPress={() => setBet(b)}
                />
              ))}
              <View style={styles.flex} />
              <PixelButton
                label="SPIN"
                tone="orange"
                size={18}
                disabled={busy || save.sparks < BETS[0]}
                onPress={pull}
              />
            </View>
          )}
        </View>
        {/* Prizes in real sparks at the current bet, so you can see what you're playing for. */}
        <View style={styles.pays}>
          {PAYS.map((s) => (
            <View key={s} style={[styles.prize, s === 'star' && styles.jackpot]}>
              <PixelText size={22}>{GLYPH[s].repeat(3)}</PixelText>
              <PixelText size={s === 'star' ? 20 : 16} color={GOLD} shadow>
                ⚡{SLOT_TRIPLE[s] * activeBet}
              </PixelText>
              {s === 'star' && (
                <PixelText size={11} color="#ffe9a8">
                  JACKPOT
                </PixelText>
              )}
            </View>
          ))}
          <View style={styles.prize}>
            <PixelText size={14} color={CREAM}>
              Any pair
            </PixelText>
            <PixelText size={16} color={GOLD} shadow>
              ⚡{SLOT_PAIR * activeBet} back
            </PixelText>
          </View>
        </View>
        <View style={styles.row}>
          <PixelText size={12} color="#b9b2db" style={styles.flex}>
            Sparks buy outfits, pets and glowing wire in the Shop. (☁️ is Grumble: he pays nothing.)
          </PixelText>
          <PixelButton label="Shop" tone="teal" size={12} disabled={busy} onPress={() => router.push('/shop')} />
        </View>
        {save.sparks < BETS[0] && !busy && (
          <PixelText size={12} color={RED} shadow>
            Out of sparks! Fix a light and come back.
          </PixelText>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, flexDirection: 'row', backgroundColor: NIGHT_DEEP },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  side: {
    width: 250,
    padding: 12,
    gap: 8,
    backgroundColor: NIGHT,
    borderRightWidth: 2,
    borderColor: INK,
  },
  main: { flex: 1, padding: 18, gap: 14, justifyContent: 'center', alignItems: 'center' },
  cabinet: {
    width: '100%',
    maxWidth: 680,
    gap: 16,
    padding: 18,
    backgroundColor: '#3a1f3f',
    borderWidth: 6,
    borderColor: '#c48a1c',
    borderRadius: 14,
    shadowColor: GOLD,
    shadowOpacity: 0.35,
    shadowRadius: 24,
  },
  marquee: { alignItems: 'center', gap: 6, paddingVertical: 8, backgroundColor: '#1b0f22', borderWidth: 3, borderColor: INK, borderRadius: 8 },
  marqueeText: { letterSpacing: 4 },
  bulbs: { flexDirection: 'row', gap: 10 },
  bulb: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#5a3b1c', borderWidth: 2, borderColor: INK },
  bulbOn: { backgroundColor: GOLD, shadowColor: GOLD, shadowOpacity: 0.9, shadowRadius: 8 },
  winPop: { position: 'absolute', left: 0, right: 0, top: '42%', alignItems: 'center' },
  reels: { flexDirection: 'row', gap: 14, justifyContent: 'center', padding: 12, backgroundColor: INK, borderRadius: 8 },
  reel: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CREAM,
    borderWidth: 3,
    borderColor: INK,
    borderRadius: 6,
  },
  reelWin: { borderColor: GOLD, backgroundColor: '#fff3c4', shadowColor: GOLD, shadowOpacity: 0.9, shadowRadius: 16 },
  pays: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', maxWidth: 680 },
  prize: { alignItems: 'center', minWidth: 96, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: NIGHT, borderWidth: 2, borderColor: TEAL, borderRadius: 6 },
  jackpot: { borderColor: GOLD, backgroundColor: '#3a2a12' },
});
