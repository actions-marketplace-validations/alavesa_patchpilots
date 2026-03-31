import { describe, it, expect } from "vitest";
import { classifyFile, routeFiles, tierToModel, DEFAULT_ROUTING, type ModelRoutingConfig } from "./model-router.js";
import type { FileContent } from "../types/index.js";

function makeFile(path: string, lines: number): FileContent {
  return { path, content: "x\n".repeat(lines), language: "typescript" };
}

describe("classifyFile", () => {
  const config = DEFAULT_ROUTING;

  it("routes small files to fast tier", () => {
    expect(classifyFile(makeFile("src/utils/helpers.ts", 20), config)).toBe("fast");
  });

  it("routes large files to deep tier", () => {
    expect(classifyFile(makeFile("src/core/engine.ts", 600), config)).toBe("deep");
  });

  it("routes medium files to standard tier", () => {
    expect(classifyFile(makeFile("src/core/engine.ts", 200), config)).toBe("standard");
  });

  it("routes files at boundary lines correctly", () => {
    // makeFile(n) produces n+1 lines (trailing newline), so use n-1
    expect(classifyFile(makeFile("src/foo.ts", 49), config)).toBe("fast");   // 50 lines ≤ 50
    expect(classifyFile(makeFile("src/foo.ts", 50), config)).toBe("standard"); // 51 lines > 50
    expect(classifyFile(makeFile("src/foo.ts", 499), config)).toBe("deep");  // 500 lines ≥ 500
    expect(classifyFile(makeFile("src/foo.ts", 498), config)).toBe("standard"); // 499 lines < 500
  });

  it("deep patterns override line count", () => {
    // Small file but matches "auth" pattern → deep
    expect(classifyFile(makeFile("src/auth/login.ts", 10), config)).toBe("deep");
    expect(classifyFile(makeFile("src/middleware/cors.ts", 30), config)).toBe("deep");
    expect(classifyFile(makeFile("src/crypto/hash.ts", 5), config)).toBe("deep");
  });

  it("fast patterns override line count", () => {
    // Large file but matches "types" pattern → fast
    expect(classifyFile(makeFile("src/types/review.ts", 300), config)).toBe("fast");
    expect(classifyFile(makeFile("src/constants/defaults.ts", 200), config)).toBe("fast");
    expect(classifyFile(makeFile("src/config/app.ts", 400), config)).toBe("fast");
  });

  it("deep patterns take priority over fast patterns", () => {
    // Matches both "config" (fast) and "database" (deep) — deep wins
    expect(classifyFile(makeFile("src/database/config.ts", 100), config)).toBe("deep");
  });

  it("pattern matching is case-insensitive on path", () => {
    expect(classifyFile(makeFile("src/Auth/Login.ts", 100), config)).toBe("deep");
  });

  it("works with custom config", () => {
    const custom: ModelRoutingConfig = {
      ...DEFAULT_ROUTING,
      fastMaxLines: 100,
      deepMinLines: 300,
      deepPatterns: ["critical"],
      fastPatterns: ["trivial"],
    };
    expect(classifyFile(makeFile("src/trivial.ts", 200), custom)).toBe("fast");
    expect(classifyFile(makeFile("src/critical.ts", 50), custom)).toBe("deep");
    expect(classifyFile(makeFile("src/normal.ts", 80), custom)).toBe("fast");
    expect(classifyFile(makeFile("src/normal.ts", 150), custom)).toBe("standard");
    expect(classifyFile(makeFile("src/normal.ts", 350), custom)).toBe("deep");
  });
});

describe("routeFiles", () => {
  const config = DEFAULT_ROUTING;

  it("groups files by tier", () => {
    const files = [
      makeFile("src/types/index.ts", 10),       // fast (pattern)
      makeFile("src/core/engine.ts", 200),       // standard
      makeFile("src/auth/session.ts", 100),      // deep (pattern)
      makeFile("src/utils/tiny.ts", 20),         // fast (size)
      makeFile("src/core/big.ts", 600),          // deep (size)
    ];

    const groups = routeFiles(files, config);

    expect(groups.get("fast")?.length).toBe(2);
    expect(groups.get("standard")?.length).toBe(1);
    expect(groups.get("deep")?.length).toBe(2);
  });

  it("omits empty tiers", () => {
    const files = [makeFile("src/auth/login.ts", 100)]; // all deep
    const groups = routeFiles(files, config);

    expect(groups.has("fast")).toBe(false);
    expect(groups.has("standard")).toBe(false);
    expect(groups.get("deep")?.length).toBe(1);
  });

  it("handles empty file list", () => {
    const groups = routeFiles([], config);
    expect(groups.size).toBe(0);
  });
});

describe("tierToModel", () => {
  it("maps tiers to default model IDs", () => {
    expect(tierToModel("fast", DEFAULT_ROUTING)).toBe("claude-haiku-4-5");
    expect(tierToModel("standard", DEFAULT_ROUTING)).toBe("claude-sonnet-4-6");
    expect(tierToModel("deep", DEFAULT_ROUTING)).toBe("claude-opus-4-6");
  });

  it("respects custom model IDs", () => {
    const custom: ModelRoutingConfig = {
      ...DEFAULT_ROUTING,
      fast: "my-fast-model",
      deep: "my-deep-model",
    };
    expect(tierToModel("fast", custom)).toBe("my-fast-model");
    expect(tierToModel("deep", custom)).toBe("my-deep-model");
  });
});
