// Vite config — env vars require server restart to take effect
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
  server: {
    host: "::",
    port: 5173,
    strictPort: true,
    hmr: {
      overlay: false,
      clientPort: 5173,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Ensure Supabase public credentials are always available even if .env isn't picked up
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
      "https://upqwgwemuaqhnxskxbfr.supabase.co"
    ),
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwcXdnd2VtdWFxaG54c2t4YmZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2Nzg4MTksImV4cCI6MjA4NzI1NDgxOX0.zTphCl9xqoEe2N55uYyeVczn09nO5BsdEcmLPZLYbUs"
    ),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwcXdnd2VtdWFxaG54c2t4YmZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2Nzg4MTksImV4cCI6MjA4NzI1NDgxOX0.zTphCl9xqoEe2N55uYyeVczn09nO5BsdEcmLPZLYbUs"
    ),
    "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(
      "upqwgwemuaqhnxskxbfr"
    ),
  },
  };
});

