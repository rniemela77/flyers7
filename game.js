const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
};

const game = new Phaser.Game(config);

let square,
  moveUpButton,
  moveDownButton,
  targetY,
  circle,
  yellowCircleOutline,
  healthBar,
  healthBarBackground;
let joystick = null,
  initialPointerY = 0,
  velocityY = 0,
  targetVelocityY = 0,
  circleHealth = 100;
const moveDistance = 100;

function preload() {
  // Load any assets if necessary
}

function create() {
  setupInputHandlers.call(this);
  createGameObjects.call(this);
  setupTimers.call(this);
}

function update() {
  updateJoystickVelocity();
  applyJoystickVelocity();
  moveCircleDownward();
  updateUIPositions();
  checkCollisions.call(this);
}

function setupInputHandlers() {
  this.input.on("pointerdown", createJoystick, this);
  this.input.on("pointermove", moveJoystick, this);
  this.input.on("pointerup", removeJoystick, this);
}

function createGameObjects() {
  createSquare.call(this);
  createButtons.call(this);
  createCircle.call(this);
  createYellowCircleOutline.call(this);
  createHealthBar.call(this);
}

function setupTimers() {
  this.time.addEvent({
    delay: 1000,
    callback: fillYellowCircle,
    callbackScope: this,
    loop: true,
  });
}

function createJoystick(pointer) {
  initialPointerY = pointer.y;
  joystick = this.add.circle(pointer.x, pointer.y, 30, 0x888888);
}

function moveJoystick(pointer) {
  if (joystick) {
    const deltaY = pointer.y - initialPointerY;
    targetVelocityY = deltaY * 0.1; // Adjust the multiplier as needed
  }
}

function removeJoystick() {
  if (joystick) {
    joystick.destroy();
    joystick = null;
    targetVelocityY = 0; // Reset target velocity when joystick is released
  }
}

function createSquare() {
  square = this.add.rectangle(
    config.width / 2,
    config.height / 2,
    50,
    50,
    0xff0000
  );
  targetY = square.y;
}

function createButtons() {
  moveUpButton = this.add
    .text(config.width / 2 - 100, config.height - 150, "Up", {
      fontSize: "48px",
      fill: "#fff",
    })
    .setInteractive()
    .on("pointerdown", () => moveSquare("up"));

  moveDownButton = this.add
    .text(config.width / 2 + 50, config.height - 150, "Down", {
      fontSize: "48px",
      fill: "#fff",
    })
    .setInteractive()
    .on("pointerdown", () => moveSquare("down"));
}

function createCircle() {
  circle = this.add.circle(config.width / 2, 0, 25, 0x0000ff);
}

function createYellowCircleOutline() {
  yellowCircleOutline = this.add.circle(
    config.width / 2,
    config.height / 2 - 150,
    25
  );
  yellowCircleOutline.setStrokeStyle(2, 0xffff00);
}

function createHealthBar() {
  healthBarBackground = this.add.rectangle(
    circle.x,
    circle.y - 35,
    50,
    10,
    0x000000
  );
  healthBar = this.add.rectangle(circle.x, circle.y - 35, 50, 10, 0xff0000);
}

function updateJoystickVelocity() {
  const acceleration = 0.2; // Adjust the acceleration as needed
  if (velocityY < targetVelocityY) {
    velocityY = Math.min(velocityY + acceleration, targetVelocityY);
  } else if (velocityY > targetVelocityY) {
    velocityY = Math.max(velocityY - acceleration, targetVelocityY);
  }
}

function applyJoystickVelocity() {
  square.y += velocityY;
}

function moveCircleDownward() {
  circle.y += 1;
}

function updateUIPositions() {
  yellowCircleOutline.y = square.y - 150;
  healthBarBackground.x = circle.x;
  healthBarBackground.y = circle.y - 35;
  healthBar.x = circle.x;
  healthBar.y = circle.y - 35;
}

function checkCollisions() {
  if (
    Phaser.Geom.Intersects.RectangleToRectangle(
      circle.getBounds(),
      square.getBounds()
    )
  ) {
    resetGame.call(this);
  }
}

function moveSquare(direction) {
  if (direction === "up") {
    targetY = square.y - moveDistance;
  } else if (direction === "down") {
    targetY = square.y + moveDistance;
  }
  moveUpButton.setAlpha(0.5);
  moveDownButton.setAlpha(0.5);
}

function fillYellowCircle() {
  const yellowCircle = this.add.circle(
    yellowCircleOutline.x,
    yellowCircleOutline.y,
    25,
    0xffff00
  );
  this.time.delayedCall(250, () => yellowCircle.destroy());

  if (Phaser.Geom.Intersects.CircleToCircle(yellowCircle, circle)) {
    reduceCircleHealth.call(this);
  }
}

function reduceCircleHealth() {
  circleHealth -= 45;
  if (circleHealth < 0) {
    circleHealth = 0;
  }
  healthBar.width = (circleHealth / 100) * 50;

  const changeCircleColor = () => {
    circle.setFillStyle(circle.fillColor === 0x0000ff ? 0xffffff : 0x0000ff);
  };

  for (let i = 50; i <= 200; i += 50) {
    this.time.delayedCall(i, changeCircleColor);
  }

  if (circleHealth === 0) {
    resetGame.call(this);
  }
}


function resetGame() {
    this.scene.restart();
    circleHealth = 100;
    healthBar.width = (circleHealth / 100) * 50;
    circle.setFillStyle(0x0000ff);
  }
