// Phaser 3 Game Code – Orbit Dash

const config = {
    type: Phaser.AUTO,
    width: 360,
    height: 640,
    backgroundColor: '#111',
    physics: {
      default: 'arcade',
      arcade: { debug: true }
    },
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

    // Update each bullet
    bullets.forEach(updateBullet.bind(this));

    // Check for collision between player and bullets
    bullets.forEach(checkBulletCollision.bind(this));
  }
  
  function updateObstacle(delta, obs, index) {
    // Move the obstacle outward (r increases over time)
    obs.r += obs.speed * delta / 1000; // speed is in pixels/second
    obs.sprite.x = centerX + obs.r * Math.cos(obs.angle);
    obs.sprite.y = centerY + obs.r * Math.sin(obs.angle);
    
    // When the obstacle is near the orbit, check for collision.
    if (!obs.hit && obs.r >= ORBIT_RADIUS - 10 && obs.r <= ORBIT_RADIUS + 10) {
      let diff = Phaser.Math.Angle.Wrap(playerAngle - obs.angle);
      // Use a 15° threshold (converted to radians) for a collision zone.
      if (Math.abs(diff) < Phaser.Math.DegToRad(15)) {
        gameOver = true;
        scoreText.setText('Game Over! Score: ' + score);
        obstacleTimer.remove(false);
      }
    }
    
    // Remove obstacles that have moved beyond the screen and count them as dodged.
    if (obs.r > Math.max(GAME_WIDTH, GAME_HEIGHT)) {
      obs.sprite.destroy();
      obstacles.splice(index, 1);
      score += 1;
      scoreText.setText('Score: ' + score);
    }
  }
  
  function updatePowerUp(delta, powerUp, index) {
    // Move the power-up outward
    powerUp.r += powerUp.speed * delta / 1000;
    powerUp.sprite.x = centerX + powerUp.r * Math.cos(powerUp.angle);
    powerUp.sprite.y = centerY + powerUp.r * Math.sin(powerUp.angle);

    // Check for collision with player using physics
    this.physics.add.overlap(player, powerUp.sprite, () => {
      console.log('Collision detected with power-up!'); // Debugging output
      powerUpActive = true;
      powerUp.sprite.destroy();
      powerUps.splice(index, 1);

      // Double the player's score
      score *= 2;
      scoreText.setText('Score: ' + score);

      // Set a timer to deactivate the power-up effect
      this.time.delayedCall(POWER_UP_DURATION, () => {
        powerUpActive = false;
      }, [], this);
    });

    // Remove power-ups that have moved beyond the screen
    if (powerUp.r > Math.max(GAME_WIDTH, GAME_HEIGHT)) {
      powerUp.sprite.destroy();
      powerUps.splice(index, 1);
    }
  }
  
  function updateBullet(bullet, index) {
    // Remove bullets that have moved beyond the screen
    if (bullet.x < 0 || bullet.x > GAME_WIDTH || bullet.y < 0 || bullet.y > GAME_HEIGHT) {
      bullet.destroy();
      bullets.splice(index, 1);
    }
  }
  
  function checkBulletCollision(bullet) {
    this.physics.add.overlap(player, bullet, () => {
      gameOver = true;
      scoreText.setText('Game Over! Score: ' + score);
      obstacleTimer.remove(false);
      powerUpTimer.remove(false);
      bulletTimer.remove(false);
    });
  }
  
  function updatePlayerPosition() {
    player.x = centerX + ORBIT_RADIUS * Math.cos(playerAngle);
    player.y = centerY + ORBIT_RADIUS * Math.sin(playerAngle);
  }
  
  function spawnObstacle() {
    if (gameOver) return;
    // Choose a random angle for the obstacle
    let angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    // Set an initial speed (pixels/second)
    let speed = Phaser.Math.FloatBetween(OBSTACLE_SPEED_MIN, OBSTACLE_SPEED_MAX);
    let obstacle = {
      angle: angle,
      r: 0, // start at the center
      speed: speed,
      hit: false,
      sprite: null
    };
    // Create a red circle to represent the obstacle
    obstacle.sprite = game.scene.scenes[0].add.circle(centerX, centerY, OBSTACLE_RADIUS, 0xff0000);
    obstacles.push(obstacle);
  }
  
  function spawnPowerUp() {
    if (gameOver || powerUpActive) return;
    // Choose a random angle for the power-up
    let angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    let speed = Phaser.Math.FloatBetween(POWER_UP_SPEED_MIN, POWER_UP_SPEED_MAX); // Set a speed for the power-up
    let powerUp = {
      angle: angle,
      r: 0, // start at the center
      speed: speed,
      sprite: this.add.circle(centerX, centerY, POWER_UP_RADIUS, 0x00ff00)
    };
    this.physics.add.existing(powerUp.sprite);
    powerUp.sprite.body.setCircle(POWER_UP_RADIUS);
    powerUps.push(powerUp);
  }
  
  function spawnBullets() {
    const angle1 = Phaser.Math.DegToRad(currentAngle);
    const angle2 = Phaser.Math.DegToRad(currentAngle + 180); // Opposite direction

    const bullet1 = createBullet.call(this, angle1);
    bullets.push(bullet1);

    const bullet2 = createBullet.call(this, angle2);
    bullets.push(bullet2);

    // Rotate the angle by 1 degree for the next pair
    currentAngle = (currentAngle + 5) % 360;
  }
  
  function createBullet(angle) {
    const bullet = this.add.circle(centerX, centerY, BULLET_RADIUS, 0xff0000);
    this.physics.add.existing(bullet);
    bullet.body.setVelocity(BULLET_SPEED * Math.cos(angle), BULLET_SPEED * Math.sin(angle));
    return bullet;
  }
  