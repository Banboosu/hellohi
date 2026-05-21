"use strict";

const CANVAS_SIZE = 720;
const TEMPLATE_FRAME_COUNT = 5;
const TOTAL_GIF_FRAMES = 180;
const FPS = 30;

const ADJUST_MODES = {
  OFF: "off",
  IMAGE: "image",
  TEXT: "text",
  GINGER: "ginger",
};

const ADJUST_MODE_LABELS = {
  [ADJUST_MODES.OFF]: "关",
  [ADJUST_MODES.IMAGE]: "图片",
  [ADJUST_MODES.TEXT]: "文字",
  [ADJUST_MODES.GINGER]: "生姜",
};

const ADJUST_MODE_SEQUENCE = [
  ADJUST_MODES.OFF,
  ADJUST_MODES.IMAGE,
  ADJUST_MODES.TEXT,
  ADJUST_MODES.GINGER,
];

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const fileInput = document.getElementById("fileInput");
  const generateBtn = document.getElementById("generateBtn");
  const toggleAdjustBtn = document.getElementById("toggleAdjust");
  const resetAdjustmentsBtn = document.getElementById("resetAdjustments");
  const toggleTextEnabledBtn = document.getElementById("toggleTextEnabled");
  const toggleTextColorBtn = document.getElementById("toggleTextColor");
  const scaleRange = document.getElementById("scaleRange");
  const scaleControlGroup = document.getElementById("scaleControlGroup");
  const controlPanel = document.getElementById("controlPanel");
  const resultCard = document.getElementById("resultCard");
  const resultImage = document.getElementById("resultImage");
  const downloadBtn = document.getElementById("downloadBtn");

  let userImage = null;
  let frames = [];
  let currentGlobalFrame = 0;
  let animationId = null;
  let adjustMode = ADJUST_MODES.OFF;

  const imageDefaults = {
    x: 0,
    y: 0,
    scale: 1,
  };

  const textDefaults = {
    x: 279,
    y: 184,
    scale: 1,
  };

  const gingerDefaults = {
    x: 0,
    y: 0,
    scale: 1,
  };

  const dragState = {
    isDragging: false,
    activePointerId: null,
    lastPointerX: 0,
    lastPointerY: 0,
  };

  const imageState = {
    ...imageDefaults,
  };

  const textState = {
    ...textDefaults,
    color: "#000000",
    enabled: true,
  };

  const gingerState = {
    ...gingerDefaults,
  };

  const textBaseFontSize = 73;

  async function loadFrames() {
    const promises = [];
    for (let i = 1; i <= TEMPLATE_FRAME_COUNT; i++) {
      const img = new Image();
      img.src = `img/frame_${String(i).padStart(3, "0")}.png`;
      promises.push(
        new Promise((resolve) => {
          img.onload = () => resolve(img);
        }),
      );
    }
    frames = await Promise.all(promises);
    startPreview();
  }

  function startPreview() {
    if (animationId) cancelAnimationFrame(animationId);
    let lastTime = 0;
    const interval = 1000 / FPS;

    function animate(time) {
      if (!lastTime) lastTime = time;
      const delta = time - lastTime;
      if (delta > interval) {
        renderFrame(currentGlobalFrame);
        currentGlobalFrame = (currentGlobalFrame + 1) % TOTAL_GIF_FRAMES;
        lastTime = time - (delta % interval);
      }
      animationId = requestAnimationFrame(animate);
    }

    animationId = requestAnimationFrame(animate);
  }

  function calculateAlpha(frameIdx, start, inEnd, outStart, end) {
    const frame = frameIdx + 1;
    if (frame < start || frame > end) return 0;
    if (frame <= inEnd) {
      return (frame - start + 1) / (inEnd - start + 1);
    }
    if (frame < outStart) {
      return 1;
    }
    return (end - frame + 1) / (end - outStart + 1);
  }

  function getTextForFrame(globalIdx) {
    if (globalIdx < 61) {
      return {
        alpha: calculateAlpha(globalIdx, 1, 8, 55, 61),
        text: "HELLO!",
      };
    }
    if (globalIdx < 122) {
      return {
        alpha: calculateAlpha(globalIdx, 62, 69, 116, 122),
        text: "HELLO!",
      };
    }
    return {
      alpha: calculateAlpha(globalIdx, 123, 130, 175, 180),
      text: "HI!",
    };
  }

  function drawAdjustOverlay(targetCtx, frameData) {
    if (targetCtx !== ctx || adjustMode === ADJUST_MODES.OFF) return;

    targetCtx.save();
    targetCtx.lineWidth = 4;
    targetCtx.strokeStyle = "#007bff";
    targetCtx.setLineDash([14, 10]);

    if (adjustMode === ADJUST_MODES.IMAGE && userImage) {
      targetCtx.strokeRect(frameData.imageX, frameData.imageY, frameData.imageW, frameData.imageH);
    }

    if (adjustMode === ADJUST_MODES.TEXT && textState.enabled && frameData.textAlpha > 0) {
      targetCtx.font = frameData.textFont;
      const metrics = targetCtx.measureText(frameData.textLabel);
      const width = metrics.width;
      const height = 92 * textState.scale;
      targetCtx.strokeRect(
        textState.x - width / 2 - 18,
        textState.y - height / 2,
        width + 36,
        height,
      );
    }

    if (adjustMode === ADJUST_MODES.GINGER) {
      targetCtx.strokeRect(frameData.gingerX, frameData.gingerY, frameData.gingerSize, frameData.gingerSize);
    }

    targetCtx.restore();
  }

  function renderFrame(globalIdx, targetCtx = ctx) {
    targetCtx.fillStyle = "#ffffff";
    targetCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const frameData = {
      imageX: 0,
      imageY: 0,
      imageW: 0,
      imageH: 0,
      textAlpha: 0,
      textLabel: "",
      textFont: "",
      gingerX: 0,
      gingerY: 0,
      gingerSize: CANVAS_SIZE,
    };

    if (userImage) {
      targetCtx.save();
      const baseScale = Math.min(
        CANVAS_SIZE / userImage.width,
        CANVAS_SIZE / userImage.height,
      );
      const drawScale = baseScale * imageState.scale;
      const w = userImage.width * drawScale;
      const h = userImage.height * drawScale;
      const centerX = (CANVAS_SIZE - w) / 2 + imageState.x;
      const centerY = (CANVAS_SIZE - h) / 2 + imageState.y;
      frameData.imageX = centerX;
      frameData.imageY = centerY;
      frameData.imageW = w;
      frameData.imageH = h;
      targetCtx.drawImage(userImage, centerX, centerY, w, h);
      targetCtx.restore();
    }

    const textFrame = getTextForFrame(globalIdx);
    frameData.textAlpha = textFrame.alpha;
    frameData.textLabel = textFrame.text;
    frameData.textFont = `500 ${textBaseFontSize * textState.scale}px 'Source Han Sans SC', 'Source Han Sans CN', 'Noto Sans CJK SC', sans-serif`;

    targetCtx.save();
    targetCtx.textAlign = "center";
    targetCtx.textBaseline = "middle";
    targetCtx.fillStyle = textState.color;
    targetCtx.font = frameData.textFont;

    if (textState.enabled && textFrame.alpha > 0) {
      targetCtx.globalAlpha = textFrame.alpha;
      targetCtx.fillText(textFrame.text, textState.x, textState.y);
    }
    targetCtx.restore();

    const templateIdx = globalIdx % TEMPLATE_FRAME_COUNT;
    const gingerSize = CANVAS_SIZE * gingerState.scale;
    const gingerX = (CANVAS_SIZE - gingerSize) / 2 + gingerState.x;
    const gingerY = (CANVAS_SIZE - gingerSize) / 2 + gingerState.y;
    frameData.gingerX = gingerX;
    frameData.gingerY = gingerY;
    frameData.gingerSize = gingerSize;
    if (frames[templateIdx]) {
      targetCtx.drawImage(
        frames[templateIdx],
        gingerX,
        gingerY,
        gingerSize,
        gingerSize,
      );
    }

    drawAdjustOverlay(targetCtx, frameData);
  }

  function resetImageState() {
    imageState.x = imageDefaults.x;
    imageState.y = imageDefaults.y;
    imageState.scale = imageDefaults.scale;
    scaleRange.value = String(imageDefaults.scale * 100);
  }

  function resetTextState() {
    textState.x = textDefaults.x;
    textState.y = textDefaults.y;
    textState.scale = textDefaults.scale;
  }

  function resetGingerState() {
    gingerState.x = gingerDefaults.x;
    gingerState.y = gingerDefaults.y;
    gingerState.scale = gingerDefaults.scale;
  }

  function resetDragState() {
    dragState.isDragging = false;
    dragState.activePointerId = null;
  }

  function rerenderCurrentFrame() {
    renderFrame(currentGlobalFrame);
  }

  function getScaleValueForMode() {
    if (adjustMode === ADJUST_MODES.TEXT) return textState.scale;
    if (adjustMode === ADJUST_MODES.GINGER) return gingerState.scale;
    return imageState.scale;
  }

  function updateAdjustModeUI() {
    toggleAdjustBtn.innerText = `调整模式：${ADJUST_MODE_LABELS[adjustMode]}`;
    const isOff = adjustMode === ADJUST_MODES.OFF;
    toggleAdjustBtn.style.backgroundColor = isOff ? "#fff" : "#000";
    toggleAdjustBtn.style.color = isOff ? "#000" : "#fff";
    canvas.style.touchAction = isOff ? "auto" : "none";
    controlPanel.dataset.mode = adjustMode;
    scaleControlGroup.style.display = isOff ? "none" : "grid";
    scaleRange.value = String(Math.round(getScaleValueForMode() * 100));
  }

  function updateTextControlsUI() {
    toggleTextEnabledBtn.innerText = textState.enabled ? "开" : "关";
    toggleTextEnabledBtn.style.backgroundColor = textState.enabled ? "#000" : "#fff";
    toggleTextEnabledBtn.style.color = textState.enabled ? "#fff" : "#000";

    const isWhiteText = textState.color === "#ffffff";
    toggleTextColorBtn.innerText = isWhiteText ? "白" : "黑";
    toggleTextColorBtn.disabled = !textState.enabled;
    toggleTextColorBtn.style.backgroundColor = isWhiteText ? "#000" : "#fff";
    toggleTextColorBtn.style.color = isWhiteText ? "#fff" : "#000";
  }

  function getNextAdjustMode() {
    const currentIndex = ADJUST_MODE_SEQUENCE.indexOf(adjustMode);
    return ADJUST_MODE_SEQUENCE[(currentIndex + 1) % ADJUST_MODE_SEQUENCE.length];
  }

  function beginDrag(pointerId, clientX, clientY) {
    if (adjustMode === ADJUST_MODES.OFF) return;
    if (adjustMode === ADJUST_MODES.IMAGE && !userImage) return;
    if (adjustMode === ADJUST_MODES.TEXT && !textState.enabled) return;

    dragState.isDragging = true;
    dragState.activePointerId = pointerId;
    dragState.lastPointerX = clientX;
    dragState.lastPointerY = clientY;
  }

  function moveDrag(pointerId, clientX, clientY) {
    if (!dragState.isDragging || dragState.activePointerId !== pointerId) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const canvasScale = CANVAS_SIZE / rect.width;
    const dx = (clientX - dragState.lastPointerX) * canvasScale;
    const dy = (clientY - dragState.lastPointerY) * canvasScale;

    if (adjustMode === ADJUST_MODES.IMAGE) {
      imageState.x += dx;
      imageState.y += dy;
    } else if (adjustMode === ADJUST_MODES.TEXT) {
      textState.x += dx;
      textState.y += dy;
    } else if (adjustMode === ADJUST_MODES.GINGER) {
      gingerState.x += dx;
      gingerState.y += dy;
    }

    dragState.lastPointerX = clientX;
    dragState.lastPointerY = clientY;
    rerenderCurrentFrame();
  }

  function endDrag(pointerId) {
    if (dragState.activePointerId !== pointerId) return;
    resetDragState();
  }

  toggleAdjustBtn.onclick = () => {
    adjustMode = getNextAdjustMode();
    resetDragState();
    updateAdjustModeUI();
    rerenderCurrentFrame();
  };

  resetAdjustmentsBtn.onclick = () => {
    resetImageState();
    resetTextState();
    resetGingerState();
    resetDragState();
    rerenderCurrentFrame();
  };

  toggleTextEnabledBtn.onclick = () => {
    textState.enabled = !textState.enabled;
    if (!textState.enabled && adjustMode === ADJUST_MODES.TEXT) {
      adjustMode = ADJUST_MODES.OFF;
      updateAdjustModeUI();
    }
    updateTextControlsUI();
    rerenderCurrentFrame();
  };

  toggleTextColorBtn.onclick = () => {
    if (!textState.enabled) return;
    textState.color = textState.color === "#000000" ? "#ffffff" : "#000000";
    updateTextControlsUI();
    rerenderCurrentFrame();
  };

  const handleScale = (e) => {
    const nextScale = parseFloat(e.target.value) / 100;
    if (adjustMode === ADJUST_MODES.TEXT) {
      textState.scale = nextScale;
    } else if (adjustMode === ADJUST_MODES.GINGER) {
      gingerState.scale = nextScale;
    } else {
      imageState.scale = nextScale;
    }
    rerenderCurrentFrame();
  };

  scaleRange.addEventListener("input", handleScale);
  scaleRange.addEventListener("change", handleScale);

  canvas.addEventListener("pointerdown", (e) => {
    beginDrag(e.pointerId, e.clientX, e.clientY);
    if (dragState.isDragging) {
      canvas.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!dragState.isDragging) return;
    moveDrag(e.pointerId, e.clientX, e.clientY);
    e.preventDefault();
  });

  canvas.addEventListener("pointerup", (e) => {
    endDrag(e.pointerId);
  });

  canvas.addEventListener("pointercancel", (e) => {
    endDrag(e.pointerId);
  });

  window.addEventListener("pointerup", (e) => {
    endDrag(e.pointerId);
  });

  fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        userImage = img;
        resetImageState();
        resetTextState();
        resetGingerState();
        currentGlobalFrame = 0;
        if (!animationId) {
          startPreview();
        } else {
          rerenderCurrentFrame();
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  let ffmpeg = null;
  const { FFmpeg } = FFmpegWASM;
  const { fetchFile, toBlobURL } = FFmpegUtil;

  async function initFFmpeg() {
    if (ffmpeg) return ffmpeg;
    ffmpeg = new FFmpeg();
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        "application/wasm",
      ),
    });
    return ffmpeg;
  }

  async function handleExport() {
    const outSize = 260;
    const scale = outSize / CANVAS_SIZE;
    const frameCount = textState.enabled ? TOTAL_GIF_FRAMES : TEMPLATE_FRAME_COUNT;
    const outputFileName = "output.gif";
    const downloadName = "generated.gif";
    const mimeType = "image/gif";

    generateBtn.disabled = true;
    const originalText = generateBtn.innerText;
    generateBtn.innerText = "正在准备 FFmpeg...";

    try {
      await initFFmpeg();

      generateBtn.innerText = "正在准备渲染...";

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = outSize;
      tempCanvas.height = outSize;
      const tempCtx = tempCanvas.getContext("2d");

      for (let i = 0; i < frameCount; i++) {
        tempCtx.save();
        tempCtx.scale(scale, scale);
        renderFrame(i, tempCtx);
        tempCtx.restore();

        const blob = await new Promise((resolve, reject) => {
          tempCanvas.toBlob(
            (result) => {
              if (!result) {
                reject(new Error("导出帧失败"));
                return;
              }
              resolve(result);
            },
            "image/jpeg",
            0.88,
          );
        });
        const fileName = `f_${String(i).padStart(3, "0")}.jpg`;
        await ffmpeg.writeFile(fileName, await fetchFile(blob));

        if (i % 10 === 0 || i === frameCount - 1) {
          generateBtn.innerText = `正在导出帧: ${Math.round(((i + 1) / frameCount) * 100)}%`;
        }
      }

      generateBtn.innerText = "正在优化调色板...";
      await ffmpeg.exec([
        "-framerate",
        "30",
        "-i",
        "f_%03d.jpg",
        "-vf",
        "palettegen=max_colors=256:stats_mode=diff",
        "palette.png",
      ]);

      generateBtn.innerText = "正在合成 GIF...";
      await ffmpeg.exec([
        "-framerate",
        "30",
        "-i",
        "f_%03d.jpg",
        "-i",
        "palette.png",
        "-lavfi",
        "paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle",
        "output.gif",
      ]);

      const data = await ffmpeg.readFile(outputFileName);

      for (let i = 0; i < frameCount; i++) {
        await ffmpeg.deleteFile(`f_${String(i).padStart(3, "0")}.jpg`);
      }
      await ffmpeg.deleteFile("palette.png");

      const blob = new Blob([data.buffer], { type: mimeType });
      const url = URL.createObjectURL(blob);

      resultImage.src = url;
      resultImage.style.width = `${outSize}px`;
      downloadBtn.href = url;
      downloadBtn.download = downloadName;
      downloadBtn.innerText = "下载 GIF";
      resultCard.style.display = "block";
      resultCard.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      console.error(error);
      alert("生成失败，请检查控制台或尝试在本地服务器运行。");
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerText = originalText;
    }
  }

  generateBtn.onclick = () => handleExport();

  resetImageState();
  updateAdjustModeUI();
  updateTextControlsUI();
  loadFrames();
});
