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
let attackIndicator;
let playerHealth = 100;
let healthText;
let isAttacking = false;
let currentAttackDirection = null;
let playerRing;
let enemyHealth = 100;
let enemyHealthBar;
let enemyHealthBarBg;
let attackTimerBar;
let attackTimerBarBg;
let isCounterActive = false;
let counterTimer = null;
let counterGlow = null;
let counterText = null;
const COUNTER_WINDOW_DURATION = 2000; // 2 seconds to use counter-attack
const COUNTER_DAMAGE_MULTIPLIER = 2.5; // Counter-attacks deal 2.5x damage
const COLOR_COUNTER_READY = 0xFFFF00; // Yellow glow for counter state

// Movement constants
const BASE_SPEED = 0.5;
const ACCELERATION_FACTOR = 1.5;
const MAX_SPEED = 4;

// Bar position constants
const BAR_START = 100;
const BAR_END = 500;
const BAR_CENTER = (BAR_START + BAR_END) / 2;
const BAR_X = 650;
const CRITICAL_ZONE_HEIGHT = 30;
const BAR_WIDTH = 30;
const INDICATOR_WIDTH = 40;
const INDICATOR_HEIGHT = 4;

// Character constants
const CHARACTER_SIZE = 60;  // Slightly larger for better visibility
const CHARACTER_X = 400;
const PLAYER_Y = 400;      // Moved up slightly
const ENEMY_Y = 150;

// Timing constants
const INDICATOR_DELAY = 500;
const FADE_DURATION = 200;
const DODGE_DURATION = 1000;  // 1 second dodge
const MIN_SWIPE_DISTANCE = 50;  // Minimum distance for swipe detection

// Attack constants
const ATTACK_SPEED = 1;
const ATTACK_INDICATOR_SIZE = 15;
const ATTACK_DELAY_MIN = 4000;
const ATTACK_DELAY_MAX = 6000;
const DAMAGE_AMOUNT = 20;

// Color constants
const COLOR_INDICATOR = 0xFFFFFF;
const COLOR_CRITICAL = 0xFFA500;
const COLOR_BAR = 0x383838;
const COLOR_STOPPED = 0x888888;
const COLOR_PLAYER = 0x00FF00;
const COLOR_ENEMY = 0xFF0000;
const COLOR_ATTACK = 0xFF0000;  // Red for attack indicator
const COLOR_RING = 0x666666;  // Grey color for ring

// Add lane constants
const LANE_WIDTH = CHARACTER_SIZE / 3;  // Each lane is 1/3 of player width
const LANE_COLOR = 0x444444;
const LANE_BORDER_COLOR = 0x666666;
const LANE_BORDER_WIDTH = 2;
let leftLane, centerLane, rightLane;

// Add after other constants
const SLASH_DURATION = 300;  // Longer duration for more visibility
const SLASH_LENGTH = CHARACTER_SIZE * 2.5;  // Longer slash
const SLASH_WIDTH = 8;  // Thicker line
const SLASH_COLOR = 0xFFFFFF;  // Keep white color

// Add health bar constants
const HEALTH_BAR_WIDTH = 100;
const HEALTH_BAR_HEIGHT = 10;
const HEALTH_BAR_Y_OFFSET = 40;  // Distance above enemy
const COLOR_HEALTH_BAR = 0x00FF00;
const COLOR_HEALTH_BAR_BG = 0xFF0000;

// Add new constants for dodge visuals
const DODGE_ZONE_COLOR = 0x444444;  // More subtle color
const DODGE_ZONE_ALPHA = 0.3;       // Slightly more visible
const DODGE_ZONE_WIDTH = CHARACTER_SIZE * 1.2;  // Smaller, clearer zones
const DODGE_ZONE_HEIGHT = CHARACTER_SIZE;
let leftDodgeZone, rightDodgeZone;
let activeAttackLane = null;

// Add new constants
const ATTACK_TIMER_WIDTH = 80;
const ATTACK_TIMER_HEIGHT = 4;
const ATTACK_TIMER_Y_OFFSET = 30;  // Distance below enemy
const COLOR_TIMER_BAR = 0xFF6666;  // Light red
const COLOR_TIMER_BAR_BG = 0x333333;  // Dark grey

