import "./style.css";
import {
  createDataSet,
  decodeBuffer,
  initialMappings,
  processRows,
  recipeJSON,
  sha256,
  toCSV,
  validateRecipe,
  type DataSet,
  type Encoding,
  type FieldMapping,
  type ProcessResult,
  type Recipe,
  type TransformKind,
} from "./core";
import {
  clearWorkspace,
  deleteRecipe,
  listRecipes,
  loadWorkspace,
  saveRecipe,
  saveRun,
  saveWorkspace,
} from "./db";

const PRODUCT = "import-transform-ledger";
const BILLING_BASE = import.meta.env.VITE_BILLING_BASE || "https://pilot-api.sociobot.in";
const LICENSE_KEY = `sb_license:${PRODUCT}`;
const VERDICT_KEY = `${LICENSE_KEY}:verdict`;
const app = document.querySelector<HTMLDivElement>("#app")!;

interface State {
  source: DataSet | null;
  targetHeaders: string[];
  mappings: FieldMapping[];
  dedupeKeys: string[];
  recipeName: string;
  recipes: Recipe[];
  stage: number;
  encoding: Encoding;
  message: string;
  error: string;
  online: boolean;
  licenseActive: boolean;
  licenseNotice: string;
}

const state: State = {
  source: null,
  targetHeaders: [],
  mappings: [],
  dedupeKeys: [],
  recipeName: "Untitled import",
  recipes: [],
  stage: 1,
  encoding: "auto",
  message: "Ready. Files stay on this device.",
  error: "",
  online: navigator.onLine,
  licenseActive: cachedLicenseActive(),
  licenseNotice: "",
};

const transformLabels: Record<TransformKind, string> = {
  none: "Keep as-is",
  trim: "Trim spaces",
  upper: "UPPERCASE",
  lower: "lowercase",
  "date-dmy": "Date: D/M/Y → YYYY-MM-DD",
  "date-mdy": "Date: M/D/Y → YYYY-MM-DD",
  number: "Clean number / currency",
  replace: "Find and replace",
};

function escapeHTML(value: unknown): string {
  return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char);
}

function cachedLicenseActive(): boolean {
  try {
    const verdict = JSON.parse(localStorage.getItem(VERDICT_KEY) ?? "null") as { valid?: boolean } | null;
    return Boolean(localStorage.getItem(LICENSE_KEY) && verdict?.valid);
  } catch {
    return false;
  }
}

function currentResult(): ProcessResult {
  if (!state.source || state.mappings.length === 0) return { accepted: [], rejected: [], total: state.source?.rows.length ?? 0, duplicates: 0 };
  return processRows(state.source.rows, state.mappings, state.dedupeKeys);
}

function canVisit(stage: number): boolean {
  if (stage === 1) return true;
  if (stage === 2) return Boolean(state.source && state.targetHeaders.length);
  return Boolean(state.source && state.mappings.length);
}

function recipeFromState(): Recipe {
  return {
    schema: "import-transform-ledger/recipe",
    version: 1,
    name: state.recipeName.trim() || "Untitled import",
    createdAt: new Date().toISOString(),
    sourceHeaders: state.source?.headers ?? state.mappings.flatMap((mapping) => mapping.source ? [mapping.source] : []),
    targetHeaders: state.targetHeaders,
    mappings: state.mappings,
    dedupeKeys: state.dedupeKeys,
  };
}

