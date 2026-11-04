// The Lucky Lantern: a little slot machine run by Penny the magpie, with double-or-nothing
// when you win. Sparks only; they are an in-game currency and nothing real is ever at stake.

import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
        <Panel tone="night" style={styles.machine}>
          <View style={styles.reels}>
            {reels.map((s, i) => (
              <View key={i} style={[styles.reel, phase === 'won' && styles.reelWin]}>
                <PixelText size={44}>{GLYPH[s]}</PixelText>
              </View>
            ))}
          </View>
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
        </Panel>
        <View style={styles.pays}>
          {PAYS.map((s) => (
            <PixelText key={s} size={11} color="#c9c3e6">
              {GLYPH[s]}×3 pays {SLOT_TRIPLE[s]}×
            </PixelText>
          ))}
          <PixelText size={11} color="#c9c3e6">
            Pair pays {SLOT_PAIR}× · ☁️ pays nothing
          </PixelText>
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
  main: { flex: 1, padding: 14, gap: 10, justifyContent: 'center' },
  machine: { gap: 14 },
  reels: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  reel: {
    width: 96,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CREAM,
    borderWidth: 3,
    borderColor: INK,
    borderRadius: 6,
  },
  reelWin: { borderColor: GOLD, backgroundColor: '#fff3c4' },
  pays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    borderTopWidth: 2,
    borderColor: TEAL,
    paddingTop: 8,
  },
});
