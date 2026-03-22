/**
 * BI Validation Middleware
 */

export function validateDateRange(query: Record<string, unknown>): { valid: boolean; startDate?: Date; endDate?: Date; error?: string } {
  const startDateStr = query.startDate as string | undefined;
  const endDateStr = query.endDate as string | undefined;

  if (!startDateStr || !endDateStr) {
    return { valid: false, error: 'startDate and endDate required' };
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }

  if (startDate > endDate) {
    return { valid: false, error: 'startDate must be before endDate' };
  }

  return { valid: true, startDate, endDate };
}
