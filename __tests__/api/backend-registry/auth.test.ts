import { describe, expect, it } from "vitest";
import { buildAuthHeaders } from "#/api/backend-registry/auth";
import type { Backend } from "#/api/backend-registry/types";

function backend(
  kind: Backend["kind"],
  overrides: Partial<Backend> = {},
): Backend {
  return {
    id: kind,
    name: kind,
    host: `https://${kind}.example.test`,
    apiKey: "session-key",
    kind,
    ...overrides,
  };
}

describe("buildAuthHeaders", () => {
  it("uses session-key auth for direct-runtime backends", () => {
    expect(buildAuthHeaders(backend("local"))).toEqual({
      "X-Session-API-Key": "session-key",
    });
    expect(buildAuthHeaders(backend("sandbox"))).toEqual({
      "X-Session-API-Key": "session-key",
    });
  });

  it("keeps managed Cloud bearer and cookie auth unchanged", () => {
    expect(buildAuthHeaders(backend("cloud"))).toEqual({
      Authorization: "Bearer session-key",
    });
    expect(
      buildAuthHeaders(backend("cloud", { authMode: "cookie", apiKey: "" })),
    ).toEqual({});
  });
});
