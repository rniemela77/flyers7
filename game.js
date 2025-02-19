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

// First, declare all helper functions that will be used by FireMode
function createBullet(scene, x, y, angle, config = {}) {
    const bullet = scene.bullets.create(x, y, 'bullet');
    const speed = config.speed || 400;
    
    scene.physics.velocityFromRotation(angle, speed, bullet.body.velocity);
    bullet.rotation = angle;

    scene.physics.add.overlap(bullet, scene.enemies, (bullet, enemy) => {
        createExplosion(scene, bullet.x, bullet.y);
        bullet.destroy();
        
        const damage = config.damage || 10;
        enemy.health = Math.max(0, enemy.health - damage);
        
        if (enemy.health <= 0) {
            enemy.healthBar.destroy();
            enemy.destroy();
            scene.time.delayedCall(1000, () => {
                createEnemy.call(scene);
            });
        } else {
            updateEnemyHealthBar(enemy);
        }
    });

    scene.time.delayedCall(2000, () => {
        if (bullet.active) bullet.destroy();
    });

    return bullet;
}

// FireMode class definition
class FireMode {
    constructor(config) {
        this.name = config.name;
        this.isActive = config.isActive || false;
        this.iconDrawer = config.iconDrawer;
        this.damage = config.damage || 10;
        this.cooldown = config.cooldown || 100;
        this.buttonConfig = {
            x: 0,
            y: 0,
            width: 40,
            height: 40
        };

        // Safely bind methods if they exist
        if (typeof config.fire === 'function') {
            this.fire = config.fire.bind(this);
        } else {
            this.fire = () => {};
        }

        if (typeof config.update === 'function') {
            this.update = config.update.bind(this);
        } else {
            this.update = () => {};
        }

        if (typeof config.onToggle === 'function') {
            this.onToggle = config.onToggle.bind(this);
        } else {
            this.onToggle = () => {};
        }
    }
}

// Game configuration
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

// Fire modes configuration - move after config but before game initialization
const FIRE_MODES = {
    rapidFire: new FireMode({
        name: 'rapidFire',
        isActive: true,
        damage: 10,
        cooldown: 100,
        iconDrawer: (graphics, x, y, width, height) => {
            const circleY = y + height/2;
            for (let i = 0; i < 3; i++) {
                graphics.fillCircle(x + 10 + (i * 10), circleY, 3);
            }
        },
        fire: function(scene) {
            const centerX = config.width / 2;
            const bottomY = config.height - 20;
            const angle = Phaser.Math.Angle.Between(
                centerX, bottomY,
                scene.reticle.x, scene.reticle.y
            );
            createBullet(scene, centerX, bottomY, angle);
        }
    }),
    
    dualShot: new FireMode({
        name: 'dualShot',
        damage: 10,
        cooldown: 100,
        iconDrawer: (graphics, x, y, width, height) => {
            const circleY = y + height/2;
            graphics.fillCircle(x + 13, circleY, 5);
            graphics.fillCircle(x + 27, circleY, 5);
        },
        fire: function(scene) {
            const centerX = config.width / 2;
            const bottomY = config.height - 20;
            const baseAngle = Phaser.Math.Angle.Between(
                centerX, bottomY,
                scene.reticle.x, scene.reticle.y
            );
            
            const offset = 10;
            const perpAngle = baseAngle + Math.PI / 2;
            const offsetX = Math.cos(perpAngle) * offset;
            const offsetY = Math.sin(perpAngle) * offset;
            
            createBullet(scene, centerX - offsetX, bottomY - offsetY, baseAngle);
            createBullet(scene, centerX + offsetX, bottomY + offsetY, baseAngle);
        }
    }),
    
    tripleShot: new FireMode({
        name: 'tripleShot',
        damage: 10,
        cooldown: 100,
        iconDrawer: (graphics, x, y, width, height) => {
            const circleY = y + height/2;
            graphics.fillCircle(x + 8, circleY, 5);
            graphics.fillCircle(x + 20, circleY, 5);
            graphics.fillCircle(x + 32, circleY, 5);
        },
        fire: function(scene) {
            const centerX = config.width / 2;
            const bottomY = config.height - 20;
            const baseAngle = Phaser.Math.Angle.Between(
                centerX, bottomY,
                scene.reticle.x, scene.reticle.y
            );
            
            const spread = Math.PI / 32;
            createBullet(scene, centerX, bottomY, baseAngle);
            createBullet(scene, centerX, bottomY, baseAngle - spread);
            createBullet(scene, centerX, bottomY, baseAngle + spread);
        }
    }),
    
    beam: new FireMode({
        name: 'beam',
        damage: 2,
        cooldown: 100,
        iconDrawer: (graphics, x, y, width, height) => {
            graphics.lineStyle(3, 0xFFFFFF);
            graphics.beginPath();
            graphics.moveTo(x + width/2, y + 5);
            graphics.lineTo(x + width/2, y + height - 5);
            graphics.stroke();
            for (let i = 0; i < 3; i++) {
                graphics.fillCircle(x + width/2, y + 10 + (i * 10), 2);
            }
        },
        update: function(scene) {
            if (!this.isActive) return;
            checkBeamCollision.call(scene);
        }
    }),
    
    lockOn: new FireMode({
        name: 'lockOn',
        damage: 15,
        cooldown: 500,
        iconDrawer: (graphics, x, y, width, height) => {
            graphics.lineStyle(2, 0xFFFFFF);
            graphics.strokeCircle(x + width/2, y + height/2, 12);
            graphics.lineStyle(1, 0xFFFFFF);
            graphics.strokeCircle(x + width/2 - 8, y + height/2 - 8, 5);
            graphics.strokeCircle(x + width/2 + 8, y + height/2 + 8, 5);
        },
        fire: function(scene) {
            if (this.isActive && scene.lockedTargets.length > 0) {
                fireLockOnMissiles.call(scene);
            }
        },
        update: function(scene) {
            if (this.isActive) {
                updateLockOnTargets.call(scene);
            }
        },
        onToggle: function(scene, isActive) {
            if (!isActive) {
                scene.lockedTargets = [];
            }
        }
    })
};

