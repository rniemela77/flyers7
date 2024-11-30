import Phaser from "phaser";
import { CONSTANTS } from "./src/constants";
import Joystick from "./src/joystick";
import Enemy from "./src/enemy";

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
    this.square = null;
    this.yellowCircleOutline = null;
    this.joystick = null;
    this.enemies = [];
  }

  preload() {
    // Load any assets if necessary
  }

  create() {
    this.joystick = new Joystick(this);
    this.setupInputHandlers();
    this.createGameObjects();
    this.setupTimers();
  }

  update() {
    this.joystick.updateJoystickVelocity();
    this.joystick.applyJoystickVelocity();
    this.moveEnemiesDownward();
    this.updateUIPositions();
    this.checkCollisions();
    this.updateGameObjects();
    // Note: updateTargeting() logic moved into updateUIPositions()
  }

  setupInputHandlers() {
    this.input.on("pointerdown", this.joystick.createJoystick, this.joystick);
    this.input.on("pointermove", this.joystick.moveJoystick, this.joystick);
    this.input.on("pointerup", this.joystick.removeJoystick, this.joystick);
  }

  createGameObjects() {
    this.createSquare();
    this.createYellowCircleOutline();
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

    // Timer to create a new enemy every few seconds
    this.time.addEvent({
      delay: 3000, // Adjust the delay as needed
      callback: this.createEnemy,
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

  createIndicatorLine() {
    this.indicatorLine = this.add.line(0, 0, 0, 0, 0, 0, 0xffffff);
    this.indicatorLine.setOrigin(0, 0);
  }

  createEnemy() {
    const x = Phaser.Math.Between(0, this.scale.width);
    const y = 0; // Start at the top of the screen
    const enemy = new Enemy(this, x, y);
    this.enemies.push(enemy);
  }

  moveEnemiesDownward() {
    this.enemies.forEach((enemy) => {
      enemy.moveDown();
    });
  }

  updateUIPositions() {
    const distanceFromSquare = 100;
    let closestEnemy = null;
    let minDistance = Infinity;

    this.enemies.forEach((enemy) => {
      if (!enemy.isVisible()) return;

      const distance = enemy.getDistanceTo(this.square.x, this.square.y);
      if (distance < minDistance) {
        minDistance = distance;
        closestEnemy = enemy;
      }
    });

    if (closestEnemy) {
      const angle = Phaser.Math.Angle.Between(
        this.square.x,
        this.square.y,
        closestEnemy.getPosition().x,
        closestEnemy.getPosition().y
      );

      this.yellowCircleOutline.x =
        this.square.x + distanceFromSquare * Math.cos(angle);
      this.yellowCircleOutline.y =
        this.square.y + distanceFromSquare * Math.sin(angle);
    }

    // Hide all targeting outlines
    this.enemies.forEach((enemy) => enemy.setTargetingVisible(false));

    // Show targeting outline for the closest enemy
    if (closestEnemy) {
      closestEnemy.setTargetingVisible(true);
    }
  }

  checkCollisions() {
    const squareBounds = this.square.getBounds();
    this.enemies.forEach((enemy) => {
      if (
        Phaser.Geom.Intersects.RectangleToRectangle(
          enemy.getBounds(),
          squareBounds
        )
      ) {
        this.resetGame();
      }
    });
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

    this.enemies.forEach((enemy) => {
      if (
        enemy.isVisible() &&
        Phaser.Geom.Intersects.CircleToCircle(yellowCircle, enemy.sprite)
      ) {
        const isDead = enemy.takeDamage(CONSTANTS.reduceHealthAmount);
        if (isDead) {
          // Remove dead enemy from the array
          this.enemies = this.enemies.filter((e) => e !== enemy);
        }
      }
    });
  }

  lineAttack() {
    let targetEnemy = null;
    this.enemies.forEach((enemy) => {
      if (enemy.isVisible() && enemy.targetingOutline.visible) {
        targetEnemy = enemy;
      }
    });

    if (targetEnemy) {
      const attackLine = new Phaser.Geom.Line(
        this.square.x,
        this.square.y,
        targetEnemy.getPosition().x,
        targetEnemy.getPosition().y
      );
      const lineGraphic = this.add.graphics();
      lineGraphic.lineStyle(2, 0xff0000);
      lineGraphic.strokeLineShape(attackLine);

      this.time.delayedCall(CONSTANTS.lineAttackDuration, () =>
        lineGraphic.destroy()
      );

      const targetEnemyGeom = new Phaser.Geom.Circle(
        targetEnemy.getPosition().x,
        targetEnemy.getPosition().y,
        targetEnemy.getRadius()
      );

      if (Phaser.Geom.Intersects.LineToCircle(attackLine, targetEnemyGeom)) {
        const isDead = targetEnemy.takeDamage(CONSTANTS.lineAttackDamage);
        if (isDead) {
          // Remove dead enemy from the array
          this.enemies = this.enemies.filter((e) => e !== targetEnemy);
        }
      }
    }
  }

  resetGame() {
    this.scene.restart();
  }

  updateGameObjects() {
    const offsetX = this.scale.width / 2 - this.square.x;
    const offsetY = this.scale.height / 2 - this.square.y;

    this.enemies.forEach((enemy) => {
      enemy.updatePosition(offsetX, offsetY);
    });
    this.updateObjectPosition(this.yellowCircleOutline, offsetX, offsetY);

    this.square.x = this.scale.width / 2;
    this.square.y = this.scale.height / 2;
  }

  updateObjectPosition(object, offsetX, offsetY) {
    object.x += offsetX;
    object.y += offsetY;
  }
}

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  scene: GameScene,
};

const game = new Phaser.Game(config);
