/**
 * GEDCOM 5.5.1 parser — converts GEDCOM text to structured records.
 *
 * GEDCOM is a line-based format: LEVEL TAG VALUE
 * Example:
 *   0 @I1@ INDI
 *   1 NAME John /Smith/
 *   1 SEX M
 *   1 BIRT
 *   2 DATE 1 JAN 1900
 *   2 PLAC London, England
 */

export interface GedcomRecord {
  level: number;
  tag: string;
  xref?: string;
  value?: string;
  children: GedcomRecord[];
}

export interface ParsedPerson {
  xref: string;
  givenName: string;
  familyName: string;
  sex: 'male' | 'female' | 'unknown';
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
}

export interface ParsedFamily {
  xref: string;
  husbandXref?: string;
  wifeXref?: string;
  childXrefs: string[];
  marriageDate?: string;
  marriagePlace?: string;
}

export interface GedcomParseResult {
  persons: ParsedPerson[];
  families: ParsedFamily[];
  errors: string[];
}

/**
 * Parse GEDCOM text into structured records.
 */
export function parseGedcom(text: string): GedcomRecord[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const root: GedcomRecord[] = [];
  const stack: GedcomRecord[] = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(\d+)\s+(@\S+@\s+)?(\S+)\s*(.*)?$/);
    if (!match) continue;

    const level = parseInt(match[1], 10);
    const xref = match[2]?.trim().replace(/@/g, '');
    const tag = match[3];
    const value = match[4]?.trim() || undefined;

    const record: GedcomRecord = { level, tag, xref, value, children: [] };

    if (level === 0) {
      root.push(record);
      stack.length = 0;
      stack.push(record);
    } else {
      // Find parent at level - 1
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }
      if (stack.length > 0) {
        stack[stack.length - 1].children.push(record);
      }
      stack.push(record);
    }
  }

  return root;
}

/**
 * Extract persons and families from GEDCOM records.
 */
export function extractData(records: GedcomRecord[]): GedcomParseResult {
  const persons: ParsedPerson[] = [];
  const families: ParsedFamily[] = [];
  const errors: string[] = [];

  for (const rec of records) {
    if (rec.tag === 'INDI' && rec.xref) {
      try {
        persons.push(extractPerson(rec));
      } catch (err) {
        errors.push(`Error parsing individual ${rec.xref}: ${err}`);
      }
    } else if (rec.tag === 'FAM' && rec.xref) {
      try {
        families.push(extractFamily(rec));
      } catch (err) {
        errors.push(`Error parsing family ${rec.xref}: ${err}`);
      }
    }
  }

  return { persons, families, errors };
}

function findChild(record: GedcomRecord, tag: string): GedcomRecord | undefined {
  return record.children.find((c) => c.tag === tag);
}

function findChildValue(record: GedcomRecord, tag: string): string | undefined {
  return findChild(record, tag)?.value;
}

function extractPerson(rec: GedcomRecord): ParsedPerson {
  const nameRec = findChild(rec, 'NAME');
  let givenName = '';
  let familyName = '';

  if (nameRec?.value) {
    // GEDCOM name format: "Given /Family/"
    const nameMatch = nameRec.value.match(/^(.*?)\/(.+?)\//);
    if (nameMatch) {
      givenName = nameMatch[1].trim();
      familyName = nameMatch[2].trim();
    } else {
      givenName = nameRec.value.trim();
    }
  }

  const sexValue = findChildValue(rec, 'SEX')?.toUpperCase();
  const sex: ParsedPerson['sex'] =
    sexValue === 'M' ? 'male' : sexValue === 'F' ? 'female' : 'unknown';

  const birth = findChild(rec, 'BIRT');
  const death = findChild(rec, 'DEAT');

  return {
    xref: rec.xref ?? '',
    givenName,
    familyName,
    sex,
    birthDate: birth ? findChildValue(birth, 'DATE') : undefined,
    birthPlace: birth ? findChildValue(birth, 'PLAC') : undefined,
    deathDate: death ? findChildValue(death, 'DATE') : undefined,
    deathPlace: death ? findChildValue(death, 'PLAC') : undefined,
  };
}

function extractFamily(rec: GedcomRecord): ParsedFamily {
  const husb = findChildValue(rec, 'HUSB')?.replace(/@/g, '');
  const wife = findChildValue(rec, 'WIFE')?.replace(/@/g, '');
  const childRecs = rec.children.filter((c) => c.tag === 'CHIL');
  const childXrefs = childRecs.map((c) => (c.value ?? '').replace(/@/g, ''));

  const marr = findChild(rec, 'MARR');

  return {
    xref: rec.xref ?? '',
    husbandXref: husb,
    wifeXref: wife,
    childXrefs,
    marriageDate: marr ? findChildValue(marr, 'DATE') : undefined,
    marriagePlace: marr ? findChildValue(marr, 'PLAC') : undefined,
  };
}
