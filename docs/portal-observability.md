# Portal Supplement Observability

Lightweight portal diagnostics use structured JSON logs. Search production logs for:

```text
event="PORTAL_SUPPLEMENT_OUTCOME"
```

Each outcome event is intentionally small and avoids full request bodies or upstream responses. Useful fields:

- `endpoint`: portal route that produced the final outcome, for example `/api/portal/quiz`, `/api/portal/recommend`, `/api/portal/enrich-v2`, `/api/portal/enrichment-status/[id]`, or `/api/portal/status/[id]`.
- `supplementName`, `originalQuery`, `normalizedQuery`: enough query context to diagnose naming and normalization issues.
- `status`: final app state, such as `completed`, `processing`, `insufficient_data`, `upstream_unavailable`, or `failed`.
- `finalStatusCode`: HTTP status returned by that endpoint.
- `errorCode`: controlled internal error code when available.
- `upstreamStatus`: external status when a downstream service reported one.
- `fallback`: key path used by the portal: `local_catalog_fallback`, `async_enrichment`, `insufficient_data`, `upstream_unavailable`, `backend_service_error`, or `none`.
- `elapsedTime`: approximate route duration in milliseconds.

Operational checks:

- A critical supplement returning `500` should have `status="failed"` and `fallback="backend_service_error"` with an `errorCode`.
- Studies-fetcher or PubMed availability issues should appear as `status="upstream_unavailable"`, `finalStatusCode=503`, and `fallback="upstream_unavailable"`.
- Botanicals or mixed/negative evidence cases without enough human clinical support should appear as `status="insufficient_data"` and `fallback="insufficient_data"`, not as a completed recommendation or product opportunity.
- Local canaries such as Magnesium, Creatine, Vitamin D, Melatonin, Psyllium, and Ashwagandha should complete with supported `worksFor` when served from curated/local evidence.
- Centella asiatica and gotu kola should complete with calibrated moderate/preliminary evidence and should not show entity mix, untraced percentages, or `EvidenceGrade A`.
- Async canaries such as Turmeric and Berberine should be visible as `status="processing"` with `fallback="async_enrichment"` while enrichment is running.

For studies-fetcher failures that do not end the user request, search:

```text
event="STUDIES_FETCHER_FAILURE"
```

Those events identify the supplement and fallback path without logging full upstream payloads.

For post-release validation, production canary smoke commands, and rollback/debug steps, see
[`portal-release-hardening-checklist.md`](./portal-release-hardening-checklist.md).
