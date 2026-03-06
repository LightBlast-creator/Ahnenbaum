<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { dataVersion } from '$lib/ws-invalidation';
  import { api } from '$lib/api';
  import Toast from '$lib/components/Toast.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import SkeletonLoader from '$lib/components/SkeletonLoader.svelte';
  import { slide } from 'svelte/transition';

  interface SourceRow {
    id: string;
    title: string;
    author: string | null;
    publisher: string | null;
    publicationDate: string | null;
    repositoryName: string | null;
    url: string | null;
    notes: string | null;
  }

  interface CitationRow {
    id: string;
    sourceId: string;
    detail: string | null;
    page: string | null;
    confidence: string | null;
    notes: string | null;
  }

  interface SourceWithCitations extends SourceRow {
    citations: CitationRow[];
  }

  // ── State ──
  let sources = $state<SourceRow[]>([]);
  let loading = $state(true);
  let toastMessage = $state('');
  let toastType: 'success' | 'error' = $state('success');

  // ── Add source form ──
  let showAddForm = $state(false);
  let addTitle = $state('');
  let addAuthor = $state('');
  let addPublisher = $state('');
  let addPubDate = $state('');
  let addRepository = $state('');
  let addUrl = $state('');
  let addNotes = $state('');
  let saving = $state(false);

  // ── Detail/edit panel ──
  let expandedSourceId = $state<string | null>(null);
  let expandedSource = $state<SourceWithCitations | null>(null);
  let editMode = $state(false);
  let editTitle = $state('');
  let editAuthor = $state('');
  let editPublisher = $state('');
  let editPubDate = $state('');
  let editRepository = $state('');
  let editUrl = $state('');
  let editNotes = $state('');

  // ── Delete ──
  let deleteConfirmOpen = $state(false);
  let pendingDeleteId = $state<string | null>(null);
  let citationDeleteConfirmOpen = $state(false);
  let pendingDeleteCitationId = $state<string | null>(null);

  // ── Citation add ──
  let showCitationForm = $state(false);
  let citDetail = $state('');
  let citPage = $state('');
  let citConfidence = $state('');
  let citNotes = $state('');

  // ── Load ──
  async function loadSources() {
    loading = true;
    try {
      const data = await api.get<{ sources: SourceRow[]; total: number }>('sources', {
        limit: 100,
      });
      sources = data.sources;
    } catch {
      toastMessage = m.toast_error();
      toastType = 'error';
    }
    loading = false;
  }

  $effect(() => {
    void $dataVersion;
    loadSources();
  });

  async function loadSourceDetail(id: string) {
    try {
      expandedSource = await api.get<SourceWithCitations>(`sources/${id}`);
    } catch {
      expandedSource = null;
    }
  }

  function toggleExpand(id: string) {
    if (expandedSourceId === id) {
      expandedSourceId = null;
      expandedSource = null;
      editMode = false;
      showCitationForm = false;
    } else {
      expandedSourceId = id;
      editMode = false;
      showCitationForm = false;
      loadSourceDetail(id);
    }
  }

  // ── Add source ──
  function resetAddForm() {
    addTitle = '';
    addAuthor = '';
    addPublisher = '';
    addPubDate = '';
    addRepository = '';
    addUrl = '';
    addNotes = '';
  }

  async function createSource() {
    if (!addTitle.trim() || saving) return;
    saving = true;
    try {
      await api.post('sources', {
        title: addTitle.trim(),
        author: addAuthor || undefined,
        publisher: addPublisher || undefined,
        publicationDate: addPubDate || undefined,
        repositoryName: addRepository || undefined,
        url: addUrl || undefined,
        notes: addNotes || undefined,
      });
      toastMessage = m.toast_source_created();
      toastType = 'success';
      resetAddForm();
      showAddForm = false;
      loadSources();
    } catch {
      toastMessage = m.toast_error();
      toastType = 'error';
    } finally {
      saving = false;
    }
  }

  // ── Edit source ──
  function startEdit() {
    if (!expandedSource) return;
    editTitle = expandedSource.title;
    editAuthor = expandedSource.author ?? '';
    editPublisher = expandedSource.publisher ?? '';
    editPubDate = expandedSource.publicationDate ?? '';
    editRepository = expandedSource.repositoryName ?? '';
    editUrl = expandedSource.url ?? '';
    editNotes = expandedSource.notes ?? '';
    editMode = true;
  }

  async function saveEdit() {
    if (!expandedSource || saving) return;
    saving = true;
    try {
      await api.patch(`sources/${expandedSource.id}`, {
        title: editTitle.trim(),
        author: editAuthor || null,
        publisher: editPublisher || null,
        publicationDate: editPubDate || null,
        repositoryName: editRepository || null,
        url: editUrl || null,
        notes: editNotes || null,
      });
      toastMessage = m.toast_source_updated();
      toastType = 'success';
      editMode = false;
      loadSources();
      loadSourceDetail(expandedSource.id);
    } catch {
      toastMessage = m.toast_error();
      toastType = 'error';
    } finally {
      saving = false;
    }
  }

  // ── Delete source ──
  function handleDelete(id: string) {
    pendingDeleteId = id;
    deleteConfirmOpen = true;
  }

  async function executeDelete() {
    if (!pendingDeleteId) return;
    try {
      await api.del(`sources/${pendingDeleteId}`);
      toastMessage = m.toast_source_deleted();
      toastType = 'success';
      if (expandedSourceId === pendingDeleteId) {
        expandedSourceId = null;
        expandedSource = null;
      }
      pendingDeleteId = null;
      loadSources();
    } catch {
      toastMessage = m.toast_error();
      toastType = 'error';
    }
  }

  // ── Add citation ──
  function resetCitationForm() {
    citDetail = '';
    citPage = '';
    citConfidence = '';
    citNotes = '';
  }

  async function createCitation() {
    if (!expandedSourceId || saving) return;
    saving = true;
    try {
      await api.post('citations', {
        sourceId: expandedSourceId,
        detail: citDetail || undefined,
        page: citPage || undefined,
        confidence: citConfidence || undefined,
        notes: citNotes || undefined,
      });
      toastMessage = m.toast_citation_created();
      toastType = 'success';
      resetCitationForm();
      showCitationForm = false;
      loadSourceDetail(expandedSourceId);
    } catch {
      toastMessage = m.toast_error();
      toastType = 'error';
    } finally {
      saving = false;
    }
  }

  // ── Delete citation ──
  function handleDeleteCitation(id: string) {
    pendingDeleteCitationId = id;
    citationDeleteConfirmOpen = true;
  }

  async function executeDeleteCitation() {
    if (!pendingDeleteCitationId || !expandedSourceId) return;
    try {
      await api.del(`citations/${pendingDeleteCitationId}`);
      toastMessage = m.toast_citation_deleted();
      toastType = 'success';
      pendingDeleteCitationId = null;
      loadSourceDetail(expandedSourceId);
    } catch {
      toastMessage = m.toast_error();
      toastType = 'error';
    }
  }
