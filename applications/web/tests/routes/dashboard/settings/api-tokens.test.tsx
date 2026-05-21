import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Route } from "../../../../src/routes/(dashboard)/dashboard/settings/api-tokens";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: any) => ({ options }),
  Link: ({ to, children }: any) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
  useRouter: () => ({ history: { back: vi.fn() } }),
  useCanGoBack: () => true,
}));

vi.mock("@/hooks/use-api-tokens", () => ({
  useApiTokens: vi.fn(() => ({ data: [], isLoading: false })),
  createApiToken: vi.fn(),
  deleteApiToken: vi.fn(),
}));

vi.mock("@/hooks/use-entitlements", () => ({
  useEntitlements: vi.fn(() => ({ data: { plan: "free" } })),
}));

vi.mock("@/components/ui/primitives/modal", () => ({
  Modal: ({ children }: any) => <div data-testid="modal">{children}</div>,
  ModalContent: ({ children }: any) => <div>{children}</div>,
  ModalTitle: ({ children }: any) => <h2>{children}</h2>,
  ModalDescription: ({ children }: any) => <p>{children}</p>,
  ModalFooter: ({ children }: any) => <div>{children}</div>,
}));

describe("ApiTokensPage", () => {
  const Page = (Route as any).options.component;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly", () => {
    render(<Page />);
    expect(screen.getByText(/Daily Limit/i)).toBeInTheDocument();
    expect(screen.getByText(/Create Token/i)).toBeInTheDocument();
  });
});
