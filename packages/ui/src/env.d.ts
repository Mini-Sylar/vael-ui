declare module '*.css' {}

// Bundlers replace `process.env.NODE_ENV` with the app's mode, as for Vue's own bundler builds: a
// check written as `process.env.NODE_ENV !== 'production'` lets production drop dev-only code whole.
declare const process: { env: { NODE_ENV?: string } }
