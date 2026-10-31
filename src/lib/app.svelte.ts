/* Navigation, Einstellungen und Hinweise für die ganze App. */
import type { Settings } from './engine/state';

export type Screen =
  | { name: 'home' }
  | { name: 'game'; caseId: string; dispatch?: number }
  | { name: 'trainer' }
  | { name: 'trainerPro'; rhythms?: string[] }
  | { name: 'login' }
  | { name: 'progress' }
  | { name: 'practice' }
  | { name: 'radio' };

export interface ToastMsg { id: number; text: string; tone: 'good' | 'bad' | '' }

class AppState {
  screen = $state<Screen>({ name: 'home' });
  settings = $state<Settings>({ worsen: true, detail: true });
  toasts = $state<ToastMsg[]>([]);
  private nextId = 0;

  go(s: Screen) {
    this.screen = s;
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  }
  home() { this.go({ name: 'home' }); }

  toast(text: string, tone: ToastMsg['tone'] = '') {
    const id = ++this.nextId;
    this.toasts = [...this.toasts.slice(-1), { id, text, tone }];
    setTimeout(() => { this.toasts = this.toasts.filter((t) => t.id !== id); }, 2600);
  }
}

export const app = new AppState();
