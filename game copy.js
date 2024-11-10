class SimpleEngagingGame extends Phaser.Scene {
    constructor() {
        super({ key: 'SimpleEngagingGame' });
    }

    preload() {
        this.load.image('player', 'path/to/player-image.png');
        this.load.image('target', 'path/to/target-image.png');
        this.load.image('obstacle', 'path/to/obstacle-image.png');
        this.load.image('obstacle2', 'path/to/obstacle2-image.png');
        this.load.image('obstacle3', 'path/to/obstacle3-image.png');
        this.load.image('powerup', 'path/to/powerup-image.png');
        this.load.image('chasingObstacle', 'path/to/chasing-obstacle-image.png');
        this.load.image('trail', 'path/to/trail-image.png');
    }

    create() {
        // Create player and target
        this.player = this.physics.add.sprite(200, 500, 'player').setInteractive();
        this.player.setCollideWorldBounds(true);
        this.player.setBounce(1.0); // Enable bounce when colliding with world bounds

        this.target = this.physics.add.sprite(Phaser.Math.Between(50, 350), 100, 'target');

        // Enable input for drag and release action
        this.input.on('pointerdown', this.handlePointerDown, this);
        this.input.on('pointerup', this.handlePointerUp, this);

        // Setup player speed and aiming mechanics
        this.aiming = false;
        this.aimStartPosition = new Phaser.Math.Vector2();

        // Create groups for different types of obstacles
        this.obstaclesType1 = this.physics.add.group();
        this.obstaclesType2 = this.physics.add.group();
        this.obstaclesType3 = this.physics.add.group();
        
        // Create all obstacles at once
        this.createObstacles();

        // Create a chasing obstacle
        this.chasingObstacle = this.physics.add.sprite(Phaser.Math.Between(50, 350), Phaser.Math.Between(50, 200), 'chasingObstacle');
        this.chasingObstacleSpeed = 100;

        // Add collision between player and obstacles
        this.physics.add.collider(this.player, this.obstaclesType1, this.handlePlayerCollision, null, this);
        this.physics.add.collider(this.player, this.obstaclesType2, this.handlePlayerCollision, null, this);
        this.physics.add.collider(this.player, this.obstaclesType3, this.handlePlayerCollision, null, this);
        this.physics.add.collider(this.player, this.chasingObstacle, this.handlePlayerCollision, null, this);

        // Add collision for player to bounce off the walls
        this.physics.world.setBoundsCollision(true, true, true, true);
        this.player.body.setCollideWorldBounds(true).setBounce(1.0);

        // Create graphics for projected movement
        this.graphics = this.add.graphics();

        // Power-up group and spawning
        this.powerUps = this.physics.add.group();
        this.time.addEvent({ delay: 5000, callback: this.spawnPowerUp, callbackScope: this, loop: true });
        this.physics.add.overlap(this.player, this.powerUps, this.handlePowerUpCollection, null, this);

        // Score setup
        this.score = 0;
        this.scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '16px', fill: '#ffffff' });

        // Resource meter setup
        this.resource = 100; // Starting value for resource meter
        this.resourceText = this.add.text(10, 30, 'Resource: 100', { fontSize: '16px', fill: '#ffffff' });

        // Resource bar setup
        this.resourceBar = this.add.rectangle(10, 50, 100, 10, 0x00ff00).setOrigin(0, 0);
        this.maxResource = 100;

        // Trail group setup
        this.trailGroup = this.add.group();
    }

    handlePointerDown(pointer) {
        // Start aiming when the player touches the screen
        this.aiming = true;
        this.aimStartPosition.set(pointer.position.x, pointer.position.y);
    }

    handlePointerUp(pointer) {
        if (this.aiming && this.resource > 0) {
            // Calculate the drag distance and increase sensitivity by 200%
            const dragDistanceX = (pointer.position.x - this.aimStartPosition.x) * 2.0;
            const dragDistanceY = (pointer.position.y - this.aimStartPosition.y) * 2.0;

            // Calculate the target position based on the player's current position and the adjusted drag distance
            const targetX = this.player.x + dragDistanceX;
            const targetY = this.player.y + dragDistanceY;

            // Deduct resource based on distance moved
            const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, targetX, targetY);
            this.resource -= Math.min(distance / 10, this.resource); // Deduct resource proportionally, capped at available resource
            this.updateResourceText();
            this.updateResourceBar();

            // Create a tween to move the player to the target position smoothly
            this.tweens.add({
                targets: this.player,
                x: targetX,
                y: targetY,
                duration: 100, // Duration to reach the target
                ease: 'Linear', // Change ease type to Linear for consistent movement
                onUpdate: () => {
                    // Create trail effect during dash
                    const trail = this.add.sprite(this.player.x, this.player.y, 'trail');
                    trail.setAlpha(0.5);
                    this.trailGroup.add(trail);
                    this.tweens.add({
                        targets: trail,
                        alpha: 0,
                        duration: 300,
                        ease: 'Linear', // Ensure trail fade is linear for consistent effect
                        onComplete: () => {
                            trail.destroy();
                        }
                    });
                },
                onComplete: () => {
                    this.player.setVelocity(0, 0); // Ensure velocity is zero after reaching the point
                }
            });

            this.aiming = false;
        }
    }

    update() {
        if (this.aiming) {
            // Draw projected movement dot while aiming
            this.graphics.clear();
            this.graphics.fillStyle(0xff0000, 1);
            this.graphics.fillCircle(
                this.player.x + (this.input.activePointer.x - this.aimStartPosition.x) * 2.0,
                this.player.y + (this.input.activePointer.y - this.aimStartPosition.y) * 2.0,
                5
            );
        } else {
            // Clear the graphics when not aiming
            this.graphics.clear();
        }

        // Gradually refill resource meter
        if (this.resource < this.maxResource) {
            this.resource += 0.1; // Adjust this value to control refill speed
            this.updateResourceText();
            this.updateResourceBar();
        }

        // Make the chasing obstacle follow the player with smoother movement
        const angleToPlayer = Phaser.Math.Angle.Between(
            this.chasingObstacle.x,
            this.chasingObstacle.y,
            this.player.x,
            this.player.y
        );

        const currentAngle = Phaser.Math.Angle.Wrap(this.chasingObstacle.rotation);
        const angleDifference = Phaser.Math.Angle.Wrap(angleToPlayer - currentAngle);

        // Adjust the rotation of the chasing obstacle
        const rotationSpeed = 0.05; // Adjust this value for smoother or faster rotation
        this.chasingObstacle.rotation += angleDifference * rotationSpeed;

        // Set the velocity based on the new rotation
        this.physics.velocityFromRotation(this.chasingObstacle.rotation, this.chasingObstacleSpeed, this.chasingObstacle.body.velocity);
    }

    updateResourceText() {
        // Update the resource meter text
        this.resourceText.setText('Resource: ' + Math.max(0, Math.floor(this.resource)));
    }

    updateResourceBar() {
        // Update the resource bar visually
        this.resourceBar.width = (this.resource / this.maxResource) * 100;
    }

    repositionTarget() {
        // Reposition target after player reaches it
        this.target.setPosition(Phaser.Math.Between(50, 350), Phaser.Math.Between(50, 600));
    }

    createObstacles() {
        // Create obstacles as before
        // ...
    }

    spawnPowerUp() {
        // Spawn a power-up at a random position
        const powerUp = this.powerUps.create(Phaser.Math.Between(50, 350), Phaser.Math.Between(50, 600), 'powerup');
        powerUp.body.setCollideWorldBounds(true);
        powerUp.body.setBounce(1);
    }

    handlePowerUpCollection(player, powerUp) {
        // Handle power-up collection
        powerUp.destroy();
        this.increaseScore(20); // Increase score for collecting power-up
        this.resource = Math.min(this.resource + 30, this.maxResource); // Restore resource, capped at maxResource
        this.updateResourceText();
        this.updateResourceBar();
        this.maxSpeed += 50; // Temporarily increase max speed

        // Reset max speed after 3 seconds
        this.time.delayedCall(3000, () => {
            this.maxSpeed -= 50;
        });
    }

    handlePlayerCollision(player, obstacle) {
        // Handle collision between player and obstacle
        this.scene.restart();
    }

    increaseScore(amount) {
        this.score += amount;
        this.scoreText.setText('Score: ' + this.score);
    }
}

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 400,
    height: 700,
    scene: SimpleEngagingGame,
    physics: {
        default: 'arcade',
        arcade: {
            // debug: true
            gravity: { y: 0 },
            bounce: 1.0,
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    }
};

const game = new Phaser.Game(config);
