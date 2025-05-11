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

    // Create a grid at the bottom of the screen
    this.createUnitTypeGrid(width, height);
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

        this.spawnUnit(unitType, team, x, y);
      }
    });
  }

  setupPhysics() {
    this.physics.add.collider(this.topGroup, this.topGroup);
    this.physics.add.collider(this.bottomGroup, this.bottomGroup);
  }

  createUnitTypeGrid(width, height) {
    const unitTypes = ['tank', 'archer', 'assassin', 'healer'];
    const teamColors = [0xFF8B8B, 0x7575FF]; // Use the same colors as in initializeTeams
    const gridContainer = this.add.container(0, height - 200);
    const borderSize = 2;
    const imageSize = 100; // Assuming the image size is 100x100 after scaling

    teamColors.forEach((color, rowIndex) => {
      unitTypes.forEach((unitType, colIndex) => {
        const x = colIndex * imageSize + 50;
        const y = rowIndex * imageSize + 50;
        const imageKey = `${unitType}`;

        // Draw border
        const graphics = this.add.graphics();
        graphics.lineStyle(borderSize, 0x000000, 1);
        graphics.strokeRect(x - imageSize / 2, y - imageSize / 2, imageSize, imageSize);
        gridContainer.add(graphics);

        // Add unit image
        const unitImage = this.add.image(x, y, imageKey).setScale(2);
        unitImage.setInteractive({ draggable: true });
        unitImage.on('dragstart', (pointer, dragX, dragY) => {
          unitImage.setAlpha(0.5);
        });
        unitImage.on('drag', (pointer, dragX, dragY) => {
          unitImage.x = dragX;
          unitImage.y = dragY;
        });
        unitImage.on('dragend', (pointer, dragX, dragY) => {
          unitImage.setAlpha(1);
          const dropX = pointer.worldX;
          const dropY = pointer.worldY;
          const team = { color, side: rowIndex === 0 ? 'top' : 'bottom', group: rowIndex === 0 ? this.topGroup : this.bottomGroup };
          this.spawnUnit(unitType, team, dropX, dropY);
          unitImage.x = x; // Reset position
          unitImage.y = y;
        });
        gridContainer.add(unitImage);
      });
    });
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
    }
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
      u.update(time, delta, this.units, centers);
    });
  }
}

export default MainScene; 
