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
}

/** Between boss rounds: Grumble (or whoever the villain is) gloats and sabotages the board. */
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
                ROUND {round} CLEARED · {rounds - round} TO GO
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
  heart: { width: 30, height: 9, backgroundColor: RED, borderWidth: 1.5, borderColor: INK, borderRadius: 2 },
  heartGone: { backgroundColor: '#3a3656' },
  winWrap: { width: 460, maxWidth: '100%' },
  winTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  starsRow: { flexDirection: 'row', gap: 2 },
});
