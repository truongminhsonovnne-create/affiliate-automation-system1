# TikTok Shop Domain Runbook

## Overview

This runbook guides the team through evaluating and implementing the TikTok Shop domain layer.

---

## Running Domain Reviews

### Basic Usage

```bash
# Run domain review
npm run tiktok:domain-review

# Run promotion compatibility review
npm run tiktok:promotion-review
```

---

## Reading Domain Readiness

### Score Breakdown

```
Overall Score: 35%

Reference Parsing:  60% ████████████░░░░░░
Context Modeling:  40% ████████░░░░░░░░░
Promotion Compat:  30% ██████░░░░░░░░░░░
Integration:     20% █████░░░░░░░░░░░░
```

### Interpreting Results

| Status | Score | Action |
|--------|-------|---------|
| Ready | ≥80% | Can proceed to implementation |
| Partial | 50-80% | Address gaps before proceeding |
| Not Ready | <50% | Major blockers exist |

---

## Common Issues

### Reference Parsing Issues

**Problem:** URL not recognized

**Solution:**
1. Check URL format matches supported patterns
2. Verify domain is TikTok Shop
3. Add new pattern if needed

### Context Gaps

**Problem:** Missing product context

**Solution:**
1. Implement context resolver service
2. Add required fields: productId, seller, price
3. Test with real TikTok Shop data

### Promotion Compatibility

**Problem:** Promotion not mapping cleanly

**Solution:**
1. Check promotion type in compatibility matrix
2. Use workaround if available
3. Flag as unsupported if no solution

---

## Decision Framework

### When to Proceed

- Reference parsing score ≥70%
- Context modeling score ≥60%
- Promotion compatibility score ≥50%
- No critical blockers

### When to Hold

- Any critical blocker exists
- Multiple high-priority gaps
- Significant semantic differences

### When to Revisit

- Review quarterly
- Re-evaluate after TikTok Shop changes
- Update compatibility as needed

---

## Backlog Management

### Viewing Backlog

```bash
curl http://localhost:3000/internal/platforms/tiktok-shop/backlog
```

### Priorities

1. **Critical**: Reference parsing, context required fields
2. **High**: Promotion mapping, context optional fields
3. **Medium**: Additional patterns, enhanced context
4. **Low**: Optimization, edge cases

---

## Integration Checklist

Before production:

- [ ] Reference parsing tested with real URLs
- [ ] Context resolver returns required fields
- [ ] Promotion compatibility reviewed
- [ ] Adapter contracts implemented
- [ ] Integration tests pass
- [ ] Documentation updated
