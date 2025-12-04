// FutureLetterWeb v1.1.0.0
// Features: Save, Edit, Delete, Sort, Category, Search, Export/Import, Theme toggle, simple PIN lock (from settings)

const STORAGE_KEY = "futureLetters";
const SETTINGS_PATH = "config/settings.json"; // not fetched automatically in static files; settings.json is read manually if needed

// --- helpers from scripts/utils.js (redundant fallback) ---
function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString();
}
function safeParse(v) {
  try { return JSON.parse(v || "[]"); } catch(e){ return []; }
}

// --- load settings (basic, from config/settings.json by fetch) ---
let appSettings = { theme: "light", sortOrder: "asc", pin: "" };

fetch("config/settings.json")
  .then(r => r.ok ? r.json() : null)
  .then(json => { if (json) appSettings = Object.assign(appSettings, json); applyTheme(appSettings.theme); })
  .catch(()=> applyTheme(appSettings.theme));

// --- PIN lock if set ---
if (appSettings && appSettings.pin && appSettings.pin.length) {
  const provided = prompt("Enter PIN to open FutureLetterWeb:");
  if (provided !== appSettings.pin) {
    alert("Incorrect PIN. The app will run in read-only mode.");
  }
}

// --- DOM refs ---
const letterInput = () => document.getElementById("letterInput");
const letterDate = () => document.getElementById("letterDate");
const letterCategory = () => document.getElementById("letterCategory");
const letterListEl = () => document.getElementById("letterList");
const charCountEl = () => document.getElementById("charCount");
const searchInput = () => document.getElementById("searchInput");
const filterCategory = () => document.getElementById("filterCategory");

// --- init bindings ---
window.addEventListener("load", () => {
  bindUI();
  displayLetters();
});

function bindUI() {
  document.getElementById("saveBtn").addEventListener("click", saveLetter);
  document.getElementById("sortBtn").addEventListener("click", sortLetters);
  document.getElementById("searchInput").addEventListener("input", displayLetters);
  document.getElementById("filterCategory").addEventListener("change", displayLetters);
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);
  document.getElementById("backupBtn").addEventListener("click", exportLetters);
  document.getElementById("importBtn").addEventListener("click", () => document.getElementById('importFile').click());
  document.getElementById("importFile").addEventListener("change", importFromFile);
  letterInput().addEventListener("input", updateCharCount);
  updateCharCount();
}

function updateCharCount() {
  const text = (letterInput() && letterInput().value) || "";
  const el = charCountEl();
  if (el) el.textContent = `${text.length} chars`;
}

function getLetters() {
  return safeParse(localStorage.getItem(STORAGE_KEY));
}
function saveLetters(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

// --- core features ---
function saveLetter() {
  const text = letterInput().value.trim();
  const date = letterDate().value;
  const category = letterCategory().value || "general";

  if (!text || !date) {
    showStatus("Please enter a letter and select a date.", true);
    return;
  }

  const letters = getLetters();
  letters.push({ letter: text, date, category, createdAt: new Date().toISOString() });
  saveLetters(letters);
  displayLetters();
  letterInput().value = "";
  letterDate().value = "";
  updateCharCount();
  showStatus("Saved.");
}

function displayLetters() {
  const letters = getLetters();
  const listEl = letterListEl();
  listEl.innerHTML = "";

  const filter = (searchInput().value || "").toLowerCase();
  const catFilter = filterCategory().value;

  letters.forEach((item, index) => {
    if (catFilter !== "all" && item.category !== catFilter) return;
    if (filter && !((item.letter || "").toLowerCase().includes(filter) || (item.category||"").includes(filter))) return;

    const li = document.createElement("li");
    li.className = "letter-item";
    const today = new Date().toISOString().split("T")[0];
    if (item.date > today) li.classList.add("future");

    const body = document.createElement("div");
    body.className = "letter-body";
    const meta = document.createElement("div");
    meta.className = "letter-meta";
    meta.textContent = `${formatDate(item.date)} • ${capitalize(item.category)}`;
    const text = document.createElement("div");
    text.textContent = item.letter;
    body.appendChild(meta);
    body.appendChild(text);

    const actions = document.createElement("div");
    actions.className = "letter-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "icon-btn";
    editBtn.textContent = "✏️";
    editBtn.onclick = () => editLetter(index);
    const delBtn = document.createElement("button");
    delBtn.className = "icon-btn";
    delBtn.textContent = "❌";
    delBtn.onclick = () => deleteLetter(index);

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    li.appendChild(body);
    li.appendChild(actions);

    listEl.appendChild(li);
  });
}

function deleteLetter(index) {
  const letters = getLetters();
  if (!letters[index]) return;
  if (!confirm("Delete this letter?")) return;
  letters.splice(index, 1);
  saveLetters(letters);
  displayLetters();
  showStatus("Deleted.");
}

function editLetter(index) {
  const letters = getLetters();
  if (!letters[index]) return;
  const item = letters[index];
  const newText = prompt("Edit your letter:", item.letter);
  if (newText === null) return;
  item.letter = newText.trim();
  letters[index] = item;
  saveLetters(letters);
  displayLetters();
  showStatus("Edited.");
}

function sortLetters() {
  const letters = getLetters();
  letters.sort((a,b) => new Date(a.date) - new Date(b.date));
  saveLetters(letters);
  displayLetters();
  showStatus("Sorted.");
}

// --- export / import ---
function exportLetters() {
  const data = localStorage.getItem(STORAGE_KEY) || "[]";
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `FutureLetter_backup_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showStatus("Exported local backup.");
}

function importFromFile(evt) {
  const file = evt.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error("Invalid format");
      saveLetters(imported);
      displayLetters();
      showStatus("Imported successfully.");
    } catch (err) {
      alert("Import failed: invalid file.");
    }
  };
  reader.readAsText(file);
}

// --- UI helpers ---
function showStatus(msg, isError=false) {
  const el = document.getElementById("statusMsg");
  if (!el) return;
  el.textContent = msg;
  el.style.color = isError ? "crimson" : "green";
  setTimeout(()=> { if (el.textContent === msg) el.textContent = ""; }, 3000);
}

function capitalize(s){ return (s && s[0]) ? s[0].toUpperCase()+s.slice(1) : s; }

// --- theme toggle ---
function applyTheme(name) {
  if (name === "dark") document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
}
function toggleTheme() {
  const isDark = document.documentElement.classList.toggle("dark");
  appSettings.theme = isDark ? "dark" : "light";
  try { localStorage.setItem("appSettings", JSON.stringify(appSettings)); } catch {}
  showStatus(isDark ? "Dark mode" : "Light mode");
}
