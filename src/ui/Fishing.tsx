// A small fishing overlay: cast, watch the bobber, and press when it dips.
// Press too early and you scare the fish off; wait too long and it lets go.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { type Fish, biteDelay, rollFish, verdict } from '../world/fishing';
import { buzz } from './haptics';
import { Panel, PixelButton, PixelText } from './pixel';

type Phase = { kind: 'wait' } | { kind: 'bite' } | { kind: 'result'; text: string; fish: Fish | null };

const POND_H = 112;
const FISH_COLOR: Record<string, string> = { minnow: '#b8cdd8', trout: '#e8896b', carp: '#f2c14e' };

/** A little pixel fish drawn from boxes, popping up when you land one. */
function FishSprite({ fish }: { fish: Fish }) {
  const [pop] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: false }).start();
  }, [pop]);
  const body = FISH_COLOR[fish.id] ?? '#b8cdd8';
  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
  return (
    <Animated.View style={[styles.fish, { transform: [{ scale }] }]}>
      <View style={[styles.fishTail, { backgroundColor: body }]} />
      <View style={[styles.fishBody, { backgroundColor: body }]}>
        <View style={styles.fishEye} />
        <View style={[styles.fishBelly, { backgroundColor: 'rgba(255,255,255,0.45)' }]} />
      </View>
    </Animated.View>
  );
}

