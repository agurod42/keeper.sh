import { useState, type ReactNode, type SubmitEvent } from "react";
import ArrowLeftRight from "lucide-react/dist/esm/icons/arrow-left-right";
import Check from "lucide-react/dist/esm/icons/check";
import KeeperLogo from "@/assets/keeper.svg?react";
import { authClient } from "@/lib/auth-client";
import {
  resolvePathWithSearch,
  resolveClientPostAuthRedirect,
  type StringSearchParams,
} from "@/lib/mcp-auth-flow";
import { BackButton } from "@/components/ui/primitives/back-button";
import { Heading2 } from "@/components/ui/primitives/heading";
import { Text } from "@/components/ui/primitives/text";
import { ExternalTextLink } from "@/components/ui/primitives/text-link";
import { Divider } from "@/components/ui/primitives/divider";
import { Button, ButtonText } from "@/components/ui/primitives/button";

type Provider = "google" | "outlook" | "microsoft-365" | "zoho";

const PROVIDER_LABELS: Record<Provider, string> = {
  google: "Google",
  outlook: "Outlook",
  "microsoft-365": "Microsoft 365",
  zoho: "Zoho Calendar",
};

const PERMISSIONS = [
  "See your email address",
  "View a list of your calendars",
  "View events, summaries and details",
  "Add or remove calendar events",
];

const PROVIDER_SOCIAL_MAP: Partial<Record<Provider, string>> = {
  google: "google",
  outlook: "microsoft",
};

const PROVIDER_API_MAP: Record<Provider, string> = {
  google: "google",
  outlook: "outlook",
  "microsoft-365": "outlook",
  zoho: "zoho",
};

const ZOHO_REGIONS = [
  { id: "us", label: "US (.com)", description: "calendar.zoho.com" },
  { id: "eu", label: "EU (.eu)", description: "calendar.zoho.eu" },
  { id: "in", label: "India (.in)", description: "calendar.zoho.in" },
  { id: "au", label: "Australia (.com.au)", description: "calendar.zoho.com.au" },
] as const;

type ZohoRegionId = typeof ZOHO_REGIONS[number]["id"];

export function PermissionsList({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item} className="flex flex-row-reverse justify-between items-center gap-2">
          <Check className="shrink-0 text-foreground-muted" size={16} />
          <Text size="sm" tone="muted" align="left">{item}</Text>
        </li>
      ))}
    </ul>
  );
}

interface ZohoRegionPickerProps {
  value: ZohoRegionId;
  onChange: (value: ZohoRegionId) => void;
}

export function ZohoRegionPicker({ value, onChange }: ZohoRegionPickerProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend>
        <Text size="sm" tone="default" align="left">
          Select your Zoho region
        </Text>
      </legend>
      <div className="flex flex-col gap-1">
        {ZOHO_REGIONS.map((region) => (
          <label
            key={region.id}
            className="flex items-center gap-2 rounded-md border border-interactive-border px-3 py-2 cursor-pointer hover:bg-background-subtle"
          >
            <input
              type="radio"
              name="zoho-region"
              value={region.id}
              checked={value === region.id}
              onChange={() => onChange(region.id)}
            />
            <Text size="sm" tone="default" align="left">
              {region.label}
            </Text>
            <Text size="sm" tone="muted" align="left">
              {region.description}
            </Text>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface PreambleLayoutProps {
  provider: Provider;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  children?: ReactNode;
  extra?: ReactNode;
}

function PreambleLayout({ provider, onSubmit, children, extra }: PreambleLayoutProps) {
  return (
    <>
      <ProviderIconPair>
        <img
          src={`/integrations/icon-${provider}.svg`}
          alt={PROVIDER_LABELS[provider]}
          width={40}
          height={40}
          className="size-full rounded-lg p-3"
        />
      </ProviderIconPair>
      <Heading2 as="h1">Connect {PROVIDER_LABELS[provider]}</Heading2>
      <Text size="sm" tone="muted" align="left">
        Start importing your events and sync them across all your calendars.
      </Text>
      <PermissionsList items={PERMISSIONS} />
      {extra}
      <Divider />
      <form onSubmit={onSubmit} className="contents">
        <div className="flex items-stretch gap-2">
          <BackButton variant="border" size="standard" className="self-stretch justify-center px-3.5" />
          <Button type="submit" className="grow justify-center">
            <ButtonText>Connect</ButtonText>
          </Button>
        </div>
      </form>
      {children}
    </>
  );
}

interface AuthOAuthPreambleProps {
  provider: Provider;
  authorizationSearch?: StringSearchParams;
}

export function AuthOAuthPreamble({
  provider,
  authorizationSearch,
}: AuthOAuthPreambleProps) {
  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const socialProvider = PROVIDER_SOCIAL_MAP[provider];
    if (!socialProvider) return;

    await authClient.signIn.social({
      callbackURL: resolveClientPostAuthRedirect(authorizationSearch),
      provider: socialProvider,
    });
  };

  return (
    <PreambleLayout provider={provider} onSubmit={handleSubmit}>
      <ExternalTextLink href={resolvePathWithSearch("/login", authorizationSearch)}>
        Don&apos;t import my calendars yet, just log me in.
      </ExternalTextLink>
    </PreambleLayout>
  );
}

interface LinkOAuthPreambleProps {
  provider: Provider;
}

export function LinkOAuthPreamble({ provider }: LinkOAuthPreambleProps) {
  const [zohoRegion, setZohoRegion] = useState<ZohoRegionId>("us");

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const apiProvider = PROVIDER_API_MAP[provider];
    const params = new URLSearchParams({ provider: apiProvider });
    if (provider === "zoho") {
      params.set("region", zohoRegion);
    }
    window.location.href = `/api/sources/authorize?${params.toString()}`;
  };

  const extra = provider === "zoho"
    ? (
      <ZohoRegionPicker value={zohoRegion} onChange={setZohoRegion} />
    )
    : null;

  return (
    <PreambleLayout provider={provider} onSubmit={handleSubmit} extra={extra} />
  );
}

export function ProviderIconPair({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-4 pb-4">
      <div className="size-14 rounded-xl border border-interactive-border shadow-xs p-3 flex items-center justify-center bg-background-inverse">
        <KeeperLogo className="size-full rounded-lg text-foreground-inverse p-1" />
      </div>
      <ArrowLeftRight size={20} className="text-foreground-muted" />
      <div className="size-14 rounded-xl border border-interactive-border shadow-xs p-1 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
