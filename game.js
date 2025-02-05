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
let isJoystickActive = false;  // New variable to track joystick state
let lastPointerPosition = { x: 0, y: 0 };
let healthBar;
let enemyHealth = 100;
let isEnemyMoving = false;
let isCharging = false;
let chargeStartTime = 0;
let chargeThreshold = 650; // Increased from 500ms to 650ms
let activePointers = {};  // Track multiple active pointers
let chargeIndicator; // New: Graphics object for charge indicator

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

    // Create enemy (red triangle)
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
    enemy = this.physics.add.sprite(
        Phaser.Math.Between(50, config.width - 50),
        Phaser.Math.Between(50, config.height / 2 - 50),
        'enemy'
    );

    // Start enemy movement
    moveEnemyToNewPosition.call(this);

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

    // Create bullet texture using graphics
    const bulletGraphics = this.add.graphics();
    bulletGraphics.fillStyle(0xFFFFFF);  // White fill
    bulletGraphics.beginPath();
    bulletGraphics.arc(4, 4, 4, 0, Math.PI * 2);  // Draw circle at (4,4) with radius 4
    bulletGraphics.closePath();
    bulletGraphics.fill();
    
    const bulletTexture = bulletGraphics.generateTexture('bullet', 8, 8);
    bulletGraphics.destroy();

    // Create charged bullet texture using graphics
    const chargedBulletGraphics = this.add.graphics();
    chargedBulletGraphics.fillStyle(0xFFFF00);  // Yellow fill for charged bullets
    chargedBulletGraphics.beginPath();
    chargedBulletGraphics.arc(8, 8, 8, 0, Math.PI * 2);  // Larger circle at (8,8) with radius 8
    chargedBulletGraphics.closePath();
    chargedBulletGraphics.fill();
    
    const chargedBulletTexture = chargedBulletGraphics.generateTexture('chargedBullet', 16, 16);
    chargedBulletGraphics.destroy();

    // Create bullet group
    bullets = this.physics.add.group();

    // Create charge indicator (initially invisible)
    chargeIndicator = this.add.graphics();
    chargeIndicator.setDepth(1); // Ensure it renders above other elements
    updateChargeIndicator.call(this, 0); // Initialize with 0 progress

    // Setup input handlers
    this.input.on('pointerdown', (pointer) => {
        // Only handle pointers in bottom half of screen
        if (pointer.y <= config.height / 2) return;

        // Store this pointer's state
        activePointers[pointer.id] = {
            position: { x: pointer.x, y: pointer.y },
            quadrant: getQuadrant(pointer.x, pointer.y),
            lastPosition: { x: pointer.x, y: pointer.y }
        };

        // Handle bottom right quadrant (joystick)
        if (pointer.x > config.width / 2) {
            activePointers[pointer.id].isJoystick = true;
        }
        // Handle bottom left quadrant (shooting)
        else {
            activePointers[pointer.id].isCharging = true;
            activePointers[pointer.id].chargeStartTime = this.time.now;
            activePointers[pointer.id].chargePosition = { x: pointer.x, y: pointer.y };
            chargeIndicator.setVisible(true);
            updateChargeIndicator.call(this, 0);
        }
    });

    this.input.on('pointermove', (pointer) => {
        if (!activePointers[pointer.id]) return;

        const pointerState = activePointers[pointer.id];
        
        // Handle joystick movement if this pointer is a joystick
        if (pointerState.isJoystick) {
            // Move reticle at 2x the distance of the drag
            reticle.x += (pointer.x - pointerState.lastPosition.x) * 2;
            reticle.y += (pointer.y - pointerState.lastPosition.y) * 2;

            // Keep reticle within game bounds
            reticle.x = Phaser.Math.Clamp(reticle.x, 0, config.width);
            reticle.y = Phaser.Math.Clamp(reticle.y, 0, config.height);

            // Update last position for this specific pointer
            pointerState.lastPosition = { x: pointer.x, y: pointer.y };
        }
    });

    this.input.on('pointerup', (pointer) => {
        if (!activePointers[pointer.id]) return;

        const pointerState = activePointers[pointer.id];

        // Handle shooting in bottom left quadrant
        if (pointerState.isCharging) {
            const chargeTime = this.time.now - pointerState.chargeStartTime;
            // Only fire charged shot if held long enough, otherwise fire normal shot
            const isCharged = chargeTime >= chargeThreshold;
            fireBullet.call(this, isCharged);
            chargeIndicator.setVisible(false); // Hide charge indicator
        }

        // Clean up this pointer's state
        delete activePointers[pointer.id];
    });
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

