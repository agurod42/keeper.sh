import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnimatedReveal } from "../../src/components/ui/primitives/animated-reveal";

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  LazyMotion: ({ children }: any) => <>{children}</>,
}));

vi.mock("motion/react-m", () => ({
  div: ({ children }: any) => <div>{children}</div>,
}));

describe("AnimatedReveal", () => {
  it("renders children when show is true", () => {
    render(<AnimatedReveal show={true}>Content</AnimatedReveal>);
    expect(screen.getByText(/Content/i)).toBeInTheDocument();
  });

  it("renders nothing when show is false", () => {
    render(<AnimatedReveal show={false}>Content</AnimatedReveal>);
    expect(screen.queryByText(/Content/i)).not.toBeInTheDocument();
  });
});