function render(): void {
  const result = currentResult();
  const mapped = state.mappings.filter((mapping) => mapping.source || mapping.defaultValue).length;
  app.innerHTML = `
    <header class="site-header">
      <a class="brand" href="/" aria-label="Import Transform Ledger home">
        <img src="/icon.svg" alt="" width="36" height="36" />
        <span>Import Transform Ledger</span>
      </a>
      <nav aria-label="Utility navigation">
        <span class="local-mark"><i aria-hidden="true"></i> Runs locally</span>
        <a href="/privacy/">Privacy</a>
        <a href="/terms/">Terms</a>
      </nav>
    </header>
    <main id="main">
      <section class="hero ${state.source ? "hero-compact" : ""}" aria-labelledby="page-title">
        <div class="hero-copy">
          <p class="eyebrow">A private customs desk for unruly data</p>
          <h1 id="page-title">Make every CSV import explain itself.</h1>
          <p class="lede">Map columns, apply deterministic cleanup, isolate every reject, and hand off a rerunnable recipe. Nothing leaves your browser.</p>
          ${state.source ? `<p class="return-note">Working on <strong>${escapeHTML(state.source.fileName)}</strong> · ${state.source.rows.length.toLocaleString()} rows</p>` : `
            <div class="hero-actions">
              <button class="primary" data-action="jump-load">Start an import</button>
              <button class="text-button" data-action="example">Try the example</button>
            </div>`}
        </div>
        <picture class="hero-art">
          <source type="image/avif" srcset="/assets/hero-customs-desk-768.avif 768w, /assets/hero-customs-desk-1536.avif 1536w" sizes="(max-width: 760px) 100vw, 52vw" />
          <source type="image/webp" srcset="/assets/hero-customs-desk-768.webp 768w, /assets/hero-customs-desk-1536.webp 1536w" sizes="(max-width: 760px) 100vw, 52vw" />
          <img src="/assets/hero-customs-desk-768.jpg" alt="Paper records crossing three measuring gates and arriving as an approved ledger" width="768" height="512" decoding="async" fetchpriority="high" />
        </picture>
      </section>

      <div class="status-ribbon ${state.error ? "status-error" : ""}" role="status" aria-live="polite">
        <span aria-hidden="true">${state.error ? "!" : state.online ? "●" : "↯"}</span>
        ${escapeHTML(state.error || state.message)}
        <span class="network-state">${state.online ? "Online · offline-ready" : "Offline · all local tools available"}</span>
      </div>

      <section class="workbench" aria-label="Import workspace">
        <aside class="stage-rail" aria-label="Import stages">
          <p class="rail-label">Import route</p>
          <ol>
            ${["Load", "Map", "Rules", "Review", "Export"].map((label, index) => {
              const number = index + 1;
              const available = canVisit(number);
              const complete = number === 1 ? Boolean(state.source && state.targetHeaders.length) : number === 2 ? mapped === state.mappings.length && mapped > 0 : number === 3 ? state.dedupeKeys.length > 0 : number < state.stage;
              return `<li><button data-stage="${number}" ${available ? "" : "disabled"} aria-current="${state.stage === number ? "step" : "false"}"><span>${complete ? "✓" : String(number).padStart(2, "0")}</span>${label}</button></li>`;
            }).join("")}
          </ol>
          <div class="rail-summary">
            <span>${state.source?.rows.length ?? 0}<small>source rows</small></span>
            <span>${result.accepted.length}<small>ready</small></span>
            <span>${result.rejected.length}<small>rejected</small></span>
          </div>
          ${savedRecipesHTML()}
        </aside>

        <div class="data-plane">
          ${stageHTML(result)}
        </div>
      </section>

      ${licenseHTML()}
    </main>
    <footer>
      <p><strong>Import Transform Ledger</strong> · Local-first field utility by Sociobot.</p>
      <p>Editorial artwork was generated for this product. <a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a></p>
    </footer>
    <div id="update-toast" class="toast" hidden><span>An offline update is ready.</span><button data-action="update">Reload</button></div>
  `;
  bindEvents();
}

function savedRecipesHTML(): string {
  if (!state.recipes.length) return `<div class="saved-list"><p>Saved recipes</p><small>No saved recipes yet.</small></div>`;
  return `<div class="saved-list"><p>Saved recipes</p><ul>${state.recipes.map((recipe) => `
    <li><button class="saved-name" data-load-recipe="${escapeHTML(recipe.name)}">${escapeHTML(recipe.name)}</button><button class="icon-button" data-delete-recipe="${escapeHTML(recipe.name)}" aria-label="Delete ${escapeHTML(recipe.name)}">×</button></li>`).join("")}</ul></div>`;
}

function stageHTML(result: ProcessResult): string {
  if (state.stage === 1) return loadStageHTML();
  if (state.stage === 2) return mapStageHTML();
  if (state.stage === 3) return rulesStageHTML();
  if (state.stage === 4) return reviewStageHTML(result);
  return exportStageHTML(result);
}

