# Public Products & Catalogue API Guide

Version: 1.0  
Last Updated: 2025-08-14

This document describes the publicly accessible, read‑only endpoints exposed under the `/public` namespace. These endpoints let external websites or services fetch products, categories, images, and product details.

> Write access (creating/updating/deleting resources) is NOT available via this public surface. For those operations you must use the authenticated internal API (not covered here).

---
## 1. Base URL
Use the appropriate environment base:

Environment | Base URL
------------|---------
Production  | `https://api.regisamtechnologies.co.ke`
Staging     | `https://staging.api.example.com`
Local Dev   | `http://localhost:5000`

All endpoints below are relative to the base URL.

---
## 2. Authentication (API Key)
Public endpoints require an API key *if* the server is configured with `PUBLIC_API_KEY`.

Provide the key via HTTP header:
```
X-API-Key: YOUR_PUBLIC_API_KEY
```
If the server has no `PUBLIC_API_KEY` configured, the backend now falls back to a static demo key: `public-demo-key-12345`.
Override this in production by setting the `PUBLIC_API_KEY` environment variable to a strong random value.

### 2.1 Obtaining an API Key
1. Request a key from the platform owner.
2. Keys are static (no OAuth flow).
3. Treat the key like a password. Do NOT embed directly in client-side JavaScript; instead proxy through your backend when possible.

### 2.2 Error on Missing / Invalid Key
```
HTTP/1.1 401 Unauthorized
{ "error": "Invalid or missing API key" }
```

### 2.3 Local Development
By default (no environment override) the backend uses the demo key `public-demo-key-12345`.

Start your Flask app (example):
```
export FLASK_APP=wsgi.py
export PUBLIC_API_KEY=public-demo-key-12345  # optional; overrides default if you change it
flask run --reload --port 5000
```

Local base URL: `http://localhost:5000`

Sample local curl commands:
```
# List products (first page)
curl -H "X-API-Key: public-demo-key-12345" "http://localhost:5000/public/products?per_page=5"

# Search products
curl -H "X-API-Key: public-demo-key-12345" "http://localhost:5000/public/products?q=phone&sort=name&direction=asc"

# Product detail (ID 1 example)
curl -H "X-API-Key: public-demo-key-12345" "http://localhost:5000/public/products/1"

# Categories
curl -H "X-API-Key: public-demo-key-12345" "http://localhost:5000/public/categories"

# Images for product 1
curl -H "X-API-Key: public-demo-key-12345" "http://localhost:5000/public/images?product_id=1"
```

To change the key locally, set a different value before starting the server:
```
export PUBLIC_API_KEY=$(openssl rand -hex 24)
flask run
```


---
## 3. Response Format & Conventions
- All responses are JSON with UTF-8 encoding.
- Times (where present) are ISO 8601 or `YYYY-MM-DD HH:MM:SS` depending on source; public endpoints currently do not expose timestamps except indirectly through IDs.
- Numeric IDs are integers.
- Prices are numeric (decimal/float) values (currency not embedded—define externally).
- Pagination object: `{ page, per_page, total, pages, <data_collection> }`.

---
## 4. Endpoints
### 4.1 List Products
`GET /public/products`

Query Parameters | Type | Default | Description
-----------------|------|---------|------------
`page` | int | 1 | Page number (1-based)
`per_page` | int | 20 | Items per page (max 100)
`sort` | enum | created | `name`, `price`, `created`
`direction` | enum | desc | `asc` or `desc`
`q` | string | — | Case-insensitive partial match on product name
`category_id` | int | — | Filter by category

Sample Request:
```
curl -H "X-API-Key: public-demo-key-12345" \
  "https://api.regisamtechnologies.co.ke/public/products?per_page=5&sort=price&direction=asc&q=phone"
```
Sample Response:
```json
{
  "page": 1,
  "per_page": 5,
  "total": 42,
  "pages": 9,
  "products": [
    {
      "id": 101,
      "name": "Budget Phone",
      "description": "Entry-level device",
      "price": 99.99,
      "category_id": 3,
      "image_urls": ["https://res.cloudinary.com/demo/image/upload/v.../budget_phone.jpg"]
    }
  ]
}
```

