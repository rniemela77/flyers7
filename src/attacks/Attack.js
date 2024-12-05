import Entity from '../entities/Entity';
import { CONSTANTS } from '../constants';

export default class Attack extends Entity {
    constructor(scene, config = {}) {
        super(scene);
        
        this.owner = config.owner;
        this.damage = config.damage || 0;
        this.activeAttacks = [];
        this.targetTypes = config.targetTypes || ['enemy'];
    }

    isValidTarget(target) {
        return target && 
               target.isAlive && 
               target.isAlive() && 
               this.targetTypes.includes(target.type);
    }

    handleCollision(target, damage) {
        if (!this.isValidTarget(target)) return;

        target.takeDamage(damage);
        
        // Show damage number
        if (this.scene.createDamageNumber) {
            this.scene.createDamageNumber(damage, target.x, target.y);
        }
    }

    cleanupAttack(attack, duration) {
        this.scene.time.delayedCall(duration, () => {
            const index = this.activeAttacks.indexOf(attack);
            if (index > -1) {
                this.activeAttacks.splice(index, 1);
            }
            attack.destroy();
        });
    }

    findClosestTarget(targets) {
        if (!targets || !targets.length || !this.owner) return null;

        const ownerPos = this.owner.getPosition();
        let closest = null;
        let closestDistance = Infinity;

        targets.forEach(target => {
            if (!this.isValidTarget(target)) return;
            
            const targetPos = target.getPosition();
            const distance = Phaser.Math.Distance.Between(
                ownerPos.x, ownerPos.y,
                targetPos.x, targetPos.y
            );

            if (distance < closestDistance) {
                closest = target;
                closestDistance = distance;
            }
        });

        return closest;
    }

    getAngleBetween(point1, point2) {
        return Phaser.Math.Angle.Between(
            point1.x, point1.y,
            point2.x, point2.y
        );
    }

    createOutline(shape, config) {
        if (shape === 'circle') {
            const circle = this.scene.add.circle(
                config.x,
                config.y,
                config.size,
                config.color
            );
            circle.setStrokeStyle(2, config.color);
            circle.setFillStyle(0x000000, 0);
            return circle;
        }
        // Add other shapes as needed
        return null;
    }

    updatePosition(offsetX, offsetY) {
        this.activeAttacks.forEach(attack => {
            attack.x += offsetX;
            attack.y += offsetY;
        });
    }

    destroy() {
        this.activeAttacks.forEach(attack => attack.destroy());
        this.activeAttacks = [];
    }
} 