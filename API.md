# API Documentation - Intelligent Supplement Search

## Base URL

```
Production: https://api.suplementia.com
Staging: https://staging-api.suplementia.com
```

## Authentication

Most endpoints require authentication via AWS Cognito JWT tokens:

```bash
Authorization: Bearer <jwt_token>
```

Public endpoints (no auth required):
- `POST /search` - Search supplements
- `GET /supplements/:id` - Get supplement details

## Endpoints

### 1. Search Supplements

Search for supplements using semantic vector search.

**Endpoint:** `POST /search`

**Request:**
```json
{
  "query": "magnesium glycinate",
  "language": "es",
  "limit": 5
}
```

**Parameters:**
- `query` (required): Search query (max 200 chars)
- `language` (optional): Language code (default: "en")
- `limit` (optional): Max results (default: 5, max: 20)

**Response:**
```json
{
  "success": true,
  "supplement": {
    "id": 123,
    "name": "Magnesium Glycinate",
    "scientificName": "Magnesium",
    "commonNames": ["Magnesio Glicinato", "Magnesium Bisglycinate"],
    "similarity": 0.95,
    "metadata": {
      "category": "mineral",
      "popularity": "high",
      "evidenceGrade": "A",
      "studyCount": 150,
      "pubmedQuery": "(magnesium glycinate) AND (sleep OR muscle OR anxiety)"
    },
    "searchCount": 1250,
    "lastSearchedAt": "2024-01-15T10:30:00Z",
    "createdAt": "2023-06-01T00:00:00Z",
    "updatedAt": "2024-01-10T15:20:00Z"
  },
  "latency": 45,
  "cacheHit": true,
  "source": "dax"
}
```

**Status Codes:**
- `200 OK` - Supplement found
- `404 Not Found` - No matching supplement (added to discovery queue)
- `400 Bad Request` - Invalid query
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

**Example:**
```bash
curl -X POST https://api.suplementia.com/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "vitamina d3",
    "language": "es"
  }'
```

---

### 2. Get Supplement by ID

Retrieve detailed information about a specific supplement.

**Endpoint:** `GET /supplements/:id`

**Response:**
```json
{
  "success": true,
  "supplement": {
    "id": 123,
    "name": "Vitamin D3",
    "scientificName": "Cholecalciferol",
    "commonNames": ["Vitamina D3", "Colecalciferol"],
    "embedding": [0.123, -0.456, ...], // 384 dimensions
    "metadata": {
      "category": "vitamin",
      "popularity": "high",
      "evidenceGrade": "A",
      "studyCount": 500,
      "pubmedQuery": "(vitamin d3 OR cholecalciferol) AND (bone OR immune)"
    },
    "searchCount": 5000,
    "lastSearchedAt": "2024-01-15T10:30:00Z",
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2024-01-10T15:20:00Z"
  }
}
```

**Status Codes:**
- `200 OK` - Supplement found
- `404 Not Found` - Supplement not found
- `500 Internal Server Error` - Server error

---

### 3. Create Supplement

Create a new supplement entry. Requires authentication.

**Endpoint:** `POST /supplements`

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request:**
```json
{
  "name": "Berberine",
  "scientificName": "Berberis vulgaris",
  "commonNames": ["Berberina", "Barberry"],
  "metadata": {
    "category": "herb",
    "popularity": "medium",
    "pubmedQuery": "(berberine) AND (blood sugar OR diabetes OR metabolic)"
  }
}
```

**Parameters:**
- `name` (required): Supplement name
- `scientificName` (optional): Scientific name
- `commonNames` (optional): Array of common names
- `metadata` (optional): Additional metadata

**Response:**
```json
{
  "success": true,
  "supplement": {
    "id": 456,
    "name": "Berberine",
    "scientificName": "Berberis vulgaris",
    "commonNames": ["Berberina", "Barberry"],
    "embedding": [0.234, -0.567, ...],
    "metadata": {
      "category": "herb",
      "popularity": "medium",
      "evidenceGrade": "B",
      "studyCount": 75,
      "pubmedQuery": "(berberine) AND (blood sugar OR diabetes OR metabolic)"
    },
    "searchCount": 0,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Status Codes:**
- `201 Created` - Supplement created
- `400 Bad Request` - Invalid data
- `401 Unauthorized` - Missing or invalid token
- `409 Conflict` - Supplement already exists
- `500 Internal Server Error` - Server error

**Notes:**
- Embedding is automatically generated using Sentence Transformers
- Supplement becomes searchable within 1 second
- Cache is automatically populated

---

### 4. Update Supplement

Update an existing supplement. Requires authentication.

**Endpoint:** `PUT /supplements/:id`

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request:**
```json
{
  "metadata": {
    "evidenceGrade": "A",
    "studyCount": 100
  }
}
```

**Response:**
```json
{
  "success": true,
  "supplement": {
    "id": 456,
    "name": "Berberine",
    "metadata": {
      "evidenceGrade": "A",
      "studyCount": 100
    },
    "updatedAt": "2024-01-15T11:00:00Z"
  }
}
```

**Status Codes:**
- `200 OK` - Supplement updated
- `400 Bad Request` - Invalid data
- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - Supplement not found
- `500 Internal Server Error` - Server error

**Notes:**
- Cache is automatically invalidated (DynamoDB + Redis)
- If name changes, embedding is regenerated
- Update propagates to all cache tiers within 1 second

---

### 5. Delete Supplement

Delete a supplement. Requires authentication.

**Endpoint:** `DELETE /supplements/:id`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Supplement deleted successfully"
}
```

