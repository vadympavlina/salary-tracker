import { mkdirSync, writeFileSync } from 'node:fs';
import { buildRecord } from '../../src/services/storage/salaryStorage';
import { SAMPLE_INPUTS } from '../fixtures/sampleMonths';

/** Browser storage pre-filled with six sample months, so most tests start from a "used" app. */
export const SAMPLE_STATE = new URL('./.state/sample.json', import.meta.url).pathname;

export default function globalSetup() {
  const origin = 'http://localhost:4173';
  const records = SAMPLE_INPUTS.map((input, i) => ({ ...buildRecord(input), id: `sample-${i + 1}` }));
  // Settings as they were when the sample months were entered (tests rely on these rates).
  const settings = { pairRate: 350, videoRate: 45, advanceMode: 'part', defaultAdvance: 0, defaultCard: 0, theme: 'light' };
  mkdirSync(new URL('./.state/', import.meta.url).pathname, { recursive: true });
  writeFileSync(
    SAMPLE_STATE,
    JSON.stringify({
      cookies: [],
      origins: [
        {
          origin,
          localStorage: [
            { name: 'salary_meta', value: JSON.stringify({ schemaVersion: 3 }) },
            { name: 'salary_records', value: JSON.stringify(records) },
            { name: 'salary_settings', value: JSON.stringify(settings) },
            // Most tests use the app without signing in; cloud.spec.ts covers sign-in + sync.
            { name: 'salary_cloud_mode', value: 'local' },
          ],
        },
      ],
    }),
  );
}
