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

const GAME_CONFIG = {
    display: {
        width: 400,
        height: 800,
        scale: Phaser.Scale.FIT,
        centerOffset: 20  // Distance from bottom center for projectile spawning
    },
    combat: {
        weapons: {
            rapidFire: {
                projectile: {
                    type: 'bullet',
                    speed: 400,
                    lifetime: 2000,
                    damage: 10,
                    size: 8,
                    color: 0xFFFFFF,
                    scale: 1
                },
                fireMode: {
                    cooldown: 100,
                    pattern: 'single',
                    spread: 0
                }
            },
            dualShot: {
                projectile: {
                    type: 'bullet',
                    speed: 400,
                    lifetime: 2000,
                    damage: 10,
                    size: 8,
                    color: 0xFFFFFF,
                    scale: 1
                },
                fireMode: {
                    cooldown: 100,
                    pattern: 'dual',
                    offset: 10,
                    spread: 0
                }
            },
            tripleShot: {
                projectile: {
                    type: 'bullet',
                    speed: 400,
                    lifetime: 2000,
                    damage: 10,
                    size: 8,
                    color: 0xFFFFFF,
                    scale: 1
                },
                fireMode: {
                    cooldown: 100,
                    pattern: 'spread',
                    count: 3,
                    spread: Math.PI / 32
                }
            },
            beam: {
                projectile: {
                    type: 'beam',
                    damage: 2,
                    range: 20,
                    width: 6,
                    color: 0xFFFFFF
                },
                fireMode: {
                    cooldown: 100,
                    continuous: true
                },
                visuals: {
                    glowWidth: 6,
                    glowAlpha: 0.3,
                    glowColor: 0x00FFFF
                }
            },
            lockOn: {
                projectile: {
                    type: 'missile',
                    speed: 300,
                    lifetime: 3000,
                    damage: 15,
                    size: 8,
                    color: 0xFF4444,
                    scale: 1.5,
                    turnRate: 0.05
                },
                fireMode: {
                    cooldown: 500,
                    maxTargets: 2,
                    targetingRange: 100,
                    pattern: 'homing'
                },
                visuals: {
                    targetingColor: 0xFF0000
                }
            },
            shotgun: {
                projectile: {
                    type: 'pellet',
                    speed: 900,
                    lifetime: 1500,
                    damage: 14,
                    size: 6,
                    color: 0xFFFFFF,
                    scale: 0.8
                },
                fireMode: {
                    cooldown: 1000,
                    pattern: 'spread',
                    count: 8,
                    baseSpread: Math.PI / 64,
                    distanceSpreadFactor: 1/800
                }
            }
        }
    },
    enemy: {
        health: 100,
        movementMargin: 50,
        movementDuration: 1500,
        respawnDelay: 1000,
        healthBar: {
            width: 40,
            height: 5,
            yOffset: 5
        }
    },
    ui: {
        buttons: {
            width: 40,
            height: 40,
            margin: 10
        }
    }
};

function handleEnemyHit(scene, enemy, damage, hitPosition, skipModifiers = false) {
    createExplosion(scene, hitPosition.x, hitPosition.y);

    // Create a standardized hit info object that all modifiers can use
    const hitInfo = {
        damage: damage,
        position: hitPosition,
        scene: scene
    };

    // Apply modifiers before damage, unless skipModifiers is true
    if (!skipModifiers && scene.weaponModifierManager?.modifiers) {
        scene.weaponModifierManager.modifiers.forEach(modifier => {
            if (modifier?.isActive) {
                modifier.onHit(scene, enemy, hitInfo);
            }
        });
    }

    // Apply base damage
    enemy.damage(damage);
}

class Projectile extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, config) {
        super(scene, config.x, config.y, config.texture || 'bullet');
        
        this.scene = scene;
        this.damage = config.damage || GAME_CONFIG.combat.weapons.rapidFire.projectile.damage;
        this.speed = config.speed || GAME_CONFIG.combat.weapons.rapidFire.projectile.speed;
        this.lifetime = config.lifetime || GAME_CONFIG.combat.weapons.rapidFire.projectile.lifetime;
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        scene.bullets.add(this);  // Add to bullets group
        
        // Set up collision after a short delay to ensure scene is initialized
        scene.time.delayedCall(0, () => {
            this.setupCollision();
        });
        
        this.setupLifetime();
        
        if (config.angle !== undefined) {
            this.setRotation(config.angle);
            scene.physics.velocityFromRotation(config.angle, this.speed, this.body.velocity);
        }
    }
    
    setupCollision() {
        // Only set up collision if the projectile is still active
        if (!this.active) return;
        
        this.scene.physics.add.overlap(this, this.scene.enemies, (projectile, enemy) => {
            handleEnemyHit(this.scene, enemy, this.damage, { x: projectile.x, y: projectile.y }, false);
            projectile.destroy();
        });
    }
    
    setupLifetime() {
        this.scene.time.delayedCall(this.lifetime, () => {
            if (this.active) this.destroy();
        });
    }
}

