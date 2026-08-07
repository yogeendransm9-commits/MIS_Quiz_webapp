export const PARTICIPANT_KEY = 'quiz_participant_id';

export function getParticipantId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(PARTICIPANT_KEY);
}

export function setParticipantId(id: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PARTICIPANT_KEY, id);
}

export function clearParticipantId() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(PARTICIPANT_KEY);
}