**Status Codes:**
- `200 OK` - Supplement deleted
- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - Supplement not found
- `500 Internal Server Error` - Server error

---

### 6. Get Popular Supplements

Get list of most searched supplements.

**Endpoint:** `GET /analytics/popular`

**Query Parameters:**
- `limit` (optional): Max results (default: 10, max: 50)
- `category` (optional): Filter by category

**Response:**
```json
{
  "success": true,
  "supplements": [
    {
      "id": 123,
      "name": "Vitamin D3",
      "searchCount": 5000,
      "category": "vitamin"
    },
    {
      "id": 456,
      "name": "Magnesium Glycinate",
      "searchCount": 3500,
      "category": "mineral"
    }
  ]
}
```

---

### 7. Get System Metrics

Get system performance metrics. Requires authentication.

**Endpoint:** `GET /analytics/metrics`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `period` (optional): Time period (1h, 24h, 7d, 30d)

**Response:**
```json
{
  "success": true,
  "metrics": {
    "latency": {
      "p50": 35,
      "p95": 120,
      "p99": 180
    },
    "cacheHitRate": {
      "dax": 0.92,
      "redis": 0.87,
      "overall": 0.89
    },
    "errorRate": 0.005,
    "requestCount": 150000,
    "discoveryQueueSize": 25
  },
  "period": "24h"
}
```

---

### 8. Generate Embedding

Generate embedding for text. Requires authentication.

**Endpoint:** `POST /embed`

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request:**
```json
{
  "text": "magnesium glycinate for sleep"
}
```

**Response:**
```json
{
  "success": true,
  "embedding": [0.123, -0.456, 0.789, ...], // 384 dimensions
  "model": "all-MiniLM-L6-v2",
  "latency": 15
}
```

**Status Codes:**
- `200 OK` - Embedding generated
- `400 Bad Request` - Invalid text
- `401 Unauthorized` - Missing or invalid token
- `500 Internal Server Error` - Server error

---

## Rate Limits

### Per-IP Limits
- Search: 100 requests/minute
- Other endpoints: 60 requests/minute

### Per-User Limits (Authenticated)
- Search: 1000 requests/day
- CRUD operations: 100 requests/day
- Analytics: 50 requests/day

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642262400
```

### Rate Limit Response
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

---

## Error Responses

### Standard Error Format
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

### Error Codes
- `INVALID_QUERY` - Query validation failed
- `SUPPLEMENT_NOT_FOUND` - Supplement not found
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `INTERNAL_ERROR` - Server error

---

## Webhooks

### Discovery Queue Events

Subscribe to events when new supplements are discovered.

**Event:** `supplement.discovered`

**Payload:**
```json
{
  "event": "supplement.discovered",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "query": "ashwagandha ksm-66",
    "searchCount": 15,
    "priority": "high"
  }
}
```

**Event:** `supplement.validated`

**Payload:**
```json
{
  "event": "supplement.validated",
  "timestamp": "2024-01-15T10:35:00Z",
  "data": {
    "id": 789,
    "name": "Ashwagandha KSM-66",
    "studyCount": 50,
    "evidenceGrade": "B"
  }
}
```

---

## SDK Examples

### JavaScript/TypeScript
```typescript
import { SupplementSearchClient } from '@suplementia/sdk';

const client = new SupplementSearchClient({
  apiKey: process.env.SUPLEMENTIA_API_KEY,
  environment: 'production'
});

// Search
const result = await client.search({
  query: 'magnesium glycinate',
  language: 'es'
});

// Create
const supplement = await client.supplements.create({
  name: 'Berberine',
  scientificName: 'Berberis vulgaris'
});

// Update
await client.supplements.update(supplement.id, {
  metadata: { evidenceGrade: 'A' }
});
```

### Python
```python
from suplementia import SupplementSearchClient

client = SupplementSearchClient(
    api_key=os.environ['SUPLEMENTIA_API_KEY'],
    environment='production'
)

# Search
result = client.search(
    query='magnesium glycinate',
    language='es'
)

# Create
supplement = client.supplements.create(
    name='Berberine',
    scientific_name='Berberis vulgaris'
)
```

---

## Testing

### Staging Environment
```bash
export API_URL=https://staging-api.suplementia.com
```

### Test Credentials
Contact DevOps for test API keys.

### Example Test
```bash
# Search test
curl -X POST $API_URL/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test supplement"}'

# Should return 200 OK with supplement data or 404 with discovery message
```

---

## Support

For API issues or questions:
- Email: api-support@suplementia.com
- Slack: #api-support
- Documentation: https://docs.suplementia.com
