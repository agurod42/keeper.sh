import { createFileRoute, redirect } from "@tanstack/react-router";
import { BackButton } from "@/components/ui/primitives/back-button";
import { Heading2 } from "@/components/ui/primitives/heading";
import { Text } from "@/components/ui/primitives/text";

interface SearchParams {
  error?: string;
  debugLabel?: string;
  debugMessage?: string;
}

function parseSearchString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  return undefined;
}

export const Route = createFileRoute("/(dashboard)/dashboard/integrations/")({
  component: OAuthCallbackErrorPage,
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    debugLabel: parseSearchString(search.debugLabel),
    debugMessage: parseSearchString(search.debugMessage),
    error: parseSearchString(search.error),
  }),
  beforeLoad: ({ search }) => {
    if (!search.error) {
      throw redirect({ to: "/dashboard" });
    }
  },
});

function OAuthCallbackErrorPage() {
  const { error, debugLabel, debugMessage } = Route.useSearch();

  return (
    <div className="flex flex-col gap-3">
      <BackButton />
      <div className="flex flex-col gap-1 py-2">
        <Heading2 as="span" className="text-center">Connection failed</Heading2>
        <Text size="sm" tone="muted" align="center">{error}</Text>
        {(debugLabel || debugMessage) && (
          <pre className="mt-4 max-w-full overflow-auto whitespace-pre-wrap rounded-md border border-interactive-border bg-background-subtle p-3 text-xs">
            {debugLabel ? `[${debugLabel}]\n` : ""}{debugMessage ?? ""}
          </pre>
        )}
      </div>
    </div>
  );
}
