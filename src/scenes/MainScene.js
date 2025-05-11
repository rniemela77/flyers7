// import Phaser from 'phaser';
import Tank from '../entities/Tank.js';
import Archer from '../entities/Archer.js';
import Assassin from '../entities/Assassin.js';
import Healer from '../entities/Healer.js';
import { createBars, addInputEvents, barWidth } from '../utils/helpers.js';

class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' });
    this.units = []; // Initialize the units array
  }

  preload() {
    this.load.image('tank', 'assets/images/tank.png');
    this.load.image('archer', 'assets/images/archer.png');
    this.load.image('assassin', 'assets/images/assassin.png');
    this.load.image('healer', 'assets/images/healer.png');
  }

  create() {
    const { width, height } = this.scale;
    this.topGroup = this.physics.add.group();
    this.bottomGroup = this.physics.add.group();

    const teams = this.initializeTeams();
    teams.forEach(team => this.createUnits(team, width, height));
    this.setupPhysics();
  }

  initializeTeams() {
    return [
      {
        side: 'top',
        color: 0xFF8B8B,
        group: this.topGroup,
        units: { tank: 1, archer: 1, assassin: 1, healer: 1 }
      },
      {
        side: 'bottom',
        color: 0x7575FF,
        group: this.bottomGroup,
        units: { tank: 1, archer: 1, assassin: 1, healer: 1 }
      }
    ];
  }

  createUnits(team, width, height) {
    Object.entries(team.units).forEach(([unitType, count]) => {
      for (let i = 0; i < count; i++) {
        const x = Phaser.Math.Between(50, width - 50);
        const y = team.side === 'top'
          ? Phaser.Math.Between(50, 150)
          : Phaser.Math.Between(height - 150, height - 50);

        let unit;
        switch (unitType) {
          case 'tank':
            unit = new Tank(this, team, x, y);
            break;
          case 'archer':
            unit = new Archer(this, team, x, y);
            break;
          case 'assassin':
            unit = new Assassin(this, team, x, y);
            break;
          case 'healer':
            unit = new Healer(this, team, x, y);
            break;
        }
        this.units.push(unit);
      }
    });
  }

  setupPhysics() {
    this.physics.add.collider(this.topGroup, this.topGroup);
    this.physics.add.collider(this.bottomGroup, this.bottomGroup);
  }

  update(time, delta) {
    // DEBUG: warn if any unit.team ever changes
    this.units.forEach(u => {
      if (!u._initialTeam) {
        u._initialTeam = u.team;
      } else if (u.team !== u._initialTeam) {
        console.warn(`Unit switched from ${u._initialTeam} to ${u.team}`, u);
      }
    });

    // Remove dead units
    this.units = this.units.filter(u => {
      if (u.hp <= 0) {
        u.sprite.destroy();
        u.healthBar.destroy();
        u.damageBar.destroy();
        u.swingTimerBar.destroy();
        u.notches.forEach(n => n.destroy());
        return false;
      }
      return true;
    });

    // Compute friendly cluster centers
    const centers = {};
    this.units.forEach(u => {
      if (!centers[u.team]) centers[u.team] = { xSum: 0, ySum: 0, count: 0 };
      centers[u.team].xSum += u.sprite.x;
      centers[u.team].ySum += u.sprite.y;
      centers[u.team].count++;
    });

    this.units.forEach(u => {
      const {
        type, sprite, body, dmg, heal,
        damageBar, healthBar, notches, offsets,
        swingTimerBar, attackCooldown, healCooldown,
        rangeCircle
      } = u;

      swingTimerBar.setVisible(false);

      if (type === 3) {
        // Healer behavior
        const allies = this.units.filter(a => a.team === u.team && a.hp < a.maxHp && a !== u);
        let acted = false;
        if (allies.length) {
          const target = allies.reduce(
            (min, a) => (a.hp/a.maxHp < min.hp/min.maxHp ? a : min),
            allies[0]
          );
          const dist = Phaser.Math.Distance.Between(
            sprite.x, sprite.y,
            target.sprite.x, target.sprite.y
          );
          if (dist <= u.range) {
            body.setVelocity(0);
            swingTimerBar.setVisible(true);
            u.swingTimer += delta;
            const swingRatio = Phaser.Math.Clamp(u.swingTimer / healCooldown, 0, 1);
            swingTimerBar.width = barWidth * swingRatio;
            swingTimerBar.setPosition(sprite.x - barWidth/2, sprite.y - 10);

            if (swingRatio >= 1) {
              u.swingTimer = 0; // Reset immediately
              u.lastHealTime = time;
              target.hp = Phaser.Math.Clamp(target.hp + heal, 0, target.maxHp);

              // Healing beam
              const healerPosition = {
                x: sprite.x,
                y: sprite.y
              };
              const targetPosition = {    
                x: target.sprite.x,
                y: target.sprite.y
              };
              const beam = this.add.line(
                healerPosition.x, healerPosition.y,
                0, 0,
                targetPosition.x - healerPosition.x,
                targetPosition.y - healerPosition.y,
                0x00ff00
              )
              .setOrigin(0, 0)
              .setLineWidth(8).setAlpha(0.3);
              this.tweens.add({
                targets: beam,
                alpha: 0,
                duration: 200,
                onComplete: () => beam.destroy()
              });

              // After healing occurs, add healing text effect
              const healText = this.add.text(
                target.sprite.x,
                target.sprite.y - 30,
                `+${heal}`,
                { font: '16px Arial', fill: '#00ff00', stroke: '#000', strokeThickness: 2 }
              ).setOrigin(0.5);
              this.tweens.add({
                targets: healText,
                y: target.sprite.y - 50,
                alpha: 0,
                duration: 800,
                onComplete: () => healText.destroy()
              });
            }
          } else {
            // Move toward injured ally
            const dx = target.sprite.x - sprite.x;
            const dy = target.sprite.y - sprite.y;
            const len = Math.hypot(dx, dy) || 1;
            body.setVelocity((dx/len)*u.speed, (dy/len)*u.speed);
            sprite.setFlipX(dx < 0);
          }
        }
        if (!acted) {
          // Return to cluster center
          const center = centers[u.team];
          const cx = center.xSum / center.count;
          const cy = center.ySum / center.count;
          const distC = Phaser.Math.Distance.Between(sprite.x, sprite.y, cx, cy);
          const radius = 100;
          if (distC > radius) {
            const dx = cx - sprite.x;
            const dy = cy - sprite.y;
            const len = Math.hypot(dx, dy) || 1;
            body.setVelocity((dx/len)*u.speed, (dy/len)*u.speed);
            sprite.setFlipX(dx < 0);
          } else {
            body.setVelocity(0);
          }
        }
      } else {
        // Combat behavior
        const enemies = this.units.filter(e => e.team !== u.team);
        if (!enemies.length) {
          body.setVelocity(0);
        } else {
          let nearest = enemies[0];
          let bestDist = Phaser.Math.Distance.Between(
            sprite.x, sprite.y,
            nearest.sprite.x, nearest.sprite.y
          );
          enemies.forEach(e => {
            const d = Phaser.Math.Distance.Between(
              sprite.x, sprite.y,
              e.sprite.x, e.sprite.y
            );
            if (d < bestDist) {
              bestDist = d;
              nearest = e;
            }
          });

          if (bestDist > u.range) {
            // Move toward enemy
            const dx = nearest.sprite.x - sprite.x;
            const dy = nearest.sprite.y - sprite.y;
            const len = Math.hypot(dx, dy) || 1;
            body.setVelocity((dx/len)*u.speed, (dy/len)*u.speed);
            sprite.setFlipX(dx < 0);
            u.swingTimer = 0; // Reset swing
          } else {
            // Attack
            body.setVelocity(0);
            swingTimerBar.setVisible(true);
            u.swingTimer += delta;
            const swingRatio = Phaser.Math.Clamp(u.swingTimer / attackCooldown, 0, 1);
            swingTimerBar.width = barWidth * swingRatio;
            swingTimerBar.setPosition(sprite.x - barWidth/2, sprite.y - 10);

            if (swingRatio >= 1) {
              u.swingTimer = 0;
              u.lastAttackTime = time;

              if (type === 1) {
                // Archer projectile
                const proj = this.add.rectangle(
                  sprite.x, sprite.y, 20, 1, 0xffffff
                ).setOrigin(0.5);
                const angle = Phaser.Math.Angle.Between(
                  sprite.x, sprite.y,
                  nearest.sprite.x, nearest.sprite.y
                );
                proj.rotation = angle;
                sprite.setFlipX(Math.cos(angle) < 0);
                this.tweens.add({
                  targets: proj,
                  x: nearest.sprite.x,
                  y: nearest.sprite.y,
                  duration: 200,
                  onComplete: () => {
                    proj.destroy();
                    nearest.hp -= dmg;

                    // Flash on impact, then restore target's own tint
                    const original = nearest.color;
                    nearest.sprite.setTint(0xffffff);
                    this.time.delayedCall(200, () => {
                      nearest.sprite.setTint(original);
                    });

                    // Damage number
                    const dmgText = this.add.text(
                      nearest.sprite.x,
                      nearest.sprite.y - 30,
                      `-${dmg}`,
                      { font: '16px Arial', fill: '#ff0000', stroke: '#000', strokeThickness: 2 }
                    ).setOrigin(0.5);
                    this.tweens.add({
                      targets: dmgText,
                      y: nearest.sprite.y - 50,
                      alpha: 0,
                      duration: 800,
                      onComplete: () => dmgText.destroy()
                    });
                  }
                });
              } else {
                // Melee slash (Tank or Assassin)
                nearest.hp -= dmg;
                const randomAngle = Phaser.Math.FloatBetween(-0.2, 0.2);
                const slashLength = 40;
                const direction = Phaser.Math.Between(0, 1) === 0 ? 1 : -1;
                // Calculate the angle between the attacker and the target
                const angleToTarget = Phaser.Math.Angle.Between(sprite.x, sprite.y, nearest.sprite.x, nearest.sprite.y);
                // Calculate the perpendicular angle with random direction
                const randomDirection = Phaser.Math.Between(0, 1) === 0 ? 1 : -1;
                const perpendicularAngle = angleToTarget + randomDirection * Math.PI / 2;

                // Calculate a weighted midpoint closer to the target
                const weight = 0.75; // Adjust this value to move the slash closer to unit B
                const midX = Phaser.Math.Interpolation.Linear([sprite.x, nearest.sprite.x], weight);
                const midY = Phaser.Math.Interpolation.Linear([sprite.y, nearest.sprite.y], weight);

                const sx = midX - Math.cos(perpendicularAngle) * slashLength / 2;
                const sy = midY - Math.sin(perpendicularAngle) * slashLength / 2;
                const ex = midX + Math.cos(perpendicularAngle) * slashLength / 2;
                const ey = midY + Math.sin(perpendicularAngle) * slashLength / 2;
                const slash = this.add.line(sx, sy, 0, 0, slashLength, 0, 0xffffff)
                                  .setOrigin(0.5).setLineWidth(2).setRotation(perpendicularAngle);
                this.tweens.add({
                  targets: slash,
                  x: ex,
                  y: ey,
                  alpha: 0,
                  duration: 100,
                  onComplete: () => slash.destroy()
                });

                // Flash and damage number for melee
                const original = nearest.color;
                nearest.sprite.setTint(0xffffff);
                this.time.delayedCall(200, () => {
                  nearest.sprite.setTint(original);
                });
                const dmgText = this.add.text(
                  nearest.sprite.x,
                  nearest.sprite.y - 30,
                  `-${dmg}`,
                  { font: '16px Arial', fill: '#ff0000', stroke: '#000', strokeThickness: 2 }
                ).setOrigin(0.5);
                this.tweens.add({
                  targets: dmgText,
                  y: nearest.sprite.y - 50,
                  alpha: 0,
                  duration: 800,
                  onComplete: () => dmgText.destroy()
                });
              }
            }
          }
        }
      }

      // Update bars & circle
      const bx = sprite.x;
      const by = sprite.y - 16;
      damageBar.setPosition(bx - barWidth/2, by);
      healthBar.setPosition(bx - barWidth/2, by);
      const hpRatio = Phaser.Math.Clamp(u.hp / u.maxHp, 0, 1);
      healthBar.width = barWidth * hpRatio;
      notches.forEach((n, i) => n.setPosition(bx + offsets[i], by));
      rangeCircle.setPosition(sprite.x, sprite.y);
    });
  }
}

export default MainScene; 
