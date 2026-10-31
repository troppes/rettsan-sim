/* Test-Spieler: beantwortet jeden Dialog richtig und spielt Fälle durch. */
import { Game } from '../src/lib/engine/game';
import type { CaseDef } from '../src/lib/types';
import { PROCEDURES } from '../src/lib/data';

type Internal = { ctl: { keys: (string | number)[]; quiz?: { type: string; items?: string[]; answer?: number }; targets?: { id: string; x: number; y: number }[] } | null };

export function answerPrompts(g: Game, limit = 30) {
  for (let n = 0; g.prompt && n < limit; n++) {
    const p = g.prompt;
    const ctl = (g as unknown as Internal).ctl!;
    switch (p.kind) {
      case 'order': {
        for (const it of ctl.quiz!.items!) g.orderPick(it);
        g.orderCheck();
        break;
      }
      case 'mc': {
        let key: string | number;
        if (ctl.quiz) key = ctl.quiz.answer!;
        else if (p.title === 'Deine Verdachtsdiagnose?') key = g.diagnosis().answer;
        else {
          const R = g.rea!.st;
          key = R.path[R.pi] === 'rosc' && R.monRhythm === 'sinus' ? 'rosc' : ['vf', 'pvt'].includes(R.monRhythm) ? 'shock' : 'noshock';
        }
        g.choose(ctl.keys.indexOf(key));
        break;
      }
      case 'place':
        for (const t of ctl.targets!) g.placeSet(t.id, t.x, t.y);
        g.placeCheck();
        break;
      case 'iv':
        g.ivDone({ stauOk: true, vein: 'unterarm', early: false, retouched: false, angle: 20, hit: 'in', order: p.cfg.order });
        break;
      case 'gauge':
        g.gaugeDone({ sys: p.sys, dia: p.dia, maxP: p.sys + 40, rate: 3 });
        break;
      case 'rhythm':
        if (!p.pulseKnown) g.rhythmPulse();
        g.choose(ctl.keys.indexOf(p.rhythm));
        break;
      case 'moment': {
        const m = (ctl as unknown as { moment: { options: { pts?: number }[] } }).moment;
        const best = m.options.reduce((bi, o, i, a) => ((o.pts ?? 0) > (a[bi].pts ?? 0) ? i : bi), 0);
        g.choose(ctl.keys.indexOf(best));
        break;
      }
      case 'proc': {
        const proc = PROCEDURES[Object.keys(PROCEDURES).find((k) => PROCEDURES[k].title === p.title)!];
        for (let i = 0; i < 20 && !p.finished; i++) {
          if (p.refusal) { g.choose(0); continue; }
          const next = proc.steps.find((s) => !s.wrong && p.steps.some((x) => x.id === s.id));
          if (!next) break;
          g.procPick(next.id);
        }
        break;
      }
    }
    g.next();
  }
  if (g.prompt) throw new Error('Dialog hängt: ' + g.prompt.kind);
}

export function play(c: CaseDef, actions: string[], detail = true) {
  const g = new Game(c, { worsen: true, detail });
  for (const id of actions) { g.act(id); answerPrompts(g); }
  g.finish();
  answerPrompts(g);
  return g;
}
