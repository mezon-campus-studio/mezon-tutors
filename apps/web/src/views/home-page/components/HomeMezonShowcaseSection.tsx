"use client";

import {
  CheckCheck,
  FileText,
  MessageCircle,
  Paperclip,
  Phone,
  Send,
  Smile,
  Video,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui";

const FEATURES = [
  { key: "chat", icon: MessageCircle },
  { key: "rooms", icon: Video },
  { key: "files", icon: FileText },
] as const;

export default function HomeMezonShowcaseSection() {
  const t = useTranslations("Home.MezonShowcase");

  return (
    <section className="relative overflow-hidden bg-slate-950 py-12 text-white sm:py-16">
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -top-32 -left-24 size-[28rem] rounded-full bg-violet-600/30 blur-3xl" />
        <div className="absolute top-1/2 right-0 size-[32rem] -translate-y-1/2 rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-6 lg:grid-cols-[1fr_1.05fr] lg:px-10">
        <div className="space-y-7">
          <Badge className="h-auto rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-200 backdrop-blur">
            {t("badge")}
          </Badge>
          <h2 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
            {t("title")}
          </h2>
          <p className="max-w-xl text-base leading-7 text-white/70">
            {t("description")}
          </p>

          <ul className="space-y-4">
            {FEATURES.map(({ key, icon: Icon }) => (
              <li key={key} className="flex gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/30">
                  <Icon className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">
                    {t(`features.${key}.title`)}
                  </h3>
                  <p className="text-sm leading-6 text-white/65">
                    {t(`features.${key}.description`)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-violet-500/30 via-purple-500/20 to-fuchsia-500/30 blur-2xl" />

          <div className="relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-slate-900/80 shadow-2xl shadow-violet-500/20 backdrop-blur">
            <div className="flex items-center justify-between border-b border-white/5 bg-slate-900/60 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex size-10 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold">
                    MA
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-slate-900 bg-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {t("preview.messageTitle")}
                  </p>
                  <p className="text-[11px] text-emerald-400">
                    {t("preview.online")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex size-8 items-center justify-center rounded-full bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  <Phone className="size-4" />
                </button>
                <button
                  type="button"
                  className="flex size-8 items-center justify-center rounded-full bg-brand-gradient text-white shadow-lg shadow-violet-500/40 transition hover:bg-violet-400"
                >
                  <Video className="size-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4 p-5 pb-2">
              <p className="text-center text-[10px] font-medium uppercase tracking-wider text-white/40">
                Today · 19:42
              </p>

              <div className="flex items-end gap-2">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-[10px] font-bold">
                  MA
                </div>
                <div className="max-w-[78%] rounded-2xl rounded-bl-md bg-white/8 px-4 py-2.5 text-sm text-white/90">
                  {t("preview.incoming")}
                </div>
              </div>

              <div className="flex justify-end">
                <div className="max-w-[78%] rounded-2xl rounded-br-md bg-brand-gradient px-4 py-2.5 text-sm font-medium shadow-lg shadow-violet-500/30">
                  {t("preview.yourMessage")}
                  <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-white/80">
                    19:43
                    <CheckCheck className="size-3" />
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/20"
                >
                  <span className="flex size-5 items-center justify-center rounded-full bg-brand-gradient">
                    <Video className="size-3" />
                  </span>
                  {t("preview.joinRoom")}
                  <span className="ml-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    LIVE
                  </span>
                </button>
              </div>
            </div>

            <div className="m-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5">
              <Smile className="size-4 text-white/50" />
              <Paperclip className="size-4 text-white/50" />
              <span className="flex-1 text-sm text-white/40">Aa</span>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-full bg-brand-gradient shadow-lg shadow-violet-500/40"
              >
                <Send className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
