import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Route } from "../../../../src/routes/(dashboard)/dashboard/integrations/index";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: any) => {
    const route = { options, useSearch: vi.fn(() => ({ error: "Auth Error" })) };
    return route;
  },
  Link: ({ to, children }: any) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
  useRouter: () => ({ history: { back: vi.fn() } }),
  useCanGoBack: () => true,
}));

describe("OAuthCallbackErrorPage", () => {
  const Page = (Route as any).options.component;

  it("renders correctly with error message", () => {
    render(<Page />);
    expect(screen.getByText(/Connection failed/i)).toBeInTheDocument();
    expect(screen.getByText(/Auth Error/i)).toBeInTheDocument();
  });
});
