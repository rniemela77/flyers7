import Phaser from "phaser";
import { CONSTANTS } from "./src/constants";

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
  circle1,
  circle2,
  yellowCircleOutline,
  healthBar1,
  healthBarBackground1,
  healthBar2,
  healthBarBackground2,
  grid,
  targetingOutline1,
  targetingOutline2,
  indicatorLine;
let joystick = null,
  initialPointerX = 0,
  initialPointerY = 0,
  velocityX = 0,
  velocityY = 0,
  targetVelocityX = 0,
  targetVelocityY = 0,
  circleHealth1 = 100,
  circleHealth2 = 100;

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
    CONSTANTS.gridSize,
    CONSTANTS.gridSize,
    CONSTANTS.gridColor
  );
}

function update() {
  updateJoystickVelocity();
  applyJoystickVelocity();
  moveCircleDownward();
  updateUIPositions();
  checkCollisions.call(this);
  updateGameObjects.call(this);
  updateTargeting();
}

function setupInputHandlers() {
  this.input.on("pointerdown", createJoystick, this);
  this.input.on("pointermove", moveJoystick, this);
  this.input.on("pointerup", removeJoystick, this);
}

function createGameObjects() {
  createSquare.call(this);
  createCircles.call(this);
  createYellowCircleOutline.call(this);
  createHealthBars.call(this);
  createTargetingOutlines.call(this);
  createIndicatorLine.call(this);
}

function setupTimers() {
  this.time.addEvent({
    delay: CONSTANTS.fillYellowCircleDelay,
    callback: fillYellowCircle,
    callbackScope: this,
    loop: true,
  });

  this.time.addEvent({
    delay: 500,
    callback: lineAttack,
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
    CONSTANTS.joystickRadius,
    CONSTANTS.joystickColor
  );
}

function moveJoystick(pointer) {
  if (joystick) {
    const deltaX = pointer.x - initialPointerX;
    const deltaY = pointer.y - initialPointerY;
    targetVelocityX = Phaser.Math.Clamp(
      deltaX * 0.1,
      -CONSTANTS.maxSpeed,
      CONSTANTS.maxSpeed
    );
    targetVelocityY = Phaser.Math.Clamp(
      deltaY * 0.1,
      -CONSTANTS.maxSpeed,
      CONSTANTS.maxSpeed
    );

    const angle = Math.atan2(deltaY, deltaX);
    const lineLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY) * 0.5;

    indicatorLine.setTo(
      square.x,
      square.y,
      square.x + lineLength * Math.cos(angle),
      square.y + lineLength * Math.sin(angle)
    );
  }
}

function removeJoystick() {
  if (joystick) {
    joystick.destroy();
    joystick = null;
    targetVelocityX = 0;
    targetVelocityY = 0;
    indicatorLine.setTo(0, 0, 0, 0);
  }
}

function createSquare() {
  square = this.add.rectangle(
    config.width / 2,
    config.height / 2,
    CONSTANTS.squareSize,
    CONSTANTS.squareSize,
    CONSTANTS.squareColor
  );
}

function createCircles() {
  circle1 = this.add.circle(
    config.width / 2,
    0,
    CONSTANTS.circleRadius,
    CONSTANTS.circleColor
  );
  circle2 = this.add.circle(
    config.width / 2 + 100,
    0,
    CONSTANTS.circleRadius,
    CONSTANTS.circleColor
  );
}

function createYellowCircleOutline() {
  yellowCircleOutline = this.add.circle(
    config.width / 2,
    config.height / 2 - 150,
    CONSTANTS.circleRadius
  );
  yellowCircleOutline.setStrokeStyle(2, CONSTANTS.yellowCircleOutlineColor);
}

function createHealthBars() {
  healthBarBackground1 = createHealthBarBackground.call(this, circle1);
  healthBar1 = createHealthBar.call(this, circle1);

  healthBarBackground2 = createHealthBarBackground.call(this, circle2);
  healthBar2 = createHealthBar.call(this, circle2);
}

