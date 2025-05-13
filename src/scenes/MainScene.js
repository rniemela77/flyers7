// import Phaser from 'phaser';
import Tank from '../entities/Tank.js';
import Archer from '../entities/Archer.js';
import Assassin from '../entities/Assassin.js';
import Healer from '../entities/Healer.js';
import { createBars, addInputEvents, barWidth } from '../utils/helpers.js';
import { units } from '../entities/Unit.js';
import Unit from '../entities/Unit.js';
import unitTypes from '../entities/unitTypes.js';
import { createUnitTypeGrid } from './UnitTypeGrid.js';
import { freezeConfig } from '../entities/StatusEffect.js';

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
    this.createSpellUI();
    this.highlightCircles = new Map(); // Store highlight circles
    this.input.on('pointerup', (pointer) => {
      this.castSpell(pointer);
      this.radiusIndicator.setVisible(false); // Ensure the indicator is hidden
      this.radiusIndicator.setPosition(-100, -100); // Move it off-screen

      // Remove highlight from all units
      this.highlightCircles.forEach(circle => circle.destroy());
      this.highlightCircles.clear();
    }, this);

    // Create a grid at the bottom of the screen
    // createUnitTypeGrid(this, width, height);
  }

  initializeTeams() {
    return [
      {
        side: 'top',
        color: 0xFF8B8B,
        group: this.topGroup,
        units: { tank: 0, archer: 0, assassin: 0, healer: 0, boss: 1 }
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

        this.spawnUnit(unitType, team, x, y);
      }
    });
  }

  setupPhysics() {
    this.physics.add.collider(this.topGroup, this.topGroup);
    this.physics.add.collider(this.bottomGroup, this.bottomGroup);
  }

  spawnUnit(unitType, team, x, y) {
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
      case 'boss':
        unit = new Unit(this, team, 'boss', x, y); // Use Unit class for boss
        break;
    }
    unit._initialTeam = team.side;
    this.units.push(unit);
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

    // Update highlight circles to follow units
    this.highlightCircles.forEach((circle, unit) => {
      circle.clear();
      circle.lineStyle(2, 0xffffff, 0.8);
      circle.strokeCircle(unit.sprite.x, unit.sprite.y + unit.sprite.displayHeight / 4, unit.sprite.displayWidth / 2 + 5);
    });

    // Remove dead units
    this.units = this.units.filter(u => {
      if (u.hp <= 0) {
        u.sprite.destroy();
        u.healthBar.destroy();
        u.damageBar.destroy();
        u.cooldownBar.destroy();
        u.rangeCircle.destroy();
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
      u.update(time, delta, this.units, centers);
    });
  }

  createSpellUI() {
    const { width, height } = this.scale;
    this.spellIcon = this.add.image(width / 2, height - 50, 'freeze').setInteractive();
    this.spellIcon.on('pointerdown', this.startDrag, this);
    this.input.setDraggable(this.spellIcon);
    this.spellCooldown = false;
    this.spellCooldownTime = 5000; // 5 seconds cooldown
    this.spellRadius = freezeConfig.radius;
    this.radiusIndicator = this.add.circle(0, 0, this.spellRadius, freezeConfig.circleColor, 0.2);
    this.radiusIndicator.setVisible(false);
  }

  startDrag(pointer, gameObject) {
    if (this.spellCooldown) return; // Prevent dragging if on cooldown
    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      this.radiusIndicator.setPosition(dragX, dragY);
      this.radiusIndicator.setVisible(true);

      // Highlight valid targets
      this.units.forEach(unit => {
        const isEnemy = unit.team === 'top';
        const isAlly = unit.team === 'bottom';
        const shouldAffect = (freezeConfig.targetType === 'enemies' && isEnemy) ||
                             (freezeConfig.targetType === 'allies' && isAlly) ||
                             (freezeConfig.targetType === 'both');
        const withinRadius = Phaser.Math.Distance.Between(dragX, dragY, unit.sprite.x, unit.sprite.y) <= freezeConfig.radius;
        if (shouldAffect && withinRadius) {
          if (!this.highlightCircles.has(unit)) {
            const circle = this.add.graphics();
            circle.lineStyle(2, 0xffffff, 0.8);
            circle.strokeCircle(unit.sprite.x, unit.sprite.y + unit.sprite.displayHeight / 4, unit.sprite.displayWidth / 2 + 5);
            this.highlightCircles.set(unit, circle);
          }
        } else {
          const circle = this.highlightCircles.get(unit);
          if (circle) {
            circle.destroy();
            this.highlightCircles.delete(unit);
          }
        }
      });
    });
  }

  castSpell(pointer) {
    if (this.spellCooldown) return; // Prevent casting if on cooldown
    const { x, y } = pointer;
    this.spellCooldown = true;
    this.time.delayedCall(this.spellCooldownTime, () => {
      this.spellCooldown = false;
    });
    let spellCast = false;
    this.units.forEach(unit => {
      const isEnemy = unit.team === 'top';
      const isAlly = unit.team === 'bottom';
      const shouldAffect = (freezeConfig.targetType === 'enemies' && isEnemy) ||
                           (freezeConfig.targetType === 'allies' && isAlly) ||
                           (freezeConfig.targetType === 'both');
      if (shouldAffect && Phaser.Math.Distance.Between(x, y, unit.sprite.x, unit.sprite.y) <= freezeConfig.radius) {
        unit.freeze();
        spellCast = true;
      }
    });
    if (!spellCast) {
      console.log('Spell cast on empty area, no units affected.');
    }
  }
}

export default MainScene; 
