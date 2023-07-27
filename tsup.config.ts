import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  format: "esm",
  minify: true,
  //是否启用Code splitting  https://esbuild.github.io/api/#splitting
  splitting: true,
  // Generate declaration file
  dts: true,
  // Clean output directory before each build
  clean: true,
});
