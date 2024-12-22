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

const game = new Phaser.Game(config);

let progressBar;
let indicators = [];
let criticalZone;
let startButton;
let isActive = false;
let currentIndicatorIndex = 0;
let score = 0;
let scoreText;
let playerCharacter;
let enemyCharacter;
let dodgeText;
let isDodging = false;
let swipeStartX = null;

// Movement constants
const BASE_SPEED = 0.5;
const ACCELERATION_FACTOR = 1.5;
const MAX_SPEED = 4;

// Bar position constants
const BAR_START = 100;
const BAR_END = 500;
const BAR_CENTER = (BAR_START + BAR_END) / 2;
const BAR_X = 600;
const CRITICAL_ZONE_HEIGHT = 30;
const BAR_WIDTH = 30;
const INDICATOR_WIDTH = 40;
const INDICATOR_HEIGHT = 4;

// Character constants
const CHARACTER_SIZE = 50;
const CHARACTER_X = 200;
const PLAYER_Y = 400;
const ENEMY_Y = 200;

// Timing constants
const INDICATOR_DELAY = 500;
const FADE_DURATION = 200;
const DODGE_DURATION = 1000;  // 1 second dodge
const MIN_SWIPE_DISTANCE = 50;  // Minimum distance for swipe detection

// Color constants
const COLOR_INDICATOR = 0xFFFFFF;
const COLOR_CRITICAL = 0xFFA500;
const COLOR_BAR = 0x383838;
const COLOR_STOPPED = 0x888888;
const COLOR_PLAYER = 0x00FF00;
const COLOR_ENEMY = 0xFF0000;

function preload() {
    // Load any assets if needed
}

function create() {
    // Create the progress bar background (now vertical)
    progressBar = this.add.rectangle(BAR_X, (BAR_START + BAR_END) / 2, BAR_WIDTH, BAR_END - BAR_START, COLOR_BAR);
    
    // Create the critical zone (orange area) - centered vertically
    criticalZone = this.add.rectangle(BAR_X, BAR_CENTER, BAR_WIDTH, CRITICAL_ZONE_HEIGHT, COLOR_CRITICAL);
    
    // Create three indicators
    for (let i = 0; i < 3; i++) {
        let indicator = this.add.rectangle(BAR_X, BAR_START, INDICATOR_WIDTH, INDICATOR_HEIGHT, COLOR_INDICATOR);
        indicator.visible = false;
        indicator.stopped = false;
        indicator.speed = BASE_SPEED;
        indicator.travelTime = 0;
        indicator.completed = false;
        indicators.push(indicator);
    }
    
    // Create player character
    playerCharacter = this.add.rectangle(CHARACTER_X, PLAYER_Y, CHARACTER_SIZE, CHARACTER_SIZE, COLOR_PLAYER);
    
    // Create enemy character
    enemyCharacter = this.add.rectangle(CHARACTER_X, ENEMY_Y, CHARACTER_SIZE, CHARACTER_SIZE, COLOR_ENEMY);
    
    // Create dodge text (hidden by default)
    dodgeText = this.add.text(CHARACTER_X, PLAYER_Y - CHARACTER_SIZE, '*dodge*', {
        fontSize: '24px',
        fill: '#fff'
    }).setOrigin(0.5);
    dodgeText.visible = false;
    
    // Create the stop button
    startButton = this.add.rectangle(700, 300, 150, 50, 0x0000ff);
    startButton.setInteractive();
    startButton.on('pointerdown', startSequence);
    
    // Add score text
    scoreText = this.add.text(BAR_X - 100, 16, 'Score: 0', { fontSize: '32px', fill: '#fff' });
    
    // Add instruction text
    this.add.text(700, 350, 'Click to Start!', { 
        fontSize: '24px', 
        fill: '#fff' 
    }).setOrigin(0.5);

    // Add click handler for stopping indicators
    this.input.on('pointerdown', stopOldestIndicator, this);

    // Store scene reference
    const currentScene = this;

    // Add swipe detection
    this.input.on('pointerdown', function(pointer) {
        swipeStartX = pointer.x;
    });

    this.input.on('pointerup', function(pointer) {
        if (swipeStartX !== null && !isDodging) {
            const swipeDistance = pointer.x - swipeStartX;
            
            if (Math.abs(swipeDistance) >= MIN_SWIPE_DISTANCE) {
                executeDodge(currentScene, swipeDistance > 0 ? 'right' : 'left');
            }
        }
        swipeStartX = null;
    });
}

