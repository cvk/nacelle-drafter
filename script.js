const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const maxSoundDuration = 0.012;
const maxBurstLength = 0.2011;
const gapBetweenSounds = 0.7;
let meanFrequency = 432;
let frequencyVariation = 700;
let minDuration = 0.015;
let durationVariation = 0.06;
let baseSeed;
let keySeeds = {};

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function loadTypewriterContent(seed) {
  const content = localStorage.getItem(`typewriter_${seed}`);
  const typewriterInput = document.getElementById("typewriterInput");
  typewriterInput.value = content !== null ? content : "";
}

function saveTypewriterContent(seed, content) {
  localStorage.setItem(`typewriter_${seed}`, content);
}

function setSeed(newSeed) {
  if (isNaN(newSeed) || newSeed < 0) {
    alert("Plasma keys are positive integers.");
    seedInput.value = baseSeed;
    return;
  }
  if (baseSeed !== undefined) {
    saveTypewriterContent(baseSeed, typewriterInput.value);
  }
  baseSeed = newSeed;
  localStorage.setItem("lastSeed", newSeed.toString());
  seedInput.value = newSeed;
  keySeeds = {};
  loadTypewriterContent(newSeed);
  const seedNotice = document.getElementById("seedNotice");
  seedNotice.innerText = `🚀 ${newSeed} 🚀`;
  seedNotice.classList.add("visible");
  setTimeout(() => {
    seedNotice.classList.remove("visible");
  }, 4000);
}

function playTypewriterSoundBurst(key) {
  if (!keySeeds[key]) {
    keySeeds[key] = baseSeed + key.charCodeAt(0);
  }
  const burstSeedBase = keySeeds[key];
  const soundRandom = mulberry32(burstSeedBase);
  const burstCount = 4 + Math.floor(soundRandom() * 6);
  let currentTime = audioContext.currentTime;
  for (let i = 0; i < burstCount; i++) {
    const burstSeed = burstSeedBase + i;
    const burstRandom = mulberry32(burstSeed);
    const { frequencyStart, frequencyEnd, duration } = generateTypewriterSoundParams(burstRandom);
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(frequencyStart, currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(frequencyEnd, currentTime + duration);
    gainNode.gain.setValueAtTime(0.3, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(currentTime);
    oscillator.stop(currentTime + duration);
    currentTime += duration + gapBetweenSounds;
    if (currentTime - audioContext.currentTime > maxBurstLength) {
      break;
    }
  }
}

function generateTypewriterSoundParams(randomFunc) {
  const frequencyStart = meanFrequency + frequencyVariation * randomFunc();
  const frequencyEnd = meanFrequency - frequencyVariation * randomFunc();
  const duration = minDuration + randomFunc() * durationVariation;
  return { frequencyStart, frequencyEnd, duration };
}

function generateTypewriterVisualParams(randomFunc) {
  const rotation = -0.0005 + randomFunc() * 0.01;
  const scale = 0.98 + randomFunc() * 0.01;
  return { rotation, scale };
}

function applyVisualEffects(key) {
  if (!keySeeds[key]) {
    keySeeds[key] = baseSeed + key.charCodeAt(0);
  }
  const visualSeed = keySeeds[key];
  const visualRandom = mulberry32(visualSeed);
  const { rotation, scale } = generateTypewriterVisualParams(visualRandom);
  const typewriterInput = document.getElementById("typewriterInput");
  typewriterInput.style.transform = `rotate(${rotation}deg) scale(${scale})`;
  setTimeout(() => {
    typewriterInput.style.transform = "rotate(0deg) scale(1)";
  }, 15);
}

function printCurrentEntry() {
  const content = localStorage.getItem(`typewriter_${baseSeed}`);
  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title> </title>
      <style>
        body {
          margin: 0;
          margin-left: 4cm;
          margin-right: 4cm;
          font-family: "Courier Prime Sans", "Courier Prime", "Courier New", Courier, monospace;
          white-space: pre-wrap;
          line-height: 2.0;
        }
      </style>
    </head>
    <body>${content || ""}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
  printWindow.close();
}

document.getElementById("printIcon").addEventListener("click", printCurrentEntry);

const typewriterInput = document.getElementById("typewriterInput");
typewriterInput.addEventListener("keydown", (event) => {
  if (event.key.length === 1 || event.key === "Backspace") {
    playTypewriterSoundBurst(event.key);
    applyVisualEffects(event.key);
  }
});

typewriterInput.addEventListener("input", () => {
  saveTypewriterContent(baseSeed, typewriterInput.value);
});

document.getElementById("seedInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    typewriterInput.focus();
  }
});

