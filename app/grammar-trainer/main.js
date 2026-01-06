/**
 * Grammar Drill Trainer - Main Application
 * A browser-based English grammar training web app
 */

// ============================================
// State Management
// ============================================

const state = {
  // Session configuration
  dataset: null,
  questions: [],
  questionCount: 10,
  autoNext: false,

  // Session progress
  currentIndex: 0,
  mcqCorrectCount: 0,
  mcqAnsweredCount: 0,

  // Per-question state (keyed by question index)
  questionStates: {},
  questionStartTime: null,
  questionTimerInterval: null,
  totalTimeMs: 0,
  datasets: [],
  manifestLoaded: false,

  // Recording state
  mediaRecorder: null,
  audioChunks: [],
  isRecording: false,
  isInitializing: false,
  microphoneAvailable: true,
  currentStream: null,
  micDevices: [],
  selectedMicId: '',
  audioContext: null,
  analyser: null,
  analyserSource: null,
  levelAnimationFrame: null,
  refreshInFlight: false,

  // Auto-next timer
  autoNextTimer: null
};

// ============================================
// DOM Elements
// ============================================

const elements = {
  // Panels
  settingsPanel: document.getElementById('settings-panel'),
  quizPanel: document.getElementById('quiz-panel'),
  resultsPanel: document.getElementById('results-panel'),

  // Settings
  categorySelect: document.getElementById('category-select'),
  datasetSelect: document.getElementById('dataset-select'),
  questionCountInput: document.getElementById('question-count'),
  autoNextToggle: document.getElementById('auto-next'),
  startBtn: document.getElementById('start-btn'),
  settingsError: document.getElementById('settings-error'),

  // Quiz
  progressText: document.getElementById('progress-text'),
  progressFill: document.getElementById('progress-fill'),
  questionTimer: document.getElementById('question-timer'),
  backToSettingsBtn: document.getElementById('back-to-settings'),
  questionTypeBadge: document.getElementById('question-type-badge'),
  questionText: document.getElementById('question-text'),
  mcqOptions: document.getElementById('mcq-options'),
  speakControls: document.getElementById('speak-controls'),
  speakAnswer: document.getElementById('speak-answer'),
  recordBtn: document.getElementById('record-btn'),
  recordStatus: document.getElementById('record-status'),
  playbackSection: document.getElementById('playback-section'),
  audioPlayback: document.getElementById('audio-playback'),
  micError: document.getElementById('mic-error'),
  micSelector: document.getElementById('mic-select'),
  micSelectWrapper: document.getElementById('mic-select-wrapper'),
  currentMicName: document.getElementById('current-mic-name'),
  micVisualization: document.getElementById('mic-visualization'),
  micLevelBars: document.getElementById('mic-level-bars'),
  prevBtn: document.getElementById('prev-btn'),
  nextBtn: document.getElementById('next-btn'),

  // Results
  scoreCorrect: document.getElementById('score-correct'),
  scoreTotal: document.getElementById('score-total'),
  scorePercentage: document.getElementById('score-percentage'),
  totalTime: document.getElementById('total-time'),
  avgTime: document.getElementById('avg-time'),
  resultsMessage: document.getElementById('results-message'),
  reviewBtn: document.getElementById('review-btn'),
  restartBtn: document.getElementById('restart-btn')
};

// ============================================
// Data Loading
// ============================================

/**
 * Show a temporary message inside the dataset select
 * @param {string} message
 * @param {boolean} disable
 */
function setDatasetSelectMessage(message, disable = false) {
  if (!elements.datasetSelect) return;
  elements.datasetSelect.innerHTML = '';
  const option = document.createElement('option');
  option.value = '';
  option.textContent = message;
  elements.datasetSelect.appendChild(option);
  elements.datasetSelect.disabled = disable;
}

/**
 * Render dataset options filtered by category
 * @param {string} category
 */