function loadStageHTML(): string {
  return `<section class="stage" aria-labelledby="stage-title">
    <header class="stage-heading"><div><p class="step-kicker">Stage 01</p><h2 id="stage-title">Set both sides of the crossing</h2></div><p>Load a source export and a target template. Only the target header row is used.</p></header>
    <div class="load-grid">
      <div class="file-well ${state.source ? "has-file" : ""}">
        <span class="well-number">A</span><h3>Source data</h3><p>The rows you need to clean and reshape.</p>
        <label class="file-label" for="source-file">${state.source ? "Replace source CSV" : "Choose source CSV"}</label>
        <input id="source-file" type="file" accept=".csv,text/csv" />
        <label for="encoding">Character encoding</label>
        <select id="encoding"><option value="auto" ${state.encoding === "auto" ? "selected" : ""}>Detect UTF-8 or Windows-1252</option><option value="utf-8" ${state.encoding === "utf-8" ? "selected" : ""}>UTF-8</option><option value="windows-1252" ${state.encoding === "windows-1252" ? "selected" : ""}>Windows-1252 / legacy</option></select>
        ${state.source ? `<div class="file-receipt"><strong>${escapeHTML(state.source.fileName)}</strong><span>${state.source.rows.length.toLocaleString()} rows · ${state.source.headers.length} columns · ${escapeHTML(state.source.encoding)}</span></div>` : ""}
      </div>
      <div class="file-well ${state.targetHeaders.length ? "has-file" : ""}">
        <span class="well-number">B</span><h3>Target template</h3><p>The required output column order.</p>
        <label class="file-label" for="target-file">${state.targetHeaders.length ? "Replace target CSV" : "Choose target CSV"}</label>
        <input id="target-file" type="file" accept=".csv,text/csv" />
        <span class="or-rule">or enter headers</span>
        <label for="target-manual">Comma-separated target columns</label>
        <div class="inline-form"><input id="target-manual" type="text" placeholder="customer_id, email, start_date" /><button data-action="set-target">Set columns</button></div>
        ${state.targetHeaders.length ? `<div class="file-receipt"><strong>${state.targetHeaders.length} target columns</strong><span>${state.targetHeaders.map(escapeHTML).join(" · ")}</span></div>` : ""}
      </div>
    </div>
    <div class="stage-actions"><button class="text-button" data-action="example">Use safe example data</button><button class="primary" data-action="continue" ${state.source && state.targetHeaders.length ? "" : "disabled"}>Compare columns</button></div>
    <div class="recipe-import"><div><strong>Rerunning a handoff?</strong><p>Load a version 1 recipe JSON, then choose the next source export.</p></div><input id="recipe-file" type="file" accept=".json,application/json" /><label for="recipe-file">Import recipe JSON</label></div>
  </section>`;
}

function mapStageHTML(): string {
  return `<section class="stage" aria-labelledby="stage-title">
    <header class="stage-heading"><div><p class="step-kicker">Stage 02</p><h2 id="stage-title">Map the ledger columns</h2></div><p>${state.mappings.filter((mapping) => mapping.source || mapping.defaultValue).length} of ${state.mappings.length} targets supplied. Matching names are preselected, never guessed semantically.</p></header>
    <div class="mapping-head" aria-hidden="true"><span>Target</span><span>Source</span><span>Deterministic cleanup</span><span>Policy</span></div>
    <div class="mapping-list">${state.mappings.map((mapping, index) => mappingRowHTML(mapping, index)).join("")}</div>
    <div class="stage-actions"><button data-stage="1">Back to files</button><button class="primary" data-action="continue">Set row rules</button></div>
  </section>`;
}

function mappingRowHTML(mapping: FieldMapping, index: number): string {
  return `<fieldset class="mapping-row"><legend><span>${String(index + 1).padStart(2, "0")}</span>${escapeHTML(mapping.target)}</legend>
    <div><label for="source-${index}">Source column</label><select id="source-${index}" data-map-source="${index}"><option value="">No source / use default</option>${state.source?.headers.map((header) => `<option value="${escapeHTML(header)}" ${mapping.source === header ? "selected" : ""}>${escapeHTML(header)}</option>`).join("") ?? ""}</select></div>
    <div><label for="transform-${index}">Transform</label><select id="transform-${index}" data-map-transform="${index}">${Object.entries(transformLabels).map(([value, label]) => `<option value="${value}" ${mapping.transform === value ? "selected" : ""}>${label}</option>`).join("")}</select>
    ${mapping.transform === "replace" ? `<div class="replace-pair"><label>Find<input data-map-find="${index}" value="${escapeHTML(mapping.find)}" /></label><label>Replace with<input data-map-replace="${index}" value="${escapeHTML(mapping.replace)}" /></label></div>` : ""}</div>
    <div><label for="default-${index}">Default if blank</label><input id="default-${index}" data-map-default="${index}" value="${escapeHTML(mapping.defaultValue)}" /><label class="check"><input type="checkbox" data-map-required="${index}" ${mapping.required ? "checked" : ""} /> Reject when blank</label></div>
  </fieldset>`;
}

