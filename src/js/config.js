// ============================================================================
// config.js - Variables de estado global de la aplicación
// ============================================================================

// --- ESTADO ACTUAL DE LA CANCIÓN ---
let rawText = "";          // Almacena el texto plano original del archivo ChordPro cargado
let semitones = 0;         // Contador de semitonos actuales aplicados para la transposición
let originalKey = "C";     // Tono original con el que fue escrita la canción
let songMetadata = {};     // Objeto estructurado con los datos y párrafos devueltos por el parser

// --- ESTADO GENERAL DEL ÍNDICE ---
let songsData = [];        // Lista completa de canciones cargadas desde el archivo songs.json

// --- CONSTANTES MUSICALES ---
// Escala cromática base de referencia para operaciones con notas musicales
const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// --- CONFIGURACIÓN DE INSTRUMENTOS ---
// Define el instrumento activo por defecto y las propiedades técnicas de cada uno
window.appConfig = {
  instrument: "guitar",
  instruments: {
    guitar: { 
      strings: 6, 
      tuning: ["E", "A", "D", "G", "B", "E"] 
    },
    ukulele: { 
      strings: 4, 
      tuning: ["G", "C", "E", "A"] 
    }
  }
};