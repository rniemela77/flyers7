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
    beam: false
};

function preload() {
    // Remove the bullet image preload since we'll create it with graphics
}

function createTriangleEnemy() {
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

    const texture = enemyGraphics.generateTexture('triangle_enemy', 40, 40);
    enemyGraphics.destroy();

    // Spawn enemy at top of screen at random x position
    const enemy = this.physics.add.sprite(
        Phaser.Math.Between(50, config.width - 50),
        -20, // Start above screen
        'triangle_enemy'
    );
    enemy.setDepth(1);
    enemy.maxHealth = 40;
    enemy.health = enemy.maxHealth;
    enemy.type = 'triangle';

    // Set up circular physics body
    enemy.body.setCircle(20);  // 20px radius
    enemy.body.setBounce(0.5);
    enemy.body.setCollideWorldBounds(true);  // Only triangles collide with world bounds
    enemy.body.setMass(1);

    // Create enemy health bar
    enemy.healthBar = this.add.graphics();
    enemy.healthBar.setDepth(1);
    updateEnemyHealthBar(enemy);

    // Add to enemies group
    enemies.add(enemy);

    // Initial downward movement
    enemy.setVelocityY(50);  // Reduced from 100 to 50 to match squares

    // Start lurching behavior
    this.time.addEvent({
        delay: Phaser.Math.Between(3000, 5000),  // Increased delay between lurches
        callback: () => lurchForward.call(this, enemy),
        callbackScope: this,
        loop: true
    });

    return enemy;
}

function createSquareEnemy() {
    // Create enemy (blue square)
    const enemyGraphics = this.add.graphics();
    enemyGraphics.lineStyle(2, 0x0000FF);
    enemyGraphics.fillStyle(0x0000FF);
    enemyGraphics.fillRect(5, 5, 30, 30);  // Draw a 30x30 square with 5px margin
    enemyGraphics.strokeRect(5, 5, 30, 30);

    const texture = enemyGraphics.generateTexture('square_enemy', 40, 40);
    enemyGraphics.destroy();

    // Spawn enemy at top of screen at random x position
    const enemy = this.physics.add.sprite(
        Phaser.Math.Between(50, config.width - 50),
        -20, // Start above screen
        'square_enemy'
    );
    enemy.setDepth(1);
    enemy.maxHealth = 50;
    enemy.health = enemy.maxHealth;
    enemy.type = 'square';

    // Set up circular physics body
    enemy.body.setCircle(20);  // 20px radius
    enemy.body.setBounce(0.5);
    enemy.body.setMass(0.8);  // Slightly lighter than triangles

    // Create enemy health bar
    enemy.healthBar = this.add.graphics();
    enemy.healthBar.setDepth(1);
    updateEnemyHealthBar(enemy);

    // Add to enemies group
    enemies.add(enemy);

    // Set constant downward velocity
    enemy.setVelocityY(50);  // Slower downward movement for marching effect
    enemy.minVelocityY = 50; // Store minimum velocity for reference

    return enemy;
}

