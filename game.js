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

// Movement constants
const BASE_SPEED = 0.5;
const ACCELERATION_FACTOR = 1.01;
const MAX_SPEED = 5;

// Bar position constants
const BAR_START = 200;
const BAR_END = 600;
const CRITICAL_ZONE_WIDTH = 30;

// Timing constants
const INDICATOR_DELAY = 300;  // Time in ms between each indicator spawn

function preload() {
    // Load any assets if needed
}

function create() {
    // Create the progress bar background
    progressBar = this.add.rectangle(400, 300, BAR_END - BAR_START, 30, 0x666666);
    
    // Create the critical zone (green area)
    criticalZone = this.add.rectangle(500, 300, CRITICAL_ZONE_WIDTH, 30, 0x00ff00);
    
    // Create three indicators
    for (let i = 0; i < 3; i++) {
        let indicator = this.add.rectangle(BAR_START, 300, 10, 30, 0xff0000);
        indicator.visible = false;
        indicator.stopped = false;
        indicator.speed = BASE_SPEED;
        indicator.travelTime = 0;
        indicator.completed = false;
        indicators.push(indicator);
    }
    
    // Create the stop button
    startButton = this.add.rectangle(400, 500, 150, 50, 0x0000ff);
    startButton.setInteractive();
    startButton.on('pointerdown', startSequence);
    
    // Add score text
    scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#fff' });
    
    // Add instruction text
    this.add.text(400, 550, 'Click to Start!', { 
        fontSize: '24px', 
        fill: '#fff' 
    }).setOrigin(0.5);

    // Add click handler for stopping indicators
    this.input.on('pointerdown', stopOldestIndicator, this);
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
                    
                    // Move indicator with current speed
                    indicator.x += indicator.speed;
                    
                    // Only hide indicator if it's completely past the bar end plus its own width
                    if (indicator.x - indicator.width > BAR_END + 50) {
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
            if (indicator.x >= criticalZone.x - criticalZone.width/2 && 
                indicator.x <= criticalZone.x + criticalZone.width/2) {
                score += 100;
                scoreText.setText('Score: ' + score);
                
                // Visual feedback for success
                this.tweens.add({
                    targets: criticalZone,
                    scaleY: 1.2,
                    duration: 100,
                    yoyo: true
                });
            }
            
            // Change color to grey and fade out
            indicator.setFillStyle(0x888888);
            this.tweens.add({
                targets: indicator,
                alpha: 0,
                duration: 1000,
                onComplete: () => {
                    indicator.visible = false;
                    indicator.completed = true;  // Mark as completed when fade out is done
                    indicator.alpha = 1; // Reset alpha for next use
                }
            });
        }
    }
}

function startSequence() {
    if (!isActive) {
        isActive = true;
        currentIndicatorIndex = 0;
        
        // Reset and start indicators
        indicators.forEach((indicator, index) => {
            indicator.x = BAR_START;
            indicator.visible = false;
            indicator.stopped = false;
            indicator.speed = BASE_SPEED;
            indicator.travelTime = 0;
            indicator.completed = false;
            indicator.setFillStyle(0xff0000);
            indicator.alpha = 1;
            
            // Start each indicator with a delay
            setTimeout(() => {
                indicator.visible = true;
            }, index * INDICATOR_DELAY);
        });
    }
}
