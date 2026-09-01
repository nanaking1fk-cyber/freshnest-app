# Google Play metadata

## Listing

**App name (30 characters max):** Work + Workout

**Short description (80 characters max):** Plan shifts, workouts, meals, recovery and tasks in one adaptive calendar.

**Category:** Health & Fitness

## Full description

Work + Workout turns your real work schedule into a realistic plan for the rest of your life.

Upload a schedule photo or PDF, paste raw text, or describe your week in everyday language. The app proposes your shifts, workouts, meals, recovery, appointments, errands and reminders—then shows everything for review before saving.

PLAN AROUND THE JOB YOU ACTUALLY WORK

• Schedule photo and PDF capture
• Plain-language quick add
• Repeating rotations, nights and custom cycles
• Optional calendars for one job or multiple jobs
• Shift conflicts, weekly totals and overtime indicators
• Google Calendar and Outlook connections when configured

TRAIN WITH A PLAN THAT FITS

• Adaptive workout planning based on your goals and availability
• Exercise guidance, alternatives and equipment choices
• Sets, reps, effort and workout history
• Progressive coaching shaped by recent activity

MAKE NUTRITION PRACTICAL

• Calorie, macro and meal guidance
• Food, water and familiar-meal logging
• Food search and supported barcode scanning
• Automatic daily step progress from Health Connect after you connect it
• Weight, measurement and recovery context

AUTOMATION YOU CAN TRUST

Detected items are shown before saving. Recurring shifts stay grouped. Confidence and conflicts are visible. Work + Workout does not silently overwrite your schedule.

Work + Workout provides planning and general fitness education. It is not a medical device and does not diagnose or treat any condition. Consult a qualified professional for medical or dietary advice.

## Public URLs

- Privacy policy: https://www.workandworkout.com/work-gym-planner/privacy.html
- Support: https://www.workandworkout.com/work-gym-planner/support.html
- Account deletion: https://www.workandworkout.com/work-gym-planner/delete-account.html

## Play Console declarations

- **Ads:** No, unless advertising is added before release.
- **App access:** All core signed-in features require the private reviewer account supplied in Play Console.
- **Health apps declaration:** Activity and Fitness; Nutrition and Weight Management; Sleep Management. The product is not a medical device and does not offer diagnosis or treatment.
- **Health Connect permission:** `android.permission.health.READ_STEPS` only. It is used to show the user’s aggregated daily step total and progress toward their chosen goal on Home and in Health & steps. Permission is requested only after the user selects **Connect Health Connect**. The app does not request write access, exercise routes, location, or Health Connect background/history permissions. Users can disconnect in-app or revoke access in Health Connect.
- **Health Connect privacy policy:** https://www.workandworkout.com/work-gym-planner/privacy.html#phone-steps
- **Target audience:** Adults/general working population; not designed for children under 13.
- **Account deletion:** Available in-app from Account → Delete account permanently and through the public deletion instructions above.

## Data safety working notes

Confirm against the release build in Play Console. Expected disclosures include account information (email and optional name), user-entered schedules/tasks, fitness/activity, nutrition, body measurements and recovery information; AI prompts/context when AI Coach is used; photos only when the user invokes schedule/equipment/barcode features; and privacy-filtered crash, app stability and other diagnostic data. Diagnostic reports are not linked to an account and exclude planner and health contents. Data is encrypted in transit. Account-linked cloud data can be deleted in-app. The app has no advertising SDK and does not sell user data under the current product design.

Health Connect supplies a read-only aggregated daily step total. That total is stored locally in the same health diary as manual step entries. It is transmitted only if the user separately enables an account sync or personalized AI path that includes health context. Health Connect data is never used for advertising or sold.
