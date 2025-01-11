// Add viewport meta tag for mobile
const viewportMeta = document.createElement('meta');
viewportMeta.name = 'viewport';
viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
document.head.appendChild(viewportMeta);

// Helper functions for common operations
const createHealthBar = (scene, x, y, width, height = 4) => {
    const background = scene.add.rectangle(x, y, width, height, 0xff0000);
    const fill = scene.add.rectangle(x, y, width, height, 0x00ff00);
    return { background, fill };
};

const updateHealthBar = (healthBar, health, maxHealth) => {
    const healthPercent = Math.max(0, health / maxHealth);
    healthBar.fill.width = healthBar.background.width * healthPercent;
};

const createButton = (scene, x, y, size, color, text, cost) => {
    const button = scene.add.rectangle(x, y, size, size, color);
    const buttonText = scene.add.text(x, y, `${text}\n${cost}`, {
        fontSize: Math.max(size * 0.2, 10) + "px",
        fill: "#fff",
        align: 'center'
    }).setOrigin(0.5, 0.5);
    button.setInteractive({ draggable: true });
    return { button, text: buttonText };
};

const getTurretConfig = (type) => {
    const configs = {
        regular: {
            cost: GAME_CONFIG.mechanics.turretCost,
            size: TURRET_SIZE,
            color: GAME_CONFIG.colors.turret,
            range: TURRET_RANGE,
            moveSpeed: GAME_CONFIG.mechanics.turretMoveSpeed,
            fireRate: GAME_CONFIG.mechanics.turretFireRate,
            maxHealth: GAME_CONFIG.mechanics.turretMaxHealth,
            damage: GAME_CONFIG.mechanics.turretDamage,
            bulletColor: GAME_CONFIG.colors.bullet,
            bulletSize: BULLET_SIZE,
            bulletSpeed: GAME_CONFIG.mechanics.bulletSpeed
        },
        aoe: {
            cost: GAME_CONFIG.mechanics.aoeTurretCost,
            size: Math.max(30, GAME_CONFIG.sizes.aoeTurret * scale * 2),
            color: GAME_CONFIG.colors.aoeTurret,
            range: Math.max(100, GAME_CONFIG.ranges.aoeTurret * scale),
            moveSpeed: GAME_CONFIG.mechanics.aoeTurretMoveSpeed,
            fireRate: GAME_CONFIG.mechanics.aoeTurretFireRate,
            maxHealth: GAME_CONFIG.mechanics.aoeTurretMaxHealth,
            damage: GAME_CONFIG.mechanics.aoeTurretDamage,
            bulletColor: GAME_CONFIG.colors.aoeBullet,
            bulletSize: GAME_CONFIG.sizes.aoeBullet * scale,
            bulletSpeed: GAME_CONFIG.mechanics.aoeBulletSpeed
        },
        slow: {
            cost: GAME_CONFIG.mechanics.slowTurretCost,
            size: Math.max(30, GAME_CONFIG.sizes.slowTurret * scale * 2),
            color: GAME_CONFIG.colors.slowTurret,
            range: Math.max(100, GAME_CONFIG.ranges.slowTurret * scale),
            moveSpeed: GAME_CONFIG.mechanics.slowTurretMoveSpeed,
            fireRate: GAME_CONFIG.mechanics.slowTurretFireRate,
            maxHealth: GAME_CONFIG.mechanics.slowTurretMaxHealth,
            damage: GAME_CONFIG.mechanics.slowTurretDamage,
            bulletColor: GAME_CONFIG.colors.slowBullet,
            bulletSize: GAME_CONFIG.sizes.slowBullet * scale,
            bulletSpeed: GAME_CONFIG.mechanics.slowBulletSpeed
        }
    };
    return configs[type];
};

const createTurret = (scene, x, y, config) => {
    const turret = scene.add.rectangle(x, y, config.size, config.size, config.color);
    scene.physics.add.existing(turret, false);
    turret.body.setCollideWorldBounds(true);
    turret.body.setBoundsRectangle(new Phaser.Geom.Rectangle(0, 0, gameWidth, playHeight));
    turret.body.setDrag(GAME_CONFIG.mechanics.turretDrag);
    turret.body.setMaxVelocity(config.moveSpeed);
    turret.body.setAngularDrag(GAME_CONFIG.mechanics.turretAngularDrag);
    turret.fireRate = config.fireRate;
    turret.lastFired = 0;
    turret.maxHealth = config.maxHealth;
    turret.health = config.maxHealth;
    turret.damage = config.damage;
    turret.bulletConfig = {
        color: config.bulletColor,
        size: config.bulletSize,
        speed: config.bulletSpeed
    };
    
    // Add health bar
    const healthBar = createHealthBar(scene, x, y - config.size * 0.7, config.size);
    turret.healthBar = healthBar;
    
    // Add cooldown bar
    const cooldownBar = scene.add.rectangle(
        x,
        y + config.size * 0.7,
        config.size,
        GAME_CONFIG.sizes.cooldownBarHeight,
        GAME_CONFIG.colors.cooldownBar
    );
    turret.cooldownBar = cooldownBar;
    
    // Add range indicator
    const rangeIndicator = scene.add.circle(x, y, config.range);
    rangeIndicator.setStrokeStyle(
        GAME_CONFIG.effects.rangeIndicatorLineWidth,
        config.color,
        GAME_CONFIG.effects.rangeIndicatorAlpha
    );
    turret.rangeIndicator = rangeIndicator;
    
    return turret;
};

