import { createRequire } from 'module';

const require = createRequire(import.meta.url);


var require = createRequire(import.meta.url);
var module = { exports: {} };


/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
