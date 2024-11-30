import Phaser from "phaser";
import { CONSTANTS } from "./src/constants";
import Joystick from "./src/joystick";

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
    this.square = null;
    this.yellowCircleOutline = null;
    this.joystick = null;
    this.enemies = [];
    this.enemyHealth = [];
    this.healthBars = [];
    this.healthBarBackgrounds = [];
    this.targetingOutlines = [];
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
    this.updateTargeting();
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
    const enemy = this.add.circle(
      x,
      y,
      CONSTANTS.circleRadius,
      CONSTANTS.circleColor
    );
    this.enemies.push(enemy);

    const enemyHealth = CONSTANTS.resetHealth;
    this.enemyHealth.push(enemyHealth);

    const healthBarBackground = this.createHealthBarBackground(enemy);
    this.healthBarBackgrounds.push(healthBarBackground);

    const healthBar = this.createHealthBar(enemy);
    this.healthBars.push(healthBar);

    const targetingOutline = this.createTargetingOutline(enemy);
    this.targetingOutlines.push(targetingOutline);
  }

  createHealthBarBackground(enemy) {
    return this.add.rectangle(
      enemy.x,
      enemy.y - 35,
      CONSTANTS.healthBarWidth,
      CONSTANTS.healthBarHeight,
      CONSTANTS.healthBarBackgroundColor
    );
  }

  createHealthBar(enemy) {
    return this.add.rectangle(
      enemy.x,
      enemy.y - 35,
      CONSTANTS.healthBarWidth,
      CONSTANTS.healthBarHeight,
      CONSTANTS.healthBarColor
    );
  }

  createTargetingOutline(enemy) {
    const outline = this.add.circle(
      enemy.x,
      enemy.y,
      CONSTANTS.circleRadius + 5
    );
    outline.setStrokeStyle(2, 0xffffff);
    outline.setVisible(false);
    return outline;
  }

  moveEnemiesDownward() {
    this.enemies.forEach((enemy) => {
      enemy.y += 1;
    });
  }

  updateUIPositions() {
    const distanceFromSquare = 100;
    let closestEnemy = null;
    let minDistance = Infinity;

    this.enemies.forEach((enemy, index) => {
      if (!enemy.visible) return;

      // Update health bar positions
      this.updateHealthBarPosition(
        this.healthBarBackgrounds[index],
        this.healthBars[index],
        enemy
      );

      // Update targeting outline positions
      this.targetingOutlines[index].setPosition(enemy.x, enemy.y);

      const distance = Phaser.Math.Distance.Between(
        this.square.x,
        this.square.y,
        enemy.x,
        enemy.y
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestEnemy = enemy;
      }
    });

    if (closestEnemy) {
      const angle = Phaser.Math.Angle.Between(
        this.square.x,
        this.square.y,
        closestEnemy.x,
        closestEnemy.y
      );

      this.yellowCircleOutline.x =
        this.square.x + distanceFromSquare * Math.cos(angle);
      this.yellowCircleOutline.y =
        this.square.y + distanceFromSquare * Math.sin(angle);
    }

    // Hide all targeting outlines
    this.targetingOutlines.forEach((outline) => outline.setVisible(false));

    // Show targeting outline for the closest enemy
    if (closestEnemy) {
      const index = this.enemies.indexOf(closestEnemy);
      this.targetingOutlines[index].setVisible(true);
    }
  }

  updateHealthBarPosition(background, bar, enemy) {
    background.setPosition(enemy.x, enemy.y - 35);
    bar.setPosition(enemy.x, enemy.y - 35);
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

    this.enemies.forEach((enemy, index) => {
      if (
        enemy &&
        Phaser.Geom.Intersects.CircleToCircle(yellowCircle, enemy)
      ) {
        this.reduceEnemyHealth(index);
      }
    });
  }

  lineAttack() {
    let targetEnemy = null;
    this.targetingOutlines.forEach((outline, index) => {
      if (outline.visible) {
        targetEnemy = this.enemies[index];
      }
    });

    if (targetEnemy) {
      const attackLine = new Phaser.Geom.Line(
        this.square.x,
        this.square.y,
        targetEnemy.x,
        targetEnemy.y
      );
      const lineGraphic = this.add.graphics();
      lineGraphic.lineStyle(2, 0xff0000);
      lineGraphic.strokeLineShape(attackLine);

      this.time.delayedCall(CONSTANTS.lineAttackDuration, () =>
        lineGraphic.destroy()
      );

      const targetEnemyGeom = new Phaser.Geom.Circle(
        targetEnemy.x,
        targetEnemy.y,
        targetEnemy.radius
      );

      if (
        Phaser.Geom.Intersects.LineToCircle(attackLine, targetEnemyGeom)
      ) {
        this.reduceEnemyHealth(
          this.enemies.indexOf(targetEnemy),
          CONSTANTS.lineAttackDamage
        );
      }
    }
  }

  reduceEnemyHealth(enemyIndex, damage = CONSTANTS.reduceHealthAmount) {
    this.enemyHealth[enemyIndex] = Math.max(
      this.enemyHealth[enemyIndex] - damage,
      0
    );
    this.healthBars[enemyIndex].width =
      (this.enemyHealth[enemyIndex] / CONSTANTS.resetHealth) *
      CONSTANTS.healthBarWidth;

    if (this.enemyHealth[enemyIndex] === 0) {
      this.hideEnemy(
        this.enemies[enemyIndex],
        this.healthBars[enemyIndex],
        this.healthBarBackgrounds[enemyIndex],
        this.targetingOutlines[enemyIndex]
      );
    }

    // Check if all enemies are defeated
    if (this.enemies.length === 0) {
      this.resetGame();
    }
  }

  hideEnemy(enemy, healthBar, healthBarBackground, targetingOutline) {
    const index = this.enemies.indexOf(enemy);
    if (index > -1) {
      // Destroy all related game objects
      enemy.destroy();
      healthBar.destroy();
      healthBarBackground.destroy();
      targetingOutline.destroy();

      // Remove elements from arrays
      this.enemies.splice(index, 1);
      this.enemyHealth.splice(index, 1);
      this.healthBars.splice(index, 1);
      this.healthBarBackgrounds.splice(index, 1);
      this.targetingOutlines.splice(index, 1);
    }
  }

  resetGame() {
    this.scene.restart();
  }

  updateGameObjects() {
    const offsetX = this.scale.width / 2 - this.square.x;
    const offsetY = this.scale.height / 2 - this.square.y;

    this.enemies.forEach((enemy) => {
      this.updateObjectPosition(enemy, offsetX, offsetY);
    });
    this.healthBarBackgrounds.forEach((background) => {
      this.updateObjectPosition(background, offsetX, offsetY);
    });
    this.healthBars.forEach((bar) => {
      this.updateObjectPosition(bar, offsetX, offsetY);
    });
    this.targetingOutlines.forEach((outline) => {
      this.updateObjectPosition(outline, offsetX, offsetY);
    });
    this.updateObjectPosition(this.yellowCircleOutline, offsetX, offsetY);

    this.square.x = this.scale.width / 2;
    this.square.y = this.scale.height / 2;
  }

  updateObjectPosition(object, offsetX, offsetY) {
    object.x += offsetX;
    object.y += offsetY;
  }

  updateTargeting() {
    let closestEnemy = null;
    let minDistance = Infinity;

    this.enemies.forEach((enemy, index) => {
      if (!enemy.visible) return;

      const distance = Phaser.Math.Distance.Between(
        this.square.x,
        this.square.y,
        enemy.x,
        enemy.y
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestEnemy = enemy;
      }
    });

    // Hide all targeting outlines
    this.targetingOutlines.forEach((outline) => outline.setVisible(false));

    // Show targeting outline for the closest enemy
    if (closestEnemy) {
      const index = this.enemies.indexOf(closestEnemy);
      this.targetingOutlines[index].setVisible(true);
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
