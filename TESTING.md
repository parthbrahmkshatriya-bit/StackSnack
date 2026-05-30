# Stack & Snap — Local Testing Guide

---

## Prerequisites Checklist

Before running anything, confirm these are set up in Android Studio:

- [ ] Android Studio installed and opened at least once
- [ ] Android SDK installed (Studio → SDK Manager → Android 13 or 14)
- [ ] At least one AVD created (Studio → Device Manager → Create device)
  - Recommended: **Pixel 6** with **API 33** — close to a real mid-range device
  - Also create a **Redmi 9 equivalent**: any 5.5" device with API 28 (Android 9)
- [ ] `ANDROID_HOME` environment variable set:
  - Windows: `C:\Users\<you>\AppData\Local\Android\Sdk`
  - Add `%ANDROID_HOME%\platform-tools` to your PATH

Verify with:
```bash
adb devices       # should return "List of devices attached"
```

---

## Step 1: Install Dependencies

```bash
cd "Stack and snap"
npm install
```

---

## Step 2: Run the Development Build Locally

> **Why not Expo Go?**
> `react-native-google-mobile-ads` and `react-native-iap` require native code.
> Expo Go doesn't include them. You need a full local build.

### First time (takes ~10 min):
```bash
npx expo run:android
```

This will:
1. Run `expo prebuild` — generates the `android/` folder
2. Build the APK using your local Android SDK (Gradle)
3. Install it on your running emulator or connected phone
4. Start Metro bundler for hot reload

### Subsequent runs (fast, ~30 sec):
```bash
npx expo start --dev-client
```

Then press `a` to open on Android.

### If you get a Gradle error:
```bash
cd android && ./gradlew clean && cd ..
npx expo run:android
```

---

## Step 3: Feature Test Checklist

Work through each item in order. Check it off when it passes.

### 🟦 Splash Screen
- [ ] App opens showing "Stack & Snap" title
- [ ] Tagline "How high can you go?" visible below
- [ ] Fades in smoothly over ~0.8s
- [ ] Automatically navigates to Home after ~1.5s
- [ ] No crash on startup

### 🟦 Home Screen
- [ ] "STACK & SNAP" title visible
- [ ] "BEST: 0" shows on first launch
- [ ] PLAY button has a slow pulse animation
- [ ] PLAY button navigates to Game screen
- [ ] 🎨 THEMES button navigates to Shop screen
- [ ] Three color preview dots match the active theme
- [ ] Test AdMob banner ad loads at bottom (will show Google test ad)
  - If it shows a test banner → AdMob working ✅
  - If it shows nothing → check `USE_TEST_ADS = true` in `admob.js`

### 🟦 Tutorial (First Run Only)
- [ ] On very first PLAY, tutorial overlay appears
- [ ] Pulsing "TAP TO START" animation visible
- [ ] "GOT IT →" button dismisses it
- [ ] Second time you launch the game, tutorial does NOT show

### 🟦 Game Screen — Core Mechanics
- [ ] Platform moves left-to-right smoothly (no jank)
- [ ] Tapping anywhere drops the platform
- [ ] Platform aligns correctly onto the stack below
- [ ] **Perfect tap**: platform lands exactly → white screen flash → "PERFECT!" text
- [ ] **Partial tap**: platform is trimmed → cut piece falls off with animation
- [ ] **Miss**: platform falls off completely → game over triggers
- [ ] Score increments by 10 on normal stack, 25 on perfect
- [ ] Combo sequence: 2 perfects → "COMBO x2" (yellow), 3 → "COMBO x3" (orange), 4+ → "ON FIRE! 🔥" (red)
- [ ] Platform speed gradually increases as stack grows
- [ ] Camera scrolls upward as stack height grows past 3 layers
- [ ] Pause button (⏸) pauses the game, dims screen
- [ ] Resume and Home options appear in pause screen
- [ ] **NO banner ad on game screen** — confirm ad is absent during gameplay

