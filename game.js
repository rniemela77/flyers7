/*
Phaser.js game

Game mechanics:

- the enemy (a red triangle) spawns at the top half of the screen.
- the targeting reticle (a white crosshair) spawns on the enemy
- on pointerdown, create a virtual joystick at the pointer position.
- while pointerdown, on pointermove, the targeting reticle moves in the direction of the drag from the pointer down position. (almost like panning the reticle)
- the targeting reticle moves at 2x the distance of the drag.
- the player can click to fire a bullet, which spawns at the bottom center and travels to the targeting reticle.
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

let enemy;
let reticle;
let joystickPoint;
let bullets;
let isPointerDown = false;
let lastPointerPosition = { x: 0, y: 0 };
let healthBar;
let enemyHealth = 100;
let isEnemyMoving = false;

function preload() {
    // Remove the bullet image preload since we'll create it with graphics
}

function create() {
    // Create health bar
    healthBar = {
        width: 200,
        height: 20,
        x: config.width / 2,
        y: 30,
        background: this.add.graphics(),
        bar: this.add.graphics()
    };

    // Draw health bar background (gray)
    healthBar.background.fillStyle(0x333333);
    healthBar.background.fillRect(
        healthBar.x - healthBar.width / 2,
        healthBar.y - healthBar.height / 2,
        healthBar.width,
        healthBar.height
    );

    // Draw health bar (red)
    updateHealthBar.call(this);

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
    enemy = this.physics.add.sprite(
        Phaser.Math.Between(50, config.width - 50),
        Phaser.Math.Between(50, config.height / 2 - 50),
        'enemy'
    );

    // Start enemy movement
    moveEnemyToNewPosition.call(this);

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

    // Create reticle at enemy position
    reticle = this.add.sprite(enemy.x, enemy.y, 'reticle');

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
        // Fire bullet on pointer up
        fireBullet.call(this);
    });
}

function updateHealthBar() {
    healthBar.bar.clear();
    healthBar.bar.fillStyle(0xFF0000);
    const width = (enemyHealth / 100) * healthBar.width;
    healthBar.bar.fillRect(
        healthBar.x - healthBar.width / 2,
        healthBar.y - healthBar.height / 2,
        width,
        healthBar.height
    );
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

    // Add collision with enemy
    this.physics.add.overlap(bullet, enemy, (bullet, enemy) => {
        bullet.destroy();
        enemyHealth = Math.max(0, enemyHealth - 10);  // Decrease health by 10
        updateHealthBar.call(this);
    });

    // Destroy bullet after 2 seconds
    this.time.delayedCall(2000, () => {
        bullet.destroy();
    });
}

function moveEnemyToNewPosition() {
    if (isEnemyMoving) return;

    // Calculate new random position in top half, keeping away from edges
    const margin = 50;
    const newX = Phaser.Math.Between(margin, config.width - margin);
    const newY = Phaser.Math.Between(margin, (config.height / 2) - margin);
    
    isEnemyMoving = true;

    // Move enemy to new position
    this.tweens.add({
        targets: enemy,
        x: newX,
        y: newY,
        duration: 1500,  // 1.5 seconds for movement
        ease: 'Power2',
        onComplete: () => {
            isEnemyMoving = false;
            // Wait 1-2 seconds before moving again
            this.time.delayedCall(Phaser.Math.Between(1000, 2000), () => {
                moveEnemyToNewPosition.call(this);
            });
        }
    });
}

function update() {
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

