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
      y - 16,
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
