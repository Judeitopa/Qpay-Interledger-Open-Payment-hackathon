/**
 * Qpay Automated Unit & Internal Integration Test Runner
 * Executes all fintech test suites and outputs structured report.
 */

import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const testFiles = [
  'tests/crossDevicePayment.test.js',
  'tests/korapayVault.test.js',
  'tests/interledgerOpenPayments.test.js',
  'tests/securityAndLimits.test.js',
  'tests/loginAuthentication.test.js'
];

console.log('='.repeat(65));
console.log('  QPAY FINTECH ENGINE — AUTOMATED INTERNAL & UNIT TESTS');
console.log('='.repeat(65));
console.log(`Node Engine: ${process.version}`);
console.log(`Running test suites: ${testFiles.length} files\n`);

const child = spawn(process.execPath, ['--test', ...testFiles], {
  stdio: 'inherit',
  shell: false
});

child.on('exit', (code) => {
  console.log('\n' + '='.repeat(65));
  if (code === 0) {
    console.log('  ALL UNIT & INTEGRATION TESTS PASSED CLEANLY (0 ERRORS)');
    console.log('  SYSTEM IS VERIFIED & READY FOR VERCEL DEPLOYMENT');
  } else {
    console.error(`  TEST RUN FAILED WITH EXIT CODE ${code}`);
  }
  console.log('='.repeat(65) + '\n');
  process.exit(code);
});
