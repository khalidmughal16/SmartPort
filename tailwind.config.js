/** Tailwind is used for utilities only; preflight is off so it cannot disturb the SmartPort stylesheet. */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  corePlugins: { preflight: false },
  theme: { extend: { colors: { lime: '#C6F135', char: '#131514' } } },
}
