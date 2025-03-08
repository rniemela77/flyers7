<<<<<<< Updated upstream
=======
/*
RTS Game
-
enemy
    - portrait (square for now) located at 30% from the top, centered
    - health bar (rectangle) below the portrait, aligned left, 100% width, 10px height
    - name (text) below the health bar, aligned left, 100% width
    - health percentage (text) below the name, aligned left, 100% width

Combat
    - ActionLine:1 line segment going from the enemy to the bottom center of the screen
    - HitZone: a circle (grey) (25px) on that line segment, at about 75% of the way from the enemy to the bottom center of the screen
    - ActionCircle: a circle (10px) spawns on the line, at the enemy, and moves downward via the line
    - when the circle reaches the bottom center of the screen, it disappears
    - an ActionCircle spawns every 0.5s

HitZone:
    - on "pointerup", check if any ActionCircle is in the HitZone
    - if so, destroy the ActionCircle
    - if not, do nothing

ActionCircle types:
    - Green: destroyed by tap (pointerup anywhere on screen while the circle is in the HitZone)
    - Blue: destroyed by swipe (pointerdown and pointerup anywhere with a distance > 20px, while the circle is in the HitZone)

*/

// Import Phaser


// Game configuration
>>>>>>> Stashed changes
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
<<<<<<< Updated upstream
    physics: {
      default: 'arcade',
      arcade: { debug: true }
    },