</script>

<svelte:head>
  <title>{m.source_title()} | {m.app_title()}</title>
</svelte:head>

<div class="entity-page">
  <header class="page-header">
    <h1>{m.source_title()}</h1>
    <button class="btn-primary" onclick={() => (showAddForm = !showAddForm)}>
      + {m.source_add()}
    </button>
  </header>

  <!-- Add form -->
  {#if showAddForm}
    <div class="add-form card" transition:slide={{ duration: 200 }}>
      <div class="form-row">
        <div class="form-field">
          <label for="add-title">{m.source_name()} *</label>
          <input id="add-title" type="text" bind:value={addTitle} required />
        </div>
        <div class="form-field">
          <label for="add-author">{m.source_author()}</label>
          <input id="add-author" type="text" bind:value={addAuthor} />
        </div>
      </div>
      <div class="form-row">
        <div class="form-field">
          <label for="add-publisher">{m.source_publisher()}</label>
          <input id="add-publisher" type="text" bind:value={addPublisher} />
        </div>
        <div class="form-field">
          <label for="add-pubdate">{m.source_pub_date()}</label>
          <input id="add-pubdate" type="text" bind:value={addPubDate} />
        </div>
      </div>
      <div class="form-row">
        <div class="form-field">
          <label for="add-repo">{m.source_repository()}</label>
          <input id="add-repo" type="text" bind:value={addRepository} />
        </div>
        <div class="form-field">
          <label for="add-url">{m.source_url()}</label>
          <input id="add-url" type="url" bind:value={addUrl} />
        </div>
      </div>
      <div class="form-field">
        <label for="add-notes">{m.source_notes()}</label>
        <textarea id="add-notes" bind:value={addNotes} rows="2"></textarea>
      </div>
      <div class="form-actions">
        <button
          class="btn-secondary"
          onclick={() => {
            showAddForm = false;
            resetAddForm();
          }}>{m.person_cancel()}</button
        >
        <button class="btn-primary" onclick={createSource} disabled={!addTitle.trim() || saving}
          >{m.person_save()}</button
        >
      </div>
    </div>
  {/if}

  <!-- Source list -->
  {#if loading}
    <SkeletonLoader variant="card" count={4} />
  {:else if sources.length === 0}
    <p class="empty">{m.source_empty()}</p>
  {:else}
    <div class="entity-table">
      <div class="table-header sources-grid">
        <span>{m.source_name()}</span>
        <span>{m.source_author()}</span>
        <span>{m.source_publisher()}</span>
        <span class="col-actions"></span>
      </div>
      {#each sources as source (source.id)}
        <div
          class="table-row sources-grid"
          class:expanded={expandedSourceId === source.id}
          role="button"
          tabindex="0"
          onclick={() => toggleExpand(source.id)}
          onkeydown={(e) => e.key === 'Enter' && toggleExpand(source.id)}
        >
          <span class="cell-name">{source.title}</span>
          <span class="cell-muted">{source.author ?? '—'}</span>
          <span class="cell-muted">
            {source.publisher ?? '—'}{source.publisher && source.publicationDate
              ? `, ${source.publicationDate}`
              : ''}
          </span>
          <span class="col-actions">
            <button
              class="btn-icon delete"
              onclick={(e) => {
                e.stopPropagation();
                handleDelete(source.id);
              }}
              title={m.source_delete()}>🗑️</button
            >
            <span class="chevron">{expandedSourceId === source.id ? '▲' : '▼'}</span>
          </span>
        </div>

        {#if expandedSourceId === source.id && expandedSource}
          <div class="source-detail" transition:slide={{ duration: 200 }}>
            {#if editMode}
              <!-- Edit form -->
              <div class="edit-form">
                <div class="form-row">
                  <div class="form-field">
                    <label for="edit-title">{m.source_name()}</label><input
                      id="edit-title"
                      type="text"
                      bind:value={editTitle}
                    />
                  </div>
                  <div class="form-field">
                    <label for="edit-author">{m.source_author()}</label><input
                      id="edit-author"
                      type="text"
                      bind:value={editAuthor}
                    />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-field">
                    <label for="edit-publisher">{m.source_publisher()}</label><input
                      id="edit-publisher"
                      type="text"
                      bind:value={editPublisher}
                    />
                  </div>
                  <div class="form-field">
                    <label for="edit-pubdate">{m.source_pub_date()}</label><input
                      id="edit-pubdate"
                      type="text"
                      bind:value={editPubDate}
                    />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-field">
                    <label for="edit-repo">{m.source_repository()}</label><input
                      id="edit-repo"
                      type="text"
                      bind:value={editRepository}
                    />
                  </div>
                  <div class="form-field">
                    <label for="edit-url">{m.source_url()}</label><input
                      id="edit-url"
                      type="url"
                      bind:value={editUrl}
                    />
                  </div>
                </div>
                <div class="form-field">
                  <label for="edit-notes">{m.source_notes()}</label><textarea
                    id="edit-notes"
                    bind:value={editNotes}
                    rows="2"
                  ></textarea>
                </div>
                <div class="form-actions">
                  <button class="btn-secondary" onclick={() => (editMode = false)}
                    >{m.person_cancel()}</button
                  >
                  <button class="btn-primary" onclick={saveEdit} disabled={saving}
                    >{m.person_save()}</button
                  >
                </div>
              </div>
            {:else}
              <!-- Read-only detail -->
              <dl class="detail-grid">
                {#if expandedSource.repositoryName}<dt>{m.source_repository()}</dt>
                  <dd>{expandedSource.repositoryName}</dd>{/if}
                {#if expandedSource.url}<dt>{m.source_url()}</dt>
                  <dd>
                    <a href={expandedSource.url} target="_blank" rel="noopener"
                      >{expandedSource.url}</a
                    >
                  </dd>{/if}
                {#if expandedSource.notes}<dt>{m.source_notes()}</dt>
                  <dd>{expandedSource.notes}</dd>{/if}
              </dl>
              <button class="btn-icon" onclick={startEdit}>✏️ {m.source_edit()}</button>
            {/if}

            <!-- Citations -->
            <div class="citations-section">
              <div class="citations-header">
                <h4>Citations ({expandedSource.citations.length})</h4>
                <button class="btn-sm" onclick={() => (showCitationForm = !showCitationForm)}
                  >+ {m.citation_add()}</button
                >
              </div>

              {#if showCitationForm}
                <div class="citation-form" transition:slide={{ duration: 200 }}>
                  <div class="form-row">
                    <div class="form-field">
                      <label for="cit-detail">{m.citation_detail()}</label><input
                        id="cit-detail"
                        type="text"
                        bind:value={citDetail}
                      />
                    </div>
                    <div class="form-field">
                      <label for="cit-page">{m.citation_page()}</label><input
                        id="cit-page"
                        type="text"
                        bind:value={citPage}
                      />
                    </div>
                  </div>
                  <div class="form-row">
                    <div class="form-field">
                      <label for="cit-confidence">{m.citation_confidence()}</label>
                      <select id="cit-confidence" bind:value={citConfidence}>
                        <option value="">—</option>
                        <option value="primary">Primary</option>
                        <option value="secondary">Secondary</option>
                        <option value="questionable">Questionable</option>
                      </select>
                    </div>
                    <div class="form-field">
                      <label for="cit-notes">{m.citation_notes()}</label><input
                        id="cit-notes"
                        type="text"
                        bind:value={citNotes}
                      />
                    </div>
                  </div>
                  <div class="form-actions">
                    <button
                      class="btn-secondary"
                      onclick={() => {
                        showCitationForm = false;
                        resetCitationForm();
                      }}>{m.person_cancel()}</button
                    >
                    <button class="btn-primary" onclick={createCitation} disabled={saving}
                      >{m.person_save()}</button
                    >
                  </div>
                </div>
              {/if}

              {#if expandedSource.citations.length === 0}
                <p class="empty-sm">{m.citation_empty()}</p>
              {:else}
                <div class="citation-list">
                  {#each expandedSource.citations as cit (cit.id)}
                    <div class="citation-card">
                      <div class="citation-info">
                        {#if cit.detail}<span class="cit-detail">{cit.detail}</span>{/if}
                        {#if cit.page}<span class="cit-meta">p. {cit.page}</span>{/if}
                        {#if cit.confidence}<span class="cit-badge">{cit.confidence}</span>{/if}
                        {#if cit.notes}<span class="cit-notes">{cit.notes}</span>{/if}
                      </div>
                      <button
                        class="btn-icon-sm"
                        onclick={() => handleDeleteCitation(cit.id)}
                        title={m.citation_delete()}>✕</button
                      >
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        {/if}
      {/each}
    </div>
  {/if}
</div>

<ConfirmDialog
  bind:open={deleteConfirmOpen}
  title={m.source_delete()}
  message={m.source_delete_confirm()}
  confirmLabel={m.source_delete()}
  variant="danger"
  onConfirm={executeDelete}
/>

<ConfirmDialog
  bind:open={citationDeleteConfirmOpen}
  title={m.citation_delete()}
  message={m.citation_delete_confirm()}
  confirmLabel={m.citation_delete()}
  variant="danger"
  onConfirm={executeDeleteCitation}
/>

<Toast message={toastMessage} type={toastType} onDismiss={() => (toastMessage = '')} />

<style>
  /* ── Page-specific grid ── */
  .sources-grid {
    grid-template-columns: 2fr 1fr 1fr auto;
  }

  .table-row {
    cursor: pointer;
  }

  .table-row.expanded {
    background: var(--color-bg-secondary);
  }

  .chevron {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  /* ── Detail panel (inside table) ── */
  .source-detail {
    padding: var(--space-4) var(--space-5);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg-secondary);
  }

  .detail-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-2) var(--space-4);
    font-size: var(--font-size-sm);
    margin-bottom: var(--space-3);
  }

  .detail-grid dt {
    color: var(--color-text-muted);
    font-weight: var(--font-weight-medium);
  }

  .detail-grid dd {
    color: var(--color-text-secondary);
    word-break: break-all;
  }

  .detail-grid a {
    color: var(--color-primary);
  }

  .edit-form {
    margin-bottom: var(--space-4);
  }

  /* ── Citations ── */
  .citations-section {
    margin-top: var(--space-4);
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-border);
  }

  .citations-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-3);
  }

  .citations-header h4 {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .citation-form {
    background: var(--color-surface);
    padding: var(--space-3);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-3);
    border: 1px solid var(--color-border);
  }

  .citation-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .citation-card {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    gap: var(--space-2);
    transition: background var(--transition-fast);
  }

  .citation-card:hover {
    background: var(--color-surface-hover);
  }

  .citation-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    min-width: 0;
  }

  .cit-detail {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
  }

  .cit-meta {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .cit-badge {
    display: inline-block;
    font-size: var(--font-size-xs);
    padding: 1px var(--space-2);
    background: var(--color-primary-light);
    color: var(--color-primary);
    border-radius: var(--radius-full);
    width: fit-content;
  }

  .cit-notes {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    font-style: italic;
  }

  .btn-icon-sm {
    padding: var(--space-1);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    opacity: 0;
    transition: all var(--transition-fast);
    flex-shrink: 0;
  }

  .citation-card:hover .btn-icon-sm {
    opacity: 0.5;
  }

  .btn-icon-sm:hover {
    opacity: 1 !important;
    color: var(--color-error);
  }

  .empty-sm {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    font-style: italic;
  }

  @media (max-width: 768px) {
    .sources-grid {
      grid-template-columns: 1fr auto;
    }
  }
</style>
