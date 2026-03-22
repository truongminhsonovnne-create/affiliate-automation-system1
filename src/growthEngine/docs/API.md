# Growth Engine API Documentation

## Base URL
```
http://localhost:3000/api/growth
```

## Surface Endpoints

### List Surfaces
```
GET /surfaces
```

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| surfaceType | string | Filter by surface type (comma-separated) |
| pageStatus | string | Filter by status |
| minQualityScore | number | Minimum quality score |
| maxQualityScore | number | Maximum quality score |
| limit | number | Page size (1-100, default: 20) |
| offset | number | Page offset |
| orderBy | string | Sort field (createdAt, updatedAt, qualityScore, usefulnessScore) |
| orderDirection | string | Sort direction (asc, desc) |

### Get Surface
```
GET /surfaces/:id
```

### Register Surface
```
POST /surfaces
```

Request Body:
```json
{
  "surfaceType": "shop_page",
  "routeKey": "best-vpn-2024",
  "routePath": "/tools/best-vpn-2024",
  "slug": "best-vpn-2024",
  "platform": "windows",
  "sourceEntityType": "product",
  "sourceEntityId": "123",
  "generationStrategy": "programmatic"
}
```

### Update Surface
```
PATCH /surfaces/:id
```

### Check Eligibility
```
POST /surfaces/:id/eligibility
```

Request Body:
```json
{
  "context": {
    "characterCount": 1500,
    "wordCount": 250,
    "hasValuableContent": true,
    "ctaCount": 1
  }
}
```

Response:
```json
{
  "success": true,
  "data": {
    "eligible": true,
    "canGenerate": true,
    "canIndex": true,
    "reasons": [],
    "warnings": [],
    "conditions": []
  }
}
```

## Generation Endpoints

### Plan Generation Batch
```
POST /generation/plan
```

### Get Priority Surfaces
```
GET /generation/priority
```

### Check Scaling Readiness
```
POST /scaling/readiness
```

## Governance Endpoints

### Run Governance Check
```
POST /governance/check
```

Request Body:
```json
{
  "surface": { ... },
  "context": {
    "content": {
      "characterCount": 1500,
      "wordCount": 250,
      "sectionCount": 5,
      "hasValuableContent": true,
      "ctaCount": 1,
      "hasCta": true
    },
    "metrics": {
      "pageViews": 1000,
      "toolCtaClicks": 50,
      "toolEntryConversions": 10
    }
  }
}
```

### Batch Governance Check
```
POST /governance/batch-check
```

### Check Scaling Readiness
```
POST /governance/scaling-check
```

## SEO Endpoints

### Check SEO
```
POST /seo/check
```

### Should Index
```
GET /seo/should-index/:id
```

### Get Robots Config
```
GET /seo/robots/:id
```

## Policy Endpoints

### Content Density
```
POST /policy/content-density
```

### Thin Content Risk
```
POST /policy/thin-content-risk
```

### Clutter Risk
```
POST /policy/clutter-risk
```

### Tool Alignment
```
POST /policy/tool-alignment
```

### Wander Risk
```
POST /policy/wander-risk
```

## Analytics Endpoints

### Portfolio Measurement
```
GET /analytics/portfolio/measurement
```

### Surface Measurement
```
GET /analytics/surface/:id/measurement
```

### Portfolio Conversion
```
GET /analytics/portfolio/conversion
```

### Surface Conversion
```
GET /analytics/surface/:id/conversion
```

### Top Converting
```
GET /analytics/top-converting
```

### Dashboard
```
GET /analytics/dashboard
```

## Health Endpoints

### Health Check
```
GET /health
```

### Readiness Probe
```
GET /health/ready
```

### Liveness Probe
```
GET /health/live
```

## Error Responses

All endpoints return standard error responses:

```json
{
  "success": false,
  "error": "Error message",
  "requestId": "uuid"
}
```

Status Codes:
- `200` - Success
- `400` - Bad Request
- `404` - Not Found
- `429` - Rate Limited
- `500` - Internal Server Error
- `503` - Service Unavailable
