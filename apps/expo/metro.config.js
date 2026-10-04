const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in monorepo so packages/core is tracked
config.watchFolders = [monorepoRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// 3. Direct module aliases for monorepo packages to guarantee zero-failure resolution
config.resolver.extraNodeModules = {
  "@cognitive-canvas/core/parser": path.resolve(monorepoRoot, "packages/core/src/parser"),
  "@cognitive-canvas/core/types": path.resolve(monorepoRoot, "packages/core/src/types"),
  "@cognitive-canvas/core": path.resolve(monorepoRoot, "packages/core"),
};

module.exports = config;
