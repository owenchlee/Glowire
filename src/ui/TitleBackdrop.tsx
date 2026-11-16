// The title screen's backdrop: Glowtown itself at night, every lamp lit (the town the story
// is about saving), with its people out on their rounds. Drawn by the real world renderer.

import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { litGroups, presentResidents } from '../world/logic';
import { placeResidents } from '../world/routines';
import { ROUTINES } from '../world/routines.data';
import { newWalker } from '../world/walker';
import { worldMap } from '../world/worlds';
import { WorldCanvas } from '../world-view/WorldCanvas';
import { dayClockSeconds } from '../world-view/daylight';

const allSolved = () => true;
const noop = () => {};

export function TitleBackdrop() {
  const map = useMemo(() => worldMap('glowtown')!, []);
  const lit = useMemo(() => litGroups(map, allSolved), [map]);
  const people = useMemo(() => presentResidents(map, allSolved, lit), [map, lit]);
  const fog = useMemo(() => new Uint8Array(map.width * map.height), [map]);
  // The camera follows Pip: stand them in the square by Gran's workshop, where it all starts.
  const walker = useRef(newWalker(map.spawn.x + 4, map.spawn.y - 1, 'down'));

  const place = useCallback(() => placeResidents(people, ROUTINES[map.id], dayClockSeconds(), false), [people, map.id]);
  const [residents, setResidents] = useState(place);
  useEffect(() => {
    const id = setInterval(() => setResidents(place()), 250);
    return () => clearInterval(id);
  }, [place]);

  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  return (
    <WorldCanvas
      map={map}
      paused={!focused}
      lit={lit}
      fog={fog}
      residents={residents}
      bubbles={[]}
      walker={walker}
      onTick={noop}
      onView={noop}
      nightDim={0.62}
      cellsTall={22}
    />
  );
}
