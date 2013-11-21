#!/usr/bin/env node
require('../lib/vanilli.js').startVanilli({ apiPort: 8081, fakePort: 8082, logLevel: "debug" });