const createBullet = (scene, turret, target) => {
    const bullet = scene.add.circle(
        turret.x,
        turret.y,
        turret.bulletConfig.size,
        turret.bulletConfig.color
    );
    scene.physics.add.existing(bullet, false);
    bullet.body.setCollideWorldBounds(false);
    scene.bullets.add(bullet);
    
    bullet.targetEnemy = target;
    scene.physics.moveToObject(bullet, target, turret.bulletConfig.speed);
    
    bullet.checkCollision = () => {
        if (bullet.targetEnemy.active) {
            const dx = bullet.x - bullet.targetEnemy.x;
            const dy = bullet.y - bullet.targetEnemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < ENEMY_SIZE) {
                bullet.targetEnemy.health -= turret.damage;
                createDamageNumber(scene, bullet.targetEnemy.x, bullet.targetEnemy.y, turret.damage, turret.isSlowTurret ? '#66ffff' : '#ff0000');
                updateHealthBar(bullet.targetEnemy.healthBar, bullet.targetEnemy.health, bullet.targetEnemy.maxHealth);
                
                // Apply slow effect if it's a slow turret
                if (turret.isSlowTurret) {
                    bullet.targetEnemy.slowFactor = 0.3;
                    bullet.targetEnemy.slowUntil = scene.time.now + GAME_CONFIG.mechanics.slowDuration;
                    
                    // Visual feedback for slow effect using setFillStyle
                    const originalColor = bullet.targetEnemy.fillColor;
                    bullet.targetEnemy.setFillStyle(GAME_CONFIG.colors.slowTurret);
                    scene.time.delayedCall(GAME_CONFIG.mechanics.slowDuration, () => {
                        if (bullet.targetEnemy.active) {
                            bullet.targetEnemy.slowFactor = 1;
                            bullet.targetEnemy.setFillStyle(GAME_CONFIG.colors.enemy);
                        }
                    });
                }
                
                if (bullet.targetEnemy.health <= 0) {
                    if (bullet.targetEnemy.healthBar) {
                        bullet.targetEnemy.healthBar.background.destroy();
                        bullet.targetEnemy.healthBar.fill.destroy();
                    }
                    bullet.targetEnemy.destroy();
                    score += GAME_CONFIG.mechanics.enemyKillScore;
                    scene.scoreText.setText(`Score: ${score}`);
                }
                bullet.destroy();
            }
        }
    };
    
    setTimeout(() => {
        if (bullet && !bullet.destroyed) {
            bullet.destroy();
        }
    }, GAME_CONFIG.mechanics.bulletLifetime);
    
    return bullet;
};

