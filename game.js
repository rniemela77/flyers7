/*
RTS Game
-
enemy
    - portrait (square for now) located at 30% from the top, centered
    - health bar (rectangle) below the portrait, aligned left, 100% width, 10px height
    - name (text) below the health bar, aligned left, 100% width
    - health percentage (text) below the name, aligned left, 100% width

Combat
    - ActionLine:1 line segment going from the enemy to the bottom center of the screen
    - HitZone: a circle (grey) (25px) on that line segment, at about 75% of the way from the enemy to the bottom center of the screen
    - ActionCircle: a circle (10px) spawns on the line, at the enemy, and moves downward via the line
    - when the circle reaches the bottom center of the screen, it disappears
    - an ActionCircle spawns every 0.5s

HitZone:
    - on "pointerup", check if any ActionCircle is in the HitZone
    - if so, destroy the ActionCircle
    - if not, do nothing

ActionCircle types:
    - Green: destroyed by tap (pointerup anywhere on screen while the circle is in the HitZone)
    - Blue: destroyed by swipe (pointerdown and pointerup anywhere with a distance > 20px, while the circle is in the HitZone)

*/

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

// Initialize the game
const game = new Phaser.Game(config);

// Define constants for game elements
const actionCircleColorBlue = 0x547FFF;
const actionCircleColorGreen = 0x4BC87F;
const actionCircleSize = 10;
const actionCircleSpeed = 2;
const hitZoneSize = 25;
const hitZoneColor = 0x808080;

// Preload assets
function preload() {
    // Load assets here if needed
}

// Create game objects
function create() {
    // Initialize enemy health
    this.enemyHealth = 100;

    // Enemy portrait
    this.enemyPortrait = this.add.rectangle(400, 180, 100, 100, 0x6666ff);
    
    // Health bar
    this.healthBar = this.add.rectangle(0, 230, 800, 10, 0xff0000).setOrigin(0, 0);
    
    // Enemy name
    this.enemyName = this.add.text(0, 250, 'Enemy Name', { fontSize: '16px', fill: '#fff' }).setOrigin(0, 0);
    
    // Health percentage
    this.healthPercentage = this.add.text(0, 270, '100%', { fontSize: '16px', fill: '#fff' }).setOrigin(0, 0);

    // Action line
    this.actionLine = new Phaser.Geom.Line(400, 180, 400, 600);
    this.graphics = this.add.graphics({ lineStyle: { width: 2, color: 0xffffff } });
    this.graphics.strokeLineShape(this.actionLine);

    // Hit zone
    this.hitZone = this.add.circle(400, 480, hitZoneSize, hitZoneColor);

    // Action circles
    this.actionCircles = this.add.group();
    this.time.addEvent({ delay: 500, callback: spawnActionCircle, callbackScope: this, loop: true });

    // Drag line
    this.dragLine = this.add.graphics({ lineStyle: { width: 2, color: 0x00ff00 } });

    // Input handling
    this.input.on('pointerdown', handlePointerDown, this);
    this.input.on('pointerup', handlePointerUp, this);
    this.input.on('pointermove', handlePointerMove, this);
}

// Variables to track pointer movement
let startX, startY;

// Handle pointer down event
function handlePointerDown(pointer) {
    startX = pointer.x;
    startY = pointer.y;
}

// Handle pointer move event
function handlePointerMove(pointer) {
    if (pointer.isDown) {
        this.dragLine.clear();
        this.dragLine.lineStyle(2, 0x00ff00);
        this.dragLine.beginPath();
        this.dragLine.moveTo(startX, startY);
        this.dragLine.lineTo(pointer.x, pointer.y);
        this.dragLine.strokePath();
    }
}

// Handle pointer up event
function handlePointerUp(pointer) {
    const endX = pointer.x;
    const endY = pointer.y;
    const distance = Phaser.Math.Distance.Between(startX, startY, endX, endY);
    const isSwipe = distance > 20;

    this.actionCircles.children.iterate(function (circle) {
        if (circle && Phaser.Geom.Intersects.CircleToCircle(circle, this.hitZone)) {
            const shouldDestroy = (isSwipe && circle.fillColor === actionCircleColorBlue) || (!isSwipe && circle.fillColor === actionCircleColorGreen);
            if (shouldDestroy) {
                createHitEffect.call(this, circle.x, circle.y);
                circle.destroy();
                // Reduce enemy health
                this.enemyHealth -= 10;
                // Update health bar and percentage
                this.healthBar.width = (this.enemyHealth / 100) * 800;
                this.healthPercentage.setText(this.enemyHealth + '%');
                // Create slash effect
                createSlashEffect.call(this);
            }
        }
    }, this);
    this.dragLine.clear();
}

// Create a hit effect
function createHitEffect(x, y) {
    const hitEffect = this.add.circle(x, y, actionCircleSize, 0xffffff);
    hitEffect.setAlpha(0.8);
    this.tweens.add({
        targets: hitEffect,
        scale: 5,
        alpha: 0,
        duration: 100,
        onComplete: function () {
            hitEffect.destroy();
        }
    });
}

// Create a slash effect
function createSlashEffect() {
    const slash = this.add.rectangle(400, 180, 120, 10, 0xffffff);
    slash.setRotation(Phaser.Math.DegToRad(45));
    slash.setAlpha(0.8);
    this.tweens.add({
        targets: slash,
        alpha: 0,
        duration: 100,
        onComplete: function () {
            slash.destroy();
        }
    });
}

// Spawn an action circle
function spawnActionCircle() {
    const color = Math.random() > 0.5 ? actionCircleColorBlue : actionCircleColorGreen;
    const circle = this.add.circle(400, 180, actionCircleSize, color);
    this.actionCircles.add(circle);
}

// Update game state
function update() {
    Phaser.Actions.IncY(this.actionCircles.getChildren(), actionCircleSpeed);
    this.actionCircles.children.iterate(function (circle) {
        if (circle && circle.y >= 600) {
            circle.destroy();
        }
    });
}
