export function resumeQuizTimer(state, now = Date.now()) {
  if (state.view !== 'quiz' || state.startTimestamp) return state.elapsedMs;
  state.startTimestamp = new Date(now).toISOString();
  return state.elapsedMs;
}

export function pauseQuizTimer(state, now = Date.now()) {
  if (!state.startTimestamp) return state.elapsedMs;
  const startedAt = Date.parse(state.startTimestamp);
  if (Number.isFinite(startedAt)) {
    state.elapsedMs = Math.max(0, state.elapsedMs + Math.max(0, now - startedAt));
  }
  state.startTimestamp = null;
  return state.elapsedMs;
}

export function currentElapsedMs(state, now = Date.now()) {
  if (!state.startTimestamp) return Math.max(0, Number(state.elapsedMs) || 0);
  const startedAt = Date.parse(state.startTimestamp);
  if (!Number.isFinite(startedAt)) return Math.max(0, Number(state.elapsedMs) || 0);
  return Math.max(0, Number(state.elapsedMs) || 0) + Math.max(0, now - startedAt);
}

export function formatElapsedTime(elapsedMs) {
  const totalSeconds = Math.max(0, Math.floor((Number(elapsedMs) || 0) / 1000));
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) return `${pad(totalMinutes)}:${pad(seconds)}`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function pad(value) {
  return String(value).padStart(2, '0');
}
