<script lang="ts">
  import { app } from '../lib/app.svelte';
  import { account } from '../lib/account/account.svelte';
  import { caseStats, frequentMistakes, rhythmStats, type CaseRow, type EcgRow } from '../lib/account/progress';
  import { CASES, ECG, caseById } from '../lib/data';
  import TopBar from '../components/TopBar.svelte';

  let data = $state<{ cases: CaseRow[]; ecg: EcgRow[] } | null>(null);
  let error = $state('');
  account.history().then((d) => (data = d)).catch((e: Error) => (error = e.message));

  const caseName = (id: string) => { const c = caseById(id); return c ? `${c.person} ${c.diagnosis.options[c.diagnosis.answer]}` : id; };
  const rows = $derived(data ? Object.entries(caseStats(data.cases)).map(([id, s]) => ({ id, ...s })).sort((a, b) => a.avg - b.avg) : []);
  const never = $derived(data ? CASES.filter((c) => !rows.some((r) => r.id === c.id)).map((c) => c.id) : []);
  const rhythms = $derived(data ? rhythmStats(data.ecg) : []);
  const weak = $derived(rhythms.filter((r) => r.pct < 75 && ECG.rhythms[r.key]).map((r) => r.key));
  const mistakes = $derived(data ? frequentMistakes(data.cases) : []);
  const target = $derived(never.length ? never[Math.floor(Math.random() * never.length)] : rows.length && rows[0].avg < 80 ? rows[0].id : null);
  const tone = (p: number) => (p >= 80 ? 'var(--good)' : p >= 60 ? 'var(--warn)' : 'var(--bad)');
  const when = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };
</script>

{#snippet bar(p: number)}<span class="pbar"><span style:width="{p}%" style:background={tone(p)}></span></span>{/snippet}

<section class="screen active">
  <TopBar title="Mein Fortschritt" sub={data ? `${data.cases.length} Einsätze · ${data.ecg.length} EKG-Streifen` : ''} onBack={() => app.home()} />
  <div class="debrief">
    {#if error}
      <div class="ditem bad">Fortschritt konnte nicht geladen werden ({error}).</div>
    {:else if !data}
      <div class="ditem">Lade …</div>
    {:else}
      <div class="row">
        {#if target}<button class="btn accent" onclick={() => app.go({ name: 'game', caseId: target })}>{never.length ? '🆕 Neuen Fall spielen' : '🎯 Schwächsten Fall üben'}</button>{/if}
        {#if weak.length}<button class="btn blue" onclick={() => app.go({ name: 'trainerPro', rhythms: weak.length > 1 ? weak : [...weak, 'sinus'] })}>🩺 Schwache Rhythmen üben</button>{/if}
      </div>

      <h4>Einsätze</h4>
      {#each rows as r (r.id)}
        <div class="ditem prow"><b>{caseName(r.id)}</b>{@render bar(r.avg)}<small>{r.n}× gespielt · Schnitt {r.avg} % · zuletzt {r.last} % · bestes {r.best} %</small></div>
      {:else}
        <div class="ditem">Noch keine Einsätze gespeichert.</div>
      {/each}
      {#if never.length && rows.length}<div class="ditem"><small>{never.length} von {CASES.length} Fällen noch nie gespielt.</small></div>{/if}

      {#if mistakes.length}
        <h4>Passiert dir öfter</h4>
        {#each mistakes as m (m.text)}<div class="ditem miss"><span class="p">{m.n}×</span>{m.text}</div>{/each}
      {/if}

      <h4>EKG-Rhythmen</h4>
      {#each rhythms as r (r.key)}
        <div class="ditem prow"><b>{ECG.rhythms[r.key]?.name ?? r.key}</b>{@render bar(r.pct)}<small>{r.pct} % richtig erkannt · {r.n} Streifen</small></div>
      {:else}
        <div class="ditem">Noch keine EKG-Ergebnisse gespeichert.</div>
      {/each}

      {#if data.cases.length}
        <h4>Verlauf</h4>
        {#each data.cases.slice(0, 10) as c, i (i)}
          <div class="ditem"><span class="p">{c.prozent} %</span>{c.meldung ?? caseName(c.fall)}<small>{when(c.created_at)}{c.diagnose_richtig ? ' · Diagnose richtig' : ''}</small></div>
        {/each}
      {/if}
    {/if}
  </div>
</section>
