import childProcess from 'node:child_process';

const commands = [
  ['scoring', 'node', ['scripts/v2-product-validation/diagnose-v2-calibration.mjs']],
  ['archive', 'node', ['scripts/v2-product-validation/audit-beta-archive-assets.mjs']],
];

const results = [];

for (const [name, command, args] of commands) {
  console.log(`\n[v2:audit:${name}] ${command} ${args.join(' ')}`);
  const result = childProcess.spawnSync(command, args, {
    stdio: 'inherit',
  });
  results.push({ name, status: result.status ?? 1 });
}

const failed = results.filter((result) => result.status !== 0);
console.log('\n[v2:audit:all] summary');
for (const result of results) {
  console.log(`- ${result.name}: ${result.status === 0 ? 'passed' : `failed (${result.status})`}`);
}

if (failed.length) process.exitCode = 1;
