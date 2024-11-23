// vite.config.js
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    open: true, // open the browser when the server starts
    host: true, // allow access on network
    port: 3000, // change the port to 3000
  },
});
