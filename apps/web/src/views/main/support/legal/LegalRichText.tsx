import Link from "next/link";
import { ROUTES } from "@mezon-tutors/shared";

const POLICY_LINKS = {
  termsOfService: ROUTES.SUPPORT.TERMS_OF_SERVICE,
  privacyPolicy: ROUTES.SUPPORT.PRIVACY_POLICY,
  refundPolicy: ROUTES.SUPPORT.REFUND_POLICY,
  tutorPolicy: ROUTES.SUPPORT.TUTOR_POLICY,
} as const;

type PolicyLinkKey = keyof typeof POLICY_LINKS;

const POLICY_REF_PATTERN = /\[\[(termsOfService|privacyPolicy|refundPolicy|tutorPolicy)\|([^\]]+)\]\]/g;

function parseLegalText(text: string) {
  const parts: Array<{ type: "text"; value: string } | { type: "link"; key: PolicyLinkKey; label: string }> =
    [];
  let lastIndex = 0;

  for (const match of text.matchAll(POLICY_REF_PATTERN)) {
    const [fullMatch, key, label] = match;
    const index = match.index ?? 0;

    if (index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, index) });
    }

    parts.push({
      type: "link",
      key: key as PolicyLinkKey,
      label,
    });

    lastIndex = index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: "text" as const, value: text }];
}

type LegalRichTextProps = {
  text: string;
  className?: string;
};

export function LegalRichText({ text, className }: LegalRichTextProps) {
  const parts = parseLegalText(text);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === "text") {
          return <span key={`text-${index}`}>{part.value}</span>;
        }

        return (
          <Link
            key={`link-${part.key}-${index}`}
            href={POLICY_LINKS[part.key]}
            className="font-semibold text-violet-700 underline decoration-violet-300/80 underline-offset-[3px] transition-colors hover:text-violet-900 hover:decoration-violet-500"
          >
            {part.label}
          </Link>
        );
      })}
    </span>
  );
}
