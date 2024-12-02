import Phaser from "phaser";
import { CONSTANTS } from "../constants";
import Joystick from "../joystick";
import Enemy from "../enemy";
import Attack from "../attack";
import Player from "../player";
import YellowAttack from "../YellowAttack";
import playerSprite from '../trnasp.png';
import enemySprite from '../enemy.png';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
    this.player = null;
    this.joystick = null;
    this.enemies = [];
    this.attack = null;
    this.yellowAttack = null;
    this.grid = null;
    this.obstacles = null;
  }

  preload() {
    // Load player sprite using the imported asset
    this.load.image('player', playerSprite);
    // Load enemy sprite
    this.load.image('enemy', enemySprite);
  }

  create() {
    // Set world bounds
    this.physics.world.setBounds(0, 0, 1000, 1000); // Smaller world

    this.createBackground();
    this.createBoundaryWalls();
    this.createObstacles();
    this.createPlayer();
    this.joystick = new Joystick(this, this.player);
    this.attack = new Attack(this);
    this.yellowAttack = new YellowAttack(this, this.player);
    this.yellowAttack.createYellowCircleOutline();
    this.setupInputHandlers();
    this.setupTimers();

    // Set up camera to follow player with deadzone
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.0); // Adjust zoom if needed
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

    // Update enemies and remove destroyed ones
    this.enemies = this.enemies.filter(enemy => {
      if (enemy.sprite && enemy.sprite.active) {
        enemy.update();
        return true;
      }
      return false;
    });

    this.yellowAttack.updateUIPositions(this.enemies);
    this.checkCollisions();
    this.updateGameObjects();
  }

  createPlayer() {
    const x = 500; // Start in center of world
    const y = 500;
    this.player = new Player(this, x, y);
    this.physics.add.collider(this.player.sprite, this.obstacles);
    this.physics.add.collider(this.player.sprite, this.walls);
  }

  createEnemy() {
    // Spawn enemies at random positions in the world
    const x = Phaser.Math.Between(100, 900);
    const y = Phaser.Math.Between(100, 900);
    const enemy = new Enemy(this, x, y);
    this.enemies.push(enemy);
    this.physics.add.collider(enemy.sprite, this.obstacles);
    this.physics.add.collider(enemy.sprite, this.walls);
    this.physics.add.collider(enemy.sprite, this.player.sprite);
  }

  checkCollisions() {
    // All collision checks are now handled in the individual attack classes
    // on the first frame of the attack only
    return;
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

    // Clean up enemies
    this.enemies.forEach(enemy => {
      if (enemy && enemy.destroy) {
        enemy.destroy();
      }
    });
    this.enemies = [];

    this.scene.restart();
  }

  updateGameObjects() {
    this.yellowAttack.updateUIPositions(this.enemies);
    this.attack.updateAttacks(0, 0);
    this.yellowAttack.updateObjectPosition(0, 0);
  }

  createBackground() {
    // Create a graphics object for the grid
    this.grid = this.add.graphics();
    this.grid.lineStyle(1, 0x3573C0, 1);

    // Make the grid cover the entire world
    const width = 1000;
    const height = 1000;
    const cellSize = 50;

    // Draw vertical lines
    for (let x = 0; x <= width; x += cellSize) {
      this.grid.moveTo(x, 0);
      this.grid.lineTo(x, height);
    }

    // Draw horizontal lines
    for (let y = 0; y <= height; y += cellSize) {
      this.grid.moveTo(0, y);
      this.grid.lineTo(width, y);
    }

    this.grid.strokePath();
    this.grid.setDepth(0);
  }

  createBoundaryWalls() {
    const wallThickness = 50;
    const worldWidth = 1000;
    const worldHeight = 1000;

    // Create walls group
    this.walls = this.physics.add.staticGroup();

    // Create the four walls
    const walls = [
      // Top wall
      this.add.rectangle(worldWidth/2, -wallThickness/2, worldWidth + wallThickness*2, wallThickness, 0x808080),
      // Bottom wall
      this.add.rectangle(worldWidth/2, worldHeight + wallThickness/2, worldWidth + wallThickness*2, wallThickness, 0x808080),
      // Left wall
      this.add.rectangle(-wallThickness/2, worldHeight/2, wallThickness, worldHeight + wallThickness*2, 0x808080),
      // Right wall
      this.add.rectangle(worldWidth + wallThickness/2, worldHeight/2, wallThickness, worldHeight + wallThickness*2, 0x808080)
    ];

    // Add walls to physics group
    walls.forEach(wall => {
      this.walls.add(wall);
      wall.setDepth(1);
    });
  }

  createObstacles() {
    // Create a physics group for obstacles
    this.obstacles = this.physics.add.staticGroup();

    // Create obstacles spread across the world
    const obstaclePositions = [
      { x: 150, y: 150, width: 100, height: 100 },
      { x: 850, y: 150, width: 120, height: 80 },
      { x: 500, y: 300, width: 150, height: 100 },
      { x: 200, y: 700, width: 80, height: 200 },
      { x: 800, y: 800, width: 120, height: 120 },
      { x: 500, y: 800, width: 180, height: 60 }
    ];

    obstaclePositions.forEach(({ x, y, width, height }) => {
      const obstacle = this.add.rectangle(x, y, width, height, 0x4a4a4a);
      this.obstacles.add(obstacle);
      obstacle.body.setSize(width, height);
      obstacle.body.immovable = true;
    });
  }
}
