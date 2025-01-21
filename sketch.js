let walls = [];
let particle;
let particles = []; // Partículas de chispa
let celebrationParticles = []; // Partículas para celebración

let wallCount = 100;
let rayCount = 1;
let coneAngle = 45;
let coneDirection = 0;
let waveSpeed = 0.1;
let time = 0;
let allLinesGone = false;
let portal; // Portal que aparece al empujar todas las líneas
let portalActivated = false;
let celebrationStarted = false; // Activar celebración
let message = ""; // Mensaje cuando se completa el objetivo

let countdown = 10; // Cuenta regresiva inicial
let countdownTimer;
let gameTimer = 30; // Temporizador de juego
let gameTimerActive = false; // Controla si el temporizador de juego está activo

function setup() {
  createCanvas(windowWidth, windowHeight); // Usar el tamaño de la ventana

  for (let i = 0; i < wallCount; i++) {
    let x1 = random(width);
    let x2 = random(width);
    let y1 = random(height);
    let y2 = random(height);
    walls[i] = new Boundary(x1, y1, x2, y2);
  }

  particle = new Particle();
  portal = new Portal(width / 2, height / 2);

  noCursor();

  // Iniciar cuenta regresiva inicial
  countdownTimer = setInterval(() => {
    countdown--;
    if (countdown < 0) {
      clearInterval(countdownTimer);
      gameTimerActive = true; // Activar temporizador del juego
    }
  }, 500); // Reducir cada 0.5 segundos
}

function draw() {
  if (countdown >= 0) {
    // Pantalla negra con cuenta regresiva
    background(0);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(64);
    text(countdown, width / 2, height / 2);
    return;
  }

  if (celebrationStarted) {
    runCelebration(); // Activar animación de celebración
    return;
  }

  background(0);

  allLinesGone = true;
  for (let wall of walls) {
    if (!wall.isOffScreen()) {
      allLinesGone = false;
    }
    wall.update();
    wall.show();
  }

  if (allLinesGone && !portalActivated) {
    portalActivated = true;
    message = "¡Objetivo Cumplido!"; // Cambia el mensaje cuando se ha completado el objetivo
    gameTimerActive = false; // Detener temporizador del juego
  }

  if (portalActivated) {
    portal.show();
    portal.checkCollision(particle);
  } else {
    particle.update(mouseX, mouseY);
    particle.show();
    particle.look(walls);
  }

  // Dibujar partículas en pantalla
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].show();
    if (particles[i].isFinished()) {
      particles.splice(i, 1);
    }
  }

  time += waveSpeed;

  if (keyIsDown(LEFT_ARROW)) coneDirection -= 2;
  if (keyIsDown(RIGHT_ARROW)) coneDirection += 2;
  if (keyIsDown(UP_ARROW)) coneAngle = constrain(coneAngle + 2, 10, 180);
  if (keyIsDown(DOWN_ARROW)) coneAngle = constrain(coneAngle - 2, 10, 180);

  if (message) {
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(48);
    text(message, width / 2, height / 2);
  }

  if (gameTimerActive) {
    fill(255, 0, 0);
    textAlign(LEFT, TOP);
    textSize(32);
    text(`Tiempo: ${gameTimer}`, 10, 10);
    if (frameCount % 60 === 0 && gameTimer > 0) {
      gameTimer--;
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight); // Ajustar el tamaño del canvas cuando cambie el tamaño de la ventana
}

class Boundary {
  constructor(x1, y1, x2, y2) {
    this.a = createVector(x1, y1);
    this.b = createVector(x2, y2);
    this.velocityA = createVector(0, 0);
    this.velocityB = createVector(0, 0);
    this.color = color(135, 206, 250);
  }

  applyForce(force, point) {
    if (point === "a") {
      this.velocityA.add(force);
    } else if (point === "b") {
      this.velocityB.add(force);
    }

    // Cambiar el color al ser impactada
    this.color = color(random(255), random(255), random(255));
  }

  update() {
    this.a.add(this.velocityA);
    this.b.add(this.velocityB);
    this.velocityA.mult(0.9);
    this.velocityB.mult(0.9);
  }

