import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import {
  calendarDataPlugin,
  chartsDataPlugin,
} from "./server/dataPlugins.ts";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    calendarDataPlugin(),
    chartsDataPlugin(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5174,
  },
});
