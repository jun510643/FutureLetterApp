// FutureLetterWeb M. v1.1.4 - Alpha (full features)
// Features: save, delete, date, category, search, sort, theme toggle (dark/light), settings modal,
// automatic backups (localStorage + optional auto-download), animations, auto-resize textarea

const STORAGE_KEY = "futureLetters_v114_alpha";
const SETTINGS_KEY = "FL_settings_v114_alpha";
const BACKUP_PREFIX = "FL_backup_";

// --- DOM refs
const letterInput = () => document.getElementById("letterInput");
const deliveryDate = () => document.getElementById("deliveryDate");
const categorySelect = () => document.getElementById("categorySelect");
const saveBtn = () => document.getElementById("saveBtn");
const letterList = () => document.getElementById("letterList");
const charCount = () => document.getElementById("charCount");
const statusMsg = () => document.getElementById("statusMsg");
const themeToggleBtn = () => document.getElementById("themeToggle");

// settings modal refs
const settingsModal = document.getElementById("settingsModal");
const openSettingsBtn = document.getElementById("openSettings");
const closeSettingsBtn = document.getElementById("closeSettings");
const saveSettingsBtn = document.getElementById("saveSettings");
const autoBackupToggle = document.getElementById("autoBackupToggle");
const backupIntervalInput = document.getElementById("backupInterval");
const autoDownloadToggle = document.getElementById("autoDownloadToggle");

// controls
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importFileInput = document.getElementById("importFile");
const searchInput = document.getElementById("searchInput");
const filterCategory = document.getElementById("filterCategory");
const sortBtn = document.getElementById("sortBtn");

// app settings default
let settings = {
  theme: "light",
  autoBackup: false,
  backupIntervalMinutes: 15,
  autoDownload: false
};

let backupTimerId = null;

