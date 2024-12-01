import Phaser from "phaser";
import { CONSTANTS } from "../constants";
import Joystick from "../joystick";
import Enemy from "../enemy";
import Attack from "../attack";
import Player from "../player";
import YellowAttack from "../YellowAttack";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
    this.player = null;
    this.joystick = null;
    this.enemies = [];
    this.attack = null;
    this.yellowAttack = null;
    this.grid = null;
  }

  preload() {
    // Load any assets if necessary
  }

  create() {
    this.createBackground();
    this.createPlayer();
    this.joystick = new Joystick(this, this.player);
    this.attack = new Attack(this);
    this.yellowAttack = new YellowAttack(this, this.player);
    this.yellowAttack.createYellowCircleOutline();
    this.setupInputHandlers();
    this.setupTimers();
  }

  setupInputHandlers() {
    this.input.on("pointerdown", this.joystick.createJoystick, this.joystick);
    this.input.on("pointermove", this.joystick.moveJoystick, this.joystick);
    this.input.on("pointerup", this.joystick.removeJoystick, this.joystick);
  }

  setupTimers() {
    this.yellowAttackTimer = this.time.addEvent({
      delay: CONSTANTS.fillYellowCircleDelay,
      callback: this.yellowAttack.performYellowCircleAttack,
      callbackScope: this.yellowAttack,
      loop: true,
    });

    this.lineAttackTimer = this.time.addEvent({
      delay: 500,
      callback: this.performLineAttack,
      callbackScope: this,
      loop: true,
    });

    this.enemySpawnTimer = this.time.addEvent({
      delay: 3000,
      callback: this.createEnemy,
      callbackScope: this,
      loop: true,
    });
  }

  update() {
    this.joystick.updateJoystickVelocity();
    this.joystick.applyJoystickVelocity();
    this.player.update();

    this.enemies.forEach((enemy) => enemy.update());

    this.yellowAttack.updateUIPositions(this.enemies);
    this.checkCollisions();
    this.updateGameObjects();
  }

  createPlayer() {
    const x = this.scale.width / 2;
    const y = this.scale.height / 2;
    this.player = new Player(this, x, y);
  }

  createEnemy() {
    const x = Phaser.Math.Between(0, this.scale.width);
    const y = 0;
    const enemy = new Enemy(this, x, y);
    this.enemies.push(enemy);
  }

  checkCollisions() {
    const playerBounds = this.player.getBounds();
    this.enemies.forEach((enemy) => {
      // Check for body collisions
      if (
        Phaser.Geom.Intersects.RectangleToRectangle(
          enemy.getBounds(),
          playerBounds
        )
      ) {
        this.resetGame();
      }

      // Check enemy's line attacks
      enemy.attackController.activeAttacks.forEach((lineGraphic) => {
        if (lineGraphic?.attackLine) {
          enemy.attackController.checkLineAttackCollision(
            lineGraphic.attackLine,
            this.player,
            lineGraphic
          );
        }
      });

      // Check other attacks
      enemy.purpleAttack.checkCollisions([this.player]);
      enemy.stickAttack.checkCollisions([this.player]);
    });
    this.yellowAttack.checkCollisions(this.enemies);
  }

  performLineAttack() {
    let targetEnemy = null;
    this.enemies.forEach((enemy) => {
      if (enemy.isVisible() && enemy.targetingOutline.visible) {
        targetEnemy = enemy;
      }
    });

    if (targetEnemy) {
      const startPosition = this.player.getPosition();
      const targetPosition = targetEnemy.getPosition();
      const attackLine = this.attack.lineAttack(startPosition, targetPosition);
    }
  }

  resetGame() {
    // Clean up timers and objects before restarting
    if (this.yellowAttackTimer) this.yellowAttackTimer.remove();
    if (this.lineAttackTimer) this.lineAttackTimer.remove();
    if (this.enemySpawnTimer) this.enemySpawnTimer.remove();

    if (this.joystick) {
      this.input.off(
        "pointerdown",
        this.joystick.createJoystick,
        this.joystick
      );
      this.input.off("pointermove", this.joystick.moveJoystick, this.joystick);
      this.input.off("pointerup", this.joystick.removeJoystick, this.joystick);
      this.joystick.removeJoystick();
    }

    if (this.yellowAttack) this.yellowAttack.destroy();
    if (this.attack) this.attack.destroy();

    this.enemies.forEach((enemy) => enemy.destroy());
    this.enemies = [];

    this.scene.restart();
  }

  updateGameObjects() {
    const offsetX = this.scale.width / 2 - this.player.getPosition().x;
    const offsetY = this.scale.height / 2 - this.player.getPosition().y;

    // Update grid position
    if (this.grid) {
      this.grid.x += offsetX;
      this.grid.y += offsetY;
    }

    this.enemies.forEach((enemy) => {
      enemy.updatePosition(offsetX, offsetY);
      enemy.attackController.updateAttacks(offsetX, offsetY);
    });
    this.attack.updateAttacks(offsetX, offsetY);
    this.yellowAttack.updateObjectPosition(offsetX, offsetY);
    this.player.updatePosition(offsetX, offsetY);
  }

  createBackground() {
    // Create a graphics object for the grid
    this.grid = this.add.graphics();
    this.grid.lineStyle(1, 0x3573C0, 1); // Thicker, darker lines with higher opacity

    // Make the grid much larger than the screen to handle camera movement
    const width = this.scale.width * 4;
    const height = this.scale.height * 4;
    const cellSize = 50; // Slightly larger cells

    // Draw vertical lines
    for (let x = 0; x <= width; x += cellSize) {
      this.grid.moveTo(x - width / 2, -height / 2);
      this.grid.lineTo(x - width / 2, height / 2);
    }

    // Draw horizontal lines
    for (let y = 0; y <= height; y += cellSize) {
      this.grid.moveTo(-width / 2, y - height / 2);
      this.grid.lineTo(width / 2, y - height / 2);
    }

    this.grid.strokePath();
    this.grid.setDepth(0);
  }
}