// Add after other constants
const COMBO_DECAY_TIME = 2000;  // Time window to maintain combo (ms)
const MAX_COMBO_MULTIPLIER = 5;  // Maximum combo multiplier
const CRITICAL_ZONE_MIN_HEIGHT = 15;  // Minimum critical zone height during max combo
const PERFECT_DODGE_BOOST_DURATION = 3000;  // Duration of attack speed boost after perfect dodge

// Add after other let declarations
let currentCombo = 0;
let comboTimer = null;
let comboText;
let comboMultiplier = 1;
let attackSpeedMultiplier = 1;
let perfectDodgeBoostActive = false;

// Add after other constants
const PERFECT_DODGE_WINDOW = 300;  // ms window for perfect dodge timing
const PERFECT_DODGE_SPEED_BOOST = 1.5;  // 50% faster attacks during boost

// Add after other constants
const XP_PER_HIT = 10;
const XP_PER_PERFECT_DODGE = 20;
const XP_PER_COUNTER = 30;
const BASE_XP_TO_LEVEL = 100;
const XP_SCALING_FACTOR = 1.5;

// Add new variables
let playerLevel = 1;
let currentXP = 0;
let xpToNextLevel = BASE_XP_TO_LEVEL;
let levelText;
let xpBar;
let xpBarBg;
let unlockedAbilities = {
    doubleCounter: false,  // Level 2: Chance for two counter windows
    comboShield: false,    // Level 3: Maintain combo through one hit
    timeFreeze: false,     // Level 4: Chance to slow time during perfect dodges
    chainCounter: false    // Level 5: Counter hits add to combo
};

function preload() {
    // Load any assets if needed
}