document.getElementById("seedInput").addEventListener("input", (event) => {
  setSeed(parseInt(event.target.value));
});

window.addEventListener("load", () => {
  const savedSeed = localStorage.getItem("lastSeed");
  const initialSeed = savedSeed !== null ? parseInt(savedSeed) : Math.floor(Math.random() * 10000);
  setSeed(initialSeed);
});

(function initStarfield() {
  const canvas = document.getElementById("starfield");
  const ctx = canvas.getContext("2d");
  const numStars = 800;
  const maxWarpSpeed = 500;
  const accelerationMultiplier = 0.4;
  const decelerationRate = 0.98;
  const sustainWindow = 760;
  const baseStarSize = 1;
  let warpSpeed = 0.2;
  let keyPressStartTime = null;
  let lastKeyPressTime = null;
  let isDecelerating = false;
  const stars = [];

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
  }

  window.addEventListener("resize", resize);
  resize();

  function initStars() {
    stars.length = 0;
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        z: Math.random() * canvas.width,
        brightness: Math.random() * 0.5 + 0.5,
      });
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const dpr = window.devicePixelRatio || 1;
    for (let i = 0; i < numStars; i++) {
      const star = stars[i];
      star.z -= warpSpeed;

      if (star.z <= 0) {
        star.x = Math.random() * canvas.width;
        star.y = Math.random() * canvas.height;
        star.z = canvas.width;
        star.brightness = Math.random() * 0.5 + 0.5;
      }

      const k = 128 / star.z;
      const x = (star.x - canvas.width / 2) * k + canvas.width / 2;
      const y = (star.y - canvas.height / 2) * k + canvas.height / 2;
      const size = Math.max((1 - star.z / canvas.width) * baseStarSize, 0.1) * dpr;
      const alpha = (1 - star.z / canvas.width) * star.brightness;

      if (warpSpeed > 1) {
        for (let w = 0; w < 24; w++) {
          const trailFactor = w / 24;
          const trailX = x - trailFactor * (x - canvas.width / 2) * 0.05 * warpSpeed;
          const trailY = y - trailFactor * (y - canvas.height / 2) * 0.05 * warpSpeed;
          const trailAlpha = alpha * (1 - trailFactor);
          ctx.fillStyle = `rgba(255, 255, 255, ${trailAlpha})`;
          ctx.fillRect(trailX / dpr, trailY / dpr, size / dpr, size / dpr);
        }
      }

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(x / dpr, y / dpr, size / dpr, size / dpr);
    }

    requestAnimationFrame(animate);
  }

  window.addEventListener("keydown", (e) => {
    const currentTime = Date.now();

    if (lastKeyPressTime && currentTime - lastKeyPressTime <= sustainWindow) {
      isDecelerating = false;
    } else {
      keyPressStartTime = currentTime;
    }

    lastKeyPressTime = currentTime;
    warpSpeed = Math.min(maxWarpSpeed, accelerationMultiplier * Math.log10(currentTime - keyPressStartTime + 1) + 1);
  });

  window.addEventListener("keyup", () => {
    const decelerate = () => {
      const currentTime = Date.now();
      if (currentTime - lastKeyPressTime <= sustainWindow) {
        requestAnimationFrame(decelerate);
        return;
      }

      if (warpSpeed > 1) {
        warpSpeed *= decelerationRate;
        requestAnimationFrame(decelerate);
      } else {
        warpSpeed = 0.1;
        isDecelerating = false;
      }
    };

    if (!isDecelerating) {
      isDecelerating = true;
      decelerate();
    }
  });

  initStars();
  animate();
})();
