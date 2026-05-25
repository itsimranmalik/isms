/**
 * Client-side exporters: PDF (jsPDF) + Excel (SheetJS) + CSV (native).
 * Libraries loaded lazily from CDN to keep base page weight tiny.
 */

let _jsPDFLoaded, _xlsxLoaded;

function loadScript(src) {
    return new Promise((resolve, reject) => {
        if ([...document.scripts].some(s => s.src === src)) return resolve();
        const s = document.createElement('script');
        s.src = src; s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
    });
}
async function ensureJsPDF() {
    if (_jsPDFLoaded) return;
    await loadScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js');
    await loadScript('https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js');
    _jsPDFLoaded = true;
}
async function ensureXLSX() {
    if (_xlsxLoaded) return;
    await loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
    _xlsxLoaded = true;
}

/* ------------------------- Student report card PDF ------------------------ */
export async function exportStudentReportPdf({ student, recits, memoSummary, duaSummary, schoolName, logoUrl }) {
    await ensureJsPDF();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();

    // Header
    if (logoUrl) {
        try { doc.addImage(logoUrl, 'PNG', 14, 12, 22, 22); } catch (e) {}
    }
    doc.setFontSize(18); doc.setTextColor(5, 102, 86);
    doc.text(schoolName || 'Madrasa', W / 2, 22, { align: 'center' });
    doc.setFontSize(12); doc.setTextColor(80);
    doc.text('Student Progress Report', W / 2, 30, { align: 'center' });
    doc.setDrawColor(212, 175, 55); doc.line(14, 36, W - 14, 36);

    // Student box
    doc.setFontSize(11); doc.setTextColor(20);
    doc.text(`Student:   ${student.first_name} ${student.last_name} (${student.student_code})`, 14, 46);
    if (student.date_of_birth) doc.text(`DOB:       ${student.date_of_birth}`, 14, 53);
    if (student.guardian_name) doc.text(`Guardian:  ${student.guardian_name}`, 14, 60);
    doc.text(`Generated: ${new Date().toISOString().slice(0,10)}`, W - 14, 46, { align: 'right' });

    // Quran Recitation table
    // Build assessment rows with a per-grading trend vs the previous assessment.
    // recits is in chronological asc order (oldest -> newest). We compute the delta
    // and then reverse so the PDF shows newest first.
    const recitsAsc = (recits || []).slice();
    const enriched = recitsAsc.map((r, i) => {
        const g = r.quran_recitation_grades?.[0] || r.quran_recitation_grades || {};
        const prev = recitsAsc[i - 1];
        let trend = i === 0 ? 'first' : '';
        if (prev) {
            const diff = Number(r.overall_score || 0) - Number(prev.overall_score || 0);
            if (diff > 0.05)       trend = '+' + diff.toFixed(2);
            else if (diff < -0.05) trend = diff.toFixed(2);
            else                   trend = 'flat';
        }
        return { r, g, trend };
    }).reverse();   // newest first in the printed table

    doc.autoTable({
        startY: 68,
        head: [['Date', 'Fluency', 'Makharij', 'Tajweed', 'Waqf', 'Accuracy', 'Average', 'Grade', 'Trend']],
        body: enriched.map(({ r, g, trend }) => [
            r.assessed_on,
            g.fluency ?? '', g.makharij ?? '', g.tajweed ?? '', g.waqf ?? '', g.accuracy ?? '',
            r.overall_score ?? '', r.overall_grade ?? '', trend,
        ]),
        headStyles: { fillColor: [5, 102, 86] },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
        // Colour the trend cell: green for improvement, red for drop, grey for flat/first.
        didParseCell: (data) => {
            if (data.section !== 'body' || data.column.index !== 8) return;
            const v = String(data.cell.raw || '');
            if (v.startsWith('+'))       data.cell.styles.textColor = [5, 102, 86];
            else if (v.startsWith('-'))  data.cell.styles.textColor = [220, 38, 38];
            else                         data.cell.styles.textColor = [100, 116, 139];
        },
        didDrawPage: () => {
            doc.setFontSize(11); doc.setTextColor(5, 102, 86);
            doc.text('Quran Recitation', 14, doc.autoTable.previous?.startY ? doc.autoTable.previous.startY - 4 : 64);
        },
    });

    let y = doc.autoTable.previous.finalY + 10;
    doc.setFontSize(11); doc.setTextColor(5, 102, 86); doc.text('Memorisation', 14, y);
    doc.setFontSize(10); doc.setTextColor(40);
    y += 6;
    doc.text(`Ayahs memorised: ${memoSummary?.total || 0}  (${memoSummary?.percent || 0}% of Quran)`, 14, y); y += 6;
    doc.text(`Surahs completed: ${memoSummary?.completed || 0}`, 14, y); y += 8;

    doc.setFontSize(11); doc.setTextColor(5, 102, 86); doc.text('Duas Progress', 14, y); y += 6;
    doc.setFontSize(10); doc.setTextColor(40);
    Object.entries(duaSummary || {}).forEach(([cat, info]) => {
        doc.text(`${cat[0].toUpperCase()}${cat.slice(1)}: ${info.completed}/${info.total}  (${info.percent}%)`, 14, y);
        y += 6;
    });
    y += 6;

    // Signature lines
    doc.setDrawColor(180);
    doc.line(20, y, 80, y); doc.line(W - 80, y, W - 20, y);
    doc.setFontSize(9); doc.setTextColor(120);
    doc.text('Teacher signature', 50, y + 5, { align: 'center' });
    doc.text('Principal signature', W - 50, y + 5, { align: 'center' });

    doc.save(`report-${student.student_code}.pdf`);
}

/* ------------------------- Class snapshot XLSX --------------------------- */
export async function exportClassExcel({ className, rows }) {
    await ensureXLSX();
    const XLSX = window.XLSX;
    const data = [
        ['Class', className],
        [],
        ['Student ID', 'First Name', 'Last Name', 'Latest Average', 'Latest Grade'],
        ...rows.map(r => [r.student_id, r.first_name, r.last_name, r.latest_average ?? '', r.latest_grade ?? '']),
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `class-${className.replace(/\s+/g, '-').toLowerCase()}.xlsx`);
}

/* ------------------------- Class snapshot CSV ---------------------------- */
export function exportClassCsv({ className, rows }) {
    const lines = [
        ['Class', className],
        [],
        ['Student ID', 'First Name', 'Last Name', 'Latest Average', 'Latest Grade'],
        ...rows.map(r => [r.student_id, r.first_name, r.last_name, r.latest_average ?? '', r.latest_grade ?? '']),
    ];
    const csv = lines.map(row => row.map(v => {
        if (v == null) return '';
        const s = String(v).replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
    }).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `class-${className.replace(/\s+/g, '-').toLowerCase()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