function create() {
    // Calculate lane height to stop at player and start after enemy
    const laneStopY = PLAYER_Y - CHARACTER_SIZE/2;  // Stop at top of player
    const laneStartY = ENEMY_Y + CHARACTER_SIZE/2;  // Start at bottom of enemy
    const laneHeight = laneStopY - laneStartY;
    const laneCenterY = laneStartY + (laneHeight / 2);

    // Store laneStopY as a property of the scene for use in update
    this.laneStopY = laneStopY;

    // Create lanes first (so they're behind everything else)
    leftLane = this.add.rectangle(
        CHARACTER_X - CHARACTER_SIZE/3, 
        laneCenterY, 
        LANE_WIDTH,
        laneHeight,
        LANE_COLOR
    );
    leftLane.setStrokeStyle(LANE_BORDER_WIDTH, LANE_BORDER_COLOR);
    
    centerLane = this.add.rectangle(
        CHARACTER_X,
        laneCenterY,
        LANE_WIDTH,
        laneHeight,
        LANE_COLOR
    );
    centerLane.setStrokeStyle(LANE_BORDER_WIDTH, LANE_BORDER_COLOR);
    
    rightLane = this.add.rectangle(
        CHARACTER_X + CHARACTER_SIZE/3,
        laneCenterY,
        LANE_WIDTH,
        laneHeight,
        LANE_COLOR
    );
    rightLane.setStrokeStyle(LANE_BORDER_WIDTH, LANE_BORDER_COLOR);
    
    // Set lane alpha for better visibility
    leftLane.setAlpha(0.5);
    centerLane.setAlpha(0.5);
    rightLane.setAlpha(0.5);

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
    
    // Create enemy character (same size as player)
    enemyCharacter = this.add.rectangle(CHARACTER_X, ENEMY_Y, CHARACTER_SIZE, CHARACTER_SIZE, COLOR_ENEMY);
    
    // Create enemy health bar background (red)
    enemyHealthBarBg = this.add.rectangle(
        CHARACTER_X,
        ENEMY_Y - HEALTH_BAR_Y_OFFSET,
        HEALTH_BAR_WIDTH,
        HEALTH_BAR_HEIGHT,
        COLOR_HEALTH_BAR_BG
    );
    
    // Create enemy health bar (green)
    enemyHealthBar = this.add.rectangle(
        CHARACTER_X,
        ENEMY_Y - HEALTH_BAR_Y_OFFSET,
        HEALTH_BAR_WIDTH,
        HEALTH_BAR_HEIGHT,
        COLOR_HEALTH_BAR
    );
    enemyHealthBar.setOrigin(0, 0.5);  // Set origin to left center
    enemyHealthBarBg.setOrigin(0, 0.5);
    
    // Position health bars correctly
    updateEnemyHealthBar();
    
    // Create dodge text (hidden by default)
    dodgeText = this.add.text(CHARACTER_X, PLAYER_Y - CHARACTER_SIZE, '*dodge*', {
        fontSize: '24px',
        fill: '#fff'
    }).setOrigin(0.5);
    dodgeText.visible = false;
    
    // Add score text
    scoreText = this.add.text(BAR_X - 100, 16, 'Score: ' + score, { fontSize: '32px', fill: '#fff' });
    
    // Create the timing button
    startButton = this.add.rectangle(BAR_X, 500, 150, 50, 0x0000ff);
    startButton.setInteractive();
    
    // Add button text
    this.add.text(BAR_X, 500, 'ATTACK', { 
        fontSize: '24px', 
        fill: '#fff' 
    }).setOrigin(0.5);

    // Add health text
    healthText = this.add.text(16, 16, 'Health: 100', { fontSize: '32px', fill: '#fff' });
    
    // Create attack indicator (initially invisible)
    const indicatorSize = LANE_WIDTH * 0.8;  // Slightly smaller than lane width
    attackIndicator = this.add.rectangle(CHARACTER_X, ENEMY_Y, indicatorSize, indicatorSize, COLOR_ATTACK);
    attackIndicator.visible = false;

    // Create attack timer bar background (dark grey)
    attackTimerBarBg = this.add.rectangle(
        CHARACTER_X,
        ENEMY_Y + ATTACK_TIMER_Y_OFFSET,
        ATTACK_TIMER_WIDTH,
        ATTACK_TIMER_HEIGHT,
        COLOR_TIMER_BAR_BG
    );
    
    // Create attack timer bar (light red)
    attackTimerBar = this.add.rectangle(
        CHARACTER_X - ATTACK_TIMER_WIDTH/2,
        ENEMY_Y + ATTACK_TIMER_Y_OFFSET,
        ATTACK_TIMER_WIDTH,
        ATTACK_TIMER_HEIGHT,
        COLOR_TIMER_BAR
    );
    attackTimerBar.setOrigin(0, 0.5);  // Set origin to left center

    // Store scene reference
    const currentScene = this;

    // Add button click handlers
    startButton.on('pointerdown', function() {
        if (!isActive) {
            startSequence();
        } else {
            stopOldestIndicator.call(currentScene);
        }
    });

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

    // Start enemy attack cycle
    scheduleNextAttack(this);

    // Create dodge zone indicators (always visible)
    leftDodgeZone = this.add.rectangle(
        CHARACTER_X - CHARACTER_SIZE * 1.5,
        PLAYER_Y,
        DODGE_ZONE_WIDTH,
        DODGE_ZONE_HEIGHT,
        DODGE_ZONE_COLOR
    );
    leftDodgeZone.setAlpha(DODGE_ZONE_ALPHA);

    rightDodgeZone = this.add.rectangle(
        CHARACTER_X + CHARACTER_SIZE * 1.5,
        PLAYER_Y,
        DODGE_ZONE_WIDTH,
        DODGE_ZONE_HEIGHT,
        DODGE_ZONE_COLOR
    );
    rightDodgeZone.setAlpha(DODGE_ZONE_ALPHA);

    // Add keyboard controls
    this.input.keyboard.on('keydown-SPACE', () => {
        if (!isActive) {
            startSequence();
        } else {
            stopOldestIndicator.call(this);
        }
    });

    this.input.keyboard.on('keydown-LEFT', () => {
        if (!isDodging) {
            executeDodge(this, 'left');
        }
    });

    this.input.keyboard.on('keydown-RIGHT', () => {
        if (!isDodging) {
            executeDodge(this, 'right');
        }
    });

    // Add visual hint text for controls
    this.add.text(CHARACTER_X, PLAYER_Y + CHARACTER_SIZE + 20, 
        '← → to dodge  |  SPACE to attack', { 
        fontSize: '18px', 
        fill: '#fff' 
    }).setOrigin(0.5);

    // Add combo text
    comboText = this.add.text(BAR_X - 100, 50, '', { 
        fontSize: '28px', 
        fill: '#ffff00',
        stroke: '#000000',
        strokeThickness: 4
    });
    comboText.visible = false;

    // Add level and XP display
    levelText = this.add.text(16, 60, 'Level: 1', { 
        fontSize: '24px', 
        fill: '#00ff00' 
    });
    
    // Add XP bar
    xpBarBg = this.add.rectangle(
        16,
        100,
        200,
        10,
        0x333333
    );
    xpBarBg.setOrigin(0, 0.5);
    
    xpBar = this.add.rectangle(
        16,
        100,
        0,
        10,
        0x00ff00
    );
    xpBar.setOrigin(0, 0.5);
    
    updateXPBar(this);
}

