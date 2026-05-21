import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Route } from "../../../src/routes/(dashboard)/dashboard/report";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: any) => ({ options }),
  Link: ({ to, children }: any) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
  useRouter: () => ({ history: { back: vi.fn() } }),
  useCanGoBack: () => true,
}));

vi.mock("@/lib/fetcher", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/lib/analytics", () => ({
  track: vi.fn(),
  ANALYTICS_EVENTS: { report_submitted: "report_submitted" },
}));

describe("ReportPage", () => {
  const Page = (Route as any).options.component;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly", () => {
    render(<Page />);
    expect(screen.getByPlaceholderText(/Describe the problem/i)).toBeInTheDocument();
  });

  it("submits report successfully", async () => {
    const { apiFetch } = await import("@/lib/fetcher");
    (apiFetch as any).mockResolvedValue({});

    render(<Page />);
    
    const textarea = screen.getByPlaceholderText(/Describe the problem/i);
    fireEvent.change(textarea, { target: { value: "Broken bug!" } });
    
    const button = screen.getByRole("button", { name: /Submit Report/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Thank You/i)).toBeInTheDocument();
    });
  });
});
