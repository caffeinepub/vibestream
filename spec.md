# Specification

## Summary
**Goal:** Fix the infinite "Loading your profile" screen that appears after a user authenticates via Internet Identity in the VibeStream app.

**Planned changes:**
- Update `App.tsx` to exhaustively handle all profile loading states (loading, success, error) so the app never gets stuck in an infinite spinner
- Ensure that if the user has an existing profile, they are navigated to the main feed; if no profile exists, the `ProfileSetupModal` is shown; if an error occurs, a fallback/retry option is displayed
- Audit `useQueries.ts` (or equivalent profile fetch hooks) to set `enabled: false` when the authenticated actor is null or anonymous, preventing premature/empty queries
- Automatically re-enable and refetch the profile query once the authenticated actor becomes available

**User-visible outcome:** After logging in with Internet Identity, users no longer see an infinite "Loading your profile" spinner — they are either taken to the main app, shown the profile setup flow, or presented with an error/retry option.
