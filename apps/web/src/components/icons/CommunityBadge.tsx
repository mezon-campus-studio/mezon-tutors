import type { SVGProps } from "react";

export function CommunityBadge(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M7 22.2296V16H16.2964V22.2296C16.2964 22.4603 16.1696 22.6727 15.9659 22.7816C15.7632 22.8901 15.5157 22.8788 15.3234 22.7503L11.6482 20.3002L7.97304 22.7503C7.7811 22.8784 7.53408 22.8905 7.33046 22.7816C7.12726 22.6723 7 22.4603 7 22.2296Z"
        fill="#7C3AED"
      />
      <circle
        cx="12"
        cy="10"
        r="8"
        fill="#7C3AED"
        stroke="#EDE9FE"
        strokeWidth="1.78028"
      />
      <path
        d="M10.2 7C8.98497 7 8 8.00431 8 9.24318C8 11.4864 10.6 13.5256 12 14C13.4 13.5256 16 11.4864 16 9.24318C16 8.00431 15.015 7 13.8 7C13.0559 7 12.3981 7.37663 12 7.95311C11.6019 7.37663 10.9441 7 10.2 7Z"
        fill="#EDE9FE"
      />
    </svg>
  );
}