#!/usr/bin/env node

import { DebugGatherer } from "./lib/gatherer/gatherer-debug.js";

const gatherer = new DebugGatherer();
await gatherer.debugParse("test-custom/index.md");
