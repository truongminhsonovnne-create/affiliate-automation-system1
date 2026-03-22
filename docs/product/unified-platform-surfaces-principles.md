# Unified Platform Surfaces Principles

## Core Principles

### 1. Unify Where Meaningful

Unified surfaces should provide genuine operational value:

- **Operational efficiency**: Reduce context-switching between platforms
- **Consistent decision-making**: Same metrics, same definitions
- **Single source of truth**: One view for cross-platform status
- **Reduced cognitive load**: Teams see unified, not fragmented, data

### 2. Preserve Valid Platform Differences

Not everything should be unified:

- **Semantic differences**: When platforms have genuinely different behaviors
- **Capability gaps**: When one platform lacks features the other has
- **Consumer expectations**: When user experiences naturally differ
- **Business context**: When differences reflect valid business decisions

### 3. No Parity Theater

The system must never fake parity:

- **Explicit gaps**: Gaps are tracked and visible
- **Honest classification**: Parity levels reflect reality
- **No forced abstraction**: Don't make things look the same when they're not
- **Transparent exceptions**: Platform-specific behaviors are documented

### 4. No Degradation of Stable Production Flows

Changes must not break existing systems:

- **Shopee-safe**: Production Shopee flows remain stable
- **TikTok-safe**: Staged/preview TikTok flows remain stable
- **Backward compatibility**: Existing APIs continue working
- **Gradual rollout**: Changes can be rolled back

### 5. Explicit Exception Handling

All intentional platform differences must be documented:

- **Exception registry**: All exceptions are registered and tracked
- **Rationale required**: Each exception has a documented reason
- **Review cycles**: Exceptions are periodically re-evaluated
- **Deprecation paths**: Exceptions can be deprecated when no longer needed

## Surface Design Principles

### Unified Ops Surfaces

- Show platform-combined totals where meaningful
- Show per-platform breakdown for context
- Highlight when one platform significantly outperforms the other
- Include health status indicators

### Unified BI Surfaces

- Use consistent metric definitions across platforms
- Show both absolute values and percentages
- Include trend indicators
- Provide drill-down capability

### Unified Governance Surfaces

- Prioritize release readiness and risk
- Show backlog pressure transparently
- Include exception review deadlines
- Provide clear escalation paths

## Decision Framework

### When to Unify

Use unified surface when:
- Same information is needed for both platforms
- Decision-making benefits from cross-platform view
- Cognitive load is reduced by unified view
- No semantic meaning is lost

### When to Keep Platform-Specific

Keep platform-specific when:
- User expectations naturally differ
- Capabilities fundamentally differ
- Metrics have different meanings
- Business context requires separation

### When to Create Abstraction

Create abstraction layer when:
- Multiple surfaces show similar information
- Common patterns emerge across platforms
- Refactoring reduces duplication
- Abstraction doesn't hide important differences

## Governance

### Exception Review Process

1. Exception is registered with rationale
2. Regular review cycle checks applicability
3. Deprecated exceptions are marked
4. Resolved exceptions are archived

### Gap Remediation

1. Gap is detected and classified
2. Priority is assigned based on severity
3. Backlog item is created
4. Work is tracked to completion

### Surface Evolution

1. New surface requirements are documented
2. Prototype is created and tested
3. Feedback is incorporated
4. Surface is promoted to production

## Anti-Patterns to Avoid

### Fake Parity
❌ Hiding differences to make platforms look the same
✅ Explicitly showing gaps and classifying parity honestly

### Forced Abstraction
❌ Making everything generic at the cost of clarity
✅ Using abstraction where it genuinely simplifies

### Fragmented Views
❌ Multiple surfaces showing similar data inconsistently
✅ Single unified surface with drill-down capability

### Ignoring Differences
❌ Treating platforms as identical when they're not
✅ Preserving valid differences while finding common ground

### Breaking Production
❌ Making changes that break Shopee production flows
✅ Ensuring backward compatibility and safe rollout