// --- utilities
function nowIsoDate() { return new Date().toISOString(); }
function formatDate(dateStr){
  if(!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString();
}
function safeParse(v){ try { return JSON.parse(v||"[]"); } catch(e){ return []; } }

// --- load settings
function loadSettings(){
  const s = safeParse(localStorage.getItem(SETTINGS_KEY) || "{}");
  settings = Object.assign(settings, s);
  applyTheme(settings.theme);
  autoBackupToggle.checked = !!settings.autoBackup;
  backupIntervalInput.value = settings.backupIntervalMinutes || 15;
  autoDownloadToggle.checked = !!settings.autoDownload;
  scheduleBackup();
}
function saveSettings(){
  settings.autoBackup = !!autoBackupToggle.checked;
  settings.backupIntervalMinutes = Math.max(1, Math.min(1440, parseInt(backupIntervalInput.value || 15)));
  settings.autoDownload = !!autoDownloadToggle.checked;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  scheduleBackup();
  showStatus("Settings saved.");
}

// --- theme
function applyTheme(name){
  if(name === "dark") document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
  settings.theme = name;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
function toggleTheme(){
  const isDark = document.documentElement.classList.toggle("dark");
  settings.theme = isDark ? "dark" : "light";
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  showStatus(isDark ? "Dark mode" : "Light mode");
}

// --- storage
function getLetters(){ return safeParse(localStorage.getItem(STORAGE_KEY)); }
function saveLetters(arr){ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }

// --- UI helpers
function showStatus(msg, isError=false){
  const el = statusMsg();
  if(!el) return;
  el.textContent = msg;
  el.style.color = isError ? "crimson" : "green";
  setTimeout(()=>{ if(el.textContent === msg) el.textContent = ""; }, 3000);
}
function updateCharCount(){
  if(!charCount()) return;
  const n = (letterInput().value || "").length;
  charCount().textContent = `${n} chars`;
}
function autoResizeTextarea(){
  const ta = letterInput();
  if(!ta) return;
  ta.style.height = "auto";
  ta.style.height = (ta.scrollHeight) + "px";
}

// --- core features
function saveLetter(){
  const text = (letterInput().value || "").trim();
  const date = (deliveryDate().value || "").trim();
  const category = (categorySelect().value || "general");

  if(!text || !date){
    alert("Please enter a letter and choose a date.");
    return;
  }

  const letters = getLetters();
  letters.push({ id: Date.now(), letter: text, date, category, createdAt: nowIsoDate() });
  saveLetters(letters);
  letterInput().value = ""; deliveryDate().value = ""; categorySelect().value = "general";
  updateCharCount(); autoResizeTextarea();
  renderLetters();
  showStatus("Saved.");

  // if immediate backup requested, create one
  if(settings.autoBackup && settings.autoDownload){
    createDownloadBackup(letters);
  }
}

function renderLetters(){
  const letters = getLetters();
  const list = letterList();
  list.innerHTML = "";
  const filter = (searchInput.value || "").toLowerCase();
  const cat = filterCategory.value || "all";

  // sort by date ascending by default
  letters.sort((a,b) => new Date(a.date) - new Date(b.date));

  letters.forEach((item, idx) => {
    if(cat !== "all" && item.category !== cat) return;
    if(filter && !((item.letter||"").toLowerCase().includes(filter) || (item.category||"").toLowerCase().includes(filter))) return;

    const li = document.createElement("li");
    li.className = "letter-item";
    if(item.date > new Date().toISOString().split("T")[0]) li.classList.add("future");

    // body
    const body = document.createElement("div");
    body.className = "letter-body";
    const meta = document.createElement("div");
    meta.className = "letter-meta";
    meta.textContent = `${formatDate(item.date)} • ${capitalize(item.category)}`;
    const text = document.createElement("div");
    text.textContent = item.letter;
    body.appendChild(meta); body.appendChild(text);

    // actions
    const actions = document.createElement("div");
    actions.className = "letter-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "icon-btn";
    editBtn.textContent = "✏️";
    editBtn.title = "Edit";
    editBtn.onclick = () => editLetter(item.id);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-danger";
    deleteBtn.textContent = "Delete";
    deleteBtn.onclick = () => deleteLetterById(item.id);

    actions.appendChild(editBtn); actions.appendChild(deleteBtn);

    li.appendChild(body); li.appendChild(actions);
    list.appendChild(li);
  });
}

function deleteLetterById(id){
  if(!confirm("Delete this letter?")) return;
  let letters = getLetters();
  letters = letters.filter(l => l.id !== id);
  saveLetters(letters);
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
  saveLetters(letters);
  renderLetters();
  showStatus("Edited.");
}

// sort toggle (asc/desc)
let sortAsc = true;
function sortLetters(){
  let letters = getLetters();
  letters.sort((a,b) => sortAsc ? (new Date(a.date)-new Date(b.date)) : (new Date(b.date)-new Date(a.date)));
  sortAsc = !sortAsc;
  saveLetters(letters);
  renderLetters();
  showStatus("Sorted.");
}

// export / import
function exportLetters(){
  const data = localStorage.getItem(STORAGE_KEY) || "[]";
  const blob = new Blob([data], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `FutureLetter_backup_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showStatus("Exported backup.");
}

function importLettersFromFile(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if(!Array.isArray(imported)) throw new Error("Invalid file format.");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
      renderLetters();
      showStatus("Imported backup.");
    } catch(err){
      alert("Import failed: invalid file.");
    }
  };
  reader.readAsText(file);
}

// --- auto backup functions
function createBackup(){
  const data = localStorage.getItem(STORAGE_KEY) || "[]";
  const ts = new Date().toISOString();
  try {
    localStorage.setItem(BACKUP_PREFIX + ts, data);
    showStatus("Auto-backup saved.");
    // optionally trigger download
    if(settings.autoDownload) createDownloadBackup(JSON.parse(data));
  } catch(e) {
    console.warn("Backup failed:", e);
    showStatus("Auto-backup failed.", true);
  }
}
function createDownloadBackup(lettersArray){
  const json = JSON.stringify(lettersArray || getLetters());
  const blob = new Blob([json], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `FL_backup_${new Date().toISOString().slice(0,10,)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// schedule / cancel backup
function scheduleBackup(){
  if(backupTimerId) { clearInterval(backupTimerId); backupTimerId = null; }
  if(settings.autoBackup){
    const minutes = Math.max(1, settings.backupIntervalMinutes || 15);
    backupTimerId = setInterval(createBackup, minutes * 60 * 1000);
  }
}

// --- misc helpers
function capitalize(s){ return s && s.length ? s[0].toUpperCase()+s.slice(1) : s; }

// --- event bindings
window.addEventListener("load", () => {
  // load settings, letters, render
  const savedSettings = safeParse(localStorage.getItem(SETTINGS_KEY) || "{}");
  settings = Object.assign(settings, savedSettings);
  applyTheme(settings.theme);

  // populate settings modal fields if present
  try {
    autoBackupToggle.checked = !!settings.autoBackup;
    backupIntervalInput.value = settings.backupIntervalMinutes || 15;
    autoDownloadToggle.checked = !!settings.autoDownload;
  } catch(e){}

  renderLetters(); updateCharCount(); autoResizeTextarea();
  scheduleBackup();
});

// input listeners
letterInput().addEventListener("input", () => { updateCharCount(); autoResizeTextarea(); });
saveBtn().addEventListener("click", saveLetter);

// theme toggle
themeToggleBtn().addEventListener("click", toggleTheme);

// search/filter/sort
searchInput.addEventListener("input", renderLetters);
filterCategory.addEventListener("change", renderLetters);
sortBtn.addEventListener("click", sortLetters);

// settings modal open/close
openSettingsBtn.addEventListener("click", () => { settingsModal.setAttribute("aria-hidden","false"); });
closeSettingsBtn.addEventListener("click", () => { settingsModal.setAttribute("aria-hidden","true"); });
saveSettingsBtn.addEventListener("click", () => { saveSettings(); settingsModal.setAttribute("aria-hidden","true"); });

// export / import
exportBtn.addEventListener("click", exportLetters);
importBtn.addEventListener("click", () => importFileInput.click());
importFileInput.addEventListener("change", (e) => importLettersFromFile(e.target.files[0]));

// convenience: save settings & handle toggles when user interacts with modal fields
autoBackupToggle.addEventListener("change", () => { settings.autoBackup = autoBackupToggle.checked; saveSettings(); });
backupIntervalInput.addEventListener("change", () => { settings.backupIntervalMinutes = parseInt(backupIntervalInput.value || 15); saveSettings(); });
autoDownloadToggle.addEventListener("change", () => { settings.autoDownload = autoDownloadToggle.checked; saveSettings(); });

// helper to save settings
function saveSettings(){ localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); scheduleBackup(); showStatus("Settings saved."); }
