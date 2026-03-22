# Weekly Operating Rhythm Principles

## Overview

The Weekly Operating Rhythm is the heartbeat of operational excellence. It's not a report—it's a discipline. Every week, the founder and leadership team should know exactly:

1. **What's working** → Double down
2. **What's broken** → Fix immediately
3. **What's risky** → Monitor closely
4. **What's pending decision** → Decide or delegate

---

## Core Principles

### 1. Clarity Over Dashboard Noise

**DO:**
- Show only 5-7 key metrics per section
- Use red/yellow/green status indicators
- Provide 1-line insights, not data dumps
- Focus on action, not observation

**DON'T:**
- Create dense dashboards with 50+ charts
- Show vanity metrics that don't drive decisions
- Include metrics without thresholds
- Hide bad news in verbose narratives

---

### 2. Action-Oriented Summaries

Every summary must answer: **"What should I do?"**

| Section | Question to Answer |
|---------|-------------------|
| Growth | Scale what? Pause what? |
| Quality | Fix what? Investigate what? |
| Commercial | What's the revenue-quality balance? |
| Release | What's blocking? What's ready? |
| Experiment | Promote? Rollback? Hold? |

---

### 3. No Vanity Metrics

We don't celebrate growth that comes at the expense of quality.

**VALID METRICS:**
- Sessions with submit rate
- Revenue with quality score
- Conversion with no-match rate
- Growth with experiment guardrails

**VANITY METRICS (AVOID):**
- Raw session count (without quality context)
- Revenue (without quality/ROI context)
- Growth rate (without risk context)

---

### 4. Unresolved Risks Surfaced Early

**The Rule:** A risk that goes unaddressed for 2+ weeks escalates automatically.

Risk Classification:
- **Critical**: Immediate founder attention required
- **High**: Team lead attention within 48 hours
- **Medium**: Address within weekly cycle
- **Low**: Track in backlog

---

### 5. Revenue and Growth Read Together with Quality

**NEVER** report revenue without quality context.

A week where revenue is UP but quality is DOWN should be flagged as **WARNING**, not success.

| Revenue | Quality | Interpretation |
|---------|---------|----------------|
| ↑ | ↑ | Good - sustainable |
| ↑ | ↓ | Warning - short-term gain, long-term pain |
| ↓ | ↑ | OK - investing in quality |
| ↓ | ↓ | Critical - investigate immediately |

---

### 6. Decision Discipline

Every decision in the queue must have:

1. **Clear question** - What exactly are we deciding?
2. **Evidence** - What data supports this?
3. **Recommendation** - What's the suggested action?
4. **Tradeoffs** - What do we sacrifice if we choose this?
5. **Urgency** - Must decide this week vs. can wait

**Decision SLA:**
- Critical: 24 hours
- High: 72 hours
- Medium: 1 week
- Low: 2 weeks or backlog

---

### 7. Follow-up Accountability

**The Cardinal Rule:** A review without follow-up is theater.

Follow-up Requirements:
- Assignee must be named
- Due date must be set (no "TBD")
- Status tracked weekly
- Stale detection at 7 days
- Escalation at 14 days

---

## Weekly Rhythm Cadence

### Monday Morning (30 min)
1. Review current cockpit health score
2. Review pending decisions
3. Review stale follow-ups
4. Set priorities for the week

### Thursday Mid-Week (15 min)
1. Check if weekly review will be clean
2. Identify blockers needing escalation
3. Ensure follow-ups on track

### End of Week (60 min)
1. Run weekly operating review
2. Review and resolve decisions
3. Update follow-up status
4. Document learnings

---

## Quality Gates

### Before Publishing Weekly Review

- [ ] Overall health score calculated
- [ ] All sections have health status (red/yellow/green)
- [ ] Top 3 risks identified with recommendations
- [ ] Top 3 wins identified
- [ ] All blockers have severity and recommendation
- [ ] All priorities have assignee and due date
- [ ] Decision queue has clear actions
- [ ] Follow-ups are assigned and actionable

---

## Anti-Patterns

### ❌ The "Everything is Fine" Review
When every section shows green and there are no blockers or risks.

**Reality Check:** If everything is green, you're not measuring the right things.

### ❌ The Data Dump
Long narrative with 50+ metrics but no insights or recommendations.

**Fix:** Limit to 7 metrics per section with clear thresholds.

### ❌ The Orphaned Decision
Decision in queue for 3+ weeks with no resolution or deferral.

**Fix:** Auto-escalate after 2 weeks.

### ❌ The Phantom Follow-up
Follow-up with no assignee, no due date, no status updates.

**Fix:** Don't create follow-ups unless someone owns them.

### ❌ The Quality Gap
Revenue reported without quality context.

**Fix:** Always show revenue-quality balance.

---

## Success Metrics

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Decisions resolved within SLA | >90% | 70-90% | <70% |
| Follow-ups completed on time | >85% | 70-85% | <70% |
| Stale follow-ups (>7 days) | <5 | 5-10 | >10 |
| Health score consistency | Stable | Fluctuating | Erratic |
| Quality context included | 100% | 90-99% | <90% |

---

## Implementation

The Weekly Operating Rhythm is implemented through:

1. **Founder Cockpit** - Daily health snapshot
2. **Weekly Operating Review** - End-of-week comprehensive review
3. **Decision Queue** - Prioritized decision tracking
4. **Follow-up Backlog** - Action item management
5. **Strategic Review Packs** - Monthly/quarterly deep dives

All tied together by the `runFounderOperatingCycle` script that:
- Collects signals from all layers
- Evaluates health
- Builds summaries
- Generates decisions
- Creates follow-ups
- Persists everything

---

## Cultural Notes

This rhythm is NOT about reporting—it's about **discipline**.

- If you write it down, you do it
- If you assign it, they own it
- If you set a due date, you hold to it
- If it's critical, you escalate it

The weekly review is a commitment, not a suggestion.
