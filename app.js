<script>
const dateInput = document.getElementById("dateInput");
const textInput = document.getElementById("textInput");
const saveBtn = document.getElementById("saveBtn");
const lettersList = document.getElementById("lettersList");


function loadLetters() {
const letters = JSON.parse(localStorage.getItem("letters") || "[]");
lettersList.innerHTML = "";


letters.forEach((letter, index) => {
const div = document.createElement("div");
div.className = "letter";


div.innerHTML = `
<div class="meta">📅 ${letter.date}</div>
<div class="content">${letter.text}</div>
<button class="deleteBtn" data-index="${index}">Delete</button>
`;


lettersList.appendChild(div);
});
}


saveBtn.addEventListener("click", () => {
const date = dateInput.value;
const text = textInput.value.trim();


if (!date || !text) return alert("Please fill everything!");


const letters = JSON.parse(localStorage.getItem("letters") || "[]");
letters.push({ date, text });
localStorage.setItem("letters", JSON.stringify(letters));


textInput.value = "";
dateInput.value = "";


loadLetters();
});


lettersList.addEventListener("click", (e) => {
if (e.target.classList.contains("deleteBtn")) {
const index = e.target.dataset.index;


const letters = JSON.parse(localStorage.getItem("letters") || "[]");
letters.splice(index, 1);
localStorage.setItem("letters", JSON.stringify(letters));


loadLetters();
}
});


loadLetters();
</script>
