/**
 * ads.js — AdMob initialization with GDPR consent
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
    const consentInfo = await AdsConsent.requestInfoUpdate();
    if (
      consentInfo.isConsentFormAvailable &&
      consentInfo.status === AdsConsentStatus.REQUIRED
    ) {
      await AdsConsent.showForm();
    }
    await mobileAds().setRequestConfiguration({
      maxAdContentRating: MaxAdContentRating.G,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });
    await mobileAds().initialize();
    adsInitialized = true;
  } catch (e) {
    console.warn('AdMob init error (non-fatal):', e);
    adsInitialized = true;
  }
}

export function isAdsReady() {
  return adsInitialized;
}
