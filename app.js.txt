function saveLetter() {
  const letter = document.getElementById("letterInput").value;
  const date = document.getElementById("letterDate").value;

  if (!letter || !date) {
    alert("Please enter a letter and a date!");
    return;
  }

  let letters = JSON.parse(localStorage.getItem("futureLetters") || "[]");
  letters.push({ letter, date });
  localStorage.setItem("futureLetters", JSON.stringify(letters));
  displayLetters();
  document.getElementById("letterInput").value = "";
}

function displayLetters() {
  const letters = JSON.parse(localStorage.getItem("futureLetters") || "[]");
  const list = document.getElementById("letterList");
  list.innerHTML = "";

  const today = new Date().toISOString().split("T")[0];

  letters.forEach(item => {
    if (item.date <= today) {
      const li = document.createElement("li");
      li.innerText = `[${item.date}] ${item.letter}`;
      list.appendChild(li);
    }
  });
}

// Load saved letters on page load
displayLetters();
