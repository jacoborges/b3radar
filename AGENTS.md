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

- Google Drive is the target persistent store; all provider calls stay server-side so connector credentials never reach browsers.
- Personal documents are keyed by a stable authenticated user ID, versioned, checksummed, and updated with ETag conflict protection because Drive is not transactional.
- Sensitive values stored in Drive are encrypted with B3_RADAR_DATA_ENCRYPTION_KEY because workspace files are readable by the central account owner.
- During migration, existing Supabase authentication remains only as a temporary identity bridge until external Google sign-in credentials are configured.
