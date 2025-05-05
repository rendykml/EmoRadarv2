document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("video");
  const canvas = document.getElementById("overlay");
  const ctx = canvas.getContext("2d");

  // Controls
  const toggleAgeBtn = document.getElementById("toggle-age");
  const toggleLandmarksBtn = document.getElementById("toggle-landmarks");
  const toggleExpressionsBtn = document.getElementById("toggle-expressions");
  const clearLogBtn = document.getElementById("clear-log");
  const toggleClassBtn = document.getElementById("toggle-class");

  // UI Elements
  const classTimer = document.getElementById("class-timer");
  const timerDisplay = document.getElementById("timer-display");
  const classStatus = document.getElementById("class-status");
  const statusIcon = document.getElementById("status-icon");
  const statusText = document.getElementById("status-text");
  const attendanceStatus = document.getElementById("attendance-status");
  const expressionSummary = document.getElementById("expression-summary");

  // State
  let showAge = true;
  let showLandmarks = true;
  let showExpressions = true;
  let isClassActive = false;
  let classStartTime = null;
  let timerInterval = null;
  let lastFaceDetectionTime = Date.now();
  let attendanceTimeout = null;
  const expressionLogs = [];
  const logListEl = document.getElementById("log-list");
  let displaySize;
  let lastNotificationTime = 0;
  let boredCounter = 0;
  let lastBoredNotification = 0;

  // Expression tracking
  const expressionCounters = {
    happy: 0,
    angry: 0,
    neutral: 0,
    surprised: 0,
    sad: 0,
    fearful: 0,
    disgusted: 0,
  };

  // UI Elements
  const dominantValueEl = document.getElementById("dominant-value");
  const rewardEffectEl = document.getElementById("reward-effect");
  const notificationEl = document.getElementById("expression-notification");

  function updateTimer() {
    if (!classStartTime) return;
    
    const now = Date.now();
    const diff = now - classStartTime;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    timerDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function toggleClass() {
    isClassActive = !isClassActive;
    
    if (isClassActive) {
      // Start class
      classStartTime = Date.now();
      timerInterval = setInterval(updateTimer, 1000);
      toggleClassBtn.textContent = "End Class";
      toggleClassBtn.classList.remove("bg-blue-500", "hover:bg-blue-600");
      toggleClassBtn.classList.add("bg-red-500", "hover:bg-red-600");
      classTimer.classList.remove("hidden");
      statusIcon.textContent = "✅";
      statusText.textContent = "Class Active";
      expressionSummary.classList.add("hidden");
    } else {
      // End class
      clearInterval(timerInterval);
      showClassSummary();
      toggleClassBtn.textContent = "Start Class";
      toggleClassBtn.classList.remove("bg-red-500", "hover:bg-red-600");
      toggleClassBtn.classList.add("bg-blue-500", "hover:bg-blue-600");
      statusIcon.textContent = "⏸";
      statusText.textContent = "Class Ended";
    }
  }

  function showClassSummary() {
    const total = Object.values(expressionCounters).reduce((a, b) => a + b, 0);
    if (total === 0) return;

    const summaryHTML = Object.entries(expressionCounters)
      .sort(([, a], [, b]) => b - a)
      .map(([expression, count]) => {
        const percentage = ((count / total) * 100).toFixed(1);
        return `
          <div class="flex justify-between items-center">
            <span class="font-medium text-blue-800">${expression.toUpperCase()}</span>
            <span class="text-blue-600">${percentage}%</span>
          </div>
          <div class="w-full bg-blue-100 rounded-full h-2">
            <div class="bg-blue-500 h-2 rounded-full" style="width: ${percentage}%"></div>
          </div>
        `;
      })
      .join("");

    expressionSummary.querySelector("div").innerHTML = summaryHTML;
    expressionSummary.classList.remove("hidden");
  }

  function checkAttendance() {
    const now = Date.now();
    const timeSinceLastDetection = now - lastFaceDetectionTime;
    
    if (timeSinceLastDetection > 5000) {
      // No face detected for 5 seconds
      attendanceStatus.textContent = "Not Present";
      attendanceStatus.classList.remove("bg-blue-500");
      attendanceStatus.classList.add("bg-red-500");
    } else {
      attendanceStatus.textContent = "Present";
      attendanceStatus.classList.remove("bg-red-500");
      attendanceStatus.classList.add("bg-blue-500");
    }
    
    if (isClassActive) {
      attendanceStatus.classList.remove("hidden");
    } else {
      attendanceStatus.classList.add("hidden");
    }
  }

  function showNotification(expression, force = false) {
    const now = Date.now();
    if (!force && now - lastNotificationTime < 10000) return;
    lastNotificationTime = now;

    let message = '';
    switch(expression) {
      case 'happy':
        message = 'Ekspresi dominan: SENANG';
        break;
      case 'angry':
        message = 'Ekspresi dominan: MARAH';
        break;
      case 'neutral':
        message = 'Ekspresi dominan: NETRAL';
        break;
      case 'sad':
        message = 'Ekspresi dominan: SEDIH';
        break;
      case 'surprised':
        message = 'Ekspresi dominan: TERKEJUT';
        break;
      case 'fearful':
        message = 'Ekspresi dominan: TAKUT';
        break;
      case 'disgusted':
        message = 'Ekspresi dominan: JIJIK';
        break;
      default:
        message = `Ekspresi dominan: ${expression}`;
    }

    notificationEl.querySelector('p').textContent = message;
    notificationEl.classList.remove('hidden');
    
    setTimeout(() => {
      notificationEl.classList.add('hidden');
    }, 2500);
  }

  function showRewardEffect(expression) {
    if (expression === "happy") {
      rewardEffectEl.style.display = "flex";
      setTimeout(() => {
        rewardEffectEl.style.display = "none";
      }, 1500);
    }
  }

  function checkBoredState(expression) {
    if (!isClassActive) return;
    
    if (expression === 'neutral' || expression === 'sad') {
      boredCounter++;
      if (boredCounter >= 10) {
        const now = Date.now();
        if (now - lastBoredNotification > 30000) {
          showNotification("😕 Kamu terlihat bosan, yuk tetap semangat!", true);
          lastBoredNotification = now;
        }
        boredCounter = 0;
      }
    } else {
      boredCounter = 0;
    }
  }

  function getExpressionColor(expression) {
    switch (expression) {
      case 'happy':
        return 'text-yellow-400';
      case 'sad':
        return 'text-blue-400';
      case 'angry':
        return 'text-red-400';
      case 'surprised':
        return 'text-purple-400';
      case 'fearful':
        return 'text-orange-400';
      case 'disgusted':
        return 'text-green-400';
      case 'neutral':
      default:
        return 'text-gray-200';
    }
  }

  function getDominantExpression() {
    let max = 0;
    let dominant = "-";
    for (const [exp, count] of Object.entries(expressionCounters)) {
      if (count > max) {
        max = count;
        dominant = exp;
      }
    }
    return dominant;
  }

  function resizeCanvasToMatchVideo() {
    if (!video.videoWidth) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.style.width = video.offsetWidth + "px";
    canvas.style.height = video.offsetHeight + "px";
    displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);
  }

  const startStream = () => {
    navigator.mediaDevices
      .getUserMedia({ video: { width: 1280, height: 720 }, audio: false })
      .then((stream) => {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          resizeCanvasToMatchVideo();
        };
      })
      .catch(console.error);
  };

  // Load models
  const loadingEl = document.getElementById("loading");
  Promise.all([
    faceapi.nets.ageGenderNet.loadFromUri("models"),
    faceapi.nets.ssdMobilenetv1.loadFromUri("models"),
    faceapi.nets.tinyFaceDetector.loadFromUri("models"),
    faceapi.nets.faceLandmark68Net.loadFromUri("models"),
    faceapi.nets.faceRecognitionNet.loadFromUri("models"),
    faceapi.nets.faceExpressionNet.loadFromUri("models"),
  ]).then(() => {
    loadingEl.style.display = "none";
    startStream();
  });

  async function detect() {
    if (video.paused || video.ended) {
      return requestAnimationFrame(detect);
    }

    if (
      video.videoWidth !== displaySize.width ||
      video.videoHeight !== displaySize.height
    ) {
      resizeCanvasToMatchVideo();
    }

    const detections = await faceapi
      .detectAllFaces(video)
      .withFaceLandmarks()
      .withFaceExpressions()
      .withAgeAndGender();

    if (detections.length > 0) {
      lastFaceDetectionTime = Date.now();
    }
    
    checkAttendance();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    resizedDetections.forEach(det => {
      const box = det.detection.box;
      ctx.save();
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      ctx.restore();
    });

    if (showLandmarks) {
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
    }

    if (showExpressions || showAge) {
      resizedDetections.forEach((result) => {
        const { x, y, width } = result.detection.box;
        let yLabel = y - 10;

        if (showExpressions) {
          const expr = result.expressions;
          const sorted = Object.entries(expr).sort((a, b) => b[1] - a[1]);
          const [topName] = sorted[0];
          ctx.font = 'bold 22px Inter';
          ctx.textAlign = "center";
          ctx.fillStyle = "#fff";
          ctx.strokeStyle = "#222";
          ctx.lineWidth = 4;
          const label = topName.toUpperCase();
          ctx.strokeText(label, x + width / 2, yLabel);
          ctx.fillText(label, x + width / 2, yLabel);
          yLabel += 26;
        }

        if (showAge && result.age) {
          ctx.font = 'bold 18px Inter';
          ctx.textAlign = "center";
          ctx.fillStyle = "#ffd700";
          ctx.strokeStyle = "#222";
          ctx.lineWidth = 3;
          const ageLabel = `Umur: ${Math.round(result.age)}`;
          ctx.strokeText(ageLabel, x + width / 2, yLabel);
          ctx.fillText(ageLabel, x + width / 2, yLabel);
        }
      });
    }

    resizedDetections.forEach((result) => {
      if (!isClassActive) return;

      const expr = result.expressions;
      const sorted = Object.entries(expr).sort((a, b) => b[1] - a[1]);
      const topExpression = sorted[0];

      if (expressionCounters.hasOwnProperty(topExpression[0])) {
        expressionCounters[topExpression[0]]++;
      }

      checkBoredState(topExpression[0]);
      showRewardEffect(topExpression[0]);

      const timestamp = new Date().toLocaleTimeString();
      expressionLogs.push({
        time: timestamp,
        expression: topExpression[0],
        probability: topExpression[1],
      });
      if (expressionLogs.length > 20) expressionLogs.shift();

      logListEl.innerHTML = expressionLogs
        .slice(-5)
        .map(
          (item) => `
            <li class="text-sm py-1 px-2 rounded bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-100">
              <span class="text-blue-400">[${item.time}]</span>
              <span class="font-semibold text-blue-800">
                ${item.expression.toUpperCase()}
              </span>
              <span class="text-blue-600">
                (${(item.probability * 100).toFixed(1)}%)
              </span>
            </li>
          `
        )
        .join("");

      const dominant = getDominantExpression();
      dominantValueEl.textContent = dominant !== "-" ? dominant.toUpperCase() : "-";
      dominantValueEl.className = `text-3xl font-bold text-center text-blue-600 transition-all duration-300`;
    });

    requestAnimationFrame(detect);
  }

  clearLogBtn.addEventListener("click", () => {
    expressionLogs.length = 0;
    logListEl.innerHTML = "";
  });

  video.addEventListener("play", () => {
    resizeCanvasToMatchVideo();
    requestAnimationFrame(detect);
  });

  toggleAgeBtn.addEventListener("click", () => {
    showAge = !showAge;
    toggleAgeBtn.textContent = showAge ? "Hide Age" : "Show Age";
    toggleAgeBtn.classList.toggle('bg-gray-500');
    toggleAgeBtn.classList.toggle('hover:bg-gray-600');
    toggleAgeBtn.classList.toggle('bg-blue-500');
    toggleAgeBtn.classList.toggle('hover:bg-blue-600');
  });

  toggleLandmarksBtn.addEventListener("click", () => {
    showLandmarks = !showLandmarks;
    toggleLandmarksBtn.textContent = showLandmarks ? "Hide Landmarks" : "Show Landmarks";
    toggleLandmarksBtn.classList.toggle('bg-gray-500');
    toggleLandmarksBtn.classList.toggle('hover:bg-gray-600');
    toggleLandmarksBtn.classList.toggle('bg-blue-500');
    toggleLandmarksBtn.classList.toggle('hover:bg-blue-600');
  });

  toggleExpressionsBtn.addEventListener("click", () => {
    showExpressions = !showExpressions;
    toggleExpressionsBtn.textContent = showExpressions ? "Hide Expressions" : "Show Expressions";
    toggleExpressionsBtn.classList.toggle('bg-gray-500');
    toggleExpressionsBtn.classList.toggle('hover:bg-gray-600');
    toggleExpressionsBtn.classList.toggle('bg-blue-500');
    toggleExpressionsBtn.classList.toggle('hover:bg-blue-600');
  });

  toggleClassBtn.addEventListener("click", toggleClass);

  window.addEventListener("resize", resizeCanvasToMatchVideo);

  setInterval(() => {
    if (!isClassActive) return;
    const dominant = getDominantExpression();
    if (dominant && dominant !== "-") {
      showNotification(dominant);
    }
  }, 10000);
});