<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Use `sectorLabel` for displayed sector names; preserve source keys in filters, saved selections and financial calculations to avoid changing behavior when labels change.
- Render the global sector selector inline beside stock filters, not as a floating layout control, so navigation actions remain grouped.
- Calculate portfolio balances and realized returns in the shared pure chronological ledger; retain original purchases and sales so closed positions keep their event history.
- Feed portfolio monthly timelines from the complete ledger positions, never the active-only summary, so closing an asset cannot remove realized sales or eligible payouts from their months.
- Compute monthly sale-volume control from complete chronological ledgers across the user's portfolios; keep gross positive-gain tax estimates separate from performance and label them as non-definitive, because losses, operation types and external trades are not a full tax ledger. Persist its limit through owner-scoped authenticated settings and share the timeline year.
- Insert portfolio sales through an authenticated, owner-scoped atomic snapshot RPC after validating the dated balance; concurrent sale submissions must not oversell a position.
- Resolve blank simulator purchase prices on the server from the exact date's unadjusted daily close; never silently substitute another trading day.
- Manual quote refresh uses ordered batches with portfolio tickers first and writes to the shared per-ticker cache; subscribers read that cache so navigation cannot mask refreshed prices with older query data.
- Store macroeconomic series in the database catalog (macro_series/macro_observations) refreshed server-side from public BCB/Ipeadata APIs; valuations read premises via useMacroContext so new series need no code beyond a catalog row.
- Refresh macro indicators in bounded per-series requests with progressive cache invalidation; deduplicate and sort dated observations before upsert because official APIs can repeat periods across date windows.
- Share stock ordering through one selector, pure comparator and session-scoped query state across asset lists; portfolio rows retain active-before-closed priority and sorting never changes ledger calculations.
- Share configurable asset metrics through a normalized unique-key model and query-cache preference with browser persistence; table and position-card renderers use the same metadata without altering financial calculations. Main assets use one bounded scroll region and a single aligned opaque sticky header across sectors.
