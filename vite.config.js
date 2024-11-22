// vite.config.js
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    open: true,
    host: true, // This will allow access from your local network
    port: 3000, // You can change the port if needed
  },
});
