import type { VoteResult, SessionMode } from './types';

export async function generatePdf(
  history: VoteResult[],
  title: string,
  voterCount: number,
  mode: SessionMode,
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  const pageW = doc.internal.pageSize.getWidth();
  let y = 20;

  // Title
  doc.setFontSize(18);
  doc.setTextColor(227, 6, 19); // DRK red
  doc.text('DRK Vereinsabstimmung', pageW / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(14);
  doc.setTextColor(42, 42, 42);
  doc.text(title, pageW / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(119, 119, 119);
  const modeLabel = mode === 'stimmkarten' ? 'Stimmkarten' : 'Offene Abstimmung';
  doc.text(`Modus: ${modeLabel} | Stimmberechtigte: ${voterCount}`, pageW / 2, y, { align: 'center' });
  y += 12;

  // Votes
  history.forEach((result, idx) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    // Vote header
    doc.setFontSize(12);
    doc.setTextColor(42, 42, 42);
    doc.text(`${idx + 1}. ${result.topic}`, 14, y);
    y += 6;

    if (result.description) {
      doc.setFontSize(9);
      doc.setTextColor(119, 119, 119);
      const lines = doc.splitTextToSize(result.description, pageW - 28);
      doc.text(lines, 14, y);
      y += lines.length * 4 + 2;
    }

    // Results
    doc.setFontSize(10);
    doc.setTextColor(42, 42, 42);
    result.options.forEach((opt) => {
      const count = result.votes[opt] || 0;
      const pct = result.totalCast > 0 ? ((count / result.totalCast) * 100).toFixed(1) : '0.0';
      doc.text(`${opt}: ${count} (${pct}%)`, 20, y);
      y += 5;
    });

    // Not voted
    doc.setFontSize(9);
    doc.setTextColor(119, 119, 119);
    doc.text(`Nicht abgestimmt: ${result.notVoted}`, 20, y);
    y += 5;

    // Outcome
    doc.setFontSize(10);
    let outcomeText = '';
    let outcomeColor: [number, number, number] = [42, 42, 42];
    switch (result.outcome) {
      case 'accepted':
        outcomeText = 'ANGENOMMEN';
        outcomeColor = [46, 125, 50];
        break;
      case 'rejected':
        outcomeText = 'ABGELEHNT';
        outcomeColor = [198, 40, 40];
        break;
      case 'tie':
        outcomeText = 'STIMMENGLEICHHEIT';
        outcomeColor = [249, 168, 37];
        break;
      case 'custom-winner':
        outcomeText = `Gewinner: ${result.winner || '(unbekannt)'}`;
        outcomeColor = [46, 125, 50];
        break;
    }
    doc.setTextColor(...outcomeColor);
    doc.text(`Ergebnis: ${outcomeText}`, 20, y);
    y += 10;
  });

  // Footer
  if (y > 270) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(8);
  doc.setTextColor(119, 119, 119);
  doc.text(
    `Erstellt am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')}`,
    pageW / 2,
    y,
    { align: 'center' },
  );

  doc.save(`Abstimmung_${title.replace(/\s+/g, '_')}.pdf`);
}
