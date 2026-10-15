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
- Calculate portfolio balances and realized returns in the shared pure chronological ledger; retain original purchases and sales so closed positions keep their event history.
- Insert portfolio sales through an authenticated, owner-scoped atomic snapshot RPC after validating the dated balance; concurrent sale submissions must not oversell a position.
- Resolve blank simulator purchase prices on the server from the exact date's unadjusted daily close; never silently substitute another trading day.
