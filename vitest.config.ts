import { defineConfig } from "vitest/config";
export default defineConfig({
    test: {
        include: ["test/**/*.spec.ts"],
        coverage: {
            enabled: true,
            include: ["src/**"],
            reportsDirectory: "reports/coverage",
        },
    }
});