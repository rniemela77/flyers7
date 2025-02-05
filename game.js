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
let chargeThreshold = 900; // Time to reach max charge (300ms per level)
let activePointers = {};  // Track multiple active pointers
let chargeIndicator; // New: Graphics object for charge indicator
let activeShootingPointer = null; // Track the active shooting pointer

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

    // Create bullet group
    bullets = this.physics.add.group();

    // Create all bullet textures once
    createBulletTextures.call(this);

    // Create charge indicator (initially invisible)
    chargeIndicator = this.add.graphics();
    chargeIndicator.setDepth(1);
    updateChargeIndicator.call(this, 0);

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
        else if (!activeShootingPointer) { // Only allow one shooting pointer at a time
            activeShootingPointer = pointer.id;
            activePointers[pointer.id].isCharging = true;
            activePointers[pointer.id].chargeStartTime = this.time.now;
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
        if (pointerState.isCharging && pointer.id === activeShootingPointer) {
            const holdTime = this.time.now - pointerState.chargeStartTime;
            const isQuickTap = holdTime < 200; // If held less than 200ms, it's a quick tap
            
            if (isQuickTap) {
                fireBullet.call(this, false); // Quick shot
            } else {
                const progress = Math.min(holdTime / chargeThreshold, 1);
                fireBullet.call(this, true, progress); // Charged shot with current progress
            }
            
            chargeIndicator.setVisible(false);
            activeShootingPointer = null; // Clear active shooting pointer
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

function fireBullet(isCharged = false, chargeProgress = 0) {
    if (isCharged) {
        // Get charge level based on provided progress
        const chargeLevel = getChargeLevel(chargeProgress);
        
        // Properties scale with charge level
        const bulletProps = {
            1: { size: 12, damage: 20, speed: 500, key: 'bullet_charged_1' },
            2: { size: 20, damage: 35, speed: 600, key: 'bullet_charged_2' },
            3: { size: 32, damage: 50, speed: 700, key: 'bullet_charged_3' }
        }[chargeLevel];
        
        // Create and fire the bullet using pre-generated texture
        const bullet = bullets.create(config.width / 2, config.height - 20, bulletProps.key);
        
        const angle = Phaser.Math.Angle.Between(
            bullet.x, bullet.y,
            reticle.x, reticle.y
        );
        
        this.physics.velocityFromRotation(angle, bulletProps.speed, bullet.body.velocity);
        bullet.rotation = angle;
        
        // Add collision with enemy
        this.physics.add.overlap(bullet, enemy, (bullet, enemy) => {
            bullet.destroy();
            enemyHealth = Math.max(0, enemyHealth - bulletProps.damage);
            updateHealthBar.call(this);
        });
        
        // Cleanup after 2 seconds
        this.time.delayedCall(2000, () => {
            if (bullet.active) {
                bullet.destroy();
            }
        });
    } else {
        // Create and fire the bullet using pre-generated texture
        const bullet = bullets.create(config.width / 2, config.height - 20, 'bullet_quick');
        
        const angle = Phaser.Math.Angle.Between(
            bullet.x, bullet.y,
            reticle.x, reticle.y
        );
        
        const speed = 800; // Quick bullets are fastest
        this.physics.velocityFromRotation(angle, speed, bullet.body.velocity);
        bullet.rotation = angle;
        
        // Add collision with enemy
        this.physics.add.overlap(bullet, enemy, (bullet, enemy) => {
            bullet.destroy();
            enemyHealth = Math.max(0, enemyHealth - 15); // Quick shots do 15 damage
            updateHealthBar.call(this);
        });
        
        // Cleanup after 2 seconds
        this.time.delayedCall(2000, () => {
            if (bullet.active) {
                bullet.destroy();
            }
        });
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
    const barWidth = config.width * 0.4;
    const barHeight = 12;  // Thinner bar
    const x = (config.width - barWidth) / 2;
    const y = config.height * 0.6;
    const cornerRadius = 6;  // Rounded corners
    
    // Draw background bar (darker)
    chargeIndicator.fillStyle(0x222222, 0.9);
    chargeIndicator.fillRoundedRect(x, y, barWidth, barHeight, cornerRadius);
    
    if (progress > 0) {
        // Get charge level and determine color
        const chargeLevel = getChargeLevel(progress);
        let barColor;
        
        if (progress < 0.33) {
            // Grey to blue
            barColor = Phaser.Display.Color.Interpolate.ColorWithColor(
                new Phaser.Display.Color(102, 102, 102),  // #666666
                new Phaser.Display.Color(52, 152, 219),   // #3498db
                100,
                Math.floor(progress * 300)
            );
        } else if (progress < 0.67) {
            // Blue to purple
            barColor = Phaser.Display.Color.Interpolate.ColorWithColor(
                new Phaser.Display.Color(52, 152, 219),   // #3498db
                new Phaser.Display.Color(155, 89, 182),   // #9b59b6
                100,
                Math.floor((progress - 0.33) * 300)
            );
        } else {
            // Purple to cyan
            barColor = Phaser.Display.Color.Interpolate.ColorWithColor(
                new Phaser.Display.Color(155, 89, 182),   // #9b59b6
                new Phaser.Display.Color(0, 255, 255),    // #00ffff
                100,
                Math.floor((progress - 0.67) * 300)
            );
        }
        
        // Convert RGB color to hex
        const hexColor = Phaser.Display.Color.GetColor(barColor.r, barColor.g, barColor.b);
        
        // Draw progress bar with interpolated color
        const fillWidth = barWidth * progress;
        chargeIndicator.fillStyle(hexColor, 1);
        chargeIndicator.fillRoundedRect(x, y, fillWidth, barHeight, cornerRadius);
        
        // Get glow color based on charge level
        const glowColor = chargeLevel === 3 ? 0x00ffff : (chargeLevel === 2 ? 0x9b59b6 : 0x3498db);
        
        // Add glow effect when charge level increases
        if (chargeLevel > 0) {
            const glowAlpha = 0.2 + Math.sin(this.time.now / 200) * 0.1;
            
            // Outer glow
            chargeIndicator.lineStyle(4, glowColor, glowAlpha);
            chargeIndicator.strokeRoundedRect(x - 2, y - 2, fillWidth + 4, barHeight + 4, cornerRadius + 2);
        }
        
        // Add level markers (small dots above the bar)
        const dotRadius = 3;
        const dotSpacing = barWidth / 3;
        
        for (let i = 1; i <= 3; i++) {
            const dotX = x + (dotSpacing * i) - (dotSpacing / 2);
            const dotY = y - 8;
            
            // Filled dot if level reached, outline if not
            if (progress >= (i / 3)) {
                chargeIndicator.fillStyle(glowColor, 1);
                chargeIndicator.fillCircle(dotX, dotY, dotRadius);
            } else {
                chargeIndicator.fillStyle(0x444444, 0.8);
                chargeIndicator.fillCircle(dotX, dotY, dotRadius);
            }
        }
    }
}

function getChargeLevel(progress) {
    if (progress >= 1) return 3;
    if (progress >= 0.67) return 2;
    if (progress >= 0.33) return 1;
    return 0;
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
    if (activeShootingPointer !== null && activePointers[activeShootingPointer]) {
        const pointer = activePointers[activeShootingPointer];
        const chargeTime = this.time.now - pointer.chargeStartTime;
        const progress = Math.min(chargeTime / chargeThreshold, 1);
        updateChargeIndicator.call(this, progress);
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