function renderDatasetOptions(category = 'all') {
  if (!elements.datasetSelect) return;

  const matchesCategory = (dataset) => {
    if (!Array.isArray(dataset.categories) || dataset.categories.length === 0) {
      return true;
    }
    return dataset.categories.includes(category) || category === 'all';
  };

  const filtered = state.datasets.filter(matchesCategory);

  elements.datasetSelect.innerHTML = '';
  elements.datasetSelect.disabled = filtered.length === 0;

  if (filtered.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No datasets for this category';
    elements.datasetSelect.appendChild(option);
    return;
  }

  filtered.forEach(dataset => {
    const option = document.createElement('option');
    option.value = dataset.path;
    option.textContent = dataset.name || dataset.id || dataset.path;
    elements.datasetSelect.appendChild(option);
  });

  // Preserve current selection if still available
  const currentValue = elements.datasetSelect.value;
  const hasCurrent = filtered.some(d => d.path === currentValue);
  if (!hasCurrent) {
    elements.datasetSelect.value = filtered[0].path;
  }
}

/**
 * Load manifest file describing datasets
 */
async function loadDatasetManifest() {
  try {
    setDatasetSelectMessage('Loading datasets...');
    const response = await fetch('data/manifest.json');
    if (!response.ok) {
      throw new Error(`Failed to load manifest: ${response.status} ${response.statusText}`);
    }

    const manifest = await response.json();
    if (!manifest || !Array.isArray(manifest.datasets)) {
      throw new Error('Invalid manifest format: expected { datasets: [] }');
    }

    state.datasets = manifest.datasets.map(dataset => ({
      id: dataset.id,
      name: dataset.name,
      path: dataset.path,
      categories: dataset.categories || []
    }));

    state.manifestLoaded = true;
    renderDatasetOptions(elements.categorySelect.value || 'all');
  } catch (error) {
    console.error('Dataset manifest loading error:', error);
    state.datasets = [];
    state.manifestLoaded = false;
    setDatasetSelectMessage('Failed to load datasets', true);
    showError(error.message || 'Failed to load datasets. Check manifest.json.');
  }
}

/**
 * Load questions from a JSON dataset file
 * @param {string} path - Path to the JSON file
 * @returns {Promise<Array>} Array of question objects
 */
async function loadDataset(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load dataset: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();

    // Validate dataset structure
    if (!Array.isArray(data)) {
      throw new Error('Dataset must be an array of questions');
    }

    // Validate each question has required fields
  const validQuestions = data.filter(q => {
    return q.question &&
      Array.isArray(q.options) &&
      q.options.length > 0 &&
      q.answer &&
      q.type;
  });

    if (validQuestions.length === 0) {
      throw new Error('No valid questions found in dataset');
    }

    return validQuestions;
  } catch (error) {
    console.error('Dataset loading error:', error);
    throw error;
  }
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array (new array, original unchanged)
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================================
// Session Management
// ============================================

/**
 * Start a new training session
 */
async function startSession() {
  // Clear any existing auto-next timer
  clearAutoNextTimer();

  // Get configuration values
  const datasetPath = elements.datasetSelect.value;
  const requestedCount = parseInt(elements.questionCountInput.value, 10) || 10;
  state.autoNext = elements.autoNextToggle.checked;

  if (!datasetPath) {
    showError('Please select a dataset for this category.');
    return;
  }

  // Show loading state
  elements.startBtn.disabled = true;
  elements.startBtn.innerHTML = '<span class="btn-icon">⏳</span> Loading...';
  hideError();

  try {
    // Load and prepare questions
    const allQuestions = await loadDataset(datasetPath);
    const shuffled = shuffleArray(allQuestions);

    // Limit to requested count (or dataset size, whichever is smaller)
    state.questions = shuffled.slice(0, Math.min(requestedCount, shuffled.length));
    state.questionCount = state.questions.length;

    // Reset session state
    state.currentIndex = 0;
    state.mcqCorrectCount = 0;
    state.mcqAnsweredCount = 0;
    state.questionStates = {};
    state.totalTimeMs = 0;
    state.questionStartTime = null;
    clearInterval(state.questionTimerInterval);
    state.questionTimerInterval = null;
    if (elements.questionTimer) {
      elements.questionTimer.textContent = '00:00';
    }

    // Initialize question states
    state.questions.forEach((_, index) => {
      state.questionStates[index] = {
        answered: false,
        userAnswer: null,
        isCorrect: null,
        hasRecording: false,
        recordingUrl: null,
        timeSpentMs: 0
      };
    });

    // Show quiz panel
    showPanel('quiz');
    renderQuestion();

  } catch (error) {
    showError(error.message || 'Failed to load dataset. Please try again.');
  } finally {
    // Reset button state
    elements.startBtn.disabled = false;
    elements.startBtn.innerHTML = '<span class="btn-icon">▶</span> Start Training';
  }
}

