import Phaser from "phaser";
import { CONSTANTS } from "../constants";
import Joystick from "../joystick";
import Enemy from "../characters/Enemy";
import Attack from "../attack";
import Player from "../player";
import playerSprite from '../trnasp.png';
import enemySprite from '../enemy.png';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
    this.player = null;
    this.joystick = null;
    this.enemies = [];
    this.attack = null;
    this.grid = null;
    this.obstacles = null;
    this.targetedEnemy = null;
    
    // Swipe state
    this.swipeState = {
      startX: 0,
      startY: 0,
      startTime: 0,
      isTracking: false
    };
  }

  preload() {
    // Load player sprite using the imported asset
    this.load.image('player', playerSprite);
    // Load enemy sprite
    this.load.image('enemy', enemySprite);
  }

  create() {
    // Set world bounds
    this.physics.world.setBounds(0, 0, 1000, 1000);
    
    // Create collision groups
    this.enemyCollisionGroup = this.physics.add.group();

    this.createBackground();
    this.createBoundaryWalls();
    this.createObstacles();
    this.createPlayer();
    
    // Spawn one of each enemy type initially
    this.createEnemy('purple');
    this.createEnemy('green');
    
    this.joystick = new Joystick(this, this.player);
    this.attack = new Attack(this);
    this.setupInputHandlers();
    this.setupTimers();

    // Set up camera to follow player with offset
    const cameraOffsetY = -window.innerHeight * 0.14; // Position player at 1/4 from top
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
    this.cameras.main.setFollowOffset(0, cameraOffsetY);
    this.cameras.main.setZoom(CONSTANTS.cameraZoom);

    // Set up collision groups once
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
    this.lineAttackTimer = this.time.addEvent({
      delay: 500,
      callback: this.performLineAttack,
      callbackScope: this,
      loop: true,
    });

    // Spawn enemies alternating between types
    this.lastSpawnedType = 'green';
    this.enemySpawnTimer = this.time.addEvent({
      delay: 8000,
      callback: () => {
        this.lastSpawnedType = this.lastSpawnedType === 'purple' ? 'green' : 'purple';
        this.createEnemy(this.lastSpawnedType);
      },
      loop: true,
    });
  }

  update() {
    this.joystick.updateJoystickVelocity();
    this.joystick.applyJoystickVelocity();
    this.player.update();

    // Update active enemies and find closest for targeting
    let closestEnemy = null;
    let minDistance = Infinity;
    
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.sprite?.active) {
        enemy.update();
        
        // Find closest enemy for targeting
        const distance = Phaser.Math.Distance.Between(
          this.player.sprite.x,
          this.player.sprite.y,
          enemy.sprite.x,
          enemy.sprite.y
        );
        if (distance < minDistance) {
          minDistance = distance;
          closestEnemy = enemy;
        }
      } else {
        this.enemies.splice(i, 1);
      }
    }

    // Update targeting
    this.enemies.forEach(enemy => {
      enemy.setTargetingVisible(enemy === closestEnemy);
    });

    // Update attack positions
    if (this.attack) {
      this.attack.updateAttacks(0, 0);
    }
  }

  createPlayer() {
    const x = 500;
    const y = 500;
    this.player = new Player(this, x, y);
    this.physics.add.collider(this.player.sprite, this.obstacles);
    this.physics.add.collider(this.player.sprite, this.walls);
  }

  createEnemy(enemyType) {
    // Get player position
    const playerPos = this.player.getPosition();
    
    // Generate a position at least 400 pixels away from the player
    let x, y, distance;
    do {
      x = Phaser.Math.Between(100, 900);
      y = Phaser.Math.Between(100, 900);
      distance = Phaser.Math.Distance.Between(x, y, playerPos.x, playerPos.y);
    } while (distance < 400);
    
    const enemy = new Enemy(this, x, y, enemyType);
    this.enemies.push(enemy);
    this.enemyCollisionGroup.add(enemy.sprite);
  }

  performLineAttack() {
    // Find closest enemy that is being targeted
    let targetEnemy = null;
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      if (enemy.isVisible() && enemy.targetingOutline.visible) {
        targetEnemy = enemy;
        break;
      }
    }

    if (targetEnemy) {
      const startPosition = this.player.getPosition();
      const targetPosition = targetEnemy.getPosition();
      this.attack.lineAttack(startPosition, targetPosition);
    }
  }

  resetGame() {
    if (this.lineAttackTimer) this.lineAttackTimer.remove();
    if (this.enemySpawnTimer) this.enemySpawnTimer.remove();

    if (this.joystick) {
      this.input.off("pointerdown", this.joystick.createJoystick, this.joystick);
      this.input.off("pointermove", this.joystick.moveJoystick, this.joystick);
      this.input.off("pointerup", this.joystick.removeJoystick, this.joystick);
      this.joystick.removeJoystick();
    }

    if (this.attack) this.attack.destroy();

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy?.destroy) {
        enemy.destroy();
      }
    }
    this.enemies = [];
    this.enemyCollisionGroup.clear(true, true);

    this.scene.restart();
  }

  createBackground() {
    // Create a single texture for the grid instead of drawing lines every frame
    const width = 1000;
    const height = 1000;
    const cellSize = 50;
    
    // Create the render texture at world origin (0,0)
    const gridTexture = this.add.renderTexture(0, 0, width, height);
    gridTexture.setOrigin(0, 0); // Important: set origin to top-left
    gridTexture.setScrollFactor(1); // Make it scroll with the camera
    
    // Create a temporary graphics object to draw the grid
    const tempGrid = this.add.graphics();
    tempGrid.lineStyle(1, 0x3573C0, 1);

    // Draw the grid pattern
    for (let x = 0; x <= width; x += cellSize) {
      tempGrid.moveTo(x, 0);
      tempGrid.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += cellSize) {
      tempGrid.moveTo(0, y);
      tempGrid.lineTo(width, y);
    }
    tempGrid.strokePath();

    // Draw the graphics to the texture
    gridTexture.draw(tempGrid);
    
    // Destroy the temporary graphics object
    tempGrid.destroy();
    
    // Set the grid texture depth
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

  // Add helper function to create damage numbers
  createDamageNumber(x, y, damage, entity) {
    // Create the text
    const text = this.add.text(
      x - CONSTANTS.healthBarWidth/2, // Align with left side of health bar
      y - CONSTANTS.healthBarOffset + 5, // Position slightly below health bar
      `-${damage}`, 
      {
        fontSize: '12px',
        color: '#ff0000'
      }
    );
    text.setDepth(100); // Make sure it's above everything
    text.setOrigin(0, 0.5); // Left-align the text (0 for x origin)

    // Store initial offset from entity
    const offsetX = text.x - entity.sprite.x;
    const offsetY = text.y - entity.sprite.y;

    // Create the tween for floating up and fading
    this.tweens.add({
      targets: text,
      alpha: 0,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        text.destroy(); // Clean up when done
      }
    });

    // Add update callback to follow entity
    const updateCallback = () => {
      if (text.active && entity.sprite?.active) {
        text.x = entity.sprite.x + offsetX;
        text.y = entity.sprite.y + offsetY - 2; // Small float up
      } else {
        this.events.off('update', updateCallback);
      }
    };
    this.events.on('update', updateCallback);
  }
}
