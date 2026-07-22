import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vue 3D 子项目（独立构建，不纳入 Next.js ESLint）
    "src-vue-3d/**",
    // Vue 3D 构建产物
    "public/vue-3d/**",
    "public/static/vue-3d/**",
  ]),
]);

export default eslintConfig;
