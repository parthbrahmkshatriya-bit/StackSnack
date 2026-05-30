# Stack & Snap — Setup Guide
**All pain points from FRS v1.0 addressed. Follow this guide exactly.**

---

## Step 1: Install Dependencies

Open terminal, navigate to this folder, then run:

```bash
npm install
```

> Takes 2–4 minutes. If you see peer dependency warnings, ignore them.

---

## Step 2: Install Expo CLI + EAS CLI

```bash
npm install -g expo-cli eas-cli
```

---

## Step 3: Start the App

```bash
npx expo start
```

Scan the QR code with **Expo Go** on your Android phone.

> ⚠️ Expo Go does NOT support `react-native-google-mobile-ads` or `react-native-iap` natively.
> Ads and IAP will not show in Expo Go. Use a **development build** for full testing:
>
> ```bash
> eas build --platform android --profile development
> ```

---

## Step 4: AdMob Setup (Do Before Launch)

### 4.1 Create AdMob Account
1. Go to https://admob.google.com and sign up
2. Create a new app → Android → "Stack & Snap"
3. Get your **App ID** (format: `ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX`)

### 4.2 Update app.json
Replace the test App IDs in `app.json`:
```json
"plugins": [
  ["react-native-google-mobile-ads", {
    "androidAppId": "YOUR_REAL_ANDROID_APP_ID",
    "iosAppId":    "YOUR_REAL_IOS_APP_ID"
  }]
]
```

### 4.3 Create 3 Ad Units in AdMob Console
| Unit Name         | Format       | Store in            |
|-------------------|--------------|---------------------|
| home_banner       | Banner       | `src/constants/admob.js` → PRODUCTION_IDS.BANNER   |
| gameover_inter    | Interstitial | `src/constants/admob.js` → PRODUCTION_IDS.INTERSTITIAL |
| retry_rewarded    | Rewarded     | `src/constants/admob.js` → PRODUCTION_IDS.REWARDED |

### 4.4 Switch to Production IDs (Only for Store Builds)
In `src/constants/admob.js`:
```js
export const USE_TEST_ADS = false; // ← Change this
```
And fill in the PRODUCTION_IDS with your real ad unit IDs.

> ⚠️ NEVER set USE_TEST_ADS = false during development. Google will ban your account.

### 4.5 GDPR/COPPA (Already Handled)
The `src/utils/ads.js` file handles UMP consent automatically.
- EU users: sees consent dialog before ads (GDPR compliant)
- All users: content rating set to MaxAdContentRating.G (COPPA-safe)
- No additional setup needed.

---

## Step 5: IAP Setup (Google Play)

### 5.1 Create Play Store Developer Account
- https://play.google.com/console — $25 one-time fee

### 5.2 Upload Your First APK
You need an uploaded APK before you can create IAP products:
```bash
eas build --platform android --profile preview
```
Upload the APK in Play Console → Internal Testing.

### 5.3 Create Products in Play Console
Go to: **Monetize → Products → In-app products → Create product**

Create these 5 non-consumable products exactly:
| Product ID                      | Title         | Price |
|---------------------------------|---------------|-------|
| com.stacksnap.theme_sunset      | Sunset Glow   | ₹49   |
| com.stacksnap.theme_forest      | Jungle Green  | ₹49   |
| com.stacksnap.theme_india       | India Fest    | ₹49   |
| com.stacksnap.theme_neon        | Neon Nights   | ₹99   |
| com.stacksnap.theme_gold        | Gold Rush     | ₹99   |

### 5.4 Test IAP in Sandbox
Add your Gmail account as a **license tester** in Play Console → Setup → License Testing.
Sandbox purchases are free and don't charge your card.

---

## Step 6: Sounds (Replace Placeholders)

Current sounds in `assets/sounds/` are silent placeholders.
Replace them with real sounds from:
- **https://freesound.org** (free with attribution)
- **https://www.bfxr.net** (free generator, no attribution needed)

Recommended searches on freesound.org:
| File         | Search term             |
|--------------|-------------------------|
| tap.mp3      | "button click game"     |
| perfect.mp3  | "coin chime success"    |
| trim.mp3     | "whoosh slice"          |
| combo.mp3    | "ascending chime"       |
| fail.mp3     | "game over descending"  |
| highscore.mp3| "fanfare short"         |

Keep all files under 100KB. Convert to MP3 at 128kbps if larger.

---

## Step 7: App Icons & Assets

Create these using **Canva** (free tier):
| File                        | Size         | Notes                              |
|-----------------------------|--------------|------------------------------------|
| assets/icon.png             | 1024×1024px  | No alpha channel, PNG              |
| assets/splash.png           | 1284×2778px  | Dark background (#1A1A2E)          |
| assets/adaptive-icon.png    | 1024×1024px  | Android adaptive icon foreground   |

---

## Step 8: Privacy Policy (Required for Both Stores)

1. Go to https://app-privacy-policy.com
2. Generate a policy for "Stack & Snap"
3. In the AdMob/Advertising section: check "Google AdMob"
4. Host it on GitHub Pages (free):
   - Create a repo → Settings → Pages → Enable from main branch
   - URL will be: `https://yourusername.github.io/stacksnap-privacy`
5. Add this URL to Play Console → App Content → Privacy Policy

---

## Step 9: Build for Play Store

```bash
# Login to EAS
eas login

# Link project (run once)
eas init

# Production build (.aab for Play Store)
eas build --platform android --profile production
```

Download the `.aab` from the EAS dashboard and upload to Play Console.

> Before uploading: change `USE_TEST_ADS = false` in `src/constants/admob.js`
> and replace placeholder App IDs in `app.json`.

---

## Step 10: Analytics (Optional but Recommended)

The app currently logs events to console in dev. To add Firebase Analytics:

```bash
npm install @react-native-firebase/app @react-native-firebase/analytics
```

Then edit `src/utils/analytics.js` — the comment shows exactly where to add the call.
Add `google-services.json` (Android) to project root.

---

## Pain Points Fixed vs Original FRS

| FRS Issue | Fix Applied |
|-----------|-------------|
| `expo-ads-admob` deprecated | Using `react-native-google-mobile-ads` |
| Raw pixel values (density issues) | All values normalized via `src/utils/dimensions.js` |
| No analytics | Analytics wrapper in `src/utils/analytics.js` |
| No GDPR/COPPA | UMP consent in `src/utils/ads.js` |
| No IAP error handling | `purchaseUpdatedListener` + `purchaseErrorListener` in ShopScreen |
| Forced rewarded ad on retry | Optional "Watch Ad to Continue" + free RETRY always available |
| No tutorial | `TutorialOverlay` shows on first run only |
| Camera scroll unspecified | Reanimated `cameraY` SharedValue in GameScreen |
| No privacy policy guidance | Step 8 above |
| Share generates image | `react-native-view-shot` captures actual score card |
| Speed tied to frame rate | Speed in px/sec (time-based, not frame-based) |
