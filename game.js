class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        // Game objects
        this.player = null;
        this.enemy = null;
        this.enemyGlow = null;
        this.bullets = null;

        // Colors
        this.normalRed = 0xff0000;
        this.glowRed = 0xff3333;
        this.playerBlue = 0x0000ff;

        // Sizes
        this.enemySize = 50;
        this.glowExtraSize = 20;
        this.playerSize = 50;
        this.bulletSize = 10;

        // Positions
        this.enemyHeightRatio = 0.25;
        this.playerHeightRatio = 0.75;

        // Timing (in milliseconds)
        this.glowDuration = 1000;
        this.waitDuration = 2000;
        this.bulletLifetime = 2000;

        // Movement
        this.bulletSpeed = 800;
    }

    create() {
        // Create enemy glow effect (initially invisible)
        this.enemyGlow = this.add.rectangle(
            window.innerWidth / 2,
            window.innerHeight * this.enemyHeightRatio,
            this.enemySize + this.glowExtraSize,
            this.enemySize + this.glowExtraSize,
            this.glowRed
        );
        this.enemyGlow.setAlpha(0);

        // Create enemy (red square) in top half
        this.enemy = this.add.rectangle(
            window.innerWidth / 2,
            window.innerHeight * this.enemyHeightRatio,
            this.enemySize,
            this.enemySize,
            this.normalRed
        );

        // Create player (blue square) in bottom half
        this.player = this.add.rectangle(
            window.innerWidth / 2,
            window.innerHeight * this.playerHeightRatio,
            this.playerSize,
            this.playerSize,
            this.playerBlue
        );

        // Setup bullet group
        this.bullets = this.add.group();

        // Start the attack cycle
        this.startAttackCycle();
    }

    startAttackCycle() {
        const startGlow = () => {
            // Reset glow size and make it visible
            this.enemyGlow.setScale(1);
            this.enemyGlow.setAlpha(0.5);
            
            // Create a tween to make the glow pulse outward
            this.tweens.add({
                targets: this.enemyGlow,
                scaleX: 1.5,
                scaleY: 1.5,
                alpha: 0,
                duration: this.glowDuration,
                ease: 'Cubic.Out',
                onComplete: () => {
                    this.shootBullet();
                    // Start the next cycle
                    this.time.delayedCall(this.waitDuration, startGlow);
                }
            });
        };

        // Start first cycle after waitDuration
        this.time.delayedCall(this.waitDuration, startGlow);
    }

    shootBullet() {
        // Create bullet
        const bullet = this.add.rectangle(
            this.enemy.x,
            this.enemy.y,
            this.bulletSize,
            this.bulletSize,
            this.normalRed
        );
        this.bullets.add(bullet);

        // Calculate direction to player
        const angle = Phaser.Math.Angle.Between(
            this.enemy.x,
            this.enemy.y,
            this.player.x,
            this.player.y
        );

        // Set bullet velocity
        const velocityX = Math.cos(angle) * this.bulletSpeed;
        const velocityY = Math.sin(angle) * this.bulletSpeed;

        // Enable physics on the bullet
        this.physics.add.existing(bullet);
        bullet.body.setVelocity(velocityX, velocityY);

        // Destroy bullet when it goes off screen
        this.time.delayedCall(this.bulletLifetime, () => {
            bullet.destroy();
        });
    }
}
  
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    scene: [ MainScene ],
    backgroundColor: '#1B1B1B',
    parent: 'phaser-example',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    }
};
  
const game = new Phaser.Game(config);