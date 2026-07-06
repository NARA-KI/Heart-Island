export async function createV2ShareCardBlob({ facts, report }) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1440;
  const ctx = canvas.getContext('2d');
  drawBackground(ctx, canvas);
  const portrait = await loadImage(facts.persona.image).catch(() => null);
  drawPortrait(ctx, portrait, facts.persona.displayName);
  drawText(ctx, facts, report);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('分享图生成失败'));
    }, 'image/png');
  });
}

export async function downloadResultImage({ facts, report }) {
  const blob = await createV2ShareCardBlob({ facts, report });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `heart-island-${facts.persona.id}-${facts.resultId}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return blob;
}

export async function shareResultImage({ facts, report }) {
  const blob = await createV2ShareCardBlob({ facts, report });
  const file = new File([blob], `heart-island-${facts.persona.id}.png`, { type: 'image/png' });
  const shareData = {
    title: '我的心岛人格',
    text: `${facts.persona.displayName}：${report.oneLine}`,
    files: [file],
  };
  if (navigator.share && navigator.canShare?.(shareData)) {
    await navigator.share(shareData);
    return { shared: true, blob };
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `heart-island-${facts.persona.id}-${facts.resultId}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return { shared: false, blob };
}

function drawBackground(ctx, canvas) {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#071522');
  gradient.addColorStop(0.5, '#0d2235');
  gradient.addColorStop(1, '#050b14');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const glow = ctx.createRadialGradient(540, 300, 20, 540, 300, 520);
  glow.addColorStop(0, 'rgba(126, 213, 255, 0.34)');
  glow.addColorStop(1, 'rgba(126, 213, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(185, 231, 255, 0.18)';
  ctx.lineWidth = 2;
  roundRect(ctx, 82, 82, 916, 1276, 28);
  ctx.stroke();
}

function drawPortrait(ctx, image, label) {
  const x = 340;
  const y = 150;
  const size = 400;
  roundRect(ctx, x, y, size, size, 26);
  ctx.save();
  ctx.clip();
  if (image) {
    ctx.drawImage(image, x, y, size, size);
  } else {
    const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
    gradient.addColorStop(0, '#12344b');
    gradient.addColorStop(1, '#4ba8d4');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = '#e8f7ff';
    ctx.font = 'bold 168px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.slice(0, 1), x + size / 2, y + size / 2 + 8);
  }
  ctx.restore();
}

function drawText(ctx, facts, report) {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#b9e7ff';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('HEART ISLAND', 540, 640);
  ctx.fillStyle = '#f1f8ff';
  ctx.font = 'bold 88px sans-serif';
  ctx.fillText(facts.persona.displayName, 540, 735);

  ctx.fillStyle = 'rgba(225,238,249,0.82)';
  ctx.font = '34px sans-serif';
  wrapText(ctx, report.oneLine, 180, 815, 720, 50);

  const traits = report.keyTraits.slice(0, 3);
  let y = 995;
  ctx.textAlign = 'left';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillStyle = '#f1f8ff';
  ctx.fillText('三个关键关系特征', 180, y);
  y += 58;
  ctx.font = '28px sans-serif';
  ctx.fillStyle = 'rgba(225,238,249,0.82)';
  for (const trait of traits) {
    y = wrapText(ctx, `• ${trait}`, 180, y, 720, 42) + 18;
  }

  ctx.textAlign = 'center';
  ctx.font = '24px sans-serif';
  ctx.fillStyle = 'rgba(225,238,249,0.62)';
  ctx.fillText('结果用于自我理解和关系沟通参考', 540, 1295);
  ctx.fillStyle = '#b9e7ff';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('心岛计划', 540, 1338);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error('missing image'));
      return;
    }
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const chars = [...String(text)];
  let line = '';
  let currentY = y;
  for (const char of chars) {
    const testLine = line + char;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = char;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x, currentY);
  return currentY;
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