export function Fishing({ onCatch, onClose, random = Math.random }: { onCatch: (fish: Fish) => void; onClose: () => void; random?: () => number }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'wait' });
  const fish = useRef<Fish>(rollFish(random()));
  const biteAt = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [bob] = useState(() => new Animated.Value(0));
  const [drift] = useState(() => new Animated.Value(0));
  const [splash] = useState(() => new Animated.Value(0));
  const [cue] = useState(() => new Animated.Value(0));
  const [timeLeft] = useState(() => new Animated.Value(1));
  const phaseNow = useRef<Phase>(phase);
  phaseNow.current = phase;

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const ring = useCallback(() => {
    splash.setValue(0);
    Animated.timing(splash, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [splash]);

  const schedule = useCallback(() => {
    clear();
    fish.current = rollFish(random());
    timers.current.push(
      setTimeout(() => {
        biteAt.current = Date.now();
        setPhase({ kind: 'bite' });
        buzz.thud();
        ring();
        const limit = (fish.current.window + 0.15) * 1000;
        timeLeft.setValue(1);
        Animated.timing(timeLeft, { toValue: 0, duration: limit, easing: Easing.linear, useNativeDriver: false }).start();
        // Let go if you're too slow.
        timers.current.push(
          setTimeout(() => {
            if (phaseNow.current.kind === 'bite') setPhase({ kind: 'result', text: 'Too slow! It spat the hook out.', fish: null });
          }, limit),
        );
      }, biteDelay(random()) * 1000),
    );
  }, [random, ring, timeLeft]);

  const cast = useCallback(() => {
    setPhase({ kind: 'wait' });
    ring();
    schedule();
  }, [schedule, ring]);

  useEffect(() => {
    schedule();
    return clear;
  }, [schedule]);

  // The water drifts sideways forever.
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(drift, { toValue: 1, duration: 3200, easing: Easing.linear, useNativeDriver: false }));
    loop.start();
    return () => loop.stop();
  }, [drift]);

  // The bobber floats gently; it plunges when there's a bite, and the cue pulses.
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

  useEffect(() => {
    if (phase.kind !== 'bite') {
      cue.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(cue, { toValue: 1, duration: 130, useNativeDriver: false }),
        Animated.timing(cue, { toValue: 0, duration: 130, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [phase.kind, cue]);

  const reel = useCallback(() => {
    const p = phaseNow.current;
    if (p.kind === 'result') return;
    clear();
    timeLeft.stopAnimation();
    const t = p.kind === 'bite' ? (Date.now() - biteAt.current) / 1000 : -1;
    const v = verdict(t, fish.current);
    ring();
    if (v === 'caught') {
      buzz.win();
      onCatch(fish.current);
      setPhase({ kind: 'result', text: `${fish.current.name}!`, fish: fish.current });
    } else
      setPhase({
        kind: 'result',
        text: v === 'early' ? 'Too soon! You scared it off.' : 'Too slow! It got away.',
        fish: null,
      });
  }, [onCatch, ring, timeLeft]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const down = (e: KeyboardEvent) => {
      if (![' ', 'e', 'E', 'Enter'].includes(e.key)) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.repeat || phaseNow.current.kind === 'result') return;
      reel();
    };
    window.addEventListener('keydown', down, true);
    return () => window.removeEventListener('keydown', down, true);
  }, [reel]);

  const bite = phase.kind === 'bite';
  const bobTop = bob.interpolate({ inputRange: [0, 1], outputRange: [40, 80] });
  const shift = drift.interpolate({ inputRange: [0, 1], outputRange: [0, 24] });
  const ringScale = splash.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.4] });
  const ringFade = splash.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.9, 0] });
  const cueScale = cue.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] });
  const barWidth = timeLeft.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const caught = phase.kind === 'result' ? phase.fish : null;

  return (
    <View style={styles.wrap}>
      <Panel style={styles.panel}>
        <PixelText size={16} color="#5b3a29" style={styles.title}>
          Fishing
        </PixelText>
        <View style={[styles.pond, bite && styles.pondBite]}>
          {[16, 52, 88].map((y, i) => (
            <Animated.View key={y} style={[styles.band, { top: y, left: -24, transform: [{ translateX: i % 2 ? Animated.multiply(shift, -1) : shift }] }]} />
          ))}
          <Animated.View style={[styles.line, { height: bobTop }]} />
          <Animated.View style={[styles.ring, { top: 36, opacity: ringFade, transform: [{ scale: ringScale }] }]} />
          <Animated.View style={[styles.bobber, { top: bobTop }]}>
            <View style={styles.bobberTop} />
            <View style={styles.bobberBottom} />
          </Animated.View>
          {bite && (
            <Animated.View style={[styles.cue, { transform: [{ scale: cueScale }] }]}>
              <PixelText size={30} color="#ffe58a" shadow>
                !
              </PixelText>
            </Animated.View>
          )}
          {caught && <FishSprite fish={caught} />}
        </View>
        {bite ? (
          <View style={styles.timer}>
            <Animated.View style={[styles.timerFill, { width: barWidth }]} />
          </View>
        ) : (
          <View style={styles.timerGap} />
        )}
        <PixelText size={14} color={bite ? '#c2411f' : '#5b3a29'} style={styles.title}>
          {phase.kind === 'wait' ? 'Wait for the bobber to dip…' : bite ? 'NOW! Reel it in!' : phase.text}
        </PixelText>
        {caught ? (
          <PixelText size={13} color="#b4741f" style={styles.title}>
            +{caught.sparks} sparks
          </PixelText>
        ) : (
          <View style={styles.sparkGap} />
        )}
        {phase.kind === 'result' ? (
          <View style={styles.row}>
            <PixelButton label="Cast again" tone="orange" size={13} onPress={cast} />
            <PixelButton label="Done" tone="cream" size={13} onPress={onClose} />
          </View>
        ) : (
          <View style={styles.row}>
            <PixelButton label={bite ? 'REEL IN!' : 'Reel in'} tone={bite ? 'orange' : 'gold'} size={bite ? 17 : 15} onPress={reel} />
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
  title: { textAlign: 'center', marginVertical: 3 },
  pond: { height: POND_H, marginVertical: 4, backgroundColor: '#3e7f9a', borderWidth: 2, borderColor: '#141b1b', overflow: 'hidden', alignItems: 'center' },
  pondBite: { backgroundColor: '#4d9ab8' },
  band: { position: 'absolute', width: 400, height: 4, backgroundColor: 'rgba(207,233,242,0.35)' },
  line: { position: 'absolute', top: 0, width: 2, backgroundColor: '#f1ead7' },
  ring: { position: 'absolute', width: 40, height: 14, marginTop: 28, borderRadius: 20, borderWidth: 2, borderColor: '#e9f7fb' },
  bobber: { position: 'absolute', width: 16, height: 18, alignItems: 'center', borderWidth: 2, borderColor: '#141b1b', overflow: 'hidden', borderRadius: 8, backgroundColor: '#fff' },
  bobberTop: { width: 16, height: 8, backgroundColor: '#d14b34' },
  bobberBottom: { width: 16, height: 8, backgroundColor: '#f5efe0' },
  cue: { position: 'absolute', top: 4, right: 36 },
  timer: { height: 8, borderWidth: 2, borderColor: '#141b1b', backgroundColor: '#6b5a4a', marginBottom: 2 },
  timerGap: { height: 12, marginBottom: 2 },
  timerFill: { height: '100%', backgroundColor: '#ffd27a' },
  sparkGap: { height: 22 },
  fish: { position: 'absolute', top: 30, flexDirection: 'row', alignItems: 'center' },
  fishTail: { width: 14, height: 14, transform: [{ rotate: '45deg' }], marginRight: -6 },
  fishBody: { width: 46, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#141b1b', overflow: 'hidden' },
  fishEye: { position: 'absolute', right: 8, top: 5, width: 5, height: 5, backgroundColor: '#141b1b' },
  fishBelly: { position: 'absolute', left: 4, right: 4, bottom: 3, height: 5, borderRadius: 3 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 6 },
});
