import { z } from "zod";
import type { FreeEventConfig } from "./rencontre-harmonies-2026";

function emailSchema() {
  return z
    .string({ message: "Adresse e-mail invalide." })
    .trim()
    .min(1, "Indiquez une adresse e-mail.")
    .max(254, "Adresse e-mail invalide.")
    .email("Adresse e-mail invalide.");
}

function optionalEmailSchema() {
  return z
    .union([emailSchema(), z.null()])
    .optional()
    .transform((email) => (email === "" ? null : email));
}

function interestsSchema(event: FreeEventConfig) {
  const codes = new Set(event.form.interests.map(({ code }) => code));
  return z
    .array(z.string({ message: "Choisissez une option proposée." }), {
      message: "Choisissez au moins une option proposée.",
    })
    .superRefine((values, context) => {
      values.forEach((value, index) => {
        if (!codes.has(value)) {
          context.addIssue({
            code: "custom",
            message: "Choisissez une option proposée.",
            path: [index],
          });
        }
      });
    })
    .transform((values) => [...new Set(values)]);
}

function sourceSchema(event: FreeEventConfig) {
  const codes = new Set(event.form.sources.map(({ code }) => code));
  return z
    .union([z.string({ message: "Choisissez une option proposée." }), z.null()], {
      message: "Choisissez une option proposée.",
    })
    .optional()
    .transform((value) => (value === undefined || value === "" ? null : value))
    .superRefine((value, context) => {
      if (value !== null && !codes.has(value)) {
        context.addIssue({ code: "custom", message: "Choisissez une option proposée." });
      }
    });
}

export function createPublicReservationSchema(event: FreeEventConfig) {
  return z.object({
    lastName: z
      .string({ message: "Indiquez votre nom." })
      .trim()
      .min(1, "Indiquez votre nom.")
      .max(100, "Le nom ne peut pas dépasser 100 caractères."),
    firstName: z
      .string({ message: "Indiquez votre prénom." })
      .trim()
      .min(1, "Indiquez votre prénom.")
      .max(100, "Le prénom ne peut pas dépasser 100 caractères."),
    email: emailSchema(),
    partySize: z
      .number({ message: `Entre 1 et ${event.form.maxPartySize} personnes.` })
      .int(`Entre 1 et ${event.form.maxPartySize} personnes.`)
      .min(1, `Entre 1 et ${event.form.maxPartySize} personnes.`)
      .max(event.form.maxPartySize, `Entre 1 et ${event.form.maxPartySize} personnes.`),
    interests: interestsSchema(event).default([]),
    source: sourceSchema(event),
    newsletterOptIn: z
      .boolean({ message: "Choisissez oui ou non pour la newsletter." })
      .default(false),
    website: z.string({ message: "Valeur invalide." }).optional(),
  });
}

export function createAdminReservationSchema(event: FreeEventConfig) {
  return z.object({
    eventSlug: z.string({ message: "Indiquez un événement." }).min(1, "Indiquez un événement."),
    lastName: z
      .string({ message: "Indiquez le nom." })
      .trim()
      .min(1, "Indiquez le nom.")
      .max(100, "Le nom ne peut pas dépasser 100 caractères."),
    firstName: z
      .string({ message: "Indiquez le prénom." })
      .trim()
      .min(1, "Indiquez le prénom.")
      .max(100, "Le prénom ne peut pas dépasser 100 caractères."),
    email: optionalEmailSchema(),
    partySize: z
      .number({ message: "Indiquez un nombre de personnes entre 1 et 50." })
      .int("Indiquez un nombre entier de personnes entre 1 et 50.")
      .min(1, "Indiquez un nombre de personnes entre 1 et 50.")
      .max(50, "Indiquez un nombre de personnes entre 1 et 50."),
    interests: interestsSchema(event).optional().default([]),
    source: sourceSchema(event),
    newsletterOptIn: z
      .boolean({ message: "Choisissez oui ou non pour la newsletter." })
      .optional()
      .default(false),
    sendConfirmation: z.boolean({ message: "Valeur invalide." }).optional().default(false),
  });
}

export const adminReservationPatchSchema = z.object({
  lastName: z
    .string({ message: "Indiquez le nom." })
    .trim()
    .min(1, "Indiquez le nom.")
    .max(100, "Le nom ne peut pas dépasser 100 caractères.")
    .optional(),
  firstName: z
    .string({ message: "Indiquez le prénom." })
    .trim()
    .min(1, "Indiquez le prénom.")
    .max(100, "Le prénom ne peut pas dépasser 100 caractères.")
    .optional(),
  email: z.union([emailSchema(), z.null()], { message: "Adresse e-mail invalide." }).optional(),
  partySize: z
    .number({ message: "Indiquez un nombre de personnes entre 1 et 50." })
    .int("Indiquez un nombre entier de personnes entre 1 et 50.")
    .min(1, "Indiquez un nombre de personnes entre 1 et 50.")
    .max(50, "Indiquez un nombre de personnes entre 1 et 50.")
    .optional(),
  status: z.enum(["active", "cancelled"], { message: "Statut invalide." }).optional(),
  newsletterOptIn: z.boolean({ message: "Choisissez oui ou non pour la newsletter." }).optional(),
});

export function validationFields(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path[0];
    if (typeof path === "string" && fields[path] === undefined) fields[path] = issue.message;
  }
  return fields;
}
