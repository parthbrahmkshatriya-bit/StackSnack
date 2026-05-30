const { withProjectBuildGradle } = require('@expo/config-plugins');

const withKotlinCompilerArgs = (config) => {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language === 'groovy') {
      const extension = `
// Injected by withKotlinCompilerArgs.js to suppress Kotlin metadata version mismatch errors
allprojects {
    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
        kotlinOptions {
            freeCompilerArgs += ["-Xskip-metadata-version-check"]
        }
    }
}
`;
      if (!cfg.modResults.contents.includes('-Xskip-metadata-version-check')) {
        cfg.modResults.contents += extension;
      }
    }
    return cfg;
  });
};

module.exports = withKotlinCompilerArgs;
