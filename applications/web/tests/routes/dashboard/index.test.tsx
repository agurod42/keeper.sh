import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Route } from "../../../src/routes/(dashboard)/dashboard/index";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: any) => ({ options }),
  Link: ({ to, children }: any) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
  useRouter: () => ({ history: { back: vi.fn() } }),
  useCanGoBack: () => true,
}));

vi.mock("swr", () => ({
  default: vi.fn(() => ({ data: undefined })),
  preload: vi.fn(),
  useSWRConfig: () => ({ mutate: vi.fn() }),
}));

vi.mock("motion", () => ({
  motion: {
    div: ({ children }: any) => <div>{children}</div>,
    h1: ({ children }: any) => <h1>{children}</h1>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/hooks/use-animated-swr", () => ({
  useAnimatedSWR: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock("@/features/dashboard/components/sync-status", () => ({
  SyncStatus: () => <div>Sync Status</div>,
}));

vi.mock("@/features/dashboard/components/event-graph", () => ({
  EventGraph: () => <div>Event Graph</div>,
}));

vi.mock("@/lib/auth", () => ({
  signOut: vi.fn(),
}));

vi.mock("@/assets/keeper.svg?react", () => ({
  default: () => <svg data-testid="keeper-logo" />,
}));

describe("DashboardPage", () => {
  const Page = (Route as any).options.component;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly", () => {
    render(<Page />);
    expect(screen.getByText(/Import Calendars/i)).toBeInTheDocument();
    expect(screen.getByText(/Sync Status/i)).toBeInTheDocument();
  });
});
