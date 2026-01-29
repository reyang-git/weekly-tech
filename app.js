let currentTopic = 'weekly';

function formatDate(isoString) {
  const date = new Date(isoString);
  const options = { weekday: 'long', day: 'numeric', month: 'short' };
  return date.toLocaleDateString('en-US', options);
}

function formatWeekOf(weekString) {
  const [year, month, day] = weekString.split('-');
  const date = new Date(year, month - 1, day);
  const options = { month: 'long', day: 'numeric', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

async function loadWeeklyBrief() {
  const metaEl = document.getElementById("meta");
  const storiesEl = document.getElementById("stories");

  metaEl.innerHTML = "Loading latest brief…";

  const res = await fetch("./briefs/latest.json", { cache: "no-store" });
  const data = await res.json();

  metaEl.innerHTML = `
    <h2>This Week in Innovation</h2>
    <div class="meta-row">
      <div class="meta-item">
        <span>Week of</span>
        <strong>${formatWeekOf(data.weekOf)}</strong>
      </div>
      <div class="divider"></div>
      <div class="meta-item">
        <span>Generated</span>
        <strong>${formatDate(data.generatedAt)}</strong>
      </div>
    </div>
    <p class="lead-text">${data.lead || ""}</p>
    
    <h2 style="margin-top: 28px; margin-bottom: 12px;">Emerging themes</h2>
    <ul>
      ${(data.themes || []).map(t => `<li>${t}</li>`).join("")}
    </ul>
  `;

  storiesEl.innerHTML = (data.stories || []).map(s => `
    <article class="story">
      <h2><a href="${s.link}" target="_blank" rel="noreferrer">${s.title}</a></h2>
      ${s.source ? `<div class="kicker" style="margin-top: 4px; margin-bottom: 12px;">${s.source}</div>` : ""}
      <p>${s.summary || ""}</p>
    </article>
  `).join("");
}

async function loadTopicBrief(topic) {
  const metaEl = document.getElementById("meta");
  const storiesEl = document.getElementById("stories");

  metaEl.innerHTML = `Loading ${topic} brief…`;
  
  try {
    const res = await fetch(`./briefs/topic-${topic}.json`, { cache: "no-store" });
    
    if (!res.ok) {
      throw new Error("Topic brief not found");
    }
    
    const data = await res.json();

    metaEl.innerHTML = `
      <h2>${data.topic.charAt(0).toUpperCase() + data.topic.slice(1)} in Focus</h2>
      <div class="meta-row">
        <div class="meta-item">
          <span>Week of</span>
          <strong>${formatWeekOf(data.weekOf)}</strong>
        </div>
        <div class="divider"></div>
        <div class="meta-item">
          <span>Generated</span>
          <strong>${formatDate(data.generatedAt)}</strong>
        </div>
      </div>
      <p class="lead-text">${data.lead || ""}</p>
    `;

    if (data.stories && data.stories.length > 0) {
      storiesEl.innerHTML = data.stories.map(s => `
        <article class="story">
          <h2><a href="${s.link}" target="_blank" rel="noreferrer">${s.title}</a></h2>
          ${s.source ? `<div class="kicker" style="margin-top: 4px; margin-bottom: 12px;">${s.source}</div>` : ""}
          <p>${s.summary || ""}</p>
        </article>
      `).join("");
    } else {
      storiesEl.innerHTML = `
        <article class="story">
          <p>No articles found for this topic this week. Check back next week!</p>
        </article>
      `;
    }

  } catch (error) {
    metaEl.innerHTML = `
      <h2>${topic.charAt(0).toUpperCase() + topic.slice(1)} Brief</h2>
      <p class="lead-text">This topic brief hasn't been generated yet. It will be available after the next weekly update.</p>
    `;
    storiesEl.innerHTML = "";
  }
}

function setActiveTopic(topic) {
  currentTopic = topic;
  
  document.querySelectorAll('.topic-btn').forEach(btn => {
    if (btn.dataset.topic === topic) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  if (topic === 'weekly') {
    loadWeeklyBrief();
  } else {
    loadTopicBrief(topic);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadWeeklyBrief().catch(err => {
    document.getElementById("meta").innerHTML = "Failed to load brief.";
    console.error(err);
  });

  document.querySelectorAll('.topic-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setActiveTopic(btn.dataset.topic);
    });
  });
});