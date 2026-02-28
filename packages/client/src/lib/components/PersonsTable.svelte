<script lang="ts">
  import { base } from '$app/paths';
  import * as m from '$lib/paraglide/messages';
  import type { PersonWithDetails, GetPersonsOptions } from '$lib/api';
  import { formatLifespan } from '$lib/utils/date-format';

  interface Props {
    items: PersonWithDetails[];
    sortBy: GetPersonsOptions['sortBy'];
    sortDir: 'asc' | 'desc';
    onToggleSort: (column: GetPersonsOptions['sortBy']) => void;
    onDelete: (personId: string, event: MouseEvent) => void;
  }

  let { items, sortBy, sortDir, onToggleSort, onDelete }: Props = $props();

  function sortIndicator(column: GetPersonsOptions['sortBy']): string {
    if (sortBy !== column) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }

  function getInitials(person: PersonWithDetails): string {
    return `${person.preferredName.given.charAt(0)}${person.preferredName.surname.charAt(0)}`;
  }
</script>

<div class="table-wrapper">
  <table class="persons-table">
    <thead>
      <tr>
        <th class="col-avatar"></th>
        <th>
          <button class="sort-btn" onclick={() => onToggleSort('name')}>
            {m.sort_name()}{sortIndicator('name')}
          </button>
        </th>
        <th>
          <button class="sort-btn" onclick={() => onToggleSort('birth')}>
            {m.sort_birth()}{sortIndicator('birth')}
          </button>
        </th>
        <th>
          <button class="sort-btn" onclick={() => onToggleSort('death')}>
            {m.sort_death()}{sortIndicator('death')}
          </button>
        </th>
        <th class="col-place">📍</th>
        <th class="col-actions"></th>
      </tr>
    </thead>
    <tbody>
      {#each items as person (person.id)}
        <tr>
          <td class="col-avatar">
            <a href="{base}/persons/{person.id}" class="avatar-link">
              {#if person.primaryPhotoUrl}
                <img src={person.primaryPhotoUrl} alt="" class="row-avatar row-avatar-photo" />
              {:else}
                <span class="row-avatar">{getInitials(person)}</span>
              {/if}
            </a>
          </td>
          <td>
            <a href="{base}/persons/{person.id}" class="name-link">
              <span class="person-surname">{person.preferredName.surname}</span>,
              <span class="person-given">{person.preferredName.given}</span>
            </a>
          </td>
          <td class="col-date">
            {person.birthEvent?.date
              ? formatLifespan(person.birthEvent.date, undefined).replace('–', '')
              : ''}
          </td>
          <td class="col-date">
            {person.deathEvent?.date
              ? formatLifespan(undefined, person.deathEvent.date).replace('–', '')
              : ''}
          </td>
          <td class="col-place">
            {person.birthPlace?.name ?? ''}
          </td>
          <td class="col-actions">
            <button
              class="btn-delete"
              onclick={(e: MouseEvent) => onDelete(person.id, e)}
              aria-label={m.person_delete()}
              title={m.person_delete()}
            >
              🗑️
            </button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .table-wrapper {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .persons-table {
    width: 100%;
    border-collapse: collapse;
  }

  .persons-table th {
    text-align: left;
    padding: var(--space-3) var(--space-4);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg-secondary);
  }

  .persons-table td {
    padding: var(--space-3) var(--space-4);
    font-size: var(--font-size-sm);
    border-bottom: 1px solid var(--color-border);
  }

  .persons-table tbody tr:last-child td {
    border-bottom: none;
  }

  .persons-table tbody tr:hover {
    background: var(--color-surface-hover);
  }

  .col-avatar {
    width: 48px;
  }

  .avatar-link {
    text-decoration: none;
  }

  .row-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: var(--color-primary-light);
    color: var(--color-primary);
    border-radius: var(--radius-full);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
  }

  .row-avatar-photo {
    object-fit: cover;
    background: none;
  }

  .sort-btn {
    font: inherit;
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    cursor: pointer;
    white-space: nowrap;
  }

  .sort-btn:hover {
    color: var(--color-text);
  }

  .name-link {
    text-decoration: none;
    color: var(--color-text);
    font-weight: var(--font-weight-medium);
  }

  .name-link:hover {
    color: var(--color-primary);
  }

  .person-surname {
    font-weight: var(--font-weight-semibold);
  }

  .col-date {
    color: var(--color-text-secondary);
    white-space: nowrap;
  }

  .col-place {
    color: var(--color-text-secondary);
    white-space: nowrap;
  }

  .col-actions {
    width: 48px;
    text-align: center;
  }

  .btn-delete {
    padding: var(--space-1);
    font-size: var(--font-size-sm);
    line-height: 1;
    border-radius: var(--radius-md);
    opacity: 0.4;
    transition: all var(--transition-fast);
    cursor: pointer;
  }

  .btn-delete:hover {
    opacity: 1;
    background: var(--color-danger-light, rgba(239, 68, 68, 0.1));
  }

  @media (max-width: 768px) {
    .col-place {
      display: none;
    }
  }
</style>
