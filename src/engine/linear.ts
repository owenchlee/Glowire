let nzCols = new Int32Array(64); // reused scratch: nonzero columns of the current pivot row

/**
 * Solve A·x = b in place by Gaussian elimination with partial pivoting.
 * `a` is an n×n row-major matrix; the solution overwrites `b`.
 * Circuits on a small board give matrices of tens of rows, so a dense solve is
 * plenty fast and much simpler than a sparse LU.
 */
export function solveLinear(a: Float64Array, b: Float64Array, n: number): void {
  if (nzCols.length < n) nzCols = new Int32Array(Math.max(n, 2 * nzCols.length));
  for (let col = 0; col < n; col++) {
    // Pivot: largest magnitude in this column, for numerical stability.
    let pivotRow = col;
    let best = Math.abs(a[col * n + col]!);
    for (let r = col + 1; r < n; r++) {
      const v = Math.abs(a[r * n + col]!);
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
    const pivot = a[col * n + col]!;
    // Circuit matrices are sparse: only the pivot row's nonzero columns change other rows
    // (x - f * 0 is x). Entries left of the diagonal are never read again, so skip them.
    let nz = 0;
    for (let c = col + 1; c < n; c++) if (a[col * n + c] !== 0) nzCols[nz++] = c;
    for (let r = col + 1; r < n; r++) {
      const f = a[r * n + col]! / pivot;
      if (f === 0) continue;
      for (let k = 0; k < nz; k++) {
        const c = nzCols[k]!;
        a[r * n + c]! -= f * a[col * n + c]!;
      }
      b[r]! -= f * b[col]!;
    }
  }
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r]!;
    for (let c = r + 1; c < n; c++) s -= a[r * n + c]! * b[c]!;
    b[r] = s / a[r * n + r]!;
  }
}
