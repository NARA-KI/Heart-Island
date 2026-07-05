import { renderHome } from './renderers/home.js';
import { renderInstructions } from './renderers/instructions.js';
import { renderQuiz } from './renderers/quiz.js';
import { renderTransition } from './renderers/transition.js';
import { renderResult } from './renderers/result.js';
import { renderPilotResult } from './renderers/pilot-result.js';

export function renderRoute(root, context) {
  const { state } = context;
  if (state.view === 'home') return renderHome(root, context);
  if (state.view === 'instructions') return renderInstructions(root, context);
  if (state.view === 'quiz') return renderQuiz(root, context);
  if (state.view === 'transition') return renderTransition(root, context);
  if (state.view === 'result' && state.pilot?.enabled) return renderPilotResult(root, context);
  if (state.view === 'result') return renderResult(root, context);
  throw new Error(`Unknown view: ${state.view}`);
}
