import { Topbar } from "@/components/layout/topbar";
import { getComplianceConfig } from "@/lib/queries/config";

import { ComplianceForm } from "./compliance-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SettingsPage() {
  const config = await getComplianceConfig();
  return (
    <>
      <Topbar
        title="Settings"
        subtitle="Tune compliance thresholds — changes apply everywhere immediately."
      />
      <div className="max-w-2xl space-y-6 p-6">
        <ComplianceForm initial={config} />
      </div>
    </>
  );
}
