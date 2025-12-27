import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  define: {
    global: "globalThis",
  },
  resolve: {
    alias: {
      // Work around browser bundling issues in ethr-did-resolver used by Tonomy SDK
      "ethr-did-resolver": path.resolve(
        "./node_modules/ethr-did-resolver/src/index.ts",
      ),
    },
  },
});