/**
 * End the session and show results
 */
function endSession() {
  clearAutoNextTimer();
  finalizeCurrentQuestionTime();

  // Calculate statistics
  const percentage = state.mcqAnsweredCount > 0
    ? Math.round((state.mcqCorrectCount / state.mcqAnsweredCount) * 100)
    : 0;

  // Update results display
  elements.scoreCorrect.textContent = state.mcqCorrectCount;
  elements.scoreTotal.textContent = state.mcqAnsweredCount;
  elements.scorePercentage.textContent = `${percentage}%`;
  elements.totalTime.textContent = formatTime(state.totalTimeMs);

  const avgMs = state.questionCount > 0 ? Math.round(state.totalTimeMs / state.questionCount) : 0;
  elements.avgTime.textContent = formatTime(avgMs);

  // Set results message based on score
  let message = '';
  if (percentage >= 90) {
    message = '🌟 Excellent! You have mastered this material!';
  } else if (percentage >= 70) {
    message = '👍 Good job! Keep practicing to improve further.';
  } else if (percentage >= 50) {
    message = '💪 Not bad! More practice will help you improve.';
  } else {
    message = '📚 Keep studying! Practice makes perfect.';
  }
  elements.resultsMessage.textContent = message;

  showPanel('results');
}

// ============================================
// Question Rendering
// ============================================

/**
 * Render the current question
 */
function renderQuestion() {
  const question = state.questions[state.currentIndex];
  const questionState = state.questionStates[state.currentIndex];

  // Update progress
  updateProgress();
  startQuestionTimer();

  // Update question type badge
  elements.questionTypeBadge.textContent = question.type;
  elements.questionTypeBadge.className = 'question-type-badge' +
    (question.type === 'Speak' ? ' speak' : '');

  // Render question text
  renderQuestionText(question, questionState);

  // Show appropriate controls based on question type
  if (question.type === 'MCQ') {
    elements.mcqOptions.classList.remove('hidden');
    elements.speakControls.classList.add('hidden');
    renderMCQOptions(question, questionState);
  } else if (question.type === 'Speak') {
    elements.mcqOptions.classList.add('hidden');
    elements.speakControls.classList.remove('hidden');
    renderSpeakControls(question, questionState);
  }

  // Update navigation buttons
  updateNavigation();
}

/**
 * Render the question text with blank or filled answer
 */
function renderQuestionText(question, questionState) {
  const parts = question.question.split('_');
  const blanksCount = parts.length - 1;
  const answers = String(question.answer || '')
    .split(',')
    .map(ans => ans.trim());

  let html = '';
  for (let i = 0; i < blanksCount; i++) {
    html += parts[i];
    if (questionState.answered) {
      const answerText = answers[i] || '';
      html += `<span class="answer-filled">${answerText}</span>`;
    } else {
      html += '<span class="blank"></span>';
    }
  }
  html += parts[blanksCount] || '';

  elements.questionText.innerHTML = html;
}

/**
 * Render MCQ option buttons
 */
function renderMCQOptions(question, questionState) {
  elements.mcqOptions.innerHTML = '';

  question.options.forEach(option => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = option;

    if (questionState.answered) {
      // Apply correct/incorrect styling
      if (option === question.answer) {
        btn.classList.add('correct');
      } else if (option === questionState.userAnswer) {
        btn.classList.add('incorrect');
      }
      btn.disabled = true;
    } else {
      // Add click handler for unanswered questions
      btn.addEventListener('click', () => handleMCQAnswer(option));
    }

    elements.mcqOptions.appendChild(btn);
  });
}

/**
 * Render Speak controls
 */
