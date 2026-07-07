# Heart Island V2 Trusted Beta Feedback Form Template

Use this template for the external form linked from the V2 result page.

Required fields:

1. Overall accuracy: 1-5 rating
2. The part that felt most like me
3. The part that felt least like me
4. Would you save or share this result?
5. Additional comments

Recommended fields:

6. Were any questions hard to understand or hard to choose?
7. Question number or question description

Optional prefilled fields from the result page URL:

- `version`
- `persona`
- `promptVersion`
- `anonymousResultId`
- `aiSource`
- `viewport`

Do not ask testers to paste API keys, raw 60-question answers, personally identifiable information, or full AI report text.

Runtime configuration:

```json
{
  "feedbackFormUrl": "https://forms.example.com/heart-island-v2-beta",
  "allowedOrigins": ["https://forms.example.com"]
}
```

Leave `feedbackFormUrl` empty to hide the result-page feedback button.
