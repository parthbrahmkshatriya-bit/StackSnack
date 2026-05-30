# Stack & Snap — Deployment Guide
## Play Store + App Store

---

## PHASE 1 — Before You Build (do these once)

### 1. Create Real AdMob App IDs
1. Go to https://admob.google.com → Add App → "Stack & Snap"
2. Create two apps: one Android, one iOS
3. Copy the **App IDs** (format: `ca-app-pub-XXXXXXXX~XXXXXXXXXX`)
4. In `app.json`, replace the test IDs in the plugins array:
   ```json
   ["./plugins/withAdMob.js", {
     "androidAppId": "ca-app-pub-YOUR~ANDROID_ID",
     "iosAppId":    "ca-app-pub-YOUR~IOS_ID"
   }]
   ```
5. In `src/utils/ads.js`, replace all test ad unit IDs (banner, interstitial, rewarded) with your real AdMob unit IDs.

### 2. Create IAP Products in Play Console + App Store Connect
**Google Play Console** (https://play.google.com/console):
- New app → "Stack & Snap" → package: `com.stacksnap.app`
- Monetize → In-app products → Add product:
  - `remove_ads` — One-time purchase, $1.99
  - `theme_neon` — One-time purchase, $0.99
  - `theme_retro` — One-time purchase, $0.99

**App Store Connect** (https://appstoreconnect.apple.com):
- My Apps → New App → bundle ID: `com.stacksnap.app`
- Features → In-App Purchases → add same SKUs above

### 3. Replace Placeholder Assets
Replace these files (390×844 mockup in Canva works):
- `assets/icon.png` — 1024×1024 PNG, no transparency, no rounded corners (stores add rounding)
- `assets/splash.png` — 1242×2688 PNG
- `assets/adaptive-icon.png` — 1024×1024 PNG (foreground on transparent bg)

### 4. Replace Silent Sound Files
Download free sounds from https://freesound.org or generate at https://sfbgames.itch.io/chiptone
Replace files in `assets/sounds/`:
`tap.mp3`, `perfect.mp3`, `trim.mp3`, `combo.mp3`, `fail.mp3`, `highscore.mp3`, `purchase.mp3`, `startup.mp3`

### 5. Set Up EAS (Expo Application Services)
Run in CMD from the project folder:
```
npm install -g eas-cli
eas login
eas build:configure
```
This creates/updates `eas.json` and links to your Expo account.

Update `app.json` → `extra.eas.projectId` with the ID printed by `eas build:configure`.

---

## PHASE 2 — Build the Apps

### Android (AAB for Play Store)
```
eas build --platform android --profile production
```
- EAS handles signing automatically (creates a keystore for you, stores it safely)
- Downloads the `.aab` file when done (~10–15 min build time on EAS servers)

### iOS (IPA for App Store)
```
eas build --platform ios --profile production
```
- You need an Apple Developer account ($99/yr): https://developer.apple.com
- EAS will prompt you to log in and select a provisioning profile
- Downloads the `.ipa` when done

> **Both builds happen on Expo's cloud servers — no local Android Studio or Xcode needed.**

---

## PHASE 3 — Submit to Play Store

1. Go to https://play.google.com/console → your app → Production → Create release
2. Upload the `.aab` file EAS gave you
3. Fill in:
   - **Release name**: 1.0.0
   - **Release notes**: "Initial release"
4. Fill in the store listing:
   - Short description (80 chars): "Drop blocks, clear lines, beat your best score!"
   - Full description: see below ↓
   - Screenshots: at least 2 phone screenshots (you can screenshot the HTML prototype)
   - Feature graphic: 1024×500 JPG
   - Content rating: Complete the questionnaire (select "Casual game", no violence/gambling)
   - Privacy Policy URL: required — use https://www.freeprivacypolicy.com to generate one free
5. Pricing: Free (with ads/IAP)
6. Submit for review → typically 1–3 days

**Store description (copy/paste):**
```
Stack & Snap is a fast, satisfying block-dropping puzzle game.

Drop tetrominoes, clear lines, and chase your high score. 
Simple controls. Deep strategy. One more game, always.

✦ 7 classic shapes with smooth rotation
✦ Ghost piece preview
✦ Hard drop for speed players
✦ Combo bonuses for multi-line clears
✦ 10 speed levels — can you survive level 10?
✦ Dark theme with clean visuals

Free to play. No timers. No lives. Just pure puzzle action.
```

---

## PHASE 4 — Submit to App Store

1. Open **Transporter** app (free on Mac App Store) or use `eas submit`
2. Run: `eas submit --platform ios` — it walks you through the rest
3. In App Store Connect → your app → + Version → 1.0
4. Fill in:
   - Description (same as above, minus the ✦ bullets if you prefer)
   - Keywords: tetris, blocks, puzzle, stacker, arcade
   - Screenshots: required for 6.5" iPhone (iPhone 15 Pro Max size)
   - Support URL: your website or a simple mailto link
   - Privacy Policy URL: same one from above
5. Submit for review → typically 24–48 hours

---

## PHASE 5 — After Launch Checklist

- [ ] Replace test AdMob IDs with real ones (CRITICAL — test ads pay $0)
- [ ] Enable GDPR consent in AdMob dashboard (EU traffic)
- [ ] Set up Google Analytics for Firebase (free, plug into Expo via `expo-firebase-analytics`)
- [ ] Respond to first user reviews within 48 hours
- [ ] Monitor crash reports in Play Console → Android Vitals
- [ ] Plan first update: new themes, leaderboard, weekly challenge

---

## Key IDs & Links Reference

| Item | Value |
|------|-------|
| Android package | `com.stacksnap.app` |
| iOS bundle ID | `com.stacksnap.app` |
| Current version | 1.0.0 |
| Android version code | 1 |
| iOS build number | 1 |
| EAS project ID | Set after `eas build:configure` |

---

## Quick Command Reference

```bash
# Install EAS CLI (once)
npm install -g eas-cli

# Login
eas login

# Build Android
eas build --platform android --profile production

# Build iOS  
eas build --platform ios --profile production

# Submit Android to Play Store
eas submit --platform android

# Submit iOS to App Store
eas submit --platform ios

# Check build status
eas build:list
```
