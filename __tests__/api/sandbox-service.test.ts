import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  INVALID_SANDBOX_BACKEND_API_KEY_ERROR,
  SANDBOX_SERVER_UNREACHABLE_ERROR,
  validateSandboxBackend,
} from "#/api/sandbox/sandbox-service.api";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
});

describe("validateSandboxBackend", () => {
  it("requires public health followed by authenticated settings", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    await expect(
      validateSandboxBackend(
        {
          host: "https://sandbox.example.test/",
          apiKey: "control-plane-key",
        },
        1000,
      ),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://sandbox.example.test/health",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://sandbox.example.test/api/v1/settings",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "X-Session-API-Key": "control-plane-key",
        }),
      }),
    );
  });

  it("reports an unreachable control plane when public health fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(
      validateSandboxBackend(
        { host: "https://sandbox.example.test", apiKey: "control-plane-key" },
        1000,
      ),
    ).rejects.toThrow(SANDBOX_SERVER_UNREACHABLE_ERROR);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports a wrong key when authenticated settings rejects it", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));

    await expect(
      validateSandboxBackend(
        { host: "https://sandbox.example.test", apiKey: "wrong-key" },
        1000,
      ),
    ).rejects.toThrow(INVALID_SANDBOX_BACKEND_API_KEY_ERROR);
  });
});
