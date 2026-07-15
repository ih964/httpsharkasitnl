import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const errors = [];
const expectedMigrations = [
  "20260714213000_assessment_lead_engine.sql",
  "20260714224500_assessment_lead_activity.sql",
  "20260714231500_convert_assessment_lead_to_customer.sql",
  "20260715001000_assessment_proposal_drafts.sql",
  "20260715003000_assessment_proposal_status.sql",
  "20260715005000_assessment_proposal_lifecycle.sql",
  "20260715010000_release1_security_hardening.sql",
];

const migrationDir = join(root, "supabase", "migrations");
for (const file of expectedMigrations) {
  if (!existsSync(join(migrationDir, file))) errors.push(`Ontbrekende migratie: ${file}`);
}

const read = (path) => readFileSync(join(root, path), "utf8");
const requireText = (path, tokens) => {
  const content = read(path);
  for (const token of tokens) {
    if (!content.includes(token)) errors.push(`${path} mist vereiste marker: ${token}`);
  }
};

requireText("supabase/migrations/20260715010000_release1_security_hardening.sql", [
  "create or replace function public.is_harkas_admin()",
  "create policy \"admin read assessment leads\"",
  "create policy \"admin read assessment runs\"",
  "create policy \"admin read assessment audit\"",
  "create policy \"admin read assessment proposal drafts\"",
  "create table if not exists public.assessment_submission_rate_limits",
  "p_submission_key uuid",
  "p_honeypot text",
  "p_privacy_notice_version text",
  "grant execute on function public.submit_it_quick_scan",
]);

const internalMigrations = [
  "supabase/migrations/20260714224500_assessment_lead_activity.sql",
  "supabase/migrations/20260714231500_convert_assessment_lead_to_customer.sql",
  "supabase/migrations/20260715001000_assessment_proposal_drafts.sql",
  "supabase/migrations/20260715003000_assessment_proposal_status.sql",
  "supabase/migrations/20260715005000_assessment_proposal_lifecycle.sql",
];
for (const path of internalMigrations) {
  if (!read(path).includes("public.has_role(auth.uid(), 'admin'::public.app_role)")) {
    errors.push(`${path} mist een directe server-side admincheck.`);
  }
}

const collect = (directory) => readdirSync(directory).flatMap((name) => {
  const full = join(directory, name);
  return statSync(full).isDirectory() ? collect(full) : [full];
});

const releaseSourceRoots = [
  "src/contexts/AuthContext.tsx",
  "src/integrations/supabase/assessmentClient.ts",
  "src/lib",
  "src/pages/ITQuickScan.tsx",
  "src/pages/PrivacyPolicy.tsx",
  "src/pages/admin",
  "src/components/admin",
];
const releaseFiles = releaseSourceRoots.flatMap((entry) => {
  const full = join(root, entry);
  if (!existsSync(full)) return [];
  return statSync(full).isDirectory() ? collect(full) : [full];
}).filter((file) => {
  const path = relative(root, file).replaceAll("\\", "/");
  return /assessment|AdminScan|AdminProposal|ITQuickScan|PrivacyPolicy|AuthContext/i.test(path)
    && /\.(ts|tsx)$/.test(path);
});

for (const file of releaseFiles) {
  const path = relative(root, file).replaceAll("\\", "/");
  const content = readFileSync(file, "utf8");
  if (/\bas any\b/.test(content)) errors.push(`${path} bevat verboden 'as any'.`);
  if (path !== "src/integrations/supabase/assessmentClient.ts"
      && path !== "src/contexts/AuthContext.tsx"
      && content.includes("@/integrations/supabase/client")) {
    errors.push(`${path} omzeilt de getypeerde assessment-client.`);
  }
}

const security = read("src/lib/assessmentSecurity.ts");
const privacy = read("src/pages/PrivacyPolicy.tsx");
if (!security.includes('IT_QUICK_SCAN_PRIVACY_VERSION = "2026-07-15"')) {
  errors.push("assessmentSecurity gebruikt niet de vastgelegde privacyversie 2026-07-15.");
}
if (!privacy.includes("versie 2026-07-15")) {
  errors.push("PrivacyPolicy toont niet de vastgelegde privacyversie 2026-07-15.");
}

if (errors.length > 0) {
  console.error("Release 1 gate AFGEKEURD:\n- " + errors.join("\n- "));
  process.exit(1);
}

console.log(`Release 1 gate geslaagd: ${expectedMigrations.length} migraties en ${releaseFiles.length} bronbestanden gecontroleerd.`);
