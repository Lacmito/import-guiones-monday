/* global pdfjsLib */

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Config cargada desde el servidor (MONDAY_BOARD_ID, etc.)
let mondayConfig = { boardId: '', groupId: '', subitemsBoardId: '' };

const API_TOKEN = () => ''; // El servidor usa MONDAY_API_TOKEN
const BOARD_ID = () => mondayConfig.boardId || '';
const GROUP_ID = () => document.getElementById('groupId')?.value?.trim() || mondayConfig.groupId || '';
const SUBITEMS_BOARD_ID = () => document.getElementById('subitemsBoardId')?.value?.trim() || mondayConfig.subitemsBoardId || '';
const PDF_FILE = () => document.getElementById('pdfFile').files[0];
const PREVIEW_SECTION = document.getElementById('previewSection');
const PREVIEW_EPISODE = document.getElementById('previewEpisode');
const PREVIEW_OBRA = document.getElementById('previewObra');
const PREVIEW_SUBITEMS = document.getElementById('previewSubitems');
const PREVIEW_SUMMARY = document.getElementById('previewSummary');
const PROGRESS_WRAP = document.getElementById('progressWrap');
const PROGRESS_BAR = document.getElementById('progressBar');
const PROGRESS_TEXT = document.getElementById('progressText');
const BTN_IMPORT = document.getElementById('btnImport');
const IMPORT_STATUS = document.getElementById('importStatus');

let lastExtracted = null;

// Cargar configuración Monday desde el servidor
fetch('/api/config')
  .then((r) => r.json())
  .then((c) => {
    mondayConfig = c;
  })
  .catch(() => {});

// --- Parsing ---

/**
 * Episode number from filename: Obra_NNN_(...).pdf → NNN
 */
function episodeFromFilename(filename) {
  const match = filename.match(/^[^_]+_(\d+)_/);
  return match ? match[1] : null;
}

/**
 * First page text from PDF (for título original + personajes block).
 */
async function getPdfFirstPagesText(file, maxPages = 3) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const parts = [];
  for (let i = 1; i <= Math.min(maxPages, pdf.numPages); i++) {
    const page = await pdf.getPage(i);
    const text = await page.getTextContent();
    const strings = text.items.map((it) => it.str).join(' ');
    parts.push(strings);
  }
  return parts.join('\n');
}

/**
 * Extract "TÍTULO ORIGINAL XXXX" from first page text.
 * Handles "TÍTULO ORIGINAL LEONARDO" or "TÍTULO ORIGINAL RAMO" etc.
 */
function extractTituloOriginal(text) {
  const re = /TÍTULO\s+ORIGINAL\s+(.+?)(?=\s+(?:TÍTULO|PÁGINAS|DURACIÓN|TRADUCCIÓN|PERSONAJES|LOOPS|$))/i;
  const m = text.match(re);
  if (m) return m[1].trim();
  // Fallback: line containing only TÍTULO ORIGINAL and one word
  const lineRe = /TÍTULO\s+ORIGINAL\s+([A-Z0-9\s\-\.]+?)(?=\s{2,}|\n|$)/i;
  const m2 = text.match(lineRe);
  return m2 ? m2[1].trim() : null;
}

/**
 * Extract personajes + loops from block after "PERSONAJE" / "LLAMADO LOOPS".
 * Usa regex global sobre el bloque para no perder entradas cuando PDF.js junta varias líneas.
 */
function extractPersonajesLoops(text) {
  const list = [];
  const headerMatch = text.match(/PERSONAJE\s+COL\s+ACTOR\s+LLAMADO\s+LOOPS|LLAMADO\s+LOOPS/i);
  const start = headerMatch ? headerMatch.index + headerMatch[0].length : 0;
  const block = text.slice(start, start + 3500);
  const re = /(.+?)\s+(\d{1,2}:\d{2}(?::\d{2})?)\s+(?:COL|ADC)\s+\d+\s+(\d+)/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    let name = m[1].trim();
    const loops = parseInt(m[3], 10);
    if (isNaN(loops)) continue;
    name = name.replace(/^Para uso exclusivo de CAJA DE RUIDOS\s*/i, '').trim();
    if (name.length === 0 || name.length > 80) continue;
    if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(name)) continue;
    list.push({ name, loops });
  }
  return list;
}