function executeDodge(scene, direction) {
    if (isDodging) return;
    
    isDodging = true;
    
    // Calculate dodge position
    const dodgeDistance = CHARACTER_SIZE * 1.5;
    const targetX = CHARACTER_X + (direction === 'right' ? dodgeDistance : -dodgeDistance);
    
    // Show dodge text
    dodgeText.setText(`*dodge ${direction}*`);
    dodgeText.visible = true;
    
    // Move player and ring with a smooth tween
    scene.tweens.add({
        targets: [playerCharacter, playerRing, dodgeText],
        x: targetX,
        duration: DODGE_DURATION / 2,  // Move out quickly
        ease: 'Power1',
        yoyo: true,  // Return to original position
        onComplete: () => {
            isDodging = false;
            dodgeText.visible = false;
        }
    });
}

function activateCounterWindow(scene) {
    isCounterActive = true;
    
    // Clean up any existing counter visuals
    cleanupCounterVisuals();
    
    // Add counter-ready visual effect
    counterGlow = scene.add.rectangle(
        playerCharacter.x,
        playerCharacter.y,
        CHARACTER_SIZE * 1.2,
        CHARACTER_SIZE * 1.2,
        COLOR_COUNTER_READY
    );
    counterGlow.setAlpha(0.3);
    
    // Pulse animation for counter glow
    scene.tweens.add({
        targets: counterGlow,
        alpha: 0.5,
        scale: 1.1,
        duration: 500,
        yoyo: true,
        repeat: -1
    });
    
    // Add "Counter Ready!" text
    counterText = scene.add.text(
        playerCharacter.x,
        playerCharacter.y - CHARACTER_SIZE,
        'Counter Ready!',
        { fontSize: '24px', fill: '#ffff00' }
    ).setOrigin(0.5);
    
    // Clear existing counter timer if any
    if (counterTimer) {
        counterTimer.destroy();
    }
    
    // Set timer to deactivate counter window
    counterTimer = scene.time.delayedCall(COUNTER_WINDOW_DURATION, () => {
        cleanupCounterVisuals();
        isCounterActive = false;
    });

    // Add double counter chance for level 2+
    if (unlockedAbilities.doubleCounter && Math.random() < 0.3) {
        scene.time.delayedCall(COUNTER_WINDOW_DURATION, () => {
            activateCounterWindow(scene);  // Activate second counter window
        });
    }
}

function cleanupCounterVisuals() {
    if (counterGlow) {
        counterGlow.destroy();
        counterGlow = null;
    }
    if (counterText) {
        counterText.destroy();
        counterText = null;
    }
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

    // Handle attack indicator movement with speed multiplier
    if (isAttacking && attackIndicator.visible) {
        attackIndicator.y += ATTACK_SPEED * attackSpeedMultiplier;
        
        // Check if indicator has reached the end of the lane
        if (attackIndicator.y >= this.laneStopY) {
            handleAttackImpact(this);
        }
    }
    
    // Update counter visuals position to follow player
    if (isCounterActive && counterGlow && counterText) {
        counterGlow.setPosition(playerCharacter.x, playerCharacter.y);
        counterText.setPosition(playerCharacter.x, playerCharacter.y - CHARACTER_SIZE);
    }
}