function create() {
    // Create enemies group with collision
    enemies = this.physics.add.group({
        bounceX: 0.5,
        bounceY: 0.5
    });
    
    // Enable collision between enemies in the group
    this.physics.add.collider(enemies, enemies);
    
    // Create initial enemies (3 triangles)
    for (let i = 0; i < 3; i++) {
        createTriangleEnemy.call(this);
    }

    // Spawn square enemies periodically
    this.time.addEvent({
        delay: 1500,  // Reduced from 3000 to 1500 (twice as frequent)
        callback: () => createSquareEnemy.call(this),
        callbackScope: this,
        loop: true
    });

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

    // Create toggle buttons
    createFireModeToggles.call(this);

    // Setup continuous bullet firing - now checks fire modes
    this.time.addEvent({
        delay: 100,
        callback: () => {
            if (fireModes.rapidFire) {
                fireBullet.call(this);
            }
        },
        callbackScope: this,
        loop: true
    });

    // Setup slower dual shot firing
    this.time.addEvent({
        delay: 250,
        callback: () => {
            if (fireModes.dualShot) {
                fireDualShot.call(this);
            }
        },
        callbackScope: this,
        loop: true
    });

    // Setup triple shot firing
    this.time.addEvent({
        delay: 300,  // Slightly slower than dual shot
        callback: () => {
            if (fireModes.tripleShot) {
                fireTripleShot.call(this);
            }
        },
        callbackScope: this,
        loop: true
    });

    // Setup beam firing
    this.time.addEvent({
        delay: 50,  // Very fast firing rate for beam
        callback: () => {
            if (fireModes.beam) {
                fireBeam.call(this);
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

    // Add this to the create function after creating the bullet group:
    this.beamGraphics = this.add.graphics();
    this.beamGraphics.setDepth(1);  // Above enemies but below reticle
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
    enemy.healthBar.fillRect(barX, barY, (enemy.health / enemy.maxHealth) * barWidth, barHeight);
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
                createTriangleEnemy.call(this);
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

function lurchForward(enemy) {
    if (!enemy || !enemy.active) return;

    // Calculate angle towards bottom of screen
    const angle = Math.PI / 2;  // 90 degrees, pointing downward
    const variance = (Math.random() - 0.5) * Math.PI / 6;  // Reduced variance to +/- 15 degrees
    const finalAngle = angle + variance;

    // Lurch forward with a burst of speed
    const speed = 200;  // Reduced from 300 to 200
    enemy.body.setVelocity(
        Math.cos(finalAngle) * speed,
        Math.sin(finalAngle) * speed
    );

    // Gradually slow down after the lurch
    this.time.delayedCall(500, () => {
        if (enemy && enemy.active) {
            enemy.body.setVelocity(
                enemy.body.velocity.x * 0.2,  // More aggressive slowdown
                Math.max(50, enemy.body.velocity.y * 0.2)  // Keep minimum downward speed at 50
            );
        }
    });
}

function update() {
    // Update all enemy health bars and check for out-of-bounds enemies
    enemies.getChildren().forEach(enemy => {
        if (enemy && enemy.active) {
            updateEnemyHealthBar(enemy);
            
            // Ensure square enemies maintain minimum downward velocity
            if (enemy.type === 'square') {
                if (enemy.body.velocity.y < enemy.minVelocityY) {
                    enemy.setVelocityY(enemy.minVelocityY);
                }
            }
            
            // Destroy enemies that go off screen
            if (enemy.y > config.height + 20) {
                enemy.healthBar.destroy();
                enemy.destroy();
                // Replace destroyed triangle enemies
                if (enemy.type === 'triangle') {
                    this.time.delayedCall(1000, () => {
                        createTriangleEnemy.call(this);
                    });
                }
            }
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

    // Update beam if active
    if (fireModes.beam) {
        fireBeam.call(this);
    } else {
        this.beamGraphics.clear();
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

    // Draw initial button states
    updateButtonVisuals.call(this, rapidFireButton, fireModes.rapidFire);
    updateButtonVisuals.call(this, dualShotButton, fireModes.dualShot);
    updateButtonVisuals.call(this, tripleShotButton, fireModes.tripleShot);
    updateButtonVisuals.call(this, beamButton, fireModes.beam);

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

    // Store buttons for later reference
    this.rapidFireButton = rapidFireButton;
    this.dualShotButton = dualShotButton;
    this.tripleShotButton = tripleShotButton;
    this.beamButton = beamButton;
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
    }
}

function fireDualShot() {
    const spacing = 15;  // Space between the two bullets
    const centerX = config.width / 2;
    const y = config.height - 20;

    // Calculate firing angle
    const angle = Phaser.Math.Angle.Between(
        centerX, y,
        reticle.x, reticle.y
    );
    
    // Calculate perpendicular offset (90 degrees = PI/2)
    const perpX = Math.cos(angle + Math.PI/2) * spacing/2;
    const perpY = Math.sin(angle + Math.PI/2) * spacing/2;
    
    // Create bullets at perpendicular positions
    const leftBullet = bullets.create(centerX - perpX, y - perpY, 'bullet');
    const rightBullet = bullets.create(centerX + perpX, y + perpY, 'bullet');
    
    const speed = 400;

    // Set same velocity and rotation for both bullets
    [leftBullet, rightBullet].forEach(bullet => {
        this.physics.velocityFromRotation(angle, speed, bullet.body.velocity);
        bullet.rotation = angle;

        this.physics.add.overlap(bullet, enemies, (bullet, enemy) => {
            bullet.destroy();
            enemy.health = Math.max(0, enemy.health - 10);
            
            if (enemy.health <= 0) {
                enemy.healthBar.destroy();
                enemy.destroy();
                this.time.delayedCall(1000, () => {
                    createTriangleEnemy.call(this);
                });
            } else {
                updateEnemyHealthBar(enemy);
            }
        });

        // Destroy bullet after 2 seconds
        this.time.delayedCall(2000, () => {
            if (bullet.active) {
                bullet.destroy();
            }
        });
    });
}

function fireTripleShot() {
    const spacing = 15;  // Space between each bullet
    const centerX = config.width / 2;
    const y = config.height - 20;

    // Calculate firing angle
    const angle = Phaser.Math.Angle.Between(
        centerX, y,
        reticle.x, reticle.y
    );
    
    // Calculate perpendicular offset (90 degrees = PI/2)
    const perpX = Math.cos(angle + Math.PI/2);
    const perpY = Math.sin(angle + Math.PI/2);
    
    // Create bullets at perpendicular positions
    const leftBullet = bullets.create(centerX - perpX * spacing, y - perpY * spacing, 'bullet');
    const centerBullet = bullets.create(centerX, y, 'bullet');
    const rightBullet = bullets.create(centerX + perpX * spacing, y + perpY * spacing, 'bullet');
    
    const speed = 400;

    // Set same velocity and rotation for all bullets
    [leftBullet, centerBullet, rightBullet].forEach(bullet => {
        this.physics.velocityFromRotation(angle, speed, bullet.body.velocity);
        bullet.rotation = angle;

        this.physics.add.overlap(bullet, enemies, (bullet, enemy) => {
            bullet.destroy();
            enemy.health = Math.max(0, enemy.health - 10);
            
            if (enemy.health <= 0) {
                enemy.healthBar.destroy();
                enemy.destroy();
                this.time.delayedCall(1000, () => {
                    createTriangleEnemy.call(this);
                });
            } else {
                updateEnemyHealthBar(enemy);
            }
        });

        // Destroy bullet after 2 seconds
        this.time.delayedCall(2000, () => {
            if (bullet.active) {
                bullet.destroy();
            }
        });
    });
}

function fireBeam() {
    const centerX = config.width / 2;
    const y = config.height - 20;
    const beamWidth = 4;  // Width of the beam

    // Calculate firing angle
    const angle = Phaser.Math.Angle.Between(
        centerX, y,
        reticle.x, reticle.y
    );

    // Clear previous beam
    this.beamGraphics.clear();

    // Draw new beam with glow effect
    this.beamGraphics.lineStyle(beamWidth + 4, 0xFFFFFF, 0.2);  // Outer glow
    this.beamGraphics.beginPath();
    this.beamGraphics.moveTo(centerX, y);
    this.beamGraphics.lineTo(reticle.x, reticle.y);
    this.beamGraphics.strokePath();

    this.beamGraphics.lineStyle(beamWidth, 0xFFFFFF, 0.8);  // Main beam
    this.beamGraphics.beginPath();
    this.beamGraphics.moveTo(centerX, y);
    this.beamGraphics.lineTo(reticle.x, reticle.y);
    this.beamGraphics.strokePath();

    // Check for collisions at reticle position
    enemies.getChildren().forEach(enemy => {
        if (enemy && enemy.active) {
            // Calculate distance from enemy to reticle
            const distance = Phaser.Math.Distance.Between(
                enemy.x, enemy.y,
                reticle.x, reticle.y
            );

            if (distance < enemy.body.radius + 10) { // Added small buffer for better hit detection
                enemy.health = Math.max(0, enemy.health - 1);  // Continuous damage while in beam
                
                if (enemy.health <= 0) {
                    enemy.healthBar.destroy();
                    enemy.destroy();
                    this.time.delayedCall(1000, () => {
                        createTriangleEnemy.call(this);
                    });
                } else {
                    updateEnemyHealthBar(enemy);
                }
            }
        }
    });
}

