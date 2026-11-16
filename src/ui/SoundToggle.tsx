// One button to turn the music and sound effects off and on (remembered in the save).

import { useGame } from './game';
import { PixelButton } from './pixel';

export function SoundToggle({ size = 12 }: { size?: number }) {
  const { save, commitSave } = useGame();
  return (
    <PixelButton
      label={save.muted ? '♪ Off' : '♪ On'}
      tone="cream"
      size={size}
      onPress={() => commitSave({ ...save, muted: !save.muted })}
    />
  );
}
