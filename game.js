import Phaser from "phaser";
import { CONSTANTS } from "./src/constants";
import Joystick from "./src/joystick";
import Enemy from "./src/Enemy";
import Attack from "./src/attack";
import Player from "./src/player";
import YellowAttack from "./src/YellowAttack";

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
    this.player = null;
    this.joystick = null;
    this.enemies = [];
    this.attack = null;
    this.yellowAttack = null;
  }

  preload() {
    // Load any assets if necessary
  }

  create() {
    this.createPlayer(); // Initialize the player first
    this.joystick = new Joystick(this, this.player); // Now this.player is not null
    this.attack = new Attack(this);
    this.yellowAttack = new YellowAttack(this, this.player);
    this.yellowAttack.createYellowCircleOutline();
    this.setupInputHandlers();
    this.setupTimers();
  }

  update() {
    this.joystick.updateJoystickVelocity();
    this.joystick.applyJoystickVelocity();

    // Update player movement
    this.player.update();

    this.moveEnemiesDownward();
    this.yellowAttack.updateUIPositions(this.enemies);
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

  setupTimers() {
    this.time.addEvent({
      delay: CONSTANTS.fillYellowCircleDelay,
      callback: this.yellowAttack.performYellowCircleAttack,
      callbackScope: this.yellowAttack,
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
    this.yellowAttack.updateObjectPosition(offsetX, offsetY);

    this.player.updatePosition(offsetX, offsetY);
  }
}

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  scene: GameScene,
};

const game = new Phaser.Game(config);
