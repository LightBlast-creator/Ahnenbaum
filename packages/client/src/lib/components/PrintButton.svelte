<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import * as m from '$lib/paraglide/messages';
  import { getTreeBounds, type PositionedNode } from '$lib/utils/tree-layout';
  import { CARD_WIDTH, CARD_HALF_HEIGHT } from '$lib/utils/tree-constants';

  interface Props {
    /** 'page' calls window.print(); 'tree' extracts SVG into a print-ready window */
    mode?: 'page' | 'tree';
    /** SVG element ref — required when mode="tree" */
    svgElement?: SVGSVGElement;
    /** Visible nodes for computing tree bounds — required when mode="tree" */
    nodes?: PositionedNode[];
    /** Optional extra CSS class */
    class?: string;
  }

  let { mode = 'page', svgElement, nodes = [], class: className = '' }: Props = $props();

  const label = $derived(mode === 'tree' ? m.print_tree() : m.print_page());

  function handlePrint() {
    if (mode === 'page') {
      window.print();
      return;
    }

    // ── Tree mode: poster tile print ──
    if (!svgElement) {
      console.warn('[PrintButton] mode="tree" requires svgElement prop');
      window.print();
      return;
    }

    // Calculate full tree bounds
    const bounds = getTreeBounds(nodes);
    const padding = 80;
    const treeX = bounds.minX - CARD_WIDTH / 2 - padding;
    const treeY = bounds.minY - CARD_HALF_HEIGHT - padding;
    const treeW = bounds.width + CARD_WIDTH + padding * 2;
    const treeH = bounds.height + CARD_HALF_HEIGHT * 2 + padding * 2;

    // ── Determine tile grid ──
    // A4 landscape printable area ≈ 277mm × 180mm (with 10mm margins)
    // We want person cards (200 SVG units) to be ≈ 30mm on paper minimum
    const MIN_CARD_MM = 30;
    const PAGE_W_MM = 277;
    const PAGE_H_MM = 180;
    const svgUnitsPerMm = CARD_WIDTH / MIN_CARD_MM; // ≈ 6.67

    // How many SVG units fit on one page at readable scale
    const pageViewW = PAGE_W_MM * svgUnitsPerMm;
    const pageViewH = PAGE_H_MM * svgUnitsPerMm;

    // Overlap between tiles (in SVG units) for registration
    const overlapFraction = 0.05;
    const overlapX = pageViewW * overlapFraction;
    const overlapY = pageViewH * overlapFraction;

    // Effective step per tile (minus overlap on both sides)
    const stepX = pageViewW - overlapX * 2;
    const stepY = pageViewH - overlapY * 2;

    // Calculate grid size
    const cols = Math.max(1, Math.ceil(treeW / stepX));
    const rows = Math.max(1, Math.ceil(treeH / stepY));
    const totalPages = cols * rows;

    // Prepare SVG clone without pan/zoom transform
    const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
    const innerG = svgClone.querySelector('g[transform]');
    if (innerG) innerG.removeAttribute('transform');
    const svgContent = svgClone.innerHTML;

    // Generate tile pages
    let pages = '';
    let pageNum = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        pageNum++;
        const vx = treeX + col * stepX - overlapX;
        const vy = treeY + row * stepY - overlapY;

        const posLabel =
          totalPages > 1
            ? `<span class="tile-pos">↗ ${m.print_page()} ${pageNum}/${totalPages} — R${row + 1}C${col + 1}</span>`
            : '';

        const cropMarks =
          totalPages > 1
            ? `
          <div class="crop-mark crop-tl"></div>
          <div class="crop-mark crop-tr"></div>
          <div class="crop-mark crop-bl"></div>
          <div class="crop-mark crop-br"></div>
        `
            : '';

        pages += `
          <div class="tile-page">
            ${cropMarks}
            <svg xmlns="http://www.w3.org/2000/svg"
                 viewBox="${vx} ${vy} ${pageViewW} ${pageViewH}"
                 width="100%" height="100%"
                 preserveAspectRatio="xMidYMid meet">
              ${svgContent}
            </svg>
            <div class="tile-footer">
              <span>🌳 ${m.tree_title()} — ${new Date().toLocaleDateString()}</span>
              ${posLabel}
            </div>
          </div>`;
      }
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${m.print_tree()} — ${m.app_title()}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      font-family: 'Inter', system-ui, sans-serif;
      background: #fff;
    }
    .tile-page {
      position: relative;
      width: 100%;
      height: 100vh;
      display: flex;
      flex-direction: column;
      padding: 8mm;
      page-break-after: always;
      overflow: hidden;
    }
    .tile-page:last-child {
      page-break-after: auto;
    }
    .tile-page svg {
      flex: 1;
      min-height: 0;
      display: block;
    }
    svg * {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .tile-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 3mm;
      border-top: 0.5px solid #ddd;
      font-size: 8pt;
      color: #999;
      flex-shrink: 0;
    }
    .tile-pos {
      font-weight: 600;
      color: #666;
      font-size: 9pt;
    }
    /* Crop marks for multi-page assembly */
    .crop-mark {
      position: absolute;
      width: 12mm;
      height: 12mm;
      pointer-events: none;
    }
    .crop-tl { top: 3mm; left: 3mm; border-top: 0.5px solid #999; border-left: 0.5px solid #999; }
    .crop-tr { top: 3mm; right: 3mm; border-top: 0.5px solid #999; border-right: 0.5px solid #999; }
    .crop-bl { bottom: 3mm; left: 3mm; border-bottom: 0.5px solid #999; border-left: 0.5px solid #999; }
    .crop-br { bottom: 3mm; right: 3mm; border-bottom: 0.5px solid #999; border-right: 0.5px solid #999; }
    @page {
      size: landscape;
      margin: 0;
    }
    @media print {
      .tile-page { padding: 5mm; }
    }
    /* Assembly overview (screen only, first thing user sees) */
    .assembly-guide {
      padding: 2cm;
      text-align: center;
      page-break-after: always;
    }
    .assembly-guide h1 { font-size: 18pt; margin-bottom: 0.5cm; color: #333; }
    .assembly-guide p { font-size: 11pt; color: #666; margin-bottom: 1cm; }
    .grid-preview {
      display: inline-grid;
      grid-template-columns: repeat(${cols}, 60px);
      gap: 4px;
      margin: 0 auto;
    }
    .grid-cell {
      width: 60px;
      height: 40px;
      border: 1px solid #ccc;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9pt;
      color: #666;
      background: #f8f8f8;
      border-radius: 3px;
    }
    @media print {
      .assembly-guide { display: none; }
    }
  </style>
</head>
<body>
  ${
    totalPages > 1
      ? `
  <div class="assembly-guide">
    <h1>🌳 ${m.print_tree()}</h1>
    <p>${totalPages} ${m.print_page().toLowerCase()}s — ${cols} × ${rows} grid. Print all pages and assemble.</p>
    <div class="grid-preview">
      ${Array.from({ length: totalPages }, (_, i) => `<div class="grid-cell">${i + 1}</div>`).join('')}
    </div>
    <p style="margin-top:1cm;font-size:10pt;color:#999;">This guide page won't be printed. Click Print to continue.</p>
  </div>`
      : ''
  }
  ${pages}
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  ${'<'}${'/' + 'script>'}
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  }
</script>

<button class="print-btn {className}" onclick={handlePrint} aria-label={label} title={label}>
  <Icon name="printer" size={18} />
</button>

<style>
  .print-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-2, 8px) var(--space-3, 12px);
    border-radius: var(--radius-md, 8px);
    color: var(--color-text-secondary, #475569);
    transition: all var(--transition-fast, 150ms ease);
    font-size: var(--font-size-sm, 14px);
    cursor: pointer;
  }

  .print-btn:hover {
    background: var(--color-surface-hover, #f8fafc);
    color: var(--color-text, #0f172a);
  }

  @media print {
    .print-btn {
      display: none !important;
    }
  }
</style>
