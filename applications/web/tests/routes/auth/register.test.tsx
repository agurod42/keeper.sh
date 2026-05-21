import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Route } from "@/routes/(auth)/register";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: any) => {
    const route = {
      options,
      useLoaderData: vi.fn(() => ({ credentialMode: "email", hasPasskeys: false })),
      useSearch: vi.fn(() => ({})),
    };
    return route;
  },
  Link: ({ to, children }: any) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
  useRouter: () => ({ history: { back: vi.fn() } }),
  useCanGoBack: () => true,
}));

vi.mock("@/features/auth/components/auth-form", () => ({
  AuthForm: ({ copy }: any) => <div>Auth Form: {copy.heading}</div>,
}));

describe("RegisterPage", () => {
  const Page = (Route as any).options.component;

  it("renders AuthForm with create your account heading", () => {
    render(<Page />);
    expect(screen.getByText(/Auth Form: Create your account/i)).toBeInTheDocument();
  });
});
