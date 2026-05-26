/* Help view — loads the role-appropriate handbook from the repo and renders it. */
export const title = 'Help';

const HANDBOOK_BY_ROLE = {
    admin:   'ADMIN.md',
    teacher: 'TEACHER.md',
    student: 'STUDENT.md',
    parent:  'STUDENT.md',  // parents see the student-oriented guide for now
};

// Where the handbooks live. Site is served from the repo so we can fetch them
// straight from the same origin.
const DOCS_BASE = './docs/';

export async function render(root, { profile }) {
    const file = HANDBOOK_BY_ROLE[profile.role] || 'STUDENT.md';
    const url  = DOCS_BASE + file;

    root.innerHTML = `
        <div class="toolbar" style="margin-bottom:12px">
            <span class="chip">Role: ${profile.role}</span>
            <a class="btn" href="${url}" target="_blank" rel="noopener">Open as plain text</a>
            <a class="btn" href="docs/" target="_blank" rel="noopener">All handbooks</a>
            <button class="btn" id="help-print" style="margin-left:auto">Print</button>
        </div>
        <article class="card" id="help-content" style="line-height:1.6">
            <em>Loading the handbook…</em>
        </article>`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const md  = await res.text();
        document.getElementById('help-content').innerHTML = mdToHtml(md);
    } catch (err) {
        document.getElementById('help-content').innerHTML =
            `<div class="alert alert-danger">Couldn't load <code>${url}</code> (${err.message}).
             If you just deployed, give Cloudflare a few seconds and refresh.</div>`;
    }

    document.getElementById('help-print').addEventListener('click', () => window.print());
}

/* Tiny, dependency-free Markdown -> HTML.
 * Covers headings, paragraphs, bullets, ordered lists, code blocks,
 * inline code, bold, italic, links and tables. Good enough for handbooks. */
function mdToHtml(src) {
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const lines = src.replace(/\r\n/g, '\n').split('\n');
    let out = [];
    let inCode = false, inList = null, inTable = false, tableHeader = false;

    function closeList() { if (inList) { out.push(`</${inList}>`); inList = null; } }
    function closeTable() { if (inTable) { out.push('</tbody></table>'); inTable = false; tableHeader = false; } }

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // fenced code block
        if (/^```/.test(line)) {
            closeList(); closeTable();
            if (!inCode) { out.push('<pre style="background:var(--bg); padding:12px; border-radius:8px; overflow-x:auto"><code>'); inCode = true; }
            else         { out.push('</code></pre>'); inCode = false; }
            continue;
        }
        if (inCode) { out.push(esc(line)); continue; }

        // tables: header | --- | row pattern
        if (/^\|.*\|\s*$/.test(line) && /^\|[\s:|-]+\|\s*$/.test(lines[i+1] || '')) {
            closeList();
            const cells = line.trim().slice(1, -1).split('|').map(c => c.trim());
            out.push('<table class="table"><thead><tr>' + cells.map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>');
            inTable = true; tableHeader = true;
            i++; continue;
        }
        if (inTable && /^\|.*\|\s*$/.test(line)) {
            const cells = line.trim().slice(1, -1).split('|').map(c => c.trim());
            out.push('<tr>' + cells.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>');
            continue;
        }
        if (inTable) closeTable();

        // headings
        const h = /^(#{1,6})\s+(.*)$/.exec(line);
        if (h) {
            closeList();
            const lvl = h[1].length;
            out.push(`<h${lvl} style="color:var(--green-700); margin-top:1.4em">${inline(h[2])}</h${lvl}>`);
            continue;
        }

        // horizontal rule
        if (/^\s*---+\s*$/.test(line)) {
            closeList();
            out.push('<hr style="border:0; border-top:1px solid var(--border); margin: 20px 0">');
            continue;
        }

        // bullets
        if (/^\s*[-*]\s+/.test(line)) {
            if (inList !== 'ul') { closeList(); out.push('<ul style="padding-left:22px">'); inList = 'ul'; }
            out.push('<li>' + inline(line.replace(/^\s*[-*]\s+/, '')) + '</li>');
            continue;
        }
        // ordered
        if (/^\s*\d+\.\s+/.test(line)) {
            if (inList !== 'ol') { closeList(); out.push('<ol style="padding-left:22px">'); inList = 'ol'; }
            out.push('<li>' + inline(line.replace(/^\s*\d+\.\s+/, '')) + '</li>');
            continue;
        }
        // blank
        if (/^\s*$/.test(line)) { closeList(); out.push(''); continue; }

        // paragraph
        closeList();
        out.push('<p>' + inline(line) + '</p>');
    }
    closeList(); closeTable();
    if (inCode) out.push('</code></pre>');
    return out.join('\n');

    function inline(s) {
        s = esc(s);
        // code spans
        s = s.replace(/`([^`]+)`/g, '<code style="background:var(--bg); padding:1px 5px; border-radius:4px">$1</code>');
        // images skipped (not needed in handbooks)
        // links
        s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
        // bold
        s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        // italic
        s = s.replace(/(^|\W)\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
        return s;
    }
}
