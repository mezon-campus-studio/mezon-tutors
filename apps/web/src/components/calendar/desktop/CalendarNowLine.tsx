'use client';

const NOW_DOT_GRADIENT =
  'linear-gradient(110deg,#7c3aed 0%,#9333ea 50%,#d071ff 100%)';
const NOW_LINE_GRADIENT =
  'linear-gradient(90deg,#7c3aed 0%,#a855f7 42%,#d071ff 78%,#d071ff 100%)';

type CalendarNowLineProps = {
  top: number;
  timeColumnWidth: number;
  showTimeline: boolean;
};

export function CalendarNowLine({
  top,
  timeColumnWidth,
  showTimeline,
}: CalendarNowLineProps) {
  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-0 flex items-center"
      style={{ top }}
      aria-hidden
    >
      {showTimeline ? (
        <div
          className="flex shrink-0 items-center justify-end pr-1"
          style={{ width: timeColumnWidth }}
        >
          <div
            className="size-2.5 shrink-0 rounded-full shadow-md ring-2 ring-white"
            style={{ background: NOW_DOT_GRADIENT }}
          />
        </div>
      ) : null}

      <div
        className="h-[2px] min-w-0 flex-1 rounded-full shadow-sm"
        style={{ background: NOW_LINE_GRADIENT }}
      />
    </div>
  );
}
