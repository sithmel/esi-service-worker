import { nodeResolve } from "@rollup/plugin-node-resolve"

export default {
  input: "src/serviceworker.mjs",
  output: {
    format: "iife",
  },
  plugins: [nodeResolve()],
}
