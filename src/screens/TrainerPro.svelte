<script lang="ts">
  import { tick } from 'svelte';
  import { app } from '../lib/app.svelte';
  import { account } from '../lib/account/account.svelte';
  import { ECG } from '../lib/data';
  import { createSignal, type Signal } from '../lib/ecg/signal';
  import type { Choice } from '../lib/engine/state';
  import type { ProStep } from '../lib/types';
  import { pick, shuffle } from '../lib/util';
  import Options from '../components/Options.svelte';
  import PaperStrip from '../components/PaperStrip.svelte';

  let { rhythms: custom }: { rhythms?: string[] } = $props();

  const cfg = ECG.trainer.pro;
  const R = ECG.rhythms;
  const allKeys = Object.keys(R);
  const setKeys = (id: string) => (cfg.sets[id].rhythms === '*' ? allKeys : (cfg.sets[id].rhythms as string[]));

  interface StepView { def: ProStep; keys: string[]; choices: Choice[]; answer: string; help?: string; explain?: string; answered: boolean; ok?: boolean }

  let set = $state('alle');
  let sig = $state<Signal>(null!);
  let vignette = $state('');
  let pulse = $state('');
  let steps = $state<StepView[]>([]);
  let stats = $state({ n: 0, pts: 0, max: 0, streak: 0, best: 0, cur: 0, curMax: 0 });
  let last = '';

  const pool = () => (custom?.length ? custom : setKeys(set));
  const optionsFor = (s: ProStep): Record<string, string> =>
    s.field === 'rhythm' ? Object.fromEntries(allKeys.map((k) => [k, R[k].name])) : ECG.analysisOptions[s.field];
  // Frequenz nach dem tatsächlich gezeichneten Streifen bewerten, sonst nach den Rhythmus-Daten
  const rateOf = (sig: Signal) => {
    const a = R[sig.key].analysis.rate;
    if (a === 'none' || R[sig.key].pattern.type === 'regular') return a;
    return sig.hr < 60 ? 'brady' : sig.hr > 100 ? 'tachy' : 'normal';
  };
  const answerFor = (s: ProStep, key: string) => (s.field === 'rhythm' ? key : s.field === 'rate' ? rateOf(sig) : R[key].analysis[s.field]);

  function makeStep(def: ProStep, key: string): StepView {
    const opts = optionsFor(def);
    const answer = answerFor(def, key);
    let keys = Object.keys(opts);
    if (def.choices) keys = shuffle([answer, ...shuffle(keys.filter((k) => k !== answer)).slice(0, def.choices - 1)]);
    return { def, keys, choices: keys.map((k) => ({ label: opts[k] })), answer, answered: false };
  }

  function next() {
    const p = pool();
    let k: string;
    do k = pick(p); while (k === last && p.length > 1);
    last = k;
    sig = createSignal(ECG, k, cfg.stripSeconds);
    vignette = pick(R[k].vignettes) ?? '';
    pulse = '';
    stats.cur = 0; stats.curMax = 0;
    steps = [makeStep(cfg.steps[0], k)];
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function answer(si: number, i: number) {
    const st = steps[si];
    if (st.answered) return;
    const ok = st.keys[i] === st.answer;
    st.answered = true;
    st.ok = ok;
    st.choices[i].state = ok ? 'right' : 'wrong';
    if (!ok) st.choices[st.keys.indexOf(st.answer)].state = 'right';
    const got = ok ? (st.help ? Math.floor(st.def.pts / 2) : st.def.pts) : 0;
    stats.pts += got; stats.max += st.def.pts; stats.cur += got; stats.curMax += st.def.pts;
    let ex = '';
    if (st.def.id === 'rate') ex = R[sig.key].analysis.rate === 'none' ? 'Keine zählbaren Kammerkomplexe.' : `Etwa ${sig.hr}/min.`;
    if (st.def.field === 'rhythm') ex = R[sig.key].help;
    if (st.def.needPulse) {
      ex = (R[sig.key].pulse ? 'Puls tastbar. ' : 'KEIN Puls: Kreislaufstillstand! ') + ex;
      if (!pulse && cfg.pulseTip.rhythms.includes(sig.key)) ex += ' ' + cfg.pulseTip.text;
    }
    st.explain = (ok ? '✓ ' : '✗ ') + (ex.trim() || (ok ? 'Richtig.' : 'Richtig wäre: ' + st.choices[st.keys.indexOf(st.answer)].label));
    const nextDef = cfg.steps[si + 1];
    if (nextDef) {
      steps.push(makeStep(nextDef, sig.key));
      await tick();
      document.querySelector('.t2step:last-of-type')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      const diag = steps.find((s) => s.def.field === 'rhythm');
      account.save('ecg', { rhythmus: sig.key, modus: 'profi', richtig: !!diag?.ok, punkte: stats.cur, max_punkte: stats.curMax });
      stats.n++;
      if (stats.cur === stats.curMax) { stats.streak++; stats.best = Math.max(stats.best, stats.streak); } else stats.streak = 0;
    }
  }

  function showHelp(st: StepView) {
    let h = st.def.help;
    if (st.def.field === 'rhythm') h += '\n\n' + st.keys.map((k) => `${R[k].name}: ${R[k].help}`).join('\n');
    st.help = h;
  }

  next();
  const pct = $derived(stats.max ? Math.round((100 * stats.pts) / stats.max) : 0);
  const done = $derived(steps.length === cfg.steps.length && steps[steps.length - 1].answered);
</script>

<section class="screen active">
  <div class="topbar">
    <button class="icon-btn" aria-label="Zurück" onclick={() => app.home()}>←</button>
    <div class="tb-mid"><div class="tb-title">EKG-Trainer Profi</div><div class="tb-sub">{stats.n} Streifen · {pct} % · Serie {stats.streak} (Rekord {stats.best})</div></div>
    {#if custom?.length}
      <span class="t2set">Schwache Rhythmen</span>
    {:else}
      <select class="t2set" aria-label="Auswahl" bind:value={set} onchange={next}>
        {#each Object.entries(cfg.sets) as [id, s] (id)}<option value={id}>{s.label}</option>{/each}
      </select>
    {/if}
  </div>
  <div class="card t2vig">
    <span>{vignette}</span>
    <div class="t2pulse">
      <button class="btn small ghost" onclick={() => (pulse = R[sig.key].pulse ? `Puls tastbar, ca. ${sig.hr}/min` : 'Kein Puls tastbar!')}>🫳 Puls prüfen</button>
      <span>{pulse}</span>
    </div>
  </div>
  <PaperStrip signal={sig} />
  <p class="t2hint">25 mm/s · kleines Kästchen 0,04 s · großes Kästchen 0,2 s · Streifen {cfg.stripSeconds} s (zum Wischen)</p>
  {#each steps as st, si (si)}
    <div class="card t2step">
      <div class="t2q">{st.def.q}</div>
      <Options choices={st.choices} disabled={st.answered} onpick={(i) => answer(si, i)} />
      {#if !st.answered}<div class="row"><button class="btn small ghost" disabled={!!st.help} onclick={() => showHelp(st)}>💡 Hilfe</button></div>{/if}
      {#if st.help && !st.answered}<div class="helpbox pre">{st.help}</div>{/if}
      {#if st.explain}<div class="explain">{st.explain}</div>{/if}
    </div>
  {/each}
  {#if done}<button class="btn wide accent" onclick={next}>Nächster Streifen</button>{/if}
</section>