function rulesStageHTML(): string {
  return `<section class="stage" aria-labelledby="stage-title">
    <header class="stage-heading"><div><p class="step-kicker">Stage 03</p><h2 id="stage-title">Choose what makes a row unique</h2></div><p>Repeated keys are rejected after cleanup. The first occurrence stays in the ready file.</p></header>
    <fieldset class="rule-sheet"><legend>Duplicate key</legend><p>Select one or more target columns. Combined fields form one exact-match key.</p>
      <div class="choice-grid">${state.targetHeaders.map((header) => `<label class="choice"><input type="checkbox" data-dedupe="${escapeHTML(header)}" ${state.dedupeKeys.includes(header) ? "checked" : ""} /><span>${escapeHTML(header)}</span></label>`).join("")}</div>
      <p class="hint">Leave all unchecked to skip duplicate detection. Blank key values are never treated as duplicates.</p>
    </fieldset>
    <div class="audit-note"><span aria-hidden="true">◎</span><div><strong>Every reject gets a reason.</strong><p>Required blanks, invalid dates or numbers, and duplicate keys are written to the rejection ledger with the original source row number.</p></div></div>
    <div class="stage-actions"><button data-stage="2">Back to mapping</button><button class="primary" data-action="continue">Review transformed rows</button></div>
  </section>`;
}

function reviewStageHTML(result: ProcessResult): string {
  const sample = result.accepted.slice(0, 8);
  return `<section class="stage" aria-labelledby="stage-title">
    <header class="stage-heading"><div><p class="step-kicker">Stage 04</p><h2 id="stage-title">Inspect the crossing</h2></div><p>A live preview from the full file. Edit the recipe and the ledger recalculates immediately.</p></header>
    <div class="metric-strip"><div><strong>${result.total}</strong><span>input rows</span></div><div class="metric-good"><strong>${result.accepted.length}</strong><span>ready</span></div><div class="metric-bad"><strong>${result.rejected.length}</strong><span>rejected</span></div><div><strong>${result.duplicates}</strong><span>duplicates</span></div></div>
    <section class="preview-section" aria-labelledby="ready-heading"><div class="section-line"><h3 id="ready-heading">Ready rows</h3><span>Showing ${Math.min(8, sample.length)} of ${result.accepted.length}</span></div>${dataTable(state.targetHeaders, sample, "No rows are ready yet. Resolve the rejection reasons below.")}</section>
    <section class="preview-section rejects" aria-labelledby="reject-heading"><div class="section-line"><h3 id="reject-heading">Rejection ledger</h3><span>Every excluded row is accounted for</span></div>${rejectTable(result)}</section>
    <div class="stage-actions"><button data-stage="2">Edit mapping</button><button class="primary" data-action="continue">Prepare handoff</button></div>
  </section>`;
}

