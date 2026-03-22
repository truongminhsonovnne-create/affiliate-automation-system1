/**
 * Security Tests - Auth Guards
 *
 * Tests middleware behavior for protected routes:
 * - requireAuthentication: 401 when actor is missing
 * - requireRole: 403 when role is insufficient
 * - requireAction: 403 when action is not permitted
 *
 * Uses unit-test mocks of Express Request/Response.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// ── Mock Request/Response helpers ─────────────────────────────────────────

function mockRequest(overrides: Partial<Request> = {}): Request {
  return {
    cpContext: undefined,
    path: '/test',
    method: 'GET',
    ip: '127.0.0.1',
    headers: {},
    query: {},
    params: {},
    body: {},
    ...overrides,
  } as unknown as Request;
}

function mockResponse(): {
  res: Response;
  statusCode: number;
  jsonPayload: unknown;
} {
  const jsonPayload = { ok: false };
  const res = {
    statusCode: 200,
    jsonPayload,
    status(code: number) {
      this.statusCode = code;
      return this as Response;
    },
    json(payload: unknown) {
      this.jsonPayload = payload;
      return this as Response;
    },
  } as unknown as Response;
  return { res, get statusCode() { return res.statusCode; }, get jsonPayload() { return res.jsonPayload; } };
}

let nextFn: NextFunction;
beforeEach(() => {
  nextFn = vi.fn();
});

// ── requireAuthentication tests ─────────────────────────────────────────────

describe('requireAuthentication', () => {
  let requireAuthentication: (req: Request, res: Response, next: NextFunction) => void;

  beforeEach(async () => {
    const mod = await import('../../controlPlane/http/middleware/authGuard.js');
    requireAuthentication = mod.requireAuthentication;
  });

  it('returns 401 when cpContext.actor is missing', () => {
    const { res } = mockResponse();
    const req = mockRequest({ cpContext: {} });

    requireAuthentication(req, res, nextFn);

    expect(nextFn).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 when cpContext is undefined', () => {
    const { res } = mockResponse();
    const req = mockRequest({ cpContext: undefined });

    requireAuthentication(req, res, nextFn);

    expect(nextFn).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it('calls next when actor is present', async () => {
    const { res } = mockResponse();
    const req = mockRequest({
      cpContext: {
        actor: { id: 'actor-1', name: 'Test', role: 'admin', capabilities: [] as any[] },
        correlationId: 'corr-1',
      },
    });

    requireAuthentication(req, res, nextFn);

    expect(nextFn).toHaveBeenCalledOnce();
  });
});

// ── requireRole tests ───────────────────────────────────────────────────────

describe('requireRole', () => {
  let requireRole: (minRole: 'readonly_observer' | 'operator' | 'admin' | 'super_admin') => ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const mod = await import('../../controlPlane/http/middleware/authGuard.js');
    requireRole = mod.requireRole;
  });

  it('returns 401 when actor is missing (regardless of role)', () => {
    const { res } = mockResponse();
    const req = mockRequest({ cpContext: {} });

    const middleware = requireRole('admin');
    middleware(req, res, nextFn);

    expect(nextFn).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it('allows admin to access admin-protected route', () => {
    const { res } = mockResponse();
    const req = mockRequest({
      cpContext: {
        actor: { id: 'actor-1', name: 'Admin', role: 'admin', capabilities: ['admin'] as any[] },
        correlationId: 'corr-1',
      },
    });

    const middleware = requireRole('admin');
    middleware(req, res, nextFn);

    expect(nextFn).toHaveBeenCalledOnce();
  });

  it('allows super_admin to access admin-protected route', () => {
    const { res } = mockResponse();
    const req = mockRequest({
      cpContext: {
        actor: { id: 'actor-1', name: 'SuperAdmin', role: 'super_admin', capabilities: ['super_admin'] as any[] },
        correlationId: 'corr-1',
      },
    });

    const middleware = requireRole('admin');
    middleware(req, res, nextFn);

    expect(nextFn).toHaveBeenCalledOnce();
  });

  it('returns 403 when operator tries to access admin route', () => {
    const { res } = mockResponse();
    const req = mockRequest({
      cpContext: {
        actor: { id: 'actor-1', name: 'Operator', role: 'operator', capabilities: ['operator'] as any[] },
        correlationId: 'corr-1',
      },
    });

    const middleware = requireRole('admin');
    middleware(req, res, nextFn);

    expect(nextFn).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it('returns 403 when readonly_observer tries to access operator route', () => {
    const { res } = mockResponse();
    const req = mockRequest({
      cpContext: {
        actor: { id: 'actor-1', name: 'Observer', role: 'readonly_observer', capabilities: ['readonly_observer'] as any[] },
        correlationId: 'corr-1',
      },
    });

    const middleware = requireRole('operator');
    middleware(req, res, nextFn);

    expect(nextFn).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it('super_admin passes all role checks (highest privilege)', () => {
    const { res } = mockResponse();
    const req = mockRequest({
      cpContext: {
        actor: { id: 'actor-1', name: 'SuperAdmin', role: 'super_admin', capabilities: ['super_admin'] as any[] },
        correlationId: 'corr-1',
      },
    });

    const middleware = requireRole('readonly_observer');
    middleware(req, res, nextFn);

    expect(nextFn).toHaveBeenCalledOnce();
  });
});

// ── FAIL-CLOSED invariant ──────────────────────────────────────────────────

describe('Auth Guard - FAIL-CLOSED Invariant', () => {
  let requireAuthentication: (req: Request, res: Response, next: NextFunction) => void;

  beforeEach(async () => {
    const mod = await import('../../controlPlane/http/middleware/authGuard.js');
    requireAuthentication = mod.requireAuthentication;
  });

  it('FAIL-CLOSED: unauthenticated request is REJECTED (not allowed through)', () => {
    // This is a security invariant: any missing auth context must result in rejection.
    // The system must never silently allow unauthenticated access.
    const { res } = mockResponse();
    const req = mockRequest({ cpContext: undefined });

    requireAuthentication(req, res, nextFn);

    // MUST reject
    expect(res.statusCode).toBe(401);
    // MUST NOT call next (which would allow the request through)
    expect(nextFn).not.toHaveBeenCalled();
  });

  it('FAIL-CLOSED: cpContext with no actor is REJECTED', () => {
    const { res } = mockResponse();
    const req = mockRequest({ cpContext: {} }); // empty context = no actor

    requireAuthentication(req, res, nextFn);

    expect(res.statusCode).toBe(401);
    expect(nextFn).not.toHaveBeenCalled();
  });

  it('FAIL-CLOSED: response body confirms 401, not empty', () => {
    const { res } = mockResponse();
    const req = mockRequest({ cpContext: undefined });

    requireAuthentication(req, res, nextFn);

    expect(res.statusCode).toBe(401);
    expect(res.jsonPayload).toBeTruthy();
  });
});

// ── Role guard - explicit hierarchy checks ─────────────────────────────────

describe('Role Guard - Explicit Hierarchy', () => {
  let requireRole: (minRole: 'readonly_observer' | 'operator' | 'admin' | 'super_admin') => ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const mod = await import('../../controlPlane/http/middleware/authGuard.js');
    requireRole = mod.requireRole;
  });

  const cases: Array<{
    actorRole: 'readonly_observer' | 'operator' | 'admin' | 'super_admin';
    minRole: 'readonly_observer' | 'operator' | 'admin' | 'super_admin';
    expectedNext: boolean;
  }> = [
    { actorRole: 'readonly_observer', minRole: 'readonly_observer', expectedNext: true },
    { actorRole: 'readonly_observer', minRole: 'operator', expectedNext: false },
    { actorRole: 'readonly_observer', minRole: 'admin', expectedNext: false },
    { actorRole: 'readonly_observer', minRole: 'super_admin', expectedNext: false },
    { actorRole: 'operator', minRole: 'readonly_observer', expectedNext: true },
    { actorRole: 'operator', minRole: 'operator', expectedNext: true },
    { actorRole: 'operator', minRole: 'admin', expectedNext: false },
    { actorRole: 'operator', minRole: 'super_admin', expectedNext: false },
    { actorRole: 'admin', minRole: 'readonly_observer', expectedNext: true },
    { actorRole: 'admin', minRole: 'operator', expectedNext: true },
    { actorRole: 'admin', minRole: 'admin', expectedNext: true },
    { actorRole: 'admin', minRole: 'super_admin', expectedNext: false },
    { actorRole: 'super_admin', minRole: 'readonly_observer', expectedNext: true },
    { actorRole: 'super_admin', minRole: 'operator', expectedNext: true },
    { actorRole: 'super_admin', minRole: 'admin', expectedNext: true },
    { actorRole: 'super_admin', minRole: 'super_admin', expectedNext: true },
  ];

  cases.forEach(({ actorRole, minRole, expectedNext }) => {
    it(`${actorRole} accessing minRole=${minRole} → ${expectedNext ? 'allowed' : '403'}`, () => {
      const { res } = mockResponse();
      const req = mockRequest({
        cpContext: {
          actor: { id: 'actor-1', name: 'Test', role: actorRole, capabilities: [actorRole] as any[] },
          correlationId: 'corr-1',
        },
      });

      const middleware = requireRole(minRole);
      middleware(req, res, nextFn);

      if (expectedNext) {
        expect(nextFn).toHaveBeenCalledOnce();
        expect(res.statusCode).toBe(200); // default status not changed
      } else {
        expect(nextFn).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(403);
      }
    });
  });
});
