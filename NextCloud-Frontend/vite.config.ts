import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || "http://localhost:5000";
  const nextcloudProxyTarget =
    env.VITE_NEXTCLOUD_PROXY_TARGET || env.NC_BASE_URL || "http://localhost:8090";
  const port = Number(env.VITE_PORT || 5173);

  return {
    plugins: [react()],
    root: "client",
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client/src"),
        "@shared": path.resolve(__dirname, "shared"),
      },
    },
    server: {
      port,
      strictPort: true,
      proxy: {
        "/api": apiProxyTarget,
        "/remote.php": {
          target: nextcloudProxyTarget,
          changeOrigin: true,
        },
        "/ocs": {
          target: nextcloudProxyTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: "../dist",
    },
  };
});
