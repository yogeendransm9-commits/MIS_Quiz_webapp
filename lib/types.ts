export const TEAMS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E'] as const;
export type OptionKey = (typeof OPTION_KEYS)[number];
export type Phase = 'idle' | 'registration' | 'waiting' | 'playing' | 'paused' | 'ended';

export interface Participant {
  id: string;
  name: string;
  team: number;
  roll_number: string;
  created_at: string;
}

export interface Question {
  id: string;
  position: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  correct_answer: OptionKey;
  created_at: string;
}

export interface Answer {
  id: string;
  participant_id: string;
  question_id: string;
  selected: OptionKey;
  is_correct: boolean;
  created_at: string;
}

export interface QuizState {
  id: number;
  phase: Phase;
  current_question_id: string | null;
  question_started_at: string | null;
  question_ends_at: string | null;
  updated_at: string;
}

export interface TeamScore {
  team: number;
  score: number;
}

export interface IndividualScore {
  participant_id: string;
  score: number;
}

export const QUESTION_DURATION_SECONDS = 5;
export const ADMIN_PASSWORD_ENV = 'QUIZ_ADMIN_PASSWORD';

export function defaultAdminPassword(): string {
  return process.env.QUIZ_ADMIN_PASSWORD || 'admin123';
}

export function optionLetter(key: OptionKey): string {
  return key;
}

export function optionValue(q: Question, key: OptionKey): string {
  switch (key) {
    case 'A': return q.option_a;
    case 'B': return q.option_b;
    case 'C': return q.option_c;
    case 'D': return q.option_d;
    case 'E': return q.option_e;
  }
}
