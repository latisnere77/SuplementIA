#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'fs';
import {
  importSeoAggregateEventsFromCsv,
  renderSeoAggregateEvents,
  type SeoExportOutputFormat,
  type SeoExportSource,
} from '../../lib/research-audit/seo-export-importer';

type CliOptions = {
  inputPath?: string;
  outputPath?: string;
  source?: SeoExportSource;
  format: SeoExportOutputFormat;
  idPrefix?: string;
  defaultQuery?: string;
  firstSeen?: string;
  lastSeen?: string;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    format: 'json',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--input' && next) {
      options.inputPath = next;
      index += 1;
    } else if (arg === '--output' && next) {
      options.outputPath = next;
      index += 1;
    } else if (arg === '--source' && isSeoSource(next)) {
      options.source = next;
      index += 1;
    } else if (arg === '--format' && (next === 'json' || next === 'jsonl')) {
      options.format = next;
      index += 1;
    } else if (arg === '--id-prefix' && next) {
      options.idPrefix = next;
      index += 1;
    } else if (arg === '--default-query' && next) {
      options.defaultQuery = next;
      index += 1;
    } else if (arg === '--first-seen' && next) {
      options.firstSeen = next;
      index += 1;
    } else if (arg === '--last-seen' && next) {
      options.lastSeen = next;
      index += 1;
    }
  }

  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.inputPath) {
    throw new Error('Missing --input path to a Search Console or GA4 CSV export');
  }
  if (!options.source) {
    throw new Error('Missing --source search_console|ga4');
  }

  const csvContent = readFileSync(options.inputPath, 'utf8');
  const events = importSeoAggregateEventsFromCsv(csvContent, {
    source: options.source,
    idPrefix: options.idPrefix,
    defaultQuery: options.defaultQuery,
    firstSeen: options.firstSeen,
    lastSeen: options.lastSeen,
  });
  const output = renderSeoAggregateEvents(events, options.format);

  if (options.outputPath) {
    writeFileSync(options.outputPath, output);
  } else {
    process.stdout.write(output);
  }
}

main();

function isSeoSource(value: string | undefined): value is SeoExportSource {
  return value === 'search_console' || value === 'ga4';
}
