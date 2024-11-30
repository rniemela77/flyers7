import Phaser from "phaser";
import { CONSTANTS } from "./src/constants";
import Joystick from "./src/joystick";

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
    this.square = null;
    this.enemy1 = null;
    this.enemy2 = null;
    this.yellowCircleOutline = null;
    this.healthBar1 = null;
    this.healthBarBackground1 = null;
    this.healthBar2 = null;
    this.healthBarBackground2 = null;
    this.targetingOutline1 = null;
    this.targetingOutline2 = null;
    this.joystick = null;
    this.enemyHealth1 = 100;
    this.enemyHealth2 = 100;
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
    this.createEnemies();
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

  createEnemies() {
    this.enemy1 = this.add.circle(
      this.scale.width / 2,
      0,
      CONSTANTS.circleRadius,
      CONSTANTS.circleColor
    );
    this.enemy2 = this.add.circle(
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
    this.healthBarBackground1 = this.createHealthBarBackground(this.enemy1);
    this.healthBar1 = this.createHealthBar(this.enemy1);

    this.healthBarBackground2 = this.createHealthBarBackground(this.enemy2);
    this.healthBar2 = this.createHealthBar(this.enemy2);
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

  createTargetingOutlines() {
    this.targetingOutline1 = this.createTargetingOutline(this.enemy1);
    this.targetingOutline2 = this.createTargetingOutline(this.enemy2);
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

  createIndicatorLine() {
    this.indicatorLine = this.add.line(0, 0, 0, 0, 0, 0, 0xffffff);
    this.indicatorLine.setOrigin(0, 0);
  }

  moveEnemiesDownward() {
    this.enemy1.y += 1;
    this.enemy2.y += 1;
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
      this.enemy1
    );
    this.updateHealthBarPosition(
      this.healthBarBackground2,
      this.healthBar2,
      this.enemy2
    );

    this.targetingOutline1.setPosition(this.enemy1.x, this.enemy1.y);
    this.targetingOutline2.setPosition(this.enemy2.x, this.enemy2.y);
  }

  updateHealthBarPosition(background, bar, enemy) {
    background.setPosition(enemy.x, enemy.y - 35);
    bar.setPosition(enemy.x, enemy.y - 35);
  }

  checkCollisions() {
    if (
      Phaser.Geom.Intersects.RectangleToRectangle(
        this.enemy1.getBounds(),
        this.square.getBounds()
      ) ||
      Phaser.Geom.Intersects.RectangleToRectangle(
        this.enemy2.getBounds(),
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

    if (Phaser.Geom.Intersects.CircleToCircle(yellowCircle, this.enemy1)) {
      this.reduceEnemyHealth(1);
    } else if (
      Phaser.Geom.Intersects.CircleToCircle(yellowCircle, this.enemy2)
    ) {
      this.reduceEnemyHealth(2);
    }
  }

  lineAttack() {
    let targetEnemy;
    if (this.targetingOutline1.visible) {
      targetEnemy = this.enemy1;
    } else if (this.targetingOutline2.visible) {
      targetEnemy = this.enemy2;
    }

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

      if (Phaser.Geom.Intersects.LineToCircle(attackLine, targetEnemyGeom)) {
        this.reduceEnemyHealth(
          targetEnemy === this.enemy1 ? 1 : 2,
          CONSTANTS.lineAttackDamage
        );
      }
    }
  }

  reduceEnemyHealth(enemyNumber, damage = CONSTANTS.reduceHealthAmount) {
    if (enemyNumber === 1) {
      this.enemyHealth1 = Math.max(this.enemyHealth1 - damage, 0);
      this.healthBar1.width =
        (this.enemyHealth1 / CONSTANTS.resetHealth) * CONSTANTS.healthBarWidth;

      if (this.enemyHealth1 === 0) {
        this.hideEnemy(
          this.enemy1,
          this.healthBar1,
          this.healthBarBackground1,
          this.targetingOutline1
        );
      }
    } else if (enemyNumber === 2) {
      this.enemyHealth2 = Math.max(this.enemyHealth2 - damage, 0);
      this.healthBar2.width =
        (this.enemyHealth2 / CONSTANTS.resetHealth) * CONSTANTS.healthBarWidth;

      if (this.enemyHealth2 === 0) {
        this.hideEnemy(
          this.enemy2,
          this.healthBar2,
          this.healthBarBackground2,
          this.targetingOutline2
        );
      }
    }

    if (this.enemyHealth1 === 0 && this.enemyHealth2 === 0) {
      this.resetGame();
    }
  }

  hideEnemy(enemy, healthBar, healthBarBackground, targetingOutline) {
    enemy.setVisible(false);
    healthBar.setVisible(false);
    healthBarBackground.setVisible(false);
    targetingOutline.setVisible(false);
  }

  resetGame() {
    this.scene.restart();
    this.enemyHealth1 = CONSTANTS.resetHealth;
    this.enemyHealth2 = CONSTANTS.resetHealth;
    this.healthBar1.width =
      (this.enemyHealth1 / CONSTANTS.resetHealth) * CONSTANTS.healthBarWidth;
    this.healthBar2.width =
      (this.enemyHealth2 / CONSTANTS.resetHealth) * CONSTANTS.healthBarWidth;
    this.enemy1.setFillStyle(CONSTANTS.circleColor);
    this.enemy2.setFillStyle(CONSTANTS.circleColor);
  }

  updateGameObjects() {
    const offsetX = this.scale.width / 2 - this.square.x;
    const offsetY = this.scale.height / 2 - this.square.y;

    this.updateObjectPosition(this.enemy1, offsetX, offsetY);
    this.updateObjectPosition(this.enemy2, offsetX, offsetY);
    this.updateObjectPosition(this.yellowCircleOutline, offsetX, offsetY);
    this.updateObjectPosition(this.healthBarBackground1, offsetX, offsetY);
    this.updateObjectPosition(this.healthBar1, offsetX, offsetY);
    this.updateObjectPosition(this.healthBarBackground2, offsetX, offsetY);
    this.updateObjectPosition(this.healthBar2, offsetX, offsetY);

    this.square.x = this.scale.width / 2;
    this.square.y = this.scale.height / 2;
  }

  updateObjectPosition(object, offsetX, offsetY) {
    object.x += offsetX;
    object.y += offsetY;
  }

  updateTargeting() {
    const distanceToEnemy1 = this.enemy1.visible
      ? Phaser.Math.Distance.Between(
          this.square.x,
          this.square.y,
          this.enemy1.x,
          this.enemy1.y
        )
      : Infinity;
    const distanceToEnemy2 = this.enemy2.visible
      ? Phaser.Math.Distance.Between(
          this.square.x,
          this.square.y,
          this.enemy2.x,
          this.enemy2.y
        )
      : Infinity;

    if (distanceToEnemy1 < distanceToEnemy2) {
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