class HomingMissile extends Projectile {
    constructor(scene, target, config) {
        super(scene, {
            x: config.x,
            y: config.y,
            damage: GAME_CONFIG.combat.weapons.lockOn.projectile.damage,
            speed: GAME_CONFIG.combat.weapons.lockOn.projectile.speed,
            lifetime: GAME_CONFIG.combat.weapons.lockOn.projectile.lifetime
        });
        
        this.target = target;
        this.turnRate = GAME_CONFIG.combat.weapons.lockOn.projectile.turnRate;
        this.setTint(0xFF4444);
        this.scaleX = 1.5;
        this.scaleY = 1.5;  // Also scale Y to make missile more visible
        
        this.setupHoming();
    }
    
    setupHoming() {
        this.scene.time.addEvent({
            delay: 16,
            callback: () => {
                if (!this.active) return;
                
                if (this.target.active) {
                    const targetAngle = Phaser.Math.Angle.Between(
                        this.x, this.y,
                        this.target.x, this.target.y
                    );
                    
                    let currentAngle = this.rotation;
                    const angleDiff = Phaser.Math.Angle.Wrap(targetAngle - currentAngle);
                    
                    if (Math.abs(angleDiff) > 0.01) {
                        currentAngle += Phaser.Math.Clamp(angleDiff, -this.turnRate, this.turnRate);
                    }
                    
                    this.rotation = currentAngle;
                    this.scene.physics.velocityFromRotation(currentAngle, this.speed, this.body.velocity);
                }
            },
            loop: true
        });
    }
}

class ShotgunPellet extends Projectile {
    constructor(scene, config) {
        super(scene, {
            x: config.x,
            y: config.y,
            angle: config.angle,
            damage: GAME_CONFIG.combat.weapons.shotgun.projectile.damage,
            speed: GAME_CONFIG.combat.weapons.shotgun.projectile.speed
        });
    }
}

// Helper function to create projectiles
function createProjectile(scene, type, config) {
    switch (type) {
        case 'bullet':
            return new Projectile(scene, config);
        case 'missile':
            return new HomingMissile(scene, config.target, config);
        case 'pellet':
            return new ShotgunPellet(scene, config);
        default:
            return new Projectile(scene, config);
    }
}

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
        const killed = enemy.damage(damage);
        
        if (!killed) {
            enemy.updateHealthBar();
        }
    });

    scene.time.delayedCall(2000, () => {
        if (bullet.active) bullet.destroy();
    });

    return bullet;
}

// Add this function before the WeaponStateManager class
function checkBeamCollision(scene) {
    const startX = GAME_CONFIG.display.width / 2;
    const startY = GAME_CONFIG.display.height - GAME_CONFIG.display.centerOffset;
    const endX = scene.reticle.x;
    const endY = scene.reticle.y;

    scene.enemies.getChildren().forEach(enemy => {
        if (!enemy || !enemy.active) return;

        const distToLine = pointToLineDistance(
            { x: enemy.x, y: enemy.y },
            { x: startX, y: startY },
            { x: endX, y: endY }
        );

        if (distToLine < GAME_CONFIG.combat.weapons.beam.projectile.range) {
            handleEnemyHit(scene, enemy, GAME_CONFIG.combat.weapons.beam.projectile.damage, { 
                x: enemy.x, 
                y: enemy.y 
            }, false);
        }
    });
}

class WeaponStateManager {
    constructor(scene) {
        this.scene = scene;
        this.modes = new Map();
        this.setupModes();
    }
    
