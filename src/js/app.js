let rawText = "";
let semitones = 0;
let songsData = [];
let originalKey = "C";
let songMetadata = {};
const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

async function inicializarCancionero() {
  try {
    const res = await fetch("songs.json");
    if (!res.ok) throw new Error("No se pudo cargar songs.json");
    
    songsData = await res.json();
    songsData.sort((a, b) => a.title.localeCompare(b.title));
    renderGrid(songsData);
  } catch (e) {
    document.getElementById("songGrid").innerText = "Error al cargar el índice de canciones.";
  }
}

function renderGrid(songs) {
  const gridEl = document.getElementById("songGrid");
  gridEl.innerHTML = "";

  if (songs.length === 0) {
    gridEl.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #64748b;'>No se encontraron canciones.</p>";
    return;
  }

  // 1. Agrupar canciones tomando SOLO el primer calificador antes de la barra '/'
  const agrupadas = songs.reduce((acc, song) => {
    let momentoRaw = song.momento || "Otros";
    
    // Tomamos la primera palabra/categoría antes de '/' o ',' y la limpiamos
    let momentoPrincipal = momentoRaw.split(/[/,]/)[0].trim();

    if (!acc[momentoPrincipal]) {
      acc[momentoPrincipal] = [];
    }
    acc[momentoPrincipal].push(song);
    return acc;
  }, {});

  // 2. Orden preferido para los momentos litúrgicos
  const ordenMomentos = [
    "Entrada",
    "Piedad",
    "Gloria",
    "Salmo",
    "Aleluya",
    "Ofertorio",
    "Santo",
    "Paz",
    "Cordero",
    "Comunión",
    "Salida",
    "Alabanza",
    "Otros"
  ];

  // Ordenar las categorías encontradas
  const momentosPresentes = Object.keys(agrupadas).sort((a, b) => {
    let indexA = ordenMomentos.findIndex(m => a.toLowerCase().includes(m.toLowerCase()));
    let indexB = ordenMomentos.findIndex(m => b.toLowerCase().includes(m.toLowerCase()));
    if (indexA === -1) indexA = 99;
    if (indexB === -1) indexB = 99;
    return indexA - indexB;
  });

  // 3. Renderizar las secciones unificadas
  momentosPresentes.forEach(momento => {
    // Encabezado de la categoría principal
    const sectionHeader = document.createElement("div");
    sectionHeader.className = "section-header";
    sectionHeader.innerHTML = `<h3>📌 ${momento.toUpperCase()}</h3>`;
    gridEl.appendChild(sectionHeader);

    // Contenedor de las tarjetas
    const groupContainer = document.createElement("div");
    groupContainer.className = "momento-group";

    agrupadas[momento].forEach(song => {
      const card = document.createElement("div");
      card.className = "song-item";

      card.innerHTML = `
        <div class="song-info">
          <h3>${song.title}</h3>
          <p>${song.artist}</p>
        </div>
        <div class="key-badge">${song.key}</div>
      `;

      card.onclick = () => abrirCancion(song.file);
      groupContainer.appendChild(card);
    });

    gridEl.appendChild(groupContainer);
  });
}

function filtrarCanciones() {
  const query = document.getElementById("searchBox").value.toLowerCase();
  const filtradas = songsData.filter(s => 
    s.title.toLowerCase().includes(query) ||
    s.artist.toLowerCase().includes(query) ||
    s.momento.toLowerCase().includes(query)
  );
  renderGrid(filtradas);
}

// MOTOR INTELIGENTE DE PARSING CHORDPRO (Nativo y sin fallos de CDN)
async function abrirCancion(fileName) {
  semitones = 0;
  document.getElementById("transposeVal").innerText = semitones;

  try {
    const res = await fetch(`canciones/${fileName}`);
    if (!res.ok) throw new Error("Archivo no encontrado");
    rawText = await res.text();

    songMetadata = parseChordPro(rawText);
    originalKey = songMetadata.key || "C";

    render();
    
    document.getElementById("indexView").classList.add("hidden");
    document.getElementById("songView").classList.remove("hidden");
    window.scrollTo(0, 0);
  } catch (e) {
    alert("Error al cargar la canción.");
    console.error(e);
  }
}

