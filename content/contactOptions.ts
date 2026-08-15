import type { InquiryOption } from './types'

/** Inquiry types — shared by the form <select> and the server-side Zod enum. */
export const inquiryOptions = [
  { value: 'consulting', label: 'Consulting or advisory' },
  { value: 'project', label: 'Project / build engagement' },
  { value: 'uxui', label: 'UX/UI design' },
  { value: 'ai', label: 'AI strategy & implementation' },
  { value: 'other', label: 'Something else' },
] as const satisfies readonly InquiryOption[]

export type InquiryValue = (typeof inquiryOptions)[number]['value']

export const inquiryValues = inquiryOptions.map((o) => o.value) as [
  InquiryValue,
  ...InquiryValue[],
]

/** Map a value back to its human label (for email subjects). */
export function inquiryLabel(value: string): string {
  return inquiryOptions.find((o) => o.value === value)?.label ?? 'Inquiry'
}
