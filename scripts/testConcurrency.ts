// Polyfill localStorage and window for headless node testing if needed
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, val: string) => { store.set(key, String(val)); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (i: number) => Array.from(store.keys())[i] || null,
    length: 0
  };
}

if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}

import { initLocalData } from '../src/lib/storage';
initLocalData();

import { runRaceConditionTest } from '../src/services/verifyStockEngine';

async function main() {
  console.log('====================================================');
  console.log('Running StockSense Stock Engine Concurrency Test');
  console.log('Scenario: Initial stock = 100 units.');
  console.log('Simultaneous delivery attempts: 80 units by User A, 80 units by User B.');
  console.log('====================================================');

  const result = await runRaceConditionTest();

  console.log('\nResult:');
  console.log('Passed:', result.passed ? '✅ YES (PASSED)' : '❌ NO (FAILED)');
  console.log('Message:', result.message);
  console.log('\nDetails:', JSON.stringify(result.details, null, 2));

  if (!result.passed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
