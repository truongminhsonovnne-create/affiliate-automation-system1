/**
 * MasOffer Sync CLI
 *
 * Usage:
 *   npx ts-node scripts/runMasOfferSync.ts --health
 *   npx ts-node scripts/runMasOfferSync.ts --offers [--dry-run]
 *   npx ts-node scripts/runMasOfferSync.ts --campaigns [--dry-run]
 *   npx ts-node scripts/runMasOfferSync.ts --full [--dry-run]
 *
 * Requires:
 *   MASOFFER_API_TOKEN
 *   MASOFFER_PUBLISHER_ID
 *   MASOFFER_BASE_URL         (optional, defaults to publisher-api.masoffer.net)
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { MasOfferApiClient, getMasOfferApiClient } from '../integrations/masoffer/MasOfferApiClient.js';
import {
  syncMasOfferOffers,
  syncMasOfferCampaigns,
  runMasOfferFullSync,
} from '../integrations/masoffer/masoffer.sync.js';

// =============================================================================
// CLI Arguments
// =============================================================================

interface CliArgs {
  health: boolean;
  offers: boolean;
  campaigns: boolean;
  full: boolean;
  dryRun: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    health: false,
    offers: false,
    campaigns: false,
    full: false,
    dryRun: false,
  };

  for (const arg of argv.slice(2)) {
    switch (arg) {
      case '--health':      args.health     = true; break;
      case '--offers':      args.offers     = true; break;
      case '--campaigns':   args.campaigns  = true; break;
      case '--full':        args.full       = true; break;
      case '--dry-run':     args.dryRun     = true; break;
      case '-h':
      case '--help':        showHelp(); process.exit(0);
    }
  }

  // Default to --health if no action specified
  if (!args.health && !args.offers && !args.campaigns && !args.full) {
    args.health = true;
  }

  return args;
}

function showHelp(): void {
  console.log(`
MasOffer Sync CLI

Usage:
  npx ts-node scripts/runMasOfferSync.ts [options]

Options:
  --health      Run connection health check and print summary (default)
  --offers      Sync all offers (deals + vouchers + coupons)
  --campaigns   Sync all campaigns
  --full        Run full sync (campaigns + offers)
  --dry-run     Simulate without writing to the database
  -h, --help    Show this help message
`);
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const args = parseArgs(process.argv);
  const client = getMasOfferApiClient();

  if (!client.isConfigured()) {
    console.error('[MasOffer] ERROR: MASOFFER_API_TOKEN or MASOFFER_PUBLISHER_ID is not set.');
    console.error('[MasOffer] Set these environment variables before running the sync.');
    process.exit(1);
  }

  if (args.health) {
    console.info('[MasOffer] Running health check...');
    const result = await client.testConnection();

    if (result.success) {
      if (result.rateLimited) {
        console.info('[MasOffer] ⚠ API reachable (rate-limited — auth accepted)');
        console.info(`         Response time : ${result.responseTimeMs}ms`);
        console.info(`         Rate limited  : retry in a few seconds`);
        console.info(`         Tested at     : ${result.testedAt}`);
      } else {
        console.info('[MasOffer] ✓ API reachable');
        console.info(`         Response time : ${result.responseTimeMs}ms`);
        console.info(`         Campaigns     : ${result.campaignCount ?? 'unknown'}`);
        console.info(`         Tested at     : ${result.testedAt}`);
      }
    } else {
      console.error('[MasOffer] ✗ API connection failed');
      console.error(`         Error: ${result.error}`);
      console.error(`         Response time: ${result.responseTimeMs}ms`);
      process.exit(1);
    }
  }

  if (args.offers) {
    console.info(`[MasOffer] Syncing offers (dry-run: ${args.dryRun})...`);
    const result = await syncMasOfferOffers(client, { dryRun: args.dryRun });
    printSyncResult('Offers', result);
  }

  if (args.campaigns) {
    console.info(`[MasOffer] Syncing campaigns (dry-run: ${args.dryRun})...`);
    const result = await syncMasOfferCampaigns(client, { dryRun: args.dryRun });
    printSyncResult('Campaigns', result);
  }

  if (args.full) {
    console.info(`[MasOffer] Running full sync (dry-run: ${args.dryRun})...`);
    const { campaigns, offers } = await runMasOfferFullSync(client, { dryRun: args.dryRun });
    printSyncResult('Campaigns', campaigns);
    printSyncResult('Offers', offers);
  }
}

function printSyncResult(label: string, result: {
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  durationMs: number;
}): void {
  console.info(`[MasOffer] ${label} sync result:`);
  console.info(`           Fetched : ${result.fetched}`);
  console.info(`           Inserted: ${result.inserted}`);
  console.info(`           Updated : ${result.updated}`);
  console.info(`           Skipped : ${result.skipped}`);
  console.info(`           Duration: ${result.durationMs}ms`);

  if (result.errors.length > 0) {
    console.error(`[MasOffer] ${label} errors:`);
    for (const err of result.errors) {
      console.error(`           - ${err}`);
    }
  }
}

main().catch((err) => {
  console.error('[MasOffer] Fatal error:', err);
  process.exit(1);
});
