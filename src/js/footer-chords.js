// ============================================================================
// footer-chords.js - Generador del resumen de acordes y diagramas para el footer
// ============================================================================

/**
 * Genera un diagrama SVG estático y directo para un acorde específico,
 * adaptándose al instrumento activo (guitarra o ukelele).
 */
function renderChordSvgDirecto(acorde) {
  // 1. Obtener el instrumento actual (por defecto guitarra si no está configurado)
  const instrumento = (window.appConfig && window.appConfig.instrument) || "guitar";
  const definiciones = window.GLOBAL_CHORD_DEFINITIONS[instrumento];
  
  // Si el acorde no existe en la base de datos, mostramos solo el texto como respaldo seguro
  if (!definiciones || !definiciones[acorde]) {
    return `<div style="font-weight: bold; font-size: 0.9rem; padding: 10px;">${acorde}</div>`;
  }

  const trastes = definiciones[acorde];
  const numCuerdas = trastes.length;
  const numTrastes = 4; // Visualmente mostramos 4 trastes en el mini diagrama
  
  // Dimensiones y márgenes del SVG
  const ancho = 60;
  const alto = 70;
  const margenX = 12;
  const margenY = 15;
  const espacioCuerda = (ancho - 2 * margenX) / (numCuerdas - 1 || 1);
  const espacioTraste = (alto - 2 * margenY) / numTrastes;

  // Inicio de la construcción del gráfico SVG
  let svg = `<svg width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}" style="display: block; margin: 0 auto;">`;
  
  // Nombre del acorde impreso en la parte superior del diagrama
  svg += `<text x="${ancho / 2}" y="11" font-size="10" font-weight="bold" text-anchor="middle" fill="#1e293b">${acorde}</text>`;

  // Cejuela o línea superior del traste cero
  svg += `<line x1="${margenX}" y1="${margenY}" x2="${ancho - margenX}" y2="${margenY}" stroke="#475569" stroke-width="2" />`;

  // Dibujar cuerdas verticales
  for (let i = 0; i < numCuerdas; i++) {
    let x = margenX + i * espacioCuerda;
    svg += `<line x1="${x}" y1="${margenY}" x2="${x}" y2="${margenY + numTrastes * espacioTraste}" stroke="#94a3b8" stroke-width="1" />`;
  }

  // Dibujar trastes horizontales
  for (let t = 1; t <= numTrastes; t++) {
    let y = margenY + t * espacioTraste;
    svg += `<line x1="${margenX}" y1="${y}" x2="${ancho - margenX}" y2="${y}" stroke="#cbd5e1" stroke-width="1" />`;
  }

  // Dibujar indicadores de cejuelas ('x' o '0' arriba) y posiciones de los dedos (círculos)
  trastes.forEach((traste, i) => {
    let x = margenX + i * espacioCuerda;
    
    if (traste === "x" || traste === "X") {
      svg += `<text x="${x}" y="${margenY - 3}" font-size="8" text-anchor="middle" fill="#ef4444">×</text>`;
    } else if (traste === "0") {
      svg += `<circle cx="${x}" cy="${margenY - 4}" r="2.5" stroke="#3b82f6" stroke-width="1" fill="none" />`;
    } else {
      let numTraste = parseInt(traste, 10);
      if (numTraste > 0 && numTraste <= numTrastes) {
        let y = margenY + (numTraste - 0.5) * espacioTraste;
        svg += `<circle cx="${x}" cy="${y}" r="3" fill="#2563eb" />`;
      }
    }
  });

  svg += `</svg>`;
  return svg;
}

/**
 * Recorre la estructura de la canción, extrae los acordes únicos (ya transpuestos)
 * y genera el bloque HTML completo del pie de página con sus respectivos diagramas SVG.
 */
function renderizarFooterAcordes(songMetadata, semitones, originalKey) {
  let acordesUnicos = new Set();

  // 1. Recorrer párrafos y líneas para recolectar y acumular los acordes únicos
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

  // Si la canción no contiene acordes, se retorna una cadena vacía
  if (acordesUnicos.size === 0) return "";

  // 2. Construir la estructura contenedora del footer
  let footerHtml = `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 2px dashed #e2e8f0; text-align: center;">
      <h4 style="color: #475569; margin-bottom: 12px; font-size: 0.95rem;">🎵 Acordes utilizados en esta canción</h4>
      <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; align-items: center;">
  `;

  // 3. Inyectar el diagrama SVG generado por cada acorde único detectado
  acordesUnicos.forEach(acorde => {
    footerHtml += `
      <div style="display: inline-block; background: #f8fafc; padding: 6px 8px; border-radius: 8px; border: 1px solid #e2e8f0;">
        ${renderChordSvgDirecto(acorde)}
      </div>
    `;
  });

  footerHtml += `
      </div>
    </div>
  `;

  return footerHtml;
}