### 4.2 Product Detail
`GET /public/products/{product_id}`

Sample:
```
curl -H "X-API-Key: public-demo-key-12345" https://api.regisamtechnologies.co.ke/public/products/101
```
Response:
```json
{
  "id": 101,
  "name": "Budget Phone",
  "description": "Entry-level device",
  "price": 99.99,
  "category_id": 3,
  "images": [
    { "id": 5001, "name": "Front", "url": "https://.../front.jpg", "color": "black" }
  ]
}
```

### 4.3 List Categories
`GET /public/categories`

Sample:
```
curl -H "X-API-Key: public-demo-key-12345" https://api.regisamtechnologies.co.ke/public/categories
```
Response:
```json
{
  "categories": [
    { "id": 3, "name": "Phones", "description": "Smart & feature phones" }
  ]
}
```

### 4.4 List Images
`GET /public/images`

Query Parameters | Type | Description
-----------------|------|------------
`page` | int | Page number
`per_page` | int | Items per page (max 100)
`product_id` | int | Filter images belonging to a single product

Sample:
```
curl -H "X-API-Key: public-demo-key-12345" "https://api.regisamtechnologies.co.ke/public/images?product_id=101&per_page=10"
```
Response:
```json
{
  "page": 1,
  "per_page": 10,
  "total": 4,
  "pages": 1,
  "images": [
    { "id": 5001, "name": "Front", "url": "https://.../front.jpg", "color": "black", "product_id": 101 }
  ]
}
```

---
## 5. Status Codes
Code | Meaning
-----|--------
200 | Success
400 | Bad query parameter (rare in public endpoints)
401 | Missing/invalid API key (if key enforcement enabled)
404 | Resource not found (e.g., product ID does not exist)
500 | Internal server error

---
## 6. Error Format
Example (invalid key):
```json
{ "error": "Invalid or missing API key" }
```
Example (not found):
```json
{ "error": "Not Found" }
```

---
## 7. Pagination Strategy
- Use `page` and `per_page` to iterate.
- Stop when `page > pages` or returned collection is empty.
- Avoid requesting `per_page` > 50 for better latency.

---
## 8. Caching Guidance
- Product & category data changes relatively infrequently; a 300–600 second edge cache is often acceptable.
- Consider ETag / conditional GET if exposed in the future (not currently implemented).
- You may locally cache category list for an hour unless you expect frequent updates.

---
## 9. Rate Limiting (Recommended Practice)
(Not currently enforced) Suggested client behavior:
- Max 5 requests/second sustained.
- Back off exponentially on HTTP 429 (if implemented later).

---
## 10. Security Best Practices
- Keep API key server-side; never expose in public front-end code.
- Rotate keys periodically (policy to be defined by provider).
- Monitor for unusual traffic (spikes in `page=1` requests from diverse IPs).

---
## 11. Versioning
Current endpoints are unversioned. Future breaking changes may introduce `/v1/public/...`.
Clients should:
- Tolerate additional fields.
- Not rely on ordering beyond documented sort semantics.

---
## 12. Change Log
Date | Change
-----|-------
2025-08-14 | Initial public documentation created.

---
## 13. Contact
For key requests or support: support@example.com (replace with actual contact).

---
## 14. Quick Integration Snippet (JavaScript Example)
```js
async function fetchProducts(apiKey = 'public-demo-key-12345') {
  const resp = await fetch('https://api.regisamtechnologies.co.ke/public/products?per_page=10', {
    headers: { 'X-API-Key': apiKey }
  });
  if (!resp.ok) throw new Error('Request failed ' + resp.status);
  return resp.json();
}
```

---
End of document.