function renderSpeakControls(question, questionState) {
  // Show the correct answer
  elements.speakAnswer.textContent = question.answer;

  // Reset recording state display
  elements.recordStatus.textContent = '';
  elements.recordStatus.classList.remove('recording');

  // Handle microphone availability
  if (!state.microphoneAvailable) {
    elements.micError.classList.remove('hidden');
    elements.recordBtn.classList.add('hidden');
  } else {
    elements.micError.classList.add('hidden');
    elements.recordBtn.classList.remove('hidden');
  }

  // Show existing recording if available
  if (questionState.recordingUrl) {
    elements.audioPlayback.src = questionState.recordingUrl;
    elements.playbackSection.classList.remove('hidden');
  } else {
    elements.playbackSection.classList.add('hidden');
  }

  // Reset record button state
  elements.recordBtn.classList.remove('recording');
  elements.recordBtn.querySelector('.record-text').textContent = 'Hold to Record';
}

// ============================================
// MCQ Interaction
// ============================================

/**
 * Handle MCQ answer selection
 * @param {string} selectedOption - The option the user selected
 */
function handleMCQAnswer(selectedOption) {
  const question = state.questions[state.currentIndex];
  const questionState = state.questionStates[state.currentIndex];

  // Prevent double-answering
  if (questionState.answered) return;

  // Record answer
  questionState.answered = true;
  questionState.userAnswer = selectedOption;
  questionState.isCorrect = selectedOption === question.answer;

  // Update statistics
  state.mcqAnsweredCount++;
  if (questionState.isCorrect) {
    state.mcqCorrectCount++;
  }

  // Re-render to show feedback
  renderQuestion();

  // Handle auto-next
  if (state.autoNext) {
    scheduleAutoNext();
  }
}

// ============================================
// Speak Interaction (Recording)
// ============================================

/**
 * Initialize recording functionality
 */
function initRecording() {
  const recordBtn = elements.recordBtn;

  // Mouse events
  recordBtn.addEventListener('mousedown', startRecording);
  recordBtn.addEventListener('mouseup', stopRecording);
  recordBtn.addEventListener('mouseleave', stopRecording);

  // Touch events (for mobile)
  recordBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startRecording();
  });
  recordBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    stopRecording();
  });
}

/**
 * Get supported audio MIME type for MediaRecorder
 * @returns {string} Supported MIME type
 */
