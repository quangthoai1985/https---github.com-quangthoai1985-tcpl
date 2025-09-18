module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
    ecmaVersion: 2020,
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
  ],
  plugins: [
    "@typescript-eslint",
    "import",
  ],
  settings: {
    "import/resolver": {
      typescript: {}, // Giúp ESLint nhận diện các module TypeScript
    },
  },
  rules: {
    "quotes": ["error", "double"],
    "max-len": ["error", { "code": 120, "ignoreComments": true }],
    "require-jsdoc": "off",
    "new-cap": "off",
    "object-curly-spacing": ["error", "always"],
    "guard-for-in": "off",
    "valid-jsdoc": "off",
    "import/no-unresolved": 0,
    "import/namespace": "off",
  },
};
