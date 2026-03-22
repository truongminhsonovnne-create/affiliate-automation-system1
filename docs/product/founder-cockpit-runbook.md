# Founder Cockpit Runbook

## Daily Operations

### Morning Check

1. Access the Founder Cockpit at `/api/founder-cockpit/current`
2. Review the overall health score and status
3. Check for any critical alerts or blockers
4. Review pending decisions requiring your attention

### Decision Review

1. Navigate to `/api/founder-cockpit/decisions?status=pending`
2. Review decisions sorted by priority
3. For each pending decision:
   - Review the context and recommendations
   - Make a decision or defer with reason
   - Use `/api/founder-cockpit/decisions/:id/resolve` to record resolution

### Follow-up Tracking

1. Check `/api/founder-cockpit/followups` for pending items
2. Verify assignee awareness of their action items
3. Mark completed items

## Weekly Operations

### Weekly Operating Review

1. Run the weekly review: `npm run founder:cycle`
2. Review the generated weekly operating review
3. Focus on:
   - **Key Changes**: What shifted since last week?
   - **Risk Areas**: Any emerging concerns?
   - **Win Areas**: What's going well?
   - **Priorities**: What needs attention this week?

### Governance Review

1. Run governance check: `npm run founder:governance`
2. Address stale follow-ups (7+ days old)
3. Review pending decisions
4. Assess risk level and take action

## Strategic Review Automation

### Monthly Strategic Review

1. Create a monthly strategic pack:
   ```bash
   curl -X POST /api/founder-cockpit/strategic-packs \
     -H "Content-Type: application/json" \
     -d '{
       "type": "monthly",
       "startDate": "2024-01-01",
       "endDate": "2024-01-31"
     }'
   ```

2. Review the generated pack for:
   - Month-over-month trends
   - Strategic recommendations
   - Resource allocation needs

### Quarterly Business Review

1. Create a quarterly pack:
   ```bash
   curl -X POST /api/founder-cockpit/strategic-packs \
     -H "Content-Type: application/json" \
     -d '{
       "type": "quarterly",
       "startDate": "2024-01-01",
       "endDate": "2024-03-31"
     }'
   ```

2. Include in QBR:
   - Quarter performance vs. targets
   - Strategic initiative progress
   - Budget reconciliation
   - Team performance
   - Next quarter planning

## Decision Queue Management

### Adding Decisions

Decisions are automatically created from:
- Weekly operating reviews
- Strategic review packs
- Governance signals

### Decision Properties

| Field | Description |
|-------|-------------|
| `title` | Brief decision description |
| `description` | Context and background |
| `priority` | high, medium, low |
| `impact` | high, medium, low |
| `effort` | high, medium, low |
| `status` | pending, resolved, deferred |
| `category` | growth, quality, commercial, release |

### Resolution Flow

1. Review decision details
2. Choose action:
   - **Resolve**: Record decision and rationale
   - **Defer**: Move to future review
   - **Delegate**: Assign to team member
3. Create follow-ups if action needed

## Follow-up Management

### Creating Follow-ups

Follow-ups can be created:
- Automatically from resolved decisions
- Manually via API

### Follow-up Properties

| Field | Description |
|-------|-------------|
| `sourceType` | decision, issue, risk, governance |
| `sourceId` | ID of source item |
| `priority` | high, medium, low |
| `assignedTo` | Responsible party |
| `dueAt` | Due date |

### Stale Detection

The system automatically flags follow-ups:
- Pending for 7+ days = stale
- Pending for 14+ days = critical

## Troubleshooting

### Cockpit Build Failures

1. Check logs: `npm run logs:founder`
2. Verify BI layer is operational
3. Ensure Commercial Intelligence is running
4. Check database connectivity

### Missing Data

1. Verify data pipeline is running
2. Check BI scorecard generation
3. Validate Commercial Intelligence attribution
4. Review data source connectivity

### API Errors

1. Check health endpoint: `/api/founder-cockpit/health`
2. Review error messages
3. Verify authentication/authorization
4. Check rate limits

## Metrics Reference

### Health Score Components

| Component | Weight | Key Metrics |
|-----------|--------|-------------|
| Growth | 25% | Sessions (+/-), Submit Rate |
| Quality | 25% | No-Match Rate, Copy Rate |
| Commercial | 30% | Revenue, Commission, ROI |
| Release | 20% | Readiness Score, Blockers |

### Health Thresholds

- **Healthy** (green): Score ≥ 0.7
- **Neutral** (yellow): Score 0.5 - 0.7
- **At-Risk** (red): Score < 0.5

## Best Practices

1. **Daily**: Check cockpit health score each morning
2. **Weekly**: Run full operating cycle every Monday
3. **Monthly**: Complete strategic review by 5th of month
4. **Quarterly**: Conduct QBR within first two weeks
5. **Ongoing**: Resolve decisions within 48 hours
6. **Ongoing**: Clear stale follow-ups weekly

## Support

For issues or questions:
- Check logs: `/var/log/affiliate/founder-cockpit.log`
- Contact: engineering team
- Escalation: VP Engineering → CTO
