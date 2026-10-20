// parser.js - Parser limpio y dinámico conectado al diccionario global

function parseChordPro(text) {
  let lines = text.split("\n");
  let metadata = { title: "", artist: "", key: "", tempo: "", customChords: {}, paragraphs: [] };
  let currentParagraph = { type: "verse", lines: [] };

  lines.forEach(line => {
    let trimmed = line.trim();

    // Soporte opcional para {define:...} local por si alguna canción lo requiere
    if (trimmed.startsWith("{define:")) {
      let content = trimmed.replace(/^\{define:\s*/i, "").replace("}", "").trim();
      let parts = content.split(/\s+/);
      let chordName = parts[0];
      let fretsIdx = parts.indexOf("frets");
      if (fretsIdx !== -1) {
        let fretValues = parts.slice(fretsIdx + 1, fretsIdx + 7);
        metadata.customChords[chordName] = fretValues;
      }
      return;
    }

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
    if (trimmed === "{soc}" || trimmed === "{start_of_chorus}") {
      if (currentParagraph.lines.length > 0) metadata.paragraphs.push(currentParagraph);
      currentParagraph = { type: "chorus", lines: [] };
      return;
    }
    if (trimmed === "{eoc}" || trimmed === "{end_of_chorus}") {
      metadata.paragraphs.push(currentParagraph);
      currentParagraph = { type: "verse", lines: [] };
      return;
    }
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) return;

    currentParagraph.lines.push(line);
  });

  if (currentParagraph.lines.length > 0) metadata.paragraphs.push(currentParagraph);
  
  // Guardamos las definiciones locales de la canción actual de forma temporal
  window.songCustomChords = metadata.customChords;

  return metadata;
}

function transposeChord(chord, amount, keyHint = "") {
  const notesSharp = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const notesFlat  = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  const flatKeys = ["F", "Bb", "Eb", "Ab", "Db", "Gb", "Dm", "Gm", "Cm", "Fm", "Bbm", "Ebm"];

  const useFlats = flatKeys.includes(keyHint) || (chord.includes("b") && amount === 0);
  const targetScale = useFlats ? notesFlat : notesSharp;

  return chord.replace(/([A-G][#b]?)/g, (match) => {
    let note = match;
    let idx = notesSharp.indexOf(note);
    if (idx === -1) idx = notesFlat.indexOf(note);
    if (idx === -1) return match;

    let newIdx = (idx + amount) % 12;
    if (newIdx < 0) newIdx += 12;
    return targetScale[newIdx];
  });
}

function renderChordSpan(chordName) {
  const cleanChord = chordName.trim();
  const uniqueId = `chord-svg-${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
  
  let activeInstrumentName = "guitar";
  if (window.appConfig && window.appConfig.instrument) {
    activeInstrumentName = window.appConfig.instrument.toLowerCase();
    if (activeInstrumentName.includes("ukulele")) activeInstrumentName = "ukulele";
    else activeInstrumentName = "guitar";
  }

  return `
    <span class="chord" data-chord="${cleanChord}" onmouseenter="dibujarAcordeDinamico(this, '${cleanChord}', '${activeInstrumentName}', '${uniqueId}')">
      ${cleanChord}
      <span class="chord-tooltip">
        <span id="${uniqueId}" class="chord-canvas-box"></span>
      </span>
    </span>
  `;
}

// Función centralizada que busca en la canción, en el archivo global, o aplica un respaldo seguro
function obtenerTrastes(chord, instrument) {
  // 1. Revisa si la canción tiene un {define} local específico
  if (window.songCustomChords && window.songCustomChords[chord]) {
    return window.songCustomChords[chord];
  }
  // 2. Busca en el diccionario global (chords-db.js)
  const dictGlobal = window.GLOBAL_CHORD_DEFINITIONS?.[instrument];
  if (dictGlobal && dictGlobal[chord]) {
    return dictGlobal[chord];
  }
  // 3. Respaldo por defecto si no se encuentra en ningún lado
  return instrument === "ukulele" ? ["0", "0", "0", "0"] : ["x", "x", "0", "2", "3", "1"];
}

function dibujarAcordeDinamico(elemento, chord, instrument, uniqueId) {
  const container = document.getElementById(uniqueId);
  if (container && container.innerHTML.trim() === "") {
    const isUkulele = instrument === "ukulele";
    const numStrings = isUkulele ? 4 : 6;
    const numFrets = 4;
    
    const width = 100;
    const height = 110;
    const marginLeft = 20;
    const marginTop = 20;
    const stringSpacing = (width - 2 * marginLeft) / (numStrings - 1);
    const fretSpacing = (height - 2 * marginTop) / numFrets;

    let fretArray = obtenerTrastes(chord, instrument);

    let numericFrets = fretArray.map(f => (f === "x" || f === "X") ? 0 : parseInt(f, 10)).filter(f => f > 0);
    let minFret = numericFrets.length > 0 ? Math.min(...numericFrets) : 1;
    let startFret = minFret > 2 ? minFret : 1;

    let svg = `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<text x="${width / 2}" y="13" font-size="11" font-weight="bold" text-anchor="middle" fill="#1e293b">${chord}</text>`;

    if (startFret === 1) {
      svg += `<line x1="${marginLeft}" y1="${marginTop}" x2="${width - marginLeft}" y2="${marginTop}" stroke="#334155" stroke-width="3"/>`;
    } else {
      svg += `<text x="${marginLeft - 16}" y="${marginTop + fretSpacing * 0.7}" font-size="9" font-weight="bold" fill="#64748b">${startFret}tr</text>`;
      svg += `<line x1="${marginLeft}" y1="${marginTop}" x2="${width - marginLeft}" y2="${marginTop}" stroke="#334155" stroke-width="1"/>`;
    }

    for (let i = 0; i < numStrings; i++) {
      let x = marginLeft + i * stringSpacing;
      svg += `<line x1="${x}" y1="${marginTop}" x2="${x}" y2="${marginTop + numFrets * fretSpacing}" stroke="#64748b" stroke-width="1.2"/>`;
    }

    for (let f = 1; f <= numFrets; f++) {
      let y = marginTop + f * fretSpacing;
      svg += `<line x1="${marginLeft}" y1="${y}" x2="${width - marginLeft}" y2="${y}" stroke="#cbd5e1" stroke-width="1"/>`;
    }

    fretArray.forEach((fretVal, colIndex) => {
      if (colIndex >= numStrings) return;
      let x = marginLeft + colIndex * stringSpacing; // <--- Usamos x correctamente

      if (fretVal === "x" || fretVal === "X") {
        svg += `<text x="${x}" y="${marginTop - 4}" font-size="9" font-weight="bold" text-anchor="middle" fill="#ef4444">×</text>`;
      } else if (fretVal === "0") {
        svg += `<circle cx="${x}" cy="${marginTop - 5}" r="3" fill="none" stroke="#64748b" stroke-width="1.2"/>`;
      } else {
        let absFret = parseInt(fretVal, 10);
        let relFret = startFret === 1 ? absFret : (absFret - startFret + 1);
        if (relFret >= 1 && relFret <= numFrets) {
          let cy = marginTop + (relFret - 0.5) * fretSpacing;
          svg += `<circle cx="${x}" cy="${cy}" r="4.5" fill="#2563eb"/>`; // <--- Referenciamos x en el círculo
        }
      }
    });

    svg += `</svg>`;
    container.innerHTML = svg;
  }
}