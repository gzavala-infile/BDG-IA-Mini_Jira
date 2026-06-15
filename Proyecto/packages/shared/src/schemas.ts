import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export const TicketCreateSchema = z.object({
  titulo: z
    .string()
    .min(1, 'El título es requerido')
    .max(120, 'Máximo 120 caracteres'),
  descripcion: z.string().optional().nullable(),
  prioridad: z.enum(['alta', 'media', 'baja']).default('media'),
  asignado_a_id: z.string().uuid().optional().nullable(),
  etiquetas: z
    .array(z.string().min(1).max(50))
    .max(5, 'Máximo 5 etiquetas')
    .default([]),
});

export const TicketUpdateSchema = z.object({
  titulo: z.string().min(1).max(120).optional(),
  descripcion: z.string().optional().nullable(),
  prioridad: z.enum(['alta', 'media', 'baja']).optional(),
  estado: z.enum(['por_hacer', 'en_progreso', 'bloqueado', 'listo']).optional(),
  asignado_a_id: z.string().uuid().optional().nullable(),
  etiquetas: z.array(z.string().min(1).max(50)).max(5).optional(),
  version: z.number().int().positive(),
});

export const CommentCreateSchema = z.object({
  texto: z.string().min(1, 'El comentario no puede estar vacío').max(5000),
});

export const UserCreateSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  rol: z.enum(['admin', 'usuario']).default('usuario'),
});

export const UserUpdateSchema = z.object({
  nombre: z.string().min(2).max(100).optional(),
  rol: z.enum(['admin', 'usuario']).optional(),
  activo: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type TicketCreateInput = z.infer<typeof TicketCreateSchema>;
export type TicketUpdateInput = z.infer<typeof TicketUpdateSchema>;
export type CommentCreateInput = z.infer<typeof CommentCreateSchema>;
export type UserCreateInput = z.infer<typeof UserCreateSchema>;
export type UserUpdateInput = z.infer<typeof UserUpdateSchema>;
