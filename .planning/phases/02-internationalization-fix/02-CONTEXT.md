# Phase 2: Internationalization Fix - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning
**Source:** Session decisions (Continue without CONTEXT.md / manual scope input)

<domain>
## Phase Boundary

Fix i18n routing, nav translations, and ErrorState localization so the UI is fully localized in Spanish when ES locale is selected. No new features, no Bedrock language changes, no full string audits.

</domain>

<decisions>
## Implementation Decisions

### Routing Fix
- Fix `useRouter` import in `app/[locale]/portal/page.tsx` and `app/[locale]/portal/results/page.tsx`
- Use existing `src/i18n/navigation.ts` (locale-aware router) — do NOT switch to a different routing library

### Nav Translations
- Add translations to `PortalHeader` component
- Update `messages/es.json` and `messages/en.json` for nav items
- Nav wording: "Iniciar sesión" / "Cerrar sesión"

### ErrorState Localization (Minimal Scope)
- Remove the 2 English-only search tips from ErrorState
- Fix the 4 `window.location.href` hardcoded links in ErrorState to use locale-aware navigation
- Do NOT refactor ErrorState beyond these two targeted changes

### Scope Exclusions (Claude's Discretion — DO NOT expand)
- `EvidenceAnalysisPanelNew` is OUT OF SCOPE — do not touch
- Bedrock output language is OUT OF SCOPE — do not add language prompting or output translation
- Full results page string audit is OUT OF SCOPE — only fix the 1 identified `router.push` call

### Success Criterion 5 (Evidence locale)
- Applies to UI labels only, not to Bedrock-generated content
- Do not attempt to make AI-generated evidence text appear in Spanish

</decisions>

<specifics>
## Specific Files to Touch

1. `middleware.ts` — locale routing
2. `app/[locale]/portal/page.tsx` — useRouter import fix
3. `app/[locale]/portal/results/page.tsx` — router.push locale fix
4. `components/portal/ErrorState.tsx` — remove 2 English tips + fix 4 window.location.href
5. `messages/es.json`, `messages/en.json` — nav translation keys

Total: 5-6 files. Do not add files beyond this list without strong justification.

</specifics>

<deferred>
## Deferred Ideas

- Full audit of all strings in results page — deferred, out of scope for this phase
- EvidenceAnalysisPanelNew i18n — deferred to future phase
- Bedrock Spanish output — explicit non-goal, not a future phase item

</deferred>

---

*Phase: 02-internationalization-fix*
*Context gathered: 2026-03-06 via session scope input*
