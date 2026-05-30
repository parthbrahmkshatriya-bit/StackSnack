/**
 * withAdMob.js — Custom Expo config plugin for react-native-google-mobile-ads
 *
 * Replaces the broken built-in config plugin that ships with v13.6.
 * Does the same thing: injects the AdMob App ID into AndroidManifest.xml
 * and iOS Info.plist so the SDK initialises correctly.
 */
const { withAndroidManifest, withInfoPlist } = require('@expo/config-plugins');

const META_NAME = 'com.google.android.gms.ads.APPLICATION_ID';

const withAdMob = (config, { androidAppId, iosAppId } = {}) => {
  // ── Android: meta-data in AndroidManifest.xml ──────────────────────────
  config = withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application[0];
    if (!app['meta-data']) app['meta-data'] = [];

    // Remove any existing AdMob entry to avoid duplicates on re-build
    app['meta-data'] = app['meta-data'].filter(
      (m) => m.$?.['android:name'] !== META_NAME
    );

    app['meta-data'].push({
      $: {
        'android:name': META_NAME,
        'android:value': androidAppId || 'ca-app-pub-3940256099942544~3347511713',
      },
    });

    return cfg;
  });

  // ── iOS: GADApplicationIdentifier in Info.plist ────────────────────────
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults['GADApplicationIdentifier'] =
      iosAppId || 'ca-app-pub-3940256099942544~1458002511';
    return cfg;
  });

  return config;
};

module.exports = withAdMob;
