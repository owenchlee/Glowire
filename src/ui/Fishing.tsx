// A small fishing overlay: cast, watch the bobber, and press when it dips.
// Press too early and you scare the fish off; wait too long and it lets go.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { type Fish, biteDelay, rollFish, verdict } from '../world/fishing';
import { buzz } from './haptics';
import { Panel, PixelButton, PixelText } from './pixel';

type Phase = { kind: 'wait' } | { kind: 'bite' } | { kind: 'result'; text: string; fish: Fish | null };

export function Fishing({ onCatch, onClose, random = Math.random }: { onCatch: (fish: Fish) => void; onClose: () => void; random?: () => number }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'wait' });
  const fish = useRef<Fish>(rollFish(random()));
  const biteAt = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [bob] = useState(() => new Animated.Value(0));
  const phaseNow = useRef<Phase>(phase);
  phaseNow.current = phase;

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const schedule = useCallback(() => {
    clear();
    fish.current = rollFish(random());
    timers.current.push(
      setTimeout(() => {
        biteAt.current = Date.now();
        setPhase({ kind: 'bite' });
        buzz.thud();
        // Let go if you're too slow.
        timers.current.push(
          setTimeout(() => {
            if (phaseNow.current.kind === 'bite') setPhase({ kind: 'result', text: 'Too slow! It spat the hook out.', fish: null });
          }, (fish.current.window + 0.15) * 1000),
        );
      }, biteDelay(random()) * 1000),
    );
  }, [random]);

  const cast = useCallback(() => {
    setPhase({ kind: 'wait' });
    schedule();
  }, [schedule]);

  useEffect(() => {
    schedule();
    return clear;
  }, [schedule]);

  // The bobber floats gently; it plunges when there's a bite.
  useEffect(() => {
    const target = phase.kind === 'bite' ? 1 : 0;
    const loop =
      phase.kind === 'wait'
        ? Animated.loop(
            Animated.sequence([
              Animated.timing(bob, { toValue: 0.12, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
              Animated.timing(bob, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
            ]),
          )
        : Animated.timing(bob, { toValue: target, duration: 90, useNativeDriver: false });
    loop.start();
    return () => loop.stop();
  }, [phase.kind, bob]);

  const reel = useCallback(() => {
    const p = phaseNow.current;
    if (p.kind === 'result') return;
    clear();
    const t = p.kind === 'bite' ? (Date.now() - biteAt.current) / 1000 : -1;
    const v = verdict(t, fish.current);
    if (v === 'caught') {
      buzz.win();
      onCatch(fish.current);
      setPhase({ kind: 'result', text: `You caught a ${fish.current.name}! +${fish.current.sparks} sparks`, fish: fish.current });
    } else
      setPhase({
        kind: 'result',
        text: v === 'early' ? 'Too soon! You scared it off.' : 'Too slow! It got away.',
        fish: null,
      });
  }, [onCatch]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const down = (e: KeyboardEvent) => {
      if (![' ', 'e', 'E', 'Enter'].includes(e.key)) return;
      e.preventDefault();
      e.stopPropagation();
      if (phaseNow.current.kind === 'result') return;
      reel();
    };
    window.addEventListener('keydown', down, true);
    return () => window.removeEventListener('keydown', down, true);
  }, [reel]);

  const bite = phase.kind === 'bite';
  const top = bob.interpolate({ inputRange: [0, 1], outputRange: [8, 64] });
  return (
    <View style={styles.wrap}>
      <Panel style={styles.panel}>
        <PixelText size={16} color="#5b3a29" style={styles.title}>
          Fishing
        </PixelText>
        <View style={[styles.pond, bite && styles.pondBite]}>
          <PixelText size={12} color="#cfe9f2" style={styles.ripple}>
            ~ ~ ~ ~ ~ ~ ~
          </PixelText>
          <Animated.View style={[styles.bobber, { top }]}>
            <PixelText size={22} color="#d14b34">
              ●
            </PixelText>
          </Animated.View>
          <PixelText size={12} color="#cfe9f2" style={styles.rippleLow}>
            ~ ~ ~ ~ ~ ~ ~
          </PixelText>
        </View>
        <PixelText size={13} color="#5b3a29" style={styles.title}>
          {phase.kind === 'wait' ? 'Wait for the bobber to dip…' : bite ? 'Now! Reel it in!' : phase.text}
        </PixelText>
        {phase.kind === 'result' ? (
          <View style={styles.row}>
            <PixelButton label="Cast again" tone="orange" size={13} onPress={cast} />
            <PixelButton label="Done" tone="cream" size={13} onPress={onClose} />
          </View>
        ) : (
          <View style={styles.row}>
            <PixelButton label="Reel in" tone="gold" size={15} onPress={reel} />
            <PixelButton label="Stop" tone="cream" size={13} onPress={onClose} />
          </View>
        )}
      </Panel>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(8,9,20,0.45)' },
  panel: { width: 300 },
  title: { textAlign: 'center', marginVertical: 6 },
  pond: { height: 96, marginVertical: 4, backgroundColor: '#3e7f9a', borderWidth: 2, borderColor: '#141b1b', overflow: 'hidden', alignItems: 'center' },
  pondBite: { backgroundColor: '#5cb0cf' },
  bobber: { position: 'absolute', alignItems: 'center' },
  ripple: { position: 'absolute', top: 36 },
  rippleLow: { position: 'absolute', top: 72 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 6 },
});
