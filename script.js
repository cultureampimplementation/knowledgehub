// ====== CONFIG ======
const SHEET_ID = 'PASTE_YOUR_SHEET_ID_HERE';
const SCRIPT_URL = 'PASTE_YOUR_SCRIPT_URL_HERE';

// ====== Tabs ======
function showTab(tabId) {
  document.querySelectorAll(".tab-section").forEach(el => {
    el.style.display = el.id === tabId ? "block" : "none";
  });
}

// ====== Submissions ======
document.addEventListener("DOMContentLoaded", () => {
  setupForm();
  loadSubmissions();
  loadSidebarMeetings();
  drawGantt();
});

function setupForm() {
  const form = document.getElementById("myForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    formData.append("sheetId", SHEET_ID);

    try {
      const res = await fetch(SCRIPT_URL, { method: "POST", body: formData });
      const text = await res.text();
      document.getElementById("response").textContent = text;
      form.reset();
      loadSubmissions();
    } catch (err) {
      document.getElementById("response").textContent = "❌ Submission failed.";
    }
  });
}

async function loadSubmissions() {
  try {
    const res = await fetch(`${SCRIPT_URL}?sheetId=${SHEET_ID}`);
    const data = await res.json();
    const container = document.getElementById("submissionList");
    container.innerHTML = '';
    data.forEach(entry => {
      const div = document.createElement("div");
      div.textContent = `${entry.Name || 'Anon'}: ${entry.Message || ''}`;
      container.appendChild(div);
    });
  } catch (err) {
    document.getElementById("submissionList").textContent = "❌ Failed to load submissions.";
  }
}

// ====== Sidebar ======
async function loadSidebarMeetings() {
  try {
    const domain = "cultureamp.com";
    const res = await fetch(`${SCRIPT_URL}?mode=meetings&domain=${domain}`);
    const meetings = await res.json();
    renderGroupedMeetings(meetings);
  } catch (err) {
    document.getElementById("upcomingMeetings").textContent = "❌ Failed to load meetings.";
  }
}

function renderGroupedMeetings(meetings) {
  const grouped = {};
  meetings.forEach(m => {
    const start = new Date(m["Start Time"]);
    const key = start.toISOString().slice(0, 10);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  });

  const container = document.getElementById("upcomingMeetings");
  container.innerHTML = '';
  Object.keys(grouped).sort().forEach(date => {
    const section = document.createElement("div");
    section.className = "week-group";
    const h3 = document.createElement("h3");
    h3.textContent = `Week of ${date}`;
    section.appendChild(h3);
    grouped[date].forEach(event => {
      const card = document.createElement("div");
      card.className = "event-card";
      card.innerHTML = `<strong>${event.Title}</strong><div class='meta'>📅 ${event["Start Time"]}</div>`;
      section.appendChild(card);
    });
    container.appendChild(section);
  });
}

// ====== Gantt ======
async function drawGantt() {
  try {
    const res = await fetch(`${SCRIPT_URL}?mode=gantt&sheetId=${SHEET_ID}`);
    const { values, widths } = await res.json();

    const canvas = document.getElementById("ganttCanvas");
    const ctx = canvas.getContext("2d");
    const rowHeight = 24;
    let y = 0;

    values.forEach((row, rowIndex) => {
      let x = 0;
      row.forEach((cell, colIndex) => {
        const colWidth = widths[colIndex] || 100;
        ctx.fillStyle = cell ? "#dbeafe" : "#fff";
        ctx.strokeStyle = "#ccc";
        ctx.fillRect(x, y, colWidth, rowHeight);
        ctx.strokeRect(x, y, colWidth, rowHeight);
        x += colWidth;
      });
      y += rowHeight;
    });
  } catch (err) {
    console.error("Failed to draw Gantt chart:", err);
  }
}
