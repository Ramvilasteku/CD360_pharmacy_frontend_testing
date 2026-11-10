// Minimal typesetting engine on top of pdf-lib that reproduces the original Word layout:
// Times-metric font at 10.8 pt, 1" side margins, Word-style greedy line breaking,
// two-column shaded tables and the original vector letterhead under every page.
import {
  PDFDocument, PDFArray, PDFNumber, PDFOperator, PDFOperatorNames, rgb,
  pushGraphicsState, popGraphicsState, beginText, endText, setFillingColor, setFontAndSize, moveText,
} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { buildDocument } from './content.js';
import { HINTED_PX } from './advances.js';

const PX = 0.6; // one device pixel of the original (120 dpi) in points
// The original was laid out with linear font widths against ~98% of the column width,
// then drawn with pixel-snapped glyph advances (inter-word spaces squeezed to fit).
const WRAP_SCALE = 0.9805;

export const GEOM = {
  topBaseline: 118.88, // first baseline on a page
  maxBaseline: 717, // lowest allowed baseline before the footer band
  left: 72.08,
  right: 523.2,
  line: 12.66, // paragraph line pitch
  size: 10.8,
  supSize: 7.2,
  supRise: 3.03,
  table: { x0: 70.88, split: 272.68, x1: 524.95, pad: 5.4, line: 12.63, ascent: 10.2 },
  fills: [rgb(0.969, 0.976, 0.988), rgb(0.902, 0.929, 0.973)],
};

const BLACK = rgb(0, 0, 0);
const BREAK_AFTER = new Set(['-', '–', '—']);

class Layout {
  constructor(doc, { fonts, letterhead, images, width, height }) {
    Object.assign(this, { doc, fonts, letterhead, images, W: width, H: height });
    this.page = null;
    this.y = 0;
    this.atTop = true;
    this.charsets = {};
    this.missing = new Set();
    this.advCache = new Map();
  }

  newPage() {
    this.page = this.doc.addPage([this.W, this.H]);
    this.page.drawPage(this.letterhead, { x: 0, y: 0, width: this.W, height: this.H });
    this.atTop = true;
    this.y = 0;
  }

  font(style) {
    return this.fonts[style] || this.fonts.R;
  }

  // Replace characters the font cannot draw (e.g. Devanagari/Telugu) so the PDF never shows boxes.
  clean(text, style) {
    if (!this.charsets[style]) this.charsets[style] = new Set(this.font(style).getCharacterSet());
    const cs = this.charsets[style];
    let out = '';
    for (const ch of text) {
      if (ch === '\n' || cs.has(ch.codePointAt(0))) out += ch;
      else {
        this.missing.add(ch);
        out += '?';
      }
    }
    return out;
  }

  /** Advance of one character in points, snapped to the original's 120-dpi pixel grid. */
  adv(ch, style, sup) {
    const k = `${style}${sup ? '^' : ''}${ch}`;
    let a = this.advCache.get(k);
    if (a === undefined) {
      const size = sup ? GEOM.supSize : GEOM.size;
      const table = !sup && HINTED_PX[style];
      const px = table && table[ch] !== undefined
        ? table[ch]
        : Math.round(this.font(style).widthOfTextAtSize(ch, size) / PX + 1e-6);
      a = px * PX;
      this.advCache.set(k, a);
    }
    return a;
  }

  /** Rendered (pixel-snapped) width. */
  width(text, style, sup) {
    let w = 0;
    for (const ch of text) w += this.adv(ch, style, sup);
    return w;
  }

  /** Linear (layout) width used for line breaking. */
  lin(text, style, sup) {
    return this.font(style).widthOfTextAtSize(text, sup ? GEOM.supSize : GEOM.size);
  }