/**
 * Extrae del encabezado del guion los valores PERSONAJES y LOOPS (totales del guion).
 */
function extractGuionPersonajesYLoops(text) {
  const headerEnd = text.indexOf('PERSONAJE COL ACTOR');
  const header = headerEnd >= 0 ? text.slice(0, headerEnd) : text.slice(0, 800);
  const personajesM = header.match(/PERSONAJES\s+(\d+)/i);
  const loopsM = header.match(/LOOPS\s+(\d+)/i);
  return {
    personajesGuion: personajesM ? parseInt(personajesM[1], 10) : null,
    loopsGuion: loopsM ? parseInt(loopsM[1], 10) : null,
  };
}

async function extractFromPdf(file) {
  const filename = file.name.replace(/\.pdf$/i, '');
  const episode = episodeFromFilename(filename);
  const fullText = await getPdfFirstPagesText(file);
  const obra = extractTituloOriginal(fullText);
  const subitems = extractPersonajesLoops(fullText);
  const { personajesGuion, loopsGuion } = extractGuionPersonajesYLoops(fullText);
  const loopsTotal = subitems.reduce((s, i) => s + i.loops, 0);
  return { episode, obra, subitems, filename, personajesGuion, loopsGuion, loopsTotal };
}

// --- UI: file change ---

document.getElementById('pdfFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  IMPORT_STATUS.textContent = '';
  IMPORT_STATUS.className = 'status';
  if (!file) {
    PREVIEW_SECTION.hidden = true;
    return;
  }
  try {
    const data = await extractFromPdf(file);
    lastExtracted = data;
    PREVIEW_EPISODE.textContent = data.episode ?? '—';
    PREVIEW_OBRA.textContent = data.obra ?? '—';
    PREVIEW_SUBITEMS.textContent = data.subitems.length
      ? data.subitems.map((s) => `${s.name}\t${s.loops}`).join('\n')
      : '—';
    const n = data.subitems.length;
    const loopsSum = data.loopsTotal ?? data.subitems.reduce((s, i) => s + i.loops, 0);
    const pGuion = data.personajesGuion != null ? String(data.personajesGuion) : '—';
    const pOk = data.personajesGuion != null && n === data.personajesGuion;
    PREVIEW_SUMMARY.innerHTML = `
      <strong>Resumen</strong>
      <div class="summary-row"><span>Personajes:</span> <span>${n} importando</span> ${data.personajesGuion != null ? `<span class="${pOk ? 'ok' : 'warn'}">Guion: ${pGuion} ${pOk ? '✓' : '— no coinciden'}</span>` : ''}</div>
      <div class="summary-row"><span>Loops (suma importación):</span> <span>${loopsSum}</span></div>
    `;
    PREVIEW_SECTION.hidden = false;
  } catch (err) {
    IMPORT_STATUS.textContent = 'Error leyendo el PDF: ' + err.message;
    IMPORT_STATUS.className = 'status error';
    PREVIEW_SECTION.hidden = true;
  }
});

// --- Monday API (vía proxy local para evitar CORS) ---

async function mondayFetch(query, variables = {}) {
  const res = await fetch('/api/monday', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables, token: API_TOKEN() }),
  });
  const json = await res.json();
  if (json.errors && json.errors.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }
  return json.data;
}

/**
 * Get board columns, first group, and subitems board (en boards clásicos los subitems tienen columnas propias).
 */
