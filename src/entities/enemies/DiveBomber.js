import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { GAME_CONFIG } from '../../config/gameConfig';
import { createExplosion } from '../../utils/effectUtils';

export class DiveBomber extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y);
        
        // Override color to red
        this.setFillStyle(0xFF4444);
        
        // DiveBomber specific properties
        this.state = 'patrolling';
        this.stateTimer = 0;
        this.patrolDuration = Phaser.Math.Between(2000, 4000);
        this.diveSpeed = 300;
        this.patrolSpeed = 100;
        this.horizontalSpeed = 50;
        this.horizontalDirection = Math.random() < 0.5 ? -1 : 1;
        
        // Bind methods
        this.updateMovement = this.updateMovement.bind(this);
        this.startPatrolling = this.startPatrolling.bind(this);
        this.explodeAtHomeBase = this.explodeAtHomeBase.bind(this);
        
        // Start patrolling instead of default movement
        this.startPatrolling();
    }
    
    startPatrolling() {
        if (!this.active || this.isFrozen) return;
        
        this.state = 'patrolling';
        this.stateTimer = 0;
        
        const margin = 50;
        const newX = Phaser.Math.Between(margin, this.scene.game.config.width - margin);
        const newY = Phaser.Math.Between(margin, this.scene.game.config.height / 4);
        
        const angle = Phaser.Math.Angle.Between(this.x, this.y, newX, newY);
        this.scene.physics.velocityFromRotation(angle, this.patrolSpeed, this.body.velocity);
        
        this.scene.time.addEvent({
            delay: 16,
            callback: this.updateMovement,
            callbackScope: this,
            loop: false
        });
    }
    
    updateMovement() {
        if (!this.active || this.isFrozen) return;
        
        this.stateTimer += 16;
        
        const angle = Phaser.Math.Angle.Between(
            this.x, this.y,
            this.scene.homeBase.x, this.scene.homeBase.y
        );
        this.rotation = angle + Math.PI/2;
        
        switch (this.state) {
            case 'patrolling':
                if (this.stateTimer >= this.patrolDuration) {
                    this.state = 'horizontal';
                    this.stateTimer = 0;
                    this.pauseStarted = false;
                    this.body.setVelocity(this.horizontalSpeed * this.horizontalDirection, 0);
                }
                else if (this.x <= 50 || this.x >= this.scene.game.config.width - 50) {
                    this.body.velocity.x *= -1;
                }
                break;
                
            case 'horizontal':
                if (this.stateTimer >= 1000 && !this.pauseStarted) {
                    this.body.setVelocity(0, 0);
                    this.pauseStarted = true;
                    
                    this.scene.time.delayedCall(100, () => {
                        if (this.active && !this.isFrozen) {
                            this.state = 'diving';
                            this.stateTimer = 0;
                            
                            const diveAngle = Phaser.Math.Angle.Between(
                                this.x, this.y,
                                this.scene.homeBase.x, this.scene.homeBase.y
                            );
                            this.scene.physics.velocityFromRotation(diveAngle, this.diveSpeed, this.body.velocity);
                        }
                    });
                }
                break;
                
            case 'diving':
                const distance = Phaser.Math.Distance.Between(
                    this.x, this.y,
                    this.scene.homeBase.x, this.scene.homeBase.y
                );
                
                if (distance <= this.scene.homeBase.radius) {
                    this.explodeAtHomeBase();
                    return;
                }
                break;
        }
        
        if (this.active && !this.isFrozen) {
            this.scene.time.addEvent({
                delay: 16,
                callback: this.updateMovement,
                callbackScope: this,
                loop: false
            });
        }
    }
    
    explodeAtHomeBase() {
        const scene = this.scene;
        scene.updateHomeBaseHealth(GAME_CONFIG.homeBase.damageFromCollision);
        
        const explosion = scene.add.graphics();
        explosion.setDepth(3);
        
        scene.tweens.add({
            targets: { progress: 0 },
            progress: 1,
            duration: 200,
            onUpdate: (tween) => {
                const progress = tween.targets[0].progress;
                explosion.clear();
                
                const radius = 30 * (1 + progress);
                explosion.fillStyle(0xFF4444, 1 - progress);
                explosion.fillCircle(this.x, this.y, radius);
                
                explosion.fillStyle(0xFFFFFF, (1 - progress) * 0.8);
                explosion.fillCircle(this.x, this.y, radius * 0.6);
            },
            onComplete: () => {
                explosion.destroy();
            }
        });
        
        this.die();
    }
    
    // Override startMoving to prevent default movement behavior
    startMoving() {
        this.startPatrolling();
    }
    
    // Override freeze to use red color on unfreeze
    freeze() {
        if (this.isFrozen) return;
        
        this.isFrozen = true;
        this.body.setVelocity(0, 0);
        this.setFillStyle(0x00FFFF);
        
        this.scene.time.delayedCall(1000, () => {
            if (this.active) {
                this.isFrozen = false;
                this.setFillStyle(0xFF4444); // Reset to red color
                this.startPatrolling();
            }
        });
    }
} 