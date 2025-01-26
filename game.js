class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');

        // Basic game settings
        this.score = 0;
        this.health = 3;
        this.maxHealth = 5;
        this.worldWidth = 2400;

        // Player movement constants
        this.PLAYER_SPEED = 600;
        this.PLAYER_ACCELERATION = 600;
        this.PLAYER_DECELERATION = 400;

        // Touch drag thresholds
        this.DRAG_THRESHOLD = 20;
        this.DRAG_MAX_DISTANCE = 200;

        // Trail settings
        this.trailInterval = 100;
        this.trailFadeDuration = 800;

        // Enemy settings
        this.enemies = [];

        // Bullet settings
        this.BULLET_SPEED = 400;
        this.PLAYER_SHOOT_DELAY = 250;
        this.ENEMY_SHOOT_DELAY = 1000;
        this.lastPlayerShot = 0;
    }

    create() {
        this.createParallaxBackground();
        this.createBullets();
        this.createPlayer();
        this.createEnemy();
        this.createUI();
        this.createInput();

        // Setup world bounds
        this.physics.world.setBounds(0, 0, this.worldWidth, this.scale.height);

        // Camera
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.scale.height);
        this.cameras.main.startFollow(this.player, true, 0.1, 0);
    }

    // ----------------------
    // CREATE / INIT METHODS
    // ----------------------

    createParallaxBackground() {
        // Store layers for updating
        this.bgLayers = [];

        // Three layers of stars
        const layerConfigs = [
            { count: 100, speed: 0.1, maxSize: 1 },
            { count: 50,  speed: 0.2, maxSize: 2 },
            { count: 25,  speed: 0.4, maxSize: 3 }
        ];

        layerConfigs.forEach(config => {
            const stars = [];
            for (let i = 0; i < config.count; i++) {
                stars.push({
                    x: Phaser.Math.Between(0, this.worldWidth),
                    y: Phaser.Math.Between(0, this.scale.height),
                    size: Phaser.Math.Between(1, config.maxSize),
                    alpha: Phaser.Math.FloatBetween(0.3, 0.8)
                });
            }
            const graphics = this.add.graphics();
            this.bgLayers.push({ stars, graphics, speed: config.speed });
        });
    }

    createBullets() {
        // Create bullet groups
        this.playerBullets = this.physics.add.group({
            classType: Phaser.GameObjects.Rectangle,
            runChildUpdate: true
        });

        this.enemyBullets = this.physics.add.group({
            classType: Phaser.GameObjects.Rectangle,
            runChildUpdate: true
        });
    }

    createPlayer() {
        // Position player near bottom
        const startY = this.scale.height * 0.75;
        this.player = this.add.container(this.worldWidth / 2, startY);

        // Player shape
        const shipBody = this.add.triangle(
            0, 0,
            0, -24,   // top
            16, 24,   // bottom right
            -16, 24,  // bottom left
            0xccddff
        ).setOrigin(-0.5, -0.5);

        // Physics
        this.physics.world.enable(this.player);
        this.player.body.setCollideWorldBounds(true);
        this.player.body.setMaxVelocity(this.PLAYER_SPEED, 0);
        this.player.body.setDrag(this.PLAYER_DECELERATION, 0);
        this.player.body.setSize(32, 48);


        // Arrows for feedback
        this.leftArrow = this.createArrow(-40, 0, true);
        this.rightArrow = this.createArrow(40, 0, false);

        // Combine
        this.player.add([shipBody, this.leftArrow, this.rightArrow]);

        // Trail array
        this.trail = [];
        this.lastTrailTime = 0;

        // Add shooting key
        this.shootKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    createArrow(x, y, isLeft) {
        // Simple arrow shape
        const arrow = this.add.triangle(
            x, y,
            0, 0,
            0, 16,
            isLeft ? -16 : 16, 8,
            0x4488ff
        ).setOrigin(-1, -0.5);
        arrow.setAlpha(0);
        return arrow;
    }

    createEnemy() {
        // Create two enemies at different positions
        const enemyPositions = [
            { x: this.worldWidth / 3, y: this.scale.height * 0.25 },
            { x: this.worldWidth * 2/3, y: this.scale.height * 0.15 }
        ];

        enemyPositions.forEach(pos => {
            const enemy = this.add.container(pos.x, pos.y);

            // Enemy shape
            const enemyBody = this.add.triangle(
                0, 0,
                0, 24,    // bottom
                16, -24,  // top right
                -16, -24, // top left
                0xff4444
            ).setOrigin(-0.5, -0.5);

            enemy.add(enemyBody);

            // Enemy physics
            this.physics.world.enable(enemy);
            enemy.body.setCollideWorldBounds(true);
            enemy.body.setVelocityX(150);
            enemy.body.setSize(32, 48);

            // Add shooting properties
            enemy.lastShot = 0;

            this.enemies.push(enemy);
        });
    }

    createUI() {
        // HUD text
        const style = { fontSize: '20px', fill: '#fff' };
        this.scoreText = this.add.text(16, 16, 'Score: 0', style).setScrollFactor(0);
        this.healthText = this.add.text(16, 40, 'Health: 3', style).setScrollFactor(0);
    }

    createInput() {
        // Keyboard
        this.cursors = this.input.keyboard.createCursorKeys();

        // Touch setup
        this.touchInput = {
            isDown: false,
            startX: 0,
            currentX: 0,
            lastX: 0,
            velocity: 0
        };

        // Touch events
        this.input.on('pointerdown', pointer => {
            this.touchInput.isDown = true;
            this.touchInput.startX = pointer.x;
            this.touchInput.currentX = pointer.x;
            this.touchInput.lastX = pointer.x;
            this.touchInput.velocity = 0;
        });

        this.input.on('pointermove', pointer => {
            if (this.touchInput.isDown) {
                this.touchInput.lastX = this.touchInput.currentX;
                this.touchInput.currentX = pointer.x;
                this.touchInput.velocity = this.touchInput.currentX - this.touchInput.lastX;
            }
        });

        this.input.on('pointerup', () => {
            this.touchInput.isDown = false;
            if (Math.abs(this.touchInput.velocity) > 5) {
                const impulse = Phaser.Math.Clamp(
                    this.touchInput.velocity * 20,
                    -this.PLAYER_SPEED,
                    this.PLAYER_SPEED
                );
                this.player.body.setVelocityX(impulse);
            }
        });
    }

    // ----------
    // UPDATE
    // ----------

    update() {
        this.updateParallaxBackground();
        this.updatePlayerMovement();
        this.updateEnemyMovement();
        this.updateTrail();
        this.updateShooting();
        this.cleanupBullets();
    }

    updateParallaxBackground() {
        const cameraX = this.cameras.main.scrollX;

        this.bgLayers.forEach(layer => {
            layer.graphics.clear();
            layer.graphics.fillStyle(0xffffff);

            layer.stars.forEach(star => {
                const parallaxX = (star.x - cameraX * layer.speed) % this.worldWidth;
                const wrappedX = parallaxX < 0 ? this.worldWidth + parallaxX : parallaxX;
                layer.graphics.fillCircle(wrappedX, star.y, star.size);
                layer.graphics.alpha = star.alpha;
            });
        });
    }

    updatePlayerMovement() {
        let movingLeft = false;
        let movingRight = false;

        if (this.cursors.left.isDown) {
            this.player.body.setAccelerationX(-this.PLAYER_ACCELERATION);
            movingLeft = true;
        } else if (this.cursors.right.isDown) {
            this.player.body.setAccelerationX(this.PLAYER_ACCELERATION);
            movingRight = true;
        } else if (this.touchInput.isDown) {
            const drag = this.touchInput.currentX - this.touchInput.startX;
            const absDrag = Math.abs(drag);

            if (absDrag > this.DRAG_THRESHOLD) {
                const accelFactor = Phaser.Math.Clamp(
                    absDrag / this.DRAG_MAX_DISTANCE,
                    0,
                    1
                );
                const targetAccel = this.PLAYER_ACCELERATION * accelFactor * Math.sign(drag);
                this.player.body.setAccelerationX(targetAccel + (this.touchInput.velocity * 2));
                movingLeft = (drag < 0);
                movingRight = (drag > 0);
            } else {
                this.player.body.setAccelerationX(0);
            }
        } else {
            this.player.body.setAccelerationX(0);
        }

        // Arrows show movement intensity
        const speedRatio = Math.abs(this.player.body.velocity.x) / this.PLAYER_SPEED;
        const arrowAlpha = (ratio) => 0.3 + 0.7 * ratio;

        this.leftArrow.setAlpha(movingLeft ? arrowAlpha(speedRatio) : 0);
        this.rightArrow.setAlpha(movingRight ? arrowAlpha(speedRatio) : 0);
    }

    updateEnemyMovement() {
        this.enemies.forEach(enemy => {
            // Simple horizontal chasing logic
            const dist = Math.abs(enemy.x - this.player.x);

            if (dist > 300) {
                const direction = (enemy.x < this.player.x) ? 1 : -1;
                enemy.body.setVelocityX(150 * direction);
            } else {
                if (enemy.body.velocity.x > 0 && enemy.x >= this.player.x + 200) {
                    enemy.body.setVelocityX(-150);
                } else if (enemy.body.velocity.x < 0 && enemy.x <= this.player.x - 200) {
                    enemy.body.setVelocityX(150);
                }
            }
        });
    }

    updateTrail() {
        const now = this.time.now;

        if (now - this.lastTrailTime >= this.trailInterval) {
            const dot = this.add.circle(this.player.x + 16, this.player.y + 32, 3, 0x4488ff);
            dot.creationTime = now;
            this.trail.push(dot);
            this.lastTrailTime = now;
        }

        for (let i = this.trail.length - 1; i >= 0; i--) {
            const dot = this.trail[i];
            const age = now - dot.creationTime;
            if (age >= this.trailFadeDuration) {
                dot.destroy();
                this.trail.splice(i, 1);
            } else {
                dot.setAlpha(1 - (age / this.trailFadeDuration));
            }
        }
    }

    updateShooting() {
        const now = this.time.now;

        // Player shooting (automatic)
        if (now - this.lastPlayerShot > this.PLAYER_SHOOT_DELAY) {
            this.shootPlayerBullet();
            this.lastPlayerShot = now;
        }

        // Enemy shooting
        this.enemies.forEach(enemy => {
            if (now - enemy.lastShot > this.ENEMY_SHOOT_DELAY) {
                this.shootEnemyBullet(enemy);
                enemy.lastShot = now;
            }
        });
    }

    shootPlayerBullet() {
        const bullet = this.playerBullets.create(this.player.x + 16, this.player.y + 32, null, null, false);
        if (bullet) {
            bullet.setFillStyle(0xff8888);
            bullet.setSize(4, 12);
            this.physics.world.enable(bullet);
            bullet.body.setSize(4, 12);
            bullet.body.setVelocityY(-this.BULLET_SPEED);
            bullet.setActive(true);
            bullet.setVisible(true);
        }
    }

    shootEnemyBullet(enemy) {
        const bullet = this.enemyBullets.create(enemy.x + 16, enemy.y + 32, null, null, false);
        if (bullet) {
            bullet.setFillStyle(0xff8888);
            bullet.setSize(4, 12);
            this.physics.world.enable(bullet);
            bullet.body.setSize(4, 12);
            bullet.body.setVelocityY(this.BULLET_SPEED);
            bullet.setActive(true);
            bullet.setVisible(true);
        }
    }

    cleanupBullets() {
        // Remove bullets that are out of bounds
        const cleanup = (bullet) => {
            if (bullet.y < 0 || bullet.y > this.scale.height) {
                bullet.destroy();
            }
        };

        this.playerBullets.children.each(cleanup);
        this.enemyBullets.children.each(cleanup);
    }
}

// Game config
const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.RESIZE,
        width: '100%',
        height: '100%',
        parent: 'game'
    },
    backgroundColor: '#000000',
    physics: {
        default: 'arcade',
        arcade: {
            debug: true,
            fps: 60
        }
    },
    scene: [MainScene]
};

// Launch game
const game = new Phaser.Game(config);

// Adjust camera/world bounds on resize
window.addEventListener('resize', () => {
    const scene = game.scene.scenes[0];
    if (scene) {
        scene.cameras.main.setBounds(0, 0, scene.worldWidth, window.innerHeight);
        scene.physics.world.setBounds(0, 0, scene.worldWidth, window.innerHeight);
    }
});
