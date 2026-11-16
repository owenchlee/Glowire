// Undo history around BoardState. Pure, so it can drive a useReducer and be tested.

import { getPorts } from '../engine';
import type { BoardState } from './board';

export interface History {
  board: BoardState;
  past: BoardState[];
}

export type HistoryAction =
  | { type: 'edit'; edit: (board: BoardState) => BoardState }
  | { type: 'undo' }
  | { type: 'reset'; board: BoardState };

const MAX_UNDO = 100;

// Same tiles in the same cells (ids aside): the player would see nothing change.
// A wire is its ports, so a straight spinner turned a half-turn counts as the same.
const looks = (b: BoardState) =>
  JSON.stringify(b.cells.map((p) => (p?.tile.kind === 'wire' ? [p.tile.locked, p.tile.spin, getPorts(p.tile)] : (p?.tile ?? null))));
const sameLook = (a: BoardState, b: BoardState) => looks(a) === looks(b);

export function historyReducer(state: History, action: HistoryAction): History {
  switch (action.type) {
    case 'edit': {
      const next = action.edit(state.board);
      // Edits that change nothing (e.g. rotating a locked tile) don't fill the undo stack.
      if (next === state.board || sameLook(next, state.board)) return state;
      return { board: next, past: [...state.past.slice(-(MAX_UNDO - 1)), state.board] };
    }
    case 'undo': {
      const previous = state.past.at(-1);
      return previous ? { board: previous, past: state.past.slice(0, -1) } : state;
    }
    case 'reset':
      if (sameLook(action.board, state.board)) return state;
      // Reset is undoable too, in case it was tapped by accident.
      return { board: action.board, past: [...state.past.slice(-(MAX_UNDO - 1)), state.board] };
  }
}
