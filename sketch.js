let socket;
let sensorValue = 0;
let dayMode = true;

let plantHeight;
let backgroundGrass = [];
let backgroundPlants = [];
let butterflies = [];
let stars = [];
let petalBurst = [];

let gameStarted = false;
let gameWon = false;
let gameOver = false;
let healthyTimer = 0;
let dangerTimer = 0;
let totalTime = 0;
let lastTimeCheck;

let skyAngle = 0;
let scene = "start";

// Audio synths
let ambientSynth;
let healthySynth;
let ambianceSynth;
let ambianceLoop;
let bellSynth;            // Bell synth for end sounds
let soundInitialized = false;
let lastHealthState = "";
let endSoundPlayed = false;

function setup() {
  createCanvas(800, 600);
  socket = io();
  socket.on('arduinoData', data => handleSerialData(data.trim()));

  // Prepare background elements
  for (let x = 0; x <= width + 40; x += 40) {
    backgroundGrass.push({ x, height: random(10, 30) });
  }
  for (let i = 0; i < width; i += 100) {
    backgroundPlants.push({ x: i + 50, height: random(60, 120) });
  }
  for (let i = 0; i < 6; i++) {
    butterflies.push(new Butterfly());
  }

  setupAudio();
}

function setupAudio() {
  // Ambient pulse
  ambientSynth = new Tone.Synth().toDestination();
  ambientSynth.volume.value = -25;
  ambientLoop = new Tone.Loop(time => {
    ambientSynth.triggerAttackRelease("C4", "8n", time);
  }, "4n").start(0);

  // Garden polyphonic ambiance
  const gardenReverb = new Tone.Freeverb({ roomSize: 0.7, dampening: 3000 }).toDestination();
  ambianceSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' },
    envelope: { attack: 0.4, decay: 1.2, sustain: 0.5, release: 2 }
  }).connect(gardenReverb);
  ambianceSynth.volume.value = -30;
  const gardenScale = ['C4','E4','G4','B4','C5','B4','G4','E4'];
  ambianceLoop = new Tone.Loop(time => {
    const note = gardenScale[Math.floor(Math.random() * gardenScale.length)];
    ambianceSynth.triggerAttackRelease(note, '2n', time);
  }, '2n').start(0);

  healthySynth = new Tone.MembraneSynth().toDestination();

  bellSynth = new Tone.Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.001, decay: 2, sustain: 0, release: 1.5 }
  }).toDestination();
  bellSynth.volume.value = -10;

  Tone.start().then(() => {
    Tone.Transport.start();
  });

  soundInitialized = true;
}

function draw() {
  background(dayMode ? color(204, 240, 255) : color(30, 30, 50));

  // Handle end-of-game and healthy sounds
  updateSoundState();

  if (scene === "start") drawStartScene();
  else if (scene === "play") runGame();
  else if (scene === "end") drawEndScene();

  skyAngle += 0.002;
}

function runGame() {
  drawTiledDirt();
  drawBackgroundGrass();
  drawBackgroundPlants();
  drawEnvironment();
  drawButterflies();
  drawPlant();
  drawSpeechBubble();
  drawHealthLabel();
  drawDangerMeter();
  drawWinMeter();

  if (!gameWon && !gameOver) {
    let now = millis();
    let delta = (now - lastTimeCheck) / 1000;
    lastTimeCheck = now;
    totalTime += delta;

    if (sensorValue >= 300 && sensorValue <= 700) {
      healthyTimer += delta;
      dangerTimer = 0;
    } else {
      dangerTimer += delta;
      healthyTimer = 0;
    }

    if (healthyTimer >= 15) {
      gameWon = true;
      scene = "end";
    }
    if (dangerTimer >= 8) {
      gameOver = true;
      scene = "end";
    }
  }
}

function updateSoundState() {
  if (!soundInitialized) return;

  // Play bell chord once when game ends
  if (scene === 'end' && !endSoundPlayed) {
    const chord = gameWon
      ? ['C6', 'E6', 'G6']
      : ['C4', 'E4', 'G4'];
    chord.forEach((note, i) => {
      bellSynth.triggerAttackRelease(note, '8n', `+${i * 0.1}`);
    });
    endSoundPlayed = true;
    return;
  }

  // Play healthy feedback during play
  let state = (sensorValue >= 300 && sensorValue <= 700) ? 'healthy' : 'other';
  if (state !== lastHealthState && state === 'healthy') {
    healthySynth.triggerAttackRelease("G3", "8n");
  }
  lastHealthState = state;
}

