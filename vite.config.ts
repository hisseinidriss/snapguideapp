import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Fail the build early if VITE_API_BASE_URL is misconfigured.
// Prevents deploys that would generate request URLs like
// https://<swa-origin>/<api-host>/api/... and trigger 405 errors.
function validateApiBaseUrl(): PluginOption {
  return {
    name: "validate-vite-api-base-url",
    enforce: "pre",
    config(_, { command }) {
      if (command !== "build") return;
      const raw = (process.env.VITE_API_BASE_URL ?? "").trim();
      if (raw.length === 0) return; // empty is allowed → frontend uses built-in default

      const errors: string[] = [];
      if (!/^https?:\/\//i.test(raw)) {
        errors.push(
          `  • Missing scheme. Value must start with "https://" (or "http://" for local dev). Got: "${raw}"`
        );
      }
      if (/\/api(\/|$)/i.test(raw)) {
        errors.push(
          `  • Must NOT contain "/api". The frontend appends "/api/..." automatically. Got: "${raw}"`
        );
      }
      if (/\/$/.test(raw)) {
        errors.push(
          `  • Must NOT end with a trailing slash. Got: "${raw}"`
        );
      }

      if (errors.length > 0) {
        const msg = [
          "",
          "✗ Invalid VITE_API_BASE_URL — build aborted to prevent broken deployment.",
          "",
          ...errors,
          "",
          'Expected format: "https://<your-functionapp>.azurewebsites.net"',
          'Or leave empty to use the built-in default backend.',
          "",
        ].join("\n");
        throw new Error(msg);
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [validateApiBaseUrl(), react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
