# Pull Request Template

## Summary

<!-- Provide a brief summary of the changes in this PR -->

| Property | Value |
|----------|-------|
| **Type** | Feature / Bug Fix / Refactor / Documentation |
| **Target** | `main` / `develop` / `release/...` |
| **Related Issue** | # (if applicable) |

## Changes

<!-- Describe what changed and why -->

### Files Changed

- `file1.ts` - Description
- `file2.ts` - Description

### Code Changes

```typescript
// Before
function oldCode() { }

/// After
function newCode() { }
```

## Runtime Impact

<!-- Describe runtime impact of changes -->

### Affected Components

- [ ] Web Application
- [ ] Control Plane
- [ ] Worker - Crawler
- [ ] Worker - AI
- [ ] Worker - Publisher
- [ ] Ops Runner

### Resource Changes

- [ ] New dependencies
- [ ] Configuration changes
- [ ] Environment variables
- [ ] Database queries
- [ ] API endpoints

## Migration Impact

<!-- If this PR includes database migrations -->

### Migrations

- [ ] No migrations
- [ ] New migrations added: `migration_name.sql`
- [ ] Migration rollback available

### Data Changes

- [ ] No data changes
- [ ] Backward compatible
- [ ] Requires data migration
- [ ] Breaking changes

## Security Impact

<!-- Security considerations -->

### Security Checklist

- [ ] No secrets exposed
- [ ] Input validation added/updated
- [ ] Authentication/Authorization reviewed
- [ ] API endpoints secured
- [ ] No sensitive data logged

## Verification Checklist

<!-- Complete before merging -->

### Local Testing

- [ ] Code compiles without errors
- [ ] Tests pass locally
- [ ] TypeScript strict passes
- [ ] Linting passes
- [ ] No console errors

### Integration Testing

- [ ] Staging deployment verified
- [ ] Health endpoints responding
- [ ] Workers boot correctly
- [ ] Database migrations successful

### Manual Testing

- [ ] Feature works as expected
- [ ] Edge cases handled
- [ ] Error handling works
- [ ] UI/UX verified (if applicable)

## Rollback Plan

<!-- How to rollback if needed -->

### Quick Rollback

```bash
git revert <commit>
git push
```

### Manual Steps

1. Step 1
2. Step 2

## Release Notes

<!-- For release notes (optional) -->

### Added
- New feature description

### Changed
- Changed behavior

### Fixed
- Bug fix description

### Removed
- Deprecated features

## Additional Notes

<!-- Any other context reviewers should know -->

---

**Reviewers:** @mention reviewers

**Labels:** `dependencies`, `security`, `bug`, `feature`, `refactor`
