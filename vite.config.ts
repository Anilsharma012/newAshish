// vite.config.ts (ROOT)
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const DISABLE_SOURCEMAP =
  String(process.env.DISABLE_SOURCEMAP || "").toLowerCase() === "true";

export default defineConfig(({ command }) => {
  const isDev = command === "serve";

  return {
    root: "client",

    plugins: [
      react(),
      isDev ? expressPlugin() : undefined,
    ].filter(Boolean) as Plugin[],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client"),
        "@shared": path.resolve(__dirname, "shared"),
      },
    },

    base: "/",

    server: {
      host: true,
      port: 5173,
      strictPort: true,
    },

    // 👇 Prevent Vite from touching server-only deps in dev
    optimizeDeps: {
      exclude: ["razorpay"],
    },

    build: {
      outDir: "dist",
      emptyOutDir: true,
      minify: "esbuild",
      sourcemap: command === "serve" ? true : !DISABLE_SOURCEMAP,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) return "vendor";
          },
        },
      },
      // Optional: quieten the 500kb warning
      chunkSizeWarningLimit: 1500,
    },

    css: {
      devSourcemap: true,
    },
  };
});

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve",
    async configureServer(viteServer) {
      const srv =
        (await import(path.resolve(process.cwd(), "server/index.ts")).catch(
          async () =>
            await import(path.resolve(process.cwd(), "server/index.js"))
        )) as any;

      const createServer =
        srv.createServer ||
        srv.default ||
        (() => (req: any, res: any, next: any) => next());
      const initializeSocket = srv.initializeSocket || (() => {});

      const app = typeof createServer === "function" ? createServer() : createServer;

      if (viteServer.httpServer) {
        initializeSocket(viteServer.httpServer);
        console.log("🔌 Socket.io initialized in Vite dev server");
      }

      // @ts-ignore
      viteServer.middlewares.use(app);
    },
  };
}