    setupModes() {
        const modeConfigs = {
            rapidFire: {
                name: 'rapidFire',
                isActive: true,
                damage: GAME_CONFIG.combat.weapons.rapidFire.projectile.damage,
                cooldown: GAME_CONFIG.combat.weapons.rapidFire.fireMode.cooldown,
                iconDrawer: (graphics, x, y, width, height) => {
                    const circleY = y + height/2;
                    for (let i = 0; i < 3; i++) {
                        graphics.fillCircle(x + 10 + (i * 10), circleY, 3);
                    }
                },
                fire: (scene) => {
                    const centerX = GAME_CONFIG.display.width / 2;
                    const bottomY = GAME_CONFIG.display.height - GAME_CONFIG.display.centerOffset;
                    const angle = Phaser.Math.Angle.Between(
                        centerX, bottomY,
                        scene.reticle.x, scene.reticle.y
                    );
                    createProjectile(scene, 'bullet', {
                        x: centerX,
                        y: bottomY,
                        angle: angle
                    });
                }
            },
            dualShot: {
                name: 'dualShot',
                damage: GAME_CONFIG.combat.weapons.dualShot.projectile.damage,
                cooldown: GAME_CONFIG.combat.weapons.dualShot.fireMode.cooldown,
                iconDrawer: (graphics, x, y, width, height) => {
                    const circleY = y + height/2;
                    graphics.fillCircle(x + 13, circleY, 5);
                    graphics.fillCircle(x + 27, circleY, 5);
                },
                fire: (scene) => {
                    const centerX = GAME_CONFIG.display.width / 2;
                    const bottomY = GAME_CONFIG.display.height - GAME_CONFIG.display.centerOffset;
                    const baseAngle = Phaser.Math.Angle.Between(
                        centerX, bottomY,
                        scene.reticle.x, scene.reticle.y
                    );
                    
                    const offset = GAME_CONFIG.combat.weapons.dualShot.fireMode.offset;
                    const perpAngle = baseAngle + Math.PI / 2;
                    const offsetX = Math.cos(perpAngle) * offset;
                    const offsetY = Math.sin(perpAngle) * offset;
                    
                    createProjectile(scene, 'bullet', {
                        x: centerX - offsetX,
                        y: bottomY - offsetY,
                        angle: baseAngle
                    });
                    createProjectile(scene, 'bullet', {
                        x: centerX + offsetX,
                        y: bottomY + offsetY,
                        angle: baseAngle
                    });
                }
            },
            tripleShot: {
                name: 'tripleShot',
                damage: GAME_CONFIG.combat.weapons.tripleShot.projectile.damage,
                cooldown: GAME_CONFIG.combat.weapons.tripleShot.fireMode.cooldown,
                iconDrawer: (graphics, x, y, width, height) => {
                    const circleY = y + height/2;
                    graphics.fillCircle(x + 8, circleY, 5);
                    graphics.fillCircle(x + 20, circleY, 5);
                    graphics.fillCircle(x + 32, circleY, 5);
                },
                fire: (scene) => {
                    const centerX = GAME_CONFIG.display.width / 2;
                    const bottomY = GAME_CONFIG.display.height - GAME_CONFIG.display.centerOffset;
                    const baseAngle = Phaser.Math.Angle.Between(
                        centerX, bottomY,
                        scene.reticle.x, scene.reticle.y
                    );
                    
                    const spread = GAME_CONFIG.combat.weapons.tripleShot.fireMode.spread;
                    createProjectile(scene, 'bullet', {
                        x: centerX,
                        y: bottomY,
                        angle: baseAngle
                    });
                    createProjectile(scene, 'bullet', {
                        x: centerX,
                        y: bottomY,
                        angle: baseAngle - spread
                    });
                    createProjectile(scene, 'bullet', {
                        x: centerX,
                        y: bottomY,
                        angle: baseAngle + spread
                    });
                }
            },
            beam: {
                name: 'beam',
                damage: GAME_CONFIG.combat.weapons.beam.projectile.damage,
                cooldown: GAME_CONFIG.combat.weapons.beam.fireMode.cooldown,
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
                update: (scene) => {
                    checkBeamCollision(scene);
                }
            },
            lockOn: {
                name: 'lockOn',
                damage: GAME_CONFIG.combat.weapons.lockOn.projectile.damage,
                cooldown: GAME_CONFIG.combat.weapons.lockOn.fireMode.cooldown,
                iconDrawer: (graphics, x, y, width, height) => {
                    graphics.lineStyle(2, 0xFFFFFF);
                    graphics.strokeCircle(x + width/2, y + height/2, 12);
                    graphics.lineStyle(1, 0xFFFFFF);
                    graphics.strokeCircle(x + width/2 - 8, y + height/2 - 8, 5);
                    graphics.strokeCircle(x + width/2 + 8, y + height/2 + 8, 5);
                },
                fire: (scene) => {
                    if (scene.lockedTargets.length > 0) {
                        fireLockOnMissiles.call(scene);
                    }
                },
                update: (scene) => {
                    updateLockOnTargets.call(scene);
                },
                onToggle: (scene, isActive) => {
                    if (!isActive) {
                        scene.lockedTargets = [];
                    }
                }
            },
            shotgun: {
                name: 'shotgun',
                damage: GAME_CONFIG.combat.weapons.shotgun.projectile.damage,
                cooldown: GAME_CONFIG.combat.weapons.shotgun.fireMode.cooldown,
                iconDrawer: (graphics, x, y, width, height) => {
                    graphics.lineStyle(2, 0xFFFFFF);
                    const centerX = x + width/2;
                    const centerY = y + height/2;
                    graphics.beginPath();
                    graphics.moveTo(centerX - 10, centerY + 10);
                    graphics.lineTo(centerX - 5, centerY - 10);
                    graphics.moveTo(centerX, centerY + 10);
                    graphics.lineTo(centerX, centerY - 10);
                    graphics.moveTo(centerX + 10, centerY + 10);
                    graphics.lineTo(centerX + 5, centerY - 10);
                    graphics.strokePath();
                },
                fire: (scene) => {
                    const centerX = GAME_CONFIG.display.width / 2;
                    const bottomY = GAME_CONFIG.display.height - GAME_CONFIG.display.centerOffset;
                    const baseAngle = Phaser.Math.Angle.Between(
                        centerX, bottomY,
                        scene.reticle.x, scene.reticle.y
                    );
                    
                    const distanceToTarget = Phaser.Math.Distance.Between(
                        centerX, bottomY,
                        scene.reticle.x, scene.reticle.y
                    );
                    const baseSpread = GAME_CONFIG.combat.weapons.shotgun.fireMode.baseSpread;
                    const distanceSpreadFactor = distanceToTarget / 800;
                    const totalSpread = baseSpread * (1 + distanceSpreadFactor);
                    
                    for (let i = 0; i < GAME_CONFIG.combat.weapons.shotgun.fireMode.count; i++) {
                        const spreadAngle = baseAngle + (Math.random() * 2 - 1) * totalSpread;
                        createProjectile(scene, 'pellet', {
                            x: centerX,
                            y: bottomY,
                            angle: spreadAngle
                        });
                    }
                }
            }
        };
        
        Object.entries(modeConfigs).forEach(([name, config]) => {
            this.addMode(name, new FireMode(config));
        });
    }
    
