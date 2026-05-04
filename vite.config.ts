import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          mui: [
            "@mui/material",
            "@emotion/react",
            "@emotion/styled",
          ],
          icons: ["@tabler/icons-react"],
          motion: ["framer-motion"],
          charts: ["recharts"],
        },
      },
    },
  },
});
