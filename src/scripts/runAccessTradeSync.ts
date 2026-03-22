/**
 * AccessTrade Sync Entry Script
 *
 * Run manually:
 *   npm run accesstrade:sync           # full sync (deals + campaigns)
 *   npm run accesstrade:sync:deals      # deals only
 *   npm run accesstrade:sync:campaigns  # campaigns only
 *   npm run accesstrade:sync:dry       # dry run (fetch only, no DB writes)
 *
 * Or via tsx directly:
 *   npx tsx src/scripts/runAccessTradeSync.ts --deals --dry-run
 *   npx tsx src/scripts/runAccessTradeSync.ts --full
 */

import { syncAccessTradeDeals, syncAccessTradeCampaigns, runAccessTradeFullSync } from '../integrations/accesstrade/syncService.js';
import { getAccessTradeApiClient } from '../integrations/accesstrade/client.js';
import { getOfferCount, getLastSyncRun } from '../integrations/accesstrade/supabase.js';

// Parse CLI args
const args = process.argv.slice(2);

function hasArg(flag: string): boolean {
  return args.includes(flag);
}

const dryRun   = hasArg('--dry-run') || hasArg('-n');
const fullSync = hasArg('--full');
const dealsOnly = hasArg('--deals') && !fullSync;
const campaignsOnly = hasArg('--campaigns') && !fullSync;
const healthCheck = hasArg('--health') || hasArg('--test');

// =============================================================================
// Health / Test Mode
// =============================================================================

async function runHealthCheck(): Promise<void> {
  console.info('\n══════════════════════════════════════');
  console.info('  AccessTrade — Connection Health Check');
  console.info('══════════════════════════════════════\n');

  const client = getAccessTradeApiClient();

  if (!client.isConfigured()) {
    console.error('❌ ACCESSTRADE_API_KEY is not configured');
    process.exit(1);
  }

  console.info('✓ API key is configured (masked: ' + client.isConfigured() + ')');

  // Test connection
  const result = await client.testConnection();

  if (result.success) {
    console.info('✓ API connection: SUCCESS');
    console.info(`  Response time : ${result.responseTimeMs}ms`);
    console.info(`  Campaign count: ${result.campaignCount ?? '?'}`);
    console.info(`  Tested at     : ${result.testedAt}`);
  } else {
    console.error('✗ API connection: FAILED');
    console.error(`  Error: ${result.error}`);
    console.error(`  Response time : ${result.responseTimeMs}ms`);
    process.exit(1);
  }

  // Check Supabase
  try {
    const offerCount = await getOfferCount('accesstrade');
    console.info(`\n✓ Supabase connected`);
    console.info(`  AccessTrade offers in DB: ${offerCount}`);
  } catch (err) {
    console.warn('⚠ Supabase check failed:', err instanceof Error ? err.message : err);
  }

  // Check last sync run
  try {
    const lastRun = await getLastSyncRun('accesstrade');
    if (lastRun) {
      console.info(`\n  Last sync run:`);
      console.info(`    Job       : ${lastRun.job_name}`);
      console.info(`    Status    : ${lastRun.status}`);
      console.info(`    Started   : ${lastRun.started_at}`);
      console.info(`    Fetched   : ${lastRun.records_fetched}`);
      console.info(`    Inserted  : ${lastRun.records_inserted}`);
      console.info(`    Updated   : ${lastRun.records_updated}`);
      console.info(`    Skipped   : ${lastRun.records_skipped}`);
      if (lastRun.error_summary) {
        console.info(`    Errors    : ${lastRun.error_summary}`);
      }
    } else {
      console.info('\n  No previous sync runs found.');
    }
  } catch {
    // non-fatal
  }

  console.info('\n══════════════════════════════════════\n');
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  console.info('[AccessTrade] Sync script starting...');
  console.info(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE WRITE'}`);

  try {
    if (healthCheck) {
      await runHealthCheck();
      return;
    }

    if (fullSync || (!dealsOnly && !campaignsOnly)) {
      // Default: full sync
      const result = await runAccessTradeFullSync({ dryRun });
      console.info('\n=== Full Sync Result ===');
      console.info(`Deals:    fetched=${result.deals.recordsFetched} inserted=${result.deals.recordsInserted} updated=${result.deals.recordsUpdated} skipped=${result.deals.recordsSkipped} errors=${result.deals.errors}`);
      console.info(`Campaigns: fetched=${result.campaigns.recordsFetched} inserted=${result.campaigns.recordsInserted} updated=${result.campaigns.recordsUpdated} skipped=${result.campaigns.recordsSkipped} errors=${result.campaigns.errors}`);
      console.info(`Total duration: ${result.totalDurationMs}ms`);
    } else if (dealsOnly) {
      const stats = await syncAccessTradeDeals({ dryRun });
      console.info('\n=== Deals Sync Result ===');
      console.info(`Fetched=${stats.recordsFetched} Inserted=${stats.recordsInserted} Updated=${stats.recordsUpdated} Skipped=${stats.recordsSkipped} Errors=${stats.errors} Duration=${stats.durationMs}ms`);
    } else if (campaignsOnly) {
      const stats = await syncAccessTradeCampaigns({ dryRun });
      console.info('\n=== Campaigns Sync Result ===');
      console.info(`Fetched=${stats.recordsFetched} Inserted=${stats.recordsInserted} Updated=${stats.recordsUpdated} Skipped=${stats.recordsSkipped} Errors=${stats.errors} Duration=${stats.durationMs}ms`);
    }

    console.info('\n✓ Sync complete');
  } catch (err) {
    console.error('\n✗ Sync failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