    addMode(name, mode) {
        this.modes.set(name, mode);
        mode.onStateChange = (active) => this.handleModeStateChange(name, active);
    }
    
    handleModeStateChange(modeName, active) {
        if (active) {
            // Handle exclusive modes if needed
            this.modes.forEach((mode, name) => {
                if (name !== modeName && mode.isExclusive) {
                    mode.deactivate();
                }
            });
        }
    }
    
    update(currentTime) {
        this.modes.forEach(mode => {
            if (mode.isActive) {
                try {
                    if (mode.canFire(currentTime)) {
                        mode.fire(this.scene);
                        mode.lastFireTime = currentTime;
                    }
                    mode.update?.(this.scene);
                } catch (error) {
                    console.error(`Error in fire mode ${mode.name}:`, error);
                }
            }
        });
    }
    
    getMode(name) {
        return this.modes.get(name);
    }
    
    createToggleButtons() {
        const { width, height, margin } = GAME_CONFIG.ui.buttons;
        const y = GAME_CONFIG.display.height - height - margin;
        
        let index = 0;
        this.modes.forEach((mode, name) => {
            const x = margin * (index + 1) + width * index;
            mode.buttonConfig = { x, y, width, height };
            
            const button = this.scene.add.graphics();
            button.setInteractive(
                new Phaser.Geom.Rectangle(x, y, width, height),
                Phaser.Geom.Rectangle.Contains
            );
            
            this.updateButtonVisuals(button, mode);
            
            button.on('pointerdown', () => {
                mode.toggle(this.scene);
                this.updateButtonVisuals(button, mode);
            });
            
            this.scene[`${name}Button`] = button;
            index++;
        });
    }
    
    updateButtonVisuals(button, mode) {
        const { x, y, width, height } = mode.buttonConfig;
        
        button.clear();
        button.lineStyle(2, 0xFFFFFF);
        button.fillStyle(mode.isActive ? 0x444444 : 0x222222);
        button.fillRect(x, y, width, height);
        button.strokeRect(x, y, width, height);
        
        button.fillStyle(0xFFFFFF);
        mode.iconDrawer(button, x, y, width, height);
    }
}

// Update FireMode class to work with WeaponStateManager
class FireMode {
    constructor(config) {
        this.name = config.name;
        this.isActive = config.isActive || false;
        this.iconDrawer = config.iconDrawer;
        this.damage = config.damage;
        this.cooldown = config.cooldown;
        this.buttonConfig = null;
        this.lastFireTime = 0;
        this.isExclusive = config.isExclusive || false;
        
        // Bind fire function if provided
        if (typeof config.fire === 'function') {
            this.fire = config.fire.bind(this);
        } else {
            this.fire = () => {};  // Default empty function
        }
        
        // Bind update function if provided
        if (typeof config.update === 'function') {
            this.update = config.update.bind(this);
        } else {
            this.update = () => {};  // Default empty function
        }

        // Bind onToggle function if provided
        if (typeof config.onToggle === 'function') {
            this.onToggle = config.onToggle.bind(this);
        } else {
            this.onToggle = () => {};  // Default empty function
        }
    }
    
    canFire(currentTime) {
        return currentTime - this.lastFireTime >= this.cooldown;
    }
    
    toggle(scene) {
        this.isActive = !this.isActive;
        this.onToggle(scene, this.isActive);
        if (typeof this.onStateChange === 'function') {
            this.onStateChange(this.isActive);
        }
    }
    
    deactivate() {
        if (this.isActive) {
            this.isActive = false;
            this.onToggle(this.scene, false);
            if (typeof this.onStateChange === 'function') {
                this.onStateChange(false);
            }
        }
    }
}

