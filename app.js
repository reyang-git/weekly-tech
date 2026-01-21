let currentTopic = 'weekly';

async function loadWeeklyBrief() {
  const metaEl = document.getElementById("meta");
  const themesEl = document.getElementById("themes");
  const storiesEl = document.getElementById("stories");

  metaEl.innerHTML = "Loading latest brief…";
  themesEl.style.display = "block";

  const res = await fetch("./briefs/latest.json", { cache: "no-store" });
  const data = await res.json();

  const date = new Date(data.generatedAt);

  metaEl.innerHTML = `
    <h2>Latest brief</h2>
    <div class="kicker">Week of <strong>${data.weekOf}</strong> • Generated ${date.toUTCString()}</div>
    <p>${data.lead || ""}</p>
  `;

  themesEl.innerHTML = `
    <h2>Emerging themes</h2>
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
  const themesEl = document.getElementById("themes");
  const storiesEl = document.getElementById("stories");

  metaEl.innerHTML = `Loading ${topic} brief…`;
  themesEl.style.display = "none";
  
  try {
    const res = await fetch(`./briefs/topic-${topic}.json`, { cache: "no-store" });
    
    if (!res.ok) {
      throw new Error("Topic brief not found");
    }
    
    const data = await res.json();
    const date = new Date(data.generatedAt);

    metaEl.innerHTML = `
      <h2>${data.topic.charAt(0).toUpperCase() + data.topic.slice(1)} Brief</h2>
      <div class="kicker">Week of <strong>${data.weekOf}</strong> • Generated ${date.toUTCString()}</div>
      <p>${data.lead || ""}</p>
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
      <p>This topic brief hasn't been generated yet. It will be available after the next weekly update.</p>
    `;
    storiesEl.innerHTML = "";
  }
}

function setActiveTopic(topic) {
  currentTopic = topic;
  
  // Update button states
  document.querySelectorAll('.topic-btn').forEach(btn => {
    if (btn.dataset.topic === topic) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Load appropriate content
  if (topic === 'weekly') {
    loadWeeklyBrief();
  } else {
    loadTopicBrief(topic);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadWeeklyBrief().catch(err => {
    document.getElementById("meta").innerHTML = "Failed to load brief.";
    console.error(err);
  });

  // Topic button handlers
  document.querySelectorAll('.topic-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setActiveTopic(btn.dataset.topic);
    });
  });
});