import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AgentServerClient,
  CloudClient,
} from "@openhands/typescript-client/clients";
import SettingsService from "#/api/settings-service/settings-service.api";
import ProfilesService from "#/api/profiles-service/profiles-service.api";
import { SecretsService } from "#/api/secrets-service";
import SkillsService from "#/api/skills-service";
import ConfigService from "#/api/config-service/config-service.api";
import AgentProfilesService from "#/api/agent-profiles-service/agent-profiles-service.api";
import AgentServerConversationService from "#/api/conversation-service/agent-server-conversation-service.api";
import {
  getCloudOrganizationMe,
  getCloudOrganizations,
  getCurrentCloudApiKey,
} from "#/api/cloud/organization-service.api";
import { buildStartConversationRequest } from "#/api/agent-server-adapter";
import LLMSubscriptionService from "#/api/llm-subscription-service";
import PluginsManagementService from "#/api/plugins-management-service";
import PluginsService from "#/api/plugins-service";
import CanvasExtensionsService from "#/api/canvas-extensions-service";
import { DEFAULT_SETTINGS } from "#/services/settings";
import {
  __resetActiveStoreForTests,
  setActiveSelection,
  setRegisteredBackends,
} from "#/api/backend-registry/active-store";
import type { Backend } from "#/api/backend-registry/types";

const { get, post, put, remove, clientOptions } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  remove: vi.fn(),
  clientOptions: [] as unknown[],
}));

vi.mock("@openhands/typescript-client/clients", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@openhands/typescript-client/clients")
    >();
  return {
    ...actual,
    AgentServerClient: vi.fn(function AgentServerClientMock(options: unknown) {
      clientOptions.push(options);
      return {
        get,
        post,
        put,
        delete: remove,
        close: vi.fn(),
      };
    }),
    CloudClient: class CloudClientMock extends actual.CloudClient {
      constructor(
        options: ConstructorParameters<typeof actual.CloudClient>[0],
      ) {
        super(options);
        clientOptions.push(options);
      }
    },
  };
});

const controlPlaneRequest = vi.spyOn(CloudClient.prototype, "request");

function normalizeControlPlanePath(path: string): {
  path: string;
  params?: Record<string, string | number>;
} {
  const url = new URL(path, "https://sandbox.example.test");
  const params = Object.fromEntries(
    [...url.searchParams].map(([key, value]) => [
      key,
      key === "limit" ? Number(value) : value,
    ]),
  );
  return {
    path: url.pathname.replace(/^\/api\/v1/, ""),
    ...(Object.keys(params).length > 0 ? { params } : {}),
  };
}

const sandboxBackend: Backend = {
  id: "sandbox",
  name: "Sandbox",
  host: "https://sandbox.example.test/",
  apiKey: "sandbox-control-key",
  kind: "sandbox",
};

