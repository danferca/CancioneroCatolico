// ============================================================================
// footer-chords.js - Generador del footer unificado con la lógica del parser
// ============================================================================

/**
 * Genera un SVG idéntico al del parser para los diagramas del footer,
 * reutilizando la misma lógica de cálculo de trastes relativos y cejuelas.
 */
function renderChordSvgFooter(chord, instrument) {
  const cleanChord = chord.trim();
  const numStrings = instrument === "ukulele" ? 4 : 6;
  const numFrets = 4;
  
  const width = 100;
  const height = 110;
  const marginLeft = 20;
  const marginTop = 20;
  const stringSpacing = (width - 2 * marginLeft) / (numStrings - 1);
  const fretSpacing = (height - 2 * marginTop) / numFrets;

  // Obtenemos los trastes usando la misma función centralizada del parser
  let fretArray = obtenerTrastes(cleanChord, instrument);

  let numericFrets = fretArray.map(f => (f === "x" || f === "X") ? 0 : parseInt(f, 10)).filter(f => f > 0);
  let minFret = numericFrets.length > 0 ? Math.min(...numericFrets) : 1;
  let startFret = minFret > 2 ? minFret : 1;

  let svg = `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto;">`;
  
  // Nombre del acorde arriba
  svg += `<text x="${width / 2}" y="13" font-size="11" font-weight="bold" text-anchor="middle" fill="#1e293b">${cleanChord}</text>`;

  // Línea de cejuela o indicador de traste inicial (ej. 4tr)
  if (startFret === 1) {
    svg += `<line x1="${marginLeft}" y1="${marginTop}" x2="${width - marginLeft}" y2="${marginTop}" stroke="#334155" stroke-width="3"/>`;
  } else {
    svg += `<text x="${marginLeft - 16}" y="${marginTop + fretSpacing * 0.7}" font-size="9" font-weight="bold" fill="#64748b">${startFret}tr</text>`;
    svg += `<line x1="${marginLeft}" y1="${marginTop}" x2="${width - marginLeft}" y2="${marginTop}" stroke="#334155" stroke-width="1"/>`;
  }

  // Dibujar cuerdas verticales
  for (let i = 0; i < numStrings; i++) {
    let x = marginLeft + i * stringSpacing;
    svg += `<line x1="${x}" y1="${marginTop}" x2="${x}" y2="${marginTop + numFrets * fretSpacing}" stroke="#64748b" stroke-width="1.2"/>`;
  }

  // Dibujar trastes horizontales
  for (let f = 1; f <= numFrets; f++) {
    let y = marginTop + f * fretSpacing;
    svg += `<line x1="${marginLeft}" y1="${y}" x2="${width - marginLeft}" y2="${y}" stroke="#cbd5e1" stroke-width="1"/>`;
  }

  // Dibujar cejuelas (x / 0) y dedos (círculos azules) exactamente igual que en el parser
  fretArray.forEach((fretVal, colIndex) => {
    if (colIndex >= numStrings) return;
    let x = marginLeft + colIndex * stringSpacing;

    if (fretVal === "x" || fretVal === "X") {
      svg += `<text x="${x}" y="${marginTop - 4}" font-size="9" font-weight="bold" text-anchor="middle" fill="#ef4444">×</text>`;
    } else if (fretVal === "0") {
      svg += `<circle cx="${x}" cy="${marginTop - 5}" r="3" fill="none" stroke="#64748b" stroke-width="1.2"/>`;
    } else {
      let absFret = parseInt(fretVal, 10);
      let relFret = startFret === 1 ? absFret : (absFret - startFret + 1);
      if (relFret >= 1 && relFret <= numFrets) {
        let cy = marginTop + (relFret - 0.5) * fretSpacing;
        svg += `<circle cx="${x}" cy="${cy}" r="4.5" fill="#2563eb"/>`;
      }
    }
  });

  svg += `</svg>`;
  return svg;
}

/**
 * Recorre la estructura de la canción, extrae los acordes únicos (ya transpuestos)
 * y genera el bloque HTML completo del pie de página con sus respectivos diagramas SVG unificados.
 */
function renderizarFooterAcordes(songMetadata, semitones, originalKey) {
  let acordesUnicos = new Set();

  // 1. Recorrer párrafos y líneas para recolectar acordes únicos
  songMetadata.paragraphs.forEach(para => {
    para.lines.forEach(line => {
      let trimmed = line.trim();
      if (trimmed === "" || !line.includes("[")) return;

      let regex = /\[(.*?)\]([^\[]*)/g;
      let match;
      while ((match = regex.exec(line)) !== null) {
        let chordOriginal = match[1];
        let chordTransposed = transposeChord(chordOriginal, semitones, originalKey);
        acordesUnicos.add(chordTransposed);
      }
    });
  });

  if (acordesUnicos.size === 0) return "";

  // 2. Detectar instrumento activo actual
  let activeInstrument = "guitar";
  if (window.appConfig && window.appConfig.instrument) {
    activeInstrument = window.appConfig.instrument.toLowerCase();
    if (activeInstrument.includes("ukulele")) activeInstrument = "ukulele";
    else activeInstrument = "guitar";
  }

  // 3. Construir la estructura contenedora del footer
  let footerHtml = `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 2px dashed #e2e8f0; text-align: center;">
      <h4 style="color: #475569; margin-bottom: 12px; font-size: 0.95rem;">🎵 Acordes utilizados en esta canción</h4>
      <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; align-items: center;">
  `;

  // 4. Inyectar el diagrama SVG unificado por cada acorde único
  acordesUnicos.forEach(acorde => {
    footerHtml += `
      <div style="display: inline-block; background: #f8fafc; padding: 6px 8px; border-radius: 8px; border: 1px solid #e2e8f0; width: 110px; min-height: 120px;">
        ${renderChordSvgFooter(acorde, activeInstrument)}
      </div>
    `;
  });

  footerHtml += `
      </div>
    </div>
  `;

  return footerHtml;
}