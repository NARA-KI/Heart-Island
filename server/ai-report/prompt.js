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
        'Never claim to fully understand the user, and never invent personal experiences or relationship history.',
        'Use assessment.quizMode, answeredCount, elapsedMs, construct scores, ranking, and conflicts as evidence.',
        'For strengths, anchor the wording in high-scoring constructs. For tensions, name the construct combination that supports the inference.',
        'A quick report is a complete 15-dimension report based on 30 answers. Never call it a preview, trial, incomplete, low-tier, or inaccurate report.',
        'A full report uses 60 answers for greater stability and detail. Make it more nuanced through evidence and relationships between dimensions, not merely longer.',
        'Return valid compact JSON only. Do not return Markdown, HTML, explanations, or fields outside the schema.',
        'Use every key in the exact Result Report schema, including schemaVersion, and set source to "ai".',
        'Prompt-2: write concrete relationship-language, not fixed persona boilerplate or construct-label lists.',
        'Avoid these phrases: 核心不是一个固定标签, 不用勉强表演, 被认真对待, 主要驱动力, 这次答案里的关系模式, 把结果当作参考, 顺其自然, 学会爱自己, 摇摆.',
        'oneLine: 40-55 Chinese chars, not starting with persona name, include one high tendency plus one tension/style.',
        'keyTraits cover 3 angles: closeness, pressure/uncertainty, long-term needs/expression.',
        'neededRelationship, misunderstoodByOthers, strengths, repeatPatterns, and advice must use concrete situations and current facts.',
        'advice has 3 executable items: communication, current tension, long-term habit. evidence.constructCodes has 3-6 relevant codes only.',
        'Keep the whole report concise: strengths exactly 2 items, repeatPatterns exactly 1 item, each long text field under 75 Chinese chars, each advice text under 50 Chinese chars.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        promptVersion: AI_REPORT_PROMPT_VERSION,
        allowedSchema: {
          schemaVersion: deterministicReport.schemaVersion,
          oneLine: '40 to 55 Chinese characters, no persona-name opening',
          keyTraits: ['exactly 3 strings'],
          neededRelationship: 'string',
          innerConflict: 'string',
          misunderstoodByOthers: 'string',
          strengths: ['2 to 3 strings'],
          repeatPatterns: ['1 to 2 strings'],
          advice: [{ title: 'short string', text: 'specific string' }],
          evidence: {
            personaId: facts.persona.id,
            constructCodes: '3 to 6 construct codes actually used in this report',
            conflictIds: facts.conflicts.map((item) => item.id),
          },
          safetyDisclaimer: deterministicReport.safetyDisclaimer,
          source: 'ai',
        },
        facts: {
          assessment: facts.assessment,
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
        deterministicReference: {
          schemaVersion: deterministicReport.schemaVersion,
          safetyDisclaimer: deterministicReport.safetyDisclaimer,
          note: 'Do not copy deterministic wording or templates. Use facts to write a fresh report in the same schema.',
        },
      }),
    },
  ];
}