### 🟦 Game Over Screen
- [ ] Triggers when platform misses entirely OR stack width < minimum
- [ ] Score card shows: score, stack count, best score
- [ ] On NEW high score: shows "🏆 NEW BEST!" with gold score number
- [ ] Best score saves and persists — reopen app and check Home screen shows it
- [ ] "📤 Share Score" button opens native share sheet with a PNG image
- [ ] "▶ Watch Ad to Continue" button visible (OPTIONAL — not forced)
  - [ ] Button shows "Loading ad..." while rewarded ad loads
  - [ ] Watching the full test rewarded ad returns to game with slightly wider platform
  - [ ] Continue option disappears after used once in a session
- [ ] "RETRY" button always available with no ad gate — starts fresh game
- [ ] "HOME" button goes back to Home screen
- [ ] Test ad frequency: die 3 times in a row — interstitial test ad should show on 3rd death only

### 🟦 Shop Screen
- [ ] All 6 themes visible in 2-column grid
- [ ] Classic Blue shows "ACTIVE" badge (default)
- [ ] Color swatches visible on each card
- [ ] Tapping "USE" on an owned theme activates it
- [ ] Return to Home screen — theme colors should update
- [ ] **IAP testing** (requires sandbox setup — see SETUP.md Step 5):
  - [ ] Tapping a paid theme shows the Play Store purchase flow
  - [ ] After sandbox purchase, theme shows "OWNED" + "USE"
  - [ ] "Restore Purchases" button works for previously purchased themes
- [ ] **No banner ad** on Shop screen

### 🟦 Sound (after replacing placeholder files)
- [ ] Tap sound plays on platform drop
- [ ] Different sound on perfect vs normal stack
- [ ] Game over sound plays on failure
- [ ] High score fanfare plays on new best
- [ ] Sound toggle (🔊 on Home screen) mutes all sounds
- [ ] Mute preference persists after app restart

### 🟦 Performance Tests
Run these on your emulator set to a **low-spec profile**:

**In Android Studio AVD:**
- Edit AVD → Advanced Settings → RAM: 2048 MB, Cores: 2

- [ ] Game runs at consistent frame rate (watch for stuttering)
- [ ] No lag spike when platform is dropped
- [ ] No lag when camera scrolls upward
- [ ] App cold start < 3 seconds

---

## Step 4: Test on a Real Device

Connect your Android phone via USB, enable USB debugging (Settings → Developer Options), then:

```bash
adb devices   # your phone should appear
npx expo run:android
```

Test the same checklist above on the physical device. Pay attention to:
- Touch responsiveness (tap timing feels right)
- Frame rate on a real device (should be 60fps)
- Screen size — check nothing is clipped

---

## Common Build Errors & Fixes

| Error | Fix |
|-------|-----|
| `SDK location not found` | Set `ANDROID_HOME` env variable, restart terminal |
| `Could not install Gradle` | Run Android Studio once to let it download Gradle |
| `Execution failed for task ':app:mergeDebugResources'` | `cd android && ./gradlew clean && cd ..` then retry |
| `Unable to load script from assets` | Make sure Metro is running: `npx expo start` in another terminal |
| `Module not found: react-native-google-mobile-ads` | `npm install` then rebuild |
| Blank screen / white flash | Metro bundle error — check terminal for JS error |
| Ads not showing | Confirm `USE_TEST_ADS = true` in `admob.js` — real IDs don't work in dev |
| IAP "This version of the application is not configured for billing" | Need Play Console setup + license tester account (see SETUP.md Step 5) |

---

## What to Fix Before Store Submission

After all checklist items pass locally:

1. Replace silent sound files with real ones (see SETUP.md Step 6)
2. Replace placeholder icon/splash with final designs (Canva)
3. Set `USE_TEST_ADS = false` and add real AdMob IDs
4. Add real AdMob App IDs in `app.json`
5. Set up IAP products in Play Console (SETUP.md Step 5)
6. Generate privacy policy (SETUP.md Step 8)
7. Run `eas build --platform android --profile production`