// Game configuration and constants
const GAME_CONFIG = {
    // Base dimensions
    baseWidth: 800,
    baseHeight: 600,
    
    // Colors
    colors: {
        background: "#000000",
        core: 0x00ff00,
        enemy: 0xff0000,
        turret: 0x666666,
        aoeTurret: 0x9933cc,  // Purple color for AOE turret
        slowTurret: 0x00ccff,  // Light blue color for slow turret
        resource: 0x0000ff,
        bullet: 0xff6666,
        aoeBullet: 0xff99ff,  // Light purple for AOE projectile
        slowBullet: 0x66ffff,  // Light cyan for slow projectile
        aoeExplosion: 0xff66ff,  // Bright purple for explosion
        uiZone: 0x333333,
        cooldownBar: 0xffffff,
    },
    
    // Sizes (before scaling)
    sizes: {
        core: 20,
        resource: 15,
        enemy: 20,
        turret: 20,
        aoeTurret: 25,  // Slightly larger than regular turret
        slowTurret: 22,  // Medium size for slow turret
        bullet: 5,
        aoeBullet: 8,  // Larger projectile for AOE
        slowBullet: 6,  // Medium size for slow projectile
        cooldownBarHeight: 4,
        aoeExplosion: 100,  // Size of AOE explosion
    },
    
    // Ranges (before scaling)
    ranges: {
        turret: 200,
        aoeTurret: 250,  // Longer range for AOE turret
        slowTurret: 225,  // Medium range for slow turret
        orbitDistance: 0.4,
        followDistance: 0.5,
        aoeRadius: 300,  // Increased from 150 to 300 for much larger cone
        coneAngle: Math.PI * 3/4,  // 135-degree cone (up from 120)
    },
    
    // Game mechanics
    mechanics: {
        turretCost: 20,
        aoeTurretCost: 40,  // More expensive than regular turret
        slowTurretCost: 30,  // Medium cost for slow turret
        turretFireRate: 2000,
        aoeTurretFireRate: 1500,  // Faster fire rate for AOE turret
        slowTurretFireRate: 1750,  // Medium fire rate for slow turret
        turretMoveSpeed: 40,
        aoeTurretMoveSpeed: 30,  // Slower movement for AOE turret
        slowTurretMoveSpeed: 35,  // Medium movement speed for slow turret
        turretDrag: 50,
        turretAngularDrag: 50,
        bulletSpeed: 300,
        aoeBulletSpeed: 200,  // Slower projectile for AOE
        slowBulletSpeed: 250,  // Medium speed for slow projectile
        bulletLifetime: 1000,
        aoeExplosionDuration: 300,  // Shorter duration for snappier feedback
        slowDuration: 3000,  // How long the slow effect lasts
        slowFactor: 0.5,  // How much to slow enemies (0.5 = 50% speed)
        coreSpeed: 200,
        enemyBaseSpeed: 30,
        enemySpeedIncreasePerWave: 5,
        resourceValue: 10,
        enemyDamage: 10,
        turretScoreValue: 10,
        waveDelay: 3000,
        initialCoreHealth: 100,
        enemyKillScore: 10,
        turretMaxHealth: 100,  // Base turret health
        aoeTurretMaxHealth: 150,  // AOE turret has more health
        slowTurretMaxHealth: 125,  // Slow turret medium health
        enemyAttackRate: 1000,  // Time between enemy attacks in ms
        damageNumberSpeed: 100,  // Speed at which damage numbers float up
        damageNumberLifetime: 1000,  // How long damage numbers stay visible
        damageNumberDistance: 30,  // How far damage numbers float up
        enemyBaseHealth: 50,  // Base health for enemies
        enemyHealthIncreasePerWave: 10,  // Health increase per wave
        turretDamage: 20,  // Regular turret damage
        aoeTurretDamage: 30,  // AOE turret damage
        slowTurretDamage: 15,  // Slow turret damage
    },
    
    // Visual effects
    effects: {
        turretShootScale: 1.1,
        turretShootDuration: 50,
        turretPlaceScale: 1.2,
        turretPlaceDuration: 200,
        cooldownBarOffset: 0.8,  // How far above turret the cooldown bar appears
        rangeIndicatorAlpha: 0.4,
        rangePreviewAlpha: 0.6,
        rangeIndicatorLineWidth: 1,
        rangePreviewLineWidth: 2,
    },
    
    // UI
    ui: {
        minFontSize: 14,
        baseFontSize: 20,
        uiHeightPercent: 0.15,
        maxUiHeight: 100,
        scorePopupDuration: 1000,
        scorePopupDistance: 50,
    }
};

const gameWidth = window.innerWidth;
const gameHeight = window.innerHeight;
const uiHeight = Math.min(GAME_CONFIG.ui.maxUiHeight, gameHeight * GAME_CONFIG.ui.uiHeightPercent);
const playHeight = gameHeight - uiHeight;

// Adjust scale calculation for better mobile display
const scale = Math.min(
    gameWidth / GAME_CONFIG.baseWidth,
    playHeight / GAME_CONFIG.baseHeight,
    1
) * 0.5;

// Scale factors for game objects - adjusted for better mobile visibility
const CORE_SIZE = Math.max(15, GAME_CONFIG.sizes.core * scale);
const RESOURCE_SIZE = Math.max(10, GAME_CONFIG.sizes.resource * scale);
const ENEMY_SIZE = Math.max(15, GAME_CONFIG.sizes.enemy * scale);
const TURRET_SIZE = Math.max(30, GAME_CONFIG.sizes.turret * scale * 2);  // Doubled turret size
const BULLET_SIZE = Math.max(3, GAME_CONFIG.sizes.bullet * scale);
const TURRET_RANGE = Math.max(100, GAME_CONFIG.ranges.turret * scale);
const TURRET_BUTTON_SIZE = uiHeight;

