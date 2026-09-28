import { jsPDF } from 'jspdf';
import type { CaseBrief } from './supabase';

// Generates and downloads a formatted PDF for the FIR-ready case brief.
export function downloadBriefPDF(brief: CaseBrief, caseNumber: string, title: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 20;
  const usableW = W - margin * 2;
  let y = margin;

  function ensurePage(needed = 12) {
    if (y + needed > H - margin) {
      doc.addPage();
      y = margin;
      drawHeader();
    }
  }

  function drawHeader() {
    // Top bar
    doc.setFillColor(14, 165, 233); // sky-500
    doc.rect(0, 0, W, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('CHAKRAVIEW — CYBER FRAUD NETWORK ANALYZER', margin, 9.5);
    doc.text('CONFIDENTIAL — LAW ENFORCEMENT USE ONLY', W - margin, 9.5, { align: 'right' });
    doc.setTextColor(30, 35, 40);
    y = Math.max(y, 18);
  }

  function drawDivider(color: [number, number, number] = [226, 232, 240]) {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.3);
    doc.line(margin, y, W - margin, y);
    y += 4;
  }

  function text(str: string, fontSize: number, bold: boolean, color: [number, number, number] = [30, 35, 40], indent = 0) {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(str, usableW - indent);
    for (const line of lines) {
      ensurePage(fontSize * 0.4 + 2);
      doc.text(line, margin + indent, y);
      y += fontSize * 0.38 + 1.5;
    }
  }

  function badge(label: string, x: number, by: number, fillRgb: [number, number, number], textRgb: [number, number, number]) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    const tw = doc.getTextWidth(label) + 6;
    doc.setFillColor(...fillRgb);
    doc.roundedRect(x, by - 4.5, tw, 6, 1.5, 1.5, 'F');
    doc.setTextColor(...textRgb);
    doc.text(label, x + 3, by);
    return tw + 3;
  }

  // ── Cover block ──────────────────────────────────────────────────────────
  drawHeader();
  y = 22;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, usableW, 40, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, usableW, 40, 3, 3, 'S');

  y += 8;
  text('FIR-READY CASE BRIEF', 16, true, [14, 165, 233]);
  y += 1;
  text(`Case: ${caseNumber}`, 10, true, [30, 35, 40]);
  text(`Title: ${title}`, 9.5, false, [71, 85, 105]);
  y += 1;
  text(`Generated: ${new Date().toLocaleString('en-IN')}`, 8.5, false, [100, 116, 139]);
  y += 4;

  // Confidence + Kingpin badges
  let bx = margin + 3;
  bx += badge(`Confidence: ${brief.confidence}%`, bx, y, [254, 243, 199], [120, 53, 15]);
  if (brief.kingpin) {
    bx += badge(`Kingpin: ${brief.kingpin}`, bx, y, [254, 226, 226], [185, 28, 28]);
  }
  y += 12;

  drawDivider();

  // ── Sections ──────────────────────────────────────────────────────────────
  for (const section of brief.sections) {
    ensurePage(20);
    y += 2;
    doc.setFillColor(241, 245, 249);
    const headLines = doc.splitTextToSize(section.heading, usableW);
    const headH = headLines.length * 5.5 + 5;
    doc.roundedRect(margin, y - 4, usableW, headH, 2, 2, 'F');
    text(section.heading, 10.5, true, [15, 23, 42]);

    const bodyLines = section.body.split('\n');
    for (const line of bodyLines) {
      if (line.trim()) {
        const isBullet = /^\d+\./.test(line.trim());
        text(line.trim(), 9, false, [51, 65, 85], isBullet ? 4 : 0);
      } else {
        y += 2;
      }
    }
    y += 3;
    drawDivider();
  }

  // ── Statutes ──────────────────────────────────────────────────────────────
  ensurePage(30);
  y += 2;
  text('Statutory Provisions Invoked', 10.5, true, [15, 23, 42]);
  y += 1;
  let sx = margin;
  for (const st of brief.statutes) {
    const tw = doc.getTextWidth(st) + 8;
    if (sx + tw > W - margin) { sx = margin; y += 9; }
    badge(st, sx, y, [254, 243, 199], [120, 53, 15]);
    sx += tw + 4;
  }
  y += 10;
  drawDivider();

  // ── Recommended Actions ───────────────────────────────────────────────────
  ensurePage(20);
  y += 2;
  text('Recommended Actions', 10.5, true, [15, 23, 42]);
  for (let i = 0; i < brief.recommendedActions.length; i++) {
    const a = brief.recommendedActions[i];
    ensurePage(10);
    // Small numbered circle
    doc.setFillColor(14, 165, 233);
    doc.circle(margin + 3, y - 1.5, 2.5, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(String(i + 1), margin + 3, y - 0.5, { align: 'center' });
    doc.setTextColor(30, 35, 40);
    text(a, 9, false, [51, 65, 85], 8);
  }
  y += 4;

  // ── Footer on every page ──────────────────────────────────────────────────
  const total = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFillColor(241, 245, 249);
    doc.rect(0, H - 10, W, 10, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`ChakraView · IBM Bob × NFSU Hackathon · ${caseNumber}`, margin, H - 4);
    doc.text(`Page ${p} of ${total}`, W - margin, H - 4, { align: 'right' });
  }

  doc.save(`FIR_${caseNumber}.pdf`);
}
