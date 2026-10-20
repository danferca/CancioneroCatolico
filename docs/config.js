// config.js - Variables de estado global de la aplicación
let rawText = "";
let semitones = 0;
let songsData = [];
let originalKey = "C";
let songMetadata = {};
const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

window.appConfig = {
  instrument: "guitar",
  instruments: {
    guitar: { strings: 6, tuning: ["E", "A", "D", "G", "B", "E"] },
    ukulele: { strings: 4, tuning: ["G", "C", "E", "A"] }
  }
};