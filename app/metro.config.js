const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// `@shared/*` (tsconfig paths) points at ../shared/types, outside the project root.
config.watchFolders = [path.resolve(__dirname, "../shared")];

module.exports = withNativeWind(config, { input: "./src/global.css" });
