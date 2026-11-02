import { z } from "zod";
import { getTariff, statuses } from "./tariffs";
export const equipmentSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[A-Za-zА-Яа-яЁё0-9_-]+$/)
    .transform((v) => v.toUpperCase()),
  name: z.string().trim().min(1).max(120),
  tariff: z.string().refine((v) => !!getTariff(v)),
  size: z.string().trim().min(1).max(40),
  dailyRate: z.number().int().min(0).max(1000000),
  status: z.enum(statuses),
  notes: z.string().trim().max(2000),
});
export const saveEquipmentSchema = z
  .object({
    id: z.uuid().optional(),
    version: z.number().int().positive().optional(),
    values: equipmentSchema,
  })
  .refine((v) => !v.id || v.version !== undefined);
export type EquipmentInput = z.input<typeof equipmentSchema>;
