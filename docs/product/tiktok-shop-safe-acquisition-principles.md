# TikTok Shop Safe Acquisition Principles

## Core Philosophy

We believe in **safe acquisition before scale**. TikTok Shop data acquisition must be built on proven safety, quality, and governance - not optimistic assumptions about scraping stability.

## Key Principles

### 1. Safe Rollout Before Scale

**Principle**: Acquisition infrastructure must prove safety before scaling.

**Implications**:
- Start with conservative concurrency limits
- Monitor health metrics closely
- Implement automatic pause/throttle
- Have clear rollback procedures

**Thresholds**:
- Error rate > 20% → Pause
- Error rate > 15% → Throttle
- Health score < 50% → Degraded
- Health score < 30% → Unhealthy

### 2. Discovery/Detail Separation

**Principle**: Discovery and detail extraction are different operations with different requirements.

**Implications**:
- Separate runtimes for discovery vs detail
- Different concurrency limits
- Different quality thresholds
- Different governance rules

**Discovery**:
- Higher concurrency OK
- More tolerant of partial data
- Focus on candidate generation

**Detail Extraction**:
- Lower concurrency required
- Higher quality requirements
- Focus on field completeness

### 3. Evidence-First Extraction

**Principle**: Extract evidence first, then evaluate quality.

**Implications**:
- Always collect extraction metadata
- Record selectors used
- Track confidence scores
- Build quality scores from evidence

**Evidence Components**:
- URL accessed
- Selectors used
- Fallback selectors attempted
- Extraction method
- Confidence per field

### 4. Partial Support Must Be Explicit

**Principle**: Clearly mark what works vs what doesn't.

**Support States**:
- **Supported**: Full capability with stable selectors
- **Partial**: Some fields with known gaps
- **Fragile**: May break - use with caution
- **Unsupported**: Not implemented

### 5. No Aggressive Acquisition Until Readiness Proves Out

**Principle**: Don't scale until health and quality are proven.

**Requirements for Scale**:
- Health score ≥ 80% for 24+ hours
- Error rate < 10% for 1000+ requests
- Quality scores ≥ 60% for 100+ extractions
- Governance approval

### 6. Health/Governance Before Scale

**Principle**: Automatic safety mechanisms must govern acquisition.

**Governance Rules**:
- Auto-pause on critical error rate
- Auto-throttle on elevated error rate
- Manual override required for resume
- Clear escalation path

## Implementation Guidelines

### Runtime Safety

1. **Concurrency Control**: Start with 1-2 concurrent operations
2. **Rate Limiting**: 10 requests/minute max initially
3. **Session Management**: Recycle sessions after 50 requests
4. **Timeout Handling**: 60s for navigation, 15s for extraction

### Error Handling

1. **Classification**: Categorize all failures
2. **Retry Logic**: Exponential backoff with jitter
3. **Isolation**: Failures shouldn't cascade
4. **Recovery**: Clear recovery procedures

### Quality Assurance

1. **Field Coverage**: Track per-field completeness
2. **Confidence Scoring**: Score each extraction
3. **Gap Detection**: Identify missing data
4. **Trend Analysis**: Monitor quality over time

### Monitoring

1. **Real-time Health**: Track success/error rates
2. **Quality Metrics**: Monitor extraction quality
3. **Governance Alerts**: Auto-pause/throttle
4. **Escalation**: Clear alert paths

## Decision Framework

### When to Scale Up

- Health score ≥ 80% sustained
- Error rate < 10%
- Quality scores ≥ 60%
- Governance approval

### When to Scale Down

- Health score < 60%
- Error rate > 15%
- Quality scores < 50%

### When to Pause

- Health score < 30%
- Error rate > 20%
- Consecutive failures ≥ 5
- Anti-bot detection triggered

## Anti-Patterns to Avoid

1. **Spaghetti Scraping**: No separation of concerns
2. **Naive Page Hammering**: No delays, no respect for server
3. **Fake Completeness**: Claiming support for missing fields
4. **No Failure Isolation**: One failure takes down everything
5. **Ignoring Health**: Continuing despite warnings

## Conclusion

These principles ensure TikTok Shop acquisition is built on a foundation of safety, quality, and governance. By following these principles, we can safely explore TikTok Shop data while being prepared to pause or throttle at any sign of trouble.
