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
    homeBase: {
        health: 100,
        maxHealth: 100,
        damageFromCollision: 20,
        healthBar: {
            width: 200,
            height: 20,
            margin: 10
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

function handleEnemyHit(scene, enemy, damage, hitInfo, skipModifiers = false) {
    createExplosion(scene, hitInfo.x, hitInfo.y);

    // Create a standardized hit info object that all modifiers can use
    const hitData = {
        damage: damage,
        position: hitInfo,
        scene: scene,
        projectile: hitInfo.projectile // Add projectile reference
    };

    // Apply modifiers before damage, unless skipModifiers is true
    if (!skipModifiers && scene.weaponModifierManager?.modifiers) {
        scene.weaponModifierManager.modifiers.forEach(modifier => {
            if (modifier?.isActive) {
                modifier.onHit(scene, enemy, hitData);
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
        this.damage = config.damage;
        this.speed = config.speed;
        this.lifetime = config.lifetime;
        this.shouldPierce = false;
        this.hasPierced = false;
        
        if (config.scale) {
            this.setScale(config.scale);
        }
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        scene.bullets.add(this);
        
        // Apply modifiers ONLY here, not in createProjectile
        if (scene.weaponModifierManager) {
            // Use values() to get the modifiers from the Map
            Array.from(scene.weaponModifierManager.modifiers.values()).forEach(modifier => {
                if (modifier.isActive) {
                    modifier.onProjectileCreate?.(this);
                }
            });
        }
        
        this.setupCollision();
        this.setupLifetime();
        
        if (config.angle !== undefined) {
            this.setRotation(config.angle);
            scene.physics.velocityFromRotation(config.angle, this.speed, this.body.velocity);
        }
    }
    
    setupCollision() {
        if (!this.active) return;
        
        // Add Set to track hit enemies
        this.hitEnemies = new Set();
        
        this.scene.physics.add.overlap(this, this.scene.enemies, (proj, enemy) => {
            if (!proj.active || !enemy.active) return;
            
            // Check if we've already hit this enemy
            if (proj.hitEnemies.has(enemy)) return;
            
            // Add this enemy to our hit list
            proj.hitEnemies.add(enemy);
            
            // Handle hit
            handleEnemyHit(proj.scene, enemy, proj.damage, {
                x: proj.x,
                y: proj.y,
                projectile: proj
            }, false);
            
            // Handle pierce logic
            if (proj.shouldPierce) {
                if (!proj.hasPierced) {
                    // First pierce - mark as pierced but don't destroy
                    proj.hasPierced = true;
                } else {
                    // Second hit - destroy projectile
                    proj.destroy();
                }
            } else {
                // Non-piercing projectile - destroy immediately
                proj.destroy();
            }
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

// Helper function to create projectiles - this will be our single source of truth for projectile creation
function createProjectile(scene, type, config) {
    let projectile;
    
    switch (type) {
        case 'bullet':
            projectile = new Projectile(scene, {
                ...config,
                damage: GAME_CONFIG.combat.weapons.rapidFire.projectile.damage,
                speed: GAME_CONFIG.combat.weapons.rapidFire.projectile.speed,
                lifetime: GAME_CONFIG.combat.weapons.rapidFire.projectile.lifetime
            });
            break;
        case 'missile':
            projectile = new HomingMissile(scene, config.target, config);
            break;
        case 'pellet':
            projectile = new Projectile(scene, {
                ...config,
                damage: GAME_CONFIG.combat.weapons.shotgun.projectile.damage,
                speed: GAME_CONFIG.combat.weapons.shotgun.projectile.speed,
                lifetime: GAME_CONFIG.combat.weapons.shotgun.projectile.lifetime,
                scale: GAME_CONFIG.combat.weapons.shotgun.projectile.scale
            });
            break;
        default:
            projectile = new Projectile(scene, config);
    }

    return projectile;
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
                    const centerX = scene.homeBase.x;
                    const centerY = scene.homeBase.y;
                    const angle = Phaser.Math.Angle.Between(
                        centerX, centerY,
                        scene.reticle.x, scene.reticle.y
                    );
                    createProjectile(scene, 'bullet', {
                        x: centerX,
                        y: centerY,
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
                    const centerX = scene.homeBase.x;
                    const centerY = scene.homeBase.y;
                    const baseAngle = Phaser.Math.Angle.Between(
                        centerX, centerY,
                        scene.reticle.x, scene.reticle.y
                    );
                    
                    const offset = GAME_CONFIG.combat.weapons.dualShot.fireMode.offset;
                    const perpAngle = baseAngle + Math.PI / 2;
                    const offsetX = Math.cos(perpAngle) * offset;
                    const offsetY = Math.sin(perpAngle) * offset;
                    
                    createProjectile(scene, 'bullet', {
                        x: centerX - offsetX,
                        y: centerY - offsetY,
                        angle: baseAngle
                    });
                    createProjectile(scene, 'bullet', {
                        x: centerX + offsetX,
                        y: centerY + offsetY,
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
                    const centerX = scene.homeBase.x;
                    const centerY = scene.homeBase.y;
                    const baseAngle = Phaser.Math.Angle.Between(
                        centerX, centerY,
                        scene.reticle.x, scene.reticle.y
                    );
                    
                    const spread = GAME_CONFIG.combat.weapons.tripleShot.fireMode.spread;
                    createProjectile(scene, 'bullet', {
                        x: centerX,
                        y: centerY,
                        angle: baseAngle
                    });
                    createProjectile(scene, 'bullet', {
                        x: centerX,
                        y: centerY,
                        angle: baseAngle - spread
                    });
                    createProjectile(scene, 'bullet', {
                        x: centerX,
                        y: centerY,
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
                    const startX = scene.homeBase.x;
                    const startY = scene.homeBase.y;
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
                    const centerX = scene.homeBase.x;
                    const centerY = scene.homeBase.y;
                    const baseAngle = Phaser.Math.Angle.Between(
                        centerX, centerY,
                        scene.reticle.x, scene.reticle.y
                    );
                    
                    const distanceToTarget = Phaser.Math.Distance.Between(
                        centerX, centerY,
                        scene.reticle.x, scene.reticle.y
                    );
                    const baseSpread = GAME_CONFIG.combat.weapons.shotgun.fireMode.baseSpread;
                    const distanceSpreadFactor = distanceToTarget / 800;
                    const totalSpread = baseSpread * (1 + distanceSpreadFactor);
                    
                    for (let i = 0; i < GAME_CONFIG.combat.weapons.shotgun.fireMode.count; i++) {
                        const spreadAngle = baseAngle + (Math.random() * 2 - 1) * totalSpread;
                        createProjectile(scene, 'pellet', {
                            x: centerX,
                            y: centerY,
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
class Enemy extends Phaser.GameObjects.Triangle {
    constructor(scene, x, y) {
        const x1 = 15; // left
        const y1 = 0; // top
        const x2 = 30; // right
        const y2 = 30; // bottom
        const x3 = 0; // left
        const y3 = 30; // bottom
        
        // Create a triangle with vertices relative to (0,0)
        super(scene, x, y, x1, y1, x2, y2, x3, y3, 0x4444FF); // 
        
        this.setOrigin(0.5, 0.5);
        
        this.scene = scene;
        this.health = 100;
        this.isFrozen = false;
        this.currentTween = null;
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        scene.enemies.add(this);
        
        // Enable collision with other enemies and set circular hitbox
        this.body.setCollideWorldBounds(true);
        this.body.setBounce(0.8, 0.8);
        this.body.setDrag(50);
        this.body.setMass(1);
        this.body.setCircle(15);
        this.body.setOffset(0, 0);
        
        // Create health bar
        this.healthBar = scene.add.graphics();
        this.healthBar.setDepth(2);
        
        // Create status effects container
        this.statusEffects = scene.add.graphics();
        this.statusEffects.setDepth(2);
        
        this.updateHealthBar();
        this.startMoving();
    }
    
    startMoving() {
        if (!this.active || this.isFrozen) return;
        
        const margin = 50;
        const newX = Phaser.Math.Between(margin, config.width - margin);
        const newY = Phaser.Math.Between(margin, (config.height / 2) - margin);
        
        // Calculate velocity based on target position
        const angle = Phaser.Math.Angle.Between(this.x, this.y, newX, newY);
        const speed = 100; // Adjust speed as needed
        this.scene.physics.velocityFromRotation(angle, speed, this.body.velocity);
        
        // Set a timer to change direction
        this.scene.time.delayedCall(1500, () => {
            if (this.active) {
                this.startMoving();
            }
        });
    }
    
    freeze() {
        if (this.isFrozen) return;
        
        this.isFrozen = true;
        
        // Stop current movement
        this.body.setVelocity(0, 0);
        
        // Create freeze visual effect
        this.setFillStyle(0x00FFFF);
        
        // Unfreeze after 1 second
        this.scene.time.delayedCall(1000, () => {
            if (this.active) {
                this.isFrozen = false;
                this.setFillStyle(0x4444FF); // Reset to original blue color
                this.startMoving();
            }
        });
    }
    
    updateHealthBar() {
        if (!this.active) return;
        
        this.healthBar.clear();
        this.statusEffects.clear();
        
        const barWidth = GAME_CONFIG.enemy.healthBar.width;
        const barHeight = GAME_CONFIG.enemy.healthBar.height;
        // Position health bar above the triangle's top point
        const barY = this.y - 30 - barHeight - GAME_CONFIG.enemy.healthBar.yOffset;
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
            this.statusEffects.fillCircle(barX, barY - 5, 3);
        }
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
}

// Swooper enemy that dives towards the player
class SwooperEnemy extends Phaser.GameObjects.Rectangle {
    constructor(scene, x, y) {
        super(scene, x, y, 30, 30, 0xFF0000); // Changed to red square, 30x30 pixels
        
        this.scene = scene;
        this.health = 100;
        this.isFrozen = false;
        this.currentTween = null;
        this.swoopState = 'preparing';
        this.swoopTimer = 0;
        this.prepareDuration = 2500; // Longer preparation time
        this.swoopSpeed = 150; // Slower swooping speed (was 200)
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        scene.enemies.add(this);
        
        // Enable collision with other enemies
        this.body.setCollideWorldBounds(true);
        this.body.setBounce(0.8, 0.8);
        this.body.setDrag(50);
        this.body.setMass(1);
        
        // Create health bar
        this.healthBar = scene.add.graphics();
        this.healthBar.setDepth(2);
        
        // Create status effects container
        this.statusEffects = scene.add.graphics();
        this.statusEffects.setDepth(2);
        
        this.updateHealthBar();
        this.startSwooping();
    }
    
    startSwooping() {
        if (!this.active || this.isFrozen) return;
        
        this.swoopState = 'preparing';
        this.swoopTimer = 0;
        
        // Move side to side while preparing
        const margin = 50;
        const newX = Phaser.Math.Between(margin, config.width - margin);
        const newY = Phaser.Math.Between(margin, config.height / 4); // Stay in top quarter
        
        // Calculate velocity for side movement
        const angle = Phaser.Math.Angle.Between(this.x, this.y, newX, newY);
        const speed = 35; // Even slower during preparation (was 50)
        this.scene.physics.velocityFromRotation(angle, speed, this.body.velocity);
        
        // Update movement more frequently
        this.scene.time.addEvent({
            delay: 16, // 60fps
            callback: this.updateSwooping,
            callbackScope: this,
            loop: false
        });
    }
    
    updateSwooping() {
        if (!this.active || this.isFrozen) return;
        
        this.swoopTimer += 16;
        
        switch (this.swoopState) {
            case 'preparing':
                if (this.swoopTimer >= this.prepareDuration) {
                    this.swoopState = 'diving';
                    this.swoopTimer = 0;
                    
                    // Start diving towards bottom center
                    const targetX = config.width / 2;
                    const targetY = config.height - 100; // Don't dive all the way to bottom
                    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
                    this.scene.physics.velocityFromRotation(angle, this.swoopSpeed, this.body.velocity);
                }
                break;
                
            case 'diving':
                if (this.y >= config.height - 100) { // Check if reached dive target
                    this.swoopState = 'returning';
                    this.swoopTimer = 0;
                    
                    // Return to top of screen at random x position
                    const returnX = Phaser.Math.Between(50, config.width - 50);
                    const returnY = 50;
                    const angle = Phaser.Math.Angle.Between(this.x, this.y, returnX, returnY);
                    this.scene.physics.velocityFromRotation(angle, this.swoopSpeed * 0.6, this.body.velocity); // Even slower return (was 0.7)
                }
                break;
                
            case 'returning':
                if (this.y <= 100) { // Check if returned to top
                    this.startSwooping(); // Start the cycle again
                }
                break;
        }
        
        // Continue updating movement
        if (this.active && !this.isFrozen) {
            this.scene.time.addEvent({
                delay: 16,
                callback: this.updateSwooping,
                callbackScope: this,
                loop: false
            });
        }
    }
    
    freeze() {
        if (this.isFrozen) return;
        
        this.isFrozen = true;
        
        // Stop current movement
        this.body.setVelocity(0, 0);
        
        // Create freeze visual effect
        this.setFillStyle(0x00FFFF);
        
        // Unfreeze after 1 second
        this.scene.time.delayedCall(1000, () => {
            if (this.active) {
                this.isFrozen = false;
                this.setFillStyle(0x4444FF); // Reset to original blue color
                this.startSwooping();
            }
        });
    }
    
    updateHealthBar() {
        if (!this.active) return;
        
        this.healthBar.clear();
        this.statusEffects.clear();
        
        const barWidth = GAME_CONFIG.enemy.healthBar.width;
        const barHeight = GAME_CONFIG.enemy.healthBar.height;
        // Position health bar above the square
        const barY = this.y - 25 - barHeight - GAME_CONFIG.enemy.healthBar.yOffset;
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
            this.statusEffects.fillCircle(barX, barY - 5, 3);
        }
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
            debug: true
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
        damage: GAME_CONFIG.combat.weapons.rapidFire.projectile.damage,
        cooldown: GAME_CONFIG.combat.weapons.rapidFire.fireMode.cooldown,
        iconDrawer: (graphics, x, y, width, height) => {
            const circleY = y + height/2;
            for (let i = 0; i < 3; i++) {
                graphics.fillCircle(x + 10 + (i * 10), circleY, 3);
            }
        },
        fire: (scene) => {
            const centerX = scene.homeBase.x;
            const centerY = scene.homeBase.y;
            const angle = Phaser.Math.Angle.Between(
                centerX, centerY,
                scene.reticle.x, scene.reticle.y
            );
            createProjectile(scene, 'bullet', {
                x: centerX,
                y: centerY,
                angle: angle
            });
        }
    }),
    
    dualShot: new FireMode({
        name: 'dualShot',
        damage: GAME_CONFIG.combat.weapons.dualShot.projectile.damage,
        cooldown: GAME_CONFIG.combat.weapons.dualShot.fireMode.cooldown,
        iconDrawer: (graphics, x, y, width, height) => {
            const circleY = y + height/2;
            graphics.fillCircle(x + 13, circleY, 5);
            graphics.fillCircle(x + 27, circleY, 5);
        },
        fire: (scene) => {
            const centerX = scene.homeBase.x;
            const centerY = scene.homeBase.y;
            const baseAngle = Phaser.Math.Angle.Between(
                centerX, centerY,
                scene.reticle.x, scene.reticle.y
            );
            
            const offset = GAME_CONFIG.combat.weapons.dualShot.fireMode.offset;
            const perpAngle = baseAngle + Math.PI / 2;
            const offsetX = Math.cos(perpAngle) * offset;
            const offsetY = Math.sin(perpAngle) * offset;
            
            createProjectile(scene, 'bullet', {
                x: centerX - offsetX,
                y: centerY - offsetY,
                angle: baseAngle
            });
            createProjectile(scene, 'bullet', {
                x: centerX + offsetX,
                y: centerY + offsetY,
                angle: baseAngle
            });
        }
    }),
    
    tripleShot: new FireMode({
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
            const centerX = scene.homeBase.x;
            const centerY = scene.homeBase.y;
            const baseAngle = Phaser.Math.Angle.Between(
                centerX, centerY,
                scene.reticle.x, scene.reticle.y
            );
            
            const spread = GAME_CONFIG.combat.weapons.tripleShot.fireMode.spread;
            createProjectile(scene, 'bullet', {
                x: centerX,
                y: centerY,
                angle: baseAngle
            });
            createProjectile(scene, 'bullet', {
                x: centerX,
                y: centerY,
                angle: baseAngle - spread
            });
            createProjectile(scene, 'bullet', {
                x: centerX,
                y: centerY,
                angle: baseAngle + spread
            });
        }
    }),
    
    beam: new FireMode({
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
            const startX = scene.homeBase.x;
            const startY = scene.homeBase.y;
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
    }),
    
    lockOn: new FireMode({
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
        fire: function(scene) {
            const centerX = scene.homeBase.x;
            const centerY = scene.homeBase.y;
            const baseAngle = Phaser.Math.Angle.Between(
                centerX, centerY,
                scene.reticle.x, scene.reticle.y
            );
            
            const distanceToTarget = Phaser.Math.Distance.Between(
                centerX, centerY,
                scene.reticle.x, scene.reticle.y
            );
            const baseSpread = GAME_CONFIG.combat.weapons.shotgun.fireMode.baseSpread;
            const distanceSpreadFactor = distanceToTarget / 800;
            const totalSpread = baseSpread * (1 + distanceSpreadFactor);
            
            for (let i = 0; i < GAME_CONFIG.combat.weapons.shotgun.fireMode.count; i++) {
                const spreadAngle = baseAngle + (Math.random() * 2 - 1) * totalSpread;
                createProjectile(scene, 'pellet', {
                    x: centerX,
                    y: centerY,
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
    // Create enemy at random position in top half
    const x = Phaser.Math.Between(50, config.width - 50);
    const y = Phaser.Math.Between(50, config.height / 2 - 50);
    
    // 30% chance to spawn a dive bomber
    const enemy = Math.random() < 0.3 ? 
        new DiveBomber(this, x, y) :
        new Enemy(this, x, y);
    
    enemy.setDepth(1);

    // Add to enemies group
    this.enemies.add(enemy);
}

function create() {
    // Store all state in the scene instead of global variables
    this.enemies = this.physics.add.group();
    this.bullets = this.physics.add.group();
    this.isPointerDown = false;
    this.lastPointerPosition = { x: 0, y: 0 };
    this.isEnemyMoving = false;
    
    // Initialize home base health
    this.homeBaseHealth = GAME_CONFIG.homeBase.maxHealth;
    
    // Create home base health bar
    this.homeBaseHealthBar = this.add.graphics();
    this.homeBaseHealthBar.setDepth(3);
    
    // Define updateHomeBaseHealth method for the scene
    this.updateHomeBaseHealth = function(damage) {
        this.homeBaseHealth = Math.max(0, this.homeBaseHealth - damage);
        
        // Add screen shake when damage is taken
        if (damage > 0) {
            this.cameras.main.shake(200, 0.0015 * damage);  // Duration based on damage amount
        }
        
        // Update health bar display
        const { width, height, margin } = GAME_CONFIG.homeBase.healthBar;
        const barX = (GAME_CONFIG.display.width - width) / 2;
        const barY = margin;
        
        this.homeBaseHealthBar.clear();
        
        // Background (gray)
        this.homeBaseHealthBar.fillStyle(0x333333);
        this.homeBaseHealthBar.fillRect(barX, barY, width, height);
        
        // Health (green to red based on percentage)
        const healthPercent = this.homeBaseHealth / GAME_CONFIG.homeBase.maxHealth;
        const color = Phaser.Display.Color.Interpolate.ColorWithColor(
            { r: 255, g: 0, b: 0 },
            { r: 0, g: 255, b: 0 },
            100,
            healthPercent * 100
        );
        this.homeBaseHealthBar.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b));
        this.homeBaseHealthBar.fillRect(barX, barY, width * healthPercent, height);
        
        // Game over if health reaches 0
        if (this.homeBaseHealth <= 0) {
            // TODO: Implement game over state
            console.log('Game Over - Base Destroyed');
        }
    };
    
    // Initial draw of health bar
    this.updateHomeBaseHealth(0);

    // Create home base circle
    const homeBaseRadius = GAME_CONFIG.display.width / 10;
    const homeBaseY = GAME_CONFIG.display.height * 0.6;
    const homeBaseX = GAME_CONFIG.display.width / 2;
    
    const homeBaseGraphics = this.add.graphics();
    homeBaseGraphics.fillStyle(0xFFFFFF);
    homeBaseGraphics.fillCircle(homeBaseX, homeBaseY, homeBaseRadius);
    homeBaseGraphics.setDepth(1);
    
    // Store home base position and radius for bullet spawning and collision detection
    this.homeBase = {
        x: homeBaseX,
        y: homeBaseY,
        radius: homeBaseRadius
    };

    // Create beam graphics and store in scene
    this.beamGraphics = this.add.graphics();
    this.beamGraphics.setDepth(1);

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

    // Create initial enemies (3 of them) AFTER home base is created
    for (let i = 0; i < 3; i++) {
        createEnemy.call(this);
    }

    // Add collision between enemies
    this.physics.add.collider(this.enemies, this.enemies);
}

function update() {
    // Clean up bullets that are out of bounds
    this.bullets.getChildren().forEach((bullet) => {
        if (bullet.x < 0 || bullet.x > GAME_CONFIG.display.width || 
            bullet.y < 0 || bullet.y > GAME_CONFIG.display.height) {
            bullet.destroy();
        }
    });

    // Update enemy health bars
    this.enemies.getChildren().forEach(enemy => {
        if (enemy.active) {
            enemy.updateHealthBar();
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
        const startX = this.homeBase.x;
        const startY = this.homeBase.y;
        const endX = this.reticle.x;
        const endY = this.reticle.y;

        // Draw beam glow effect
        this.beamGraphics.lineStyle(
            GAME_CONFIG.combat.weapons.beam.visuals.glowWidth,
            0x00FFFF,
            GAME_CONFIG.combat.weapons.beam.visuals.glowAlpha
        );
        this.beamGraphics.beginPath();
        this.beamGraphics.moveTo(startX, startY);
        this.beamGraphics.lineTo(endX, endY);
        this.beamGraphics.strokePath();

        // Draw beam core
        this.beamGraphics.lineStyle(GAME_CONFIG.combat.weapons.beam.projectile.width, 0xFFFFFF, 1);
        this.beamGraphics.beginPath();
        this.beamGraphics.moveTo(startX, startY);
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
            mode.onToggle(this.scene);
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
    // Use home base position for missile spawning
    const startX = this.homeBase.x;
    const startY = this.homeBase.y;

    this.lockedTargets.forEach((target, index) => {
        if (!target.active) return;

        const missile = this.bullets.create(startX, startY, 'bullet');
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
        this.onProjectileCreate = config.onProjectileCreate;
        
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
    }),
    pierce: new WeaponModifier({
        name: 'pierce',
        iconDrawer: (graphics, x, y, width, height) => {
            graphics.lineStyle(2, 0x00FF00);
            const centerX = x + width/2;
            const centerY = y + height/2;
            
            // Draw an arrow piercing through a circle
            const radius = 8;
            
            // Draw the circle
            graphics.strokeCircle(centerX + 2, centerY, radius);
            
            // Draw the arrow
            graphics.beginPath();
            graphics.moveTo(centerX - 12, centerY);
            graphics.lineTo(centerX + 16, centerY);
            graphics.strokePath();
            
            // Arrow head
            graphics.beginPath();
            graphics.moveTo(centerX + 16, centerY);
            graphics.lineTo(centerX + 12, centerY - 4);
            graphics.lineTo(centerX + 12, centerY + 4);
            graphics.closePath();
            graphics.fillStyle(0x00FF00);
            graphics.fill();
            
            // Add "1" to indicate single pierce
            graphics.lineStyle(1, 0x00FF00);
            graphics.fillStyle(0x00FF00);
            const textSize = 10;
            graphics.fillRect(centerX + 8, centerY - textSize/2, textSize/2, textSize);
        },
        // Apply pierce property when projectile is created
        onProjectileCreate: (projectile) => {
            projectile.shouldPierce = true;
        },
        // Still keep onHit for any hit effects we might want to add later
        onHit: (scene, enemy, hitInfo) => {
            // No need to do anything here anymore
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

// DiveBomber enemy that targets the home base
class DiveBomber extends Phaser.GameObjects.Triangle {
    constructor(scene, x, y) {
        // Create a triangle with vertices relative to (0,0)
        const x1 = 15; // left
        const y1 = 0; // top
        const x2 = 30; // right
        const y2 = 30; // bottom
        const x3 = 0; // left
        const y3 = 30; // bottom
        
        super(scene, x, y, x1, y1, x2, y2, x3, y3, 0xFF4444); // 
        
        this.setOrigin(0.5, 0.5);
        
        this.scene = scene;
        this.health = 100;
        this.isFrozen = false;
        this.currentTween = null;
        this.state = 'patrolling';
        this.stateTimer = 0;
        this.patrolDuration = Phaser.Math.Between(2000, 4000);
        this.diveSpeed = 300;
        this.patrolSpeed = 100;
        this.horizontalSpeed = 50;
        this.horizontalDirection = Math.random() < 0.5 ? -1 : 1;
        
        // Bind all methods that need 'this' context
        this.updateMovement = this.updateMovement.bind(this);
        this.startPatrolling = this.startPatrolling.bind(this);
        this.explodeAtHomeBase = this.explodeAtHomeBase.bind(this);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        scene.enemies.add(this);
        
        // Enable collision with other enemies and set circular hitbox
        this.body.setCollideWorldBounds(true);
        this.body.setBounce(0.8, 0.8);
        this.body.setDrag(50);
        this.body.setMass(1);
        this.body.setCircle(15);
        this.body.setOffset(0, 0);
        
        // Create health bar
        this.healthBar = scene.add.graphics();
        this.healthBar.setDepth(2);
        
        // Create status effects container
        this.statusEffects = scene.add.graphics();
        this.statusEffects.setDepth(2);
        
        this.updateHealthBar();
        this.startPatrolling();
    }
    
    startPatrolling() {
        if (!this.active || this.isFrozen) return;
        
        this.state = 'patrolling';
        this.stateTimer = 0;
        
        // Move side to side while patrolling
        const margin = 50;
        const newX = Phaser.Math.Between(margin, config.width - margin);
        const newY = Phaser.Math.Between(margin, config.height / 4); // Stay in top quarter
        
        // Calculate velocity for side movement
        const angle = Phaser.Math.Angle.Between(this.x, this.y, newX, newY);
        this.scene.physics.velocityFromRotation(angle, this.patrolSpeed, this.body.velocity);
        
        // Start movement loop with bound method
        this.scene.time.addEvent({
            delay: 16,
            callback: this.updateMovement,
            callbackScope: this,
            loop: false
        });
    }
    
    updateMovement() {
        if (!this.active || this.isFrozen) return;
        
        this.stateTimer += 16;
        
        // Always point toward home base
        const angle = Phaser.Math.Angle.Between(
            this.x, this.y,
            this.scene.homeBase.x, this.scene.homeBase.y
        );
        this.rotation = angle + Math.PI/2; // Add 90 degrees because triangle points upward by default
        
        switch (this.state) {
            case 'patrolling':
                // Check if it's time to dive
                if (this.stateTimer >= this.patrolDuration) {
                    this.state = 'horizontal';
                    this.stateTimer = 0;
                    this.pauseStarted = false;
                    
                    // Start horizontal movement
                    this.body.setVelocity(this.horizontalSpeed * this.horizontalDirection, 0);
                }
                // Bounce off screen edges during patrol
                else if (this.x <= 50 || this.x >= config.width - 50) {
                    this.body.velocity.x *= -1;
                }
                break;
                
            case 'horizontal':
                // After moving horizontally for 1 second, pause for 100ms before diving
                if (this.stateTimer >= 1000 && !this.pauseStarted) {
                    this.body.setVelocity(0, 0);
                    this.pauseStarted = true;
                    
                    // After 100ms pause, start diving
                    this.scene.time.delayedCall(100, () => {
                        if (this.active && !this.isFrozen) {
                            this.state = 'diving';
                            this.stateTimer = 0;
                            
                            // Start diving towards home base
                            const angle = Phaser.Math.Angle.Between(
                                this.x, this.y,
                                this.scene.homeBase.x, this.scene.homeBase.y
                            );
                            this.scene.physics.velocityFromRotation(angle, this.diveSpeed, this.body.velocity);
                        }
                    });
                }
                break;
                
            case 'diving':
                // Check for collision with home base
                const distance = Phaser.Math.Distance.Between(
                    this.x, this.y,
                    this.scene.homeBase.x, this.scene.homeBase.y
                );
                
                if (distance <= this.scene.homeBase.radius) {
                    // Create explosion effect and deal damage
                    this.explodeAtHomeBase();
                    return;
                }
                break;
        }
        
        // Continue updating movement if still active
        if (this.active && !this.isFrozen) {
            this.scene.time.addEvent({
                delay: 16,
                callback: this.updateMovement,
                callbackScope: this,
                loop: false
            });
        }
    }
    
    freeze() {
        if (this.isFrozen) return;
        
        this.isFrozen = true;
        this.body.setVelocity(0, 0);
        this.setFillStyle(0x00FFFF);
        
        this.scene.time.delayedCall(1000, () => {
            if (this.active) {
                this.isFrozen = false;
                this.setFillStyle(0xFF0000); // Reset to original red color
                this.startPatrolling();
            }
        });
    }
    
    updateHealthBar() {
        if (!this.active) return;
        
        this.healthBar.clear();
        this.statusEffects.clear();
        
        const barWidth = GAME_CONFIG.enemy.healthBar.width;
        const barHeight = GAME_CONFIG.enemy.healthBar.height;
        const barY = this.y - 25 - barHeight - GAME_CONFIG.enemy.healthBar.yOffset;
        const barX = this.x - barWidth/2;
        
        // Background (gray)
        this.healthBar.fillStyle(0x333333);
        this.healthBar.fillRect(barX, barY, barWidth, barHeight);
        // Health (red)
        this.healthBar.fillStyle(0xFF0000);
        this.healthBar.fillRect(barX, barY, (this.health / 100) * barWidth, barHeight);
        
        if (this.isFrozen) {
            this.statusEffects.fillStyle(0x00FFFF);
            this.statusEffects.fillCircle(barX, barY - 5, 3);
        }
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

    explodeAtHomeBase() {
        // Store scene reference and apply damage first
        const scene = this.scene;
        scene.updateHomeBaseHealth(GAME_CONFIG.homeBase.damageFromCollision);
        
        // Create explosion graphics
        const explosion = scene.add.graphics();
        explosion.setDepth(3);
        
        // Start explosion animation
        scene.tweens.add({
            targets: { progress: 0 },
            progress: 1,
            duration: 200,
            onUpdate: (tween) => {
                const progress = tween.targets[0].progress;
                explosion.clear();
                
                // Simple expanding circle that fades out
                const radius = 30 * (1 + progress);
                explosion.fillStyle(0xFF4444, 1 - progress);
                explosion.fillCircle(this.x, this.y, radius);
                
                // Inner bright flash
                explosion.fillStyle(0xFFFFFF, (1 - progress) * 0.8);
                explosion.fillCircle(this.x, this.y, radius * 0.6);
            },
            onComplete: () => {
                explosion.destroy();
            }
        });
        
        // Die after creating explosion
        this.die();
    }
}

