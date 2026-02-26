/**
 * GEDCOM 5.5.1 exporter — converts database persons to GEDCOM format.
 */

export interface ExportPerson {
  id: string;
  givenName?: string;
  familyName?: string;
  sex?: 'male' | 'female' | 'unknown';
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
}

export interface ExportRelationship {
  id: string;
  type: string;
  person1Id: string;
  person2Id: string;
}

/**
 * Export persons and relationships to GEDCOM text.
 */
export function exportGedcom(persons: ExportPerson[], relationships: ExportRelationship[]): string {
  const lines: string[] = [];

  // Header
  lines.push('0 HEAD');
  lines.push('1 SOUR Ahnenbaum');
  lines.push('2 VERS 1.0.0');
  lines.push('1 GEDC');
  lines.push('2 VERS 5.5.1');
  lines.push('2 FORM LINEAGE-LINKED');
  lines.push('1 CHAR UTF-8');

  // Individuals
  for (const p of persons) {
    lines.push(`0 @${p.id}@ INDI`);

    if (p.givenName || p.familyName) {
      const given = p.givenName ?? '';
      const family = p.familyName ?? '';
      lines.push(`1 NAME ${given} /${family}/`);
    }

    if (p.sex) {
      const sexChar = p.sex === 'male' ? 'M' : p.sex === 'female' ? 'F' : 'U';
      lines.push(`1 SEX ${sexChar}`);
    }

    if (p.birthDate || p.birthPlace) {
      lines.push('1 BIRT');
      if (p.birthDate) lines.push(`2 DATE ${p.birthDate}`);
      if (p.birthPlace) lines.push(`2 PLAC ${p.birthPlace}`);
    }

    if (p.deathDate || p.deathPlace) {
      lines.push('1 DEAT');
      if (p.deathDate) lines.push(`2 DATE ${p.deathDate}`);
      if (p.deathPlace) lines.push(`2 PLAC ${p.deathPlace}`);
    }
  }

  // Families from parent-child relationships
  const families = buildFamilies(relationships);
  for (const fam of families) {
    lines.push(`0 @${fam.id}@ FAM`);
    if (fam.husbandId) lines.push(`1 HUSB @${fam.husbandId}@`);
    if (fam.wifeId) lines.push(`1 WIFE @${fam.wifeId}@`);
    for (const child of fam.childIds) {
      lines.push(`1 CHIL @${child}@`);
    }
  }

  // Trailer
  lines.push('0 TRLR');

  return lines.join('\n') + '\n';
}

interface Family {
  id: string;
  husbandId?: string;
  wifeId?: string;
  childIds: string[];
}

function buildFamilies(relationships: ExportRelationship[]): Family[] {
  // Group parent-child relationships by parent pair
  const parentToChildren = new Map<string, string[]>();

  for (const rel of relationships) {
    if (rel.type === 'parent') {
      const key = rel.person1Id;
      const existing = parentToChildren.get(key);
      if (existing) {
        existing.push(rel.person2Id);
      } else {
        parentToChildren.set(key, [rel.person2Id]);
      }
    }
  }

  const families: Family[] = [];
  let familyId = 1;

  for (const [parentId, children] of parentToChildren) {
    families.push({
      id: `F${familyId++}`,
      husbandId: parentId,
      childIds: children,
    });
  }

  return families;
}
