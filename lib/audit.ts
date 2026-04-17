import { supabaseAdmin } from '@/lib/supabase/admin'

export type AuditAction =
  | 'MEMBER_APPROVAL'
  | 'CONTRIBUTION_APPROVAL'
  | 'CONTRIBUTION_RULE_UPDATE'
  | 'INVESTMENT_CREATE'
  | 'INVESTMENT_UPDATE'
  | 'CHARITY_CREATE'
  | 'DISPUTE_CREATE'
  | 'DISPUTE_RESOLVE'
  | 'FINE_CREATE'
  | 'FINE_UPDATE'
  | 'FINE_SETTINGS_UPDATE'
  | 'FINE_AUTO_APPLIED'
  | 'KYC_SUBMIT'
  | 'KYC_REVIEW'
  | 'ANNOUNCEMENT_CREATE'
  | 'CHAIRMAN_MESSAGE_POSTED'
  | 'CORRECTION_REQUEST_AUTO_FIXED'
  | 'CORRECTION_REQUEST_RESOLVED'
  | 'EXPECTED_DUES_SET'
  | 'REMINDER_SCHEDULE'
  | 'REMINDER_SETTINGS_UPDATED'
  | 'REMINDERS_GENERATED'
  | 'EXPORT'
  | 'PROFIT_DISTRIBUTION'

export async function logAudit(params: {
  actorId: string | null
  action: AuditAction
  entityType: string
  entityId?: string | null
  details?: any
}) {
  try {
    await supabaseAdmin.from('audit_logs').insert([
      {
        actor_id: params.actorId,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId ?? null,
        details: params.details ?? {},
      },
    ])
  } catch (e) {
    // Don't break user flows if audit logging fails
    console.error('logAudit failed:', e)
  }
}

export async function logActivity(params: {
  userId: string
  type:
    | 'CONTRIBUTION_SUBMITTED'
    | 'CONTRIBUTION_APPROVED'
    | 'FINE_APPLIED'
    | 'KYC_SUBMITTED'
    | 'ANNOUNCEMENT'
    | 'REMINDER'
    | 'INVESTMENT_UPDATE'
  message: string
  meta?: any
}) {
  try {
    await supabaseAdmin.from('activity_events').insert([
      {
        user_id: params.userId,
        type: params.type,
        message: params.message,
        meta: params.meta ?? {},
      },
    ])
  } catch (e) {
    console.error('logActivity failed:', e)
  }
}
