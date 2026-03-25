import DashboardShell from "./components/DashboardShell";
import Overview from "./components/Overview";

export default function HomePage() {
  return (
    <DashboardShell title="QuantWarden Security Overview">
      <Overview />
    </DashboardShell>
  );
}
