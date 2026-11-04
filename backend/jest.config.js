/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  // otplib y sus dependencias son ESM: hay que transpilarlas para que Jest (CommonJS) las cargue
  transformIgnorePatterns: ["/node_modules/(?!(otplib|@otplib|@scure|@noble)/)"],
  transform: {
    "^.+\\.(t|j)s$": [
      "@swc/jest",
      {
        jsc: { parser: { syntax: "typescript" }, target: "es2022" },
        module: { type: "commonjs" },
      },
    ],
  },
  moduleNameMapper: {
    "^@scalar/express-api-reference$": "<rootDir>/tests/stubs/scalar.ts",
  },
  globalSetup: "<rootDir>/tests/global-setup.ts",
  setupFiles: ["<rootDir>/tests/setup-env.ts"],
  maxWorkers: 1,
};
