/**
 * admob.js — Ad unit IDs
 * Using Google test IDs now. Replace with real IDs before Play Store submission.
 */
import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

export const USE_TEST_ADS = true;

const TEST_IDS = {
  BANNER: TestIds.BANNER,
  INTERSTITIAL: TestIds.INTERSTITIAL,
  REWARDED: TestIds.REWARDED,
};

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
