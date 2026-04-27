import js from "@eslint/js";
import boundaries from "eslint-plugin-boundaries";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["**/node_modules/**", "**/.turbo/**", "**/dist/**", "**/coverage/**"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: {
      boundaries
    },
    settings: {
      "boundaries/elements": [
        { type: "apps-api", pattern: "apps/api/**" },
        { type: "apps-worker", pattern: "apps/worker/**" },
        { type: "core", pattern: "packages/core/**" },
        { type: "infra-db", pattern: "packages/infra-db/**" },
        { type: "infra-exchange-binance", pattern: "packages/infra-exchange-binance/**" },
        {
          type: "infra-notifications-telegram",
          pattern: "packages/infra-notifications-telegram/**"
        }
      ]
    },
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "allow",
          rules: [
            {
              from: { type: "core" },
              disallow: {
                to: { type: ["infra-db", "infra-exchange-binance", "infra-notifications-telegram"] }
              }
            },
            {
              from: {
                type: ["core", "infra-db", "infra-exchange-binance", "infra-notifications-telegram"]
              },
              disallow: { to: { type: ["apps-api", "apps-worker"] } }
            }
          ]
        }
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["apps/*", "apps/*/*"],
              message: "packages/* no debe importar desde apps/*"
            },
            {
              group: ["packages/infra-*", "packages/infra-*/*"],
              message: "packages/core no debe importar desde packages/infra-*"
            }
          ]
        }
      ]
    }
  },
  {
    files: ["packages/core/**/*.{js,mjs,cjs,ts,mts,cts}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: ["packages/infra-*", "packages/infra-*/*"]
        }
      ]
    }
  },
  {
    files: ["packages/**/*.{js,mjs,cjs,ts,mts,cts}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: ["apps/*", "apps/*/*"]
        }
      ]
    }
  }
];
