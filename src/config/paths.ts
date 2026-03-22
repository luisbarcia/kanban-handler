import envPaths from "env-paths";

const paths = envPaths("kanban-handler", { suffix: "" });

/** Absolute path to the directory where CLI configuration files are stored. */
export const configDir = paths.config;

/** Absolute path to the directory used for persistent application data. */
export const dataDir = paths.data;

/** Absolute path to the directory used for cached responses and assets. */
export const cacheDir = paths.cache;
