# Specification

## Summary
**Goal:** Remove the loading screen entirely from App.tsx so users are never shown a spinner or splash state during the auth/profile flow.

**Planned changes:**
- Remove all loading spinner and splash screen UI from App.tsx
- Unauthenticated users are routed directly to LoginScreen with no intermediate loading state
- Authenticated users with an existing profile go directly to the main layout
- Authenticated users without a profile go directly to the ProfileSetupModal
- No spinner, skeleton, or loading text is rendered at any point in the auth/profile flow in App.tsx

**User-visible outcome:** The app instantly shows either the LoginScreen, main layout, or ProfileSetupModal on load — no loading screen or spinner is ever displayed.
