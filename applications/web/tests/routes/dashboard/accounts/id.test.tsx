import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Route } from "@/routes/(dashboard)/dashboard/accounts/$accountId.index";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: any) => {
    const route = {
      options,
      useParams: vi.fn(() => ({ accountId: "a1" })),
    };
    return route;
  },
  Link: ({ to, children }: any) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
  useRouter: () => ({ history: { back: vi.fn() } }),
  useCanGoBack: () => true,
}));

vi.mock("swr", () => ({
  default: vi.fn((url) => {
    if (url === "/api/accounts/a1") return { data: { id: "a1", provider: "google", accountLabel: "test@gmail.com", createdAt: "2026-01-01" }, isLoading: false };
    if (url === "/api/sources") return { data: [{ id: "s1", accountId: "a1", name: "Cal 1" }], isLoading: false };
    return { data: undefined, isLoading: false };
  }),
  preload: vi.fn(),
  useSWRConfig: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/lib/fetcher", () => ({
  fetcher: vi.fn(),
  apiFetch: vi.fn(),
}));

vi.mock("@/components/ui/shells/route-shell", () => ({
  RouteShell: ({ children, status }: any) => <div data-testid="route-shell" data-status={status}>{children}</div>,
}));

describe("AccountDetailPage", () => {
  const Page = (Route as any).options.component;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly with account and calendars", () => {
    render(<Page />);
    expect(screen.getByText(/Account Information/i)).toBeInTheDocument();
    expect(screen.getByText(/Cal 1/i)).toBeInTheDocument();
  });
});
