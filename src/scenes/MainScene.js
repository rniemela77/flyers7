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
import { shieldConfig } from '../entities/StatusEffect.js';

class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' });
    this.units = []; // Initialize the units array
    this.highlightCircles = new Map();
  }

  preload() {
    this.load.image('tank', 'assets/images/tank.png');
    this.load.image('archer', 'assets/images/archer.png');
    this.load.image('assassin', 'assets/images/assassin.png');
    this.load.image('healer', 'assets/images/healer.png');
    this.load.image('freeze', 'assets/images/freeze.png');
    this.load.image('shield', 'assets/images/shield.png');
  }

  create() {
    const { width, height } = this.scale;
    this.topGroup = this.physics.add.group();
    this.bottomGroup = this.physics.add.group();

    const teams = this.initializeTeams();
    teams.forEach(team => this.createUnits(team, width, height));
    this.setupPhysics();
    this.createSpellUI();

    this.input.on('pointerup', (pointer) => {
      const spellType = this.currentSpellType;
      if (spellType) {
        this.castSpell(spellType, pointer);
      }
      Object.values(this.radiusIndicators).forEach(indicator => indicator.setVisible(false)); // Ensure all indicators are hidden

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
        units: { tank: 3, archer: 4, assassin: 2, healer: 1 }
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

    // Update shield icon position
    this.units.forEach(u => {
      if (u.shieldIcon) {
        const buffBarY = u.sprite.y - u.sprite.displayHeight / 2 - 20;
        u.shieldIcon.setPosition(u.sprite.x - u.sprite.displayWidth / 2, buffBarY);
      }
    });
  }

  createSpellUI() {
    const { width, height } = this.scale;
    this.actionBar = new ActionBar(this);

    // Define spells as actions
    const freezeSpell = new Action(
      'freeze',
      this.add.image(width / 2 - 100, height - 50, 'freeze').setInteractive().setScale(0.1),
      this.startDrag.bind(this, 'freeze'),
      this.castSpell.bind(this, 'freeze')
    );

    const shieldSpell = new Action(
      'shield',
      this.add.image(width / 2 + 100, height - 50, 'shield').setInteractive().setScale(0.1),
      this.startDrag.bind(this, 'shield'),
      this.castSpell.bind(this, 'shield')
    );

    // Add spells to the action bar
    this.actionBar.addAction(freezeSpell);
    this.actionBar.addAction(shieldSpell);
    this.actionBar.setupActions();

    this.spellCooldowns = {
      freeze: false,
      shield: false
    };
    this.spellCooldownTimes = {
      freeze: 5000,
      shield: 5000
    };

    this.radiusIndicators = {
      freeze: this.add.circle(0, 0, freezeConfig.radius, freezeConfig.circleColor, 0.2).setVisible(false),
      shield: this.add.circle(0, 0, shieldConfig.radius, shieldConfig.circleColor, 0.2).setVisible(false)
    };
  }

  startDrag(spellType, pointer, gameObject) {
    if (this.spellCooldowns[spellType]) return; // Prevent dragging if on cooldown
    this.currentSpellType = spellType; // Set the current spell type
    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      const radiusIndicator = this.radiusIndicators[spellType];
      radiusIndicator.setPosition(dragX, dragY);
      radiusIndicator.setVisible(true);

      // Highlight valid targets
      this.units.forEach(unit => {
        const isEnemy = unit.team === 'top';
        const isAlly = unit.team === 'bottom';
        const shouldAffect = (spellType === 'freeze' && isEnemy) || (spellType === 'shield' && isAlly);
        const withinRadius = Phaser.Math.Distance.Between(dragX, dragY, unit.sprite.x, unit.sprite.y) <= (spellType === 'freeze' ? freezeConfig.radius : shieldConfig.radius);
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

  castSpell(spellType, pointer) {
    if (this.spellCooldowns[spellType]) return; // Prevent casting if on cooldown
    this.spellCooldowns[spellType] = true;
    this.time.delayedCall(this.spellCooldownTimes[spellType], () => {
      this.spellCooldowns[spellType] = false;
    });

    const { x, y } = pointer;
    let spellCast = false;
    this.units.forEach(unit => {
      const isEnemy = unit.team === 'top';
      const isAlly = unit.team === 'bottom';
      const shouldAffect = (spellType === 'freeze' && isEnemy) || (spellType === 'shield' && isAlly);
      const withinRadius = Phaser.Math.Distance.Between(x, y, unit.sprite.x, unit.sprite.y) <= (spellType === 'freeze' ? freezeConfig.radius : shieldConfig.radius);
      if (shouldAffect && withinRadius) {
        if (spellType === 'freeze') {
          unit.freeze();
        } else if (spellType === 'shield') {
          unit.applyStatusEffect('shield');
          this.addShieldIcon(unit);
        }
        spellCast = true;
      }
    });
    if (!spellCast) {
      console.log(`${spellType.charAt(0).toUpperCase() + spellType.slice(1)} cast on empty area, no units affected.`);
    }
  }

  // Method to add shield icon
  addShieldIcon(unit) {
    if (!unit.shieldIcon) {
      const buffBarY = unit.sprite.y - unit.sprite.displayHeight / 2 - 20; // Position above health bar
      unit.shieldIcon = this.add.rectangle(unit.sprite.x - unit.sprite.displayWidth / 2, buffBarY, 15, 15, 0xFFD700).setOrigin(0, 0.5);
      unit.shieldIcon.setDepth(1);
    }
  }

  // Method to remove shield icon
  removeShieldIcon(unit) {
    if (unit.shieldIcon) {
      unit.shieldIcon.destroy();
      unit.shieldIcon = null;
    }
  }

  // Modify removeEffect in StatusEffect to remove shield icon
  removeEffect(unit) {
    if (this.removeEffect) {
      this.removeEffect(unit);
    }
    if (this.type === 'shield') {
      this.scene.removeShieldIcon(unit);
    }
  }
}

// Define the action bar and actions
class ActionBar {
  constructor(scene) {
    this.scene = scene;
    this.actions = [];
  }

  addAction(action) {
    this.actions.push(action);
  }

  setupActions() {
    this.actions.forEach(action => {
      action.icon.on('pointerdown', action.onDragStart);
      this.scene.input.setDraggable(action.icon);
    });
  }
}

class Action {
  constructor(name, icon, onDragStart, onDragEnd) {
    this.name = name;
    this.icon = icon;
    this.onDragStart = onDragStart;
    this.onDragEnd = onDragEnd;
  }
}

export default MainScene; 
