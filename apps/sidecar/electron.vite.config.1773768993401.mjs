// electron.vite.config.ts
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import path from "path";
var __electron_vite_injected_dirname = "/Users/nicolacapriroloteran/prototypes/holilabsv2/apps/sidecar";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "dist/main",
      rollupOptions: {
        input: {
          index: path.resolve(__electron_vite_injected_dirname, "src/main/index.ts")
        }
      }
    },
    resolve: {
      alias: {
        "@": path.resolve(__electron_vite_injected_dirname, "src")
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "dist/preload",
      rollupOptions: {
        input: {
          index: path.resolve(__electron_vite_injected_dirname, "src/preload/index.ts")
        }
      }
    },
    resolve: {
      alias: {
        "@": path.resolve(__electron_vite_injected_dirname, "src")
      }
    }
  },
  renderer: {
    plugins: [react()],
    root: path.resolve(__electron_vite_injected_dirname, "src/renderer"),
    build: {
      outDir: path.resolve(__electron_vite_injected_dirname, "dist/renderer"),
      rollupOptions: {
        input: {
          index: path.resolve(__electron_vite_injected_dirname, "src/renderer/index.html")
        }
      }
    },
    resolve: {
      alias: {
        "@": path.resolve(__electron_vite_injected_dirname, "src")
      }
    },
    server: {
      port: 5173
    }
  }
});
export {
  electron_vite_config_default as default
};
