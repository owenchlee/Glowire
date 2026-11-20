let nzCols = new Int32Array(64 * 64); // reused scratch: pivot row `col`'s nonzero columns right of the diagonal, at [col * n ..]
let nzCount = new Int32Array(64);

/**
 * Solve A·x = b in place by Gaussian elimination with partial pivoting.
 * `a` is an n×n row-major matrix; the solution overwrites `b`.
 * Circuits on a small board give matrices of tens of rows, so a dense solve is
 * plenty fast and much simpler than a sparse LU.
 */
export function solveLinear(a: Float64Array, b: Float64Array, n: number): void {
  if (nzCols.length < n * n) nzCols = new Int32Array(Math.max(n * n, 2 * nzCols.length));
  if (nzCount.length < n) nzCount = new Int32Array(Math.max(n, 2 * nzCount.length));
  for (let col = 0; col < n; col++) {
    // Pivot: largest magnitude in this column, for numerical stability.
    const co = col * n;
    let pivotRow = col;
    let best = Math.abs(a[co + col]!);
    for (let r = col + 1, ro = co + n; r < n; r++, ro += n) {
      const v = Math.abs(a[ro + col]!);
      if (v > best) {
        best = v;
        pivotRow = r;
      }
    }
    if (best === 0) throw new Error(`singular circuit matrix at column ${col}`);
    if (pivotRow !== col) {
      for (let c = col; c < n; c++) {
        const t = a[col * n + c]!;
        a[col * n + c] = a[pivotRow * n + c]!;
        a[pivotRow * n + c] = t;
      }
      const t = b[col]!;
      b[col] = b[pivotRow]!;
      b[pivotRow] = t;
    }
    const pivot = a[co + col]!;
    // Circuit matrices are sparse: only the pivot row's nonzero columns change other rows
    // (x - f * 0 is x). Entries left of the diagonal are never read again, so skip them.
    let nz = 0;
    for (let c = col + 1; c < n; c++) if (a[co + c] !== 0) nzCols[co + nz++] = c;
    nzCount[col] = nz;
    for (let r = col + 1, ro = co + n; r < n; r++, ro += n) {
      const f = a[ro + col]! / pivot;
      if (f === 0) continue;
      for (let k = 0; k < nz; k++) {
        const c = nzCols[co + k]!;
        a[ro + c]! -= f * a[co + c]!;
      }
      b[r]! -= f * b[col]!;
    }
  }
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r]!;
    // A pivot row is final once chosen, and zero entries subtract nothing: visit only its recorded nonzeros.
    for (let k = 0, ro = r * n; k < nzCount[r]!; k++) {
      const c = nzCols[ro + k]!;
      s -= a[ro + c]! * b[c]!;
    }
    b[r] = s / a[r * n + r]!;
  }
}
