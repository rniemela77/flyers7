import Phaser from 'phaser';
import { CONSTANTS } from '../constants';
import Joystick from '../joystick';
import EnemyFactory from '../factories/EnemyFactory';
import PlayerAttackManager from '../attacks/PlayerAttackManager';
import Player from '../player';
import playerSprite from '../trnasp.png';
import enemySprite from '../enemy.png';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.initializeProperties();
  }

  initializeProperties() {
    this.player = null;
    this.joystick = null;
    this.enemies = [];
    this.attackManager = null;
    this.grid = null;
    this.obstacles = null;
    this.targetedEnemy = null;
    
    this.swipeState = {
      startX: 0,
      startY: 0,
      startTime: 0,
      isTracking: false
    };
  }

  preload() {
    this.load.image('player', playerSprite);
    this.load.image('enemy', enemySprite);
  }

  create() {
    this.setupWorld();
    this.createGameObjects();
    this.setupCollisions();
    this.setupCamera();
    this.setupInputHandlers();
    this.setupTimers();
  }

  setupWorld() {
    this.physics.world.setBounds(0, 0, 1000, 1000);
    this.enemyCollisionGroup = this.physics.add.group();
    this.createBackground();
    this.createBoundaryWalls();
    this.createObstacles();
  }

  createGameObjects() {
    this.createPlayer();
    this.spawnInitialEnemies();
    this.setupPlayerSystems();
  }

  createPlayer() {
    const x = 500;
    const y = 500;
    this.player = new Player(this, x, y);
    this.physics.add.collider(this.player.sprite, this.obstacles);
    this.physics.add.collider(this.player.sprite, this.walls);
  }

  spawnInitialEnemies() {
    EnemyFactory.spawnEnemyAwayFromPlayer(this, EnemyFactory.ENEMY_TYPES.PURPLE);
    EnemyFactory.spawnEnemyAwayFromPlayer(this, EnemyFactory.ENEMY_TYPES.GREEN);
  }

  setupPlayerSystems() {
    this.joystick = new Joystick(this, this.player);
    this.attackManager = new PlayerAttackManager(this, this.player);
  }

  setupCamera() {
    const cameraOffsetY = -window.innerHeight * 0.14;
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
    this.cameras.main.setFollowOffset(0, cameraOffsetY);
    this.cameras.main.setZoom(CONSTANTS.cameraZoom);
  }

  setupCollisions() {
    this.physics.add.collider(this.enemyCollisionGroup, this.obstacles);
    this.physics.add.collider(this.enemyCollisionGroup, this.walls);
    this.physics.add.collider(this.enemyCollisionGroup, this.player.sprite);
  }

  setupInputHandlers() {
    this.input.on("pointerdown", (pointer) => {
      // Start tracking motion
      this.swipeState = {
        startX: pointer.x,
        startY: pointer.y,
        startTime: this.time.now,
        isTracking: true
      };

      // Create joystick
      this.joystick.createJoystick.call(this.joystick, pointer);
    });

    this.input.on("pointermove", (pointer) => {
      // Only handle joystick movement
      if (this.joystick.joystick) {
        this.joystick.moveJoystick.call(this.joystick, pointer);
      }
    });

    this.input.on("pointerup", (pointer) => {
      if (this.swipeState.isTracking) {
        const dx = pointer.x - this.swipeState.startX;
        const dy = pointer.y - this.swipeState.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const duration = this.time.now - this.swipeState.startTime;

        // If it was a quick motion, trigger dash
        if (distance > 30 && duration < 200) {
          this.player.dash(dx / distance, dy / distance);
        }
      }

      // Clean up
      if (this.joystick.joystick) {
        this.joystick.removeJoystick.call(this.joystick);
      }
      this.swipeState.isTracking = false;
    });
  }

  setupTimers() {
    this.setupLineAttackTimer();
    this.setupEnemySpawnTimer();
  }

  setupLineAttackTimer() {
    this.lineAttackTimer = this.time.addEvent({
      delay: 500,
      callback: this.performLineAttack,
      callbackScope: this,
      loop: true,
    });
  }

  setupEnemySpawnTimer() {
    this.lastSpawnedType = EnemyFactory.ENEMY_TYPES.GREEN;
    this.enemySpawnTimer = this.time.addEvent({
      delay: 8000,
      callback: () => {
        this.lastSpawnedType = EnemyFactory.getNextEnemyType(this.lastSpawnedType);
        EnemyFactory.spawnEnemyAwayFromPlayer(this, this.lastSpawnedType);
      },
      loop: true,
    });
  }

  update() {
    this.updatePlayerMovement();
    this.updateEnemies();
    this.updateAttacks();
  }

  updatePlayerMovement() {
    this.joystick.updateJoystickVelocity();
    this.joystick.applyJoystickVelocity();
    this.player.update();
  }

  updateEnemies() {
    let closestEnemy = null;
    let minDistance = Infinity;
    
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.sprite?.active) {
        enemy.update();
        
        const distance = this.getDistanceToPlayer(enemy);
        if (distance < minDistance) {
          minDistance = distance;
          closestEnemy = enemy;
        }
      } else {
        this.enemies.splice(i, 1);
      }
    }

    this.enemies.forEach(enemy => {
      enemy.setTargetingVisible(enemy === closestEnemy);
    });
  }

  getDistanceToPlayer(enemy) {
    return Phaser.Math.Distance.Between(
      this.player.sprite.x,
      this.player.sprite.y,
      enemy.sprite.x,
      enemy.sprite.y
    );
  }

  updateAttacks() {
    if (this.attackManager) {
      this.attackManager.updateAttacks(0, 0);
    }
  }

  performLineAttack() {
    const targetEnemy = this.findTargetedEnemy();
    if (targetEnemy) {
      const targetPosition = targetEnemy.getPosition();
      this.attackManager.performLineAttack(targetPosition);
    }
  }

  findTargetedEnemy() {
    return this.enemies.find(enemy => 
      enemy.isVisible() && enemy.targetingOutline.visible
    );
  }

  resetGame() {
    this.cleanupTimers();
    this.cleanupInput();
    this.cleanupGameObjects();
    this.scene.restart();
  }

  cleanupTimers() {
    if (this.lineAttackTimer) this.lineAttackTimer.remove();
    if (this.enemySpawnTimer) this.enemySpawnTimer.remove();
  }

  cleanupInput() {
    if (this.joystick) {
      this.input.off("pointerdown", this.joystick.createJoystick, this.joystick);
      this.input.off("pointermove", this.joystick.moveJoystick, this.joystick);
      this.input.off("pointerup", this.joystick.removeJoystick, this.joystick);
      this.joystick.removeJoystick();
    }
  }

  cleanupGameObjects() {
    if (this.attackManager) this.attackManager.destroy();
    this.enemies.forEach(enemy => enemy?.destroy?.());
    this.enemies = [];
    this.enemyCollisionGroup.clear(true, true);
  }

  createBackground() {
    const width = 1000;
    const height = 1000;
    const cellSize = 50;
    
    const gridTexture = this.add.renderTexture(0, 0, width, height);
    gridTexture.setOrigin(0, 0);
    gridTexture.setScrollFactor(1);
    
    const tempGrid = this.add.graphics();
    tempGrid.lineStyle(1, 0x3573C0, 1);

    for (let x = 0; x <= width; x += cellSize) {
      tempGrid.moveTo(x, 0);
      tempGrid.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += cellSize) {
      tempGrid.moveTo(0, y);
      tempGrid.lineTo(width, y);
    }
    tempGrid.strokePath();

    gridTexture.draw(tempGrid);
    tempGrid.destroy();
    
    gridTexture.setDepth(0);
    this.grid = gridTexture;
  }

  createBoundaryWalls() {
    const wallThickness = 50;
    const worldWidth = 1000;
    const worldHeight = 1000;

    this.walls = this.physics.add.staticGroup();

    const walls = [
      this.add.rectangle(worldWidth/2, -wallThickness/2, worldWidth + wallThickness*2, wallThickness, 0x808080),
      this.add.rectangle(worldWidth/2, worldHeight + wallThickness/2, worldWidth + wallThickness*2, wallThickness, 0x808080),
      this.add.rectangle(-wallThickness/2, worldHeight/2, wallThickness, worldHeight + wallThickness*2, 0x808080),
      this.add.rectangle(worldWidth + wallThickness/2, worldHeight/2, wallThickness, worldHeight + wallThickness*2, 0x808080)
    ];

    walls.forEach(wall => {
      this.walls.add(wall);
      wall.setDepth(1);
    });
  }

  createObstacles() {
    this.obstacles = this.physics.add.staticGroup();

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