function getSupportedMimeType() {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
    'audio/mpeg',
    ''  // Empty string = browser default
  ];

  for (const type of types) {
    if (type === '' || MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

/**
 * Populate microphone selection dropdown
 */
function renderMicOptions(devices) {
  if (!elements.micSelector) return;

  elements.micSelector.innerHTML = '';
  const fallbackOption = document.createElement('option');
  fallbackOption.value = '';
  fallbackOption.textContent = devices.length === 0 ? 'No microphones found' : 'System default';
  elements.micSelector.appendChild(fallbackOption);

  devices.forEach(device => {
    const option = document.createElement('option');
    option.value = device.deviceId;
    option.textContent = device.label || 'Microphone';
    elements.micSelector.appendChild(option);
  });

  if (state.selectedMicId) {
    elements.micSelector.value = state.selectedMicId;
  }

  console.info('[Mic] renderMicOptions', {
    devices: devices.map(d => ({ id: d.deviceId, label: d.label })),
    selected: state.selectedMicId,
    optionCount: elements.micSelector.options.length
  });
}

/**
 * Show a temporary message in the mic select dropdown
 * @param {string} message
 */
function setMicSelectMessage(message) {
  if (!elements.micSelector) return;
  elements.micSelector.innerHTML = '';
  const option = document.createElement('option');
  option.value = '';
  option.textContent = message;
  elements.micSelector.appendChild(option);
}

/**
 * Refresh available microphones list
 */
async function refreshMicrophones() {
  if (state.refreshInFlight) {
    console.warn('[Mic] refreshMic skipped, already in flight');
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    console.warn('[Mic] navigator.mediaDevices.enumerateDevices not available');
    setMicSelectMessage('Mic enumeration not supported');
    return;
  }

  state.refreshInFlight = true;
  console.info('[Mic] refreshMicrophones start');

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    state.micDevices = devices.filter(device => device.kind === 'audioinput');
    console.info('[Mic] enumerateDevices result', {
      total: devices.length,
      audioInputs: state.micDevices.map(d => ({ id: d.deviceId, label: d.label }))
    });

    renderMicOptions(state.micDevices);
    if (state.micDevices.length > 0 && !state.selectedMicId) {
      state.selectedMicId = state.micDevices[0].deviceId;
      elements.micSelector.value = state.selectedMicId;
    }
    if (state.micDevices.length === 0) {
      setMicSelectMessage('No microphones found');
    }
  } catch (error) {
    console.warn('Unable to enumerate devices:', error);
    setMicSelectMessage('Unable to load microphones');
  } finally {
    state.refreshInFlight = false;
  }
}

/**
 * Update current microphone label under the recorder
 */
function updateCurrentMicLabel() {
  if (!elements.currentMicName) return;
  const selected = state.micDevices.find(device => device.deviceId === state.selectedMicId);
  elements.currentMicName.textContent = selected
    ? (selected.label || 'Selected microphone')
    : 'System default microphone';
}

/**
 * Stop live level visualization
 */
function stopLevelMonitoring() {
  if (state.levelAnimationFrame) {
    cancelAnimationFrame(state.levelAnimationFrame);
    state.levelAnimationFrame = null;
  }

  if (state.analyserSource) {
    state.analyserSource.disconnect();
    state.analyserSource = null;
  }

  state.analyser = null;

  if (elements.micLevelBars) {
    Array.from(elements.micLevelBars.children).forEach(bar => {
      bar.style.height = '8%';
    });
  }

  if (elements.micVisualization) {
    elements.micVisualization.classList.add('hidden');
  }
}

/**
 * Start live level visualization for given stream
 * @param {MediaStream} stream
 */
function startLevelMonitoring(stream) {
  if (!window.AudioContext && !window.webkitAudioContext) return;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!state.audioContext) {
    state.audioContext = new AudioCtx();
  }
  if (state.audioContext.state === 'suspended') {
    state.audioContext.resume();
  }

  state.analyser = state.audioContext.createAnalyser();
  state.analyser.fftSize = 256;
  state.levelDataArray = new Uint8Array(state.analyser.frequencyBinCount);

  state.analyserSource = state.audioContext.createMediaStreamSource(stream);
  state.analyserSource.connect(state.analyser);

  const bars = elements.micLevelBars ? Array.from(elements.micLevelBars.children) : [];

  const render = () => {
    if (!state.analyser) return;
    state.analyser.getByteFrequencyData(state.levelDataArray);
    const barCount = bars.length || 1;
    const segmentSize = Math.floor(state.levelDataArray.length / barCount);

    bars.forEach((bar, index) => {
      const start = index * segmentSize;
      const end = start + segmentSize;
      const slice = state.levelDataArray.slice(start, end);
      const avg = slice.reduce((sum, val) => sum + val, 0) / slice.length || 0;
      const height = Math.max(8, Math.min(100, (avg / 255) * 100));
      bar.style.height = `${height}%`;
    });

    state.levelAnimationFrame = requestAnimationFrame(render);
  };

  if (elements.micVisualization) {
    elements.micVisualization.classList.remove('hidden');
  }
  updateCurrentMicLabel();
  render();
}

/**
 * Stop and clear any active media stream
 */
function cleanupMediaStream() {
  stopLevelMonitoring();
  if (state.currentStream) {
    state.currentStream.getTracks().forEach(track => track.stop());
    state.currentStream = null;
  }
  state.mediaRecorder = null;
}

/**
 * Start audio recording
 */
