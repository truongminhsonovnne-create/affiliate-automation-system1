module.exports = {
  root: true,
  extends: ['next/core-web-vitals'],
  rules: {
    // Vietnamese content naturally uses curly quotes — suppress this noisy rule
    'react/no-unescaped-entities': 'off',
  },
};