function dataTable(headers: string[], rows: Record<string, string>[], empty: string): string {
  if (!rows.length) return `<div class="table-empty"><span aria-hidden="true">□</span><p>${empty}</p></div>`;
  return `<div class="table-wrap" tabindex="0" role="region" aria-label="Transformed row preview"><table><thead><tr>${headers.map((header) => `<th scope="col">${escapeHTML(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((header) => `<td>${escapeHTML(row[header]) || `<span class="blank">blank</span>`}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function rejectTable(result: ProcessResult): string {
  if (!result.rejected.length) return `<div class="table-empty table-clear"><span aria-hidden="true">✓</span><p>No rejected rows. All ${result.total} rows pass this recipe.</p></div>`;
  return `<div class="reject-list">${result.rejected.slice(0, 20).map((row) => `<article><span class="row-stamp">Row ${row.sourceRow}</span><div><strong>${row.duplicate ? "Duplicate" : "Rejected"}</strong><ul>${row.reasons.map((reason) => `<li>${escapeHTML(reason)}</li>`).join("")}</ul></div></article>`).join("")}${result.rejected.length > 20 ? `<p class="more-note">${result.rejected.length - 20} more reasons are included in the rejection CSV.</p>` : ""}</div>`;
}

function exportStageHTML(result: ProcessResult): string {
  return `<section class="stage" aria-labelledby="stage-title">
    <header class="stage-heading"><div><p class="step-kicker">Stage 05</p><h2 id="stage-title">Stamp the handoff</h2></div><p>Export the clean rows, every rejection, a diffable recipe, and a checksum report.</p></header>
    <div class="receipt"><div class="receipt-stamp"><span>READY</span><strong>${result.accepted.length}</strong><small>rows cleared</small></div><div><h3>${escapeHTML(state.recipeName)}</h3><p>${result.total} input · ${result.accepted.length} ready · ${result.rejected.length} rejected · ${result.duplicates} duplicates</p><p class="hint">Generated locally ${new Date().toLocaleString()}</p></div></div>
    <label for="recipe-name">Recipe name</label><input id="recipe-name" class="name-input" value="${escapeHTML(state.recipeName)}" />
    <div class="export-grid">
      <button data-export="output"><span aria-hidden="true">↓</span><strong>Export ready CSV</strong><small>${result.accepted.length} transformed rows</small></button>
      <button data-export="rejects"><span aria-hidden="true">↓</span><strong>Export rejection CSV</strong><small>${result.rejected.length} rows with reasons</small></button>
      <button data-export="recipe"><span aria-hidden="true">{ }</span><strong>Export recipe JSON</strong><small>Readable, diffable, rerunnable</small></button>
      <button data-export="report"><span aria-hidden="true">#</span><strong>Export checksum report</strong><small>SHA-256 file evidence</small></button>
    </div>
    <div class="save-panel"><div><h3>Keep this recipe on this device</h3><p>${state.licenseActive ? "Field Kit active: save an unlimited recipe library." : "The free workspace includes one saved recipe. Field Kit unlocks an unlimited library."}</p></div><button class="primary" data-action="save-recipe">Save recipe</button></div>
    <div class="stage-actions"><button data-stage="4">Back to review</button><button class="danger-button" data-action="reset">Start a new import</button></div>
  </section>`;
}

function licenseHTML(): string {
  return `<section class="license-section" aria-labelledby="license-title"><div><p class="eyebrow">One-time field kit</p><h2 id="license-title">Carry a bigger recipe book.</h2><p>The complete transform, review, and export workflow is free. A <strong>$29 one-time purchase</strong> unlocks unlimited saved recipes and extended local run history on this device.</p><ul><li>No subscription</li><li>No cloud data upload</li><li>Restore on another device with your license</li></ul></div><div class="license-card">
    ${state.licenseActive ? `<p class="license-active"><span aria-hidden="true">✓</span><strong>Field Kit active</strong></p><p>Your saved recipe library is unlimited.</p>` : `<a class="primary buy-link" href="${BILLING_BASE}/api/v1/products/${PRODUCT}/checkout">Buy Field Kit · $29 once</a><p class="hint">Secure hosted checkout. Sociobot / Dodo is the merchant of record.</p>`}
    <label for="license-token">Have a license? Paste it here</label><div class="inline-form"><input id="license-token" type="password" autocomplete="off" /><button data-action="restore-license">Verify</button></div>
    ${state.licenseNotice ? `<p class="license-notice" role="status">${escapeHTML(state.licenseNotice)}</p>` : ""}
    <p class="legal-note">Purchase subject to our <a href="/terms/">terms</a> and <a href="/privacy/">privacy policy</a>. Refunds are handled by the merchant of record.</p>
  </div></section>`;
}

function bindEvents(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-stage]").forEach((button) => button.addEventListener("click", () => {
    const stage = Number(button.dataset.stage);
    if (canVisit(stage)) { state.stage = stage; state.error = ""; render(); scrollToWorkbench(); }
  }));
  document.querySelector('[data-action="jump-load"]')?.addEventListener("click", () => { state.stage = 1; render(); scrollToWorkbench(); });
  document.querySelectorAll('[data-action="example"]').forEach((button) => button.addEventListener("click", loadExample));
  document.querySelector('[data-action="continue"]')?.addEventListener("click", () => { state.stage = Math.min(5, state.stage + 1); state.error = ""; persist(); render(); scrollToWorkbench(); });
  document.querySelector<HTMLSelectElement>("#encoding")?.addEventListener("change", (event) => { state.encoding = (event.currentTarget as HTMLSelectElement).value as Encoding; });
  document.querySelector<HTMLInputElement>("#source-file")?.addEventListener("change", (event) => loadSource((event.currentTarget as HTMLInputElement).files?.[0]));
  document.querySelector<HTMLInputElement>("#target-file")?.addEventListener("change", (event) => loadTarget((event.currentTarget as HTMLInputElement).files?.[0]));
  document.querySelector<HTMLInputElement>("#recipe-file")?.addEventListener("change", (event) => importRecipeFile((event.currentTarget as HTMLInputElement).files?.[0]));
  document.querySelector('[data-action="set-target"]')?.addEventListener("click", setManualTarget);
  bindMappingEvents();
  document.querySelectorAll<HTMLInputElement>("[data-dedupe]").forEach((input) => input.addEventListener("change", () => {
    const key = input.dataset.dedupe!;
    state.dedupeKeys = input.checked ? [...state.dedupeKeys, key] : state.dedupeKeys.filter((item) => item !== key);
    persist(); render();
  }));
  document.querySelector<HTMLInputElement>("#recipe-name")?.addEventListener("change", (event) => { state.recipeName = (event.currentTarget as HTMLInputElement).value.trim() || "Untitled import"; persist(); render(); });
  document.querySelectorAll<HTMLButtonElement>("[data-export]").forEach((button) => button.addEventListener("click", () => exportFile(button.dataset.export!)));
  document.querySelector('[data-action="save-recipe"]')?.addEventListener("click", saveCurrentRecipe);
  document.querySelector('[data-action="reset"]')?.addEventListener("click", resetWorkspace);
  document.querySelectorAll<HTMLButtonElement>("[data-load-recipe]").forEach((button) => button.addEventListener("click", () => applyRecipe(state.recipes.find((recipe) => recipe.name === button.dataset.loadRecipe)!)));
  document.querySelectorAll<HTMLButtonElement>("[data-delete-recipe]").forEach((button) => button.addEventListener("click", () => removeRecipe(button.dataset.deleteRecipe!)));
  document.querySelector('[data-action="restore-license"]')?.addEventListener("click", restoreLicense);
  document.querySelector('[data-action="update"]')?.addEventListener("click", () => location.reload());
}

function bindMappingEvents(): void {
  const update = (index: number, patch: Partial<FieldMapping>, rerender = false) => {
    state.mappings[index] = { ...state.mappings[index]!, ...patch };
    persist();
    if (rerender) render();
  };
  document.querySelectorAll<HTMLSelectElement>("[data-map-source]").forEach((input) => input.addEventListener("change", () => update(Number(input.dataset.mapSource), { source: input.value || null })));
  document.querySelectorAll<HTMLSelectElement>("[data-map-transform]").forEach((input) => input.addEventListener("change", () => update(Number(input.dataset.mapTransform), { transform: input.value as TransformKind }, true)));
  document.querySelectorAll<HTMLInputElement>("[data-map-default]").forEach((input) => input.addEventListener("change", () => update(Number(input.dataset.mapDefault), { defaultValue: input.value })));
  document.querySelectorAll<HTMLInputElement>("[data-map-required]").forEach((input) => input.addEventListener("change", () => update(Number(input.dataset.mapRequired), { required: input.checked })));
  document.querySelectorAll<HTMLInputElement>("[data-map-find]").forEach((input) => input.addEventListener("change", () => update(Number(input.dataset.mapFind), { find: input.value })));
  document.querySelectorAll<HTMLInputElement>("[data-map-replace]").forEach((input) => input.addEventListener("change", () => update(Number(input.dataset.mapReplace), { replace: input.value })));
}

async function readFile(file: File): Promise<{ text: string; encoding: string }> {
  const buffer = await file.arrayBuffer();
  return decodeBuffer(buffer, state.encoding);
}

async function loadSource(file?: File): Promise<void> {
  if (!file) return;
  try {
    const decoded = await readFile(file);
    const source = createDataSet(decoded.text, file.name, decoded.encoding);
    state.source = source;
    if (state.targetHeaders.length && state.mappings.length === 0) state.mappings = initialMappings(source.headers, state.targetHeaders);
    state.message = `Loaded ${file.name}: ${source.rows.length} rows, ${source.headers.length} columns.`;
    state.error = "";
    await persist(); render();
  } catch (error) { showError(error); }
}

async function loadTarget(file?: File): Promise<void> {
  if (!file) return;
  try {
    const decoded = await readFile(file);
    const target = createDataSet(decoded.text, file.name, decoded.encoding);
    setTargetHeaders(target.headers);
    state.message = `Loaded ${target.headers.length} target columns from ${file.name}.`;
    await persist(); render();
  } catch (error) { showError(error); }
}

async function importRecipeFile(file?: File): Promise<void> {
  if (!file) return;
  try {
    const recipe = validateRecipe(JSON.parse(await file.text()));
    applyRecipe(recipe);
    state.message = `Imported recipe “${recipe.name}”. Choose a source CSV and review its mappings.`;
    render();
  } catch (error) { showError(error instanceof SyntaxError ? new Error("The recipe file is not valid JSON. Choose an exported recipe JSON file.") : error); }
}

function setManualTarget(): void {
  const input = document.querySelector<HTMLInputElement>("#target-manual");
  const headers = input?.value.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
  if (!headers.length) { showError(new Error("Enter at least one target column, separated by commas.")); return; }
  if (new Set(headers).size !== headers.length) { showError(new Error("Target columns must have unique names.")); return; }
  setTargetHeaders(headers); persist(); render();
}

function setTargetHeaders(headers: string[]): void {
  state.targetHeaders = headers;
  state.mappings = initialMappings(state.source?.headers ?? [], headers);
  state.dedupeKeys = state.dedupeKeys.filter((key) => headers.includes(key));
  state.error = "";
}

function loadExample(): void {
  state.source = createDataSet("Legacy ID,Full Name,Email,Start Date,Region\r\nC-100,  Ana Torres  ,ANA@EXAMPLE.COM,31/01/2026,North\r\nC-101,Marcus Lee,marcus@example.com,14/02/2026,South\r\nC-101,Marcus Lee,marcus@example.com,14/02/2026,South\r\nC-102,Missing Date,noah@example.com,31/31/2026,West\r\nC-103,,sara@example.com,09/03/2026,East\r\n", "supplier-export.csv", "utf-8");
  state.targetHeaders = ["customer_id", "name", "email", "start_date", "region_code"];
  state.mappings = initialMappings(state.source.headers, state.targetHeaders);
  const sourceByTarget: Record<string, string> = { customer_id: "Legacy ID", name: "Full Name", email: "Email", start_date: "Start Date", region_code: "Region" };
  state.mappings = state.mappings.map((mapping) => ({ ...mapping, source: sourceByTarget[mapping.target] ?? null, transform: mapping.target === "email" ? "lower" : mapping.target === "start_date" ? "date-dmy" : mapping.target === "region_code" ? "upper" : "trim", required: ["customer_id", "name", "email", "start_date"].includes(mapping.target) }));
  state.dedupeKeys = ["customer_id"];
  state.recipeName = "Customer migration";
  state.stage = 2;
  state.message = "Example loaded. Inspect the human-reviewed mappings, then continue.";
  state.error = "";
  persist(); render(); scrollToWorkbench();
}

async function persist(): Promise<void> {
  try {
    await saveWorkspace({ source: state.source, targetHeaders: state.targetHeaders, mappings: state.mappings, dedupeKeys: state.dedupeKeys, recipeName: state.recipeName, savedAt: new Date().toISOString() });
  } catch {
    state.message = "This browser blocked local persistence. The current tab still works; export the recipe before closing.";
  }
}

function download(name: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slugName(): string {
  return (state.recipeName || "import").toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "import";
}

async function exportFile(kind: string): Promise<void> {
  const result = currentResult();
  const slug = slugName();
  const output = toCSV(state.targetHeaders, result.accepted);
  const rejects = toCSV(["source_row", "reasons", ...state.targetHeaders], result.rejected.map((row) => ({ source_row: row.sourceRow, reasons: row.reasons.join(" | "), ...row.output })));
  const sourceCopy = toCSV(state.source?.headers ?? [], state.source?.rows ?? []);
  if (kind === "output") download(`${slug}-ready.csv`, output, "text/csv;charset=utf-8");
  if (kind === "rejects") download(`${slug}-rejects.csv`, rejects, "text/csv;charset=utf-8");
  if (kind === "recipe") download(`${slug}-recipe.json`, recipeJSON(recipeFromState()), "application/json");
  if (kind === "report") {
    state.message = "Calculating SHA-256 checksums…"; render();
    const report = {
      schema: "import-transform-ledger/report", version: 1, generatedAt: new Date().toISOString(), recipeName: state.recipeName,
      source: { fileName: state.source?.fileName, encoding: state.source?.encoding, rows: result.total },
      outcome: { ready: result.accepted.length, rejected: result.rejected.length, duplicates: result.duplicates },
      sha256: { normalizedSourceCsv: await sha256(sourceCopy), readyCsv: await sha256(output), rejectionCsv: await sha256(rejects), recipeJson: await sha256(recipeJSON(recipeFromState())) },
    };
    download(`${slug}-checksum-report.json`, JSON.stringify(report, null, 2) + "\n", "application/json");
    await saveRun({ id: crypto.randomUUID(), ...report });
  }
  state.message = `Exported ${kind === "output" ? "ready CSV" : kind === "rejects" ? "rejection ledger" : kind === "recipe" ? "recipe JSON" : "checksum report"}.`;
  state.error = ""; render();
}

async function saveCurrentRecipe(): Promise<void> {
  if (!state.licenseActive && state.recipes.length >= 1 && !state.recipes.some((recipe) => recipe.name === state.recipeName)) {
    state.licenseNotice = "The free recipe slot is in use. Export this recipe or unlock Field Kit for an unlimited local library.";
    document.querySelector(".license-section")?.scrollIntoView({ behavior: "smooth" }); render(); return;
  }
  const recipe = recipeFromState();
  await saveRecipe(recipe);
  state.recipes = await listRecipes();
  state.message = `Saved “${recipe.name}” on this device.`; render();
}

function applyRecipe(recipe: Recipe): void {
  state.recipeName = recipe.name;
  state.targetHeaders = recipe.targetHeaders;
  state.mappings = recipe.mappings.map((mapping) => ({ ...mapping }));
  state.dedupeKeys = [...recipe.dedupeKeys];
  state.stage = state.source ? 2 : 1;
  state.message = `Loaded recipe “${recipe.name}”. Choose a source CSV to rerun it.`;
  persist(); render(); scrollToWorkbench();
}

async function removeRecipe(name: string): Promise<void> {
  if (!confirm(`Delete the saved recipe “${name}” from this device? Export it first if you need a backup.`)) return;
  await deleteRecipe(name); state.recipes = await listRecipes(); state.message = `Deleted “${name}”.`; render();
}

async function resetWorkspace(): Promise<void> {
  if (!confirm(`Start a new import and clear the active workspace? Saved recipes will remain.`)) return;
  await clearWorkspace();
  state.source = null; state.targetHeaders = []; state.mappings = []; state.dedupeKeys = []; state.recipeName = "Untitled import"; state.stage = 1; state.message = "New workspace ready."; state.error = ""; render(); scrollToWorkbench();
}

function showError(error: unknown): void {
  state.error = error instanceof Error ? error.message : "Something went wrong. Check the file and try again."; render();
}

function scrollToWorkbench(): void {
  requestAnimationFrame(() => document.querySelector(".workbench")?.scrollIntoView({ behavior: "smooth", block: "start" }));
}

async function restoreLicense(): Promise<void> {
  const token = document.querySelector<HTMLInputElement>("#license-token")?.value.trim();
  if (!token) { state.licenseNotice = "Paste the license token from your purchase email."; render(); return; }
  localStorage.setItem(LICENSE_KEY, token);
  await verifyLicense(true);
}

async function verifyLicense(force = false): Promise<void> {
  const token = localStorage.getItem(LICENSE_KEY);
  if (!token) return;
  try {
    const cached = JSON.parse(localStorage.getItem(VERDICT_KEY) ?? "null") as { valid: boolean; checkedAt: number } | null;
    if (!force && cached && Date.now() - cached.checkedAt < 86_400_000) { state.licenseActive = cached.valid; return; }
    const response = await fetch(`${BILLING_BASE}/api/v1/products/${PRODUCT}/verify?license=${encodeURIComponent(token)}`);
    if (!response.ok) throw new Error("Verification service unavailable");
    const verdict = await response.json() as { valid: boolean; reason: string };
    localStorage.setItem(VERDICT_KEY, JSON.stringify({ valid: verdict.valid, reason: verdict.reason, checkedAt: Date.now() }));
    state.licenseActive = verdict.valid;
    state.licenseNotice = verdict.valid ? "License verified. Field Kit is active." : "This license is no longer active. You can keep using the complete free workflow.";
    render();
  } catch {
    state.licenseNotice = state.licenseActive ? "Offline: using the last valid license check." : "Could not verify right now. Check your connection and try again; the free workflow remains available.";
    render();
  }
}

async function bootstrap(): Promise<void> {
  const license = new URL(location.href).searchParams.get("license");
  if (license) {
    localStorage.setItem(LICENSE_KEY, license);
    const clean = new URL(location.href); clean.searchParams.delete("license"); history.replaceState({}, "", clean);
    state.licenseNotice = "Purchase received. Verifying your license…";
  }
  try {
    const [workspace, recipes] = await Promise.all([loadWorkspace(), listRecipes()]);
    state.recipes = recipes;
    if (workspace) {
      state.source = workspace.source; state.targetHeaders = workspace.targetHeaders; state.mappings = workspace.mappings; state.dedupeKeys = workspace.dedupeKeys; state.recipeName = workspace.recipeName;
      state.message = `Restored your local workspace from ${new Date(workspace.savedAt).toLocaleString()}.`;
    }
  } catch {
    state.message = "Local storage is unavailable. Export the recipe before closing this tab.";
  }
  render();
  verifyLicense(Boolean(license));
  registerServiceWorker();
}

function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  const register = async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) document.querySelector<HTMLElement>("#update-toast")!.hidden = false;
        });
      });
    } catch { state.message = "Offline installation is unavailable in this browser; the local transform tools still work."; render(); }
  };
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}

window.addEventListener("online", () => { state.online = true; state.message = "Back online. Local work was uninterrupted."; render(); });
window.addEventListener("offline", () => { state.online = false; state.message = "You are offline. The workspace, recipes, transforms, and exports remain available."; render(); });

bootstrap();
