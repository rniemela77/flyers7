const segmentSize = 25; // Example value, adjust as needed
export const barWidth = 22; // Example value, adjust as needed
const barHeight = 3; // Example value, adjust as needed

export function createBars(scene, x, y, hp) {
  const damageBar = scene.add.rectangle(
    x - barWidth/2,
    y - 16,
    barWidth,
    barHeight,
    0xff0000
  ).setOrigin(0, 0.5);
  const healthBar = scene.add.rectangle(
    x - barWidth/2,
    y - 16,
    barWidth,
    barHeight,
    0x00ff00
  ).setOrigin(0, 0.5);

  const segmentCount = Math.ceil(hp / segmentSize);
  const notches = [];
  const offsets = [];
  for (let s = 1; s < segmentCount; s++) {
    const offsetX = -barWidth/2 + (s * barWidth / segmentCount);
    const notch = scene.add.line(
      x + offsetX,
      y - 32,
      0, -barHeight/2,
      0,  barHeight/2,
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
  const cooldownBar = scene.add.rectangle(x, y + 5, barWidth, 2, 0xffffff);
  cooldownBar.setOrigin(0, 0);
  return cooldownBar;
}

export function updateBarPositions(sprite, damageBar, healthBar, cooldownBar, barWidth) {
  const bx = sprite.x;
  const by = sprite.y - 28;
  damageBar.setPosition(bx - barWidth/2, by);
  healthBar.setPosition(bx - barWidth/2, by);
  cooldownBar.setPosition(bx - barWidth/2, by + 3);
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
