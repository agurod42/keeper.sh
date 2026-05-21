import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthForm } from "../../../src/features/auth/components/auth-form";
import { Provider } from "jotai";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
}));

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  LazyMotion: ({ children }: any) => <>{children}</>,
}));

vi.mock("motion/react-m", () => ({
  div: ({ children, style }: any) => <div style={style}>{children}</div>,
  span: ({ children }: any) => <span>{children}</span>,
  h2: ({ children }: any) => <h2>{children}</h2>,
}));

describe("AuthForm", () => {
  const mockCapabilities = {
    credentialMode: "email",
    hasPasskeys: false,
    socialProviders: { google: true, microsoft: false },
    supportsPasskeys: true,
  } as any;

  const mockCopy = {
    heading: "Heading",
    subtitle: "Subtitle",
    oauthActionLabel: "Action",
    submitLabel: "Submit",
    switchPrompt: "Prompt",
    switchCta: "CTA",
    switchTo: "/register" as const,
    action: "signIn" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly", () => {
    render(
      <Provider>
        <AuthForm capabilities={mockCapabilities} copy={mockCopy} />
      </Provider>
    );
    expect(screen.getByText(/Heading/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/johndoe\+keeper@example.com/i)).toBeInTheDocument();
  });
});
