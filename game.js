const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  scene: {
    preload,
    create,
    update,
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
  healthBarBackground,
  grid;
let joystick = null,
  initialPointerX = 0,
  initialPointerY = 0,
  velocityX = 0,
  velocityY = 0,
  targetVelocityX = 0,
  targetVelocityY = 0,
  circleHealth = 100;

const moveDistance = 100;
const gridSize = 800;
const gridColor = 0x212121;
const joystickRadius = 30;
const joystickColor = 0x888888;
const squareSize = 50;
const squareColor = 0xff0000;
const circleRadius = 25;
const circleColor = 0x0000ff;
const yellowCircleOutlineColor = 0xffff00;
const healthBarWidth = 50;
const healthBarHeight = 10;
const healthBarBackgroundColor = 0x000000;
const healthBarColor = 0xff0000;
const acceleration = 0.2;
const fillYellowCircleDelay = 1000;
const fillYellowCircleDuration = 250;
const reduceHealthAmount = 45;
const resetHealth = 100;

function preload() {
  // Load any assets if necessary
}

function create() {
  createGrid.call(this);
  setupInputHandlers.call(this);
  createGameObjects.call(this);
  setupTimers.call(this);
}

function createGrid() {
  grid = this.add.grid(
    config.width / 2,
    config.height / 2,
    config.width,
    config.height,
    gridSize,
    gridSize,
    gridColor
  );
}

function update() {
  updateJoystickVelocity();
  applyJoystickVelocity();
  moveCircleDownward();
  updateUIPositions();
  checkCollisions.call(this);
  updateGameObjects.call(this);
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
    delay: fillYellowCircleDelay,
    callback: fillYellowCircle,
    callbackScope: this,
    loop: true,
  });
}

function createJoystick(pointer) {
  initialPointerX = pointer.x;
  initialPointerY = pointer.y;
  joystick = this.add.circle(
    pointer.x,
    pointer.y,
    joystickRadius,
    joystickColor
  );
}

function moveJoystick(pointer) {
  if (joystick) {
    const deltaX = pointer.x - initialPointerX;
    const deltaY = pointer.y - initialPointerY;
    targetVelocityX = deltaX * 0.1;
    targetVelocityY = deltaY * 0.1;
  }
}

function removeJoystick() {
  if (joystick) {
    joystick.destroy();
    joystick = null;
    targetVelocityX = 0;
    targetVelocityY = 0;
  }
}

function createSquare() {
  square = this.add.rectangle(
    config.width / 2,
    config.height / 2,
    squareSize,
    squareSize,
    squareColor
  );
  targetY = square.y;
}

function createButtons() {
  moveUpButton = createButton.call(
    this,
    config.width / 2 - 100,
    config.height - 150,
    "Up",
    () => moveSquare("up")
  );
  moveDownButton = createButton.call(
    this,
    config.width / 2 + 50,
    config.height - 150,
    "Down",
    () => moveSquare("down")
  );
}

function createButton(x, y, text, callback) {
  return this.add
    .text(x, y, text, { fontSize: "48px", fill: "#fff" })
    .setInteractive()
    .on("pointerdown", callback);
}

function createCircle() {
  circle = this.add.circle(config.width / 2, 0, circleRadius, circleColor);
}

function createYellowCircleOutline() {
  yellowCircleOutline = this.add.circle(
    config.width / 2,
    config.height / 2 - 150,
    circleRadius
  );
  yellowCircleOutline.setStrokeStyle(2, yellowCircleOutlineColor);
}

function createHealthBar() {
  healthBarBackground = this.add.rectangle(
    circle.x,
    circle.y - 35,
    healthBarWidth,
    healthBarHeight,
    healthBarBackgroundColor
  );
  healthBar = this.add.rectangle(
    circle.x,
    circle.y - 35,
    healthBarWidth,
    healthBarHeight,
    healthBarColor
  );
}

function updateJoystickVelocity() {
  if (velocityX < targetVelocityX) {
    velocityX = Math.min(velocityX + acceleration, targetVelocityX);
  } else if (velocityX > targetVelocityX) {
    velocityX = Math.max(velocityX - acceleration, targetVelocityX);
  }
  if (velocityY < targetVelocityY) {
    velocityY = Math.min(velocityY + acceleration, targetVelocityY);
  } else if (velocityY > targetVelocityY) {
    velocityY = Math.max(velocityY - acceleration, targetVelocityY);
  }
}

function applyJoystickVelocity() {
  square.x += velocityX;
  square.y += velocityY;
}

function moveCircleDownward() {
  circle.y += 1;
}

function updateUIPositions() {
  const distanceFromSquare = 100;
  const angle = Phaser.Math.Angle.Between(
    square.x,
    square.y,
    circle.x,
    circle.y
  );

  yellowCircleOutline.x = square.x + distanceFromSquare * Math.cos(angle);
  yellowCircleOutline.y = square.y + distanceFromSquare * Math.sin(angle);

  healthBarBackground.setPosition(circle.x, circle.y - 35);
  healthBar.setPosition(circle.x, circle.y - 35);
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
  targetY =
    direction === "up" ? square.y - moveDistance : square.y + moveDistance;
  moveUpButton.setAlpha(0.5);
  moveDownButton.setAlpha(0.5);
}

function fillYellowCircle() {
  const yellowCircle = this.add.circle(
    yellowCircleOutline.x,
    yellowCircleOutline.y,
    circleRadius,
    yellowCircleOutlineColor
  );
  this.time.delayedCall(fillYellowCircleDuration, () => yellowCircle.destroy());

  if (Phaser.Geom.Intersects.CircleToCircle(yellowCircle, circle)) {
    reduceCircleHealth.call(this);
  }
}

function reduceCircleHealth() {
  circleHealth = Math.max(circleHealth - reduceHealthAmount, 0);
  healthBar.width = (circleHealth / resetHealth) * healthBarWidth;

  const changeCircleColor = () => {
    circle.setFillStyle(
      circle.fillColor === circleColor ? 0xffffff : circleColor
    );
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
  circleHealth = resetHealth;
  healthBar.width = (circleHealth / resetHealth) * healthBarWidth;
  circle.setFillStyle(circleColor);
}

function updateGameObjects() {
  const offsetX = config.width / 2 - square.x;
  const offsetY = config.height / 2 - square.y;

  circle.x += offsetX;
  circle.y += offsetY;
  yellowCircleOutline.x += offsetX;
  yellowCircleOutline.y += offsetY;
  healthBarBackground.x += offsetX;
  healthBarBackground.y += offsetY;
  healthBar.x += offsetX;
  healthBar.y += offsetY;
  grid.x += offsetX;
  grid.y += offsetY;

  square.x = config.width / 2;
  square.y = config.height / 2;
}