function keyPressed() {
  // Start audio context
  if (Tone.context.state !== 'running') {
    Tone.start().then(() => Tone.Transport.start());
  }

  // Begin game
  if (scene === "start" && key === ' ') {
    scene = "play";
    gameStarted = true;
    gameWon = false;
    gameOver = false;
    healthyTimer = 0;
    dangerTimer = 0;
    totalTime = 0;
    lastTimeCheck = millis();
    plantHeight = 100;
    petalBurst = [];
    lastHealthState = "";
    endSoundPlayed = false;
  }

  // Restart game
  if (scene === "end" && (key === 'r' || key === 'R')) {
    scene = "start";
    gameStarted = false;
    gameWon = false;
    gameOver = false;
    healthyTimer = 0;
    dangerTimer = 0;
    totalTime = 0;
    lastTimeCheck = millis();
    plantHeight = 100;
    petalBurst = [];
    lastHealthState = "";
    endSoundPlayed = false;
  }

  // Save snapshot
  if (key === 's' || key === 'S') {
    saveCanvas('synth_garden_snapshot', 'png');
  }
}

function handleSerialData(data) {
  if (data.includes("POT:")) {
    const parts = data.split(":");
    if (parts.length === 2 && !isNaN(parts[1])) {
      sensorValue = constrain(parseInt(parts[1]), 0, 1023);
    }
  } else if (data === "TOGGLE_DAY_NIGHT") {
    dayMode = !dayMode;
  }
}

function drawTiledDirt() {
  noStroke();
  for (let x = 0; x <= width; x += 40) {
    fill(101 + random(-5, 5), 67 + random(-5, 5), 33 + random(-5, 5));
    rect(x, height - 100, 42, 100);
  }
}

function drawBackgroundGrass() {
  for (let g of backgroundGrass) {
    stroke(34, 139, 34);
    strokeWeight(2);
    line(g.x, height - 100, g.x, height - 100 - g.height);
    noStroke();
    fill(34, 139, 34, 200);
    ellipse(g.x - 2, height - 100 - g.height + 4, 6, 4);
    ellipse(g.x + 2, height - 100 - g.height + 4, 6, 4);
  }
}

function drawBackgroundPlants() {
  for (let p of backgroundPlants) {
    push();
    translate(p.x, height - 100);
    stroke(80, 120, 80);
    strokeWeight(6);
    line(0, 0, 0, -p.height);
    noStroke();
    fill(60, 150, 60);
    ellipse(-10, -p.height + 30, 20, 10);
    ellipse(10, -p.height + 30, 20, 10);
    fill(140, 80, 160);
    ellipse(0, -p.height, 15, 15);
    pop();
  }
}

function drawPlant() {
  let rawHeight = map(sensorValue, 0, 1023, 80, 300);
  plantHeight = constrain(rawHeight, 80, 300);

  let stemColor, leafColor, flowerColor;
  if (sensorValue < 300) {
    stemColor = color(50, 80, 50);
    leafColor = color(40, 100, 40);
    flowerColor = color(120);
  } else if (sensorValue <= 700) {
    stemColor = color(0, 180, 0);
    leafColor = color(0, 200, 0);
    flowerColor = color(255, 100, 150);
  } else {
    stemColor = color(180, 140, 0);
    leafColor = color(160, 160, 0);
    flowerColor = color(255, 200, 200);
  }

  push();
  translate(width / 2, height - 100);
  stroke(stemColor);
  strokeWeight(10);
  line(0, 0, 0, -plantHeight);
  noStroke();
  fill(leafColor);
  ellipse(-25, -plantHeight + 40, 40, 20);
  ellipse(25, -plantHeight + 40, 40, 20);
  fill(flowerColor);
  ellipse(0, -plantHeight, 30, 30);
  pop();
}

function drawSpeechBubble() {
  let msg = '';
  if (gameWon) msg = 'You grew the perfect plant! 🎉';
  else if (gameOver) msg = 'Oh no! The plant wilted 🥵';
  else if (sensorValue < 300) msg = 'So thirsty... 😩';
  else if (sensorValue <= 700) msg = 'Feeling great! 🌞';
  else msg = 'Too much sun! 🥵';

  let bubbleY = constrain(height - plantHeight - 180, 50, height - 150);

  fill(255, 255, 255, 230);
  stroke(0);
  strokeWeight(1);
  rectMode(CENTER);
  rect(width / 2, bubbleY, 220, 45, 12);

  fill(dayMode ? 0 : 255);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(16);
  text(msg, width / 2, bubbleY);
}

function drawHealthLabel() {
  let label = '';
  let labelColor;
  if (sensorValue < 300) {
    label = 'Too Little Light';
    labelColor = color(50, 50, 200);
  } else if (sensorValue <= 700) {
    label = 'Healthy Light Level';
    labelColor = color(0, 180, 0);
  } else {
    label = 'Too Much Light';
    labelColor = color(200, 50, 50);
  }

  fill(255, 255, 255, 180);
  noStroke();
  rectMode(CENTER);
  rect(width / 2, height - 20, textWidth(label) + 20, 24, 5);

  fill(labelColor);
  textAlign(CENTER);
  textSize(18);
  text(label, width / 2, height - 20);
}

function drawEnvironment() {
  if (dayMode) {
    drawSun();
    drawClouds();
  } else {
    drawMoon();
    drawStars();
  }
}

