import { AI_REPORT_PROMPT_VERSION } from '../../js/v2/ai/ai-report-schema.js';

export { AI_REPORT_PROMPT_VERSION };

export function buildAiReportMessages({ facts, deterministicReport }) {
  return [
    {
      role: 'system',
      content: [
        'You are an editor for a Chinese romantic relationship tendency report.',
        'The input has already been scored. Do not rescore, change persona, change scores, invent constructs, or infer childhood, trauma, family history, illness, attachment disorder, personality disorder, or mental disease.',
        'Every claim must be supported by the provided facts. Avoid fatalistic, frightening, absolute, diagnostic, or shaming language.',
        'Return valid compact JSON only. Do not return Markdown, HTML, explanations, or fields outside the schema.',
        'Use the exact Result Report schema and set source to "ai".',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        promptVersion: AI_REPORT_PROMPT_VERSION,
        allowedSchema: {
          schemaVersion: deterministicReport.schemaVersion,
          oneLine: 'string',
          keyTraits: ['exactly 3 strings'],
          neededRelationship: 'string',
          innerConflict: 'string',
          misunderstoodByOthers: 'string',
          strengths: ['2 to 3 strings'],
          repeatPatterns: ['1 to 2 strings'],
          advice: [{ title: 'short string', text: 'specific string' }],
          evidence: {
            personaId: facts.persona.id,
            constructCodes: facts.constructRanking.map((item) => item.code),
            conflictIds: facts.conflicts.map((item) => item.id),
          },
          safetyDisclaimer: deterministicReport.safetyDisclaimer,
          source: 'ai',
        },
        facts: {
          persona: facts.persona,
          constructScores: facts.constructScores,
          topConstructs: facts.topConstructs,
          bottomConstructs: facts.bottomConstructs,
          confidence: facts.confidence,
          conflicts: facts.conflicts,
          needs: facts.needs,
          strengths: facts.strengths,
          riskPatterns: facts.riskPatterns,
          adviceTags: facts.adviceTags,
          responseQuality: facts.responseQuality,
        },
        deterministicReport,
      }),
    },
  ];
}
