# Price updates — manual QA checklist (MVP)

Heuristic HTML parsing is **temporary**. Every apply must follow a human review of the preview row (base ₴, sources, SKU match hints).

## 1. Preview run

- [ ] Open `/[locale]/admin/price-updates` as **ADMIN** (non-admin must not see menu / get 403 on API).
- [ ] Run **New price preview** with a small `limit` (e.g. 5–10).
- [ ] Confirm a new run appears in **Recent runs** with status `PREVIEW_READY`.
- [ ] Open the run: each line shows current price, Rozetka ₴, Telemart ₴, base, new +3%, status, confidence, notes.

## 2. Approve lines

- [ ] Toggle **Approve** on one line; **Save approvals**; reload page — checkbox state persists.
- [ ] Clear approve on all lines; save — no line should be approved.

## 3. Apply

- [ ] With at least one approved line that has a computed **new** price, **Apply approved prices** succeeds; run moves to **APPLIED** (or list shows applied).
- [ ] If every approved line is **stale** (product price changed since preview), apply fails with a clear error — **no** silent success.

## 4. Storefront price

- [ ] After apply, open the product on the storefront — displayed price matches the intended **+3%** rule (compare to base you verified on the retailer page).

## 5. Rollback

- [ ] On `/admin/price-updates`, **Rollback** list shows the recent apply.
- [ ] Click **Rollback** — confirm storefront price returns to the pre-apply value.

## 6. Missing `metadata.priceTracking`

- [ ] Product **without** `priceTracking` URLs: preview line has no Rozetka/Telemart ₴, note mentions missing URLs; do **not** approve blindly.

## 7. Only Rozetka URL

- [ ] Set only `rozetkaUrl` in metadata — Telemart column empty; base should come from Rozetka when parse succeeds.

## 8. Only Telemart URL

- [ ] Set only `telemartUrl` — Rozetka empty; base from Telemart when parse succeeds.

## 9. Incorrect / broken URL

- [ ] Invalid URL or 404 — line shows fetch error in notes; no automatic reliable price — **manual review**, do not approve without checking externally.

## 10. One source missing (fetch failed)

- [ ] One URL works, the other fails — base uses the working source only; verify number against the live page before apply.

## 11. Both sources missing

- [ ] No URLs in metadata — no base price; line stays in manual review; apply must not invent a price.

---

**Smoke:** see product list in the main handoff / `docs` sibling note with five suggested SKUs and example `metadata.priceTracking` URLs.