async function getBoardStructure(boardId) {
  const query = `
    query($boardId: ID!) {
      boards(ids: [ $boardId ]) {
        id
        name
        groups { id title }
        columns { id title type settings_str }
      }
    }
  `;
  const data = await mondayFetch(query, { boardId: String(boardId) });
  const board = data?.boards?.[0];
  if (!board) throw new Error('Board no encontrado. Revisa el Board ID.');
  const groupId = board.groups?.[0]?.id ?? null;
  const columns = board.columns || [];

  let subitemColumns = [];
  let subitemsBoardId = SUBITEMS_BOARD_ID();
  if (!subitemsBoardId) for (const col of columns) {
    const settingsStr = col.settings_str || col.settings;
    if ((col.type || '').toLowerCase().includes('subtask') && settingsStr) {
      try {
        const settings = typeof settingsStr === 'string' ? JSON.parse(settingsStr) : settingsStr;
        const boardId = (settings.boardIds && settings.boardIds[0]) || settings.board_id || settings.linked_board_id;
        if (boardId) {
          subitemsBoardId = String(boardId);
          break;
        }
      } catch (e) { /* ignore */ }
    }
  }
  if (subitemsBoardId) {
    const subQuery = `
      query($boardId: ID!) {
        boards(ids: [ $boardId ]) {
          columns { id title type }
        }
      }
    `;
    const subData = await mondayFetch(subQuery, { boardId: subitemsBoardId });
    subitemColumns = subData?.boards?.[0]?.columns || [];
  }
  if (subitemColumns.length === 0) subitemColumns = columns;

  return { groupId, columns, subitemColumns, subitemsBoardId };
}

/**
 * Build column_values for main item. Monday acepta string simple para Text, Date, Status, Number.
 */
function buildItemColumnValues(columns, obra, todayStr) {
  const colMap = {};
  columns.forEach((c) => { colMap[c.title.toLowerCase().trim()] = c; });
  const values = {};
  const obraCol = colMap['obra'];
  if (obraCol && obra) {
    values[obraCol.id] = obra;
  }
  const dateCol = colMap['date'];
  if (dateCol && todayStr) {
    values[dateCol.id] = { date: todayStr };
  }
  const statusCol = colMap['status'];
  if (statusCol) {
    values[statusCol.id] = { label: 'Para Revisar' };
  }
  return values;
}

/**
 * Build column_values for subitem: Loops (cantidad), Obra ("Obra NNN").
 * Enviamos string simple para que Monday no rechace el valor.
 */
function buildSubitemColumnValues(subitemColumns, loops, obraEpisodio) {
  const colMap = {};
  subitemColumns.forEach((c) => {
    const key = c.title.toLowerCase().trim();
    colMap[key] = c;
    if (key === 'loop' && !colMap['loops']) colMap['loops'] = c;
  });
  const values = {};
  const loopsCol = colMap['loops'] || colMap['loop'];
  if (loopsCol != null) {
    values[loopsCol.id] = String(loops);
  }
  const obraCol = colMap['obra'];
  if (obraCol && obraEpisodio) {
    values[obraCol.id] = String(obraEpisodio);
  }
  return values;
}

/**
 * Create main item and then subitems. Subitems use the same board columns
 * (Monday subitems inherit board structure).
 */
