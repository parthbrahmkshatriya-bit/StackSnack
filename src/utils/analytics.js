/**
 * analytics.js
 *
 * FIX: The original FRS had zero analytics. Post-launch you'll be flying blind.
 *
 * This is a lightweight wrapper that logs events to console in dev mode.
 * To add Firebase Analytics later, just swap the logEvent function body —
 * all call sites remain unchanged.
 *
 * To upgrade to Firebase:
 *   1. npm install @react-native-firebase/app @react-native-firebase/analytics
 *   2. Add google-services.json (Android) and GoogleService-Info.plist (iOS)
 *   3. Replace console.log below with: analytics().logEvent(name, params)
 */

const IS_DEV = __DEV__;

export function logEvent(name, params = {}) {
  if (IS_DEV) {
    console.log(`[Analytics] ${name}`, params);
    return;
  }
  // Production: add Firebase here
  // analytics().logEvent(name, params);
}

// Predefined events (keeps naming consistent)
export const Events = {
  GAME_START: 'game_start',
  GAME_OVER: 'game_over',
  NEW_HIGH_SCORE: 'new_high_score',
  PERFECT_STACK: 'perfect_stack',
  COMBO_ACHIEVED: 'combo_achieved',
  AD_REWARDED_SHOWN: 'ad_rewarded_shown',
  AD_REWARDED_COMPLETED: 'ad_rewarded_completed',
  AD_REWARDED_SKIPPED: 'ad_rewarded_skipped',
  AD_INTERSTITIAL_SHOWN: 'ad_interstitial_shown',
  IAP_PURCHASE_STARTED: 'iap_purchase_started',
  IAP_PURCHASE_SUCCESS: 'iap_purchase_success',
  IAP_PURCHASE_FAILED: 'iap_purchase_failed',
  IAP_RESTORE: 'iap_restore',
  THEME_CHANGED: 'theme_changed',
  SCORE_SHARED: 'score_shared',
  TUTORIAL_COMPLETED: 'tutorial_completed',
};
