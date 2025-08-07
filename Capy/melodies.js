// Nouvelles mélodies 8‑bits et boucles pour Capy Games
// Ce fichier contient plusieurs fonctions pour jouer des mélodies rétro
// adaptées aux différents modes de jeu.  Chaque fonction crée ses propres
// oscillateurs via l'API Web Audio et se répète automatiquement grâce à
// setTimeout, stocké dans la variable melodyTimers.

window.melodyTimers = {};

// Mélodie Arcade rapide et enjouée (voir description utilisateur).  Les
// notes sont stockées dans un tableau d'objets comportant un nom et une
// durée.  Cette fonction renvoie le tableau afin qu'il puisse être
// utilisé ailleurs.
window.arcadeMelody2 = [
  { note: 'C5', dur: 0.25 }, { note: 'D5', dur: 0.25 }, { note: 'E5', dur: 0.25 }, { note: 'F5', dur: 0.25 },
  { note: 'G5', dur: 0.25 }, { note: 'E5', dur: 0.25 }, { note: 'G5', dur: 0.5 },
  { note: 'G4', dur: 0.25 }, { note: 'G4', dur: 0.25 }, { note: 'C5', dur: 0.25 }, { note: 'D5', dur: 0.25 },
  { note: 'E5', dur: 0.25 }, { note: 'D5', dur: 0.25 }, { note: 'C5', dur: 0.5 }
];

// Lecture d'une mélodie sous forme de fréquences et durées.  On utilise
// des types d'onde carrée ou triangle pour un son NES.  La fonction
// callback peut être utilisée pour s'enchaîner sur une nouvelle boucle.
function playMelodySequence(melody, oscType = 'square', volume = 0.3, onEnd) {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const noteFreq = {
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 784.00,
    'C#5': 554.37, 'Eb4': 311.13, 'Fs4': 369.99, 'Gs4': 415.30, 'Fs5': 739.99
  };
  let t = audioCtx.currentTime;
  melody.forEach(item => {
    let freq = null;
    if (item.note) {
      freq = noteFreq[item.note] || null;
    } else if (item.freq) {
      freq = item.freq;
    }
    const dur = item.dur;
    if (freq) {
      const osc = audioCtx.createOscillator();
      osc.type = oscType;
      osc.frequency.value = freq;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume, t + 0.01);
      gain.gain.linearRampToValueAtTime(volume, t + dur - 0.02);
      gain.gain.linearRampToValueAtTime(0, t + dur);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + dur);
    }
    t += dur;
  });
  if (onEnd) {
    const totalDur = melody.reduce((acc, i) => acc + i.dur, 0);
    setTimeout(onEnd, totalDur * 1000);
  }
}

// Fonctions spécifiques pour jouer les mélodies décrites par l'utilisateur.
// Chaque fonction crée un tableau de [fréquence, durée] et appelle
// playMelodySequence.  Elles s'enchaînent en boucle grâce à setTimeout.

window.playJungleMelodyLoop = function () {
  const melody = [
    [261.63, 0.6], [392.00, 0.6], [329.63, 0.6], [392.00, 0.6],
    [293.66, 0.6], [440.00, 0.6], [349.23, 0.6], [440.00, 0.6],
    [329.63, 0.6], [493.88, 0.6], [392.00, 0.6], [493.88, 0.6],
    [349.23, 0.6], [523.25, 0.6], [440.00, 0.6], [523.25, 0.6],
    [392.00, 0.6], [587.33, 0.6], [493.88, 0.6], [587.33, 0.6],
    [440.00, 0.6], [659.25, 0.6], [523.25, 0.6], [659.25, 0.6],
    [392.00, 0.6], [349.23, 0.6], [329.63, 0.6], [261.63, 0.6]
  ];
  const seq = melody.map(([f, d]) => ({ freq: f, dur: d }));
  playMelodySequence(seq, 'square', 0.3, () => {
    window.melodyTimers['jungle'] = setTimeout(window.playJungleMelodyLoop, 10);
  });
};

window.playMysterieuseMelodyLoop = function () {
  const melody = [
    [440.00, 2.4], [493.88, 0.6], [523.25, 0.6], [493.88, 0.6], [440.00, 0.6],
    [659.25, 1.6], [587.33, 0.8], [523.25, 0.8], [493.88, 0.8], [440.00, 1.2],
    [null, 1.0],
    [523.25, 1.6], [440.00, 0.6], [349.23, 0.6], [440.00, 0.6], [523.25, 0.6],
    [493.88, 0.6], [415.30, 0.6], [440.00, 1.6]
  ];
  const seq = melody.map(([f, d]) => ({ freq: f, dur: d }));
  playMelodySequence(seq, 'triangle', 0.3, () => {
    window.melodyTimers['mysterious'] = setTimeout(window.playMysterieuseMelodyLoop, 10);
  });
};

window.playArcadeMelodyLoop = function () {
  const melody = [
    [392.00, 0.45], [659.25, 0.75], [587.33, 0.45], [523.25, 0.45], [493.88, 0.45], [440.00, 0.45], [392.00, 0.75],
    [293.66, 0.45], [329.63, 0.45], [349.23, 0.45], [392.00, 0.45], [261.63, 1.20],
    [329.63, 0.45], [349.23, 0.45], [392.00, 0.45], [440.00, 0.45],
    [392.00, 0.45], [349.23, 0.45], [329.63, 0.45], [293.66, 0.45], [392.00, 0.75],
    [523.25, 0.45], [493.88, 0.45], [440.00, 0.45], [392.00, 0.45], [349.23, 0.75],
    [329.63, 0.45], [311.13, 0.30], [293.66, 0.45], [261.63, 1.20]
  ];
  const seq = melody.map(([f, d]) => ({ freq: f, dur: d }));
  playMelodySequence(seq, 'square', 0.3, () => {
    window.melodyTimers['arcade'] = setTimeout(window.playArcadeMelodyLoop, 10);
  });
};

window.playRelaxMelodyLoop = function () {
  const melody = [
    [261.63, 1.0], [329.63, 1.4], [392.00, 2.0], [440.00, 1.0], [523.25, 2.4], [440.00, 1.6], [392.00, 1.0],
    [329.63, 2.0], [293.66, 1.0], [261.63, 2.4]
  ];
  const seq = melody.map(([f, d]) => ({ freq: f, dur: d }));
  playMelodySequence(seq, 'triangle', 0.3, () => {
    window.melodyTimers['relax'] = setTimeout(window.playRelaxMelodyLoop, 10);
  });
};

window.playAmoureuseMelodyLoop = function () {
  const melody = [
    [293.66, 0.75], [329.63, 0.75], [369.99, 0.75], [392.00, 1.5],
    [440.00, 0.75], [493.88, 0.75], [523.25, 0.75], [587.33, 1.5],
    [null, 0.75],
    [392.00, 0.75], [784.00, 1.5], [739.99, 0.75], [659.25, 1.5],
    [587.33, 0.75], [523.25, 0.75], [493.88, 0.75], [440.00, 0.75],
    [392.00, 1.5]
  ];
  const seq = melody.map(([f, d]) => ({ freq: f, dur: d }));
  playMelodySequence(seq, 'triangle', 0.3, () => {
    window.melodyTimers['amoureuse'] = setTimeout(window.playAmoureuseMelodyLoop, 10);
  });
};

// Fonction pour arrêter toutes les mélodies en cours.  Elle annule les
// setTimeout enregistrés et efface les entrées du tableau.
window.stopAllMelodies = function () {
  for (const key in window.melodyTimers) {
    clearTimeout(window.melodyTimers[key]);
  }
  window.melodyTimers = {};
};