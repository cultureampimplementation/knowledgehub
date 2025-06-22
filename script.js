// ====== CONFIG ======
const params = new URLSearchParams(window.location.search);
const SHEET_ID = params.get("sheetId");
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw9J5AnKEQDozmX5H5-bqe7JM7MWs4VSGiASGFKJ1rCIhPdmz1AStSpGv964pRQsbeuhg/exec';

// ====== Tabs ======
function showTab(tabId) {
  document.querySelectorAll(".tab-section").forEach(el => {
    el.style.display = el.id === tabId ? "block" : "none";
  });
  // Always show sidebar
  const sidebar = document.getElementById("sidebar");
  if (sidebar) sidebar.style.display = "block";
}

// ====== Submissions ======
document.addEventListener("DOMContentLoaded", () => {
  loadTabsFromSheet(); 
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

// ====== Dynamic Tabs from Sheet Names ======
async function loadTabsFromSheet() {
  try {
    const res = await fetch(`${SCRIPT_URL}?mode=sheets&sheetId=${SHEET_ID}`);
    const sheetNames = await res.json();

    const nav = document.getElementById("navTabs");
    const body = document.body;

    sheetNames.forEach(name => {
      const tabId = sanitizeId(name);

      // Add tab button
      const btn = document.createElement("button");
      btn.textContent = `📄 ${name}`;
      btn.dataset.tab = tabId;
      btn.onclick = () => showTab(tabId);
      nav.appendChild(btn);

      // Add tab content area
      const section = document.createElement("div");
      section.id = tabId;
      section.className = "tab-section";
      section.innerHTML = `<h2>${name}</h2><div id="${tabId}-table">Loading...</div>`;
      body.appendChild(section);

      // Load sheet data into it
      preloadSheetData(name, tabId);
    });
  } catch (err) {
    console.error("❌ Failed to load dynamic tabs:", err);
  }
}

function sanitizeId(name) {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

async function preloadSheetData(sheetName, tabId) {
  try {
    const res = await fetch(`${SCRIPT_URL}?mode=sheet&sheetId=${SHEET_ID}&sheetName=${encodeURIComponent(sheetName)}`);
    const data = await res.json();
    renderTable(data, `${tabId}-table`);
  } catch (err) {
    document.getElementById(`${tabId}-table`).textContent = "❌ Failed to load data.";
  }
}

function renderTable(data, containerId) {
  const container = document.getElementById(containerId);
  if (!data.length) {
    container.textContent = "No data available.";
    return;
  }

  const table = document.createElement("table");
  table.style.borderCollapse = "collapse";
  table.style.width = "100%";
  table.style.marginTop = "10px";

  const thead = document.createElement("thead");
  const headers = Object.keys(data[0]);
  const headerRow = document.createElement("tr");
  headers.forEach(h => {
    const th = document.createElement("th");
    th.textContent = h;
    th.style.borderBottom = "2px solid #ccc";
    th.style.padding = "8px";
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  data.forEach(row => {
    const tr = document.createElement("tr");
    headers.forEach(h => {
      const td = document.createElement("td");
      td.textContent = row[h];
      td.style.padding = "8px";
      td.style.borderBottom = "1px solid #eee";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  container.innerHTML = '';
  container.appendChild(table);
}

function showTab(tabId) {
  document.querySelectorAll(".tab-section").forEach(el => {
    el.style.display = el.id === tabId ? "block" : "none";
  });

  // Mark the active button
  document.querySelectorAll("#navTabs button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });

  const sidebar = document.getElementById("sidebar");
  if (sidebar) sidebar.style.display = "block";
}
