<script lang="ts">
  import { app } from '../lib/app.svelte';
  import { account } from '../lib/account/account.svelte';
  import { ECG } from '../lib/data';
  import { pick, shuffle } from '../lib/util';
  import type { Choice } from '../lib/engine/state';
  import MonitorView from '../components/MonitorView.svelte';
  import Options from '../components/Options.svelte';

  const cfg = ECG.trainer.basic;
  const pool = [...cfg.rhythms, ...cfg.extraWeight]; // Rea-Rhythmen etwas häufiger
  const name = (k: string) => ECG.rhythms[k].name;
  const hint = (k: string) => ECG.rhythms[k].hint ?? ECG.rhythms[k].help;

  let key = $state('');
  let keys = $state<string[]>([]);
  let choices = $state<Choice[]>([]);
  let answered = $state(false);
  let pulse = $state('');
  let help = $state(false);
  let right = $state(0);
  let total = $state(0);

  function next() {
    let k: string;
    do k = pick(pool); while (k === key);
    key = k;
    keys = shuffle([k, ...shuffle(cfg.rhythms.filter((x) => x !== k)).slice(0, cfg.choices - 1)]);
    choices = keys.map((x) => ({ label: name(x) }));
    answered = false; pulse = ''; help = false;
  }
  function answer(i: number) {
    const ok = keys[i] === key;
    answered = true;
    total++; if (ok) right++;
    choices[i].state = ok ? 'right' : 'wrong';
    if (!ok) choices[keys.indexOf(key)].state = 'right';
    account.save('ecg', { rhythmus: key, modus: 'basis', richtig: ok, punkte: ok ? 1 : 0, max_punkte: 1 });
  }
  next();
  const shock = $derived(ECG.rhythms[key]?.shockable ? 'Schockbar.' : ['asystolie', 'pea'].includes(key) ? 'Nicht schockbar.' : '');
</script>

<section class="screen active">
  <div class="topbar">
    <button class="icon-btn" aria-label="Zurück" onclick={() => app.home()}>←</button>
    <div class="tb-mid"><div class="tb-title">{cfg.title}</div><div class="tb-sub">{right} / {total} richtig</div></div>
    <span style="width:72px"></span>
  </div>
  <div class="monitor big"><MonitorView rhythm={key} showPleth /><div class="tr-pulse">{pulse}</div></div>
  <div class="tr-actions">
    <button class="btn small ghost" onclick={() => (pulse = ECG.rhythms[key].pulse ? 'Puls tastbar ✓' : 'Kein Puls ✗')}>🫳 Puls prüfen</button>
    <button class="btn small ghost" onclick={() => (help = true)}>💡 Hilfe</button>
  </div>
  {#if help}
    <div class="tr-help card">
      <b>Worauf achten?</b><br />Regelmäßig oder unregelmäßig? Schmal oder breit? P-Wellen? Frequenz? Überhaupt Komplexe? Und bei geordnetem Rhythmus: Puls?<br /><br />
      {#each keys as k (k)}<div style="margin:4px 0"><b>{name(k)}:</b> {hint(k)}</div>{/each}
    </div>
  {/if}
  <Options {choices} disabled={answered} onpick={answer} />
  {#if answered}
    <div class="tr-feedback"><div class="explain"><b>{name(key)}</b> {shock}<br />{hint(key)}</div></div>
    <button class="btn wide accent" onclick={next}>Nächster Rhythmus</button>
  {/if}
</section>
