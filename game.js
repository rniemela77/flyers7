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
        pulse: 0xffff00,
        uiZone: 0x333333,
    },
    
    // Sizes (before scaling)
    sizes: {
        core: 20,
        resource: 15,
        enemy: 20,
        turret: 20,
        bullet: 5,
    },
    
    // Ranges (before scaling)
    ranges: {
        pulse: 200,
        turret: 150,
    },
    
    // Game mechanics
    mechanics: {
        turretCost: 20,
        turretFireRate: 2000,
        bulletSpeed: 300,
        coreSpeed: 200,
        enemyBaseSpeed: 50,
        enemySpeedIncreasePerWave: 5,
        resourceValue: 10,
        enemyDamage: 10,
        pulseScoreValue: 5,
        turretScoreValue: 10,
        waveDelay: 3000,
        initialCoreHealth: 100,
    },
    
    // UI
    ui: {
        minFontSize: 14,
        baseFontSize: 20,
        uiHeightPercent: 0.15,
        maxUiHeight: 100,
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
const TURRET_SIZE = Math.max(15, GAME_CONFIG.sizes.turret * scale);
const BULLET_SIZE = Math.max(3, GAME_CONFIG.sizes.bullet * scale);
const PULSE_RANGE = Math.max(100, GAME_CONFIG.ranges.pulse * scale);
const TURRET_RANGE = Math.max(75, GAME_CONFIG.ranges.turret * scale);
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
let playerResources = 0;
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
            this.physics.moveToObject(pulseCore, pointer, 200 * scale);
        }
    });

    // Create groups for game objects
    resources = this.physics.add.group();
    enemies = this.physics.add.group();
    turrets = this.physics.add.group();

    // Add resource collectors at different positions
    [
        {x: gameWidth * 0.25, y: playHeight * 0.25},
        {x: gameWidth * 0.75, y: playHeight * 0.25},
        {x: gameWidth * 0.25, y: playHeight * 0.75},
        {x: gameWidth * 0.75, y: playHeight * 0.75}
    ].forEach(pos => {
        const collector = this.add.circle(pos.x, pos.y, RESOURCE_SIZE, GAME_CONFIG.colors.resource);
        this.physics.add.existing(collector);
        resources.add(collector);
    });

    // Add HUD with scaled font sizes
    const fontSize = Math.max(20 * scale, 14);
    this.resourceText = this.add.text(10, 10, "Resources: 0", {
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
        if (playerResources >= 20 && !placingTurret) {
            // Create a turret that follows the mouse
            placingTurret = this.add.rectangle(
                pointer.x,
                pointer.y,
                TURRET_SIZE,
                TURRET_SIZE,
                GAME_CONFIG.colors.turret
            );
            
            // Add a preview range circle
            rangeCircle = this.add.circle(
                pointer.x,
                pointer.y,
                TURRET_RANGE,
                GAME_CONFIG.colors.turret,
                0.1
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
        if (placingTurret && playerResources >= 20) {
            // Create the actual turret at the drop location
            const turret = this.add.rectangle(pointer.x, pointer.y, TURRET_SIZE, TURRET_SIZE, GAME_CONFIG.colors.turret);
            this.physics.add.existing(turret);
            turret.fireRate = 2000;
            turret.lastFired = 0;
            turrets.add(turret);
            
            // Deduct resources
            playerResources -= 20;
            this.resourceText.setText(`Resources: ${playerResources}`);
            
            // Visual feedback
            this.tweens.add({
                targets: turret,
                scaleX: 1.2,
                scaleY: 1.2,
                duration: 200,
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

    // Add collision detection
    this.physics.add.overlap(pulseCore, resources, (core, resource) => {
        resource.destroy();
        playerResources += 10;
        this.resourceText.setText(`Resources: ${playerResources}`);
        
        // Spawn a new resource after collection
        setTimeout(() => {
            const newResource = this.add.circle(
                Phaser.Math.Between(100, gameWidth - 20),
                Phaser.Math.Between(100, playHeight - 20),  // Adjusted to stay in play area
                RESOURCE_SIZE,
                GAME_CONFIG.colors.resource
            );
            this.physics.add.existing(newResource);
            resources.add(newResource);
        }, 5000);

        // Visual feedback
        const collectText = this.add.text(resource.x, resource.y, '+10', {
            fontSize: '16px',
            fill: '#0ff'
        });
        this.tweens.add({
            targets: collectText,
            y: resource.y - 50,
            alpha: 0,
            duration: 1000,
            onComplete: () => collectText.destroy()
        });
    });

    // Create a group for bullets
    this.bullets = this.physics.add.group();

    // Remove the direct turret-enemy collision and handle bullet collisions instead
    this.physics.add.overlap(this.bullets, enemies, (bullet, enemy) => {
        bullet.destroy();
        enemy.destroy();
        score += 10;
        this.scoreText.setText(`Score: ${score}`);
        
        // Visual feedback
        const scoreText = this.add.text(enemy.x, enemy.y, '+10', {
            fontSize: '16px',
            fill: '#ff0'
        });
        this.tweens.add({
            targets: scoreText,
            y: enemy.y - 50,
            alpha: 0,
            duration: 1000,
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

    // Spawn enemies with increasing difficulty
    this.time.addEvent({
        delay: 3000,
        callback: () => {
            const enemyCount = Math.min(3 + Math.floor(wave/2), 8);
            for (let i = 0; i < enemyCount; i++) {
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
                this.physics.moveTo(enemy, targetX, targetY, 50 + wave * 5);
            }
            
            wave++;
            this.waveText.setText(`Wave: ${wave}`);
        },
        loop: true
    });
}

function update() {
    // Emit pulses periodically
    if (this.time.now % 2000 < 50) {
        const pulse = this.add.circle(pulseCore.x, pulseCore.y, 10, GAME_CONFIG.colors.pulse);
        this.tweens.add({
            targets: pulse,
            radius: 200,
            alpha: 0,
            duration: 1000,
            onComplete: () => pulse.destroy(),
        });

        // Damage enemies in pulse range
        enemies.getChildren().forEach((enemy) => {
            if (Phaser.Math.Distance.Between(pulseCore.x, pulseCore.y, enemy.x, enemy.y) < PULSE_RANGE) {
                enemy.destroy();
                score += 5;
                this.scoreText.setText(`Score: ${score}`);
            }
        });
    }

    // Update enemy movement targets
    enemies.getChildren().forEach((enemy) => {
        const targetY = Phaser.Math.Clamp(pulseCore.y, 0, playHeight);
        const targetX = Phaser.Math.Clamp(pulseCore.x, 0, gameWidth);
        this.physics.moveTo(enemy, targetX, targetY, 50 + wave * 5);
    });

    // Turret shooting
    const currentTime = this.time.now;
    turrets.getChildren().forEach((turret) => {
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
                this.bullets.add(bullet);  // Add bullet to the bullets group
                this.physics.moveToObject(bullet, nearestEnemy.enemy, 300);
                
                // Remove old collision check since we now handle it in the group overlap
                
                setTimeout(() => {
                    if (bullet && !bullet.destroyed) {
                        bullet.destroy();
                    }
                }, 1000);
                turret.lastFired = currentTime;

                // Visual feedback for shooting
                this.tweens.add({
                    targets: turret,
                    scaleX: 1.1,
                    scaleY: 1.1,
                    duration: 50,
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
