# Family tree tracking software landscape (2026-02)

Last updated: 2026-02-24

## High-level overview

The market splits into four product types: (1) cloud genealogy platforms that combine a tree editor with huge record databases and hinting (Ancestry, MyHeritage, Findmypast, Geneanet), (2) collaborative “single world tree” systems where everyone edits the same ancestor graph (FamilySearch Family Tree, Geni, WikiTree), (3) desktop genealogy databases that focus on evidence, citations, reports and local control (Family Tree Maker, RootsMagic, Legacy, Family Historian, Heredis, Reunion, Gramps, Ahnenblatt), and (4) self-hosted family-tree web apps for privacy and family sharing (webtrees, TNG). Market leadership is clearest in online ecosystems: Ancestry (records + DNA scale), FamilySearch (largest collaborative tree, free), and MyHeritage (records + matching + strong media tools).

## What “family tree tracking software” usually needs to do

Core data model

- People and relationships: parent, child, spouse/partner, adoptive/step, etc.
- Events/facts: birth, death, marriage, residence, immigration, occupations.
- Place and date handling (often with mapping).
- Notes and research logs.
- Media: photos, documents, audio, sometimes video.
- Sources and citations: attach evidence to facts and people, then print/export clean citations.

Core workflows

- Build and edit a tree quickly.
- Attach evidence from records or uploads.
- De-duplicate and merge.
- Share with family, with privacy for living people.
- Export and back up (usually GEDCOM plus a separate media archive).

## Market leaders (ecosystem scale)

These are the most defensible “leaders” because they publish scale metrics.

