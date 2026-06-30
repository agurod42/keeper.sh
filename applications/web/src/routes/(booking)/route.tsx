import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(booking)")({
  component: BookingLayout,
});

function BookingLayout() {
  return (
    <div className="relative flex flex-col items-center min-h-dvh px-4 py-8 sm:py-16">
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
}
