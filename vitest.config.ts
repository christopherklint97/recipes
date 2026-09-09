import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [tanstackStart()],
});