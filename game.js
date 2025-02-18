/*
Phaser.js game

Game mechanics:

- the enemy (a red triangle) spawns at the top half of the screen.
- the targeting reticle (a white crosshair) spawns on the enemy
- on pointerdown, create a virtual joystick at the pointer position.
- while pointerdown, on pointermove, the targeting reticle moves in the direction of the drag from the pointer down position. (almost like panning the reticle)
- the targeting reticle moves at 2x the distance of the drag.
- the player continuously fires bullets which spawn at the bottom center and travels in the direction of the targeting reticle.
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

let enemies;  // Group to hold all enemies
let reticle;
let joystickPoint;
let bullets;
let isPointerDown = false;
let lastPointerPosition = { x: 0, y: 0 };
let isEnemyMoving = false;
let fireModes = {
    rapidFire: true,
    dualShot: false,
    tripleShot: false,
    beam: false,
    lockOn: false
};

function preload() {
    // Remove the bullet image preload since we'll create it with graphics
}

function createEnemy() {
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
    const enemy = this.physics.add.sprite(
        Phaser.Math.Between(50, config.width - 50),
        Phaser.Math.Between(50, config.height / 2 - 50),
        'enemy'
    );
    enemy.setDepth(1);
    enemy.health = 100;  // Add health property to enemy

    // Create enemy health bar
    enemy.healthBar = this.add.graphics();
    enemy.healthBar.setDepth(1);
    updateEnemyHealthBar(enemy);

    // Add to enemies group
    enemies.add(enemy);

    // Start enemy movement
    moveEnemyToNewPosition.call(this, enemy);

    return enemy;
}

function create() {
    // Create enemies group
    enemies = this.physics.add.group();
    
    // Create initial enemies (3 of them)
    for (let i = 0; i < 3; i++) {
        createEnemy.call(this);
    }

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

    // Create reticle at center of screen
    reticle = this.add.sprite(config.width / 2, config.height / 2, 'reticle');
    reticle.setDepth(2);  // Set reticle depth to 2 (above enemy)

    // Create bullet texture using graphics
    const bulletGraphics = this.add.graphics();
    bulletGraphics.fillStyle(0xFFFFFF);  // White fill
    bulletGraphics.beginPath();
    bulletGraphics.arc(4, 4, 4, 0, Math.PI * 2);  // Draw circle at (4,4) with radius 4
    bulletGraphics.closePath();
    bulletGraphics.fill();
    
    const bulletTexture = bulletGraphics.generateTexture('bullet', 8, 8);
    bulletGraphics.destroy();

    // Create bullet group
    bullets = this.physics.add.group();

    // Setup continuous bullet firing
    this.time.addEvent({
        delay: 100,  // Fire a bullet every 100ms
        callback: () => {
            if (fireModes.rapidFire) {
                fireBullet.call(this);
            }
        },
        callbackScope: this,
        loop: true
    });

    // Setup input handlers
    this.input.on('pointerdown', (pointer) => {
        isPointerDown = true;
        joystickPoint = { x: pointer.x, y: pointer.y };
        lastPointerPosition = { x: pointer.x, y: pointer.y };
    });

    this.input.on('pointermove', (pointer) => {
        if (isPointerDown) {
            const dx = pointer.x - joystickPoint.x;
            const dy = pointer.y - joystickPoint.y;
            
            // Move reticle at 2x the distance of the drag
            reticle.x += (pointer.x - lastPointerPosition.x) * 2;
            reticle.y += (pointer.y - lastPointerPosition.y) * 2;

            // Keep reticle within game bounds
            reticle.x = Phaser.Math.Clamp(reticle.x, 0, config.width);
            reticle.y = Phaser.Math.Clamp(reticle.y, 0, config.height);

            lastPointerPosition = { x: pointer.x, y: pointer.y };
        }
    });

    this.input.on('pointerup', () => {
        isPointerDown = false;
    });

    createFireModeToggles.call(this);

    // Initialize locked targets array
    this.lockedTargets = [];
    this.lockOnGraphics = this.add.graphics();
    this.lockOnGraphics.setDepth(2);

    // Setup lock-on missile firing
    this.time.addEvent({
        delay: 500,
        callback: () => {
            if (fireModes.lockOn && this.lockedTargets.length > 0) {
                fireLockOnMissiles.call(this);
            }
        },
        callbackScope: this,
        loop: true
    });
}

function updateEnemyHealthBar(enemy) {
    if (!enemy || !enemy.healthBar) return;
    
    enemy.healthBar.clear();
    
    const barWidth = 40;
    const barHeight = 5;
    const barY = enemy.y - enemy.height/2 - barHeight - 5;
    const barX = enemy.x - barWidth/2;
    
    // Background (gray)
    enemy.healthBar.fillStyle(0x333333);
    enemy.healthBar.fillRect(barX, barY, barWidth, barHeight);
    // Health (red)
    enemy.healthBar.fillStyle(0xFF0000);
    enemy.healthBar.fillRect(barX, barY, (enemy.health / 100) * barWidth, barHeight);
}

function fireBullet() {
    const bullet = bullets.create(config.width / 2, config.height - 20, 'bullet');
    const angle = Phaser.Math.Angle.Between(
        bullet.x, bullet.y,
        reticle.x, reticle.y
    );
    
    // Set bullet velocity towards reticle
    const speed = 400;
    this.physics.velocityFromRotation(angle, speed, bullet.body.velocity);
    
    // Rotate bullet to face direction of travel
    bullet.rotation = angle;

    // Add collision with all enemies
    this.physics.add.overlap(bullet, enemies, (bullet, enemy) => {
        bullet.destroy();
        enemy.health = Math.max(0, enemy.health - 10);  // Decrease health by 10
        
        if (enemy.health <= 0) {
            enemy.healthBar.destroy();
            enemy.destroy();
            // Create a new enemy after a delay
            this.time.delayedCall(1000, () => {
                createEnemy.call(this);
            });
        } else {
            updateEnemyHealthBar(enemy);
        }
    });

    // Destroy bullet after 2 seconds
    this.time.delayedCall(2000, () => {
        bullet.destroy();
    });
}

function moveEnemyToNewPosition(enemy) {
    if (!enemy || !enemy.active) return;

    // Calculate new random position in top half, keeping away from edges
    const margin = 50;
    const newX = Phaser.Math.Between(margin, config.width - margin);
    const newY = Phaser.Math.Between(margin, (config.height / 2) - margin);

    // Move enemy to new position
    this.tweens.add({
        targets: enemy,
        x: newX,
        y: newY,
        duration: 1500,
        ease: 'Power2',
        onComplete: () => {
            // Wait 1-2 seconds before moving again
            this.time.delayedCall(Phaser.Math.Between(1000, 2000), () => {
        if (enemy && enemy.active) {
                    moveEnemyToNewPosition.call(this, enemy);
        }
    });
        },
        onUpdate: () => {
        if (enemy && enemy.active) {
            updateEnemyHealthBar(enemy);
                }
        }
    });
}

function update() {
    // Update all enemy health bars
    enemies.getChildren().forEach(enemy => {
        if (enemy && enemy.active) {
            updateEnemyHealthBar(enemy);
        }
    });

    // Clean up bullets that are out of bounds
    bullets.getChildren().forEach((bullet) => {
        if (bullet.x < 0 || bullet.x > config.width || 
            bullet.y < 0 || bullet.y > config.height) {
            bullet.destroy();
        }
    });

    // Allow reticle movement at any time
    if (isPointerDown) {
        // Move reticle at 2x the distance of the drag
        reticle.x += (this.input.activePointer.x - lastPointerPosition.x) * 2;
        reticle.y += (this.input.activePointer.y - lastPointerPosition.y) * 2;

        // Keep reticle within game bounds
        reticle.x = Phaser.Math.Clamp(reticle.x, 0, config.width);
        reticle.y = Phaser.Math.Clamp(reticle.y, 0, config.height);

        lastPointerPosition = { 
            x: this.input.activePointer.x, 
            y: this.input.activePointer.y 
        };
    }

    // Update lock-on targeting
    if (fireModes.lockOn) {
        updateLockOnTargets.call(this);
    } else {
        this.lockOnGraphics.clear();
    }
}

function createFireModeToggles() {
    const buttonWidth = 40;
    const buttonHeight = 40;
    const margin = 10;
    const y = config.height - buttonHeight - margin;

    // Rapid fire toggle
    const rapidFireButton = this.add.graphics();
    rapidFireButton.setInteractive(new Phaser.Geom.Rectangle(margin, y, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
    rapidFireButton.name = 'rapidFire';
    
    // Dual shot toggle
    const dualShotButton = this.add.graphics();
    dualShotButton.setInteractive(new Phaser.Geom.Rectangle(margin * 2 + buttonWidth, y, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
    dualShotButton.name = 'dualShot';

    // Triple shot toggle
    const tripleShotButton = this.add.graphics();
    tripleShotButton.setInteractive(new Phaser.Geom.Rectangle(margin * 3 + buttonWidth * 2, y, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
    tripleShotButton.name = 'tripleShot';

    // Beam toggle
    const beamButton = this.add.graphics();
    beamButton.setInteractive(new Phaser.Geom.Rectangle(margin * 4 + buttonWidth * 3, y, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
    beamButton.name = 'beam';

    // Lock-on toggle
    const lockOnButton = this.add.graphics();
    lockOnButton.setInteractive(new Phaser.Geom.Rectangle(margin * 5 + buttonWidth * 4, y, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
    lockOnButton.name = 'lockOn';

    // Draw initial button states
    updateButtonVisuals.call(this, rapidFireButton, fireModes.rapidFire);
    updateButtonVisuals.call(this, dualShotButton, fireModes.dualShot);
    updateButtonVisuals.call(this, tripleShotButton, fireModes.tripleShot);
    updateButtonVisuals.call(this, beamButton, fireModes.beam);
    updateButtonVisuals.call(this, lockOnButton, fireModes.lockOn);

    // Add click handlers
    rapidFireButton.on('pointerdown', () => {
        fireModes.rapidFire = !fireModes.rapidFire;
        updateButtonVisuals.call(this, rapidFireButton, fireModes.rapidFire);
    });

    dualShotButton.on('pointerdown', () => {
        fireModes.dualShot = !fireModes.dualShot;
        updateButtonVisuals.call(this, dualShotButton, fireModes.dualShot);
    });

    tripleShotButton.on('pointerdown', () => {
        fireModes.tripleShot = !fireModes.tripleShot;
        updateButtonVisuals.call(this, tripleShotButton, fireModes.tripleShot);
    });

    beamButton.on('pointerdown', () => {
        fireModes.beam = !fireModes.beam;
        updateButtonVisuals.call(this, beamButton, fireModes.beam);
    });

    lockOnButton.on('pointerdown', () => {
        fireModes.lockOn = !fireModes.lockOn;
        updateButtonVisuals.call(this, lockOnButton, fireModes.lockOn);
        // Clear locked targets when disabling
        if (!fireModes.lockOn) {
            this.lockedTargets = [];
        }
    });

    // Store buttons for later reference
    this.rapidFireButton = rapidFireButton;
    this.dualShotButton = dualShotButton;
    this.tripleShotButton = tripleShotButton;
    this.beamButton = beamButton;
    this.lockOnButton = lockOnButton;
}

function updateButtonVisuals(button, isActive) {
    const x = button.input.hitArea.x;
    const y = button.input.hitArea.y;
    const width = button.input.hitArea.width;
    const height = button.input.hitArea.height;

    button.clear();
    
    // Draw button background
    button.lineStyle(2, 0xFFFFFF);
    button.fillStyle(isActive ? 0x444444 : 0x222222);
    button.fillRect(x, y, width, height);
    button.strokeRect(x, y, width, height);

    // Draw button icon
    button.fillStyle(0xFFFFFF);
    const circleY = y + height/2;

    if (button.name === 'rapidFire') {
        // Draw rapid fire icon (three small circles in a row)
        for (let i = 0; i < 3; i++) {
            button.fillCircle(x + 10 + (i * 10), circleY, 3);
        }
    } else if (button.name === 'dualShot') {
        // Draw dual shot icon (two larger circles side by side)
        button.fillCircle(x + 13, circleY, 5);
        button.fillCircle(x + 27, circleY, 5);
    } else if (button.name === 'tripleShot') {
        // Draw triple shot icon (three larger circles side by side)
        button.fillCircle(x + 8, circleY, 5);
        button.fillCircle(x + 20, circleY, 5);
        button.fillCircle(x + 32, circleY, 5);
    } else if (button.name === 'beam') {
        // Draw beam icon (vertical line with small circles)
        button.lineStyle(3, 0xFFFFFF);
        button.beginPath();
        button.moveTo(x + width/2, y + 5);
        button.lineTo(x + width/2, y + height - 5);
        button.stroke();
        for (let i = 0; i < 3; i++) {
            button.fillCircle(x + width/2, y + 10 + (i * 10), 2);
        }
    } else if (button.name === 'lockOn') {
        // Draw lock-on icon (crosshair with target circles)
        button.lineStyle(2, 0xFFFFFF);
        button.strokeCircle(x + width/2, y + height/2, 12);
        button.lineStyle(1, 0xFFFFFF);
        button.strokeCircle(x + width/2 - 8, y + height/2 - 8, 5);
        button.strokeCircle(x + width/2 + 8, y + height/2 + 8, 5);
    }
}

function updateLockOnTargets() {
    const lockOnRange = 100;  // Range to find targets
    this.lockOnGraphics.clear();

    // Remove any destroyed enemies from locked targets
    this.lockedTargets = this.lockedTargets.filter(target => target.active);

    // Find new targets if we have less than 2
    if (this.lockedTargets.length < 2) {
        enemies.getChildren().forEach(enemy => {
            if (enemy && enemy.active && !this.lockedTargets.includes(enemy)) {
                const distance = Phaser.Math.Distance.Between(
                    enemy.x, enemy.y,
                    reticle.x, reticle.y
                );

                if (distance < lockOnRange && this.lockedTargets.length < 2) {
                    this.lockedTargets.push(enemy);
                }
            }
        });
    }

    // Draw targeting indicators
    this.lockedTargets.forEach(target => {
        // Draw targeting circle
        this.lockOnGraphics.lineStyle(2, 0xFF0000);
        this.lockOnGraphics.strokeCircle(target.x, target.y, 30);

        // Draw corner brackets
        const size = 10;
        const offset = 20;
        this.lockOnGraphics.lineStyle(2, 0xFF0000);
        
        // Top-left bracket
        this.lockOnGraphics.beginPath();
        this.lockOnGraphics.moveTo(target.x - offset, target.y - offset + size);
        this.lockOnGraphics.lineTo(target.x - offset, target.y - offset);
        this.lockOnGraphics.lineTo(target.x - offset + size, target.y - offset);
        this.lockOnGraphics.strokePath();

        // Top-right bracket
        this.lockOnGraphics.beginPath();
        this.lockOnGraphics.moveTo(target.x + offset - size, target.y - offset);
        this.lockOnGraphics.lineTo(target.x + offset, target.y - offset);
        this.lockOnGraphics.lineTo(target.x + offset, target.y - offset + size);
        this.lockOnGraphics.strokePath();

        // Bottom-left bracket
        this.lockOnGraphics.beginPath();
        this.lockOnGraphics.moveTo(target.x - offset, target.y + offset - size);
        this.lockOnGraphics.lineTo(target.x - offset, target.y + offset);
        this.lockOnGraphics.lineTo(target.x - offset + size, target.y + offset);
        this.lockOnGraphics.strokePath();

        // Bottom-right bracket
        this.lockOnGraphics.beginPath();
        this.lockOnGraphics.moveTo(target.x + offset - size, target.y + offset);
        this.lockOnGraphics.lineTo(target.x + offset, target.y + offset);
        this.lockOnGraphics.lineTo(target.x + offset, target.y + offset - size);
        this.lockOnGraphics.strokePath();
    });
}

function fireLockOnMissiles() {
    const centerX = config.width / 2;
    const y = config.height - 20;

    this.lockedTargets.forEach((target, index) => {
        if (!target.active) return;

        // Create missile
        const missile = bullets.create(centerX, y, 'bullet');
        missile.setTint(0xFF4444);  // Give missiles a reddish tint
        missile.scaleX = 1.5;  // Make missiles longer
        missile.isHoming = true;  // Flag to identify homing missiles
        missile.target = target;  // Store target reference
        missile.turnRate = 0.05;  // How quickly missile can turn
        missile.speed = 300;      // Missile speed

        // Initial angle towards target
        const angle = Phaser.Math.Angle.Between(
            missile.x, missile.y,
            target.x, target.y
        );
        missile.rotation = angle;
        this.physics.velocityFromRotation(angle, missile.speed, missile.body.velocity);

        // Add update listener for homing behavior
        this.time.addEvent({
            delay: 16,  // Update every frame
            callback: () => {
                if (!missile.active || !missile.target.active) {
                    if (missile.active) missile.destroy();
                    return;
                }

                // Calculate desired angle to target
                const targetAngle = Phaser.Math.Angle.Between(
                    missile.x, missile.y,
                    missile.target.x, missile.target.y
                );

                // Gradually rotate towards target
                let currentAngle = missile.rotation;
                const angleDiff = Phaser.Math.Angle.Wrap(targetAngle - currentAngle);
                
                if (Math.abs(angleDiff) > 0.01) {
                    currentAngle += Phaser.Math.Clamp(angleDiff, -missile.turnRate, missile.turnRate);
                }

                missile.rotation = currentAngle;
                this.physics.velocityFromRotation(currentAngle, missile.speed, missile.body.velocity);
            },
            callbackScope: this,
            loop: true
        });

        // Add collision with target
        this.physics.add.overlap(missile, enemies, (missile, enemy) => {
            missile.destroy();
            enemy.health = Math.max(0, enemy.health - 15);  // Missiles do more damage
            
            if (enemy.health <= 0) {
                enemy.healthBar.destroy();
                enemy.destroy();
                this.time.delayedCall(1000, () => {
                    createEnemy.call(this);
                });
            } else {
                updateEnemyHealthBar(enemy);
            }
        });

        // Destroy missile after 3 seconds if it hasn't hit anything
        this.time.delayedCall(3000, () => {
            if (missile.active) {
                missile.destroy();
            }
        });
    });
}

