// =============================================================================
// Voucher Catalog Routes
// Production-grade HTTP routes for voucher catalog operations
// =============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { voucherCatalogService } from '../service/voucherCatalogService.js';
import { runVoucherCatalogIngestion, ingestVoucherRecords } from '../catalog/voucherIngestionService.js';
import { voucherIngestionRunRepository } from '../repositories/voucherIngestionRunRepository.js';
import { voucherCatalogSourceRepository } from '../repositories/voucherCatalogSourceRepository.js';
import { validateIngestVouchersRequest, validateUuidParam } from '../middleware/voucherDataRequestValidation.js';
import { serializeVoucherCatalogEntry, serializeVoucherCatalogEntries, serializeIngestionRun, serializePaginatedResponse, serializeSource } from '../api/serializers.js';
import { logger } from '../../utils/logger.js';

const router = Router();

/**
 * GET /internal/vouchers/catalog
 * Get voucher catalog with filters
 */
router.get('/catalog', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const platform = req.query.platform as 'shopee' | 'lazada' | 'tiktok' | 'general' | undefined;
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
    const freshnessStatus = req.query.freshnessStatus as 'fresh' | 'stale' | 'expired' | 'unknown' | undefined;
    const sourceId = req.query.sourceId as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await voucherCatalogService.getVoucherCatalogWithFilters({
      platform,
      isActive,
      freshnessStatus,
      sourceId,
      limit,
      offset,
    });

    const response = serializePaginatedResponse(
      serializeVoucherCatalogEntries(result.data),
      result.total,
      limit,
      offset
    );

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /internal/vouchers/catalog/:id
 * Get a single voucher by ID
 */
router.get('/catalog/:id', validateUuidParam('id'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const voucher = await voucherCatalogService.getVoucherCatalogEntry(req.params.id);

    if (!voucher) {
      res.status(404).json({ error: 'Voucher not found' });
      return;
    }

    res.json(serializeVoucherCatalogEntry(voucher));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /internal/vouchers/catalog/ingest
 * Ingest vouchers from a source
 */
router.post('/catalog/ingest', validateIngestVouchersRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sourceId, vouchers, options } = req.body;

    // Run ingestion from source
    if (!vouchers || vouchers.length === 0) {
      const result = await runVoucherCatalogIngestion(sourceId, {
        triggeredBy: options?.triggeredBy,
      });
      res.json(result);
      return;
    }

    // Direct voucher ingestion
    const result = await ingestVoucherRecords(vouchers, {
      sourceId,
      triggeredBy: options?.triggeredBy,
      skipValidation: options?.skipValidation,
      skipNormalization: options?.skipNormalization,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /internal/vouchers/catalog/:id/refresh
 * Refresh a voucher catalog entry
 */
router.post('/catalog/:id/refresh', validateUuidParam('id'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const voucher = await voucherCatalogService.refreshVoucherCatalogEntry(req.params.id);

    if (!voucher) {
      res.status(404).json({ error: 'Voucher not found' });
      return;
    }

    res.json(serializeVoucherCatalogEntry(voucher));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /internal/vouchers/sources
 * Get all voucher sources
 */
router.get('/sources', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await voucherCatalogSourceRepository.findAll({
      limit: parseInt(req.query.limit as string) || 50,
      offset: parseInt(req.query.offset as string) || 0,
    });

    const response = serializePaginatedResponse(
      result.sources.map(serializeSource),
      result.total,
      parseInt(req.query.limit as string) || 50,
      parseInt(req.query.offset as string) || 0
    );

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /internal/vouchers/ingestion-runs
 * Get ingestion runs
 */
router.get('/ingestion-runs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sourceId = req.query.sourceId as string | undefined;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    let runs;
    if (sourceId) {
      runs = await voucherIngestionRunRepository.findBySourceId(sourceId, { limit, offset });
    } else {
      const result = await voucherIngestionRunRepository.findAll({ limit, offset });
      runs = result.runs;
    }

    res.json(serializePaginatedResponse(
      runs.map(serializeIngestionRun),
      runs.length,
      limit,
      offset
    ));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /internal/vouchers/ingestion-runs/:id
 * Get a single ingestion run
 */
router.get('/ingestion-runs/:id', validateUuidParam('id'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const run = await voucherIngestionRunRepository.findById(req.params.id);

    if (!run) {
      res.status(404).json({ error: 'Ingestion run not found' });
      return;
    }

    res.json(serializeIngestionRun(run));
  } catch (error) {
    next(error);
  }
});

export default router;
