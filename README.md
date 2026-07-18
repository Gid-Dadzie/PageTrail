# PageTrail 📚

A mobile reading-tracker and social platform with an integrated book-commerce layer.
Built with Expo SDK 57 (React Native 0.86), Firebase, and the Open Library API.

## Required setup

The app builds and runs today, but **every data-backed feature needs Firestore, which is
not yet enabled on the `pagetrail-94808` Firebase project.** Until it is, sign-in works
and the catalogue loads, but shelves, feed, PageCoins, passports, and listings will stay
empty (the reason is logged to the console rather than failing silently).

1. **Enable Firestore** — open the [Firebase console](https://console.firebase.google.com/project/pagetrail-94808/firestore)
   and create a Cloud Firestore database. Auth (email/password) is already enabled.

2. **Publish the security rules and indexes** in this repo:

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase deploy --only firestore:rules,firestore:indexes
   ```

   `firestore.rules` constrains every collection to its owner; `firestore.indexes.json`
   carries the one composite index the exchange screen needs.

3. **Run it**

   ```bash
   npm install
   npx expo start
   ```

## Architecture

```
src/
  app/                    file-based routes (expo-router)
    (auth)/               welcome, sign-in, sign-up, forgot-password
    (onboarding)/         gender, age, genres, profile
    (tabs)/               home, discover, shelves, feed, forum, profile
    forum/[id]            discussion thread: original post + threaded replies
    forum/new             start a new discussion
    book/[id]             book detail: shelving, progress, rating, buy links
    read/[id]             in-app reader for public-domain titles
    genre/[slug]          genre listing
    passport/[code]       Book Passport: owner chain + gated notes
    exchange              C2C listings and the compose flow
    stats                 reading dashboard
    notifications         in-app inbox
  components/ui/          button, chip, text-field, progress-bar, star-rating…
  services/               Firestore + Open Library data layer
  constants/              theme tokens and the genre taxonomy
```

Routing is gated in `src/app/_layout.tsx` with `Stack.Protected`: signed-out users only
reach `(auth)`, signed-in users who have not finished onboarding only reach
`(onboarding)`, and everyone else lands in `(tabs)`.

## Notable implementation decisions

- **Open Library, not Google Books.** The proposal allows either. Google Books' keyless
  endpoint shares a global anonymous quota that is currently exhausted (HTTP 429 on every
  request), so Open Library — free, keyless, uncapped — backs the catalogue.
- **In-app reading for public-domain titles.** A "Read now" button appears on a book's
  page only when Project Gutenberg (via the keyless Gutendex API) has a confident title +
  author match — in practice, public-domain works. The text is fetched, stripped of
  Gutenberg's licence boilerplate, themed, and rendered in a WebView on native / an iframe
  on web (`components/reader-view*`), so no reader library or development build is needed
  and it runs in Expo Go. In-copyright books are not readable in-app (that needs publisher
  licensing + DRM); they keep their buy/borrow links. Opening the reader adds the book to
  "Currently Reading" and scroll position is written back as reading progress.
- **Dark-only theme.** The supplied mockups are dark-only, so `constants/theme.ts` defines
  a single palette rather than a speculative light counterpart.
- **Password reset uses a real email link**, not the mockups' 4-digit OTP: Firebase issues
  a signed reset link, and verifying a numeric code would require a backend to mint and
  check it.
- **PageCoins are client-authoritative.** With no server, the client writes its own
  balance, so the economy is tamper-evident but not tamper-proof. The ledger is
  append-only and every balance change is recorded beside it, which is what makes moving
  coin mutations behind the proposal's Express API a contained change.
- **Purchase discounts issue a simulated voucher.** Real payment processing is explicitly
  out of scope in the proposal; affiliate links are real and tagged.

## Not yet built

- Node/Express API layer (the proposal's server-side commerce logic and API caching)
- Google sign-in (needs OAuth client IDs for the Firebase project)
- Push notifications via FCM (needs a server to send from; the in-app inbox exists)
- Reading challenges
- Geo-based exchange matching (listings currently carry a free-text city)
