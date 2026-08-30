// Analytics-ready event log for the "אי התעלומות" pilot.
// Every answer, time, attempt and hint is stored locally so it can later be
// shipped to a backend (Lovable Cloud) without changing call sites.

export type IslandEventType =
  | 'session_start'
  | 'gate_pre_answer'
  | 'gate_pre_complete'
  | 'mystery_start'
  | 'mystery_attempt'
  | 'mystery_complete'
  | 'pulse_answer'
  | 'hint_opened'
  | 'gate_post_answer'
  | 'reflection_submit'
  | 'session_complete';

export interface IslandEvent {
  type: IslandEventType;
  at: string; // ISO timestamp
  msSinceStart: number;
  payload?: Record<string, unknown>;
}

const KEY = 'island-of-mysteries:events';
const START_KEY = 'island-of-mysteries:startedAt';

const now = () => Date.now();

function startedAt(): number {
  const raw = localStorage.getItem(START_KEY);
  if (raw) return Number(raw);
  const t = now();
  localStorage.setItem(START_KEY, String(t));
  return t;
}

export function logEvent(type: IslandEventType, payload?: Record<string, unknown>) {
  try {
    const event: IslandEvent = {
      type,
      at: new Date().toISOString(),
      msSinceStart: now() - startedAt(),
      payload,
    };
    const all = getEvents();
    all.push(event);
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable — analytics are best-effort */
  }
}

export function getEvents(): IslandEvent[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as IslandEvent[];
  } catch {
    return [];
  }
}

export function summarizeEvents() {
  const events = getEvents();
  const answers = events.filter((e) => e.type.includes('answer'));
  const correct = answers.filter((e) => e.payload?.correct === true).length;
  const hints = events.filter((e) => e.type === 'hint_opened').length;
  const attempts = events.filter((e) => e.type === 'mystery_attempt').length;
  const totalMs = events.length ? events[events.length - 1].msSinceStart : 0;
  return {
    answers: answers.length,
    correct,
    hints,
    attempts,
    minutes: Math.max(1, Math.round(totalMs / 60000)),
  };
}
