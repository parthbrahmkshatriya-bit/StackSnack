# Stack & Snap — Local Android Build Guide
## Using Android Studio (No EAS Cloud Required)

Follow every step in order. Do not skip any step.

---

## STEP 1 — Set Environment Variables (do this once)

You need to tell Windows where Java and Android SDK are installed.

1. Press **Windows key** → search **"Environment Variables"** → click **"Edit the system environment variables"**
2. Click **"Environment Variables"** button at the bottom
3. Under **"System variables"** click **"New"** and add these one by one:

| Variable Name | Value |
|---|---|
| `ANDROID_HOME` | `C:\Users\BAPS\AppData\Local\Android\Sdk` |
| `JAVA_HOME` | `C:\Program Files\Android\Android Studio\jbr` |

4. Now find the **"Path"** variable in System variables → click **Edit** → click **New** → add these two lines:
```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\tools
```

5. Click OK → OK → OK to save everything
6. **Close and reopen CMD** for changes to take effect

### Verify it worked — run these in CMD:
```
java -version
```
Should show: `openjdk version "17..."`

```
adb version
```
Should show: `Android Debug Bridge version 1.0.xx`

If either fails, double-check the paths above match what's on your PC.

---

## STEP 2 — Generate the Android Project

This creates the `android` folder that Android Studio will open.

Open CMD and run:

```
cd "C:\Users\BAPS\OneDrive\Documents\Claude\Projects\Stack and snap"
```

```
npx expo prebuild --platform android --clean
```

Wait for it to finish (2-3 minutes). It will create an `android` folder in your project.

---

## STEP 3 — Fix the Gradle Build File

After prebuild, open this file in Notepad:
```
C:\Users\BAPS\OneDrive\Documents\Claude\Projects\Stack and snap\android\app\build.gradle
```

Find this block (around line 90-120):
```
react {
    enableBundleCompression = false
```

If you see `enableBundleCompression` — delete that entire line. Save the file.

Also find and check the `dependencies` block at the bottom of the same file. Make sure this line exists:
```
implementation "com.google.android.gms:play-services-ads:22.6.0"
```

If it's not there, add it inside the `dependencies {}` block.

---

## STEP 4 — Open in Android Studio

1. Open **Android Studio**
2. Click **"Open"** (not New Project)
3. Navigate to: `C:\Users\BAPS\OneDrive\Documents\Claude\Projects\Stack and snap\android`
4. Click **OK**
5. Wait for Gradle to sync — this takes 3-5 minutes on first open
6. If it asks to **"Update Gradle"** → click **"Don't remind me again"** (do NOT update)
7. If it shows any SDK errors → click **"Install missing SDK components"** → accept

---

## STEP 5 — Fix react-native-iap Gradle Conflict

This is the key fix for the build error we kept seeing in EAS.

In Android Studio, find the file:
```
android/app/build.gradle
```

In the `android {}` block, add this if it's not already there:
```gradle
android {
    ...
    defaultConfig {
        ...
        missingDimensionStrategy 'store', 'play'
    }
}
```

This tells Gradle to use the Google Play version of react-native-iap (not Amazon).

---

## STEP 6 — Start Metro Bundler

Keep this running in the background the whole time.

Open a **new CMD window** and run:
```
cd "C:\Users\BAPS\OneDrive\Documents\Claude\Projects\Stack and snap"
npx expo start --dev-client
```

Leave this window open.

---

## STEP 7 — Build the APK for Testing

In Android Studio:
1. Click **Build** menu at the top
2. Click **"Build Bundle(s) / APK(s)"**
3. Click **"Build APK(s)"**
4. Wait 3-5 minutes for it to build
5. When done, a notification appears at the bottom right → click **"locate"**
6. The APK file is at: `android\app\build\outputs\apk\debug\app-debug.apk`

---

## STEP 8 — Install on Your Phone

**Option A — USB:**
1. Connect phone via USB
2. Allow USB debugging when prompted
3. In Android Studio click the **▶ Run** button (green play button)
4. Select your phone from the list
5. App installs and launches automatically

**Option B — Manual APK install:**
1. Copy the APK file to your phone via WhatsApp/Google Drive/USB
2. Open it on your phone
3. If it says "blocked" → Settings → Allow from this source

---

## STEP 9 — Build Release AAB for Play Store

Once testing is done and you're happy with the game:

1. In Android Studio → **Build** → **Generate Signed Bundle / APK**
2. Select **Android App Bundle** → Next
3. Click **"Create new..."** for keystore
4. Fill in:
   - Key store path: save it somewhere safe on your PC
   - Password: create a strong password (SAVE THIS — you need it forever)
   - Key alias: `stacksnap`
   - Key password: same as above
   - First and Last Name: your name
   - Country Code: IN
5. Click Next → select **"release"** → Finish
6. The AAB file will be at: `android\app\release\app-release.aab`
7. Upload this AAB to Play Console

---

## STEP 10 — Upload to Play Store

1. Go to **play.google.com/console**
2. Your app → **Production** → **Create new release**
3. Upload the `.aab` file
4. Add release notes: "Initial release"
5. Submit for review

---

## Common Errors & Fixes

**"SDK location not found"**
→ In Android Studio: File → Project Structure → SDK Location → set to `C:\Users\BAPS\AppData\Local\Android\Sdk`

**"Gradle sync failed"**
→ File → Invalidate Caches → Invalidate and Restart

**"Cannot resolve react-native-iap"**
→ Make sure you added `missingDimensionStrategy 'store', 'play'` in Step 5

**"Metro bundler not running"**
→ Make sure CMD with `npx expo start` is still open and running

**"App crashes on phone"**
→ In Android Studio: View → Tool Windows → Logcat → look for red ERROR lines → share them with Claude

---

## Quick Reference — Key File Locations

| File | Location |
|---|---|
| Main app config | `app.json` |
| Package dependencies | `package.json` |
| Android build file | `android/app/build.gradle` |
| Release AAB (for Play Store) | `android/app/release/app-release.aab` |
| Test APK | `android/app/build/outputs/apk/debug/app-debug.apk` |
| Ad IDs | `src/constants/admob.js` |
| IAP product IDs | `src/constants/iap.js` |

---

## Before Play Store Submission Checklist

- [ ] Replace test AdMob IDs in `src/constants/admob.js` with real IDs
- [ ] Set `USE_TEST_ADS = false` in `src/constants/admob.js`
- [ ] Create IAP products in Play Console and update `src/constants/iap.js`
- [ ] Replace placeholder icon/splash with real ones
- [ ] Test on a real device (not emulator)
- [ ] Build signed release AAB (Step 9)
- [ ] Create privacy policy (freeprivacypolicy.com — free)
- [ ] Upload to Play Console and submit

---

*Generated for Stack & Snap v1.0.0 — Expo SDK 51 — React Native 0.74.5*
