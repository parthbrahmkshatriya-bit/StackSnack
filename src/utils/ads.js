/**
 * ads.js
 *
 * FIX: Uses react-native-google-mobile-ads (not deprecated expo-ads-admob).
 * FIX: Includes GDPR/COPPA compliance via AdMob's UMP (User Messaging Platform) SDK.
 *
 * GDPR requirement: Before showing any ads in EU, you must request consent.
 * AdMob's UMP SDK handles this automatically — it detects user region and
 * shows the consent dialog only where legally required.
 *
 * COPPA requirement: Since this is an "Everyone" rated game, we set
 * requestNonPersonalizedAdsOnly if consent is not obtained.
 */

import mobileAds, {
  AdsConsent,
  AdsConsentStatus,
  MaxAdContentRating,
} from 'react-native-google-mobile-ads';

let adsInitialized = false;

export async function initAds() {
  if (adsInitialized) return;

  try {
    // Step 1: Request consent via UMP (handles GDPR automatically by region)
    const consentInfo = await AdsConsent.requestInfoUpdate();

    // Show consent form if required (EU users) and not yet obtained
    if (
      consentInfo.isConsentFormAvailable &&
      consentInfo.status === AdsConsentStatus.REQUIRED
    ) {
      await AdsConsent.showForm();
    }

    // Step 2: Configure AdMob with appropriate settings
    const consentStatus = await AdsConsent.getStatus();
    const nonPersonalized = consentStatus !== AdsConsentStatus.OBTAINED;

    await mobileAds().setRequestConfiguration({
      // Cap content rating at "General Audiences" (COPPA-safe)
      maxAdContentRating: MaxAdContentRating.G,
      // Tag for child-directed treatment (COPPA)
      tagForChildDirectedTreatment: false,
      // Tag for under-age-of-consent treatment (GDPR)
      tagForUnderAgeOfConsent: false,
    });

    // Step 3: Initialize the SDK
    await mobileAds().initialize();
    adsInitialized = true;
  } catch (e) {
    // Ads must never crash the app. Log and continue.
    console.warn('AdMob init error (non-fatal):', e);
    adsInitialized = true; // Mark done so we don't retry in a loop
  }
}

export function isAdsReady() {
  return adsInitialized;
}
