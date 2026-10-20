import { mkdir, writeFile } from 'node:fs/promises';
import { RESOURCES } from '../src/config';
import { remotePayload } from '../src/data/codec';
import { seedDatabase } from '../src/data/seed';

async function main() {
  const db = seedDatabase();
  await mkdir('docs/mockapi', { recursive: true });
  for (const collection of ['categories', 'dishes'] as const) {
    await writeFile(
      `docs/mockapi/${RESOURCES[collection]}.json`,
      `${JSON.stringify(db[collection].map(remotePayload), null, 2)}\n`,
    );
  }
  console.log(
    'Exported MSSV-prefixed sample data to docs/mockapi/. The app can upload this data automatically.',
  );
}
void main();
