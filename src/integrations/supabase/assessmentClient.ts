import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./client";
import type { Json } from "./types";

export type AssessmentLeadRow = {
  id: string;
  submission_key: string | null;
  customer_id: string | null;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  employee_count: number | null;
  status: "new" | "contacted" | "qualified" | "won" | "lost";
  follow_up_at: string | null;
  notes: string | null;
  consent_report: boolean;
  consent_marketing: boolean;
  privacy_notice_version: string | null;
  consent_recorded_at: string | null;
  retention_until: string | null;
  source: string;
  created_at: string;
  updated_at: string;
};

export type AssessmentRunRow = {
  id: string;
  lead_id: string | null;
  assessment_type: string;
  template_version: string;
  total_score: number;
  risk_level: "low" | "medium" | "high";
  answers: Json;
  category_scores: Json;
  recommendations: Json;
  created_at: string;
};

export type AssessmentAuditEventRow = {
  id: string;
  assessment_run_id: string | null;
  lead_id: string | null;
  event_type: string;
  metadata: Json;
  created_at: string;
};

export type AssessmentProposalStatus = "draft" | "reviewed" | "approved" | "sent" | "accepted" | "rejected";

export type AssessmentProposalDraftRow = {
  id: string;
  lead_id: string;
  customer_id: string | null;
  title: string;
  introduction: string | null;
  line_items: Json;
  notes: string | null;
  valid_until: string | null;
  status: AssessmentProposalStatus;
  subtotal: number;
  vat_total: number;
  total: number;
  created_by: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  sent_at: string | null;
  sent_by: string | null;
  sent_to: string | null;
  follow_up_at: string | null;
  responded_at: string | null;
  response_note: string | null;
  created_at: string;
  updated_at: string;
};

type AssessmentDatabase = {
  public: {
    Tables: {
      assessment_leads: {
        Row: AssessmentLeadRow;
        Insert: Partial<AssessmentLeadRow> & Pick<AssessmentLeadRow, "company_name" | "contact_name" | "email">;
        Update: Partial<AssessmentLeadRow>;
        Relationships: [
          {
            foreignKeyName: "assessment_leads_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      assessment_runs: {
        Row: AssessmentRunRow;
        Insert: Partial<AssessmentRunRow> & Pick<AssessmentRunRow, "total_score" | "risk_level">;
        Update: Partial<AssessmentRunRow>;
        Relationships: [
          {
            foreignKeyName: "assessment_runs_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "assessment_leads";
            referencedColumns: ["id"];
          },
        ];
      };
      assessment_audit_events: {
        Row: AssessmentAuditEventRow;
        Insert: Partial<AssessmentAuditEventRow> & Pick<AssessmentAuditEventRow, "event_type">;
        Update: Partial<AssessmentAuditEventRow>;
        Relationships: [
          {
            foreignKeyName: "assessment_audit_events_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "assessment_leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessment_audit_events_assessment_run_id_fkey";
            columns: ["assessment_run_id"];
            isOneToOne: false;
            referencedRelation: "assessment_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      assessment_proposal_drafts: {
        Row: AssessmentProposalDraftRow;
        Insert: Partial<AssessmentProposalDraftRow> & Pick<AssessmentProposalDraftRow, "lead_id" | "title">;
        Update: Partial<AssessmentProposalDraftRow>;
        Relationships: [
          {
            foreignKeyName: "assessment_proposal_drafts_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: true;
            referencedRelation: "assessment_leads";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      submit_it_quick_scan: {
        Args: {
          p_submission_key: string;
          p_honeypot: string;
          p_privacy_notice_version: string;
          p_company_name: string;
          p_contact_name: string;
          p_email: string;
          p_phone: string | null;
          p_employee_count: number | null;
          p_consent_report: boolean;
          p_consent_marketing: boolean;
          p_total_score: number;
          p_risk_level: string;
          p_answers: Json;
          p_category_scores: Json;
          p_recommendations: Json;
        };
        Returns: string;
      };
      update_assessment_lead: {
        Args: {
          p_lead_id: string;
          p_status?: string | null;
          p_notes?: string | null;
          p_follow_up_at?: string | null;
          p_update_status?: boolean;
          p_update_follow_up?: boolean;
        };
        Returns: AssessmentLeadRow;
      };
      convert_assessment_lead_to_customer: {
        Args: { p_lead_id: string };
        Returns: string;
      };
      save_assessment_proposal_draft: {
        Args: {
          p_lead_id: string;
          p_title: string;
          p_introduction: string | null;
          p_line_items: Json;
          p_notes?: string | null;
          p_valid_until?: string | null;
        };
        Returns: AssessmentProposalDraftRow;
      };
      update_assessment_proposal_lifecycle: {
        Args: {
          p_proposal_id: string;
          p_status: string;
          p_sent_to?: string | null;
          p_follow_up_at?: string | null;
          p_response_note?: string | null;
        };
        Returns: AssessmentProposalDraftRow;
      };
      is_harkas_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export const assessmentSupabase = supabase as unknown as SupabaseClient<AssessmentDatabase>;
