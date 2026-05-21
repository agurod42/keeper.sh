import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Route } from "@/routes/(marketing)/index";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: any) => ({ options }),
  Link: ({ to, children }: any) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
  useRouter: () => ({ history: { back: vi.fn() } }),
  useCanGoBack: () => true,
}));

vi.mock("jotai", () => ({
  useSetAtom: () => vi.fn(),
  useAtomValue: (atom: any) => atom,
  atom: (val: any) => val,
}));

vi.mock("motion", () => ({
  motion: {
    div: ({ children }: any) => <div>{children}</div>,
    h1: ({ children }: any) => <h1>{children}</h1>,
    section: ({ children }: any) => <section>{children}</section>,
    p: ({ children }: any) => <p>{children}</p>,
    span: ({ children }: any) => <span>{children}</span>,
    a: ({ children }: any) => <a href="#">{children}</a>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("LandingPage", () => {
  const Page = (Route as any).options.component;

  it("renders correctly", () => {
    render(<Page />);
    expect(screen.getByText(/Privacy-First & Open Source/i)).toBeInTheDocument();
    expect(screen.getByText(/Universal Calendar Sync/i)).toBeInTheDocument();
  });
});
