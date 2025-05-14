const segmentSize = 50; // Example value, adjust as needed
export const barWidth = 22; // Example value, adjust as needed
const barHeight = 3; // Example value, adjust as needed

// Utility function for positioning
function calculateBarPosition(sprite, barWidth, yOffset) {
  const bx = sprite.x;
  const by = sprite.y - yOffset;
  return { x: bx - barWidth / 2, y: by };
}

// Utility function for creating a bar
function createBar(scene, x, y, width, height, color) {
  return scene.add.rectangle(x, y, width, height, color).setOrigin(0, 0.5);
}

export function createBars(scene, x, y, hp, barWidth) {
  const { x: barX, y: barY } = calculateBarPosition({ x, y }, barWidth, 16);
  const damageBar = createBar(scene, barX, barY, barWidth, barHeight, 0xff0000);
  const healthBar = createBar(scene, barX, barY, barWidth, barHeight, 0x00ff00);

  const segmentCount = Math.ceil(hp / segmentSize);
  const notches = [];
  const offsets = [];
  for (let s = 1; s < segmentCount; s++) {
    const offsetX = -barWidth / 2 + (s * barWidth / segmentCount);
    const notch = scene.add.line(
      x + offsetX,
      y - 32,
      0, -barHeight / 2,
      0, barHeight / 2,
      0x000000
    ).setOrigin(0.5);
    notches.push(notch);
    offsets.push(offsetX);
  }

  return { damageBar, healthBar, notches, offsets };
}

export function addInputEvents(sprite, rangeCircle) {
  sprite.setInteractive();
  sprite.on('pointerover', () => rangeCircle.setVisible(true));
  sprite.on('pointerout', () => rangeCircle.setVisible(false));
}

export function createCooldownBar(scene, x, y) {
  const { x: barX, y: barY } = calculateBarPosition({ x, y }, barWidth, -5);
  return createBar(scene, barX, barY, barWidth, 2, 0xffffff);
}

export function updateBarPositions(sprite, damageBar, healthBar, cooldownBar, barWidth) {
  const { x: barX, y: barY } = calculateBarPosition(sprite, barWidth, 28);
  damageBar.setPosition(barX, barY);
  healthBar.setPosition(barX, barY);
  cooldownBar.setPosition(barX, barY + 3);
}

export function updateHealthBarWidth(healthBar, hpRatio, barWidth) {
  healthBar.width = barWidth * hpRatio;
}

export function updateCooldownBarWidth(cooldownBar, cooldownRatio, barWidth) {
  cooldownBar.width = barWidth * cooldownRatio;
}

export function updateNotchesPositions(notches, offsets, sprite) {
  notches.forEach((n, i) => n.setPosition(sprite.x + offsets[i], sprite.y - 27));
}

export function destroyBarsAndNotches(damageBar, healthBar, notches, cooldownBar) {
  damageBar.destroy();
  healthBar.destroy();
  notches.forEach(n => n.destroy());
  cooldownBar.destroy();
}

export function calculateHpRatio(hp, maxHp) {
  return Phaser.Math.Clamp(hp / maxHp, 0, 1);
}

export function calculateBarWidth(maxHp, minWidth = 30, maxWidth = 100, maxHpThreshold = 1000) {
  return Phaser.Math.Interpolation.Linear([minWidth, maxWidth], Math.min(maxHp / maxHpThreshold, 1));
} 
