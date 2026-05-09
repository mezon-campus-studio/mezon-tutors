import Link from "next/link";

type FooterLinkItem = {
  label: string;
  href: string;
};

type FooterLinkColumnProps = {
  title: string;
  links: FooterLinkItem[];
};

export default function FooterLinkColumn({ title, links }: FooterLinkColumnProps) {
  return (
    <div className="min-w-40 space-y-3">
      <h4 className="text-sm font-bold uppercase tracking-wide text-slate-900">{title}</h4>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <Link href={link.href} className="text-sm text-slate-600 transition hover:translate-x-0.5 hover:text-violet-700">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