// Enemy class definition
class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'enemy');
        
        this.scene = scene;
        this.health = 100;
        this.isFrozen = false;
        this.currentTween = null;
        
        // Add to scene and physics
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Create health bar and status effects container
        this.healthBar = scene.add.graphics();
        this.statusEffects = scene.add.graphics();
        this.healthBar.setDepth(1);
        this.statusEffects.setDepth(1);
        this.updateHealthBar();
        
        // Start movement
        this.startMoving();
    }
    
    freeze() {
        if (this.isFrozen) return;
        
        this.isFrozen = true;
        
        // Stop current movement
        if (this.currentTween) {
            this.currentTween.stop();
        }
        
        // Create freeze visual effect
        this.setTint(0x00FFFF);
        
        // Unfreeze after 1 second
        this.scene.time.delayedCall(1000, () => {
            if (this.active) {
                this.isFrozen = false;
                this.clearTint();
                this.startMoving();
            }
        });
    }
    
    damage(amount) {
        this.health = Math.max(0, this.health - amount);
        this.updateHealthBar();
        
        if (this.health <= 0) {
            this.die();
        }
        
        return this.health <= 0;
    }
    
    die() {
        const scene = this.scene;
        this.healthBar.destroy();
        this.statusEffects.destroy();
        this.destroy();
        
        scene.time.delayedCall(1000, () => {
            createEnemy.call(scene);
        });
    }
    
    updateHealthBar() {
        this.healthBar.clear();
        this.statusEffects.clear();
        
        const barWidth = 40;
        const barHeight = 5;
        const barY = this.y - this.height/2 - barHeight - 5;
        const barX = this.x - barWidth/2;
        
        // Background (gray)
        this.healthBar.fillStyle(0x333333);
        this.healthBar.fillRect(barX, barY, barWidth, barHeight);
        // Health (red)
        this.healthBar.fillStyle(0xFF0000);
        this.healthBar.fillRect(barX, barY, (this.health / 100) * barWidth, barHeight);
        
        // Draw freeze status if frozen
        if (this.isFrozen) {
            this.statusEffects.fillStyle(0x00FFFF);
            // Position above and left-aligned with health bar
            this.statusEffects.fillCircle(barX, barY - 5, 3);
        }
    }
    
    startMoving() {
        if (!this.active || this.isFrozen) return;
        
        const margin = 50;
        const newX = Phaser.Math.Between(margin, config.width - margin);
        const newY = Phaser.Math.Between(margin, (config.height / 2) - margin);
        
        const scene = this.scene;
        
        this.currentTween = scene.tweens.add({
            targets: this,
            x: newX,
            y: newY,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => {
                scene.time.delayedCall(Phaser.Math.Between(1000, 2000), () => {
                    if (this.active) {
                        this.startMoving();
                    }
                });
            },
            onUpdate: () => {
                if (this.active) {
                    this.updateHealthBar();
                }
            }
        });
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
            checkBeamCollision(scene);
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
            if (scene.lockedTargets.length > 0) {
                fireLockOnMissiles.call(scene);
            }
        },
        update: function(scene) {
            updateLockOnTargets.call(scene);
        },
        onToggle: function(scene, isActive) {
            if (!isActive) {
                scene.lockedTargets = [];
            }
        }
    }),

    shotgun: new FireMode({
        name: 'shotgun',
        damage: 8,
        cooldown: 1000,  // Fire once every second
        iconDrawer: (graphics, x, y, width, height) => {
            // Draw a shotgun-like spread pattern icon
            graphics.lineStyle(2, 0xFFFFFF);
            const centerX = x + width/2;
            const centerY = y + height/2;
            // Draw three diverging lines
            graphics.beginPath();
            graphics.moveTo(centerX - 10, centerY + 10);
            graphics.lineTo(centerX - 5, centerY - 10);
            graphics.moveTo(centerX, centerY + 10);
            graphics.lineTo(centerX, centerY - 10);
            graphics.moveTo(centerX + 10, centerY + 10);
            graphics.lineTo(centerX + 5, centerY - 10);
            graphics.strokePath();
        },
        fire: function(scene) {
            const centerX = config.width / 2;
            const bottomY = config.height - 20;
            const baseAngle = Phaser.Math.Angle.Between(
                centerX, bottomY,
                scene.reticle.x, scene.reticle.y
            );
            
            // Calculate spread based on distance to target
            const distanceToTarget = Phaser.Math.Distance.Between(
                centerX, bottomY,
                scene.reticle.x, scene.reticle.y
            );
            const baseSpread = Math.PI / 64;  // Tighter base spread angle (half of previous)
            const distanceSpreadFactor = distanceToTarget / 800;  // Reduced distance spread factor
            const totalSpread = baseSpread * (1 + distanceSpreadFactor);
            
            // Fire 8 pellets in a spread pattern
            for (let i = 0; i < 8; i++) {
                const spreadAngle = baseAngle + (Math.random() * 2 - 1) * totalSpread;
                createBullet(scene, 'pellet', {
                    x: centerX,
                    y: bottomY,
                    angle: spreadAngle
                });
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
    // Create enemy texture if it doesn't exist
    if (!this.textures.exists('enemy')) {
        const enemyGraphics = this.add.graphics();
        enemyGraphics.lineStyle(2, 0xFF0000);
        enemyGraphics.fillStyle(0xFF0000);
        enemyGraphics.beginPath();
        enemyGraphics.moveTo(20, 5);   // Top
        enemyGraphics.lineTo(35, 35);  // Bottom right
        enemyGraphics.lineTo(5, 35);   // Bottom left
        enemyGraphics.closePath();
        enemyGraphics.fill();
        enemyGraphics.stroke();

        enemyGraphics.generateTexture('enemy', 40, 40);
        enemyGraphics.destroy();
    }

    // Create enemy at random position in top half
    const enemy = new Enemy(
        this,
        Phaser.Math.Between(50, config.width - 50),
        Phaser.Math.Between(50, config.height / 2 - 50)
    );
    enemy.setDepth(1);

    // Add to enemies group
    this.enemies.add(enemy);

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
    reticleGraphics.strokeCircle(25, 25, 15);
    reticleGraphics.moveTo(5, 25);
    reticleGraphics.lineTo(45, 25);
    reticleGraphics.moveTo(25, 5);
    reticleGraphics.lineTo(25, 45);

    const reticleTexture = reticleGraphics.generateTexture('reticle', 50, 50);
    reticleGraphics.destroy();

    this.reticle = this.add.sprite(GAME_CONFIG.display.width / 2, GAME_CONFIG.display.height / 2, 'reticle');
    this.reticle.setDepth(2);

    // Create bullet texture using graphics
    const bulletGraphics = this.add.graphics();
    bulletGraphics.fillStyle(0xFFFFFF);
    bulletGraphics.beginPath();
    bulletGraphics.arc(4, 4, 4, 0, Math.PI * 2);
    bulletGraphics.closePath();
    bulletGraphics.fill();
    
    const bulletTexture = bulletGraphics.generateTexture('bullet', GAME_CONFIG.combat.weapons.rapidFire.projectile.size, GAME_CONFIG.combat.weapons.rapidFire.projectile.size);
    bulletGraphics.destroy();

    // Create beam graphics and store in scene
    this.beamGraphics = this.add.graphics();
    this.beamGraphics.setDepth(1);

    // Initialize weapon state manager
    this.weaponManager = new WeaponStateManager(this);
    
    // Initialize weapon modifier manager
    this.weaponModifierManager = new WeaponModifierManager(this);

    // Setup continuous weapon updates
    this.time.addEvent({
        delay: 100,
        callback: () => {
            this.weaponManager.update(this.time.now);
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
            
            this.reticle.x += (pointer.x - this.lastPointerPosition.x) * 2;
            this.reticle.y += (pointer.y - this.lastPointerPosition.y) * 2;

            this.reticle.x = Phaser.Math.Clamp(this.reticle.x, 0, GAME_CONFIG.display.width);
            this.reticle.y = Phaser.Math.Clamp(this.reticle.y, 0, GAME_CONFIG.display.height);

            this.lastPointerPosition = { x: pointer.x, y: pointer.y };
        }
    });

    this.input.on('pointerup', () => {
        this.isPointerDown = false;
    });

    // Create weapon mode toggle buttons
    this.weaponManager.createToggleButtons();
    
    // Create weapon modifier toggle buttons
    this.weaponModifierManager.createToggleButtons();

    // Initialize locked targets array for lock-on mode
    this.lockedTargets = [];
    this.lockOnGraphics = this.add.graphics();
    this.lockOnGraphics.setDepth(2);
}

function update() {
    // Clean up bullets that are out of bounds
    this.bullets.getChildren().forEach((bullet) => {
        if (bullet.x < 0 || bullet.x > GAME_CONFIG.display.width || 
            bullet.y < 0 || bullet.y > GAME_CONFIG.display.height) {
            bullet.destroy();
        }
    });

    // Allow reticle movement at any time
    if (this.isPointerDown) {
        // Move reticle at 2x the distance of the drag
        this.reticle.x += (this.input.activePointer.x - this.lastPointerPosition.x) * 2;
        this.reticle.y += (this.input.activePointer.y - this.lastPointerPosition.y) * 2;

        // Keep reticle within game bounds
        this.reticle.x = Phaser.Math.Clamp(this.reticle.x, 0, GAME_CONFIG.display.width);
        this.reticle.y = Phaser.Math.Clamp(this.reticle.y, 0, GAME_CONFIG.display.height);

        this.lastPointerPosition = { 
            x: this.input.activePointer.x, 
            y: this.input.activePointer.y 
        };
    }

    // Update beam graphics
    this.beamGraphics.clear();
    const beamMode = this.weaponManager.getMode('beam');
    if (beamMode?.isActive) {
        const startX = GAME_CONFIG.display.width / 2;
        const bottomY = GAME_CONFIG.display.height - GAME_CONFIG.display.centerOffset;
        const endX = this.reticle.x;
        const endY = this.reticle.y;

        // Draw beam glow effect
        this.beamGraphics.lineStyle(
            GAME_CONFIG.combat.weapons.beam.visuals.glowWidth,
            0x00FFFF,
            GAME_CONFIG.combat.weapons.beam.visuals.glowAlpha
        );
        this.beamGraphics.beginPath();
        this.beamGraphics.moveTo(startX, bottomY);
        this.beamGraphics.lineTo(endX, endY);
        this.beamGraphics.strokePath();

        // Draw beam core
        this.beamGraphics.lineStyle(GAME_CONFIG.combat.weapons.beam.projectile.width, 0xFFFFFF, 1);
        this.beamGraphics.beginPath();
        this.beamGraphics.moveTo(startX, bottomY);
        this.beamGraphics.lineTo(endX, endY);
        this.beamGraphics.strokePath();
    }

    // Update lock-on targeting
    this.lockOnGraphics.clear();
    const lockOnMode = this.weaponManager.getMode('lockOn');
    if (lockOnMode?.isActive) {
        this.lockedTargets.forEach(target => {
            if (!target.active) return;
            
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

        const missile = this.bullets.create(centerX, y, 'bullet');
        missile.setTint(0xFF4444);
        missile.scaleX = 1.5;
        missile.isHoming = true;
        missile.target = target;
        missile.turnRate = 0.05;
        missile.speed = 300;

        const angle = Phaser.Math.Angle.Between(
            missile.x, missile.y,
            target.x, target.y
        );
        missile.rotation = angle;
        this.physics.velocityFromRotation(angle, missile.speed, missile.body.velocity);

        this.time.addEvent({
            delay: 16,
            callback: () => {
                if (!missile.active) return;

                // If target is still active, home in on it
                if (missile.target.active) {
                    const targetAngle = Phaser.Math.Angle.Between(
                        missile.x, missile.y,
                        missile.target.x, missile.target.y
                    );

                    let currentAngle = missile.rotation;
                    const angleDiff = Phaser.Math.Angle.Wrap(targetAngle - currentAngle);
                    
                    if (Math.abs(angleDiff) > 0.01) {
                        currentAngle += Phaser.Math.Clamp(angleDiff, -missile.turnRate, missile.turnRate);
                    }

                    missile.rotation = currentAngle;
                    this.physics.velocityFromRotation(currentAngle, missile.speed, missile.body.velocity);
                }
                // If target is destroyed, missile continues in its current direction
                // No need to update velocity as it will maintain its last direction
            },
            callbackScope: this,
            loop: true
        });

        this.physics.add.overlap(missile, this.enemies, (missile, enemy) => {
            handleEnemyHit(this, enemy, GAME_CONFIG.combat.weapons.lockOn.projectile.damage, { 
                x: missile.x, 
                y: missile.y 
            }, false);
            missile.destroy();
        });

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

class WeaponModifier {
    constructor(config) {
        this.name = config.name;
        this.isActive = config.isActive || false;
        this.iconDrawer = config.iconDrawer;
        this.buttonConfig = null;
        this.onHit = config.onHit || (() => {});
        this.isExclusive = config.isExclusive || false;
        
        if (typeof config.onToggle === 'function') {
            this.onToggle = config.onToggle.bind(this);
        } else {
            this.onToggle = () => {};
        }
    }
    
    toggle(scene) {
        this.isActive = !this.isActive;
        this.onToggle(scene, this.isActive);
        if (typeof this.onStateChange === 'function') {
            this.onStateChange(this.isActive);
        }
    }
    
    deactivate() {
        if (this.isActive) {
            this.isActive = false;
            this.onToggle(this.scene, false);
            if (typeof this.onStateChange === 'function') {
                this.onStateChange(false);
            }
        }
    }
}

// Add weapon modifiers configuration
const WEAPON_MODIFIERS = {
    chainLightning: new WeaponModifier({
        name: 'chainLightning',
        iconDrawer: (graphics, x, y, width, height) => {
            graphics.lineStyle(2, 0xFFFF00);
            const centerX = x + width/2;
            const centerY = y + height/2;
            
            // Draw a lightning bolt
            graphics.beginPath();
            graphics.moveTo(centerX - 10, centerY - 15);  // Start top-left
            graphics.lineTo(centerX, centerY - 5);        // First zag right
            graphics.lineTo(centerX - 5, centerY + 5);    // Second zag left
            graphics.lineTo(centerX + 10, centerY + 15);  // End bottom-right
            graphics.strokePath();
        },
        onHit: (scene, sourceEnemy, hitInfo) => {
            const chainChance = 0.75;  // 75% chance to trigger chain lightning
            if (Math.random() > chainChance) return;

            const maxChains = 2;
            const chainRange = 100;
            const chainDamage = hitInfo.damage * 0.5;  // Chain hits do 50% damage
            
            // Find up to 2 nearest enemies that aren't the source
            const nearbyEnemies = scene.enemies.getChildren()
                .filter(enemy => enemy.active && enemy !== sourceEnemy)
                .map(enemy => ({
                    enemy,
                    distance: Phaser.Math.Distance.Between(
                        sourceEnemy.x, sourceEnemy.y,
                        enemy.x, enemy.y
                    )
                }))
                .filter(({ distance }) => distance <= chainRange)
                .sort((a, b) => a.distance - b.distance)
                .slice(0, maxChains)
                .map(({ enemy }) => enemy);

            // Chain to each nearby enemy
            nearbyEnemies.forEach(targetEnemy => {
                // Create lightning effect
                const lightning = scene.add.graphics();
                lightning.setDepth(3);
                lightning.lineStyle(3, 0xFFFF00, 0.8);
                
                // Add some randomness to the lightning path
                const midX = (sourceEnemy.x + targetEnemy.x) / 2;
                const midY = (sourceEnemy.y + targetEnemy.y) / 2;
                const offsetX = (Math.random() - 0.5) * 20;
                const offsetY = (Math.random() - 0.5) * 20;
                
                lightning.beginPath();
                lightning.moveTo(sourceEnemy.x, sourceEnemy.y);
                lightning.lineTo(midX + offsetX, midY + offsetY);
                lightning.lineTo(targetEnemy.x, targetEnemy.y);
                lightning.strokePath();
                
                // Fade out and destroy the lightning effect
                scene.tweens.add({
                    targets: lightning,
                    alpha: 0,
                    duration: 200,
                    onComplete: () => lightning.destroy()
                });
                
                // Deal chain damage directly without triggering more modifiers
                targetEnemy.damage(chainDamage);
            });
        }
    }),
    freeze: new WeaponModifier({
        name: 'freeze',
        iconDrawer: (graphics, x, y, width, height) => {
            graphics.lineStyle(2, 0x00FFFF);
            const centerX = x + width/2;
            const centerY = y + height/2;
            
            // Draw a snowflake-like icon
            const radius = 10;
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI / 3);
                const endX = centerX + Math.cos(angle) * radius;
                const endY = centerY + Math.sin(angle) * radius;
                graphics.beginPath();
                graphics.moveTo(centerX, centerY);
                graphics.lineTo(endX, endY);
                graphics.strokePath();
            }
        },
        onHit: (scene, enemy, hitInfo) => {
            const freezeChance = 0.3; // 30% chance to freeze
            if (Math.random() > freezeChance) return;
            
            enemy.freeze();
        }
    }),
    explosive: new WeaponModifier({
        name: 'explosive',
        iconDrawer: (graphics, x, y, width, height) => {
            graphics.lineStyle(2, 0xFF6600);
            const centerX = x + width/2;
            const centerY = y + height/2;
            
            // Draw an explosion-like icon
            const radius = 8;
            // Draw outer spikes
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI / 4);
                const innerX = centerX + Math.cos(angle) * radius;
                const innerY = centerY + Math.sin(angle) * radius;
                const outerX = centerX + Math.cos(angle) * (radius * 1.5);
                const outerY = centerY + Math.sin(angle) * (radius * 1.5);
                graphics.beginPath();
                graphics.moveTo(innerX, innerY);
                graphics.lineTo(outerX, outerY);
                graphics.strokePath();
            }
            // Draw inner circle
            graphics.strokeCircle(centerX, centerY, radius);
        },
        onHit: (scene, enemy, hitInfo) => {
            const explosionRadius = 80;
            const explosionDamage = hitInfo.damage * 0.4; // 40% of original damage
            const explosionChance = 0.3; // 30% chance to explode
            
            // Check if explosion should occur
            if (Math.random() > explosionChance) {
                return;
            }
            
            const x = hitInfo.position.x;
            const y = hitInfo.position.y;
            
            // Create simple explosion effect
            const explosion = scene.add.graphics();
            explosion.setDepth(3);
            
            // Single quick expanding ring
            scene.tweens.add({
                targets: { progress: 0 },
                progress: 1,
                duration: 200,
                onUpdate: (tween) => {
                    const progress = tween.targets[0].progress;
                    explosion.clear();
                    
                    // Just a simple ring that expands and fades
                    const radius = explosionRadius * progress;
                    explosion.lineStyle(5, 0xFF6600, 0.8 * (1 - progress));
                    explosion.strokeCircle(x, y, radius);
                },
                onComplete: () => explosion.destroy()
            });
            
            // Apply damage to nearby enemies
            scene.enemies.getChildren().forEach(nearbyEnemy => {
                if (!nearbyEnemy.active || nearbyEnemy === enemy) return;
                
                const distance = Phaser.Math.Distance.Between(x, y, nearbyEnemy.x, nearbyEnemy.y);
                
                if (distance <= explosionRadius) {
                    const damageMultiplier = 1 - (distance / explosionRadius);
                    const damage = explosionDamage * damageMultiplier;
                    nearbyEnemy.damage(damage);
                }
            });
        }
    })
};

class WeaponModifierManager {
    constructor(scene) {
        this.scene = scene;
        this.modifiers = new Map();
        this.setupModifiers();
    }
    
    setupModifiers() {
        Object.entries(WEAPON_MODIFIERS).forEach(([name, modifier]) => {
            this.addModifier(name, modifier);
        });
    }
    
    addModifier(name, modifier) {
        this.modifiers.set(name, modifier);
        modifier.onStateChange = (active) => this.handleModifierStateChange(name, active);
    }
    
    handleModifierStateChange(modifierName, active) {
        if (active) {
            this.modifiers.forEach((modifier, name) => {
                if (name !== modifierName && modifier.isExclusive) {
                    modifier.deactivate();
                }
            });
        }
    }
    
    getModifier(name) {
        return this.modifiers.get(name);
    }
    
    createToggleButtons() {
        const { width, height, margin } = GAME_CONFIG.ui.buttons;
        const y = GAME_CONFIG.display.height - (height * 2) - (margin * 2);  // Position above weapon modes
        
        let index = 0;
        this.modifiers.forEach((modifier, name) => {
            const x = margin * (index + 1) + width * index;
            modifier.buttonConfig = { x, y, width, height };
            
            const button = this.scene.add.graphics();
            button.setInteractive(
                new Phaser.Geom.Rectangle(x, y, width, height),
                Phaser.Geom.Rectangle.Contains
            );
            
            this.updateButtonVisuals(button, modifier);
            
            button.on('pointerdown', () => {
                modifier.toggle(this.scene);
                this.updateButtonVisuals(button, modifier);
            });
            
            this.scene[`${name}ModifierButton`] = button;
            index++;
        });
    }
    
    updateButtonVisuals(button, modifier) {
        const { x, y, width, height } = modifier.buttonConfig;
        
        button.clear();
        button.lineStyle(2, 0xFFFFFF);
        button.fillStyle(modifier.isActive ? 0x444444 : 0x222222);
        button.fillRect(x, y, width, height);
        button.strokeRect(x, y, width, height);
        
        button.fillStyle(0xFFFFFF);
        modifier.iconDrawer(button, x, y, width, height);
    }
}

