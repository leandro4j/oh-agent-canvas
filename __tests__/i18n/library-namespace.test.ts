import { describe, expect, it, vi } from "vitest";

describe("library i18n namespace scoping", () => {
  it("exports raw translation resources for host-app registration", async () => {
    const { OPENHANDS_I18N_NAMESPACE, translationResources } = await import(
      "../../src/i18n"
    );

    expect(OPENHANDS_I18N_NAMESPACE).toBe("openhands");
    expect(translationResources.en).toHaveProperty("ERROR$GENERIC");
    expect(translationResources.en).not.toHaveProperty(
      OPENHANDS_I18N_NAMESPACE,
    );
  });

  it("configures standalone i18n to load the openhands namespace by default", async () => {
    const { OPENHANDS_I18N_NAMESPACE, createAgentServerI18n } = await import(
      "../../src/i18n"
    );

    const instance = createAgentServerI18n();

    expect(instance.options.defaultNS).toBe(OPENHANDS_I18N_NAMESPACE);
    expect(instance.options.fallbackNS).toContain(OPENHANDS_I18N_NAMESPACE);
    expect(instance.options.ns).toContain(OPENHANDS_I18N_NAMESPACE);
  });

  it(
    "does not initialize the global i18next singleton when importing the library entry",
    async () => {
      vi.resetModules();

      const { default: globalI18n } = await import("i18next");

      await globalI18n.init({
        lng: "en",
        fallbackLng: "en",
        ns: ["translation"],
        defaultNS: "translation",
        resources: {
          en: {
            translation: {
              HOST_ONLY: "Host only",
            },
          },
        },
      });
      globalI18n.removeResourceBundle("en", "openhands");

      expect(globalI18n.hasResourceBundle("en", "openhands")).toBe(false);

      await import("../../src/index");

      expect(globalI18n.hasResourceBundle("en", "openhands")).toBe(false);
      expect(globalI18n.t("HOST_ONLY")).toBe("Host only");
    },
    // No per-test timeout override here: importing the full `../../src/index`
    // module graph is the heaviest import in the suite and can exceed the
    // global timeout under parallel load. Keep this extra budget local so the
    // rest of the suite still fails quickly on hung tests.
    60_000,
  );
});
