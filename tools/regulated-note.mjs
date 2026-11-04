// Adds a timestamped note to the run in progress, for anything done outside the tests: restarting the application,
// re-seeding data, waiting for an outage. The note appears in the report's "Changes and notes" section.
//
//   npm run regulated:note -- "restarted the application container at 10:12 after it stopped answering"
import { addNote } from './lib/change-record.mjs';
import { loadConfig, requireActive } from './lib/regulated-config.mjs';

const text = process.argv.slice(2).join(' ').trim();
if (!text) {
  console.error('Usage: npm run regulated:note -- "what you did outside the run, and why"');
  process.exit(2);
}
requireActive(loadConfig(), 'runLabels', 'The run notes feature');
const note = addNote(text);
console.log(`note recorded at ${note.at} by ${note.by}.`);
