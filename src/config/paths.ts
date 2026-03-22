import envPaths from "env-paths";

const paths = envPaths("kanban-handler", { suffix: "" });

export const configDir = paths.config;
export const dataDir = paths.data;
export const cacheDir = paths.cache;
