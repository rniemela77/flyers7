// Add viewport meta tag for mobile
const viewportMeta = document.createElement('meta');
viewportMeta.name = 'viewport';
viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
document.head.appendChild(viewportMeta);

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
        resource: 0x0000ff,
        bullet: 0xff6666,
        aoeBullet: 0xff99ff,  // Light purple for AOE projectile
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
        bullet: 5,
        aoeBullet: 8,  // Larger projectile for AOE
        cooldownBarHeight: 4,
        aoeExplosion: 100,  // Size of AOE explosion
    },
    
    // Ranges (before scaling)
    ranges: {
        turret: 200,
        aoeTurret: 250,  // Longer range for AOE turret
        orbitDistance: 0.4,
        followDistance: 0.5,
        aoeRadius: 300,  // Increased from 150 to 300 for much larger cone
        coneAngle: Math.PI * 3/4,  // 135-degree cone (up from 120)
    },
    
    // Game mechanics
    mechanics: {
        turretCost: 20,
        aoeTurretCost: 40,  // More expensive than regular turret
        turretFireRate: 2000,
        aoeTurretFireRate: 1500,  // Faster fire rate for AOE turret
        turretMoveSpeed: 40,
        aoeTurretMoveSpeed: 30,  // Slower movement for AOE turret
        turretDrag: 50,
        turretAngularDrag: 50,
        bulletSpeed: 300,
        aoeBulletSpeed: 200,  // Slower projectile for AOE
        bulletLifetime: 1000,
        aoeExplosionDuration: 300,  // Shorter duration for snappier feedback
        coreSpeed: 200,
        enemyBaseSpeed: 30,
        enemySpeedIncreasePerWave: 5,
        resourceValue: 10,
        enemyDamage: 10,
        turretScoreValue: 10,
        waveDelay: 3000,
        initialCoreHealth: 100,
        enemyKillScore: 10,
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
    
    // Add regular turret placement button in UI zone
    const turretButton = this.add.rectangle(
        gameWidth/2 - TURRET_BUTTON_SIZE,  // Moved left to make room for second button
        gameHeight - uiHeight/2,
        TURRET_BUTTON_SIZE,
        TURRET_BUTTON_SIZE,
        GAME_CONFIG.colors.turret
    );
    
    // Add AOE turret placement button
    const aoeTurretButton = this.add.rectangle(
        gameWidth/2 + TURRET_BUTTON_SIZE,  // Positioned to the right
        gameHeight - uiHeight/2,
        TURRET_BUTTON_SIZE,
        TURRET_BUTTON_SIZE,
        GAME_CONFIG.colors.aoeTurret
    );
    
    // Center the text in the buttons
    const turretText = this.add.text(
        gameWidth/2 - TURRET_BUTTON_SIZE,
        gameHeight - uiHeight/2,
        "Turret\n20",
        { 
            fontSize: Math.max(uiHeight * 0.2, 10) + "px",
            fill: "#fff",
            align: 'center'
        }
    );
    turretText.setOrigin(0.5, 0.5);

    const aoeTurretText = this.add.text(
        gameWidth/2 + TURRET_BUTTON_SIZE,
        gameHeight - uiHeight/2,
        "AOE\n40",
        { 
            fontSize: Math.max(uiHeight * 0.2, 10) + "px",
            fill: "#fff",
            align: 'center'
        }
    );
    aoeTurretText.setOrigin(0.5, 0.5);
    
    turretButton.setInteractive({ draggable: true });
    aoeTurretButton.setInteractive({ draggable: true });

    // Track if we're currently placing a turret
    let placingTurret = null;
    let rangeCircle = null;
    let isPlacingAOE = false;  // Track which type we're placing

    // Handle drag start for regular turret
    turretButton.on("dragstart", (pointer) => {
        if (playerResources >= GAME_CONFIG.mechanics.turretCost && !placingTurret) {
            isPlacingAOE = false;
            placingTurret = this.add.rectangle(
                pointer.x,
                pointer.y,
                TURRET_SIZE,
                TURRET_SIZE,
                GAME_CONFIG.colors.turret
            );
            
            rangeCircle = this.add.circle(pointer.x, pointer.y, TURRET_RANGE);
            rangeCircle.setStrokeStyle(
                GAME_CONFIG.effects.rangePreviewLineWidth,
                GAME_CONFIG.colors.turret,
                GAME_CONFIG.effects.rangePreviewAlpha
            );
        }
    });

    // Handle drag start for AOE turret
    aoeTurretButton.on("dragstart", (pointer) => {
        if (playerResources >= GAME_CONFIG.mechanics.aoeTurretCost && !placingTurret) {
            isPlacingAOE = true;
            placingTurret = this.add.rectangle(
                pointer.x,
                pointer.y,
                Math.max(30, GAME_CONFIG.sizes.aoeTurret * scale * 2),
                Math.max(30, GAME_CONFIG.sizes.aoeTurret * scale * 2),
                GAME_CONFIG.colors.aoeTurret
            );
            
            rangeCircle = this.add.circle(pointer.x, pointer.y, Math.max(100, GAME_CONFIG.ranges.aoeTurret * scale));
            rangeCircle.setStrokeStyle(
                GAME_CONFIG.effects.rangePreviewLineWidth,
                GAME_CONFIG.colors.aoeTurret,
                GAME_CONFIG.effects.rangePreviewAlpha
            );

            // Add AOE radius preview
            const aoePreview = this.add.circle(pointer.x, pointer.y, GAME_CONFIG.ranges.aoeRadius * scale);
            aoePreview.setStrokeStyle(
                1,
                GAME_CONFIG.colors.aoeExplosion,
                0.3
            );
            placingTurret.aoePreview = aoePreview;
        }
    });

    // Handle drag
    turretButton.on("drag", (pointer) => {
        if (placingTurret) {
            placingTurret.x = pointer.x;
            placingTurret.y = pointer.y;
            rangeCircle.x = pointer.x;
            rangeCircle.y = pointer.y;
        }
    });

    aoeTurretButton.on("drag", (pointer) => {
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
    });

    // Handle drag end for both turret types
    const endDrag = (pointer, button) => {
        if (!placingTurret) return;

        const cost = isPlacingAOE ? GAME_CONFIG.mechanics.aoeTurretCost : GAME_CONFIG.mechanics.turretCost;
        const size = isPlacingAOE ? Math.max(30, GAME_CONFIG.sizes.aoeTurret * scale * 2) : TURRET_SIZE;
        const color = isPlacingAOE ? GAME_CONFIG.colors.aoeTurret : GAME_CONFIG.colors.turret;
        const range = isPlacingAOE ? Math.max(100, GAME_CONFIG.ranges.aoeTurret * scale) : TURRET_RANGE;
        const moveSpeed = isPlacingAOE ? GAME_CONFIG.mechanics.aoeTurretMoveSpeed : GAME_CONFIG.mechanics.turretMoveSpeed;
        const fireRate = isPlacingAOE ? GAME_CONFIG.mechanics.aoeTurretFireRate : GAME_CONFIG.mechanics.turretFireRate;

        if (playerResources >= cost) {
            // Create the actual turret
            const turret = this.add.rectangle(pointer.x, pointer.y, size, size, color);
            this.physics.add.existing(turret);
            turret.body.setCollideWorldBounds(true);
            turret.body.setBoundsRectangle(new Phaser.Geom.Rectangle(0, 0, gameWidth, playHeight));
            turret.body.setDrag(GAME_CONFIG.mechanics.turretDrag);
            turret.body.setMaxVelocity(moveSpeed);
            turret.body.setAngularDrag(GAME_CONFIG.mechanics.turretAngularDrag);
            turret.fireRate = fireRate;
            turret.lastFired = 0;
            turret.isAOE = isPlacingAOE;
            
            // Add cooldown bar
            const cooldownBar = this.add.rectangle(
                pointer.x,
                pointer.y - size * GAME_CONFIG.effects.cooldownBarOffset,
                size,
                GAME_CONFIG.sizes.cooldownBarHeight,
                GAME_CONFIG.colors.cooldownBar
            );
            turret.cooldownBar = cooldownBar;
            
            // Add permanent range indicator
            const rangeIndicator = this.add.circle(pointer.x, pointer.y, range);
            rangeIndicator.setStrokeStyle(
                GAME_CONFIG.effects.rangeIndicatorLineWidth,
                color,
                GAME_CONFIG.effects.rangeIndicatorAlpha
            );
            turret.rangeIndicator = rangeIndicator;

            // Add AOE radius indicator for AOE turrets
            if (isPlacingAOE) {
                const aoeIndicator = this.add.circle(pointer.x, pointer.y, GAME_CONFIG.ranges.aoeRadius * scale);
                aoeIndicator.setStrokeStyle(1, GAME_CONFIG.colors.aoeExplosion, 0.2);
                turret.aoeIndicator = aoeIndicator;
            }
            
            turrets.add(turret);
            
            // Deduct resources
            playerResources -= cost;
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
        }
    };

    turretButton.on("dragend", endDrag);
    aoeTurretButton.on("dragend", endDrag);

    // Cancel placement with right click
    this.input.on("pointerdown", (pointer) => {
        if (placingTurret && pointer.rightButtonDown()) {
            placingTurret.destroy();
            rangeCircle.destroy();
            placingTurret = null;
            rangeCircle = null;
        }
    });

    // Create a group for bullets
    this.bullets = this.physics.add.group();

    // Enemy collision with core
    this.physics.add.overlap(pulseCore, enemies, (core, enemy) => {
        enemy.destroy();
        coreHealth -= 10;
        this.healthText.setText(`Core Health: ${coreHealth}`);
        
        if (coreHealth <= 0) {
            this.add.text(gameWidth/2, gameHeight/2, 'GAME OVER', {
                fontSize: '64px',
                fill: '#ff0000'
            }).setOrigin(0.5);
            this.scene.pause();
        }

        // Visual feedback using color change instead of tint
        const originalColor = pulseCore.fillColor;
        pulseCore.setFillStyle(0xff0000);  // Set to red
        this.cameras.main.shake(200, 0.005);
        
        // Reset color after delay
        setTimeout(() => {
            pulseCore.setFillStyle(GAME_CONFIG.colors.core);  // Reset to green
        }, 200);
    });

    // Create groups for game objects
    enemies = this.physics.add.group({
        collideWorldBounds: true
    });
    turrets = this.physics.add.group({
        collideWorldBounds: true
    });

    // Add collisions between turrets
    this.physics.add.collider(turrets, turrets);

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
            case 0: x = Phaser.Math.Between(0, gameWidth); y = 0; break;  // Top
            case 1: x = gameWidth; y = Phaser.Math.Between(0, playHeight); break;  // Right
            case 2: x = Phaser.Math.Between(0, gameWidth); y = playHeight; break;  // Bottom (above UI)
            case 3: x = 0; y = Phaser.Math.Between(0, playHeight); break;  // Left
        }
        
        const enemy = this.add.rectangle(x, y, ENEMY_SIZE, ENEMY_SIZE, GAME_CONFIG.colors.enemy);
        this.physics.add.existing(enemy, false);  // false = dynamic body
        enemy.body.setCollideWorldBounds(true);
        enemy.body.setBoundsRectangle(new Phaser.Geom.Rectangle(0, 0, gameWidth, playHeight));
        enemy.body.setImmovable(false);  // Allow it to be affected by collisions
        enemies.add(enemy);
        
        // Clamp target position to gameplay area
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
        delay: 3000,
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
    // Update enemy movement targets
    enemies.getChildren().forEach((enemy) => {
        const targetY = Phaser.Math.Clamp(pulseCore.y, 0, playHeight);
        const targetX = Phaser.Math.Clamp(pulseCore.x, 0, gameWidth);
        this.physics.moveTo(enemy, targetX, targetY, 
            GAME_CONFIG.mechanics.enemyBaseSpeed + wave * GAME_CONFIG.mechanics.enemySpeedIncreasePerWave);
    });

    // Check bullet collisions
    this.bullets.getChildren().forEach((bullet) => {
        if (bullet.checkCollision) {
            bullet.checkCollision();
        }
    });

    // Update turret positions - make them orbit around the core
    turrets.getChildren().forEach((turret) => {
        // Calculate angle to core
        const dx = pulseCore.x - turret.x;
        const dy = pulseCore.y - turret.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If turret is too far from core, move it closer
        if (distance > TURRET_RANGE * GAME_CONFIG.ranges.followDistance) {
            this.physics.moveTo(turret, pulseCore.x, pulseCore.y, GAME_CONFIG.mechanics.turretMoveSpeed);
        } else {
            // When close enough, give it a slight orbital motion
            const angle = Math.atan2(dy, dx);
            const orbitAngle = angle + Math.PI / 2;  // Perpendicular to core direction
            const orbitX = pulseCore.x + Math.cos(orbitAngle) * TURRET_RANGE * GAME_CONFIG.ranges.orbitDistance;
            const orbitY = pulseCore.y + Math.sin(orbitAngle) * TURRET_RANGE * GAME_CONFIG.ranges.orbitDistance;
            this.physics.moveTo(turret, orbitX, orbitY, GAME_CONFIG.mechanics.turretMoveSpeed);
        }

        // Update range indicator position
        if (turret.rangeIndicator) {
            turret.rangeIndicator.x = turret.x;
            turret.rangeIndicator.y = turret.y;
        }
    });

    // Turret shooting
    const currentTime = this.time.now;
    turrets.getChildren().forEach((turret) => {
        // Update cooldown bar position and width
        if (turret.cooldownBar) {
            turret.cooldownBar.x = turret.x;
            turret.cooldownBar.y = turret.y - (turret.isAOE ? Math.max(30, GAME_CONFIG.sizes.aoeTurret * scale * 2) : TURRET_SIZE) * GAME_CONFIG.effects.cooldownBarOffset;
            
            // Calculate cooldown progress (0 to 1)
            const timeSinceLastShot = currentTime - turret.lastFired;
            const cooldownProgress = Math.min(timeSinceLastShot / turret.fireRate, 1);
            
            // Update bar width based on cooldown (starts full width, shrinks to 0)
            const size = turret.isAOE ? Math.max(30, GAME_CONFIG.sizes.aoeTurret * scale * 2) : TURRET_SIZE;
            turret.cooldownBar.width = size * (1 - cooldownProgress);
        }

        // Update AOE indicator position if it exists
        if (turret.aoeIndicator) {
            turret.aoeIndicator.x = turret.x;
            turret.aoeIndicator.y = turret.y;
        }

        if (currentTime - turret.lastFired >= turret.fireRate) {
            const range = turret.isAOE ? Math.max(100, GAME_CONFIG.ranges.aoeTurret * scale) : TURRET_RANGE;
            const nearestEnemy = enemies.getChildren().reduce((closest, enemy) => {
                const distance = Phaser.Math.Distance.Between(turret.x, turret.y, enemy.x, enemy.y);
                if (!closest || distance < closest.distance) {
                    return { enemy, distance };
                }
                return closest;
            }, null);

            if (nearestEnemy && nearestEnemy.distance < range) {
                if (turret.isAOE) {
                    // Calculate angle to target enemy
                    const dx = nearestEnemy.enemy.x - turret.x;
                    const dy = nearestEnemy.enemy.y - turret.y;
                    const angle = Math.atan2(dy, dx);
                    
                    // Create cone visualization
                    const coneAngle = GAME_CONFIG.ranges.coneAngle;
                    const startAngle = angle - coneAngle / 2;
                    const endAngle = angle + coneAngle / 2;
                    
                    // Create a cone shape for visualization
                    const graphics = this.add.graphics();
                    graphics.lineStyle(3, GAME_CONFIG.colors.aoeBullet, 0.8);  // Thicker line, more visible
                    graphics.beginPath();
                    graphics.moveTo(turret.x, turret.y);
                    
                    // Draw arc at the end of cone
                    const coneLength = GAME_CONFIG.ranges.aoeRadius * scale;
                    graphics.lineTo(
                        turret.x + Math.cos(startAngle) * coneLength,
                        turret.y + Math.sin(startAngle) * coneLength
                    );
                    graphics.arc(turret.x, turret.y, coneLength, startAngle, endAngle);
                    graphics.lineTo(turret.x, turret.y);
                    
                    graphics.strokePath();
                    graphics.fillStyle(GAME_CONFIG.colors.aoeExplosion, 0.4);  // More visible fill
                    graphics.fill();
                    
                    let enemiesHit = 0;  // Track how many enemies we hit
                    const enemiesToDestroy = [];  // Collect enemies to destroy
                    
                    // Find all enemies in cone
                    enemies.getChildren().forEach((enemy) => {
                        const enemyDx = enemy.x - turret.x;
                        const enemyDy = enemy.y - turret.y;
                        const enemyAngle = Math.atan2(enemyDy, enemyDx);
                        const enemyDistance = Math.sqrt(enemyDx * enemyDx + enemyDy * enemyDy);
                        
                        // Check if enemy is within cone angle and range
                        const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(enemyAngle - angle));
                        if (enemyDistance <= coneLength && angleDiff <= coneAngle / 2) {
                            enemiesToDestroy.push(enemy);
                            enemiesHit++;
                        }
                    });

                    // Destroy all collected enemies
                    enemiesToDestroy.forEach(enemy => {
                        enemy.destroy();
                        score += GAME_CONFIG.mechanics.enemyKillScore;
                    });
                    this.scoreText.setText(`Score: ${score}`);

                    // If we hit enemies, make the cone flash brighter
                    if (enemiesHit > 0) {
                        const flashGraphics = this.add.graphics();
                        flashGraphics.lineStyle(3, GAME_CONFIG.colors.aoeExplosion, 0.8);
                        flashGraphics.beginPath();
                        flashGraphics.moveTo(turret.x, turret.y);
                        flashGraphics.lineTo(
                            turret.x + Math.cos(startAngle) * coneLength,
                            turret.y + Math.sin(startAngle) * coneLength
                        );
                        flashGraphics.arc(turret.x, turret.y, coneLength, startAngle, endAngle);
                        flashGraphics.lineTo(turret.x, turret.y);
                        flashGraphics.strokePath();
                        flashGraphics.fillStyle(GAME_CONFIG.colors.aoeExplosion, 0.6);
                        flashGraphics.fill();
                        
                        this.tweens.add({
                            targets: flashGraphics,
                            alpha: 0,
                            duration: 100,
                            onComplete: () => flashGraphics.destroy()
                        });
                    }

                    // Animate cone fade out
                    this.tweens.add({
                        targets: graphics,
                        alpha: 0,
                        duration: GAME_CONFIG.mechanics.aoeExplosionDuration,
                        onComplete: () => graphics.destroy()
                    });

                } else {
                    // Regular turret shooting
                    const bullet = this.add.circle(turret.x, turret.y, BULLET_SIZE, GAME_CONFIG.colors.bullet);
                    this.physics.add.existing(bullet, false);
                    bullet.body.setCollideWorldBounds(false);
                    this.bullets.add(bullet);
                    
                    // Store target enemy for tracking
                    bullet.targetEnemy = nearestEnemy.enemy;
                    
                    // Set bullet velocity towards enemy
                    this.physics.moveToObject(bullet, nearestEnemy.enemy, GAME_CONFIG.mechanics.bulletSpeed);
                    
                    // Check for collision in update loop
                    bullet.checkCollision = () => {
                        if (bullet.targetEnemy.active) {  // If target still exists
                            const dx = bullet.x - bullet.targetEnemy.x;
                            const dy = bullet.y - bullet.targetEnemy.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            
                            if (distance < ENEMY_SIZE) {  // If bullet is close enough to enemy
                                bullet.targetEnemy.destroy();
                                bullet.destroy();
                                score += GAME_CONFIG.mechanics.enemyKillScore;
                                this.scoreText.setText(`Score: ${score}`);
                                
                                // Visual feedback
                                const scoreText = this.add.text(bullet.targetEnemy.x, bullet.targetEnemy.y, '+' + GAME_CONFIG.mechanics.enemyKillScore, {
                                    fontSize: '16px',
                                    fill: '#ff0'
                                });
                                this.tweens.add({
                                    targets: scoreText,
                                    y: bullet.targetEnemy.y - GAME_CONFIG.ui.scorePopupDistance,
                                    alpha: 0,
                                    duration: GAME_CONFIG.ui.scorePopupDuration,
                                    onComplete: () => scoreText.destroy()
                                });
                            }
                        }
                    };
                    
                    setTimeout(() => {
                        if (bullet && !bullet.destroyed) {
                            bullet.destroy();
                        }
                    }, GAME_CONFIG.mechanics.bulletLifetime);
                }

                turret.lastFired = currentTime;

                // Reset cooldown bar to full width when firing
                if (turret.cooldownBar) {
                    const size = turret.isAOE ? Math.max(30, GAME_CONFIG.sizes.aoeTurret * scale * 2) : TURRET_SIZE;
                    turret.cooldownBar.width = size;
                }

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