  show() {
    stroke(this.color);
    strokeWeight(2);
    line(this.a.x, this.a.y, this.b.x, this.b.y);
  }

  isOffScreen() {
    return (
      (this.a.x < 0 || this.a.x > width || this.a.y < 0 || this.a.y > height) &&
      (this.b.x < 0 || this.b.x > width || this.b.y < 0 || this.b.y > height)
    );
  }
}

class Particle {
  constructor() {
    this.pos = createVector(width / 2, height / 2);
    this.rays = [];
    this.updateRays();
  }

  updateRays() {
    this.rays = [];
    for (let a = -coneAngle / 2; a <= coneAngle / 2; a += rayCount) {
      let offset = sin(time + radians(a)) * 5;
      this.rays.push(new Ray(this.pos, radians(a + coneDirection + offset)));
    }
  }

  update(x, y) {
    this.pos.set(x, y);
    this.updateRays();
  }

  look(walls) {
    for (let ray of this.rays) {
      let closest = null;
      let record = Infinity;
      let hitWall = null;

      for (let wall of walls) {
        const pt = ray.cast(wall);
        if (pt) {
          const d = p5.Vector.dist(this.pos, pt);
          if (d < record) {
            record = d;
            closest = pt;
            hitWall = wall;
          }
        }
      }

      if (closest && hitWall) {
        stroke(255, 255, 0);
        line(this.pos.x, this.pos.y, closest.x, closest.y);

        const force = p5.Vector.sub(closest, this.pos).setMag(0.5);
        if (p5.Vector.dist(closest, hitWall.a) < p5.Vector.dist(closest, hitWall.b)) {
          hitWall.applyForce(force, "a");
        } else {
          hitWall.applyForce(force, "b");
        }

        // Crear partículas en el punto de impacto
        for (let i = 0; i < 5; i++) {
          particles.push(new Spark(closest.x, closest.y));
        }
      }
    }
  }

  show() {
    fill(255);
    noStroke();
    ellipse(this.pos.x, this.pos.y, 8);
  }
}

class Ray {
  constructor(pos, angle) {
    this.pos = pos;
    this.dir = p5.Vector.fromAngle(angle);
  }

  cast(wall) {
    const x1 = wall.a.x;
    const y1 = wall.a.y;
    const x2 = wall.b.x;
    const y2 = wall.b.y;

    const x3 = this.pos.x;
    const y3 = this.pos.y;
    const x4 = this.pos.x + this.dir.x;
    const y4 = this.pos.y + this.dir.y;

    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (den === 0) return;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;

    if (t > 0 && t < 1 && u > 0) {
      const pt = createVector();
      pt.x = x1 + t * (x2 - x1);
      pt.y = y1 + t * (y2 - y1);
      return pt;
    }
    return;
  }
}

class Portal {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.radius = 50;
    this.pulse = 0;
  }

  show() {
    noFill();
    stroke(0, 255, 0, 150);
    strokeWeight(4 + sin(this.pulse) * 2);
    ellipse(this.pos.x, this.pos.y, this.radius * 2);
    this.pulse += 0.1;
  }

  checkCollision(particle) {
    let d = dist(this.pos.x, this.pos.y, particle.pos.x, particle.pos.y);
    if (d < this.radius) {
      celebrationStarted = true; // Activar celebración
    }
  }
}

class Spark {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(1, 3));
    this.lifespan = 255;
  }

  update() {
    this.pos.add(this.vel);
    this.lifespan -= 5;
  }

  isFinished() {
    return this.lifespan < 0;
  }

  show() {
    noStroke();
    fill(255, this.lifespan);
    ellipse(this.pos.x, this.pos.y, 4);
  }
}

function runCelebration() {
  background(lerpColor(color(0), color(random(255), random(255), random(255)), sin(frameCount * 0.05)));
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(48);
  text(message, width / 2, height / 2);

  for (let i = 0; i < 5; i++) {
    celebrationParticles.push(new Spark(random(width), random(height)));
  }

  for (let i = celebrationParticles.length - 1; i >= 0; i--) {
    celebrationParticles[i].update();
    celebrationParticles[i].show();
    if (celebrationParticles[i].isFinished()) {
      celebrationParticles.splice(i, 1);
    }
  }
}
