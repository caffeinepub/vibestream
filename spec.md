# Specification

## Summary
**Goal:** Redesign the VibeStream login/signup screen to feel natively built-in, with a polished onboarding flow and inline profile setup wizard.

**Planned changes:**
- Redesign `LoginScreen.tsx` to show animated VibeStream branding, a brief feature highlights section, and a prominent "Get Started / Sign In" button
- The "Sign In" button triggers Internet Identity using the existing `useInternetIdentity` hook, with a loading/spinning state during authentication
- After first login, display the profile setup inline (no page redirect) as a multi-step wizard: Step 1 username, Step 2 bio, Step 3 optional avatar — with a step progress indicator
- On subsequent logins, skip setup and go directly to the home feed
- Apply the existing dark theme (`#121212` background, `#8A2BE2` primary, `#00FFFF` accent, glassmorphism card styling)
- Ensure mobile-first layout fully usable at 375px viewport width
- Reuse existing UI components from `frontend/src/components/ui` where applicable
- No changes to `useInternetIdentity.ts`, `useActor.ts`, `main.tsx`, or any backend code

**User-visible outcome:** Users see a sleek, branded onboarding screen with smooth inline authentication and a step-by-step profile setup — the entire flow feels native to the app with no external redirects.
