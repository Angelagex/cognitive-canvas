const { withMainApplication, withAppBuildGradle } = require("@expo/config-plugins");

const withJetpackInk = (config) => {
  // 1. Inject androidx.ink dependencies into app/build.gradle
  config = withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes("androidx.ink:ink-authoring")) {
      config.modResults.contents = config.modResults.contents.replace(
        /dependencies\s*\{/,
        `dependencies {
    // Android Jetpack Ink API
    implementation("androidx.ink:ink-geometry:1.0.0-alpha02")
    implementation("androidx.ink:ink-brush:1.0.0-alpha02")
    implementation("androidx.ink:ink-strokes:1.0.0-alpha02")
    implementation("androidx.ink:ink-authoring:1.0.0-alpha02")
    implementation("androidx.ink:ink-rendering:1.0.0-alpha02")`
      );
    }
    return config;
  });

  // 2. Inject JetpackInkPackage() into MainApplication.kt
  config = withMainApplication(config, (config) => {
    if (!config.modResults.contents.includes("JetpackInkPackage()")) {
      config.modResults.contents = config.modResults.contents.replace(
        "val packages = PackageList(this).packages",
        "val packages = PackageList(this).packages.toMutableList()\n            packages.add(com.cognitivecanvas.app.ink.JetpackInkPackage())"
      );
    }
    return config;
  });

  return config;
};

module.exports = withJetpackInk;