function drawSun() {
  let x = 100 + 200 * sin(skyAngle);
  let y = 100 - 30 * cos(skyAngle);
  for (let i = 4; i > 0; i--) {
    fill(255, 204, 0, 50 / i);
    noStroke();
    ellipse(x, y, 80 + i * 10, 80 + i * 10);
  }
  fill(255, 204, 0);
  noStroke();
  ellipse(x, y, 80, 80);
}

function drawMoon() {
  let x = 100 + 200 * sin(skyAngle);
  let y = 100 - 30 * cos(skyAngle);
  for (let i = 3; i > 0; i--) {
    fill(240, 240, 255, 30 / i);
    noStroke();
    ellipse(x, y, 60 + i * 8, 60 + i * 8);
  }
  fill(240);
  noStroke();
  ellipse(x, y, 60, 60);
}

function drawClouds() {
  fill(255, 255, 255, 200);
  noStroke();
  ellipse(200, 150, 100, 60);
  ellipse(250, 140, 120, 70);
  ellipse(300, 150, 100, 60);
  ellipse(500, 100, 90, 50);
  ellipse(550, 90, 110, 60);
  ellipse(600, 100, 90, 50);
}

function drawStars() {
  if (stars.length === 0) {
    for (let i = 0; i < 50; i++) {
      stars.push({
        x: random(width),
        y: random(height - 100),
        size: random(1, 3),
        alpha: random(100, 255),
        delta: random(0.5, 1)
      });
    }
  }
  noStroke();
  for (let s of stars) {
    fill(255, s.alpha);
    ellipse(s.x, s.y, s.size, s.size);
    s.alpha += s.delta;
    if (s.alpha > 255 || s.alpha < 100) s.delta *= -1;
  }
}

function drawButterflies() {
  for (let b of butterflies) {
    b.update();
    b.draw();
  }
}

class Butterfly {
  constructor() {
    this.reset();
    this.color = color(random(100, 255), random(100, 255), random(100, 255), 200);
  }
  reset() {
    this.x = random(-100, -40);
    this.y = random(50, height - 200);
    this.speed = random(0.5, 1.5);
    this.wingSize = random(6, 12);
    this.wingAngle = 0;
    this.wingDir = 1;
  }
  update() {
    this.x += this.speed;
    this.wingAngle += this.wingDir * 0.2;
    if (this.wingAngle > 1 || this.wingAngle < -1) this.wingDir *= -1;
    if (this.x > width + 50) this.reset();
  }
  draw() {
    push();
    translate(this.x, this.y);
    stroke(0);
    fill(this.color);
    push();
    rotate(this.wingAngle);
    ellipse(-6, 0, this.wingSize, this.wingSize * 2);
    pop();
    push();
    rotate(-this.wingAngle);
    ellipse(6, 0, this.wingSize, this.wingSize * 2);
    pop();
    strokeWeight(2);
    line(0, -5, 0, 5);
    pop();
  }
}

function drawStartScene() {
  fill(dayMode ? 0 : 255);
  textAlign(CENTER, CENTER);
  textSize(32);
  text("🌱 Welcome to Synth Garden 🌱", width / 2, height / 2 - 60);
  textSize(20);
  text("Keep your plant healthy with the right light!", width / 2, height / 2 - 20);
  text("Use the potentiometer to adjust the sunlight!", width / 2, height / 2 + 10);
  text("Press SPACE to start 🌸", width / 2, height / 2 + 50);
}

function drawDangerMeter() {
  const meterW = width * 0.3;
  const meterH = 14;
  const x = width / 2 - meterW - 20;
  const y = 20;
  const pct = constrain(dangerTimer / 8, 0, 1);

  stroke(dayMode ? 200 : 100);
  strokeWeight(2);
  noFill();
  rect(x, y, meterW, meterH, 4);

  noStroke();
  fill(200, 50, 50, 220);
  rect(x, y, meterW * pct, meterH, 4);

  noStroke();
  fill(dayMode ? 0 : 255);
  textSize(12);
  textAlign(CENTER, BOTTOM);
  text("Withering", x + meterW / 2, y - 4);
}

function drawWinMeter() {
  const meterW = width * 0.3;
  const meterH = 14;
  const x = width / 2 + 20;
  const y = 20;
  const pct = constrain(healthyTimer / 15, 0, 1);

  stroke(dayMode ? 200 : 100);
  strokeWeight(2);
  noFill();
  rect(x, y, meterW, meterH, 4);

  noStroke();
  fill(0, 180, 0, 220);
  rect(x, y, meterW * pct, meterH, 4);

  noStroke();
  fill(dayMode ? 0 : 255);
  textSize(12);
  textAlign(CENTER, BOTTOM);
  text("Growing", x + meterW / 2, y - 4);
}

function drawEndScene() {
  background(dayMode ? color(204, 240, 255) : color(30));
  fill(dayMode ? 0 : 255);
  textAlign(CENTER, CENTER);
  textSize(32);
  text(gameWon ? "🌱 You grew the perfect plant! 🎉" : "🥵 Your plant has died!", width / 2, height / 2 - 20);
  textSize(18);
  text("Press R to restart", width / 2, height / 2 + 30);
}
