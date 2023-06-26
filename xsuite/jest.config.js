/** @type {import('jest').Config} */
module.exports = {
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    "./lib/enc/": {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    "./lib/pairs/": {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  transform: {
    "^.+\\.(t|j)sx?$": "@swc/jest",
  },
};
