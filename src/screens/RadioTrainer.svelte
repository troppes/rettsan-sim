<script lang="ts">
  /* Funk-Training: Status drücken, Funksprüche zusammensetzen, Funkregeln. Inhalte: radio.json */
  import { app } from '../lib/app.svelte';
  import radio from '../data/radio.json';
  import { pick, shuffle } from '../lib/util';
  import TopBar from '../components/TopBar.svelte';
  import Options from '../components/Options.svelte';
  import type { Choice } from '../lib/engine/state';

  type Task =
    | { kind: 'status'; text: string; s: string; explain?: string }
    | { kind: 'call'; task: string; words: string[]; extra: string[]; explain?: string; chips: string[] }
    | { kind: 'mc'; q: string; options: string[]; answer: number; explain?: string; order: number[] };

  const labels = radio.statusLabels as Record<string, string>;
  let task = $state<Task | null>(null);
  let done = $state<{ ok: boolean; text: string } | null>(null);
  let pressed = $state<string | null>(null);
  let built = $state<string[]>([]);
  let choices = $state<Choice[]>([]);
  let right = $state(0);
  let total = $state(0);
  let streak = $state(0);
  let last = '';

  function next() {
    const r = Math.random();
    let t: Task;
    do {
      if (r < 0.5) t = { kind: 'status', ...pick(radio.status) };
      else if (r < 0.75) { const c = pick(radio.calls); t = { kind: 'call', ...c, chips: shuffle([...c.words, ...c.extra]) }; }
      else { const m = pick(radio.mc); t = { kind: 'mc', ...m, order: shuffle(m.options.map((_, i) => i)) }; }
    } while ((t.kind === 'status' ? t.text : t.kind === 'call' ? t.task : t.q) === last);
    last = t.kind === 'status' ? t.text : t.kind === 'call' ? t.task : t.q;
    task = t;
    done = null; pressed = null; built = [];
    if (t.kind === 'mc') choices = t.order.map((i) => ({ label: t.options[i] }));
  }
  function score(ok: boolean, text: string) {
    total++; if (ok) { right++; streak++; } else streak = 0;
    done = { ok, text };
  }
  function press(k: string) {
    if (task?.kind !== 'status' || done) return;
    pressed = k;
    const ok = k === task.s;
    score(ok, `${ok ? 'Richtig' : `Falsch, richtig ist Status ${task.s}`}: ${labels[task.s]}.${task.explain ? ' ' + task.explain : ''}`);
  }
  function check() {
    const t = task;
    if (t?.kind !== 'call' || done) return;
    const ok = built.length === t.words.length && built.every((w, i) => w === t.words[i]);
    score(ok, `${ok ? 'Richtig' : 'So geht es'}: „${t.words.join(' ')}“. ${t.explain ?? ''}`);
  }
  function answer(i: number) {
    if (task?.kind !== 'mc' || done) return;
    const k = task.order[i];
    const ok = k === task.answer;
    choices[i].state = ok ? 'right' : 'wrong';
    if (!ok) choices[task.order.indexOf(task.answer)].state = 'right';
    score(ok, task.explain ?? (ok ? 'Richtig.' : 'Leider falsch.'));
  }
  next();
</script>

<section class="screen active">
  <TopBar title="Funk und Status" sub="{right} / {total} richtig · Serie {streak}" onBack={() => app.go({ name: 'practice' })} />
  {#if task}
    <div class="card radio-task">
      {#if task.kind === 'status'}
        <div class="kicker">Welchen Status drückst du?</div>
        <p class="say">{task.text}</p>
        <div class="fms">
          {#each ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] as k (k)}
            <button class="key {pressed === k ? (k === task.s ? 'right' : 'wrong') : ''} {done && k === task.s ? 'right' : ''}" onclick={() => press(k)}>{k}</button>
          {/each}
        </div>
      {:else if task.kind === 'call'}
        <div class="kicker">Funkspruch bauen · Du bist {radio.callsign}, die Leitstelle ist {radio.dispatch}</div>
        <p class="say">{task.task}</p>
        <div class="built">{#each built as w, i (i)}<span class="w">{w}</span>{:else}<span class="muted">Tippe die Bausteine in der richtigen Reihenfolge an.</span>{/each}</div>
        {#if !done}
          <div class="chips">{#each task.chips as w (w)}<button class="chip" disabled={built.includes(w)} onclick={() => (built = [...built, w])}>{w}</button>{/each}</div>
          <div class="row">
            <button class="btn ghost" onclick={() => (built = [])}>Zurücksetzen</button>
            <button class="btn accent" disabled={!built.length} onclick={check}>Senden</button>
          </div>
        {/if}
      {:else}
        <div class="kicker">Funkregeln</div>
        <h3>{task.q}</h3>
        <Options {choices} disabled={!!done} onpick={answer} />
      {/if}
      {#if done}
        <div class="explain {done.ok ? 'ok' : 'bad'}">{done.text}</div>
        <button class="btn wide accent" onclick={next}>Nächste Aufgabe</button>
      {/if}
    </div>
    <details class="card howto">
      <summary>Status-Übersicht</summary>
      <ul>{#each Object.entries(labels) as [k, l] (k)}<li><b>{k}</b> {l}</li>{/each}</ul>
      <p class="muted">Normaler Einsatz: 3 – 4 – 7 – 8 – 1 – 2. Status und Rufnamen können je Bundesland abweichen.</p>
    </details>
  {/if}
</section>

<style>
  .radio-task { margin-top: 12px; }
  .say { font-size: 17px; }
  .fms { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 12px 0; padding: 12px; border-radius: 14px; background: #10161d; border: 2px solid #2d3a48; }
  .key { aspect-ratio: 1.3; border-radius: 10px; border: 1px solid #3a4a5c; background: #27323f; font-size: 22px; font-weight: 700; color: #e8eef5; }
  .key.right { background: #1d6b45; border-color: var(--good); }
  .key.wrong { background: #7a2a26; border-color: var(--bad); }
  .built { min-height: 44px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 8px; border-radius: 10px; background: var(--bg2); margin: 8px 0; }
  .w { padding: 4px 10px; border-radius: 8px; background: #233a57; font-weight: 600; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
  .chip { padding: 8px 12px; border-radius: 999px; border: 1px solid var(--line); background: var(--bg2); font-size: 15px; }
  .chip:disabled { opacity: 0.35; }
  .explain.ok { border-left: 3px solid var(--good); }
  .explain.bad { border-left: 3px solid var(--bad); }
</style>