function createHealthBarBackground(circle) {
  return this.add.rectangle(
    circle.x,
    circle.y - 35,
    CONSTANTS.healthBarWidth,
    CONSTANTS.healthBarHeight,
    CONSTANTS.healthBarBackgroundColor
  );
}

function createHealthBar(circle) {
  return this.add.rectangle(
    circle.x,
    circle.y - 35,
    CONSTANTS.healthBarWidth,
    CONSTANTS.healthBarHeight,
    CONSTANTS.healthBarColor
  );
}

function createTargetingOutlines() {
  targetingOutline1 = createTargetingOutline.call(this, circle1);
  targetingOutline2 = createTargetingOutline.call(this, circle2);
}

function createTargetingOutline(circle) {
  const outline = this.add.circle(
    circle.x,
    circle.y,
    CONSTANTS.circleRadius + 5
  );
  outline.setStrokeStyle(2, 0xffffff);
  outline.setVisible(false);
  return outline;
}

function createIndicatorLine() {
  indicatorLine = this.add.line(0, 0, 0, 0, 0, 0, 0xffffff);
  indicatorLine.setOrigin(0, 0);
}

function updateJoystickVelocity() {
  velocityX = Phaser.Math.Linear(
    velocityX,
    targetVelocityX,
    CONSTANTS.acceleration
  );
  velocityY = Phaser.Math.Linear(
    velocityY,
    targetVelocityY,
    CONSTANTS.acceleration
  );
}

function applyJoystickVelocity() {
  square.x += velocityX;
  square.y += velocityY;
}

function moveCircleDownward() {
  circle1.y += 1;
  circle2.y += 1;
}

function updateUIPositions() {
  const distanceFromSquare = 100;
  const angle = Phaser.Math.Angle.Between(
    square.x,
    square.y,
    targetingOutline1.visible ? targetingOutline1.x : targetingOutline2.x,
    targetingOutline1.visible ? targetingOutline1.y : targetingOutline2.y
  );

  yellowCircleOutline.x = square.x + distanceFromSquare * Math.cos(angle);
  yellowCircleOutline.y = square.y + distanceFromSquare * Math.sin(angle);

  updateHealthBarPosition(healthBarBackground1, healthBar1, circle1);
  updateHealthBarPosition(healthBarBackground2, healthBar2, circle2);

  targetingOutline1.setPosition(circle1.x, circle1.y);
  targetingOutline2.setPosition(circle2.x, circle2.y);
}

function updateHealthBarPosition(background, bar, circle) {
  background.setPosition(circle.x, circle.y - 35);
  bar.setPosition(circle.x, circle.y - 35);
}

function checkCollisions() {
  if (
    Phaser.Geom.Intersects.RectangleToRectangle(
      circle1.getBounds(),
      square.getBounds()
    ) ||
    Phaser.Geom.Intersects.RectangleToRectangle(
      circle2.getBounds(),
      square.getBounds()
    )
  ) {
    resetGame.call(this);
  }
}

function fillYellowCircle() {
  const yellowCircle = this.add.circle(
    yellowCircleOutline.x,
    yellowCircleOutline.y,
    CONSTANTS.circleRadius,
    CONSTANTS.yellowCircleOutlineColor
  );
  this.time.delayedCall(CONSTANTS.fillYellowCircleDuration, () =>
    yellowCircle.destroy()
  );

  if (Phaser.Geom.Intersects.CircleToCircle(yellowCircle, circle1)) {
    reduceCircleHealth.call(this, 1);
  } else if (Phaser.Geom.Intersects.CircleToCircle(yellowCircle, circle2)) {
    reduceCircleHealth.call(this, 2);
  }
}