  /** Split runs into boxes (unbreakable) separated by glue (spaces / break-after-dash / hard breaks). */
  tokenize(runs) {
    const tokens = [];
    let box = null;
    const pushPiece = (target, ch, run) => {
      const last = target.pieces[target.pieces.length - 1];
      if (last && last.s === run.s && !!last.sup === !!run.sup) last.t += ch;
      else target.pieces.push({ t: ch, s: run.s, sup: !!run.sup });
    };
    const closeBox = () => {
      if (box) {
        box.width = box.pieces.reduce((a, p) => a + this.lin(p.t, p.s, p.sup), 0);
        tokens.push(box);
        box = null;
      }
    };
    for (const raw of runs) {
      const run = typeof raw === 'string' ? { t: raw, s: 'R' } : { s: 'R', ...raw };
      const text = this.clean(String(run.t ?? ''), run.s);
      const chars = Array.from(text);
      chars.forEach((ch, i) => {
        if (ch === '\n') {
          closeBox();
          tokens.push({ kind: 'br' });
        } else if (ch === ' ' || ch === '\t') {
          closeBox();
          const prev = tokens[tokens.length - 1];
          const w = this.lin(' ', run.s, run.sup);
          if (prev && prev.kind === 'glue') {
            prev.width += w;
            pushPiece(prev, ' ', run);
          } else tokens.push({ kind: 'glue', width: w, pieces: [{ t: ' ', s: run.s, sup: !!run.sup }] });
        } else {
          if (!box) box = { kind: 'box', pieces: [] };
          pushPiece(box, ch, run);
          const next = chars[i + 1];
          if (BREAK_AFTER.has(ch) && next && next !== ' ') {
            closeBox();
            tokens.push({ kind: 'glue', width: 0, pieces: [] });
          }
        }
      });
    }
    closeBox();
    return tokens;
  }

  /** Word-style greedy line breaking. Returns [{ pieces, width }]. */
  wrap(runs, columnWidth) {
    const maxWidth = columnWidth * WRAP_SCALE;
    const lines = [];
    let cur = { pieces: [], width: 0 };
    let glue = null;
    const flush = () => {
      lines.push(cur);
      cur = { pieces: [], width: 0 };
      glue = null;
    };
    const addBox = (bx) => {
      if (cur.pieces.length && glue) {
        cur.pieces.push(...glue.pieces);
        cur.width += glue.width;
      }
      cur.pieces.push(...bx.pieces);
      cur.width += bx.width;
      glue = null;
    };
    for (const tk of this.tokenize(runs)) {
      if (tk.kind === 'br') {
        flush();
      } else if (tk.kind === 'glue') {
        if (cur.pieces.length) {
          glue = glue ? { width: glue.width + tk.width, pieces: [...glue.pieces, ...tk.pieces] } : { ...tk };
        }
      } else {
        const need = (cur.pieces.length && glue ? glue.width : 0) + tk.width;
        if (!cur.pieces.length || cur.width + need <= maxWidth + 0.01) {
          addBox(tk);
        } else {
          flush();
          addBox(tk);
        }
        // A single word wider than the column: break it by characters.
        while (cur.width > maxWidth + 0.01 && cur.pieces.length) {
          const split = this.splitOverlong(cur, maxWidth);
          if (!split) break;
          lines.push(split.head);
          cur = split.tail;
        }
      }
    }
    if (cur.pieces.length || !lines.length) lines.push(cur);
    return lines;
  }

  splitOverlong(line, maxWidth) {
    const head = { pieces: [], width: 0 };
    const chars = [];
    line.pieces.forEach((p) => Array.from(p.t).forEach((c) => chars.push({ t: c, s: p.s, sup: p.sup })));
    let i = 0;
    for (; i < chars.length; i++) {
      const w = this.lin(chars[i].t, chars[i].s, chars[i].sup);
      if (head.width + w > maxWidth && head.pieces.length) break;
      head.pieces.push(chars[i]);
      head.width += w;
    }
    if (i >= chars.length) return null;
    const tail = { pieces: chars.slice(i), width: 0 };
    tail.width = tail.pieces.reduce((a, c) => a + this.lin(c.t, c.s, c.sup), 0);
    return { head, tail };
  }