async function startRecording() {
  if (state.isRecording) return;

  // 标记一个正在初始化的状态，防止竞态条件
  state.isInitializing = true;
  const questionState = state.questionStates[state.currentIndex];

  try {
    cleanupMediaStream();

    // Request microphone access with specific constraints
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: state.selectedMicId ? { exact: state.selectedMicId } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1
      }
    });

    // 如果用户在 getUserMedia 完成前已经松手了（想取消录音）
    if (!state.isInitializing) {
      console.log('[Mic] User released button before recording started. Aborting.');
      stream.getTracks().forEach(track => track.stop());
      return;
    }

    // Store stream reference for cleanup
    state.currentStream = stream;
    await refreshMicrophones();
    updateCurrentMicLabel();
    console.info('[Mic] getUserMedia success', {
      selectedId: state.selectedMicId,
      streamTracks: stream.getAudioTracks().map(t => ({
        id: t.id,
        label: t.label,
        settings: t.getSettings(),
        constraints: t.getConstraints()
      }))
    });

    // Get supported MIME type
    const mimeType = getSupportedMimeType();
    const options = mimeType ? { mimeType } : {};

    console.log('Using MIME type:', mimeType || 'browser default');

    state.mediaRecorder = new MediaRecorder(stream, options);
    state.audioChunks = [];

    state.mediaRecorder.ondataavailable = (event) => {
      console.log('Data available:', event.data.size, 'bytes');
      if (event.data && event.data.size > 0) {
        state.audioChunks.push(event.data);
      }
    };

    state.mediaRecorder.onstop = () => {
      console.log('Recording stopped, chunks:', state.audioChunks.length);
      state.isRecording = false;

      const hasAudio = state.audioChunks.some(chunk => chunk.size > 0);

      if (!hasAudio) {
        console.warn('No audio chunks recorded');
        elements.recordStatus.textContent = '⚠️ No audio captured. Press and hold while speaking.';
        elements.recordBtn.classList.remove('recording');
        elements.recordBtn.querySelector('.record-text').textContent = 'Hold to Record';
        elements.playbackSection.classList.add('hidden');
        elements.audioPlayback.src = '';
        elements.audioPlayback.load();
        if (questionState.recordingUrl) {
          URL.revokeObjectURL(questionState.recordingUrl);
        }
        questionState.answered = false;
        questionState.hasRecording = false;
        questionState.recordingUrl = null;
        renderQuestionText(state.questions[state.currentIndex], questionState);
        cleanupMediaStream();
        return;
      }

      // Create audio blob with the correct MIME type
      const actualMimeType = state.mediaRecorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(state.audioChunks, { type: actualMimeType });

      console.log('Created blob:', audioBlob.size, 'bytes, type:', actualMimeType);

      // Revoke previous URL if exists
      if (questionState.recordingUrl) {
        URL.revokeObjectURL(questionState.recordingUrl);
      }

      const audioUrl = URL.createObjectURL(audioBlob);

      // Store recording
      questionState.recordingUrl = audioUrl;
      questionState.hasRecording = true;
      questionState.answered = true;

      // Update UI
      elements.audioPlayback.src = audioUrl;
      elements.audioPlayback.load(); // Force reload the audio element
      elements.playbackSection.classList.remove('hidden');
      elements.recordStatus.textContent = '✅ Recording saved';
      elements.recordStatus.classList.remove('recording');
      elements.recordBtn.classList.remove('recording');
      elements.recordBtn.querySelector('.record-text').textContent = 'Hold to Record';

      // Update question text to show answer
      renderQuestionText(state.questions[state.currentIndex], questionState);

      cleanupMediaStream();

      // Handle auto-next
      if (state.autoNext) {
        scheduleAutoNext();
      }
    };

    state.mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event.error);
      elements.recordStatus.textContent = '❌ Recording error occurred';
      state.isRecording = false;
      elements.recordBtn.classList.remove('recording');
      elements.recordBtn.querySelector('.record-text').textContent = 'Hold to Record';
      cleanupMediaStream();
    };

    // Start recording
    state.mediaRecorder.start();
    state.isRecording = true;
    // 【录音无声修复 1】: 克隆流用于可视化，防止劫持原始流
    const visualizationStream = stream.clone();
    startLevelMonitoring(visualizationStream);

    // Update UI
    elements.recordBtn.classList.add('recording');
    elements.recordBtn.querySelector('.record-text').textContent = 'Recording...';
    elements.recordStatus.textContent = '🔴 Recording in progress...';
    elements.recordStatus.classList.add('recording');

  } catch (error) {
    console.error('Recording error:', error);
    state.isRecording = false;
    state.microphoneAvailable = false;
    cleanupMediaStream();
    setMicSelectMessage('Microphone blocked or unavailable');
    console.error('[Mic] getUserMedia failed', error);
    elements.micError.classList.remove('hidden');
    elements.recordBtn.classList.add('hidden');

    // Still mark as answered and show the answer
    const questionState = state.questionStates[state.currentIndex];
    questionState.answered = true;
    renderQuestionText(state.questions[state.currentIndex], questionState);

    if (state.autoNext) {
      scheduleAutoNext();
    }
  } finally {
    state.isInitializing = false; // 初始化结束
  }
}