function parseChordPro(text) {
  let lines = text.split("\n");
  let metadata = { title: "", artist: "", key: "", tempo: "", paragraphs: [] };
  let currentParagraph = { type: "verse", lines: [] };

  lines.forEach(line => {
    let trimmed = line.trim();

    // Metadatos oficiales de ChordPro
    if (trimmed.startsWith("{title:") || trimmed.startsWith("{t:")) {
      metadata.title = trimmed.replace(/\{(title|t):\s*/i, "").replace("}", "").trim();
      return;
    }
    if (trimmed.startsWith("{artist:") || trimmed.startsWith("{su:")) {
      metadata.artist = trimmed.replace(/\{(artist|su):\s*/i, "").replace("}", "").trim();
      return;
    }
    if (trimmed.startsWith("{key:") || trimmed.startsWith("{k:")) {
      metadata.key = trimmed.replace(/\{(key|k):\s*/i, "").replace("}", "").trim();
      return;
    }
    if (trimmed.startsWith("{tempo:")) {
      metadata.tempo = trimmed.replace("{tempo:", "").replace("}", "").trim();
      return;
    }

    // Bloques de coro
    if (trimmed === "{soc}" || trimmed === "{start_of_chorus}") {
      if (currentParagraph.lines.length > 0) {
        metadata.paragraphs.push(currentParagraph);
        currentParagraph = { type: "verse", lines: [] };
      }
      currentParagraph.type = "chorus";
      return;
    }
    if (trimmed === "{eoc}" || trimmed === "{end_of_chorus}") {
      metadata.paragraphs.push(currentParagraph);
      currentParagraph = { type: "verse", lines: [] };
      return;
    }

    // Omitir directivas secundarias sueltas
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      return;
    }

    // Líneas de contenido
    currentParagraph.lines.push(line);
  });

  if (currentParagraph.lines.length > 0) {
    metadata.paragraphs.push(currentParagraph);
  }

  return metadata;
}

function mostrarIndice() {
  document.getElementById("songView").classList.add("hidden");
  document.getElementById("indexView").classList.remove("hidden");
  window.scrollTo(0, 0);
}

function transposeChord(chord, amount) {
  return chord.replace(/([A-G][#b]?)/g, (match) => {
    let note = match;
    if (note === "Db") note = "C#";
    if (note === "Eb") note = "D#";
    if (note === "Gb") note = "F#";
    if (note === "Ab") note = "G#";
    if (note === "Bb") note = "A#";
    let idx = notes.indexOf(note);
    if (idx === -1) return match;
    let newIdx = (idx + amount) % 12;
    if (newIdx < 0) newIdx += 12;
    return notes[newIdx];
  });
}

function cambiarTono(delta) {
  semitones += delta;
  document.getElementById("transposeVal").innerText = semitones;
  render();
}

function resetTono() {
  semitones = 0;
  document.getElementById("transposeVal").innerText = semitones;
  render();
}

function render() {
  if (!songMetadata.title) return;

  let currentKey = transposeChord(originalKey, semitones);
  let html = `<h2>${songMetadata.title}</h2>`;
  
  if (songMetadata.artist) {
    html += `<p style="color:#64748b; margin-top:-10px;"><em>${songMetadata.artist}</em></p>`;
  }

  let metaInfo = [];
  if (currentKey) metaInfo.push(`<strong>Tono:</strong> ${currentKey}`);
  if (songMetadata.tempo) metaInfo.push(`<strong>Tempo:</strong> ${songMetadata.tempo}`);

  if (metaInfo.length > 0) {
    html += `<div style="font-size: 0.85rem; color: #475569; margin-bottom: 16px; background: #f1f5f9; padding: 6px 12px; border-radius: 6px; display: inline-block;">${metaInfo.join(" &bull; ")}</div>`;
  }

  html += `<hr style="border:0; border-top:1px solid #e2e8f0; margin: 12px 0 16px 0;">`;

  // Renderizamos estructuradamente los párrafos y líneas con tus clases CSS exactas
  songMetadata.paragraphs.forEach(para => {
    let isChorus = para.type === "chorus";

    para.lines.forEach(line => {
      let trimmed = line.trim();
      let lineHtml = `<div class="chord-line-container ${isChorus ? 'chorus' : ''}">`;

      if (trimmed === "") {
        html += `<div style="height: 12px;"></div>`;
        return;
      }

      let regex = /\[(.*?)\]([^\[]*)/g;
      let match;

      if (!line.includes("[")) {
        lineHtml += `<div class="pair"><span class="chord"></span><span class="lyric">${line}</span></div>`;
      } else {
        let firstBracket = line.indexOf("[");
        if (firstBracket > 0) {
          let prefix = line.substring(0, firstBracket);
          lineHtml += `<div class="pair"><span class="chord"></span><span class="lyric">${prefix}</span></div>`;
        }

        while ((match = regex.exec(line)) !== null) {
          let chord = transposeChord(match[1], semitones);
          let lyric = match[2] || " ";
          lineHtml += `<div class="pair"><span class="chord">${chord}</span><span class="lyric">${lyric}</span></div>`;
        }
      }

      lineHtml += `</div>`;
      html += lineHtml;
    });

    html += `<div style="height: 12px;"></div>`;
  });

  document.getElementById("songContent").innerHTML = html;
}

inicializarCancionero();