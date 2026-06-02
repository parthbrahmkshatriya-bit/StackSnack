const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Custom Expo Config Plugin to inject Google Play Billing Library v6+ configuration
 * into gradle.properties during standard prebuild.
 */
const withPlayStoreCompliance = (config) => {
  return withGradleProperties(config, (cfg) => {
    // Filter out any existing entries to prevent duplication
    cfg.modResults = cfg.modResults.filter(
      (item) => item.key !== 'RNIap_playBillingSdkVersion' && item.key !== 'playBillingSdkVersion'
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

    return cfg;
  });
};

module.exports = withPlayStoreCompliance;
