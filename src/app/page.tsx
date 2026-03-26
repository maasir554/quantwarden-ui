import DashboardShell from "./components/DashboardShell";
import Overview from "./components/Overview";


import {redirect} from "next/navigation";
export default function HomePage() {
  return (
    // <DashboardShell title="QuantWarden Security Overview">
    //   <Overview />
    // </DashboardShell>
    redirect("/login")
  );
}
