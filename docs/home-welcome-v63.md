# Home and first-load improvements — release notes

Prepared September 3, 2026 on top of website production commit `685bfe6`.
The user approved this website-only release for production publication. Deployment status is recorded by Vercel against the associated Git commit.

## Scope

- Replace the plain white root redirect with a dark, branded opening screen. Its external, same-origin redirect script preserves email callback parameters and complies with the existing script policy.
- Paint the app shell's dark loading state before its stylesheets arrive, including across the loader's document replacement.
- Replace the long cinematic welcome with a concise, static layout and explicit Create account / Sign in buttons. Example schedule content is labeled; no autoplay media or carousel timers remain.
- Put today's actual plan first on signed-in Home. Nutrition detail and secondary check-ins use expandable sections that remain open through refreshes.
- Do not synthesize a legacy work row from a disabled job when modern calendar events mark the date as a work day. No stored entries are removed.
- Make a failed account-configuration request retryable, preserve the selected authentication mode and typed credentials through UI refreshes, and leave email callback codes untouched until configuration is available.
- Advance website/offline asset revision to `30.1.31-home63`; retain existing privacy, account-isolation and cloud-restore protections. No database migration or provider settings change.

## Evidence

The reported production diagnostic was a GET `/api/v18/config` timeout on release 30.1.31. A failed check was previously presented as an unconfigured deployment. The root HTML contained the exact “Open Work + Workout” fallback described by the user.

- 440 code, security-policy and regression checks pass via `pnpm run check` using the bundled runtime.
- Native web bundle build and self-contained-bundle audit pass; no native platform changes are included.
- Nine isolated browser scenarios pass in Chromium and nine in WebKit: 390px mobile and 1440px desktop layouts, account navigation, signed-in Home actions, delayed configuration, retry, callback preservation and delayed-style first paint.
- Browser fixtures contain only synthetic records. API calls are intercepted, and service workers are blocked in these fixture tests to prevent bypassing request mocks. Existing service-worker regression tests separately verify offline navigation and callback safety.
- Screenshots inspected: `/private/tmp/ww-welcome63-390.png`, `/private/tmp/ww-welcome63-1440.png`, `/private/tmp/ww-home63-390.png`, `/private/tmp/ww-home63-1440.png`.

## Publication

This release includes only the website change set and its tests/documentation. The original `/private/tmp/work-and-workout-premium-v19` workspace and the separate native audit worktree remain untouched. Their `.nojekyll`, `pnpm-lock.yaml` and `supabase/.temp/` changes are excluded.

The new browser suite is in `tests/browser/home-welcome-v63.spec.mjs`; its config resolves Playwright from the existing `app-store` dependency installation. It defaults to the local fixture-server URL and does not run automatically in the code-only check command.