function createSlashEffect(scene, x, y) {
    // Create a diagonal line for the slash effect
    const slash = scene.add.rectangle(x, y, SLASH_LENGTH, SLASH_WIDTH, SLASH_COLOR);
    
    // Generate random angle between -30 and 30 degrees (mostly horizontal)
    const randomAngle = Phaser.Math.Between(-30, 30);
    slash.setAngle(randomAngle);
    
    // Add a bright glow effect
    slash.setBlendMode(Phaser.BlendModes.ADD);
    
    // Create a second slash for extra effect
    const slashGlow = scene.add.rectangle(x, y, SLASH_LENGTH + 4, SLASH_WIDTH + 4, SLASH_COLOR);
    slashGlow.setAngle(randomAngle);
    slashGlow.setBlendMode(Phaser.BlendModes.ADD);
    slashGlow.setAlpha(0.5);
    
    // Animate the main slash
    scene.tweens.add({
        targets: slash,
        alpha: { from: 1, to: 0 },
        scaleX: { from: 0.3, to: 1.8 },  // More dramatic scaling
        scaleY: { from: 1, to: 0.5 },
        duration: SLASH_DURATION,
        ease: 'Power2',
        onComplete: () => {
            slash.destroy();
        }
    });
    
    // Animate the glow effect
    scene.tweens.add({
        targets: slashGlow,
        alpha: { from: 0.5, to: 0 },
        scaleX: { from: 0.4, to: 2 },    // Larger glow scaling
        scaleY: { from: 1.2, to: 0.7 },
        duration: SLASH_DURATION * 1.2,   // Slightly longer duration for glow
        ease: 'Power2',
        onComplete: () => {
            slashGlow.destroy();
        }
    });
}

