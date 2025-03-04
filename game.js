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
  const orbitRadius = 150;
  let obstacles = [];
  let obstacleTimer;
  let score = 0;
  let scoreText;
  let gameOver = false;
  let powerUps = [];
  let powerUpTimer;
  let powerUpActive = false;
  let powerUpDuration = 5000; // 5 seconds
  
  function preload() {
    // (Optional) Load images/sounds here.
  }
  
  function create() {
    centerX = config.width / 2;
    centerY = config.height / 2;
    
    // Create a central planet
    this.add.circle(centerX, centerY, 30, 0x8888ff);
    
    // Create the player as a small circle positioned on the orbit
    player = this.add.circle(0, 0, 10, 0xffcc00);
    this.physics.add.existing(player);
    player.body.setCircle(10);
    updatePlayerPosition();
    
    // Set up touch input: tap left/right to adjust rotation
    this.input.on('pointerdown', (pointer) => {
      if (gameOver) return;
      if (pointer.x < config.width / 2) {
        // Tapping left: nudge counterclockwise (decrease angle)
        angularVelocity -= 0.002;
      } else {
        // Tapping right: nudge clockwise (increase angle)
        angularVelocity += 0.002;
      }
    });
    
    // Spawn obstacles periodically
    obstacleTimer = this.time.addEvent({
      delay: 1000, // every second (adjust for difficulty)
      callback: spawnObstacle,
      callbackScope: this,
      loop: true
    });
    
    // Spawn power-ups periodically
    powerUpTimer = this.time.addEvent({
      delay: 10000, // every 10 seconds
      callback: spawnPowerUp,
      callbackScope: this,
      loop: true
    });
    
    // Score display
    scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '20px', fill: '#fff' });
  }
  
  function update(time, delta) {
    if (gameOver) return;
    
    // Update the player's angle and position
    playerAngle += angularVelocity * delta;
    playerAngle = Phaser.Math.Angle.Wrap(playerAngle);
    updatePlayerPosition();
    
    // Update each obstacle
    obstacles.forEach((obs, index) => {
      // Move the obstacle outward (r increases over time)
      obs.r += obs.speed * delta / 1000; // speed is in pixels/second
      obs.sprite.x = centerX + obs.r * Math.cos(obs.angle);
      obs.sprite.y = centerY + obs.r * Math.sin(obs.angle);
      
      // When the obstacle is near the orbit, check for collision.
      if (!obs.hit && obs.r >= orbitRadius - 10 && obs.r <= orbitRadius + 10) {
        let diff = Phaser.Math.Angle.Wrap(playerAngle - obs.angle);
        // Use a 15° threshold (converted to radians) for a collision zone.
        if (Math.abs(diff) < Phaser.Math.DegToRad(15)) {
          gameOver = true;
          scoreText.setText('Game Over! Score: ' + score);
          obstacleTimer.remove(false);
        }
      }
      
      // Remove obstacles that have moved beyond the screen and count them as dodged.
      if (obs.r > Math.max(config.width, config.height)) {
        obs.sprite.destroy();
        obstacles.splice(index, 1);
        score += 1;
        scoreText.setText('Score: ' + score);
      }
    });
    
    // Update each power-up
    powerUps.forEach((powerUp, index) => {
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
        this.time.delayedCall(powerUpDuration, () => {
          powerUpActive = false;
        }, [], this);
      });

      // Remove power-ups that have moved beyond the screen
      if (powerUp.r > Math.max(config.width, config.height)) {
        powerUp.sprite.destroy();
        powerUps.splice(index, 1);
      }
    });
    
    // Optionally, you can increase difficulty by ramping up obstacle speed gradually.
    obstacles.forEach(obs => {
      obs.speed += 0.01 * delta / 1000; // slight acceleration over time
    });
  }
  
  function updatePlayerPosition() {
    player.x = centerX + orbitRadius * Math.cos(playerAngle);
    player.y = centerY + orbitRadius * Math.sin(playerAngle);
  }
  
  function spawnObstacle() {
    if (gameOver) return;
    // Choose a random angle for the obstacle
    let angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    // Set an initial speed (pixels/second)
    let speed = Phaser.Math.FloatBetween(50, 100);
    let obstacle = {
      angle: angle,
      r: 0, // start at the center
      speed: speed,
      hit: false,
      sprite: null
    };
    // Create a red circle to represent the obstacle
    obstacle.sprite = game.scene.scenes[0].add.circle(centerX, centerY, 8, 0xff0000);
    obstacles.push(obstacle);
  }
  
  function spawnPowerUp() {
    if (gameOver || powerUpActive) return;
    // Choose a random angle for the power-up
    let angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    let speed = Phaser.Math.FloatBetween(30, 60); // Set a speed for the power-up
    let powerUp = {
      angle: angle,
      r: 0, // start at the center
      speed: speed,
      sprite: this.add.circle(centerX, centerY, 10, 0x00ff00)
    };
    this.physics.add.existing(powerUp.sprite);
    powerUp.sprite.body.setCircle(10);
    powerUps.push(powerUp);
  }
  