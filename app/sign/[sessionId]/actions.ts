"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getServiceSupabase } from "@/lib/supabase";
import { markDocumentAsSigned, signingConsentText } from "@/lib/admin-documents";

function fieldValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function resolveClientIp(headersList: Headers) {
  const forwarded = headersList.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }

  return headersList.get("x-real-ip") || headersList.get("cf-connecting-ip") || null;
}

export async function submitSigningAction(formData: FormData) {
  const sessionId = fieldValue(formData, "session_id");
  const token = fieldValue(formData, "token");
  const target = `/sign/${encodeURIComponent(sessionId)}?token=${encodeURIComponent(token)}`;

  if (!sessionId || !token) {
    redirect(`${target}&error=${encodeURIComponent("Missing signing credentials.")}`);
  }

  const signerName = fieldValue(formData, "signer_name");
  const signerEmail = fieldValue(formData, "signer_email");
  const consent = formData.get("consent") === "on";

  if (!consent) {
    redirect(`${target}&error=${encodeURIComponent("Consent is required before signing.")}`);
  }

  if (!signerName) {
    redirect(`${target}&error=${encodeURIComponent("Please provide your name to sign.")}`);
  }

  if (!signerEmail) {
    redirect(`${target}&error=${encodeURIComponent("Please provide an email address to sign.")}`);
  }

  const { client } = getServiceSupabase();
  if (!client) {
    redirect(`${target}&error=${encodeURIComponent("Signing service is currently unavailable.")}`);
  }

  const headersList = await headers();
  const clientIp = resolveClientIp(headersList);
  const userAgent = headersList.get("user-agent");

  try {
    await markDocumentAsSigned({
      client,
      sessionId,
      token,
      actorName: signerName,
      actorEmail: signerEmail,
      consentText: signingConsentText,
      ipAddress: clientIp,
      userAgent,
    });
  } catch (error) {
    redirect(`${target}&error=${encodeURIComponent(error instanceof Error ? error.message : "Signing failed.")}`);
  }

  redirect(`${target}&signed=1`);
}
