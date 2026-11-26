import test from "node:test";
import assert from "node:assert/strict";
import { preloadAssets, retryPreloadAssets } from "./audio-assets.mjs";

test("audio preload can recover from a transient HTTP failure without page reload", async () => {
  const originalFetch = globalThis.fetch;
  let failedOnce = false;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    if (!failedOnce) {
      failedOnce = true;
      return { ok: false, status: 503 };
    }
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer
    };
  };

  try {
    const first = await preloadAssets();
    assert.equal(first.state, "error");
    assert.ok(first.failed.length > 0);

    const second = await retryPreloadAssets();
    assert.equal(second.state, "ready");
    assert.equal(second.failed.length, 0);
    assert.equal(second.completed, second.total);
    assert.ok(calls >= second.total + 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