function executeDodge(scene, direction) {
    if (isDodging) return;
    
    isDodging = true;
    
    // Show dodge text
    dodgeText.setText(`*dodge ${direction}*`);
    dodgeText.visible = true;
    
    // Make player semi-transparent
    playerCharacter.setAlpha(0.5);
    
    // Reset after dodge duration using the scene's timer
    scene.time.delayedCall(DODGE_DURATION, () => {
        isDodging = false;
        dodgeText.visible = false;
        playerCharacter.setAlpha(1);
    }, [], scene);  // Pass the scene context
}

function update() {
    if (isActive) {
        let allCompleted = true;
        
        // Move visible indicators that haven't been stopped
        indicators.forEach((indicator, index) => {
            if (!indicator.completed) {
                allCompleted = false;
                
                if (indicator.visible && !indicator.stopped) {
                    // Update travel time
                    indicator.travelTime += 1/60; // Assuming 60 FPS
                    
                    // Calculate new speed with exponential acceleration
                    indicator.speed = Math.min(
                        BASE_SPEED * Math.pow(ACCELERATION_FACTOR, indicator.travelTime * 10),
                        MAX_SPEED
                    );
                    
                    // Move indicator downward
                    indicator.y += indicator.speed;
                    
                    // Only hide indicator if it's completely past the bar end plus its own height
                    if (indicator.y - indicator.height > BAR_END + 50) {
                        indicator.visible = false;
                        indicator.completed = true;
                    }
                }
            }
        });
        
        // Only reset isActive when all indicators are complete
        if (allCompleted) {
            isActive = false;
        }
    }
}

function stopOldestIndicator() {
    if (isActive) {
        // Find the oldest visible indicator that hasn't been stopped
        const indicator = indicators.find(ind => ind.visible && !ind.stopped);
        
        if (indicator) {
            indicator.stopped = true;
            
            // Check if in critical zone
            const isInCriticalZone = indicator.y >= criticalZone.y - criticalZone.height/2 && 
                                   indicator.y <= criticalZone.y + criticalZone.height/2;
            
            if (isInCriticalZone) {
                score += 100;
                scoreText.setText('Score: ' + score);
                
                // Visual feedback for success
                this.tweens.add({
                    targets: criticalZone,
                    scaleX: 1.2,  // Scale horizontally now instead of vertically
                    duration: 100,
                    yoyo: true
                });
                
                // Keep white color but lower opacity for success
                this.tweens.add({
                    targets: indicator,
                    alpha: 0.3,
                    duration: FADE_DURATION,
                    onComplete: () => {
                        indicator.visible = false;
                        indicator.completed = true;
                        indicator.alpha = 1;
                    }
                });
            } else {
                // Miss - turn grey and fade out
                indicator.setFillStyle(COLOR_STOPPED);
                this.tweens.add({
                    targets: indicator,
                    alpha: 0,
                    duration: FADE_DURATION,
                    onComplete: () => {
                        indicator.visible = false;
                        indicator.completed = true;
                        indicator.alpha = 1;
                    }
                });
            }
        }
    }
}

function startSequence() {
    if (!isActive) {
        isActive = true;
        currentIndicatorIndex = 0;
        
        // Reset and start indicators
        indicators.forEach((indicator, index) => {
            indicator.y = BAR_START;
            indicator.visible = false;
            indicator.stopped = false;
            indicator.speed = BASE_SPEED;
            indicator.travelTime = 0;
            indicator.completed = false;
            indicator.setFillStyle(COLOR_INDICATOR);
            indicator.alpha = 1;
            
            // Start each indicator with a delay
            setTimeout(() => {
                indicator.visible = true;
            }, index * INDICATOR_DELAY);
        });
    }
}