  /** Rendered width of a wrapped line (pixel-snapped glyphs, spaces squeezed to fit `avail`). */
  lineMetrics(line, avail) {
    let total = 0;
    let spaces = 0;
    for (const p of line.pieces) {
      for (const ch of p.t) {
        total += this.adv(ch, p.s, p.sup);
        if (ch === ' ') spaces += 1;
      }
    }
    const squeeze = total > avail && spaces ? Math.min((total - avail) / spaces, 2.4) : 0;
    return { width: total - squeeze * spaces, squeeze };
  }

  drawLine(line, x, baseline, avail) {
    const { squeeze } = this.lineMetrics(line, avail);
    let cx = x;
    const merged = [];
    for (const p of line.pieces) {
      const last = merged[merged.length - 1];
      if (last && last.s === p.s && last.sup === p.sup) last.t += p.t;
      else merged.push({ ...p });
    }
    for (const p of merged) {
      const advs = Array.from(p.t, (ch) => this.adv(ch, p.s, p.sup) - (ch === ' ' ? squeeze : 0));
      if (p.t.trim()) this.showText(p, advs, cx, this.H - baseline + (p.sup ? GEOM.supRise : 0));
      cx += advs.reduce((a, b) => a + b, 0);
    }
  }

  /** Draws a run with a TJ array so every glyph lands on the pixel-snapped advance. */
  showText(p, advs, x, y) {
    const size = p.sup ? GEOM.supSize : GEOM.size;
    const font = this.font(p.s);
    const arr = PDFArray.withContext(this.doc.context);
    Array.from(p.t).forEach((ch, i) => {
      arr.push(font.encodeText(ch));
      const linear = font.widthOfTextAtSize(ch, size);
      const adj = ((linear - advs[i]) * 1000) / size;
      if (Math.abs(adj) > 1e-3) arr.push(PDFNumber.of(Math.round(adj * 1000) / 1000));
    });
    const key = this.page.node.newFontDictionary(font.name, font.ref);
    this.page.pushOperators(
      pushGraphicsState(),
      beginText(),
      setFillingColor(BLACK),
      setFontAndSize(key, size),
      moveText(x, y),
      PDFOperator.of(PDFOperatorNames.ShowTextAdjusted, [arr]),
      endText(),
      popGraphicsState(),
    );
  }

  // ------------------------------------------------------------ blocks
  para(block, next) {
    const maxW = GEOM.right - GEOM.left;
    const lines = this.wrap(block.runs, maxW);
    const gap = block.gap ?? GEOM.line;
    if (!this.page) this.newPage();
    let base = this.atTop ? GEOM.topBaseline + (block.pageTopOffset || 0) : this.y + gap;

    // keep headings with the first line of what follows
    if (block.keepWithNext && !this.atTop && next) {
      const nextGap = next.gap ?? GEOM.line;
      const nextFirst = next.type === 'table' ? nextGap + GEOM.table.ascent : nextGap;
      if (base + (lines.length - 1) * GEOM.line + nextFirst > GEOM.maxBaseline) {
        this.newPage();
        base = GEOM.topBaseline;
      }
    }

    let i = 0;
    while (i < lines.length) {
      const remaining = lines.length - i;
      const room = base > GEOM.maxBaseline ? 0 : Math.floor((GEOM.maxBaseline - base) / GEOM.line) + 1;
      let fit = room;
      if (fit >= remaining) fit = remaining;
      else {
        // widow / orphan control: never leave a single line alone on either side of a break
        if (remaining - fit === 1) fit -= 1;
        if (fit === 1) fit = 0;
        if (fit <= 0 && this.atTop) fit = Math.max(1, room); // fresh page: must place something
      }
      for (let k = 0; k < fit; k++, i++) {
        const ln = lines[i];
        const x = block.align === 'center' ? (this.W - this.lineMetrics(ln, maxW).width) / 2 : GEOM.left;
        this.drawLine(ln, x, base, maxW);
        this.y = base;
        this.atTop = false;
        base += GEOM.line;
      }
      if (i < lines.length) {
        this.newPage();
        base = GEOM.topBaseline;
      }
    }
  }

