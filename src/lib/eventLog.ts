// Analytics-ready event log for the "אי התעלומות" pilot.
// Every answer, time, attempt and hint is stored locally so it can later be
// shipped to a backend (Lovable Cloud) without changing call sites.
//
// Identity matters here: these are shared classroom Chromebooks, so a log with
// no session identity merges every student who ever used the machine into one
// record. Each mount of the app opens a fresh session, keyed separately in
// storage, with its own t=0.

import { z } from 'zod';

export const SCHEMA_VERSION = 2;

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

/** Event types that carry a graded answer — classified explicitly, not by string sniffing. */
const ANSWER_TYPES: IslandEventType[] = ['gate_pre_answer', 'pulse_answer', 'gate_post_answer'];

export const answerPayload = z.object({
  questionId: z.string(),
  placement: z.string().optional(),
  context: z.string().optional(),
  choice: z.number(),
  correct: z.boolean(),
  msToAnswer: z.number().optional(),
});

/** One canonical shape for every attempt, whichever station logs it. */
export const attemptPayload = z.object({
  mystery: z.string(),
  attempt: z.number(),
  correct: z.boolean(),
  detail: z.record(z.unknown()).optional(),
});

export const eventSchema = z.object({
  schemaVersion: z.number(),
  sessionId: z.string(),
  studentId: z.string().optional(),
  packId: z.string(),
  type: z.string(),
  at: z.string(),
  msSinceStart: z.number(),
  payload: z.record(z.unknown()).optional(),
});

export type IslandEvent = z.infer<typeof eventSchema>;

const NS = 'island-of-mysteries';
const SESSION_KEY = `${NS}:sessionId`;
const STUDENT_KEY = `${NS}:studentId`;
let packId = 'light-v1';

const now = () => Date.now();
const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `s-${now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** A session lives for one run of the app: new tab / reload / "start over" = new session. */
const sessionId = uid();
const sessionStart = now();

function eventsKey() {
  return `${NS}:events:${sessionId}`;
}

/** Which content pack (subject) these events belong to. */
export function setPackId(id: string) {
  packId = id;
}

/** Optional stable learner id (e.g. a class roster code typed at the gate). */
export function setStudentId(id: string) {
  try {
    localStorage.setItem(STUDENT_KEY, id);
  } catch {
    /* best effort */
  }
}

export function getSessionInfo() {
  let studentId: string | undefined;
  try {
    studentId = localStorage.getItem(STUDENT_KEY) ?? undefined;
  } catch {
    /* ignore */
  }
  return { sessionId, studentId, packId, schemaVersion: SCHEMA_VERSION, startedAt: sessionStart };
}

export function logEvent(type: IslandEventType, payload?: Record<string, unknown>) {
  try {
    const { studentId } = getSessionInfo();
    const event: IslandEvent = {
      schemaVersion: SCHEMA_VERSION,
      sessionId,
      studentId,
      packId,
      type,
      at: new Date().toISOString(),
      msSinceStart: now() - sessionStart,
      payload,
    };
    const all = getEvents();
    all.push(event);
    localStorage.setItem(eventsKey(), JSON.stringify(all));
    localStorage.setItem(SESSION_KEY, sessionId);
  } catch {
    /* storage unavailable — analytics are best-effort */
  }
}

/** Events for the CURRENT session only — never another student's history. */
export function getEvents(): IslandEvent[] {
  try {
    const raw = JSON.parse(localStorage.getItem(eventsKey()) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter((e): e is IslandEvent => eventSchema.safeParse(e).success);
  } catch {
    return [];
  }
}

/** Clears the current session's events (used by "start over"). */
export function resetSession() {
  try {
    localStorage.removeItem(eventsKey());
  } catch {
    /* ignore */
  }
}

export function summarizeEvents() {
  const events = getEvents();
  const answers = events.filter((e) => ANSWER_TYPES.includes(e.type as IslandEventType));
  const correct = answers.filter((e) => e.payload?.correct === true).length;
  const hints = events.filter((e) => e.type === 'hint_opened').length;
  const attemptEvents = events.filter((e) => e.type === 'mystery_attempt');
  const attempts = attemptEvents.length;

  // attempts-to-first-success, per mystery — computable because every
  // mystery_attempt now uses the same payload shape.
  const attemptsToSuccess: Record<string, number> = {};
  attemptEvents.forEach((e) => {
    const p = attemptPayload.safeParse(e.payload);
    if (!p.success) return;
    const { mystery, correct: ok } = p.data;
    if (attemptsToSuccess[mystery] !== undefined) return;
    if (ok) attemptsToSuccess[mystery] = (p.data.attempt ?? 1);
  });

  const totalMs = events.length ? events[events.length - 1].msSinceStart : 0;
  return {
    answers: answers.length,
    correct,
    hints,
    attempts,
    attemptsToSuccess,
    minutes: Math.max(1, Math.round(totalMs / 60000)),
  };
}
