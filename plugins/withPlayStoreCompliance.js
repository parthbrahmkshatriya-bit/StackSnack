const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Custom Expo Config Plugin to inject Google Play Billing Library v6+ configuration
 * and Android 15 AAPT2 compatibility variables into gradle.properties during prebuild.
 */
const withPlayStoreCompliance = (config) => {
  return withGradleProperties(config, (cfg) => {
    // Filter out any existing entries to prevent duplication
    cfg.modResults = cfg.modResults.filter(
      (item) => item.key !== 'RNIap_playBillingSdkVersion' && 
                item.key !== 'playBillingSdkVersion' &&
                item.key !== 'android.aapt2FromMavenOverride'
    );

    // Inject Google Play Billing Library Version 6.2.1
    cfg.modResults.push({
      type: 'property',
      key: 'RNIap_playBillingSdkVersion',
      value: '6.2.1',
    });

    cfg.modResults.push({
      type: 'property',
      key: 'playBillingSdkVersion',
      value: '6.2.1',
    });

    // Inject AAPT2 Android 15 compatibility helper to resolve resource linking failures
    cfg.modResults.push({
      type: 'property',
      key: 'android.aapt2FromMavenOverride',
      value: 'com.android.tools.build:aapt2:8.6.1-11315950',
    });

    return cfg;
  });
};

module.exports = withPlayStoreCompliance;
