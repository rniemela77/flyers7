import Phaser from "phaser";
import { CONSTANTS } from "./src/constants";
import Joystick from "./src/joystick";

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
    this.square = null;
    this.circle1 = null;
    this.circle2 = null;
    this.yellowCircleOutline = null;
    this.healthBar1 = null;
    this.healthBarBackground1 = null;
    this.healthBar2 = null;
    this.healthBarBackground2 = null;
    this.grid = null;
    this.targetingOutline1 = null;
    this.targetingOutline2 = null;
    this.joystick = null;
    this.circleHealth1 = 100;
    this.circleHealth2 = 100;
  }

  preload() {
    // Load any assets if necessary
  }

  create() {
    this.createGrid();
    this.joystick = new Joystick(this);
    this.setupInputHandlers();
    this.createGameObjects();
    this.setupTimers();
  }

  update() {
    this.joystick.updateJoystickVelocity();
    this.joystick.applyJoystickVelocity();
    this.moveCircleDownward();
    this.updateUIPositions();
    this.checkCollisions();
    this.updateGameObjects();
    this.updateTargeting();
  }

  createGrid() {
    this.grid = this.add.grid(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      CONSTANTS.gridSize,
      CONSTANTS.gridSize,
      CONSTANTS.gridColor
    );
  }

  setupInputHandlers() {
    this.input.on("pointerdown", this.joystick.createJoystick, this.joystick);
    this.input.on("pointermove", this.joystick.moveJoystick, this.joystick);
    this.input.on("pointerup", this.joystick.removeJoystick, this.joystick);
  }

  createGameObjects() {
    this.createSquare();
    this.createCircles();
    this.createYellowCircleOutline();
    this.createHealthBars();
    this.createTargetingOutlines();
    this.createIndicatorLine();
  }

  setupTimers() {
    this.time.addEvent({
      delay: CONSTANTS.fillYellowCircleDelay,
      callback: this.fillYellowCircle,
      callbackScope: this,
      loop: true,
    });

    this.time.addEvent({
      delay: 500,
      callback: this.lineAttack,
      callbackScope: this,
      loop: true,
    });
  }

  createSquare() {
    this.square = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      CONSTANTS.squareSize,
      CONSTANTS.squareSize,
      CONSTANTS.squareColor
    );
  }

  createCircles() {
    this.circle1 = this.add.circle(
      this.scale.width / 2,
      0,
      CONSTANTS.circleRadius,
      CONSTANTS.circleColor
    );
    this.circle2 = this.add.circle(
      this.scale.width / 2 + 100,
      0,
      CONSTANTS.circleRadius,
      CONSTANTS.circleColor
    );
  }

  createYellowCircleOutline() {
    this.yellowCircleOutline = this.add.circle(
      this.scale.width / 2,
      this.scale.height / 2 - 150,
      CONSTANTS.circleRadius
    );
    this.yellowCircleOutline.setStrokeStyle(
      2,
      CONSTANTS.yellowCircleOutlineColor
    );
  }

  createHealthBars() {
    this.healthBarBackground1 = this.createHealthBarBackground(this.circle1);
    this.healthBar1 = this.createHealthBar(this.circle1);

    this.healthBarBackground2 = this.createHealthBarBackground(this.circle2);
    this.healthBar2 = this.createHealthBar(this.circle2);
  }

  createHealthBarBackground(circle) {
    return this.add.rectangle(
      circle.x,
      circle.y - 35,
      CONSTANTS.healthBarWidth,
      CONSTANTS.healthBarHeight,
      CONSTANTS.healthBarBackgroundColor
    );
  }

  createHealthBar(circle) {
    return this.add.rectangle(
      circle.x,
      circle.y - 35,
      CONSTANTS.healthBarWidth,
      CONSTANTS.healthBarHeight,
      CONSTANTS.healthBarColor
    );
  }

  createTargetingOutlines() {
    this.targetingOutline1 = this.createTargetingOutline(this.circle1);
    this.targetingOutline2 = this.createTargetingOutline(this.circle2);
  }

  createTargetingOutline(circle) {
    const outline = this.add.circle(
      circle.x,
      circle.y,
      CONSTANTS.circleRadius + 5
    );
    outline.setStrokeStyle(2, 0xffffff);
    outline.setVisible(false);
    return outline;
  }

  createIndicatorLine() {
    this.indicatorLine = this.add.line(0, 0, 0, 0, 0, 0, 0xffffff);
    this.indicatorLine.setOrigin(0, 0);
  }

  moveCircleDownward() {
    this.circle1.y += 1;
    this.circle2.y += 1;
  }

  updateUIPositions() {
    const distanceFromSquare = 100;
    const angle = Phaser.Math.Angle.Between(
      this.square.x,
      this.square.y,
      this.targetingOutline1.visible
        ? this.targetingOutline1.x
        : this.targetingOutline2.x,
      this.targetingOutline1.visible
        ? this.targetingOutline1.y
        : this.targetingOutline2.y
    );

    this.yellowCircleOutline.x =
      this.square.x + distanceFromSquare * Math.cos(angle);
    this.yellowCircleOutline.y =
      this.square.y + distanceFromSquare * Math.sin(angle);

    this.updateHealthBarPosition(
      this.healthBarBackground1,
      this.healthBar1,
      this.circle1
    );
    this.updateHealthBarPosition(
      this.healthBarBackground2,
      this.healthBar2,
      this.circle2
    );

    this.targetingOutline1.setPosition(this.circle1.x, this.circle1.y);
    this.targetingOutline2.setPosition(this.circle2.x, this.circle2.y);
  }

  updateHealthBarPosition(background, bar, circle) {
    background.setPosition(circle.x, circle.y - 35);
    bar.setPosition(circle.x, circle.y - 35);
  }

  checkCollisions() {
    if (
      Phaser.Geom.Intersects.RectangleToRectangle(
        this.circle1.getBounds(),
        this.square.getBounds()
      ) ||
      Phaser.Geom.Intersects.RectangleToRectangle(
        this.circle2.getBounds(),
        this.square.getBounds()
      )
    ) {
      this.resetGame();
    }
  }

  fillYellowCircle() {
    const yellowCircle = this.add.circle(
      this.yellowCircleOutline.x,
      this.yellowCircleOutline.y,
      CONSTANTS.circleRadius,
      CONSTANTS.yellowCircleOutlineColor
    );
    this.time.delayedCall(CONSTANTS.fillYellowCircleDuration, () =>
      yellowCircle.destroy()
    );

    if (Phaser.Geom.Intersects.CircleToCircle(yellowCircle, this.circle1)) {
      this.reduceCircleHealth(1);
    } else if (
      Phaser.Geom.Intersects.CircleToCircle(yellowCircle, this.circle2)
    ) {
      this.reduceCircleHealth(2);
    }
  }

  lineAttack() {
    let targetCircle;
    if (this.targetingOutline1.visible) {
      targetCircle = this.circle1;
    } else if (this.targetingOutline2.visible) {
      targetCircle = this.circle2;
    }

    if (targetCircle) {
      const attackLine = new Phaser.Geom.Line(
        this.square.x,
        this.square.y,
        targetCircle.x,
        targetCircle.y
      );
      const lineGraphic = this.add.graphics();
      lineGraphic.lineStyle(2, 0xff0000);
      lineGraphic.strokeLineShape(attackLine);

      this.time.delayedCall(CONSTANTS.lineAttackDuration, () =>
        lineGraphic.destroy()
      );

      const targetCircleGeom = new Phaser.Geom.Circle(
        targetCircle.x,
        targetCircle.y,
        targetCircle.radius
      );

      if (Phaser.Geom.Intersects.LineToCircle(attackLine, targetCircleGeom)) {
        this.reduceCircleHealth(
          targetCircle === this.circle1 ? 1 : 2,
          CONSTANTS.lineAttackDamage
        );
      }
    }
  }

  reduceCircleHealth(circleNumber, damage = CONSTANTS.reduceHealthAmount) {
    if (circleNumber === 1) {
      this.circleHealth1 = Math.max(this.circleHealth1 - damage, 0);
      this.healthBar1.width =
        (this.circleHealth1 / CONSTANTS.resetHealth) * CONSTANTS.healthBarWidth;

      if (this.circleHealth1 === 0) {
        this.hideCircle(
          this.circle1,
          this.healthBar1,
          this.healthBarBackground1,
          this.targetingOutline1
        );
      }
    } else if (circleNumber === 2) {
      this.circleHealth2 = Math.max(this.circleHealth2 - damage, 0);
      this.healthBar2.width =
        (this.circleHealth2 / CONSTANTS.resetHealth) * CONSTANTS.healthBarWidth;

      if (this.circleHealth2 === 0) {
        this.hideCircle(
          this.circle2,
          this.healthBar2,
          this.healthBarBackground2,
          this.targetingOutline2
        );
      }
    }

    if (this.circleHealth1 === 0 && this.circleHealth2 === 0) {
      this.resetGame();
    }
  }

  hideCircle(circle, healthBar, healthBarBackground, targetingOutline) {
    circle.setVisible(false);
    healthBar.setVisible(false);
    healthBarBackground.setVisible(false);
    targetingOutline.setVisible(false);
  }

  resetGame() {
    this.scene.restart();
    this.circleHealth1 = CONSTANTS.resetHealth;
    this.circleHealth2 = CONSTANTS.resetHealth;
    this.healthBar1.width =
      (this.circleHealth1 / CONSTANTS.resetHealth) * CONSTANTS.healthBarWidth;
    this.healthBar2.width =
      (this.circleHealth2 / CONSTANTS.resetHealth) * CONSTANTS.healthBarWidth;
    this.circle1.setFillStyle(CONSTANTS.circleColor);
    this.circle2.setFillStyle(CONSTANTS.circleColor);
  }

  updateGameObjects() {
    const offsetX = this.scale.width / 2 - this.square.x;
    const offsetY = this.scale.height / 2 - this.square.y;

    this.updateObjectPosition(this.circle1, offsetX, offsetY);
    this.updateObjectPosition(this.circle2, offsetX, offsetY);
    this.updateObjectPosition(this.yellowCircleOutline, offsetX, offsetY);
    this.updateObjectPosition(this.healthBarBackground1, offsetX, offsetY);
    this.updateObjectPosition(this.healthBar1, offsetX, offsetY);
    this.updateObjectPosition(this.healthBarBackground2, offsetX, offsetY);
    this.updateObjectPosition(this.healthBar2, offsetX, offsetY);
    this.updateObjectPosition(this.grid, offsetX, offsetY);

    this.square.x = this.scale.width / 2;
    this.square.y = this.scale.height / 2;
  }

  updateObjectPosition(object, offsetX, offsetY) {
    object.x += offsetX;
    object.y += offsetY;
  }

  updateTargeting() {
    const distanceToCircle1 = this.circle1.visible
      ? Phaser.Math.Distance.Between(
          this.square.x,
          this.square.y,
          this.circle1.x,
          this.circle1.y
        )
      : Infinity;
    const distanceToCircle2 = this.circle2.visible
      ? Phaser.Math.Distance.Between(
          this.square.x,
          this.square.y,
          this.circle2.x,
          this.circle2.y
        )
      : Infinity;

    if (distanceToCircle1 < distanceToCircle2) {
      this.targetingOutline1.setVisible(true);
      this.targetingOutline2.setVisible(false);
    } else {
      this.targetingOutline1.setVisible(false);
      this.targetingOutline2.setVisible(true);
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  scene: GameScene,
};

const game = new Phaser.Game(config);
