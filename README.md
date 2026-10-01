# Four Dogs Karaoke

MVP for Four Dogs Entertainment karaoke events.

Four Dogs manages guest requests, singer rotation, host controls, the audience display, and optional Stripe tipping. KaraFun remains the karaoke playback system.

First acceptance event: `TEST123`.

## Routes
- `/e/TEST123` guest song search and request
- `/host/events/TEST123` host dashboard
- `/display/TEST123` audience display
- `/host/events/TEST123/qr` printable/scannable request QR

## Live workflow
1. Guest scans the Four Dogs QR code.
2. Guest searches for a song and joins the rotation.
3. Host approves or declines the request.
4. Host copies the song/artist search text and loads the song in KaraFun.
5. Host starts the singer in Four Dogs.
6. Audience display updates to Now Singing and Up Next.
7. Host completes the song and starts the next singer.

## Stripe tips
Set `NEXT_PUBLIC_STRIPE_TIP_URL` in Netlify to a Stripe Payment Link. When present, tip buttons automatically appear on the guest and host pages.

Secrets are configured in Netlify environment variables and are not committed.
