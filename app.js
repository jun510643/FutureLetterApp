// FutureLetterWeb M. v1.2.0 - Alpha
// Focused update: Auto-save stability, font-size setting, dark-mode animations,
// improved wrapping, UI polish, faster load, error feedback

const STORAGE_KEY = "futureLetters_v120_alpha";
const SETTINGS_KEY = "FL_settings_v120_alpha";
const BACKUP_PREFIX = "FL_backup_v120_";

// DOM helpers (safe getters)
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// element refs
const letterInput = () => $("#letterInput");
const deliveryDate = () => $("#deliveryDate");
const categorySelect = () => $("#categorySelect");
const saveBtn = () => $("#saveBtn");
const letterListEl = () => $("#letterList");
const charCountEl = () => $("#charCount");
const statusMsgEl = () => $("#statusMsg");
const themeToggleBtn = () => $("#themeToggle");
const openSettingsBtn = () => $("#openSettings");
const settingsModalEl = () => $("#settingsModal");

const searchInput = document.getElementById("searchInput");
const filterCategory = document.getElementById("filterCategory");
const sortSelect = document.getElementById("sortSelect");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importFile = document.getElementById("importFile");
const themeSelect = document.getElementById("themeSelect");
const autoBackupToggle = document.getElementById("autoBackupToggle");
const backupIntervalInput = document.getElementById("backupInterval");
const autoDownloadToggle = document.getElementById("autoDownloadToggle");
const fontSizeSelect = document.getElementById("fontSizeSelect");
const resetSettingsBtn = document.getElementById("resetSettingsBtn");
const saveSettingsBtn = document.getElementById("saveSettings");
const closeSettingsBtn = document.getElementById("closeSettings");
const clearAllBtn = document.getElementById("clearAllBtn");

// default settings
let settings = {
  theme: "light",               // light | dark | auto
  autoBackup: false,
  backupIntervalMinutes: 15,
  autoDownload: false,
  fontSize: 16
};

let backupTimer = null;
let saveLock = false; // prevents concurrent saves
let debounceTimer = null;

// small utilities
function nowIso() { return new Date().toISOString(); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
function safeParse(v){ try { return JSON.parse(v || "[]"); } catch(e){ return []; } }
function showStatus(msg, isError=false){
  const s = statusMsgEl();
  if(!s) return;
  s.textContent = msg;
  s.style.color = isError ? "crimson" : "green";
  setTimeout(()=> { if(s.textContent === msg) s.textContent = ""; }, 3000);
}

// storage helpers
function getLetters(){ return safeParse(localStorage.getItem(STORAGE_KEY)); }
function saveLetters(arr){ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }

// load settings
function loadSettings(){
  const s = safeParse(localStorage.getItem(SETTINGS_KEY) || "{}");
  settings = Object.assign(settings, s);
  applyTheme(settings.theme);
  document.documentElement.style.setProperty('--font-size', settings.fontSize + 'px');
  if(themeSelect) themeSelect.value = settings.theme;
  if(autoBackupToggle) autoBackupToggle.checked = !!settings.autoBackup;
  if(backupIntervalInput) backupIntervalInput.value = settings.backupIntervalMinutes || 15;
  if(autoDownloadToggle) autoDownloadToggle.checked = !!settings.autoDownload;
  if(fontSizeSelect) fontSizeSelect.value = settings.fontSize;
  scheduleBackup();
}

// persist settings
function persistSettings(){
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// theme & animation support
function applyTheme(name){
  if(name === "dark") document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
  settings.theme = name;
  persistSettings();
}
function toggleTheme(){
  // smooth animation: add transition class then toggle
  document.documentElement.classList.add("theme-transition");
  window.setTimeout(()=> document.documentElement.classList.remove("theme-transition"), 400);
  const isDark = document.documentElement.classList.toggle("dark");
  settings.theme = isDark ? "dark" : "light";
  persistSettings();
  showStatus(isDark ? "Dark mode" : "Light mode");
}

// auto-resize and wrapping improvements
function autoResizeTextarea(){
  const ta = letterInput();
  if(!ta) return;
  ta.style.height = "auto";
  // give a small clamp to avoid giant growth
  const newH = Math.min(600, ta.scrollHeight);
  ta.style.height = newH + "px";
}

// improved wrapping: normalize spaces and line breaks to avoid odd splits
function normalizeTextForDisplay(s){
  if(!s) return "";
  // replace multiple spaces with single, preserve intentional line breaks
  return s.replace(/\u00A0/g, " ").replace(/[ \t]{2,}/g, " ").trim();
}

// safe save with lock to prevent race conditions
async function safeSaveLetters(arr){
  if(saveLock) {
    // queue a short retry
    setTimeout(()=> safeSaveLetters(arr), 120);
    return;
  }
  saveLock = true;
  try {
    saveLetters(arr);
  } catch(e){
    console.error("Save failed", e);
    showStatus("Save failed. Try again.", true);
  } finally {
    saveLock = false;
  }
}

// render letters with minimal DOM churn
function renderLetters(){
  const all = getLetters();
  const list = letterListEl();
  if(!list) return;
  const filter = (searchInput ? searchInput.value : "").toLowerCase();
  const cat = (filterCategory ? filterCategory.value : "all");
  const sortMode = (sortSelect ? sortSelect.value : "date_asc");

  let items = all.slice();
  if(cat !== "all") items = items.filter(i => i.category === cat);
  if(filter) items = items.filter(i => (i.letter||"").toLowerCase().includes(filter) || (i.category||"").toLowerCase().includes(filter));

  // sort
  if(sortMode === "date_asc") items.sort((a,b)=> new Date(a.date)-new Date(b.date));
  else if(sortMode === "date_desc") items.sort((a,b)=> new Date(b.date)-new Date(a.date));
  else if(sortMode === "created_desc") items.sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));

  // render fresh (keeps logic simple; still fast for small lists)
  list.innerHTML = "";
  const today = new Date().toISOString().split("T")[0];

  items.forEach(item => {
    const li = document.createElement("li");
    li.className = "letter-item";
    if(item.date > today) li.classList.add("future");

    const body = document.createElement("div");
    body.className = "letter-body";

    const meta = document.createElement("div");
    meta.className = "letter-meta";
    meta.textContent = `${formatDate(item.date)} • ${capitalize(item.category)}`;

    const textDiv = document.createElement("div");
    textDiv.textContent = normalizeTextForDisplay(item.letter);

    body.appendChild(meta);
    body.appendChild(textDiv);

    const actions = document.createElement("div");
    actions.className = "letter-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "icon-btn";
    editBtn.textContent = "✏️";
    editBtn.onclick = () => editLetter(item.id);

    const delBtn = document.createElement("button");
    delBtn.className = "icon-btn";
    delBtn.textContent = "Delete";
    delBtn.onclick = () => removeLetterWithAnimation(item.id, li);

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    li.appendChild(body);
    li.appendChild(actions);
    list.appendChild(li);
  });
}

