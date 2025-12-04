function saveLetter() {
  const letter = document.getElementById("letterInput").value.trim();
  const date = document.getElementById("letterDate").value;

  if (!letter || !date) {
    alert("Please enter a letter and select a date!");
    return;
  }

  let letters = JSON.parse(localStorage.getItem("futureLetters") || "[]");
  letters.push({ letter, date });
  localStorage.setItem("futureLetters", JSON.stringify(letters));
  displayLetters();

  document.getElementById("letterInput").value = "";
  document.getElementById("letterDate").value = "";
}

function displayLetters() {
  const letters = JSON.parse(localStorage.getItem("futureLetters") || "[]");
  const list = document.getElementById("letterList");
  list.innerHTML = "";

  const today = new Date().toISOString().split("T")[0];

  letters.forEach(item => {
    const li = document.createElement("li");
    li.innerText = `[${item.date}] ${item.letter}`;
    if (item.date > today) {
      li.style.opacity = 0.5;
      li.title = "Future letter";
    }
    list.appendChild(li);
  });
}

window.onload = displayLetters;