function fireBullet(isCharged = false) {
    if (isCharged) {
        // For charged shots, fire a single large bullet
        const bullet = bullets.create(config.width / 2, config.height - 20, 'chargedBullet');
        
        const angle = Phaser.Math.Angle.Between(
            bullet.x, bullet.y,
            reticle.x, reticle.y
        );
        
        // Set bullet velocity towards reticle (charged bullets are faster)
        const speed = 800;
        this.physics.velocityFromRotation(angle, speed, bullet.body.velocity);
        
        // Rotate bullet to face direction of travel
        bullet.rotation = angle;

        // Add collision with enemy (charged bullets do more damage)
        this.physics.add.overlap(bullet, enemy, (bullet, enemy) => {
            bullet.destroy();
            const damage = 30;
            enemyHealth = Math.max(0, enemyHealth - damage);
            updateHealthBar.call(this);
        });

        // Destroy bullet after 2 seconds
        this.time.delayedCall(2000, () => {
            if (bullet.active) {
                bullet.destroy();
            }
        });
    } else {
        // For normal shots, fire three bullets in sequence
        // Capture initial angle to reticle - this will be used for all three bullets
        const initialAngle = Phaser.Math.Angle.Between(
            config.width / 2, config.height - 20,
            reticle.x, reticle.y
        );

        const fireOneBullet = (delay) => {
            this.time.delayedCall(delay, () => {
                const bullet = bullets.create(config.width / 2, config.height - 20, 'bullet');
                
                // Use the initial angle for consistent direction
                const speed = 400;
                this.physics.velocityFromRotation(initialAngle, speed, bullet.body.velocity);
                
                // Rotate bullet to face direction of travel
                bullet.rotation = initialAngle;

                // Add collision with enemy
                this.physics.add.overlap(bullet, enemy, (bullet, enemy) => {
                    bullet.destroy();
                    const damage = 10;
                    enemyHealth = Math.max(0, enemyHealth - damage);
                    updateHealthBar.call(this);
                });

                // Destroy bullet after 2 seconds
                this.time.delayedCall(2000, () => {
                    if (bullet.active) {
                        bullet.destroy();
                    }
                });
            });
        };

        // Fire three bullets with a tighter delay between each (33ms ≈ 2 frames at 60fps)
        fireOneBullet(0);    // First bullet immediately
        fireOneBullet(60);   // Second bullet after 33ms
        fireOneBullet(120);   // Third bullet after 66ms
    }
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

function updateChargeIndicator(progress) {
    chargeIndicator.clear();
    
    // Bar dimensions and position
    const barWidth = config.width * 0.4;  // 40% of screen width
    const barHeight = 20;
    const x = (config.width - barWidth) / 2;  // Center horizontally
    const y = config.height * 0.6;  // 60% down the screen
    
    // Draw background bar (dark grey)
    chargeIndicator.fillStyle(0x333333, 1);
    chargeIndicator.fillRect(x, y, barWidth, barHeight);
    
    if (progress > 0) {
        // Draw progress bar
        const fillWidth = barWidth * progress;
        
        if (progress >= 1) {
            // Fully charged - cyan with glow
            // Main bar
            chargeIndicator.fillStyle(0x00ffff, 0.9);
            chargeIndicator.fillRect(x, y, fillWidth, barHeight);
            
            // Glow effects
            const pulseScale = 1 + Math.sin(this.time.now / 200) * 0.1;
            
            // Inner glow
            chargeIndicator.lineStyle(4, 0x00ffff, 0.3);
            chargeIndicator.strokeRect(x - 2, y - 2, barWidth + 4, barHeight + 4);
            
            // Outer glow
            chargeIndicator.lineStyle(8, 0x00ffff, 0.2);
            chargeIndicator.strokeRect(
                x - 4 * pulseScale, 
                y - 4 * pulseScale, 
                barWidth + 8 * pulseScale, 
                barHeight + 8 * pulseScale
            );
            
            // Outermost glow
            chargeIndicator.lineStyle(12, 0x00ffff, 0.1);
            chargeIndicator.strokeRect(
                x - 6 * pulseScale, 
                y - 6 * pulseScale, 
                barWidth + 12 * pulseScale, 
                barHeight + 12 * pulseScale
            );
        } else {
            // Charging - grey
            chargeIndicator.fillStyle(0x666666, 0.9);
            chargeIndicator.fillRect(x, y, fillWidth, barHeight);
        }
    }
}

function update() {
    // Clean up bullets that are out of bounds
    bullets.getChildren().forEach((bullet) => {
        if (bullet.x < 0 || bullet.x > config.width || 
            bullet.y < 0 || bullet.y > config.height) {
            bullet.destroy();
        }
    });

    // Update charge indicator if charging
    Object.values(activePointers).forEach(pointer => {
        if (pointer.isCharging) {
            const chargeTime = this.time.now - pointer.chargeStartTime;
            const progress = Math.min(chargeTime / chargeThreshold, 1);
            updateChargeIndicator.call(this, progress);
        }
    });
}

// Helper function to determine pointer quadrant
function getQuadrant(x, y) {
    if (x <= config.width / 2) {
        return y > config.height / 2 ? 'bottomLeft' : 'topLeft';
    } else {
        return y > config.height / 2 ? 'bottomRight' : 'topRight';
    }
}

