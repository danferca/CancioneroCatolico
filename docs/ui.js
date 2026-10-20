// ui.js - Control de la interfaz de usuario, configuración y navegación

async function inicializarCancionero() {
  try {
    const configRes = await fetch("config.json");
    if (configRes.ok) {
      window.appConfig = await configRes.json();
    }

    // --- AGREGAR / ASEGURAR ESTAS LÍNEAS ---
    const selectInstrumento = document.getElementById("instrumentSelect"); // Ajusta el ID al que tengas en tu index.html
    if (selectInstrumento && window.appConfig && window.appConfig.instrument) {
      selectInstrumento.value = window.appConfig.instrument;
    }
    // ---------------------------------------

    const res = await fetch("songs.json");
    if (!res.ok) throw new Error("No se pudo cargar songs.json");
    
    songsData = await res.json();
    songsData.sort((a, b) => a.title.localeCompare(b.title));
    renderGrid(songsData);
  } catch (e) {
    document.getElementById("songGrid").innerText = "Error al cargar el índice o la configuración.";
    console.error(e);
  }
}

function renderGrid(songs) {
  const gridEl = document.getElementById("songGrid");
  gridEl.innerHTML = "";

  if (songs.length === 0) {
    gridEl.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #64748b;'>No se encontraron canciones.</p>";
    return;
  }

  const agrupadas = songs.reduce((acc, song) => {
    let momentoRaw = song.momento || "Otros";
    let momentoPrincipal = momentoRaw.split(/[/,]/)[0].trim();

    if (!acc[momentoPrincipal]) {
      acc[momentoPrincipal] = [];
    }
    acc[momentoPrincipal].push(song);
    return acc;
  }, {});

  const ordenMomentos = [
    "Entrada", "Piedad", "Gloria", "Salmo", "Aclamación","Aleluya", 
    "Ofertorio", "Santo", "Paz", "Cordero", "Comunión", 
    "Salida", "Alabanza", "Otros"
  ];

  const momentosPresentes = Object.keys(agrupadas).sort((a, b) => {
    let indexA = ordenMomentos.findIndex(m => a.toLowerCase().includes(m.toLowerCase()));
    let indexB = ordenMomentos.findIndex(m => b.toLowerCase().includes(m.toLowerCase()));
    if (indexA === -1) indexA = 99;
    if (indexB === -1) indexB = 99;
    return indexA - indexB;
  });

  momentosPresentes.forEach(momento => {
    const sectionHeader = document.createElement("div");
    sectionHeader.className = "section-header";
    sectionHeader.innerHTML = `<h3>📌 ${momento.toUpperCase()}</h3>`;
    gridEl.appendChild(sectionHeader);

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

async function abrirCancion(fileName) {
  semitones = 0;
  document.getElementById("transposeVal").innerText = semitones;
  actualizarEstadoOriginal(); // Actualizar color del botón al abrir

  try {
    const res = await fetch(`canciones/${encodeURIComponent(fileName)}`);
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

function mostrarIndice() {
  document.getElementById("songView").classList.add("hidden");
  document.getElementById("indexView").classList.remove("hidden");
  window.scrollTo(0, 0);
}

function cambiarTono(delta) {
  semitones += delta;
  document.getElementById("transposeVal").innerText = semitones;
  actualizarEstadoOriginal(); // Actualizar color del botón
  render();
}

function resetTono() {
  semitones = 0;
  document.getElementById("transposeVal").innerText = semitones;
  actualizarEstadoOriginal(); // Actualizar color del botón
  render();
}

// Función auxiliar para controlar el estado visual del botón "Original"
function actualizarEstadoOriginal() {
  const btnOriginal = document.querySelector('.btn-reset');
  if (btnOriginal) {
    if (semitones === 0) {
      btnOriginal.classList.add('is-original'); // Se ilumina de azul
    } else {
      btnOriginal.classList.remove('is-original'); // Se queda en gris
    }
  }
}

function cambiarInstrumento(nuevoInstrumento) {
  if (window.appConfig) {
    window.appConfig.instrument = nuevoInstrumento;
    render();
  }
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
        lineHtml += `<div class="pair"><span class="chord" style="visibility:hidden; height:0; display:inline-block;">&nbsp;</span><span class="lyric">${line}</span></div>`;
      } else {
        let firstBracket = line.indexOf("[");
        if (firstBracket > 0) {
          let prefix = line.substring(0, firstBracket);
          lineHtml += `<div class="pair"><span class="chord" style="visibility:hidden; height:0; display:inline-block;">&nbsp;</span><span class="lyric">${prefix}</span></div>`;
        }

        while ((match = regex.exec(line)) !== null) {
          let chord = transposeChord(match[1], semitones, originalKey);
          let lyric = match[2] || " ";
          let chordHtml = renderChordSpan(chord);
          lineHtml += `<div class="pair">${chordHtml}<span class="lyric">${lyric}</span></div>`;
        }
      }

      lineHtml += `</div>`;
      html += lineHtml;
    });

    html += `<div style="height: 12px;"></div>`;
  });

  document.getElementById("songContent").innerHTML = html;
}

// Inicializar al cargar la página
inicializarCancionero();