describe("Sandbox backend control-plane contracts", () => {
  beforeEach(() => {
    __resetActiveStoreForTests();
    setRegisteredBackends([sandboxBackend]);
    setActiveSelection({ backendId: sandboxBackend.id });
    SettingsService.invalidateCache();
    get.mockReset();
    post.mockReset();
    put.mockReset();
    remove.mockReset();
    controlPlaneRequest.mockReset();
    controlPlaneRequest.mockImplementation(({ method, path, body }) => {
      const normalized = normalizeControlPlanePath(path);
      if (method === "GET") {
        return normalized.params
          ? get(normalized.path, { params: normalized.params })
          : get(normalized.path);
      }
      if (method === "POST") return post(normalized.path, body);
      if (method === "PUT") return put(normalized.path, body);
      if (method === "DELETE") return remove(normalized.path);
      throw new Error(`Unexpected control-plane method: ${method}`);
    });
    clientOptions.length = 0;
    vi.mocked(AgentServerClient).mockClear();
  });

  afterEach(() => {
    __resetActiveStoreForTests();
  });

  it("uses the session-authenticated control plane and preserves runtime model inputs", async () => {
    get.mockResolvedValueOnce({
      // Keep this flat shape in the contract test: model identity must come
      // from Sandbox Server, not from the Canvas baseline defaults.
      llm_model: "runtime/provider-model",
      llm_base_url: "https://llm.runtime.test/v1",
      llm_api_key_set: true,
      confirmation_mode: true,
    });

    const settings = await SettingsService.getSettings();

    expect(settings.llm_model).toBe("runtime/provider-model");
    expect(settings.llm_base_url).toBe("https://llm.runtime.test/v1");
    expect(settings.llm_api_key_set).toBe(true);
    expect(settings.confirmation_mode).toBe(true);
    const payload = buildStartConversationRequest({
      settings: {
        ...DEFAULT_SETTINGS,
        agent_settings: {
          ...DEFAULT_SETTINGS.agent_settings,
          llm: {},
        },
      },
    });
    expect((payload.agent_settings?.llm as Record<string, unknown>).model).toBe(
      "",
    );
    expect(clientOptions[0]).toEqual(
      expect.objectContaining({
        host: sandboxBackend.host,
      }),
    );
    expect(controlPlaneRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        authMode: "session-api-key",
        sessionApiKey: sandboxBackend.apiKey,
      }),
    );
    expect(get).toHaveBeenCalledWith("/settings");
  });

  it("posts settings diffs without sending the control-plane key in the payload", async () => {
    post.mockResolvedValueOnce({});

    await SettingsService.saveSettings({
      agent_settings_diff: {
        llm: { model: "runtime/provider-model-v2" },
      },
      disabled_skills: ["skill-to-disable"],
    });

    expect(post).toHaveBeenCalledWith("/settings", {
      agent_settings_diff: {
        llm: { model: "runtime/provider-model-v2" },
      },
      disabled_skills: ["skill-to-disable"],
    });
  });

  it("does not copy a nested redacted LLM key into conversation settings", async () => {
    get.mockResolvedValueOnce({
      agent_settings: {
        llm: {
          model: "runtime/provider-model",
          api_key: "**********",
        },
      },
      conversation_settings: {},
      llm_api_key_set: true,
    });

    const result = await SettingsService.getSettingsForConversation();

    expect(result.agentSettings.llm).toEqual({
      model: "runtime/provider-model",
    });
    expect(result.secretsEncrypted).toBe(false);
  });

  it("keeps LLM profiles, secrets, skills, and model metadata on the control plane", async () => {
    get
      .mockResolvedValueOnce({
        profiles: [
          {
            name: "runtime-profile",
            model: "runtime/provider-model",
            base_url: null,
            api_key_set: true,
          },
        ],
        active_profile: "runtime-profile",
      })
      .mockResolvedValueOnce({
        name: "runtime-profile",
        config: { model: "runtime/provider-model", api_key: null },
        api_key_set: true,
      })
      .mockResolvedValueOnce({
        items: [{ name: "RUNTIME_TOKEN", description: "runtime secret" }],
        next_page_id: null,
      })
      .mockResolvedValueOnce({
        items: [
          {
            name: "runtime-skill",
            type: "agentskills",
            source: "project",
          },
        ],
        next_page_id: null,
      })
      .mockResolvedValueOnce({
        items: [
          {
            provider: "runtime-provider",
            name: "runtime-model",
            verified: true,
          },
        ],
        next_page_id: null,
      });

    const profiles = await ProfilesService.listProfiles();
    const profile = await ProfilesService.getProfile(
      "runtime-profile",
      "encrypted",
    );
    post.mockResolvedValueOnce({ name: "runtime-profile" });
    await ProfilesService.saveProfile("runtime-profile", {
      llm: { model: "runtime/provider-model" },
      include_secrets: true,
    });
    const secrets = await SecretsService.getSecretsOrThrow();
    const skills = await SkillsService.getSkills();
    const models = await ConfigService.searchModels({
      provider__eq: "runtime-provider",
    });

    expect(profiles.active_profile).toBe("runtime-profile");
    expect(profile.config).toEqual({
      model: "runtime/provider-model",
      api_key: null,
    });
    expect(post).toHaveBeenCalledWith("/settings/profiles/runtime-profile", {
      llm: { model: "runtime/provider-model" },
      include_secrets: true,
      preserve_existing_api_key: true,
    });
    expect(secrets).toEqual([
      { name: "RUNTIME_TOKEN", description: "runtime secret" },
    ]);
    expect(skills[0]).toMatchObject({
      name: "runtime-skill",
      source: "project",
    });
    expect(models.items).toEqual([
      { provider: "runtime-provider", name: "runtime-model", verified: true },
    ]);
    expect(get).toHaveBeenNthCalledWith(1, "/settings/profiles");
    expect(get).toHaveBeenNthCalledWith(
      2,
      "/settings/profiles/runtime-profile",
    );
    expect(get).toHaveBeenNthCalledWith(3, "/secrets/search", {
      params: { limit: 100 },
    });
    expect(get).toHaveBeenNthCalledWith(4, "/skills/search", {
      params: { limit: 100 },
    });
    expect(get).toHaveBeenNthCalledWith(5, "/config/models/search", {
      params: { provider__eq: "runtime-provider" },
    });
    expect(clientOptions).toHaveLength(6);
    for (const options of clientOptions) {
      expect(options).not.toHaveProperty("apiKey");
    }
    for (const [options] of controlPlaneRequest.mock.calls) {
      expect(options).toEqual(
        expect.objectContaining({
          authMode: "session-api-key",
          sessionApiKey: sandboxBackend.apiKey,
        }),
      );
    }
  });

  it("does not route unsupported Cloud-only agent profiles or public sharing through Sandbox", async () => {
    await expect(
      AgentProfilesService.saveProfile(
        "default",
        {} as Parameters<typeof AgentProfilesService.saveProfile>[1],
      ),
    ).rejects.toThrow("not supported by Sandbox Server");
    await expect(
      AgentServerConversationService.updateConversationPublicFlag(
        "conversation-1",
        true,
      ),
    ).rejects.toThrow("Public sharing requires a cloud backend");
    await expect(getCloudOrganizations(sandboxBackend)).rejects.toThrow(
      "require a cloud backend",
    );
    await expect(getCurrentCloudApiKey(sandboxBackend)).rejects.toThrow(
      "require a cloud backend",
    );
    await expect(
      getCloudOrganizationMe("org-1", sandboxBackend),
    ).rejects.toThrow("require a cloud backend");
    expect(AgentServerClient).not.toHaveBeenCalled();
  });

  it("blocks unsupported subscription, plugin, and Canvas Extension calls", async () => {
    await expect(LLMSubscriptionService.getOpenAIStatus()).rejects.toThrow(
      "only available on a local backend",
    );
    await expect(PluginsService.getPluginsMarketplace()).resolves.toEqual([]);
    await expect(PluginsService.getLocalPlugins()).resolves.toEqual([]);
    await expect(
      PluginsManagementService.listInstalledPlugins(),
    ).resolves.toEqual([]);
    await expect(CanvasExtensionsService.listInstalled()).rejects.toMatchObject(
      { reason: "sandbox-backend" },
    );
    expect(AgentServerClient).not.toHaveBeenCalled();
  });
});
