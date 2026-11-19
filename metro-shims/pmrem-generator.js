// The game sets no environment maps, so the renderer never builds a PMREM; keep the name so the import resolves.
export class PMREMGenerator {
  constructor() {
    throw new Error('PMREMGenerator is not bundled on web');
  }
}
