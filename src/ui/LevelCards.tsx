import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import type { LevelDef } from '../levels/types';
import { speakerName } from './Dialog';
import { buzz } from './haptics';
import {
  CREAM,
  CREAM_SHADE,
  GOLD,
  GOLD_DARK,
  INK,
  Panel,
  PixelButton,
  PixelText,
  Portrait,
  RED,
  TEXT_SOFT,
} from './pixel';

export const MUTED = '#b9b2db';

export interface Payday {
  stars: number;
  earned: number;
  firstClear: boolean;
  surge: number;
  /** "Solved +⚡5 · ★★ bonus +⚡5". */
  note?: string;
}

/** Boss rounds: Grumble (or whoever the villain is) gloats and sabotages the board. Round 0 is the opening challenge. */
export function GrumbleStrike({
  who,
  line,
  round,
  rounds,
  onFight,
}: {
  who: string;
  line: string;
  round: number;
  rounds: number;
  onFight: () => void;
}) {
  const shake = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    buzz.oops();
    Animated.sequence(
      [8, -8, 6, -6, 3, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 60, useNativeDriver: true })),
    ).start();
  }, [shake]);
  return (
    <View style={cardStyles.cover}>
      <Animated.View style={{ transform: [{ translateX: shake }] }}>
        <Panel style={cardStyles.modal} tone="night">
          <View style={cardStyles.introRow}>
            <Portrait who={who} size={84} />
            <View style={cardStyles.flex}>
              <PixelText size={11} color={MUTED} shadow>
                {round === 0 ? `BOSS BATTLE · ${rounds} ROUNDS` : `ROUND ${round} CLEARED · ${rounds - round} TO GO`}
              </PixelText>
              <View style={cardStyles.hearts}>
                {Array.from({ length: rounds }, (_, i) => (
                  <View key={i} style={[cardStyles.heart, i < round && cardStyles.heartGone]} />
                ))}
              </View>
              <PixelText size={13} color={GOLD} shadow>
                {speakerName(who)}
              </PixelText>
              <PixelText size={15} color={CREAM} shadow>
                “{line}”
              </PixelText>
            </View>
          </View>
          <View style={cardStyles.modalButtons}>
            <PixelButton label="Bring it on! ⚡" onPress={onFight} />
          </View>
        </Panel>
      </Animated.View>
    </View>
  );
}

/** Payday: the client says thanks, the stars pop in one by one, and the sparks count up. */
export function WinCard({
  level,
  payday,
  onKeepPlaying,
  onDone,
  day,
}: {
  level: LevelDef;
  payday: Payday;
  onKeepPlaying: () => void;
  onDone: () => void;
  day?: string;
}) {
  const [shownStars, setShownStars] = useState(0);
  const [sparks, setSparks] = useState(0);
  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(rise, { toValue: 1, friction: 7, useNativeDriver: true }).start();
    const timers = [1, 2, 3]
      .filter((s) => s <= payday.stars)
      .map((s) =>
        setTimeout(
          () => {
            setShownStars(s);
            buzz.thud();
          },
          250 + s * 300,
        ),
      );
    const steps = 20;
    let i = 0;
    const counter = setInterval(() => {
      i++;
      setSparks(Math.round((payday.earned * i) / steps));
      if (i >= steps) clearInterval(counter);
    }, 40);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(counter);
    };
  }, [payday, rise]);
  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [300, 0] });
  return (
    <View style={cardStyles.cover}>
      <Animated.View style={[cardStyles.winWrap, { transform: [{ translateY }] }]}>
        <Panel style={cardStyles.modal}>
          <View style={cardStyles.winTop}>
            <PixelText size={22}>
              {payday.firstClear ? (level.boss ? 'Boss beaten!' : 'Job done!') : 'New best!'}
            </PixelText>
            <View style={cardStyles.flex} />
            <View style={cardStyles.starsRow}>
              {[1, 2, 3].map((s) => (
                <PixelText key={s} size={30} color={s <= shownStars ? GOLD : CREAM_SHADE} shadow={s <= shownStars}>
                  ★
                </PixelText>
              ))}
            </View>
          </View>
          {level.job && !day && (
            <View style={cardStyles.introRow}>
              <Portrait who={level.job.client} size={52} />
              <PixelText size={13} style={cardStyles.flex}>
                “{level.job.thanks}”
              </PixelText>
            </View>
          )}
          <View style={cardStyles.winTop}>
            <PixelText size={18} color={payday.earned > 0 ? GOLD_DARK : TEXT_SOFT}>
              {payday.earned > 0 ? `+⚡ ${sparks} sparks${payday.surge > 1 && sparks >= payday.earned ? `  SURGE ×${payday.surge}!` : ''}` : 'No new stars this time'}
            </PixelText>
            {!!payday.note && (
              <PixelText size={12} color={GOLD_DARK}>
                {payday.note}
              </PixelText>
            )}
            <View style={cardStyles.flex} />
            {payday.stars < 3 && (
              <PixelText size={11} color={TEXT_SOFT}>
                Missing a star? Check the ☆ goals.
              </PixelText>
            )}
          </View>
          <View style={cardStyles.modalButtons}>
            <PixelButton label="Keep playing" tone="cream" onPress={onKeepPlaying} />
            <PixelButton label={day ? 'Back to town' : 'Back outside ›'} onPress={onDone} />
          </View>
        </Panel>
      </Animated.View>
    </View>
  );
}

/** Styles shared by the cards here and the intro card in LevelScreen. */
export const cardStyles = StyleSheet.create({
  flex: { flex: 1 },
  cover: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(13,15,30,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modal: { width: 460, maxWidth: '100%' },
  introRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 6 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  hearts: { flexDirection: 'row', gap: 6, marginVertical: 4 },
  perch: { position: 'absolute', top: 6, right: 6, alignItems: 'center' },
  heart: { width: 30, height: 9, backgroundColor: RED, borderWidth: 1.5, borderColor: INK, borderRadius: 2 },
  heartGone: { backgroundColor: '#3a3656' },
  winWrap: { width: 460, maxWidth: '100%' },
  winTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  starsRow: { flexDirection: 'row', gap: 2 },
});

/** The boss, perched on the workbench for the whole fight: bobs while you work, leaps when he strikes. */
export function BossPerch({ who, round, rounds }: { who: string; round: number; rounds: number }) {
  const bob = useRef(new Animated.Value(0)).current;
  const leap = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -4, duration: 700, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);
  useEffect(() => {
    if (round === 0) return;
    leap.setValue(-28);
    Animated.spring(leap, { toValue: 0, friction: 3, useNativeDriver: true }).start();
  }, [round, leap]);
  return (
    <View pointerEvents="none" style={cardStyles.perch} accessibilityLabel={`${speakerName(who)} is watching: round ${round + 1} of ${rounds}`}>
      <Animated.View style={{ transform: [{ translateY: Animated.add(bob, leap) }] }}>
        <Portrait who={who} size={56} />
      </Animated.View>
      <PixelText size={9} color={GOLD} shadow>
        BOSS · {round + 1}/{rounds}
      </PixelText>
    </View>
  );
}
