import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().trim().min(1).max(120),

  phone: z
    .string()
    .trim()
    .max(40)
    .regex(/^\+[1-9][0-9 ()-]*$/)
    .transform((value) => value.replace(/[ ()-]/g, ""))
    .pipe(z.string().regex(/^\+[1-9]\d{7,14}$/)),

  email: z
    .string()
    .trim()
    .max(254)
    .refine((value) => value === "" || z.email().safeParse(value).success)
    .transform((value) => value.toLowerCase()),

  notes: z.string().trim().max(2000),
});

export const saveCustomerSchema = z
  .object({
    id: z.uuid().optional(),
    version: z.number().int().positive().optional(),
    values: customerSchema,
  })
  .refine((value) => !value.id || value.version !== undefined);

export type CustomerInput = z.input<typeof customerSchema>;

export interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  version: number;
}

export type CustomerSaveResult =
  | { ok: true }
  | {
      ok: false;
      error: "invalid" | "conflict" | "database" | "authRequired";
    };