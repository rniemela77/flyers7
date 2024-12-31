class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        
        this.settings = {
            timing: {
                tap: {
                    duration: 1200,    // Time for circle to shrink
                    perfect: 100,
                    good: 200
                },
                hold: {
                    duration: 1200,
                    perfect: 100,
                    good: 200
                },
                delay: 600
            },
            colors: {
                tap: {
                    outer: 0xff0000,    // Bright red for attack
                    target: 0xff9900,   // Orange for sweet spot
                    perfect: 0xff5500,  // Bright orange for perfect hits
                    good: 0xff8800      // Softer orange for good hits
                },
                hold: {
                    base: 0x4400ff,     // Deep purple for magic base
                    fill: 0x8800ff,     // Brighter purple for magic charge
                    perfect: 0xaa00ff,  // Bright purple for perfect release
                    good: 0x9900ff      // Medium purple for good release
                },
                particles: {
                    magic: 0x8800ff,    // Purple for magic particles
                    impact: 0xff5500    // Orange for hit particles
                }
            }
        };

        this.state = {
            score: 0,
            combo: 0,
            action: 'tap',
            canAct: false,
            holdStart: 0
        };
    }

    create() {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        
        this.createGameObjects(centerX, centerY);
        this.setupInput();
        this.startNextAction();
    }

    createGameObjects(x, y) {
        // Tap action objects (Sword attack)
        this.tapIndicator = this.add.container(x, y * 0.4);
        
        // Create sword shape
        const swordLength = 80;
        const swordWidth = 8;
        const handleLength = 20;
        
        // Create sword container
        this.sword = this.add.container(0, 0);
        
        // Sword blade
        this.swordBlade = this.add.rectangle(0, -swordLength/2, swordWidth, swordLength, this.settings.colors.tap.outer);
        // Sword handle
        this.swordHandle = this.add.rectangle(0, handleLength/2, swordWidth * 2, handleLength, this.settings.colors.tap.target);
        // Sword guard
        this.swordGuard = this.add.rectangle(0, 0, swordWidth * 3, swordWidth * 2, this.settings.colors.tap.target);
        
        this.sword.add([this.swordBlade, this.swordHandle, this.swordGuard]);
        
        // Strike zone (target)
        this.strikeZone = this.add.rectangle(0, 0, swordWidth * 2, swordLength * 1.2, this.settings.colors.tap.target)
            .setStrokeStyle(2, this.settings.colors.tap.target)
            .setFillStyle(0x000000, 0.2);
        
        this.tapIndicator.add([this.strikeZone, this.sword]);
        this.tapIndicator.setAlpha(0);
        
        // Hold action objects (Magic circle)
        this.holdIndicator = this.add.container(x, y * 0.4);
        
        // Outer circle
        this.holdCircle = this.add.circle(0, 0, 40, this.settings.colors.hold.base)
            .setStrokeStyle(3, this.settings.colors.hold.base);
        
        // Inner rotating elements
        this.innerElements = [];
        for (let i = 0; i < 3; i++) {
            const angle = (i * Math.PI * 2 / 3);
            const element = this.add.circle(
                Math.cos(angle) * 20,
                Math.sin(angle) * 20,
                5,
                this.settings.colors.hold.fill
            );
            this.innerElements.push(element);
        }
        
        // Charge progress ring
        this.chargeRing = this.add.arc(0, 0, 40, 270, 270, false)
            .setStrokeStyle(4, this.settings.colors.hold.fill);
        
        this.holdIndicator.add([this.holdCircle, this.chargeRing, ...this.innerElements]);
        this.holdIndicator.setAlpha(0);
        
        // Player zone
        this.hitZone = this.add.circle(x, y * 1.6, 60)
            .setStrokeStyle(2, 0x888888)
            .setFillStyle(0x000000, 0.2)
            .setInteractive({ useHandCursor: true });

        // UI elements
        this.scoreText = this.add.text(20, 20, '0', {
            fontSize: '48px',
            fill: '#ffffff',
            fontFamily: 'Arial Black'
        });

        this.comboText = this.add.text(20, 80, '', {
            fontSize: '32px',
            fill: '#ffff00',
            fontFamily: 'Arial Black'
        });

        // Action text
        this.actionText = this.add.text(x, y * 1.4, '', {
            fontSize: '24px',
            fill: '#ffffff',
            fontFamily: 'Arial Black'
        }).setOrigin(0.5);
    }

    setupInput() {
        this.hitZone.on('pointerdown', () => this.handleInputStart());
        this.hitZone.on('pointerup', () => this.handleInputEnd());

        this.input.keyboard.on('keydown-SPACE', () => this.handleInputStart());
        this.input.keyboard.on('keyup-SPACE', () => this.handleInputEnd());
    }

    startNextAction() {
        this.state.canAct = true;
        this.state.holdStart = 0;
        this.state.action = Math.random() < 0.5 ? 'tap' : 'hold';

        // Reset all indicators
        this.tapIndicator.setAlpha(0);
        this.holdIndicator.setAlpha(0);
        this.chargeRing.setAngle(0);
        
        if (this.currentTween) {
            this.currentTween.stop();
        }

        if (this.state.action === 'tap') {
            this.tapIndicator.setAlpha(1);
            this.actionText.setText('STRIKE!');
            
            // Reset sword to starting position (raised back)
            this.sword.setRotation(-Math.PI / 2);  // Start at -90 degrees
            
            // Swing animation
            this.currentTween = this.tweens.add({
                targets: this.sword,
                rotation: Math.PI / 2,  // Swing to +90 degrees
                duration: this.settings.timing.tap.duration,
                ease: 'Cubic.InOut'
            });
        } else {
            this.holdIndicator.setAlpha(1);
            this.actionText.setText('CHARGE SPELL!');
            
            // Rotate inner elements
            this.innerElements.forEach((element, index) => {
                this.tweens.add({
                    targets: element,
                    rotation: Math.PI * 2,
                    duration: 2000 - (index * 500),
                    repeat: -1,
                    ease: 'Linear'
                });
            });
        }
    }

    handleInputStart() {
        if (!this.state.canAct) return;

        if (this.state.action === 'hold') {
            this.startHoldAction();
        } else {
            this.checkTapTiming();
        }
    }

    handleInputEnd() {
        if (this.state.action === 'hold' && this.state.holdStart > 0) {
            this.checkHoldTiming();
        }
    }

    startHoldAction() {
        if (this.state.holdStart > 0) return;
        
        this.state.holdStart = this.time.now;
        this.chargeRing.setAlpha(0.8);
        this.updateHoldProgress();
        
        // Change action text
        this.actionText.setText('RELEASE AT FULL!');
    }

    updateHoldProgress() {
        if (this.state.holdStart === 0) return;

        const elapsed = this.time.now - this.state.holdStart;
        const progress = Math.min(elapsed / this.settings.timing.hold.duration, 1);
        
        // Update charge ring
        this.chargeRing.setEndAngle(270 + (360 * progress));

        if (this.state.holdStart > 0) {
            this.time.delayedCall(16, () => this.updateHoldProgress());
        }
    }

    checkHoldTiming() {
        const holdDuration = this.time.now - this.state.holdStart;
        const timingDiff = Math.abs(holdDuration - this.settings.timing.hold.duration);
        
        const isPerfect = timingDiff < this.settings.timing.hold.perfect;
        const isGood = timingDiff < this.settings.timing.hold.good;

        if (isPerfect || isGood) {
            this.handleSuccess(isPerfect);
        } else {
            this.handleFailure();
        }
    }

    checkTapTiming() {
        // Get the current rotation in degrees (normalized to 0-360)
        const currentRotation = ((this.sword.rotation * 180 / Math.PI) + 360) % 360;
        // Perfect is when sword is at 0 degrees (vertical)
        const rotationDiff = Math.abs(currentRotation);
        
        const isPerfect = rotationDiff < 15;   // Within 15 degrees of center
        const isGood = rotationDiff < 30;      // Within 30 degrees of center

        if (isPerfect || isGood) {
            this.handleSuccess(isPerfect);
        } else {
            this.handleFailure();
        }
    }

    handleSuccess(isPerfect) {
        this.state.score += isPerfect ? 100 : 50;
        this.state.combo++;
        this.updateUI();

        // Stop current animations
        this.state.canAct = false;
        if (this.currentTween) {
            this.currentTween.stop();
        }

        // Set feedback text and effect based on action type
        if (this.state.action === 'tap') {
            this.actionText.setText(isPerfect ? 'CRITICAL HIT!' : 'HIT!');
            
            // Create slash effect aligned with sword angle
            const slashAngle = this.sword.rotation;
            const slashLength = 100;
            const slashLine = this.add.line(
                this.hitZone.x,
                this.hitZone.y,
                Math.cos(slashAngle) * slashLength * -0.5,
                Math.sin(slashAngle) * slashLength * -0.5,
                Math.cos(slashAngle) * slashLength * 0.5,
                Math.sin(slashAngle) * slashLength * 0.5,
                isPerfect ? this.settings.colors.tap.perfect : this.settings.colors.tap.good
            ).setLineWidth(isPerfect ? 4 : 2);

            // Create impact flash
            const flash = this.add.circle(
                this.hitZone.x,
                this.hitZone.y,
                40,
                isPerfect ? this.settings.colors.tap.perfect : this.settings.colors.tap.good
            );

            // Animate effects
            this.tweens.add({
                targets: [slashLine, flash],
                alpha: { from: 1, to: 0 },
                scale: { from: 1, to: 1.5 },
                duration: 300,
                onComplete: () => {
                    slashLine.destroy();
                    flash.destroy();
                }
            });
        } else {
            this.actionText.setText(isPerfect ? 'SPELL MASTERED!' : 'SPELL CAST!');
            
            // Create magical burst effect
            const burstCircle = this.add.circle(
                this.hitZone.x,
                this.hitZone.y,
                40,
                isPerfect ? this.settings.colors.hold.perfect : this.settings.colors.hold.good
            );

            // Create magical rays
            const rays = [];
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI / 4);
                const ray = this.add.line(
                    this.hitZone.x,
                    this.hitZone.y,
                    0, 0,
                    Math.cos(angle) * 50,
                    Math.sin(angle) * 50,
                    isPerfect ? this.settings.colors.hold.perfect : this.settings.colors.hold.good
                ).setLineWidth(2);
                rays.push(ray);
            }

            // Animate magical burst
            this.tweens.add({
                targets: burstCircle,
                radius: { from: 40, to: 100 },
                alpha: { from: 0.8, to: 0 },
                duration: 400,
                onComplete: () => burstCircle.destroy()
            });

            // Animate rays
            this.tweens.add({
                targets: rays,
                scaleX: { from: 0.5, to: 1.5 },
                scaleY: { from: 0.5, to: 1.5 },
                alpha: { from: 1, to: 0 },
                duration: 400,
                onComplete: () => rays.forEach(ray => ray.destroy())
            });
        }

        this.time.delayedCall(this.settings.timing.delay, () => this.startNextAction());
    }

    handleFailure() {
        this.state.combo = 0;
        this.updateUI();

        // Stop current animations
        this.state.canAct = false;
        if (this.currentTween) {
            this.currentTween.stop();
        }

        // Set feedback based on action type
        this.actionText.setText(this.state.action === 'tap' ? 'MISSED STRIKE!' : 'SPELL FIZZLED!');

        // Miss animation
        const missEffect = this.add.circle(
            this.hitZone.x,
            this.hitZone.y,
            50,
            0x444444
        ).setAlpha(0.5);

        this.tweens.add({
            targets: [this.hitZone, missEffect],
            alpha: { from: 0.8, to: 0.3 },
            scale: { from: 0.8, to: 1 },
            duration: 200,
            onComplete: () => {
                missEffect.destroy();
                this.time.delayedCall(this.settings.timing.delay, () => this.startNextAction());
            }
        });
    }

    updateUI() {
        this.scoreText.setText(this.state.score);
        this.comboText.setText(this.state.combo > 1 ? `${this.state.combo}x` : '');
    }
}

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    scene: [MainScene],
    backgroundColor: '#1a1a1a'
};

const game = new Phaser.Game(config);