=======
>>>>>>> Stashed changes
    scene: {
      preload: preload,
      create: create,
      update: update
    }
  };
  
  const game = new Phaser.Game(config);
  
  let centerX, centerY;
  let player;
  let playerAngle = 0; // in radians
  let angularVelocity = 0.005; // base angular velocity
  let obstacles = [];
  let obstacleTimer;
  let score = 0;
  let scoreText;
  let gameOver = false;
  let powerUps = [];
  let powerUpTimer;
  let powerUpActive = false;
  let powerUpDuration = 5000; // 5 seconds
  let bullets = [];
  let bulletTimer;
  let currentAngle = 0; // Initial angle in degrees
  
  // Constants for game configuration
  const GAME_WIDTH = 360;
  const GAME_HEIGHT = 640;
  const BACKGROUND_COLOR = '#111';
  const ORBIT_RADIUS = 150;
  const PLAYER_RADIUS = 10;
  const OBSTACLE_RADIUS = 8;
  const POWER_UP_RADIUS = 10;
  const BULLET_RADIUS = 5;
  const BASE_ANGULAR_VELOCITY = 0.005;
  const POWER_UP_DURATION = 5000; // 5 seconds
  const OBSTACLE_SPAWN_DELAY = 1000; // 1 second
  const POWER_UP_SPAWN_DELAY = 10000; // 10 seconds
  const BULLET_SPAWN_DELAY = 500; // 0.5 seconds
  const BULLET_SPEED = 50;
  const OBSTACLE_SPEED_MIN = 50;
  const OBSTACLE_SPEED_MAX = 100;
  const POWER_UP_SPEED_MIN = 30;
  const POWER_UP_SPEED_MAX = 60;
  
  function preload() {
    // (Optional) Load images/sounds here.
  }
  
  function create() {
    centerX = GAME_WIDTH / 2;
    centerY = GAME_HEIGHT / 2;
    playerAngle = 0;
    angularVelocity = BASE_ANGULAR_VELOCITY;
    score = 0;
    gameOver = false;
    powerUpActive = false;
    currentAngle = 0;
    bullets = [];
    obstacles = [];
    powerUps = [];
    
    // Create a central planet
    this.add.circle(centerX, centerY, 30, 0x8888ff);
    
    // Create the player as a small circle positioned on the orbit
    player = this.add.circle(0, 0, PLAYER_RADIUS, 0xffcc00);
    this.physics.add.existing(player);
    player.body.setCircle(PLAYER_RADIUS);
    updatePlayerPosition();
    
    // Set up touch input: tap left/right to adjust rotation
    this.input.on('pointerdown', handlePointerDown);
    
    // Spawn obstacles periodically
    obstacleTimer = this.time.addEvent({
      delay: OBSTACLE_SPAWN_DELAY,
      callback: spawnObstacle,
      callbackScope: this,
      loop: true
    });
    
    // Spawn power-ups periodically
    powerUpTimer = this.time.addEvent({
      delay: POWER_UP_SPAWN_DELAY,
      callback: spawnPowerUp,
      callbackScope: this,
      loop: true
    });
    
    // Spawn bullets in a 2-winged spiral pattern periodically
    bulletTimer = this.time.addEvent({
      delay: BULLET_SPAWN_DELAY,
      callback: spawnBullets,
      callbackScope: this,
      loop: true
    });
    
    // Score display
    scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '20px', fill: '#fff' });
  }
  
  function handlePointerDown(pointer) {
    if (gameOver) return;
    if (pointer.x < GAME_WIDTH / 2) {
      // Tapping left: nudge counterclockwise (decrease angle)
      angularVelocity -= 0.002;
    } else {
      // Tapping right: nudge clockwise (increase angle)
      angularVelocity += 0.002;
    }
  }
  
  function update(time, delta) {
    if (gameOver) return;
    
    // Update the player's angle and position
    playerAngle += angularVelocity * delta;
    playerAngle = Phaser.Math.Angle.Wrap(playerAngle);
    updatePlayerPosition();
    
    // Update each obstacle
    obstacles.forEach(updateObstacle.bind(this, delta));
    
    // Update each power-up
    powerUps.forEach(updatePowerUp.bind(this, delta));
    
    // Optionally, you can increase difficulty by ramping up obstacle speed gradually.
    obstacles.forEach(obs => {
      obs.speed += 0.01 * delta / 1000; // slight acceleration over time
    });

<<<<<<< Updated upstream
const game = new Phaser.Game(config);

function preload() {
    // Load assets here (e.g., images, sprites)
    this.load.image('sky', 'path/to/your/sky.png');
=======
// Initialize the game
const game = new Phaser.Game(config);

// Define constants for game elements
const actionCircleColorBlue = 0x547FFF;
const actionCircleColorGreen = 0x4BC87F;
const actionCircleSize = 10;
const actionCircleSpeed = 2;
const hitZoneSize = 25;
const hitZoneColor = 0x808080;

// Preload assets
function preload() {
    // Load assets here if needed
>>>>>>> Stashed changes
}

function create() {
<<<<<<< Updated upstream
    // Add your game elements here
    this.add.image(400, 300, 'sky');
}

function update() {
    // Game loop logic (e.g., movement)
=======
    // Enemy portrait
    this.enemyPortrait = this.add.rectangle(400, 180, 100, 100, 0x6666ff);
    
    // Health bar
    this.healthBar = this.add.rectangle(0, 230, 800, 10, 0xff0000).setOrigin(0, 0);
    
    // Enemy name
    this.enemyName = this.add.text(0, 250, 'Enemy Name', { fontSize: '16px', fill: '#fff' }).setOrigin(0, 0);
    
    // Health percentage
    this.healthPercentage = this.add.text(0, 270, '100%', { fontSize: '16px', fill: '#fff' }).setOrigin(0, 0);

    // Action line
    this.actionLine = new Phaser.Geom.Line(400, 180, 400, 600);
    this.graphics = this.add.graphics({ lineStyle: { width: 2, color: 0xffffff } });
    this.graphics.strokeLineShape(this.actionLine);

    // Hit zone
    this.hitZone = this.add.circle(400, 480, hitZoneSize, hitZoneColor);

    // Action circles
    this.actionCircles = this.add.group();
    this.time.addEvent({ delay: 500, callback: spawnActionCircle, callbackScope: this, loop: true });

    // Drag line
    this.dragLine = this.add.graphics({ lineStyle: { width: 2, color: 0x00ff00 } });

    // Input handling
    this.input.on('pointerdown', handlePointerDown, this);
    this.input.on('pointerup', handlePointerUp, this);
    this.input.on('pointermove', handlePointerMove, this);
}

// Variables to track pointer movement
let startX, startY;

// Handle pointer down event
function handlePointerDown(pointer) {
    startX = pointer.x;
    startY = pointer.y;
}

// Handle pointer move event
function handlePointerMove(pointer) {
    if (pointer.isDown) {
        this.dragLine.clear();
        this.dragLine.lineStyle(2, 0x00ff00);
        this.dragLine.beginPath();
        this.dragLine.moveTo(startX, startY);
        this.dragLine.lineTo(pointer.x, pointer.y);
        this.dragLine.strokePath();
    }
}

// Handle pointer up event
function handlePointerUp(pointer) {
    const endX = pointer.x;
    const endY = pointer.y;
    const distance = Phaser.Math.Distance.Between(startX, startY, endX, endY);
    const isSwipe = distance > 20;

    this.actionCircles.children.iterate(function (circle) {
        if (circle && Phaser.Geom.Intersects.CircleToCircle(circle, this.hitZone)) {
            const shouldDestroy = (isSwipe && circle.fillColor === actionCircleColorBlue) || (!isSwipe && circle.fillColor === actionCircleColorGreen);
            if (shouldDestroy) {
                circle.destroy();
            }
        }
    }, this);
    this.dragLine.clear();
}

// Spawn an action circle
function spawnActionCircle() {
    const color = Math.random() > 0.5 ? actionCircleColorBlue : actionCircleColorGreen;
    const circle = this.add.circle(400, 180, actionCircleSize, color);
    this.actionCircles.add(circle);
}

// Update game state
function update() {
    Phaser.Actions.IncY(this.actionCircles.getChildren(), actionCircleSpeed);
    this.actionCircles.children.iterate(function (circle) {
        if (circle && circle.y >= 600) {
            circle.destroy();
        }
    });
>>>>>>> Stashed changes
}
