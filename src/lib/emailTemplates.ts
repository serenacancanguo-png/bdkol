export type EmailTemplateId = 'short' | 'standard' | 'conversion'

export type DraftInput = {
  toEmail: string
  channelName: string
  channelUrl: string
  evidencePoints: string[]
  templateId: EmailTemplateId
}

function sanitizeEvidence(evidencePoints: string[]): string[] {
  return evidencePoints
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 5)
}

export function buildDraftFromTemplate(input: DraftInput): { subject: string; body: string } {
  const evidence = sanitizeEvidence(input.evidencePoints)
  const bulletEvidence = evidence.length
    ? evidence.map((e) => `- ${e}`).join('\n')
    : '- Your channel has strong futures/perps audience alignment.'

  const subjectBase = `${input.channelName} x Toobit partnership program`
  const subjectByTemplate: Record<EmailTemplateId, string> = {
    short: `${subjectBase} (quick intro)`,
    standard: `${subjectBase} collaboration inquiry`,
    conversion: `${subjectBase} referral collaboration opportunity`,
  }

  const shortBody = `Hi ${input.channelName} team,

I’m with Toobit BD. We’re looking to collaborate with channels that consistently cover futures/perps and high-intent trading content.

Why we reached out:
${bulletEvidence}

If you’re open, we can share our partnership program and referral structure for your review.

Channel reference: ${input.channelUrl}

Best regards,
Toobit BD Team`

  const standardBody = `Hi ${input.channelName} team,

I’m reaching out from Toobit BD. We’re expanding creator collaborations focused on futures/perps audiences and practical trading education.

We reviewed your channel and found strong relevance:
${bulletEvidence}

If there is interest, we can provide:
- Partnership program details
- Referral setup options
- Co-marketing support and campaign workflow

No guaranteed-return claims are involved; we focus on compliant, transparent collaboration terms.

Channel reference: ${input.channelUrl}

Best regards,
Toobit BD Team`

  const conversionBody = `Hi ${input.channelName} team,

I’m with Toobit BD, and I’d love to explore a performance-based collaboration with your channel.

Signals that stood out:
${bulletEvidence}

Potential cooperation scope:
- Partnership program onboarding
- Referral campaign configuration
- Landing/tracking support for attribution

If you share your preferred partnership format, we can propose a concise first campaign plan.

Important note: we do not use “guaranteed profit/returns” messaging. Collaboration communication stays compliant and risk-aware.

Channel reference: ${input.channelUrl}

Best regards,
Toobit BD Team`

  const bodyByTemplate: Record<EmailTemplateId, string> = {
    short: shortBody,
    standard: standardBody,
    conversion: conversionBody,
  }

  return {
    subject: subjectByTemplate[input.templateId] || subjectByTemplate.standard,
    body: bodyByTemplate[input.templateId] || bodyByTemplate.standard,
  }
}