function stopOldestIndicator() {
    if (isActive) {
        const indicator = indicators.find(ind => ind.visible && !ind.stopped);
        
        if (indicator) {
            indicator.stopped = true;
            
            createSlashEffect(this, enemyCharacter.x, enemyCharacter.y);
            
            const isInCriticalZone = indicator.y >= criticalZone.y - criticalZone.height/2 && 
                                   indicator.y <= criticalZone.y + criticalZone.height/2;
            
            let damageMultiplier = comboMultiplier;  // Use combo multiplier as base
            
            // Apply counter-attack bonus if active
            if (isCounterActive) {
                damageMultiplier *= COUNTER_DAMAGE_MULTIPLIER;
                isCounterActive = false; // Consume the counter
                
                // Clear counter visuals and timer
                cleanupCounterVisuals();
                if (counterTimer) {
                    counterTimer.destroy();
                }
                
                // Add counter-attack effect
                const counterEffect = this.add.text(
                    enemyCharacter.x,
                    enemyCharacter.y,
                    'COUNTER!',
                    { fontSize: '32px', fill: '#ffff00' }
                ).setOrigin(0.5);
                
                this.tweens.add({
                    targets: counterEffect,
                    y: counterEffect.y - 50,
                    alpha: 0,
                    duration: 1000,
                    ease: 'Power2',
                    onComplete: () => counterEffect.destroy()
                });
            }
            
            if (isInCriticalZone) {
                gainXP(this, XP_PER_HIT);
                updateCombo(this, true);  // Increment combo on successful hit
                
                const baseScore = 100;
                const comboScore = Math.round(baseScore * damageMultiplier);
                score += comboScore;
                scoreText.setText('Score: ' + score);
                
                // Show combo score popup
                const scorePopup = this.add.text(
                    criticalZone.x + 50,
                    criticalZone.y,
                    `+${comboScore}`,
                    { fontSize: '24px', fill: '#ffff00' }
                ).setOrigin(0.5);
                
                this.tweens.add({
                    targets: scorePopup,
                    y: scorePopup.y - 50,
                    alpha: 0,
                    duration: 1000,
                    ease: 'Power2',
                    onComplete: () => scorePopup.destroy()
                });
                
                // Damage enemy on critical hits
                const baseDamage = 10;
                const totalDamage = Math.round(baseDamage * damageMultiplier);
                enemyHealth = Math.max(0, enemyHealth - totalDamage);
                updateEnemyHealthBar();
                
                // Show damage number
                const damageText = this.add.text(
                    enemyCharacter.x + 30,
                    enemyCharacter.y,
                    `-${totalDamage}`,
                    { fontSize: '24px', fill: damageMultiplier > 1 ? '#ffff00' : '#ff0000' }
                ).setOrigin(0.5);
                
                this.tweens.add({
                    targets: damageText,
                    y: damageText.y - 40,
                    alpha: 0,
                    duration: 800,
                    ease: 'Power2',
                    onComplete: () => damageText.destroy()
                });
                
                // Visual feedback
                this.tweens.add({
                    targets: criticalZone,
                    scaleX: 1.2,
                    duration: 100,
                    yoyo: true
                });
                
                // Enhanced shake for counter attacks
                const shakeIntensity = damageMultiplier > 1 ? 10 : 5;
                this.tweens.add({
                    targets: enemyCharacter,
                    x: CHARACTER_X - shakeIntensity,
                    yoyo: true,
                    duration: 50,
                    repeat: damageMultiplier > 1 ? 2 : 1
                });
                
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
                updateCombo(this, false);  // Reset combo on miss
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

function scheduleNextAttack(scene) {
    if (!scene) return;
    
    const delay = Phaser.Math.Between(ATTACK_DELAY_MIN, ATTACK_DELAY_MAX);
    
    // Reset and start the timer bar animation
    attackTimerBar.setSize(ATTACK_TIMER_WIDTH, ATTACK_TIMER_HEIGHT);
    attackTimerBar.setX(attackTimerBarBg.x - ATTACK_TIMER_WIDTH/2);
    
    // Animate the timer bar
    scene.tweens.add({
        targets: attackTimerBar,
        scaleX: 0,
        duration: delay,
        ease: 'Linear',
        onComplete: () => {
            startAttack(scene);
        }
    });
}

function startAttack(scene) {
    if (isAttacking) return;
    
    // Reset timer bar scale for next use
    attackTimerBar.setScale(1, 1);
    
    isAttacking = true;
    
    // Choose random attack direction: 'left', 'right', or 'center'
    const directions = ['left', 'right', 'center'];
    currentAttackDirection = directions[Phaser.Math.Between(0, 2)];
    
    // Position attack indicator based on direction
    attackIndicator.y = ENEMY_Y + CHARACTER_SIZE/2;  // Start at bottom of enemy
    
    // Highlight the attack lane
    if (activeAttackLane) {
        activeAttackLane.setAlpha(0.5);  // Reset previous lane
    }
    
    switch(currentAttackDirection) {
        case 'left':
            attackIndicator.x = CHARACTER_X - CHARACTER_SIZE/3;  // Match left lane position
            activeAttackLane = leftLane;
            // Highlight safe zone
            rightDodgeZone.setFillStyle(DODGE_ZONE_COLOR, 0.6);
            leftDodgeZone.setFillStyle(DODGE_ZONE_COLOR, 0.2);
            break;
        case 'right':
            attackIndicator.x = CHARACTER_X + CHARACTER_SIZE/3;  // Match right lane position
            activeAttackLane = rightLane;
            // Highlight safe zone
            leftDodgeZone.setFillStyle(DODGE_ZONE_COLOR, 0.6);
            rightDodgeZone.setFillStyle(DODGE_ZONE_COLOR, 0.2);
            break;
        default: // center
            attackIndicator.x = CHARACTER_X;  // Match center lane position
            activeAttackLane = centerLane;
            // Both zones are safe
            leftDodgeZone.setFillStyle(DODGE_ZONE_COLOR, 0.6);
            rightDodgeZone.setFillStyle(DODGE_ZONE_COLOR, 0.6);
    }
    
    // Make indicator size match lane width
    attackIndicator.width = LANE_WIDTH * 0.8;  // Slightly smaller than lane
    attackIndicator.height = LANE_WIDTH * 0.8;  // Square indicator
    
    // Highlight attack lane
    activeAttackLane.setAlpha(0.8);
    
    // Show attack warning text above enemy
    const warningText = scene.add.text(enemyCharacter.x, ENEMY_Y - CHARACTER_SIZE, 
        `*${currentAttackDirection}*`, { fontSize: '24px', fill: '#ff0000' }).setOrigin(0.5);
    
    // Fade out warning text
    scene.tweens.add({
        targets: warningText,
        alpha: 0,
        duration: 1000,
        onComplete: () => warningText.destroy()
    });
    
    attackIndicator.visible = true;
}

function handleAttackImpact(scene) {
    isAttacking = false;
    attackIndicator.visible = false;
    
    // Reset lane highlight
    if (activeAttackLane) {
        activeAttackLane.setAlpha(0.5);
        activeAttackLane = null;
    }
    
    // Reset dodge zone colors
    leftDodgeZone.setFillStyle(DODGE_ZONE_COLOR, DODGE_ZONE_ALPHA);
    rightDodgeZone.setFillStyle(DODGE_ZONE_COLOR, DODGE_ZONE_ALPHA);
    
    // Check if player successfully dodged based on position and timing
    const playerOffset = Math.abs(playerCharacter.x - CHARACTER_X);
    const isInDodgeZone = playerOffset > CHARACTER_SIZE;
    const dodgedCorrectly = isInDodgeZone && 
        ((currentAttackDirection === 'left' && playerCharacter.x > CHARACTER_X) ||
         (currentAttackDirection === 'right' && playerCharacter.x < CHARACTER_X) ||
         (currentAttackDirection === 'center' && isInDodgeZone));
    
    // Check for perfect dodge timing
    const isPerfectDodge = dodgedCorrectly && isDodging;
    
    if (!dodgedCorrectly) {
        playerHealth = Math.max(0, playerHealth - DAMAGE_AMOUNT);
        healthText.setText(`Health: ${playerHealth}`);
        resetCombo();  // Reset combo on taking damage
        
        // Add damage number effect
        const damageText = scene.add.text(
            playerCharacter.x, 
            playerCharacter.y, 
            `-${DAMAGE_AMOUNT}`, {
                fontSize: '24px',
                fill: '#ff0000'
            }
        ).setOrigin(0.5);
        
        scene.tweens.add({
            targets: damageText,
            y: damageText.y - 40,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => damageText.destroy()
        });

        scene.cameras.main.shake(200, 0.005);
        
        scene.tweens.add({
            targets: playerCharacter,
            alpha: 0.2,
            yoyo: true,
            duration: 100,
            repeat: 3
        });
    } else {
        // Successfully dodged - activate counter window
        activateCounterWindow(scene);
        
        if (isPerfectDodge) {
            gainXP(scene, XP_PER_PERFECT_DODGE);
            // Activate perfect dodge boost
            perfectDodgeBoostActive = true;
            attackSpeedMultiplier = PERFECT_DODGE_SPEED_BOOST;
            
            // Add visual feedback for perfect dodge
            const perfectDodgeText = scene.add.text(
                playerCharacter.x,
                playerCharacter.y - CHARACTER_SIZE * 1.5,
                'PERFECT DODGE!',
                { 
                    fontSize: '32px', 
                    fill: '#00ffff',
                    stroke: '#000000',
                    strokeThickness: 4 
                }
            ).setOrigin(0.5);
            
            // Add glow effect
            const glow = scene.add.rectangle(
                playerCharacter.x,
                playerCharacter.y,
                CHARACTER_SIZE * 2,
                CHARACTER_SIZE * 2,
                0x00ffff
            );
            glow.setAlpha(0.3);
            
            // Animate glow and text
            scene.tweens.add({
                targets: [glow, perfectDodgeText],
                alpha: 0,
                scaleX: 2,
                scaleY: 2,
                duration: 1000,
                ease: 'Power2',
                onComplete: () => {
                    glow.destroy();
                    perfectDodgeText.destroy();
                }
            });
            
            // Reset boost after duration
            scene.time.delayedCall(PERFECT_DODGE_BOOST_DURATION, () => {
                perfectDodgeBoostActive = false;
                attackSpeedMultiplier = 1;
            });
        } else {
            // Regular successful dodge
            const dodgeText = scene.add.text(
                playerCharacter.x,
                playerCharacter.y - CHARACTER_SIZE * 1.5,
                'Dodge!',
                { fontSize: '24px', fill: '#ffff00' }
            ).setOrigin(0.5);
            
            scene.tweens.add({
                targets: dodgeText,
                y: dodgeText.y - 30,
                alpha: 0,
                duration: 1000,
                ease: 'Power2',
                onComplete: () => dodgeText.destroy()
            });
        }
    }
    
    scheduleNextAttack(scene);
}

function updateEnemyHealthBar() {
    const barWidth = (enemyHealth / 100) * HEALTH_BAR_WIDTH;
    enemyHealthBar.setSize(barWidth, HEALTH_BAR_HEIGHT);
    enemyHealthBar.setX(enemyHealthBarBg.x - HEALTH_BAR_WIDTH/2);
}

function updateCombo(scene, success) {
    if (success) {
        currentCombo++;
        comboMultiplier = Math.min(1 + (currentCombo * 0.2), MAX_COMBO_MULTIPLIER);
        
        // Update combo text with scaling effect
        comboText.setText(`${currentCombo}x COMBO!`);
        comboText.visible = true;
        
        scene.tweens.add({
            targets: comboText,
            scale: { from: 1.5, to: 1 },
            duration: 200,
            ease: 'Back.easeOut'
        });
        
        // Adjust critical zone size based on combo
        const shrinkFactor = Math.max(0.5, 1 - (currentCombo * 0.1));
        const newHeight = Math.max(CRITICAL_ZONE_MIN_HEIGHT, CRITICAL_ZONE_HEIGHT * shrinkFactor);
        criticalZone.setSize(BAR_WIDTH, newHeight);
        
        // Clear existing combo timer
        if (comboTimer) comboTimer.destroy();
        
        // Set new combo timer
        comboTimer = scene.time.delayedCall(COMBO_DECAY_TIME, () => {
            resetCombo();
        });
    } else {
        resetCombo();
    }
}

function resetCombo() {
    if (unlockedAbilities.comboShield && currentCombo > 0) {
        // Use up combo shield instead of resetting
        unlockedAbilities.comboShield = false;
        return;
    }
    
    currentCombo = 0;
    comboMultiplier = 1;
    comboText.visible = false;
    criticalZone.setSize(BAR_WIDTH, CRITICAL_ZONE_HEIGHT);
    if (comboTimer) {
        comboTimer.destroy();
        comboTimer = null;
    }
}

function gainXP(scene, amount) {
    currentXP += amount;
    
    while (currentXP >= xpToNextLevel) {
        levelUp(scene);
    }
    
    updateXPBar(scene);
}

function levelUp(scene) {
    playerLevel++;
    currentXP -= xpToNextLevel;
    xpToNextLevel = Math.floor(BASE_XP_TO_LEVEL * Math.pow(XP_SCALING_FACTOR, playerLevel - 1));
    
    levelText.setText(`Level: ${playerLevel}`);
    
    // Level-up effect
    const levelUpText = scene.add.text(
        scene.cameras.main.centerX,
        scene.cameras.main.centerY,
        'LEVEL UP!',
        { 
            fontSize: '48px', 
            fill: '#00ff00',
            stroke: '#000000',
            strokeThickness: 6
        }
    ).setOrigin(0.5);
    
    // Add level-specific unlock text
    let unlockText = '';
    switch(playerLevel) {
        case 2:
            unlockedAbilities.doubleCounter = true;
            unlockText = 'Unlocked: Double Counter!';
            break;
        case 3:
            unlockedAbilities.comboShield = true;
            unlockText = 'Unlocked: Combo Shield!';
            break;
        case 4:
            unlockedAbilities.timeFreeze = true;
            unlockText = 'Unlocked: Time Freeze!';
            break;
        case 5:
            unlockedAbilities.chainCounter = true;
            unlockText = 'Unlocked: Chain Counter!';
            break;
    }
    
    if (unlockText) {
        const abilityText = scene.add.text(
            scene.cameras.main.centerX,
            scene.cameras.main.centerY + 50,
            unlockText,
            { 
                fontSize: '32px', 
                fill: '#00ffff',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5);
        
        scene.tweens.add({
            targets: [levelUpText, abilityText],
            alpha: 0,
            y: '-=50',
            duration: 2000,
            ease: 'Power2',
            onComplete: () => {
                levelUpText.destroy();
                abilityText.destroy();
            }
        });
    } else {
        scene.tweens.add({
            targets: levelUpText,
            alpha: 0,
            y: '-=50',
            duration: 2000,
            ease: 'Power2',
            onComplete: () => levelUpText.destroy()
        });
    }
    
    // Screen flash effect
    const flash = scene.add.rectangle(
        0, 0,
        scene.cameras.main.width,
        scene.cameras.main.height,
        0x00ff00
    );
    flash.setAlpha(0.3);
    flash.setDepth(999);
    
    scene.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 500,
        ease: 'Power2',
        onComplete: () => flash.destroy()
    });
}

function updateXPBar(scene) {
    const progress = currentXP / xpToNextLevel;
    const width = 200 * progress;
    
    scene.tweens.add({
        targets: xpBar,
        width: width,
        duration: 200,
        ease: 'Power1'
    });
}