  table(block) {
    const T = GEOM.table;
    const cols = [
      { x: T.x0 + T.pad, w: T.split - T.x0 - 2 * T.pad },
      { x: T.split + T.pad, w: T.x1 - T.split - 2 * T.pad },
    ];
    if (!this.page) this.newPage();
    let top = this.atTop ? GEOM.topBaseline - T.ascent : this.y + (block.gap ?? 0);

    block.rows.forEach((row, ri) => {
      const cells = row.cells.map((runs, ci) => this.wrap(runs, cols[ci].w));
      const maxLines = Math.max(...cells.map((c) => c.length));
      const h = Math.max(row.minHeight || 0, maxLines * T.line);
      if (top + h - T.line + T.ascent > GEOM.maxBaseline + 0.01 && !this.atTop) {
        this.newPage();
        top = GEOM.topBaseline - T.ascent;
      }
      this.page.drawRectangle({
        x: T.x0, y: this.H - top - h, width: T.x1 - T.x0, height: h,
        color: GEOM.fills[ri % 2], borderWidth: 0,
      });
      (row.images || []).forEach((im) => {
        const img = this.images[im.name];
        if (img) this.page.drawImage(img, { x: im.x, y: this.H - (top + im.dy) - im.h, width: im.w, height: im.h });
      });
      cells.forEach((lines, ci) => {
        const valign = (row.valign && row.valign[ci]) || 'center';
        const offset = valign === 'center' ? (h - lines.length * T.line) / 2 : 0;
        lines.forEach((ln, li) => this.drawLine(ln, cols[ci].x, top + offset + T.ascent + li * T.line, cols[ci].w));
      });
      top += h;
      this.atTop = false;
    });
    this.y = top;
  }

  render(blocks) {
    blocks.forEach((b, i) => {
      if (b.type === 'pageBreak') this.newPage();
      else if (b.type === 'table') this.table(b);
      else this.para(b, blocks[i + 1]);
    });
  }
}

// ------------------------------------------------------------ assets
const cache = new Map();

/** Loads fonts, the letterhead PDF and signature images once (from your public folder). */
export function loadAgreementAssets(base = '/agreement-assets') {
  if (!cache.has(base)) {
    const get = (f) => fetch(`${base.replace(/\/$/, '')}/${f}`).then((r) => {
      if (!r.ok) throw new Error(`Could not load ${f} (${r.status})`);
      return r.arrayBuffer();
    });
    const p = Promise.all([
      get('letterhead.pdf'), get('Tinos-Regular.ttf'), get('Tinos-Bold.ttf'),
      get('Tinos-Italic.ttf'), get('stamp.png'), get('signature.png'),
    ]).then(([letterhead, regular, bold, italic, stamp, signature]) => ({
      letterhead, regular, bold, italic, stamp, signature,
    }));
    p.catch(() => cache.delete(base));
    cache.set(base, p);
  }
  return cache.get(base);
}

/**
 * Builds the filled agreement. Returns { bytes: Uint8Array, missingChars: string[] }.
 * `assets` comes from loadAgreementAssets().
 */
export async function generateAgreementPdf(values, assets) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const opts = { subset: false, features: { liga: false, kern: false } };
  const fonts = {
    R: await doc.embedFont(assets.regular, opts),
    B: await doc.embedFont(assets.bold, opts),
    I: await doc.embedFont(assets.italic, opts),
  };
  const [letterhead] = await doc.embedPdf(assets.letterhead, [0]);
  const images = {
    stamp: await doc.embedPng(assets.stamp),
    signature: await doc.embedPng(assets.signature),
  };
  const layout = new Layout(doc, { fonts, letterhead, images, width: letterhead.width, height: letterhead.height });
  layout.render(buildDocument(values));

  const who = [values.clientName, values.clinicName].filter(Boolean).join(' – ');
  doc.setTitle(`Service Agreement${who ? ` – ${who}` : ''}`);
  doc.setAuthor('Ridgeveda Solutions Pvt Ltd');
  doc.setCreator('Ridgeveda Service Agreement Generator');
  doc.setProducer('Ridgeveda Solutions Pvt Ltd');
  return { bytes: await doc.save(), missingChars: [...layout.missing] };
}