| Platform         | Why it is a leader                                                                                            | Published scale indicators (not directly comparable)                                                                                                                                                                                                                                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ancestry**     | Biggest commercial genealogy ecosystem: records + subscriptions + consumer DNA network                        | Company facts: **65 billion records online** and **over 27 million** people in its DNA network ([Ancestry corporate facts](https://www.ancestry.com/corporate/about-ancestry/company-facts)). National Archives press release (2024) also cites **60+ billion records**, **3M+ subscribers**, **25M+ in DNA network** ([US National Archives](https://www.archives.gov/press/press-releases/2024/nr24-27)).     |
| **FamilySearch** | Largest collaborative family tree; free access model                                                          | 2025 highlights: FamilySearch Family Tree reached **1.8 billion searchable people**, with **467 million sources** added in 2025 ([FamilySearch newsroom](https://www.familysearch.org/en/newsroom/familysearch-2025-genealogy-highlights)). Family Tree Magazine also emphasizes it is free ([Family Tree Magazine on FamilySearch](https://familytreemagazine.com/websites/familysearch/familysearch-guide/)). |
| **MyHeritage**   | Large global platform with strong matching (trees + records + DNA) and heavy emphasis on photos/media tooling | 2025 Year in Review: **over 38 billion** historical records total after adding 6.6B in 2025 ([MyHeritage blog](https://blog.myheritage.com/2025/12/myheritage-2025-year-in-review/)). Smart Matches auto-search other trees for likely matches ([MyHeritage Education](https://education.myheritage.com/article/what-smart-matches-are-and-how-to-make-the-most-of-them/)).                                     |
| **Findmypast**   | Major UK/Ireland-focused subscription platform with tree + records + hints                                    | Product page claims **over 10 billion records** and tree building ([Findmypast family tree](https://www.findmypast.com/family-tree)). Tree privacy settings are user-controlled ([Findmypast help](https://www.findmypast.co.uk/help/articles/360009037118-is-my-findmypast-family-tree-public-or-private)).                                                                                                    |
| **Geneanet**     | Large Europe-focused tree + community + records; positioned as “largest European genealogy website”           | Geneanet homepage claims **5 million members** ([Geneanet](https://en.geneanet.org/)). Family Tree Magazine notes Geneanet’s large European focus and that it was acquired by Ancestry in 2021 ([Family Tree Magazine on Geneanet](https://familytreemagazine.com/heritage/french/geneanet/)).                                                                                                                  |
| **Geni**         | “Single world tree” collaboration; strong for connecting across users; owned by MyHeritage                    | Geni’s “World Family Tree” page shows **207,535,911** connected profiles ([Geni](https://www.geni.com/worldfamilytree/learn-more)).                                                                                                                                                                                                                                                                             |

Notes on interpreting “leadership”

- “Records” counts are marketing totals of indexed content, not unique people.
- Collaborative-tree “profiles” or “people” counts are graph nodes and can include duplicates/merges.
- DNA network sizes matter if your workflow includes genetic genealogy.

## Category map: pick the right product type first

### 1) Cloud platforms with private trees per user

Best when you want: easy UI, record hinting, sharing, less technical setup.
Tradeoff: data lock-in risk; exports can be imperfect.

Main players

- Ancestry
- MyHeritage
- Findmypast
- Geneanet

### 2) Collaborative “single world tree” platforms

Best when you want: collaboration at scale and connecting to distant cousins working on the same ancestors.
Tradeoff: shared editing creates merge mistakes, conflicts, and quality variance.

Main players

- FamilySearch Family Tree
- Geni
- WikiTree

### 3) Desktop genealogy databases (offline-first)

Best when you want: evidence discipline, local control, advanced charts/reports, research logging.
Tradeoff: steeper learning curve; collaboration/sharing is weaker unless paired with a cloud site.

Main players (active, widely used)

- Family Tree Maker (MacKiev)
- RootsMagic
- Legacy Family Tree
- Family Historian
- Heredis
- Reunion (Mac)
- Gramps (open source)
- Ahnenblatt (Windows, popular in Germany)

### 4) Self-hosted web apps

Best when you want: your own “family portal” under your control, private access, editing and media.
Tradeoff: you run the server, updates, backups, and auth.

Main players

- webtrees (open source)
- TNG (paid)

## Deep dive: major cloud platforms

### Ancestry (tree + records + DNA)

What it is

- A subscription platform combining a family tree editor with a very large record corpus and a very large consumer DNA matching network.

Tree tracking features (photos, notes, stories)

- Notes and comments exist and have different visibility rules (notes are visible to you and invited editors; comments follow tree privacy settings) ([Ancestry notes/comments](https://support.ancestry.com/s/article/Notes-and-Comments-in-Trees?language=en_US)).
- Stories can be uploaded and attached to individuals ([Ancestry stories](https://support.ancestry.com/s/article/Adding-Stories-to-a-Tree?language=en_US)).
- Photos/documents can be uploaded and attached ([Ancestry media upload](https://support.ancestry.co.uk/s/article/Uploading-Photos-or-Documents)).

Export and portability reality

- Ancestry uses GEDCOM for uploading/downloading trees.
- Their support docs explicitly state a GEDCOM file is text-only and **does not include photos/media** (with a newer nuance that post-Nov 2022 GEDCOM exports can include references to where media is stored on Ancestry for relinking on re-upload) ([Ancestry GEDCOM export](https://support.ancestry.com/s/article/Uploading-and-Downloading-Trees?language=en_US)).

Implication

- If your tree includes a lot of photos, you should treat GEDCOM exports as “structure + facts + sources,” not as a full backup.

### MyHeritage (tree + records + matching; strong media tools)

What it is

- A global genealogy platform with private family sites/trees, record searching, and automated matching across other trees.

Tree tracking features

- MyHeritage supports attaching a **note, citation, or photo to an existing fact** in a profile ([MyHeritage help](https://www.myheritage.com/help/en/articles/12878760-how-can-i-add-a-citation-note-or-photo-to-a-fact-in-my-family-tree-on-my-family-site)).
- “Smart Matches” automatically look for likely matches between the people you add and other MyHeritage trees ([MyHeritage Education](https://education.myheritage.com/article/what-smart-matches-are-and-how-to-make-the-most-of-them/)).

Privacy controls (high-level)

- MyHeritage documents default privacy behavior around living people and how other users can interact with your tree (guest visibility, membership requests, Smart Matches behavior) ([MyHeritage privacy education](https://education.myheritage.com/article/managing-your-privacy-on-myheritage/)).

Scale

- Official 2025 Year in Review cites **38B+** total historical records ([MyHeritage blog](https://blog.myheritage.com/2025/12/myheritage-2025-year-in-review/)).

### FamilySearch (free collaborative tree + memories)

What it is

- A free platform (funded by The Church of Jesus Christ of Latter-day Saints) with records and a shared, collaborative Family Tree.

Tree tracking features

- “Memories” lets you upload photos, documents and audio; you can also write a story and add images ([FamilySearch memories upload](https://www.familysearch.org/en/help/helpcenter/article/how-do-i-upload-photos-or-documents-to-memories)).
- Memories can also be used as sources in Family Tree (within copyright limits) ([FamilySearch memories as sources](https://www.familysearch.org/en/help/helpcenter/article/how-do-i-use-memories-as-sources-in-family-tree)).

Privacy model

- Living people are private to the user who created them; FamilySearch documents visibility limits and warns about attaching memories to living people, recommending private settings in some cases ([FamilySearch privacy help](https://www.familysearch.org/en/help/helpcenter/article/what-is-a-private-space-in-family-tree)).

Scale

- FamilySearch states its collaborative tree reached **1.8B searchable people** in 2025 ([FamilySearch newsroom](https://www.familysearch.org/en/newsroom/familysearch-2025-genealogy-highlights)).

### Findmypast (UK and Commonwealth strength)

What it is

- UK-based genealogy subscription platform (DC Thomson) with tree building plus heavy UK/Irish and Commonwealth coverage.

Tree tracking features

- Findmypast’s own product content emphasizes adding records, photos and facts to profiles ([Findmypast blog](https://www.findmypast.com/blog/family-tree/findmypast-family-tree-advanced-features)).

Privacy model

- Findmypast states your tree has privacy settings you control; no one can browse/search it “from anywhere else online,” and tree-to-tree hints are Findmypast member-only ([Findmypast privacy help](https://www.findmypast.co.uk/help/articles/360009037118-is-my-findmypast-family-tree-public-or-private)).

Scale

- Findmypast marketing page claims **over 10B records** ([Findmypast family tree](https://www.findmypast.com/family-tree)).

### Geneanet (Europe community focus)

What it is

- A Europe-focused genealogy site with strong community contribution around trees and attached documents.

Positioning

- Geneanet’s homepage claims **over 5M members** ([Geneanet](https://en.geneanet.org/)).
- It highlights user ownership: “you retain full ownership of your family tree and the documents you share” ([Geneanet](https://en.geneanet.org/)).

## Deep dive: collaborative “single world tree” platforms

### Geni

What it is

- A “World Family Tree” platform where users collaborate on a single connected graph.

Scale indicator

- Geni publishes connected profile count on its learn-more page ([Geni](https://www.geni.com/worldfamilytree/learn-more)).

Best-use pattern

- Use it when you want to connect your tree to broader shared ancestry and collaborate with others already working on the same lines.

### WikiTree

What it is

- Free, collaborative worldwide tree with one shared profile per person, edited by members.

Evidence culture

- WikiTree help material pushes strong sourcing norms for biographies and profiles ([WikiTree help](https://www.wikitree.com/wiki/Help%3ABiographies)).

## Deep dive: desktop genealogy software

Desktop tools become “market leaders” in practice when they do one of two things well:

1. act as your personal master database with evidence and reporting, and
2. sync well with at least one major cloud platform.

### Family Tree Maker 2024 (MacKiev)

Positioning

- Family Tree Maker is a long-running Windows/Mac desktop program; MacKiev markets FTM 2024 as the current version ([MacKiev FTM](https://www.mackiev.com/ftm/)).

Sync with Ancestry

- Ancestry and MacKiev replaced the old TreeSync with **FamilySync** in 2017 ([Ancestry FTM FAQ](https://support.ancestry.com/s/article/Family-Tree-Maker-FAQ?language=en_US)).
- MacKiev support states that most core content, including names, relationships, facts, sources/citations, repositories, and “most types of media,” is synced between FTM and Ancestry when using FamilySync ([MacKiev support](https://support.mackiev.com/017658-Comparing-FTM-and-Ancestry-Trees-when-using-FamilySync)).

Why people use it

- If your workflow is Ancestry-centric but you want a robust offline copy with media, citations and reports, FTM is one of the most direct paths.

### RootsMagic (current version line: RootsMagic 11)

Positioning

- RootsMagic markets a free “Essentials” plus a paid full version; its download page currently references **RootsMagic 11** ([RootsMagic try page](https://www.rootsmagic.com/rootsmagic/try)).

Ancestry integration

- RootsMagic’s official page describes using **TreeShare** with Ancestry to transfer people, events and media, with review/approval steps ([RootsMagic Ancestry integration](https://www.rootsmagic.com/Ancestry)).

FamilySearch integration

- RootsMagic states it is FamilySearch Certified and can connect to FamilySearch Family Tree to compare and transfer info and sources ([RootsMagic FamilySearch](https://www.rootsmagic.com/FamilySearch)).
- RootsMagic support notes an important structural limitation when transferring sources: FamilySearch attaches sources to people/families, not to events in the same way RootsMagic does ([RootsMagic support on source transfer](https://support.rootsmagic.com/hc/en-us/articles/224926967-Transferring-sources-between-RootsMagic-and-FamilySearch-Family-Tree)).

Core “tracking” features

- RootsMagic help docs explicitly cover citations and reports/charts, showing it is built around source discipline and publishing ([RootsMagic citations help](https://help.rootsmagic.com/RM9/citations.html), [RootsMagic reports/charts](https://help.rootsmagic.com/RM9/reports-and-charts.html)).

### Legacy Family Tree 10

Positioning

- Legacy markets version 10 as downloadable, with a “free” download callout on the homepage ([Legacy](https://legacyfamilytree.com/)).

Evidence/citation system

- Legacy’s feature documentation describes a full source citation system and Source Clipboard for efficiently assigning sources ([Legacy features](https://www.legacyfamilytree.se/WEB_US/legacy_features.htm)).

### MyHeritage Family Tree Builder (desktop)

Positioning

- MyHeritage offers a desktop program called Family Tree Builder, marketed as “used by millions,” that can build a tree and add photos/records ([MyHeritage FTB product page](https://www.myheritage.com/family-tree-builder)).

Sync model

- Family Tree Magazine’s software review notes the desktop tree can stay in sync with the online tree, and changes flow both ways (desktop to online and online to desktop) ([Family Tree Magazine review](https://familytreemagazine.com/resources/software/family-tree-builder/)).

### Family Historian 7 (UK)

Positioning

- Family Historian is a UK-focused desktop genealogy database; the vendor positions version 7 as “award-winning” and offers a trial ([Family Historian](https://www.family-historian.co.uk/)).

Media model

- The Family Historian user group knowledge base describes how adding media creates a Media record linked to the file (photos, video, audio, documents) ([FHUG KB](https://www.fhug.org.uk/kb/kb-article/quick-tour-of-family-historian-7/)).

### Heredis 2025 (cross-platform)

Positioning

- Cross-platform desktop + mobile genealogy software, strong in French-speaking markets.

Interoperability claim

- Heredis states its GEDCOM import/export includes media references like photos, videos, audio, PDFs, URLs, notes, etc ([Heredis features](https://home.heredis.com/en/all-features-in-detail/)).

### Reunion 14 (Mac)

Positioning

- Long-running Mac genealogy database program by Leister Productions.

Media linkage

- Reunion 14’s official “New Features” page lists the ability to link media to events, facts and marriages ([Reunion 14 features](https://www.leisterpro.com/doc/v14/newfeatures/new14features.php)).

### Gramps Desktop + Gramps Web (open source)

Positioning

- Gramps is the best-known open source genealogy database on desktop; Gramps Web adds web access/collaboration.

Data coverage

- Gramps Web lists record types including people, families, events, places, repositories, sources, citations, media objects and notes ([Gramps Web features](https://www.grampsweb.org/features/)).

## Deep dive: self-hosted family-tree web apps

### webtrees (open source)

Positioning

- Self-hosted web app that loads GEDCOMs and provides editing and privacy controls.

Feature scope

- webtrees lists individual/family pages with tabs for relatives, events, maps, stories, media, notes, sources, etc, and defines “media” broadly (photos, documents, videos, audio, links) ([webtrees features](https://webtrees.net/features/)).
- The GitHub project describes it as a leading online collaborative genealogy application that works from standard GEDCOM files ([webtrees GitHub](https://github.com/fisharebest/webtrees)).

### TNG (The Next Generation of Genealogy Sitebuilding)

Positioning

- Paid, self-hosted PHP/MySQL product for putting your family tree on your own website.

Feature scope

- TNG lists GEDCOM import/export, admin, charts/reports, private data via user rights, and uploading photos/documents ([TNG features](https://tngsitebuilding.com/features.php)).

## Interoperability: GEDCOM and the media problem

Key facts

- GEDCOM is the de facto interchange format; FamilySearch maintains the modern specification repository at gedcom.io ([GEDCOM specs](https://gedcom.io/specs/)).
- FamilySearch states GEDCOM 7.0 was released in 2021 and is the most recent major update, while 5.5 and 5.5.1 remain common in the market ([FamilySearch GEDCOM](https://www.familysearch.org/en/gedcom/)).
- Ancestry’s help docs explicitly warn GEDCOM exports are text-only and do not include photos/media ([Ancestry GEDCOM export](https://support.ancestry.com/s/article/Uploading-and-Downloading-Trees?language=en_US)).

Practical implication

- A “real backup” is usually:
  1. GEDCOM export (structure, facts, sources), plus
  2. a separate media folder export/download, plus
  3. periodic full database backups if your desktop tool supports it.

## Decision criteria (overview, not a recommendation)

Use-case to feature mapping

- Heavy record-hinting workflow: cloud platform strength (Ancestry, MyHeritage, Findmypast).
- Single shared “world tree” collaboration: FamilySearch, Geni, WikiTree.
- Evidence discipline and publishing (reports, books, charts): desktop tools (RootsMagic, FTM, Legacy, Family Historian, Heredis, Reunion, Gramps).
- Maximum privacy/control and a “family portal”: self-hosted webtrees or TNG.
- If your tree is photo-heavy: prefer systems that explicitly manage media well and avoid assuming GEDCOM exports carry media.

## Primary sources used

- Ancestry corporate facts: https://www.ancestry.com/corporate/about-ancestry/company-facts
- US National Archives press release mentioning Ancestry scale: https://www.archives.gov/press/press-releases/2024/nr24-27
- Ancestry tree features: notes/comments, stories, media upload, GEDCOM export
  - https://support.ancestry.com/s/article/Notes-and-Comments-in-Trees?language=en_US
  - https://support.ancestry.com/s/article/Adding-Stories-to-a-Tree?language=en_US
  - https://support.ancestry.co.uk/s/article/Uploading-Photos-or-Documents
  - https://support.ancestry.com/s/article/Uploading-and-Downloading-Trees?language=en_US
- FamilySearch 2025 genealogy highlights: https://www.familysearch.org/en/newsroom/familysearch-2025-genealogy-highlights
- FamilySearch memories and privacy docs
  - https://www.familysearch.org/en/help/helpcenter/article/how-do-i-upload-photos-or-documents-to-memories
  - https://www.familysearch.org/en/help/helpcenter/article/how-do-i-use-memories-as-sources-in-family-tree
  - https://www.familysearch.org/en/help/helpcenter/article/what-is-a-private-space-in-family-tree
- MyHeritage scale and features
  - https://blog.myheritage.com/2025/12/myheritage-2025-year-in-review/
  - https://education.myheritage.com/article/what-smart-matches-are-and-how-to-make-the-most-of-them/
  - https://www.myheritage.com/help/en/articles/12878760-how-can-i-add-a-citation-note-or-photo-to-a-fact-in-my-family-tree-on-my-family-site
  - https://education.myheritage.com/article/managing-your-privacy-on-myheritage/
  - https://www.myheritage.com/family-tree-builder
- Findmypast tree, privacy and feature blog
  - https://www.findmypast.com/family-tree
  - https://www.findmypast.co.uk/help/articles/360009037118-is-my-findmypast-family-tree-public-or-private
  - https://www.findmypast.com/blog/family-tree/findmypast-family-tree-advanced-features
- Geneanet positioning
  - https://en.geneanet.org/
  - https://familytreemagazine.com/heritage/french/geneanet/
- Geni world tree scale: https://www.geni.com/worldfamilytree/learn-more
- RootsMagic integrations and feature docs
  - https://www.rootsmagic.com/rootsmagic/try
  - https://www.rootsmagic.com/Ancestry
  - https://www.rootsmagic.com/FamilySearch
  - https://help.rootsmagic.com/RM9/citations.html
  - https://help.rootsmagic.com/RM9/reports-and-charts.html
  - https://support.rootsmagic.com/hc/en-us/articles/224926967-Transferring-sources-between-RootsMagic-and-FamilySearch-Family-Tree
- Family Tree Maker
  - https://www.mackiev.com/ftm/
  - https://support.mackiev.com/017658-Comparing-FTM-and-Ancestry-Trees-when-using-FamilySync
  - https://support.ancestry.com/s/article/Family-Tree-Maker-FAQ?language=en_US
- Legacy
  - https://legacyfamilytree.com/
  - https://www.legacyfamilytree.se/WEB_US/legacy_features.htm
- Family Historian
  - https://www.family-historian.co.uk/
  - https://www.fhug.org.uk/kb/kb-article/quick-tour-of-family-historian-7/
- Heredis GEDCOM/media claim: https://home.heredis.com/en/all-features-in-detail/
- Reunion 14 media features: https://www.leisterpro.com/doc/v14/newfeatures/new14features.php
- Gramps Web features: https://www.grampsweb.org/features/
- webtrees + TNG
  - https://webtrees.net/features/
  - https://github.com/fisharebest/webtrees
  - https://tngsitebuilding.com/features.php
- GEDCOM specification hub: https://gedcom.io/specs/
- FamilySearch GEDCOM overview: https://www.familysearch.org/en/gedcom/