function formatDate(dateStr){
  if(!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString();
}

// save a new letter (with additional safety & immediate write)
function saveLetter(){
  const text = (letterInput().value || "").trim();
  const date = (deliveryDate().value || "").trim();
  const category = (categorySelect().value || "general");
  if(!text || !date){ alert("Please enter a letter and choose a date."); return; }

  const letters = getLetters();
  const newItem = { id: uid(), letter: text, date, category, createdAt: nowIso() };
  letters.push(newItem);
  safeSaveLetters(letters);
  // UI reset & render
  letterInput().value = "";
  deliveryDate().value = "";
  categorySelect().value = "general";
  updateCharCount();
  autoResizeTextarea();
  renderLetters();
  showSavePulse();
  // optional immediate backup
  if(settings.autoBackup && settings.autoDownload) createDownloadBackup(letters);
}

// delete with animation
function removeLetterWithAnimation(id, element){
  element.classList.add("removing");
  setTimeout(()=> {
    deleteLetterById(id);
  }, 240);
}

function deleteLetterById(id){
  let letters = getLetters();
  letters = letters.filter(l => l.id !== id);
  safeSaveLetters(letters);
  renderLetters();
  showStatus("Deleted.");
}

function editLetter(id){
  const letters = getLetters();
  const idx = letters.findIndex(l => l.id === id);
  if(idx === -1) return;
  const current = letters[idx];
  const newText = prompt("Edit your letter:", current.letter);
  if(newText === null) return;
  current.letter = newText.trim();
  letters[idx] = current;
  safeSaveLetters(letters);
  renderLetters();
  showStatus("Edited.");
}

// export / import
function exportLetters(){
  const data = localStorage.getItem(STORAGE_KEY) || "[]";
  try {
    const blob = new Blob([data], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `FL_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showStatus("Exported backup.");
  } catch(e){
    showStatus("Export failed.", true);
  }
}

function importLettersFromFile(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if(!Array.isArray(imported)) throw new Error("Invalid file format.");
      safeSaveLetters(imported);
      renderLetters();
      showStatus("Imported backup.");
    } catch(err){
      alert("Import failed: invalid file.");
    }
  };
  reader.readAsText(file);
}

// backup functions (timestamped localStorage keys)
function createBackup(){
  const data = localStorage.getItem(STORAGE_KEY) || "[]";
  const ts = new Date().toISOString();
  try {
    localStorage.setItem(BACKUP_PREFIX + ts, data);
    showStatus("Auto-backup saved.");
    if(settings.autoDownload) createDownloadBackup(JSON.parse(data));
  } catch(e){
    console.warn("Backup failed:", e);
    showStatus("Auto-backup failed.", true);
  }
}
function createDownloadBackup(lettersArray){
  try {
    const json = JSON.stringify(lettersArray || getLetters());
    const blob = new Blob([json], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `FL_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  } catch(e){
    console.warn("Download backup failed", e);
  }
}

// schedule / cancel backup timer
function scheduleBackup(){
  if(backupTimer) clearInterval(backupTimer);
  if(settings.autoBackup){
    const mins = Math.max(1, settings.backupIntervalMinutes || 15);
    backupTimer = setInterval(createBackup, mins * 60 * 1000);
  }
}

// small UI helpers
function showSavePulse(){
  showStatus("Saved.");
  const btn = saveBtn();
  if(!btn) return;
  try {
    btn.animate([{ transform:'scale(1)'},{ transform:'scale(1.04)'},{ transform:'scale(1)'}],{ duration: 300 });
  } catch(e){}
}
function capitalize(s){ return s && s[0] ? s[0].toUpperCase()+s.slice(1) : s; }

// keyboard shortcut: Ctrl/Cmd+S to save
window.addEventListener("keydown", (e) => {
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's'){
    e.preventDefault();
    saveLetter();
  }
});

// debounce helper
function debounce(fn, wait){
  return function(...args){
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(()=> fn.apply(this, args), wait);
  };
}

// persistence and initialization
window.addEventListener("load", () => {
  // ensure elements exist
  loadSettings();
  renderLetters();
  updateCharCount();
  autoResizeTextarea();

  // event bindings (guarded)
  if(letterInput()){
    letterInput().addEventListener("input", () => { updateCharCount(); autoResizeTextarea(); });
  }
  if(saveBtn()) saveBtn().addEventListener("click", saveLetter);
  if(filterCategory) filterCategory.addEventListener("change", debounce(renderLetters, 160));
  if(searchInput) searchInput.addEventListener("input", debounce(renderLetters, 220));
  if(sortSelect) sortSelect.addEventListener("change", renderLetters);
  if(exportBtn) exportBtn.addEventListener("click", exportLetters);
  if(importBtn) importBtn.addEventListener("click", () => importFile.click());
  if(importFile) importFile.addEventListener("change", (e) => importLettersFromFile(e.target.files[0]));

  if(themeToggleBtn) themeToggleBtn.addEventListener("click", toggleTheme);
  if(openSettingsBtn) openSettingsBtn.addEventListener("click", () => settingsModalEl().setAttribute("aria-hidden","false"));
  if(closeSettingsBtn) closeSettingsBtn.addEventListener("click", () => settingsModalEl().setAttribute("aria-hidden","true"));

  if(saveSettingsBtn) saveSettingsBtn.addEventListener("click", () => {
    if(themeSelect) settings.theme = themeSelect.value;
    if(autoBackupToggle) settings.autoBackup = !!autoBackupToggle.checked;
    if(backupIntervalInput) settings.backupIntervalMinutes = Math.max(1, parseInt(backupIntervalInput.value || 15));
    if(autoDownloadToggle) settings.autoDownload = !!autoDownloadToggle.checked;
    if(fontSizeSelect) settings.fontSize = parseInt(fontSizeSelect.value || 16);

    document.documentElement.style.setProperty('--font-size', settings.fontSize + 'px');
    persistSettings();
    scheduleBackup();
    settingsModalEl().setAttribute("aria-hidden","true");
    showStatus("Settings saved.");
  });

  if(resetSettingsBtn) resetSettingsBtn.addEventListener("click", () => {
    settings = { theme:"light", autoBackup:false, backupIntervalMinutes:15, autoDownload:false, fontSize:16 };
    persistSettings(); loadSettings(); showStatus("Settings reset.");
  });

  if(clearAllBtn) clearAllBtn.addEventListener("click", () => {
    if(!confirm("Clear all saved letters? This cannot be undone.")) return;
    localStorage.removeItem(STORAGE_KEY);
    renderLetters();
    showStatus("All cleared.");
  });

  // schedule initial backup if enabled
  scheduleBackup();
});

// helper to update char count (safe)
function updateCharCount(){
  if(!charCountEl()) return;
  const n = (letterInput() && letterInput().value) ? letterInput().value.length : 0;
  charCountEl().textContent = `${n} chars`;
}
