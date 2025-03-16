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
const actionCircleColorBlue = 0x1793D6;
const actionCircleColorGreen = 0x19CB63;
const actionCircleSize = 10;
const actionCircleSpeed = 2;
const hitZoneSize = 25;
const hitZoneColor = 0x404040;
const perfectHitZoneSize = 10;

// Variables to track the number of action circles spawned
let actionCircleCount = 0;

// Add a flag to track if a blue note is active
let blueNoteActive = false;

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
    this.healthBar = this.add.rectangle(350, 230, 100, 10, 0xff0000).setOrigin(0, 0);
    
    // Enemy name
    this.enemyName = this.add.text(350, 250, 'Enemy Name', { fontSize: '16px', fill: '#fff' }).setOrigin(0, 0);
    
    // Health percentage
    this.healthPercentage = this.add.text(350, 270, '100%', { fontSize: '16px', fill: '#fff' }).setOrigin(0, 0);

    // Action line
    this.actionLine = new Phaser.Geom.Line(400, 180, 400, 600);
    this.graphics = this.add.graphics({ lineStyle: { width: 1, color: 0x919191 } });
    this.graphics.strokeLineShape(this.actionLine);

    // Hit zone
    this.hitZone = this.add.circle(400, 480, hitZoneSize, hitZoneColor);

    // Action circles
    this.actionCircles = this.add.group();
    this.spawnEvent = this.time.addEvent({ delay: 500, callback: spawnActionCircle, callbackScope: this, loop: true });

    // Drag line
    this.dragLine = this.add.graphics({ lineStyle: { width: 2, color: 0x00ff00 } });

    // Perfect Hit Zone
    this.perfectHitZone = this.add.circle(400, 480, perfectHitZoneSize, 0xFFD700); // Gold color for distinction
    this.perfectHitZone.setAlpha(0.5); // Make it semi-transparent

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
        this.dragLine.lineStyle(2, 0xA3A3A3);
        this.dragLine.beginPath();
        this.dragLine.moveTo(startX, startY);
        this.dragLine.lineTo(pointer.x, pointer.y);
        this.dragLine.strokePath();

        // Calculate the direction and distance of the drag
        const dragDistanceX = pointer.x - startX;
        const dragDistanceY = pointer.y - startY;

        // Draw a parallel line from the hit zone
        const hitZoneX = this.hitZone.x;
        const hitZoneY = this.hitZone.y;
        this.dragLine.lineStyle(2, 0x4C4A9C); // Different color for distinction
        this.dragLine.beginPath();
        this.dragLine.moveTo(hitZoneX, hitZoneY);
        this.dragLine.lineTo(hitZoneX + dragDistanceX, hitZoneY + dragDistanceY);
        this.dragLine.strokePath();
    }
}

// Consolidate opacity update logic into a single function
function updateAllCirclesOpacity() {
    let foundFirstBlueNote = false;
    this.actionCircles.children.iterate(function (circle) {
        if (!foundFirstBlueNote) {
            circle.setAlpha(1); // Full opacity for notes before and including the first blue note
            if (circle.fillColor === actionCircleColorBlue) {
                foundFirstBlueNote = true;
            }
        } else {
            circle.setAlpha(0.3); // 0.3 opacity for notes after the first blue note
        }
    });
}

// Helper function to destroy a circle and its dot
function destroyCircleAndDot(circle) {
    circle.destroy();
    if (circle.dot) circle.dot.destroy();
}

// Modify the spawnActionCircle function to use the new helper function
function spawnActionCircle() {
    if (actionCircleCount < 4) {
        const isBlue = Math.random() > 0.75;
        const color = isBlue ? actionCircleColorBlue : actionCircleColorGreen;
        const circle = this.add.circle(400, 180, actionCircleSize, color);
        this.actionCircles.add(circle);
        actionCircleCount++;

        if (isBlue) {
            blueNoteActive = true;
            const dotPosition = Math.random() > 0.5 ? -1 : 1;
            const dot = this.add.circle(circle.x + dotPosition * (actionCircleSize + 2), circle.y, 3, 0xffffff);
            circle.dotPosition = dotPosition;
            circle.dot = dot;
        }

        updateAllCirclesOpacity.call(this);
    } else if (actionCircleCount >= 4) {
        this.spawnEvent.remove();
        this.time.addEvent({
            delay: 2000,
            callback: () => {
                actionCircleCount = 0;
                this.spawnEvent = this.time.addEvent({ delay: 500, callback: spawnActionCircle, callbackScope: this, loop: true });
            },
            callbackScope: this
        });
    }
}

// Consolidate effect creation into a single function
function createEffect(x, y, color, scale, duration) {
    const effect = this.add.circle(x, y, actionCircleSize, color);
    effect.setAlpha(0.8);
    this.tweens.add({
        targets: effect,
        scale: scale,
        alpha: 0,
        duration: duration,
        onComplete: function () {
            effect.destroy();
        }
    });
}

// Use the new createEffect function
function createHitEffect(x, y) {
    createEffect.call(this, x, y, 0xffffff, 5, 100);
}

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

function createPerfectHitEffect(x, y) {
    createEffect.call(this, x, y, 0xFFD700, 5, 100);
}

// Update the handlePointerUp function to use the new helper function
function handlePointerUp(pointer) {
    const endX = pointer.x;
    const endY = pointer.y;
    const distance = Phaser.Math.Distance.Between(startX, startY, endX, endY);
    const isSwipe = distance > 20;
    const swipeDirection = endX > startX ? 1 : -1;

    this.actionCircles.children.iterate(function (circle) {
        if (circle && Phaser.Geom.Intersects.CircleToCircle(circle, this.hitZone)) {
            const isPerfectHit = Phaser.Geom.Intersects.CircleToCircle(circle, this.perfectHitZone);
            const shouldDestroy = (isSwipe && circle.fillColor === actionCircleColorBlue && circle.dotPosition === swipeDirection) || (!isSwipe && circle.fillColor === actionCircleColorGreen);
            if (shouldDestroy) {
                createHitEffect.call(this, circle.x, circle.y);
                destroyCircleAndDot(circle);
                this.enemyHealth -= isPerfectHit ? 20 : 10;
                this.healthBar.width = (this.enemyHealth / 100) * 100;
                this.healthPercentage.setText(this.enemyHealth + '%');
                createSlashEffect.call(this);
                if (isPerfectHit) {
                    createPerfectHitEffect.call(this, circle.x, circle.y);
                }
                updateAllCirclesOpacity.call(this);
            }
        }
    }, this);
    this.dragLine.clear();
}

// Update the update function to use the new helper function
function update() {
    Phaser.Actions.IncY(this.actionCircles.getChildren(), actionCircleSpeed);
    this.actionCircles.children.iterate(function (circle) {
        if (circle && circle.y >= 600) {
            destroyCircleAndDot(circle);
            if (circle.fillColor === actionCircleColorBlue) {
                blueNoteActive = false;
            }
        } else if (circle) {
            if (circle.dot) {
                circle.dot.y = circle.y;
            }
        }
    });
    updateAllCirclesOpacity.call(this);
}