async function createItemAndSubitems(boardId, groupId, episode, obra, subitems, columns, subitemColumns, onProgress) {
  const total = 1 + subitems.length;
  const report = (current, message) => {
    if (typeof onProgress === 'function') onProgress(current, total, message);
  };
  report(0, 'Conectando con Monday…');

  const todayStr = new Date().toISOString().slice(0, 10);
  const itemName = String(episode);
  const itemColValues = buildItemColumnValues(columns, obra, todayStr);
  const columnValuesStr = JSON.stringify(itemColValues);

  const createItemQuery = `
    mutation($boardId: ID!, $groupId: String!, $itemName: String!, $columnValues: JSON!) {
      create_item(
        board_id: $boardId,
        group_id: $groupId,
        item_name: $itemName,
        column_values: $columnValues
      ) { id }
    }
  `;
  const variables = {
    boardId: String(boardId),
    groupId: groupId || undefined,
    itemName,
    columnValues: columnValuesStr,
  };
  if (!variables.groupId) {
    delete variables.groupId;
    const q2 = `
      mutation($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
        create_item(
          board_id: $boardId,
          item_name: $itemName,
          column_values: $columnValues
        ) { id }
      }
    `;
    const data = await mondayFetch(q2, {
      boardId: String(boardId),
      itemName,
      columnValues: columnValuesStr,
    });
    const itemId = data?.create_item?.id;
    if (!itemId) throw new Error('No se pudo crear el ítem.');
    report(1, 'Ítem creado. Creando subitems…');
    const obraEpisodio = obra ? `${obra} ${episode}` : String(episode);
    const cols = subitemColumns && subitemColumns.length ? subitemColumns : columns;
    for (let i = 0; i < subitems.length; i++) {
      const s = subitems[i];
      report(1 + i, `Subitem ${i + 1}/${subitems.length}: ${s.name}`);
      const subColValues = buildSubitemColumnValues(cols, s.loops, obraEpisodio);
      const subColStr = JSON.stringify(subColValues);
      const createSubQuery = `
        mutation($parentId: ID!, $itemName: String!, $columnValues: JSON!) {
          create_subitem(
            parent_item_id: $parentId,
            item_name: $itemName,
            column_values: $columnValues
          ) { id }
        }
      `;
      await mondayFetch(createSubQuery, {
        parentId: itemId,
        itemName: s.name,
        columnValues: subColStr,
      });
    }
    report(total, 'Listo.');
    return itemId;
  }
  const data = await mondayFetch(createItemQuery, variables);
  const itemId = data?.create_item?.id;
  if (!itemId) throw new Error('No se pudo crear el ítem.');
  report(1, 'Ítem creado. Creando subitems…');
  const obraEpisodio = obra ? `${obra} ${episode}` : String(episode);
  const cols = subitemColumns && subitemColumns.length ? subitemColumns : columns;
  for (let i = 0; i < subitems.length; i++) {
    const s = subitems[i];
    report(1 + i, `Subitem ${i + 1}/${subitems.length}: ${s.name}`);
    const subColValues = buildSubitemColumnValues(cols, s.loops, obraEpisodio);
    const subColStr = JSON.stringify(subColValues);
    const createSubQuery = `
      mutation($parentId: ID!, $itemName: String!, $columnValues: JSON!) {
        create_subitem(
          parent_item_id: $parentId,
          item_name: $itemName,
          column_values: $columnValues
        ) { id }
      }
    `;
    await mondayFetch(createSubQuery, {
      parentId: itemId,
      itemName: s.name,
      columnValues: subColStr,
    });
  }
  report(total, 'Listo.');
  return itemId;
}

// --- Import button ---

BTN_IMPORT.addEventListener('click', async () => {
  if (!lastExtracted) return;
  const boardId = BOARD_ID();
  if (!boardId) {
    IMPORT_STATUS.textContent = 'No se cargó el Board ID. Configurá MONDAY_BOARD_ID y MONDAY_API_TOKEN en el servidor (variables de entorno).';
    IMPORT_STATUS.className = 'status error';
    return;
  }
  if (!lastExtracted.episode) {
    IMPORT_STATUS.textContent = 'No se pudo obtener el número de episodio del nombre del archivo.';
    IMPORT_STATUS.className = 'status error';
    return;
  }
  BTN_IMPORT.disabled = true;
  PROGRESS_WRAP.hidden = false;
  PROGRESS_BAR.style.width = '0%';
  PROGRESS_TEXT.textContent = '0%';
  IMPORT_STATUS.textContent = '';
  IMPORT_STATUS.className = 'status';
  const setProgress = (current, total, message) => {
    const pct = total ? Math.round((100 * current) / total) : 0;
    PROGRESS_BAR.style.width = pct + '%';
    PROGRESS_TEXT.textContent = message ? `${pct}% — ${message}` : pct + '%';
  };
  try {
    const { groupId, columns, subitemColumns } = await getBoardStructure(boardId);
    await createItemAndSubitems(
      boardId,
      GROUP_ID() || groupId,
      lastExtracted.episode,
      lastExtracted.obra,
      lastExtracted.subitems,
      columns,
      subitemColumns,
      setProgress,
    );
    IMPORT_STATUS.textContent = 'Listo: ítem y subitems creados en Monday.';
    IMPORT_STATUS.className = 'status success';
  } catch (err) {
    IMPORT_STATUS.textContent = 'Error: ' + err.message;
    IMPORT_STATUS.className = 'status error';
  } finally {
    BTN_IMPORT.disabled = false;
    PROGRESS_WRAP.hidden = true;
  }
});
