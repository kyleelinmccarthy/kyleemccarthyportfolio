import { z } from 'zod'
import { inquiryValues } from '@/content/contactOptions'

/**
 * Contact payload schema — shared by the client form and the server route.
 * `company_url` is the honeypot: a real human leaves it empty.
 */
export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name.').max(80),
  email: z.string().trim().email('Please enter a valid email address.').max(120),
  company: z.string().trim().max(120).optional(),
  inquiryType: z.enum(inquiryValues, {
    errorMap: () => ({ message: 'Please choose a conversation type.' }),
  }),
  message: z
    .string()
    .trim()
    .min(10, 'A little more detail, please (at least 10 characters).')
    .max(4000, 'That message is a bit long — please keep it under 4000 characters.'),
  // Honeypot: must be empty. Bots fill it; humans never see it.
  company_url: z.literal('').default(''),
  turnstileToken: z.string().min(1, 'Verification is required.'),
})

export type ContactInput = z.infer<typeof contactSchema>

/** Client-side schema: identical fields minus the server-only Turnstile token. */
export const contactClientSchema = contactSchema.omit({ turnstileToken: true })
export type ContactClientInput = z.infer<typeof contactClientSchema>
