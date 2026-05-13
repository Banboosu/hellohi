"use strict";

const CANVAS_SIZE = 720;
const TEMPLATE_FRAME_COUNT = 5;
const TOTAL_GIF_FRAMES = 180;
const FPS = 30;

// 文字位置计算：中心原点(360, 360) + 偏移量
const TEXT_X = 360 - 81.0; // 279
const TEXT_Y = 360 - 176.0; // 184

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const fileInput = document.getElementById("fileInput");
  const generateBtn = document.getElementById("generateBtn");
  const toggleAdjustBtn = document.getElementById("toggleAdjust");
  const scaleRange = document.getElementById("scaleRange");
  const resultCard = document.getElementById("resultCard");
  const resultImage = document.getElementById("resultImage");
  const downloadBtn = document.getElementById("downloadBtn");

  let userImage = null;
  let frames = [];
  let currentGlobalFrame = 0;
  let animationId = null;

  let isAdjustMode = false;
  let imageState = {
    x: 0,
    y: 0,
    scale: 1.0,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
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

  /**
   * 计算透明度函数
   * @param {number} frame 当前帧 (0-indexed)
   * @param {number} start 开始帧 (1-indexed)
   * @param {number} inEnd 淡入结束帧 (1-indexed)
   * @param {number} outStart 淡出开始帧 (1-indexed)
   * @param {number} end 结束帧 (1-indexed)
   */
  function calculateAlpha(frameIdx, start, inEnd, outStart, end) {
    const frame = frameIdx + 1; // 转为 1-indexed 匹配需求
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

    // 1. 绘制用户图片
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

    // 2. 绘制文字动画
    targetCtx.save();
    targetCtx.textAlign = "center";
    targetCtx.textBaseline = "middle";
    targetCtx.fillStyle = "#000000";
    // 优先使用思源黑体 Medium
    targetCtx.font =
      "500 73px 'Source Han Sans SC', 'Source Han Sans CN', 'Noto Sans CJK SC', sans-serif";

    let alpha = 0;
    let text = "";

    // Sequence 1: "HELLO!" (1-61)
    if (globalIdx < 61) {
      alpha = calculateAlpha(globalIdx, 1, 8, 55, 61);
      text = "HELLO!";
    }
    // Sequence 2: "HELLO!" (62-122)
    else if (globalIdx < 122) {
      alpha = calculateAlpha(globalIdx, 62, 69, 116, 122);
      text = "HELLO!";
    }
    // Sequence 3: "HI!" (123-180)
    else {
      alpha = calculateAlpha(globalIdx, 123, 130, 175, 180);
      text = "HI!";
    }

    if (alpha > 0) {
      targetCtx.globalAlpha = alpha;
      targetCtx.fillText(text, TEXT_X, TEXT_Y);
    }
    targetCtx.restore();

    // 3. 绘制模板图层 (5帧循环)
    const templateIdx = globalIdx % TEMPLATE_FRAME_COUNT;
    if (frames[templateIdx]) {
      targetCtx.drawImage(frames[templateIdx], 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }
  }

  // 交互逻辑
  toggleAdjustBtn.onclick = () => {
    isAdjustMode = !isAdjustMode;
    toggleAdjustBtn.innerText = `调整模式: ${isAdjustMode ? "开" : "关"}`;
    toggleAdjustBtn.style.backgroundColor = isAdjustMode ? "#000" : "#fff";
    toggleAdjustBtn.style.color = isAdjustMode ? "#fff" : "#000";
  };

  const handleScale = (e) => {
    const val = parseFloat(e.target.value);
    imageState.scale = val / 100;
    if (!animationId) renderFrame(currentGlobalFrame);
  };

  scaleRange.addEventListener("input", handleScale);
  scaleRange.addEventListener("change", handleScale);

  canvas.onmousedown = (e) => {
    if (!isAdjustMode || !userImage) return;
    imageState.isDragging = true;
    imageState.lastMouseX = e.clientX;
    imageState.lastMouseY = e.clientY;
  };
  window.onmousemove = (e) => {
    if (!imageState.isDragging) return;
    const rect = canvas.getBoundingClientRect();
    const canvasScale = CANVAS_SIZE / rect.width;
    const dx = (e.clientX - imageState.lastMouseX) * canvasScale;
    const dy = (e.clientY - imageState.lastMouseY) * canvasScale;
    imageState.x += dx;
    imageState.y += dy;
    imageState.lastMouseX = e.clientX;
    imageState.lastMouseY = e.clientY;
    if (!animationId) renderFrame(currentGlobalFrame);
  };
  window.onmouseup = () => (imageState.isDragging = false);

  fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
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
    }
  };

  // FFmpeg 实例
  let ffmpeg = null;
  const { FFmpeg } = FFmpegWASM;
  const { fetchFile, toBlobURL } = FFmpegUtil;

  async function initFFmpeg() {
    if (ffmpeg) return ffmpeg;
    ffmpeg = new FFmpeg();
    // 使用 unpkg.com 作为备选
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

  generateBtn.onclick = async () => {
    const outSize = 360;
    const exportFps = 30;
    const scale = outSize / CANVAS_SIZE;

    generateBtn.disabled = true;
    generateBtn.innerText = `正在准备 FFmpeg...`;

    try {
      await initFFmpeg();

      generateBtn.innerText = `正在准备渲染...`;

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = outSize;
      tempCanvas.height = outSize;
      const tempCtx = tempCanvas.getContext("2d");

      // 1. 逐帧渲染并直接保存为图片到 FFmpeg 虚拟文件系统
      for (let i = 0; i < TOTAL_GIF_FRAMES; i++) {
        tempCtx.save();
        tempCtx.scale(scale, scale);
        renderFrame(i, tempCtx);
        tempCtx.restore();

        // 将当前帧转为 Blob 并存入 FFmpeg
        const blob = await new Promise((resolve) =>
          tempCanvas.toBlob(resolve, "image/png"),
        );
        const fileName = `f_${String(i).padStart(3, "0")}.png`;
        await ffmpeg.writeFile(fileName, await fetchFile(blob));

        if (i % 10 === 0) {
          generateBtn.innerText = `正在导出帧: ${Math.round((i / TOTAL_GIF_FRAMES) * 100)}%`;
        }
      }

      generateBtn.innerText = `正在优化调色板...`;

      // 2. 执行转换：使用高质量调色板生成 GIF
      await ffmpeg.exec([
        "-framerate",
        "30",
        "-i",
        "f_%03d.png",
        "-vf",
        "palettegen",
        "palette.png",
      ]);

      generateBtn.innerText = `正在合成 GIF...`;

      await ffmpeg.exec([
        "-framerate",
        "30",
        "-i",
        "f_%03d.png",
        "-i",
        "palette.png",
        "-lavfi",
        "paletteuse",
        "output.gif",
      ]);

      // 读取结果
      const data = await ffmpeg.readFile("output.gif");

      // 清理临时文件
      for (let i = 0; i < TOTAL_GIF_FRAMES; i++) {
        await ffmpeg.deleteFile(`f_${String(i).padStart(3, "0")}.png`);
      }
      await ffmpeg.deleteFile("palette.png");

      const gifBlob = new Blob([data.buffer], { type: "image/gif" });
      const url = URL.createObjectURL(gifBlob);

      resultImage.src = url;
      resultImage.style.width = outSize + "px";
      downloadBtn.href = url;
      resultCard.style.display = "block";
      generateBtn.disabled = false;
      generateBtn.innerText = "生成 GIF";
      resultCard.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      console.error(error);
      alert("生成失败，请检查控制台或尝试在本地服务器运行。");
      generateBtn.disabled = false;
      generateBtn.innerText = "生成 GIF";
    }
  };

  loadFrames();
});
