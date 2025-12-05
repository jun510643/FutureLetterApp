// Theme Toggle
document.getElementById("themeToggle").addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
});

// Save Letters
const saveBtn = document.getElementById("saveBtn");
const letterInput = document.getElementById("letterInput");
const savedList = document.getElementById("savedList");

// Load saved letters on page load
window.addEventListener("load", () => {
    const saved = JSON.parse(localStorage.getItem("letters")) || [];
    saved.forEach(text => addLetter(text));
});

saveBtn.addEventListener("click", () => {
    const text = letterInput.value.trim();
    if (text === "") return;

    addLetter(text);

    const saved = JSON.parse(localStorage.getItem("letters")) || [];
    saved.push(text);
    localStorage.setItem("letters", JSON.stringify(saved));

    letterInput.value = "";
});

// Add letter to UI
function addLetter(text) {
    const li = document.createElement("li");
    li.textContent = text;
    savedList.appendChild(li);
}
