import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // Many API routes use pragmatic 'any' for robust JSON parsing; treat as warnings to avoid blocking builds
      "@typescript-eslint/no-explicit-any": "warn",
      // Do not fail build on prefer-const; treat as a suggestion
      "prefer-const": "warn",
    },
  },
];

export default eslintConfig;
