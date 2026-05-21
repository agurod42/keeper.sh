import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Route } from "../../../../src/routes/(dashboard)/dashboard/connect/index";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: any) => ({ options }),
  Link: ({ to, children, disabled }: any) => <a href={to} data-disabled={disabled}>{children}</a>,
  useNavigate: () => vi.fn(),
  useRouter: () => ({ history: { back: vi.fn() } }),
  useCanGoBack: () => true,
}));

vi.mock("@/hooks/use-entitlements", () => ({
  useEntitlements: vi.fn(() => ({ data: { accounts: { current: 0, limit: 5 } } })),
  canAddMore: vi.fn(() => true),
}));

describe("ConnectPage", () => {
  const Page = (Route as any).options.component;

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).__KEEPER_RUNTIME_CONFIG__ = { commercialMode: true };
  });

  it("renders correctly", () => {
    render(<Page />);
    expect(screen.getByText(/Connect Google Calendar/i)).toBeInTheDocument();
    expect(screen.getByText(/Connect CalDAV Server/i)).toBeInTheDocument();
  });

  it("shows lock hint when at limit", async () => {
    const { useEntitlements, canAddMore } = await import("@/hooks/use-entitlements");
    (useEntitlements as any).mockReturnValue({ data: { accounts: { current: 5, limit: 5 } } });
    (canAddMore as any).mockReturnValue(false);

    render(<Page />);
    expect(screen.getByText(/Account limit reached/i)).toBeInTheDocument();
  });
});
