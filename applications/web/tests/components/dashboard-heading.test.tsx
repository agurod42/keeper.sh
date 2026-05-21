import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DashboardSection, DashboardHeading1 } from "../../src/components/ui/primitives/dashboard-heading";
import { Checkbox } from "../../src/components/ui/primitives/checkbox";
import { Modal, ModalContent, ModalTitle } from "../../src/components/ui/primitives/modal";
import { Input } from "../../src/components/ui/primitives/input";
import { Divider } from "../../src/components/ui/primitives/divider";
import { BackButton } from "../../src/components/ui/primitives/back-button";
import { Heading1, Heading2 } from "../../src/components/ui/primitives/heading";
import { Pagination, PaginationPrevious } from "../../src/components/ui/primitives/pagination";
import { Tooltip } from "../../src/components/ui/primitives/tooltip";
import { Collapsible } from "../../src/components/ui/primitives/collapsible";
import { ShimmerText } from "../../src/components/ui/primitives/shimmer-text";
import { FadeIn } from "../../src/components/ui/primitives/fade-in";
import { TextLink } from "../../src/components/ui/primitives/text-link";
import { ProviderIcon } from "../../src/components/ui/primitives/provider-icon";
import { UnorderedList, ListItem } from "../../src/components/ui/primitives/list";

vi.mock("jotai", () => ({
  useSetAtom: () => vi.fn(),
  atom: (v: any) => v,
}));

const mockNavigate = vi.fn();
const mockBack = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ history: { back: mockBack } }),
  useCanGoBack: () => true,
  useNavigate: () => mockNavigate,
  Link: ({ children, to, disabled }: any) => <a href={to} data-disabled={disabled}>{children}</a>,
}));

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  LazyMotion: ({ children }: any) => <>{children}</>,
}));

vi.mock("motion/react-m", () => ({
  div: ({ children, style }: any) => <div style={style}>{children}</div>,
}));

describe("DashboardHeading components", () => {
  it("renders DashboardHeading1 correctly", () => {
    render(<DashboardHeading1>Title</DashboardHeading1>);
    expect(screen.getByText(/Title/i)).toBeInTheDocument();
  });
});

describe("Checkbox component", () => {
  it("calls onCheckedChange when clicked", () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox checked={false} onCheckedChange={onCheckedChange}>Label</Checkbox>);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});

describe("Modal component", () => {
  it("renders content when open", () => {
    render(<Modal open={true}><ModalContent><ModalTitle>My Modal</ModalTitle></ModalContent></Modal>);
    expect(screen.getByText(/My Modal/i)).toBeInTheDocument();
  });
});

describe("Input component", () => {
  it("renders correctly", () => {
    render(<Input placeholder="Type here" />);
    expect(screen.getByPlaceholderText(/Type here/i)).toBeInTheDocument();
  });
});

describe("Divider component", () => {
  it("renders correctly", () => {
    render(<Divider>OR</Divider>);
    expect(screen.getByText(/OR/i)).toBeInTheDocument();
  });
});

describe("BackButton component", () => {
  it("calls history.back", () => {
    render(<BackButton />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockBack).toHaveBeenCalled();
  });
});

describe("Heading components", () => {
  it("renders Heading1", () => {
    render(<Heading1>Title 1</Heading1>);
    expect(screen.getByText(/Title 1/i)).toBeInTheDocument();
  });
});

describe("Pagination component", () => {
  it("renders previous button disabled when no 'to'", () => {
    render(<Pagination><PaginationPrevious /></Pagination>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});

describe("Tooltip component", () => {
  it("renders content on hover", () => {
    render(
      <Tooltip content="Tooltip Hint">
        <button>Hover me</button>
      </Tooltip>
    );
    const trigger = screen.getByText(/Hover me/i).parentElement!;
    fireEvent.pointerEnter(trigger);
    expect(screen.getByText(/Tooltip Hint/i)).toBeInTheDocument();
  });
});

describe("Collapsible component", () => {
  it("renders trigger and content", () => {
    render(<Collapsible trigger="Show more">Hidden content</Collapsible>);
    expect(screen.getByText(/Show more/i)).toBeInTheDocument();
  });
});

describe("ShimmerText component", () => {
  it("renders correctly", () => {
    render(<ShimmerText>Shimmering</ShimmerText>);
    expect(screen.getByText(/Shimmering/i)).toBeInTheDocument();
  });
});

describe("FadeIn component", () => {
  it("renders children", () => {
    render(<FadeIn direction="from-right">Fading in</FadeIn>);
    expect(screen.getByText(/Fading in/i)).toBeInTheDocument();
  });
});

describe("TextLink component", () => {
  it("renders link correctly", () => {
    render(<TextLink to="/home">Link</TextLink>);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/home");
  });
});

describe("ProviderIcon component", () => {
  it("renders img for known provider", () => {
    const { container } = render(<ProviderIcon provider="google" />);
    expect(container.querySelector("img")).toBeInTheDocument();
  });
});

describe("List components", () => {
  it("renders UnorderedList and ListItem", () => {
    render(
      <UnorderedList>
        <ListItem>Item 1</ListItem>
      </UnorderedList>
    );
    expect(screen.getByText(/Item 1/i)).toBeInTheDocument();
    expect(screen.getByRole("list")).toBeInTheDocument();
  });
});
