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
        callback: fireBullet,
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
}

