async function main() {
  const metaEl = document.getElementById("meta");
  const themesEl = document.getElementById("themes");
  const storiesEl = document.getElementById("stories");

  metaEl.innerHTML = "Loading latest brief…";

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
      <div class="kicker">${s.source || ""}${s.publishedAt ? ` • ${s.publishedAt}` : ""} • Novelty ${s.noveltyScore ?? ""}/10</div>
      <h2><a href="${s.url}" target="_blank" rel="noreferrer">${s.title}</a></h2>
      <p>${s.summary || ""}</p>
      <p><strong>Why it matters:</strong> ${s.whyItMatters || ""}</p>
      ${(s.newUseCases && s.newUseCases.length) ? `
        <p><strong>New uses:</strong></p>
        <ul>${s.newUseCases.map(u => `<li>${u}</li>`).join("")}</ul>
      ` : ""}
    </article>
  `).join("");
}

main().catch(err => {
  document.getElementById("meta").innerHTML = "Failed to load brief.";
  console.error(err);
});