/**
 * Stop audio recording
 */
function stopRecording() {
  // 如果正在初始化（getUserMedia 还没返回），我们标记它为 false
  // 这样当 startRecording 最终获取到流时，会知道用户已经松手了，从而直接放弃。
  if (state.isInitializing) {
    state.isInitializing = false;
    // 重置 UI
    elements.recordBtn.classList.remove('recording');
    elements.recordBtn.querySelector('.record-text').textContent = 'Hold to Record';
    elements.recordStatus.textContent = '';
    elements.recordStatus.classList.remove('recording');
    return;
  }

  if (!state.isRecording || !state.mediaRecorder) return;

  // Check if MediaRecorder is in a valid state to stop
  if (state.mediaRecorder.state === 'inactive') {
    console.warn('MediaRecorder already inactive');
    state.isRecording = false;
    return;
  }

  try {
    // Request final data to avoid empty recordings on fast taps
    // 【录音无声修复 2】: 不需要再执行一次 requestData()，直接 stop() 即可
    // state.mediaRecorder.requestData(); // 强制触发一次 dataavailable
    state.mediaRecorder.stop(); // 强制触发一次 dataavailable
  } catch (error) {
    console.error('Error stopping MediaRecorder:', error);
    cleanupMediaStream();
  }

  state.isRecording = false;

  // Reset UI
  elements.recordBtn.classList.remove('recording');
  elements.recordBtn.querySelector('.record-text').textContent = 'Processing...';
  elements.recordStatus.textContent = 'Processing recording...';
  elements.recordStatus.classList.remove('recording');
}

// ============================================
// Navigation
// ============================================

/**
 * Update progress display
 */
function updateProgress() {
  const current = state.currentIndex + 1;
  const total = state.questionCount;

  elements.progressText.textContent = `Question ${current} / ${total}`;
  elements.progressFill.style.width = `${(current / total) * 100}%`;
}

/**
 * Update navigation button states
 */
function updateNavigation() {
  elements.prevBtn.disabled = state.currentIndex === 0;

  // Next button text changes on last question
  if (state.currentIndex === state.questionCount - 1) {
    elements.nextBtn.textContent = 'Finish →';
  } else {
    elements.nextBtn.textContent = 'Next →';
  }
}

/**
 * Go to previous question
 */
function goToPrevious() {
  clearAutoNextTimer();
  finalizeCurrentQuestionTime();

  if (state.currentIndex > 0) {
    state.currentIndex--;
    renderQuestion();
  }
}

/**
 * Go to next question or finish
 */
function goToNext() {
  clearAutoNextTimer();
  finalizeCurrentQuestionTime();

  if (state.currentIndex < state.questionCount - 1) {
    state.currentIndex++;
    renderQuestion();
  } else {
    endSession();
  }
}

/**
 * Schedule auto-advance to next question
 */
function scheduleAutoNext() {
  clearAutoNextTimer();

  state.autoNextTimer = setTimeout(() => {
    goToNext();
  }, 1000);
}

/**
 * Clear auto-next timer
 */
function clearAutoNextTimer() {
  if (state.autoNextTimer) {
    clearTimeout(state.autoNextTimer);
    state.autoNextTimer = null;
  }
}

// ============================================
// Timing
// ============================================

/**
 * Start timer for the current question
 */
function startQuestionTimer() {
  clearInterval(state.questionTimerInterval);

  const questionState = state.questionStates[state.currentIndex];
  if (!questionState) return;

  state.questionStartTime = performance.now();

  const updateDisplay = () => {
    const elapsedMs = getCurrentQuestionElapsed();
    if (elements.questionTimer) {
      elements.questionTimer.textContent = formatTime(elapsedMs);
    }
  };

  updateDisplay();
  state.questionTimerInterval = setInterval(updateDisplay, 500);
}

