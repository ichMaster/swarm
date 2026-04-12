const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const ENV_PATH = path.resolve(process.cwd(), ".env");
let backupContent = null;
let savedEnv = {};

function backupEnv() {
  savedEnv = { ...process.env };
  try { backupContent = fs.readFileSync(ENV_PATH, "utf8"); } catch { backupContent = null; }
}

function restoreEnv() {
  // Remove keys added during test
  for (const key of Object.keys(process.env)) {
    if (!(key in savedEnv)) delete process.env[key];
  }
  Object.assign(process.env, savedEnv);
  if (backupContent !== null) {
    fs.writeFileSync(ENV_PATH, backupContent);
  } else {
    try { fs.unlinkSync(ENV_PATH); } catch {}
  }
  // Clear require cache so loadEnv re-reads the file
  delete require.cache[require.resolve("../../src/server/env")];
}

describe("env parser", () => {
  beforeEach(() => backupEnv());
  afterEach(() => restoreEnv());

  it("parses KEY=value correctly", () => {
    fs.writeFileSync(ENV_PATH, "TEST_KEY_A=hello\n");
    delete process.env.TEST_KEY_A;
    const loadEnv = require("../../src/server/env");
    loadEnv();
    assert.equal(process.env.TEST_KEY_A, "hello");
  });

  it("ignores comment lines", () => {
    fs.writeFileSync(ENV_PATH, "# this is a comment\nTEST_KEY_B=yes\n");
    delete process.env.TEST_KEY_B;
    const loadEnv = require("../../src/server/env");
    loadEnv();
    assert.equal(process.env.TEST_KEY_B, "yes");
  });

  it("ignores empty lines", () => {
    fs.writeFileSync(ENV_PATH, "\n\nTEST_KEY_C=value\n\n");
    delete process.env.TEST_KEY_C;
    const loadEnv = require("../../src/server/env");
    loadEnv();
    assert.equal(process.env.TEST_KEY_C, "value");
  });

  it("strips double quotes from values", () => {
    fs.writeFileSync(ENV_PATH, 'TEST_KEY_D="quoted value"\n');
    delete process.env.TEST_KEY_D;
    const loadEnv = require("../../src/server/env");
    loadEnv();
    assert.equal(process.env.TEST_KEY_D, "quoted value");
  });

  it("handles missing .env file without crash", () => {
    try { fs.unlinkSync(ENV_PATH); } catch {}
    const loadEnv = require("../../src/server/env");
    assert.doesNotThrow(() => loadEnv());
  });

  it("does not overwrite existing env vars", () => {
    fs.writeFileSync(ENV_PATH, "TEST_KEY_E=new\n");
    process.env.TEST_KEY_E = "existing";
    const loadEnv = require("../../src/server/env");
    loadEnv();
    assert.equal(process.env.TEST_KEY_E, "existing");
  });
});
