# Password reset follow-through

Release: password-reset fix, asset revision `30.1.31-reset64`.

## Reproduced

- A valid recovery callback with a stale signup purpose opened the normal account flow, not the new-password form.
- Recovery shared the account menus and background account renders could replace its input.
- The unfinished reset flag lived only in tab storage; a new tab could load its authenticated session as a normal login.
- Failed callbacks could fall through to account initialization. Legacy, expired and incomplete links now have an explicit help screen, including for an already-signed-in user.

## Focused changes

- Recovery takes precedence and is marked before auth listeners run.
- The existing session carries a pending-reset marker through tab recreation and token renewal. Successful password updates clear it. No extra credentials are stored.
- Recovery shows only the password form and retains typed input on background renders.
- Duplicate password submissions are blocked. Rejected or unconfirmed updates keep the form open; a successful update must return the same user ID.
- Link-error help can request a fresh email using the existing PKCE flow and cooldown. Token-fragment links remain rejected; security checks were not relaxed.
- No changes to cloud restore, planner storage, account deletion, provider settings, database schema or native billing.

## Validation

- `pnpm run check`: 445 passing checks.
- Browser suite: 18/18 in Chromium and 18/18 in WebKit (Safari engine). Covers password callbacks, stale purpose, refresh/new tab, password update success/failure, duplicate submission, expired/cross-browser/legacy/missing-code links, email request binding/cooldown, and existing Home/sign-in flows.
- Native web bundle built and audited separately.
- Browser tests use isolated synthetic accounts and intercepted auth responses. They do not prove real inbox delivery or change customer passwords.

Recent provider logs also showed expired-link attempts and email rate limits. Those provider limits have not been changed by this patch.

The web/offline asset revision is incremented so installed workers receive the new account module. A real fresh-email test still requires an authorized disposable account and inbox interaction.
