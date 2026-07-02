import { createFileRoute } from "@tanstack/react-router";
import { BackButton } from "@/components/ui/primitives/back-button";
import { DashboardHeading1, DashboardSection } from "@/components/ui/primitives/dashboard-heading";
import { SyncMap } from "@/features/dashboard/components/sync-map";

export const Route = createFileRoute("/(dashboard)/dashboard/map")({
  component: SyncMapPage,
});

function SyncMapPage() {
  return (
    // Break out of the dashboard's narrow max-w-sm column so the bipartite map
    // has room to render both provider columns without clipping.
    <div className="relative left-1/2 w-screen max-w-3xl -translate-x-1/2 px-4">
      <div className="flex flex-col gap-1.5">
        <BackButton fallback="/dashboard" />
        <div className="px-0.5 pt-4">
          <DashboardHeading1>Sync Map</DashboardHeading1>
        </div>
        <DashboardSection
          title="Flow topology"
          description="How events flow between your calendars. Hover a calendar to highlight its connections, or select one for details."
        />
        <SyncMap />
      </div>
    </div>
  );
}