// Initialize game last
const game = new Phaser.Game(config);

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
    this.enemies.add(enemy);

    // Start enemy movement
    moveEnemyToNewPosition.call(this, enemy);

    return enemy;
}

function create() {
    // Store all state in the scene instead of global variables
    this.enemies = this.physics.add.group();
    this.bullets = this.physics.add.group();
    this.isPointerDown = false;
    this.lastPointerPosition = { x: 0, y: 0 };
    this.isEnemyMoving = false;
    
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

    // Create reticle at center of screen and store it in the scene
    this.reticle = this.add.sprite(config.width / 2, config.height / 2, 'reticle');
    this.reticle.setDepth(2);  // Set reticle depth to 2 (above enemy)

    // Create bullet texture using graphics
    const bulletGraphics = this.add.graphics();
    bulletGraphics.fillStyle(0xFFFFFF);  // White fill
    bulletGraphics.beginPath();
    bulletGraphics.arc(4, 4, 4, 0, Math.PI * 2);  // Draw circle at (4,4) with radius 4
    bulletGraphics.closePath();
    bulletGraphics.fill();
    
    const bulletTexture = bulletGraphics.generateTexture('bullet', 8, 8);
    bulletGraphics.destroy();

    // Create beam graphics and store in scene
    this.beamGraphics = this.add.graphics();
    this.beamGraphics.setDepth(1);  // Set depth between enemies and reticle

    // Setup continuous bullet firing
    this.time.addEvent({
        delay: 100,
        callback: () => {
            Object.values(FIRE_MODES).forEach(mode => {
                try {
                    if (mode.isActive && typeof mode.fire === 'function') {
                        mode.fire(this);
                    }
                    if (typeof mode.update === 'function') {
                        mode.update(this);
                    }
                } catch (error) {
                    console.error(`Error in fire mode ${mode.name}:`, error);
                }
            });
        },
        callbackScope: this,
        loop: true
    });

    // Setup input handlers
    this.input.on('pointerdown', (pointer) => {
        this.isPointerDown = true;
        this.joystickPoint = { x: pointer.x, y: pointer.y };
        this.lastPointerPosition = { x: pointer.x, y: pointer.y };
    });

    this.input.on('pointermove', (pointer) => {
        if (this.isPointerDown) {
            const dx = pointer.x - this.joystickPoint.x;
            const dy = pointer.y - this.joystickPoint.y;
            
            // Move reticle at 2x the distance of the drag
            this.reticle.x += (pointer.x - this.lastPointerPosition.x) * 2;
            this.reticle.y += (pointer.y - this.lastPointerPosition.y) * 2;

            // Keep reticle within game bounds
            this.reticle.x = Phaser.Math.Clamp(this.reticle.x, 0, config.width);
            this.reticle.y = Phaser.Math.Clamp(this.reticle.y, 0, config.height);

            this.lastPointerPosition = { x: pointer.x, y: pointer.y };
        }
    });

    this.input.on('pointerup', () => {
        this.isPointerDown = false;
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
            if (FIRE_MODES.lockOn.isActive && this.lockedTargets.length > 0) {
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

function createExplosion(scene, x, y) {
    const explosion = scene.add.graphics();
    explosion.setDepth(3);  // Above enemies (which are at depth 1) and reticle (at depth 2)
    explosion.fillStyle(0xFFFFFF);  // White fill
    
    // Add random offset (-2 to +2 pixels) to position
    const offsetX = Phaser.Math.Between(-2, 2);
    const offsetY = Phaser.Math.Between(-2, 2);
    
    // Add random variation to size (12 +/- 2 pixels)
    const radius = 12 + Phaser.Math.Between(-2, 2);
    
    explosion.fillCircle(x + offsetX, y + offsetY, radius);
    
    // Destroy the circle after 50ms
    scene.time.delayedCall(50, () => {
        explosion.destroy();
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
    this.enemies.getChildren().forEach(enemy => {
        if (enemy && enemy.active) {
            updateEnemyHealthBar(enemy);
        }
    });

    // Clean up bullets that are out of bounds
    this.bullets.getChildren().forEach((bullet) => {
        if (bullet.x < 0 || bullet.x > config.width || 
            bullet.y < 0 || bullet.y > config.height) {
            bullet.destroy();
        }
    });

    // Allow reticle movement at any time
    if (this.isPointerDown) {
        // Move reticle at 2x the distance of the drag
        this.reticle.x += (this.input.activePointer.x - this.lastPointerPosition.x) * 2;
        this.reticle.y += (this.input.activePointer.y - this.lastPointerPosition.y) * 2;

        // Keep reticle within game bounds
        this.reticle.x = Phaser.Math.Clamp(this.reticle.x, 0, config.width);
        this.reticle.y = Phaser.Math.Clamp(this.reticle.y, 0, config.height);

        this.lastPointerPosition = { 
            x: this.input.activePointer.x, 
            y: this.input.activePointer.y 
        };
    }

    // Update beam graphics
    this.beamGraphics.clear();
    if (FIRE_MODES.beam.isActive) {
        const startX = config.width / 2;
        const startY = config.height - 20;
        const endX = this.reticle.x;
        const endY = this.reticle.y;

        // Draw beam glow effect
        this.beamGraphics.lineStyle(6, 0x00FFFF, 0.3);
        this.beamGraphics.beginPath();
        this.beamGraphics.moveTo(startX, startY);
        this.beamGraphics.lineTo(endX, endY);
        this.beamGraphics.strokePath();

        // Draw beam core
        this.beamGraphics.lineStyle(2, 0xFFFFFF, 1);
        this.beamGraphics.beginPath();
        this.beamGraphics.moveTo(startX, startY);
        this.beamGraphics.lineTo(endX, endY);
        this.beamGraphics.strokePath();
    }

    // Update lock-on targeting
    if (FIRE_MODES.lockOn.isActive) {
        updateLockOnTargets.call(this);
    } else {
        this.lockOnGraphics.clear();
    }

    // Update beam collision with proper scene context
    if (FIRE_MODES.beam.isActive) {
        checkBeamCollision.call(this);
    }
}

function createFireModeToggles() {
    const buttonWidth = 40;
    const buttonHeight = 40;
    const margin = 10;
    const y = config.height - buttonHeight - margin;

    Object.values(FIRE_MODES).forEach((mode, index) => {
        const x = margin * (index + 1) + buttonWidth * index;
        mode.buttonConfig.x = x;
        mode.buttonConfig.y = y;
        
        const button = this.add.graphics();
        button.setInteractive(
            new Phaser.Geom.Rectangle(x, y, buttonWidth, buttonHeight),
            Phaser.Geom.Rectangle.Contains
        );
        
        updateButtonVisuals.call(this, button, mode);
        
        button.on('pointerdown', () => {
            mode.isActive = !mode.isActive;
            mode.onToggle(this, mode.isActive);
            updateButtonVisuals.call(this, button, mode);
        });
        
        this[`${mode.name}Button`] = button;
    });
}

function updateButtonVisuals(button, mode) {
    const { x, y, width, height } = mode.buttonConfig;

    button.clear();
    
    // Draw button background
    button.lineStyle(2, 0xFFFFFF);
    button.fillStyle(mode.isActive ? 0x444444 : 0x222222);
    button.fillRect(x, y, width, height);
    button.strokeRect(x, y, width, height);

    // Draw button icon
    button.fillStyle(0xFFFFFF);
    mode.iconDrawer(button, x, y, width, height);
}

function updateLockOnTargets() {
    const lockOnRange = 100;  // Range to find targets
    this.lockOnGraphics.clear();

    // Remove any destroyed enemies from locked targets
    this.lockedTargets = this.lockedTargets.filter(target => target.active);

    // Find new targets if we have less than 2
    if (this.lockedTargets.length < 2) {
        this.enemies.getChildren().forEach(enemy => {
            if (enemy && enemy.active && !this.lockedTargets.includes(enemy)) {
                const distance = Phaser.Math.Distance.Between(
                    enemy.x, enemy.y,
                    this.reticle.x, this.reticle.y
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
        const missile = this.bullets.create(centerX, y, 'bullet');
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
        this.physics.add.overlap(missile, this.enemies, (missile, enemy) => {
            // Create explosion at missile's position
            createExplosion(this, missile.x, missile.y);
            
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

function pointToLineDistance(point, lineStart, lineEnd) {
    // Calculate the distance between a point and a line segment
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;

    if (len_sq != 0) {
        param = dot / len_sq;
    }

    let xx, yy;

    if (param < 0) {
        xx = lineStart.x;
        yy = lineStart.y;
    } else if (param > 1) {
        xx = lineEnd.x;
        yy = lineEnd.y;
    } else {
        xx = lineStart.x + param * C;
        yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;

    return Math.sqrt(dx * dx + dy * dy);
}

function checkBeamCollision() {
    if (!FIRE_MODES.beam.isActive) return;

    const startX = config.width / 2;
    const startY = config.height - 20;
    const endX = this.reticle.x;
    const endY = this.reticle.y;

    // Check each enemy for intersection with the beam line
    this.enemies.getChildren().forEach(enemy => {
        if (!enemy || !enemy.active) return;

        // Calculate if enemy intersects with beam line using our custom function
        const distToLine = pointToLineDistance(
            { x: enemy.x, y: enemy.y },
            { x: startX, y: startY },
            { x: endX, y: endY }
        );

        // If enemy is close enough to beam line (using enemy width as threshold)
        if (distToLine < 20) {
            // Simpler approach: show explosion at enemy's position
            createExplosion(this, enemy.x, enemy.y + 20);  // Offset slightly down from center
            
            enemy.health = Math.max(0, enemy.health - 2);  // Continuous small damage

            if (enemy.health <= 0) {
                enemy.healthBar.destroy();
                enemy.destroy();
                this.time.delayedCall(1000, () => {
                    createEnemy.call(this);
                });
            } else {
                updateEnemyHealthBar(enemy);
            }
        }
    });
}

