export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'style', 'test', 'docs', 'chore', 'ci', 'perf', 'revert'],
    ],
    'subject-case': [0],
    'header-max-length': [2, 'always', 100],
  },
};
