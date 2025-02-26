import Phaser from 'phaser';
import { GAME_CONFIG } from '../../config/gameConfig';
import { createExplosion, createEnemy } from '../../utils/effectUtils';

export class Enemy extends Phaser.GameObjects.Triangle {
    constructor(scene, x, y) {
        const x1 = 15; // left
        const y1 = 0; // top
        const x2 = 30; // right
        const y2 = 30; // bottom
        const x3 = 0; // left
        const y3 = 30; // bottom
        
        super(scene, x, y, x1, y1, x2, y2, x3, y3, 0x4444FF);
        
        this.setOrigin(0.5, 0.5);
        
        this.scene = scene;
        this.health = 100;
        this.isFrozen = false;
        this.currentTween = null;
        
        // Add shooting properties
        this.lastShotTime = 0;
        this.shootCooldown = 2000; // 2 seconds between shots
        this.projectileSpeed = 150;
        this.projectileDamage = 5;
        
        // Add movement properties
        this.movementSpeed = 60;
        
        // Bind shooting method
        this.tryToShoot = this.tryToShoot.bind(this);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        scene.enemies.add(this);
        
        // Enable collision with other enemies and set circular hitbox
        this.body.setCollideWorldBounds(true);
        this.body.setBounce(0.8, 0.8);
        this.body.setDrag(50);
        this.body.setMass(1);
        this.body.setCircle(15);
        this.body.setOffset(0, 0);
        
        // Create health bar
        this.healthBar = scene.add.graphics();
        this.healthBar.setDepth(2);
        
        // Create status effects container
        this.statusEffects = scene.add.graphics();
        this.statusEffects.setDepth(2);
        
        this.updateHealthBar();
        this.startMoving();
        
        // Start shooting behavior
        this.startShooting();
    }
    
    startShooting() {
        if (!this.active || this.isFrozen) return;
        
        this.scene.time.addEvent({
            delay: 16,
            callback: this.tryToShoot,
            callbackScope: this,
            loop: false
        });
    }
    
    tryToShoot() {
        if (!this.active || !this.scene || this.isFrozen) return;
        
        const currentTime = this.scene.time.now;
        const scene = this.scene;
        const homeBase = scene.homeBase;
        
        if (currentTime - this.lastShotTime >= this.shootCooldown && homeBase) {
            const angle = Phaser.Math.Angle.Between(
                this.x, this.y,
                homeBase.x, homeBase.y
            );
            
            this.rotation = angle + Math.PI/2;
            
            const projectile = scene.add.circle(this.x, this.y, 4, 0x4444FF);
            scene.physics.add.existing(projectile);
            scene.physics.velocityFromRotation(angle, this.projectileSpeed, projectile.body.velocity);
            
            projectile.cleanup = () => {
                if (projectile.active) {
                    if (scene.activeProjectiles) {
                        scene.activeProjectiles.delete(projectile);
                    }
                    projectile.destroy();
                }
            };
            
            if (!scene.activeProjectiles) {
                scene.activeProjectiles = new Set();
            }
            scene.activeProjectiles.add(projectile);
            
            const checkCollision = () => {
                if (!scene.scene.isActive() || !projectile.active) {
                    projectile.cleanup();
                    return;
                }
                
                const currentHomeBase = scene.homeBase;
                if (!currentHomeBase) {
                    projectile.cleanup();
                    return;
                }
                
                const distance = Phaser.Math.Distance.Between(
                    projectile.x, projectile.y,
                    currentHomeBase.x, currentHomeBase.y
                );
                
                if (distance <= currentHomeBase.radius) {
                    scene.updateHomeBaseHealth(this.projectileDamage);
                    createExplosion(scene, projectile.x, projectile.y);
                    projectile.cleanup();
                    return;
                }
                
                if (scene.scene.isActive() && projectile.active && currentHomeBase) {
                    scene.time.addEvent({
                        delay: 16,
                        callback: checkCollision,
                        callbackScope: this
                    });
                }
            };
            
            checkCollision();
            
            scene.time.delayedCall(3000, () => {
                projectile.cleanup();
            });
            
            this.lastShotTime = currentTime;
        }
        
        if (scene.scene.isActive() && homeBase) {
            scene.time.addEvent({
                delay: 16,
                callback: this.tryToShoot,
                callbackScope: this,
                loop: false
            });
        }
    }
    
    startMoving() {
        if (!this.active || this.isFrozen) return;
        
        const margin = 50;
        const newX = Phaser.Math.Between(margin, this.scene.game.config.width - margin);
        const newY = Phaser.Math.Between(margin, (this.scene.game.config.height / 2) - margin);
        
        const angle = Phaser.Math.Angle.Between(this.x, this.y, newX, newY);
        this.scene.physics.velocityFromRotation(angle, this.movementSpeed, this.body.velocity);
        
        const homeBaseAngle = Phaser.Math.Angle.Between(
            this.x, this.y,
            this.scene.homeBase.x, this.scene.homeBase.y
        );
        this.rotation = homeBaseAngle + Math.PI/2;
        
        this.scene.time.addEvent({
            delay: 16,
            callback: () => {
                if (this.active && !this.isFrozen) {
                    const currentAngle = Phaser.Math.Angle.Between(
                        this.x, this.y,
                        this.scene.homeBase.x, this.scene.homeBase.y
                    );
                    this.rotation = currentAngle + Math.PI/2;
                }
            },
            loop: true
        });
        
        this.scene.time.delayedCall(1500, () => {
            if (this.active) {
                this.startMoving();
            }
        });
    }
    
    freeze() {
        if (this.isFrozen) return;
        
        this.isFrozen = true;
        this.body.setVelocity(0, 0);
        this.setFillStyle(0x00FFFF);
        
        this.scene.time.delayedCall(1000, () => {
            if (this.active) {
                this.isFrozen = false;
                this.setFillStyle(0x4444FF);
                this.startMoving();
                this.startShooting();
            }
        });
    }
    
    updateHealthBar() {
        if (!this.active) return;
        
        this.healthBar.clear();
        this.statusEffects.clear();
        
        const barWidth = GAME_CONFIG.enemy.healthBar.width;
        const barHeight = GAME_CONFIG.enemy.healthBar.height;
        const barY = this.y - 20 - barHeight - GAME_CONFIG.enemy.healthBar.yOffset;
        const barX = this.x - barWidth/2;
        
        this.healthBar.fillStyle(0x333333);
        this.healthBar.fillRect(barX, barY, barWidth, barHeight);
        this.healthBar.fillStyle(0xFF0000);
        this.healthBar.fillRect(barX, barY, (this.health / 100) * barWidth, barHeight);
        
        if (this.isFrozen) {
            this.statusEffects.fillStyle(0x00FFFF);
            this.statusEffects.fillCircle(barX, barY - 5, 3);
        }
    }
    
    damage(amount) {
        this.health = Math.max(0, this.health - amount);
        this.updateHealthBar();
        
        if (this.health <= 0) {
            this.die();
        }
        
        return this.health <= 0;
    }
    
    die() {
        const scene = this.scene;
        this.healthBar.destroy();
        this.statusEffects.destroy();
        this.destroy();
        
        scene.time.delayedCall(1000, () => {
            createEnemy.call(scene);
        });
    }
} 