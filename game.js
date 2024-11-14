class Example extends Phaser.Scene {
    constructor() {
        super({ key: 'Example' });

        // Joystick configurations
        this.leftJoystick = { base: null, thumb: null, pointerId: null, x: 0, y: 0, radius: 50 };
        this.rightJoystick = { base: null, thumb: null, pointerId: null, x: 0, y: 0, radius: 50 };

        // Game state
        this.score = 0;
        this.scoreText = null;
        this.obstacles = null;

        this.obstacleSpeed = 150;

        this.playerSpeed = 0.2;
    }

    preload() {
        // Load assets
        this.load.setBaseURL('https://cdn.phaserfiles.com/v385');
        this.load.image('logo', 'assets/sprites/phaser3-logo.png');
        this.load.image('obstacle', 'assets/sprites/block.png');
    }

    create() {
        // Make the game responsive to resizing
        this.scale.scaleMode = Phaser.Scale.RESIZE;
        this.scale.on('resize', this.resize, this);

        // Add extra pointers for joystick control
        this.input.addPointer(2);

        // Create sprites
        this.sprite1 = this.add.sprite(400, 100, 'logo');
        this.sprite2 = this.add.sprite(400, 300, 'logo');

        // Draw joysticks
        this.createJoystick(this.leftJoystick);
        this.createJoystick(this.rightJoystick);

        // Graphics for visualization
        this.graphics = this.add.graphics();

        // Score display
        this.scoreText = this.add.text(10, 10, 'Score: 0', { font: '16px Courier', fill: '#000000' });

        // Obstacle group
        this.obstacles = this.physics.add.group();

        // Timer for obstacle generation
        this.time.addEvent({
            delay: 1000,  // 1 second delay
            callback: this.generateObstacle,
            callbackScope: this,
            loop: true
        });

        // Collider to detect obstacle collision with sprites
        this.physics.add.collider(this.sprite1, this.obstacles, this.gameOver, null, this);
        this.physics.add.collider(this.sprite2, this.obstacles, this.gameOver, null, this);

        // sprites physics
        this.physics.world.enable([this.sprite1, this.sprite2]);

        // Set sprite bounce
        this.sprite1.body.setBounce(1);
        this.sprite2.body.setBounce(1);

        // sprites collide with world bounds
        this.sprite1.body.setCollideWorldBounds(true);
        this.sprite2.body.setCollideWorldBounds(true);

        // Resize the game to fit the screen
        this.resize({ width: window.innerWidth, height: window.innerHeight });
    }

    update() {
        const pointers = [this.input.pointer1, this.input.pointer2];

        pointers.forEach(pointer => {
            if (pointer && pointer.isDown) {
                this.handleJoystick(pointer, this.leftJoystick, this.sprite1);
                this.handleJoystick(pointer, this.rightJoystick, this.sprite2);
            } else if (pointer) {
                this.resetJoystick(pointer, this.leftJoystick);
                this.resetJoystick(pointer, this.rightJoystick);
            }
        });

        // Update score based on time survived
        this.score += 1;
        this.scoreText.setText('Score: ' + this.score);
    }

    createJoystick(joystick) {
        joystick.base = this.add.circle(joystick.x, joystick.y, joystick.radius, 0x888888);
        joystick.thumb = this.add.circle(joystick.x, joystick.y, 20, 0xcccccc);
    }

    handleJoystick(pointer, joystick, sprite) {
        if (joystick.pointerId === null && Phaser.Math.Distance.Between(pointer.x, pointer.y, joystick.x, joystick.y) < joystick.radius) {
            joystick.pointerId = pointer.id;
        }

        if (pointer.id === joystick.pointerId) {
            let deltaX = pointer.x - joystick.x;
            let deltaY = pointer.y - joystick.y;
            let distance = Phaser.Math.Clamp(Math.sqrt(deltaX * deltaX + deltaY * deltaY), 0, joystick.radius);
            let angle = Math.atan2(deltaY, deltaX);
            joystick.thumb.x = joystick.x + Math.cos(angle) * distance;
            joystick.thumb.y = joystick.y + Math.sin(angle) * distance;

            // Move sprite using joystick
            sprite.x += Math.cos(angle) * distance * this.playerSpeed;
            sprite.y += Math.sin(angle) * distance * this.playerSpeed;
        }
    }

    resetJoystick(pointer, joystick) {
        if (pointer.id === joystick.pointerId) {
            joystick.pointerId = null;
            joystick.thumb.x = joystick.x;
            joystick.thumb.y = joystick.y;
        }
    }

    generateObstacle() {
        // Randomly generate obstacles on either the left or right side
        let lane = Phaser.Math.Between(0, 1); // 0 for left, 1 for right
        let xPosition = lane === 0 ? 200 : 600;

        let obstacle = this.obstacles.create(xPosition, 0, 'obstacle');
        obstacle.setVelocityY(this.obstacleSpeed + this.score * 0.1); // Increase speed based on score
    }

    gameOver(sprite, obstacle) {
        this.scene.restart(); // Restart the scene on collision
    }

    resize(gameSize, baseSize, displaySize, resolution) {
        const width = gameSize.width;
        const height = gameSize.height;

        this.cameras.resize(width, height);

        // Adjust joystick positions based on new screen size
        this.updateJoystickPosition(this.leftJoystick, width * 0.15, height * 0.85);
        this.updateJoystickPosition(this.rightJoystick, width * 0.85, height * 0.85);
    }

    updateJoystickPosition(joystick, x, y) {
        joystick.x = x;
        joystick.y = y;
        joystick.base.setPosition(x, y);
        joystick.thumb.setPosition(x, y);
    }
}

const config = {
    type: Phaser.AUTO,
    parent: 'phaser-example',
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#efefef',
    scene: Example,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    }
};

const game = new Phaser.Game(config);