const config = {
    type: Phaser.AUTO,
    width: gameWidth,
    height: gameHeight,
    backgroundColor: GAME_CONFIG.colors.background,
    physics: {
        default: "arcade",
        arcade: {
            debug: false,
        },
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        parent: 'game',
        width: gameWidth,
        height: gameHeight,
        min: {
            width: 300,
            height: 400
        },
        max: {
            width: 1600,
            height: 1200
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update,
    },
};

const game = new Phaser.Game(config);

let pulseCore;
let resources;
let enemies;
let turrets;
let playerResources = 100;
let score = 0;
let wave = 1;
let coreHealth = 100;

// Add helper function to create floating damage numbers
const createDamageNumber = (scene, x, y, damage, color = '#ff0000') => {
    const text = scene.add.text(x, y, `-${damage}`, {
        fontSize: '16px',
        fill: color,
        stroke: '#000000',
        strokeThickness: 2
    }).setOrigin(0.5, 0.5);
    
    // Add some random horizontal spread
    const randomX = (Math.random() - 0.5) * 20;
    
    // Animate the damage number floating up and fading out
    scene.tweens.add({
        targets: text,
        y: y - GAME_CONFIG.mechanics.damageNumberDistance,
        x: x + randomX,
        alpha: 0,
        duration: GAME_CONFIG.mechanics.damageNumberLifetime,
        ease: 'Cubic.out',
        onComplete: () => text.destroy()
    });
};

function preload() {
    // No assets needed for this version
}

function create() {
    // Create the pulse core (player)
    pulseCore = this.add.circle(gameWidth/2, playHeight/2, CORE_SIZE, GAME_CONFIG.colors.core);
    this.physics.add.existing(pulseCore);
    pulseCore.body.setCollideWorldBounds(true);
    pulseCore.body.setBoundsRectangle(new Phaser.Geom.Rectangle(0, 0, gameWidth, playHeight));

    // Create UI zone at the bottom
    const uiZone = this.add.rectangle(gameWidth/2, gameHeight - uiHeight/2, gameWidth, uiHeight, GAME_CONFIG.colors.uiZone);
    uiZone.setOrigin(0.5, 0.5);
    
    // Create turret buttons using helper function
    const { button: turretButton } = createButton(
        this,
        gameWidth/2 - TURRET_BUTTON_SIZE,
        gameHeight - uiHeight/2,
        TURRET_BUTTON_SIZE,
        GAME_CONFIG.colors.turret,
        "Turret",
        GAME_CONFIG.mechanics.turretCost
    );
    
    const { button: aoeTurretButton } = createButton(
        this,
        gameWidth/2 + TURRET_BUTTON_SIZE,
        gameHeight - uiHeight/2,
        TURRET_BUTTON_SIZE,
        GAME_CONFIG.colors.aoeTurret,
        "AOE",
        GAME_CONFIG.mechanics.aoeTurretCost
    );
    
    const { button: slowTurretButton } = createButton(
        this,
        gameWidth/2 + TURRET_BUTTON_SIZE * 2,
        gameHeight - uiHeight/2,
        TURRET_BUTTON_SIZE,
        GAME_CONFIG.colors.slowTurret,
        "Slow",
        GAME_CONFIG.mechanics.slowTurretCost
    );

    // Track if we're currently placing a turret
    let placingTurret = null;
    let rangeCircle = null;
    let currentTurretType = null;

    // Handle drag start for all turret types
    const startDrag = (pointer, type) => {
        const config = getTurretConfig(type);
        if (playerResources >= config.cost && !placingTurret) {
            currentTurretType = type;
            placingTurret = this.add.rectangle(pointer.x, pointer.y, config.size, config.size, config.color);
            
            rangeCircle = this.add.circle(pointer.x, pointer.y, config.range);
            rangeCircle.setStrokeStyle(
                GAME_CONFIG.effects.rangePreviewLineWidth,
                config.color,
                GAME_CONFIG.effects.rangePreviewAlpha
            );

            if (type === 'aoe') {
                const aoePreview = this.add.circle(pointer.x, pointer.y, GAME_CONFIG.ranges.aoeRadius * scale);
                aoePreview.setStrokeStyle(1, GAME_CONFIG.colors.aoeExplosion, 0.3);
                placingTurret.aoePreview = aoePreview;
            }
        }
    };

    turretButton.on("dragstart", (pointer) => startDrag(pointer, 'regular'));
    aoeTurretButton.on("dragstart", (pointer) => startDrag(pointer, 'aoe'));
    slowTurretButton.on("dragstart", (pointer) => startDrag(pointer, 'slow'));

    // Handle drag for all turret types
    const handleDrag = (pointer) => {
        if (placingTurret) {
            placingTurret.x = pointer.x;
            placingTurret.y = pointer.y;
            rangeCircle.x = pointer.x;
            rangeCircle.y = pointer.y;
            if (placingTurret.aoePreview) {
                placingTurret.aoePreview.x = pointer.x;
                placingTurret.aoePreview.y = pointer.y;
            }
        }
    };

    turretButton.on("drag", handleDrag);
    aoeTurretButton.on("drag", handleDrag);
    slowTurretButton.on("drag", handleDrag);

    // Handle drag end for all turret types
    const endDrag = (pointer) => {
        if (!placingTurret) return;

        const config = getTurretConfig(currentTurretType);
        if (playerResources >= config.cost) {
            const turret = createTurret(this, pointer.x, pointer.y, config);
            turret.isAOE = currentTurretType === 'aoe';
            turret.isSlowTurret = currentTurretType === 'slow';
            turrets.add(turret);
            
            playerResources -= config.cost;
            this.resourceText.setText(`Resources: ${playerResources}`);
            
            // Visual feedback
            this.tweens.add({
                targets: turret,
                scaleX: GAME_CONFIG.effects.turretPlaceScale,
                scaleY: GAME_CONFIG.effects.turretPlaceScale,
                duration: GAME_CONFIG.effects.turretPlaceDuration,
                yoyo: true
            });
        }

        // Clean up placement mode
        if (placingTurret) {
            placingTurret.destroy();
            rangeCircle.destroy();
            if (placingTurret.aoePreview) {
                placingTurret.aoePreview.destroy();
            }
            placingTurret = null;
            rangeCircle = null;
            currentTurretType = null;
        }
    };

    turretButton.on("dragend", endDrag);
    aoeTurretButton.on("dragend", endDrag);
    slowTurretButton.on("dragend", endDrag);

    // Cancel placement with right click
    this.input.on("pointerdown", (pointer) => {
        if (placingTurret && pointer.rightButtonDown()) {
            placingTurret.destroy();
            rangeCircle.destroy();
            if (placingTurret.aoePreview) {
                placingTurret.aoePreview.destroy();
            }
            placingTurret = null;
            rangeCircle = null;
            currentTurretType = null;
        }
    });

    // Create a group for bullets
    this.bullets = this.physics.add.group();

    // Enemy collision with core
    this.physics.add.overlap(pulseCore, enemies, (core, enemy) => {
        enemy.destroy();
        coreHealth -= GAME_CONFIG.mechanics.enemyDamage;
        this.healthText.setText(`Core Health: ${coreHealth}`);
        
        if (coreHealth <= 0) {
            this.add.text(gameWidth/2, gameHeight/2, 'GAME OVER', {
                fontSize: '64px',
                fill: '#ff0000'
            }).setOrigin(0.5);
            this.scene.pause();
        }

        // Visual feedback using color change
        pulseCore.setFillStyle(0xff0000);
        this.cameras.main.shake(200, 0.005);
        setTimeout(() => pulseCore.setFillStyle(GAME_CONFIG.colors.core), 200);
    });

    // Create groups for game objects
    enemies = this.physics.add.group({
        collideWorldBounds: true,
        bounceX: 0.5,
        bounceY: 0.5
    });
    turrets = this.physics.add.group({
        collideWorldBounds: true,
        immovable: true
    });

    // Add collisions
    this.physics.add.collider(turrets, turrets);
    this.physics.add.collider(enemies, turrets);
    this.physics.add.collider(enemies, enemies);

    // Add HUD with scaled font sizes
    const fontSize = Math.max(20 * scale, 14);
    this.resourceText = this.add.text(10, 10, "Resources: 100", {
        fontSize: fontSize + "px",
        fill: "#fff",
    });
    this.scoreText = this.add.text(10, 10 + fontSize * 1.5, "Score: 0", {
        fontSize: fontSize + "px",
        fill: "#fff",
    });
    this.waveText = this.add.text(10, 10 + fontSize * 3, "Wave: 1", {
        fontSize: fontSize + "px",
        fill: "#fff",
    });
    this.healthText = this.add.text(10, 10 + fontSize * 4.5, "Core Health: 100", {
        fontSize: fontSize + "px",
        fill: "#fff",
    });

    // Function to spawn a single enemy
    const spawnEnemy = () => {
        const spawnSide = Phaser.Math.Between(0, 3);
        let x, y;
        switch(spawnSide) {
            case 0: x = Phaser.Math.Between(0, gameWidth); y = 0; break;
            case 1: x = gameWidth; y = Phaser.Math.Between(0, playHeight); break;
            case 2: x = Phaser.Math.Between(0, gameWidth); y = playHeight; break;
            case 3: x = 0; y = Phaser.Math.Between(0, playHeight); break;
        }
        
        const enemy = this.add.rectangle(x, y, ENEMY_SIZE, ENEMY_SIZE, GAME_CONFIG.colors.enemy);
        this.physics.add.existing(enemy, false);
        enemy.body.setCollideWorldBounds(true);
        enemy.body.setBoundsRectangle(new Phaser.Geom.Rectangle(0, 0, gameWidth, playHeight));
        enemy.body.setMass(1);
        enemy.body.setFriction(0);
        enemy.body.setBounce(0.5);
        enemy.body.setDrag(100);
        
        // Add health to enemy
        enemy.maxHealth = GAME_CONFIG.mechanics.enemyBaseHealth + (wave - 1) * GAME_CONFIG.mechanics.enemyHealthIncreasePerWave;
        enemy.health = enemy.maxHealth;
        
        // Add health bar using helper function
        enemy.healthBar = createHealthBar(
            this,
            x,
            y - ENEMY_SIZE * 0.7,
            ENEMY_SIZE
        );
        
        enemies.add(enemy);
        
        // Move towards core
        const targetY = Phaser.Math.Clamp(pulseCore.y, 0, playHeight);
        const targetX = Phaser.Math.Clamp(pulseCore.x, 0, gameWidth);
        this.physics.moveTo(enemy, targetX, targetY, 
            GAME_CONFIG.mechanics.enemyBaseSpeed + wave * GAME_CONFIG.mechanics.enemySpeedIncreasePerWave);
        
        wave++;
        this.waveText.setText(`Wave: ${wave}`);
    };

    // Spawn first enemy immediately
    spawnEnemy();

    // Spawn enemies with increasing difficulty
    this.time.addEvent({
        delay: GAME_CONFIG.mechanics.waveDelay,
        callback: spawnEnemy,
        loop: true
    });

    // Add core movement on click (only outside UI zone)
    this.input.on("pointerdown", (pointer) => {
        if (pointer.y < playHeight) {
            this.physics.moveToObject(pulseCore, pointer, GAME_CONFIG.mechanics.coreSpeed * scale);
        }
    });
}

function update() {
    // Update enemy movement targets and health bars
    enemies.getChildren().forEach((enemy) => {
        // Update health bar positions
        if (enemy.healthBar) {
            enemy.healthBar.background.x = enemy.x;
            enemy.healthBar.background.y = enemy.y - enemy.height * 0.7;
            enemy.healthBar.fill.x = enemy.x;
            enemy.healthBar.fill.y = enemy.y - enemy.height * 0.7;
        }

        // Find nearest turret or target core if no turrets
        let nearestTarget = null;
        let shortestDistance = Infinity;
        
        turrets.getChildren().forEach((turret) => {
            const dx = turret.x - enemy.x;
            const dy = turret.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < shortestDistance) {
                shortestDistance = distance;
                nearestTarget = turret;
            }
        });
        
        // Calculate enemy speed considering slow effect
        const baseSpeed = GAME_CONFIG.mechanics.enemyBaseSpeed + wave * GAME_CONFIG.mechanics.enemySpeedIncreasePerWave;
        const slowFactor = enemy.slowFactor || 1;
        const currentSpeed = baseSpeed * slowFactor;
        
        // If no turrets or all turrets destroyed, target core
        if (!nearestTarget) {
            const targetY = Phaser.Math.Clamp(pulseCore.y, 0, playHeight);
            const targetX = Phaser.Math.Clamp(pulseCore.x, 0, gameWidth);
            this.physics.moveTo(enemy, targetX, targetY, currentSpeed);
            return;
        }
        
        // Move towards nearest turret
        this.physics.moveTo(enemy, nearestTarget.x, nearestTarget.y, currentSpeed);
        
        // Check if close enough to attack
        const attackRange = ENEMY_SIZE + TURRET_SIZE * 0.75;
        const dx = nearestTarget.x - enemy.x;
        const dy = nearestTarget.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < attackRange) {
            const currentTime = this.time.now;
            if (!enemy.lastAttack || currentTime - enemy.lastAttack >= GAME_CONFIG.mechanics.enemyAttackRate) {
                // Attack the turret
                nearestTarget.health -= GAME_CONFIG.mechanics.enemyDamage;
                enemy.lastAttack = currentTime;
                
                createDamageNumber(this, nearestTarget.x, nearestTarget.y, GAME_CONFIG.mechanics.enemyDamage);
                updateHealthBar(nearestTarget.healthBar, nearestTarget.health, nearestTarget.maxHealth);
                
                // Visual feedback for damage
                nearestTarget.setAlpha(0.5);
                this.tweens.add({
                    targets: nearestTarget,
                    alpha: 1,
                    duration: 100
                });
                
                // Destroy turret if health depleted
                if (nearestTarget.health <= 0) {
                    if (nearestTarget.healthBar) {
                        nearestTarget.healthBar.background.destroy();
                        nearestTarget.healthBar.fill.destroy();
                    }
                    if (nearestTarget.cooldownBar) nearestTarget.cooldownBar.destroy();
                    if (nearestTarget.rangeIndicator) nearestTarget.rangeIndicator.destroy();
                    if (nearestTarget.aoeIndicator) nearestTarget.aoeIndicator.destroy();
                    nearestTarget.destroy();
                }
            }
        }
    });

    // Check bullet collisions
    this.bullets.getChildren().forEach((bullet) => {
        if (bullet.checkCollision) {
            bullet.checkCollision();
        }
    });

    // Update turret positions and states
    turrets.getChildren().forEach((turret, index) => {
        // Calculate ideal formation position
        const totalTurrets = turrets.getChildren().length;
        const angleStep = (2 * Math.PI) / totalTurrets;
        const idealAngle = index * angleStep;
        const idealDistance = TURRET_RANGE * GAME_CONFIG.ranges.orbitDistance;
        
        const idealX = pulseCore.x + Math.cos(idealAngle) * idealDistance;
        const idealY = pulseCore.y + Math.sin(idealAngle) * idealDistance;
        
        // Calculate repulsion from other turrets
        let repulsionX = 0;
        let repulsionY = 0;
        const minDistance = TURRET_SIZE * 2;
        
        turrets.getChildren().forEach((otherTurret) => {
            if (otherTurret !== turret) {
                const otherDx = turret.x - otherTurret.x;
                const otherDy = turret.y - otherTurret.y;
                const otherDistance = Math.sqrt(otherDx * otherDx + otherDy * otherDy);
                
                if (otherDistance < minDistance) {
                    const repulsionForce = (minDistance - otherDistance) / minDistance * 30;
                    repulsionX += (otherDx / otherDistance) * repulsionForce;
                    repulsionY += (otherDy / otherDistance) * repulsionForce;
                }
            }
        });
        
        // Move towards ideal position with dampening
        const toIdealX = idealX - turret.x;
        const toIdealY = idealY - turret.y;
        const distanceToIdeal = Math.sqrt(toIdealX * toIdealX + toIdealY * toIdealY);
        
        if (distanceToIdeal > 5) {
            const moveSpeed = Math.min(turret.body.maxVelocity.x, distanceToIdeal * 2);
            const targetVelX = (toIdealX / distanceToIdeal) * moveSpeed;
            const targetVelY = (toIdealY / distanceToIdeal) * moveSpeed;
            
            turret.body.setVelocity(
                targetVelX + repulsionX,
                targetVelY + repulsionY
            );
        } else {
            turret.body.setVelocity(0, 0);
        }

        // Update visual elements positions
        if (turret.rangeIndicator) {
            turret.rangeIndicator.x = turret.x;
            turret.rangeIndicator.y = turret.y;
        }
        if (turret.healthBar) {
            turret.healthBar.background.x = turret.x;
            turret.healthBar.background.y = turret.y - turret.height * 0.7;
            turret.healthBar.fill.x = turret.x;
            turret.healthBar.fill.y = turret.y - turret.height * 0.7;
        }
        if (turret.cooldownBar) {
            turret.cooldownBar.x = turret.x;
            turret.cooldownBar.y = turret.y + turret.height * 0.7;
            
            // Update cooldown bar width
            const timeSinceLastShot = this.time.now - turret.lastFired;
            const cooldownProgress = Math.min(timeSinceLastShot / turret.fireRate, 1);
            turret.cooldownBar.width = turret.width * (1 - cooldownProgress);
        }
        if (turret.aoeIndicator) {
            turret.aoeIndicator.x = turret.x;
            turret.aoeIndicator.y = turret.y;
        }

        // Handle turret shooting
        if (this.time.now - turret.lastFired >= turret.fireRate) {
            const range = turret.isAOE ? Math.max(100, GAME_CONFIG.ranges.aoeTurret * scale) : 
                         turret.isSlowTurret ? Math.max(100, GAME_CONFIG.ranges.slowTurret * scale) : 
                         TURRET_RANGE;
            
            const nearestEnemy = enemies.getChildren().reduce((closest, enemy) => {
                const distance = Phaser.Math.Distance.Between(turret.x, turret.y, enemy.x, enemy.y);
                if (!closest || distance < closest.distance) {
                    return { enemy, distance };
                }
                return closest;
            }, null);

            if (nearestEnemy && nearestEnemy.distance < range) {
                if (turret.isAOE) {
                    // Handle AOE attack
                    const dx = nearestEnemy.enemy.x - turret.x;
                    const dy = nearestEnemy.enemy.y - turret.y;
                    const angle = Math.atan2(dy, dx);
                    
                    // Create cone visualization
                    const graphics = this.add.graphics();
                    const coneAngle = GAME_CONFIG.ranges.coneAngle;
                    const startAngle = angle - coneAngle / 2;
                    const endAngle = angle + coneAngle / 2;
                    const coneLength = GAME_CONFIG.ranges.aoeRadius * scale;
                    
                    // Draw cone
                    graphics.lineStyle(3, GAME_CONFIG.colors.aoeBullet, 0.8);
                    graphics.beginPath();
                    graphics.moveTo(turret.x, turret.y);
                    graphics.lineTo(
                        turret.x + Math.cos(startAngle) * coneLength,
                        turret.y + Math.sin(startAngle) * coneLength
                    );
                    graphics.arc(turret.x, turret.y, coneLength, startAngle, endAngle);
                    graphics.lineTo(turret.x, turret.y);
                    graphics.strokePath();
                    graphics.fillStyle(GAME_CONFIG.colors.aoeExplosion, 0.4);
                    graphics.fill();
                    
                    // Find and damage enemies in cone
                    const enemiesToDestroy = [];
                    enemies.getChildren().forEach((enemy) => {
                        const enemyDx = enemy.x - turret.x;
                        const enemyDy = enemy.y - turret.y;
                        const enemyAngle = Math.atan2(enemyDy, enemyDx);
                        const enemyDistance = Math.sqrt(enemyDx * enemyDx + enemyDy * enemyDy);
                        
                        const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(enemyAngle - angle));
                        if (enemyDistance <= coneLength && angleDiff <= coneAngle / 2) {
                            enemy.health -= turret.damage;
                            createDamageNumber(this, enemy.x, enemy.y, turret.damage, '#ff99ff');
                            updateHealthBar(enemy.healthBar, enemy.health, enemy.maxHealth);
                            
                            if (enemy.health <= 0) {
                                if (enemy.healthBar) {
                                    enemy.healthBar.background.destroy();
                                    enemy.healthBar.fill.destroy();
                                }
                                enemiesToDestroy.push(enemy);
                            }
                        }
                    });

                    // Destroy dead enemies
                    enemiesToDestroy.forEach(enemy => {
                        enemy.destroy();
                        score += GAME_CONFIG.mechanics.enemyKillScore;
                    });
                    this.scoreText.setText(`Score: ${score}`);

                    // Animate cone fade out
                    this.tweens.add({
                        targets: graphics,
                        alpha: 0,
                        duration: GAME_CONFIG.mechanics.aoeExplosionDuration,
                        onComplete: () => graphics.destroy()
                    });
                } else {
                    // Regular or slow turret shooting
                    createBullet(this, turret, nearestEnemy.enemy);
                }

                turret.lastFired = this.time.now;
                
                // Visual feedback for shooting
                this.tweens.add({
                    targets: turret,
                    scaleX: GAME_CONFIG.effects.turretShootScale,
                    scaleY: GAME_CONFIG.effects.turretShootScale,
                    duration: GAME_CONFIG.effects.turretShootDuration,
                    yoyo: true
                });
            }
        }
    });

    // Stop core movement when near destination
    if (Phaser.Math.Distance.Between(
        pulseCore.x,
        pulseCore.y,
        this.input.activePointer.worldX,
        this.input.activePointer.worldY
    ) < 10) {
        pulseCore.body.setVelocity(0);
    }
}

// Update resize handler
window.addEventListener('resize', () => {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;
    const newUIHeight = Math.min(100, newHeight * 0.15);
    const newPlayHeight = newHeight - newUIHeight;
    
    // Update scale with the same constraints
    const newScale = Math.min(
        newWidth / GAME_CONFIG.baseWidth,
        newPlayHeight / GAME_CONFIG.baseHeight,
        1
    ) * 0.5;

    // Update global variables
    gameWidth = newWidth;
    gameHeight = newHeight;
    uiHeight = newUIHeight;
    playHeight = newPlayHeight;
    scale = newScale;

    // Resize the game
    game.scale.resize(newWidth, newHeight);
});
