'use strict';

const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const REPOSITORY = 'litlynx/react-native-enriched-html';
const PACKAGE_JSON = 'package.json';

function run(command, args, options = {}) {
  const output = execFileSync(command, args, {
    encoding: 'utf8',
    stdio: options.stdio || ['ignore', 'pipe', 'inherit'],
  });
  return typeof output === 'string' ? output.trim() : '';
}

const branch = run('git', ['branch', '--show-current']);
if (branch !== 'main') {
  throw new Error(`Releases must run from main, got ${branch || '<detached>'}`);
}

if (run('git', ['status', '--porcelain'])) {
  throw new Error('Release requires a clean working tree');
}

const bump = process.argv[2] || 'patch';
run('npm', ['version', bump, '--no-git-tag-version'], { stdio: 'inherit' });

const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
if (!/^\d+\.\d+\.\d+$/.test(packageJson.version)) {
  throw new Error(
    `Release version must use stable x.y.z format: ${packageJson.version}`
  );
}

const tag = `v${packageJson.version}`;

run('yarn', ['prepare'], { stdio: 'inherit' });
run('git', ['add', PACKAGE_JSON], { stdio: 'inherit' });
run('git', ['commit', '-m', `chore: release ${tag}`], { stdio: 'inherit' });
run('git', ['tag', '-a', tag, '-m', `Release ${tag}`], { stdio: 'inherit' });
run('git', ['push', 'origin', 'main'], { stdio: 'inherit' });
run('git', ['push', 'origin', tag], { stdio: 'inherit' });

run(
  'gh',
  [
    'workflow',
    'run',
    'publish-github-package.yml',
    '--repo',
    REPOSITORY,
    '--ref',
    tag,
  ],
  { stdio: 'inherit' }
);

console.log(`Released ${packageJson.name}@${packageJson.version}`);
