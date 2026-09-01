import { useTranslation } from "react-i18next";
import { ExternalLink } from "lucide-react";
import { Typography } from "#/ui/typography";
import { I18nKey } from "#/i18n/declaration";
import { SidebarNavLink } from "#/components/features/sidebar/sidebar-nav-link";
import { BackendSyncedSettingsBadge } from "#/components/features/settings/backend-synced-settings-badge";
import { useActiveBackendContext } from "#/contexts/active-backend-context";
import { cn } from "#/utils/utils";
import {
  SIDEBAR_ICON_SLOT_CLASS,
  SIDEBAR_ROW_INTERACTIVE_CLASS,
  sidebarNavLabelClassName,
  sidebarNavRowClassName,
} from "#/components/features/sidebar/sidebar-layout";
import {
  getVisibleExtensionNavItems,
  isCloudLinkedExtensionItem,
} from "./extensions-navigation";

export function ExtensionsMobileHub() {
  const { t } = useTranslation("openhands");
  const { active } = useActiveBackendContext();
  const { backend } = active;

  return (
    <div
      data-testid="extensions-mobile-hub"
      className="flex flex-col gap-4 px-4 py-2 md:hidden"
    >
      <Typography.H2>{t(I18nKey.NAV$CUSTOMIZE)}</Typography.H2>
      <nav className="flex flex-col gap-0.5">
        {getVisibleExtensionNavItems(backend).map((item) => {
          if (isCloudLinkedExtensionItem(backend, item)) {
            const cloudSkillsUrl = `${backend.host.replace(/\/+$/, "")}/settings/skills`;
            return (
              <a
                key={item.to}
                data-testid={`sidebar-extensions-${item.to}`}
                href={cloudSkillsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  sidebarNavRowClassName({ collapsed: false }),
                  SIDEBAR_ROW_INTERACTIVE_CLASS.idle,
                )}
              >
                <span className={SIDEBAR_ICON_SLOT_CLASS}>{item.icon}</span>
                <span className={cn(sidebarNavLabelClassName(false), "flex-1")}>
                  {t(I18nKey.SIDEBAR$SKILLS_AND_PLUGINS_CLOUD_LINK)}
                </span>
                <ExternalLink
                  className="size-4 shrink-0 text-[var(--oh-muted)]"
                  aria-hidden
                />
              </a>
            );
          }

          return (
            <SidebarNavLink
              key={item.to}
              to={item.to}
              label={item.label}
              end={item.end}
              testId={`sidebar-extensions-${item.to}`}
              icon={item.icon}
              disabled={item.comingSoon}
            />
          );
        })}
      </nav>
      <div className="pt-1">
        <BackendSyncedSettingsBadge />
      </div>
    </div>
  );
}
