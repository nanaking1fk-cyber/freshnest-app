# Work + Workout product tour

The reusable master is `work-gym-planner-v16/assets/work-workout-tour-v76.mp4`.

- Format: H.264/AAC MP4, 720 × 1280 (9:16), 30 fps, about 50 seconds
- Designed for: in-app tutorials, vertical social ads and App Store preview preparation
- Audio: subtle music; every important point is captioned for sound-off viewing
- Data: a fictional `@example.test` account and fictional workplace only
- Delivery: the poster is visible immediately, while the MP4 is loaded only after the user opens the tour

## Chapters

1. Today — 0:03
2. Calendar — 0:08
3. Training — 0:19
4. Nutrition — 0:24
5. Steps & recovery — 0:33
6. Hours & pay — 0:37
7. Your space — 0:43

## Regenerating the source recording

Run `scripts/create-product-tour-v76.mjs` with Node after installing the `app-store` Playwright dependencies. It records the production interface at a fixed date and writes a raw WebM plus a timing manifest to `/private/tmp/ww-product-tour-v76` by default. Set `DEMO_BASE_URL` to a local server URL when testing unpublished interface changes.

The committed MP4 is the reviewed, streaming-optimized export. Review a new recording at full size before replacing it and keep the final asset under 8 MB.
