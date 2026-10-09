// Play an old version of Glowire, exactly as it was.
//
//   npm run play-version              lists the versions
//   npm run play-version v0.1         starts that version (web: press w, phone: scan the QR)
//
// Each version is a git tag. The tag is checked out into ../Glowire-versions/<tag> (a git
// worktree, so your current work is never touched), shares this repo's node_modules, and
// runs its own dev server on port 8090 so it can sit next to the current game on 8081.
// --clear matters: Metro's cache is shared, so without it an old version can show up.

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, symlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();

const tags = git('tag', '--list', 'v*', '--sort=v:refname').split('\n').filter(Boolean);
const wanted = process.argv[2];

if (!wanted) {
  console.log('Glowire versions (see docs/history/README.md):\n');
  for (const tag of tags)
    console.log(`  ${tag.padEnd(22)} ${git('tag', '-l', '--format=%(contents:subject)', tag)}`);
  console.log('\nRun: npm run play-version <version>, e.g. npm run play-version v0.1');
  process.exit(0);
}

const tag = tags.find((t) => t === wanted || t.startsWith(`${wanted}-`));
if (!tag) {
  console.error(`No version "${wanted}". Known: ${tags.join(', ')}`);
  process.exit(1);
}

const dir = resolve(repo, '..', 'Glowire-versions', tag);
if (!existsSync(dir)) {
  mkdirSync(dirname(dir), { recursive: true });
  git('worktree', 'add', '--detach', dir, tag);
}
const modules = join(dir, 'node_modules');
if (!existsSync(modules)) symlinkSync(join(repo, 'node_modules'), modules, 'junction');

console.log(`\nStarting ${tag} from ${dir}\n`);
spawn('npx', ['expo', 'start', '--port', '8090', '--clear', ...process.argv.slice(3)], {
  cwd: dir,
  stdio: 'inherit',
  shell: true,
});
