"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { setComplianceConfig } from "@/lib/queries/config";

const schema = z.object({
  targetTop2BoxPct: z.coerce.number().min(0).max(100),
  amberBandPts: z.coerce.number().min(0).max(50),
  minResponsesForGrading: z.coerce.number().int().min(0).max(1000),
});

export interface UpdateConfigResult {
  ok: boolean;
  message: string;
}

export async function updateComplianceConfigAction(
  _prev: UpdateConfigResult | null,
  formData: FormData,
): Promise<UpdateConfigResult> {
  const parsed = schema.safeParse({
    targetTop2BoxPct: formData.get("targetTop2BoxPct"),
    amberBandPts: formData.get("amberBandPts"),
    minResponsesForGrading: formData.get("minResponsesForGrading"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ") ||
        "Invalid input",
    };
  }

  await setComplianceConfig(parsed.data);
  revalidatePath("/", "layout");
  return { ok: true, message: "Compliance targets updated." };
}
