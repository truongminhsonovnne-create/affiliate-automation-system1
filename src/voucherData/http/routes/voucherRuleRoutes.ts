// =============================================================================
// Voucher Rule Routes
// Production-grade HTTP routes for voucher rule operations
// =============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import {
  createVoucherRuleSet,
  updateVoucherRuleSet,
  activateVoucherRuleSet,
  archiveVoucherRuleSet,
  listVoucherRuleSets,
} from '../rules/voucherRuleAuthoringService.js';
import { voucherRuleSetRepository } from '../repositories/voucherRuleSetRepository.js';
import {
  validateCreateRuleRequest,
  validateUpdateRuleRequest,
  validateActivateRuleRequest,
  validateArchiveRuleRequest,
  validateUuidParam,
} from '../middleware/voucherDataRequestValidation.js';
import { serializeRuleSet, serializePaginatedResponse } from '../api/serializers.js';

const router = Router();

/**
 * GET /internal/vouchers/rules
 * Get rule sets with filters
 */
router.get('/rules', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const voucherId = req.query.voucherId as string | undefined;
    const ruleStatus = req.query.ruleStatus as 'draft' | 'active' | 'archived' | 'superseded' | undefined;
    const validationStatus = req.query.validationStatus as 'pending' | 'valid' | 'invalid' | 'warning' | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await listVoucherRuleSets({
      voucherId,
      ruleStatus,
      validationStatus,
      limit,
      offset,
    });

    const response = serializePaginatedResponse(
      result.ruleSets.map(serializeRuleSet),
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
 * GET /internal/vouchers/rules/:id
 * Get a single rule set
 */
router.get('/rules/:id', validateUuidParam('id'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ruleSet = await voucherRuleSetRepository.findById(req.params.id);

    if (!ruleSet) {
      res.status(404).json({ error: 'Rule set not found' });
      return;
    }

    res.json(serializeRuleSet(ruleSet));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /internal/vouchers/rules
 * Create a new rule set
 */
router.post('/rules', validateCreateRuleRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { voucherId, ruleVersion, rulePayload, createdBy } = req.body;

    const ruleSet = await createVoucherRuleSet({
      voucherId,
      ruleVersion,
      rulePayload,
      createdBy,
    });

    res.status(201).json(serializeRuleSet(ruleSet));
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /internal/vouchers/rules/:id
 * Update a rule set
 */
router.patch('/rules/:id', validateUuidParam('id'), validateUpdateRuleRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ruleVersion, rulePayload } = req.body;

    const ruleSet = await updateVoucherRuleSet(req.params.id, {
      ruleVersion,
      rulePayload,
    });

    res.json(serializeRuleSet(ruleSet));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /internal/vouchers/rules/:id/activate
 * Activate a rule set
 */
router.post('/rules/:id/activate', validateUuidParam('id'), validateActivateRuleRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { activatedBy } = req.body;

    const ruleSet = await activateVoucherRuleSet(req.params.id, {
      activatedBy,
    });

    res.json(serializeRuleSet(ruleSet));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /internal/vouchers/rules/:id/archive
 * Archive a rule set
 */
router.post('/rules/:id/archive', validateUuidParam('id'), validateArchiveRuleRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { archivedBy } = req.body;

    const ruleSet = await archiveVoucherRuleSet(req.params.id, {
      archivedBy,
    });

    res.json(serializeRuleSet(ruleSet));
  } catch (error) {
    next(error);
  }
});

export default router;
