export function OnboardingBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_65%)]" />
      <div className="absolute -top-40 left-1/2 size-[44rem] -translate-x-1/2 rounded-full bg-violet-300/35 blur-[140px]" />
      <div className="absolute top-1/3 -right-24 size-[28rem] rounded-full bg-fuchsia-200/40 blur-[120px]" />
      <div className="absolute bottom-0 -left-20 size-[24rem] rounded-full bg-rose-200/30 blur-[100px]" />
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgb(108 92 231) 1px, transparent 0)",
          backgroundSize: "32px 32px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 20%, black 30%, transparent 80%)",
        }}
      />
    </div>
  );
}
