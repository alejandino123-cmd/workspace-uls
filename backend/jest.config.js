/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  transform: {
    "^.+\\.ts$": [
      "@swc/jest",
      {
        jsc: { parser: { syntax: "typescript" }, target: "es2022" },
        module: { type: "commonjs" },
      },
    ],
  },
  moduleNameMapper: {
    "^@scalar/express-api-reference$": "<rootDir>/tests/stubs/scalar.ts",
    "(.*)/lib/google$": "<rootDir>/tests/stubs/google.ts",
  },
  globalSetup: "<rootDir>/tests/global-setup.ts",
  setupFiles: ["<rootDir>/tests/setup-env.ts"],
  maxWorkers: 1,
};