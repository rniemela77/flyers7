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
        resource: 0x0000ff,
        bullet: 0xff6666,
        uiZone: 0x333333,
        cooldownBar: 0xffffff,
    },
    
    // Sizes (before scaling)
    sizes: {
        core: 20,
        resource: 15,
        enemy: 20,
        turret: 20,
        bullet: 5,
        cooldownBarHeight: 4,
    },
    
    // Ranges (before scaling)
    ranges: {
        turret: 200,
        orbitDistance: 0.4,  // Percentage of turret range
        followDistance: 0.5,  // Distance at which turrets start following core
    },
    
    // Game mechanics
    mechanics: {
        turretCost: 20,
        turretFireRate: 2000,
        turretMoveSpeed: 40,
        turretDrag: 50,
        turretAngularDrag: 50,
        bulletSpeed: 300,
        bulletLifetime: 1000,  // How long bullets exist before auto-destroying
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
    
    // Add turret placement button in UI zone
    const turretButton = this.add.rectangle(
        gameWidth/2,
        gameHeight - uiHeight/2,
        TURRET_BUTTON_SIZE,
        TURRET_BUTTON_SIZE,
        GAME_CONFIG.colors.turret
    );
    
    // Center the text in the button
    const turretText = this.add.text(
        gameWidth/2,
        gameHeight - uiHeight/2,
        "Turret",
        { 
            fontSize: Math.max(uiHeight * 0.3, 12) + "px",
            fill: "#fff" 
        }
    );
    turretText.setOrigin(0.5, 0.5);  // Center the text
    
    turretButton.setInteractive({ draggable: true });

    // Add core movement on click (only outside UI zone)
    this.input.on("pointerdown", (pointer) => {
        if (pointer.y < playHeight) {
            this.physics.moveToObject(pulseCore, pointer, GAME_CONFIG.mechanics.coreSpeed * scale);
        }
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

    // Track if we're currently placing a turret
    let placingTurret = null;
    let rangeCircle = null;

    // Handle drag start
    turretButton.on("dragstart", (pointer) => {
        if (playerResources >= GAME_CONFIG.mechanics.turretCost && !placingTurret) {
            // Create a turret that follows the mouse
            placingTurret = this.add.rectangle(
                pointer.x,
                pointer.y,
                TURRET_SIZE,
                TURRET_SIZE,
                GAME_CONFIG.colors.turret
            );
            
            // Add a preview range circle (outline only)
            rangeCircle = this.add.circle(pointer.x, pointer.y, TURRET_RANGE);
            rangeCircle.setStrokeStyle(
                GAME_CONFIG.effects.rangePreviewLineWidth,
                GAME_CONFIG.colors.turret,
                GAME_CONFIG.effects.rangePreviewAlpha
            );
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

    // Handle drag end
    turretButton.on("dragend", (pointer) => {
        if (placingTurret && playerResources >= GAME_CONFIG.mechanics.turretCost) {
            // Create the actual turret at the drop location
            const turret = this.add.rectangle(pointer.x, pointer.y, TURRET_SIZE, TURRET_SIZE, GAME_CONFIG.colors.turret);
            this.physics.add.existing(turret);
            turret.body.setCollideWorldBounds(true);
            turret.body.setBoundsRectangle(new Phaser.Geom.Rectangle(0, 0, gameWidth, playHeight));
            turret.body.setDrag(GAME_CONFIG.mechanics.turretDrag);
            turret.body.setMaxVelocity(GAME_CONFIG.mechanics.turretMoveSpeed);
            turret.body.setAngularDrag(GAME_CONFIG.mechanics.turretAngularDrag);
            turret.fireRate = GAME_CONFIG.mechanics.turretFireRate;
            turret.lastFired = 0;
            
            // Add cooldown bar
            const cooldownBar = this.add.rectangle(
                pointer.x,
                pointer.y - TURRET_SIZE * GAME_CONFIG.effects.cooldownBarOffset,
                TURRET_SIZE,
                GAME_CONFIG.sizes.cooldownBarHeight,
                GAME_CONFIG.colors.cooldownBar
            );
            turret.cooldownBar = cooldownBar;
            
            // Add permanent range indicator (outline only)
            const rangeIndicator = this.add.circle(pointer.x, pointer.y, TURRET_RANGE);
            rangeIndicator.setStrokeStyle(
                GAME_CONFIG.effects.rangeIndicatorLineWidth,
                GAME_CONFIG.colors.turret,
                GAME_CONFIG.effects.rangeIndicatorAlpha
            );
            turret.rangeIndicator = rangeIndicator;
            
            turrets.add(turret);
            
            // Deduct resources
            playerResources -= GAME_CONFIG.mechanics.turretCost;
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
            placingTurret = null;
            rangeCircle = null;
        }
    });

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

    // Remove the direct turret-enemy collision and handle bullet collisions instead
    this.physics.add.overlap(this.bullets, enemies, (bullet, enemy) => {
        bullet.destroy();
        enemy.destroy();
        score += GAME_CONFIG.mechanics.enemyKillScore;
        this.scoreText.setText(`Score: ${score}`);
        
        // Visual feedback
        const scoreText = this.add.text(enemy.x, enemy.y, '+' + GAME_CONFIG.mechanics.enemyKillScore, {
            fontSize: '16px',
            fill: '#ff0'
        });
        this.tweens.add({
            targets: scoreText,
            y: enemy.y - GAME_CONFIG.ui.scorePopupDistance,
            alpha: 0,
            duration: GAME_CONFIG.ui.scorePopupDuration,
            onComplete: () => scoreText.destroy()
        });
    });

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
        this.physics.add.existing(enemy);
        enemy.body.setCollideWorldBounds(true);
        enemy.body.setBoundsRectangle(new Phaser.Geom.Rectangle(0, 0, gameWidth, playHeight));
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
}

function update() {
    // Update enemy movement targets
    enemies.getChildren().forEach((enemy) => {
        const targetY = Phaser.Math.Clamp(pulseCore.y, 0, playHeight);
        const targetX = Phaser.Math.Clamp(pulseCore.x, 0, gameWidth);
        this.physics.moveTo(enemy, targetX, targetY, 
            GAME_CONFIG.mechanics.enemyBaseSpeed + wave * GAME_CONFIG.mechanics.enemySpeedIncreasePerWave);
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
            turret.cooldownBar.y = turret.y - TURRET_SIZE * 0.8;
            
            // Calculate cooldown progress (0 to 1)
            const timeSinceLastShot = currentTime - turret.lastFired;
            const cooldownProgress = Math.min(timeSinceLastShot / turret.fireRate, 1);
            
            // Update bar width based on cooldown (starts full width, shrinks to 0)
            turret.cooldownBar.width = TURRET_SIZE * (1 - cooldownProgress);
        }

        if (currentTime - turret.lastFired >= turret.fireRate) {
            const nearestEnemy = enemies.getChildren().reduce((closest, enemy) => {
                const distance = Phaser.Math.Distance.Between(turret.x, turret.y, enemy.x, enemy.y);
                if (!closest || distance < closest.distance) {
                    return { enemy, distance };
                }
                return closest;
            }, null);

            if (nearestEnemy && nearestEnemy.distance < TURRET_RANGE) {
                const bullet = this.add.circle(turret.x, turret.y, BULLET_SIZE, GAME_CONFIG.colors.bullet);
                this.physics.add.existing(bullet);
                this.bullets.add(bullet);
                this.physics.moveToObject(bullet, nearestEnemy.enemy, GAME_CONFIG.mechanics.bulletSpeed);
                
                setTimeout(() => {
                    if (bullet && !bullet.destroyed) {
                        bullet.destroy();
                    }
                }, 1000);
                turret.lastFired = currentTime;

                // Reset cooldown bar to full width when firing
                if (turret.cooldownBar) {
                    turret.cooldownBar.width = TURRET_SIZE;
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
