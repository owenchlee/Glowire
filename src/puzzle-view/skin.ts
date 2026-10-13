// The wire glow and workbench colours bought in the shop. The board reads them when it
// opens; the game save sets them.

export interface Skin {
  wire: { color: string; glow: string };
  board: { side: string; cellA: string; cellB: string; backdrop: string };
}

let skin: Skin = {
  wire: { color: '#e8a93a', glow: '#ffd56b' },
  board: { side: '#e6d6c0', cellA: '#f3e8d8', cellB: '#efe2cf', backdrop: '#f3ece4' },
};

export function currentSkin(): Skin {
  return skin;
}

export function wearSkin(wire: Skin['wire'], board: Skin['board']) {
  skin = { wire: { color: wire.color, glow: wire.glow }, board: { ...board } };
}
