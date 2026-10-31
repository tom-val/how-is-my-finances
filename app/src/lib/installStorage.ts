// Native only: polyfills globalThis.localStorage on top of SQLite. The web twin is empty — the
// browser already has localStorage, and expo-sqlite on web would pull in a WASM build.
import "expo-sqlite/localStorage/install";