/**
 * Compute elapsed time for current question including in-progress span
 */
function getCurrentQuestionElapsed() {
  const questionState = state.questionStates[state.currentIndex];
  if (!questionState) return 0;

  const base = questionState.timeSpentMs || 0;
  if (!state.questionStartTime) return base;

  const now = performance.now();
  return base + Math.max(0, now - state.questionStartTime);
}

/**
 * Finalize timing when leaving a question
 */
function finalizeCurrentQuestionTime() {
  const questionState = state.questionStates[state.currentIndex];
  if (!questionState) return;

  const elapsed = getCurrentQuestionElapsed();
  const delta = Math.max(0, elapsed - (questionState.timeSpentMs || 0));

  questionState.timeSpentMs = elapsed;
  state.totalTimeMs += delta;
  state.questionStartTime = null;

  clearInterval(state.questionTimerInterval);
  state.questionTimerInterval = null;
}

/**
 * Format milliseconds to mm:ss or hh:mm:ss
 * @param {number} ms
 * @returns {string}
 */
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => n.toString().padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

// ============================================
// Panel Management
// ============================================

/**
 * Show a specific panel
 * @param {string} panelName - 'settings', 'quiz', or 'results'
 */
function showPanel(panelName) {
  elements.settingsPanel.classList.add('hidden');
  elements.quizPanel.classList.add('hidden');
  elements.resultsPanel.classList.add('hidden');

  switch (panelName) {
    case 'settings':
      elements.settingsPanel.classList.remove('hidden');
      break;
    case 'quiz':
      elements.quizPanel.classList.remove('hidden');
      break;
    case 'results':
      elements.resultsPanel.classList.remove('hidden');
      break;
  }
}

/**
 * Show error message in settings panel
 * @param {string} message - Error message to display
 */
function showError(message) {
  elements.settingsError.textContent = message;
  elements.settingsError.classList.remove('hidden');
}

/**
 * Hide error message
 */
function hideError() {
  elements.settingsError.classList.add('hidden');
}

// ============================================
// Event Listeners
// ============================================

function initEventListeners() {
  console.info('[App] initEventListeners');
  // Settings
  elements.startBtn.addEventListener('click', startSession);

  // Quiz navigation
  elements.prevBtn.addEventListener('click', goToPrevious);
  elements.nextBtn.addEventListener('click', goToNext);
  elements.backToSettingsBtn.addEventListener('click', () => {
    clearAutoNextTimer();
    finalizeCurrentQuestionTime();
    showPanel('settings');
  });

  // Results
  elements.reviewBtn.addEventListener('click', () => {
    state.currentIndex = 0;
    showPanel('quiz');
    renderQuestion();
  });

  elements.restartBtn.addEventListener('click', () => {
    showPanel('settings');
  });

  // Validate question count input
  elements.questionCountInput.addEventListener('change', () => {
    let value = parseInt(elements.questionCountInput.value, 10);
    if (isNaN(value) || value < 1) value = 1;
    if (value > 100) value = 100;
    elements.questionCountInput.value = value;
  });

  elements.categorySelect.addEventListener('change', () => {
    const category = elements.categorySelect.value || 'all';
    renderDatasetOptions(category);
  });

  if (elements.micSelector) {
    elements.micSelector.addEventListener('change', (event) => {
      state.selectedMicId = event.target.value;
      updateCurrentMicLabel();
      console.info('[Mic] selector changed', {
        selectedId: state.selectedMicId
      });
    });
  }

  // Initialize recording
  initRecording();
}

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  console.info('[App] DOMContentLoaded');
  initEventListeners();
  loadDatasetManifest();
  refreshMicrophones();

  if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
    navigator.mediaDevices.addEventListener('devicechange', () => {
      console.info('[Mic] devicechange event');
      refreshMicrophones();
    });
  }

  // Check for microphone support
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    state.microphoneAvailable = false;
  }
});
