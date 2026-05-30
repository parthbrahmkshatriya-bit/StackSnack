/**
 * admob.js
 *
 * FIX: Using react-native-google-mobile-ads instead of deprecated expo-ads-admob.
 *
 * IMPORTANT: TEST_IDS are used during development (hardcoded by Google).
 * Replace PRODUCTION_IDS with your real Ad Unit IDs from AdMob console
 * ONLY when building for store submission. Never use real IDs during development
 * or Google will ban your account.
 *
 * To switch: set USE_TEST_ADS = false and fill in PRODUCTION_IDS.
 */

import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

// Set to false only for production store builds
export const USE_TEST_ADS = true;

// Google's official test ad unit IDs — safe to use during development
const TEST_IDS = {
  BANNER: TestIds.BANNER,
  INTERSTITIAL: TestIds.INTERSTITIAL,
  REWARDED: TestIds.REWARDED,
};

// Replace with your real ad unit IDs from AdMob console after going live
const PRODUCTION_IDS = {
  BANNER: Platform.select({
    android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
    ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
  }),
  INTERSTITIAL: Platform.select({
    android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
    ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
  }),
  REWARDED: Platform.select({
    android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
    ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
  }),
};

export const AD_UNIT_IDS = USE_TEST_ADS ? TEST_IDS : PRODUCTION_IDS;
