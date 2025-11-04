import { defineConfig } from "vitest/config";
export default defineConfig({
    test: {
        include: ["test/**/*.test.?(c|m)[jt]s?(x)"],
        coverage: {
            enabled: true,
            include: ["src/**"],
            reportsDirectory: "reports/coverage",
        },
    }
});