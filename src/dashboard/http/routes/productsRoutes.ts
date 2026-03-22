/**
 * Dashboard Products Routes
 *
 * HTTP routes for dashboard products.
 */

import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../controlPlane/http/middleware/errorHandler.js';
import * as productsService from '../services/dashboardProductsService.js';
import { validateProductListQuery, validateProductDetailQuery } from '../filters/schemas.js';
import { buildDashboardSuccessResponse, buildDashboardValidationError, buildDashboardNotFoundError } from '../contracts.js';

const router = Router();

/**
 * GET /internal/dashboard/products
 * Get paginated list of products
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  // Validate query
  const validation = validateProductListQuery(req.query);

  if (!validation.success) {
    res.status(400).json(buildDashboardValidationError(
      validation.error.errors[0]?.message || 'Invalid query',
      validation.error.errors,
      'query'
    ));
    return;
  }

  const {
    page,
    pageSize,
    sort,
    status,
    source,
    categoryId,
    hasAiContent,
    hasPublished,
    search,
  } = validation.data;

  const result = await productsService.getDashboardProducts({
    page,
    pageSize,
    sortField: sort?.field,
    sortDirection: sort?.direction,
    status,
    source,
    categoryId,
    hasAiContent,
    hasPublished,
    search,
  });

  res.json(buildDashboardSuccessResponse(result));
}));

/**
 * GET /internal/dashboard/products/:productId
 * Get product detail
 */
router.get('/:productId', asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;

  // Validate ID format
  const validation = validateProductDetailQuery({ productId });

  if (!validation.success) {
    res.status(400).json(buildDashboardValidationError(
      validation.error.errors[0]?.message || 'Invalid product ID',
      validation.error.errors,
      'productId'
    ));
    return;
  }

  const result = await productsService.getDashboardProductDetail(productId);

  if (!result) {
    res.status(404).json(buildDashboardNotFoundError('Product', productId));
    return;
  }

  res.json(buildDashboardSuccessResponse(result));
}));

export default router;
