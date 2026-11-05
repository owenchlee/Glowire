// A job that is a brain game: the client asks in their own voice on the left, the puzzle fills
// the right. Finishing pays out like a circuit job (stars by how well you played).

import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { brainStars } from '../game/puzzles';
import type { BrainJob, LevelDef } from '../levels/types';
import { levelNumber } from '../levels/levels';
import { ClockPanel, DeadLampHunt, DockyardWiring, LanternBudget } from './BrainGames';
import { speakerName } from './Dialog';
import { useGame } from './game';
import { buzz } from './haptics';
import { CREAM, Counter, GOLD, INK, NIGHT, NIGHT_DEEP, NameTab, Panel, PixelButton, PixelText, Portrait } from './pixel';

const GAMES = { probe: DeadLampHunt, pipes: DockyardWiring, panel: ClockPanel, lantern: LanternBudget } as const;

export function BrainJobScreen({ level, brain }: { level: LevelDef; brain: BrainJob }) {
  const { save, finishJob } = useGame();
  const job = level.job;
  const [say, setSay] = useState(job?.ask ?? level.intro);
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<'intro' | 'play' | 'done'>('intro');
  const [result, setResult] = useState<{ stars: number; earned: number } | null>(null);
  const Game = GAMES[brain.game];
  const best = save.stars[String(level.id)] ?? 0;

  const finish = useCallback(
    (score: number) => {
      const stars = brainStars(brain.game, score);
      const payout = stars > 0 ? finishJob(level.id, stars, false) : { earned: 0 };
      if (stars > 0) buzz.win();
      setResult({ stars, earned: payout.earned });
      setSay(stars > 0 ? (job?.thanks ?? 'Thank you!') : 'Not quite. Have another go?');
      setPhase('done');
    },
    [brain.game, finishJob, job?.thanks, level.id],
  );

  const start = () => {
    setRun((r) => r + 1);
    setResult(null);
    setSay(job?.ask ?? level.intro);
    setPhase('play');
  };
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <View style={styles.side}>
        <View style={styles.row}>
          <PixelButton label="‹" tone="cream" size={16} onPress={goBack} />
          <PixelText size={16} color={GOLD} shadow style={styles.flex}>
            {levelNumber(level.id)} {level.title}
          </PixelText>
        </View>
        <View style={styles.row}>
          <Counter icon="★" value={`${best}/3`} />
          <Counter icon="⚡" value={save.sparks} />
        </View>
        <View style={styles.flex} />
        {job && <Portrait who={job.client} size={64} />}
        <View>
          {job && <NameTab name={speakerName(job.client)} />}
          <Panel>
            <PixelText size={12}>{say}</PixelText>
          </Panel>
        </View>
      </View>
      <View style={styles.main}>
        {phase === 'intro' && (
          <View style={styles.center}>
            <PixelText size={14} color={CREAM} shadow style={styles.centerText}>
              {level.intro}
            </PixelText>
            <PixelButton label="Start!" tone="orange" size={18} onPress={start} />
          </View>
        )}
        {phase === 'play' && <Game key={run} seed={brain.seed + run} onSay={setSay} onEnd={finish} />}
        {phase === 'done' && result && (
          <View style={styles.center}>
            <PixelText size={26} color={GOLD} shadow>
              {result.stars > 0 ? '★'.repeat(result.stars) + '☆'.repeat(3 - result.stars) : 'Not yet'}
            </PixelText>
            {result.earned > 0 && (
              <PixelText size={14} color={CREAM} shadow>
                +⚡ {result.earned} sparks
              </PixelText>
            )}
            <View style={styles.row}>
              <PixelButton label={result.stars > 0 ? 'Play again' : 'Try again'} tone="orange" size={15} onPress={start} />
              <PixelButton label="Back to town" tone="cream" size={15} onPress={goBack} />
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, flexDirection: 'row', backgroundColor: NIGHT_DEEP },
  side: { width: 250, padding: 12, gap: 8, backgroundColor: NIGHT, borderRightWidth: 2, borderColor: INK },
  main: { flex: 1, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  centerText: { textAlign: 'center', maxWidth: 420 },
});
