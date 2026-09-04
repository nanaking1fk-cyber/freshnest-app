# Simpler Hours & Pay

Release: simplified Hours & Pay, including editable pay-period start and end dates.
Asset revision: `30.1.31-pay65` (app version remains `30.1.31`).

## User-facing changes

- Pay settings starts with hourly rate, currency, pay frequency, **Pay period start** and **Pay period end**. Both dates are visible and editable, including for monthly pay.
- Dates stay linked to pay frequency: weekly, two-weekly and four-weekly periods span 7, 14 and 28 inclusive days; monthly and half-month periods follow calendar boundaries. Editing either date updates the other. Original recurrence anchors are preserved when only pay amounts change. Saving shows the selected period, and next/previous periods remain aligned.
- An optional **Estimate taxes** switch reveals one percentage field. Nothing is assumed or preselected for users without a saved estimate; an existing estimate, including 0%, is preserved.
- Overview shows pay before tax, work hours, and estimated take-home. Overtime, holiday hours, leave and deductions are in Pay breakdown; export and detailed explanations are in Export & more.
- Log hours starts with date, start, end and unpaid break. Shift-specific rates, paid leave, holiday pay and other overrides are under Shift options.
- Default breaks, timezone, overtime rules, night/weekend extras and deductions remain available under More pay options. Existing settings, currencies, confirmed rates, records and payslip comparisons are retained.

## Calculation and data boundaries

No changes to the pay calculation engine or storage format. The optional estimate is the user's percentage applied to gross pay minus configured before-tax deductions; after-tax deductions then reduce take-home. It is not a country-specific tax calculation or payroll service. No inferred default tax rate, tax brackets or claims of statutory accuracy.

Government estimators need more information than a pay rate alone: see the [IRS withholding estimator](https://www.irs.gov/individuals/tax-withholding-estimator) and [UK Income Tax estimator](https://www.gov.uk/estimate-income-tax). The interface therefore uses a clearly labelled, optional personal estimate instead of guessing a universal rate.

Hours and pay remain in the existing per-account local device ledger. No new network calls, health-data transfers, analytics, migrations, cloud writes or calendar changes. Cancelling settings makes no save. New tests cover clearing the tax option, explicit 0%, input validation, legacy settings preservation, and independent shift editing/removal/restoration.

## Validation

- `pnpm run check`: 451 checks passing.
- Chromium: 27 browser checks passing across Hours & Pay, Home and password reset; phone and desktop layouts checked.
- WebKit (Safari engine): the same 27 checks passing, including phone and desktop layouts.
- Date checks include changing either endpoint, save/reopen, next/previous period navigation, invalid dates, month boundaries, leap years and year-end rollover.
- Native web bundle build and audit passed (not an App Store submission).
- Mobile and desktop screenshots inspected; essential settings fit on screen and forms do not overflow horizontally.
- Browser tests use synthetic local account responses and pay records, not real customer data or real password updates.

## Separate password-reset publication

Commit `b92ec176d361da189e05712fff3b2c08d2d8d4f4` was pushed to `main`. Vercel deployment `dpl_GwxrUrXveHidPg7Nq6sjhPkrEgk6` is Ready and aliased to `www.workandworkout.com` and `workandworkout.com`.

The published reset assets matched the committed files, public account screens and reloads passed in Chromium and WebKit, and the post-release runtime-error scan reported no errors. No real reset email was sent or customer password changed during these checks; a fresh-inbox end-to-end test remains separate.
