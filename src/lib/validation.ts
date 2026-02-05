import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(3, "Subject must be at least 3 characters").max(200),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000),
});

export const guestbookSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  message: z.string().min(5, "Message must be at least 5 characters").max(500),
});

export const eventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  time: z.string().optional(),
  location: z.string().min(2, "Location must be at least 2 characters").max(200),
  description: z.string().max(2000).optional(),
  image: z.string().url().optional().or(z.literal("")),
  ticketUrl: z.string().url().optional().or(z.literal("")),
});

export const videoSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  youtubeId: z.string().min(11, "Invalid YouTube ID").max(20),
  description: z.string().max(1000).optional(),
  publicationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
});

export const publicationSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().max(1000).optional(),
  pdfUrl: z.string().url("Invalid PDF URL"),
  publicationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
});

export const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  role: z.enum(["ADMIN", "MUSICIAN"]),
});

export type ContactInput = z.infer<typeof contactSchema>;
export type GuestbookInput = z.infer<typeof guestbookSchema>;
export type EventInput = z.infer<typeof eventSchema>;
export type VideoInput = z.infer<typeof videoSchema>;
export type PublicationInput = z.infer<typeof publicationSchema>;
export type UserInput = z.infer<typeof userSchema>;

export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map((err) => {
    const path = err.path.join(".");
    return path ? `${path}: ${err.message}` : err.message;
  });

  return { success: false, errors };
}
