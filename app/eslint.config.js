// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "ios/*", "android/*", ".expo/*"],
  },
  {
    rules: {
      // xlsx ships from the SheetJS CDN with an `exports` map the import plugin can't follow.
      "import/no-unresolved": ["error", { ignore: ["^xlsx$"] }],
    },
  },
]);
