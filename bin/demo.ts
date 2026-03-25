#!/usr/bin/env npx tsx
import { playBanner } from "../src/utils/banner.js";

await playBanner();
console.log("\n  Ready to review your code. Run: patchpilots review <path>\n");
