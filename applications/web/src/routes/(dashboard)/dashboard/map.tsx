import { createFileRoute } from "@tanstack/react-router";
import { BackButton } from "@/components/ui/primitives/back-button";
import { DashboardHeading1, DashboardSection } from "@/components/ui/primitives/dashboard-heading";
import { SyncMap } from "@/features/dashboard/components/sync-map";

export const Route = createFileRoute("/(dashboard)/dashboard/map")({
  component: SyncMapPage,
});

function SyncMapPage() {
  return (
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
  );
}
