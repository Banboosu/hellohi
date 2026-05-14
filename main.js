"use strict";

const CANVAS_SIZE = 720;
const TEMPLATE_FRAME_COUNT = 5;
const TOTAL_GIF_FRAMES = 180;
const FPS = 30;

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const fileInput = document.getElementById("fileInput");
  const generateBtn = document.getElementById("generateBtn");
  const toggleAdjustBtn = document.getElementById("toggleAdjust");
  const scaleRange = document.getElementById("scaleRange");
  const textXRange = document.getElementById("textXRange");
  const textYRange = document.getElementById("textYRange");
  const textColorSelect = document.getElementById("textColorSelect");
  const resultCard = document.getElementById("resultCard");
  const resultImage = document.getElementById("resultImage");
  const downloadBtn = document.getElementById("downloadBtn");

  let userImage = null;
  let frames = [];
  let currentGlobalFrame = 0;
  let animationId = null;

  let isAdjustMode = false;
  const imageState = {
    x: 0,
    y: 0,
    scale: 1.0,
    isDragging: false,
    activePointerId: null,
    lastPointerX: 0,
    lastPointerY: 0,
  };

  const textState = {
    x: 279,
    y: 184,
    color: "#000000",
  };

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

  function renderFrame(globalIdx, targetCtx = ctx) {
    targetCtx.fillStyle = "#ffffff";
    targetCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

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
      targetCtx.drawImage(userImage, centerX, centerY, w, h);

      if (isAdjustMode && targetCtx === ctx) {
        targetCtx.strokeStyle = "#007bff";
        targetCtx.lineWidth = 4;
        targetCtx.strokeRect(centerX, centerY, w, h);
      }
      targetCtx.restore();
    }

    targetCtx.save();
    targetCtx.textAlign = "center";
    targetCtx.textBaseline = "middle";
    targetCtx.fillStyle = textState.color;
    targetCtx.font =
      "500 73px 'Source Han Sans SC', 'Source Han Sans CN', 'Noto Sans CJK SC', sans-serif";

    let alpha = 0;
    let text = "";

    if (globalIdx < 61) {
      alpha = calculateAlpha(globalIdx, 1, 8, 55, 61);
      text = "HELLO!";
    } else if (globalIdx < 122) {
      alpha = calculateAlpha(globalIdx, 62, 69, 116, 122);
      text = "HELLO!";
    } else {
      alpha = calculateAlpha(globalIdx, 123, 130, 175, 180);
      text = "HI!";
    }

    if (alpha > 0) {
      targetCtx.globalAlpha = alpha;
      targetCtx.fillText(text, textState.x, textState.y);
    }
    targetCtx.restore();

    const templateIdx = globalIdx % TEMPLATE_FRAME_COUNT;
    if (frames[templateIdx]) {
      targetCtx.drawImage(frames[templateIdx], 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }
  }

  function updateAdjustModeUI() {
    toggleAdjustBtn.innerText = `调整模式: ${isAdjustMode ? "开" : "关"}`;
    toggleAdjustBtn.style.backgroundColor = isAdjustMode ? "#000" : "#fff";
    toggleAdjustBtn.style.color = isAdjustMode ? "#fff" : "#000";
    canvas.style.touchAction = isAdjustMode ? "none" : "auto";
  }

  function beginDrag(pointerId, clientX, clientY) {
    if (!isAdjustMode || !userImage) return;
    imageState.isDragging = true;
    imageState.activePointerId = pointerId;
    imageState.lastPointerX = clientX;
    imageState.lastPointerY = clientY;
  }

  function moveDrag(pointerId, clientX, clientY) {
    if (!imageState.isDragging || imageState.activePointerId !== pointerId)
      return;
    const rect = canvas.getBoundingClientRect();
    const canvasScale = CANVAS_SIZE / rect.width;
    const dx = (clientX - imageState.lastPointerX) * canvasScale;
    const dy = (clientY - imageState.lastPointerY) * canvasScale;
    imageState.x += dx;
    imageState.y += dy;
    imageState.lastPointerX = clientX;
    imageState.lastPointerY = clientY;
    if (!animationId) renderFrame(currentGlobalFrame);
  }

  function endDrag(pointerId) {
    if (imageState.activePointerId !== pointerId) return;
    imageState.isDragging = false;
    imageState.activePointerId = null;
  }

  toggleAdjustBtn.onclick = () => {
    isAdjustMode = !isAdjustMode;
    if (!isAdjustMode) {
      imageState.isDragging = false;
      imageState.activePointerId = null;
    }
    updateAdjustModeUI();
  };

  const handleScale = (e) => {
    imageState.scale = parseFloat(e.target.value) / 100;
    if (!animationId) renderFrame(currentGlobalFrame);
  };

  scaleRange.addEventListener("input", handleScale);
  scaleRange.addEventListener("change", handleScale);

  textXRange.oninput = (e) => {
    textState.x = parseFloat(e.target.value);
    if (!animationId) renderFrame(currentGlobalFrame);
  };

  textYRange.oninput = (e) => {
    textState.y = parseFloat(e.target.value);
    if (!animationId) renderFrame(currentGlobalFrame);
  };

  textColorSelect.onchange = (e) => {
    textState.color = e.target.value;
    if (!animationId) renderFrame(currentGlobalFrame);
  };

  canvas.addEventListener("pointerdown", (e) => {
    if (!isAdjustMode || !userImage) return;
    beginDrag(e.pointerId, e.clientX, e.clientY);
    canvas.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!imageState.isDragging) return;
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
        imageState.x = 0;
        imageState.y = 0;
        currentGlobalFrame = 0;
        if (!animationId) startPreview();
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

      for (let i = 0; i < TOTAL_GIF_FRAMES; i++) {
        tempCtx.save();
        tempCtx.scale(scale, scale);
        renderFrame(i, tempCtx);
        tempCtx.restore();

        const blob = await new Promise((resolve) =>
          tempCanvas.toBlob(resolve, "image/png"),
        );
        const fileName = `f_${String(i).padStart(3, "0")}.png`;
        await ffmpeg.writeFile(fileName, await fetchFile(blob));

        if (i % 10 === 0) {
          generateBtn.innerText = `正在导出帧: ${Math.round((i / TOTAL_GIF_FRAMES) * 100)}%`;
        }
      }

      generateBtn.innerText = "正在优化调色板...";
      await ffmpeg.exec([
        "-framerate",
        "30",
        "-i",
        "f_%03d.png",
        "-vf",
        "palettegen=max_colors=256:stats_mode=diff",
        "palette.png",
      ]);

      generateBtn.innerText = "正在合成 GIF...";
      await ffmpeg.exec([
        "-framerate",
        "30",
        "-i",
        "f_%03d.png",
        "-i",
        "palette.png",
        "-lavfi",
        "paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle",
        "output.gif",
      ]);

      const data = await ffmpeg.readFile(outputFileName);

      for (let i = 0; i < TOTAL_GIF_FRAMES; i++) {
        await ffmpeg.deleteFile(`f_${String(i).padStart(3, "0")}.png`);
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

  updateAdjustModeUI();
  loadFrames();
});
