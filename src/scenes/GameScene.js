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
  }

  preload() {
    // Load any assets if necessary
  }

  create() {
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

    this.time.addEvent({
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
    
    this.enemies.forEach(enemy => enemy.update());
    
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
      if (Phaser.Geom.Intersects.RectangleToRectangle(enemy.getBounds(), playerBounds)) {
        this.resetGame();
      }
      enemy.yellowAttack.checkCollisions([this.player]);
      enemy.purpleAttack.checkCollisions([this.player]);
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
      const isDead = this.attack.checkLineAttackCollision(attackLine, targetEnemy);
      if (isDead) {
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
      enemy.attackController.updateAttacks(offsetX, offsetY);
    });
    this.attack.updateAttacks(offsetX, offsetY);
    this.yellowAttack.updateObjectPosition(offsetX, offsetY);
    this.player.updatePosition(offsetX, offsetY);
  }
} 