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
      ".agents/**",
      ".claude/**",
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "src/app/api/onboarding/check-username/route.ts"
    ],
  },
  {
    rules: {
      // Zakáž explicit any
      "@typescript-eslint/no-explicit-any": "error",
      
      // Zakáž console v produkcii
      "no-console": ["warn", {
        allow: ["warn", "error"]  // Povoľ len warn a error
      }],
      
      // Zakáž unused variables
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }],
      
      // Enforce type imports
      "@typescript-eslint/consistent-type-imports": ["error", {
        prefer: "type-imports"
      }]
    }
  }
];

export default eslintConfig;
