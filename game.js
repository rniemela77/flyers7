/*
Phaser.js game

Game mechanics:

- the enemy (a red triangle) spawns at the top half of the screen.
- the targeting reticle (a white crosshair) spawns on the enemy
- (bottom right quadrant) on pointerdown, create a virtual joystick at the pointer position.
- (bottom right quadrant) while pointerdown, on pointermove, the targeting reticle moves in the direction of the drag from the pointer down position. (almost like panning the reticle)
- the targeting reticle moves at 2x the distance of the drag.
- (bottom left quadrant) if the player taps pointerdown, shoot a bullet, which spawns at the bottom center and travels in the direction of the targeting reticle.
- bullets travel at 400 units per second. three bullets are fired at a time, one after another.
- (bottom left quadrant) if the player holds pointerdown, the player will "charge" up a bullet, which will then be fired when the player lets go of pointerdown.
- "charged" bullets are much larger and travel much faster than normal bullets.
- "charged" bullets do 30 damage.
- normal bullets do 10 damage.
*/

const config = {
    // 2340 x 1080
    type: Phaser.AUTO,
    width: 400, // 2340 / 2 = 1170
    height: 800, // 1080 / 2 = 540
    // make the game fullscreen
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    input: {
        activePointers: 3  // Enable tracking of 3 pointers (including mouse)
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let enemy;
let reticle;
let joystickPoint;
let bullets;
let isPointerDown = false;
let isJoystickActive = false;
let lastPointerPosition = { x: 0, y: 0 };
let healthBar;
let enemyHealth = 100;
let isEnemyMoving = false;
let activePointers = {};
let activeShootingPointer = null;
let player;
const FIRE_RATE = 5;
const FIRE_INTERVAL = 1000 / FIRE_RATE; // Convert to milliseconds between shots
let lastFireTime = 0;
const DODGE_SPEED = 1000; // Increased from 600 to 1000 for more noticeable movement
const DODGE_DURATION = 200; // Duration of dodge in ms
const DODGE_COOLDOWN = 500; // Cooldown between dodges in ms
const MIN_SWIPE_VELOCITY = 0.5; // Velocity threshold
const MIN_SWIPE_DISTANCE = 10; // Reduced from 20 to make it easier to trigger
let lastDodgeTime = 0;
let isDodging = false;
let dodgeTrail; // Graphics object for dodge trail effect
let moveIndicator; // Graphics object for movement indicator
const MOVE_SPEED = 400; // Normal movement speed
const MAX_VELOCITY = 300; // Reduced max speed
const VELOCITY_CHANGE_RATE = 200; // Reduced for more gradual acceleration
const FRICTION = 0.98; // Increased from 0.95 for slower deceleration
let playerVelocityX = 0;
let movingLine;
let lineY = 0;
let lineProgress = 0; // Add this to track overall progress of the line
let lastEnemyFireTime = 0; // Add this with other variables at the top
const ENEMY_FIRE_INTERVAL = 1000; // 1 second between shots

function preload() {
    // Remove the bullet image preload since we'll create it with graphics
}

function create() {
    // Create health bar
    healthBar = {
        width: 200,
        height: 20,
        x: config.width / 2,
        y: 30,
        background: this.add.graphics(),
        bar: this.add.graphics()
    };

    // Draw health bar background (gray)
    healthBar.background.fillStyle(0x333333);
    healthBar.background.fillRect(
        healthBar.x - healthBar.width / 2,
        healthBar.y - healthBar.height / 2,
        healthBar.width,
        healthBar.height
    );

    // Draw health bar (red)
    updateHealthBar.call(this);

    // Create bullet texture
    const bulletGraphics = this.add.graphics();
    bulletGraphics.fillStyle(0xffffff, 1);
    bulletGraphics.beginPath();
    bulletGraphics.arc(4, 4, 4, 0, Math.PI * 2);
    bulletGraphics.closePath();
    bulletGraphics.fill();
    bulletGraphics.generateTexture('bullet_quick', 8, 8);
    bulletGraphics.destroy();

    // Create dodge trail and move indicator graphics
    dodgeTrail = this.add.graphics();
    moveIndicator = this.add.graphics();

    // Create enemy (red triangle)
    createEnemy.call(this);

    // Create targeting reticle
    const reticleGraphics = this.add.graphics();
    reticleGraphics.lineStyle(2, 0xFFFFFF);
    // Draw a simple crosshair in a 50x50 texture
    reticleGraphics.strokeCircle(25, 25, 15);
    reticleGraphics.moveTo(5, 25);
    reticleGraphics.lineTo(45, 25);
    reticleGraphics.moveTo(25, 5);
    reticleGraphics.lineTo(25, 45);

    const reticleTexture = reticleGraphics.generateTexture('reticle', 50, 50);
    reticleGraphics.destroy();

    // Create reticle at enemy position
    reticle = this.add.sprite(enemy.x, enemy.y, 'reticle');

    // Create bullet group
    bullets = this.physics.add.group();

    // Create moving line
    movingLine = this.add.graphics();
    movingLine.lineStyle(2, 0x00ff00, 0.5); // Green line with 0.5 opacity
    updateMovingLine.call(this);

    // Create player character (blue circle)
    const playerGraphics = this.add.graphics();
    playerGraphics.lineStyle(3, 0x3498db); // Thicker outline
    playerGraphics.fillStyle(0x3498db, 1); // Full opacity
    playerGraphics.beginPath();
    playerGraphics.arc(25, 25, 20, 0, Math.PI * 2); // Larger circle, centered in 50x50 texture
    playerGraphics.closePath();
    playerGraphics.fill();
    playerGraphics.stroke();

    const playerTexture = playerGraphics.generateTexture('player', 50, 50); // Larger texture
    playerGraphics.destroy();

    // Create player at center of screen
    player = this.physics.add.sprite(config.width / 2, config.height / 2, 'player');
    player.setCollideWorldBounds(true);
    player.setDepth(10);
    
    // Configure player physics
    player.body.allowGravity = false;
    player.body.moves = true;
    player.body.immovable = false;
    player.body.setSize(40, 40); // Set collision box size
    
    // Fix Y position
    player.body.setAllowGravity(false);
    player.body.setImmovable(true);

    // Modify input handlers
    this.input.on('pointerdown', (pointer) => {
        // Only handle pointers in bottom half of screen
        if (pointer.y <= config.height / 2) return;

        // Store this pointer's state
        activePointers[pointer.id] = {
            position: { x: pointer.x, y: pointer.y },
            quadrant: getQuadrant(pointer.x, pointer.y),
            lastPosition: { x: pointer.x, y: pointer.y, time: this.time.now }
        };

        activePointers[pointer.id].isMovementJoystick = pointer.x <= config.width / 2;
    });

    this.input.on('pointermove', (pointer) => {
        if (!activePointers[pointer.id]) return;

        const pointerState = activePointers[pointer.id];
        
        if (pointerState.isMovementJoystick) {
            // Calculate X movement based on drag distance from last position
            const dx = pointer.x - pointerState.lastPosition.x;
            const timeDelta = (this.time.now - pointerState.lastPosition.time) / 1000;
            
            // Add to velocity based on drag direction and amount
            if (Math.abs(dx) > 0) {
                // More gradual acceleration
                const acceleration = dx * VELOCITY_CHANGE_RATE * timeDelta;
                playerVelocityX += acceleration;
                
                // Clamp velocity to maximum speed
                playerVelocityX = Phaser.Math.Clamp(playerVelocityX, -MAX_VELOCITY, MAX_VELOCITY);
                // Set the physics velocity directly
                player.body.setVelocityX(playerVelocityX);
                player.body.setVelocityY(0); // Keep Y velocity at 0
            }
        } else {
            // Move reticle with right joystick (existing code)
            reticle.x += (pointer.x - pointerState.lastPosition.x) * 2;
            reticle.y += (pointer.y - pointerState.lastPosition.y) * 2;
            reticle.x = Phaser.Math.Clamp(reticle.x, 0, config.width);
            reticle.y = Phaser.Math.Clamp(reticle.y, 0, config.height);
        }
        
        pointerState.lastPosition = { 
            x: pointer.x, 
            y: pointer.y,
            time: this.time.now 
        };
    });

    this.input.on('pointerup', (pointer) => {
        if (!activePointers[pointer.id]) return;
        delete activePointers[pointer.id];
    });
}

function createEnemy() {
    const enemyGraphics = this.add.graphics();
    enemyGraphics.lineStyle(2, 0xFF0000);
    enemyGraphics.fillStyle(0xFF0000);
    enemyGraphics.beginPath();
    // Draw a simple triangle in the middle of a 40x40 texture
    enemyGraphics.moveTo(20, 5);   // Top
    enemyGraphics.lineTo(35, 35);  // Bottom right
    enemyGraphics.lineTo(5, 35);   // Bottom left
    enemyGraphics.closePath();
    enemyGraphics.fill();
    enemyGraphics.stroke();

    const texture = enemyGraphics.generateTexture('enemy', 40, 40);
    enemyGraphics.destroy();

    // Spawn enemy in top half of screen
    if (enemy) enemy.destroy(); // Clean up old enemy if it exists
    
    enemy = this.physics.add.sprite(
        Phaser.Math.Between(50, config.width - 50),
        Phaser.Math.Between(50, config.height / 2 - 50),
        'enemy'
    );
    enemyHealth = 100; // Reset enemy health
    updateHealthBar.call(this);

    // Start enemy movement
    moveEnemyToNewPosition.call(this);
}

function updateHealthBar() {
    healthBar.bar.clear();
    healthBar.bar.fillStyle(0xFF0000);
    const width = (enemyHealth / 100) * healthBar.width;
    healthBar.bar.fillRect(
        healthBar.x - healthBar.width / 2,
        healthBar.y - healthBar.height / 2,
        width,
        healthBar.height
    );
}

function createBulletTextures() {
    // Create quick shot bullet texture
    const quickBulletGraphics = this.add.graphics();
    quickBulletGraphics.fillStyle(0xffffff, 1);
    quickBulletGraphics.beginPath();
    quickBulletGraphics.arc(4, 4, 4, 0, Math.PI * 2);
    quickBulletGraphics.closePath();
    quickBulletGraphics.fill();
    quickBulletGraphics.generateTexture('bullet_quick', 8, 8);
    quickBulletGraphics.destroy();

    // Create charged bullet textures for each level
    const chargedBulletProps = [
        { key: 'bullet_charged_1', size: 12, color: 0x3498db },  // Blue, small
        { key: 'bullet_charged_2', size: 20, color: 0x9b59b6 },  // Purple, medium
        { key: 'bullet_charged_3', size: 32, color: 0x00ffff }   // Cyan, large
    ];

    chargedBulletProps.forEach(props => {
        const graphics = this.add.graphics();
        graphics.fillStyle(props.color, 1);
        graphics.beginPath();
        graphics.arc(props.size/2, props.size/2, props.size/2, 0, Math.PI * 2);
        graphics.closePath();
        graphics.fill();
        graphics.generateTexture(props.key, props.size, props.size);
        graphics.destroy();
    });
}

function fireBullet() {
    // Create and fire the bullet using pre-generated texture
    const bullet = bullets.create(player.x, player.y, 'bullet_quick');
    
    const angle = Phaser.Math.Angle.Between(
        bullet.x, bullet.y,
        reticle.x, reticle.y
    );
    
    const speed = 800;
    this.physics.velocityFromRotation(angle, speed, bullet.body.velocity);
    bullet.rotation = angle;
    
    // Add collision with enemy
    this.physics.add.overlap(bullet, enemy, (bullet, enemy) => {
        bullet.destroy();
        enemyHealth = Math.max(0, enemyHealth - 15);
        updateHealthBar.call(this);
        if (enemyHealth <= 0) {
            createEnemy.call(this);
        }
    });
    
    // Cleanup after 2 seconds
    this.time.delayedCall(2000, () => {
        if (bullet.active) {
            bullet.destroy();
        }
    });
}

function moveEnemyToNewPosition() {
    if (isEnemyMoving) return;

    // Calculate new random position in top half, keeping away from edges
    const margin = 50;
    const newX = Phaser.Math.Between(margin, config.width - margin);
    const newY = Phaser.Math.Between(margin, (config.height / 2) - margin);
    
    isEnemyMoving = true;

    // Move enemy to new position
    this.tweens.add({
        targets: enemy,
        x: newX,
        y: newY,
        duration: 1500,  // 1.5 seconds for movement
        ease: 'Power2',
        onComplete: () => {
            isEnemyMoving = false;
            // Wait 1-2 seconds before moving again
            this.time.delayedCall(Phaser.Math.Between(1000, 2000), () => {
                moveEnemyToNewPosition.call(this);
            });
        }
    });
}

function update() {
    // Keep player at a lower position (3/4 down the screen)
    player.y = config.height * 0.75;
    
    // Apply friction to physics velocity
    if (Math.abs(player.body.velocity.x) > 0) {
        playerVelocityX = player.body.velocity.x * FRICTION;
        player.body.setVelocityX(playerVelocityX);
        
        // Stop completely if velocity is very small
        if (Math.abs(playerVelocityX) < 0.1) {
            playerVelocityX = 0;
            player.body.setVelocityX(0);
        }
    }

    // Clean up bullets that are out of bounds
    bullets.getChildren().forEach((bullet) => {
        if (bullet.x < 0 || bullet.x > config.width || 
            bullet.y < 0 || bullet.y > config.height) {
            bullet.destroy();
        }
    });

    // Auto-shoot towards reticle
    if (this.time.now - lastFireTime >= FIRE_INTERVAL) {
        fireBullet.call(this);
        lastFireTime = this.time.now;
    }

    // Enemy shoots at player
    if (this.time.now - lastEnemyFireTime >= ENEMY_FIRE_INTERVAL) {
        fireEnemyBullet.call(this);
        lastEnemyFireTime = this.time.now;
    }

    // Update moving line position
    updateMovingLine.call(this);
}

function updateMovingLine() {
    // Clear previous line
    movingLine.clear();
    
    // Draw new line
    movingLine.lineStyle(2, 0x00ff00, 0.5);
    movingLine.beginPath();
    movingLine.moveTo(0, lineY);
    movingLine.lineTo(config.width, lineY);
    movingLine.strokePath();
    
    // Update line position (move down)
    lineY += (config.height / 3.0) * (1/60); // Move the full height in 3.0 seconds
    
    // Reset line position when it reaches bottom
    if (lineY > config.height) {
        lineY = 0;
    }
}

// Helper function to determine pointer quadrant
function getQuadrant(x, y) {
    if (x <= config.width / 2) {
        return y > config.height / 2 ? 'bottomLeft' : 'topLeft';
    } else {
        return y > config.height / 2 ? 'bottomRight' : 'topRight';
    }
}

function updateMoveIndicator(pointer) {
    const pointerState = activePointers[pointer.id];
    if (!pointerState) return;

    const dx = pointer.x - pointerState.startPosition.x;
    const dy = pointer.y - pointerState.startPosition.y;
    const magnitude = Math.sqrt(dx * dx + dy * dy);
    
    if (magnitude > 0) {
        const normalizedDx = dx / magnitude;
        const normalizedDy = dy / magnitude;
        
        // Calculate end point
        const targetX = player.x + normalizedDx * MOVE_SPEED * (DODGE_DURATION / 1000);
        const targetY = player.y + normalizedDy * MOVE_SPEED * (DODGE_DURATION / 1000);
        
        // Draw movement indicator
        moveIndicator.clear();
        moveIndicator.lineStyle(3, 0x3498db, 0.8);
        moveIndicator.beginPath();
        moveIndicator.moveTo(player.x, player.y);
        moveIndicator.lineTo(targetX, targetY);
        moveIndicator.strokePath();
    }
}

function fireEnemyBullet() {
    // Create enemy bullet (red bullet)
    const bullet = bullets.create(enemy.x, enemy.y, 'bullet_quick');
    bullet.setTint(0xff0000); // Make the bullet red
    bullet.setScale(2); // Make enemy bullets bigger
    
    const angle = Phaser.Math.Angle.Between(
        bullet.x, bullet.y,
        player.x, player.y
    );
    
    const speed = 300; // Slower than player bullets
    this.physics.velocityFromRotation(angle, speed, bullet.body.velocity);
    bullet.rotation = angle;
    
    // Add collision with player
    this.physics.add.overlap(bullet, player, (bullet, player) => {
        bullet.destroy();
        // Flash player red when hit
        player.setTint(0xff0000);
        this.time.delayedCall(100, () => {
            player.clearTint();
        });
    });
    
    // Cleanup after 2 seconds
    this.time.delayedCall(2000, () => {
        if (bullet.active) {
            bullet.destroy();
        }
    });
}

