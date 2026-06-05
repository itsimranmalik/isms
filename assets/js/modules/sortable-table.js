/**
 * Sortable tables — click any column header to sort.
 *
 * Behaviour
 *   - Three-state cycle on each click: none → asc → desc → none (restores original order).
 *   - Auto-detects numeric, date, and text values per cell.
 *   - Respects form controls: if a cell has an <input>/<select>/<textarea>, its
 *     value is used for sorting (so sorting a "Status" column with dropdowns works).
 *   - A cell can override the sort value with a data-sort attribute.
 *   - A <th> can opt out with a data-no-sort attribute.
 *   - Columns whose <th> is empty (e.g. action columns) are not made sortable.
 *
 * Auto-apply
 *   - Call watchContainer(root) once. It applies to every <table class="table">
 *     in the container now AND every time tables are re-rendered (MutationObserver).
 *   - Tables are idempotent: bound headers carry data-sortable-bound so a second
 *     pass is a no-op.
 */

const BOUND_ATTR = 'data-sortable-bound';
const STATE_ATTR = 'data-sort-state';   // '', 'asc', 'desc'
const ORIG_ATTR  = 'data-sort-orig';    // captured on first sort

export function applySortableToTable(table) {
    if (!(table instanceof HTMLTableElement)) return;
    const thead = table.tHead;
    if (!thead || thead.rows.length === 0) return;
    const headers = thead.rows[0].cells;
    if (!headers || headers.length === 0) return;

    Array.from(headers).forEach((th, idx) => {
        if (th.hasAttribute(BOUND_ATTR)) return;
        if (th.hasAttribute('data-no-sort')) return;
        const label = th.textContent.replace(/\s+/g, ' ').trim();
        // Skip action / icon-only columns (header is empty)
        if (!label) return;

        th.setAttribute(BOUND_ATTR, '');
        th.classList.add('sortable');

        const arrow = document.createElement('span');
        arrow.className = 'sort-arrow';
        arrow.setAttribute('aria-hidden', 'true');
        arrow.textContent = '';
        th.appendChild(arrow);

        th.addEventListener('click', () => onHeaderClick(table, th, idx, Array.from(headers)));
    });
}

function onHeaderClick(table, th, columnIndex, allHeaders) {
    const current = th.getAttribute(STATE_ATTR) || '';
    const next = current === '' ? 'asc' : current === 'asc' ? 'desc' : '';

    // Clear sibling header state
    allHeaders.forEach(h => {
        if (h !== th) {
            h.removeAttribute(STATE_ATTR);
            const a = h.querySelector('.sort-arrow');
            if (a) a.textContent = '';
        }
    });

    if (next) th.setAttribute(STATE_ATTR, next);
    else      th.removeAttribute(STATE_ATTR);

    const arrow = th.querySelector('.sort-arrow');
    if (arrow) arrow.textContent = next === 'asc' ? ' ▲' : next === 'desc' ? ' ▼' : '';

    sortRows(table, columnIndex, next);
}

function sortRows(table, columnIndex, direction) {
    const tbody = table.tBodies[0];
    if (!tbody) return;
    const rows = Array.from(tbody.rows).filter(r => r.cells.length > columnIndex);
    if (rows.length <= 1) return;

    // Stamp original positions the first time we touch the body
    if (!rows[0].hasAttribute(ORIG_ATTR)) {
        rows.forEach((r, i) => r.setAttribute(ORIG_ATTR, String(i)));
    }

    if (direction === '') {
        rows.sort((a, b) => Number(a.getAttribute(ORIG_ATTR)) - Number(b.getAttribute(ORIG_ATTR)));
    } else {
        const sign = direction === 'asc' ? 1 : -1;
        rows.sort((a, b) => {
            const av = cellSortValue(a.cells[columnIndex]);
            const bv = cellSortValue(b.cells[columnIndex]);
            return sign * compareValues(av, bv);
        });
    }
    // Re-append in new order — appendChild moves existing nodes
    const frag = document.createDocumentFragment();
    rows.forEach(r => frag.appendChild(r));
    tbody.appendChild(frag);
}

function compareValues(a, b) {
    // Empty values sort last in ascending order
    const aEmpty = a === '' || a == null;
    const bEmpty = b === '' || b == null;
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1;
    if (bEmpty) return -1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

function cellSortValue(td) {
    if (!td) return '';
    // Explicit override
    const explicit = td.getAttribute('data-sort');
    if (explicit != null) {
        const n = Number(explicit);
        return Number.isFinite(n) && explicit.trim() !== '' ? n : explicit;
    }
    // Form-control aware
    const ctl = td.querySelector('input, select, textarea');
    if (ctl) {
        if (ctl.type === 'checkbox') return ctl.checked ? 1 : 0;
        const v = ctl.value;
        const n = Number(v);
        if (v !== '' && Number.isFinite(n)) return n;
        return (v || '').toLowerCase();
    }
    const text = td.textContent.replace(/\s+/g, ' ').trim();
    if (text === '') return '';
    // Numeric (with comma/% tolerance)
    const numText = text.replace(/[,%]/g, '');
    if (/^[-+]?\d+(\.\d+)?$/.test(numText)) return Number(numText);
    // ISO-ish date (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
        const t = Date.parse(text);
        if (!Number.isNaN(t)) return t;
    }
    return text.toLowerCase();
}

/** Apply sortable behaviour to every .table inside the container. Idempotent. */
export function applySortableToContainer(container) {
    if (!container) return;
    container.querySelectorAll('table.table').forEach(applySortableToTable);
}

/**
 * Auto-apply on initial mount AND on subsequent DOM changes inside the container.
 * Returns the MutationObserver so the caller can disconnect it on tear-down.
 */
export function watchContainer(container) {
    applySortableToContainer(container);
    const obs = new MutationObserver(muts => {
        // Only re-scan when a node was added (sort operations move existing nodes,
        // which still triggers childList — the bound check makes that a no-op).
        for (const m of muts) {
            if (m.addedNodes && m.addedNodes.length > 0) {
                applySortableToContainer(container);
                return;
            }
        }
    });
    obs.observe(container, { childList: true, subtree: true });
    return obs;
}
