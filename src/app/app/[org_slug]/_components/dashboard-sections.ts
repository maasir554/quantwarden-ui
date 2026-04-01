export const dashboardSections = [
  "overview",
  "asset",
  "scan",
  "nmap-overview",
  "nmap-scan",
  "team",
] as const;

export type DashboardSection = (typeof dashboardSections)[number];

export function isDashboardSection(value: string): value is DashboardSection {
  return dashboardSections.includes(value as DashboardSection);
}
