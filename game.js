import Phaser from "phaser";
import { CONSTANTS } from "./src/constants";
import Joystick from "./src/joystick";
import Enemy from "./src/Enemy";
import Attack from "./src/attack";
import Player from "./src/player";

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
    this.player = null;
    this.yellowCircleOutline = null;
    this.joystick = null;
    this.enemies = [];
    this.attack = null;
  }

  preload() {
    // Load any assets if necessary
  }

  create() {
    this.createPlayer(); // Initialize the player first
    this.joystick = new Joystick(this, this.player); // Now this.player is not null
    this.attack = new Attack(this);
    this.createYellowCircleOutline();
    this.setupInputHandlers();
    this.setupTimers();
  }

  update() {
    this.joystick.updateJoystickVelocity();
    this.joystick.applyJoystickVelocity();

    // Update player movement
    this.player.update();

    this.moveEnemiesDownward();
    this.updateUIPositions();
    this.checkCollisions();
    this.updateGameObjects();
  }

  setupInputHandlers() {
    this.input.on("pointerdown", this.joystick.createJoystick, this.joystick);
    this.input.on("pointermove", this.joystick.moveJoystick, this.joystick);
    this.input.on("pointerup", this.joystick.removeJoystick, this.joystick);
  }

  createPlayer() {
    const x = this.scale.width / 2;
    const y = this.scale.height / 2;
    this.player = new Player(this, x, y);
  }

  createGameObjects() {
    this.createPlayer();
    this.createYellowCircleOutline();
  }

  setupTimers() {
    this.time.addEvent({
      delay: CONSTANTS.fillYellowCircleDelay,
      callback: this.performYellowCircleAttack,
      callbackScope: this,
      loop: true,
    });

    this.time.addEvent({
      delay: 500,
      callback: this.performLineAttack,
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

  createPlayer() {
    const x = this.scale.width / 2;
    const y = this.scale.height / 2;
    this.player = new Player(this, x, y);
  }

  createYellowCircleOutline() {
    this.yellowCircleOutline = this.add.circle(
      this.player.getPosition().x,
      this.player.getPosition().y - 150,
      CONSTANTS.circleRadius
    );
    this.yellowCircleOutline.setStrokeStyle(
      2,
      CONSTANTS.yellowCircleOutlineColor
    );
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
    const distanceFromPlayer = 100;
    let closestEnemy = null;
    let minDistance = Infinity;

    this.enemies.forEach((enemy) => {
      if (!enemy.isVisible()) return;

      const distance = enemy.getDistanceTo(
        this.player.getPosition().x,
        this.player.getPosition().y
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestEnemy = enemy;
      }
    });

    if (closestEnemy) {
      const angle = Phaser.Math.Angle.Between(
        this.player.getPosition().x,
        this.player.getPosition().y,
        closestEnemy.getPosition().x,
        closestEnemy.getPosition().y
      );

      this.yellowCircleOutline.x =
        this.player.getPosition().x + distanceFromPlayer * Math.cos(angle);
      this.yellowCircleOutline.y =
        this.player.getPosition().y + distanceFromPlayer * Math.sin(angle);
    }

    // Hide all targeting outlines
    this.enemies.forEach((enemy) => enemy.setTargetingVisible(false));

    // Show targeting outline for the closest enemy
    if (closestEnemy) {
      closestEnemy.setTargetingVisible(true);
    }
  }

  checkCollisions() {
    const playerBounds = this.player.getBounds();
    this.enemies.forEach((enemy) => {
      if (
        Phaser.Geom.Intersects.RectangleToRectangle(
          enemy.getBounds(),
          playerBounds
        )
      ) {
        this.resetGame();
      }
    });

    // Check collisions between attacks and enemies
    this.attack.checkCollisions(this.enemies);
  }

  performYellowCircleAttack() {
    const position = {
      x: this.yellowCircleOutline.x,
      y: this.yellowCircleOutline.y,
    };
    this.attack.yellowCircleAttack(position);
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

      const isDead = this.attack.checkLineAttackCollision(
        attackLine,
        targetEnemy
      );

      if (isDead) {
        // Remove dead enemy from the array
        this.enemies = this.enemies.filter((e) => e !== targetEnemy);
      }
    }
  }

  resetGame() {
    this.scene.restart();
  }

  updateGameObjects() {
    const offsetX = this.scale.width / 2 - this.player.getPosition().x;
    const offsetY = this.scale.height / 2 - this.player.getPosition().y;

    this.enemies.forEach((enemy) => {
      enemy.updatePosition(offsetX, offsetY);
    });
    this.attack.updateAttacks(offsetX, offsetY);
    this.updateObjectPosition(this.yellowCircleOutline, offsetX, offsetY);

    this.player.updatePosition(offsetX, offsetY);
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
