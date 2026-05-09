import Link from "next/link";
import { Button } from "@/components/ui";

type FooterSocialButtonProps = {
  href: string;
  label: string;
};

export default function FooterSocialButton({ href, label }: FooterSocialButtonProps) {
  return (
    <Link href={href} aria-label={label}>
      <Button
        variant="outline"
        className="h-10 w-10 rounded-xl p-0 text-sm font-semibold transition hover:-translate-y-0.5"
      >
        {label}
      </Button>
    </Link>
  );
}