function lineAttack() {
  let targetCircle;
  if (targetingOutline1.visible) {
    targetCircle = circle1;
  } else if (targetingOutline2.visible) {
    targetCircle = circle2;
  }

  if (targetCircle) {
    const attackLine = new Phaser.Geom.Line(
      square.x,
      square.y,
      targetCircle.x,
      targetCircle.y
    );
    const lineGraphic = this.add.graphics();
    lineGraphic.lineStyle(2, 0xff0000);
    lineGraphic.strokeLineShape(attackLine);

    this.time.delayedCall(CONSTANTS.lineAttackDuration, () =>
      lineGraphic.destroy()
    );

    // Ensure targetCircle is a Phaser.Geom.Circle object
    const targetCircleGeom = new Phaser.Geom.Circle(
      targetCircle.x,
      targetCircle.y,
      targetCircle.radius
    );

    if (Phaser.Geom.Intersects.LineToCircle(attackLine, targetCircleGeom)) {
      reduceCircleHealth.call(
        this,
        targetCircle === circle1 ? 1 : 2,
        CONSTANTS.lineAttackDamage
      );
    }
  }
}

function reduceCircleHealth(
  circleNumber,
  damage = CONSTANTS.reduceHealthAmount
) {
  if (circleNumber === 1) {
    circleHealth1 = Math.max(circleHealth1 - damage, 0);
    healthBar1.width =
      (circleHealth1 / CONSTANTS.resetHealth) * CONSTANTS.healthBarWidth;

    if (circleHealth1 === 0) {
      hideCircle(circle1, healthBar1, healthBarBackground1, targetingOutline1);
    }
  } else if (circleNumber === 2) {
    circleHealth2 = Math.max(circleHealth2 - damage, 0);
    healthBar2.width =
      (circleHealth2 / CONSTANTS.resetHealth) * CONSTANTS.healthBarWidth;

    if (circleHealth2 === 0) {
      hideCircle(circle2, healthBar2, healthBarBackground2, targetingOutline2);
    }
  }

  if (circleHealth1 === 0 && circleHealth2 === 0) {
    resetGame.call(this);
  }
}

function hideCircle(circle, healthBar, healthBarBackground, targetingOutline) {
  circle.setVisible(false);
  healthBar.setVisible(false);
  healthBarBackground.setVisible(false);
  targetingOutline.setVisible(false);
}

function resetGame() {
  this.scene.restart();
  circleHealth1 = CONSTANTS.resetHealth;
  circleHealth2 = CONSTANTS.resetHealth;
  healthBar1.width =
    (circleHealth1 / CONSTANTS.resetHealth) * CONSTANTS.healthBarWidth;
  healthBar2.width =
    (circleHealth2 / CONSTANTS.resetHealth) * CONSTANTS.healthBarWidth;
  circle1.setFillStyle(CONSTANTS.circleColor);
  circle2.setFillStyle(CONSTANTS.circleColor);
}

function updateGameObjects() {
  const offsetX = config.width / 2 - square.x;
  const offsetY = config.height / 2 - square.y;

  updateObjectPosition(circle1, offsetX, offsetY);
  updateObjectPosition(circle2, offsetX, offsetY);
  updateObjectPosition(yellowCircleOutline, offsetX, offsetY);
  updateObjectPosition(healthBarBackground1, offsetX, offsetY);
  updateObjectPosition(healthBar1, offsetX, offsetY);
  updateObjectPosition(healthBarBackground2, offsetX, offsetY);
  updateObjectPosition(healthBar2, offsetX, offsetY);
  updateObjectPosition(grid, offsetX, offsetY);

  square.x = config.width / 2;
  square.y = config.height / 2;
}

function updateObjectPosition(object, offsetX, offsetY) {
  object.x += offsetX;
  object.y += offsetY;
}

function updateTargeting() {
  const distanceToCircle1 = circle1.visible
    ? Phaser.Math.Distance.Between(square.x, square.y, circle1.x, circle1.y)
    : Infinity;
  const distanceToCircle2 = circle2.visible
    ? Phaser.Math.Distance.Between(square.x, square.y, circle2.x, circle2.y)
    : Infinity;

  if (distanceToCircle1 < distanceToCircle2) {
    targetingOutline1.setVisible(true);
    targetingOutline2.setVisible(false);
  } else {
    targetingOutline1.setVisible(false);
    targetingOutline2.setVisible(true);
  }
}
