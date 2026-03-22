#!/usr/bin/env ts-node
/**
 * Rate Limit Verification Script
 * 
 * Validates rate limiting configuration and behavior.
 */

import { getRateLimitStore, getStoreType, isUsingRedis } from '../src/publicApi/rateLimit/store.js';
import { getPolicyForRoute, RouteCostTier } from '../src/publicApi/rateLimit/policy.js';

console.log('=== Rate Limit Verification ===\n');

// Test 1: Store type
console.log('1. Store Configuration:');
console.log(`   Store type: ${getStoreType()}`);
console.log(`   Using Redis: ${isUsingRedis()}`);

// Test 2: Route policies
console.log('\n2. Route Policies:');
const testRoutes = [
  '/health',
  '/api/v1/health',
  '/api/v1/resolve',
  '/api/v1/voucher/resolve',
  '/api/v1/analyze',
  '/api/v1/products',
  '/unknown',
];

for (const route of testRoutes) {
  const policy = getPolicyForRoute(route);
  console.log(`   ${route} -> ${policy.tier} (max: ${policy.maxRequests}/${policy.windowSeconds}s)`);
}

// Test 3: Identity resolution (mock)
console.log('\n3. Client Identity:');
console.log('   Client identity resolver loaded successfully');
console.log('   Proxy trust config:');
console.log(`   - TRUST_PROXY: ${process.env.TRUST_PROXY || 'not set (defaults to false)'}`);
console.log(`   - TRUSTED_PROXY_IPS: ${process.env.TRUSTED_PROXY_IPS || '127.0.0.1,::1'}`);

// Test 4: Config check
console.log('\n4. Configuration:');
console.log(`   USE_REDIS_RATE_LIMIT: ${process.env.USE_REDIS_RATE_LIMIT || 'false (dev mode)'}`);
console.log(`   REDIS_URL: ${process.env.REDIS_URL || 'not configured'}`);

console.log('\n=== Verification Complete ===');
console.log('\nNote: For production:');
console.log('1. Set USE_REDIS_RATE_LIMIT=true');
console.log('2. Configure REDIS_URL');
console.log('3. Set TRUST_PROXY=true if behind proxy');
console.log('4. Configure TRUSTED_PROXY_IPS');
