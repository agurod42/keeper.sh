import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button, ButtonText } from "../../src/components/ui/primitives/button";
import { Text } from "../../src/components/ui/primitives/text";

describe("Button component", () => {
  it("renders children correctly", () => {
    render(<Button><ButtonText>Click me</ButtonText></Button>);
    expect(screen.getByText(/Click me/i)).toBeInTheDocument();
  });

  it("applies variant classes", () => {
    render(<Button variant="destructive"><ButtonText>Delete</ButtonText></Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("text-destructive");
  });
});

describe("Text component", () => {
  it("renders children correctly", () => {
    render(<Text>Hello world</Text>);
    expect(screen.getByText(/Hello world/i)).toBeInTheDocument();
  });

  it("applies tone classes", () => {
    render(<Text tone="danger">Danger</Text>);
    expect(screen.getByText(/Danger/i)).toHaveClass("text-red-500");
  });
});
