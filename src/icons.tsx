// Hand drawn 18px stroke icons, one visual weight across the app.

import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }

function I({ size = 18, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const Sunrise = (p: P) => (
  <I {...p}>
    <path d="M12 3v4M5 9l1.5 1.5M19 9l-1.5 1.5M3 17h18M6.5 17a5.5 5.5 0 0 1 11 0M8 21h8" />
  </I>
)

export const InboxIcon = (p: P) => (
  <I {...p}>
    <path d="M4 5h16v14H4zM4 13h5l1.5 2.5h3L15 13h5" />
  </I>
)

export const CalendarIcon = (p: P) => (
  <I {...p}>
    <path d="M5 5.5h14a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1zM4 9.5h16M8.5 3.5v3M15.5 3.5v3" />
  </I>
)

export const BoxIcon = (p: P) => (
  <I {...p}>
    <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM4 7.5l8 4.5 8-4.5M12 12v9" />
  </I>
)

export const Spark = (p: P) => (
  <I {...p}>
    <path d="M13 2L5 13.5h6L11 22l8-11.5h-6L13 2z" />
  </I>
)

export const SendIcon = (p: P) => (
  <I {...p}>
    <path d="M21 3L10.5 13.5M21 3l-7 18-3.5-7.5L3 10l18-7z" />
  </I>
)

export const DownloadIcon = (p: P) => (
  <I {...p}>
    <path d="M12 3v12m0 0l-4.5-4.5M12 15l4.5-4.5M4 20h16" />
  </I>
)

export const AlertIcon = (p: P) => (
  <I {...p}>
    <path d="M12 3.5L22 20H2L12 3.5zM12 10v5M12 17.6v.4" />
  </I>
)

export const CheckIcon = (p: P) => (
  <I {...p}>
    <path d="M4.5 12.5l5 5L19.5 6.5" />
  </I>
)

export const ChevronRight = (p: P) => (
  <I {...p}>
    <path d="M9 5l7 7-7 7" />
  </I>
)

export const ChevronLeft = (p: P) => (
  <I {...p}>
    <path d="M15 5l-7 7 7 7" />
  </I>
)

export const ArrowUp = (p: P) => (
  <I {...p}>
    <path d="M6 14l6-6 6 6" />
  </I>
)

export const ArrowDown = (p: P) => (
  <I {...p}>
    <path d="M6 10l6 6 6-6" />
  </I>
)

export const XIcon = (p: P) => (
  <I {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </I>
)

export const ClockIcon = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </I>
)

export const GlobeIcon = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.6 2.3 3.9 5.1 3.9 8.5s-1.3 6.2-3.9 8.5c-2.6-2.3-3.9-5.1-3.9-8.5s1.3-6.2 3.9-8.5z" />
  </I>
)

export const MailIcon = (p: P) => (
  <I {...p}>
    <path d="M4 6h16v12H4zM4 7l8 6 8-6" />
  </I>
)

export const SmsIcon = (p: P) => (
  <I {...p}>
    <path d="M4 5h16v11H9l-5 4V5z" />
  </I>
)

export const CloudSun = (p: P) => (
  <I {...p}>
    <path d="M8 5.5V3.5M3.5 10H5.5M4.8 5.3l1.4 1.4M13.4 6.6A4 4 0 0 0 6.7 9.9M9 20h8.5a3.5 3.5 0 0 0 .6-6.95 5 5 0 0 0-9.8 1.15A3.4 3.4 0 0 0 9 20z" />
  </I>
)

export const PlusIcon = (p: P) => (
  <I {...p}>
    <path d="M12 5v14M5 12h14" />
  </I>
)

export const GripIcon = (p: P) => (
  <I {...p}>
    <path d="M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01" strokeWidth={2.6} />
  </I>
)
