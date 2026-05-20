module.exports = {
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'apps/api/tsconfig.json' }],
  },
  rootDir: '.',
  moduleNameMapper: {
    '^@madar/(.*)$': '<rootDir>/packages/$1/src',
  },
};
