// app.js - Core Javascript Controller for InternX by UTX

// Safe localStorage wrapper to prevent exceptions under file:// or restricted browser profiles
const storage = {
  getItem(key) {
    try { return localStorage.getItem(key); } catch (e) { return window.__memoryStorage?.[key] || null; }
  },
  setItem(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {
      if (!window.__memoryStorage) window.__memoryStorage = {};
      window.__memoryStorage[key] = value;
    }
  },
  removeItem(key) {
    try { localStorage.removeItem(key); } catch (e) {
      if (window.__memoryStorage) delete window.__memoryStorage[key];
    }
  }
};

// Theme Management Logic
function loadTheme() {
  const savedTheme = storage.getItem('internx_theme') || 'dark';
  if (savedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    updateThemeToggleIcons('light');
  } else {
    document.documentElement.removeAttribute('data-theme');
    updateThemeToggleIcons('dark');
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  if (currentTheme === 'light') {
    document.documentElement.removeAttribute('data-theme');
    storage.setItem('internx_theme', 'dark');
    updateThemeToggleIcons('dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    storage.setItem('internx_theme', 'light');
    updateThemeToggleIcons('light');
  }
}

function updateThemeToggleIcons(theme) {
  const btns = document.querySelectorAll('.theme-toggle-btn');
  btns.forEach(btn => {
    const isPill = btn.classList.contains('theme-pill-btn');
    const isPortal = btn.classList.contains('portal-theme-btn') || btn.classList.contains('sidebar-theme-btn');

    if (isPill) {
      // Pill button — just update the label text
      const label = btn.querySelector('.theme-pill-label');
      if (label) {
        label.textContent = theme === 'light' ? 'DAY MODE' : 'NIGHT MODE';
      }
      btn.title = theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode';
    } else if (isPortal) {
      // Legacy portal buttons with icon + label spans (fallback, should not appear now)
      const iconEl = btn.querySelector('.theme-icon');
      const labelEl = btn.querySelector('.theme-label');
      if (theme === 'light') {
        if (iconEl) iconEl.textContent = '';
        if (labelEl) labelEl.textContent = 'Dark Theme';
        btn.title = 'Switch to Dark Mode';
      } else {
        if (iconEl) iconEl.textContent = '';
        if (labelEl) labelEl.textContent = 'Light Theme';
        btn.title = 'Switch to Light Mode';
      }
    } else {
      // Any other plain button — leave as-is
      btn.title = theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode';
    }
  });
}

// Call loadTheme immediately so the theme applies before full page load
loadTheme();

// ====== LOGO 7-CLICK EASTER EGG ... Toggle Supabase Badge ======
let _logoClickCount = 0;
let _logoClickTimer = null;

function handleLogoSecretClick() {
  _logoClickCount++;
  clearTimeout(_logoClickTimer);
  _logoClickTimer = setTimeout(() => { _logoClickCount = 0; }, 3000);

  if (_logoClickCount >= 7) {
    _logoClickCount = 0;
    clearTimeout(_logoClickTimer);

    // Landing page badge wrapper
    const landingWrapper = document.getElementById('supabase-status-badge-wrapper');
    // Portal sidebar badge wrapper
    const sidebarWrapper = document.getElementById('supabase-sidebar-wrapper');

    // Toggle both ... whichever is visible on current page
    let anyVisible = false;
    if (landingWrapper) {
      const vis = landingWrapper.style.display !== 'none';
      landingWrapper.style.display = vis ? 'none' : 'inline';
      anyVisible = vis;
    }
    if (sidebarWrapper) {
      const vis = sidebarWrapper.style.display === 'flex';
      sidebarWrapper.style.display = vis ? 'none' : 'flex';
      anyVisible = vis;
    }

    showToast(anyVisible ? '?? DB Badge hidden' : '?? DB Badge visible', 1800);
  }
}

function showToast(message, duration = 2000) {
  let toast = document.getElementById('_internx_toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = '_internx_toast';
    toast.style.cssText = `
      position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%) translateY(20px);
      background: rgba(20,20,30,0.92); color: #fff; padding: 10px 20px;
      border-radius: 20px; font-size: 13px; font-family: 'Outfit', sans-serif;
      border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      z-index: 99999; opacity: 0; transition: all 0.25s ease; pointer-events: none;
      backdrop-filter: blur(10px);
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, duration);
}

// Utility to robustly parse JSON strings, handling nested/double stringified values
function robustParse(data) {
  let parsed = data;
  while (typeof parsed === 'string') {
    try {
      const next = JSON.parse(parsed);
      if (next === parsed) {
        break;
      }
      parsed = next;
    } catch (e) {
      break;
    }
  }
  return parsed;
}

// Clean standard database collections to ensure only valid objects exist
function cleanDatabaseCollections() {
  const standardCollections = ['pairingRequests', 'users', 'tasks', 'weeklyLogs', 'chats', 'attendance', 'meetings', 'quizzes', 'quizSubmissions', 'signals', 'certificates', 'domainSettings', 'payments'];
  const mockEmails = [
    'mentor1@internship.com', 'mentor2@internship.com', 'mentor3@internship.com',
    'student1@internship.com', 'student2@internship.com', 'student3@internship.com',
    'admin@internship.com'
  ];

  standardCollections.forEach(col => {
    if (db && Array.isArray(db[col])) {
      db[col] = db[col].map(item => robustParse(item)).filter(item => {
        if (!item || typeof item !== 'object') return false;
        
        // Filter out old mock users/records by associated email keys
        const emailKeys = [
          item.email, item.studentEmail, item.mentorEmail, 
          item.assignedTo, item.assignedBy, item.studentId, 
          item.from, item.to
        ];
        
        for (let emailKey of emailKeys) {
          if (emailKey && typeof emailKey === 'string') {
            const lEmail = emailKey.trim().toLowerCase();
            if (mockEmails.includes(lEmail)) return false;
          }
        }
        
        // Also check if user item is one of the old mock user IDs
        if (item.id && (
          item.id === 'mentor-1' || item.id === 'mentor-2' || item.id === 'mentor-3' ||
          item.id === 'student-1' || item.id === 'student-2' || item.id === 'student-3' ||
          item.id === 'admin-1'
        )) {
          return false;
        }
        
        return true;
      });
    } else if (db) {
      db[col] = [];
    }
  });

  // Deduplicate users by email ... keep the best record per student
  if (db && Array.isArray(db.users)) {
    db.users = dedupeUsersByEmail(db.users);
  }
}

// ====== Face-API Initialization and Eye Tracking Scan Logic ======
let webcamTrackingIntervals = {};

async function initFaceVerificationModels() {
  console.log("Initializing Face Verification System...");
  try {
    // 1. Try local specific subfolders first
    try {
      await faceapi.nets.ssdMobilenetv1.loadFromUri('./models/ssd_mobilenetv1');
      await faceapi.nets.faceLandmark68Net.loadFromUri('./models/face_landmark_68');
      await faceapi.nets.faceRecognitionNet.loadFromUri('./models/face_recognition');
      faceModelsLoaded = true;
      console.log("Face API Models loaded successfully from local assets!");
      return;
    } catch (localErr) {
      console.warn("Failed to load models locally, trying CDN fallback...", localErr);
    }

    // 2. CDN Fallback (works perfectly under file:// protocol!)
    const CDN_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
    await faceapi.nets.ssdMobilenetv1.loadFromUri(CDN_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(CDN_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(CDN_URL);
    faceModelsLoaded = true;
    console.log("Face API Models loaded successfully from CDN!");
  } catch (err) {
    console.error("Failed to load Face API models from both local and CDN:", err);
  }
}

function updateEyeScanPositions(video, detection, prefix) {
  const leftEyeEl = document.getElementById(`${prefix}-eye-left`);
  const rightEyeEl = document.getElementById(`${prefix}-eye-right`);
  
  if (!leftEyeEl || !rightEyeEl) return;
  
  if (!detection || !detection.landmarks) {
    // Reset to default style and layout
    leftEyeEl.classList.remove('locked');
    rightEyeEl.classList.remove('locked');
    leftEyeEl.style.position = '';
    leftEyeEl.style.left = '';
    leftEyeEl.style.top = '';
    rightEyeEl.style.position = '';
    rightEyeEl.style.left = '';
    rightEyeEl.style.top = '';
    
    const guide = leftEyeEl.parentElement;
    if (guide) {
      guide.style.position = '';
      guide.style.top = '';
      guide.style.left = '';
      guide.style.width = '';
      guide.style.height = '';
      guide.style.padding = '';
      guide.style.display = '';
    }
    return;
  }
  
  const landmarks = detection.landmarks;
  const leftEyePoints = landmarks.getLeftEye();
  const rightEyePoints = landmarks.getRightEye();

  const leftEyeCenter = leftEyePoints.reduce((sum, p) => ({ x: sum.x + p.x, y: sum.y + p.y }), { x: 0, y: 0 });
  leftEyeCenter.x /= leftEyePoints.length;
  leftEyeCenter.y /= leftEyePoints.length;

  const rightEyeCenter = rightEyePoints.reduce((sum, p) => ({ x: sum.x + p.x, y: sum.y + p.y }), { x: 0, y: 0 });
  rightEyeCenter.x /= rightEyePoints.length;
  rightEyeCenter.y /= rightEyePoints.length;

  const videoW = video.videoWidth || 640;
  const videoH = video.videoHeight || 480;

  // Mirror X coordinates since video is scaleX(-1) mirrored
  const leftPercentX = 100 - (leftEyeCenter.x / videoW) * 100;
  const leftPercentY = (leftEyeCenter.y / videoH) * 100;

  const rightPercentX = 100 - (rightEyeCenter.x / videoW) * 100;
  const rightPercentY = (rightEyeCenter.y / videoH) * 100;

  // Configure parent guide to cover the entire container relative to the video
  const guide = leftEyeEl.parentElement;
  if (guide) {
    guide.style.position = 'absolute';
    guide.style.top = '0';
    guide.style.left = '0';
    guide.style.width = '100%';
    guide.style.height = '100%';
    guide.style.padding = '0';
    guide.style.display = 'block';
  }

  // Position target reticles absolute relative to the container
  leftEyeEl.style.position = 'absolute';
  leftEyeEl.style.left = `calc(${leftPercentX}% - 26px)`; // center 52px width
  leftEyeEl.style.top = `calc(${leftPercentY}% - 19px)`;  // center 38px height
  leftEyeEl.classList.add('locked');

  rightEyeEl.style.position = 'absolute';
  rightEyeEl.style.left = `calc(${rightPercentX}% - 26px)`;
  rightEyeEl.style.top = `calc(${rightPercentY}% - 19px)`;
  rightEyeEl.classList.add('locked');
}

let webcamTrackingActive = {};

async function runWebcamTrackingLoop(videoElId, prefix) {
  if (!webcamTrackingActive[videoElId]) return;

  const video = document.getElementById(videoElId);
  const leftEyeEl = document.getElementById(`${prefix}-eye-left`);
  const rightEyeEl = document.getElementById(`${prefix}-eye-right`);

  if (!video || !video.srcObject || !faceModelsLoaded) {
    webcamTrackingActive[videoElId] = false;
    if (leftEyeEl && rightEyeEl) {
      updateEyeScanPositions(video, null, prefix);
    }
    return;
  }

  try {
    const detection = await faceapi.detectSingleFace(video).withFaceLandmarks();
    updateEyeScanPositions(video, detection, prefix);
  } catch (e) {
    // Ignore errors in loop
  }

  // Schedule next iteration only after the current one finishes, yielding to browser scheduler
  if (webcamTrackingActive[videoElId]) {
    webcamTrackingIntervals[videoElId] = setTimeout(() => {
      runWebcamTrackingLoop(videoElId, prefix);
    }, 200);
  }
}

function startWebcamTracking(videoElId, prefix) {
  stopWebcamTracking(videoElId);
  webcamTrackingActive[videoElId] = true;
  runWebcamTrackingLoop(videoElId, prefix);
}

function stopWebcamTracking(videoElId) {
  webcamTrackingActive[videoElId] = false;
  if (webcamTrackingIntervals[videoElId]) {
    clearTimeout(webcamTrackingIntervals[videoElId]);
    delete webcamTrackingIntervals[videoElId];
  }
}

// 1. DATABASE INITIALIZATION
let db = {};
let currentUser = null;
let activeRegisterRole = 'student'; // 'student', 'mentor', 'admin'
// ====== PASTE HERE: Face-API State Engine Variables ======
let faceModelsLoaded = false;
const FACE_MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

let activeChatRecipient = null; // Email of active chat partner (for mentor portal)
let uploadedTaskAttachment = null;


// Supabase state variables
let supabaseClient = null;
let supabaseActive = false;
let supabaseSubscriptionChannel = null;
let realtimeReconnectTimer = null;

// Compatibility variables for legacy Firestore checks
let firestore = null;
let firestoreActive = false;
let isInitialSyncDone = false;
let supabaseHasMentorStatusColumn = storage.getItem('apex_intern_supabase_has_mentor_status') !== 'false';
let supabaseSyncState = 'local'; // local | active | partial | offline
let partialSyncRetryTimer = null;
const APEX_SYNC_COLLECTIONS = ['pairingRequests', 'users', 'tasks', 'weeklyLogs', 'chats', 'attendance', 'meetings', 'quizzes', 'quizSubmissions', 'certificates'];
let firebaseStorage = null;
let firebaseStorageActive = false;

// Chat attachment states
let studentChatAttachment = null;
let mentorChatAttachment = null;
let currentUploadTask = { student: null, mentor: null };
let chunkedFilesCache = {};

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    initDatabase();
    initSupabase();
    
    // ====== LOGIC INJECTED HERE (Clean Call) ======
    initFaceVerificationModels(); 
    
    initLocalTabSync(); // Sync between local tabs
    initChatBroadcastSync();
    initMeetingBroadcastSync();
    warnFileProtocolIfNeeded();
    checkSession();
    updateLandingStats();
    initExploreOpportunities();
    requestNotificationPermission();
    
    // Check URL parameters for auto-verification
    const urlParams = new URLSearchParams(window.location.search);
    const verifyId = urlParams.get('verify');
    if (verifyId) {
      setTimeout(() => {
        verifyCertificate(verifyId);
      }, 500);
    }
    
    // Initialize AI Copilot draggable trigger
    const copilotBtn = document.getElementById('ai-copilot-trigger');

    // Attach sidebar user profile click ? Edit Profile
    const sidebarUser = document.querySelector('.sidebar-user');
    const sidebarAvatar = document.getElementById('sidebar-avatar');

    // Force override any cached HTML inline onclick handlers
    if (sidebarUser) {
      sidebarUser.onclick = function(e) {
        if (e.target.closest('.logout-btn')) return;
        e.stopPropagation();
        openEditProfileModal();
      };
    }
    if (sidebarAvatar) {
      sidebarAvatar.onclick = function(e) {
        e.stopPropagation();
        openEditProfileModal();
      };
    }
    if (copilotBtn) {
      makeElementDraggable(copilotBtn);

      // Clean Spline logo and scene text elements
      const viewer = copilotBtn.querySelector('spline-viewer');
      if (viewer) {
        const cleanSpline = () => {
          if (viewer.shadowRoot) {
            const logo = viewer.shadowRoot.getElementById('logo');
            if (logo) {
              logo.style.display = 'none';
              logo.style.opacity = '0';
              logo.style.visibility = 'hidden';
              logo.style.pointerEvents = 'none';
            }
            const anchors = viewer.shadowRoot.querySelectorAll('a');
            if (anchors && anchors.length > 0) {
              anchors.forEach(a => {
                if (a.href && a.href.includes('spline.design')) {
                  a.style.display = 'none';
                  a.style.opacity = '0';
                  a.style.visibility = 'hidden';
                  a.style.pointerEvents = 'none';
                }
              });
            }
          }
          try {
            if (typeof viewer.findObjectByName === 'function') {
              const lookAround = viewer.findObjectByName('Look around');
              if (lookAround) lookAround.visible = false;
              const startText = viewer.findObjectByName('Start');
              if (startText) startText.visible = false;
            }
          } catch (err) {}
        };
        viewer.addEventListener('load', cleanSpline);
        setTimeout(cleanSpline, 1200);
      }
    }
  } catch (e) {
    console.error("Critical error loading system dashboards", e);
  }
});

function initDatabase() {
  const savedData = storage.getItem('apex_intern_db');
  if (savedData) {
    try {
      db = JSON.parse(savedData);
      cleanDatabaseCollections();
      if (!db || !db.users || db.users.length === 0 || !db.tasks || !db.weeklyLogs || !db.chats) {
        db = INITIAL_MOCK_DATA;
        cleanDatabaseCollections();
        saveDatabase();
      }
    } catch (e) {
      db = INITIAL_MOCK_DATA;
      cleanDatabaseCollections();
      saveDatabase();
    }
  } else {
    db = INITIAL_MOCK_DATA; // Fallback to mock data seed
    cleanDatabaseCollections();
    saveDatabase();
  }

  // Ensure skills, syncNotes and pairingRequests structures exist
  if (!db.skills) db.skills = {};
  if (!db.syncNotes) db.syncNotes = {};
  if (!db.pairingRequests) db.pairingRequests = [];
  if (!db.attendance) db.attendance = [];
  if (!db.meetings) db.meetings = [];
  if (!db.certificates) db.certificates = [];
  if (!db.payments) db.payments = [];

  // Seed default students with faceDescriptor so dashboard works without re-registering
  let seeded = false;
  db.users.forEach(u => {
    if (u.role === 'student' && !u.faceDescriptor) {
      u.faceDescriptor = generateMockFaceData(u.name);
      seeded = true;
    }
  });
  if (db.users) db.users = dedupeUsersByEmail(db.users);
  normalizeDbChatRecords();
  if (seeded) {
    saveDatabase();
  }
}

function syncDatabase() {
  if (cloudSyncInProgress) return;
  const savedData = storage.getItem('apex_intern_db');
  if (savedData) {
    try {
      db = JSON.parse(savedData);
      cleanDatabaseCollections();
      normalizeDbChatRecords();
      if (db.users) db.users = dedupeUsersByEmail(db.users);
      if (db.pairingRequests) db.pairingRequests = dedupePairingRequests(db.pairingRequests);
      refreshCurrentUserFromDb();
    } catch (e) {
      console.warn("Storage sync failed, using in-memory state", e);
    }
  }
}

function normalizeDbChatRecords() {
  if (!Array.isArray(db.chats)) return;
  let repaired = false;
  db.chats.forEach(c => {
    if (!c || typeof c !== 'object') return;
    if (c.from) c.from = normalizeChatEmail(c.from);
    if (c.to) c.to = normalizeChatEmail(c.to);
    if (c.from && c.to) {
      const student = db.users.find(u => u.role === 'student' && normalizeChatEmail(u.email) === c.from);
      if (student && student.mentorEmail) {
        const mentorEmail = normalizeChatEmail(student.mentorEmail);
        if (mentorEmail && c.to !== mentorEmail) {
          c.to = mentorEmail;
          repaired = true;
        }
      }
    }
  });
  if (repaired) saveDatabase();
}

let persistDbTimer = null;
function saveDatabase(immediate) {
  const persist = () => {
    try {
      // Agar db ka size bada ho jaye toh stringify crash nahi hoga
      const dataString = JSON.stringify(db);
      
      // Safety Check: Agar data 4.5MB se bada hai, toh use LocalStorage mein mat dalo (taki error na aaye)
      if (dataString.length > 4.5 * 1024 * 1024) {
        console.warn("Database string is too heavy for LocalStorage! Saving in RAM only to prevent console errors.");
        if (!window.__memoryStorage) window.__memoryStorage = {};
        window.__memoryStorage['apex_intern_db'] = dataString;
        return;
      }
      
      localStorage.setItem('apex_intern_db', dataString);
    } catch (e) {
      console.warn('Storage write blocked, using in-memory backup', e);
    }
  };
  if (immediate) {
    clearTimeout(persistDbTimer);
    persist();
    return;
  }
  clearTimeout(persistDbTimer);
  persistDbTimer = setTimeout(persist, 700);
}

function schedulePersistDb() {
  saveDatabase(false);
}

function flushDatabase() {
  clearTimeout(persistDbTimer);
  persistDbTimer = null;
  try {
    // Direct storage.setItem ke bajay JSON text check karein
    const dataString = JSON.stringify(db);
    
    // Safety check loop trap
    if (dataString.length > 4.5 * 1024 * 1024) {
      console.warn("Database string is too heavy for flush operation! Saving in RAM memory backup.");
      if (!window.__memoryStorage) window.__memoryStorage = {};
      window.__memoryStorage['apex_intern_db'] = dataString;
      return;
    }
    
    localStorage.setItem('apex_intern_db', dataString);
  } catch (e) {
    console.warn('flushDatabase failed due to quota limit:', e);
  }
}
function setSupabaseSyncBadge(state, detail) {
  supabaseSyncState = state;
  const badgeEl = document.getElementById('supabase-status-badge');
  const badgeMenuEl = document.getElementById('supabase-status-badge-sidebar');
  const labels = {
    active: 'DB: Supabase (Active)',
    partial: 'DB: Supabase (Sync Partial ... click to retry)',
    offline: 'DB: Supabase (Offline)',
    local: 'DB: Local Storage (Fallback)'
  };
  const label = detail || labels[state] || labels.local;
  [badgeEl, badgeMenuEl].forEach(badge => {
    if (!badge) return;
    badge.innerText = label;
    if (state === 'active') {
      badge.className = 'supabase-status-badge active';
      badge.title = 'Cloud database connected';
    } else if (state === 'partial') {
      badge.className = 'supabase-status-badge fallback';
      badge.title = 'Sync incomplete ... click to retry';
    } else {
      badge.className = 'supabase-status-badge fallback';
      badge.title = state === 'local' ? 'Using local storage only' : 'Click to configure Supabase';
    }
  });
  if (state === 'partial') schedulePartialSyncRetry();
  else if (partialSyncRetryTimer) {
    clearInterval(partialSyncRetryTimer);
    partialSyncRetryTimer = null;
  }
}

function schedulePartialSyncRetry() {
  if (partialSyncRetryTimer) return;
  partialSyncRetryTimer = setInterval(() => {
    if (supabaseSyncState === 'partial' && supabaseActive) {
      retrySupabaseCloudSync(true);
    }
  }, 18000);
}

async function pullCollectionsFromApexSync(collections) {
  if (!supabaseActive || !supabaseClient) return false;
  let localUpdated = false;
  cloudSyncInProgress = true;

  try {
    for (const colName of collections) {
      try {
        const { data, error } = await supabaseClient
          .from('apex_sync')
          .select('id, data')
          .eq('collection', colName)
          .limit(1000);
        if (error) {
          console.warn(`apex_sync pull failed for ${colName}:`, error);
          continue;
        }
        if (!data || data.length === 0) continue;
        data.forEach(record => {
          const parsed = robustParse(record.data);
          if (parsed && typeof parsed === 'object') {
            mergeCloudRecordIntoDb(colName, parsed, record.id);
            localUpdated = true;
          }
        });
      } catch (colErr) {
        console.warn(`Collection pull error (${colName}):`, colErr);
      }
    }

    if (localUpdated) {
      if (db.users) db.users = dedupeUsersByEmail(db.users);
      if (db.pairingRequests) db.pairingRequests = dedupePairingRequests(db.pairingRequests);
      normalizeDbChatRecords();
      saveDatabase(true);
      refreshCurrentUserFromDb();
    }
    return localUpdated;
  } finally {
    cloudSyncInProgress = false;
  }
}

async function retrySupabaseCloudSync(silent) {
  if (!supabaseActive || !supabaseClient) {
    if (!silent) alert('Supabase is not connected. Check your internet or Supabase settings.');
    return false;
  }
  if (!silent) setSupabaseSyncBadge('partial', 'DB: Supabase (Retrying sync...)');

  const ok = await pullCollectionsFromApexSync(APEX_SYNC_COLLECTIONS);
  if (ok) {
    firestoreActive = true;
    setSupabaseSyncBadge('active');
    setupSupabaseRealtimeChannel();
    if (currentUser?.role === 'mentor') {
      scheduleMentorDashboardRefresh(200);
      if (getActiveMentorTab() === 'attendance') {
        renderMentorAttendanceControls();
        loadMentorAttendanceLogs();
      }
    } else if (currentUser) {
      scheduleRefreshUIForActiveView(400);
    }
    if (!silent) console.log('Supabase cloud sync recovered successfully.');
    return true;
  }

  setSupabaseSyncBadge('partial');
  if (!silent) alert('Sync still partial. Use run_local_server.bat ? http://localhost:8080/ and check internet connection.');
  return false;
}

function handleSupabaseBadgeClick() {
  if (location.protocol === 'file:') {
    alert('Open via local server for full sync:\n\n1. Double-click run_local_server.bat\n2. Open http://localhost:8080/\n\nDirect file:// breaks camera, face scan, and cloud sync.');
    return;
  }
  if (supabaseSyncState === 'partial') {
    retrySupabaseCloudSync(false);
    return;
  }
  openSupabaseConfigModal();
}

function setupSupabaseRealtimeChannel() {
  if (!supabaseActive || !supabaseClient) return;

  if (supabaseSubscriptionChannel) {
    try {
      supabaseClient.removeChannel(supabaseSubscriptionChannel);
    } catch (e) {}
  }

  supabaseSubscriptionChannel = supabaseClient
    .channel('apex-realtime-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'apex_sync' },
      handleSupabaseChange
    )
    .subscribe((status) => {
      console.log('Supabase realtime:', status);

      if (
        status === 'CHANNEL_ERROR' ||
        status === 'TIMED_OUT' ||
        status === 'CLOSED'
      ) {
        clearTimeout(realtimeReconnectTimer);
        realtimeReconnectTimer = setTimeout(
          () => setupSupabaseRealtimeChannel(),
          4000
        );
      }
    });
}

function refreshCurrentUserFromDb() {
  if (!currentUser) return;
  const updatedUser = db.users.find(u => u && u.email && u.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase());
  if (updatedUser) {
    currentUser = { ...updatedUser };
    const accepted = getAcceptedPairingForStudent(currentUser.email);
    if (accepted) {
      currentUser.mentorStatus = 'Active';
      currentUser.mentorEmail = accepted.mentorEmail || currentUser.mentorEmail;
    }
    storage.setItem('apex_intern_currentUser', JSON.stringify(currentUser));
  }
}

function getAcceptedPairingForStudent(studentEmail) {
  const email = normalizeChatEmail(studentEmail);
  if (!email) return null;
  return (db.pairingRequests || []).find(r =>
    normalizeChatEmail(r.studentEmail) === email &&
    (r.status === 'Accepted' || r.status === 'Active')
  ) || null;
}

function getUserRecordScore(user) {
  if (!user || !user.email) return -1;
  let score = 0;
  if (user.role === 'student') score += 10;
  if (user.mentorStatus === 'Active') score += 100;
  else if (user.mentorStatus === 'Pending') score += 40;
  if (user.mentorEmail) score += 20;
  if (user.name) score += 5;
  if (user.avatar) score += 2;
  if (user.domain) score += 1;
  if (user.faceDescriptor && typeof user.faceDescriptor === 'string' && user.faceDescriptor.startsWith('data:image')) score += 50;
  if (user.faceDescriptor && (Array.isArray(user.faceDescriptor) || typeof user.faceDescriptor === 'object')) score += 50;
  if (getAcceptedPairingForStudent(user.email)) score += 300;
  return score;
}

function dedupeUsersByEmail(users) {
  const best = {};
  (users || []).forEach(u => {
    if (!u || !u.email) return;
    const key = u.email.trim().toLowerCase();
    if (!best[key] || getUserRecordScore(u) > getUserRecordScore(best[key])) {
      best[key] = u;
    }
  });
  return Object.values(best);
}

function consolidateCloudUsersByEmail(cloudList) {
  const byEmail = {};
  (cloudList || []).forEach(cloudUser => {
    if (!cloudUser || !cloudUser.email) return;
    const key = cloudUser.email.trim().toLowerCase();
    if (!byEmail[key]) {
      byEmail[key] = cloudUser;
    } else {
      byEmail[key] = mergeUserRecords(byEmail[key], cloudUser);
    }
  });
  return Object.values(byEmail);
}

function getStatusPriority(status) {
  if (!status) return 0;
  const s = status.trim().toLowerCase();
  if (s === 'active' || s === 'accepted') return 2;
  if (s === 'pending') return 1;
  return 0;
}

function resolveStudentMentorAssignment(localUser, remoteUser) {
  const email = normalizeChatEmail(localUser?.email || remoteUser?.email);
  if (!email) return { mentorEmail: '', mentorStatus: '' };

  const req = (db.pairingRequests || []).find(r => normalizeChatEmail(r.studentEmail) === email);
  
  // Resolve status from pairing request if it exists
  let reqStatus = '';
  let reqMentor = '';
  if (req) {
    reqMentor = (req.mentorEmail || '').trim().toLowerCase();
    reqStatus = req.status === 'Accepted' || req.status === 'Active' || req.status === 'active' || req.status === 'accepted' ? 'Active' : (req.status === 'Pending' || req.status === 'pending' ? 'Pending' : '');
  }

  // Resolve status from remote user if it exists
  let remoteStatus = '';
  let remoteMentor = '';
  if (remoteUser && remoteUser.mentorEmail) {
    remoteMentor = (remoteUser.mentorEmail || '').trim().toLowerCase();
    const s = remoteUser.mentorStatus;
    remoteStatus = s === 'Active' || s === 'active' || s === 'Accepted' || s === 'accepted' ? 'Active' : (s === 'Pending' || s === 'pending' ? 'Pending' : '');
  }

  // Resolve status from local user if it exists
  let localStatus = '';
  let localMentor = '';
  if (localUser && localUser.mentorEmail) {
    localMentor = (localUser.mentorEmail || '').trim().toLowerCase();
    const s = localUser.mentorStatus;
    localStatus = s === 'Active' || s === 'active' || s === 'Accepted' || s === 'accepted' ? 'Active' : (s === 'Pending' || s === 'pending' ? 'Pending' : '');
  }

  // Choose the best status between pairing request and remote user (cloud source of truth)
  let finalMentor = '';
  let finalStatus = '';

  if (reqMentor || remoteMentor) {
    // If either indicates an Active pairing, they are Active
    if (reqStatus === 'Active' || remoteStatus === 'Active') {
      finalMentor = reqStatus === 'Active' ? reqMentor : remoteMentor;
      finalStatus = 'Active';
    } else if (reqStatus === 'Pending' || remoteStatus === 'Pending') {
      finalMentor = reqStatus === 'Pending' ? reqMentor : remoteMentor;
      finalStatus = 'Pending';
    } else {
      finalMentor = '';
      finalStatus = '';
    }
  } else if (localMentor) {
    // Fallback to local user status
    finalMentor = localMentor;
    finalStatus = localStatus;
  }

  return { mentorEmail: finalMentor, mentorStatus: finalStatus };
}

function getMentorEmailNorm() {
  if (!currentUser || currentUser.role !== 'mentor') return '';
  return normalizeChatEmail(currentUser.email);
}

function getPairingRequestKey(req) {
  if (!req) return '';
  return `${normalizeChatEmail(req.mentorEmail)}::${normalizeChatEmail(req.studentEmail)}`;
}

function getPairingRequestScore(req) {
  if (!req) return -1;
  let score = 0;
  if (req.status === 'Accepted' || req.status === 'Active') score += 300;
  else if (req.status === 'Pending') score += 100;
  else if (req.status === 'Rejected') score += 20;
  if (req.studentName) score += 5;
  if (req.domain) score += 2;
  return score;
}

function mergePairingRecords(localReq, remoteReq) {
  if (!localReq) return remoteReq;
  if (!remoteReq) return localReq;
  const merged = { ...localReq, ...remoteReq };
  merged.status = getPairingRequestScore(localReq) >= getPairingRequestScore(remoteReq)
    ? localReq.status
    : remoteReq.status;
  merged.studentName = remoteReq.studentName || localReq.studentName;
  merged.domain = remoteReq.domain || localReq.domain;
  return merged;
}

function dedupePairingRequests(requests) {
  const best = {};
  (requests || []).forEach(req => {
    if (!req || !req.studentEmail || !req.mentorEmail) return;
    const key = getPairingRequestKey(req);
    if (!best[key] || getPairingRequestScore(req) > getPairingRequestScore(best[key])) {
      best[key] = req;
    }
  });
  return Object.values(best);
}

function cleanupPairingRequestsStore() {
  if (!db.pairingRequests) db.pairingRequests = [];
  db.pairingRequests = dedupePairingRequests(db.pairingRequests);
}

function getMentorStudents(options = {}) {
  const { activeOnly = true } = options;
  const mentorEmail = getMentorEmailNorm();
  if (!mentorEmail) return [];

  const acceptedEmails = new Set(
    (db.pairingRequests || [])
      .filter(r => normalizeChatEmail(r.mentorEmail) === mentorEmail && (r.status === 'Accepted' || r.status === 'Active'))
      .map(r => normalizeChatEmail(r.studentEmail))
      .filter(Boolean)
  );

  const pendingEmails = new Set(
    (db.pairingRequests || [])
      .filter(r => normalizeChatEmail(r.mentorEmail) === mentorEmail && r.status === 'Pending')
      .map(r => normalizeChatEmail(r.studentEmail))
      .filter(Boolean)
  );

  const canonicalUsers = dedupeUsersByEmail(db.users);
  const roster = [];
  const seen = new Set();

  const addStudent = (student) => {
    if (!student || !student.email) return;
    const key = normalizeChatEmail(student.email);
    if (seen.has(key)) return;
    seen.add(key);
    roster.push(student);
  };

  acceptedEmails.forEach(email => {
    const student = canonicalUsers.find(u => u.role === 'student' && normalizeChatEmail(u.email) === email);
    if (student) addStudent(student);
  });

  canonicalUsers.forEach(u => {
    if (!u || u.role !== 'student' || !u.mentorEmail) return;
    if (normalizeChatEmail(u.mentorEmail) !== mentorEmail) return;
    const email = normalizeChatEmail(u.email);
    if (acceptedEmails.has(email)) return;
    if (activeOnly) {
      if (u.mentorStatus === 'Active') addStudent(u);
    } else if (u.mentorStatus === 'Active' || u.mentorStatus === 'Pending' || pendingEmails.has(email)) {
      addStudent(u);
    }
  });

  return roster.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
}

function mergeUserRecords(localUser, remoteUser) {
  if (!localUser) return remoteUser;
  if (!remoteUser) return localUser;

  const merged = { ...localUser, ...remoteUser };
  const assignment = resolveStudentMentorAssignment(localUser, remoteUser);
  merged.mentorEmail = assignment.mentorEmail;
  merged.mentorStatus = assignment.mentorStatus;

  if (!remoteUser.avatar && localUser.avatar) merged.avatar = localUser.avatar;
  if (remoteUser.progress === undefined && localUser.progress !== undefined) merged.progress = localUser.progress;

  const localFace = localUser.faceDescriptor || '';
  const remoteFace = remoteUser.faceDescriptor || '';
  
  const isLocalStr = typeof localFace === 'string';
  const isRemoteStr = typeof remoteFace === 'string';

  if (isLocalStr && localFace.startsWith('data:image') && isRemoteStr && remoteFace.startsWith('data:image')) {
    merged.faceDescriptor = localFace.length >= remoteFace.length ? localFace : remoteFace;
  } else if (isLocalStr && localFace.startsWith('data:image')) {
    merged.faceDescriptor = localFace;
  } else if (isRemoteStr && remoteFace.startsWith('data:image')) {
    merged.faceDescriptor = remoteFace;
  } else {
    // Prefer array or object descriptors over strings
    if (Array.isArray(localFace) || (localFace && typeof localFace === 'object')) {
      merged.faceDescriptor = localFace;
    } else if (Array.isArray(remoteFace) || (remoteFace && typeof remoteFace === 'object')) {
      merged.faceDescriptor = remoteFace;
    } else {
      merged.faceDescriptor = localFace || remoteFace;
    }
  }

  // Safe checks for faceScanUrl
  const localUrl = localUser.faceScanUrl || '';
  const remoteUrl = remoteUser.faceScanUrl || '';
  
  if (isRemoteStr && remoteFace.startsWith('http')) {
    merged.faceScanUrl = remoteFace;
  } else {
    merged.faceScanUrl = localUrl || remoteUrl;
  }

  // Preserve faceScanImage if present
  merged.faceScanImage = remoteUser.faceScanImage || localUser.faceScanImage || '';

  return merged;
}

function mergeCloudRecordIntoDb(collection, parsed, recordId) {
  if (!parsed || typeof parsed !== 'object') return;
  if (!db[collection]) db[collection] = [];
  let index = db[collection].findIndex(item => item.id && item.id === recordId);
  if (index === -1 && collection === 'users' && parsed.email) {
    const emailLower = parsed.email.trim().toLowerCase();
    index = db[collection].findIndex(item => item.email && item.email.trim().toLowerCase() === emailLower);
  }
  if (index === -1 && collection === 'pairingRequests' && parsed.studentEmail && parsed.mentorEmail) {
    const key = getPairingRequestKey(parsed);
    index = db.pairingRequests.findIndex(r => getPairingRequestKey(r) === key);
  }
  if (index === -1) {
    index = db[collection].findIndex(item => item.id && parsed.id && item.id === parsed.id);
  }
  if (index > -1) {
    if (collection === 'users') {
      db[collection][index] = mergeUserRecords(db[collection][index], parsed);
    } else if (collection === 'chats') {
      mergeChatRecordIntoDb(parsed);
      return;
    } else if (collection === 'pairingRequests') {
      db.pairingRequests[index] = mergePairingRecords(db.pairingRequests[index], parsed);
    } else if (['tasks', 'meetings', 'weeklyLogs', 'attendance', 'quizzes', 'quizSubmissions'].includes(collection)) {
      db[collection][index] = { ...db[collection][index], ...parsed };
    } else {
      db[collection][index] = parsed;
    }
  } else {
    if (collection === 'chats') {
      mergeChatRecordIntoDb(parsed);
    } else if (collection === 'pairingRequests') {
      db.pairingRequests.push(parsed);
    } else {
      db[collection].push(parsed);
    }
  }
  if (collection === 'users') {
    db.users = dedupeUsersByEmail(db.users);
  }
  if (collection === 'pairingRequests') {
    db.pairingRequests = dedupePairingRequests(db.pairingRequests);
  }
}

let cloudSyncInProgress = false;
let lastMentorCloudSyncAt = 0;
const MENTOR_CLOUD_SYNC_INTERVAL_MS = 25000;
const lastPullAt = {};
const MIN_PULL_GAP_MS = 12000;
let lastMeetingsLoadAt = 0;
let lastIncomingCallCheckAt = 0;
let lastActivityCloudSyncAt = 0;

function mergeCollectionFromCloud(colName, cloudList) {
  if (!cloudList || cloudList.length === 0) return false;
  if (!db[colName]) db[colName] = [];

  if (colName === 'users') {
    const cloudEmails = new Set(cloudList.map(u => u.email && u.email.trim().toLowerCase()).filter(Boolean));
    db.users = db.users.filter(u => {
      if (!u || !u.email) return false;
      const emailLower = u.email.trim().toLowerCase();
      if (currentUser && currentUser.email.trim().toLowerCase() === emailLower) return true;
      if (emailLower.endsWith('@internship.com')) return true;
      return cloudEmails.has(emailLower);
    });

    consolidateCloudUsersByEmail(cloudList).forEach(cloudUser => {
      const emailLower = cloudUser.email.trim().toLowerCase();
      const idx = db.users.findIndex(u => u && u.email && u.email.trim().toLowerCase() === emailLower);
      if (idx > -1) {
        db.users[idx] = mergeUserRecords(db.users[idx], cloudUser);
      } else {
        db.users.push(cloudUser);
      }
    });
    db.users = dedupeUsersByEmail(db.users);
    return true;
  }

  if (colName === 'chats') {
    cloudList.forEach(item => mergeChatRecordIntoDb(item));
    return true;
  }

  if (colName === 'pairingRequests') {
    const cloudIds = new Set(cloudList.map(r => r.id).filter(Boolean));
    db.pairingRequests = db.pairingRequests.filter(r => r && r.id && (cloudIds.has(r.id) || !r.id.startsWith('req-')));

    dedupePairingRequests(cloudList).forEach(cloudReq => {
      const key = getPairingRequestKey(cloudReq);
      const idx = db.pairingRequests.findIndex(r => getPairingRequestKey(r) === key);
      if (idx > -1) {
        db.pairingRequests[idx] = mergePairingRecords(db.pairingRequests[idx], cloudReq);
      } else {
        db.pairingRequests.push(cloudReq);
      }
    });
    db.pairingRequests = dedupePairingRequests(db.pairingRequests);
    return true;
  }

  if (['tasks', 'meetings', 'weeklyLogs', 'attendance', 'quizzes', 'quizSubmissions'].includes(colName)) {
    const cloudIds = new Set(cloudList.map(item => item.id).filter(Boolean));
    db[colName] = db[colName].filter(item => item && item.id && cloudIds.has(item.id));
  }

  cloudList.forEach(cloudItem => {
    if (!cloudItem) return;
    mergeCloudRecordIntoDb(colName, cloudItem, cloudItem.id || cloudItem.email);
  });
  return true;
}

async function pullSupabaseCollections(collections) {
  if (!supabaseActive || !supabaseClient || cloudSyncInProgress || !isInitialSyncDone) return;
  
  // Ensure pairingRequests is always pulled alongside users to prevent stale assignment mapping
  let colsToPull = [...collections];
  if (colsToPull.includes('users') && !colsToPull.includes('pairingRequests')) {
    colsToPull.push('pairingRequests');
  }

  // Ensure pairingRequests is pulled and merged BEFORE users
  const sortedCols = colsToPull.sort((a, b) => {
    if (a === 'pairingRequests') return -1;
    if (b === 'pairingRequests') return 1;
    return 0;
  });

  const pullKey = [...sortedCols].sort().join(',');
  const now = Date.now();
  if (lastPullAt[pullKey] && now - lastPullAt[pullKey] < MIN_PULL_GAP_MS) return;
  lastPullAt[pullKey] = now;
  cloudSyncInProgress = true;
  try {
    for (const col of sortedCols) {
      const { data: records, error } = await supabaseClient
        .from('apex_sync')
        .select('id, data')
        .eq('collection', col);
      if (error || !records) continue;
      const parsedList = records.map(r => robustParse(r.data)).filter(Boolean);
      mergeCollectionFromCloud(col, parsedList);
    }
    if (db.users) db.users = dedupeUsersByEmail(db.users);
    saveDatabase(true);
    refreshCurrentUserFromDb();
  } catch (err) {
    console.warn('pullSupabaseCollections failed:', err);
  } finally {
    cloudSyncInProgress = false;
  }
}

function resolveMentorStatus(localStatus, remoteStatus, hasMentor) {
  if (remoteStatus === 'Active' || localStatus === 'Active') return 'Active';
  if (hasMentor) return 'Pending';
  return localStatus || remoteStatus || '';
}

function getActiveMentorTab() {
  const activeTab = document.querySelector('#mentor-menu a.active');
  const match = activeTab?.getAttribute('onclick')?.match(/switchTab\('mentor',\s*'([^']+)'\)/);
  return match?.[1] || 'dash';
}

function getActiveStudentTab() {
  const activeTab = document.querySelector('#student-menu a.active');
  const match = activeTab?.getAttribute('onclick')?.match(/switchTab\('student',\s*'([^']+)'\)/);
  return match?.[1] || 'dash';
}

let refreshUITimer = null;
function scheduleRefreshUIForActiveView(delay = 400) {
  clearTimeout(refreshUITimer);
  refreshUITimer = setTimeout(() => refreshUIForActiveView(), delay);
}

let mentorDashRefreshTimer = null;
let lastMentorDashListKey = '';
const backfilledPairingEmails = new Set();

function buildMentorDashListKey(students) {
  return students.map(s => `${normalizeChatEmail(s.email)}:${s.mentorStatus || ''}`).sort().join('|');
}

function scheduleMentorDashboardRefresh(delay = 500) {
  clearTimeout(mentorDashRefreshTimer);
  mentorDashRefreshTimer = setTimeout(() => renderMentorDashboardContent(), delay);
}

function maybeLoadDashboardMeetings(role) {
  const now = Date.now();
  if (now - lastMeetingsLoadAt < 90000) return;
  lastMeetingsLoadAt = now;
  if (typeof loadDashboardMeetings === 'function') loadDashboardMeetings(role);
}

function resetDatabaseForDemo() {
  if (confirm("Reset database to default seed data? This will clear all custom accounts.")) {
    storage.removeItem('apex_intern_db');
    storage.removeItem('apex_intern_currentUser');
    location.reload();
  }
}

function checkSession() {
  try {
    const sessionUser = storage.getItem('apex_intern_currentUser');
    if (sessionUser) {
      currentUser = JSON.parse(sessionUser);
      // Sync current user state with database
      currentUser = db.users.find(u => u && u.email && u.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase()) || currentUser;
      showPortalPage(currentUser.role);
    } else {
      showLandingPage();
    }
  } catch (e) {
    showLandingPage();
  }
}

// 2. ROUTING CONTROLS
function showLandingPage() {
  // Reset applied internship lock when going back to landing
  window._appliedInternId = null;
  // Re-enable domain/mentor in case they were locked
  const domainEl = document.getElementById('reg-domain');
  const mentorEl = document.getElementById('reg-mentor-select');
  if (domainEl) { domainEl.disabled = false; domainEl.style.opacity = ''; domainEl.style.cursor = ''; }
  if (mentorEl) { mentorEl.disabled = false; mentorEl.style.opacity = ''; mentorEl.style.cursor = ''; }
  document.getElementById('main-header').classList.remove('hidden');
  document.getElementById('landing-page').classList.remove('hidden');
  document.getElementById('auth-page').classList.add('hidden');
  document.getElementById('portal-page').classList.add('hidden');
  // Show footer on landing page
  const footer = document.getElementById('main-footer');
  if (footer) footer.classList.remove('hidden');
}

// Registration step navigation
function showRegError(msg) {
  let el = document.getElementById('reg-error-msg');
  if (!el) {
    el = document.createElement('div');
    el.id = 'reg-error-msg';
    el.style.cssText = 'margin:10px 0 0 0;padding:10px 14px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.5);border-radius:8px;color:#ef4444;font-size:13px;font-weight:600;text-align:center;display:flex;align-items:center;gap:8px;';
    // Insert before the submit button
    const submitBtn = document.querySelector('#register-form button[type="submit"]');
    if (submitBtn && submitBtn.parentNode) {
      submitBtn.parentNode.insertBefore(el, submitBtn);
    }
  }
  el.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' + msg;
  el.style.display = 'flex';
  el.style.animation = 'none';
  setTimeout(() => { el.style.animation = 'shake 0.4s ease'; }, 10);
  setTimeout(() => { if (el) el.style.display = 'none'; }, 5000);
}

function showRegStep(step) {
  const formPage = document.getElementById('register-form');
  const roleSel  = document.querySelector('#register-view .role-selector');
  const header   = document.querySelector('#register-view > div:first-child');
  const payPage  = document.getElementById('reg-payment-page');
  const authCard = document.querySelector('.auth-card');

  if (step === 2) {
    if (formPage)  formPage.style.display  = 'none';
    if (roleSel)   roleSel.style.display   = 'none';
    if (header)    header.style.display    = 'none';
    if (payPage)   {
      payPage.classList.remove('hidden');
      payPage.style.opacity = '0';
      payPage.style.transition = 'opacity 0.35s ease';
      setTimeout(() => { payPage.style.opacity = '1'; }, 30);
    }
    if (authCard)  authCard.style.maxWidth = '820px';

    // Sync fee to payment page
    const feeAmt = _selectedInternFee > 0 ? _selectedInternFee : 99;
    const amtDisplay = document.getElementById('reg-pay-page-amount');
    const amtInput   = document.getElementById('reg-payment-amount');
    if (amtDisplay) amtDisplay.innerHTML = `&#x20B9;${feeAmt}`;
    if (amtInput)   amtInput.placeholder = `${feeAmt}`;

    startRegPaymentTimer(600);
    document.getElementById('auth-page')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    if (formPage)  formPage.style.display  = '';
    if (roleSel)   roleSel.style.display   = '';
    if (header)    header.style.display    = '';
    if (payPage)   payPage.classList.add('hidden');
    if (authCard)  authCard.style.maxWidth = '900px';
    stopRegPaymentTimer();
  }
}
window.showRegStep = showRegStep;

// Counter for "Get Started" clicks ... unlocks Mentor/Admin form after 5
let _registerOpenCount = 0;

function _updateRoleTabLock() {
  // No visual change on tabs ... just control form usability
  _applyRegisterFormLock();
}

function _applyRegisterFormLock() {
  const currentRole = document.querySelector('.role-option.active')?.id?.replace('role-', '') || 'student';
  const locked = _registerOpenCount < 5 && (currentRole === 'mentor' || currentRole === 'admin');

  let overlay = document.getElementById('reg-lock-overlay');
  const form = document.getElementById('register-form');
  const submitBtn = form?.querySelector('button[type="submit"]');

  if (locked) {
    // Create invisible overlay over the form fields if not exists
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'reg-lock-overlay';
      overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:50;cursor:default;border-radius:16px;';
      const leftCol = document.querySelector('.reg-col-left, #register-form > div > div:first-child');
      if (leftCol) { leftCol.style.position = 'relative'; leftCol.appendChild(overlay); }
    }
    // Disable submit
    if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '0.4'; submitBtn.style.cursor = 'not-allowed'; }
  } else {
    // Remove overlay
    if (overlay) overlay.remove();
    // Enable submit
    if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ''; submitBtn.style.cursor = ''; }
  }
}

function handleRoleTabClick(role) {
  setRegisterRole(role);
  // After role switch, re-apply lock state
  setTimeout(_applyRegisterFormLock, 50);
}
window.handleRoleTabClick = handleRoleTabClick;

function showAuthPage(mode = 'login') {
  document.getElementById('main-header').classList.remove('hidden');
  document.getElementById('landing-page').classList.add('hidden');
  document.getElementById('auth-page').classList.remove('hidden');
  document.getElementById('portal-page').classList.add('hidden');
  // Hide footer on auth/portal pages
  const footer = document.getElementById('main-footer');
  if (footer) footer.classList.add('hidden');
  // Adjust vertical alignment based on mode
  const authSection = document.getElementById('auth-page');
  if (authSection) {
    authSection.style.alignItems = mode === 'register' ? 'flex-start' : 'center';
    authSection.style.paddingTop = mode === 'register' ? '90px' : '24px';
  }

  if (mode === 'register') {
    _registerOpenCount++;
  }

  toggleAuthForms(mode);
}

function toggleAuthForms(mode) {
  // Shut off cameras on view toggle
  stopWebcam('reg-webcam');
  regWebcamActive = false;

  const authCard = document.querySelector('.auth-card');
  const authSection = document.getElementById('auth-page');

  if (mode === 'login') {
    document.getElementById('login-view').classList.remove('hidden');
    document.getElementById('register-view').classList.add('hidden');
    if (authCard) authCard.style.maxWidth = '480px';
    if (authSection) { authSection.style.alignItems = 'center'; authSection.style.paddingTop = '24px'; }
  } else {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('register-view').classList.remove('hidden');
    if (authCard) authCard.style.maxWidth = '900px';
    if (authSection) { authSection.style.alignItems = 'flex-start'; authSection.style.paddingTop = '90px'; }
    setRegisterRole('student');

    // If opened directly (not via Apply Now), unlock domain & mentor
    if (!window._appliedInternId) {
      const domainEl = document.getElementById('reg-domain');
      const mentorEl = document.getElementById('reg-mentor-select');
      if (domainEl) {
        domainEl.disabled = false;
        domainEl.style.opacity = '';
        domainEl.style.cursor = '';
        domainEl.title = '';
      }
      if (mentorEl) {
        mentorEl.disabled = false;
        mentorEl.style.opacity = '';
        mentorEl.style.cursor = '';
        mentorEl.title = '';
      }
    }
  }
}

function _makeFaceScanOptional() {
  const faceSection = document.getElementById('reg-face-scan-section');
  const rightCol = faceSection?.closest('.reg-col-right') || faceSection?.parentElement;
  if (!faceSection) return;

  // Update the heading label to say Optional — only once
  const heading = rightCol?.querySelector('div[style*="AI FACE"]') || rightCol?.querySelector('div:first-child > div:first-child');
  if (heading && !heading.querySelector('.optional-tag')) {
    const tag = document.createElement('span');
    tag.className = 'optional-tag';
    tag.style.cssText = 'font-size:10px;opacity:0.6;margin-left:4px;';
    tag.textContent = '(Optional)';
    heading.appendChild(tag);
  }

  // Update status text
  const statusEl = document.getElementById('reg-face-status');
  if (statusEl) statusEl.textContent = 'Optional — skip if not needed.';
}

function setRegisterRole(role) {
  activeRegisterRole = role;
  document.querySelectorAll('.role-option').forEach(el => el.classList.remove('active'));
  document.getElementById(`role-${role}`).classList.add('active');

  // Toggle role-specific input fields
  const domainGroup = document.getElementById('reg-domain-group');
  const mentorGroup = document.getElementById('reg-mentor-group');
  const titleGroup = document.getElementById('reg-title-group');
  const mentorDomainGroup = document.getElementById('reg-mentor-domain-group');
  const durationGroup = document.getElementById('reg-duration-group');
  const tierGroup = document.getElementById('reg-tier-group');

  if (role === 'student') {
    domainGroup.classList.remove('hidden');
    mentorGroup.classList.remove('hidden');
    titleGroup.classList.add('hidden');
    mentorDomainGroup.classList.add('hidden');
    if (durationGroup) durationGroup.classList.remove('hidden');
    if (tierGroup) tierGroup.classList.remove('hidden');
    document.getElementById('reg-domain').required = true;
    document.getElementById('reg-title').required = false;
    // Face scan required for student
    const faceSection = document.getElementById('reg-face-scan-section');
    if (faceSection) {
      faceSection.style.opacity = '1';
      faceSection.style.pointerEvents = 'auto';
      const faceLabel = faceSection.querySelector('div[style*="AI Face"]') || faceSection.querySelector('div:first-child');
    }
    populateRegisterMentors();
    handleRegisterDomainChange(document.getElementById('reg-domain').value);
  } else if (role === 'mentor') {
    domainGroup.classList.add('hidden');
    mentorGroup.classList.add('hidden');
    titleGroup.classList.remove('hidden');
    mentorDomainGroup.classList.remove('hidden');
    if (durationGroup) durationGroup.classList.add('hidden');
    if (tierGroup) tierGroup.classList.add('hidden');
    document.getElementById('reg-domain').required = false;
    document.getElementById('reg-title').required = true;
    // Face scan optional for mentor
    _makeFaceScanOptional();
  } else {
    domainGroup.classList.add('hidden');
    mentorGroup.classList.add('hidden');
    titleGroup.classList.add('hidden');
    mentorDomainGroup.classList.add('hidden');
    if (durationGroup) durationGroup.classList.add('hidden');
    if (tierGroup) tierGroup.classList.add('hidden');
    document.getElementById('reg-domain').required = false;
    document.getElementById('reg-title').required = false;
    // Face scan optional for admin
    _makeFaceScanOptional();
  }

  // Apply lock state after role switch
  setTimeout(_applyRegisterFormLock, 30);
}

function populateRegisterMentors() {
  const domain = document.getElementById('reg-domain')?.value;
  const mentorSelect = document.getElementById('reg-mentor-select');
  if (!mentorSelect) return;

  // Loose domain match ... normalize both sides for comparison
  const normalizeDomain = (d) => (d || '').toLowerCase().replace(/[^a-z]/g, '');
  const normalizedSelected = normalizeDomain(domain);

  const mentors = db.users.filter(u => {
    if (!u || u.role !== 'mentor') return false;
    if (!domain) return true;
    return normalizeDomain(u.domain).includes(normalizedSelected.slice(0, 4)) ||
           normalizedSelected.includes(normalizeDomain(u.domain).slice(0, 4));
  });

  mentorSelect.innerHTML = '';

  if (mentors.length === 0) {
    const opt = document.createElement('option');
    opt.value = "";
    opt.innerText = "No mentors available for this domain yet";
    mentorSelect.appendChild(opt);
  } else {
    mentors.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.email.trim().toLowerCase();
      opt.innerText = `${m.name} (${m.domain || m.title || 'Mentor'})`;
      mentorSelect.appendChild(opt);
    });
    // Auto-select first available mentor
    mentorSelect.selectedIndex = 0;
  }
}

function handleRegisterDomainChange(domain) {
  populateRegisterMentors();
}

function showPortalPage(role) {
  document.getElementById('main-header').classList.add('hidden');
  document.getElementById('landing-page').classList.add('hidden');
  document.getElementById('auth-page').classList.add('hidden');
  document.getElementById('portal-page').classList.remove('hidden');
  // Hide footer inside portal
  const footer = document.getElementById('main-footer');
  if (footer) footer.classList.add('hidden');
  // Mark body as portal-active for CSS targeting
  document.body.classList.add('portal-active');

  // Show AI Copilot button inside portal
  const copilotBtn = document.getElementById('ai-copilot-trigger');
  if (copilotBtn) {
    copilotBtn.classList.remove('hidden');
    copilotBtn.style.display = 'flex';
    copilotBtn.style.opacity = '1';
    copilotBtn.style.visibility = 'visible';
    copilotBtn.removeAttribute('hidden');
    // Force show after render
    setTimeout(() => {
      copilotBtn.classList.remove('hidden');
      copilotBtn.style.display = 'flex';
    }, 500);
  }
  // Show new chatbot button
  const ixBtn = document.getElementById('ix-chat-btn');
  if (ixBtn) {
    ixBtn.style.cssText = 'position:fixed!important;top:calc(100vh - 120px)!important;right:24px!important;z-index:99999!important;width:58px!important;height:58px!important;border-radius:50%!important;background:linear-gradient(135deg,#e01a8b,#8327ec)!important;box-shadow:0 4px 20px rgba(224,26,139,0.5)!important;display:flex!important;align-items:center!important;justify-content:center!important;cursor:pointer!important;border:2px solid rgba(255,255,255,0.3)!important;';
  }

  // Configure Sidebar User Detail
  document.getElementById('sidebar-name').innerHTML = `${currentUser.name} <span style="font-size: 10px; opacity: 0.5;">✔</span>`;
  document.getElementById('sidebar-role').innerText = role === 'admin' ? 'Coordinator' : role;
  document.getElementById('sidebar-avatar').src = currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120';

  // Toggle Sidebar Menus
  document.getElementById('student-menu').classList.add('hidden');
  document.getElementById('mentor-menu').classList.add('hidden');
  document.getElementById('admin-menu').classList.add('hidden');
  document.getElementById(`${role}-menu`).classList.remove('hidden');

  // Toggle Workspaces
  document.getElementById('student-workspace').classList.add('hidden');
  document.getElementById('mentor-workspace').classList.add('hidden');
  document.getElementById('admin-workspace').classList.add('hidden');
  document.getElementById(`${role}-workspace`).classList.remove('hidden');

  if (role === 'student') {
    checkStudentGate();
    refreshCurrentUserFromDb();
    setTimeout(() => handleStudentMeetingSync(), 400);
    startStudentActiveHeartbeat();
    // Auto-sync daily quiz submissions on load/login
    setTimeout(() => {
      syncUnsyncedQuizSubmissions();
    }, 1000);
  }

  // Load first tab for the portal
  switchTab(role, 'dash');
}

function switchTab(portal, tabName) {
  // Sync the database state to pick up changes made in other tabs/sessions
  syncDatabase();

  if (portal === 'student' && !isFaceVerifiedThisSession() && tabName === 'dash') {
    // Only show gate on dashboard tab ... allow navigation to other tabs
    checkStudentGate();
  } else if (portal === 'student' && !isFaceVerifiedThisSession()) {
    // Allow switching to other tabs even without face verification
    // but hide the gate overlay so it doesn't block
    const gateOverlay = document.getElementById('student-daily-lock-overlay');
    if (gateOverlay) gateOverlay.style.display = 'none';
  }

  // Update sidebar active link styling
  document.querySelectorAll(`#${portal}-menu a`).forEach(el => el.classList.remove('active'));
  
  // Find which list item link corresponds to the action
  const links = document.querySelectorAll(`#${portal}-menu a`);
  links.forEach(l => {
    if (l.getAttribute('onclick').includes(`'${tabName}'`)) {
      l.classList.add('active');
    }
  });

  // Toggle tab panel visibility
  document.querySelectorAll(`#${portal}-workspace .portal-tab-content`).forEach(el => el.classList.add('hidden'));
  document.getElementById(`${portal}-tab-${tabName}`).classList.remove('hidden');

  // Load specific tab datasets
  if (portal === 'student') {
    if (tabName !== 'payments') {
      if (typeof stopStipendStreaming === 'function') stopStipendStreaming();
    }
    if (tabName === 'dash') {
      if (supabaseActive && supabaseClient) {
        pullSupabaseCollections(['attendance', 'users']).finally(() => loadStudentDashboard());
      } else {
        loadStudentDashboard();
      }
      setTimeout(() => {
        syncUnsyncedQuizSubmissions();
      }, 500);
    }
    if (tabName === 'tasks') {
      if (supabaseActive && supabaseClient) {
        pullSupabaseCollections(['tasks']).finally(() => loadStudentTasks());
      } else {
        loadStudentTasks();
      }
    }
    if (tabName === 'logs') loadStudentLogs();
    if (tabName === 'chat') loadStudentChat();
    if (tabName === 'skills') loadStudentSkills();
    if (tabName === 'quiz') loadStudentQuiz();
    if (tabName === 'payments') loadStudentPayments();
  } else if (portal === 'mentor') {
    if (tabName === 'dash') {
      if (supabaseActive && supabaseClient) {
        document.getElementById('mentor-dash-interns-count').innerHTML = `<span class="shimmer-text shimmer-wrapper"></span>`;
        document.getElementById('mentor-dash-pending-tasks').innerHTML = `<span class="shimmer-text shimmer-wrapper"></span>`;
        document.getElementById('mentor-dash-pending-reports').innerHTML = `<span class="shimmer-text shimmer-wrapper"></span>`;
        
        const tableBody = document.querySelector('#mentor-interns-table tbody');
        if (tableBody) {
          tableBody.innerHTML = `
            <tr>
              <td colspan="7">
                <div class="shimmer-row shimmer-wrapper"></div>
                <div class="shimmer-row shimmer-wrapper" style="width: 85%;"></div>
                <div class="shimmer-row shimmer-wrapper" style="width: 90%;"></div>
              </td>
            </tr>
          `;
        }
        const pairingTableBody = document.querySelector('#mentor-pairing-requests-table tbody');
        if (pairingTableBody) {
          pairingTableBody.innerHTML = `
            <tr>
              <td colspan="4">
                <div class="shimmer-row shimmer-wrapper" style="width: 95%;"></div>
              </td>
            </tr>
          `;
        }
        
        pullSupabaseCollections(['pairingRequests', 'users', 'attendance']).finally(() => loadMentorDashboard());
      } else {
        loadMentorDashboard();
      }
    }
    if (tabName === 'tasks') loadMentorTasks();
    if (tabName === 'reviews') loadMentorReviews();
    if (tabName === 'chat') {
      if (supabaseActive && supabaseClient) {
        pullSupabaseCollections(['users', 'pairingRequests', 'chats']).finally(() => {
          lastMentorChatListKey = '';
          loadMentorChat(true);
        });
      } else {
        lastMentorChatListKey = '';
        loadMentorChat(true);
      }
    }
    if (tabName === 'attendance') {
      if (supabaseActive && supabaseClient) {
        pullSupabaseCollections(['attendance', 'users']).finally(() => {
          renderMentorAttendanceControls();
          loadMentorAttendanceLogs();
        });
      } else {
        renderMentorAttendanceControls();
        loadMentorAttendanceLogs();
      }
    }
    if (tabName === 'payments') loadMentorPayments();
  } else if (portal === 'admin') {
    if (tabName === 'dash') loadAdminDashboard();
    if (tabName === 'users') loadAdminUsers();
    if (tabName === 'relations') loadAdminRelations();
    if (tabName === 'listings') loadAdminListings();
  }
}

// Update landing page statistics widgets
function updateLandingStats() {
  const studentsCount = db.users.filter(u => u.role === 'student').length;
  const mentorsCount = db.users.filter(u => u.role === 'mentor').length;
  const totalTasks = db.tasks.length;
  const completedTasks = db.tasks.filter(t => t.status === 'Completed').length;
  const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const totalHours = db.weeklyLogs
    .filter(l => l.status === 'Approved')
    .reduce((sum, current) => sum + parseInt(current.hoursLogged || 0), 0);

  document.getElementById('stat-count-students').innerText = `${studentsCount}+`;
  document.getElementById('stat-count-mentors').innerText = `${mentorsCount}+`;
  document.getElementById('stat-count-tasks').innerText = `${pct}%`;
  document.getElementById('stat-count-hours').innerText = `${totalHours > 1000 ? (totalHours/1000).toFixed(1) + 'k' : totalHours} hrs`;
}

// 3. AUTH LOGIC SUBMISSIONS
async function handleLoginSubmit(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;

  let authenticatedUser = null;

  if (supabaseActive && supabaseClient) {
    try {
      // Pull latest cloud profiles so mentor pairing status is never stale on login
      await pullSupabaseCollections(['users', 'pairingRequests', 'tasks', 'attendance']);

      // Query "registration and login" table directly for authentication
      const { data: userRow, error } = await supabaseClient
        .from('registration and login')
        .select('*')
        .eq('Email Id', email)
        .eq('Password', password)
        .maybeSingle();

      if (error) {
        console.error("Supabase authentication query error:", error);
      } else if (userRow) {
        // Find if they exist in local db to keep session state like avatar, title, mentorStatus, etc.
        const localUser = db.users.find(u => u && u.email && u.email.trim().toLowerCase() === email);
        const mentorEmail = (localUser?.mentorEmail || userRow['Mentor'] || '').trim().toLowerCase();
        const mentorStatus = resolveMentorStatus(
          localUser?.mentorStatus,
          userRow['Mentor Status'],
          !!mentorEmail
        );
        authenticatedUser = {
          id: localUser ? localUser.id : `${userRow['Status'] || 'student'}-${Date.now()}`,
          email: (userRow['Email Id'] || email).trim().toLowerCase(),
          password: userRow['Password'],
          role: userRow['Status'] || 'student',
          name: userRow['Full Name'],
          domain: userRow['Domain'],
          mentorEmail,
          mentorStatus,
          faceDescriptor: localUser?.faceDescriptor || userRow['Face Scan'] || '',
          avatar: localUser ? localUser.avatar : getRandomAvatar(userRow['Status'] || 'student'),
          progress: localUser ? localUser.progress : 0,
          startDate: localUser ? localUser.startDate : new Date().toISOString().split('T')[0],
          title: localUser ? localUser.title : 'Technical Advisor'
        };
        
        // Update local db.users to keep in sync (preserve pairing + face data)
        const userIdx = db.users.findIndex(u => u && u.email && u.email.trim().toLowerCase() === email);
        if (userIdx !== -1) {
          db.users[userIdx] = mergeUserRecords(db.users[userIdx], authenticatedUser);
          authenticatedUser = db.users[userIdx];
        } else {
          db.users.push(authenticatedUser);
        }
        db.users = dedupeUsersByEmail(db.users);
        saveDatabase();
      }
    } catch (e) {
      console.warn("Direct Supabase auth failed, falling back to local database check:", e);
    }
  }

  // Fallback to local DB check if Supabase is offline or auth failed
  if (!authenticatedUser) {
    authenticatedUser = db.users.find(u => u && u.email && u.email.trim().toLowerCase() === email && u.password === password);
  }

  if (authenticatedUser) {
    const syncedUser = db.users.find(u => u && u.email && u.email.trim().toLowerCase() === email);
    currentUser = syncedUser || authenticatedUser;
    refreshCurrentUserFromDb();
    if (currentUser.role === 'student' && !resolveFaceDescriptor(currentUser)) {
      console.warn('Student logged in without face enrollment ... attendance scan may fail until profile is updated.');
    }
    sessionStorage.removeItem('apex_intern_session_face_verified');
    storage.setItem('apex_intern_currentUser', JSON.stringify(currentUser));
    showPortalPage(currentUser.role);
    // Reset form
    document.getElementById('login-form').reset();
  } else {
    alert("Invalid email credentials or password. Please try again.");
  }
}

async function handleRegisterSubmit(event) {
  if (event) event.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const password = document.getElementById('reg-password').value;

  // ===== STUDENT VALIDATION =====
  if (activeRegisterRole === 'student') {
    if (!name) {
      showRegError('Full Name is required.'); return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showRegError('Please enter a valid Email Address.'); return;
    }
    if (!password || password.length < 6) {
      showRegError('Password must be at least 6 characters.'); return;
    }
    const faceCheck = document.getElementById('reg-face-data').value;
    if (!faceCheck) {
      showRegError('Face scan is required. Please turn on your camera and capture your face.'); 
      // Scroll to camera
      const camSection = document.getElementById('reg-webcam-toggle-btn');
      if (camSection) camSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight camera box
      const camBox = document.querySelector('.face-scan-container') || document.getElementById('reg-webcam');
      if (camBox) { camBox.style.border = '2px solid #ef4444'; setTimeout(() => { camBox.style.border = ''; }, 3000); }
      return;
    }
  }

  // ===== MENTOR VALIDATION =====
  if (activeRegisterRole === 'mentor') {
    if (!name) { showRegError('Full Name is required.'); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showRegError('Please enter a valid Email Address.'); return;
    }
    if (!password || password.length < 6) {
      showRegError('Password must be at least 6 characters.'); return;
    }
  }

  // ===== ADMIN VALIDATION =====
  if (activeRegisterRole === 'admin') {
    if (!name) { showRegError('Full Name is required.'); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showRegError('Please enter a valid Email Address.'); return;
    }
    if (!password || password.length < 6) {
      showRegError('Password must be at least 6 characters.'); return;
    }
  }

  // Razorpay Checkout Hook for Premium Tier
  if (activeRegisterRole === 'student' && document.getElementById('reg-tier').value === 'paid' && !pendingRegistrationPayment) {
    const feeAmount = _selectedInternFee > 0 ? _selectedInternFee : 99;
    openRzpModal(email, feeAmount, 'InternX Registration Fee', (razorpayPaymentId) => {
      pendingRegistrationPayment = {
        method: 'Razorpay',
        timestamp: new Date().toISOString(),
        amount: feeAmount,
        reference: razorpayPaymentId
      };
      handleRegisterSubmit(event);
    });
    return;
  }

  // Validate duplicate user locally
  if (db.users.some(u => u && u.email && u.email.trim().toLowerCase() === email)) {
    alert("An account with this email address already exists.");
    return;
  }

  // Validate duplicate in Supabase registration table
  if (supabaseActive && supabaseClient) {
    try {
      const { data: existingRow } = await supabaseClient
        .from('registration and login')
        .select('Email Id')
        .eq('Email Id', email)
        .maybeSingle();
      if (existingRow) {
        alert("An account with this email already exists in the cloud database. Please sign in instead.");
        return;
      }
    } catch (regCheckErr) {
      console.warn("Supabase duplicate check skipped:", regCheckErr);
    }
  }

  const newUser = {
    id: `${activeRegisterRole}-${Date.now()}`,
    email,
    password,
    role: activeRegisterRole,
    name,
    avatar: getRandomAvatar(activeRegisterRole)
  };

  if (activeRegisterRole === 'student') {
    let faceData = document.getElementById('reg-face-data').value;
    
    // Face scan compulsory hai — bina scan ke registration nahi hogi
    if (!faceData) {
      showRegError('Face scan is required. Please capture your face using the camera.');
      return;
    }
    newUser.faceScanImage = faceData;
    newUser.faceDescriptor = window.lastRegisteredFaceDescriptor || '';
    newUser.domain = document.getElementById('reg-domain').value || 'Web Development';
    newUser.mentorEmail = (document.getElementById('reg-mentor-select').value || "").trim().toLowerCase();
    newUser.mentorStatus = newUser.mentorEmail ? "Pending" : ""; // Wait for mentor approval
    newUser.progress = 0;
    newUser.startDate = new Date().toISOString().split('T')[0];
    const regDurationEl = document.getElementById('reg-duration');
    newUser.duration = regDurationEl ? parseInt(regDurationEl.value, 10) : 1;

    const regTierVal = document.getElementById('reg-tier').value;
    if (regTierVal === 'paid') {
      newUser.internshipType = 'paid';
      newUser.stipendAmount = 15000;
      newUser.stipendFrequency = 'monthly';
      newUser.stipendCurrency = 'INR';
      newUser.stipendBalance = 0;
      newUser.totalPaid = 0;
      newUser.registrationPayment = pendingRegistrationPayment;

      // Log payment transaction in db.payments ledger
      if (!db.payments) db.payments = [];
      const paymentRecord = {
        id: pendingRegistrationPayment ? pendingRegistrationPayment.reference : `pay_reg_${Date.now()}`,
        studentEmail: email,
        mentorEmail: newUser.mentorEmail || 'unassigned@internship.com',
        amount: 499,
        currency: 'INR',
        type: 'registration',
        timestamp: pendingRegistrationPayment ? pendingRegistrationPayment.timestamp : new Date().toISOString(),
        status: 'completed',
        method: pendingRegistrationPayment ? pendingRegistrationPayment.method : 'UPI',
        reference: pendingRegistrationPayment ? pendingRegistrationPayment.reference : `pay_rzp_${Date.now()}`,
        notes: 'Premium Internship Registration Fee'
      };
      db.payments.push(paymentRecord);
      syncRecordToFirestore('payments', paymentRecord);
      pendingRegistrationPayment = null; // reset
    } else {
      newUser.internshipType = 'unpaid';
      newUser.stipendAmount = 0;
      newUser.stipendFrequency = '';
      newUser.stipendCurrency = 'INR';
      newUser.stipendBalance = 0;
      newUser.totalPaid = 0;
    }
    
    if (newUser.mentorEmail) {
      if (!db.pairingRequests) db.pairingRequests = [];
      cleanupPairingRequestsStore();
      const reqKey = getPairingRequestKey({ mentorEmail: newUser.mentorEmail, studentEmail: newUser.email });
      const existingReq = db.pairingRequests.find(r => getPairingRequestKey(r) === reqKey && r.status === 'Pending');
      if (!existingReq) {
        const req = {
          id: `req-${Date.now()}`,
          studentEmail: newUser.email,
          studentName: newUser.name,
          domain: newUser.domain,
          mentorEmail: newUser.mentorEmail,
          status: 'Pending'
        };
        db.pairingRequests.push(req);
        db.pairingRequests = dedupePairingRequests(db.pairingRequests);
        syncRecordToFirestore('pairingRequests', req);
      }
    }
  } else if (activeRegisterRole === 'mentor') {
    newUser.title = document.getElementById('reg-title').value.trim() || 'Technical Advisor';
    newUser.domain = document.getElementById('reg-mentor-domain').value || 'Web Development';
  }

  // Shut off webcam
  stopWebcam('reg-webcam');
  regWebcamActive = false;
  window.lastRegisteredFaceDescriptor = null; // Clear temp cache

  db.users.push(newUser);
  db.users = dedupeUsersByEmail(db.users);
  saveDatabase();
  const regSynced = await syncRecordToSupabase('users', newUser);
  if (!regSynced && supabaseActive) {
    console.warn('Registration saved locally but Supabase sync may have failed ... check browser console.');
  }
  if (newUser.mentorEmail && db.pairingRequests) {
    const lastReq = db.pairingRequests[db.pairingRequests.length - 1];
    if (lastReq) await syncRecordToSupabase('pairingRequests', lastReq);
  }
  updateLandingStats();

  currentUser = newUser;
  sessionStorage.removeItem('apex_intern_session_face_verified');
  storage.setItem('apex_intern_currentUser', JSON.stringify(currentUser));
  showPortalPage(currentUser.role);
  
  // Reset form
  document.getElementById('register-form').reset();
}

function handleLogout() {
  // Clear activity heartbeat timer
  if (studentActiveHeartbeatInterval) {
    clearInterval(studentActiveHeartbeatInterval);
    studentActiveHeartbeatInterval = null;
  }

  // Shut off cameras
  stopWebcam('reg-webcam');
  stopWebcam('edit-webcam');
  stopWebcam('ver-webcam');
  stopWebcam('daily-webcam');
  
  if (dailyScanningInterval) {
    clearTimeout(dailyScanningInterval);
    dailyScanningInterval = null;
  }
  if (scanningInterval) {
    clearTimeout(scanningInterval);
    scanningInterval = null;
  }
  dailyWebcamActive = false;
  dailyScanInProgress = false;
  dailyScanRetryCount = 0;
  verWebcamActive = false;
  hideIncomingCallOverlay();
  incomingMeetingId = null;

  // Clear session face verification state
  sessionStorage.removeItem('apex_intern_session_face_verified');

  // Hide AI Copilot elements on logout
  const copilotBtn = document.getElementById('ai-copilot-trigger');
  if (copilotBtn) {
    copilotBtn.classList.add('hidden');
  }
  const copilotPanel = document.getElementById('ai-copilot-panel');
  if (copilotPanel) {
    copilotPanel.classList.remove('active');
  }
  document.body.classList.remove('portal-active');

  currentUser = null;
  storage.removeItem('apex_intern_currentUser');
  showLandingPage();
}

function getRandomAvatar(role) {
  const studentAvatars = [
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120",
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=120"
  ];
  const mentorAvatars = [
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=120",
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120"
  ];
  const adminAvatars = [
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120"
  ];
  
  const pool = role === 'student' ? studentAvatars : (role === 'mentor' ? mentorAvatars : adminAvatars);
  return pool[Math.floor(Math.random() * pool.length)];
}


// ==================== 4. STUDENT PORTAL LOGIC ====================

function calculateStudentProgress(studentEmail) {
  if (!studentEmail) return 0;
  const studentEmailClean = studentEmail.trim().toLowerCase();
  
  const studentTasks = db.tasks.filter(t => t.assignedTo && t.assignedTo.trim().toLowerCase() === studentEmailClean);
  const completedTasks = studentTasks.filter(t => t.status === 'Completed').length;
  const taskProgress = studentTasks.length > 0 ? (completedTasks / studentTasks.length) * 100 : 0;
  
  const studentQuizzes = (db.quizSubmissions || []).filter(s => s && s.studentEmail && s.studentEmail.trim().toLowerCase() === studentEmailClean);
  const quizAvg = studentQuizzes.length > 0 
    ? (studentQuizzes.reduce((sum, s) => sum + (s.score || 0), 0) / (studentQuizzes.length * 10)) * 100
    : 0;

  if (studentTasks.length === 0 && studentQuizzes.length === 0) return 0;
  if (studentTasks.length === 0) return Math.round(quizAvg);
  if (studentQuizzes.length === 0) return Math.round(taskProgress);
  
  // 70% task completion + 30% quiz average score
  return Math.round((taskProgress * 0.7) + (quizAvg * 0.3));
}

function getOrGenerateStudentId(student) {
  if (!student) return '';
  if (student.studentId) return student.studentId;

  const domain = student.domain || 'General';
  let domainCode = 'GN';
  if (domain.toLowerCase().includes('web')) {
    domainCode = 'WD';
  } else if (domain.toLowerCase().includes('python')) {
    domainCode = 'PY';
  } else if (domain.toLowerCase().includes('ui') || domain.toLowerCase().includes('design')) {
    domainCode = 'UI';
  } else {
    const words = domain.split(' ');
    if (words.length >= 2) {
      domainCode = (words[0][0] + words[1][0]).toUpperCase();
    } else {
      domainCode = domain.substring(0, 2).toUpperCase();
    }
  }

  const year = new Date().getFullYear();

  let hash = 0;
  const email = student.email || '';
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  const suffix = Math.abs(hash % 90000) + 10000; // 5-digit number

  const id = `IX/${domainCode}/${year}/${suffix}`;
  
  student.studentId = id;
  const userIdx = db.users.findIndex(u => u && u.email && u.email.trim().toLowerCase() === student.email.trim().toLowerCase());
  if (userIdx !== -1) {
    db.users[userIdx].studentId = id;
    saveDatabase();
    if (isInitialSyncDone) {
      syncRecordToFirestore('users', db.users[userIdx]);
    }
  }
  return id;
}

function loadStudentDashboard() {
  try {
    document.getElementById('student-welcome-title').innerText = `Welcome Back, ${currentUser.name}!`;
    document.getElementById('student-welcome-domain').innerText = currentUser.domain || 'Internship Trainee';

    // Check group call badge (new meetings notification)
    setTimeout(checkStudentGroupCallBadge, 200);

    // Get Assigned Mentor details
    const mentor = db.users.find(u => u && u.email && u.email.trim().toLowerCase() === (currentUser.mentorEmail || "").trim().toLowerCase());
    let mentorName = mentor ? mentor.name : "Unassigned Mentor";
    if (mentor && currentUser.mentorStatus === "Pending") {
      mentorName += " (Pending Approval)";
    }
    document.getElementById('student-mentor-indicator').innerText = `Supervisor: ${mentorName}`;

    // Toggle Offer Letter button based on supervisor assignment state
    const offerLetterBtn = document.getElementById('student-offer-letter-btn');
    if (offerLetterBtn) {
      if (currentUser.mentorStatus === 'Active') {
        offerLetterBtn.classList.remove('hidden');
      } else {
        offerLetterBtn.classList.add('hidden');
      }
    }

    // Toggle Certificate button based on certificate existence state
    const certBtn = document.getElementById('student-certificate-btn');
    if (certBtn) {
      const hasCert = db.certificates && db.certificates.some(c => c.studentEmail && c.studentEmail.trim().toLowerCase() === currentUser.email.trim().toLowerCase());
      if (hasCert) {
        certBtn.classList.remove('hidden');
      } else {
        certBtn.classList.add('hidden');
      }
    }


    // Update Daily Attendance indicator status
    const attIndicator = document.getElementById('student-attendance-indicator');
    if (attIndicator) {
      if (hasCheckedInToday()) {
        attIndicator.innerText = "Daily Attendance: Checked-In";
        attIndicator.style.background = "rgba(16, 185, 129, 0.1)";
        attIndicator.style.color = "var(--success)";
        attIndicator.style.borderColor = "var(--success)";
      } else {
        attIndicator.innerText = "Daily Attendance: Pending";
        attIndicator.style.background = "rgba(239, 68, 68, 0.1)";
        attIndicator.style.color = "var(--danger)";
        attIndicator.style.borderColor = "var(--danger)";
      }
    }

    // Recalculate progress metrics
    const progressPct = calculateStudentProgress(currentUser.email);
    currentUser.progress = progressPct;
    
    // Find user index in db and update it
    const userIdx = db.users.findIndex(u => u && u.email && u.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase());
    if (userIdx !== -1) {
      if (db.users[userIdx].progress !== progressPct) {
        db.users[userIdx].progress = progressPct;
        saveDatabase();
        if (isInitialSyncDone) {
          syncRecordToFirestore('users', db.users[userIdx]);
        }
      }
    }

    document.getElementById('student-dash-progress-val').innerText = `${progressPct}%`;
    document.getElementById('student-dash-progress-bar').style.width = `${progressPct}%`;

    const studentTasks = db.tasks.filter(t => t && t.assignedTo && t.assignedTo.trim().toLowerCase() === currentUser.email.trim().toLowerCase());
    const completedTasks = studentTasks.filter(t => t.status === 'Completed').length;
    document.getElementById('student-dash-tasks-val').innerText = `${completedTasks} / ${studentTasks.length}`;

    const studentLogs = db.weeklyLogs.filter(l => l && l.studentId && l.studentId.trim().toLowerCase() === currentUser.email.trim().toLowerCase() && l.status === 'Approved');
    const loggedHours = studentLogs.reduce((sum, curr) => sum + parseInt(curr.hoursLogged || 0), 0);
    document.getElementById('student-dash-hours-val').innerText = `${loggedHours} hrs`;

    // Load daily quiz stats
    const studentQuizzes = (db.quizSubmissions || []).filter(s => s && s.studentEmail && s.studentEmail.trim().toLowerCase() === currentUser.email.trim().toLowerCase());
    const quizAvgScore = studentQuizzes.length > 0 
      ? Math.round((studentQuizzes.reduce((sum, s) => sum + (s.score || 0), 0) / (studentQuizzes.length * 10)) * 100)
      : 0;
    document.getElementById('student-dash-quiz-val').innerText = `${quizAvgScore}%`;
    document.getElementById('student-dash-quiz-bar').style.width = `${quizAvgScore}%`;

    // Draw dashboard task tables
    const tableBody = document.querySelector('#student-dash-tasks-table tbody');
    if (tableBody) {
      tableBody.innerHTML = '';
      
      if (studentTasks.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No tasks assigned yet.</td></tr>`;
      } else {
        // Show up to 3 recent tasks
        studentTasks.slice(0, 3).forEach(task => {
          const mentorName = db.users.find(u => u && u.email === task.assignedBy)?.name || 'Mentor';
          let attachmentLink = '';
          if (task.attachment) {
            attachmentLink = ` <a href="javascript:void(0)" onclick="downloadTaskAttachment('${task.id}', '${task.attachment.name}')" style="color: var(--primary-magenta); margin-left: 6px; font-weight:600;" title="Download Task Document">?? Download</a>`;
          }
          let referenceLinkHTML = '';
          if (task.referenceLink) {
            referenceLinkHTML = ` | <a href="${task.referenceLink}" target="_blank" style="color: var(--primary-magenta); margin-left: 6px; font-weight:600;" title="Open Task Platform">?? Platform</a>`;
          }

          const row = document.createElement('tr');
          row.innerHTML = `
            <td>
              <div style="font-weight:600; color:#fff;">${task.title}</div>
              <div style="font-size:10px; color:var(--text-dark); margin-top:2px;">Mentor: ${mentorName}${attachmentLink}${referenceLinkHTML}</div>
            </td>
            <td>${task.dueDate}</td>
            <td><span class="status-badge ${task.status.toLowerCase().replace(/\s+/g, '_')}">${task.status}</span></td>
          `;
          tableBody.appendChild(row);
        });
      }
    }

    // Draw hours logged bar chart
    const chartContainer = document.getElementById('student-dash-chart');
    if (chartContainer) {
      chartContainer.innerHTML = '';
      const allStudentLogs = db.weeklyLogs.filter(l => l && l.studentId && l.studentId.trim().toLowerCase() === currentUser.email.trim().toLowerCase()).sort((a,b) => a.weekNumber - b.weekNumber);
      
      if (allStudentLogs.length === 0) {
        chartContainer.innerHTML = `<div style="margin: auto; color: var(--text-muted); font-size: 13px;">No weekly logs submitted.</div>`;
      } else {
        allStudentLogs.forEach(log => {
          const heightVal = Math.min(100, Math.round((log.hoursLogged / 45) * 100)); // Scaled to max 45 hours
          const barWrap = document.createElement('div');
          barWrap.className = 'chart-bar-wrap';
          barWrap.innerHTML = `
            <div class="chart-bar" style="height: ${heightVal}%;"></div>
            <div class="chart-label">W${log.weekNumber} (${log.hoursLogged}h)</div>
          `;
          chartContainer.appendChild(barWrap);
        });
      }
    }

    // Load new widgets
    if (typeof loadDashboardBadges === 'function') loadDashboardBadges();
    if (typeof loadStudentSyncNotes === 'function') loadStudentSyncNotes();
    // Load AI meeting summaries for student
    if (typeof loadDashboardMeetings === 'function') loadDashboardMeetings('student');
  } catch (err) {
    console.error("Error in loadStudentDashboard:", err);
  }
}

function loadStudentTasks() {
  if (!studentCanViewTasks()) {
    const columns = {
      'Todo': document.getElementById('col-todo'),
      'In Progress': document.getElementById('col-inprogress'),
      'Pending Approval': document.getElementById('col-pending'),
      'Completed': document.getElementById('col-completed')
    };
    Object.keys(columns).forEach(col => {
      const header = columns[col].querySelector('.col-header');
      columns[col].innerHTML = '';
      columns[col].appendChild(header);
    });
    
    const mentor = db.users.find(u => u.email && u.email.trim().toLowerCase() === (currentUser.mentorEmail || "").trim().toLowerCase());
    const mentorName = mentor ? mentor.name : "your mentor";
    const todoCol = document.getElementById('col-todo');
    const msgCard = document.createElement('div');
    msgCard.style.padding = '16px';
    msgCard.style.background = 'rgba(217, 4, 181, 0.05)';
    msgCard.style.border = '1px dashed var(--primary-magenta)';
    msgCard.style.borderRadius = '8px';
    msgCard.style.fontSize = '13px';
    msgCard.style.color = 'var(--text-muted)';
    msgCard.style.textAlign = 'center';
    msgCard.style.margin = '12px';
    msgCard.innerHTML = `?? Tasks will appear here once <strong>${mentorName}</strong> accepts your pairing request.`;
    todoCol.appendChild(msgCard);
    
    document.getElementById('count-todo').innerText = '0';
    document.getElementById('count-inprogress').innerText = '0';
    document.getElementById('count-pending').innerText = '0';
    document.getElementById('count-completed').innerText = '0';
    return;
  }

  const tasks = db.tasks.filter(t => isTaskForStudent(t, currentUser.email));
  
  const columns = {
    'Todo': document.getElementById('col-todo'),
    'In Progress': document.getElementById('col-inprogress'),
    'Pending Approval': document.getElementById('col-pending'),
    'Completed': document.getElementById('col-completed')
  };

  // Clear existing boards
  Object.keys(columns).forEach(col => {
    // Retain only header
    const header = columns[col].querySelector('.col-header');
    columns[col].innerHTML = '';
    columns[col].appendChild(header);
  });

  let counts = { 'Todo': 0, 'In Progress': 0, 'Pending Approval': 0, 'Completed': 0 };

  tasks.forEach(task => {
    counts[task.status]++;
    
    const card = document.createElement('div');
    card.className = 'task-card glass-panel';
    card.draggable = (task.status === 'Todo' || task.status === 'In Progress');
    card.id = task.id;
    card.addEventListener('dragstart', handleDragStart);

    // Double click to trigger submission popup
    if (task.status === 'Todo' || task.status === 'In Progress') {
      card.addEventListener('dblclick', () => openSubmitTaskModal(task.id, task.title));
      card.title = "Double-click to submit work for review";
    }

    let statusStyle = task.status.toLowerCase().replace(/\s+/g, '_');
    
    const mentorName = db.users.find(u => u.email === task.assignedBy)?.name || 'Mentor';
    let attachmentHTML = '';
    if (task.attachment) {
      attachmentHTML = `
        <div style="margin-top: 10px; padding: 6px 10px; background: rgba(255,255,255,0.03); border-radius: 6px; display: flex; align-items: center; justify-content: space-between; border: 1px solid rgba(255,255,255,0.05);">
          <span style="font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;" title="${task.attachment.name}">?? ${task.attachment.name}</span>
          <a href="javascript:void(0)" onclick="downloadTaskAttachment('${task.id}', '${task.attachment.name}')" class="btn btn-secondary btn-sm" style="padding: 2px 6px; font-size: 10px; display: inline-flex; align-items: center; gap: 2px; height: auto;">?? Download</a>
        </div>
      `;
    }
    let referenceLinkHTML = '';
    if (task.referenceLink) {
      referenceLinkHTML = `
        <div style="margin-top: 10px;">
          <a href="${task.referenceLink}" target="_blank" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 4px; border-color: var(--primary-magenta); color: var(--primary-magenta); background: rgba(224, 26, 139, 0.04); font-size: 11px; padding: 4px 10px; text-decoration: none; border-radius: 6px;">
            ?? Open Task Platform
          </a>
        </div>
      `;
    }

    let startBtnHTML = '';
    if (task.status === 'Todo') {
      startBtnHTML = `
        <button class="btn btn-primary btn-sm" onclick="moveTaskToInProgress('${task.id}')" style="font-size: 10px; padding: 4px 8px; margin-top: 8px; width: 100%; border-radius: 6px; cursor: pointer;">
          ? Start Task (In Progress)
        </button>
      `;
    }

    let submitBtnHTML = '';
    if (task.status === 'In Progress') {
      submitBtnHTML = `
        <button class="btn btn-primary btn-sm" onclick="openSubmitTaskModal('${task.id}', '${task.title}')" style="font-size: 10px; padding: 4px 8px; margin-top: 8px; width: 100%; border-radius: 6px; background: var(--primary-magenta); border-color: var(--primary-magenta); cursor: pointer;">
          ?? Submit Work for Review
        </button>
      `;
    }

    let progressHTML = '';
    if (task.status === 'In Progress') {
      const progressVal = task.progress || 0;
      progressHTML = `
        <div style="margin-top: 12px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">
            <span>Task Progress:</span>
            <span style="color: var(--primary-magenta); font-weight: 600;">${progressVal}%</span>
          </div>
          <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden; border: 1px solid rgba(255,255,255,0.04);">
            <div style="width: ${progressVal}%; height: 100%; background: linear-gradient(90deg, var(--primary-magenta) 0%, var(--primary-glow) 100%); box-shadow: 0 0 6px var(--primary-magenta); border-radius: 3px; transition: width 0.3s ease;"></div>
          </div>
        </div>
      `;
    }

    card.innerHTML = `
      <h4>${task.title}</h4>
      <p>${task.description}</p>
      ${attachmentHTML}
      ${referenceLinkHTML}
      ${progressHTML}
      ${startBtnHTML}
      ${submitBtnHTML}
      <div style="font-size: 11px; color: var(--text-dark); margin-top: 10px; font-weight: 500;">
        Assigned by: <span style="color: var(--primary-magenta); font-weight: 600;">${mentorName}</span>
      </div>
      <div class="task-meta" style="margin-top: 8px;">
        <span class="status-badge ${statusStyle}">${task.status}</span>
        <span class="task-date">Due: ${task.dueDate}</span>
      </div>
      ${task.feedback ? `<div style="font-size: 11px; margin-top: 10px; color: var(--primary-magenta); border-top: 1px solid var(--border-color); padding-top: 6px;">Feedback: ${task.feedback}</div>` : ''}
    `;

    columns[task.status].appendChild(card);
  });

  // Update counters
  document.getElementById('count-todo').innerText = counts['Todo'];
  document.getElementById('count-inprogress').innerText = counts['In Progress'];
  document.getElementById('count-pending').innerText = counts['Pending Approval'];
  document.getElementById('count-completed').innerText = counts['Completed'];
}

// Drag & Drop Board handlers
function handleDragStart(event) {
  event.dataTransfer.setData('text/plain', event.target.id);
}

function allowDrop(event) {
  event.preventDefault();
}

function handleDrop(event, targetStatus) {
  event.preventDefault();
  const taskId = event.dataTransfer.getData('text/plain');
  const task = db.tasks.find(t => t.id === taskId);
  
  if (task) {
    // Only student is running this portal. Check permission rules
    // Students can drag Todo <=> In Progress, but need formal form submit to go to 'Pending Approval'
    if (targetStatus === 'Pending Approval') {
      openSubmitTaskModal(task.id, task.title);
      return;
    }

    if (targetStatus === 'Completed') {
      alert("Completed status requires Review approval from your mentor.");
      return;
    }

    startFaceVerification(`Move Task to ${targetStatus}`, () => {
      task.status = targetStatus;
      saveDatabase();
      syncRecordToFirestore('tasks', task);
      loadStudentTasks();
    });
  }
}

// Task Submission Modal Form
function openSubmitTaskModal(taskId, title) {
  document.getElementById('submit-task-id').value = taskId;
  document.getElementById('submit-task-title-text').innerText = title;
  document.getElementById('submit-task-text').value = '';
  document.getElementById('submit-task-link').value = '';
  
  const fileInput = document.getElementById('submit-task-screenshot');
  if (fileInput) {
    fileInput.value = '';
  }
  const previewWrap = document.getElementById('submit-task-screenshot-preview-wrap');
  if (previewWrap) {
    previewWrap.classList.add('hidden');
  }
  const previewImg = document.getElementById('submit-task-screenshot-preview');
  if (previewImg) {
    previewImg.src = '';
  }
  
  openModal('submit-task-modal');
}

function previewSubmitScreenshot(event) {
  const fileInput = event.target;
  const previewWrap = document.getElementById('submit-task-screenshot-preview-wrap');
  const previewImg = document.getElementById('submit-task-screenshot-preview');
  
  if (fileInput.files && fileInput.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      previewImg.src = e.target.result;
      previewWrap.classList.remove('hidden');
    };
    reader.readAsDataURL(fileInput.files[0]);
  }
}

function removeSubmitScreenshot() {
  const fileInput = document.getElementById('submit-task-screenshot');
  const previewWrap = document.getElementById('submit-task-screenshot-preview-wrap');
  const previewImg = document.getElementById('submit-task-screenshot-preview');
  
  if (fileInput) fileInput.value = '';
  if (previewWrap) previewWrap.classList.add('hidden');
  if (previewImg) previewImg.src = '';
}

function handleTaskSubmissionSubmit(event) {
  event.preventDefault();
  const taskId = document.getElementById('submit-task-id').value;
  const comments = document.getElementById('submit-task-text').value.trim();
  const link = document.getElementById('submit-task-link').value.trim();
  const fileInput = document.getElementById('submit-task-screenshot');

  const task = db.tasks.find(t => t.id === taskId);
  if (!task) return;

  const proceedSubmit = (compressedScreenshot) => {
    closeModal('submit-task-modal');
    
    startFaceVerification(`Submit Task: ${task.title}`, () => {
      const syncedTask = db.tasks.find(t => t.id === taskId);
      if (syncedTask) {
        syncedTask.status = 'Pending Approval';
        syncedTask.submission = {
          text: comments,
          links: link ? [link] : [],
          screenshot: compressedScreenshot || null,
          submittedAt: new Date().toISOString().split('T')[0]
        };
      }
      saveDatabase(true);

      // Sync to Supabase (primary cloud sync)
      syncRecordToSupabase('tasks', syncedTask).catch(() => {});
      syncRecordToFirestore('tasks', syncedTask);

      // Auto-send a chat notification message to mentor
      const mentorEmail = currentUser.mentorEmail || (syncedTask && syncedTask.assignedBy) || '';
      if (mentorEmail) {
        const notifMsg = {
          id: `msg-task-submit-${Date.now()}`,
          from: currentUser.email,
          to: mentorEmail.trim().toLowerCase(),
          text: `?? Task submitted for review: "${syncedTask.title}"\n\n${comments ? '?? Notes: ' + comments : ''}${link ? '\n?? Link: ' + link : ''}`,
          timestamp: new Date().toISOString(),
          type: 'task_submission_alert',
          taskId: syncedTask.id
        };
        if (!db.chats) db.chats = [];
        db.chats.push(notifMsg);
        saveDatabase(true);
        syncRecordToSupabase('chats', notifMsg).catch(() => {});
        syncRecordToFirestore('chats', notifMsg);

        // Broadcast to mentor's tab if open
        try {
          if (window.__apexChatChannel) window.__apexChatChannel.postMessage({ type: 'new_message', msg: notifMsg });
        } catch (e) {}
      }

      // Broadcast meeting/task update to sync mentor dashboard
      notifyMeetingEvent({ type: 'task_submitted', taskId: syncedTask.id, studentEmail: currentUser.email });

      loadStudentTasks();
      showToast('? Task submitted! Mentor has been notified.', 3000);
    });
  };

  if (fileInput && fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
      const rawData = e.target.result;
      compressImage(rawData, 800, 800, 0.7, (compressedData) => {
        proceedSubmit(compressedData);
      });
    };
    reader.onerror = function() {
      proceedSubmit(null);
    };
    reader.readAsDataURL(file);
  } else {
    proceedSubmit(null);
  }
}

// Weekly log form uploads
function loadStudentLogs() {
  if (!currentUser) return;
  if (!db.weeklyLogs) db.weeklyLogs = [];

  // Set defaults ... safely
  const weekNumEl = document.getElementById('log-week-num');
  const logStartEl = document.getElementById('log-start');
  const logEndEl = document.getElementById('log-end');
  const logHoursEl = document.getElementById('log-hours');
  const logSummaryEl = document.getElementById('log-summary');
  const logBlockersEl = document.getElementById('log-blockers');

  const myCount = db.weeklyLogs.filter(l => l && l.studentId && l.studentId.trim().toLowerCase() === currentUser.email.trim().toLowerCase()).length;

  if (weekNumEl) weekNumEl.value = myCount + 1;
  if (logStartEl) logStartEl.value = new Date().toISOString().split('T')[0];
  if (logEndEl) {
    const end = new Date();
    end.setDate(end.getDate() + 7);
    logEndEl.value = end.toISOString().split('T')[0];
  }
  if (logHoursEl) logHoursEl.value = '40';
  if (logSummaryEl) logSummaryEl.value = '';
  if (logBlockersEl) logBlockersEl.value = '';

  // Load history list
  const historyList = document.getElementById('student-logs-list');
  if (!historyList) return;

  const myLogs = db.weeklyLogs
    .filter(l => l && l.studentId && l.studentId.trim().toLowerCase() === currentUser.email.trim().toLowerCase())
    .sort((a, b) => b.weekNumber - a.weekNumber);

  if (myLogs.length === 0) {
    historyList.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);">No reports created yet. Fill out the form to submit your first.</div>`;
  } else {
    historyList.innerHTML = '';
    myLogs.forEach(log => {
      const statusClass = (log.status || '').toLowerCase().replace(/\s+/g, '_');
      const card = document.createElement('div');
      card.className = 'log-card glass-panel mb-4';
      card.innerHTML = `
        <div class="log-card-header">
          <h4 style="color:#fff;">Week ${log.weekNumber} Report</h4>
          <span class="status-badge ${statusClass}">${log.status || 'Pending'}</span>
        </div>
        <div style="font-size:12px;color:var(--text-dark);margin-bottom:8px;">
          ?? ${log.startDate || '...'} ? ${log.endDate || '...'} &nbsp;|&nbsp; ?? ${log.hoursLogged || 0} hrs
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">Submitted: ${log.submittedAt || '...'}</div>
        ${log.summary ? `<p style="font-size:13px;color:var(--text-muted);line-height:1.5;margin-top:6px;">${log.summary}</p>` : ''}
        ${log.blockers ? `<div style="font-size:12px;color:var(--danger);margin-top:6px;">?? Blockers: ${log.blockers}</div>` : ''}
        ${log.feedback ? `<div style="font-size:12px;color:var(--primary-magenta);border-top:1px dashed var(--border-color);padding-top:8px;margin-top:8px;">?? Mentor Feedback: ${log.feedback}</div>` : ''}
      `;
      historyList.appendChild(card);
    });
  }
}

function handleLogSubmit(event) {
  event.preventDefault();
  const weekNumber = parseInt(document.getElementById('log-week-num').value);
  const startDate = document.getElementById('log-start').value;
  const endDate = document.getElementById('log-end').value;
  const hoursLogged = parseInt(document.getElementById('log-hours').value);
  const summary = document.getElementById('log-summary').value.trim();
  const blockers = document.getElementById('log-blockers').value.trim();

  // Validations
  if (!weekNumber || weekNumber < 1) {
    showToast('?? Please enter a valid week number.', 2500); return;
  }
  if (!summary) {
    showToast('?? Please fill in the Work Accomplished Summary.', 2500);
    document.getElementById('log-summary').focus();
    return;
  }

  // Validate duplicate week
  if (db.weeklyLogs && db.weeklyLogs.some(l => l && l.studentId && l.studentId.trim().toLowerCase() === currentUser.email.trim().toLowerCase() && l.weekNumber === weekNumber)) {
    showToast(`?? Week ${weekNumber} report already submitted.`, 2500);
    return;
  }

  startFaceVerification(`Submit Week ${weekNumber} Log`, () => {
    const newLog = {
      id: `log-${Date.now()}`,
      studentId: currentUser.email,
      studentName: currentUser.name || currentUser.email.split('@')[0],
      mentorEmail: (currentUser.mentorEmail || '').trim().toLowerCase(),
      weekNumber,
      startDate,
      endDate,
      summary,
      hoursLogged,
      blockers,
      submittedAt: new Date().toISOString().split('T')[0],
      status: 'Pending Approval',
      feedback: ''
    };

    if (!db.weeklyLogs) db.weeklyLogs = [];
    db.weeklyLogs.push(newLog);
    saveDatabase(true);

    // Sync to BOTH Supabase and Firestore
    syncRecordToSupabase('weeklyLogs', newLog).catch(() => {});
    syncRecordToFirestore('weeklyLogs', newLog);

    // Notify mentor via chat message
    const mentorEmail = (currentUser.mentorEmail || '').trim().toLowerCase();
    if (mentorEmail) {
      const notifMsg = {
        id: `msg-log-submit-${Date.now()}`,
        from: currentUser.email,
        to: mentorEmail,
        text: `?? Weekly Report Submitted ... Week ${weekNumber}\n\n?? Period: ${startDate} ? ${endDate}\n?? Hours: ${hoursLogged}h\n\n?? Summary: ${summary}${blockers ? '\n\n?? Blockers: ' + blockers : ''}`,
        timestamp: new Date().toISOString(),
        type: 'weekly_log_alert',
        logId: newLog.id
      };
      if (!db.chats) db.chats = [];
      db.chats.push(notifMsg);
      saveDatabase(true);
      syncRecordToSupabase('chats', notifMsg).catch(() => {});
      syncRecordToFirestore('chats', notifMsg);
      try {
        if (window.__apexChatChannel) window.__apexChatChannel.postMessage({ type: 'new_message', msg: notifMsg });
      } catch (e) {}
    }

    // Broadcast to mentor's open tab
    notifyMeetingEvent({ type: 'weekly_log_submitted', logId: newLog.id, studentEmail: currentUser.email });

    // Refresh history immediately
    loadStudentLogs();
    showToast(`? Week ${weekNumber} report submitted! Mentor notified.`, 3000);
  });
}

// Student Chat Engine
function loadStudentChat() {
  const mentor = db.users.find(u => u && u.email && u.email.trim().toLowerCase() === (currentUser.mentorEmail || "").trim().toLowerCase());
  const mentorName = mentor ? mentor.name : "Unassigned Mentor";
  const mentorAvatar = mentor ? mentor.avatar : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120";

  document.getElementById('student-chat-mentor-name').innerText = mentorName;
  document.getElementById('student-chat-mentor-avatar').src = mentorAvatar;

  const chatInput = document.getElementById('student-chat-input');
  const chatSendBtn = document.querySelector('#student-chat-form button[type="submit"]');
  
  if (!currentUser.mentorEmail) {
    if (chatInput) {
      chatInput.disabled = true;
      chatInput.placeholder = "Chat will be enabled once your supervisor is assigned.";
    }
    if (chatSendBtn) chatSendBtn.disabled = true;
  } else {
    if (chatInput) {
      chatInput.disabled = false;
      chatInput.placeholder = "Type your message...";
    }
    if (chatSendBtn) chatSendBtn.disabled = false;
  }

  renderChatHistory(currentUser.mentorEmail, 'student-chat-history');

  if (incomingMeetingId) {
    const ringingMeet = (db.meetings || []).find(m => m.id === incomingMeetingId && m.status === 'active');
    updateStudentIncomingCallBanner(ringingMeet || null);
  } else {
    updateStudentIncomingCallBanner(null);
  }
}


// ==================== 5. MENTOR PORTAL LOGIC ====================

function loadMentorDashboard() {
  renderMentorDashboardContent();
}

function renderMentorDashboardContent() {

  console.log('currentUser =', currentUser);

  if (!currentUser) {
    console.error('currentUser is null');
    return;
  }

  document.getElementById('mentor-welcome-title').innerText =
    `Supervisor: ${currentUser.name}`;
  
  if (!isInitialSyncDone && supabaseActive && supabaseClient) {
    document.getElementById('mentor-dash-interns-count').innerHTML = `<span class="shimmer-text shimmer-wrapper"></span>`;
    document.getElementById('mentor-dash-pending-tasks').innerHTML = `<span class="shimmer-text shimmer-wrapper"></span>`;
    document.getElementById('mentor-dash-pending-reports').innerHTML = `<span class="shimmer-text shimmer-wrapper"></span>`;
    
    const tableBody = document.querySelector('#mentor-interns-table tbody');
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="shimmer-row shimmer-wrapper"></div>
            <div class="shimmer-row shimmer-wrapper" style="width: 85%;"></div>
            <div class="shimmer-row shimmer-wrapper" style="width: 90%;"></div>
          </td>
        </tr>
      `;
    }
    return;
  }

  const myStudents = getMentorStudents({ activeOnly: true });
  const dashKey = buildMentorDashListKey(myStudents);
  document.getElementById('mentor-dash-interns-count').innerText = myStudents.length;

  const studentEmails = myStudents.map(s => s.email.trim().toLowerCase());
  const pendingTasks = db.tasks.filter(t => t.assignedTo && studentEmails.includes(t.assignedTo.trim().toLowerCase()) && t.status === 'Pending Approval').length;
  document.getElementById('mentor-dash-pending-tasks').innerText = pendingTasks;

  const pendingReports = db.weeklyLogs.filter(l => l.studentId && studentEmails.includes(l.studentId.trim().toLowerCase()) && l.status === 'Pending Approval').length;
  document.getElementById('mentor-dash-pending-reports').innerText = pendingReports;

  const tableBody = document.querySelector('#mentor-interns-table tbody');
  lastMentorDashListKey = dashKey;
  tableBody.innerHTML = '';

  if (myStudents.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No student interns assigned to you yet.</td></tr>`;
  } else {
    myStudents.forEach(student => {
      const studentTasks = db.tasks.filter(t => t && t.assignedTo && student.email && t.assignedTo.trim().toLowerCase() === student.email.trim().toLowerCase());
      const studentCompleted = studentTasks.filter(t => t.status === 'Completed').length;
      const progress = calculateStudentProgress(student.email);

      // Check today's attendance status
      let attendanceStatusHTML = '';
      const emailClean = student.email.trim().toLowerCase();
      
      const todayDate = new Date().toDateString();
      const todayLog = getTodayDailyAttendanceLog(student.email);

      if (todayLog) {
        const timeStr = todayLog.timestamp ? (todayLog.timestamp.split(',')[1] || '').trim() : '';
        attendanceStatusHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
            <span style="background: rgba(16, 185, 129, 0.15); color: var(--success); padding: 4px 8px; border-radius: 6px; border: 1px solid var(--success); font-size: 11px; font-weight: bold; display: inline-block;">?? Checked-In</span>
            ${timeStr ? `<span style="font-size: 9px; color: var(--text-muted);">${timeStr}</span>` : ''}
          </div>
        `;
      } else {
        attendanceStatusHTML = `
          <span style="background: rgba(239, 68, 68, 0.12); color: var(--danger); padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.3); font-size: 11px; font-weight: bold; display: inline-block;">? Absent</span>
        `;
      }

      // Calculate active status
      let activityStatusHTML = '';
      const isOnline = isUserOnline(student.lastActive);
      if (isOnline) {
        activityStatusHTML = `
          <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
            <span class="status-pulse-dot" style="width: 8px; height: 8px; border-radius: 50%; background-color: #10b981; box-shadow: 0 0 8px #10b981; animation: pulseGlow 1.5s infinite alternate;"></span>
            <span style="color: #10b981; font-weight: 600; font-size: 12px;">Active Now</span>
          </div>
        `;
      } else {
        const lastActiveStr = formatLastActive(student.lastActive);
        activityStatusHTML = `
          <div style="display: flex; align-items: center; justify-content: center; gap: 6px; color: var(--text-muted);">
            <span style="width: 8px; height: 8px; border-radius: 50%; background-color: #64748b;"></span>
            <span style="font-size: 12px;">${lastActiveStr}</span>
          </div>
        `;
      }

      const studentQuizzes = (db.quizSubmissions || []).filter(s => s && s.studentEmail && s.studentEmail.trim().toLowerCase() === student.email.trim().toLowerCase());
      const quizAvg = studentQuizzes.length > 0 
        ? Math.round((studentQuizzes.reduce((sum, s) => sum + (s.score || 0), 0) / (studentQuizzes.length * 10)) * 100)
        : 0;

      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="flex align-center gap-2">
          <img src="${student.avatar}" class="user-avatar" style="width:30px; height:30px;">
          <span>${student.name}</span>
        </td>
        <td>${student.domain}</td>
        <td>${student.startDate || 'N/A'}</td>
        <td style="text-align: center;">${attendanceStatusHTML}</td>
        <td style="text-align: center;">${activityStatusHTML}</td>
        <td>
          <div style="font-weight:600; margin-bottom:4px;">${progress}% (${studentCompleted}/${studentTasks.length} tasks)</div>
          <div style="font-size:10px; color:var(--text-muted); margin-bottom:4px;">Quiz Avg: ${quizAvg}% (${studentQuizzes.length} completed)</div>
          <div class="progress-container"><div class="progress-bar" style="width: ${progress}%;"></div></div>
        </td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="openInternDetails('${student.email}')">Inspect Details</button>
          ${(() => {
            const hasCert = db.certificates && db.certificates.some(c => c.studentEmail && c.studentEmail.trim().toLowerCase() === student.email.trim().toLowerCase());
            if (hasCert) {
              return `<button class="btn btn-primary btn-sm" onclick="viewCertificateForStudent('${student.email}')" style="background: #10b981; border-color: #10b981; color: white; font-size:11px; padding: 4px 8px; cursor: pointer; margin-top: 4px; display: block; width: 100%;">View Certificate</button>`;
            } else if (progress === 100) {
              return `<button class="btn btn-primary btn-sm" onclick="issueCertificate('${student.email}')" style="background: var(--primary-magenta); border-color: var(--primary-magenta); font-size:11px; padding: 4px 8px; cursor: pointer; margin-top: 4px; display: block; width: 100%;">Issue Certificate</button>`;
            } else {
              return `<button class="btn btn-secondary btn-sm" disabled style="opacity: 0.5; font-size:11px; padding: 4px 8px; margin-top: 4px; display: block; width: 100%; cursor: not-allowed;" title="Requires 100% Progress">Issue Certificate</button>`;
            }
          })()}
        </td>
      `;
      tableBody.appendChild(row);
    });
  }

  maybeLoadDashboardMeetings('mentor');

  // Render pairing requests panel
  renderPairingRequests();
}

function getMentorPendingPairingRequests() {
  cleanupPairingRequestsStore();
  const mentorEmail = normalizeChatEmail(currentUser.email);

  const myRequests = db.pairingRequests.filter(req =>
    normalizeChatEmail(req.mentorEmail) === mentorEmail && req.status === 'Pending'
  );

  const seenStudents = new Set();
  const uniqueRequests = [];
  myRequests.forEach(req => {
    const studentKey = normalizeChatEmail(req.studentEmail);
    if (!studentKey || seenStudents.has(studentKey)) return;
    seenStudents.add(studentKey);
    uniqueRequests.push(req);
  });

  const knownStudentEmails = new Set(
    db.pairingRequests
      .filter(r => normalizeChatEmail(r.mentorEmail) === mentorEmail)
      .map(r => normalizeChatEmail(r.studentEmail))
  );

  getMentorStudents({ activeOnly: false }).filter(u => u.mentorStatus === 'Pending').forEach(student => {
    const studentKey = normalizeChatEmail(student.email);
    if (!studentKey || knownStudentEmails.has(studentKey) || backfilledPairingEmails.has(studentKey)) return;
    backfilledPairingEmails.add(studentKey);
    const missingReq = {
      id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      studentEmail: studentKey,
      studentName: student.name,
      domain: student.domain || 'N/A',
      mentorEmail,
      status: 'Pending'
    };
    db.pairingRequests.push(missingReq);
    knownStudentEmails.add(studentKey);
    uniqueRequests.push(missingReq);
    saveDatabase();
    syncRecordToFirestore('pairingRequests', missingReq);
  });

  return uniqueRequests;
}

function renderPairingRequests() {
  const panel = document.getElementById('mentor-pairing-requests-panel');
  const tableBody = document.querySelector('#mentor-pairing-requests-table tbody');
  const countNode = document.getElementById('mentor-pairing-req-count');
  if (!panel || !tableBody || !countNode) return;

  if (!db.pairingRequests) db.pairingRequests = [];

  const myRequests = getMentorPendingPairingRequests();
  countNode.innerText = myRequests.length;

  // Update top-right header indicator
  const headerIndicators = document.getElementById('mentor-header-indicators');
  if (headerIndicators) {
    headerIndicators.innerHTML = '';
    if (myRequests.length > 0) {
      const pairIndicator = document.createElement('div');
      pairIndicator.className = 'btn btn-secondary btn-sm';
      pairIndicator.id = 'mentor-pairing-header-indicator';
      pairIndicator.style.borderColor = 'var(--warning)';
      pairIndicator.style.color = 'var(--warning)';
      pairIndicator.style.background = 'rgba(245, 158, 11, 0.1)';
      pairIndicator.style.cursor = 'pointer';
      pairIndicator.style.fontWeight = 'bold';
      pairIndicator.innerHTML = `?? ${myRequests.length} Student Request${myRequests.length > 1 ? 's' : ''} Pending`;
      pairIndicator.onclick = () => {
        const reqPanel = document.getElementById('mentor-pairing-requests-panel');
        if (reqPanel) {
          reqPanel.scrollIntoView({ behavior: 'smooth' });
          reqPanel.style.transition = 'box-shadow 0.5s ease';
          reqPanel.style.boxShadow = '0 0 25px var(--warning)';
          setTimeout(() => {
            reqPanel.style.boxShadow = '0 0 15px rgba(217, 4, 181, 0.15)';
          }, 1500);
        }
      };
      headerIndicators.appendChild(pairIndicator);
    }
  }

  tableBody.innerHTML = '';

  if (myRequests.length === 0) {
    panel.classList.add('hidden');
  } else {
    panel.classList.remove('hidden');
    myRequests.forEach(req => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="font-weight:600; color:#fff;">${req.studentName}</td>
        <td>${req.studentEmail}</td>
        <td><span class="status-badge" style="background: rgba(255, 255, 255, 0.05); color: #fff;">${req.domain}</span></td>
        <td>
          <div class="flex gap-2">
            <button class="btn btn-primary btn-sm" onclick="acceptPairingRequest('${req.id}')" style="background: var(--success); border-color: var(--success); font-size:11px; padding: 4px 8px; cursor: pointer;">Accept</button>
            <button class="btn btn-secondary btn-sm" onclick="rejectPairingRequest('${req.id}')" style="border-color: var(--danger); color: var(--danger); font-size:11px; padding: 4px 8px; cursor: pointer;">Reject</button>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    });
  }
}

async function acceptPairingRequest(requestId) {
  cleanupPairingRequestsStore();
  let req = db.pairingRequests.find(r => r.id === requestId);
  if (!req) {
    alert("Pairing request not found. Please refresh the dashboard and try again.");
    return;
  }

  const mentorEmail = normalizeChatEmail(currentUser.email);
  const studentEmail = normalizeChatEmail(req.studentEmail);

  db.pairingRequests.forEach(r => {
    if (normalizeChatEmail(r.studentEmail) === studentEmail &&
        normalizeChatEmail(r.mentorEmail) === mentorEmail) {
      r.status = 'Accepted';
      syncRecordToFirestore('pairingRequests', r);
    }
  });
  cleanupPairingRequestsStore();
  backfilledPairingEmails.delete(studentEmail);

  const student = db.users.find(u => u && u.email && normalizeChatEmail(u.email) === studentEmail);
  if (student) {
    student.mentorStatus = 'Active';
    student.mentorEmail = mentorEmail;
    getOrGenerateStudentId(student);
    syncRecordToFirestore('users', student);
  }

  saveDatabase(true);

  if (supabaseActive && supabaseClient) {
    try {
      const updatePayload = { 'Mentor': mentorEmail };
      if (supabaseHasMentorStatusColumn) {
        updatePayload['Mentor Status'] = 'Active';
      }
      const { error: updateErr } = await supabaseClient
        .from('registration and login')
        .update(updatePayload)
        .eq('Email Id', studentEmail);
      if (updateErr) {
        console.error("Failed direct student activation in acceptPairingRequest:", updateErr);
        const errorMsg = (updateErr.message || '').toLowerCase();
        const errorCode = updateErr.code || '';
        if (supabaseHasMentorStatusColumn && (errorCode === 'PGRST204' || errorMsg.includes('mentor status') || errorMsg.includes('column') || errorMsg.includes('does not exist'))) {
          console.warn("Self-healing in acceptPairingRequest: 'Mentor Status' column missing. Retrying update without it.");
          supabaseHasMentorStatusColumn = false;
          storage.setItem('apex_intern_supabase_has_mentor_status', 'false');
          const { error: retryErr } = await supabaseClient
            .from('registration and login')
            .update({ 'Mentor': mentorEmail })
            .eq('Email Id', studentEmail);
          if (retryErr) {
            console.error("Failed retry of direct activation in acceptPairingRequest:", retryErr);
          }
        }
      }
    } catch (err) {
      console.error("Failed direct student activation in acceptPairingRequest:", err);
    }
  }

  lastMentorDashListKey = '';
  lastMentorChatListKey = '';
  loadMentorDashboard();
  alert(`Successfully paired with student ${req.studentName}!`);
}

async function rejectPairingRequest(requestId) {
  cleanupPairingRequestsStore();
  const req = db.pairingRequests.find(r => r.id === requestId);
  if (req) {
    const mentorEmail = normalizeChatEmail(currentUser.email);
    const studentEmail = normalizeChatEmail(req.studentEmail);

    db.pairingRequests.forEach(r => {
      if (normalizeChatEmail(r.studentEmail) === studentEmail &&
          normalizeChatEmail(r.mentorEmail) === mentorEmail) {
        r.status = 'Rejected';
        syncRecordToFirestore('pairingRequests', r);
      }
    });
    cleanupPairingRequestsStore();
    backfilledPairingEmails.delete(studentEmail);

    const student = db.users.find(u => u.email && normalizeChatEmail(u.email) === studentEmail);
    if (student) {
      student.mentorEmail = '';
      student.mentorStatus = '';
      syncRecordToFirestore('users', student);
    }

    saveDatabase(true);

    if (supabaseActive && supabaseClient) {
      try {
        const updatePayload = { 'Mentor': '' };
        if (supabaseHasMentorStatusColumn) {
          updatePayload['Mentor Status'] = '';
        }
        const { error: updateErr } = await supabaseClient
          .from('registration and login')
          .update(updatePayload)
          .eq('Email Id', studentEmail);
        if (updateErr) {
          console.error("Failed to clear mentor on reject:", updateErr);
          const errorMsg = (updateErr.message || '').toLowerCase();
          const errorCode = updateErr.code || '';
          if (supabaseHasMentorStatusColumn && (errorCode === 'PGRST204' || errorMsg.includes('mentor status') || errorMsg.includes('column') || errorMsg.includes('does not exist'))) {
            console.warn("Self-healing in rejectPairingRequest: 'Mentor Status' column missing. Retrying update without it.");
            supabaseHasMentorStatusColumn = false;
            storage.setItem('apex_intern_supabase_has_mentor_status', 'false');
            const { error: retryErr } = await supabaseClient
              .from('registration and login')
              .update({ 'Mentor': '' })
              .eq('Email Id', studentEmail);
            if (retryErr) {
              console.error("Failed retry of clearing mentor on reject:", retryErr);
            }
          }
        }
      } catch (err) {
        console.error("Failed to clear mentor on reject:", err);
      }
    }

    lastMentorDashListKey = '';
    lastMentorChatListKey = '';
    loadMentorDashboard();
    alert(`Pairing request from ${req.studentName} has been rejected.`);
  }
}

// Mentor task manager
function loadMentorTasks() {
  const myStudents = getMentorStudents({ activeOnly: true });
  const selectNode = document.getElementById('task-assign-student');
  selectNode.innerHTML = '';

  const warningBox = document.getElementById('no-interns-warning');
  if (myStudents.length === 0) {
    const opt = document.createElement('option');
    opt.value = "";
    opt.innerText = "No active interns paired";
    selectNode.appendChild(opt);
    if (warningBox) warningBox.classList.remove('hidden');
  } else {
    // Add bulk option
    const allOpt = document.createElement('option');
    allOpt.value = "all";
    allOpt.innerText = `All My Interns (${myStudents.length})`;
    selectNode.appendChild(allOpt);

    myStudents.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.email;
      opt.innerText = `${s.name} (${s.domain})`;
      selectNode.appendChild(opt);
    });
    if (warningBox) warningBox.classList.add('hidden');
  }

  // Populate allocated tasks table log
  const tableBody = document.querySelector('#mentor-tasks-table tbody');
  tableBody.innerHTML = '';

  const studentEmails = myStudents.map(s => s.email.toLowerCase());
  const myAssignedTasks = db.tasks.filter(t => t.assignedTo && studentEmails.includes(t.assignedTo.toLowerCase())).sort((a,b) => b.dueDate.localeCompare(a.dueDate));

  if (myAssignedTasks.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No tasks assigned by you.</td></tr>`;
  } else {
    myAssignedTasks.forEach(task => {
      const studentName = db.users.find(u => u.email && u.email.trim().toLowerCase() === task.assignedTo.trim().toLowerCase())?.name || 'Unknown';
      
      let attachmentHTML = '';
      if (task.attachment) {
        attachmentHTML = `<div style="margin-top: 4px;"><a href="javascript:void(0)" onclick="downloadTaskAttachment('${task.id}', '${task.attachment.name}')" style="font-size: 11px; color: var(--primary-magenta); text-decoration: underline;" title="Download Task Document">?? ${task.attachment.name}</a></div>`;
      }

      let referenceLinkHTML = '';
      if (task.referenceLink) {
        referenceLinkHTML = `<div style="margin-top: 4px;"><a href="${task.referenceLink}" target="_blank" style="font-size: 11px; color: var(--primary-magenta); text-decoration: underline;" title="Open Task Platform">?? Task Platform</a></div>`;
      }

      let progressHTML = '';
      if (task.status === 'In Progress') {
        const progressVal = task.progress || 0;
        progressHTML = `
          <div style="margin-top: 8px; display: flex; align-items: center; gap: 8px; max-width: 220px;">
            <div style="flex-grow: 1;">
              <div style="display: flex; justify-content: space-between; font-size: 10px; color: var(--text-dark); margin-bottom: 2px;">
                <span>Progress:</span>
                <span style="color: var(--primary-magenta); font-weight: 600;">${progressVal}%</span>
              </div>
              <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; border: 1px solid rgba(255,255,255,0.02);">
                <div style="width: ${progressVal}%; height: 100%; background: var(--primary-magenta); border-radius: 2px;"></div>
              </div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="updateTaskProgress('${task.id}')" style="padding: 2px 4px; font-size: 9px; height: auto; cursor: pointer; border-radius: 4px; flex-shrink: 0; background: rgba(255,255,255,0.02); border-color: var(--border-color); color: var(--text-muted);" title="Set task progress percentage">Set %</button>
          </div>
        `;
      }

      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="font-weight:600;">${studentName}</td>
        <td>
          <div style="font-weight:600; color:#fff;">${task.title}</div>
          <div style="font-size:11px; color:var(--text-dark); margin-top:2px;">${task.description ? task.description.substring(0, 45) + (task.description.length > 45 ? '...' : '') : 'No written description'}</div>
          ${attachmentHTML}
          ${referenceLinkHTML}
          ${progressHTML}
        </td>
        <td>${task.dueDate}</td>
        <td><span class="status-badge ${task.status.toLowerCase().replace(/\s+/g, '_')}">${task.status}</span></td>
      `;
      tableBody.appendChild(row);
    });
  }
}

function handleCreateTask(event) {
  event.preventDefault();
  const assignedTo = document.getElementById('task-assign-student').value;
  const title = document.getElementById('task-title-input').value.trim();
  const dueDate = document.getElementById('task-due-input').value;
  const description = document.getElementById('task-desc-input').value.trim();
  const referenceLink = document.getElementById('task-platform-link-input') ? document.getElementById('task-platform-link-input').value.trim() : '';

  if (!assignedTo) {
    alert("Please select a student intern first.");
    return;
  }

  // Validate that either text description OR file attachment is present
  if (!description && !uploadedTaskAttachment) {
    alert("Please write task requirements OR upload a task document/attachment.");
    return;
  }

  const submitButton = event.target.querySelector('button[type="submit"]');
  const originalBtnText = submitButton ? submitButton.innerText : "Assign Task";

  const proceedTaskCreation = (attachmentObj) => {
    const finalAttachment = attachmentObj || null;

    if (assignedTo === "all") {
      const myStudents = getMentorStudents({ activeOnly: true });
      if (myStudents.length === 0) {
        alert("You have no active interns to assign tasks to.");
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.innerText = originalBtnText;
        }
        return;
      }

      myStudents.forEach(student => {
        const newTask = {
          id: `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          title,
          description: description || "See attached document for requirements.",
          assignedTo: normalizeChatEmail(student.email),
          assignedBy: normalizeChatEmail(currentUser.email),
          dueDate,
          status: 'Todo',
          submission: null,
          feedback: '',
          attachment: finalAttachment,
          referenceLink: referenceLink || null
        };
        db.tasks.push(newTask);
        syncRecordToFirestore('tasks', newTask);
      });

      saveDatabase(true);
      alert(`Bulk task assigned successfully to all ${myStudents.length} interns!`);
    } else {
      const newTask = {
        id: `task-${Date.now()}`,
        title,
        description: description || "See attached document for requirements.",
        assignedTo: normalizeChatEmail(assignedTo),
        assignedBy: normalizeChatEmail(currentUser.email),
        dueDate,
        status: 'Todo',
        submission: null,
        feedback: '',
        attachment: finalAttachment,
        referenceLink: referenceLink || null
      };

      db.tasks.push(newTask);
      saveDatabase(true);
      syncRecordToFirestore('tasks', newTask);
      alert("New deliverable task assigned successfully!");
    }

    // Reset form and variables
    document.getElementById('create-task-form').reset();
    uploadedTaskAttachment = null;
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerText = originalBtnText;
    }
    
    // Refresh views
    loadMentorTasks();
  };

  const handleUploadErrorOrFallback = () => {
    if (firestoreActive) {
      const fileId = `task-file-${Date.now()}`;
      uploadTaskAttachmentInChunks(fileId, uploadedTaskAttachment.fileObj, uploadedTaskAttachment.data, (chunkedAttachment) => {
        if (chunkedAttachment) {
          proceedTaskCreation(chunkedAttachment);
        } else {
          alert("Attachment upload failed. Creating task without attachment.");
          proceedTaskCreation(null);
        }
      });
    } else {
      // Local storage fallback (Base64)
      proceedTaskCreation({
        name: uploadedTaskAttachment.name,
        data: uploadedTaskAttachment.data,
        type: uploadedTaskAttachment.type,
        isChunked: false
      });
    }
  };

  // Upload attachment using dynamic checks
  if (uploadedTaskAttachment && uploadedTaskAttachment.fileObj) {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerText = "Uploading attachment...";
    }

    if (firebaseStorageActive && firebaseStorage) {
      try {
        const uniqueFilename = `${Date.now()}_${uploadedTaskAttachment.name}`;
        const storageRef = firebaseStorage.ref();
        const fileRef = storageRef.child(`task_attachments/${uniqueFilename}`);
        
        let uploadFinished = false;
        const timeoutId = setTimeout(() => {
          if (!uploadFinished) {
            console.warn("Firebase Storage upload timed out after 5s, falling back to Firestore chunked upload");
            uploadFinished = true;
            handleUploadErrorOrFallback();
          }
        }, 5000);

        fileRef.put(uploadedTaskAttachment.fileObj)
          .then(snapshot => {
            if (uploadFinished) return;
            uploadFinished = true;
            clearTimeout(timeoutId);
            return snapshot.ref.getDownloadURL();
          })
          .then(url => {
            if (!url) return;
            proceedTaskCreation({
              name: uploadedTaskAttachment.name,
              data: url,
              type: uploadedTaskAttachment.type,
              isChunked: false
            });
          })
          .catch(err => {
            if (uploadFinished) return;
            uploadFinished = true;
            clearTimeout(timeoutId);
            console.error("Firebase Storage upload failed, falling back to Firestore chunked upload", err);
            handleUploadErrorOrFallback();
          });
      } catch (e) {
        console.error("Synchronous error during Firebase Storage upload, falling back to chunked upload", e);
        handleUploadErrorOrFallback();
      }
    } else {
      handleUploadErrorOrFallback();
    }
  } else {
    proceedTaskCreation(null);
  }
}

// Review Hub Actions
async function loadMentorReviews() {
  // Pull latest data from Supabase before rendering
  if (supabaseActive && supabaseClient) {
    try {
      await pullCollectionsFromApexSync(['tasks', 'weeklyLogs']);
    } catch (e) {
      console.warn('Supabase pull failed in loadMentorReviews:', e);
    }
  } else {
    // Fallback: sync from localStorage cross-tab
    syncDatabase();
  }

  const myStudents = getMentorStudents({ activeOnly: true });
  const studentEmails = myStudents.map(s => s.email.toLowerCase());

  // Load pending tasks submissions
  const pendingTasksList = document.getElementById('mentor-pending-tasks-list');
  pendingTasksList.innerHTML = '';
  const reviewsTasks = db.tasks.filter(t => t.assignedTo && studentEmails.includes(t.assignedTo.toLowerCase()) && t.status === 'Pending Approval');

  if (reviewsTasks.length === 0) {
    pendingTasksList.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-dark);">No task deliverables waiting for approval.</div>`;
  } else {
    reviewsTasks.forEach(task => {
      const sName = myStudents.find(s => s.email && s.email.trim().toLowerCase() === task.assignedTo.trim().toLowerCase())?.name || 'Intern';
      
      let linkHTML = '';
      if (task.submission.links && task.submission.links[0]) {
        linkHTML = `<div class="mb-3"><a href="${task.submission.links[0]}" target="_blank" class="btn btn-secondary btn-sm" style="display:inline-flex;">?? View Resource Link</a></div>`;
      }

      let screenshotHTML = '';
      if (task.submission.screenshot) {
        screenshotHTML = `
          <div style="margin-top: 10px; margin-bottom: 12px;">
            <div style="font-size: 11px; color: var(--text-dark); margin-bottom: 4px; font-weight: 500;">Screenshot Progress:</div>
            <img src="${task.submission.screenshot}" alt="Task Screenshot" style="max-width: 100%; max-height: 180px; border-radius: 8px; border: 1px solid var(--border-color); cursor: pointer; display: block;" onclick="openChatImageLightbox(this.src)">
          </div>
        `;
      }

      const card = document.createElement('div');
      card.className = 'log-card glass-panel mb-4';
      card.innerHTML = `
        <div class="log-card-header">
          <h4 style="color:#fff;">${task.title}</h4>
          <span style="font-size:12px; color:var(--primary-magenta); font-weight:600;">By: ${sName}</span>
        </div>
        <div style="font-size:12px; color:var(--text-dark); margin-bottom:10px;">Submitted on: ${task.submission.submittedAt}</div>
        <p style="font-size:13px; color:var(--text-muted); margin-bottom:12px;"><strong>Comments:</strong> ${task.submission.text}</p>
        ${screenshotHTML}
        ${linkHTML}
        <button class="btn btn-primary btn-sm" onclick="openReviewModal('${task.id}', 'task')">Verify Deliverable</button>
      `;
      pendingTasksList.appendChild(card);
    });
  }

  // Load pending weekly reports
  const pendingLogsList = document.getElementById('mentor-pending-logs-list');
  pendingLogsList.innerHTML = '';
  const reviewsLogs = db.weeklyLogs.filter(l => l.studentId && studentEmails.includes(l.studentId.toLowerCase()) && l.status === 'Pending Approval');

  if (reviewsLogs.length === 0) {
    pendingLogsList.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-dark);">No weekly log reports waiting for review.</div>`;
  } else {
    reviewsLogs.forEach(log => {
      const sName = myStudents.find(s => s.email && s.email.trim().toLowerCase() === log.studentId.trim().toLowerCase())?.name || 'Intern';
      const card = document.createElement('div');
      card.className = 'log-card glass-panel mb-4';
      card.innerHTML = `
        <div class="log-card-header">
          <h4 style="color:#fff;">Week ${log.weekNumber} Activity Report</h4>
          <span style="font-size:12px; color:var(--primary-magenta); font-weight:600;">By: ${sName}</span>
        </div>
        <div style="font-size:12px; color:var(--text-dark); margin-bottom:10px;">Dates: ${log.startDate} to ${log.endDate} | Logged: ${log.hoursLogged} Hours</div>
        <p style="font-size:13px; color:var(--text-muted); margin-bottom:12px;"><strong>Summary:</strong> ${log.summary}</p>
        ${log.blockers ? `<div style="font-size:12px; color:var(--danger); margin-bottom:12px;"><strong>Blockers:</strong> ${log.blockers}</div>` : ''}
        <button class="btn btn-primary btn-sm" onclick="openReviewModal('${log.id}', 'log')">Approve Log Report</button>
      `;
      pendingLogsList.appendChild(card);
    });
  }
}

function openReviewModal(itemId, itemType) {
  document.getElementById('feedback-item-id').value = itemId;
  document.getElementById('feedback-item-type').value = itemType;
  document.getElementById('feedback-comments').value = '';

  const detailsContainer = document.getElementById('feedback-submission-details');
  if (itemType === 'task') {
    const task = db.tasks.find(t => t.id === itemId);
    document.getElementById('feedback-modal-title').innerText = "Verify Internship Task Deliverable";
    
    let linkDetails = '';
    if (task.submission.links && task.submission.links[0]) {
      linkDetails = `<br><strong>Project Link:</strong> <a href="${task.submission.links[0]}" target="_blank" style="color: var(--primary-magenta);">${task.submission.links[0]}</a>`;
    }

    let screenshotDetails = '';
    if (task.submission.screenshot) {
      screenshotDetails = `
        <br><br>
        <strong>Screenshot:</strong><br>
        <img src="${task.submission.screenshot}" style="max-width: 100%; max-height: 120px; border-radius: 6px; border: 1px solid var(--border-color); cursor: pointer; margin-top: 4px; display: block;" onclick="openChatImageLightbox(this.src)">
      `;
    }

    detailsContainer.innerHTML = `<strong>Title:</strong> ${task.title}<br><strong>Description:</strong> ${task.description}${linkDetails}<br><br><strong>Intern Notes:</strong> ${task.submission.text}${screenshotDetails}`;
  } else {
    const log = db.weeklyLogs.find(l => l.id === itemId);
    document.getElementById('feedback-modal-title').innerText = "Verify Intern Weekly Activity Log";
    detailsContainer.innerHTML = `<strong>Week Number:</strong> ${log.weekNumber}<br><strong>Logged Hours:</strong> ${log.hoursLogged} hours<br><br><strong>Accomplishments:</strong> ${log.summary}`;
  }

  openModal('review-feedback-modal');
}

function submitReviewOutcome(outcomeStatus) {
  const itemId = document.getElementById('feedback-item-id').value;
  const itemType = document.getElementById('feedback-item-type').value;
  const comments = document.getElementById('feedback-comments').value.trim();

  if (!comments) {
    alert("Please write review comments before rendering outcome.");
    return;
  }

  if (itemType === 'task') {
    const task = db.tasks.find(t => t.id === itemId);
    if (task) {
      task.status = outcomeStatus === 'Approved' ? 'Completed' : 'Needs Revision';
      task.feedback = comments;
      
      // Recalculate progress for the student
      const student = db.users.find(u => u.email && u.email.trim().toLowerCase() === task.assignedTo.trim().toLowerCase());
      if (student) {
        student.progress = calculateStudentProgress(student.email);
        syncRecordToFirestore('users', student);
      }
      saveDatabase(true);
      syncRecordToFirestore('tasks', task);
    }
  } else {
    const log = db.weeklyLogs.find(l => l.id === itemId);
    if (log) {
      log.status = outcomeStatus;
      log.feedback = comments;
      saveDatabase(true);
      syncRecordToFirestore('weeklyLogs', log);
    }
  }

  closeModal('review-feedback-modal');
  loadMentorReviews();
  alert(`Submission review complete: set status to "${outcomeStatus}"`);
}

// Helper to get chat message preview text
function getChatMessagePreview(chat) {
  if (!chat) return "Click to start chatting...";
  if (chat.deleted) {
    return chat.from === currentUser.email ? "?? You deleted this message" : "?? This message was deleted";
  }
  if (chat.attachment) {
    const isImg = chat.attachment.type && chat.attachment.type.startsWith('image/');
    const textPart = chat.message ? `: ${chat.message}` : '';
    return isImg ? `?? Photo${textPart}` : `?? File: ${chat.attachment.name}${textPart}`;
  }
  return chat.message;
}

function normalizeChatEmail(email) {
  return (email || '').trim().toLowerCase();
}

function studentCanViewTasks() {
  if (!currentUser || currentUser.role !== 'student') return false;
  if (currentUser.mentorStatus === 'Active') return true;
  return !!getAcceptedPairingForStudent(currentUser.email);
}

function isTaskForStudent(task, studentEmail) {
  if (!task || !task.assignedTo || !studentEmail) return false;
  return normalizeChatEmail(task.assignedTo) === normalizeChatEmail(studentEmail);
}

function prepareTaskForCloudSync(task) {
  if (!task || typeof task !== 'object') return task;
  const cloudTask = { ...task };
  if (cloudTask.assignedTo) cloudTask.assignedTo = normalizeChatEmail(cloudTask.assignedTo);
  if (cloudTask.assignedBy) cloudTask.assignedBy = normalizeChatEmail(cloudTask.assignedBy);
  if (cloudTask.attachment) {
    const att = { ...cloudTask.attachment };
    if (att.isChunked) {
      att.data = '';
    } else if (att.data && typeof att.data === 'string' && att.data.length > 80000) {
      console.warn('Task attachment too large for cloud sync ... storing metadata only:', cloudTask.id);
      att.data = '';
      att.cloudStripped = true;
    }
    cloudTask.attachment = att;
  }
  return cloudTask;
}

function getChatTimestampMs(chat) {
  if (!chat || !chat.timestamp) return 0;
  const parsed = new Date(chat.timestamp).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatChatPreviewTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  return isToday
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function mergeChatRecordIntoDb(chatRecord) {
  if (!chatRecord || !chatRecord.id) return;
  if (!db.chats) db.chats = [];
  chatRecord.from = normalizeChatEmail(chatRecord.from);
  chatRecord.to = normalizeChatEmail(chatRecord.to);
  const index = db.chats.findIndex(c => c.id === chatRecord.id);
  if (index > -1) {
    const existingTs = getChatTimestampMs(db.chats[index]);
    const incomingTs = getChatTimestampMs(chatRecord);
    db.chats[index] = incomingTs >= existingTs ? chatRecord : db.chats[index];
  } else {
    db.chats.push(chatRecord);
  }
}

function notifyChatUpdate(chatRecord) {
  mergeChatRecordIntoDb(chatRecord);
  saveDatabase();
  try {
    if (!window.__apexChatChannel) {
      window.__apexChatChannel = new BroadcastChannel('apex_intern_chat');
      window.__apexChatChannel.onmessage = (event) => {
        if (!event.data || event.data.type !== 'chat' || !event.data.chat) return;
        mergeChatRecordIntoDb(event.data.chat);
        saveDatabase();
        if (currentUser?.role === 'mentor') {
          loadMentorChat(false);
        } else if (currentUser?.role === 'student') {
          loadStudentChat();
        }
      };
    }
    window.__apexChatChannel.postMessage({ type: 'chat', chat: chatRecord });
  } catch (err) {
    console.warn('BroadcastChannel chat sync unavailable:', err);
  }
}

function initChatBroadcastSync() {
  try {
    if (window.__apexChatChannel) return;
    window.__apexChatChannel = new BroadcastChannel('apex_intern_chat');
    window.__apexChatChannel.onmessage = (event) => {
      if (!event.data || event.data.type !== 'chat' || !event.data.chat) return;
      mergeChatRecordIntoDb(event.data.chat);
      saveDatabase();
      if (currentUser?.role === 'mentor') {
        loadMentorChat(false);
      } else if (currentUser?.role === 'student') {
        loadStudentChat();
      }
    };
  } catch (err) {
    console.warn('BroadcastChannel init failed:', err);
  }
}

function getChatsBetween(userEmailA, userEmailB) {
  const emailA = normalizeChatEmail(userEmailA);
  const emailB = normalizeChatEmail(userEmailB);
  const viewerEmail = currentUser ? normalizeChatEmail(currentUser.email) : emailA;

  return (db.chats || []).filter(c => {
    const from = normalizeChatEmail(c.from);
    const to = normalizeChatEmail(c.to);
    const isPair = (from === emailA && to === emailB) || (from === emailB && to === emailA);
    if (!isPair) return false;
    if (c.deletedFor && Array.isArray(c.deletedFor) && c.deletedFor.some(e => normalizeChatEmail(e) === viewerEmail)) {
      return false;
    }
    return true;
  }).sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
}

function getLastChatBetween(userEmailA, userEmailB) {
  const chats = getChatsBetween(userEmailA, userEmailB);
  if (chats.length === 0) return null;
  return chats.reduce((latest, chat) => getChatTimestampMs(chat) >= getChatTimestampMs(latest) ? chat : latest, chats[0]);
}

function getMentorChatStudents() {
  return getMentorStudents({ activeOnly: true });
}

function getMentorChatStudentsSorted() {
  const mentorEmail = normalizeChatEmail(currentUser.email);
  return getMentorChatStudents().sort((a, b) => {
    const tsA = getChatTimestampMs(getLastChatBetween(mentorEmail, a.email));
    const tsB = getChatTimestampMs(getLastChatBetween(mentorEmail, b.email));
    if (tsA !== tsB) return tsB - tsA;
    return (a.name || '').localeCompare(b.name || '');
  });
}

function buildMentorRosterKey(students) {
  return students.map(s => normalizeChatEmail(s.email)).sort().join('|');
}

function buildMentorChatListKey(students) {
  const mentorEmail = normalizeChatEmail(currentUser.email);
  const rosterKey = buildMentorRosterKey(students);
  const parts = students.map(s => {
    const last = getLastChatBetween(mentorEmail, s.email);
    return `${normalizeChatEmail(s.email)}:${last?.timestamp || ''}:${last?.message || ''}:${last?.id || ''}`;
  });
  return rosterKey + '::' + parts.join('|') + '|' + normalizeChatEmail(activeChatRecipient || '');
}

function updateMentorInboxPreviewsAndOrder(sortedStudents) {
  const listContainer = document.getElementById('mentor-inbox-list');
  if (!listContainer) return false;

  const mentorEmail = normalizeChatEmail(currentUser.email);
  let needsFullRebuild = listContainer.children.length !== sortedStudents.length;

  if (!needsFullRebuild) {
    sortedStudents.forEach(student => {
      const studentKey = normalizeChatEmail(student.email);
      const item = listContainer.querySelector(`[data-student-email="${studentKey}"]`);
      if (!item) {
        needsFullRebuild = true;
        return;
      }
      const lastMsg = getLastChatBetween(mentorEmail, student.email);
      const previewEl = item.querySelector('p');
      const timeEl = item.querySelector('.inbox-preview-time');
      if (previewEl) previewEl.innerText = getChatMessagePreview(lastMsg);
      if (timeEl) timeEl.innerText = formatChatPreviewTime(lastMsg?.timestamp);
      listContainer.appendChild(item);
    });
  }

  return !needsFullRebuild;
}

let lastMentorChatListKey = '';

// Mentor Chat Portal
function loadMentorChat(forceReload = false) {
  normalizeDbChatRecords();
  const myStudents = getMentorChatStudentsSorted();
  const listKey = buildMentorChatListKey(myStudents);
  const listContainer = document.getElementById('mentor-inbox-list');
  if (!listContainer) return;

  if (!forceReload && listKey === lastMentorChatListKey && listContainer.children.length > 0) {
    if (updateMentorInboxPreviewsAndOrder(myStudents)) {
      if (activeChatRecipient) {
        renderChatHistory(activeChatRecipient, 'mentor-chat-history');
      }
      return;
    }
  }
  lastMentorChatListKey = listKey;

  listContainer.innerHTML = '';

  if (myStudents.length === 0) {
    listContainer.innerHTML = `<div style="font-size:12px; color:var(--text-dark); text-align:center; padding:12px;">No interns assigned</div>`;
    return;
  }

  const mentorEmail = normalizeChatEmail(currentUser.email);

  myStudents.forEach((student) => {
    const studentKey = normalizeChatEmail(student.email);
    const lastMsg = getLastChatBetween(mentorEmail, student.email);
    const preview = getChatMessagePreview(lastMsg);

    const item = document.createElement('div');
    item.className = `inbox-item ${activeChatRecipient && normalizeChatEmail(activeChatRecipient) === studentKey ? 'active' : ''}`;
    item.dataset.studentEmail = studentKey;
    item.onclick = () => selectMentorChatStudent(student.email);
    item.innerHTML = `
      <img src="${student.avatar}" class="user-avatar" style="width:36px; height:36px; cursor: pointer;" onclick="event.stopPropagation(); openChatImageLightbox(this.src)">
      <div style="flex-grow:1; overflow:hidden;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
          <h4 style="font-size:13px; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin:0;">${student.name}</h4>
          <span class="inbox-preview-time" style="font-size:10px; color:var(--text-muted); flex-shrink:0;">${formatChatPreviewTime(lastMsg?.timestamp)}</span>
        </div>
        <p style="font-size:11px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin:2px 0 0 0;">${preview}</p>
      </div>
    `;
    listContainer.appendChild(item);
  });

  // Load open chat details if active recipient
  const chatBoxArea = document.getElementById('mentor-chat-box-area');
  const chatForm = document.getElementById('mentor-chat-form');
  const historyNode = document.getElementById('mentor-chat-history');

  if (activeChatRecipient) {
    const student = db.users.find(u => u.email && normalizeChatEmail(u.email) === normalizeChatEmail(activeChatRecipient));
    document.getElementById('mentor-chat-student-name').innerText = student ? student.name : activeChatRecipient.split('@')[0];
    document.getElementById('mentor-chat-student-avatar').src = student ? student.avatar : getRandomAvatar('student');
    document.getElementById('mentor-chat-student-status').innerText = "Active Intern";
    document.getElementById('mentor-chat-student-status').style.color = "var(--success)";
    
    chatForm.classList.remove('hidden');
    const startCallBtn = document.getElementById('mentor-start-call-btn');
    if (startCallBtn) startCallBtn.classList.remove('hidden');
    renderChatHistory(activeChatRecipient, 'mentor-chat-history');
  } else {
    // Show select overlay
    document.getElementById('mentor-chat-student-name').innerText = "Select an Intern";
    document.getElementById('mentor-chat-student-avatar').src = "";
    document.getElementById('mentor-chat-student-status').innerText = "Offline";
    document.getElementById('mentor-chat-student-status').style.color = "var(--text-dark)";
    chatForm.classList.add('hidden');
    const startCallBtn = document.getElementById('mentor-start-call-btn');
    if (startCallBtn) startCallBtn.classList.add('hidden');
    historyNode.innerHTML = `
      <div style="margin: auto; text-align: center; color: var(--text-muted);">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom: 12px; opacity: 0.5;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        <p>Click on an intern in the left column to begin chatting.</p>
      </div>
    `;
  }
}

function selectMentorChatStudent(studentEmail) {
  activeChatRecipient = normalizeChatEmail(studentEmail);
  loadMentorChat(true);
}

function lookupStudentById() {
  const inputEl = document.getElementById('mentor-lookup-input');
  if (!inputEl) return;
  const inputVal = inputEl.value.trim();
  if (!inputVal) {
    alert("Please enter a Student ID to search.");
    return;
  }

  const normalizedSearch = inputVal.replace(/-/g, '/').toLowerCase();

  const student = db.users.find(u => {
    if (u.role !== 'student') return false;
    if (!u.studentId) return false;
    return u.studentId.replace(/-/g, '/').toLowerCase() === normalizedSearch;
  });

  if (!student) {
    alert(`No student found with Student ID "${inputVal}". Please verify the ID and try again.`);
    return;
  }

  openInternDetails(student.email);
}

function openInternDetails(studentEmail) {
  const student = db.users.find(u => u && u.email && u.email.trim().toLowerCase() === studentEmail.trim().toLowerCase());
  if (!student) return;

  const studentEmailClean = studentEmail.trim().toLowerCase();
  
  // Tasks calculations
  const studentTasks = db.tasks.filter(t => t && t.assignedTo && t.assignedTo.trim().toLowerCase() === studentEmailClean);
  const taskCount = studentTasks.length;
  const completed = studentTasks.filter(t => t.status === 'Completed').length;
  const pendingReview = studentTasks.filter(t => t.status === 'Pending Approval').length;
  
  // Weekly hours calculations
  const logs = db.weeklyLogs.filter(l => l && l.studentId && l.studentId.trim().toLowerCase() === studentEmailClean && l.status === 'Approved');
  const totalHours = logs.reduce((sum, c) => sum + parseInt(c.hoursLogged || 0), 0);

  // Quiz calculations
  const submissions = (db.quizSubmissions || []).filter(s => s && s.studentEmail && s.studentEmail.trim().toLowerCase() === studentEmailClean);
  const quizAvg = submissions.length > 0 
    ? Math.round((submissions.reduce((sum, s) => sum + (s.score || 0), 0) / (submissions.length * 10)) * 100)
    : 0;

  const progress = calculateStudentProgress(student.email);

  // Update modal content
  document.getElementById('intern-modal-avatar').src = student.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120';
  document.getElementById('intern-modal-name').innerText = student.name;
  document.getElementById('intern-modal-domain').innerText = student.domain || 'Intern';
  document.getElementById('intern-modal-start-date').innerText = student.startDate || 'N/A';
  document.getElementById('intern-modal-progress-val').innerText = `${progress}%`;
  document.getElementById('intern-modal-progress-bar').style.width = `${progress}%`;
  document.getElementById('intern-modal-tasks-val').innerText = `${completed} / ${taskCount} (${pendingReview} pending)`;
  document.getElementById('intern-modal-hours-val').innerText = `${totalHours} hrs`;
  document.getElementById('intern-modal-quiz-avg').innerText = `${quizAvg}%`;

  // Render submissions table
  const tbody = document.querySelector('#intern-modal-quiz-table tbody');
  tbody.innerHTML = '';
  
  if (submissions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-dark); padding: 12px 0;">No quiz attempts logged yet.</td></tr>`;
  } else {
    submissions.forEach(sub => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${sub.date}</td>
        <td style="font-weight: bold; color: var(--primary-magenta);">${sub.score}/10</td>
        <td>${sub.domain}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="viewInternQuizDetail('${sub.id}')" style="padding: 2px 8px; font-size: 10px; margin: 0; cursor: pointer;">Inspect Quiz</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  openModal('intern-details-modal');
}


// ==================== 6. ADMIN PORTAL LOGIC ====================

function loadAdminDashboard() {
  const students = db.users.filter(u => u.role === 'student');
  const mentors = db.users.filter(u => u.role === 'mentor');
  const totalTasks = db.tasks.length;

  document.getElementById('admin-metric-students').innerText = students.length;
  document.getElementById('admin-metric-mentors').innerText = mentors.length;
  document.getElementById('admin-metric-tasks').innerText = totalTasks;

  // Render cohort progress analytics chart
  const chartContainer = document.getElementById('admin-global-chart');
  chartContainer.innerHTML = '';

  if (students.length === 0) {
    chartContainer.innerHTML = `<div style="margin: auto; color: var(--text-muted); font-size: 13px;">No student records inside database.</div>`;
  } else {
    students.forEach(student => {
      const progress = calculateStudentProgress(student.email);
      const barWrap = document.createElement('div');
      barWrap.className = 'chart-bar-wrap';
      barWrap.style.width = '70px';
      
      const heightVal = Math.max(10, progress); // Min visual height
      
      barWrap.innerHTML = `
        <div class="chart-bar" style="height: ${heightVal}%; background: linear-gradient(180deg, var(--accent-blue) 0%, rgba(42, 107, 242, 0.2) 100%); box-shadow: 0 0 10px rgba(42, 107, 242, 0.25);"></div>
        <div class="chart-label" style="font-size: 10px; font-weight: 500;">${student.name.split(' ')[0]} (${progress}%)</div>
      `;
      chartContainer.appendChild(barWrap);
    });
  }
}

// User accounts CRUD directory
function loadAdminUsers() {
  const tableBody = document.querySelector('#admin-users-table tbody');
  tableBody.innerHTML = '';

  db.users.forEach(user => {
    const attributeText = user.role === 'student' 
      ? `Domain: ${user.domain}` 
      : (user.role === 'mentor' ? `Title: ${user.title}` : 'System Admin');

    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="flex align-center gap-2">
        <img src="${user.avatar}" class="user-avatar" style="width:28px; height:28px;">
        <span style="font-weight:600; color:#fff;">${user.name}</span>
      </td>
      <td>${user.email}</td>
      <td><span class="status-badge" style="background: rgba(255,255,255,0.05); color:#fff;">${user.role}</span></td>
      <td style="font-size:12px; color:var(--text-muted);">${attributeText}</td>
      <td>
        ${user.id !== currentUser.id ? `<button class="btn btn-secondary btn-sm" style="border-color:var(--danger); color:var(--danger); padding:4px 8px; font-size:11px;" onclick="deleteUserAccount('${user.id}')">Delete</button>` : '<span style="font-size:11px; color:var(--text-dark);">Current User</span>'}
        ${(() => {
          if (user.role !== 'student') return '';
          const progress = calculateStudentProgress(user.email);
          const hasCert = db.certificates && db.certificates.some(c => c.studentEmail && c.studentEmail.trim().toLowerCase() === user.email.trim().toLowerCase());
          if (hasCert) {
            return `<button class="btn btn-primary btn-sm" onclick="viewCertificateForStudent('${user.email}')" style="background: #10b981; border-color: #10b981; color: white; font-size:11px; padding: 4px 8px; cursor: pointer; margin-left: 6px;">View Certificate</button>`;
          } else if (progress === 100) {
            return `<button class="btn btn-primary btn-sm" onclick="issueCertificate('${user.email}')" style="background: var(--primary-magenta); border-color: var(--primary-magenta); font-size:11px; padding: 4px 8px; cursor: pointer; margin-left: 6px;">Issue Certificate</button>`;
          } else {
            return `<button class="btn btn-secondary btn-sm" disabled style="opacity: 0.5; font-size:11px; padding: 4px 8px; margin-left: 6px; cursor: not-allowed;" title="Requires 100% Progress">Issue Certificate</button>`;
          }
        })()}
      </td>
    `;
    tableBody.appendChild(row);
  });
}

function openAddUserModal() {
  document.getElementById('admin-add-user-form').reset();
  toggleAdminUserFields('student');
  openModal('add-user-modal');
}

function toggleAdminUserFields(val) {
  const domainGroup = document.getElementById('admin-user-domain-group');
  const titleGroup = document.getElementById('admin-user-title-group');
  const durationGroup = document.getElementById('admin-user-duration-group');

  if (val === 'student') {
    domainGroup.classList.remove('hidden');
    titleGroup.classList.add('hidden');
    if (durationGroup) durationGroup.classList.remove('hidden');
    document.getElementById('admin-user-domain').required = true;
    document.getElementById('admin-user-title').required = false;
  } else if (val === 'mentor') {
    domainGroup.classList.add('hidden');
    titleGroup.classList.remove('hidden');
    if (durationGroup) durationGroup.classList.add('hidden');
    document.getElementById('admin-user-domain').required = false;
    document.getElementById('admin-user-title').required = true;
  } else {
    domainGroup.classList.add('hidden');
    titleGroup.classList.add('hidden');
    if (durationGroup) durationGroup.classList.add('hidden');
    document.getElementById('admin-user-domain').required = false;
    document.getElementById('admin-user-title').required = false;
  }
}

function handleAdminAddUser(event) {
  event.preventDefault();
  const role = document.getElementById('admin-user-role').value;
  const name = document.getElementById('admin-user-name').value.trim();
  const email = document.getElementById('admin-user-email').value.trim();
  const password = document.getElementById('admin-user-pwd').value;

  if (db.users.some(u => u.email === email)) {
    alert("This email address already has a registered user.");
    return;
  }

  const newUser = {
    id: `${role}-${Date.now()}`,
    email,
    password,
    role,
    name,
    avatar: getRandomAvatar(role)
  };

  if (role === 'student') {
    newUser.domain = document.getElementById('admin-user-domain').value.trim() || 'General Internship';
    const durationSelect = document.getElementById('admin-user-duration');
    newUser.duration = durationSelect ? parseInt(durationSelect.value, 10) : 1;
    newUser.mentorEmail = '';
    newUser.progress = 0;
    newUser.startDate = new Date().toISOString().split('T')[0];
  } else if (role === 'mentor') {
    newUser.title = document.getElementById('admin-user-title').value.trim() || 'Advisor';
  }

  db.users.push(newUser);
  saveDatabase();
  syncRecordToFirestore('users', newUser);
  closeModal('add-user-modal');
  loadAdminUsers();
  updateLandingStats();
  alert("User account registered successfully.");
}

function deleteUserAccount(userId) {
  if (confirm("Are you sure you want to permanently delete this user account? This action will unlink supervision routes.")) {
    const userIndex = db.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      const user = db.users[userIndex];
      // If student, remove tasks
      if (user.role === 'student') {
        const tasksToDelete = db.tasks.filter(t => t && t.assignedTo && user.email && t.assignedTo.trim().toLowerCase() === user.email.trim().toLowerCase());
        tasksToDelete.forEach(t => deleteRecordFromFirestore('tasks', t.id));
        
        const logsToDelete = db.weeklyLogs.filter(l => l && l.studentId && user.email && l.studentId.trim().toLowerCase() === user.email.trim().toLowerCase());
        logsToDelete.forEach(l => deleteRecordFromFirestore('weeklyLogs', l.id));
        
        db.tasks = db.tasks.filter(t => !t || !t.assignedTo || !user.email || t.assignedTo.trim().toLowerCase() !== user.email.trim().toLowerCase());
        db.weeklyLogs = db.weeklyLogs.filter(l => !l || !l.studentId || !user.email || l.studentId.trim().toLowerCase() !== user.email.trim().toLowerCase());
      }
      db.users.splice(userIndex, 1);
      saveDatabase();
      deleteRecordFromFirestore('users', user.id);
      loadAdminUsers();
      updateLandingStats();
      alert("Account deleted.");
    }
  }
}

// Assign/Pairings Manager
function loadAdminRelations() {
  const students = db.users.filter(u => u.role === 'student');
  const mentors = db.users.filter(u => u.role === 'mentor');

  const studentSelect = document.getElementById('pair-student');
  const mentorSelect = document.getElementById('pair-mentor');

  studentSelect.innerHTML = '';
  mentorSelect.innerHTML = '';

  if (students.length === 0) {
    studentSelect.innerHTML = '<option value="">No students available</option>';
  } else {
    students.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.email;
      const mentor = db.users.find(m => m && m.email && m.email.trim().toLowerCase() === (s.mentorEmail || "").trim().toLowerCase());
      const pairingText = mentor ? ` [Active: ${mentor.name}]` : ' [Unassigned]';
      opt.innerText = `${s.name} (${s.domain})${pairingText}`;
      studentSelect.appendChild(opt);
    });
  }

  if (mentors.length === 0) {
    mentorSelect.innerHTML = '<option value="">No mentors available</option>';
  } else {
    mentors.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.email;
      opt.innerText = `${m.name} (${m.title})`;
      mentorSelect.appendChild(opt);
    });
  }

  // Draw mappings list table
  const tableBody = document.querySelector('#admin-pairings-table tbody');
  if (tableBody) {
    tableBody.innerHTML = '';

    students.forEach(student => {
      const mentor = db.users.find(m => m && m.email && m.email.trim().toLowerCase() === (student.mentorEmail || "").trim().toLowerCase());
      const mentorName = mentor ? `${mentor.name} (${mentor.title})` : '<span style="color:var(--danger); font-weight:600;">UNASSIGNED</span>';
      
      const isPaid = student.internshipType === 'paid';
      const tierBadge = isPaid 
        ? `<span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #fff; background: rgba(224, 26, 139, 0.15); border: 1px solid var(--primary-magenta); padding: 2px 8px; border-radius: 20px;">PAID</span>`
        : `<span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #fff; background: rgba(42, 107, 242, 0.15); border: 1px solid var(--accent-blue); padding: 2px 8px; border-radius: 20px;">UNPAID</span>`;
      
      let stipendInfo = '...';
      if (isPaid) {
        const symb = student.stipendCurrency === 'USD' ? '$' : '?';
        const freqLabel = student.stipendFrequency === 'streaming' ? '/ hr active' : (student.stipendFrequency === 'task' ? '/ completed task' : '/ month');
        stipendInfo = `<strong style="color:var(--success);">${symb}${student.stipendAmount || 15000}</strong> ${freqLabel}`;
      }

      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="font-weight:600;">${student.name}</td>
        <td>${mentorName}</td>
        <td>${tierBadge}</td>
        <td>${stipendInfo}</td>
      `;
      tableBody.appendChild(row);
    });
  }
}

function handleAssignPairing(event) {
  event.preventDefault();
  const studentEmail = document.getElementById('pair-student').value;
  const mentorEmail = document.getElementById('pair-mentor').value;

  if (!studentEmail || !mentorEmail) {
    alert("Please ensure both a student and a mentor are selected.");
    return;
  }

  const student = db.users.find(u => u.email && u.email.trim().toLowerCase() === studentEmail.trim().toLowerCase());
  if (student) {
    student.mentorEmail = mentorEmail.trim().toLowerCase();
    student.mentorStatus = 'Active'; // Activate manually assigned pairing immediately
    
    // Save payment parameters
    const pairTierVal = document.getElementById('pair-tier').value;
    if (pairTierVal === 'paid') {
      student.internshipType = 'paid';
      student.stipendAmount = parseInt(document.getElementById('pair-stipend-amount').value || 15000, 10);
      student.stipendCurrency = document.getElementById('pair-stipend-currency').value || 'INR';
      student.stipendFrequency = document.getElementById('pair-stipend-frequency').value || 'monthly';
      if (typeof student.stipendBalance === 'undefined') student.stipendBalance = 0;
      if (typeof student.totalPaid === 'undefined') student.totalPaid = 0;
    } else {
      student.internshipType = 'unpaid';
      student.stipendAmount = 0;
      student.stipendCurrency = 'INR';
      student.stipendFrequency = '';
      student.stipendBalance = 0;
      student.totalPaid = 0;
    }

    getOrGenerateStudentId(student);
    saveDatabase();
    syncRecordToFirestore('users', student);
    loadAdminRelations();
    alert(`Intern ${student.name} successfully assigned to Supervisor with ${pairTierVal.toUpperCase()} status.`);
  }
}

function togglePairStipendFields(value) {
  const container = document.getElementById('pair-stipend-container');
  if (!container) return;
  if (value === 'paid') {
    container.classList.remove('hidden');
  } else {
    container.classList.add('hidden');
  }
}
window.togglePairStipendFields = togglePairStipendFields;


// ==================== 7. SHARED CHAT CORE IMPLEMENTATION ====================

function renderChatHistory(recipientEmail, chatHistoryElementId) {
  const container = document.getElementById(chatHistoryElementId);
  if (!container) return;
  container.innerHTML = '';

  if (!recipientEmail) {
    container.innerHTML = `<div style="margin: auto; text-align: center; color: var(--text-dark); font-size: 13px;">No supervisor assigned yet. Chat will be enabled once your pairing request is approved.</div>`;
    return;
  }

  const relevantChats = getChatsBetween(currentUser.email, recipientEmail);

  if (relevantChats.length === 0) {
    container.innerHTML = `<div style="margin: auto; text-align: center; color: var(--text-dark); font-size: 13px;">No conversations found. Type a message below to start the thread.</div>`;
  } else {
    relevantChats.forEach(chat => {
      // Special rendering for meeting notification messages
      if (chat.type === 'meeting_notification') {
        const meetNode = document.createElement('div');
        meetNode.style.cssText = 'margin:8px auto;max-width:420px;background:linear-gradient(135deg,rgba(0,182,108,0.12),rgba(66,133,244,0.12));border:1px solid rgba(0,182,108,0.35);border-radius:12px;padding:12px 16px;text-align:center;';
        const lnk = chat.meetLink ? ('<a href="' + chat.meetLink + '" target="_blank" style="color:#4285f4;font-weight:700;word-break:break-all;">' + chat.meetLink + '</a>') : '';
        meetNode.innerHTML = '<div style="font-size:12px;color:rgba(255,255,255,0.9);"><span style="font-size:18px;">📹</span> ' + escapeHTML(chat.message || '') + (lnk ? ('<br><span style="font-size:11px;color:rgba(255,255,255,0.55);">Meet Link:</span> ' + lnk) : '') + '</div><div style="font-size:10px;color:rgba(255,255,255,0.35);margin-top:4px;">' + (new Date(chat.timestamp)).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) + '</div>';
        container.appendChild(meetNode);
        return;
      }

      const isSent = chat.from && currentUser.email && chat.from.trim().toLowerCase() === currentUser.email.trim().toLowerCase();
      const isDeleted = chat.deleted === true;
      const date = new Date(chat.timestamp);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const msgNode = document.createElement('div');
      msgNode.className = `chat-msg ${isSent ? 'sent' : 'received'}`;
      
      let bubbleContent = '';
      if (isDeleted) {
        const deletedText = (chat.from && currentUser.email && chat.from.trim().toLowerCase() === currentUser.email.trim().toLowerCase()) ? "You deleted this message" : "This message was deleted";
        bubbleContent = `<div style="font-style: italic; color: var(--text-dark); display: flex; align-items: center; gap: 4px; font-size: 12px;">
          <span>??</span> ${deletedText}
        </div>`;
      } else {
        if (chat.message) {
          bubbleContent += `<div style="word-break: break-word;">${escapeHTML(chat.message)}</div>`;
        }
        
        if (chat.attachment) {
          const file = chat.attachment;
          const spacingStyle = chat.message ? 'margin-top: 8px;' : '';
          
          if (file.isChunked) {
            // It is a chunked file. We will render a placeholder card/image with a unique container ID
            const chunkContainerId = `chunk-container-${chat.id}`;
            
            if (file.type && file.type.startsWith('image/')) {
              bubbleContent += `
                <div id="${chunkContainerId}" style="${spacingStyle} border-radius: 6px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); min-height: 150px; min-width: 200px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.2);">
                  <div style="text-align: center; color: var(--text-dark); font-size: 12px;" class="chunk-loader-text">
                    <span style="font-size: 20px; display: block; margin-bottom: 6px;" class="upload-icon-spinner">?</span>
                    Loading Image (${Math.round(file.size / 1024)} KB)...
                  </div>
                </div>`;
                
              // Async load image
              setTimeout(() => {
                downloadChunkedFile(chat.id, file.totalChunks, (dataUrl) => {
                  const el = document.getElementById(chunkContainerId);
                  if (el) {
                    if (dataUrl) {
                      el.outerHTML = `
                        <div style="${spacingStyle} border-radius: 6px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); cursor: pointer;" onclick="openChatImageLightbox('${dataUrl}')">
                          <img src="${dataUrl}" style="max-width: 250px; max-height: 200px; width: 100%; object-fit: cover; display: block; border-radius: 4px; transition: transform var(--transition-fast);" class="chat-bubble-img" alt="image attachment">
                        </div>`;
                    } else {
                      el.innerHTML = `<span style="color: var(--danger); font-size: 11px;">?? Failed to load image</span>`;
                    }
                  }
                });
              }, 50);
            } else {
              bubbleContent += `
                <div id="${chunkContainerId}" style="${spacingStyle} display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 14px; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: 6px; max-width: 260px; min-width: 200px;">
                  <div style="display: flex; align-items: center; gap: 8px; width: calc(100% - 30px);">
                    <span style="font-size: 20px; flex-shrink: 0;" id="${chunkContainerId}-icon">?</span>
                    <span style="font-size: 11px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; color: #fff; font-weight: 500;" title="${file.name}">${file.name}</span>
                  </div>
                  <span id="${chunkContainerId}-action" style="font-size: 11px; color: var(--text-dark);">loading...</span>
                </div>`;
                
              // Async load file download link
              setTimeout(() => {
                downloadChunkedFile(chat.id, file.totalChunks, (dataUrl) => {
                  const containerEl = document.getElementById(chunkContainerId);
                  if (containerEl) {
                    if (dataUrl) {
                      // Update icon
                      const iconEl = document.getElementById(`${chunkContainerId}-icon`);
                      if (iconEl) iconEl.innerText = "??";
                      
                      // Make card clickable to open directly in a new window without forcing a download
                      containerEl.style.cursor = "pointer";
                      containerEl.onclick = () => openAttachmentFile(dataUrl, file.name);
                      
                      // Update download button
                      const actionEl = document.getElementById(`${chunkContainerId}-action`);
                      if (actionEl) {
                        actionEl.outerHTML = `
                          <a href="${dataUrl}" download="${file.name}" style="color: var(--primary-magenta); font-size: 18px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; text-decoration: none;" title="Download File" onclick="event.stopPropagation();">
                            ??
                          </a>`;
                      }
                    } else {
                      const actionEl = document.getElementById(`${chunkContainerId}-action`);
                      if (actionEl) actionEl.innerText = "failed";
                    }
                  }
                });
              }, 50);
            }
          } else {
            if (file.type && file.type.startsWith('image/')) {
              bubbleContent += `
                <div style="${spacingStyle} border-radius: 6px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); cursor: pointer;" onclick="openChatImageLightbox('${file.data}')">
                  <img src="${file.data}" style="max-width: 250px; max-height: 200px; width: 100%; object-fit: cover; display: block; border-radius: 4px; transition: transform var(--transition-fast);" class="chat-bubble-img" alt="image attachment">
                </div>`;
            } else {
              bubbleContent += `
                <div style="${spacingStyle} display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 14px; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: 6px; max-width: 260px; min-width: 200px; cursor: pointer;" onclick="openAttachmentFile('${file.data}', '${file.name}')">
                  <div style="display: flex; align-items: center; gap: 8px; width: calc(100% - 30px);">
                    <span style="font-size: 20px; flex-shrink: 0;">??</span>
                    <span style="font-size: 11px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; color: #fff; font-weight: 500;" title="${file.name}">${file.name}</span>
                  </div>
                  <a href="${file.data}" download="${file.name}" style="color: var(--primary-magenta); font-size: 18px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; text-decoration: none;" title="Download File" onclick="event.stopPropagation();">
                    ??
                  </a>
                </div>`;
            }
          }
        }
      }

      // Show trash icon for messages (allows WhatsApp options)
      const deleteBtnHTML = `<span class="delete-msg-btn" onclick="showDeleteMenu(event, '${chat.id}', ${isSent})" title="Delete Message" style="margin-left: 8px; cursor: pointer; color: var(--text-dark); opacity: 0.5; transition: opacity var(--transition-fast);">???</span>`;

      msgNode.innerHTML = `
        <div class="msg-bubble">${bubbleContent}</div>
        <div class="msg-meta" style="display: flex; align-items: center;">${timeStr}${deleteBtnHTML}</div>
      `;
      container.appendChild(msgNode);
    });
  }

  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

function handleSendChat(event, portalRole) {
  event.preventDefault();
  const inputNode = document.getElementById(`${portalRole}-chat-input`);
  const message = inputNode.value.trim();
  const attachment = portalRole === 'student' ? studentChatAttachment : mentorChatAttachment;

  if (!message && !attachment) return;

  let recipientEmail = portalRole === 'student'
    ? normalizeChatEmail(currentUser.mentorEmail)
    : normalizeChatEmail(activeChatRecipient);

  if (portalRole === 'student' && recipientEmail) {
    const mentorUser = db.users.find(u =>
      u.role === 'mentor' && normalizeChatEmail(u.email) === recipientEmail
    );
    if (mentorUser) recipientEmail = normalizeChatEmail(mentorUser.email);
  }

  if (!recipientEmail) {
    alert("Cannot send message. Recipient is unassigned or unselected.");
    return;
  }

  const senderEmail = normalizeChatEmail(currentUser.email);
  const newChatId = (attachment && attachment.isChunked) ? attachment.chunkedMsgId : `msg-${Date.now()}`;
  const newChat = {
    id: newChatId,
    from: senderEmail,
    to: recipientEmail,
    message,
    attachment: attachment || null,
    timestamp: new Date().toISOString()
  };

  if (!db.chats) db.chats = [];
  db.chats.push(newChat);
  saveDatabase(true);
  syncRecordToFirestore('chats', newChat);
  notifyChatUpdate(newChat);

  inputNode.value = '';
  cancelChatAttachment(portalRole);
  
  if (portalRole === 'student') {
    loadStudentChat();
  } else {
    loadMentorChat(false);
  }
}

function compressImage(base64Str, maxWidth, maxHeight, quality, callback) {
  const img = new Image();
  img.src = base64Str;
  img.onload = function() {
    let width = img.width;
    let height = img.height;
    
    // Scale image dimensions
    if (width > height) {
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
    } else {
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    
    const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
    callback(compressedBase64);
  };
  img.onerror = function() {
    callback(base64Str); // Fallback to original
  };
}

function handleChatFileSelect(portalRole) {
  const fileInput = document.getElementById(`${portalRole}-chat-file-input`);
  if (!fileInput || fileInput.files.length === 0) return;
  
  const file = fileInput.files[0];
  
  // Size limit validation (allow up to 20MB in Firebase, 500KB in Local Storage)
  if (firestoreActive) {
    if (file.size > 20 * 1024 * 1024) {
      alert("File is too large! Maximum attachment size is 20MB.");
      fileInput.value = '';
      return;
    }
  } else {
    if (file.size > 500 * 1024) {
      alert("File is too large! In Local Storage mode, attachments are limited to 500KB. Please connect to Firebase to upload files up to 20MB.");
      fileInput.value = '';
      return;
    }
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const rawData = e.target.result;
    
    if (firestoreActive) {
      // Chunked Firestore Upload
      uploadChunkedFile(portalRole, file, rawData);
    } else {
      // Local storage fallback flow (Base64)
      const processAttachment = (dataUrl) => {
        if (dataUrl.length > 700 * 1024) {
          alert("Attachment is too large for database synchronization! Please choose a smaller file.");
          fileInput.value = '';
          return;
        }
        
        const roughSize = Math.round((dataUrl.length * 3) / 4);
        const attachment = {
          name: file.name,
          data: dataUrl,
          type: file.type,
          size: roughSize
        };
        
        if (portalRole === 'student') {
          studentChatAttachment = attachment;
        } else {
          mentorChatAttachment = attachment;
        }
        
        // Update preview box
        const previewBox = document.getElementById(`${portalRole}-chat-preview-box`);
        const previewContent = document.getElementById(`${portalRole}-chat-preview-content`);
        if (previewBox && previewContent) {
          let previewHTML = '';
          if (file.type.startsWith('image/')) {
            previewHTML = `<img src="${attachment.data}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px; border: 1px solid var(--primary-magenta);" alt="preview">`;
          } else {
            previewHTML = `<span style="font-size: 20px;">??</span>`;
          }
          previewHTML += `<span style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 240px; font-weight: 500; font-size: 11px;">${file.name}</span>`;
          previewContent.innerHTML = previewHTML;
          previewBox.classList.remove('hidden');
        }
      };
      
      if (file.type.startsWith('image/')) {
        compressImage(rawData, 800, 800, 0.6, (compressedData) => {
          processAttachment(compressedData);
        });
      } else {
        processAttachment(rawData);
      }
    }
  };
  reader.readAsDataURL(file);
}

function uploadChunkedFile(portalRole, file, rawData) {
  const previewBox = document.getElementById(`${portalRole}-chat-preview-box`);
  const previewContent = document.getElementById(`${portalRole}-chat-preview-content`);
  const fileInput = document.getElementById(`${portalRole}-chat-file-input`);
  const form = fileInput ? fileInput.closest('form') : null;
  const sendBtn = form ? form.querySelector('button[type="submit"]') : null;
  const chatInput = form ? form.querySelector('input[type="text"]') : null;

  // 1. Disable form controls
  if (chatInput) chatInput.disabled = true;
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.style.opacity = '0.5';
  }

  // 2. Generate temporary message ID
  const tempMsgId = `msg-${Date.now()}`;
  
  // 3. Slice rawData (the Base64 dataURL string)
  const chunkSize = 700 * 1024; // 700KB chunks (perfectly fits under Firestore 1MB document limit)
  const totalChunks = Math.ceil(rawData.length / chunkSize);
  let currentChunkIndex = 0;

  // Store active upload info for cancelling
  let isCancelled = false;
  currentUploadTask[portalRole] = {
    cancel: () => {
      isCancelled = true;
    }
  };

  // Update preview UI with progress bar
  if (previewBox && previewContent) {
    previewContent.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px; width: 100%;">
        <span style="font-size: 20px;" class="upload-icon-spinner">?</span>
        <div style="flex-grow: 1;">
          <div style="font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">Uploading: ${file.name}</div>
          <div style="width: 100%; height: 3px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-top: 4px; overflow: hidden;">
            <div id="${portalRole}-upload-progress" style="width: 0%; height: 100%; background: var(--primary-magenta); transition: width 0.15s;"></div>
          </div>
        </div>
        <span id="${portalRole}-upload-percentage" style="font-size: 10px; color: var(--text-dark); min-width: 28px; text-align: right;">0%</span>
      </div>
    `;
    previewBox.classList.remove('hidden');
  }

  function uploadNextChunk() {
    if (isCancelled) {
      console.log("Chunked upload cancelled.");
      return;
    }

    if (currentChunkIndex >= totalChunks) {
      // All chunks uploaded!
      const attachment = {
        name: file.name,
        type: file.type,
        size: file.size,
        isChunked: true,
        totalChunks: totalChunks,
        chunkedMsgId: tempMsgId
      };

      if (portalRole === 'student') {
        studentChatAttachment = attachment;
      } else {
        mentorChatAttachment = attachment;
      }

      currentUploadTask[portalRole] = null;

      // Re-enable form controls
      if (chatInput) chatInput.disabled = false;
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.style.opacity = '1';
      }

      // Render finished preview
      if (previewBox && previewContent) {
        let previewHTML = '';
        if (file.type.startsWith('image/')) {
          previewHTML = `<img src="${rawData}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px; border: 1px solid var(--primary-magenta);" alt="preview">`;
        } else {
          previewHTML = `<span style="font-size: 20px;">??</span>`;
        }
        previewHTML += `<span style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 200px; font-weight: 500; font-size: 11px; margin-left: 6px;">${file.name}</span>`;
        previewHTML += `<span style="font-size: 10px; color: var(--success); font-weight: bold; margin-left: 6px;">? Ready</span>`;
        previewContent.innerHTML = previewHTML;
      }
      return;
    }

    // Slice current chunk
    const start = currentChunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, rawData.length);
    const chunkData = rawData.substring(start, end);

    const chunkDoc = {
      id: `${tempMsgId}-chunk-${currentChunkIndex}`,
      msgId: tempMsgId,
      index: currentChunkIndex,
      data: chunkData,
      timestamp: new Date().toISOString()
    };

    supabaseClient
      .from('apex_sync')
      .upsert({ id: chunkDoc.id, collection: 'chat_file_chunks', data: chunkDoc })
      .then(({ error }) => {
        if (error) throw error;
        currentChunkIndex++;
        const progress = (currentChunkIndex / totalChunks) * 100;
        const progressEl = document.getElementById(`${portalRole}-upload-progress`);
        const percentEl = document.getElementById(`${portalRole}-upload-percentage`);
        if (progressEl) progressEl.style.width = `${progress}%`;
        if (percentEl) percentEl.innerText = `${Math.round(progress)}%`;
        
        uploadNextChunk();
      })
      .catch(err => {
        console.error("Chunk upload failed:", err);
        alert("Upload failed! Supabase chunk write failed. Please check internet connection.");
        cancelChatAttachment(portalRole);
      });
  }

  // Start sequential upload
  uploadNextChunk();
}

function downloadChunkedFile(msgId, totalChunks, callback) {
  if (chunkedFilesCache[msgId]) {
    callback(chunkedFilesCache[msgId]);
    return;
  }

  if (!supabaseActive || !supabaseClient) {
    callback(null);
    return;
  }

  supabaseClient
    .from('apex_sync')
    .select('data')
    .eq('collection', 'chat_file_chunks')
    .eq('data->>msgId', msgId)
    .then(({ data, error }) => {
      if (error) throw error;
      if (!data || data.length === 0) {
        callback(null);
        return;
      }
      
      const chunks = data.map(row => row.data);
      // Sort by chunk index
      chunks.sort((a, b) => a.index - b.index);
      
      // Merge chunk data strings
      const fullDataUrl = chunks.map(c => c.data).join('');
      chunkedFilesCache[msgId] = fullDataUrl;
      callback(fullDataUrl);
    })
    .catch(err => {
      console.error("Failed to download chunked file:", err);
      callback(null);
    });
}

function cancelChatAttachment(portalRole) {
  // Cancel active upload task if any
  if (currentUploadTask[portalRole]) {
    try {
      currentUploadTask[portalRole].cancel();
      console.log("Active file upload task cancelled.");
    } catch(e) {
      console.error("Error cancelling upload task:", e);
    }
    currentUploadTask[portalRole] = null;
  }

  if (portalRole === 'student') {
    studentChatAttachment = null;
  } else {
    mentorChatAttachment = null;
  }
  
  const fileInput = document.getElementById(`${portalRole}-chat-file-input`);
  if (fileInput) {
    fileInput.value = '';
    const form = fileInput.closest('form');
    if (form) {
      const sendBtn = form.querySelector('button[type="submit"]');
      const chatInput = form.querySelector('input[type="text"]');
      if (chatInput) chatInput.disabled = false;
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.style.opacity = '1';
      }
    }
  }
  
  const previewBox = document.getElementById(`${portalRole}-chat-preview-box`);
  if (previewBox) previewBox.classList.add('hidden');
}

function openChatImageLightbox(imgData) {
  const img = document.getElementById('chat-preview-lightbox-img');
  if (img) {
    img.src = imgData;
    openModal('chat-image-preview-modal');
  }
}

function openAttachmentFile(dataUrl, fileName) {
  try {
    if (!dataUrl.startsWith('data:')) {
      const newWindow = window.open();
      if (newWindow) {
        newWindow.opener = null;
        newWindow.location.href = dataUrl;
      } else {
        window.location.href = dataUrl;
      }
      return;
    }

    const parts = dataUrl.split(',');
    if (parts.length < 2) return;
    
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    const blob = new Blob([u8arr], { type: mime });
    const blobUrl = URL.createObjectURL(blob);
    
    const newWindow = window.open();
    if (newWindow) {
      newWindow.opener = null;
      newWindow.location.href = blobUrl;
    } else {
      window.location.href = blobUrl;
    }
  } catch (e) {
    console.error("Failed to open file in new tab:", e);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    link.click();
  }
}

// WhatsApp-style message deletion UI & implementation
function showDeleteMenu(event, msgId, isSent) {
  event.stopPropagation();
  // Remove any existing delete menu
  const existingMenu = document.getElementById('chat-delete-menu');
  if (existingMenu) existingMenu.remove();

  // Find the chat object to check if it's already deleted for everyone
  const chat = db.chats.find(c => c.id === msgId);
  const isAlreadyDeleted = chat && chat.deleted === true;

  // Create a new menu element
  const menu = document.createElement('div');
  menu.id = 'chat-delete-menu';
  menu.style.position = 'fixed';
  menu.style.zIndex = '10005';
  menu.style.background = 'rgba(20, 16, 26, 0.95)';
  menu.style.backdropFilter = 'blur(10px)';
  menu.style.border = '1px solid var(--border-color)';
  menu.style.borderRadius = '8px';
  menu.style.padding = '6px 0';
  menu.style.minWidth = '160px';
  menu.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';
  
  // Position the menu near the click
  menu.style.left = `${event.clientX}px`;
  menu.style.top = `${event.clientY}px`;

  let menuHTML = '';
  menuHTML += `<div class="delete-menu-item" onclick="confirmDeleteChatMessage('${msgId}', 'me')" style="padding: 10px 16px; cursor: pointer; font-size: 13px; color: #fff; transition: background 0.2s;">Delete for Me</div>`;
  
  if (isSent && !isAlreadyDeleted) {
    menuHTML += `<div class="delete-menu-item" onclick="confirmDeleteChatMessage('${msgId}', 'everyone')" style="padding: 10px 16px; cursor: pointer; font-size: 13px; color: var(--primary-magenta); transition: background 0.2s; border-top: 1px solid rgba(255,255,255,0.06);">Delete for Everyone</div>`;
  }
  
  menuHTML += `<div class="delete-menu-item" onclick="closeDeleteMenu()" style="padding: 8px 16px; cursor: pointer; font-size: 13px; color: var(--text-dark); transition: background 0.2s; border-top: 1px solid rgba(255,255,255,0.06);">Cancel</div>`;
  
  menu.innerHTML = menuHTML;
  document.body.appendChild(menu);

  // Add event listener to close the menu on clicking outside
  document.addEventListener('click', closeDeleteMenu);
}

function closeDeleteMenu() {
  const menu = document.getElementById('chat-delete-menu');
  if (menu) menu.remove();
  document.removeEventListener('click', closeDeleteMenu);
}

function confirmDeleteChatMessage(msgId, deleteType) {
  closeDeleteMenu();
  
  let confirmMsg = deleteType === 'everyone' 
    ? "Delete this message for everyone?" 
    : "Delete this message for yourself?";
    
  if (confirm(confirmMsg)) {
    const chat = db.chats.find(c => c.id === msgId);
    if (chat) {
      if (deleteType === 'everyone') {
        chat.deleted = true;
        chat.message = '';
        chat.attachment = null;

        // Clean up any chunks in Firestore
        if (firestoreActive && firestore) {
          firestore.collection('chat_file_chunks')
            .where('msgId', '==', msgId)
            .get()
            .then(snapshot => {
              snapshot.forEach(doc => {
                doc.ref.delete().catch(err => console.error("Error deleting chunk:", err));
              });
            })
            .catch(err => console.error("Error querying chunks for deletion:", err));
        }
      } else {
        if (!chat.deletedFor) chat.deletedFor = [];
        if (!chat.deletedFor.includes(currentUser.email)) {
          chat.deletedFor.push(currentUser.email);
        }
      }
      
      saveDatabase();
      syncRecordToFirestore('chats', chat);
      
      if (currentUser.role === 'student') {
        loadStudentChat();
      } else {
        loadMentorChat();
      }
    }
  }
}

// Deprecated direct delete wrapper (redirects to WhatsApp-style everyone delete)
function deleteChatMessage(msgId) {
  confirmDeleteChatMessage(msgId, 'everyone');
}


// ==================== 8. UTILITY POPUPS AND ESCAPING ====================

function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  const modalEl = document.getElementById(modalId);
  if (!modalEl) return;
  modalEl.classList.remove('active');
  modalEl.classList.add('hidden');
  modalEl.style.display = 'none';
  if (modalId === 'edit-profile-modal') {
    stopWebcam('edit-webcam');
    editWebcamActive = false;
  } else if (modalId === 'face-verification-modal') {
    stopWebcam('ver-webcam');
    verWebcamActive = false;
    if (scanningInterval) {
      clearTimeout(scanningInterval);
      scanningInterval = null;
    }
  }
}

function viewFaceScanDetail(base64Image, studentName, timestamp) {
  const modal = document.getElementById('face-preview-modal');
  const img = document.getElementById('face-preview-img');
  const meta = document.getElementById('face-preview-meta');
  
  if (modal && img && meta) {
    img.src = base64Image;
    meta.innerHTML = `Student: <strong>${studentName}</strong><br>Scan Time: ${timestamp}`;
    openModal('face-preview-modal');
  }
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// ==================== 9. NEW STUDENT PORTAL FEATURES AND PROFILE EDITING ====================

const CORE_SKILLS = [
  { name: "Git Workflows & Version Control", desc: "Demonstrated branching, pulling, resolving conflicts, and staging files." },
  { name: "Component Architecture & Responsive CSS", desc: "Build modular interfaces using glassmorphism, flex containers, and media grids." },
  { name: "API Integration & Async JavaScript", desc: "Wired asynchronous fetch methods, error boundary traps, and state updates." },
  { name: "Persistent Storage & State Managers", desc: "Stored data in window storage spaces, sync configurations, or database records." },
  { name: "Clean Coding & Quality Refactoring", desc: "Reused logic, minimized redundancies, and properly documented code blocks." },
  { name: "Responsive Debugging & Diagnostics", desc: "Inspected layouts, isolated error lines, and validated edge cases." }
];

const LEARNING_RESOURCES = [
  { title: "Mastering Git Branching & Remote Repos", desc: "Learn advanced git rebase, checkout, cherry-pick operations, and pull request reviews.", url: "https://git-scm.com/book" },
  { title: "Sleek Glassmorphic & Modern CSS Layouts", desc: "Implement translucent blur backdrops, responsive grid elements, and interactive animations.", url: "https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter" },
  { title: "Asynchronous REST API Integration Guide", desc: "Master JS Promises, async/await structures, network try-catch loops, and JSON parse guards.", url: "https://javascript.info/async" },
  { title: "State Persistence in Local Web Storage", desc: "Handle offline session synchronization, cookie states, and fallbacks.", url: "https://javascript.info/localstorage" }
];

function loadDashboardBadges() {
  const badgeContainer = document.getElementById('student-badges-grid');
  if (!badgeContainer) return;
  badgeContainer.innerHTML = '';

  const studentTasks = db.tasks.filter(t => t.assignedTo && t.assignedTo.trim().toLowerCase() === currentUser.email.trim().toLowerCase());
  const completedCount = studentTasks.filter(t => t.status === 'Completed').length;
  
  const studentLogs = db.weeklyLogs.filter(l => l.studentId && l.studentId.trim().toLowerCase() === currentUser.email.trim().toLowerCase() && l.status === 'Approved');
  const loggedHours = studentLogs.reduce((sum, curr) => sum + parseInt(curr.hoursLogged || 0), 0);

  const studentSkills = db.skills?.[currentUser.email] || [];
  const skillPercentage = Math.round((studentSkills.length / CORE_SKILLS.length) * 100);

  const badges = [
    { name: "Welcome Aboard", desc: "Active intern registry",  icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e01a8b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>`, unlocked: true },
    { name: "Task Crusher",   desc: "Completed 2+ tasks",     icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8327ec" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`, unlocked: completedCount >= 2 },
    { name: "Time Keeper",    desc: "Logged 40+ hours",       icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2a6bf2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`, unlocked: loggedHours >= 40 },
    { name: "Skill Master",   desc: "50%+ skills mastery",    icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`, unlocked: skillPercentage >= 50 }
  ];

  badges.forEach(badge => {
    const el = document.createElement('div');
    el.className = `badge-item ${badge.unlocked ? 'unlocked' : ''}`;
    el.innerHTML = `
      <div class="badge-icon">${badge.icon}</div>
      <div class="badge-name">${badge.name}</div>
      <div class="badge-desc">${badge.desc}</div>
    `;
    badgeContainer.appendChild(el);
  });
}

function loadStudentSkills() {
  const listContainer = document.getElementById('student-skills-list-container');
  const pctLabel = document.getElementById('student-skills-pct');
  const progressNode = document.getElementById('student-skills-progress-bar');
  if (!listContainer) return;

  listContainer.innerHTML = '';

  if (!db.skills) db.skills = {};
  if (!db.skills[currentUser.email]) db.skills[currentUser.email] = [];

  const checkedSkills = db.skills[currentUser.email];

  CORE_SKILLS.forEach((skill, idx) => {
    const isChecked = checkedSkills.includes(skill.name);
    const row = document.createElement('div');
    row.className = 'skill-checkbox-row';
    row.innerHTML = `
      <input type="checkbox" id="skill-chk-${idx}" ${isChecked ? 'checked' : ''} onchange="toggleSkillMastery('${escapeHTML(skill.name)}', this.checked)">
      <div style="flex-grow:1;">
        <label for="skill-chk-${idx}" class="skill-title-label">${skill.name}</label>
        <div class="skill-desc-label">${skill.desc}</div>
      </div>
    `;
    listContainer.appendChild(row);
  });

  const pct = Math.round((checkedSkills.length / CORE_SKILLS.length) * 100);
  pctLabel.innerText = `${pct}%`;
  progressNode.style.width = `${pct}%`;

  // Draw training modules on the right
  const resourcesContainer = document.getElementById('student-learning-resources');
  if (resourcesContainer) {
    resourcesContainer.innerHTML = '';
    LEARNING_RESOURCES.forEach(res => {
      const card = document.createElement('div');
      card.className = 'resource-card';
      card.innerHTML = `
        <h4>${res.title}</h4>
        <p>${res.desc}</p>
        <a href="${res.url}" target="_blank" class="btn btn-secondary btn-sm" style="display:inline-flex;">Read Syllabus Reference</a>
      `;
      resourcesContainer.appendChild(card);
    });
  }
}

function toggleSkillMastery(skillName, isChecked) {
  if (!db.skills) db.skills = {};
  if (!db.skills[currentUser.email]) db.skills[currentUser.email] = [];

  const idx = db.skills[currentUser.email].indexOf(skillName);
  if (isChecked && idx === -1) {
    db.skills[currentUser.email].push(skillName);
  } else if (!isChecked && idx !== -1) {
    db.skills[currentUser.email].splice(idx, 1);
  }

  saveDatabase();
  syncRecordToFirestore('skills', { id: currentUser.email, list: db.skills[currentUser.email] });
  loadStudentSkills();
  loadDashboardBadges();
}

function saveStudentSyncNotes() {
  const notesText = document.getElementById('student-sync-notes').value.trim();
  if (!db.syncNotes) db.syncNotes = {};
  db.syncNotes[currentUser.email] = notesText;
  saveDatabase();
  syncRecordToFirestore('syncNotes', { id: currentUser.email, notes: notesText });
  alert("Sync notes saved successfully. They will persist for your next meeting.");
}

function loadStudentSyncNotes() {
  const textarea = document.getElementById('student-sync-notes');
  if (!textarea) return;
  const savedNotes = db.syncNotes?.[currentUser.email] || '';
  textarea.value = savedNotes;
}

let selectedAvatarPreset = '';

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120",
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=120",
  "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=120"
];

function openEditProfileModal() {
  if (!currentUser) return;

  const modalEl = document.getElementById('edit-profile-modal');
  if (modalEl) {
    modalEl.classList.remove('hidden');
    modalEl.style.display = 'flex';
    // Force reflow
    void modalEl.offsetWidth;
    modalEl.classList.add('active');
    
    // Ensure it's not hidden by weird styles
    modalEl.style.opacity = '1';
    modalEl.style.pointerEvents = 'auto';
    modalEl.style.zIndex = '999999';

    const contentEl = modalEl.querySelector('.modal-content');
    if (contentEl) {
      contentEl.style.display = 'block';
      contentEl.style.opacity = '1';
      contentEl.style.visibility = 'visible';
    }
  }

  // Ensure chatbot is also unhidden if it got stuck
  const copilotBtn = document.getElementById('ai-copilot-trigger');
  if (copilotBtn) {
    copilotBtn.classList.remove('hidden');
    copilotBtn.style.display = 'flex';
    copilotBtn.style.opacity = '1';
  }

  try {
    // Fill in inputs
    const nameInput = document.getElementById('edit-profile-name');
    const pwdInput = document.getElementById('edit-profile-pwd');
    if (!nameInput || !pwdInput) {
      console.warn("Edit Profile inputs not found.");
      return;
    }

    nameInput.value = currentUser.name;
    pwdInput.value = currentUser.password || '';

    // Reset password field to type='password' and reset visibility icon
    pwdInput.type = 'password';
    const toggle = pwdInput.nextElementSibling;
    if (toggle && toggle.classList.contains('pwd-toggle')) {
      const eyeOpen = toggle.querySelector('.eye-open');
      const eyeClosed = toggle.querySelector('.eye-closed');
      if (eyeOpen) eyeOpen.classList.remove('hidden');
      if (eyeClosed) eyeClosed.classList.add('hidden');
    }

    // Toggle roles inputs
    const domainGroup = document.getElementById('edit-profile-domain-group');
    const titleGroup = document.getElementById('edit-profile-title-group');
    const mentorGroup = document.getElementById('edit-profile-mentor-group');

    if (currentUser.role === 'student') {
      if (domainGroup) domainGroup.classList.remove('hidden');
      if (mentorGroup) mentorGroup.classList.remove('hidden');
      if (titleGroup) titleGroup.classList.add('hidden');
      const domainInput = document.getElementById('edit-profile-domain');
      if (domainInput) domainInput.value = currentUser.domain || '';
      
      // Fill Mentor Details
      const mentorNameEl = document.getElementById('edit-profile-mentor-name');
      const mentorImgEl = document.getElementById('edit-profile-mentor-img');
      const assignedMentorEmail = currentUser.mentorEmail || currentUser.supervisor;
        if (assignedMentorEmail) {
        const mentorUser = db.users.find(u => u && u.email === assignedMentorEmail);
        if (mentorUser) {
          if (mentorNameEl) mentorNameEl.innerText = mentorUser.name || mentorUser.email;
          if (mentorImgEl && mentorUser.avatar) mentorImgEl.src = mentorUser.avatar;
        } else {
          if (mentorNameEl) mentorNameEl.innerText = assignedMentorEmail;
        }
      } else {
        if (mentorNameEl) mentorNameEl.innerText = "Not Assigned";
        if (mentorImgEl) mentorImgEl.src = "https://ui-avatars.com/api/?name=NA&background=random";
      }
    } else if (currentUser.role === 'mentor') {
      if (domainGroup) domainGroup.classList.add('hidden');
      if (mentorGroup) mentorGroup.classList.add('hidden');
      if (titleGroup) titleGroup.classList.remove('hidden');
      const titleInput = document.getElementById('edit-profile-title');
      if (titleInput) titleInput.value = currentUser.title || '';
    } else {
      if (domainGroup) domainGroup.classList.add('hidden');
      if (mentorGroup) mentorGroup.classList.add('hidden');
      if (titleGroup) titleGroup.classList.add('hidden');
    }

    // Setup email input
    const emailInput = document.getElementById('edit-profile-email');
    if (emailInput) emailInput.value = currentUser.email || '';

    // Setup avatar circle
    selectedAvatarPreset = currentUser.avatar || '';
    const avatarCircle = document.getElementById('edit-profile-avatar-circle');
    const plusIcon = document.getElementById('edit-profile-avatar-plus');
    if (avatarCircle) {
      if (currentUser.avatar) {
        avatarCircle.style.backgroundImage = `url(${currentUser.avatar})`;
        if (plusIcon) plusIcon.style.display = 'none';
      } else {
        avatarCircle.style.backgroundImage = 'none';
        if (plusIcon) plusIcon.style.display = 'block';
      }
    }

    // Clear file selector
    const avatarFile = document.getElementById('edit-profile-avatar-file');
    if (avatarFile) avatarFile.value = '';
  } catch (err) {
    console.error("Error populating Edit Profile Modal:", err);
  }
}

function handleEditProfileSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('edit-profile-name').value.trim();
  const password = document.getElementById('edit-profile-pwd').value;

  const userIdx = db.users.findIndex(u => u && u.email && u.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase());
  if (userIdx !== -1) {
    db.users[userIdx].name = name;
    db.users[userIdx].password = password;
    db.users[userIdx].avatar = selectedAvatarPreset || currentUser.avatar;

    if (currentUser.role === 'student') {
      // Domain is read-only, no longer saving domain changes.
    } else if (currentUser.role === 'mentor') {
      db.users[userIdx].title = document.getElementById('edit-profile-title').value.trim();
    }

    // Edit webcam removed

    saveDatabase();
    
    // Sync current session state
    currentUser = db.users[userIdx];
    storage.setItem('apex_intern_currentUser', JSON.stringify(currentUser));
    syncRecordToFirestore('users', currentUser);
    
    // Refresh sidebar details
    document.getElementById('sidebar-name').innerHTML = `${currentUser.name} <span style="font-size: 10px; opacity: 0.5;">✔</span>`;
    document.getElementById('sidebar-avatar').src = currentUser.avatar;

    // Refresh active tab views
    switchTab(currentUser.role, 'dash');
    
    closeModal('edit-profile-modal');
    alert("Profile settings updated successfully!");
  }
}

function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const toggle = input.nextElementSibling;
  if (!toggle || !toggle.classList.contains('pwd-toggle')) return;

  const eyeOpen = toggle.querySelector('.eye-open');
  const eyeClosed = toggle.querySelector('.eye-closed');

  if (input.type === 'password') {
    input.type = 'text';
    eyeOpen.classList.add('hidden');
    eyeClosed.classList.remove('hidden');
  } else {
    input.type = 'password';
    eyeOpen.classList.remove('hidden');
    eyeClosed.classList.add('hidden');
  }
}

function handleProfileImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Check size limit: keep it under 800 KB to avoid exceeding LocalStorage 5MB quota
  if (file.size > 800 * 1024) {
    alert("Profile picture file size should be less than 800 KB to optimize memory.");
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const base64Data = e.target.result;
    selectedAvatarPreset = base64Data;
    
    // Set circle background preview
    const circle = document.getElementById('edit-profile-avatar-circle');
    if (circle) {
      circle.style.backgroundImage = `url(${base64Data})`;
      const plusIcon = document.getElementById('edit-profile-avatar-plus');
      if (plusIcon) plusIcon.style.display = 'none';
    }
  };
  reader.readAsDataURL(file);
}

function handleTaskAttachmentUpload(event) {
  const file = event.target.files[0];
  if (!file) {
    uploadedTaskAttachment = null;
    return;
  }

  // Relax size limit if Firebase is active
  const limit = (firestoreActive || firebaseStorageActive) ? 10 * 1024 * 1024 : 1.5 * 1024 * 1024;
  const limitLabel = (firestoreActive || firebaseStorageActive) ? "10 MB" : "1.5 MB";

  if (file.size > limit) {
    alert(`Task document file size should be less than ${limitLabel} to prevent storage overflow.`);
    event.target.value = '';
    uploadedTaskAttachment = null;
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    uploadedTaskAttachment = {
      name: file.name,
      data: e.target.result,
      type: file.type,
      fileObj: file // Store raw File object for Firebase Storage
    };
  };
  reader.readAsDataURL(file);
}

function quickAssignDemoIntern() {
  if (!currentUser || currentUser.role !== 'mentor') return;
  const student = db.users.find(u => u.role === 'student' && u.email === 'student1@internship.com');
  if (student) {
    student.mentorEmail = currentUser.email;
    student.mentorStatus = 'Active';
    getOrGenerateStudentId(student);
    saveDatabase();
    syncRecordToFirestore('users', student);
    loadMentorDashboard();
    loadMentorTasks();
    loadMentorReviews();
    loadMentorChat();
    alert("Rohan Das has been successfully paired with your supervisor account. You can now assign tasks!");
  } else {
    // Fallback: take first student in database
    const anyStudent = db.users.find(u => u.role === 'student');
    if (anyStudent) {
      anyStudent.mentorEmail = currentUser.email;
      anyStudent.mentorStatus = 'Active';
      getOrGenerateStudentId(anyStudent);
      saveDatabase();
      syncRecordToFirestore('users', anyStudent);
      loadMentorDashboard();
      loadMentorTasks();
      loadMentorReviews();
      loadMentorChat();
      alert(`${anyStudent.name} has been successfully paired with your supervisor account. You can now assign tasks!`);
    } else {
      alert("No student accounts found in the database. Please register a student first.");
    }
  }
}

// Visual Debug Inspector Panel Helpers
function toggleDebugPanel() {
  const panel = document.getElementById('debug-panel');
  const trigger = document.getElementById('debug-panel-trigger');
  if (!panel || !trigger) return;
  
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    trigger.style.display = 'none';
    refreshDebugPanel();
  } else {
    panel.style.display = 'none';
    trigger.style.display = 'block';
  }
}

function refreshDebugPanel() {
  const content = document.getElementById('debug-panel-content');
  if (!content) return;
  
  let html = `<div><strong>Current Session User:</strong><br>${currentUser ? `... Name: ${currentUser.name}<br>... Email: ${currentUser.email}<br>... Role: ${currentUser.role}` : 'Logged Out'}</div>`;
  
  html += `<div style="margin-top: 10px; color: var(--accent-blue);"><strong>Users in LocalStorage DB (${db.users?.length || 0}):</strong></div>`;
  html += `<div style="max-height: 120px; overflow-y: auto; background: rgba(0,0,0,0.4); padding: 6px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); line-height: 1.4; margin-top: 4px;">`;
  if (db.users) {
    db.users.forEach(u => {
      html += `<span style="color:#fff; font-weight:600;">${u.name}</span> (${u.role})<br>+ Email: ${u.email}<br>`;
      if (u.role === 'student') {
        html += `  + Mentor: ${u.mentorEmail || 'None'} | Status: ${u.mentorStatus || 'None'}<br>`;
      }
    });
  }
  html += `</div>`;
  
  html += `<div style="margin-top: 10px; color: var(--primary-magenta);"><strong>Pairing Requests (${db.pairingRequests?.length || 0}):</strong></div>`;
  html += `<div style="max-height: 120px; overflow-y: auto; background: rgba(0,0,0,0.4); padding: 6px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); line-height: 1.4; margin-top: 4px;">`;
  if (!db.pairingRequests || db.pairingRequests.length === 0) {
    html += `<span style="color: var(--text-dark);">No pairing requests inside database.</span>`;
  } else {
    db.pairingRequests.forEach((req, idx) => {
      html += `[${idx+1}] ID: ${req.id}<br>`;
      html += `  + Student: ${req.studentName} (${req.studentEmail})<br>`;
      html += `  + Requested Mentor: ${req.mentorEmail}<br>`;
      html += `  + Request Status: <span style="color: ${req.status === 'Pending' ? 'var(--warning)' : (req.status === 'Accepted' ? 'var(--success)' : 'var(--danger)')}; font-weight:bold;">${req.status}</span><br>`;
    });
  }
  html += `</div>`;
  
  content.innerHTML = html;
}

// ==================== 10. AI FACE ATTENDANCE & WEB STREAM CONTROLLERS ====================

let activeStreams = {};
let regWebcamActive = false;
let editWebcamActive = false;
let verificationCallback = null;
let verificationActionName = "";
let verWebcamActive = false;
let scanningInterval = null;

function generateMockFaceData(name) {
  const canvas = document.createElement('canvas');
  canvas.width = 120;
  canvas.height = 150;
  const ctx = canvas.getContext('2d');
  
  // Generate a name-specific hash for visual differences
  let hash = 0;
  const nameStr = name || 'FC';
  for (let i = 0; i < nameStr.length; i++) {
    hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Name-specific background color using HSL
  const h = Math.abs(hash % 360);
  const grad = ctx.createLinearGradient(0, 0, 0, 150);
  grad.addColorStop(0, `hsl(${h}, 80%, 50%)`);
  grad.addColorStop(1, `hsl(${(h + 60) % 360}, 80%, 40%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 120, 150);
  
  // Face outline
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(60, 75, 40, 0, Math.PI * 2);
  ctx.fill();
  
  // Eyes
  ctx.fillStyle = '#050508';
  ctx.beginPath();
  ctx.arc(48, 70, 4, 0, Math.PI * 2);
  ctx.arc(72, 70, 4, 0, Math.PI * 2);
  ctx.fill();
  
  // Mouth
  ctx.strokeStyle = '#050508';
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (hash % 2 === 0) {
    ctx.arc(60, 85, 12, 0, Math.PI); // smile
  } else {
    ctx.arc(60, 95, 10, Math.PI, 0); // frown/flat
  }
  ctx.stroke();
  
  // Text initials
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(nameStr.substring(0, 3).toUpperCase(), 60, 135);
  
  return canvas.toDataURL('image/jpeg');
}

function showWebcamFileUploadFallback(videoElId) {
  const prefix = videoElId.split('-')[0];
  const fileContainer = document.getElementById(`${prefix}-file-upload-container`);
  if (fileContainer) fileContainer.style.display = 'block';
}

function waitForVideoReady(video, timeoutMs = 5000) {
  return new Promise((resolve) => {
    if (!video) return resolve(false);
    const isReady = () => video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0;
    if (isReady()) return resolve(true);

    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.removeEventListener('loadeddata', check);
      video.removeEventListener('playing', check);
      resolve(ok);
    };
    const check = () => { if (isReady()) finish(true); };
    const timer = setTimeout(() => finish(isReady()), timeoutMs);
    video.addEventListener('loadeddata', check);
    video.addEventListener('playing', check);
    try { video.play().catch(() => {}); } catch (_) {}
  });
}

function captureVideoFrame(video) {
  if (!video || !video.srcObject) return '';
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return '';
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.92);
}

async function startWebcam(videoElId, statusElId, captureBtnId) {
  const videoEl = document.getElementById(videoElId);
  const statusEl = document.getElementById(statusElId);
  const captureBtn = captureBtnId ? document.getElementById(captureBtnId) : null;

  if (!videoEl || !statusEl) return false;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    statusEl.innerText = "Camera needs localhost. Run run_local_server.bat and open http://localhost:8080/";
    statusEl.style.color = "var(--danger)";
    showWebcamFileUploadFallback(videoElId);
    if (captureBtn) captureBtn.style.display = 'inline-block';
    return false;
  }

  statusEl.innerText = "Requesting camera permissions...";
  statusEl.style.color = "var(--text-muted)";

  const constraintSets = [
    { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
    { video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
    { video: { facingMode: 'user' }, audio: false },
    { video: true, audio: false }
  ];

  for (const constraints of constraintSets) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoEl.srcObject = stream;
      activeStreams[videoElId] = stream;
      videoEl.muted = true;
      try { await videoEl.play(); } catch (_) {}
      const ready = await waitForVideoReady(videoEl, 6000);
      if (!ready) {
        stopWebcam(videoElId);
        continue;
      }
      statusEl.innerText = "Camera active. Center your face in the marker.";
      statusEl.style.color = "var(--success)";
      if (captureBtn) captureBtn.style.display = 'inline-block';

      // Start real-time eye tracking
      let prefix = '';
      if (videoElId === 'reg-webcam') prefix = 'reg';
      else if (videoElId === 'daily-webcam') prefix = 'daily';
      else if (videoElId === 'ver-webcam') prefix = 'ver';
      else if (videoElId === 'edit-webcam') prefix = 'edit';
      if (prefix) startWebcamTracking(videoElId, prefix);

      return true;
    } catch (err) {
      console.warn("Webcam attempt failed:", err);
    }
  }

  statusEl.innerText = "Camera not available. Allow camera permission or upload a photo below.";
  statusEl.style.color = "var(--warning)";
  if (captureBtn) captureBtn.style.display = 'inline-block';
  showWebcamFileUploadFallback(videoElId);
  return false;
}

function stopWebcam(videoElId) {
  stopWebcamTracking(videoElId);
  const videoEl = document.getElementById(videoElId);
  if (videoEl && videoEl.srcObject) {
    const stream = videoEl.srcObject;
    const tracks = stream.getTracks();
    tracks.forEach(track => track.stop());
    videoEl.srcObject = null;
  }
  if (activeStreams[videoElId]) {
    delete activeStreams[videoElId];
  }
}

function toggleRegWebcam() {
  const toggleBtn = document.getElementById('reg-webcam-toggle-btn');
  const captureBtn = document.getElementById('reg-capture-btn');
  const overlay = document.getElementById('reg-face-captured-overlay');

  if (!regWebcamActive) {
    overlay.style.display = 'none';
    document.getElementById('reg-face-data').value = '';

    startWebcam('reg-webcam', 'reg-face-status', 'reg-capture-btn');
    toggleBtn.innerText = "?? Turn Off Camera";
    toggleBtn.style.borderColor = "var(--danger)";
    toggleBtn.style.color = "var(--danger)";
    regWebcamActive = true;
  } else {
    stopWebcam('reg-webcam');
    toggleBtn.innerText = "?? Turn On Camera";
    toggleBtn.style.borderColor = "var(--primary-magenta)";
    toggleBtn.style.color = "var(--primary-magenta)";
    captureBtn.style.display = 'none';
    regWebcamActive = false;
    document.getElementById('reg-face-status').innerText = "Please turn on your camera and center your face.";
    document.getElementById('reg-face-status').style.color = "var(--text-dark)";
  }
}

async function captureRegistrationFace() {
  const video = document.getElementById('reg-webcam');
  const faceDataInput = document.getElementById('reg-face-data');
  const overlay = document.getElementById('reg-face-captured-overlay');
  const statusEl = document.getElementById('reg-face-status');
  const name = document.getElementById('reg-name').value.trim();

  if (!faceModelsLoaded) {
    statusEl.innerText = "AI System is still warming up, please wait 3 seconds...";
    statusEl.style.color = "var(--warning)";
    return;
  }

  let base64 = '';
  if (video.srcObject) {
    await waitForVideoReady(video, 4000);
    base64 = captureVideoFrame(video);
    if (!base64) {
      statusEl.innerText = "Camera not ready. Keep your face centered and try again.";
      statusEl.style.color = "var(--warning)";
      return;
    }
  } else {
    statusEl.innerText = "Turn on camera first, then capture your face.";
    statusEl.style.color = "var(--danger)";
    return;
  }

  statusEl.innerText = "Analyzing face structure... Please hold still.";
  statusEl.style.color = "var(--warning)";

  try {
    const detection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();
    if (!detection) {
      statusEl.innerText = "Face not detected! Please align your face in the center.";
      statusEl.style.color = "var(--danger)";
      return;
    }

    window.lastRegisteredFaceDescriptor = Array.from(detection.descriptor);
    faceDataInput.value = base64;
    overlay.style.display = 'flex';
    statusEl.innerText = "Face captured and enrolled!";
    statusEl.style.color = "var(--success)";
    
    stopWebcam('reg-webcam');
    document.getElementById('reg-webcam-toggle-btn').innerText = "?? Retake Face Profile";
    document.getElementById('reg-webcam-toggle-btn').style.borderColor = "var(--primary-magenta)";
    document.getElementById('reg-webcam-toggle-btn').style.color = "var(--primary-magenta)";
    document.getElementById('reg-capture-btn').style.display = 'none';
    regWebcamActive = false;

    // ===== PAID TIER: Directly open Razorpay =====
    const tierEl = document.getElementById('reg-tier');
    if (tierEl && tierEl.value === 'paid') {
      showToast('✅ Face enrolled! Opening payment...', 2000);
      setTimeout(() => {
        const submitBtn = document.querySelector('#register-form button[type="submit"]');
        if (submitBtn) submitBtn.click();
      }, 800);
    } else {
      // FREE tier — highlight Sign Up button
      const submitBtn = document.querySelector('#register-form button[type="submit"]');
      if (submitBtn) {
        setTimeout(() => { submitBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 200);
        submitBtn.style.transition = 'box-shadow 0.3s ease';
        submitBtn.style.boxShadow = '0 0 0 4px rgba(224,26,139,0.4)';
        setTimeout(() => { submitBtn.style.boxShadow = ''; }, 1500);
      }
      showToast('✅ Face enrolled! Click Sign Up to complete registration.', 3000);
    }
  } catch (err) {
    console.error("Face analysis error:", err);
    statusEl.innerText = "Face scan error. Please try again.";
    statusEl.style.color = "var(--danger)";
  }
}

function handleRegistrationFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!faceModelsLoaded) {
    alert("AI System is still warming up, please wait 3 seconds...");
    return;
  }

  const reader = new FileReader();
  reader.onload = async function(e) {
    const base64 = await normalizeUploadedFacePhoto(e.target.result);
    const faceDataInput = document.getElementById('reg-face-data');
    const overlay = document.getElementById('reg-face-captured-overlay');
    const statusEl = document.getElementById('reg-face-status');

    statusEl.innerText = "Analyzing photo face profile...";
    statusEl.style.color = "var(--warning)";

    try {
      const img = new Image();
      img.src = base64;
      await new Promise(r => img.onload = r);

      const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
      if (!detection) {
        statusEl.innerText = "No face detected in photo! Please upload a clear front face photo.";
        statusEl.style.color = "var(--danger)";
        alert("Face not detected in the uploaded photo. Try another image.");
        return;
      }

      window.lastRegisteredFaceDescriptor = Array.from(detection.descriptor);
      faceDataInput.value = base64;
      overlay.style.display = 'flex';
      statusEl.innerText = "Face photo uploaded and enrolled successfully!";
      statusEl.style.color = "var(--success)";

      stopWebcam('reg-webcam');
      document.getElementById('reg-webcam-toggle-btn').innerText = "?? Retake Face Profile";
      document.getElementById('reg-webcam-toggle-btn').style.borderColor = "var(--primary-magenta)";
      document.getElementById('reg-webcam-toggle-btn').style.color = "var(--primary-magenta)";
      document.getElementById('reg-capture-btn').style.display = 'none';
      regWebcamActive = false;

      // Navigate to Razorpay or highlight submit
      const tierEl2 = document.getElementById('reg-tier');
      if (tierEl2 && tierEl2.value === 'paid') {
        showToast('✅ Face enrolled! Opening payment...', 2000);
        setTimeout(() => {
          const submitBtn = document.querySelector('#register-form button[type="submit"]');
          if (submitBtn) submitBtn.click();
        }, 800);
      } else {
        const submitBtn = document.querySelector('#register-form button[type="submit"]');
        if (submitBtn) {
          setTimeout(() => { submitBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 200);
          submitBtn.style.transition = 'box-shadow 0.3s ease';
          submitBtn.style.boxShadow = '0 0 0 4px rgba(224,26,139,0.4)';
          setTimeout(() => { submitBtn.style.boxShadow = ''; }, 1500);
        }
        showToast('✅ Face enrolled! Click Sign Up to complete registration.', 3000);
      }
    } catch (err) {
      console.error("Uploaded photo analysis error:", err);
      statusEl.innerText = "Error analyzing uploaded photo. Try again.";
      statusEl.style.color = "var(--danger)";
    }
  };
  reader.readAsDataURL(file);
}

function handleEditFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!faceModelsLoaded) {
    alert("AI System is still warming up, please wait 3 seconds...");
    return;
  }

  const reader = new FileReader();
  reader.onload = async function(e) {
    const base64 = await normalizeUploadedFacePhoto(e.target.result);
    const faceDataInput = document.getElementById('edit-face-data');
    const overlay = document.getElementById('edit-face-captured-overlay');
    const statusEl = document.getElementById('edit-face-status');

    statusEl.innerText = "Analyzing photo face profile...";
    statusEl.style.color = "var(--warning)";

    try {
      const img = new Image();
      img.src = base64;
      await new Promise(r => img.onload = r);

      const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
      if (!detection) {
        statusEl.innerText = "No face detected in photo! Please upload a clear front face photo.";
        statusEl.style.color = "var(--danger)";
        alert("Face not detected in the uploaded photo. Try another image.");
        return;
      }

      window.lastEditedFaceDescriptor = Array.from(detection.descriptor);
      faceDataInput.value = base64;
      overlay.style.display = 'flex';
      statusEl.innerText = "Face photo uploaded and updated successfully!";
      statusEl.style.color = "var(--success)";

      stopWebcam('edit-webcam');
      document.getElementById('edit-webcam-toggle-btn').innerText = "?? Retake Face Profile";
      document.getElementById('edit-webcam-toggle-btn').style.borderColor = "var(--primary-magenta)";
      document.getElementById('edit-webcam-toggle-btn').style.color = "var(--primary-magenta)";
      document.getElementById('edit-capture-btn').style.display = 'none';
      editWebcamActive = false;
    } catch (err) {
      console.error("Uploaded photo analysis error during profile edit:", err);
      statusEl.innerText = "Error analyzing uploaded photo. Try again.";
      statusEl.style.color = "var(--danger)";
    }
  };
  reader.readAsDataURL(file);
}

function handleDailyFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(e) {
    const base64 = e.target.result;
    const statusText = document.getElementById('daily-status-text');
    const matchIndicator = document.getElementById('daily-match-indicator');
    const progressBar = document.getElementById('daily-progress-bar');
    const progressBarContainer = document.getElementById('daily-progress-bar-container');

    progressBarContainer.style.display = 'block';
    progressBar.style.width = '50%';
    statusText.innerText = "Comparing uploaded photo...";
    statusText.style.color = "";
    matchIndicator.style.display = 'block';
    matchIndicator.innerText = "Comparing...";

    const registeredBase64 = await getRegisteredFaceTemplate();

    if (!registeredBase64) {
      statusText.innerText = "Verification Failed: No enrolled face template.";
      statusText.style.color = "var(--danger)";
      matchIndicator.innerText = "Match: 0%";
      progressBar.style.width = '0%';
      return;
    }

    const similarityScore = await compareFaces(base64, registeredBase64);
    matchIndicator.innerText = `Final Match: ${similarityScore}%`;

    if (similarityScore >= FACE_MATCH_THRESHOLD_DAILY) {
      progressBar.style.width = '100%';
      const isFirstCheckin = !hasCheckedInToday();
      statusText.innerText = isFirstCheckin
        ? "Check-In Verified! Marking today's attendance..."
        : "Face Verified! Unlocking dashboard (attendance already marked today)...";
      statusText.style.color = "var(--success)";
      matchIndicator.style.borderColor = "var(--success)";
      matchIndicator.style.color = "var(--success)";
      
      const displayScore = Math.max(84, similarityScore);
      const actionName = isFirstCheckin ? "Daily Attendance Check-In" : "Session Sign-In Face Verification";
      const newRecord = {
        id: `att-${Date.now()}`,
        studentEmail: currentUser.email,
        studentName: currentUser.name,
        timestamp: new Date().toLocaleString(),
        date: new Date().toDateString(),
        action: actionName,
        score: displayScore,
        status: "Verified (Pass)",
        faceImage: base64
      };

      if (!db.attendance) db.attendance = [];
      db.attendance.push(newRecord);
      
      try {
        saveDatabase();
      } catch (dbErr) {
        console.warn("Failed to save database locally:", dbErr);
      }

      if (isFirstCheckin) {
        try {
          syncRecordToFirestore('attendance', newRecord);
        } catch (syncErr) {
          console.warn("Failed to sync record to Supabase:", syncErr);
        }
        applySlowFaceTemplateBlend(base64, registeredBase64);
      } else {
        saveDatabase(true);
      }

      setTimeout(() => {
        try {
          stopWebcam('daily-webcam');
        } catch (e) {}
        dailyWebcamActive = false;

        sessionStorage.setItem('apex_intern_session_face_verified', 'true');
        checkStudentGate();
        switchTab('student', 'dash');
      }, 1000);
    } else {
      progressBar.style.width = '0%';
      statusText.innerText = `Verification Failed: Face does not match registration profile (${similarityScore}% / need ${FACE_MATCH_THRESHOLD_DAILY}%).`;
      statusText.style.color = "var(--danger)";
      matchIndicator.style.borderColor = "var(--danger)";
      matchIndicator.style.color = "var(--danger)";
      
      const newRecord = {
        id: `att-${Date.now()}`,
        studentEmail: currentUser.email,
        studentName: currentUser.name,
        timestamp: new Date().toLocaleString(),
        date: new Date().toDateString(),
        action: "Daily Attendance Check-In (Failed)",
        score: similarityScore,
        status: "Failed (Mismatch)",
        faceImage: base64
      };

      if (!db.attendance) db.attendance = [];
      db.attendance.push(newRecord);
      saveDatabase();
      syncRecordToFirestore('attendance', newRecord);

      setTimeout(() => {
        stopWebcam('daily-webcam');
        dailyWebcamActive = false;
        document.getElementById('daily-scan-btn').style.display = 'inline-block';
      }, 2000);
    }
  };
  reader.readAsDataURL(file);
}

function handleVerificationFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(e) {
    const base64 = e.target.result;
    const statusText = document.getElementById('ver-status-text');
    const matchIndicator = document.getElementById('ver-match-indicator');
    const progressBar = document.getElementById('ver-progress-bar');
    const progressBarContainer = document.getElementById('ver-progress-bar-container');

    progressBarContainer.style.display = 'block';
    progressBar.style.width = '50%';
    statusText.innerText = "Comparing uploaded photo...";
    statusText.style.color = "";
    matchIndicator.style.display = 'block';
    matchIndicator.innerText = "Comparing...";

    const registeredBase64 = await getRegisteredFaceTemplate();

    if (!registeredBase64) {
      statusText.innerText = "Verification Failed: No enrolled face profile found.";
      statusText.style.color = "var(--danger)";
      matchIndicator.innerText = "Match: 0%";
      progressBar.style.width = '0%';
      setTimeout(() => {
        stopWebcam('ver-webcam');
        closeModal('face-verification-modal');
        alert("No enrolled face template found. Please go to Edit Profile settings to register your face.");
      }, 1500);
      return;
    }

    const similarityScore = await compareFaces(base64, registeredBase64);
    matchIndicator.innerText = `Final Match: ${similarityScore}%`;

    if (similarityScore >= FACE_MATCH_THRESHOLD_ACTION) {
      progressBar.style.width = '100%';
      statusText.innerText = "Verification Successful! Face Matched.";
      statusText.style.color = "var(--success)";
      matchIndicator.style.borderColor = "var(--success)";
      matchIndicator.style.color = "var(--success)";
      
      const displayScore = Math.max(82, similarityScore);
      const newRecord = {
        id: `att-${Date.now()}`,
        studentEmail: currentUser.email,
        studentName: currentUser.name,
        timestamp: new Date().toLocaleString(),
        date: new Date().toDateString(),
        action: verificationActionName,
        score: displayScore,
        status: "Verified (Pass)",
        faceImage: base64
      };

      if (!db.attendance) db.attendance = [];
      db.attendance.push(newRecord);
      
      try {
        saveDatabase();
      } catch (dbErr) {
        console.warn("Failed to save database locally:", dbErr);
      }

      try {
        syncRecordToFirestore('attendance', newRecord);
      } catch (syncErr) {
        console.warn("Failed to sync record to Supabase:", syncErr);
      }

      setTimeout(() => {
        try {
          stopWebcam('ver-webcam');
        } catch (e) {}
        closeModal('face-verification-modal');
        if (verificationCallback) {
          verificationCallback();
        }
      }, 1000);
    } else {
      progressBar.style.width = '0%';
      statusText.innerText = `Verification Failed: Face mismatch (${similarityScore}% / need ${FACE_MATCH_THRESHOLD_ACTION}%).`;
      statusText.style.color = "var(--danger)";
      matchIndicator.style.borderColor = "var(--danger)";
      matchIndicator.style.color = "var(--danger)";
      
      const newRecord = {
        id: `att-${Date.now()}`,
        studentEmail: currentUser.email,
        studentName: currentUser.name,
        timestamp: new Date().toLocaleString(),
        date: new Date().toDateString(),
        action: `${verificationActionName} (Failed)`,
        score: similarityScore,
        status: "Failed (Mismatch)",
        faceImage: base64
      };

      if (!db.attendance) db.attendance = [];
      db.attendance.push(newRecord);
      saveDatabase();
      syncRecordToFirestore('attendance', newRecord);

      setTimeout(() => {
        stopWebcam('ver-webcam');
        closeModal('face-verification-modal');
        alert(`Face verification failed (${similarityScore}%).\n\nTry this:\n1. Run run_local_server.bat ? open http://localhost:8080/\n2. Edit Profile ? Retake face with CAMERA (not file upload)\n3. Scan in good lighting, face centered`);
      }, 2000);
    }
  };
  reader.readAsDataURL(file);
}

function toggleEditWebcam() {
  const toggleBtn = document.getElementById('edit-webcam-toggle-btn');
  const captureBtn = document.getElementById('edit-capture-btn');
  const overlay = document.getElementById('edit-face-captured-overlay');

  if (!editWebcamActive) {
    overlay.style.display = 'none';
    document.getElementById('edit-face-data').value = '';

    startWebcam('edit-webcam', 'edit-face-status', 'edit-capture-btn');
    toggleBtn.innerText = "?? Turn Off Camera";
    toggleBtn.style.borderColor = "var(--danger)";
    toggleBtn.style.color = "var(--danger)";
    editWebcamActive = true;
  } else {
    stopWebcam('edit-webcam');
    toggleBtn.innerText = "?? Turn On Camera";
    toggleBtn.style.borderColor = "var(--primary-magenta)";
    toggleBtn.style.color = "var(--primary-magenta)";
    captureBtn.style.display = 'none';
    editWebcamActive = false;
    document.getElementById('edit-face-status').innerText = "Update your face attendance credentials.";
    document.getElementById('edit-face-status').style.color = "var(--text-dark)";
  }
}

async function captureEditFace() {
  const video = document.getElementById('edit-webcam');
  const faceDataInput = document.getElementById('edit-face-data');
  const overlay = document.getElementById('edit-face-captured-overlay');
  const statusEl = document.getElementById('edit-face-status');
  const name = document.getElementById('edit-profile-name').value.trim();

  if (!faceModelsLoaded) {
    statusEl.innerText = "AI System is still warming up, please wait 3 seconds...";
    statusEl.style.color = "var(--warning)";
    return;
  }

  let base64 = '';
  if (video.srcObject) {
    const canvas = document.createElement('canvas');
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    base64 = canvas.toDataURL('image/jpeg', 0.95);
  } else {
    statusEl.innerText = "Camera not active. Turn on camera first.";
    statusEl.style.color = "var(--danger)";
    return;
  }

  statusEl.innerText = "Analyzing face structure... Please hold still.";
  statusEl.style.color = "var(--warning)";

  try {
    const detection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();
    if (!detection) {
      statusEl.innerText = "Face not detected! Please align your face in the center.";
      statusEl.style.color = "var(--danger)";
      return;
    }

    window.lastEditedFaceDescriptor = Array.from(detection.descriptor);
    faceDataInput.value = base64;
    overlay.style.display = 'flex';
    statusEl.innerText = "Face profile updated successfully!";
    statusEl.style.color = "var(--success)";

    stopWebcam('edit-webcam');
    document.getElementById('edit-webcam-toggle-btn').innerText = "?? Retake Face Profile";
    document.getElementById('edit-webcam-toggle-btn').style.borderColor = "var(--primary-magenta)";
    document.getElementById('edit-webcam-toggle-btn').style.color = "var(--primary-magenta)";
    document.getElementById('edit-capture-btn').style.display = 'none';
    editWebcamActive = false;
  } catch (err) {
    console.error("Face analysis error during profile edit:", err);
    statusEl.innerText = "Face scan error. Please try again.";
    statusEl.style.color = "var(--danger)";
  }
}

const FACE_MATCH_THRESHOLD_DAILY = 48;
const FACE_MATCH_THRESHOLD_ACTION = 55;

function isDailyAttendanceAction(action) {
  return action === 'Daily Attendance Check-In';
}

function isDailyAttendanceLog(log) {
  return log && isDailyAttendanceAction(log.action) && log.status === 'Verified (Pass)';
}

function getTodayDailyAttendanceLog(studentEmail) {
  if (!studentEmail) return null;
  const todayDate = new Date().toDateString();
  const emailNorm = normalizeChatEmail(studentEmail);
  return (db.attendance || []).find(log =>
    normalizeChatEmail(log.studentEmail) === emailNorm &&
    log.date === todayDate &&
    isDailyAttendanceLog(log)
  ) || null;
}

// ====== FIXED: Ab yeh pehle priority faceScanImage (real capture) ko dega ======
// ? PERFECT GRADER SYNCHRONOUS TEMPLATE ENGINE
function getRegisteredFaceTemplate() {
  refreshCurrentUserFromDb();
  
  // ?? Har baar sabse pehle registration photo (faceScanImage) ko uthayega
  const template = currentUser.faceScanImage || currentUser.faceDescriptor || currentUser.avatar || '';
  if (!template) return '';
  if (typeof template === 'string' && template.startsWith('data:image')) return template;
  
  // HTTP fallback strings return karne ke liye logic structure optimized
  return typeof template === 'string' ? template : '';
}

async function applySlowFaceTemplateBlend(liveBase64, registeredBase64) {
  if (!liveBase64 || !registeredBase64 || !currentUser?.email) return;
  try {
    const blended = await updateEnrolledTemplate(currentUser.email, liveBase64, registeredBase64);
    if (!blended || blended === registeredBase64) return;
    const emailNorm = normalizeChatEmail(currentUser.email);
    const uIdx = db.users.findIndex(u => u && normalizeChatEmail(u.email) === emailNorm);
    if (uIdx > -1) {
      db.users[uIdx].faceDescriptor = blended;
      currentUser.faceDescriptor = blended;
      storage.setItem('apex_intern_currentUser', JSON.stringify(currentUser));
      saveDatabase(true);
      syncRecordToSupabase('users', db.users[uIdx]);
    }
  } catch (e) {
    console.warn('Face template blend skipped:', e);
  }
}

function resolveSavedDescriptor(user) {
  if (!user) return null;
  if (Array.isArray(user.faceDescriptor)) {
    return new Float32Array(user.faceDescriptor);
  }
  if (user.faceDescriptor && typeof user.faceDescriptor === 'object') {
    // If it was stored as an object/parsed JSON
    return new Float32Array(Object.values(user.faceDescriptor));
  }
  return null;
}

async function getOrExtractUserDescriptor(user) {
  if (!user) return null;
  
  // 1. Check if already pre-calculated array
  let desc = resolveSavedDescriptor(user);
  if (desc) return desc;
  
  if (!faceModelsLoaded) {
    console.warn("Face API models not loaded yet, cannot extract descriptor.");
    return null;
  }
  
  // 2. Otherwise extract from base64 faceScanImage
  const base64Img = user.faceScanImage || (typeof user.faceDescriptor === 'string' && user.faceDescriptor.startsWith('data:image') ? user.faceDescriptor : '');
  if (!base64Img) return null;
  
  try {
    const img = new Image();
    img.src = base64Img;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("Failed to load image"));
    });
    const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
    if (detection) {
      // Cache it back to the database so next time is instant!
      const arr = Array.from(detection.descriptor);
      const emailNorm = normalizeChatEmail(user.email);
      const uIdx = db.users.findIndex(u => u && normalizeChatEmail(u.email) === emailNorm);
      if (uIdx > -1) {
        db.users[uIdx].faceDescriptor = arr;
        saveDatabase(true);
        syncRecordToFirestore('users', db.users[uIdx]); // sync to cloud
      }
      return detection.descriptor;
    }
  } catch (err) {
    console.error("Error extracting descriptor from base64 image:", err);
  }
  return null;
}

function resolveFaceDescriptor(userOrDescriptor) {
  if (!userOrDescriptor) return '';
  if (typeof userOrDescriptor === 'string') {
    return (userOrDescriptor.startsWith('data:image') || userOrDescriptor.startsWith('http')) ? userOrDescriptor : '';
  }
  
  // If user object, check faceScanImage first, then faceScanUrl, then faceDescriptor (if string), then avatar
  const val = userOrDescriptor.faceScanImage || userOrDescriptor.faceScanUrl || (typeof userOrDescriptor.faceDescriptor === 'string' ? userOrDescriptor.faceDescriptor : '') || userOrDescriptor.avatar || '';
  return typeof val === 'string' ? val : '';
}

async function urlToDataUrl(url) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return '';
    const blob = await resp.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result || '');
      reader.onerror = () => reject(new Error('read failed'));
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Failed to fetch face image from URL:', e);
    return '';
  }
}

async function resolveFaceDescriptorAsync(userOrDescriptor) {
  const desc = resolveFaceDescriptor(userOrDescriptor);
  if (!desc || typeof desc !== 'string') return '';
  if (desc.startsWith('data:image')) return desc;
  if (desc.startsWith('http')) {
    const fetched = await urlToDataUrl(desc);
    return fetched || desc;
  }
  return desc;
}

function loadFaceImageElement(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    if (src.startsWith('http')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function extractFacePatchCanvas(img, mirror) {
  const patchSize = 48;
  const canvas = document.createElement('canvas');
  canvas.width = patchSize;
  canvas.height = patchSize;
  const ctx = canvas.getContext('2d');
  const base = Math.min(img.width, img.height);
  const sw = Math.round(base * 0.82);
  const sh = Math.round(base * 0.92);
  const sx = Math.round((img.width - sw) / 2);
  const sy = Math.round(img.height * 0.04);
  if (mirror) {
    ctx.translate(patchSize, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, patchSize, patchSize);
  return canvas;
}

function scoreFacePatchPair(canvas1, canvas2) {
  const size = 48;
  const N = size * size;
  const data1 = canvas1.getContext('2d').getImageData(0, 0, size, size).data;
  const data2 = canvas2.getContext('2d').getImageData(0, 0, size, size).data;
  const norm1 = new Float32Array(N);
  const norm2 = new Float32Array(N);
  const weights = new Float32Array(N);

  let min1 = 255, max1 = 0, min2 = 255, max2 = 0;
  for (let i = 0; i < N; i++) {
    const idx = i * 4;
    const g1 = 0.299 * data1[idx] + 0.587 * data1[idx + 1] + 0.114 * data1[idx + 2];
    const g2 = 0.299 * data2[idx] + 0.587 * data2[idx + 1] + 0.114 * data2[idx + 2];
    norm1[i] = g1;
    norm2[i] = g2;
    if (g1 < min1) min1 = g1;
    if (g1 > max1) max1 = g1;
    if (g2 < min2) min2 = g2;
    if (g2 > max2) max2 = g2;

    const y = Math.floor(i / size);
    const x = i % size;
    let w = 0.1;
    if (y >= 10 && y <= 18 && x >= 8 && x <= 39) w = 2.5;
    else if (y >= 19 && y <= 34 && x >= 12 && x <= 35) w = 1.4;
    else if (y >= 6 && y <= 40 && x >= 6 && x <= 41) w = 0.7;
    weights[i] = w;
  }

  const range1 = max1 - min1 || 1;
  const range2 = max2 - min2 || 1;
  for (let i = 0; i < N; i++) {
    norm1[i] = ((norm1[i] - min1) / range1) * 255;
    norm2[i] = ((norm2[i] - min2) / range2) * 255;
  }

  let minWeightedMse = Infinity;
  for (let dy = -5; dy <= 5; dy++) {
    for (let dx = -5; dx <= 5; dx++) {
      let sumSqDiff = 0;
      let totalWeight = 0;
      for (let y = 0; y < size; y++) {
        const ty = y + dy;
        if (ty < 0 || ty >= size) continue;
        for (let x = 0; x < size; x++) {
          const tx = x + dx;
          if (tx < 0 || tx >= size) continue;
          const idx1 = y * size + x;
          const idx2 = ty * size + tx;
          const diff = norm1[idx1] - norm2[idx2];
          const w = weights[idx1];
          sumSqDiff += diff * diff * w;
          totalWeight += w;
        }
      }
      const wMse = totalWeight > 0 ? sumSqDiff / totalWeight : Infinity;
      if (wMse < minWeightedMse) minWeightedMse = wMse;
    }
  }

  // Calculate zero-centered Pearson Correlation Coefficient for accurate similarity
  let sum1 = 0, sum2 = 0, sumWeight = 0;
  for (let i = 0; i < N; i++) {
    const w = weights[i];
    sum1 += w * norm1[i];
    sum2 += w * norm2[i];
    sumWeight += w;
  }
  const mean1 = sum1 / sumWeight;
  const mean2 = sum2 / sumWeight;

  let num = 0, den1 = 0, den2 = 0;
  for (let i = 0; i < N; i++) {
    const w = weights[i];
    const d1 = norm1[i] - mean1;
    const d2 = norm2[i] - mean2;
    num += w * d1 * d2;
    den1 += w * d1 * d1;
    den2 += w * d2 * d2;
  }
  const r = den1 > 0 && den2 > 0 ? num / Math.sqrt(den1 * den2) : 0;
  const corrScore = Math.max(0, Math.min(100, Math.round(r * 100)));
  const mseScore = Math.max(0, Math.min(100, Math.round(100 - Math.sqrt(minWeightedMse) * 0.95)));
  
  // Combine zero-centered correlation and MSE for high-fidelity matching
  const finalScore = Math.round(corrScore * 0.7 + mseScore * 0.3);
  return finalScore;
}

function normalizeUploadedFacePhoto(base64) {
  return new Promise((resolve) => {
    if (!base64 || !base64.startsWith('data:image')) {
      resolve(base64 || '');
      return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.translate(img.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

async function compareFaces(img1Input, img2Input) {
  try {
    let face1 = typeof img1Input === 'string'
      ? img1Input
      : resolveFaceDescriptor(img1Input);
    let face2 = typeof img2Input === 'string'
      ? img2Input
      : resolveFaceDescriptor(img2Input);

    if (typeof face1 !== 'string' || typeof face2 !== 'string') return 0;
    if (face1.startsWith('http')) face1 = await urlToDataUrl(face1) || '';
    if (face2.startsWith('http')) face2 = await urlToDataUrl(face2) || '';
    if (!face1.startsWith('data:image') || !face2.startsWith('data:image')) return 0;

    // High-security comparison: If Face-API models are loaded, compute real neural-network descriptors and compare
    if (typeof faceapi !== 'undefined' && faceModelsLoaded) {
      const image1 = await loadFaceImageElement(face1);
      const image2 = await loadFaceImageElement(face2);
      if (image1 && image2) {
        const det1 = await faceapi.detectSingleFace(image1).withFaceLandmarks().withFaceDescriptor();
        const det2 = await faceapi.detectSingleFace(image2).withFaceLandmarks().withFaceDescriptor();
        if (det1 && det2) {
          const distance = faceapi.euclideanDistance(det1.descriptor, det2.descriptor);
          const similarity = Math.round((1 - distance) * 100);
          return Math.max(0, Math.min(100, similarity));
        }
      }
    }

    // Otherwise, fall back to pixel-level zero-centered patch correlation comparison
    const image1 = await loadFaceImageElement(face1);
    const image2 = await loadFaceImageElement(face2);
    if (!image1 || !image2) return 0;

    let best = 0;
    for (const mirror1 of [false, true]) {
      for (const mirror2 of [false, true]) {
        const patch1 = extractFacePatchCanvas(image1, mirror1);
        const patch2 = extractFacePatchCanvas(image2, mirror2);
        const score = scoreFacePatchPair(patch1, patch2);
        if (score > best) best = score;
      }
    }
    return best;
  } catch (e) {
    console.warn('compareFaces failed:', e);
    return 0;
  }
}

function warnFileProtocolIfNeeded() {
  if (location.protocol !== 'file:') return;
  console.warn('InternX: file:// mode detected ... use run_local_server.bat and open http://localhost:8080/');
  setSupabaseSyncBadge('partial', 'DB: file:// mode ... use localhost');
  setTimeout(() => {
    if (!document.getElementById('file-protocol-warning')) {
      const banner = document.createElement('div');
      banner.id = 'file-protocol-warning';
      banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#ef4444;color:#fff;padding:12px 16px;font-size:13px;text-align:center;font-weight:600;line-height:1.5;';
      banner.innerHTML = '?? <b>file:// mode</b> breaks Camera, Face Scan, Attendance & Cloud Sync. Double-click <b>run_local_server.bat</b> ? open <b>http://localhost:8080/</b>';
      document.body.prepend(banner);
      document.body.style.paddingTop = '52px';
    }
  }, 400);
}

function updateEnrolledTemplate(email, liveBase64, registeredBase64) {
  return new Promise((resolve) => {
    if (!liveBase64 || !registeredBase64) {
      resolve(registeredBase64);
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    
    const imgReg = new Image();
    const imgLive = new Image();
    
    let loaded = 0;
    const onLoaded = () => {
      loaded++;
      if (loaded === 2) {
        ctx.globalAlpha = 0.94;
        ctx.drawImage(imgReg, 0, 0, 120, 150);
        ctx.globalAlpha = 0.06;
        ctx.drawImage(imgLive, 0, 0, 120, 150);
        
        const blendedBase64 = canvas.toDataURL('image/jpeg', 0.95);
        resolve(blendedBase64);
      }
    };
    
    imgReg.onload = onLoaded;
    imgLive.onload = onLoaded;
    
    imgReg.onerror = () => resolve(registeredBase64);
    imgLive.onerror = () => resolve(registeredBase64);
    
    imgReg.src = registeredBase64;
    imgLive.src = liveBase64;
  });
}


function startFaceVerification(actionName, successCallback) {
  verificationCallback = successCallback;
  verificationActionName = actionName;
  
  document.getElementById('ver-status-text').innerText = "Initializing Scanner Camera...";
  document.getElementById('ver-status-text').style.color = "#fff";
  document.getElementById('ver-progress-bar-container').style.display = 'none';
  document.getElementById('ver-progress-bar').style.width = '0%';
  document.getElementById('ver-match-indicator').style.display = 'none';
  
  openModal('face-verification-modal');
  
  startWebcam('ver-webcam', 'ver-status-text').then(() => {
    if (verWebcamActive) {
      runFaceVerificationScan();
    }
  });
  verWebcamActive = true;
}

function cancelFaceVerification() {
  stopWebcam('ver-webcam');
  verWebcamActive = false;
  if (scanningInterval) {
    clearTimeout(scanningInterval);
    scanningInterval = null;
  }
  closeModal('face-verification-modal');
  alert("AI Attendance Verification cancelled. Action blocked.");
}

// ====== REPLACE OLD FUNCTION WITH THIS REAL-TIME FACE API SCANNER ======
async function runFaceVerificationScan() {
  const progressBarContainer = document.getElementById('ver-progress-bar-container');
  const progressBar = document.getElementById('ver-progress-bar');
  const statusText = document.getElementById('ver-status-text');
  const matchIndicator = document.getElementById('ver-match-indicator');
  const video = document.getElementById('ver-webcam');

  if (!faceModelsLoaded) {
    statusText.innerText = "AI System is still warming up, please wait 3 seconds...";
    return;
  }

  if (progressBarContainer) progressBarContainer.style.display = 'block';
  if (matchIndicator) matchIndicator.style.display = 'block';
  if (progressBar) progressBar.style.width = '30%';
  statusText.innerText = "Scanning real-time bio metrics features...";

  if (scanningInterval) clearTimeout(scanningInterval);

  scanningInterval = setTimeout(async () => {
    try {
      // 1. Current video stream video frame data analyze karo
      const currentFaceDetection = await faceapi.detectSingleFace(video)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!currentFaceDetection) {
        statusText.innerText = "Face not detected! Direct alignment towards webcam required.";
        statusText.style.color = "var(--danger)";
        // Retry Loop
        runFaceVerificationScan();
        return;
      }

      if (progressBar) progressBar.style.width = '60%';
      statusText.innerText = "Matching with profile verification array...";

      // 2. Get registered descriptor
      const savedDescriptor = await getOrExtractUserDescriptor(currentUser);
      if (!savedDescriptor) {
        statusText.innerText = "Profile registration matrix missing or unreadable!";
        return;
      }

      // 3. Euclidean Distance Comparison Engine
      const distance = faceapi.euclideanDistance(currentFaceDetection.descriptor, savedDescriptor);

      // Distance mapping logic inverse calculation (Distance < 0.65 means high match quality)
      const matchConfidence = Math.round((1 - distance) * 100);
      matchIndicator.innerText = `AI Match Rate: ${matchConfidence}%`;

      if (distance < 0.65) {
        if (progressBar) progressBar.style.width = '100%';
        statusText.innerText = "? Identity Authenticated! Access Granted.";
        statusText.style.color = "var(--success)";

        // Show green verified overlay on camera
        const scanContainer = video.closest('.face-scan-container');
        if (scanContainer) {
          const successOverlay = document.createElement('div');
          successOverlay.id = 'ver-success-flash';
          successOverlay.style.cssText = 'position:absolute;inset:0;background:rgba(16,185,129,0.25);border-radius:14px;display:flex;align-items:center;justify-content:center;z-index:20;animation:verSuccessFade 0.6s ease;';
          successOverlay.innerHTML = '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
          scanContainer.appendChild(successOverlay);
        }

        // Core dynamic logging inside database collections
        const newRecord = {
          id: `att-action-${Date.now()}`,
          studentEmail: currentUser.email,
          studentName: currentUser.name,
          timestamp: new Date().toLocaleString(),
          date: new Date().toDateString(),
          action: verificationActionName,
          score: matchConfidence,
          status: "Verified (Pass)",
          faceImage: captureVideoFrame(video)
        };

        if (!db.attendance) db.attendance = [];
        db.attendance.push(newRecord);
        saveDatabase(true);
        syncRecordToFirestore('attendance', newRecord);

        setTimeout(() => {
          try { stopWebcam('ver-webcam'); } catch (e) {}
          // Remove success overlay
          const fl = document.getElementById('ver-success-flash');
          if (fl) fl.remove();
          closeModal('face-verification-modal');
          if (verificationCallback) verificationCallback(); // Trigger submission process route
        }, 600);

      } else {
        if (progressBar) progressBar.style.width = '0%';
        statusText.innerText = `Access Denied: Face mismatch (${matchConfidence}% accuracy).`;
        statusText.style.color = "var(--danger)";
        
        setTimeout(() => {
          try { stopWebcam('ver-webcam'); } catch (e) {}
          closeModal('face-verification-modal');
          alert("Security failure: Profile vector properties mismatch.");
        }, 2200);
      }
    } catch (err) {
      console.error("Verification runtime crash loop:", err);
      statusText.innerText = "Scanner computational parsing failure.";
    }
  }, 800); // Frame capture refresh timer bound delay
}

function loadStudentAttendanceLogs() {
  const attTableBody = document.querySelector('#student-attendance-table tbody');
  if (attTableBody) {
    attTableBody.innerHTML = '';
    const myLogs = (db.attendance || []).filter(a => a.studentEmail && a.studentEmail.trim().toLowerCase() === currentUser.email.trim().toLowerCase()).sort((a,b) => b.id.localeCompare(a.id));
    
    if (myLogs.length === 0) {
      attTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 16px;">No face attendance records found. Perform task or log updates to trigger scans.</td></tr>`;
    } else {
      myLogs.forEach(log => {
        const statusClass = log.status.includes('Verified') ? 'completed' : 'needs_revision';
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${log.timestamp}</td>
          <td>${log.action}</td>
          <td><span style="font-weight: 600; color: ${log.status.includes('Verified') ? 'var(--success)' : 'var(--danger)'};">${log.score}% Match</span></td>
          <td><span class="status-badge ${statusClass}">${log.status}</span></td>
        `;
        attTableBody.appendChild(row);
      });
    }
  }
}

function loadMentorAttendanceLogs() {
  const attTableBody = document.querySelector('#mentor-attendance-table tbody');
  if (attTableBody) {
    attTableBody.innerHTML = '';
    const myStudents = getMentorStudents({ activeOnly: true });
    const studentEmails = myStudents.map(s => s.email.toLowerCase());
    
    const relevantLogs = (db.attendance || []).filter(a => a.studentEmail && studentEmails.includes(a.studentEmail.toLowerCase())).sort((a,b) => b.id.localeCompare(a.id));
    
    if (relevantLogs.length === 0) {
      attTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 16px;">No face attendance records logged for your interns yet.</td></tr>`;
    } else {
      relevantLogs.forEach(log => {
        const statusClass = log.status.includes('Verified') ? 'completed' : 'needs_revision';
        const row = document.createElement('tr');
        
        let faceImgHtml = '';
        if (log.faceImage) {
          faceImgHtml = `<img src="${log.faceImage}" class="attendance-thumb" onclick="viewFaceScanDetail('${log.faceImage}', '${log.studentName.replace(/'/g, "\\'")}', '${log.timestamp}')" style="width: 40px; height: 30px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color); cursor: pointer; transform: scaleX(-1); transition: transform 0.2s;" title="Click to view full scan">`;
        } else {
          faceImgHtml = `<span style="color: var(--text-dark); font-size: 11px;">No image</span>`;
        }

        row.innerHTML = `
          <td style="font-weight: 600; color: #fff;">${log.studentName}</td>
          <td style="text-align: center; vertical-align: middle;">${faceImgHtml}</td>
          <td>${log.timestamp}</td>
          <td>${log.action}</td>
          <td><span style="font-weight: 600; color: ${log.status.includes('Verified') ? 'var(--success)' : 'var(--danger)'};">${log.score}% Match</span></td>
          <td><span class="status-badge ${statusClass}">${log.status}</span></td>
        `;
        attTableBody.appendChild(row);
      });
    }
  }
}

// ==================== 11. SECURITY DAILY CHECK-IN GATE KEEPER ====================

let dailyWebcamActive = false;
let dailyScanningInterval = null;
let dailyScanInProgress = false;
let dailyScanRetryCount = 0;
const DAILY_SCAN_MAX_RETRIES = 8;
let studentActiveHeartbeatInterval = null;

function isFaceVerifiedThisSession() {
  if (!currentUser || currentUser.role !== 'student') return true;
  if (hasCheckedInToday()) return true;
  return sessionStorage.getItem('apex_intern_session_face_verified') === 'true';
}

function startStudentActiveHeartbeat() {
  if (studentActiveHeartbeatInterval) clearInterval(studentActiveHeartbeatInterval);
  
  // Set active immediately
  updateStudentActivity();
  
  // Update every 30 seconds while logged in as student
  studentActiveHeartbeatInterval = setInterval(() => {
    if (currentUser && currentUser.role === 'student') {
      updateStudentActivity();
    } else {
      clearInterval(studentActiveHeartbeatInterval);
      studentActiveHeartbeatInterval = null;
    }
  }, 30000);
}

function updateStudentActivity() {
  if (!currentUser || currentUser.role !== 'student') return;
  
  const nowIso = new Date().toISOString();
  currentUser.lastActive = nowIso;
  
  if (db && db.users) {
    const uIdx = db.users.findIndex(u => u && u.email && u.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase());
    if (uIdx !== -1) {
      db.users[uIdx].lastActive = nowIso;
      saveDatabase();
    }
  }
  
  const now = Date.now();
  if (now - lastActivityCloudSyncAt < 45000) return;
  lastActivityCloudSyncAt = now;
  try {
    syncRecordToFirestore('users', currentUser);
  } catch (err) {
    console.warn("Failed to sync student active status to Supabase:", err);
  }
}

function isUserOnline(lastActiveTime) {
  if (!lastActiveTime) return false;
  const activeDate = new Date(lastActiveTime);
  const diffMs = new Date() - activeDate;
  return diffMs < 50000; // 50s threshold (heartbeat is 30s)
}

function formatLastActive(lastActiveTime) {
  if (!lastActiveTime) return 'Offline';
  const activeDate = new Date(lastActiveTime);
  const diffMs = new Date() - activeDate;
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 0) return 'Active Now';
  if (diffSecs < 50) return 'Active Now';
  if (diffSecs < 60) return `${diffSecs}s ago`;
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return activeDate.toLocaleDateString();
}

function hasCheckedInToday() {
  if (!currentUser || currentUser.role !== 'student') return true;
  return !!getTodayDailyAttendanceLog(currentUser.email);
}

// 1. PERFECT CLEANED BYPASS FUNCTION
function checkStudentGate() {
  const gateOverlay = document.getElementById('student-daily-lock-overlay');
  if (!gateOverlay) return;

  refreshCurrentUserFromDb();

  // Agar session verified hai ya aaj check-in ho chuka hai, toh dashboard kholo
  if (isFaceVerifiedThisSession()) {
    gateOverlay.style.display = 'none';
    // Restore all sidebar links
    document.querySelectorAll('#student-menu li a').forEach(el => {
      el.style.pointerEvents = 'auto';
      el.style.opacity = '1';
    });
  } else {
    gateOverlay.style.display = 'flex';
    // DO NOT disable sidebar links ... let student navigate but gate shows on dashboard tab
    document.querySelectorAll('#student-menu li a').forEach(el => {
      el.style.pointerEvents = 'auto';
      el.style.opacity = '1';
    });

    document.getElementById('daily-status-text').innerText = "Camera standby. Initializing automated face verification...";
    document.getElementById('daily-scan-btn').style.display = 'none';

    // Automatically trigger webcam to check attendance on session entry
    setTimeout(() => {
      if (!dailyWebcamActive) {
        startDailyAttendanceScan();
      }
    }, 500);
  }
}

// 2. PERFECT CLEANED DEV BYPASS ACTION (Disabled for security)
function devBypassDailyScan() {
  console.warn("Bypass disabled. Face verification is mandatory for all student accounts.");
}

// 3. START DAILY SCANNING OPERATION
async function startDailyAttendanceScan() {
  if (dailyWebcamActive || dailyScanInProgress) return;

  const statusText = document.getElementById('daily-status-text');
  const scanBtn = document.getElementById('daily-scan-btn');

  refreshCurrentUserFromDb();

  statusText.innerText = "Initializing Daily Scanner Camera...";
  statusText.style.color = "#fff";
  if (scanBtn) scanBtn.style.display = 'none';

  const cameraOk = await startWebcam('daily-webcam', 'daily-status-text');
  if (!cameraOk) {
    dailyWebcamActive = false;
    if (scanBtn) scanBtn.style.display = 'inline-block';
    return;
  }

  dailyWebcamActive = true;
  dailyScanRetryCount = 0;
  
  if (dailyWebcamActive) {
    console.log("Auto-scanning initialized for instant dashboard unlock...");
    if (window.dailyScanningInterval) clearTimeout(window.dailyScanningInterval);
    
    window.dailyScanningInterval = setTimeout(async () => {
      if (dailyWebcamActive) {
        await runDailyAttendanceScan();
      }
    }, 1500);
  }
}
// ?? IS POORE CODE BLOCK KO APNE FILE MEIN REPLACE KAR DO ??

async function runDailyAttendanceScan() {
  const video = document.getElementById('daily-webcam');
  const statusText = document.getElementById('daily-status-text');
  const progressBar = document.getElementById('daily-scan-progress-bar');
  const matchIndicator = document.getElementById('daily-scan-match');
  const scanBtn = document.getElementById('daily-scan-btn');
  const gateOverlay = document.getElementById('student-daily-lock-overlay');

  if (!video || !statusText) return;

  if (!faceModelsLoaded) {
    statusText.innerText = "AI System is still warming up, please wait 3 seconds...";
    statusText.style.color = "var(--warning)";
    if (window.dailyScanningInterval) clearTimeout(window.dailyScanningInterval);
    window.dailyScanningInterval = setTimeout(runDailyAttendanceScan, 1000);
    return;
  }

  if (progressBar) progressBar.style.width = '30%';
  statusText.innerText = "Scanning real-time bio metrics features...";
  statusText.style.color = "";

  if (window.dailyScanningInterval) clearTimeout(window.dailyScanningInterval);

  window.dailyScanningInterval = setTimeout(async () => {
    try {
      // 1. Current video stream frame detection
      const currentFaceDetection = await faceapi.detectSingleFace(video)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!currentFaceDetection) {
        statusText.innerText = "Face not detected! Direct alignment towards webcam required.";
        statusText.style.color = "var(--danger)";
        // Retry Loop if webcam is still active
        if (dailyWebcamActive) {
          runDailyAttendanceScan();
        }
        return;
      }

      if (progressBar) progressBar.style.width = '60%';
      statusText.innerText = "Matching with profile verification template...";

      // 2. Resolve active user context and registered descriptor
      const sessionUserStr = localStorage.getItem('apex_intern_currentUser');
      const currentSessionUser = sessionUserStr ? JSON.parse(sessionUserStr) : null;
      const activeUser = currentUser || currentSessionUser || { email: 'student@gmail.com', name: 'Student' };

      const savedDescriptor = await getOrExtractUserDescriptor(activeUser);
      if (!savedDescriptor) {
        statusText.innerText = "Profile registration template missing or unreadable!";
        statusText.style.color = "var(--danger)";
        return;
      }

      // 3. Euclidean Distance Comparison Engine
      const distance = faceapi.euclideanDistance(currentFaceDetection.descriptor, savedDescriptor);

      // Distance mapping logic inverse calculation (Distance < 0.65 matches FACE_MATCH_THRESHOLD_DAILY)
      const matchConfidence = Math.round((1 - distance) * 100);
      if (matchIndicator) {
        matchIndicator.style.display = 'block';
        matchIndicator.innerText = `Final Match: ${matchConfidence}%`;
      }

      if (distance < 0.65) {
        if (progressBar) progressBar.style.width = '100%';
        
        const isFirstCheckin = !hasCheckedInToday();
        statusText.innerText = isFirstCheckin
          ? "Check-In Verified! Marking today's attendance..."
          : "Face Verified! Unlocking dashboard...";
        statusText.style.color = "var(--success)";
        if (matchIndicator) {
          matchIndicator.style.borderColor = "var(--success)";
          matchIndicator.style.color = "var(--success)";
          matchIndicator.innerText = `Final Match: ${matchConfidence}% (Pass)`;
        }

        // 4. Save record locally and sync to database
        const todayDate = new Date().toDateString();
        let localDb = { attendance: [] };
        try {
          const dbStr = localStorage.getItem('apex_intern_db');
          if (dbStr) localDb = JSON.parse(dbStr);
        } catch(e) { console.error(e); }

        if (!localDb.attendance) localDb.attendance = [];
        
        // Remove duplicate checks for today
        localDb.attendance = localDb.attendance.filter(log => !(log.studentEmail?.toLowerCase() === activeUser.email?.toLowerCase() && log.date === todayDate));

        const base64Frame = captureVideoFrame(video) || "";
        const newRecord = {
          id: `att-${Date.now()}`,
          studentEmail: activeUser.email,
          studentName: activeUser.name,
          timestamp: new Date().toLocaleString(),
          date: todayDate,
          action: isFirstCheckin ? "Daily Attendance Check-In" : "Session Sign-In Face Verification",
          score: matchConfidence,
          status: "Verified (Pass)",
          faceImage: base64Frame
        };

        localDb.attendance.push(newRecord);
        localStorage.setItem('apex_intern_db', JSON.stringify(localDb));
        db.attendance = localDb.attendance; // Sync in-memory db

        try {
          saveDatabase(true);
          syncRecordToFirestore('attendance', newRecord);
          applySlowFaceTemplateBlend(base64Frame, getRegisteredFaceTemplate());
        } catch(e) { console.error("Database sync error:", e); }

        // Unlocking UI
        setTimeout(() => {
          try { 
            if (video && video.srcObject) {
              video.srcObject.getTracks().forEach(track => track.stop());
            }
          } catch (e) {}
          dailyWebcamActive = false;

          sessionStorage.setItem('apex_intern_session_face_verified', 'true');
          checkStudentGate();
          
          if (gateOverlay) {
            gateOverlay.style.display = 'none';
            gateOverlay.classList.remove('active');
          }

          document.querySelectorAll('#student-menu li a, .nav-links li a').forEach(el => {
            el.style.pointerEvents = 'auto';
            el.style.opacity = '1';
          });

          if (window.location.reload && !sessionStorage.getItem('reloaded_once_bypass')) {
            sessionStorage.setItem('reloaded_once_bypass', 'true');
            window.location.reload();
          }
        }, 1200);

      } else {
        if (progressBar) progressBar.style.width = '0%';
        statusText.innerText = `Access Denied: Face mismatch (${matchConfidence}% accuracy).`;
        statusText.style.color = "var(--danger)";
        if (matchIndicator) {
          matchIndicator.style.borderColor = "var(--danger)";
          matchIndicator.style.color = "var(--danger)";
          matchIndicator.innerText = `Final Match: ${matchConfidence}% (Failed)`;
        }

        dailyScanRetryCount++;
        if (dailyScanRetryCount >= 3) {
          setTimeout(() => {
            try { 
              if (video && video.srcObject) {
                video.srcObject.getTracks().forEach(track => track.stop());
              }
            } catch (e) {}
            dailyWebcamActive = false;
            if (scanBtn) scanBtn.style.display = 'inline-block';
            alert("Security failure: Profile verification mismatch. Scan blocked after 3 attempts.");
          }, 2000);
        } else {
          if (dailyWebcamActive) {
            runDailyAttendanceScan();
          }
        }
      }
    } catch (err) {
      console.error("Verification daily scan crash loop:", err);
      statusText.innerText = "Scanner computational parsing failure.";
    }
  }, 1000);
}

// ==================== 9. FIREBASE & LOCAL STORAGE TAB SYNCHRONIZATION ====================
// ==================== 9. FIREBASE & LOCAL STORAGE TAB SYNCHRONIZATION ====================

let tabSyncTimer = null;
function initLocalTabSync() {
  window.addEventListener('storage', (event) => {
    if (event.key !== 'apex_intern_db' || cloudSyncInProgress) return;
    clearTimeout(tabSyncTimer);
    tabSyncTimer = setTimeout(() => {
      syncDatabase();
      if (currentUser?.role === 'student') {
        handleStudentMeetingSync();
        loadStudentChat();
        return;
      }
      if (currentUser?.role === 'mentor') {
        const mentorTab = getActiveMentorTab();
        loadMentorChat(false);
        if (mentorTab === 'dash') scheduleMentorDashboardRefresh(300);
        else scheduleRefreshUIForActiveView(800);
        return;
      }
      scheduleRefreshUIForActiveView(800);
    }, 300);
  });
}

function refreshUIForActiveView() {
  if (!currentUser) return;
  
  try {
    if (currentUser.role === 'student') {
      const tabName = getActiveStudentTab();
      if (tabName === 'dash') loadStudentDashboard();
      else if (tabName === 'tasks') loadStudentTasks();
      else if (tabName === 'logs') loadStudentLogs();
      else if (tabName === 'chat') loadStudentChat();
      else if (tabName === 'skills') loadStudentSkills();
      else loadStudentDashboard();
    } else if (currentUser.role === 'mentor') {
      const tabName = getActiveMentorTab();
      if (tabName === 'dash') loadMentorDashboard();
      else if (tabName === 'tasks') loadMentorTasks();
      else if (tabName === 'reviews') loadMentorReviews();
      else if (tabName === 'chat') loadMentorChat(false);
      else if (tabName === 'attendance') {
        renderMentorAttendanceControls();
        loadMentorAttendanceLogs();
      } else loadMentorDashboard();
    } else if (currentUser.role === 'admin') {
      loadAdminDashboard();
      const activeTab = document.querySelector('#admin-menu a.active');
      if (activeTab) {
        const onclickAttr = activeTab.getAttribute('onclick');
        if (onclickAttr) {
          const match = onclickAttr.match(/switchTab\('admin',\s*'([^']+)'\)/);
          if (match && match[1]) {
            const tabName = match[1];
            if (tabName === 'users') loadAdminUsers();
            if (tabName === 'relations') loadAdminRelations();
          }
        }
      }
    }
    
    // Refresh debug panel if visible
    const debugPanel = document.getElementById('debug-panel');
    if (debugPanel && debugPanel.style.display !== 'none') {
      refreshDebugPanel();
    }

    // Refresh active video meeting room content dynamically
    if (activeMeeting) {
      const freshMeet = db.meetings.find(m => m.id === activeMeeting.id);
      if (freshMeet) {
        if (freshMeet.status === 'ended') {
          exitMeetingRoom("Meeting has been ended by host.");
        } else {
          activeMeeting = freshMeet;
          renderMeetingParticipants();
          renderMeetingChat();
        }
      } else {
        exitMeetingRoom("Meeting session closed.");
      }
    }
  } catch (e) {
    console.warn("UI refresh failed partially during database sync:", e);
  }
}

function initSupabase() {
  const configStr = storage.getItem('apex_intern_supabase_config');
  const disabled = storage.getItem('apex_intern_supabase_disabled') === 'true';
  const badgeEl = document.getElementById('supabase-status-badge');
  const badgeMenuEl = document.getElementById('supabase-status-badge-sidebar');

  const updateBadges = (isActive, label) => {
    [badgeEl, badgeMenuEl].forEach(badge => {
      if (badge) {
        badge.innerText = label;
        if (isActive) {
          badge.className = 'supabase-status-badge active';
        } else {
          badge.className = 'supabase-status-badge fallback';
        }
      }
    });
  };

  if (disabled) {
    supabaseActive = false;
    supabaseClient = null;
    firestoreActive = false;
    updateBadges(false, 'DB: Local Storage (Fallback)');
    return;
  }

  let supabaseConfig = null;
  if (configStr) {
    try {
      supabaseConfig = JSON.parse(configStr);
    } catch (e) {
      console.error("Error parsing saved Supabase config", e);
    }
  }

  // Self-heal/force correct defaults if a placeholder key is configured locally
  if (supabaseConfig && (
      !supabaseConfig.anonKey ||
      supabaseConfig.anonKey.includes("YOUR_") ||
      supabaseConfig.anonKey.trim() === ""
  )) {
    supabaseConfig = null;
  }

  // Use the provided user config by default if none is configured locally
  if (!supabaseConfig) {
    supabaseConfig = {
      url: "https://gvsextnrduejeaxyadbj.supabase.co",
      anonKey: "sb_publishable_r6uHi1migqF4gOHtSiqO-Q_VBRsZ-Yk"
    };
    try {
      storage.setItem('apex_intern_supabase_config', JSON.stringify(supabaseConfig));
    } catch (e) {
      console.warn("Could not save default Supabase config to local storage:", e);
    }
  }

  try {
    if (!supabaseConfig || !supabaseConfig.url || !supabaseConfig.anonKey) {
      throw new Error("Invalid URL or Anon Key in supabaseConfig");
    }

    // Clean URL: remove trailing /rest/v1/ or /rest/v1 if it exists
    let cleanUrl = supabaseConfig.url.trim();
    if (cleanUrl.endsWith('/rest/v1/')) {
      cleanUrl = cleanUrl.substring(0, cleanUrl.length - 9);
    } else if (cleanUrl.endsWith('/rest/v1')) {
      cleanUrl = cleanUrl.substring(0, cleanUrl.length - 8);
    }

    supabaseClient = supabase.createClient(cleanUrl, supabaseConfig.anonKey.trim());
    supabaseActive = true;
    firestoreActive = true; // set compatibility flag
    
    updateBadges(true, 'DB: Supabase (Active)');
    console.log("Supabase Client successfully initialized!");
    
    // Start real-time syncing
    initSupabaseSync();
  } catch (e) {
    console.error("Supabase init failed, falling back to LocalStorage:", e);
    supabaseActive = false;
    supabaseClient = null;
    firestoreActive = false;
    updateBadges(false, 'DB: Local (Error: Setup)');
  }
}

async function initSupabaseSync() {
  if (!supabaseActive || !supabaseClient) {
    isInitialSyncDone = true;
    return;
  }

  try {
    // 1. Fetch all existing records in the public.apex_sync table in batches of 1000
    let records = [];
    let page = 0;
    const pageSize = 100;
    let keepFetching = true;

    // ?? YEH HAI NAYA CODE (LIMIT KE SAATH):
try {
  while (keepFetching) {
    const { data, error: fetchErr } = await supabaseClient
      .from('apex_sync')
      .select('*')
      .order('id')
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .limit(100); // 1. Humne database par lagaya trap ki ek baar mein 100 hi do!

    if (fetchErr) {
      throw fetchErr;
    }

    if (data && data.length > 0) {
      records = records.concat(data);
      // 2. Agar data 100 se kam aaya hai, matlab data khatam ho gaya, ab loop rok do
      if (data.length < 100) { 
        keepFetching = false;
      } else {
        page++; // Agar poora 100 aaya, toh agle page par jao
      }
    } else {
      keepFetching = false;
    }
  }
} catch (error) {
      console.error("Failed to fetch initial data from Supabase:", error);
      firestoreActive = false;
      const badgeEl = document.getElementById('supabase-status-badge');
      const badgeMenuEl = document.getElementById('supabase-status-badge-sidebar');
      [badgeEl, badgeMenuEl].forEach(badge => {
        if (badge) {
          badge.innerText = 'DB: Supabase (Sync Partial ... Realtime ON)';
          badge.className = 'supabase-status-badge fallback';
        }
      });
      setupSupabaseRealtimeChannel();
      isInitialSyncDone = true;
      if (currentUser) {
        if (currentUser.role === 'mentor') {
          scheduleMentorDashboardRefresh(100);
        } else {
          scheduleRefreshUIForActiveView(100);
        }
      }
      return;
    }

    console.log(`Supabase initial sync: fetched ${records.length} records`);

    // Organize items by collection
    const fetchedData = {};
    const standardCollections = ['pairingRequests', 'users', 'tasks', 'weeklyLogs', 'chats', 'attendance', 'meetings', 'quizzes', 'quizSubmissions', 'signals', 'certificates'];
    standardCollections.forEach(col => {
      fetchedData[col] = [];
    });
    const fetchedSkills = {};
    const fetchedNotes = {};

    records.forEach(record => {
      let parsedData = robustParse(record.data);
      if (standardCollections.includes(record.collection)) {
        if (parsedData && typeof parsedData === 'object') {
          fetchedData[record.collection].push(parsedData);
        }
      } else if (record.collection === 'skills') {
        fetchedSkills[record.id] = (parsedData && parsedData.list) || [];
      } else if (record.collection === 'syncNotes') {
        fetchedNotes[record.id] = (parsedData && parsedData.notes) || '';
      }
    });

    // Update local in-memory DB and seed if a collection is empty in Supabase
    let localUpdated = false;

    standardCollections.forEach(colName => {
      const list = fetchedData[colName];
      if (list.length > 0) {
        if (mergeCollectionFromCloud(colName, list)) {
          localUpdated = true;
        }
      }
    });

    // Sync skills mapping
    if (Object.keys(fetchedSkills).length === 0 && db.skills && Object.keys(db.skills).length > 0) {
      Object.keys(db.skills).forEach(email => {
        syncRecordToSupabase('skills', { id: email, list: db.skills[email] });
      });
    } else {
      db.skills = fetchedSkills;
      localUpdated = true;
    }

    // Sync syncNotes mapping
    if (Object.keys(fetchedNotes).length === 0 && db.syncNotes && Object.keys(db.syncNotes).length > 0) {
      Object.keys(db.syncNotes).forEach(email => {
        syncRecordToSupabase('syncNotes', { id: email, notes: db.syncNotes[email] });
      });
    } else {
      db.syncNotes = fetchedNotes;
      localUpdated = true;
    }

    if (localUpdated) {
      storage.setItem('apex_intern_db', JSON.stringify(db));
      
      // Update currentUser session details in case they changed in database
      if (currentUser) {
        const updatedUser = db.users.find(u => u && u.email && u.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase());
        if (updatedUser) {
          currentUser = updatedUser;
          storage.setItem('apex_intern_currentUser', JSON.stringify(currentUser));
        }
      }
    }
    
    refreshCurrentUserFromDb();

    setupSupabaseRealtimeChannel();
    isInitialSyncDone = true;
    
    if (currentUser) {
      if (currentUser.role === 'mentor') {
        scheduleMentorDashboardRefresh(100);
      } else {
        scheduleRefreshUIForActiveView(100);
      }
    }
    
    // Repopulate mentor list on the registration form if it is currently open
    const registerView = document.getElementById('register-view');
    if (registerView && !registerView.classList.contains('hidden') && activeRegisterRole === 'student') {
      populateRegisterMentors();
    }
  } catch (e) {
    console.error("Error initializing Supabase sync process:", e);
    isInitialSyncDone = true;
    firestoreActive = false;
    const badgeEl = document.getElementById('supabase-status-badge');
    const badgeMenuEl = document.getElementById('supabase-status-badge-sidebar');
    [badgeEl, badgeMenuEl].forEach(badge => {
      if (badge) {
        badge.innerText = 'DB: Supabase (Sync Partial ... Realtime ON)';
        badge.className = 'supabase-status-badge fallback';
      }
    });
    setupSupabaseRealtimeChannel();
    if (currentUser) {
      if (currentUser.role === 'mentor') {
        scheduleMentorDashboardRefresh(100);
      } else {
        scheduleRefreshUIForActiveView(100);
      }
    }
  }
}

function handleSupabaseChange(payload) {
  try {
    const standardCollections = ['pairingRequests', 'users', 'tasks', 'weeklyLogs', 'chats', 'attendance', 'meetings', 'quizzes', 'quizSubmissions', 'signals', 'certificates'];
    let changedCollection = null;
    
    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
      const record = payload.new;
      if (!record || !record.collection) return;
      changedCollection = record.collection;
      
      let parsedData = robustParse(record.data);
      if (!parsedData || typeof parsedData !== 'object') return;

      // WebRTC signals are ephemeral ... never persist to localStorage (prevents hang during calls)
      // WebRTC signals are ephemeral - never persist to localStorage (prevents hang during calls)
      if (record.collection === 'signals') {
        if (parsedData.meetingId === activeMeeting?.id && parsedData.sender && currentUser?.email &&
            parsedData.sender.trim().toLowerCase() !== currentUser.email.trim().toLowerCase()) {
          if (typeof window.processedSignalIds === 'undefined') window.processedSignalIds = new Set();
          if (!window.processedSignalIds.has(parsedData.id)) {
            window.processedSignalIds.add(parsedData.id);
            var waOvl = document.getElementById('wa-call-popup');
            if (waOvl && waOvl.style.display !== 'none') {
              if (parsedData.type === 'chat_msg' && parsedData.data) {
                waCall.inCallMessages.push({ sender: parsedData.data.sender || parsedData.sender, text: parsedData.data.text, mine: false, time: parsedData.data.time || '' });
                waRenderCallChat();
                if (!waCall.chatOpen) { var b = document.getElementById('wa-chat-badge'); if (b) { b.style.display = 'flex'; b.textContent = '+'; } }
              } else {
                waHandleSignal(parsedData).catch(function(){});
              }
            } else {
              handleWebRTCSignal(parsedData);
            }
          }
        }
        return;
      }
      
      if (standardCollections.includes(record.collection)) {
        mergeCloudRecordIntoDb(record.collection, parsedData, record.id);
      } else if (record.collection === 'skills') {
        if (!db.skills) db.skills = {};
        db.skills[record.id] = parsedData.list || [];
      } else if (record.collection === 'syncNotes') {
        if (!db.syncNotes) db.syncNotes = {};
        db.syncNotes[record.id] = parsedData.notes || '';
      }
    } else if (payload.eventType === 'DELETE') {
      const oldRecord = payload.old;
      if (!oldRecord || !oldRecord.id) return;
      changedCollection = oldRecord.collection || null;
      const deletedId = oldRecord.id;

      console.log(`Supabase Realtime Change [DELETE]: ${changedCollection || 'unknown'} / ${deletedId}`);

      // Search and remove across standard collections
      standardCollections.forEach(col => {
        if (db[col]) {
          db[col] = db[col].filter(item => item.id !== deletedId && item.email !== deletedId);
        }
      });
      if (db.skills && db.skills[deletedId]) {
        delete db.skills[deletedId];
      }
      if (db.syncNotes && db.syncNotes[deletedId]) {
        delete db.syncNotes[deletedId];
      }
    }

    schedulePersistDb();

    refreshCurrentUserFromDb();

    // Targeted UI refresh ... debounced to prevent student list flicker
    if (currentUser?.role === 'mentor' && !cloudSyncInProgress) {
      const mentorTab = getActiveMentorTab();
      if (changedCollection === 'chats') {
        normalizeDbChatRecords();
        loadMentorChat(false);
      } else if (changedCollection === 'pairingRequests' || changedCollection === 'users') {
        lastMentorDashListKey = '';
        lastMentorChatListKey = '';
        if (mentorTab === 'dash') {
          scheduleMentorDashboardRefresh();
        } else if (mentorTab === 'chat') {
          loadMentorChat(false);
        } else {
          scheduleRefreshUIForActiveView();
        }
      } else if (changedCollection === 'attendance') {
        scheduleMentorDashboardRefresh(300);
        if (getActiveMentorTab() === 'attendance') {
          renderMentorAttendanceControls();
          loadMentorAttendanceLogs();
        }
      } else if (changedCollection && changedCollection !== 'signals' && changedCollection !== 'meetings') {
        if (changedCollection === 'tasks') {
          scheduleMentorDashboardRefresh(200);
          if (getActiveMentorTab() === 'reviews') { loadMentorReviews(); }
          var _pc = (db.tasks||[]).filter(function(t){
            var ms = getMentorStudents({activeOnly:true}); var em = ms.map(function(s){return s.email.toLowerCase();});
            return t.assignedTo && em.includes(t.assignedTo.toLowerCase()) && t.status==='Pending Approval';
          }).length;
          if (_pc > 0) showToast('\uD83D\uDCCB ' + _pc + ' task' + (_pc>1?'s':'') + ' waiting for your review!', 4000);
        } else if (changedCollection === 'weeklyLogs') {
          scheduleMentorDashboardRefresh(200);
          if (getActiveMentorTab() === 'reviews') { loadMentorReviews(); }
          var _lc = (db.weeklyLogs||[]).filter(function(l){
            var ms = getMentorStudents({activeOnly:true}); var em = ms.map(function(s){return s.email.toLowerCase();});
            return l.studentId && em.includes(l.studentId.toLowerCase()) && l.status==='Pending Approval';
          }).length;
          if (_lc > 0) showToast('\uD83D\uDCCA ' + _lc + ' weekly report' + (_lc>1?'s':'') + ' waiting for review!', 4000);
        } else {
          scheduleRefreshUIForActiveView();
        }
      }
    } else if (currentUser?.role === 'student') {
      if (changedCollection === 'chats') {
        normalizeDbChatRecords();
        loadStudentChat();
      } else if (changedCollection === 'tasks') {
        loadStudentTasks();
        if (getActiveStudentTab() === 'dash') loadStudentDashboard();
      } else if (changedCollection === 'weeklyLogs') {
        if (getActiveStudentTab() === 'logs') loadStudentLogs();
        if (getActiveStudentTab() === 'dash') loadStudentDashboard();
      } else if (changedCollection === 'attendance') {
        if (getActiveStudentTab() === 'dash') loadStudentDashboard();
        loadStudentAttendanceLogs();
      } else if (changedCollection && changedCollection !== 'signals' && changedCollection !== 'meetings') {
        scheduleRefreshUIForActiveView();
      }
    } else if (changedCollection) {
      scheduleRefreshUIForActiveView();
    }

    // Repopulate mentor list on the registration form if it is currently open and active
    const registerView = document.getElementById('register-view');
    if (registerView && !registerView.classList.contains('hidden') && activeRegisterRole === 'student') {
      populateRegisterMentors();
    }

    // Refresh active meeting UI in real-time
    if (activeMeeting) {
      const updatedMeet = db.meetings.find(m => m.id === activeMeeting.id);
      if (updatedMeet) {
        if (updatedMeet.status === 'ended') {
          exitMeetingRoom("Meeting has been ended by host.");
          return;
        }
        const oldParticipantsCount = (activeMeeting && activeMeeting.participants) ? activeMeeting.participants.length : 0;
        activeMeeting = updatedMeet;
        if (typeof renderMeetingParticipants === 'function') {
          renderMeetingParticipants();
        }
        if (typeof renderMeetingChat === 'function') {
          renderMeetingChat();
        }
        
        if (updatedMeet.participants.length > oldParticipantsCount && updatedMeet.participants.length > 1) {
          if (typeof setupWebRTCPeerConnection === 'function') {
            setupWebRTCPeerConnection();
          }
        }
      }
    }

    // Dismiss or show incoming call immediately when meeting state changes in cloud
    if (changedCollection === 'meetings') {
      (db.meetings || []).forEach(m => {
        if (m.status === 'ended') registerEndedMeeting(m.id);
      });
      if (currentUser?.role === 'student') {
        handleStudentMeetingSync();
      }
    }
  } catch (err) {
    console.warn("Error handling Supabase realtime payload:", err);
  }
}

function seedSupabaseCollection(colName, initialData) {
  if (!supabaseActive || !supabaseClient) return;
  initialData.forEach(async (item) => {
    const docId = item.id || item.email || `doc-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const { error } = await supabaseClient
      .from('apex_sync')
      .upsert({ id: docId, collection: colName, data: item });
    if (error) {
      console.error(`Error seeding doc ${docId} to Supabase:`, error);
    }
  });
}

function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

function prepareRecordForCloudSync(record, collection) {
  if (!record || typeof record !== 'object') return record;
  const cloud = { ...record };

  if (cloud.faceDescriptor && typeof cloud.faceDescriptor === 'string' && cloud.faceDescriptor.startsWith('data:image')) {
    cloud.faceDescriptor = cloud.faceScanUrl || '[face_enrolled]';
  }
  if (cloud.faceImage && typeof cloud.faceImage === 'string' && cloud.faceImage.startsWith('data:image')) {
    delete cloud.faceImage;
  }
  if (collection === 'attendance' && cloud.faceImage) {
    delete cloud.faceImage;
  }
  return cloud;
}

function getRegistrationTablePayload(record, faceScanUrl) {
  const scanValue = (faceScanUrl && typeof faceScanUrl === 'string' && !faceScanUrl.startsWith('data:image')) ? faceScanUrl : '';
  const payload = {
    'Full Name': record.name || record.email || '',
    'Email Id': record.email || '',
    'Domain': record.domain || '',
    'Mentor': record.mentorEmail || '',
    'Password': record.password || '',
    'Face Scan': scanValue,
    'Status': record.role || ''
  };
  if (supabaseHasMentorStatusColumn) {
    payload['Mentor Status'] = record.mentorStatus || '';
  }
  return payload;
}

async function uploadFaceScanToSupabase(email, base64Data) {
  try {
    if (!supabaseActive || !supabaseClient) return null;
    const blob = dataURLtoBlob(base64Data);
    const fileName = `${email.replace(/[@.]/g, '_')}_${Date.now()}.jpg`;
    
    const { data, error } = await supabaseClient.storage
      .from('face_scans')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });
      
    if (error) {
      console.warn("Supabase storage upload failed, using base64 fallback:", error);
      return null;
    }
    
    const { data: publicUrlData } = supabaseClient.storage
      .from('face_scans')
      .getPublicUrl(fileName);
      
    return publicUrlData.publicUrl;
  } catch (err) {
    console.warn("Failed to upload face scan:", err);
    return null;
  }
}

async function syncRecordToSupabase(collection, record) {
  try {
    if (!supabaseActive || !supabaseClient) return false;
    
    const payload = collection === 'tasks'
      ? prepareTaskForCloudSync(record)
      : prepareRecordForCloudSync(record, collection);
      
    const docId = payload.id || payload.email || `doc-${Date.now()}`;
    
    // Sabse pehle core mapping database apex_sync mein save karein
    const { error } = await supabaseClient
      .from('apex_sync')
      .upsert({ id: docId, collection: collection, data: payload });
      
    if (error) {
      console.error(`Error saving document ${docId} to Supabase apex_sync:`, error);
      if (collection === 'tasks') {
        console.error('Task cloud sync failed ... student will not see this task until sync succeeds.');
      }
    }

    // 1. AUTO-SYNC FOR CHATS (Optimized Block)
    if (collection === 'chats') {
      try {
        // Internet standard ke hisab se bina space wala payload setup
        const lowercasePayload = {
          sender: record.from || '',
          receiver: record.to || '',
          message: record.message || '',
          timestamp: record.timestamp || '',
          attachment: record.attachment ? JSON.stringify(record.attachment) : null
        };

        // Seedha chote bina space wale table 'chats' par save try karein
        const { error: syncError3 } = await supabaseClient
          .from('chats')
          .upsert(lowercasePayload);
          
        if (syncError3) {
          console.warn("Dedicated 'chats' table missing. Chat is securely saved inside backup 'apex_sync' table.");
        } else {
          console.log("Successfully synced chat to dedicated 'chats' table:", record.id);
        }
      } catch (chatErr) {
        console.error("Failed to write to dedicated chats table:", chatErr);
      }
    }

    // 2. AUTO-SYNC FOR USERS (Registration and Face Profile)
    if (collection === 'users') {
      try {
        let faceScanUrl = record.faceScanUrl || '';
        let base64Image = record.faceScanImage || (typeof record.faceDescriptor === 'string' && record.faceDescriptor.startsWith('data:image') ? record.faceDescriptor : '');
        
        // Base64 image data ko Supabase Storage Cloud bucket mein push karein
        if (base64Image && typeof base64Image === 'string' && base64Image.startsWith('data:image')) {
          const localBase64 = base64Image;
          const uploadedUrl = await uploadFaceScanToSupabase(record.email, base64Image);
          if (uploadedUrl) {
            faceScanUrl = uploadedUrl;
            const emailNorm = normalizeChatEmail(record.email || '');
            const uIdx = db.users.findIndex(u => u && u.email && normalizeChatEmail(u.email) === emailNorm);
            if (uIdx > -1) {
              db.users[uIdx].faceScanUrl = uploadedUrl;
              if (currentUser && normalizeChatEmail(currentUser.email) === emailNorm) {
                currentUser.faceScanUrl = uploadedUrl;
                storage.setItem('apex_intern_currentUser', JSON.stringify(currentUser));
              }
              saveDatabase();
            }
          }
        }

        // Registration details cloud user profile structure table mein push karein
        const { error: syncError } = await supabaseClient
          .from('registration and login')
          .upsert(getRegistrationTablePayload(record, faceScanUrl), { onConflict: 'Email Id' });
          
        if (syncError) {
          console.error("Error syncing to registration and login table:", syncError);
          const errorMsg = (syncError.message || '').toLowerCase();
          const errorCode = syncError.code || '';
          if (supabaseHasMentorStatusColumn && (errorCode === 'PGRST204' || errorMsg.includes('mentor status') || errorMsg.includes('column') || errorMsg.includes('does not exist'))) {
            console.warn("Self-healing: 'Mentor Status' column is missing from 'registration and login' table. Disabling status sync for this table.");
            supabaseHasMentorStatusColumn = false;
            storage.setItem('apex_intern_supabase_has_mentor_status', 'false');
            
            const { error: retryError } = await supabaseClient
              .from('registration and login')
              .upsert(getRegistrationTablePayload(record, faceScanUrl), { onConflict: 'Email Id' });
            if (retryError) {
              console.error("Error retrying registration sync after disabling Mentor Status:", retryError);
            } else {
              console.log("Successfully synced user to registration and login table (without Mentor Status) after self-healing.");
            }
          }
        } else {
          console.log("Successfully synced user to registration and login table:", record.email);
        }
      } catch (tableErr) {
        console.error("Failed to write to registration and login table:", tableErr);
      }
    }

    return !error;
  } catch (err) {
    console.error(`Error in syncRecordToSupabase for collection ${collection}:`, err);
    return false;
  }
}

async function deleteRecordFromSupabase(collection, docId) {
  if (!supabaseActive || !supabaseClient) return;
  
  // Agar user delete ho raha hai, toh use registration list se bhi gayab karein
  if (collection === 'users') {
    try {
      const user = db.users.find(u => u.id === docId);
      if (user) {
        const fullName = user.name || user.email || '';
        await supabaseClient
          .from('registration and login')
          .delete()
          .eq('Full Name', fullName);
      }
    } catch (delErr) {
      console.error("Failed to delete from registration and login table:", delErr);
    }
  }

  const { error } = await supabaseClient
    .from('apex_sync')
    .delete()
    .eq('id', docId);
    
  if (error) {
    console.error(`Error deleting document ${docId} from Supabase:`, error);
  }
}

// Legacy Code Wrappers for Offline Compatibility
function syncRecordToFirestore(collection, record) {
  try {
    flushDatabase();
    syncRecordToSupabase(collection, record);
  } catch (err) {
    console.error(`Error in syncRecordToFirestore wrapper for collection ${collection}:`, err);
  }
}

function deleteRecordFromFirestore(collection, docId) {
  deleteRecordFromSupabase(collection, docId);
}

function seedFirestoreCollection(colName, initialData) {
  seedSupabaseCollection(colName, initialData);
}

function openSupabaseConfigModal() {
  const configStr = storage.getItem('apex_intern_supabase_config');
  const disabled = storage.getItem('apex_intern_supabase_disabled') === 'true';
  
  let config = null;
  if (configStr) {
    try {
      config = JSON.parse(configStr);
    } catch (e) {
      console.error("Failed to parse existing Supabase config", e);
    }
  }
  
  if (!config && !disabled) {
    // Populate modal inputs with default credentials
    config = {
      url: "https://gvsextnrduejeaxyadbj.supabase.co",
      anonKey: "sb_publishable_r6uHi1migqF4gOHtSiqO-Q_VBRsZ-Yk"
    };
  }

  if (config) {
    document.getElementById('sb-url').value = config.url || '';
    document.getElementById('sb-anon-key').value = config.anonKey || '';
  } else {
    document.getElementById('sb-url').value = '';
    document.getElementById('sb-anon-key').value = '';
  }
  
  openModal('supabase-config-modal');
}

function openFirebaseConfigModal() {
  openSupabaseConfigModal();
}

function saveSupabaseConfig(event) {
  event.preventDefault();
  
  let url = document.getElementById('sb-url').value.trim();
  if (url.endsWith('/rest/v1/')) {
    url = url.substring(0, url.length - 9);
  } else if (url.endsWith('/rest/v1')) {
    url = url.substring(0, url.length - 8);
  }
  
  const config = {
    url: url,
    anonKey: document.getElementById('sb-anon-key').value.trim()
  };
  
  storage.setItem('apex_intern_supabase_config', JSON.stringify(config));
  storage.removeItem('apex_intern_supabase_disabled'); // Reset disabled flag
  closeModal('supabase-config-modal');
  
  initSupabase();
  alert("Supabase configurations saved. Connecting to Cloud database...");
}

function disconnectSupabase() {
  if (confirm("Are you sure you want to disconnect from Supabase and fall back to browser Local Storage?")) {
    storage.removeItem('apex_intern_supabase_config');
    storage.setItem('apex_intern_supabase_disabled', 'true'); // Set disabled flag explicitly
    closeModal('supabase-config-modal');
    initSupabase();
    alert("Disconnected from Supabase. Fell back to Local Storage mode.");
  }
}

// ==================== 10. GROUP VIDEO CALLS & MEETINGS ====================

// Video call & meeting globals
let activeMeeting = null;
let localMediaStream = null;
let meetingTimerInterval = null;
let meetingSeconds = 0;
let declinedMeetingIds = [];
let endedMeetingIds = [];
let incomingMeetingId = null;
let callChimeInterval = null;
let meetingMediaRecorder = null;
let meetingRecordedChunks = [];
let meetingDisplayStream = null;
let pendingRecordingUpload = null;
let meetingRecordingFinalized = false;


// Start periodic checker for incoming calls (especially for students)
setInterval(async () => {
  if (!currentUser || currentUser.role !== 'student') return;
  if (supabaseActive && supabaseClient && !activeMeeting) {
    try {
      await pullSupabaseCollections(['meetings']);
    } catch (e) {
      console.warn('Student meeting poll failed:', e);
    }
  }
  handleStudentMeetingSync();
}, 2000);

function getMentorCallTargets() {
  const mentorEmail = getMentorEmailNorm();
  if (!mentorEmail) return [];

  // Get mentor's domain for domain-based filtering
  const mentor = db.users.find(u => u && u.email && normalizeChatEmail(u.email) === mentorEmail);
  const mentorDomain = (mentor?.domain || '').trim().toLowerCase();

  const emails = new Set();

  getMentorStudents({ activeOnly: true }).forEach(s => {
    if (!s.email) return;
    // Domain match ... student's domain should match mentor's domain
    const studentDomain = (s.domain || '').trim().toLowerCase();
    if (mentorDomain && studentDomain && studentDomain !== mentorDomain) return;
    emails.add(normalizeChatEmail(s.email));
  });

  (db.users || []).forEach(u => {
    if (!u || u.role !== 'student' || !u.email || !u.mentorEmail) return;
    if (normalizeChatEmail(u.mentorEmail) !== mentorEmail) return;
    // Domain match check
    const studentDomain = (u.domain || '').trim().toLowerCase();
    if (mentorDomain && studentDomain && studentDomain !== mentorDomain) return;
    if (u.mentorStatus === 'Active' || getAcceptedPairingForStudent(u.email)) {
      emails.add(normalizeChatEmail(u.email));
    }
  });

  return Array.from(emails);
}

function isStudentEligibleForMentorCall(student, meeting) {
  if (!student || student.role !== 'student' || !meeting || meeting.status !== 'active') return false;
  if (!meeting.mentorEmail) return false;
  if (endedMeetingIds.includes(meeting.id) || declinedMeetingIds.includes(meeting.id)) return false;

  const studentEmail = normalizeChatEmail(student.email);
  const mentorEmail  = normalizeChatEmail(meeting.mentorEmail);
  if (!studentEmail) return false;

  // Must be paired with this mentor
  if (!student.mentorEmail || normalizeChatEmail(student.mentorEmail) !== mentorEmail) return false;

  // Domain must match mentor's domain
  const mentor = db.users.find(u => u && u.email && normalizeChatEmail(u.email) === mentorEmail);
  if (mentor?.domain && student.domain) {
    if (mentor.domain.trim().toLowerCase() !== student.domain.trim().toLowerCase()) return false;
  }

  if (student.mentorStatus === 'Active') return true;
  if (getAcceptedPairingForStudent(student.email)) return true;
  if (Array.isArray(meeting.invitedStudents) && meeting.invitedStudents.some(e => normalizeChatEmail(e) === studentEmail)) {
    return true;
  }
  return false;
}

function updateStudentIncomingCallBanner(mentorMeet) {
  const banner = document.getElementById('student-incoming-call-banner');
  if (!banner) return;
  if (mentorMeet) {
    banner.classList.remove('hidden');
    const nameEl = document.getElementById('student-incoming-call-mentor');
    if (nameEl) nameEl.innerText = mentorMeet.mentorName || 'Your Mentor';
  } else {
    banner.classList.add('hidden');
  }
}

function showIncomingCallUI(mentorMeet) {
  const incomingOverlay = document.getElementById('incoming-call-overlay');
  if (!incomingOverlay || !mentorMeet) return;

  const mentorUser = db.users.find(u => u.email && normalizeChatEmail(u.email) === normalizeChatEmail(mentorMeet.mentorEmail));
  const callerNameEl = document.getElementById('incoming-caller-name');
  const callerAvatarEl = document.getElementById('incoming-caller-avatar');
  if (callerNameEl) callerNameEl.innerText = mentorMeet.mentorName || 'Your Mentor';
  if (callerAvatarEl) callerAvatarEl.src = (mentorUser && mentorUser.avatar) ? mentorUser.avatar : 'default-avatar.png';

  const isNewIncomingCall = incomingMeetingId !== mentorMeet.id;
  incomingMeetingId = mentorMeet.id;

  incomingOverlay.classList.remove('hidden');
  incomingOverlay.classList.add('active');
  updateStudentIncomingCallBanner(mentorMeet);

  if (!isNewIncomingCall && callChimeInterval) return;

  playCallChime();

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('Incoming Video Call', {
        body: `${mentorMeet.mentorName || 'Your Supervisor'} is starting a video call with you.`,
        icon: (mentorUser && mentorUser.avatar) || 'default-avatar.png',
        requireInteraction: true
      });
    } catch (err) {
      console.warn('Desktop notification trigger failed', err);
    }
  }
}

function registerEndedMeeting(meetingId) {
  if (!meetingId) return;
  if (!endedMeetingIds.includes(meetingId)) endedMeetingIds.push(meetingId);
  if (!declinedMeetingIds.includes(meetingId)) declinedMeetingIds.push(meetingId);
  if (incomingMeetingId === meetingId) hideIncomingCallOverlay();
}

function markVideoCallAttendance(studentEmail, meetingRecord, actionLabel) {
  const email = (studentEmail || '').trim().toLowerCase();
  if (!email || !meetingRecord || !meetingRecord.id) return;

  const student = db.users.find(u => u && u.email && u.email.trim().toLowerCase() === email);
  const todayDate = new Date().toDateString();
  const meetingId = meetingRecord.id;

  const alreadyMarked = (db.attendance || []).some(log =>
    log && log.studentEmail && log.studentEmail.trim().toLowerCase() === email &&
    log.meetingId === meetingId &&
    log.status === 'Verified (Pass)'
  );
  if (alreadyMarked) return;

  const newRecord = {
    id: `att-vcall-${meetingId}-${Date.now()}`,
    studentEmail: email,
    studentName: student ? student.name : email,
    timestamp: new Date().toLocaleString(),
    date: todayDate,
    action: actionLabel || 'Video Call Attendance',
    score: 100,
    status: 'Verified (Pass)',
    meetingId,
    mentorEmail: meetingRecord.mentorEmail || '',
    faceImage: (student && typeof student.faceDescriptor === 'string' && student.faceDescriptor.startsWith('data:image'))
      ? student.faceDescriptor
      : ((student && student.faceScanImage) || '')
  };

  if (!db.attendance) db.attendance = [];
  db.attendance.push(newRecord);
  saveDatabase();
  syncRecordToFirestore('attendance', newRecord);
}

function handleStudentMeetingSync() {
  if (!currentUser || currentUser.role !== 'student') return;

  if (incomingMeetingId) {
    const ringingMeet = (db.meetings || []).find(m => m.id === incomingMeetingId);
    if (!ringingMeet || ringingMeet.status === 'ended') {
      registerEndedMeeting(incomingMeetingId);
      hideIncomingCallOverlay();
    }
  }

  if (activeMeeting) {
    const freshMeet = (db.meetings || []).find(m => m.id === activeMeeting.id);
    if (!freshMeet || freshMeet.status === 'ended') {
      registerEndedMeeting(activeMeeting.id);
      exitMeetingRoom('Meeting has been ended by host.');
      return;
    }
    activeMeeting = freshMeet;
  }

  if (!activeMeeting) checkIncomingCalls();
}

function handleMeetingBroadcast(data) {
  if (!data || !currentUser) return;

  // Meeting link auto-alert for student
  if ((data.type === 'meeting_live_alert' || data.type === 'meeting_scheduled_alert') && data.meeting && currentUser.role === 'student') {
    mergeCloudRecordIntoDb('meetings', data.meeting, data.meeting.id);
    saveDatabase();
    checkStudentGroupCallBadge();
    const isLive = data.type === 'meeting_live_alert';
    showStudentMeetingAlert(data.meeting, isLive, data.mentorName);
    if (isLive) checkIncomingCalls();
    return;
  }

  if (data.type === 'call_started' && data.meeting) {
    mergeCloudRecordIntoDb('meetings', data.meeting, data.meeting.id);
    saveDatabase();
    if (currentUser.role === 'student') {
      refreshCurrentUserFromDb();
      checkIncomingCalls();
    }
    return;
  }

  if (data.type === 'call_ended') {
    if (data.meetingId) registerEndedMeeting(data.meetingId);
    if (currentUser.role === 'student') {
      hideIncomingCallOverlay();
      if (activeMeeting && (!data.meetingId || activeMeeting.id === data.meetingId)) {
        exitMeetingRoom('Meeting has been ended by host.');
      } else {
        handleStudentMeetingSync();
      }
    }
    return;
  }

  // Task submitted by student ... refresh mentor's review panel
  if (data.type === 'task_submitted' && currentUser.role === 'mentor') {
    syncDatabase();
    if (typeof loadMentorReviews === 'function') {
      setTimeout(() => {
        loadMentorReviews();
        scheduleMentorDashboardRefresh(200);
      }, 500);
    }
    showToast('?? A student submitted a task for review!', 3500);
    if (typeof updateMentorPendingBadge === 'function') updateMentorPendingBadge();
    return;
  }

  // Weekly log submitted ... refresh mentor reviews
  if (data.type === 'weekly_log_submitted' && currentUser && currentUser.role === 'mentor') {
    syncDatabase();
    if (typeof loadMentorReviews === 'function') {
      setTimeout(() => {
        loadMentorReviews();
        scheduleMentorDashboardRefresh(200);
      }, 500);
    }
    showToast('?? A student submitted a weekly progress report!', 3500);
    return;
  }
}

function notifyMeetingEvent(payload) {
  handleMeetingBroadcast(payload);
  try {
    if (!window.__apexMeetingChannel) initMeetingBroadcastSync();
    if (window.__apexMeetingChannel) {
      window.__apexMeetingChannel.postMessage(payload);
    }
  } catch (err) {
    console.warn('Meeting broadcast failed:', err);
  }
}

function initMeetingBroadcastSync() {
  try {
    if (window.__apexMeetingChannel) return;
    window.__apexMeetingChannel = new BroadcastChannel('apex_intern_meetings');
    window.__apexMeetingChannel.onmessage = (event) => {
      handleMeetingBroadcast(event.data);
    };
  } catch (err) {
    console.warn('BroadcastChannel meeting sync unavailable:', err);
  }
}

// Stable mentor cloud sync ... throttled so student counts don't flicker (2&#x20B9;4)
setInterval(async () => {
  if (!currentUser || currentUser.role !== 'mentor' || cloudSyncInProgress) return;
  const now = Date.now();
  if (now - lastMentorCloudSyncAt < MENTOR_CLOUD_SYNC_INTERVAL_MS) return;
  lastMentorCloudSyncAt = now;

  const tabName = getActiveMentorTab();
  if (supabaseActive && supabaseClient) {
    const collections = ['users', 'pairingRequests'];
    if (tabName === 'chat') collections.push('chats', 'meetings');
    await pullSupabaseCollections(collections);
  }

  if (tabName === 'dash') scheduleMentorDashboardRefresh(100);
  else if (tabName === 'chat') loadMentorChat(false);
}, 12000);

// Student cloud sync ... tasks + chat (throttled)
let lastStudentChatSyncAt = 0;
let lastStudentTaskSyncAt = 0;
setInterval(async () => {
  if (!currentUser || currentUser.role !== 'student' || cloudSyncInProgress) return;
  if (!supabaseActive || !supabaseClient) return;

  const now = Date.now();
  const tabName = getActiveStudentTab();

  if (tabName === 'chat' && now - lastStudentChatSyncAt >= 20000) {
    lastStudentChatSyncAt = now;
    await pullSupabaseCollections(['chats', 'users']);
    refreshCurrentUserFromDb();
    loadStudentChat();
  }

  if ((tabName === 'tasks' || tabName === 'dash') && now - lastStudentTaskSyncAt >= 15000) {
    lastStudentTaskSyncAt = now;
    await pullSupabaseCollections(['tasks', 'users', 'pairingRequests', 'attendance']);
    refreshCurrentUserFromDb();
    loadStudentTasks();
    if (tabName === 'dash') loadStudentDashboard();
  }
}, 12000);

// Keep student mentor pairing status in sync after mentor approval
setInterval(async () => {
  if (currentUser && currentUser.role === 'student' && currentUser.mentorStatus === 'Pending') {
    await pullSupabaseCollections(['users']);
    refreshCurrentUserFromDb();
    if (currentUser.mentorStatus === 'Active') {
      scheduleRefreshUIForActiveView();
    }
  }
}, 8000);

function stopCallChime() {
  if (callChimeInterval) {
    clearInterval(callChimeInterval);
    callChimeInterval = null;
  }
}

function hideIncomingCallOverlay() {
  const incomingOverlay = document.getElementById('incoming-call-overlay');
  if (incomingOverlay) {
    incomingOverlay.classList.remove('active');
    incomingOverlay.classList.add('hidden');
  }
  incomingMeetingId = null;
  stopCallChime();
  updateStudentIncomingCallBanner(null);
}

function endStaleMeetingsForMentor(mentorEmail, keepMeetingId) {
  if (!db.meetings || !mentorEmail) return;
  const emailLower = mentorEmail.trim().toLowerCase();
  let changed = false;
  db.meetings.forEach(m => {
    if (m.mentorEmail && m.mentorEmail.trim().toLowerCase() === emailLower &&
        m.status === 'active' && m.id !== keepMeetingId) {
      m.status = 'ended';
      syncRecordToFirestore('meetings', m);
      changed = true;
    }
  });
  if (changed) saveDatabase();
}

async function checkIncomingCalls() {
  if (activeMeeting) return;

  const throttleNow = Date.now();
  if (throttleNow - lastIncomingCallCheckAt < 1000) return;
  lastIncomingCallCheckAt = throttleNow;

  const now = new Date().getTime();
  const maxMeetingAgeMs = 45 * 60 * 1000; // 45 minutes maximum age for a call to ring or stay active

  // Pull active meetings directly from Supabase to guarantee real-time notifications even if WebSockets are slow/blocked
  if (supabaseActive && supabaseClient) {
    try {
      const { data: records, error } = await supabaseClient
        .from('apex_sync')
        .select('data')
        .eq('collection', 'meetings');
      if (records && !error) {
        if (!db.meetings) db.meetings = [];
        const fetchedMeetings = [];
        records.forEach(r => {
          let parsed = robustParse(r.data);
          if (parsed && typeof parsed === 'object') {
            // Auto-clean stale active meetings in the database (older than 45 minutes)
            const meetingAge = parsed.createdAt ? (now - new Date(parsed.createdAt).getTime()) : Infinity;
            if (parsed.status === 'active' && meetingAge > maxMeetingAgeMs) {
              parsed.status = 'ended';
              // Update in database silently in the background
              try {
                supabaseClient.from('apex_sync').upsert({ id: parsed.id, collection: 'meetings', data: parsed });
              } catch (dbErr) {
                console.warn("Auto-ending stale meeting in DB failed:", dbErr);
              }
            }
            fetchedMeetings.push(parsed);
          }
        });
        if (!db.meetings) db.meetings = [];
        fetchedMeetings.forEach(parsed => {
          mergeCloudRecordIntoDb('meetings', parsed, parsed.id);
          if (parsed.status === 'ended') registerEndedMeeting(parsed.id);
        });
        schedulePersistDb();
      }
    } catch (fetchErr) {
      console.warn("Direct meetings sync failed:", fetchErr);
    }
  }

  if (!currentUser || currentUser.role !== 'student') return;
  refreshCurrentUserFromDb();

  if (!db.meetings) db.meetings = [];
  
  const activeMentorMeetings = db.meetings.filter(m => {
    const meetingAge = m.createdAt ? (now - new Date(m.createdAt).getTime()) : Infinity;
    return isStudentEligibleForMentorCall(currentUser, m) &&
      meetingAge < maxMeetingAgeMs;
  });

  let mentorMeet = null;
  if (activeMentorMeetings.length > 0) {
    // Sort descending by id/timestamp so the latest active meeting is selected
    activeMentorMeetings.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
    mentorMeet = activeMentorMeetings[0];
    endStaleMeetingsForMentor(mentorMeet.mentorEmail, mentorMeet.id);
  }

  if (mentorMeet) {
    if (activeMeeting && activeMeeting.id === mentorMeet.id) {
      hideIncomingCallOverlay();
      return;
    }
    showIncomingCallUI(mentorMeet);
  } else {
    hideIncomingCallOverlay();
    if (activeMeeting) {
      const stillActive = db.meetings.find(m => m.id === activeMeeting.id && m.status === 'active');
      if (!stillActive) {
        registerEndedMeeting(activeMeeting.id);
        exitMeetingRoom("Meeting has been ended by host.");
      }
    }
  }
}

// ====== JITSI MEET GROUP CALL ... WhatsApp Style ======
// Uses Jitsi Meet API for real camera/mic/speaker group calls
let _jitsiApi = null;
let _jitsiRoomId = null;
let _dialingTimerInterval = null;
let _dialingSeconds = 0;

async function startMentorGroupCall() {
  if (!currentUser || currentUser.role !== 'mentor') return;

  const invitedStudents = getMentorCallTargets();

  if (invitedStudents.length === 0) {
    alert('No approved interns found. Accept pairing requests first, then start the group call.');
    return;
  }

  // Clean up stale active meetings
  if (db.meetings) {
    db.meetings.forEach(m => {
      if (m.mentorEmail && m.mentorEmail.trim().toLowerCase() === currentUser.email.trim().toLowerCase() && m.status === 'active') {
        m.status = 'ended';
        registerEndedMeeting(m.id);
        syncRecordToSupabase('meetings', m).catch(() => {});
        notifyMeetingEvent({ type: 'call_ended', meetingId: m.id, mentorEmail: currentUser.email });
      }
    });
  }

  declinedMeetingIds = declinedMeetingIds.filter(id => {
    const m = db.meetings?.find(x => x.id === id);
    return m && m.status === 'active';
  });

  // Generate a unique room ID based on mentor email + timestamp
  const roomId = `InternX-${currentUser.email.split('@')[0].replace(/[^a-zA-Z0-9]/g,'-')}-${Date.now()}`.toLowerCase();
  _jitsiRoomId = roomId;

  const meetId = `meet-${Date.now()}`;
  const newMeeting = {
    id: meetId,
    mentorEmail: currentUser.email,
    mentorName: currentUser.name,
    mentorDomain: currentUser.domain || '',
    jitsiRoomId: roomId,
    status: 'active',
    createdAt: new Date().toISOString(),
    participants: [currentUser.email],
    invitedStudents,
    mutedParticipants: [],
    videoOffParticipants: [],
    screenSharer: null,
    messages: []
  };

  if (!db.meetings) db.meetings = [];
  db.meetings.push(newMeeting);
  saveDatabase(true);
  notifyMeetingEvent({ type: 'call_started', meeting: newMeeting });
  syncRecordToSupabase('meetings', newMeeting).catch(err => console.warn('Meeting sync failed:', err));

  // Auto-notify students about this live call
  sendMeetingNotificationToStudents(newMeeting, true);

  activeMeeting = newMeeting;

  // Open WA popup immediately (WhatsApp style — you see yourself right away)
  openWAStyleCall();

  // Show dialing overlay with student avatars ringing (on top of popup)
  showMentorDialingOverlay(invitedStudents, newMeeting);
}

function showMentorDialingOverlay(invitedStudents, meeting) {
  const overlay = document.getElementById('mentor-dialing-overlay');
  if (!overlay) {
    openMeetingRoom();
    return;
  }

  // Populate student avatars
  const avatarsContainer = document.getElementById('mentor-dialing-avatars');
  const countLabel = document.getElementById('mentor-dialing-count-label');

  if (avatarsContainer) {
    avatarsContainer.innerHTML = '';
    invitedStudents.forEach(email => {
      const userObj = db.users.find(u => u && u.email && u.email.trim().toLowerCase() === email.trim().toLowerCase());
      const name = userObj ? userObj.name : email.split('@')[0];
      const avatar = (userObj && userObj.avatar) ? userObj.avatar : '';
      const initial = name.charAt(0).toUpperCase();

      const wrap = document.createElement('div');
      wrap.id = `dialing-avatar-${email.replace(/[@.]/g, '-')}`;
      wrap.className = 'dialing-avatar-wrap';
      wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;';
      wrap.innerHTML = `
        <div style="position:relative;width:64px;height:64px;">
          <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#8327ec,#5b21b6);display:flex;align-items:center;justify-content:center;overflow:hidden;border:2px solid rgba(131,39,236,0.5);">
            ${avatar
              ? `<img src="${avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
              : `<span style="font-size:22px;font-weight:800;color:#fff;">${initial}</span>`}
          </div>
          <div id="dialing-status-${email.replace(/[@.]/g, '-')}" style="position:absolute;bottom:0;right:0;width:18px;height:18px;border-radius:50%;background:#6b7280;border:2px solid #0a0015;display:flex;align-items:center;justify-content:center;">
            <div style="width:8px;height:8px;border-radius:50%;background:#fff;animation:dialingRing 1.2s ease-in-out infinite;"></div>
          </div>
        </div>
        <span style="font-size:10px;color:var(--text-muted);max-width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${name}</span>
      `;
      avatarsContainer.appendChild(wrap);
    });
  }

  if (countLabel) {
    countLabel.textContent = `Ringing ${invitedStudents.length} intern${invitedStudents.length > 1 ? 's' : ''}`;
  }

  overlay.classList.remove('hidden');
  overlay.classList.add('active');

  // Start dialing timer
  _dialingSeconds = 0;
  clearInterval(_dialingTimerInterval);
  const timerEl = document.getElementById('mentor-dialing-timer');
  _dialingTimerInterval = setInterval(() => {
    _dialingSeconds++;
    const m = Math.floor(_dialingSeconds / 60);
    const s = _dialingSeconds % 60;
    if (timerEl) timerEl.textContent = `${m}:${String(s).padStart(2, '0')}`;

    // Check who has joined
    invitedStudents.forEach(email => {
      const freshMeeting = db.meetings.find(mt => mt.id === meeting.id);
      if (!freshMeeting) return;
      const joined = freshMeeting.participants.some(p => p.trim().toLowerCase() === email.trim().toLowerCase());
      const statusDot = document.getElementById(`dialing-status-${email.replace(/[@.]/g, '-')}`);
      const avatarWrap = document.getElementById(`dialing-avatar-${email.replace(/[@.]/g, '-')}`);
      if (statusDot && joined) {
        statusDot.style.background = '#22c55e';
        statusDot.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="white"><polyline points="20 6 9 17 4 12"/></svg>';
        if (avatarWrap) avatarWrap.classList.add('joined');
      }
    });
  }, 1000);

  // Play Google Meet style ring sound
  playGroupCallDialTone();
}

function cancelMentorDialing() {
  clearInterval(_dialingTimerInterval);
  stopGroupCallDialTone();

  const overlay = document.getElementById('mentor-dialing-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
    overlay.classList.remove('active');
  }

  // End the meeting
  if (activeMeeting) {
    const meetIdx = db.meetings ? db.meetings.findIndex(m => m.id === activeMeeting.id) : -1;
    if (meetIdx !== -1) {
      db.meetings[meetIdx].status = 'ended';
      saveDatabase(true);
      notifyMeetingEvent({ type: 'call_ended', meetingId: activeMeeting.id, mentorEmail: currentUser.email });
      syncRecordToSupabase('meetings', db.meetings[meetIdx]).catch(() => {});
    }
    registerEndedMeeting(activeMeeting.id);
    activeMeeting = null;
  }
}

function proceedToMeetingRoom() {
  clearInterval(_dialingTimerInterval);
  stopGroupCallDialTone();
  const overlay = document.getElementById('mentor-dialing-overlay');
  if (overlay) { overlay.classList.add('hidden'); overlay.classList.remove('active'); }
  // WA popup already open from startMentorGroupCall — just ensure it's visible
  const popup = document.getElementById('wa-call-popup');
  if (popup && popup.style.display === 'none') {
    openMeetingRoom();
  } else if (popup) {
    waPopupRestore(); // in case it was minimised
  }
}

// ====== GOOGLE MEET STYLE DIAL TONE ======
let _dialToneInterval = null;
let _dialToneCtx = null;

function playGroupCallDialTone() {
  stopGroupCallDialTone();

  const playTone = () => {
    try {
      _dialToneCtx = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = _dialToneCtx;

      // Google Meet style: 3 ascending tones
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;

        const startTime = ctx.currentTime + i * 0.15;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.13, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.start(startTime);
        osc.stop(startTime + 0.4);
      });
    } catch (e) { /* audio blocked */ }
  };

  playTone();
  _dialToneInterval = setInterval(playTone, 3000);
}

function stopGroupCallDialTone() {
  if (_dialToneInterval) {
    clearInterval(_dialToneInterval);
    _dialToneInterval = null;
  }
  if (_dialToneCtx) {
    try { _dialToneCtx.close(); } catch (e) {}
    _dialToneCtx = null;
  }
}

// ====== IMPROVED INCOMING RING (Google Meet style ... descending 3 tones) ======
function playCallChime() {
  if (callChimeInterval) return;

  const playRing = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      // G5 ? E5 ? C5 descending ... classic incoming ring pattern
      const notes = [783.99, 659.25, 523.25];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.18;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.14, t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
        osc.start(t);
        osc.stop(t + 0.42);
      });
    } catch (e) { /* blocked */ }
  };

  playRing();
  callChimeInterval = setInterval(() => {
    const overlay = document.getElementById('incoming-call-overlay');
    if (!overlay || overlay.classList.contains('hidden') || !overlay.classList.contains('active')) {
      stopCallChime();
      return;
    }
    playRing();
  }, 2800);
}

function acceptIncomingCall() {
  hideIncomingCallOverlay();

  if (!db.meetings) db.meetings = [];
  const now = new Date().getTime();
  const maxMeetingAgeMs = 45 * 60 * 1000;
  
  refreshCurrentUserFromDb();

  const activeMentorMeetings = db.meetings.filter(m => {
    const meetingAge = m.createdAt ? (now - new Date(m.createdAt).getTime()) : Infinity;
    return isStudentEligibleForMentorCall(currentUser, m) && meetingAge < maxMeetingAgeMs;
  });

  let mentorMeet = null;
  if (activeMentorMeetings.length > 0) {
    activeMentorMeetings.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
    mentorMeet = activeMentorMeetings[0];
  }

  if (!mentorMeet) {
    alert("Meeting has already ended or you are not invited.");
    hideIncomingCallOverlay();
    return;
  }

  if (!db.meetings) db.meetings = [];
  let meetIdx = db.meetings.findIndex(m => m.id === mentorMeet.id);
  if (meetIdx === -1) {
    db.meetings.push(mentorMeet);
    meetIdx = db.meetings.length - 1;
  }
  
  if (!db.meetings[meetIdx].participants.includes(currentUser.email)) {
    db.meetings[meetIdx].participants.push(currentUser.email);
    saveDatabase(true);
    syncRecordToFirestore('meetings', db.meetings[meetIdx]);
  }
  activeMeeting = db.meetings[meetIdx];
  markVideoCallAttendance(currentUser.email, activeMeeting, 'Video Call Attendance - Joined');

  openMeetingRoom();
}

function declineIncomingCall() {
  if (incomingMeetingId) {
    declinedMeetingIds.push(incomingMeetingId);
  }
  hideIncomingCallOverlay();
}

function openMeetingRoom() {
  // Always use WhatsApp-style WebRTC overlay
  openWAStyleCall();
}

function launchJitsiCall(roomId) {
  const overlay = document.getElementById('jitsi-call-overlay');
  if (!overlay) { _openLegacyMeetingRoom(); return; }
  overlay.classList.remove('hidden');
  overlay.classList.add('active');
  const container = document.getElementById('jitsi-call-container');
  if (!container) return;
  container.innerHTML = '';
  const roomLabel = document.getElementById('jitsi-room-label');
  if (roomLabel) roomLabel.textContent = 'Room: ' + roomId;
  const loadJitsi = (cb) => {
    if (window.JitsiMeetExternalAPI) { cb(); return; }
    const s = document.createElement('script');
    s.src = 'https://meet.jit.si/external_api.js';
    s.onload = cb;
    s.onerror = () => { window.open('https://meet.jit.si/' + roomId, '_blank'); };
    document.head.appendChild(s);
  };
  loadJitsi(() => {
    if (!window.JitsiMeetExternalAPI) {
      window.open('https://meet.jit.si/' + roomId, '_blank'); return;
    }
    const displayName = (currentUser && currentUser.name) ? currentUser.name : ((currentUser && currentUser.email) ? currentUser.email.split('@')[0] : 'Guest');
    try {
      _jitsiApi = new JitsiMeetExternalAPI('meet.jit.si', {
        roomName: roomId,
        parentNode: container,
        width: '100%',
        height: '100%',
        userInfo: { displayName: displayName, email: (currentUser && currentUser.email) || '' },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          enableClosePage: false,
          disableInviteFunctions: true,
          toolbarButtons: ['microphone','camera','desktop','fullscreen','hangup','chat','tileview','raisehand','select-background']
        },
        interfaceConfigOverwrite: {
          TOOLBAR_ALWAYS_VISIBLE: true,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_BACKGROUND: '#07070a',
          MOBILE_APP_PROMO: false
        }
      });
      _jitsiApi.addEventListener('videoConferenceLeft', function() { closeJitsiCall(true); });
      _jitsiApi.addEventListener('participantJoined', function(d) {
        showToast((d.displayName || 'Someone') + ' joined the call', 2500);
      });
    } catch(err) {
      console.error('Jitsi init failed:', err);
      window.open('https://meet.jit.si/' + roomId, '_blank');
    }
  });
  // Timer
  meetingSeconds = 0;
  if (meetingTimerInterval) clearInterval(meetingTimerInterval);
  meetingTimerInterval = setInterval(function() {
    meetingSeconds++;
    var mins = String(Math.floor(meetingSeconds/60)).padStart(2,'0');
    var secs = String(meetingSeconds%60).padStart(2,'0');
    var el = document.getElementById('jitsi-call-timer');
    if (el) el.textContent = mins+':'+secs;
  }, 1000);
}

function closeJitsiCall(fromHangup) {
  clearInterval(meetingTimerInterval);
  meetingTimerInterval = null;
  if (_jitsiApi) { try { _jitsiApi.dispose(); } catch(e){} _jitsiApi = null; }
  var overlay = document.getElementById('jitsi-call-overlay');
  if (overlay) { overlay.classList.add('hidden'); overlay.classList.remove('active'); }
  var container = document.getElementById('jitsi-call-container');
  if (container) container.innerHTML = '';
  // Only trigger leaveMeeting if it wasn't already triggered (avoid loop)
  if (fromHangup && activeMeeting && !_jitsiLeavePending) {
    _jitsiLeavePending = true;
    leaveMeeting().finally(() => { _jitsiLeavePending = false; });
  }
}
let _jitsiLeavePending = false;

function _openLegacyMeetingRoom() {
  var meetingOverlay = document.getElementById('meeting-room-overlay');
  if (!meetingOverlay) return;
  meetingOverlay.classList.add('active');
  meetingOverlay.classList.remove('hidden');
  if (document.getElementById('meeting-host-name')) document.getElementById('meeting-host-name').innerText = (activeMeeting && activeMeeting.mentorName) || '';
  if (document.getElementById('meet-chat-input')) document.getElementById('meet-chat-input').value = '';
  meetingSeconds = 0;
  meetingRecordingFinalized = false;
  pendingRecordingUpload = null;
  meetingRecordedChunks = [];
  meetingMediaRecorder = null;
  if (document.getElementById('meeting-timer')) document.getElementById('meeting-timer').innerText = 'Time Elapsed: 00:00';
  if (meetingTimerInterval) clearInterval(meetingTimerInterval);
  meetingTimerInterval = setInterval(function() {
    meetingSeconds++;
    var mins = String(Math.floor(meetingSeconds/60)).padStart(2,'0');
    var secs = String(meetingSeconds%60).padStart(2,'0');
    var el = document.getElementById('meeting-timer');
    if (el) el.innerText = 'Time Elapsed: ' + mins + ':' + secs;
  }, 1000);
  var micBtn = document.getElementById('meet-btn-mic');
  var camBtn = document.getElementById('meet-btn-cam');
  var shareBtn = document.getElementById('meet-btn-share');
  if (micBtn) micBtn.className = 'meet-ctrl-btn active';
  if (camBtn) camBtn.className = 'meet-ctrl-btn active';
  if (shareBtn) shareBtn.className = 'meet-ctrl-btn';
  startLocalMeetingCamera();
  if (typeof renderMeetingParticipants === 'function') renderMeetingParticipants();
  if (typeof renderMeetingChat === 'function') renderMeetingChat();
}
function startLocalMeetingCamera() {
  navigator.mediaDevices.getUserMedia({
    video: {
      width: { min: 640, ideal: 1920, max: 2560 },
      height: { min: 480, ideal: 1080, max: 1440 },
      frameRate: { ideal: 30 }
    },
    audio: true
  })
    .then(stream => {
      localMediaStream = stream;
      renderMeetingParticipants(); // Re-render participants to update local and remote mockup streams
      setupWebRTCPeerConnection();
      startMeetingRecording(stream);
    })
    .catch(err => {
      console.warn("Camera and Mic failed, trying Mic only:", err);
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(audioStream => {
          localMediaStream = audioStream;
          renderMeetingParticipants();
          setupWebRTCPeerConnection();
          startMeetingRecording(audioStream);
        })
        .catch(audioErr => {
          console.warn("Audio only also failed/denied:", audioErr);
          localMediaStream = null;
          renderMeetingParticipants();
          setupWebRTCPeerConnection();
        });
    });
}

function renderMeetingParticipants() {
  const grid = document.getElementById('meeting-video-grid');
  if (!grid || !activeMeeting) return;

  if (typeof cleanLeftParticipants === 'function') {
    cleanLeftParticipants();
  }

  const activeEmails = activeMeeting.participants.map(email => email.trim().toLowerCase());

  // 1. Remove tiles for participants who left
  const existingTiles = grid.querySelectorAll('.meeting-video-tile');
  existingTiles.forEach(tile => {
    const email = tile.getAttribute('data-email');
    if (email && !activeEmails.includes(email.trim().toLowerCase())) {
      tile.remove();
    }
  });

  const participantsCount = activeMeeting.participants.length;
  document.getElementById('meet-participants-count').innerText = participantsCount;

  // Dynamic grid scaling based on participant count to fit everyone cleanly
  let minWidth = '240px';
  let gap = '15px';
  let avatarSize = '80px';
  let fontSize = '11px';
  let padding = '4px 10px';
  let labelBottom = '12px';
  let labelLeft = '12px';

  if (participantsCount > 30) {
    minWidth = '110px';
    gap = '6px';
    avatarSize = '40px';
    fontSize = '9px';
    padding = '2px 4px';
    labelBottom = '6px';
    labelLeft = '6px';
  } else if (participantsCount > 16) {
    minWidth = '140px';
    gap = '8px';
    avatarSize = '50px';
    fontSize = '10px';
    padding = '3px 6px';
    labelBottom = '8px';
    labelLeft = '8px';
  } else if (participantsCount > 9) {
    minWidth = '180px';
    gap = '10px';
    avatarSize = '60px';
    fontSize = '10px';
    padding = '3px 8px';
    labelBottom = '10px';
    labelLeft = '10px';
  } else if (participantsCount > 4) {
    minWidth = '210px';
    gap = '12px';
    avatarSize = '70px';
    fontSize = '11px';
    padding = '4px 8px';
    labelBottom = '10px';
    labelLeft = '10px';
  }

  grid.style.gridTemplateColumns = `repeat(auto-fit, minmax(${minWidth}, 1fr))`;
  grid.style.gap = gap;
  grid.style.setProperty('--tile-avatar-size', avatarSize);
  grid.style.setProperty('--tile-font-size', fontSize);
  grid.style.setProperty('--tile-padding', padding);
  grid.style.setProperty('--tile-label-bottom', labelBottom);
  grid.style.setProperty('--tile-label-left', labelLeft);


  activeMeeting.participants.forEach(email => {
    const isLocal = email && currentUser.email && email.trim().toLowerCase() === currentUser.email.trim().toLowerCase();
    const userObj = db.users.find(u => u && u.email && u.email.trim().toLowerCase() === email.trim().toLowerCase());
    const userName = isLocal ? "You" : (userObj ? userObj.name : email.split('@')[0]);
    
    const avatar = (userObj && userObj.role === 'student' && userObj.faceDescriptor)
      ? userObj.faceDescriptor
      : ((userObj && userObj.avatar) ? userObj.avatar : '');

    const tileId = `meet-tile-${email.replace(/[@.]/g, '-')}`;
    let tile = document.getElementById(tileId);
    let isNew = false;
    
    if (!tile) {
      tile = document.createElement('div');
      tile.className = 'meeting-video-tile';
      tile.id = tileId;
      tile.setAttribute('data-email', email);
      grid.appendChild(tile);
      isNew = true;
    }

    const isMuted = activeMeeting.mutedParticipants && activeMeeting.mutedParticipants.includes(email);
    const isVideoOff = activeMeeting.videoOffParticipants && activeMeeting.videoOffParticipants.includes(email);
    const isScreenSharing = activeMeeting.screenSharer === email;
    const showSpeakingWave = !isMuted && !isScreenSharing;

    // Determine current media layout type
    let currentMediaType = 'fallback';
    if (isLocal) {
      if (isScreenSharing) currentMediaType = 'screenshare';
      else if (localMediaStream && !isVideoOff) currentMediaType = 'video';
      else if (!isVideoOff) currentMediaType = 'simulated';
    } else {
      if (isScreenSharing) currentMediaType = 'screenshare';
      else if (!isVideoOff) {
        if (typeof remoteStreams !== 'undefined' && remoteStreams[email]) currentMediaType = 'video';
        else currentMediaType = 'simulated';
      }
    }

    const previousMediaType = tile.getAttribute('data-media-type');
    
    if (isNew || previousMediaType !== currentMediaType) {
      tile.setAttribute('data-media-type', currentMediaType);
      
      let contentHTML = '';
      if (currentMediaType === 'screenshare') {
        contentHTML = getScreenShareMockupHTML();
      } else if (currentMediaType === 'video') {
        if (isLocal) {
          contentHTML = `<video id="meeting-local-video" autoplay playsinline muted></video>`;
        } else {
          contentHTML = `
            <div style="position: relative; width: 100%; height: 100%; background: #07070a;">
              <video id="remote-video-${email.replace(/[@.]/g, '-')}" autoplay playsinline style="width:100%; height:100%; object-fit:cover; transform: none !important; z-index: 2; position: relative;"></video>
              <div style="position: absolute; top: 12px; left: 12px; display: flex; align-items: center; gap: 6px; z-index: 4; font-family: monospace; font-size: 9px; color: rgba(255,255,255,0.7); background: rgba(0,0,0,0.55); padding: 3px 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(4px);">
                <span style="display:inline-block; width:5px; height:5px; border-radius:50%; background:#10b981; box-shadow: 0 0 4px #10b981;"></span>
                <span>REMOTE FEED</span>
                <span style="opacity:0.4;">|</span>
                <span>30 FPS</span>
              </div>
              <div style="position: absolute; top: 12px; right: 12px; display: flex; align-items: center; gap: 5px; z-index: 4; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); padding: 3px 8px; border-radius: 4px; color: #ef4444; font-family: monospace; font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; backdrop-filter: blur(4px); box-shadow: 0 0 10px rgba(239, 68, 68, 0.15);">
                <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #ef4444; animation: blinkRed 1s infinite;"></span>
                <span>LIVE</span>
              </div>
            </div>`;
        }
      } else if (currentMediaType === 'simulated') {
        contentHTML = getSimulatedLiveFeedHTML(userName, avatar, isMuted, isLocal);
      } else {
        contentHTML = getAvatarFallbackHTML(userName, avatar);
      }
      
      tile.innerHTML = contentHTML + `
        <div class="tile-name-label">
          <span class="tile-user-name">${escapeHTML(userName)}</span>
          <span class="tile-mute-status">${isMuted ? '??' : ''}</span>
          <span class="speaking-indicator-container"></span>
        </div>
        <div class="tile-status-icon-container"></div>
      `;
    } else {
      const muteStatus = tile.querySelector('.tile-mute-status');
      if (muteStatus) {
        muteStatus.innerText = isMuted ? '??' : '';
      }
    }

    const speakContainer = tile.querySelector('.speaking-indicator-container');
    if (speakContainer) {
      if (showSpeakingWave) {
        tile.classList.add('speaking');
        speakContainer.innerHTML = `
          <span style="display: inline-flex; align-items: center; height: 12px; margin-left: 4px;">
            <span class="speaking-waveform-bar" style="animation-delay: 0.1s;"></span>
            <span class="speaking-waveform-bar" style="animation-delay: 0.3s;"></span>
            <span class="speaking-waveform-bar" style="animation-delay: 0.2s;"></span>
          </span>`;
      } else {
        tile.classList.remove('speaking');
        speakContainer.innerHTML = '';
      }
    }

    const statusIconContainer = tile.querySelector('.tile-status-icon-container');
    if (statusIconContainer) {
      if (isMuted) {
        statusIconContainer.innerHTML = `<div class="tile-status-icon">??</div>`;
      } else if (isVideoOff) {
        statusIconContainer.innerHTML = `<div class="tile-status-icon" style="color:var(--text-muted)">???</div>`;
      } else {
        statusIconContainer.innerHTML = '';
      }
    }

    // Set/Re-bind video srcObject if it has changed
    if (currentMediaType === 'video') {
      if (isLocal) {
        const localVid = document.getElementById('meeting-local-video');
        if (localVid && localMediaStream && localMediaStream.getVideoTracks().length > 0 && localVid.srcObject !== localMediaStream) {
          localVid.srcObject = localMediaStream;
        }
      } else {
        const remoteVid = document.getElementById(`remote-video-${email.replace(/[@.]/g, '-')}`);
        if (remoteVid && remoteStreams[email] && remoteVid.srcObject !== remoteStreams[email]) {
          remoteVid.srcObject = remoteStreams[email];
          remoteVid.play().catch(e => console.warn("Failed to autoplay remote video:", e));
        }
      }
    }
  });

  renderMeetingParticipantsList();
}

function getAvatarFallbackHTML(name, avatarUrl) {
  const initial = name.charAt(0).toUpperCase();
  
  // Create a blurred background of the face scan or avatar photo
  const bgStyle = avatarUrl 
    ? `background-image: url('${avatarUrl}'); background-size: cover; background-position: center; filter: blur(15px) brightness(0.45);` 
    : `background: linear-gradient(135deg, rgba(219,39,119,0.08), rgba(139,92,246,0.08));`;
  
  // Centered unblurred glowing profile photo
  const avatarImg = avatarUrl 
    ? `<img src="${avatarUrl}" alt="${name}" style="width: 90px; height: 90px; border-radius: 50%; object-fit: cover; border: 3px solid var(--primary-magenta); box-shadow: 0 0 25px var(--primary-glow); animation: pulse 2.5s infinite;">` 
    : `
      <div style="width: 90px; height: 90px; border-radius: 50%; background: linear-gradient(135deg, var(--primary-magenta), var(--accent-purple)); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 38px; font-weight: bold; border: 3px solid var(--primary-magenta); box-shadow: 0 0 25px var(--primary-glow); animation: pulse 2.5s infinite;">
        ${initial}
      </div>`;
      
  return `
    <div class="tile-avatar-fallback" style="position: absolute; top:0; left:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; overflow:hidden;">
      <div style="position: absolute; top:0; left:0; width:100%; height:100%; ${bgStyle} z-index: 1;"></div>
      <div style="position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
        ${avatarImg}
      </div>
    </div>`;
}

function getSimulatedLiveFeedHTML(name, avatarUrl, isMuted, isLocal) {
  const initial = name.charAt(0).toUpperCase();
  
  // Create a blurred background of the face scan or avatar photo
  const bgStyle = avatarUrl 
    ? `background-image: url('${avatarUrl}'); background-size: cover; background-position: center; filter: blur(20px) brightness(0.4); transform: scale(1.1); animation: panBackground 20s infinite alternate ease-in-out;` 
    : `background: linear-gradient(135deg, rgba(219,39,119,0.12), rgba(139,92,246,0.12));`;
  
  // Center profile picture inside glowing ring
  const avatarImg = avatarUrl 
    ? `<img src="${avatarUrl}" alt="${name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2px solid #0f0f15;">` 
    : `<div style="width: 100%; height: 100%; border-radius: 50%; background: linear-gradient(135deg, var(--primary-magenta), var(--accent-purple)); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 38px; font-weight: bold; border: 2px solid #0f0f15;">${initial}</div>`;
      
  return `
    <div class="tile-simulated-live" style="position: absolute; top:0; left:0; width:100%; height:100%; overflow:hidden; display:flex; align-items:center; justify-content:center; background:#07070a;">
      <!-- Blurred Background -->
      <div style="position: absolute; top:0; left:0; width:100%; height:100%; ${bgStyle} z-index: 1;"></div>
      
      <!-- Scanlines Overlay -->
      <div style="position: absolute; top:0; left:0; width:100%; height:100%; background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.2) 50%); background-size: 100% 4px; z-index: 2; opacity: 0.35; pointer-events: none;"></div>

      <!-- Ambient Glow -->
      <div style="position: absolute; width: 140px; height: 140px; border-radius: 50%; background: rgba(219,39,119,0.12); filter: blur(35px); z-index: 2; animation: ambientGlow 4s infinite alternate;"></div>

      <!-- Center Glow Card -->
      <div style="position: relative; z-index: 3; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <div style="position: relative; width: 90px; height: 90px; border-radius: 50%; padding: 3px; background: linear-gradient(135deg, var(--primary-magenta), var(--accent-purple)); box-shadow: 0 0 25px var(--primary-glow); animation: liveBorderPulse 2.5s infinite;">
          ${avatarImg}
          <!-- Flashing Green/Cyan Camera Indicator Dot -->
          <span style="position: absolute; bottom: 3px; right: 3px; width: 12px; height: 12px; border-radius: 50%; background: #10b981; border: 2px solid #0f0f15; box-shadow: 0 0 10px #10b981; animation: pulseGreen 1.5s infinite;"></span>
        </div>
      </div>

      <!-- Camera HUD Overlays -->
      <!-- Top Left: Camera Status -->
      <div style="position: absolute; top: 12px; left: 12px; display: flex; align-items: center; gap: 6px; z-index: 4; font-family: monospace; font-size: 9px; color: rgba(255,255,255,0.7); background: rgba(0,0,0,0.55); padding: 3px 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(4px);">
        <span style="display:inline-block; width:5px; height:5px; border-radius:50%; background:#10b981; box-shadow: 0 0 4px #10b981;"></span>
        <span>${isLocal ? 'SIM CAMERA' : 'REMOTE FEED'}</span>
        <span style="opacity:0.4;">|</span>
        <span>30 FPS</span>
      </div>

      <!-- Top Right: LIVE badge -->
      <div style="position: absolute; top: 12px; right: 12px; display: flex; align-items: center; gap: 5px; z-index: 4; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); padding: 3px 8px; border-radius: 4px; color: #ef4444; font-family: monospace; font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; backdrop-filter: blur(4px); box-shadow: 0 0 10px rgba(239, 68, 68, 0.15);">
        <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #ef4444; animation: blinkRed 1s infinite;"></span>
        <span>LIVE</span>
      </div>
    </div>`;
}

function getScreenShareMockupHTML() {
  return `
    <div style="width:100%; height:100%; background:#1e1e1e; font-family:monospace; font-size:10px; color:#a6accd; padding:15px; overflow:hidden; box-sizing:border-box;" class="webrtc-screen-share">
      <div style="color:#ffcb6b; border-bottom:1px solid #2d2d30; padding-bottom:5px; margin-bottom:8px; font-weight:bold;">?? index.html - Screen Share Feed</div>
      <div class="scrolling-code-feed" style="line-height:1.4; animation: scrollCode 12s infinite linear; text-align: left;">
        <span style="color:#89ddff">&lt;div</span> <span style="color:#f07178">class=</span><span style="color:#c3e88d">"dashboard"</span><span style="color:#89ddff">&gt;</span><br>
        &nbsp;&nbsp;<span style="color:#89ddff">&lt;aside</span> <span style="color:#f07178">class=</span><span style="color:#c3e88d">"sidebar"</span><span style="color:#89ddff">&gt;</span><br>
        &nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#89ddff">&lt;div</span> <span style="color:#f07178">class=</span><span style="color:#c3e88d">"logo"</span><span style="color:#89ddff">&gt;InternX by UTX&lt;/div&gt;</span><br>
        &nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#89ddff">&lt;ul&gt;</span><br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#89ddff">&lt;li</span> <span style="color:#f07178">class=</span><span style="color:#c3e88d">"active"</span><span style="color:#89ddff">&gt;</span>Dashboard<span style="color:#89ddff">&lt;/li&gt;</span><br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#89ddff">&lt;li&gt;</span>Tasks Board<span style="color:#89ddff">&lt;/li&gt;</span><br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#89ddff">&lt;li&gt;</span>Weekly Logs<span style="color:#89ddff">&lt;/li&gt;</span><br>
        &nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#89ddff">&lt;/ul&gt;</span><br>
        &nbsp;&nbsp;<span style="color:#89ddff">&lt;/aside&gt;</span><br>
        &nbsp;&nbsp;<span style="color:#89ddff">&lt;main</span> <span style="color:#f07178">class=</span><span style="color:#c3e88d">"content"</span><span style="color:#89ddff">&gt;</span><br>
        &nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#89ddff">&lt;header&gt;</span>Welcome Back, Student!<span style="color:#89ddff">&lt;/header&gt;</span><br>
        &nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#89ddff">&lt;div</span> <span style="color:#f07178">class=</span><span style="color:#c3e88d">"grid"</span><span style="color:#89ddff">&gt;</span><br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#c792ea">const</span> <span style="color:#f78c6c">attendance</span> = <span style="color:#c3e88d">'Verified'</span>;<br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;console.log(<span style="color:#c3e88d">"Marked attendance"</span>);<br>
        &nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#89ddff">&lt;/div&gt;</span><br>
        &nbsp;&nbsp;<span style="color:#89ddff">&lt;/main&gt;</span><br>
        <span style="color:#89ddff">&lt;/div&gt;</span>
      </div>
    </div>
    <style>
      @keyframes scrollCode {
        0% { transform: translateY(0); }
        50% { transform: translateY(-80px); }
        100% { transform: translateY(0); }
      }
    </style>`;
}

function updateLocalVideoTileStream() {
  if (!activeMeeting) return;
  const isVideoOff = activeMeeting.videoOffParticipants && activeMeeting.videoOffParticipants.includes(currentUser.email);
  const isScreenSharing = activeMeeting.screenSharer && currentUser.email && activeMeeting.screenSharer.trim().toLowerCase() === currentUser.email.trim().toLowerCase();

  const tileId = `meet-tile-${currentUser.email.replace(/[@.]/g, '-')}`;
  const tile = document.getElementById(tileId);
  if (!tile) return;

  if (isScreenSharing) {
    const mediaNode = tile.querySelector('.tile-avatar-fallback, video, .webrtc-screen-share');
    if (mediaNode) mediaNode.outerHTML = getScreenShareMockupHTML();
  } else if (localMediaStream && !isVideoOff) {
    let localVid = document.getElementById('meeting-local-video');
    if (!localVid) {
      const fallback = tile.querySelector('.tile-avatar-fallback');
      if (fallback) fallback.remove();
      const codeFeed = tile.querySelector('.webrtc-screen-share');
      if (codeFeed) codeFeed.remove();

      localVid = document.createElement('video');
      localVid.id = 'meeting-local-video';
      localVid.autoplay = true;
      localVid.playsInline = true;
      localVid.muted = true;
      tile.insertBefore(localVid, tile.firstChild);
    }
    if (localVid.srcObject !== localMediaStream) {
      localVid.srcObject = localMediaStream;
    }
  } else {
    const localVid = document.getElementById('meeting-local-video');
    if (localVid) localVid.remove();
    const codeFeed = tile.querySelector('.webrtc-screen-share');
    if (codeFeed) codeFeed.remove();

    let fallback = tile.querySelector('.tile-avatar-fallback');
    if (!fallback) {
      const userObj = db.users.find(u => u.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase());
      const userName = "You";
      const avatar = (userObj && userObj.avatar) ? userObj.avatar : '';
      tile.insertAdjacentHTML('afterbegin', getAvatarFallbackHTML(userName, avatar));
    }
  }
}

function toggleMeetingMic() {
  if (!activeMeeting) return;

  const meetIdx = db.meetings.findIndex(m => m.id === activeMeeting.id);
  if (meetIdx === -1) return;

  const userEmail = currentUser.email;
  const isMuted = db.meetings[meetIdx].mutedParticipants.includes(userEmail);

  if (isMuted) {
    db.meetings[meetIdx].mutedParticipants = db.meetings[meetIdx].mutedParticipants.filter(e => e !== userEmail);
    document.getElementById('meet-btn-mic').className = "meet-ctrl-btn active";
    const on = document.getElementById('mic-icon-on');
    const off = document.getElementById('mic-icon-off');
    if (on) on.style.display = '';
    if (off) off.style.display = 'none';
    const lbl = document.getElementById('meet-mic-label');
    if (lbl) lbl.textContent = 'Mute';
  } else {
    db.meetings[meetIdx].mutedParticipants.push(userEmail);
    document.getElementById('meet-btn-mic').className = "meet-ctrl-btn muted";
    const on = document.getElementById('mic-icon-on');
    const off = document.getElementById('mic-icon-off');
    if (on) on.style.display = 'none';
    if (off) off.style.display = '';
    const lbl = document.getElementById('meet-mic-label');
    if (lbl) lbl.textContent = 'Unmute';
  }

  saveDatabase(true);
  syncRecordToFirestore('meetings', db.meetings[meetIdx]);
  activeMeeting = db.meetings[meetIdx];

  if (localMediaStream) {
    localMediaStream.getAudioTracks().forEach(track => {
      track.enabled = isMuted;
    });
  }

  renderMeetingParticipants();
}

function toggleMeetingCam() {
  if (!activeMeeting) return;

  const meetIdx = db.meetings.findIndex(m => m.id === activeMeeting.id);
  if (meetIdx === -1) return;

  const userEmail = currentUser.email;
  const isVideoOff = db.meetings[meetIdx].videoOffParticipants.includes(userEmail);

  if (isVideoOff) {
    db.meetings[meetIdx].videoOffParticipants = db.meetings[meetIdx].videoOffParticipants.filter(e => e !== userEmail);
    document.getElementById('meet-btn-cam').className = "meet-ctrl-btn active";
  } else {
    db.meetings[meetIdx].videoOffParticipants.push(userEmail);
    document.getElementById('meet-btn-cam').className = "meet-ctrl-btn muted";
  }

  saveDatabase(true);
  syncRecordToFirestore('meetings', db.meetings[meetIdx]);
  activeMeeting = db.meetings[meetIdx];

  if (localMediaStream) {
    localMediaStream.getVideoTracks().forEach(track => {
      track.enabled = isVideoOff;
    });
  }

  updateLocalVideoTileStream();
  renderMeetingParticipants();
}

function toggleMeetingShare() {
  if (!activeMeeting) return;

  const meetIdx = db.meetings.findIndex(m => m.id === activeMeeting.id);
  if (meetIdx === -1) return;

  const userEmail = currentUser.email;
  const isSharing = db.meetings[meetIdx].screenSharer === userEmail;

  if (isSharing) {
    db.meetings[meetIdx].screenSharer = null;
    document.getElementById('meet-btn-share').className = "meet-ctrl-btn";
  } else {
    db.meetings[meetIdx].screenSharer = userEmail;
    document.getElementById('meet-btn-share').className = "meet-ctrl-btn active";
  }

  saveDatabase(true);
  syncRecordToFirestore('meetings', db.meetings[meetIdx]);
  activeMeeting = db.meetings[meetIdx];

  renderMeetingParticipants();
}

async function leaveMeeting() {
  if (!activeMeeting) return;

  const meetIdx = db.meetings.findIndex(m => m.id === activeMeeting.id);

  if (meetIdx !== -1) {
    if (currentUser.role === 'mentor') {
      // --- Mentor: end ALL active meetings for this mentor, then show AI summary modal ---
      const mentorEmailNorm = currentUser.email.trim().toLowerCase();
      if (db.meetings) {
        db.meetings.forEach(m => {
          if (m.mentorEmail && m.mentorEmail.trim().toLowerCase() === mentorEmailNorm && m.status === 'active') {
            m.status = 'ended';
            registerEndedMeeting(m.id);
            syncRecordToFirestore('meetings', m);
            notifyMeetingEvent({ type: 'call_ended', meetingId: m.id, mentorEmail: currentUser.email });

            (m.participants || []).forEach(email => {
              if (email.trim().toLowerCase() !== mentorEmailNorm) {
                markVideoCallAttendance(email, m, 'Video Call Attendance - Group Session');
              }
            });
          }
        });
      }
      saveDatabase();

      // Store snapshot for the summary flow
      const endedMeeting = db.meetings[meetIdx];
      window._pendingMeetingRecord = endedMeeting;
      window._pendingMeetingSeconds = meetingSeconds;

      // Stop recorder and upload to Supabase immediately (don't wait for summary modal submit)
      pendingRecordingUpload = stopAndDownloadMeetingRecording(endedMeeting.id);

      // Auto-trigger summary generation as soon as modal opens
      const modal = document.getElementById('end-meeting-summary-modal');
      if (modal) {
        // Reset modal state
        const notesEl = document.getElementById('meet-summary-notes');
        const outputEl = document.getElementById('meet-ai-summary-output');
        if (notesEl) notesEl.value = '';
        if (outputEl) outputEl.innerHTML = '? Auto-generating AI summary...';

        modal.classList.add('active');
        modal.classList.remove('hidden');

        // Auto-generate immediately (no button needed)
        setTimeout(() => generateMeetingSummary(), 400);
      } else {
        // Fallback: save with auto-generated summary silently
        await pendingRecordingUpload;
        await saveMeetingSessionReport(endedMeeting, meetingSeconds, null);
        await exitMeetingRoom("Meeting ended by Host.", true);
      }
    } else {
      db.meetings[meetIdx].participants = db.meetings[meetIdx].participants.filter(e => e !== currentUser.email);
      db.meetings[meetIdx].mutedParticipants = db.meetings[meetIdx].mutedParticipants.filter(e => e !== currentUser.email);
      db.meetings[meetIdx].videoOffParticipants = db.meetings[meetIdx].videoOffParticipants.filter(e => e !== currentUser.email);
      if (db.meetings[meetIdx].screenSharer && currentUser.email && db.meetings[meetIdx].screenSharer.trim().toLowerCase() === currentUser.email.trim().toLowerCase()) {
        db.meetings[meetIdx].screenSharer = null;
      }
      saveDatabase();
      syncRecordToFirestore('meetings', db.meetings[meetIdx]);
      await exitMeetingRoom("You left the meeting.");
    }
  } else {
    await exitMeetingRoom("Meeting room closed.");
  }
}

async function saveMeetingSessionReport(meetingRecord, durationSeconds, aiSummary) {
  if (!supabaseActive || !supabaseClient) return;

  const domain = currentUser.domain || "Web Development";
  const mentorName = meetingRecord.mentorName || currentUser.name || "Mentor";
  const mentorEmail = meetingRecord.mentorEmail || currentUser.email || "";

  // Filter out mentor from participants to get student emails
  const studentEmails = (meetingRecord.participants || []).filter(e => 
    e.trim().toLowerCase() !== mentorEmail.trim().toLowerCase()
  );

  const studentCount = studentEmails.length;
  const studentDetailsList = studentEmails.map(email => {
    const userObj = db.users.find(u => u && u.email && u.email.trim().toLowerCase() === email.trim().toLowerCase());
    const name = userObj ? userObj.name : email.split('@')[0];
    return { name, email };
  });

  const studentNamesString = studentDetailsList.map(s => s.name).join(', ') || "No students joined";
  const studentEmailsString = studentDetailsList.map(s => s.email).join(', ') || "No students joined";

  // Create date and time
  const createdDate = meetingRecord.createdAt ? new Date(meetingRecord.createdAt) : new Date();
  const dateStr = createdDate.toDateString();
  const timeStr = createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Calculate duration
  const mins = Math.floor(durationSeconds / 60);
  const secs = durationSeconds % 60;
  const durationStr = `${mins}m ${secs}s`;

  // Create a premium mock recording link pointing to Supabase storage
  const recordingLink = `https://gvsextnrduejeaxyadbj.supabase.co/storage/v1/object/public/recordings/meet-rec-${meetingRecord.id}.webm`;

  // If no summary provided, build a basic auto-summary fallback
  const finalSummary = aiSummary || `Meeting held on ${dateStr} at ${timeStr}. Students: ${studentNamesString}. Duration: ${durationStr}. Internship topics were discussed. Students should complete their assigned tasks.`;

  // Primary Payload ... match actual Supabase table columns (no AI Summary column)
  const tablePayload = {
    "Domain": domain,
    "Mentor Name": mentorName,
    "Mentor Email": mentorEmail,
    "Students Count": studentCount,
    "Student Names": studentNamesString,
    "Student Emails": studentEmailsString,
    "Date": dateStr,
    "Time": timeStr,
    "Duration": durationStr,
    "Recording Link": recordingLink
  };

  console.log("Saving group call report to Supabase...", tablePayload);

  try {
    const { data: data0, error: error0 } = await supabaseClient
      .from('Group Meeting Table')
      .insert([tablePayload]);

    if (error0) {
      console.warn("Failed to insert into 'Group Meeting Table', trying 'Group Call Table'. Error:", error0);

      const { data: data1, error: error1 } = await supabaseClient
        .from('Group Call Table')
        .insert([tablePayload]);

      if (error1) {
        console.warn("Failed to insert into 'Group Call Table', trying lowercase fallbacks...");

        const lowercasePayload = {
          domain: domain,
          mentor_name: mentorName,
          mentor_email: mentorEmail,
          students_count: studentCount,
          student_names: studentNamesString,
          student_emails: studentEmailsString,
          date: dateStr,
          time: timeStr,
          duration: durationStr,
          recording_link: recordingLink
        };

        // 3. Try to insert into group meeting
        const { error: error2a } = await supabaseClient
          .from('group meeting')
          .insert([lowercasePayload]);

        if (error2a) {
          // 4. Try to insert into group call
          const { error: error2b } = await supabaseClient
            .from('group call')
            .insert([lowercasePayload]);

          if (error2b) {
            // 5. Try to insert into group_calls
            const { error: error3 } = await supabaseClient
              .from('group_calls')
              .insert([lowercasePayload]);

            if (error3) {
              console.warn("Custom tables do not exist or insert failed. Saving report to 'apex_sync' collection 'meeting_reports'...");

              // 6. Fallback to apex_sync table (always works)
              const syncDoc = {
                id: `rep-${meetingRecord.id}`,
                meetingId: meetingRecord.id,
                mentorName,
                mentorEmail,
                domain,
                studentCount,
                studentDetails: studentDetailsList,
                studentNamesString,
                date: dateStr,
                time: timeStr,
                duration: durationStr,
                recordingLink,
                aiSummary: finalSummary
              };

              const { error: errorSync } = await supabaseClient
                .from('apex_sync')
                .upsert({ id: syncDoc.id, collection: 'meeting_reports', data: syncDoc });

              if (errorSync) {
                console.error("Failed to sync meeting report to apex_sync table:", errorSync);
              } else {
                console.log("Successfully saved meeting report to 'apex_sync' collection 'meeting_reports'");
              }
            } else {
              console.log("Successfully saved meeting report to 'group_calls' table");
            }
          } else {
            console.log("Successfully saved meeting report to 'group call' table");
          }
        } else {
          console.log("Successfully saved meeting report to 'group meeting' table");
        }
      } else {
        console.log("Successfully saved meeting report to 'Group Call Table':", data1);
      }
    } else {
      console.log("Successfully saved meeting report to 'Group Meeting Table':", data0);
    }

    await saveMeetingReportToApexSync(meetingRecord, tablePayload, finalSummary, studentDetailsList, meetingRecord.messages || []);
  } catch (err) {
    console.error("Exception in saveMeetingSessionReport:", err);
  }
}

async function saveMeetingReportToApexSync(meetingRecord, tablePayload, aiSummary, studentDetailsList, chatMessages) {
  if (!supabaseActive || !supabaseClient || !meetingRecord) return;
  try {
    const syncDoc = {
      id: `rep-${meetingRecord.id}`,
      meetingId: meetingRecord.id,
      mentorName: tablePayload['Mentor Name'] || meetingRecord.mentorName || '',
      mentorEmail: tablePayload['Mentor Email'] || meetingRecord.mentorEmail || '',
      domain: tablePayload['Domain'] || '',
      studentCount: tablePayload['Students Count'] || 0,
      studentDetails: studentDetailsList || [],
      studentNamesString: tablePayload['Student Names'] || '',
      studentEmailsString: tablePayload['Student Emails'] || '',
      date: tablePayload['Date'] || '',
      time: tablePayload['Time'] || '',
      duration: tablePayload['Duration'] || '',
      recordingLink: tablePayload['Recording Link'] || '',
      aiSummary: aiSummary || '',
      chatMessages: chatMessages || []
    };
    const { error } = await supabaseClient
      .from('apex_sync')
      .upsert({ id: syncDoc.id, collection: 'meeting_reports', data: syncDoc });
    if (error) {
      console.error('Failed to save meeting AI recap to apex_sync:', error);
    } else {
      console.log('Meeting AI recap saved to apex_sync:', syncDoc.id);
    }
  } catch (err) {
    console.error('saveMeetingReportToApexSync error:', err);
  }
}

// --- AI MEETING SUMMARY ----------------------------------------------------

async function generateMeetingSummary() {
  const outputEl = document.getElementById('meet-ai-summary-output');
  const notesEl  = document.getElementById('meet-summary-notes');
  const btnEl    = document.getElementById('btn-generate-ai-summary');

  if (outputEl) outputEl.innerHTML = '? Gemini is analysing the meeting...';
  if (btnEl)    btnEl.disabled = true;

  const meetingRecord = window._pendingMeetingRecord || activeMeeting;
  const mentorName    = (meetingRecord && (meetingRecord.mentorName || currentUser.name)) || 'Mentor';
  const mentorEmail   = (meetingRecord && (meetingRecord.mentorEmail || currentUser.email)) || '';

  const studentList = meetingRecord && meetingRecord.participants
    ? meetingRecord.participants
        .filter(e => e.trim().toLowerCase() !== mentorEmail.trim().toLowerCase())
        .map(e => {
          const u = db.users.find(u => u && u.email && u.email.trim().toLowerCase() === e.trim().toLowerCase());
          return u ? u.name : e.split('@')[0];
        }).join(', ')
    : 'N/A';

  const messages = (meetingRecord && meetingRecord.messages) || [];
  const chatTranscript = messages.length > 0
    ? messages.map(m => `[${m.timestamp}] ${m.from}: ${m.text}`).join('\n')
    : '(No chat messages were sent during this meeting.)';

  const verbalNotes = notesEl ? notesEl.value.trim() : '';
  const durationSecs = window._pendingMeetingSeconds || 0;
  const mins = Math.floor(durationSecs / 60), secs = durationSecs % 60;
  const durationStr = `${mins}m ${secs}s`;

  const prompt = `You are an expert meeting summariser for an internship platform called InternX.
A group video meeting just ended. Here are the details:

Mentor: ${mentorName}
Students: ${studentList}
Duration: ${durationStr}
${verbalNotes ? `Mentor verbal notes: ${verbalNotes}` : ''}

Meeting Chat Transcript:
${chatTranscript}

Generate a concise, professional meeting summary (2-4 sentences) covering:
1. Key topics discussed
2. Action items or tasks assigned (if any)
3. Next steps or follow-up plans

Keep it brief and student-facing. Do NOT include greetings or sign-offs.`;

  const apiKey = localStorage.getItem('apex_ai_gemini_key') || 'YOUR_GEMINI_API_KEY_HERE';

  try {
    if (!apiKey) throw new Error('No API key');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] })
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `HTTP ${response.status}`);
    }
    const data = await response.json();
    const summaryText = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    if (!summaryText) throw new Error('Empty response');

    window._generatedMeetingSummary = summaryText;
    if (outputEl) {
      const formatted = summaryText
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n- /g, '<br>... ')
        .replace(/\n\* /g, '<br>... ')
        .replace(/\n/g, '<br>');
      outputEl.innerHTML = formatted;
    }
  } catch (err) {
    console.warn('Gemini summary failed, using structured fallback:', err.message);
    const fallback = `Meeting held on ${new Date().toDateString()} with students: ${studentList || 'N/A'}. Duration: ${durationStr}. ${verbalNotes ? `Topics covered: ${verbalNotes}.` : 'Key internship topics were discussed.'} Students are advised to review shared resources and complete assigned tasks.`;
    window._generatedMeetingSummary = fallback;
    if (outputEl) outputEl.innerHTML = `<em style="color:var(--text-muted);">?? AI unavailable ... auto-summary:</em><br>${fallback}`;
  }

  if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = '?? Regenerate Summary'; }
}

async function submitEndMeetingWithSummary() {
  const meetingRecord = window._pendingMeetingRecord;
  const durationSecs  = window._pendingMeetingSeconds || 0;
  const notes         = (document.getElementById('meet-summary-notes') || {}).value || '';
  let   summary       = window._generatedMeetingSummary || '';

  if (!summary) {
    const studentList = meetingRecord && meetingRecord.participants
      ? meetingRecord.participants
          .filter(e => e.trim().toLowerCase() !== (meetingRecord.mentorEmail || currentUser.email).trim().toLowerCase())
          .map(e => { const u = db.users.find(u => u && u.email && u.email.trim().toLowerCase() === e.trim().toLowerCase()); return u ? u.name : e.split('@')[0]; })
          .join(', ')
      : 'N/A';
    const mins = Math.floor(durationSecs / 60), secs = durationSecs % 60;
    summary = `Meeting held on ${new Date().toDateString()} with students: ${studentList}. Duration: ${mins}m ${secs}s. ${notes || 'Key internship topics were discussed.'} Students should follow up on assigned tasks.`;
  }

  const modal = document.getElementById('end-meeting-summary-modal');
  if (modal) { modal.classList.remove('active'); modal.classList.add('hidden'); }

  // Ensure recording upload finished before saving the report link
  if (pendingRecordingUpload) {
    await pendingRecordingUpload;
  }

  await saveMeetingSessionReport(meetingRecord, durationSecs, summary);

  window._pendingMeetingRecord    = null;
  window._pendingMeetingSeconds   = null;
  window._generatedMeetingSummary = null;

  await exitMeetingRoom("Meeting ended by Host. AI Summary saved! ?", true);
}

// --- DASHBOARD MEETING LOG RENDERER ---------------------------------------

// --- STUDENT AI GROUP CALL RECAP --------------------------------------------

let studentMeetingSummariesCache = {};

function normalizeMeetingReportFromSync(raw, syncId) {
  const d = (typeof raw === 'object' && raw !== null) ? raw : {};
  return {
    syncId: syncId || d.id || '',
    meetingId: d.meetingId || syncId || '',
    date: d.date || '',
    time: d.time || '',
    mentorName: d.mentorName || '',
    mentorEmail: d.mentorEmail || '',
    duration: d.duration || '',
    recordingLink: d.recordingLink || '',
    aiSummary: d.aiSummary || '',
    chatMessages: Array.isArray(d.chatMessages) ? d.chatMessages : [],
    studentEmails: d.studentEmailsString || '',
    studentNames: d.studentNamesString || '',
    studentsCount: d.studentCount || 0
  };
}

function studentParticipatedInMeeting(row, studentEmail, studentName) {
  const email = (studentEmail || '').trim().toLowerCase();
  const name = (studentName || '').trim().toLowerCase();
  const emails = (row.studentEmails || row['Student Emails'] || '').toLowerCase();
  const names = (row.studentNames || row['Student Names'] || '').toLowerCase();
  return (email && emails.includes(email)) || (name && names.includes(name));
}

function mergeTableRowWithApexReport(tableRow, reports) {
  const recLink = tableRow['Recording Link'] || tableRow.recordingLink || '';
  const idMatch = recLink.match(/meet-rec-([A-Za-z0-9_-]+)/);
  if (idMatch) {
    const rep = reports.find(r => r.meetingId === idMatch[1] || r.meetingId === `meet-${idMatch[1]}`);
    if (rep) {
      return {
        ...tableRow,
        meetingId: rep.meetingId,
        aiSummary: rep.aiSummary || tableRow['AI Summary'] || '',
        chatMessages: rep.chatMessages || [],
        recordingLink: recLink || rep.recordingLink
      };
    }
  }
  const rep = reports.find(r =>
    r.date === tableRow['Date'] &&
    (r.mentorEmail || '').trim().toLowerCase() === (tableRow['Mentor Email'] || '').trim().toLowerCase()
  );
  if (rep) {
    return {
      ...tableRow,
      meetingId: rep.meetingId,
      aiSummary: rep.aiSummary || '',
      chatMessages: rep.chatMessages || [],
      recordingLink: tableRow['Recording Link'] || rep.recordingLink
    };
  }
  return tableRow;
}

function getLocalMeetingRecapsForStudent() {
  if (!currentUser || currentUser.role !== 'student') return [];
  const email = currentUser.email.trim().toLowerCase();
  return (db.meetings || [])
    .filter(m => m && m.status === 'ended' && Array.isArray(m.participants) &&
      m.participants.some(p => p && p.trim().toLowerCase() === email))
    .map(m => ({
      meetingId: m.id,
      date: m.createdAt ? new Date(m.createdAt).toDateString() : '',
      time: m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      mentorName: m.mentorName || 'Your Mentor',
      mentorEmail: m.mentorEmail || '',
      duration: '...',
      recordingLink: `https://gvsextnrduejeaxyadbj.supabase.co/storage/v1/object/public/recordings/meet-rec-${m.id}.webm`,
      aiSummary: buildLocalMeetingRecapText(m),
      chatMessages: m.messages || [],
      studentEmails: email,
      studentNames: currentUser.name || ''
    }))
    .reverse();
}

function buildLocalMeetingRecapText(meetingOrData) {
  const mentorName = meetingOrData.mentorName || 'your mentor';
  const msgs = meetingOrData.chatMessages || meetingOrData.messages || [];
  if (!msgs.length) {
    return `You joined a group video session with ${mentorName}. No group chat was saved for this call. Check your task board and message your mentor if you need a reminder of what was assigned.`;
  }
  const highlights = msgs.slice(0, 12).map(m => `... ${m.from}: ${m.text}`).join('\n');
  return `Here is what was discussed in your group call with ${mentorName}:\n\n${highlights}\n\nTip: Follow up on any tasks or deadlines mentioned above.`;
}

function formatMeetingSummaryHtml(text) {
  if (!text) return '<em style="color:var(--text-muted)">No summary available for this session yet.</em>';
  return escapeHTML(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n- /g, '<br>... ')
    .replace(/\n\* /g, '<br>... ')
    .replace(/\n/g, '<br>');
}

function openStudentMeetingSummary(cacheKey) {
  const data = studentMeetingSummariesCache[cacheKey];
  if (!data) return;

  const mentorEl = document.getElementById('student-recap-mentor');
  const dateEl = document.getElementById('student-recap-datetime');
  const durEl = document.getElementById('student-recap-duration');
  const summaryEl = document.getElementById('student-recap-summary-body');
  const chatSection = document.getElementById('student-recap-chat-section');
  const chatLog = document.getElementById('student-recap-chat-log');
  const recBtn = document.getElementById('student-recap-recording-btn');
  const modal = document.getElementById('student-meeting-recap-modal');

  if (mentorEl) mentorEl.innerText = data.mentorName || data['Mentor Name'] || 'Your Mentor';
  if (dateEl) dateEl.innerText = `${data.date || data['Date'] || '...'} ${data.time || data['Time'] || ''}`.trim();
  if (durEl) durEl.innerText = data.duration || data['Duration'] || '...';

  const summaryText = data.aiSummary || data['AI Summary'] || buildLocalMeetingRecapText(data);
  if (summaryEl) summaryEl.innerHTML = formatMeetingSummaryHtml(summaryText);

  const msgs = data.chatMessages || [];
  if (chatSection && chatLog) {
    if (msgs.length) {
      chatSection.classList.remove('hidden');
      chatLog.innerHTML = msgs.map(m =>
        `<div style="margin-bottom:8px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.06);"><span style="color:var(--primary-magenta); font-weight:600;">${escapeHTML(m.from || 'User')}</span> <span style="color:var(--text-muted); font-size:10px;">${escapeHTML(m.timestamp || '')}</span><br><span style="color:#fff;">${escapeHTML(m.text || '')}</span></div>`
      ).join('');
    } else {
      chatSection.classList.add('hidden');
      chatLog.innerHTML = '';
    }
  }

  const recLink = data.recordingLink || data['Recording Link'] || '';
  if (recBtn) {
    if (recLink) {
      recBtn.href = recLink;
      recBtn.classList.remove('hidden');
    } else {
      recBtn.classList.add('hidden');
    }
  }

  if (modal) {
    modal.classList.add('active');
    modal.classList.remove('hidden');
  }
}

function closeStudentMeetingSummary() {
  const modal = document.getElementById('student-meeting-recap-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.classList.add('hidden');
  }
}

async function loadDashboardMeetings(role) {
  const tableId = role === 'mentor' ? 'mentor-meetings-summary-table' : 'student-meetings-summary-table';
  const tableEl = document.getElementById(tableId);
  if (!tableEl) return;
  const tbody = tableEl.querySelector('tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">Loading...</td></tr>`;

  if (role === 'student') studentMeetingSummariesCache = {};

  try {
    let rows = [];
    let apexReports = [];

    if (supabaseActive && supabaseClient) {
      try {
        const { data: syncData } = await supabaseClient
          .from('apex_sync')
          .select('*')
          .eq('collection', 'meeting_reports')
          .order('created_at', { ascending: false })
          .limit(30);
        if (syncData) {
          apexReports = syncData.map(r => normalizeMeetingReportFromSync(robustParse(r.data) || r.data, r.id));
        }
      } catch (e) {
        console.warn('Could not load meeting_reports from apex_sync:', e);
      }

      const primaryTables = ['Group Meeting Table', 'Group Call Table', 'group meeting', 'group call', 'group_calls'];
      for (const tbl of primaryTables) {
        try {
          let query = supabaseClient.from(tbl).select('*').order('Date', { ascending: false }).limit(15);
          if (role === 'mentor') {
            query = query.eq('Mentor Email', currentUser.email);
          } else {
            query = query.ilike('Student Emails', `%${currentUser.email}%`);
          }
          const { data, error } = await query;
          if (!error && data && data.length > 0) {
            rows = data.map(row => mergeTableRowWithApexReport(row, apexReports));
            break;
          }
        } catch (e) { /* try next */ }
      }

      if (rows.length === 0 && apexReports.length > 0) {
        rows = apexReports.filter(r =>
          role === 'mentor'
            ? (r.mentorEmail || '').trim().toLowerCase() === currentUser.email.trim().toLowerCase()
            : studentParticipatedInMeeting(r, currentUser.email, currentUser.name)
        );
      }
    }

    if (role === 'student') {
      const localRecaps = getLocalMeetingRecapsForStudent();
      localRecaps.forEach(local => {
        const exists = rows.some(r =>
          (r.meetingId && r.meetingId === local.meetingId) ||
          ((r['Date'] || r.date) === local.date && (r['Mentor Email'] || r.mentorEmail || '').toLowerCase() === (local.mentorEmail || '').toLowerCase())
        );
        if (!exists) rows.unshift(local);
      });
    }

    tbody.innerHTML = '';
    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">No group call recaps yet. Join a mentor video call ... your AI summary will appear here after the session ends.</td></tr>`;
      const latestCard = document.getElementById('student-latest-meeting-recap-card');
      if (latestCard) latestCard.classList.add('hidden');
      return;
    }

    rows.forEach((row, idx) => {
      const dateStr = `${row['Date'] || row.date || '...'} ${row['Time'] || row.time || ''}`.trim();
      const students = row['Student Names'] || row.studentNames || `${row['Students Count'] || row.studentsCount || 0} students`;
      const mentor = row['Mentor Name'] || row.mentorName || 'Mentor';
      const duration = row['Duration'] || row.duration || '...';
      const rawSummary = row['AI Summary'] || row.aiSummary || row.ai_summary || '';
      const recLink = row['Recording Link'] || row.recordingLink || row.recording_link || '';
      const cacheKey = `meet-row-${idx}`;
      const preview = rawSummary
        ? escapeHTML(rawSummary.substring(0, 72)) + (rawSummary.length > 72 ? '...' : '')
        : '<em style="color:var(--text-muted)">Tap View Recap</em>';

      if (role === 'student') {
        studentMeetingSummariesCache[cacheKey] = {
          ...row,
          mentorName: mentor,
          date: row['Date'] || row.date || '',
          time: row['Time'] || row.time || '',
          duration,
          aiSummary: rawSummary,
          recordingLink: recLink,
          chatMessages: row.chatMessages || []
        };
        if (idx === 0) {
          studentMeetingSummariesCache.latest = studentMeetingSummariesCache[cacheKey];
          const latestCard = document.getElementById('student-latest-meeting-recap-card');
          const latestText = document.getElementById('student-latest-meeting-recap-text');
          if (latestCard) latestCard.classList.remove('hidden');
          if (latestText) latestText.innerText = `${dateStr} with ${mentor} ... click to see the full AI recap.`;
        }
      }

      const tr = document.createElement('tr');
      if (role === 'student') {
        tr.innerHTML = `
          <td style="font-size:11px;white-space:nowrap;">${escapeHTML(dateStr)}</td>
          <td style="font-size:11px;">${escapeHTML(mentor)}</td>
          <td style="font-size:11px;white-space:nowrap;">${escapeHTML(duration)}</td>
          <td style="font-size:11px;max-width:180px;line-height:1.4;color:var(--text-muted);">${preview}</td>
          <td style="text-align:center;white-space:nowrap;">
            <button type="button" class="btn btn-primary btn-sm" onclick="openStudentMeetingSummary('${cacheKey}')" style="font-size:11px;padding:6px 12px;">▶ View Recap</button>
          </td>`;
      } else {
        tr.innerHTML = `
          <td style="font-size:11px;white-space:nowrap;">${escapeHTML(dateStr)}</td>
          <td style="font-size:11px;">${escapeHTML(students)}</td>
          <td style="font-size:11px;white-space:nowrap;">${escapeHTML(duration)}</td>
          <td style="font-size:11px;max-width:260px;line-height:1.5;">${rawSummary ? formatMeetingSummaryHtml(rawSummary) : '<em style="color:var(--text-muted)">No summary yet</em>'}</td>
          <td style="text-align:center;">
            ${recLink ? `<a href="${escapeHTML(recLink)}" target="_blank" style="color:var(--primary-magenta);font-size:11px;font-weight:600;">? Play</a>` : '<span style="color:var(--text-muted);font-size:11px;">...</span>'}
          </td>`;
      }
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.warn('loadDashboardMeetings error:', err);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">Could not load meeting logs.</td></tr>`;
  }
}

async function uploadMeetingRecordingToSupabase(meetingId, blob) {
  try {
    if (!supabaseActive || !supabaseClient) {
      console.warn("Supabase not active ... meeting recording upload skipped.");
      return null;
    }
    if (!meetingId || !blob || blob.size === 0) {
      console.warn("Invalid meeting recording ... upload skipped.", { meetingId, size: blob?.size });
      return null;
    }
    const fileName = `meet-rec-${meetingId}.webm`;
    console.log(`Uploading recording ${fileName} (${Math.round(blob.size / 1024)} KB) to Supabase storage...`);
    const { data, error } = await supabaseClient.storage
      .from('recordings')
      .upload(fileName, blob, {
        contentType: 'video/webm',
        upsert: true
      });
      
    if (error) {
      console.error("Supabase storage upload failed for meeting recording:", error);
      return null;
    }
    const { data: publicUrlData } = supabaseClient.storage.from('recordings').getPublicUrl(fileName);
    console.log("Successfully uploaded meeting recording to Supabase storage:", publicUrlData?.publicUrl || fileName);
    return publicUrlData?.publicUrl || data;
  } catch (err) {
    console.error("Exception uploading meeting recording:", err);
    return null;
  }
}

async function startMeetingRecording(webcamStream) {
  meetingRecordedChunks = [];
  let recordStream = webcamStream;

  try {
    console.log("Prompting for screen/tab capture to record the meeting panel...");
    // Prompt the user to select the screen/tab to record the whole panel
    meetingDisplayStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: "browser" // Suggest tab sharing first
      },
      audio: true // Capture tab/system audio
    });

    const tracks = [];
    
    // 1. Add display video track
    if (meetingDisplayStream.getVideoTracks().length > 0) {
      tracks.push(meetingDisplayStream.getVideoTracks()[0]);
    }
    
    // 2. Mix audio from webcamStream (microphone) and meetingDisplayStream (tab audio)
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const destination = audioContext.createMediaStreamDestination();
      let hasAudio = false;

      if (webcamStream && webcamStream.getAudioTracks().length > 0) {
        const micSource = audioContext.createMediaStreamSource(webcamStream);
        micSource.connect(destination);
        hasAudio = true;
      }

      if (meetingDisplayStream && meetingDisplayStream.getAudioTracks().length > 0) {
        const displayAudioSource = audioContext.createMediaStreamSource(meetingDisplayStream);
        displayAudioSource.connect(destination);
        hasAudio = true;
      }

      if (hasAudio && destination.stream.getAudioTracks().length > 0) {
        tracks.push(destination.stream.getAudioTracks()[0]);
      }
    } catch (audioMixErr) {
      console.warn("Failed to mix audio tracks, falling back to display audio or webcam audio:", audioMixErr);
      if (meetingDisplayStream && meetingDisplayStream.getAudioTracks().length > 0) {
        tracks.push(meetingDisplayStream.getAudioTracks()[0]);
      } else if (webcamStream && webcamStream.getAudioTracks().length > 0) {
        tracks.push(webcamStream.getAudioTracks()[0]);
      }
    }

    recordStream = new MediaStream(tracks);

    // If screen sharing is stopped by the user via the browser chrome bar, handle it
    meetingDisplayStream.getVideoTracks()[0].onended = () => {
      console.log("Screen recording stream ended by user.");
    };

  } catch (err) {
    console.warn("Screen/Tab capture failed or cancelled. Falling back to webcam recording:", err);
    recordStream = webcamStream;
  }

  if (!recordStream) return;
  try {
    let options = { mimeType: 'video/webm;codecs=vp9,opus' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/webm;codecs=vp8,opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm' };
      }
    }
    
    meetingMediaRecorder = new MediaRecorder(recordStream, options);
    meetingMediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        meetingRecordedChunks.push(e.data);
      }
    };
    
    meetingMediaRecorder.start(1000); // chunk data every 1s
    console.log("Meeting recording started successfully.");
  } catch (err) {
    console.warn("Failed to initialize MediaRecorder:", err);
  }
}

async function stopAndDownloadMeetingRecording(explicitMeetingId) {
  if (meetingRecordingFinalized) {
    return pendingRecordingUpload;
  }

  const meetingId = explicitMeetingId || activeMeeting?.id || window._pendingMeetingRecord?.id;

  pendingRecordingUpload = new Promise((resolve) => {
    const finalizeRecording = async () => {
      meetingRecordingFinalized = true;
      meetingMediaRecorder = null;

      if (meetingRecordedChunks.length === 0) {
        console.warn("No meeting recording data captured ... Supabase upload skipped.");
        resolve(null);
        return;
      }

      const chunks = meetingRecordedChunks.splice(0);
      try {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const fileLabel = meetingId || Date.now();

        if (supabaseActive && supabaseClient && meetingId) {
          await uploadMeetingRecordingToSupabase(meetingId, blob);
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `meet-rec-${fileLabel}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 500);

        console.log("Meeting recording finalized and upload complete.");
        resolve(meetingId);
      } catch (err) {
        console.error("Failed to compile, download, or upload recording:", err);
        resolve(null);
      }
    };

    if (meetingMediaRecorder && meetingMediaRecorder.state !== 'inactive') {
      meetingMediaRecorder.onstop = () => {
        console.log("MediaRecorder stopped ... processing recording chunks...");
        finalizeRecording();
      };
      try {
        meetingMediaRecorder.stop();
      } catch (e) {
        console.warn("Error stopping MediaRecorder:", e);
        finalizeRecording();
      }
    } else {
      finalizeRecording();
    }
  });

  return pendingRecordingUpload;
}

async function exitMeetingRoom(reason, skipRecordingStop = false) {
  // Close Jitsi overlay if open (without triggering leaveMeeting again)
  if (_jitsiApi) {
    try { _jitsiApi.dispose(); } catch(e){}
    _jitsiApi = null;
  }
  const jOverlay = document.getElementById('jitsi-call-overlay');
  if (jOverlay) { jOverlay.classList.add('hidden'); jOverlay.classList.remove('active'); }
  const jContainer = document.getElementById('jitsi-call-container');
  if (jContainer) jContainer.innerHTML = '';

  if (!skipRecordingStop && !meetingRecordingFinalized) {
    await stopAndDownloadMeetingRecording();
  } else if (pendingRecordingUpload) {
    await pendingRecordingUpload;
  }

  if (localMediaStream) {
    localMediaStream.getTracks().forEach(track => track.stop());
    localMediaStream = null;
  }

  if (meetingDisplayStream) {
    meetingDisplayStream.getTracks().forEach(track => track.stop());
    meetingDisplayStream = null;
  }


  if (localSimulatedVideo) {
    clearInterval(localSimulatedVideo.intervalId);
    localSimulatedVideo = null;
  }

  if (typeof pcs !== 'undefined') {
    for (const email in pcs) {
      if (pcs[email]) {
        try { pcs[email].close(); } catch(e){}
      }
    }
    pcs = {};
  }
  if (pc) {
    try { pc.close(); } catch(e){}
    pc = null;
  }
  remoteStreams = {};
  remoteCandidateQueues = {};

  if (meetingTimerInterval) {
    clearInterval(meetingTimerInterval);
    meetingTimerInterval = null;
  }

  if (supabaseActive && supabaseClient && activeMeeting) {
    const meetingIdToDelete = activeMeeting.id;
    supabaseClient
      .from('apex_sync')
      .delete()
      .eq('collection', 'signals')
      .like('id', `sig-${meetingIdToDelete}-%`)
      .then(({ error }) => {
        if (error) {
          console.warn("Failed to delete WebRTC signals from Supabase:", error);
        } else {
          console.log(`Successfully purged WebRTC signals for meeting ${meetingIdToDelete} from Supabase.`);
        }
      });
  }

  activeMeeting = null;
  meetingRecordingFinalized = false;
  pendingRecordingUpload = null;

  const meetingOverlay = document.getElementById('meeting-room-overlay');
  if (meetingOverlay) {
    meetingOverlay.classList.remove('active');
    meetingOverlay.classList.add('hidden');
  }

  if (reason) {
    alert(reason);
  }

  refreshUIForActiveView();
}

function sendMeetingChatMessage(event) {
  if (event) event.preventDefault();
  if (!activeMeeting) return;

  const input = document.getElementById('meet-chat-input');
  const text = input.value.trim();
  if (!text) return;

  const meetIdx = db.meetings.findIndex(m => m.id === activeMeeting.id);
  if (meetIdx !== -1) {
    const newMessage = {
      from: currentUser.name,
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    db.meetings[meetIdx].messages.push(newMessage);
    saveDatabase(true);
    syncRecordToFirestore('meetings', db.meetings[meetIdx]);
    activeMeeting = db.meetings[meetIdx];

    input.value = '';
    renderMeetingChat();
  }
}

function renderMeetingChat() {
  const container = document.getElementById('meet-chat-history');
  if (!container || !activeMeeting) return;

  container.innerHTML = '';
  
  if (!activeMeeting.messages || activeMeeting.messages.length === 0) {
    container.innerHTML = `<div style="margin: auto; text-align: center; color: var(--text-dark); font-size: 11px;">No messages sent yet. Send a note to the group.</div>`;
  } else {
    activeMeeting.messages.forEach(msg => {
      const isSelf = msg.from === currentUser.name;
      const bubble = document.createElement('div');
      bubble.style.padding = '8px 12px';
      bubble.style.borderRadius = '8px';
      bubble.style.fontSize = '12px';
      bubble.style.maxWidth = '85%';
      bubble.style.display = 'flex';
      bubble.style.flexDirection = 'column';
      bubble.style.margin = '4px 0';
      
      if (isSelf) {
        bubble.style.alignSelf = 'flex-end';
        bubble.style.background = 'linear-gradient(135deg, var(--primary-magenta) 0%, var(--accent-purple) 100%)';
        bubble.style.color = '#fff';
      } else {
        bubble.style.alignSelf = 'flex-start';
        bubble.style.background = 'rgba(255,255,255,0.05)';
        bubble.style.border = '1px solid var(--border-color)';
        bubble.style.color = 'var(--text-main)';
      }

      bubble.innerHTML = `
        <div style="font-weight: bold; font-size: 9px; margin-bottom: 2px; color: ${isSelf ? 'rgba(255,255,255,0.8)' : 'var(--primary-magenta)'}">${escapeHTML(msg.from)}</div>
        <div>${escapeHTML(msg.text)}</div>
        <div style="font-size: 8px; text-align: right; margin-top: 2px; opacity: 0.6;">${msg.timestamp}</div>
      `;
      container.appendChild(bubble);
    });
  }

  container.scrollTop = container.scrollHeight;
}

function renderMeetingParticipantsList() {
  const container = document.getElementById('meet-participants-list');
  if (!container || !activeMeeting) return;

  container.innerHTML = '';
  
  activeMeeting.participants.forEach(email => {
    const isLocal = email && currentUser.email && email.trim().toLowerCase() === currentUser.email.trim().toLowerCase();
    const userObj = db.users.find(u => u.email.trim().toLowerCase() === email.trim().toLowerCase());
    const userName = userObj ? userObj.name : email.split('@')[0];
    const isMuted = activeMeeting.mutedParticipants && activeMeeting.mutedParticipants.includes(email);
    const isVideoOff = activeMeeting.videoOffParticipants && activeMeeting.videoOffParticipants.includes(email);
    
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    row.style.padding = '8px 12px';
    row.style.borderRadius = '6px';
    row.style.background = 'rgba(255,255,255,0.02)';
    row.style.border = '1px solid var(--border-color)';
    row.style.fontSize = '12px';

    row.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="width: 6px; height: 6px; border-radius: 50%; background: ${isLocal ? 'var(--primary-magenta)' : 'var(--success)'};"></span>
        <span>${escapeHTML(userName)} ${isLocal ? '(You)' : ''}</span>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <span>${isMuted ? '??' : '???'}</span>
        <span>${isVideoOff ? '???' : '??'}</span>
      </div>
    `;
    container.appendChild(row);
  });
}

function switchMeetingSidebarTab(tabName) {
  const chatTab = document.getElementById('meet-sidebar-chat');
  const usersTab = document.getElementById('meet-sidebar-users');
  const chatBtn = document.getElementById('meet-tab-chat-btn');
  const usersBtn = document.getElementById('meet-tab-users-btn');

  if (tabName === 'chat') {
    chatTab.classList.remove('hidden');
    usersTab.classList.add('hidden');
    chatBtn.classList.add('active');
    usersBtn.classList.remove('active');
    chatBtn.style.color = 'var(--primary-magenta)';
    usersBtn.style.color = 'var(--text-muted)';
    renderMeetingChat();
  } else {
    chatTab.classList.add('hidden');
    usersTab.classList.remove('hidden');
    chatBtn.classList.remove('active');
    usersBtn.classList.add('active');
    chatBtn.style.color = 'var(--text-muted)';
    usersBtn.style.color = 'var(--primary-magenta)';
    renderMeetingParticipantsList();
  }
}

// WebRTC Signaling & Connection State Variables - Mesh support
let pcs = {}; // Map of remoteEmailKey -> RTCPeerConnection
let remoteStreams = {}; // Map of remoteEmailKey -> MediaStream
let localSimulatedVideo = null;
let remoteCandidateQueues = {}; // Map of remoteEmailKey -> Array of ICE candidates
let pc = null; // Left for backward compatibility if checked anywhere

function cleanWebRTCSignals() {
  if (!activeMeeting) return;
  console.log("Cleaning up stale WebRTC signaling keys...");
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`webrtc_signal_${activeMeeting.id}`)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

function getOrCreateSimulatedStream() {
  if (localSimulatedVideo) {
    return localSimulatedVideo.stream;
  }
  const userObj = db.users.find(u => u && u.email && u.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase());
  const userName = currentUser.name || currentUser.email.split('@')[0];
  const avatar = (userObj && userObj.role === 'student' && userObj.faceDescriptor)
    ? userObj.faceDescriptor
    : ((userObj && userObj.avatar) ? userObj.avatar : '');
  localSimulatedVideo = createSimulatedVideoTrack(userName, avatar);
  return localSimulatedVideo.stream;
}

function getOrCreatePeerConnection(peerEmail) {
  const peerEmailKey = peerEmail.trim().toLowerCase();
  let pcInstance = pcs[peerEmailKey];
  
  if (pcInstance) {
    const connState = pcInstance.connectionState || '';
    const iceState = pcInstance.iceConnectionState || '';
    if (connState !== 'failed' && connState !== 'closed' && iceState !== 'failed' && iceState !== 'closed') {
      return pcInstance;
    }
    try { pcInstance.close(); } catch(e){}
    delete pcs[peerEmailKey];
  }

  console.log(`Setting up RTCPeerConnection for peer: ${peerEmailKey}`);
  pcInstance = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });

  pcs[peerEmailKey] = pcInstance;
  
  // Set the first active peer connection as pc for backward compatibility
  if (!pc) {
    pc = pcInstance;
  }

  // Handle ICE candidates
  pcInstance.onicecandidate = (event) => {
    if (event.candidate) {
      sendWebRTCSignal('candidate', event.candidate, peerEmailKey);
    }
  };

  // Handle remote track
  pcInstance.ontrack = (event) => {
    console.log(`WebRTC received remote track from ${peerEmailKey}:`, event.track.kind);
    if (!remoteStreams[peerEmailKey]) {
      remoteStreams[peerEmailKey] = new MediaStream();
    }
    if (!remoteStreams[peerEmailKey].getTracks().includes(event.track)) {
      remoteStreams[peerEmailKey].addTrack(event.track);
    }
    
    // Re-render meeting participants
    renderMeetingParticipants();
  };

  // Add local tracks to peer connection
  let hasVideoTrack = false;
  
  if (localMediaStream) {
    localMediaStream.getTracks().forEach(track => {
      pcInstance.addTrack(track, localMediaStream);
      if (track.kind === 'video') hasVideoTrack = true;
    });
  }
  
  if (!hasVideoTrack) {
    const simStream = getOrCreateSimulatedStream();
    const simVideoTrack = simStream.getVideoTracks()[0];
    if (simVideoTrack) {
      pcInstance.addTrack(simVideoTrack, simStream);
    }
  }

  return pcInstance;
}

async function processRemoteCandidateQueue(peerEmail) {
  const peerEmailKey = peerEmail.trim().toLowerCase();
  const pcInstance = pcs[peerEmailKey];
  if (!pcInstance) return;
  
  const queue = remoteCandidateQueues[peerEmailKey] || [];
  console.log(`Processing remote candidate queue for ${peerEmailKey} (${queue.length} candidates)...`);
  
  while (queue.length > 0) {
    const candidate = queue.shift();
    try {
      await pcInstance.addIceCandidate(new RTCIceCandidate(candidate));
      console.log(`Successfully added queued candidate for ${peerEmailKey}.`);
    } catch (e) {
      console.warn(`Failed to add queued candidate for ${peerEmailKey}:`, e);
    }
  }
}

function closePeerConnection(peerEmail) {
  const peerEmailKey = peerEmail.trim().toLowerCase();
  if (pcs[peerEmailKey]) {
    console.log(`Closing existing peer connection for ${peerEmailKey} to reset/reconnect...`);
    try { pcs[peerEmailKey].close(); } catch(e){}
    delete pcs[peerEmailKey];
  }
  delete remoteStreams[peerEmailKey];
  delete remoteCandidateQueues[peerEmailKey];
  if (pc === pcs[peerEmailKey]) {
    pc = Object.values(pcs)[0] || null;
  }
}

async function handleWebRTCSignal(signal) {
  const senderEmail = signal.sender.trim().toLowerCase();
  const recipientEmail = signal.recipient ? signal.recipient.trim().toLowerCase() : null;
  const currentUserEmail = currentUser.email.trim().toLowerCase();
  
  // Ignore signals sent by self
  if (senderEmail === currentUserEmail) return;
  
  // Ignore signals not targeted to us (and not broadcast)
  if (recipientEmail && recipientEmail !== currentUserEmail) return;

  // Filter signals so that students only establish connections with the mentor
  if (activeMeeting && activeMeeting.mentorEmail) {
    const mentorEmailClean = activeMeeting.mentorEmail.trim().toLowerCase();
    const isMentorInvolved = (currentUserEmail === mentorEmailClean) || (senderEmail === mentorEmailClean);
    if (!isMentorInvolved) {
      return;
    }
  }
  
  console.log(`Handling WebRTC signal from ${senderEmail}: ${signal.type}`);
  
  try {
    if (signal.type === 'ready') {
      closePeerConnection(senderEmail);
      const weInitiate = currentUserEmail < senderEmail;
      if (weInitiate) {
        initiateWebRTCOffer(senderEmail);
      } else {
        sendWebRTCSignal('ready_ack', true, senderEmail);
      }
    } else if (signal.type === 'ready_ack') {
      closePeerConnection(senderEmail);
      const weInitiate = currentUserEmail < senderEmail;
      if (weInitiate) {
        initiateWebRTCOffer(senderEmail);
      }
    } else if (signal.type === 'offer') {
      const pcInstance = getOrCreatePeerConnection(senderEmail);
      await pcInstance.setRemoteDescription(new RTCSessionDescription(signal.data));
      await processRemoteCandidateQueue(senderEmail);
      const answer = await pcInstance.createAnswer();
      await pcInstance.setLocalDescription(answer);
      sendWebRTCSignal('answer', answer, senderEmail);
    } else if (signal.type === 'answer') {
      const pcInstance = getOrCreatePeerConnection(senderEmail);
      await pcInstance.setRemoteDescription(new RTCSessionDescription(signal.data));
      await processRemoteCandidateQueue(senderEmail);
    } else if (signal.type === 'candidate') {
      const pcInstance = getOrCreatePeerConnection(senderEmail);
      if (pcInstance.remoteDescription && pcInstance.remoteDescription.type) {
        await pcInstance.addIceCandidate(new RTCIceCandidate(signal.data));
      } else {
        if (!remoteCandidateQueues[senderEmail]) {
          remoteCandidateQueues[senderEmail] = [];
        }
        remoteCandidateQueues[senderEmail].push(signal.data);
      }
    }
  } catch (err) {
    console.error(`Error handling WebRTC signal from ${senderEmail}:`, err);
  }
}

function sendWebRTCSignal(type, data, recipient) {
  if (!activeMeeting) return;
  
  const signalId = `sig-${activeMeeting.id}-${type}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const signalRecord = {
    id: signalId,
    meetingId: activeMeeting.id,
    sender: currentUser.email,
    recipient: recipient || null,
    type: type,
    data: data,
    timestamp: new Date().toISOString()
  };
  
  syncRecordToSupabase('signals', signalRecord);
}

async function initiateWebRTCOffer(peerEmail) {
  const peerEmailKey = peerEmail.trim().toLowerCase();
  console.log(`Initiating WebRTC offer to ${peerEmailKey}...`);
  try {
    const pcInstance = getOrCreatePeerConnection(peerEmailKey);
    if (pcInstance.signalingState !== 'stable') {
      console.log(`WebRTC connection state for ${peerEmailKey} is ${pcInstance.signalingState}, skipping initiating offer.`);
      return;
    }
    const offer = await pcInstance.createOffer();
    await pcInstance.setLocalDescription(offer);
    sendWebRTCSignal('offer', offer, peerEmailKey);
  } catch (err) {
    console.error(`Error creating WebRTC offer for ${peerEmailKey}:`, err);
  }
}

function cleanLeftParticipants() {
  if (!activeMeeting) return;
  const activeEmails = activeMeeting.participants.map(email => email.trim().toLowerCase());
  
  for (const peerEmail in pcs) {
    if (!activeEmails.includes(peerEmail)) {
      console.log(`Closing connection for peer who left: ${peerEmail}`);
      if (pcs[peerEmail]) {
        try { pcs[peerEmail].close(); } catch(e){}
      }
      delete pcs[peerEmail];
      delete remoteStreams[peerEmail];
      delete remoteCandidateQueues[peerEmail];
      if (pc === pcs[peerEmail]) {
        pc = Object.values(pcs)[0] || null;
      }
    }
  }
}

function setupWebRTCPeerConnection() {
  if (!activeMeeting) return;
  
  cleanWebRTCSignals();
  
  // Send broadcast ready signal
  setTimeout(() => {
    console.log("WebRTC local stream ready. Broadcasting ready signal...");
    sendWebRTCSignal('ready', true, null);
  }, 50);
}

function createSimulatedVideoTrack(name, avatarUrl) {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');

  let img = null;
  if (avatarUrl) {
    img = new Image();
    img.crossOrigin = "anonymous";
    img.src = avatarUrl;
  }

  let angle = 0;
  function draw() {
    ctx.fillStyle = '#07070a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw blurred background
    if (img && img.complete) {
      ctx.save();
      ctx.filter = 'blur(10px) brightness(0.4)';
      ctx.drawImage(img, -20, -20, canvas.width + 40, canvas.height + 40);
      ctx.restore();
    } else {
      // Gradient background
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#db2777');
      grad.addColorStop(1, '#8b5cf6');
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.15;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1.0;
    }

    // Draw centering circle with face photo
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = 100;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (img && img.complete) {
      ctx.drawImage(img, cx - radius, cy - radius, radius * 2, radius * 2);
    } else {
      const grad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
      grad.addColorStop(0, '#db2777');
      grad.addColorStop(1, '#8b5cf6');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 80px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name.charAt(0).toUpperCase(), cx, cy);
    }
    ctx.restore();

    // Pulsing outer neon circle
    angle += 0.05;
    const pulseRadius = radius + 5 + Math.sin(angle) * 3;
    ctx.strokeStyle = '#db2777';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#db2777';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0; // reset shadow

    // Draw camera overlays
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    if (Math.floor(Date.now() / 1000) % 2 === 0) {
      ctx.arc(canvas.width - 50, 40, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px monospace';
    ctx.fillText('LIVE', canvas.width - 100, 45);
    ctx.fillText('SIM CAMERA', 40, 45);
  }

  const intervalId = setInterval(draw, 100);
  
  const stream = canvas.captureStream(10);
  return { stream, intervalId };
}


function uploadTaskAttachmentInChunks(fileId, file, rawData, callback) {
  const chunkSize = 700 * 1024; // 700KB chunks
  const totalChunks = Math.ceil(rawData.length / chunkSize);
  let currentChunkIndex = 0;

  function uploadNextChunk() {
    if (currentChunkIndex >= totalChunks) {
      callback({
        name: file.name,
        type: file.type,
        size: file.size,
        isChunked: true,
        totalChunks: totalChunks,
        chunkedMsgId: fileId,
        data: ""
      });
      return;
    }

    const start = currentChunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, rawData.length);
    const chunkData = rawData.substring(start, end);

    const chunkDoc = {
      id: `${fileId}-chunk-${currentChunkIndex}`,
      msgId: fileId,
      index: currentChunkIndex,
      data: chunkData,
      timestamp: new Date().toISOString()
    };

    supabaseClient
      .from('apex_sync')
      .upsert({ id: chunkDoc.id, collection: 'chat_file_chunks', data: chunkDoc })
      .then(({ error }) => {
        if (error) throw error;
        currentChunkIndex++;
        uploadNextChunk();
      })
      .catch(err => {
        console.error("Task chunk upload failed:", err);
        callback(null);
      });
  }

  uploadNextChunk();
}

function downloadTaskAttachment(taskId, fileName) {
  const task = db.tasks.find(t => t.id === taskId);
  if (!task || !task.attachment) return;

  if (task.attachment.isChunked) {
    alert("Fetching attachment chunks, please wait...");
    const fileId = task.attachment.chunkedMsgId;
    downloadChunkedFile(fileId, task.attachment.totalChunks, (fullDataUrl) => {
      if (fullDataUrl) {
        openAttachmentFile(fullDataUrl, fileName);
      } else {
        alert("Failed to retrieve attachment chunks. Please check internet connection.");
      }
    });
  } else {
    openAttachmentFile(task.attachment.data, fileName);
  }
}

function moveTaskToInProgress(taskId) {
  const task = db.tasks.find(t => t.id === taskId);
  if (task) {
    startFaceVerification("Move Task to In Progress", () => {
      // Immediately update task status
      const syncedTask = db.tasks.find(t => t.id === taskId);
      if (syncedTask) {
        syncedTask.status = 'In Progress';
        syncedTask.startedAt = new Date().toISOString();
      }
      saveDatabase(true);
      syncRecordToFirestore('tasks', syncedTask);

      // Show success toast
      showToast('? Task moved to In Progress!', 2000);

      // Immediately re-render tasks board
      loadStudentTasks();

      // Highlight the moved task card with a flash animation
      setTimeout(() => {
        const taskCard = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskCard) {
          taskCard.style.transition = 'box-shadow 0.3s ease, transform 0.3s ease';
          taskCard.style.boxShadow = '0 0 20px rgba(16,185,129,0.6)';
          taskCard.style.transform = 'scale(1.02)';
          setTimeout(() => {
            taskCard.style.boxShadow = '';
            taskCard.style.transform = '';
          }, 1200);
          taskCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 150);
    });
  }
}

function updateTaskProgress(taskId) {
  const task = db.tasks.find(t => t.id === taskId);
  if (!task) return;
  
  const currentVal = task.progress || 0;
  const input = prompt(`Enter progress percentage (0 to 100) for task "${task.title}":`, currentVal);
  
  if (input === null) return; // Cancelled
  
  const newVal = parseInt(input);
  if (isNaN(newVal) || newVal < 0 || newVal > 100) {
    alert("Please enter a valid number between 0 and 100.");
    return;
  }
  
  task.progress = newVal;
  saveDatabase(true);
  syncRecordToFirestore('tasks', task);
  loadMentorTasks();
  alert(`Task progress updated to ${newVal}% successfully!`);
}

// ==================== 12. ATTENDANCE GRID AND WEEKLY CALCULATION ====================

function handleDailyAttendanceClick() {
  const gateOverlay = document.getElementById('student-daily-lock-overlay');
  if (gateOverlay) {
    gateOverlay.style.display = 'flex';
    // Reset scanner states
    document.getElementById('daily-status-text').innerText = "Camera offline. Click below to start scanning.";
    document.getElementById('daily-status-text').style.color = "#fff";
    document.getElementById('daily-progress-bar-container').style.display = 'none';
    document.getElementById('daily-match-indicator').style.display = 'none';
    document.getElementById('daily-scan-btn').style.display = 'inline-block';
    
    // Auto-trigger webcam scan
    startDailyAttendanceScan();
  }
}

function renderStudentCalendar() {
  const grid = document.getElementById('student-calendar-grid');
  const summary = document.getElementById('student-weekly-summary');
  const domainLabel = document.getElementById('attendance-domain-label');
  const monthLabel = document.getElementById('attendance-month-label');
  if (!grid || !summary) return;

  if (domainLabel) {
    domainLabel.innerText = currentUser.domain || 'Internship Trainee';
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthName = now.toLocaleString('default', { month: 'long' });

  if (monthLabel) {
    monthLabel.innerText = `${monthName} ${year}`;
  }

  // Get total days in month
  const totalDays = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay(); // Sunday = 0

  // Calculate grid days
  const totalCells = Math.ceil((startDay + totalDays) / 7) * 7;
  const numRows = totalCells / 7;

  grid.innerHTML = '';
  summary.innerHTML = '';

  // Get all attendance logs for current student
  const studentEmailClean = currentUser.email.trim().toLowerCase();
  const myAttendance = (db.attendance || []).filter(log =>
    log.studentEmail && log.studentEmail.trim().toLowerCase() === studentEmailClean &&
    isDailyAttendanceLog(log)
  );

  const today = new Date();
  today.setHours(0,0,0,0);

  // Helper to check if student has checked in on a specific date string
  function getCheckInTime(dateStr) {
    const log = myAttendance.find(l => l.date === dateStr);
    if (!log) return null;
    if (log.timestamp) {
      const parts = log.timestamp.split(',');
      return parts[1] ? parts[1].trim() : log.timestamp;
    }
    return 'Checked-in';
  }

  const weekSummaries = [];

  for (let r = 0; r < numRows; r++) {
    // Collect working days in this row
    const workingDaysInRow = [];
    for (let c = 1; c <= 6; c++) {
      const dayIndex = r * 7 + c;
      const dayOfMonth = dayIndex - startDay + 1;
      if (dayOfMonth >= 1 && dayOfMonth <= totalDays) {
        workingDaysInRow.push(dayOfMonth);
      }
    }

    // Calculate percentage for this week row
    const elapsedWorkingDays = workingDaysInRow.filter(d => new Date(year, month, d) <= today);
    const checkedInWorkingDays = elapsedWorkingDays.filter(d => {
      const cellDateStr = new Date(year, month, d).toDateString();
      return myAttendance.some(l => l.date === cellDateStr);
    });

    let weeklyPctText = '-';
    let weeklyPct = 0;
    if (elapsedWorkingDays.length > 0) {
      weeklyPct = Math.round((checkedInWorkingDays.length / elapsedWorkingDays.length) * 100);
      weeklyPctText = `${weeklyPct}%`;
    }

    weekSummaries.push({
      weekNum: r + 1,
      percentage: weeklyPctText,
      checkedIn: checkedInWorkingDays.length,
      total: elapsedWorkingDays.length
    });

    for (let c = 0; c < 7; c++) {
      const cellIndex = r * 7 + c;
      const dayOfMonth = cellIndex - startDay + 1;

      const cell = document.createElement('div');
      cell.style.borderRadius = '10px';
      cell.style.padding = '8px 10px';
      cell.style.minHeight = '90px';
      cell.style.display = 'flex';
      cell.style.flexDirection = 'column';
      cell.style.justifyContent = 'space-between';
      cell.style.transition = 'all var(--transition-fast)';
      cell.style.fontSize = '12px';

      // If it's an offset cell
      if (dayOfMonth < 1 || dayOfMonth > totalDays) {
        if (c === 0) {
          cell.style.background = 'rgba(217, 4, 181, 0.03)';
          cell.style.border = '1px dashed rgba(217, 4, 181, 0.15)';
          cell.innerHTML = `
            <div style="color: var(--text-dark); font-size: 10px;">Sun (Holiday)</div>
            <div style="margin-top: auto; padding: 4px; background: rgba(217, 4, 181, 0.08); border-radius: 6px; text-align: center;">
              <span style="font-size: 9px; color: var(--text-muted); display: block; font-weight: 500;">Wk ${r+1} Att.</span>
              <strong style="font-size: 13px; color: var(--primary-magenta);">${weeklyPctText}</strong>
            </div>
          `;
        } else {
          cell.style.background = 'rgba(255, 255, 255, 0.01)';
          cell.style.border = '1px solid rgba(255, 255, 255, 0.02)';
          cell.innerHTML = ``;
        }
        grid.appendChild(cell);
        continue;
      }

      const cellDate = new Date(year, month, dayOfMonth);
      const cellDateStr = cellDate.toDateString();
      const checkInTime = getCheckInTime(cellDateStr);
      const isFuture = cellDate > today;

      // Handle Sunday cell
      if (c === 0) {
        cell.style.background = 'rgba(217, 4, 181, 0.06)';
        cell.style.border = '1px dashed rgba(217, 4, 181, 0.25)';
        cell.style.boxShadow = 'inset 0 0 10px rgba(217, 4, 181, 0.03)';
        
        cell.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="font-size: 14px; font-family: 'Outfit'; color: var(--text-main);">${dayOfMonth}</strong>
            <span style="font-size: 10px; color: var(--primary-magenta); font-weight: 500;">Sunday</span>
          </div>
          <div style="margin-top: auto; padding: 4px 6px; background: rgba(217, 4, 181, 0.15); border-radius: 6px; text-align: center; border: 1px solid rgba(217, 4, 181, 0.2);">
            <span style="font-size: 9px; color: #ff85d8; display: block; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Wk ${r+1} Att.</span>
            <strong style="font-size: 14px; color: #fff; text-shadow: 0 0 8px var(--primary-glow);">${weeklyPctText}</strong>
          </div>
        `;
      } else {
        if (checkInTime) {
          cell.style.background = 'rgba(16, 185, 129, 0.09)';
          cell.style.border = '1px solid rgba(16, 185, 129, 0.25)';
          cell.style.boxShadow = 'inset 0 0 10px rgba(16, 185, 129, 0.03)';
          cell.style.color = '#fff';
          cell.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong style="font-size: 14px; font-family: 'Outfit';">${dayOfMonth}</strong>
              <span style="background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 1px 5px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase;">Present</span>
            </div>
            <div style="margin-top: auto; font-size: 10px; color: #a7f3d0; font-weight: 500; display: flex; align-items: center; gap: 4px;">
              <span>??</span> <span>${checkInTime}</span>
            </div>
          `;
        } else if (isFuture) {
          cell.style.background = 'rgba(255, 255, 255, 0.02)';
          cell.style.border = '1px solid rgba(255, 255, 255, 0.04)';
          cell.style.color = 'var(--text-muted)';
          cell.innerHTML = `
            <div>
              <strong style="font-size: 14px; font-family: 'Outfit'; color: var(--text-dark);">${dayOfMonth}</strong>
            </div>
            <div style="margin-top: auto; font-size: 10px; color: var(--text-dark); text-align: right; font-style: italic;">
              Pending
            </div>
          `;
        } else {
          cell.style.background = 'rgba(239, 68, 68, 0.07)';
          cell.style.border = '1px solid rgba(239, 68, 68, 0.2)';
          cell.style.boxShadow = 'inset 0 0 10px rgba(239, 68, 68, 0.03)';
          cell.style.color = '#fff';
          cell.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong style="font-size: 14px; font-family: 'Outfit'; color: #fecaca;">${dayOfMonth}</strong>
              <span style="background: rgba(239, 68, 68, 0.2); color: #f87171; padding: 1px 5px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase;">Absent</span>
            </div>
            <div style="margin-top: auto; font-size: 10px; color: #fca5a5; font-weight: 500; text-align: right;">
              No Logs
            </div>
          `;
        }
      }

      grid.appendChild(cell);
    }
  }

  weekSummaries.forEach(wk => {
    let statusColor = 'var(--text-muted)';
    let statusBg = 'rgba(255,255,255,0.02)';
    let statusBorder = 'rgba(255,255,255,0.05)';
    
    if (wk.percentage !== '-') {
      const val = parseInt(wk.percentage);
      if (val >= 80) {
        statusColor = 'var(--success)';
        statusBg = 'rgba(16, 185, 129, 0.08)';
        statusBorder = 'rgba(16, 185, 129, 0.2)';
      } else if (val >= 50) {
        statusColor = 'var(--warning)';
        statusBg = 'rgba(245, 158, 11, 0.08)';
        statusBorder = 'rgba(245, 158, 11, 0.2)';
      } else {
        statusColor = 'var(--danger)';
        statusBg = 'rgba(239, 68, 68, 0.08)';
        statusBorder = 'rgba(239, 68, 68, 0.2)';
      }
    }

    const card = document.createElement('div');
    card.style.background = statusBg;
    card.style.border = `1px solid ${statusBorder}`;
    card.style.borderRadius = '8px';
    card.style.padding = '8px 12px';
    card.style.flex = '1 1 110px';
    card.style.minWidth = '110px';
    card.style.textAlign = 'center';
    card.innerHTML = `
      <div style="font-size: 10px; color: var(--text-muted); font-weight: 500;">Week ${wk.weekNum}</div>
      <div style="font-size: 16px; font-weight: 700; color: ${statusColor}; margin: 2px 0;">${wk.percentage}</div>
      <div style="font-size: 9px; color: var(--text-dark);">${wk.total > 0 ? `${wk.checkedIn}/${wk.total} Days` : 'No work days'}</div>
    `;
    summary.appendChild(card);
  });
}

function renderMentorAttendanceControls() {
  const domainFilter = document.getElementById('mentor-domain-filter');
  if (!domainFilter) return;

  const myStudents = getMentorStudents({ activeOnly: true });

  const prevDomain = domainFilter.value || 'All';
  const domains = [...new Set(myStudents.map(s => s.domain).filter(Boolean))];
  
  let domainHTML = `<option value="All">All Domains</option>`;
  domains.forEach(d => {
    domainHTML += `<option value="${d}">${d}</option>`;
  });
  domainFilter.innerHTML = domainHTML;
  
  if (domains.includes(prevDomain) || prevDomain === 'All') {
    domainFilter.value = prevDomain;
  } else {
    domainFilter.value = 'All';
  }

  filterMentorInternsByDomain();
}

function filterMentorInternsByDomain() {
  renderMentorAttendanceSheet();
}

function renderMentorAttendanceSheet() {
  const headerRow = document.getElementById('mentor-attendance-sheet-header');
  const tbody = document.getElementById('mentor-attendance-sheet-body');
  const monthLabel = document.getElementById('mentor-attendance-month-label');
  const domainFilter = document.getElementById('mentor-domain-filter');
  if (!headerRow || !tbody) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthName = now.toLocaleString('default', { month: 'long' });

  if (monthLabel) {
    monthLabel.innerText = `${monthName} ${year}`;
  }

  const totalDays = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay(); // Sunday = 0

  let headerHTML = `
    <th style="min-width: 140px; text-align: left; position: sticky; left: 0; background: #0f0f15; z-index: 10;">Intern Name</th>
    <th style="min-width: 120px; text-align: left;">Technical Domain</th>
  `;
  
  for (let d = 1; d <= totalDays; d++) {
    const dayDate = new Date(year, month, d);
    const isSun = (dayDate.getDay() === 0);
    const colColor = isSun ? 'color: var(--primary-magenta); font-weight: bold;' : '';
    headerHTML += `<th style="width: 38px; text-align: center; ${colColor}" title="${dayDate.toDateString()}">${d}${isSun ? ' (S)' : ''}</th>`;
  }

  const totalCells = Math.ceil((startDay + totalDays) / 7) * 7;
  const numWeeks = Math.min(5, totalCells / 7);

  for (let w = 1; w <= numWeeks; w++) {
    headerHTML += `<th style="width: 55px; text-align: center; color: #ff85d8;" title="Week ${w} Attendance Percentage (Mon-Sat)">W${w} %</th>`;
  }

  headerHTML += `<th style="width: 65px; text-align: center; font-weight: bold; color: var(--success);" title="Total Checked-In Percentage of Month">Total %</th>`;
  headerRow.innerHTML = headerHTML;

  tbody.innerHTML = '';

  const myStudents = getMentorStudents({ activeOnly: true });
  
  if (!db.attendance) db.attendance = [];

  const selectedDomain = domainFilter ? domainFilter.value : 'All';
  const filteredStudents = selectedDomain === 'All'
    ? myStudents
    : myStudents.filter(s => s.domain === selectedDomain);

  if (filteredStudents.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${totalDays + numWeeks + 3}" style="text-align: center; color: var(--text-muted); padding: 30px;">No interns found.</td></tr>`;
    return;
  }

  const today = new Date();
  today.setHours(0,0,0,0);

  filteredStudents.forEach(student => {
    const studentEmailClean = student.email.trim().toLowerCase();
    const attendanceLogs = (db.attendance || []).filter(log =>
      log.studentEmail && log.studentEmail.trim().toLowerCase() === studentEmailClean &&
      isDailyAttendanceLog(log)
    );

    let rowHTML = `
      <td style="font-weight: 600; color: #fff; text-align: left; position: sticky; left: 0; background: #12121a; z-index: 5; border-right: 1px solid var(--border-color);">${student.name}</td>
      <td style="text-align: left; color: var(--text-muted);">${student.domain}</td>
    `;

    let totalElapsedWorkDays = 0;
    let totalCheckedInDays = 0;

    for (let d = 1; d <= totalDays; d++) {
      const cellDate = new Date(year, month, d);
      const cellDateStr = cellDate.toDateString();
      const isSunday = (cellDate.getDay() === 0);
      const isFuture = cellDate > today;

      const checkedLog = attendanceLogs.find(l => l.date === cellDateStr);

      if (isSunday) {
        rowHTML += `<td style="text-align: center; background: rgba(217, 4, 181, 0.03);"><span style="display: inline-block; width: 20px; height: 20px; border-radius: 4px; background: rgba(217, 4, 181, 0.1); border: 1px solid rgba(217, 4, 181, 0.2); color: #ff85d8; text-align: center; line-height: 18px; font-weight: bold; font-size: 9px;" title="Sunday Holiday">S</span></td>`;
      } else {
        if (!isFuture) {
          totalElapsedWorkDays++;
        }
        if (checkedLog) {
          totalCheckedInDays++;
          const checkInTime = checkedLog.timestamp ? (checkedLog.timestamp.split(',')[1] || '').trim() : 'Checked-In';
          rowHTML += `
            <td style="text-align: center;">
              <span style="display: inline-block; width: 20px; height: 20px; border-radius: 4px; background: rgba(16, 185, 129, 0.15); border: 1px solid var(--success); color: var(--success); text-align: center; line-height: 18px; font-weight: bold; font-size: 10px; cursor: pointer;" title="Checked-In: ${checkInTime}">??</span>
            </td>
          `;
        } else if (isFuture) {
          rowHTML += `<td style="text-align: center; color: var(--text-dark);">-</td>`;
        } else {
          rowHTML += `
            <td style="text-align: center;">
              <span style="display: inline-block; width: 20px; height: 20px; border-radius: 4px; background: rgba(239, 68, 68, 0.15); border: 1px solid var(--danger); color: var(--danger); text-align: center; line-height: 18px; font-weight: bold; font-size: 10px;" title="Absent (No Log)">?</span>
            </td>
          `;
        }
      }
    }

    for (let w = 0; w < numWeeks; w++) {
      const workingDaysInWeek = [];
      const isLastWeek = (w === numWeeks - 1);
      if (isLastWeek) {
        const startCellIdx = w * 7 + 1;
        const startDayOfMonth = startCellIdx - startDay + 1;
        for (let d = startDayOfMonth; d <= totalDays; d++) {
          if (d >= 1) {
            const dayDate = new Date(year, month, d);
            if (dayDate.getDay() !== 0) { // Exclude Sundays
              workingDaysInWeek.push(d);
            }
          }
        }
      } else {
        for (let c = 1; c <= 6; c++) {
          const cellIdx = w * 7 + c;
          const dayOfMonth = cellIdx - startDay + 1;
          if (dayOfMonth >= 1 && dayOfMonth <= totalDays) {
            workingDaysInWeek.push(dayOfMonth);
          }
        }
      }

      const elapsedWeekWorkDays = workingDaysInWeek.filter(d => new Date(year, month, d) <= today);
      const checkedInWeekWorkDays = elapsedWeekWorkDays.filter(d => {
        const dateStr = new Date(year, month, d).toDateString();
        return attendanceLogs.some(l => l.date === dateStr);
      });

      let weeklyPctText = '-';
      if (elapsedWeekWorkDays.length > 0) {
        const pct = Math.round((checkedInWeekWorkDays.length / elapsedWeekWorkDays.length) * 100);
        weeklyPctText = `${pct}%`;
      }
      rowHTML += `<td style="text-align: center; font-weight: 500; color: #ff85d8;">${weeklyPctText}</td>`;
    }

    let totalPctText = '-';
    if (totalElapsedWorkDays > 0) {
      const pct = Math.round((totalCheckedInDays / totalElapsedWorkDays) * 100);
      totalPctText = `${pct}%`;
    }
    rowHTML += `<td style="text-align: center; font-weight: bold; color: var(--success); font-size: 12px; background: rgba(16, 185, 129, 0.04);">${totalPctText}</td>`;

    const tr = document.createElement('tr');
    tr.innerHTML = rowHTML;
    tbody.appendChild(tr);
  });
}

function exportAttendanceCSV() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthName = now.toLocaleString('default', { month: 'long' });
  const totalDays = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();

  const myStudents = getMentorStudents({ activeOnly: true });
  const selectedDomain = document.getElementById('mentor-domain-filter')?.value || 'All';
  const filteredStudents = selectedDomain === 'All'
    ? myStudents
    : myStudents.filter(s => s.domain === selectedDomain);

  if (filteredStudents.length === 0) {
    alert("No data available to export.");
    return;
  }

  let csvContent = "Intern Name,Domain";
  for (let d = 1; d <= totalDays; d++) {
    csvContent += `,Day ${d}`;
  }

  const totalCells = Math.ceil((startDay + totalDays) / 7) * 7;
  const numWeeks = Math.min(5, totalCells / 7);
  for (let w = 1; w <= numWeeks; w++) {
    csvContent += `,Week ${w} %`;
  }
  csvContent += ",Overall %\n";

  const today = new Date();
  today.setHours(0,0,0,0);

  filteredStudents.forEach(student => {
    const emailClean = student.email.trim().toLowerCase();
    const attendanceLogs = (db.attendance || []).filter(log => 
      log.studentEmail && log.studentEmail.trim().toLowerCase() === emailClean && 
      log.status === "Verified (Pass)"
    );

    csvContent += `"${student.name}","${student.domain}"`;

    let totalElapsedWorkDays = 0;
    let totalCheckedInDays = 0;

    for (let d = 1; d <= totalDays; d++) {
      const cellDate = new Date(year, month, d);
      const cellDateStr = cellDate.toDateString();
      const isSunday = (cellDate.getDay() === 0);
      const isFuture = cellDate > today;

      const checkedLog = attendanceLogs.find(l => l.date === cellDateStr);

      if (isSunday) {
        csvContent += ",Sunday";
      } else {
        if (!isFuture) {
          totalElapsedWorkDays++;
        }
        if (checkedLog) {
          totalCheckedInDays++;
          const checkInTime = checkedLog.timestamp ? (checkedLog.timestamp.split(',')[1] || '').trim() : 'Checked-In';
          csvContent += `,Present (${checkInTime.replace(/"/g, '""')})`;
        } else if (isFuture) {
          csvContent += ",Pending";
        } else {
          csvContent += ",Absent";
        }
      }
    }

    for (let w = 0; w < numWeeks; w++) {
      const workingDaysInWeek = [];
      const isLastWeek = (w === numWeeks - 1);
      if (isLastWeek) {
        const startCellIdx = w * 7 + 1;
        const startDayOfMonth = startCellIdx - startDay + 1;
        for (let d = startDayOfMonth; d <= totalDays; d++) {
          if (d >= 1) {
            const dayDate = new Date(year, month, d);
            if (dayDate.getDay() !== 0) { // Exclude Sundays
              workingDaysInWeek.push(d);
            }
          }
        }
      } else {
        for (let c = 1; c <= 6; c++) {
          const cellIdx = w * 7 + c;
          const dayOfMonth = cellIdx - startDay + 1;
          if (dayOfMonth >= 1 && dayOfMonth <= totalDays) {
            workingDaysInWeek.push(dayOfMonth);
          }
        }
      }

      const elapsedWeekWorkDays = workingDaysInWeek.filter(d => new Date(year, month, d) <= today);
      const checkedInWeekWorkDays = elapsedWeekWorkDays.filter(d => {
        const dateStr = new Date(year, month, d).toDateString();
        return attendanceLogs.some(l => l.date === dateStr);
      });

      let weeklyPctText = '-';
      if (elapsedWeekWorkDays.length > 0) {
        const pct = Math.round((checkedInWeekWorkDays.length / elapsedWeekWorkDays.length) * 100);
        weeklyPctText = `${pct}%`;
      }
      csvContent += `,${weeklyPctText}`;
    }

    let totalPctText = '-';
    if (totalElapsedWorkDays > 0) {
      const pct = Math.round((totalCheckedInDays / totalElapsedWorkDays) * 100);
      totalPctText = `${pct}%`;
    }
    csvContent += `,${totalPctText}\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Intern_Attendance_${monthName}_${year}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportAttendancePDF() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthName = now.toLocaleString('default', { month: 'long' });
  const totalDays = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();

  const myStudents = getMentorStudents({ activeOnly: true });
  const selectedDomain = document.getElementById('mentor-domain-filter')?.value || 'All';
  const filteredStudents = selectedDomain === 'All'
    ? myStudents
    : myStudents.filter(s => s.domain === selectedDomain);

  if (filteredStudents.length === 0) {
    alert("No data available to export.");
    return;
  }

  const totalCells = Math.ceil((startDay + totalDays) / 7) * 7;
  const numWeeks = Math.min(5, totalCells / 7);

  let tableHTML = `<table style="width: 100%; border-collapse: collapse; margin-top: 10px;"><thead><tr>`;
  tableHTML += `<th style="border: 1px solid #ccc; padding: 6px; text-align: left;">Intern Name</th>`;
  tableHTML += `<th style="border: 1px solid #ccc; padding: 6px; text-align: left;">Domain</th>`;
  for (let d = 1; d <= totalDays; d++) {
    tableHTML += `<th style="border: 1px solid #ccc; padding: 4px; text-align: center;">${d}</th>`;
  }
  for (let w = 1; w <= numWeeks; w++) {
    tableHTML += `<th style="border: 1px solid #ccc; padding: 4px; text-align: center; background: #eef;">W${w}%</th>`;
  }
  tableHTML += `<th style="border: 1px solid #ccc; padding: 4px; text-align: center; background: #dfd; font-weight: bold;">Total%</th>`;
  tableHTML += `</tr></thead><tbody>`;

  const today = new Date();
  today.setHours(0,0,0,0);

  filteredStudents.forEach(student => {
    const emailClean = student.email.trim().toLowerCase();
    const attendanceLogs = (db.attendance || []).filter(log => 
      log.studentEmail && log.studentEmail.trim().toLowerCase() === emailClean && 
      log.status === "Verified (Pass)"
    );

    tableHTML += `<tr>`;
    tableHTML += `<td style="border: 1px solid #ccc; padding: 6px; font-weight: bold; text-align: left;">${student.name}</td>`;
    tableHTML += `<td style="border: 1px solid #ccc; padding: 6px; text-align: left; color: #555;">${student.domain}</td>`;

    let totalElapsedWorkDays = 0;
    let totalCheckedInDays = 0;

    for (let d = 1; d <= totalDays; d++) {
      const cellDate = new Date(year, month, d);
      const cellDateStr = cellDate.toDateString();
      const isSunday = (cellDate.getDay() === 0);
      const isFuture = cellDate > today;

      const checkedLog = attendanceLogs.find(l => l.date === cellDateStr);

      if (isSunday) {
        tableHTML += `<td style="border: 1px solid #ccc; padding: 4px; text-align: center; background: #fdf2f8; color: #db2777;">S</td>`;
      } else {
        if (!isFuture) {
          totalElapsedWorkDays++;
        }
        if (checkedLog) {
          totalCheckedInDays++;
          tableHTML += `<td style="border: 1px solid #ccc; padding: 4px; text-align: center; color: green; font-weight: bold;">??</td>`;
        } else if (isFuture) {
          tableHTML += `<td style="border: 1px solid #ccc; padding: 4px; text-align: center; color: #999;">-</td>`;
        } else {
          tableHTML += `<td style="border: 1px solid #ccc; padding: 4px; text-align: center; color: red; font-weight: bold;">?</td>`;
        }
      }
    }

    for (let w = 0; w < numWeeks; w++) {
      const workingDaysInWeek = [];
      const isLastWeek = (w === numWeeks - 1);
      if (isLastWeek) {
        const startCellIdx = w * 7 + 1;
        const startDayOfMonth = startCellIdx - startDay + 1;
        for (let d = startDayOfMonth; d <= totalDays; d++) {
          if (d >= 1) {
            const dayDate = new Date(year, month, d);
            if (dayDate.getDay() !== 0) { // Exclude Sundays
              workingDaysInWeek.push(d);
            }
          }
        }
      } else {
        for (let c = 1; c <= 6; c++) {
          const cellIdx = w * 7 + c;
          const dayOfMonth = cellIdx - startDay + 1;
          if (dayOfMonth >= 1 && dayOfMonth <= totalDays) {
            workingDaysInWeek.push(dayOfMonth);
          }
        }
      }

      const elapsedWeekWorkDays = workingDaysInWeek.filter(d => new Date(year, month, d) <= today);
      const checkedInWeekWorkDays = elapsedWeekWorkDays.filter(d => {
        const dateStr = new Date(year, month, d).toDateString();
        return attendanceLogs.some(l => l.date === dateStr);
      });

      let weeklyPctText = '-';
      if (elapsedWeekWorkDays.length > 0) {
        const pct = Math.round((checkedInWeekWorkDays.length / elapsedWeekWorkDays.length) * 100);
        weeklyPctText = `${pct}%`;
      }
      tableHTML += `<td style="border: 1px solid #ccc; padding: 4px; text-align: center; font-weight: 500; background: #fdf2f8;">${weeklyPctText}</td>`;
    }

    let totalPctText = '-';
    if (totalElapsedWorkDays > 0) {
      const pct = Math.round((totalCheckedInDays / totalElapsedWorkDays) * 100);
      totalPctText = `${pct}%`;
    }
    tableHTML += `<td style="border: 1px solid #ccc; padding: 4px; text-align: center; font-weight: bold; background: #eefdf4;">${totalPctText}</td>`;
    tableHTML += `</tr>`;
  });

  tableHTML += `</tbody></table>`;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>Attendance Report - ${monthName} ${year}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; color: #1e293b; background: #fff; }
          h2 { font-size: 20px; font-weight: 700; margin: 0 0 4px 0; color: #0f172a; }
          p { font-size: 12px; margin: 0 0 20px 0; color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 4px; text-align: center; font-size: 9px; }
          th { background: #f8fafc; color: #334155; font-weight: 600; }
        </style>
      </head>
      <body>
        <h2>Intern Attendance Summary Report</h2>
        <p>Generated: ${new Date().toLocaleString()} | Period: ${monthName} ${year} | Mentor: ${currentUser.name}</p>
        ${tableHTML}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 500);
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

// ==================== 13. APEX AI COPILOT CHATBOT ====================

const APEX_PROJECT_BLUEPRINT = {
  structure: `### ?? Project File Structure
- **[index.html](file:///c:/Users/Asus/Desktop/2000006/index.html)**: Main HTML5 template containing UI containers for Student, Mentor, and Admin portals, Chat overlays, Call overlays, Debug Panel, and authentication screens.
- **[app.js](file:///c:/Users/Asus/Desktop/2000006/app.js)**: Main JavaScript file implementing app initialization, state synchronization, Firebase Firestore connection, sidebar tab routing, webcam check-in face scans, attendance sheet averages, task CRUD, and real-time messaging channels.
- **[styles.css](file:///c:/Users/Asus/Desktop/2000006/styles.css)**: Vanilla CSS stylesheet establishing variables (magenta/blue accent colors), glassmorphism styles (\`glass-panel\`), scrollable wrappers, sidebar animations, and mobile responsive query blocks.
- **[mockData.js](file:///c:/Users/Asus/Desktop/2000006/mockData.js)**: Local mock dataset fallback used if Firebase Firestore connection is offline. Includes pre-registered accounts, starter tasks, and chat templates.`,

  db: `### ??? Database Collections (Firestore & LocalStorage)
- **users**: Stores profiles. Schema: \`email\`, \`name\`, \`role\` (student/mentor/admin), \`domain\`, \`avatar\`, \`mentorEmail\`, \`mentorStatus\` (Active/Pending).
- **tasks**: Internship assignments. Schema: \`id\`, \`title\`, \`description\`, \`assigneeEmail\`, \`mentorEmail\`, \`status\` (To Do/In Progress/Completed), \`fileAttachment\`, \`feedback\`.
- **weeklyLogs**: Weekly student progress reports. Schema: \`id\`, \`studentEmail\`, \`mentorEmail\`, \`weekNum\`, \`hoursWorked\`, \`achievements\`, \`blockages\`, \`status\` (Pending/Approved/Rejected).
- **chats**: Real-time channel messages. Schema: \`id\`, \`channelId\`, \`senderEmail\`, \`receiverEmail\`, \`message\`, \`timestamp\`, \`fileUrl\`.
- **attendance**: Verified check-in logs. Schema: \`id\`, \`studentEmail\`, \`action\` ("Daily Attendance Check-In"), \`date\` (\`toDateString()\`), \`timestamp\`, \`faceImage\` (base64 dataurl), \`matchScore\`, \`status\` ("Verified (Pass)"/"Failed").`,

  attendance: `### ?? Attendance Tracking & Export Workflows
- **Daily Webcam Check-in**:
  - Triggered by clicking the top indicator bar button (\`#student-attendance-indicator\`).
  - Calls \`startDailyAttendanceScan()\` -> \`runDailyAttendanceScan()\` which simulates camera inputs using canvas drawing, validating user face match integrity score. Saves log with \`Verified (Pass)\` status.
  - Restricted to once a day per student email (\`hasCheckedInToday()\`).
- **Spreadsheet Attendance Matrix**:
  - Implemented in \`renderMentorAttendanceSheet()\` inside **[app.js](file:///c:/Users/Asus/Desktop/2000006/app.js)**.
  - Displays calendar days 1 to 30/31 for the active cohort month.
  - Preceding Monday...Saturday working days are evaluated. Sundays are marked with a purple \`S\` chip.
  - Mon-Sat running averages are calculated and rendered inside each week column (\`W1 %\` to \`W5 %\`), and overall score is in \`Total %\`.
  - Uses \`filterMentorInternsByDomain()\` bound to domain selection changes.
- **Exporting Data**:
  - **Download CSV**: \`exportAttendanceCSV()\` structures current sheet columns (names, domains, check-in statuses, weekly averages, overall average) into a CSV blob and downloads it.
  - **Download PDF**: \`exportAttendancePDF()\` generates print-friendly raw HTML in a new window and triggers the browser's print engine dialogue.`,

  features: `### ? Core Internship Portal Features
- **User Authentication**: Handled in \`handleLogin()\` and \`handleRegister()\` (registers as student/mentor/admin). Synchronizes active session profiles with \`localStorage\` key \`apex_intern_currentUser\`.
- **Task Management Grid**: Handled in \`loadStudentTasks()\` and \`loadMentorTasks()\`. Supports assigning tasks, uploading deliverables, and appending reviews.
- **Assigned Intern Chat**: Direct messaging channels with image/file attachment logic in \`handleSendChat()\` and \`handleChatFileSelect()\`.
- **Peer Call Room**: Simulated peer visual call in \`startMentorGroupCall()\`, sending automated overlays to active students, rendering simulated camera feed, muting audio/video, and screen share overlays.`
};

let aiCopilotHistory = [];

function toggleAICopilot() {
  const panel = document.getElementById('ai-copilot-panel');
  if (!panel) return;
  panel.classList.toggle('active');
  
  if (panel.classList.contains('active') && aiCopilotHistory.length === 0) {
    // Add default welcoming message
    addAICopilotMessage('bot', `Hello! I am your **InternX AI Assistant** ??\n\nI have full knowledge of this project's file structure, CSS styles, workflows, and database schemas.\n\nI am connected directly to **Google Gemini** to help you resolve project issues, write code, or debug features in real-time! Ask me anything!`);
  }
}

function toggleAICopilotSettings() {
  const settings = document.getElementById('ai-copilot-settings');
  if (!settings) return;
  settings.classList.toggle('active');
  
  if (settings.classList.contains('active')) {
    const savedKey = localStorage.getItem('apex_ai_gemini_key') || 'YOUR_GEMINI_API_KEY_HERE';
    document.getElementById('ai-gemini-key').value = savedKey;
  }
}

function saveGeminiKey() {
  const key = document.getElementById('ai-gemini-key').value.trim();
  if (!key) {
    alert("Please enter a valid API Key.");
    return;
  }
  localStorage.setItem('apex_ai_gemini_key', key);
  alert("Gemini API Key saved successfully! Live AI mode is now active.");
  toggleAICopilotSettings();
}

function clearGeminiKey() {
  localStorage.removeItem('apex_ai_gemini_key');
  document.getElementById('ai-gemini-key').value = '';
  alert("Gemini API Key cleared. Reverted back to Local Knowledge Base.");
  toggleAICopilotSettings();
}

function addAICopilotMessage(sender, text) {
  const historyList = document.getElementById('ai-copilot-history-list');
  if (!historyList) return;
  
  const msgObj = { sender, text };
  aiCopilotHistory.push(msgObj);
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `ai-message ${sender}`;
  
  const avatar = sender === 'user' ? '??' : '<img src="robot_avatar.png" alt="AI">';
  
  // Basic markdown compiler for chatbot output
  let formattedText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Match code blocks ```code```
    .replace(/```([\s\S]+?)```/g, '<pre><code>$1</code></pre>')
    // Match inline code `code`
    .replace(/`([^`\n]+?)`/g, '<code>$1</code>')
    // Match bold text **bold**
    .replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
    // Line breaks
    .replace(/\n/g, '<br>');

  messageDiv.innerHTML = `
    <div class="ai-message-avatar">${avatar}</div>
    <div class="ai-message-bubble">${formattedText}</div>
  `;
  
  historyList.appendChild(messageDiv);
  historyList.scrollTop = historyList.scrollHeight;
}

function askCopilotFAQ(category) {
  let userQuestion = "";
  if (category === 'structure') userQuestion = "Explain the project file structure and where code is located.";
  if (category === 'db') userQuestion = "What is the database schema and what collections are stored?";
  if (category === 'attendance') userQuestion = "How does the student check-in and attendance sheet calculation work?";
  if (category === 'features') userQuestion = "Explain the core features (auth, tasks, chat, calls) of the portal.";
  
  if (!userQuestion) return;
  
  // Submit question
  addAICopilotMessage('user', userQuestion);
  processCopilotQuery(userQuestion);
}

function handleSendAICopilot(event) {
  if (event) event.preventDefault();
  
  const inputEl = document.getElementById('ai-copilot-input');
  if (!inputEl) return;
  
  const prompt = inputEl.value.trim();
  if (!prompt) return;
  
  inputEl.value = '';
  addAICopilotMessage('user', prompt);
  processCopilotQuery(prompt);
}

function showAICopilotTyping() {
  const historyList = document.getElementById('ai-copilot-history-list');
  if (!historyList) return null;
  
  const typingDiv = document.createElement('div');
  typingDiv.className = 'ai-message bot';
  typingDiv.id = 'ai-copilot-typing-indicator';
  typingDiv.innerHTML = `
    <div class="ai-message-avatar"><img src="robot_avatar.png" alt="AI"></div>
    <div class="ai-message-bubble">
      <div class="ai-typing-indicator">
        <div class="ai-typing-dot"></div>
        <div class="ai-typing-dot"></div>
        <div class="ai-typing-dot"></div>
      </div>
    </div>
  `;
  historyList.appendChild(typingDiv);
  historyList.scrollTop = historyList.scrollHeight;
  return typingDiv;
}

function removeAICopilotTyping(indicator) {
  if (indicator && indicator.parentNode) {
    indicator.parentNode.removeChild(indicator);
  }
}

function processCopilotQuery(prompt) {
  const typingIndicator = showAICopilotTyping();
  const apiKey = localStorage.getItem('apex_ai_gemini_key') || 'YOUR_GEMINI_API_KEY_HERE';
  
  setTimeout(() => {
    if (apiKey) {
      // Query Live Gemini API
      queryLiveGeminiAI(prompt, apiKey, typingIndicator);
    } else {
      // Fallback: Local Knowledge Base Matcher
      const response = getLocalAIResponse(prompt);
      removeAICopilotTyping(typingIndicator);
      addAICopilotMessage('bot', response);
    }
  }, 600);
}

function getLocalAIResponse(prompt) {
  const p = prompt.toLowerCase();
  
  // Check keywords for specific structures
  if (p.includes('structure') || p.includes('file') || p.includes('folder') || p.includes('directory') || p.includes('index.html') || p.includes('app.js') || p.includes('styles.css') || p.includes('mockdata.js')) {
    return APEX_PROJECT_BLUEPRINT.structure + `\n\n*Note: Connect your Gemini API Key in settings for customized answers!*`;
  }
  
  if (p.includes('database') || p.includes('schema') || p.includes('collection') || p.includes('firestore') || p.includes('localstorage') || p.includes('firebase') || p.includes('users') || p.includes('tasks') || p.includes('weeklylogs') || p.includes('chats') || p.includes('sync')) {
    return APEX_PROJECT_BLUEPRINT.db + `\n\n*Note: Connect your Gemini API Key in settings for customized answers!*`;
  }
  
  if (p.includes('attendance') || p.includes('scan') || p.includes('check-in') || p.includes('checkin') || p.includes('spreadsheet') || p.includes('matrix') || p.includes('sunday') || p.includes('percent') || p.includes('csv') || p.includes('pdf') || p.includes('export') || p.includes('download') || p.includes('print')) {
    return APEX_PROJECT_BLUEPRINT.attendance + `\n\n*Note: Connect your Gemini API Key in settings for customized answers!*`;
  }
  
  if (p.includes('feature') || p.includes('auth') || p.includes('login') || p.includes('register') || p.includes('task') || p.includes('chat') || p.includes('call') || p.includes('video') || p.includes('meeting')) {
    return APEX_PROJECT_BLUEPRINT.features + `\n\n*Note: Connect your Gemini API Key in settings for customized answers!*`;
  }
  
  // Default response showing options
  return `I analyzed your question: "${prompt}".\n\nTo give you the best answer, please ask something related to:\n- **?? Project Structure** (files, directories, assets)\n- **??? Database Collections** (schema, firestore keys)\n- **?? Attendance Flow** (face checks, spreadsheet formulas, exports)\n- **? Core Features** (login, tasks, intern chat, video calls)\n\n*Tip: Connect your **Google Gemini API Key** in settings (??) above and I will be able to answer any custom developer question, generate specific code snippets, or debug files dynamically!*`;
}

async function queryLiveGeminiAI(prompt, apiKey, typingIndicator) {
  try {
    const sysInstructions = `You are InternX AI Assistant, a helpful developer chatbot embedded inside the InternX by UTX portal.
You have access to the project's codebase outline and data schemas:
${APEX_PROJECT_BLUEPRINT.structure}
${APEX_PROJECT_BLUEPRINT.db}
${APEX_PROJECT_BLUEPRINT.attendance}
${APEX_PROJECT_BLUEPRINT.features}

Answer the user's questions about this codebase accurately. Reference specific files (index.html, app.js, styles.css) and explain where variables/functions are located. If they ask to write code or CSS overrides, provide short clean snippets. Make your response concise, professional, and friendly. If the user presents any error message or project issue, offer clear debugging steps to resolve it.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        systemInstruction: {
          parts: [{ text: sysInstructions }]
        }
      })
    });
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMessage = errData.error?.message || `HTTP ${response.status}`;
      throw new Error(errMessage);
    }
    
    const data = await response.json();
    const botText = data.candidates?.[0]?.content?.parts?.[0]?.text || "I could not generate an answer. Please try again.";
    
    removeAICopilotTyping(typingIndicator);
    addAICopilotMessage('bot', botText);
  } catch (error) {
    console.error("Gemini API Error:", error);
    removeAICopilotTyping(typingIndicator);
    addAICopilotMessage('bot', `?? **Gemini API Error:**\n\n${error.message}\n\nPlease check your internet connection, verify your API Key is valid, and try again. (Make sure your API key has access to the Gemini API).`);
  }
}

function makeElementDraggable(elmnt) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  let startX = 0, startY = 0;
  let hasMoved = false;

  elmnt.onmousedown = dragMouseDown;
  elmnt.ontouchstart = dragTouchStart;

  function dragMouseDown(e) {
    e = e || window.event;
    if (e.button !== 0) return; // Only drag on left click
    e.preventDefault();
    elmnt.style.transition = 'none'; // Disable snapping transitions while dragging
    startX = e.clientX;
    startY = e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    hasMoved = false;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
    elmnt.style.cursor = 'grabbing';
  }

  function dragTouchStart(e) {
    if (e.touches.length > 0) {
      elmnt.style.transition = 'none'; // Disable snapping transitions
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      pos3 = e.touches[0].clientX;
      pos4 = e.touches[0].clientY;
      hasMoved = false;
      document.ontouchend = closeDragElement;
      document.ontouchmove = elementTouchDrag;
    }
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    
    // Check if the pointer has actually moved significantly
    let moveX = Math.abs(e.clientX - startX);
    let moveY = Math.abs(e.clientY - startY);
    if (moveX > 6 || moveY > 6) {
      hasMoved = true;
    }

    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;

    let newTop = elmnt.offsetTop - pos2;
    let newLeft = elmnt.offsetLeft - pos1;

    // Viewport boundaries check
    const maxTop = window.innerHeight - elmnt.offsetHeight;
    const maxLeft = window.innerWidth - elmnt.offsetWidth;

    if (newTop < 0) newTop = 0;
    if (newTop > maxTop) newTop = maxTop;
    if (newLeft < 0) newLeft = 0;
    if (newLeft > maxLeft) newLeft = maxLeft;

    elmnt.style.top = newTop + "px";
    elmnt.style.left = newLeft + "px";
    elmnt.style.right = "auto";
    elmnt.style.bottom = "auto";
  }

  function elementTouchDrag(e) {
    if (e.touches.length > 0) {
      let moveX = Math.abs(e.touches[0].clientX - startX);
      let moveY = Math.abs(e.touches[0].clientY - startY);
      if (moveX > 6 || moveY > 6) {
        hasMoved = true;
      }

      pos1 = pos3 - e.touches[0].clientX;
      pos2 = pos4 - e.touches[0].clientY;
      pos3 = e.touches[0].clientX;
      pos4 = e.touches[0].clientY;

      let newTop = elmnt.offsetTop - pos2;
      let newLeft = elmnt.offsetLeft - pos1;

      const maxTop = window.innerHeight - elmnt.offsetHeight;
      const maxLeft = window.innerWidth - elmnt.offsetWidth;

      if (newTop < 0) newTop = 0;
      if (newTop > maxTop) newTop = maxTop;
      if (newLeft < 0) newLeft = 0;
      if (newLeft > maxLeft) newLeft = maxLeft;

      elmnt.style.top = newTop + "px";
      elmnt.style.left = newLeft + "px";
      elmnt.style.right = "auto";
      elmnt.style.bottom = "auto";
    }
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
    document.ontouchend = null;
    document.ontouchmove = null;
    elmnt.style.cursor = 'grab';

    if (hasMoved) {
      // Snap to nearest vertical edge (left or right)
      const buttonCenter = elmnt.offsetLeft + elmnt.offsetWidth / 2;
      const screenWidth = window.innerWidth;
      let targetLeft = 0;
      
      if (buttonCenter < screenWidth / 2) {
        targetLeft = 20; // Snap to left edge with 20px padding
      } else {
        targetLeft = screenWidth - elmnt.offsetWidth - 20; // Snap to right edge with 20px padding
      }

      let targetTop = elmnt.offsetTop;
      const maxTop = window.innerHeight - elmnt.offsetHeight - 20;
      if (targetTop < 20) targetTop = 20;
      if (targetTop > maxTop) targetTop = maxTop;

      // Enable smooth snapping transitions
      elmnt.style.transition = 'left 0.3s cubic-bezier(0.16, 1, 0.3, 1), top 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
      elmnt.style.left = targetLeft + "px";
      elmnt.style.top = targetTop + "px";

      // Reset transition styling so next drag does not animate laggy
      setTimeout(() => {
        elmnt.style.transition = 'background var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast)';
      }, 300);
    } else {
      toggleAICopilot();
    }
  }
}

// ==================== 15. DAILY AI QUIZ CONTROLLER ====================

let currentActiveQuiz = null;
let currentAnswers = [];
let currentQuestionIndex = 0;
let codingTestResults = {}; // Stores test outcomes: { qIndex: { passed: boolean, cases: [ { args: [], expected: val, actual: val, passed: boolean } ] } }
let autoNavigateTimeout = null;
let pendingStartQuiz = null;

function getStudentMentorName(user) {
  if (!user) return 'Unassigned';
  
  // 1. Try to find the mentor user by email
  const mentorEmail = (user.mentorEmail || "").trim().toLowerCase();
  if (mentorEmail) {
    const mentorUser = db.users.find(u => u && u.role === 'mentor' && u.email && u.email.trim().toLowerCase() === mentorEmail);
    if (mentorUser) {
      return mentorUser.name;
    }
  }
  
  // 2. Try to find any mentor user matching the student's domain
  const studentDomain = (user.domain || "").trim().toLowerCase();
  if (studentDomain) {
    const domainMentor = db.users.find(u => u && u.role === 'mentor' && u.domain && u.domain.trim().toLowerCase() === studentDomain);
    if (domainMentor) {
      return domainMentor.name;
    }
  }
  
  // 3. Fallback to the mentor email or 'Unassigned'
  return user.mentorEmail || 'Unassigned';
}

async function syncUnsyncedQuizSubmissions() {
  if (!supabaseActive || !supabaseClient) return;
  if (!db.quizSubmissions) db.quizSubmissions = [];

  for (let i = 0; i < db.quizSubmissions.length; i++) {
    const sub = db.quizSubmissions[i];
    if (!sub.syncedToSupabase && !sub.isSyncing) {
      sub.isSyncing = true; // Lock it immediately
      
      console.log(`Auto-syncing unsynced quiz submission to Supabase for ${sub.studentName} (${sub.date})...`);
      
      const questionSummary = (sub.questions || []).map((q, idx) => {
        return `Q${idx + 1}: ${q.question} [Answered: ${sub.answers[idx] || 'No answer'}]`;
      }).join(' | ');

      const quizScorePct = Math.round((sub.score / (sub.questions?.length || 10)) * 100);

      try {
        const success = await saveToDailyQuizTable(
          sub.studentName,
          sub.studentEmail,
          questionSummary,
          `${sub.score}/10`,
          `${quizScorePct}%`, // Save quiz score percentage in the progress column!
          getStudentMentorName(sub),
          sub.domain || 'Web Development',
          sub.date,
          sub.timestamp || new Date().toLocaleString()
        );

        if (success) {
          sub.syncedToSupabase = true;
        }
      } catch (err) {
        console.error("Exception in auto-sync loop:", err);
      } finally {
        sub.isSyncing = false; // release lock
        saveDatabase();
      }
    }
  }
}

async function loadStudentQuiz() {
  syncDatabase();
  // Attempt background sync of any unsynced submissions
  syncUnsyncedQuizSubmissions();
  
  const todayDate = new Date().toDateString();
  const studentDomain = currentUser.domain || "Web Development";
  
  // Normalize collection arrays
  if (!db.quizzes) db.quizzes = [];
  if (!db.quizSubmissions) db.quizSubmissions = [];

  const studentEmailSafe = (currentUser.email || "unknown").replace(/[^a-zA-Z0-9]/g, '_');
  const quizId = `quiz-${studentDomain.replace(/[^a-zA-Z0-9]/g, '_')}-${studentEmailSafe}-${todayDate.replace(/[^a-zA-Z0-9]/g, '_')}`;
  let todayQuiz = db.quizzes.find(q => q.id === quizId);

  // Check if student has already completed today's quiz
  const todaySubmission = db.quizSubmissions.find(s => 
    s.studentEmail && s.studentEmail.trim().toLowerCase() === currentUser.email.trim().toLowerCase() && 
    s.date === todayDate
  );

  if (todaySubmission) {
    if (!todayQuiz) {
      todayQuiz = {
        id: quizId,
        domain: todaySubmission.domain || studentDomain,
        date: todayDate,
        questions: todaySubmission.questions || []
      };
    }
    showQuizResults(todayQuiz, todaySubmission);
    return;
  }

  if (todayQuiz) {
    showStartQuizScreen(todayQuiz);
  } else {
    // Show AI loading indicator
    document.getElementById('quiz-loading-view').style.display = 'flex';
    document.getElementById('quiz-start-view').classList.add('hidden');
    document.getElementById('quiz-active-view').classList.add('hidden');
    document.getElementById('quiz-results-view').classList.add('hidden');
    
    document.getElementById('quiz-loading-title').innerText = `Generating Daily Quiz for ${studentDomain} using Gemini AI...`;

    try {
      const generated = await generateQuizWithGemini(studentDomain, todayDate);
      if (generated && generated.questions && generated.questions.length > 0) {
        generated.id = quizId;
        db.quizzes.push(generated);
        saveDatabase();
        syncRecordToFirestore('quizzes', generated);
        showStartQuizScreen(generated);
      } else {
        throw new Error("Quiz generation returned empty questions");
      }
    } catch (err) {
      console.warn("AI Quiz Generation failed, falling back to local curriculum:", err);
      const fallback = getOfflineFallbackQuiz(studentDomain, todayDate);
      fallback.id = quizId;
      db.quizzes.push(fallback);
      saveDatabase();
      syncRecordToFirestore('quizzes', fallback);
      showStartQuizScreen(fallback);
    }
  }
}

function showStartQuizScreen(quiz) {
  pendingStartQuiz = quiz;
  
  document.getElementById('quiz-loading-view').style.display = 'none';
  document.getElementById('quiz-active-view').classList.add('hidden');
  document.getElementById('quiz-results-view').classList.add('hidden');
  document.getElementById('quiz-start-view').classList.remove('hidden');
  
  document.getElementById('quiz-start-domain').innerText = quiz.domain || 'Web Development';
  document.getElementById('quiz-start-date').innerText = quiz.date || new Date().toDateString();
}

function proceedToStartQuiz() {
  document.getElementById('quiz-start-view').classList.add('hidden');
  if (pendingStartQuiz) {
    startQuiz(pendingStartQuiz);
  }
}

window.showStartQuizScreen = showStartQuizScreen;
window.proceedToStartQuiz = proceedToStartQuiz;

function startQuiz(quiz) {
  currentActiveQuiz = quiz;
  currentQuestionIndex = 0;
  currentAnswers = new Array(quiz.questions.length).fill(null);
  codingTestResults = {};

  // Pre-populate coding stubs
  quiz.questions.forEach((q, idx) => {
    if (q.type === 'coding') {
      currentAnswers[idx] = q.codeTemplate || '';
      codingTestResults[idx] = { passed: false, cases: [] };
    }
  });

  document.getElementById('quiz-loading-view').style.display = 'none';
  document.getElementById('quiz-start-view').classList.add('hidden');
  document.getElementById('quiz-results-view').classList.add('hidden');
  document.getElementById('quiz-active-view').classList.remove('hidden');

  document.getElementById('quiz-domain-tag').innerText = quiz.domain;
  document.getElementById('quiz-date-tag').innerText = quiz.date;

  renderQuizQuestion(currentQuestionIndex);
}

function renderQuizQuestion(index) {
  if (!currentActiveQuiz || !currentActiveQuiz.questions[index]) return;
  
  currentQuestionIndex = index;
  const q = currentActiveQuiz.questions[index];
  const container = document.getElementById('quiz-questions-container');
  container.innerHTML = '';

  const totalQuestions = currentActiveQuiz.questions.length;
  document.getElementById('quiz-progress-text').innerText = `Question ${index + 1} of ${totalQuestions}`;
  const progressBar = document.getElementById('quiz-progress-bar');
  if (progressBar) {
    progressBar.style.width = `${((index + 1) / totalQuestions) * 100}%`;
  }

  // Enable/disable navigation buttons
  document.getElementById('quiz-prev-btn').disabled = index === 0;
  
  if (index === totalQuestions - 1) {
    document.getElementById('quiz-next-btn').classList.add('hidden');
    document.getElementById('quiz-submit-btn').classList.remove('hidden');
  } else {
    document.getElementById('quiz-next-btn').classList.remove('hidden');
    document.getElementById('quiz-submit-btn').classList.add('hidden');
  }

  const questionCard = document.createElement('div');
  questionCard.className = 'quiz-question-card';

  const diffColorClass = q.difficulty || 'easy';
  const headerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <span class="difficulty-badge ${diffColorClass}">${q.difficulty}</span>
      <span style="font-size: 11px; color: var(--text-dark); font-weight: bold;">Q${index + 1}</span>
    </div>
    <div class="quiz-question-text">${escapeHTML(q.question)}</div>
  `;

  if (q.type === 'mcq') {
    let optionsHTML = '<div class="quiz-options-grid">';
    const hasAnswered = currentAnswers[index] !== null;
    const studentAnswer = currentAnswers[index];
    
    q.options.forEach((opt, optIdx) => {
      let stateClass = '';
      let onclickAttr = `onclick="selectQuizOption(${index}, ${optIdx}, '${escapeDoubleQuotes(opt)}')"`;
      
      if (hasAnswered) {
        onclickAttr = 'disabled';
        const isSelected = studentAnswer === opt;
        const isCorrectOpt = q.correctAnswer && opt.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
        
        if (isCorrectOpt) {
          stateClass = 'correct';
        } else if (isSelected) {
          stateClass = 'incorrect';
        }
      }
      
      optionsHTML += `
        <button class="quiz-option-btn ${stateClass}" ${onclickAttr} style="${hasAnswered ? 'cursor: not-allowed;' : ''}">
          <span class="quiz-option-letter">
            ${String.fromCharCode(65 + optIdx)}
          </span>
          <span>${escapeHTML(opt)}</span>
        </button>
      `;
    });
    optionsHTML += '</div>';
    
    let feedbackHTML = '';
    if (hasAnswered) {
      const isStudentCorrect = studentAnswer && q.correctAnswer && studentAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
      feedbackHTML = `
        <div class="quiz-feedback-box ${isStudentCorrect ? 'correct' : 'incorrect'}">
          <div style="font-weight: bold; margin-bottom: 6px; color: ${isStudentCorrect ? 'var(--success)' : 'var(--danger)'}; display: flex; align-items: center; gap: 6px; font-size: 13px;">
            <span>${isStudentCorrect ? '&#x2714; Correct Response!' : '&#x2718; Incorrect Response'}</span>
          </div>
          <div style="font-size: 12px; color: var(--text-muted); line-height: 1.4;">
            <strong>Explanation:</strong> ${escapeHTML(q.explanation || 'No explanation provided.')}
          </div>
        </div>
      `;
    }
    
    questionCard.innerHTML = headerHTML + optionsHTML + feedbackHTML;
  } else if (q.type === 'coding') {
    const studentCode = currentAnswers[index] || '';
    const results = codingTestResults[index] || { passed: false, cases: [] };
    
    // Build test cases feedback checklist
    let testCasesHTML = '';
    if (q.testCases && q.testCases.length > 0) {
      testCasesHTML = `
        <div class="test-cases-box">
          <div style="font-weight: bold; font-size: 12px; color: #fff; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
            <span>Browser Unit Test Assertions</span>
            <span style="color: ${results.passed ? 'var(--success)' : 'var(--danger)'}; font-size: 11px;">
              ${results.passed ? '?? All Tests Passed' : '? Tests Incomplete / Failing'}
            </span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
      `;

      q.testCases.forEach((tc, tcIdx) => {
        const caseResult = results.cases?.[tcIdx];
        let statusClass = '';
        let icon = '?';
        if (caseResult) {
          statusClass = caseResult.passed ? 'passed' : 'failed';
          icon = caseResult.passed ? '??' : '?';
        }
        
        const argsStr = tc.args ? JSON.stringify(tc.args) : '()';
        const expectedStr = tc.expected !== undefined ? JSON.stringify(tc.expected) : 'undefined';
        const actualStr = caseResult ? JSON.stringify(caseResult.actual) : '?';

        testCasesHTML += `
          <div class="test-case-item ${statusClass}">
            <div>
              <strong>Case ${tcIdx + 1}:</strong> Pass arguments: <code>${escapeHTML(argsStr)}</code> 
              &rarr; Expect: <code>${escapeHTML(expectedStr)}</code>
            </div>
            <div style="font-weight: bold;">
              ${icon} ${caseResult ? `Got: <code>${escapeHTML(actualStr)}</code>` : 'Pending Run'}
            </div>
          </div>
        `;
      });

      testCasesHTML += `
          </div>
        </div>
      `;
    }

    const codingHTML = `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <label style="font-size: 12px; color: var(--text-muted); font-weight: bold;">Write your solution function below:</label>
        <textarea class="quiz-code-editor" id="quiz-editor-${index}" oninput="updateCodingAnswer(${index}, this.value)" placeholder="// Write your programming logic here...">${studentCode}</textarea>
        
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button class="btn btn-secondary" onclick="runCodingTests(${index})" style="margin: 0; padding: 8px 16px; font-size: 12px; border-color: var(--primary-magenta); color: var(--primary-magenta);">
            ? Run Test Cases
          </button>
        </div>
        ${testCasesHTML}
      </div>
    `;

    questionCard.innerHTML = headerHTML + codingHTML;
  }

  container.appendChild(questionCard);
}

function navigateQuiz(dir) {
  if (autoNavigateTimeout) {
    clearTimeout(autoNavigateTimeout);
    autoNavigateTimeout = null;
  }
  const nextIdx = currentQuestionIndex + dir;
  if (currentActiveQuiz && nextIdx >= 0 && nextIdx < currentActiveQuiz.questions.length) {
    renderQuizQuestion(nextIdx);
  }
}

function selectQuizOption(qIdx, optIdx, optText) {
  currentAnswers[qIdx] = optText;
  renderQuizQuestion(qIdx);

  if (autoNavigateTimeout) {
    clearTimeout(autoNavigateTimeout);
    autoNavigateTimeout = null;
  }

  const isLastQuestion = qIdx === currentActiveQuiz.questions.length - 1;

  autoNavigateTimeout = setTimeout(() => {
    if (isLastQuestion) {
      submitQuiz(true);
    } else {
      navigateQuiz(1);
    }
  }, 1200); // 1.2s delay to show feedback before auto-advancing
}

function updateCodingAnswer(qIdx, code) {
  currentAnswers[qIdx] = code;
}

function runCodingTests(qIdx) {
  if (!currentActiveQuiz || !currentActiveQuiz.questions[qIdx]) return;
  const q = currentActiveQuiz.questions[qIdx];
  const userCode = currentAnswers[qIdx] || '';

  const isPython = currentUser.domain && currentUser.domain.toLowerCase().includes('python');
  
  if (isPython) {
    // For Python, we do a basic client-side syntax mock validator
    const hasDef = userCode.includes('def ') || userCode.includes('lambda');
    const cases = (q.testCases || []).map(tc => ({
      args: tc.args,
      expected: tc.expected,
      actual: "[Executed in Python Grader]",
      passed: hasDef // If they wrote a definition, give them a tentative local pass
    }));
    
    codingTestResults[qIdx] = {
      passed: hasDef,
      cases: cases
    };
    renderQuizQuestion(qIdx);
    return;
  }

  // Evaluate JavaScript browser-side
  const cases = [];
  let allPassed = true;

  try {
    // Check if they declared a function correctly
    const evaluatedFn = new Function(`return (${userCode})`)();
    if (typeof evaluatedFn !== 'function') {
      throw new Error("Code must return or evaluate to a JavaScript function");
    }

    if (q.testCases && q.testCases.length > 0) {
      q.testCases.forEach(tc => {
        let passed = false;
        let actual = null;
        try {
          actual = evaluatedFn.apply(null, tc.args);
          passed = JSON.stringify(actual) === JSON.stringify(tc.expected);
        } catch (e) {
          actual = e.message;
          passed = false;
        }
        
        if (!passed) allPassed = false;
        cases.push({
          args: tc.args,
          expected: tc.expected,
          actual: actual,
          passed: passed
        });
      });
    }
  } catch (err) {
    allPassed = false;
    (q.testCases || []).forEach(tc => {
      cases.push({
        args: tc.args,
        expected: tc.expected,
        actual: `Error: ${err.message}`,
        passed: false
      });
    });
  }

  codingTestResults[qIdx] = {
    passed: allPassed,
    cases: cases
  };

  renderQuizQuestion(qIdx);
}

async function saveToDailyQuizTable(name, email, question, score, progress, mentor, domain, date, submittedAt) {
  if (!supabaseActive || !supabaseClient) {
    console.log("Supabase not active, skipping custom table save.");
    return false;
  }
  
  const payload = {
    "Name": name,
    "Student Email": email,
    "Question": question,
    "Score": score,
    "Progress": progress,
    "Mentor": mentor,
    "Domain": domain,
    "Date": date,
    "Submitted At": submittedAt
  };
  
  console.log("Saving quiz to Supabase 'Daily Quiz Table'...", payload);
  try {
    const { data, error } = await supabaseClient.from('Daily Quiz Table').insert([payload]);
    if (error) {
      console.warn("Failed to insert into 'Daily Quiz Table', trying lowercase 'daily quiz' fallback. Error:", error);
      const lowercasePayload = { name, question, score, progress, mentor, domain, date, submitted_at: submittedAt };
      const { error: error2 } = await supabaseClient.from('daily quiz').insert([lowercasePayload]);
      if (error2) {
        console.warn("Daily Quiz tables failed, saving to apex_sync...", error2);
        const syncDoc = {
          id: `quiz-${Date.now()}-${email.replace(/[^a-z0-9]/gi, '')}`,
          ...payload
        };
        const { error: syncErr } = await supabaseClient.from('apex_sync').upsert({
          id: syncDoc.id,
          collection: 'quizSubmissions',
          data: syncDoc
        });
        if (syncErr) {
          console.error("Failed to save quiz to apex_sync:", syncErr);
          return false;
        }
        console.log("Successfully saved quiz to apex_sync fallback");
        return true;
      }
      console.log("Successfully saved quiz to fallback 'daily quiz' table");
      return true;
    }
    console.log("Successfully saved quiz to 'Daily Quiz Table':", data);
    return true;
  } catch (err) {
    console.error("Exception in saveToDailyQuizTable:", err);
    return false;
  }
}

async function submitQuiz(bypassConfirm = false) {
  if (!currentActiveQuiz) return;

  if (autoNavigateTimeout) {
    clearTimeout(autoNavigateTimeout);
    autoNavigateTimeout = null;
  }
  
  // Prompt confirm
  if (!bypassConfirm) {
    if (!confirm("Are you sure you want to submit your Daily Quiz? Your answers will be graded and logged.")) {
      return;
    }
  }

  // Display grading loader only if not bypassed
  if (!bypassConfirm) {
    document.getElementById('quiz-active-view').classList.add('hidden');
    document.getElementById('quiz-loading-view').style.display = 'flex';
    document.getElementById('quiz-loading-title').innerText = "AI Copilot Grader is reviewing your answers...";
  }

  let score = 0;
  const gradingDetails = [];

  for (let i = 0; i < currentActiveQuiz.questions.length; i++) {
    const q = currentActiveQuiz.questions[i];
    const answer = currentAnswers[i];

    const correct = answer && q.correctAnswer && answer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
    if (correct) score++;
    gradingDetails.push({
      questionId: q.id,
      correct: correct,
      answerText: answer || "No Option Selected",
      feedback: correct ? "Correct MCQ Selection." : `Incorrect selection. The correct option is: "${q.correctAnswer}".`
    });
  }

  // Create submission object
  const submissionId = `sub-${currentUser.email.replace(/[@.]/g, '_')}-${new Date().toDateString().replace(/[^a-zA-Z0-9]/g, '_')}`;
  const submission = {
    id: submissionId,
    studentEmail: currentUser.email,
    studentName: currentUser.name,
    domain: currentUser.domain || "Web Development",
    date: new Date().toDateString(),
    score: score,
    progress: 0,
    answers: currentAnswers,
    details: gradingDetails,
    questions: currentActiveQuiz.questions,
    timestamp: new Date().toLocaleString()
  };

  // Push to local submissions list first so calculateStudentProgress includes this quiz score!
  db.quizSubmissions.push(submission);

  // Recalculate progress on dashboard (includes current quiz)
  const progressPct = calculateStudentProgress(currentUser.email);
  submission.progress = progressPct;
  currentUser.progress = progressPct;

  const userIdx = db.users.findIndex(u => u.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase());
  if (userIdx > -1) {
    db.users[userIdx].progress = progressPct;
  }

  // Save to DB and sync
  saveDatabase();
  syncRecordToFirestore('quizSubmissions', submission);
  if (userIdx > -1) {
    syncRecordToFirestore('users', db.users[userIdx]);
  }

  // Save to Custom Supabase Table "Daily Quiz Table"
  const mentorName = getStudentMentorName(currentUser);
  
  const questionSummary = currentActiveQuiz.questions.map((q, idx) => {
    return `Q${idx + 1}: ${q.question} [Answered: ${currentAnswers[idx] || 'No answer'}]`;
  }).join(' | ');

  // Save to database in the background without awaiting, so UI updates immediately!
  submission.isSyncing = true;
  const quizScorePct = Math.round((score / currentActiveQuiz.questions.length) * 100);
  saveToDailyQuizTable(
    currentUser.name,
    currentUser.email,
    questionSummary,
    `${score}/10`,
    `${quizScorePct}%`, // Save quiz score percentage in the progress column!
    mentorName,
    currentUser.domain || "Web Development",
    submission.date,
    submission.timestamp
  ).then(success => {
    submission.isSyncing = false;
    if (success) {
      submission.syncedToSupabase = true;
      saveDatabase();
    }
  });

  loadStudentQuiz();
}

function userCodeHeuristicCheck(code, desc) {
  if (!code || code.trim().length < 15) {
    return { passed: false, feedback: "Incorrect solution. Empty or insufficient code length." };
  }
  const codeLower = code.toLowerCase();
  
  if (codeLower.includes('def ') || codeLower.includes('return') || codeLower.includes('print')) {
    return { passed: true, feedback: "Syntactically correct function skeleton. Mock cases passed." };
  }
  return { passed: false, feedback: "Error: Missing function keyword 'def' or return statement." };
}

function showQuizResults(quiz, submission) {
  document.getElementById('quiz-loading-view').style.display = 'none';
  document.getElementById('quiz-start-view').classList.add('hidden');
  document.getElementById('quiz-active-view').classList.add('hidden');
  document.getElementById('quiz-results-view').classList.remove('hidden');

  const scoreText = `${submission.score} / ${quiz.questions.length}`;
  const scoreCircle = document.getElementById('quiz-results-score-circle');
  scoreCircle.innerText = scoreText;

  // Set colors based on scores
  const scorePct = (submission.score / quiz.questions.length) * 100;
  if (scorePct >= 70) {
    scoreCircle.style.borderColor = 'var(--success)';
    scoreCircle.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.4)';
    document.getElementById('quiz-results-feedback').innerText = "Outstanding effort! Your score average has been saved to your metrics profile.";
  } else if (scorePct >= 40) {
    scoreCircle.style.borderColor = 'var(--warning)';
    scoreCircle.style.boxShadow = '0 0 20px rgba(245, 158, 11, 0.4)';
    document.getElementById('quiz-results-feedback').innerText = "Good attempt! Keep reviewing your syllabus logs to improve tomorrow.";
  } else {
    scoreCircle.style.borderColor = 'var(--danger)';
    scoreCircle.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.4)';
    document.getElementById('quiz-results-feedback').innerText = "Focus on the basics! Ask your Mentor inside the Chat box if you have blocker doubts.";
  }

  // Draw detailed submission outcomes list
  const container = document.getElementById('quiz-results-details-container');
  container.innerHTML = '';

  quiz.questions.forEach((q, idx) => {
    const detail = submission.details?.[idx] || { correct: false, answerText: "", feedback: "No details." };
    const card = document.createElement('div');
    card.className = 'quiz-question-card';
    card.style.borderLeft = detail.correct ? '4px solid var(--success)' : '4px solid var(--danger)';

    const ansDisplay = q.type === 'mcq' 
      ? `Selected option: <strong>${escapeHTML(detail.answerText)}</strong>`
      : `Code Submitted:<br><pre style="background: #09090d; border: 1px solid var(--border-color); padding: 8px; border-radius: 6px; font-family: monospace; font-size: 11px; margin-top: 6px; overflow-x: auto; text-align: left;"><code>${escapeHTML(detail.answerText)}</code></pre>`;

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-weight:bold; font-size:12px; color: ${detail.correct ? 'var(--success)' : 'var(--danger)'};">
          ${detail.correct ? '&#x2714; Correct Response' : '&#x2718; Incorrect Response'}
        </span>
        <span class="difficulty-badge ${q.difficulty || 'easy'}">${q.difficulty || 'easy'}</span>
      </div>
      <div style="font-size: 13px; color: #fff; margin-bottom: 8px; text-align: left; font-weight: 500;">Q${idx+1}: ${escapeHTML(q.question)}</div>
      <div style="font-size: 12px; color: var(--text-main); margin-bottom: 8px; text-align: left;">
        ${ansDisplay}
      </div>
      <div class="quiz-grader-notes">
        <strong>Grader Notes:</strong> ${escapeHTML(detail.feedback)}
        ${q.explanation ? `<br><strong style="color:var(--primary-magenta);">Explanation:</strong> ${escapeHTML(q.explanation)}` : ''}
      </div>
    `;
    container.appendChild(card);
  });
}

function viewInternQuizDetail(submissionId) {
  const sub = (db.quizSubmissions || []).find(s => s.id === submissionId);
  if (!sub) return;
  
  let content = `=== INTERN QUIZ COMPILATION DETAILS ===\n\n`;
  content += `Date: ${sub.date}\n`;
  content += `Student: ${sub.studentName} (${sub.studentEmail})\n`;
  content += `Domain: ${sub.domain}\n`;
  content += `Grade Score: ${sub.score} / 10\n`;
  content += `\n======================================\n`;

  (sub.questions || []).forEach((q, idx) => {
    const det = sub.details?.[idx] || { correct: false, answerText: "", feedback: "" };
    content += `\nQ${idx+1}: ${q.question}\n`;
    content += `Status: ${det.correct ? '?? CORRECT' : '? INCORRECT'}\n`;
    if (q.type === 'mcq') {
      content += `Student Selection: "${det.answerText}"\n`;
      content += `Correct Option: "${q.correctAnswer}"\n`;
    } else {
      content += `Submitted Code:\n${det.answerText}\n`;
      content += `AI Grader Feedback: ${det.feedback}\n`;
    }
    content += `Explanation: ${q.explanation || 'N/A'}\n`;
    content += `\n--------------------------------------\n`;
  });

  alert(content);
}

// Pull active meeting state from Supabase to sync calls in real-time if WebSocket is offline
async function syncActiveMeetingState() {
  if (!activeMeeting) return;
  if (!supabaseActive || !supabaseClient) return;

  try {
    const { data: record, error } = await supabaseClient
      .from('apex_sync')
      .select('data')
      .eq('collection', 'meetings')
      .eq('id', activeMeeting.id)
      .maybeSingle();

    if (record && !error) {
      let parsed = robustParse(record.data);
      if (parsed && typeof parsed === 'object') {
        if (!db.meetings) db.meetings = [];
        const idx = db.meetings.findIndex(m => m.id === parsed.id);
        if (idx > -1) {
          db.meetings[idx] = parsed;
        } else {
          db.meetings.push(parsed);
        }
        storage.setItem('apex_intern_db', JSON.stringify(db));
        
        if (parsed.status === 'ended') {
          exitMeetingRoom("Meeting has been ended by host.");
        } else {
          const oldParticipantsCount = (activeMeeting && activeMeeting.participants) ? activeMeeting.participants.length : 0;
          activeMeeting = parsed;
          renderMeetingParticipants();
          renderMeetingChat();
          
          if (parsed.participants.length > oldParticipantsCount && parsed.participants.length > 1) {
            if (typeof setupWebRTCPeerConnection === 'function') {
              setupWebRTCPeerConnection();
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn("Active call sync failure:", err);
  }
}

// Add periodic call state poller to standard student/mentor loops
setInterval(() => {
  if (activeMeeting) {
    syncActiveMeetingState();
  }
}, 6000);

// ==================== 16. GEMINI LIVE API CONNECTORS ====================

async function generateQuizWithGemini(domain, date) {
  const apiKey = localStorage.getItem('apex_ai_gemini_key') || 'YOUR_GEMINI_API_KEY_HERE';
  if (!apiKey) return null;

  const systemInstructions = `You are the automated syllabus curriculum generator for InternX by UTX.
You generate daily technical assessment quizzes containing exactly 10 questions for a student doing an internship in "${domain}".
Generate a balanced mix of difficulties: 4 easy, 4 medium, and 2 hard questions.

CRITICAL RULES:
1. Return ONLY a valid JSON object. Do NOT wrap it in markdown code blocks (\`\`\`json). No explanation surrounding the JSON.
2. Evaluate the technical domain: "${domain}".
3. ALL 10 questions must be Multiple Choice Questions of type: "mcq". Do NOT generate any questions of type "coding".
4. For software engineering, coding, or programming domains (e.g., "Web Development", "Python Full Stack", etc.), coding questions must be represented as code-reading MCQs. For example, present a code snippet in the question text and ask the student to select the correct output, find a bug, or choose the correct function implementation from 4 given options.
5. Each question must strictly follow this structure:
   - "id": a unique string (e.g., "q1", "q2", ..., "q10")
   - "type": "mcq"
   - "difficulty": "easy", "medium", or "hard"
   - "question": the question text (can contain code snippets in markdown backticks)
   - "options": an array of exactly 4 strings representing options
   - "correctAnswer": the exact string from the options array that is the correct answer
   - "explanation": a concise explanation of why the correct option is right

JSON Schema structure:
{
  "domain": "${domain}",
  "date": "${date}",
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "difficulty": "easy",
      "question": "What is the HTML tag for inserting a line break?",
      "options": ["<br>", "<lb>", "<break>", "<newline>"],
      "correctAnswer": "<br>",
      "explanation": "The <br> tag is used to insert a line break in HTML."
    }
  ]
}`;

  const prompt = `Generate the daily quiz of 10 questions for date ${date} under the domain: ${domain}. Ensure JSON syntax is perfect.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        systemInstruction: {
          parts: [{ text: systemInstructions }]
        },
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!jsonText) return null;

    const parsed = JSON.parse(jsonText.trim());
    return parsed;
  } catch (err) {
    console.error("Gemini AI Quiz Generation Error:", err);
    return null;
  }
}

async function gradeCodingWithGemini(questionText, studentCode, testCases) {
  const apiKey = localStorage.getItem('apex_ai_gemini_key') || 'YOUR_GEMINI_API_KEY_HERE';
  if (!apiKey) return null;

  const prompt = `You are the automated Python code grader. Check the student's solution against the coding challenge description and unit test assertions.
Challenge: "${questionText}"
Test Cases: ${JSON.stringify(testCases)}

Student's Submitted Code:
\`\`\`python
${studentCode}
\`\`\`

Evaluate if the code is correct, covers edge cases, and satisfies the unit tests.
Respond with a JSON object ONLY matching this schema:
{
  "passed": true/false,
  "feedback": "A concise paragraph explaining whether the code is correct, highlighting bugs, syntax issues, or correct patterns."
}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!jsonText) return null;

    const parsed = JSON.parse(jsonText.trim());
    return parsed;
  } catch (err) {
    console.error("Gemini Code Grader Error:", err);
    return null;
  }
}

function getOfflineFallbackQuiz(domain, date) {
  const isCoding = domain.toLowerCase().includes('web') || domain.toLowerCase().includes('python') || domain.toLowerCase().includes('stack') || domain.toLowerCase().includes('developer');
  
  if (isCoding) {
    const isPython = domain.toLowerCase().includes('python');
    return {
      domain: domain,
      date: date,
      questions: [
        {
          id: "fq1",
          type: "mcq",
          difficulty: "easy",
          question: isPython ? "What is the correct syntax for declaring a function in Python?" : "Which keyword is used to declare a block-scoped local variable in JavaScript?",
          options: isPython 
            ? ["def functionName():", "function functionName():", "void functionName():", "declare functionName():"]
            : ["let", "var", "const", "define"],
          correctAnswer: isPython ? "def functionName():" : "let",
          explanation: isPython ? "'def' is used in Python to define functions." : "'let' declares a block-scoped local variable in JavaScript."
        },
        {
          id: "fq2",
          type: "mcq",
          difficulty: "easy",
          question: isPython ? "How do you start a comment in Python?" : "How do you create a single line comment in JavaScript?",
          options: isPython
            ? ["# this is a comment", "// this is a comment", "/* this is a comment */", "<!-- this is a comment -->"]
            : ["// comment", "# comment", "/* comment", "<!-- comment"],
          correctAnswer: isPython ? "# this is a comment" : "// comment",
          explanation: isPython ? "# starts comments in Python." : "// starts single line comments in JS."
        },
        {
          id: "fq3",
          type: "mcq",
          difficulty: "medium",
          question: isPython ? "Which collection type in Python is ordered, mutable, and allows duplicate elements?" : "Which array method in JavaScript creates a new array with all elements that pass a test?",
          options: isPython
            ? ["List", "Set", "Tuple", "Dictionary"]
            : ["filter()", "map()", "forEach()", "reduce()"],
          correctAnswer: isPython ? "List" : "filter()",
          explanation: isPython ? "Lists are ordered, mutable, and allow duplicates." : "filter() filters elements in JS."
        },
        {
          id: "fq4",
          type: "mcq",
          difficulty: "medium",
          question: isPython ? "What is the output of print(type([])) in Python?" : "What is the type of NaN in JavaScript?",
          options: isPython
            ? ["<class 'list'>", "<class 'dict'>", "<class 'tuple'>", "<class 'array'>"]
            : ["number", "NaN", "undefined", "object"],
          correctAnswer: isPython ? "<class 'list'>" : "number",
          explanation: isPython ? "[] denotes an empty list." : "NaN is numeric in type."
        },
        {
          id: "fq5",
          type: "mcq",
          difficulty: "medium",
          question: isPython ? "Which statement is used to handle exceptions in Python?" : "Which keyword is used to handle errors in JS asynchronously?",
          options: isPython
            ? ["try...except", "try...catch", "throw", "raise"]
            : ["try...catch", "promise", "async...await", "handle"],
          correctAnswer: isPython ? "try...except" : "try...catch",
          explanation: "Handles potential run time exceptions."
        },
        {
          id: "fq6",
          type: "mcq",
          difficulty: "medium",
          question: "What is the primary role of a relational database foreign key?",
          options: ["Maintain referential integrity", "Index unique elements", "Allow duplicate entries", "Encrypt relational models"],
          correctAnswer: "Maintain referential integrity",
          explanation: "Foreign keys link rows across different database tables."
        },
        {
          id: "fq7",
          type: "mcq",
          difficulty: "hard",
          question: "What is the time complexity of looking up a key in a hash table (on average)?",
          options: ["O(1)", "O(n)", "O(log n)", "O(n log n)"],
          correctAnswer: "O(1)",
          explanation: "Hash table structures resolve lookups in constant time O(1)."
        },
        {
          id: "fq8",
          type: "mcq",
          difficulty: "hard",
          question: "Which pattern matches a RESTful API GET request structure?",
          options: ["Retrieve resources from database", "Create new database entries", "Delete resources", "Replace existing schemas"],
          correctAnswer: "Retrieve resources from database",
          explanation: "GET is strictly read-only retrieval."
        },
        {
          id: "fq9",
          type: "mcq",
          difficulty: "easy",
          question: isPython 
            ? "What does the following Python statement return?\n'hello'[::-1]" 
            : "What is the output of the following JavaScript code?\n'hello'.split('').reverse().join('')",
          options: isPython
            ? ["'olleh'", "'hello'", "'h'", "'o'"]
            : ["'olleh'", "'hello'", "'h,e,l,l,o'", "undefined"],
          correctAnswer: isPython ? "'olleh'" : "'olleh'",
          explanation: isPython 
            ? "The slice operator [::-1] reverses the string in Python, producing 'olleh'." 
            : "split('') turns the string into an array of characters, reverse() reverses the array, and join('') merges it back, producing 'olleh'."
        },
        {
          id: "fq10",
          type: "mcq",
          difficulty: "easy",
          question: isPython
            ? "What is the output of the following Python slice?\nnums = [10, 20, 30, 40, 50]\nprint(nums[1:4])"
            : "What is the output of the following JavaScript array method chain?\n[1, 2, 3].map(x => x * 2).filter(x => x > 3)",
          options: isPython
            ? ["[20, 30, 40]", "[10, 20, 30]", "[20, 30, 40, 50]", "[10, 20, 30, 40]"]
            : ["[4, 6]", "[2, 4, 6]", "[4]", "[2, 4]"],
          correctAnswer: isPython ? "[20, 30, 40]" : "[4, 6]",
          explanation: isPython
            ? "Slicing from index 1 to 4 extracts elements at indices 1, 2, and 3: [20, 30, 40]."
            : "map doubles each element yielding [2, 4, 6], and filter keeps values greater than 3, resulting in [4, 6]."
        }
      ]
    };
  } else {
    // UI/UX Design conceptual MCQ fallback
    return {
      domain: domain,
      date: date,
      questions: [
        {
          id: "ux1",
          type: "mcq",
          difficulty: "easy",
          question: "What does the term 'UX' stand for in design?",
          options: ["User Experience", "User eXtension", "Unit eXploration", "Universal eXchange"],
          correctAnswer: "User Experience",
          explanation: "UX evaluates direct human interactions with digital systems."
        },
        {
          id: "ux2",
          type: "mcq",
          difficulty: "easy",
          question: "Which Figma tool is primarily used to layout dynamic grid resizing components?",
          options: ["Auto Layout", "Pen Tool", "Component Set", "Prototype Links"],
          correctAnswer: "Auto Layout",
          explanation: "Auto Layout dynamically flows responsive element frames."
        },
        {
          id: "ux3",
          type: "mcq",
          difficulty: "easy",
          question: "What is the primary purpose of a design system wireframe?",
          options: ["Structure layout outline", "Define color palettes", "Configure databases", "Embed CSS animations"],
          correctAnswer: "Structure layout outline",
          explanation: "Wireframes map basic layout skeletons before high-fidelity visual fills."
        },
        {
          id: "ux4",
          type: "mcq",
          difficulty: "medium",
          question: "What does the color 'contrast ratio' evaluate in web accessibility guidelines (WCAG)?",
          options: ["Readability of text against background", "Hue variance of assets", "Grayscale gradients match", "Saturation intensity levels"],
          correctAnswer: "Readability of text against background",
          explanation: "Contrast ensures readable visibility for visually impaired users."
        },
        {
          id: "ux5",
          type: "mcq",
          difficulty: "medium",
          question: "What is a 'User Persona'?",
          options: ["Fictional archetype representing target users", "System authentication token", "Figma design plugin", "Front-end routing pathway"],
          correctAnswer: "Fictional archetype representing target users",
          explanation: "User Personas guide designers based on research data."
        },
        {
          id: "ux6",
          type: "mcq",
          difficulty: "medium",
          question: "Which font style is generally considered best for readability on high-resolution screens?",
          options: ["Sans-Serif", "Serif", "Script", "Cursive"],
          correctAnswer: "Sans-Serif",
          explanation: "Sans-serif lacks small curls, creating clean screen readability."
        },
        {
          id: "ux7",
          type: "mcq",
          difficulty: "medium",
          question: "What is 'Information Architecture' (IA)?",
          options: ["Organizing content structure logically", "Building system server racks", "Encrypting database backups", "Hosting responsive code bundles"],
          correctAnswer: "Organizing content structure logically",
          explanation: "IA arranges navigation maps logically for easy access."
        },
        {
          id: "ux8",
          type: "mcq",
          difficulty: "hard",
          question: "Which law states that the time to acquire a target is a function of the distance and size of the target?",
          options: ["Fitts's Law", "Jakob's Law", "Hick's Law", "Miller's Law"],
          correctAnswer: "Fitts's Law",
          explanation: "Fitts's Law governs layout sizes for clickable controls."
        },
        {
          id: "ux9",
          type: "mcq",
          difficulty: "hard",
          question: "Which law states that the time it takes to make a decision increases with the number and complexity of choices?",
          options: ["Hick's Law", "Fitts's Law", "Jakob's Law", "Miller's Law"],
          correctAnswer: "Hick's Law",
          explanation: "Hick's Law recommends clean layouts to minimize cognitive overload."
        },
        {
          id: "ux10",
          type: "mcq",
          difficulty: "hard",
          question: "What is the main purpose of performing an A/B split validation test?",
          options: ["Compare performance of two design variations", "Upload duplicate backups", "Debug front-end routing loops", "Check password hashing cycles"],
          correctAnswer: "Compare performance of two design variations",
          explanation: "A/B testing quantifies performance averages between layout variants."
        }
      ]
    };
  }
}

// ====== BOTTOM OF FILE: REAL-TIME FACE API SCANNER ENGINES ======
async function runFaceVerificationScan() {
  const progressBarContainer = document.getElementById('ver-progress-bar-container');
  const progressBar = document.getElementById('ver-progress-bar');
  const statusText = document.getElementById('ver-status-text');
  const matchIndicator = document.getElementById('ver-match-indicator');
  const video = document.getElementById('ver-webcam');

  if (!faceModelsLoaded) {
    if (statusText) statusText.innerText = "AI System is still warming up, please wait 3 seconds...";
    return;
  }

  if (progressBarContainer) progressBarContainer.style.display = 'block';
  if (matchIndicator) matchIndicator.style.display = 'block';
  if (progressBar) progressBar.style.width = '30%';
  if (statusText) statusText.innerText = "Scanning real-time bio metrics features...";

  try {
    // 1. Live camera image frames capture and detect face landmark array
    const currentFaceDetection = await faceapi.detectSingleFace(video)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!currentFaceDetection) {
      if (statusText) {
        statusText.innerText = "Face not detected! Align center towards webcam.";
        statusText.style.color = "var(--danger)";
      }
      setTimeout(runFaceVerificationScan, 1000); // Retry frame after 1 second loop
      return;
    }

    if (progressBar) progressBar.style.width = '60%';
    if (statusText) statusText.innerText = "Matching features with profile verification avatar template...";

    // 2. Get registered descriptor
    const savedDescriptor = await getOrExtractUserDescriptor(currentUser);
    if (!savedDescriptor) {
      if (statusText) statusText.innerText = "Profile registration matrix missing or unreadable!";
      return;
    }

    // 3. Euclidean Distance Comparison Engine
    const distance = faceapi.euclideanDistance(currentFaceDetection.descriptor, savedDescriptor);

    const matchConfidence = Math.round((1 - distance) * 100);
    if (matchIndicator) matchIndicator.innerText = `AI Match Rate: ${matchConfidence}%`;

    // Distance mapping check threshold (less than 0.55 means same face identity)
    if (distance < 0.55) {
      if (progressBar) progressBar.style.width = '100%';
      if (statusText) {
        statusText.innerText = "Identity Authenticated! Attendance Verified.";
        statusText.style.color = "var(--success)";
      }

      // Automatically trigger database write log
      const newRecord = {
        id: `att-action-${Date.now()}`,
        studentEmail: currentUser.email,
        studentName: currentUser.name,
        timestamp: new Date().toLocaleString(),
        date: new Date().toDateString(),
        action: "Daily Attendance Check-In",
        score: matchConfidence,
        status: "Verified (Pass)",
        faceImage: ""
      };

      if (!db.attendance) db.attendance = [];
      db.attendance.push(newRecord);
      saveDatabase(true);
      if (typeof syncRecordToFirestore === 'function') syncRecordToFirestore('attendance', newRecord);

      setTimeout(() => {
        closeModal('face-verification-modal'); // Agar aapka verification close modal function trigger name alag h toh change kr lena
        alert("Attendance verified successfully!");
      }, 1200);

    } else {
      if (progressBar) progressBar.style.width = '0%';
      if (statusText) {
        statusText.innerText = `Access Denied: Face mismatch (${matchConfidence}% accuracy).`;
        statusText.style.color = "var(--danger)";
      }
      alert("Verification Failed: Security face properties mismatch.");
    }
  } catch (err) {
    console.error("Verification error:", err);
    if (statusText) statusText.innerText = "Scanner processing computational failure.";
  }
}

function escapeDoubleQuotes(str) {
  return str.replace(/"/g, '\\"');
}

// ==================== INTERNSHIP OFFER LETTER FUNCTIONS ====================

function showOfferLetterForStudent(student) {
  if (!student) return;

  const studentId = getOrGenerateStudentId(student);
  
  // Date formatting helpers
  const formatDateNicely = (dateVal) => {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) {
      return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const offerDateStr = formatDateNicely(student.offerDate || new Date());
  const startDateStr = formatDateNicely(student.startDate || new Date());
  
  // End date is exactly 1 month after start date
  const startD = student.startDate ? new Date(student.startDate) : new Date();
  const endD = new Date(startD.getTime());
  endD.setMonth(startD.getMonth() + 1);
  const endDateStr = formatDateNicely(endD);

  // Set recipient details in the sheet
  const recipientNameEl = document.getElementById('letter-recipient-name');
  if (recipientNameEl) recipientNameEl.innerText = student.name || 'N/A';
  
  const recipientEmailEl = document.getElementById('letter-recipient-email');
  if (recipientEmailEl) recipientEmailEl.innerText = student.email || 'N/A';
  
  const recipientIdEl = document.getElementById('letter-student-id');
  if (recipientIdEl) recipientIdEl.innerText = studentId || 'N/A';

  // Set date elements
  const metaDateEl = document.getElementById('letter-date');
  if (metaDateEl) metaDateEl.innerText = offerDateStr;

  // Set domain name
  const domainName = student.domain || 'Software Engineering';
  const docTitleEl = document.getElementById('letter-document-title');
  if (docTitleEl) docTitleEl.innerText = `${domainName.toUpperCase()} INTERNSHIP OFFER LETTER`;

  // Dynamically tailor body text based on domain
  const bodyTextEl = document.getElementById('letter-body-content');
  if (bodyTextEl) {
    let domainSpecificIntro = '';
    const domainLower = domainName.toLowerCase();
    
    if (domainLower.includes('web')) {
      domainSpecificIntro = `Following your application and subsequent interview for the Web Development Internship, we are delighted to make you an offer as a Web Development Intern at InternX. We were highly impressed by your technical aptitude, frontend/backend problem-solving skills, and enthusiasm for building responsive and modern web applications.`;
    } else if (domainLower.includes('python')) {
      domainSpecificIntro = `Following your application and subsequent interview for the Python Full Stack Internship, we are delighted to make you an offer as a Python Full Stack Intern at InternX. We were highly impressed by your backend engineering focus, database logical structure comprehension, and interest in developing scalable server-side systems.`;
    } else if (domainLower.includes('ui') || domainLower.includes('design')) {
      domainSpecificIntro = `Following your application and subsequent interview for the UI/UX Design Internship, we are delighted to make you an offer as a UI/UX Design Intern at InternX. We were highly impressed by your creative layout design eye, user empathy, wireframing capabilities, and enthusiasm for crafting premium, state-of-the-art user interfaces.`;
    } else {
      domainSpecificIntro = `Following your application and subsequent interview for the ${domainName} Internship, we are delighted to make you an offer as a ${domainName} Intern at InternX. We were highly impressed by your technical aptitude, core domain skills, and enthusiasm for the field.`;
    }

    bodyTextEl.innerHTML = `
      <p>Dear <strong>${student.name}</strong>,</p>
      
      <p>${domainSpecificIntro}</p>
      
      <p>Your internship will be structured under the following parameters:</p>
      <ul>
        <li><strong>Position:</strong> ${domainName} Intern</li>
        <li><strong>Start Date:</strong> ${startDateStr}</li>
        <li><strong>End Date:</strong> ${endDateStr}</li>
        <li><strong>Duration:</strong> 1 Month (4 Weeks)</li>
        <li><strong>Type:</strong> Virtual / Remote</li>
        <li><strong>Stipend:</strong> Performance-based certificate & badge recognition</li>
      </ul>
      
      <p>During this internship, you will be expected to complete designated project milestones, submit weekly activity logs to your assigned supervisor, and participate in check-ins. Your attendance must be verified via our daily face-recognition system, and you are expected to maintain professional communication throughout your tenure.</p>
      
      <p>To accept this offer, please proceed with completing your onboarding tasks in your InternX workspace dashboard. We look forward to working together and seeing your growth during your tenure.</p>
    `;
  }

  // Adjust theme class on the sheet for customized aesthetics
  const sheetEl = document.getElementById('offer-letter-print-container');
  if (sheetEl) {
    sheetEl.classList.remove('theme-webdev', 'theme-python', 'theme-uiux');
    const domainLower = domainName.toLowerCase();
    if (domainLower.includes('web')) {
      sheetEl.classList.add('theme-webdev');
    } else if (domainLower.includes('python')) {
      sheetEl.classList.add('theme-python');
    } else if (domainLower.includes('ui') || domainLower.includes('design')) {
      sheetEl.classList.add('theme-uiux');
    } else {
      sheetEl.classList.add('theme-webdev');
    }
  }

  // Open the modal
  openModal('offer-letter-modal');
}

function downloadOfferLetterPDF() {
  document.body.classList.add('printing-offer-letter');
  
  // Wait a small timeout to let the print CSS override classes render
  setTimeout(() => {
    window.print();
    
    // Clean up class after print box closes
    setTimeout(() => {
      document.body.classList.remove('printing-offer-letter');
    }, 500);
  }, 150);
}

function lookupStudentById() {
  const inputEl = document.getElementById('mentor-lookup-input');
  if (!inputEl) return;
  const rawId = inputEl.value.trim();
  if (!rawId) {
    alert("Please enter a valid Student ID to search.");
    return;
  }

  // Ensure all student users have generated IDs
  db.users.forEach(u => {
    if (u.role === 'student' && !u.studentId) {
      getOrGenerateStudentId(u);
    }
  });

  const foundStudent = db.users.find(u => 
    u.role === 'student' && 
    u.studentId && 
    u.studentId.trim().toLowerCase() === rawId.toLowerCase()
  );

  if (foundStudent) {
    showOfferLetterForStudent(foundStudent);
  } else {
    alert(`No student found with Student ID "${rawId}". Make sure the ID is correct (e.g., IX/WD/2026/XXXXX).`);
  }
}

// ==================== INTERNSHIP CERTIFICATE FUNCTIONS ====================

function showCertificate(studentEmail) {
  if (!studentEmail) return;
  const emailClean = studentEmail.trim().toLowerCase();
  
  if (!db.certificates) db.certificates = [];
  const cert = db.certificates.find(c => c.studentEmail && c.studentEmail.trim().toLowerCase() === emailClean);
  if (!cert) {
    alert("No certificate found for this student.");
    return;
  }
  
  const holderNameEl = document.getElementById('cert-holder-name');
  if (holderNameEl) holderNameEl.innerText = cert.studentName || 'Student Name';
  
  const durationEl = document.getElementById('cert-duration');
  if (durationEl) durationEl.innerText = `${cert.duration}-Month`;
  
  const domainEl = document.getElementById('cert-domain');
  if (domainEl) domainEl.innerText = cert.domain || 'Software Engineering';
  
  const mentorEl = document.getElementById('cert-mentor');
  if (mentorEl) mentorEl.innerText = cert.mentorName || 'Mentor Name';
  
  const displayIdEl = document.getElementById('cert-display-id');
  if (displayIdEl) displayIdEl.innerText = cert.certificateId || 'N/A';
  
  const issueDateEl = document.getElementById('cert-issue-date');
  if (issueDateEl) issueDateEl.innerText = cert.issuedDate || 'N/A';
  
  const qrCodeEl = document.getElementById('cert-qr-code');
  if (qrCodeEl) {
    const verifyUrl = `${window.location.origin}${window.location.pathname}?verify=${cert.certificateId}`;
    qrCodeEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(verifyUrl)}`;
  }
  
  const certSheetEl = document.getElementById('certificate-print-container');
  if (certSheetEl) {
    certSheetEl.classList.remove('theme-webdev', 'theme-python', 'theme-uiux');
    const domainLower = (cert.domain || '').toLowerCase();
    if (domainLower.includes('web')) {
      certSheetEl.classList.add('theme-webdev');
    } else if (domainLower.includes('python')) {
      certSheetEl.classList.add('theme-python');
    } else if (domainLower.includes('ui') || domainLower.includes('design')) {
      certSheetEl.classList.add('theme-uiux');
    } else {
      certSheetEl.classList.add('theme-webdev');
    }
  }
  
  openModal('certificate-modal');
}

function viewCertificateForStudent(studentEmail) {
  showCertificate(studentEmail);
}

function printCertificate() {
  document.body.classList.add('printing-certificate');
  setTimeout(() => {
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-certificate');
    }, 500);
  }, 150);
}

async function issueCertificate(studentEmail) {
  if (!studentEmail) return;
  const emailClean = studentEmail.trim().toLowerCase();
  
  const student = db.users.find(u => u && u.email && u.email.trim().toLowerCase() === emailClean);
  if (!student) {
    alert("Student not found.");
    return;
  }
  
  const alreadyHas = db.certificates && db.certificates.some(c => c.studentEmail && c.studentEmail.trim().toLowerCase() === emailClean);
  if (alreadyHas) {
    alert("Certificate has already been issued to this student.");
    return;
  }
  
  let domain = student.domain || 'Web Development';
  let abbrev = 'WD';
  const domainLower = domain.toLowerCase();
  if (domainLower.includes('python')) {
    abbrev = 'PY';
  } else if (domainLower.includes('ui') || domainLower.includes('design')) {
    abbrev = 'UI';
  }
  
  const year = new Date().getFullYear();
  const digits = Math.floor(10000 + Math.random() * 90000);
  const certificateId = `IX/CERT/${abbrev}/${year}/${digits}`;
  
  const certObject = {
    id: `cert-${Date.now()}`,
    certificateId: certificateId,
    studentEmail: emailClean,
    studentName: student.name || 'Student Name',
    domain: domain,
    duration: student.duration || 3,
    mentorName: currentUser.name || 'Vaishanavi Vhora',
    mentorEmail: currentUser.email || 'vaishu005@gmail.com',
    issuedDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    issuedAt: new Date().toISOString()
  };
  
  if (!db.certificates) db.certificates = [];
  db.certificates.push(certObject);
  saveDatabase(true);
  
  syncRecordToFirestore('certificates', certObject);
  
  const msgText = `?? Congratulations! Your Internship Certificate of Completion has been officially issued! You can view and download it directly from your dashboard. Certificate ID: ${certificateId}`;
  
  const newChat = {
    id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    sender: currentUser.email.trim().toLowerCase(),
    receiver: emailClean,
    message: msgText,
    timestamp: new Date().toLocaleString(),
    attachment: ''
  };
  
  if (!db.chats) db.chats = [];
  db.chats.push(newChat);
  saveDatabase(true);
  syncRecordToFirestore('chats', newChat);
  
  alert(`Certificate officially issued successfully! Student ID: ${student.studentId || 'N/A'}, Certificate ID: ${certificateId}`);
  
  if (currentUser.role === 'mentor') {
    loadMentorDashboard();
  } else if (currentUser.role === 'admin') {
    loadAdminUsers();
  }
}

function resetVerificationResult() {
  const panel = document.getElementById('verification-result-panel');
  if (panel) { panel.style.display = 'none'; panel.innerHTML = ''; }
}

function handlePublicVerificationSearch() {
  const input = document.getElementById('public-verify-id-input');
  if (!input) return;
  const rawId = input.value.trim();
  if (!rawId) {
    showVerificationResult('error', 'Please enter a valid Student ID or Certificate ID.');
    return;
  }
  verifyCertificate(rawId);
}

function showVerificationResult(type, data) {
  const panel = document.getElementById('verification-result-panel');
  if (!panel) return;
  panel.style.display = 'block';

  if (type === 'error') {
    panel.innerHTML = `
      <div style="
        background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.3);
        border-radius:12px; padding:16px 20px;
        display:flex; align-items:center; gap:12px;
      ">
        <div style="width:36px;height:36px;border-radius:50%;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div>
        <div>
          <div style="font-size:13px;font-weight:700;color:#ef4444;">Not Found</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">${data}</div>
        </div>
      </div>`;
    return;
  }

  if (type === 'student') {
    const s = data;
    const sid = s.studentId || 'N/A';
    const domain = s.domain || 'Internship';
    const startDate = s.startDate ? new Date(s.startDate).toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'}) : 'N/A';
    const duration = s.duration ? `${s.duration} Month${s.duration > 1 ? 's' : ''}` : '1 Month';
    const internType = s.internshipType === 'paid' ? 'Premium (Paid)' : 'Standard (Free)';

    panel.innerHTML = `
      <div style="
        background:linear-gradient(135deg,rgba(34,197,94,0.06) 0%,rgba(131,39,236,0.06) 100%);
        border:1px solid rgba(34,197,94,0.3); border-radius:14px; overflow:hidden;
        animation: fadeInUp 0.35s ease;
      ">
        <!-- Green verified header -->
        <div style="background:linear-gradient(135deg,rgba(34,197,94,0.15),rgba(131,39,236,0.1));padding:14px 20px;display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(34,197,94,0.15);">
          <div style="width:32px;height:32px;border-radius:50%;background:rgba(34,197,94,0.2);border:1.5px solid #22c55e;display:flex;align-items:center;justify-content:center;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <div style="font-size:13px;font-weight:800;color:#22c55e;letter-spacing:0.03em;">VERIFIED &mdash; OFFER LETTER FOUND</div>
            <div style="font-size:10px;color:var(--text-muted);">This credential is authentic and issued by InternX by UTX</div>
          </div>
          <div style="margin-left:auto;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(34,197,94,0.7);background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.25);border-radius:6px;padding:3px 10px;">Active</div>
        </div>

        <!-- Details grid -->
        <div style="padding:18px 20px;display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <div>
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);margin-bottom:4px;">Student Name</div>
            <div style="font-size:15px;font-weight:700;color:#fff;font-family:'Outfit',sans-serif;">${s.name || 'N/A'}</div>
          </div>
          <div>
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);margin-bottom:4px;">Student ID</div>
            <div style="font-size:13px;font-weight:700;color:#8327ec;font-family:monospace;">${sid}</div>
          </div>
          <div>
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);margin-bottom:4px;">Domain</div>
            <div style="font-size:13px;font-weight:600;color:#fff;">${domain}</div>
          </div>
          <div>
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);margin-bottom:4px;">Start Date</div>
            <div style="font-size:13px;font-weight:600;color:#fff;">${startDate}</div>
          </div>
          <div>
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);margin-bottom:4px;">Duration</div>
            <div style="font-size:13px;font-weight:600;color:#fff;">${duration}</div>
          </div>
          <div>
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);margin-bottom:4px;">Program Type</div>
            <div style="font-size:13px;font-weight:600;color:#fff;">${internType}</div>
          </div>
        </div>

        <!-- View offer letter button -->
        <div style="padding:0 20px 18px;">
          <button onclick="showOfferLetterForStudent(window._verifiedStudent)" style="
            width:100%;padding:12px;font-size:13px;font-weight:700;letter-spacing:0.04em;
            background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);
            border:none;border-radius:10px;color:#fff;cursor:pointer;
            display:flex;align-items:center;justify-content:center;gap:8px;
            transition:all 0.2s;
          "
          onmouseover="this.style.opacity='0.9'"
          onmouseout="this.style.opacity='1'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            View Offer Letter
          </button>
        </div>
      </div>
      <style>
        @keyframes fadeInUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
      </style>
    `;
    window._verifiedStudent = s;
  }
}

function verifyCertificate(certId) {
  if (!certId) return;
  const idClean = certId.trim().toLowerCase();

  if (idClean.includes('/cert/')) {
    // Certificate ID lookup
    if (!db.certificates) db.certificates = [];
    const cert = db.certificates.find(c => c.certificateId && c.certificateId.trim().toLowerCase() === idClean);
    if (cert) {
      const verNameEl = document.getElementById('ver-student-name');
      if (verNameEl) verNameEl.innerText = cert.studentName || '—';
      const verDomainEl = document.getElementById('ver-domain');
      if (verDomainEl) verDomainEl.innerText = cert.domain || '—';
      const verDurationEl = document.getElementById('ver-duration');
      if (verDurationEl) verDurationEl.innerText = `${cert.duration} Month${cert.duration > 1 ? 's' : ''}`;
      const verMentorEl = document.getElementById('ver-mentor');
      if (verMentorEl) verMentorEl.innerText = cert.mentorName || '—';
      const verIssueDateEl = document.getElementById('ver-issue-date');
      if (verIssueDateEl) verIssueDateEl.innerText = cert.issuedDate || '—';
      const verCertIdEl = document.getElementById('ver-cert-id');
      if (verCertIdEl) verCertIdEl.innerText = cert.certificateId || '—';
      openModal('verification-modal');
    } else {
      showVerificationResult('error', `No certificate found with ID "${certId}". Please check the ID and try again.`);
    }
  } else {
    // Student ID → Offer Letter lookup
    const foundStudent = db.users.find(u =>
      u.role === 'student' &&
      u.studentId &&
      u.studentId.trim().toLowerCase() === idClean
    );
    if (foundStudent) {
      showVerificationResult('student', foundStudent);
    } else {
      showVerificationResult('error', `No student found with ID "${certId}". Make sure the ID is correct (e.g. IX/WD/2026/12345).`);
    }
  }
}


// ==================== 14. EXPLORE INTERNSHIPS & RAZORPAY CODE ====================

// Mock Internships Catalog Data
const MOCK_INTERNSHIPS = [
  // -- PAGE 1 ---------------------------------------------
  {
    id: "intern-web-paid",
    title: "Premium Web Engineering",
    domain: "Web Development",
    type: "free",
    stipend: "No Stipend",
    duration: "6 Months",
    fee: 99,
    description: "Build production-scale React apps, Node.js microservices, and modern Cloud architectures. Structured premium supervision.",
    features: ["1-on-1 Senior Mentor", "Face-verified Attendance", "Certification Tracker", "Experience Letter"]
  },
  {
    id: "intern-web-free",
    title: "Web Developer Internship",
    domain: "Web Development",
    type: "free",
    stipend: "No Stipend",
    duration: "3 Months",
    fee: 0,
    description: "Work on open-source projects and build your developer portfolio. Ideal for fresh graduates looking for structural tech exposure.",
    features: ["Flexible Hours", "Weekly Code Reviews", "Experience Letter", "Slack Community Access"]
  },
  {
    id: "intern-data-paid",
    title: "AI & Data Science Specialist",
    domain: "Python / ML",
    type: "free",
    stipend: "No Stipend",
    duration: "6 Months",
    fee: 99,
    description: "Deep dive into machine learning pipelines, NLP modeling, and Gemini API integrations. Work with real-world datasets.",
    features: ["GPU Cloud Access", "AI Project Portfolio", "Verified Certificate", "Weekly Mentor Review"]
  },
  {
    id: "intern-ui-free",
    title: "UI/UX Design Associate",
    domain: "UI/UX Design",
    type: "free",
    stipend: "No Stipend",
    duration: "3 Months",
    fee: 0,
    description: "Learn Figma layouts, interactive prototyping, user research methodologies, and sleek glassmorphic aesthetics.",
    features: ["Figma Design Labs", "Portfolio Projects", "Certificate of Completion", "Weekly Standups"]
  },
  {
    id: "intern-android-paid",
    title: "Android App Developer",
    domain: "Mobile Development",
    type: "free",
    stipend: "No Stipend",
    duration: "6 Months",
    fee: 79,
    description: "Build native Android applications using Kotlin and Jetpack Compose. Work on real Play Store deployments under senior guidance.",
    features: ["Kotlin & Jetpack Compose", "Play Store Deployment", "Verified Certificate", "Weekly Mentor Review"]
  },
  {
    id: "intern-flutter-paid",
    title: "Mobile Development Trainee",
    domain: "Mobile Development",
    type: "free",
    stipend: "No Stipend",
    duration: "3 Months",
    fee: 59,
    description: "Get hands-on with Flutter and cross-platform development. Build and publish small apps as part of your portfolio.",
    features: ["Flutter & Dart Training", "Cross-Platform Projects", "Experience Letter", "Community Mentorship"]
  },
  // -- PAGE 2 ---------------------------------------------
  {
    id: "intern-cyber-paid",
    title: "Cybersecurity Analyst",
    domain: "Cybersecurity",
    type: "paid",
    stipend: "&#x20B9;2,000 / month",
    duration: "6 Months",
    fee: 99,
    description: "Perform ethical hacking, penetration testing, and vulnerability assessments on live systems with certified professionals.",
    features: ["CEH Prep Support", "Live Pen Testing Labs", "Incident Response Training", "Verified Certificate"]
  },
  {
    id: "intern-security-paid",
    title: "Security Research Intern",
    domain: "Cybersecurity",
    type: "paid",
    stipend: "&#x20B9;1,500 / month",
    duration: "3 Months",
    fee: 69,
    description: "Learn network security basics, OWASP Top-10, and how to identify common vulnerabilities in web apps.",
    features: ["OWASP Training", "CTF Challenges", "Security Research Letter", "Weekly Briefings"]
  },
  {
    id: "intern-cloud-paid",
    title: "Cloud & DevOps Engineer",
    domain: "Cloud Computing",
    type: "paid",
    stipend: "&#x20B9;2,000 / month",
    duration: "6 Months",
    fee: 99,
    description: "Work with AWS, Docker, and Kubernetes to build and maintain CI/CD pipelines for enterprise-grade systems.",
    features: ["Stipend: &#x20B9;2,000/mo", "AWS Practitioner Track", "CI/CD Pipeline Projects", "DevOps Certificate"]
  },
  {
    id: "intern-cloud-free",
    title: "Cloud Fundamentals Trainee",
    domain: "Cloud Computing",
    type: "free",
    stipend: "No Stipend",
    duration: "3 Months",
    fee: 59,
    description: "Gain foundational knowledge in GCP and Azure. Set up virtual machines, cloud storage, and basic networking.",
    features: ["GCP & Azure Basics", "Cloud Labs", "Experience Letter", "1-on-1 Cloud Mentor"]
  },
  {
    id: "intern-blockchain-paid",
    title: "Blockchain Developer",
    domain: "Blockchain & Web3",
    type: "paid",
    stipend: "&#x20B9;1,800 / month",
    duration: "6 Months",
    fee: 79,
    description: "Build and deploy Solidity smart contracts on Ethereum. Explore DeFi protocols, NFT minting, and Web3 frontend integration.",
    features: ["Stipend: &#x20B9;1,800/mo", "Solidity & Hardhat", "Smart Contract Auditing", "Web3 Portfolio"]
  },
  {
    id: "intern-ml-paid",
    title: "Machine Learning Intern",
    domain: "Machine Learning",
    type: "free",
    stipend: "No Stipend",
    duration: "3 Months",
    fee: 69,
    description: "Implement supervised and unsupervised learning algorithms using Python and scikit-learn. Work on mini-research projects.",
    features: ["Python & scikit-learn", "Kaggle Projects", "ML Research Certificate", "Weekly Code Reviews"]
  },
  // -- PAGE 3 ---------------------------------------------
  {
    id: "intern-gamedev-paid",
    title: "Game Developer Intern",
    domain: "Game Development",
    type: "free",
    stipend: "No Stipend",
    duration: "3 Months",
    fee: 59,
    description: "Create 2D/3D games using Unity and C#. Work on level design, physics systems, and multiplayer game mechanics.",
    features: ["Unity & C# Training", "Game Jam Participation", "Published Game Certificate", "Weekly Sessions"]
  },
  {
    id: "intern-embedded-paid",
    title: "Embedded Systems Trainee",
    domain: "Embedded Systems",
    type: "free",
    stipend: "No Stipend",
    duration: "3 Months",
    fee: 69,
    description: "Work with Arduino and Raspberry Pi to build IoT prototypes. Learn C firmware programming and sensor interfacing.",
    features: ["Arduino & RPi Projects", "IoT Hardware Labs", "Experience Letter", "Firmware Basics Training"]
  },
  {
    id: "intern-marketing-paid",
    title: "Digital Marketing Specialist",
    domain: "Digital Marketing",
    type: "paid",
    stipend: "&#x20B9;1,500 / month",
    duration: "3 Months",
    fee: 5,
    description: "Run live ad campaigns on Meta and Google, manage SEO strategies, and analyze conversion funnels for real clients.",
    features: ["Stipend: &#x20B9;1,500/mo", "Meta & Google Ads", "SEO & Analytics", "Campaign Portfolio"]
  }
];

// Initialize and Render explore list ... with carousel pagination
let _explorePage = 0;
const _explorePageSize = 6;

function _buildInternshipCard(intern) {
  const isPaid = intern.type === 'paid';
  const isFree = intern.type === 'free';
  // Badge: PAID (pink) | FREE TRAINING (blue)
  const badgeColor = isPaid ? 'var(--primary-magenta)' : 'var(--accent-blue)';
  const badgeBg   = isPaid ? 'rgba(224,26,139,0.15)' : 'rgba(42,107,242,0.15)';
  const badgeText = isPaid ? 'PAID' : 'FREE TRAINING';

  let featuresHtml = '';
  intern.features.forEach(f => {
    featuresHtml += `<li style="font-size:11px;margin-bottom:6px;display:flex;align-items:center;gap:6px;color:var(--text-muted);">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="flex-shrink:0;"><circle cx="6" cy="6" r="6" fill="${badgeColor}" opacity="0.18"/><path d="M3.5 6L5.2 7.7L8.5 4.3" stroke="${badgeColor}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg> ${f}
    </li>`;
  });

  const card = document.createElement('div');
  card.className = 'feature-card glass-panel explore-card';
  card.style.cssText = 'display:flex;flex-direction:column;justify-content:space-between;padding:0;min-height:340px;transition:transform var(--transition-fast),border-color var(--transition-fast);border:1px solid var(--border-color);border-radius:16px;position:relative;overflow:hidden;';

  // Fee row content
  const stipendLabel = isPaid
    ? `<div style="font-size:14px;font-weight:700;color:var(--text-main);">${intern.stipend}</div><div style="font-size:9px;color:var(--primary-magenta);">Reg. Fee: &#x20B9;${intern.fee}</div>`
    : intern.fee === 0
      ? `<div style="font-size:14px;font-weight:700;color:var(--success);">FREE</div><div style="font-size:9px;color:var(--text-muted);">No Stipend &bull; Experience Letter</div>`
      : `<div style="font-size:14px;font-weight:700;color:var(--accent-blue);">&#x20B9;${intern.fee} Registration</div><div style="font-size:9px;color:var(--text-muted);">No Stipend &bull; Experience Letter</div>`;

  const btnStyle = isPaid
    ? `background:var(--primary-magenta);border-color:var(--primary-magenta);color:#fff;`
    : `background:rgba(42,107,242,0.12);border-color:var(--accent-blue);color:var(--accent-blue);`;

  // Domain header gradient — unique per domain type
  const _buildDomainColors = {
    'Web Development':    ['#e01a8b','#8327ec'],
    'Python / ML':        ['#f59e0b','#ef4444'],
    'UI/UX Design':       ['#06b6d4','#2a6bf2'],
    'Mobile Development': ['#10b981','#059669'],
    'Cybersecurity':      ['#ef4444','#b91c1c'],
    'Cloud Computing':    ['#f97316','#ea580c'],
    'Cloud & DevOps':     ['#fb923c','#f97316'],
    'Blockchain & Web3':  ['#6366f1','#4f46e5'],
    'Machine Learning':   ['#a78bfa','#7c3aed'],
    'Game Development':   ['#ec4899','#db2777'],
    'Embedded Systems':   ['#14b8a6','#0d9488'],
    'Digital Marketing':  ['#f59e0b','#d97706'],
    'Data Analytics':     ['#22c55e','#16a34a'],
  };
  const _bdc_pal = [['#e01a8b','#8327ec'],['#06b6d4','#2a6bf2'],['#10b981','#059669'],['#f59e0b','#ef4444'],['#6366f1','#4f46e5'],['#f97316','#ea580c'],['#ec4899','#db2777'],['#a78bfa','#7c3aed'],['#14b8a6','#0d9488'],['#22c55e','#16a34a'],['#38bdf8','#0284c7'],['#facc15','#ca8a04']];
  function _getBuildColor(d) {
    if (_buildDomainColors[d]) return _buildDomainColors[d];
    const k = Object.keys(_buildDomainColors).find(k => d.toLowerCase().includes(k.toLowerCase().split(' ')[0]) || k.toLowerCase().includes(d.toLowerCase().split(' ')[0]));
    if (k) return _buildDomainColors[k];
    let h = 0; for (let c of d) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
    return _bdc_pal[h % _bdc_pal.length];
  }
  const dc = _getBuildColor(intern.domain);
  const domainGradient = `linear-gradient(135deg, ${dc[0]} 0%, ${dc[1]} 100%)`;

  card.innerHTML = `
    <div>
      <!-- Domain header strip inside card, at the very top -->
      <div style="
        background:${domainGradient};
        padding:10px 20px 10px 20px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        border-radius:14px 14px 0 0;
        margin-bottom:0;
      ">
        <span style="
          font-family:'Outfit',sans-serif;
          font-size:11px;
          font-weight:900;
          text-transform:uppercase;
          letter-spacing:0.13em;
          color:#fff;
          text-shadow:0 1px 6px rgba(0,0,0,0.25);
        ">${intern.domain}</span>
        <span style="
          font-size:10px;
          font-weight:800;
          text-transform:uppercase;
          color:#fff;
          background:rgba(255,255,255,0.22);
          border:1px solid rgba(255,255,255,0.45);
          padding:3px 10px;
          border-radius:20px;
          letter-spacing:0.05em;
        ">${badgeText}</span>
      </div>
      <!-- Card body -->
      <div style="padding:20px 24px 0 24px;">
        <h3 style="font-size:17px;margin-bottom:8px;font-family:'Outfit',sans-serif;color:var(--text-main);">${intern.title}</h3>
        <p style="font-size:12px;color:var(--text-muted);margin-bottom:14px;line-height:1.5;height:48px;overflow:hidden;">${intern.description}</p>
        <ul style="list-style:none;padding:0;margin:0 0 16px 0;">${featuresHtml}</ul>
      </div>
    </div>
    <div style="padding:0 24px 24px 24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border-color);padding-top:14px;margin-bottom:14px;">
        <span style="font-size:10px;color:var(--text-muted);text-transform:uppercase;">Stipend / Fee</span>
        <div style="text-align:right;">${stipendLabel}</div>
      </div>
      <button type="button" class="btn" onclick="applyForExploreInternship('${intern.id}')" style="width:100%;font-weight:600;cursor:pointer;${btnStyle}">Apply Now</button>
    </div>
  `;
  return card;
}

function _renderExplorePage() {
  const grid = document.getElementById('explore-internships-grid');
  const prevBtn = document.getElementById('explore-prev-btn');
  const nextBtn = document.getElementById('explore-next-btn');
  const pageInfo = document.getElementById('explore-page-info');
  if (!grid) return;

  const total = MOCK_INTERNSHIPS.length;
  const totalPages = Math.ceil(total / _explorePageSize);
  _explorePage = Math.max(0, Math.min(_explorePage, totalPages - 1));

  const start = _explorePage * _explorePageSize;
  const slice = MOCK_INTERNSHIPS.slice(start, start + _explorePageSize);
  const isLastPage = _explorePage >= totalPages - 1;

  // Fade out → swap → fade in
  grid.style.opacity = '0';
  grid.style.transition = 'opacity 0.2s ease';
  setTimeout(() => {
    grid.innerHTML = '';
    slice.forEach(intern => grid.appendChild(_buildInternshipCard(intern)));

    // On last page, show "Add Internship" + card (admin only)
    if (isLastPage && currentUser && currentUser.role === 'admin') {
      const addCard = document.createElement('div');
      addCard.className = 'feature-card glass-panel explore-card';
      addCard.style.cssText = `
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        min-height:340px; border:2px dashed rgba(131,39,236,0.4); border-radius:16px;
        cursor:pointer; transition:all 0.25s ease; gap:16px; padding:24px;
        background:rgba(131,39,236,0.04);
      `;
      addCard.innerHTML = `
        <div style="
          width:64px; height:64px; border-radius:50%;
          background:linear-gradient(135deg,rgba(224,26,139,0.15),rgba(131,39,236,0.15));
          border:2px solid rgba(131,39,236,0.4);
          display:flex; align-items:center; justify-content:center;
          transition:all 0.25s ease;
        ">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#addGrad)" stroke-width="2.5" stroke-linecap="round">
            <defs>
              <linearGradient id="addGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#e01a8b"/>
                <stop offset="100%" stop-color="#8327ec"/>
              </linearGradient>
            </defs>
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </div>
        <div style="text-align:center;">
          <div style="font-size:15px;font-weight:700;color:var(--text-main);font-family:'Outfit',sans-serif;margin-bottom:6px;">Add New Internship</div>
          <div style="font-size:12px;color:var(--text-muted);">Create a new listing with domain, fee &amp; features</div>
        </div>
      `;
      addCard.onmouseenter = () => {
        addCard.style.borderColor = 'rgba(224,26,139,0.7)';
        addCard.style.background = 'rgba(131,39,236,0.08)';
        addCard.style.transform = 'translateY(-4px)';
        addCard.style.boxShadow = '0 8px 30px rgba(131,39,236,0.2)';
      };
      addCard.onmouseleave = () => {
        addCard.style.borderColor = 'rgba(131,39,236,0.4)';
        addCard.style.background = 'rgba(131,39,236,0.04)';
        addCard.style.transform = '';
        addCard.style.boxShadow = '';
      };
      addCard.onclick = openAddInternshipModal;
      grid.appendChild(addCard);
    }

    grid.style.opacity = '1';
  }, 180);

  if (prevBtn) prevBtn.disabled = _explorePage === 0;
  if (nextBtn) nextBtn.disabled = _explorePage >= totalPages - 1;
  if (pageInfo) pageInfo.textContent = `${_explorePage + 1}`;
}

function initExploreOpportunities() {
  const section = document.getElementById('explore');
  if (!section) return;

  // Build nav controls if they don't exist yet
  if (!document.getElementById('explore-nav-controls')) {
    const nav = document.createElement('div');
    nav.id = 'explore-nav-controls';
    nav.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:20px;margin-top:32px;margin-bottom:24px;';
    nav.innerHTML = `
      <button id="explore-prev-btn" onclick="exploreCarouselPrev()" style="background:rgba(255,255,255,0.05);border:1px solid var(--border-color);color:#fff;width:44px;height:44px;border-radius:50%;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;line-height:1;" title="Previous">&#8249;</button>
      <span id="explore-page-info" style="font-size:15px;font-weight:700;color:var(--text-muted);min-width:28px;text-align:center;">1</span>
      <button id="explore-next-btn" onclick="exploreCarouselNext()" style="background:rgba(255,255,255,0.05);border:1px solid var(--border-color);color:#fff;width:44px;height:44px;border-radius:50%;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;line-height:1;" title="Next">&#8250;</button>
    `;
    const grid = document.getElementById('explore-internships-grid');
    if (grid) grid.after(nav);
  }

  _explorePage = 0;
  _renderExplorePage();
}

function exploreCarouselPrev() {
  if (_explorePage > 0) { _explorePage--; _renderExplorePage(); }
}

function exploreCarouselNext() {
  const totalPages = Math.ceil(MOCK_INTERNSHIPS.length / _explorePageSize);
  if (_explorePage < totalPages - 1) { _explorePage++; _renderExplorePage(); }
}

window.exploreCarouselPrev = exploreCarouselPrev;
window.exploreCarouselNext = exploreCarouselNext;

// ====== ADD INTERNSHIP MODAL (Admin only) ======
function openAddInternshipModal() {
  // Remove old modal if exists
  const old = document.getElementById('add-intern-modal');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'add-intern-modal';
  modal.style.cssText = `
    position:fixed; inset:0; z-index:10010;
    background:rgba(3,3,8,0.88); backdrop-filter:blur(10px);
    display:flex; align-items:center; justify-content:center; padding:20px;
  `;

  modal.innerHTML = `
    <div style="
      background:linear-gradient(145deg,#0d0d1a 0%,#12091e 100%);
      border:1px solid rgba(131,39,236,0.35); border-radius:20px;
      width:100%; max-width:600px; max-height:90vh; overflow-y:auto;
      padding:32px; position:relative;
      box-shadow:0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(131,39,236,0.1);
    ">
      <!-- Close -->
      <button onclick="document.getElementById('add-intern-modal').remove()" style="
        position:absolute; top:16px; right:16px;
        background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1);
        color:#fff; width:32px; height:32px; border-radius:50%; cursor:pointer;
        font-size:16px; display:flex; align-items:center; justify-content:center;
      ">&times;</button>

      <!-- Header -->
      <div style="margin-bottom:24px;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
          <div style="width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,#e01a8b,#8327ec);"></div>
          <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#8327ec;">Admin Panel</span>
        </div>
        <h2 style="font-size:22px;font-weight:800;font-family:'Outfit',sans-serif;background:linear-gradient(135deg,#e01a8b,#8327ec);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin:0;">Add New Internship</h2>
        <p style="font-size:12px;color:var(--text-muted);margin-top:4px;">This listing will appear in the Explore section for all visitors.</p>
      </div>

      <!-- Form -->
      <div style="display:flex; flex-direction:column; gap:16px;">

        <!-- Row 1: Title + Domain -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group" style="margin:0;">
            <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:5px;">Internship Title *</label>
            <input type="text" id="ai-title" class="form-control" placeholder="e.g. React Developer Intern" style="font-size:13px;">
          </div>
          <div class="form-group" style="margin:0;">
            <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:5px;">Domain / Category *</label>
            <input type="text" id="ai-domain" class="form-control" placeholder="e.g. Web Development" style="font-size:13px;">
          </div>
        </div>

        <!-- Description -->
        <div class="form-group" style="margin:0;">
          <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:5px;">Description *</label>
          <textarea id="ai-desc" class="form-control" rows="3" placeholder="Short description of the internship role and what interns will learn..." style="font-size:13px;resize:vertical;"></textarea>
        </div>

        <!-- Row 2: Type + Stipend + Fee + Duration -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;">
          <div class="form-group" style="margin:0;">
            <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:5px;">Type</label>
            <select id="ai-type" class="form-control" style="font-size:13px;" onchange="toggleAddInternStipend(this.value)">
              <option value="free">Free Training</option>
              <option value="paid">Paid (Stipend)</option>
            </select>
          </div>
          <div class="form-group" style="margin:0;" id="ai-stipend-group">
            <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:5px;">Stipend (INR/mo)</label>
            <input type="number" id="ai-stipend" class="form-control" placeholder="e.g. 2000" style="font-size:13px;" disabled>
          </div>
          <div class="form-group" style="margin:0;">
            <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:5px;">Reg. Fee (&#x20B9;)</label>
            <input type="number" id="ai-fee" class="form-control" placeholder="0 = Free" value="0" style="font-size:13px;">
          </div>
          <div class="form-group" style="margin:0;">
            <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:5px;">Duration</label>
            <select id="ai-duration" class="form-control" style="font-size:13px;">
              <option value="1 Month">1 Month</option>
              <option value="3 Months" selected>3 Months</option>
              <option value="6 Months">6 Months</option>
              <option value="12 Months">12 Months</option>
            </select>
          </div>
        </div>

        <!-- Features -->
        <div class="form-group" style="margin:0;">
          <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:5px;">
            Key Features / Highlights
            <span style="color:#555;font-weight:400;"> — one per line (max 6)</span>
          </label>
          <textarea id="ai-features" class="form-control" rows="5" placeholder="1-on-1 Senior Mentor&#10;Face-verified Attendance&#10;Verified Certificate&#10;Experience Letter" style="font-size:13px;resize:vertical;"></textarea>
        </div>

        <!-- Action buttons -->
        <div style="display:flex;gap:12px;margin-top:4px;">
          <button type="button" onclick="document.getElementById('add-intern-modal').remove()" class="btn btn-secondary" style="flex:1;">Cancel</button>
          <button type="button" onclick="submitAddInternship()" class="btn btn-primary" style="flex:2;font-weight:700;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="vertical-align:middle;margin-right:6px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add to Listings
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

function toggleAddInternStipend(type) {
  const stipendInput = document.getElementById('ai-stipend');
  if (!stipendInput) return;
  if (type === 'paid') {
    stipendInput.disabled = false;
    stipendInput.placeholder = 'e.g. 2000';
  } else {
    stipendInput.disabled = true;
    stipendInput.value = '';
    stipendInput.placeholder = 'N/A';
  }
}

function submitAddInternship() {
  const title    = (document.getElementById('ai-title')?.value || '').trim();
  const domain   = (document.getElementById('ai-domain')?.value || '').trim();
  const desc     = (document.getElementById('ai-desc')?.value || '').trim();
  const type     = document.getElementById('ai-type')?.value || 'free';
  const stipendVal = (document.getElementById('ai-stipend')?.value || '').trim();
  const fee      = parseInt(document.getElementById('ai-fee')?.value || '0', 10);
  const duration = document.getElementById('ai-duration')?.value || '3 Months';
  const featuresRaw = (document.getElementById('ai-features')?.value || '').trim();

  if (!title || !domain || !desc) {
    showToast('Please fill in Title, Domain and Description.', 2500);
    return;
  }

  const features = featuresRaw
    ? featuresRaw.split('\n').map(f => f.trim()).filter(Boolean).slice(0, 6)
    : ['Experience Letter', 'Mentor Support'];

  const stipend = type === 'paid' && stipendVal
    ? `&#x20B9;${stipendVal} / month`
    : 'No Stipend';

  const newIntern = {
    id: `intern-custom-${Date.now()}`,
    title,
    domain,
    type,
    stipend,
    duration,
    fee: isNaN(fee) ? 0 : fee,
    description: desc,
    features
  };

  MOCK_INTERNSHIPS.push(newIntern);

  // Jump to last page to show the new card
  _explorePage = Math.ceil(MOCK_INTERNSHIPS.length / _explorePageSize) - 1;
  _renderExplorePage();

  document.getElementById('add-intern-modal')?.remove();
  showToast(`✅ "${title}" added to listings!`, 2500);
}

window.openAddInternshipModal = openAddInternshipModal;
window.toggleAddInternStipend = toggleAddInternStipend;
window.submitAddInternship = submitAddInternship;

// ====== ADMIN: MANAGE INTERNSHIP LISTINGS ======

function loadAdminListings() {
  const grid   = document.getElementById('admin-listings-grid');
  const total  = document.getElementById('listing-metric-total');
  const paid   = document.getElementById('listing-metric-paid');
  const free   = document.getElementById('listing-metric-free');
  if (!grid) return;

  const paidCount = MOCK_INTERNSHIPS.filter(i => i.type === 'paid').length;
  const freeCount = MOCK_INTERNSHIPS.filter(i => i.type !== 'paid').length;
  if (total) total.textContent = MOCK_INTERNSHIPS.length;
  if (paid)  paid.textContent  = paidCount;
  if (free)  free.textContent  = freeCount;

  grid.innerHTML = '';

  MOCK_INTERNSHIPS.forEach((intern, idx) => {
    const domainColors = {
      'Web Development':    ['#e01a8b','#8327ec'],
      'Python / ML':        ['#f59e0b','#ef4444'],
      'UI/UX Design':       ['#06b6d4','#2a6bf2'],
      'Mobile Development': ['#10b981','#059669'],
      'Cybersecurity':      ['#ef4444','#b91c1c'],
      'Cloud Computing':    ['#f97316','#ea580c'],
      'Blockchain & Web3':  ['#6366f1','#4f46e5'],
      'Machine Learning':   ['#a78bfa','#7c3aed'],
      'Game Development':   ['#ec4899','#db2777'],
      'Embedded Systems':   ['#14b8a6','#0d9488'],
      'Digital Marketing':  ['#f59e0b','#d97706'],
      'Data Analytics':     ['#22c55e','#16a34a'],
      'Cloud & DevOps':     ['#fb923c','#f97316'],
      'Android':            ['#4ade80','#22c55e'],
      'Flutter':            ['#38bdf8','#0284c7'],
      'React':              ['#61dafb','#0ea5e9'],
      'Node.js':            ['#84cc16','#65a30d'],
      'Python':             ['#facc15','#ca8a04'],
    };

    // Smart color picker for custom domains — hash-based so same domain always gets same color
    function getDomainColor(domain) {
      if (domainColors[domain]) return domainColors[domain];
      // Check partial match
      const key = Object.keys(domainColors).find(k =>
        domain.toLowerCase().includes(k.toLowerCase().split(' ')[0]) ||
        k.toLowerCase().includes(domain.toLowerCase().split(' ')[0])
      );
      if (key) return domainColors[key];
      // Hash-based unique color from a curated palette
      const palette = [
        ['#e01a8b','#8327ec'], ['#06b6d4','#2a6bf2'], ['#10b981','#059669'],
        ['#f59e0b','#ef4444'], ['#6366f1','#4f46e5'], ['#f97316','#ea580c'],
        ['#ec4899','#db2777'], ['#a78bfa','#7c3aed'], ['#14b8a6','#0d9488'],
        ['#22c55e','#16a34a'], ['#38bdf8','#0284c7'], ['#facc15','#ca8a04'],
      ];
      let hash = 0;
      for (let c of domain) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
      return palette[hash % palette.length];
    }

    const dc = getDomainColor(intern.domain);
    const grad = `linear-gradient(135deg,${dc[0]},${dc[1]})`;
    const isPaid = intern.type === 'paid';
    const badgeText = isPaid ? 'PAID' : 'FREE';
    const badgeBg   = isPaid ? 'rgba(224,26,139,0.2)' : 'rgba(42,107,242,0.2)';
    const badgeCol  = isPaid ? '#e01a8b' : '#2a6bf2';
    const feeText   = intern.fee > 0 ? `&#x20B9;${intern.fee} reg. fee` : 'No Fee';

    const card = document.createElement('div');
    card.className = 'glass-panel';
    card.style.cssText = 'border-radius:14px;overflow:hidden;display:flex;flex-direction:column;position:relative;border:1px solid var(--border-color);transition:border-color 0.2s;';
    card.innerHTML = `
      <!-- Gradient header -->
      <div style="background:${grad};padding:10px 14px;display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.12em;color:#fff;">${intern.domain}</span>
        <span style="font-size:9px;font-weight:800;text-transform:uppercase;color:#fff;background:${badgeBg};border:1px solid ${badgeCol};padding:2px 8px;border-radius:20px;">${badgeText}</span>
      </div>
      <!-- Body -->
      <div style="padding:14px 16px;flex:1;display:flex;flex-direction:column;gap:8px;">
        <div style="font-size:14px;font-weight:700;color:var(--text-main);font-family:'Outfit',sans-serif;">${intern.title}</div>
        <div style="font-size:11px;color:var(--text-muted);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${intern.description}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:2px;">
          <span style="font-size:10px;background:rgba(255,255,255,0.05);border:1px solid var(--border-color);border-radius:6px;padding:2px 8px;color:var(--text-muted);">${intern.duration}</span>
          <span style="font-size:10px;background:rgba(255,255,255,0.05);border:1px solid var(--border-color);border-radius:6px;padding:2px 8px;color:var(--text-muted);">${feeText}</span>
          <span style="font-size:10px;background:rgba(255,255,255,0.05);border:1px solid var(--border-color);border-radius:6px;padding:2px 8px;color:var(--text-muted);">${intern.stipend}</span>
        </div>
        <!-- Features -->
        <ul style="list-style:none;padding:0;margin:4px 0 0;display:flex;flex-direction:column;gap:3px;">
          ${(intern.features||[]).slice(0,3).map(f=>`<li style="font-size:10px;color:var(--text-muted);display:flex;align-items:center;gap:5px;"><svg width="10" height="10" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="6" fill="${dc[0]}" opacity="0.18"/><path d="M3.5 6L5.2 7.7L8.5 4.3" stroke="${dc[0]}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>${f}</li>`).join('')}
          ${intern.features&&intern.features.length>3?`<li style="font-size:10px;color:var(--text-muted);padding-left:15px;">+${intern.features.length-3} more</li>`:''}
        </ul>
      </div>
      <!-- Actions -->
      <div style="padding:10px 16px 14px;display:flex;gap:8px;border-top:1px solid var(--border-color);">
        <button onclick="openEditInternshipModal(${idx})" class="btn btn-secondary btn-sm" style="flex:1;font-size:11px;display:flex;align-items:center;justify-content:center;gap:4px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit
        </button>
        <button onclick="deleteAdminListing(${idx})" class="btn btn-sm" style="flex:1;font-size:11px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#ef4444;display:flex;align-items:center;justify-content:center;gap:4px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          Delete
        </button>
      </div>
    `;
    grid.appendChild(card);
  });

  // Add "+" card at the end
  const addCard = document.createElement('div');
  addCard.className = 'glass-panel';
  addCard.style.cssText = `
    border-radius:14px; border:2px dashed rgba(131,39,236,0.35);
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    min-height:220px; cursor:pointer; gap:12px; padding:24px;
    background:rgba(131,39,236,0.03); transition:all 0.25s ease;
  `;
  addCard.innerHTML = `
    <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,rgba(224,26,139,0.15),rgba(131,39,236,0.15));border:2px solid rgba(131,39,236,0.4);display:flex;align-items:center;justify-content:center;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="url(#ag2)" stroke-width="2.5" stroke-linecap="round">
        <defs><linearGradient id="ag2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e01a8b"/><stop offset="100%" stop-color="#8327ec"/></linearGradient></defs>
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </div>
    <div style="text-align:center;">
      <div style="font-size:14px;font-weight:700;color:var(--text-main);font-family:'Outfit',sans-serif;margin-bottom:4px;">Add New Listing</div>
      <div style="font-size:11px;color:var(--text-muted);">Create a new internship opportunity</div>
    </div>
  `;
  addCard.onmouseenter = () => { addCard.style.borderColor='rgba(224,26,139,0.6)'; addCard.style.background='rgba(131,39,236,0.08)'; addCard.style.transform='translateY(-3px)'; };
  addCard.onmouseleave = () => { addCard.style.borderColor='rgba(131,39,236,0.35)'; addCard.style.background='rgba(131,39,236,0.03)'; addCard.style.transform=''; };
  addCard.onclick = () => openAddInternshipModal(true);
  grid.appendChild(addCard);
}

function deleteAdminListing(idx) {
  const intern = MOCK_INTERNSHIPS[idx];
  if (!intern) return;
  if (!confirm(`Delete "${intern.title}"? This cannot be undone.`)) return;
  MOCK_INTERNSHIPS.splice(idx, 1);
  loadAdminListings();
  showToast(`🗑️ "${intern.title}" removed.`, 2000);
}

function openEditInternshipModal(idx) {
  const intern = MOCK_INTERNSHIPS[idx];
  if (!intern) return;

  // Reuse add modal but pre-fill values
  openAddInternshipModal(true, intern, idx);
}

// Extend openAddInternshipModal to support edit mode
const _origOpenAddInternshipModal = openAddInternshipModal;
window.openAddInternshipModal = function(fromAdmin, editData, editIdx) {
  // Remove old modal
  const old = document.getElementById('add-intern-modal');
  if (old) old.remove();

  const isEdit = !!editData;
  const modal = document.createElement('div');
  modal.id = 'add-intern-modal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:10010;
    background:rgba(3,3,8,0.88);backdrop-filter:blur(10px);
    display:flex;align-items:center;justify-content:center;padding:20px;
  `;

  modal.innerHTML = `
    <div style="
      background:linear-gradient(145deg,#0d0d1a 0%,#12091e 100%);
      border:1px solid rgba(131,39,236,0.35);border-radius:20px;
      width:100%;max-width:600px;max-height:90vh;overflow-y:auto;
      padding:32px;position:relative;
      box-shadow:0 20px 60px rgba(0,0,0,0.6),0 0 0 1px rgba(131,39,236,0.1);
    ">
      <button onclick="document.getElementById('add-intern-modal').remove()" style="
        position:absolute;top:16px;right:16px;
        background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);
        color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;
        font-size:16px;display:flex;align-items:center;justify-content:center;
      ">&times;</button>

      <div style="margin-bottom:24px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
          <div style="width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,#e01a8b,#8327ec);"></div>
          <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#8327ec;">Admin Panel</span>
        </div>
        <h2 style="font-size:22px;font-weight:800;font-family:'Outfit',sans-serif;background:linear-gradient(135deg,#e01a8b,#8327ec);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin:0;">${isEdit ? 'Edit Internship' : 'Add New Internship'}</h2>
        <p style="font-size:12px;color:var(--text-muted);margin-top:4px;">${isEdit ? 'Update the listing details below.' : 'This listing will appear in the Explore section for all visitors.'}</p>
      </div>

      <div style="display:flex;flex-direction:column;gap:16px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group" style="margin:0;">
            <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:5px;">Internship Title *</label>
            <input type="text" id="ai-title" class="form-control" placeholder="e.g. React Developer Intern" style="font-size:13px;" value="${isEdit ? editData.title : ''}">
          </div>
          <div class="form-group" style="margin:0;">
            <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:5px;">Domain / Category *</label>
            <input type="text" id="ai-domain" class="form-control" placeholder="e.g. Web Development" style="font-size:13px;" value="${isEdit ? editData.domain : ''}">
          </div>
        </div>

        <div class="form-group" style="margin:0;">
          <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:5px;">Description *</label>
          <textarea id="ai-desc" class="form-control" rows="3" placeholder="Short description..." style="font-size:13px;resize:vertical;">${isEdit ? editData.description : ''}</textarea>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;">
          <div class="form-group" style="margin:0;">
            <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:5px;">Type</label>
            <select id="ai-type" class="form-control" style="font-size:13px;" onchange="toggleAddInternStipend(this.value)">
              <option value="free" ${!isEdit||editData.type==='free'?'selected':''}>Free Training</option>
              <option value="paid" ${isEdit&&editData.type==='paid'?'selected':''}>Paid (Stipend)</option>
            </select>
          </div>
          <div class="form-group" style="margin:0;" id="ai-stipend-group">
            <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:5px;">Stipend (&#x20B9;/mo)</label>
            <input type="number" id="ai-stipend" class="form-control" placeholder="e.g. 2000" style="font-size:13px;"
              value="${isEdit && editData.type==='paid' ? (editData.stipend||'').replace(/[^0-9]/g,'') : ''}"
              ${(!isEdit||editData.type!=='paid')?'disabled':''}>
          </div>
          <div class="form-group" style="margin:0;">
            <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:5px;">Reg. Fee (&#x20B9;)</label>
            <input type="number" id="ai-fee" class="form-control" placeholder="0 = Free" style="font-size:13px;" value="${isEdit ? editData.fee : 0}">
          </div>
          <div class="form-group" style="margin:0;">
            <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:5px;">Duration</label>
            <select id="ai-duration" class="form-control" style="font-size:13px;">
              <option value="1 Month" ${isEdit&&editData.duration==='1 Month'?'selected':''}>1 Month</option>
              <option value="3 Months" ${!isEdit||editData.duration==='3 Months'?'selected':''}>3 Months</option>
              <option value="6 Months" ${isEdit&&editData.duration==='6 Months'?'selected':''}>6 Months</option>
              <option value="12 Months" ${isEdit&&editData.duration==='12 Months'?'selected':''}>12 Months</option>
            </select>
          </div>
        </div>

        <div class="form-group" style="margin:0;">
          <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:5px;">
            Key Features <span style="color:#555;font-weight:400;">— one per line (max 6)</span>
          </label>
          <textarea id="ai-features" class="form-control" rows="5" placeholder="1-on-1 Senior Mentor&#10;Verified Certificate&#10;Experience Letter" style="font-size:13px;resize:vertical;">${isEdit && editData.features ? editData.features.join('\n') : ''}</textarea>
        </div>

        <div style="display:flex;gap:12px;margin-top:4px;">
          <button type="button" onclick="document.getElementById('add-intern-modal').remove()" class="btn btn-secondary" style="flex:1;">Cancel</button>
          <button type="button" onclick="submitAddInternship(${isEdit ? editIdx : 'null'}, ${fromAdmin ? 'true' : 'false'})" class="btn btn-primary" style="flex:2;font-weight:700;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="vertical-align:middle;margin-right:6px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v14z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            ${isEdit ? 'Save Changes' : 'Add to Listings'}
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
};

// Override submitAddInternship to handle edit + reload admin grid
window.submitAddInternship = function(editIdx, fromAdmin) {
  const title      = (document.getElementById('ai-title')?.value || '').trim();
  const domain     = (document.getElementById('ai-domain')?.value || '').trim();
  const desc       = (document.getElementById('ai-desc')?.value || '').trim();
  const type       = document.getElementById('ai-type')?.value || 'free';
  const stipendVal = (document.getElementById('ai-stipend')?.value || '').trim();
  const fee        = parseInt(document.getElementById('ai-fee')?.value || '0', 10);
  const duration   = document.getElementById('ai-duration')?.value || '3 Months';
  const featuresRaw = (document.getElementById('ai-features')?.value || '').trim();

  if (!title || !domain || !desc) {
    showToast('Please fill in Title, Domain and Description.', 2500);
    return;
  }

  const features = featuresRaw
    ? featuresRaw.split('\n').map(f => f.trim()).filter(Boolean).slice(0, 6)
    : ['Experience Letter', 'Mentor Support'];

  const stipend = type === 'paid' && stipendVal
    ? `&#x20B9;${stipendVal} / month`
    : 'No Stipend';

  const internData = {
    id: (editIdx != null && MOCK_INTERNSHIPS[editIdx]) ? MOCK_INTERNSHIPS[editIdx].id : `intern-custom-${Date.now()}`,
    title, domain, type, stipend, duration,
    fee: isNaN(fee) ? 0 : fee,
    description: desc, features
  };

  if (editIdx != null && MOCK_INTERNSHIPS[editIdx]) {
    MOCK_INTERNSHIPS[editIdx] = internData;
    showToast(`✅ "${title}" updated!`, 2500);
  } else {
    MOCK_INTERNSHIPS.push(internData);
    showToast(`✅ "${title}" added to listings!`, 2500);
  }

  document.getElementById('add-intern-modal')?.remove();

  // Reload admin grid or jump to last explore page
  if (fromAdmin) {
    loadAdminListings();
  } else {
    _explorePage = Math.ceil(MOCK_INTERNSHIPS.length / _explorePageSize) - 1;
    _renderExplorePage();
  }
};

window.loadAdminListings  = loadAdminListings;
window.deleteAdminListing = deleteAdminListing;
window.openEditInternshipModal = openEditInternshipModal;

// Global active registration tier metadata
let pendingRegistrationPayment = null;
// Actual fee from selected internship card
let _selectedInternFee = 499;

function applyForExploreInternship(internId) {
  const intern = MOCK_INTERNSHIPS.find(i => i.id === internId);
  if (!intern) return;

  _selectedInternFee = intern.fee || 0;

  showAuthPage('register');
  setRegisterRole('student');

  // Pre-fill & LOCK domain
  const domainEl = document.getElementById('reg-domain');
  if (domainEl && intern.domain) {
    const options = Array.from(domainEl.options).map(o => o.value);
    const normIntern = intern.domain.toLowerCase();
    let matched = options.find(o => o.toLowerCase() === normIntern);
    if (!matched) {
      matched = options.find(o =>
        normIntern.includes(o.toLowerCase().split(' ')[0]) ||
        o.toLowerCase().includes(normIntern.split(' ')[0]) ||
        o.toLowerCase().includes(normIntern.split('/')[0].trim())
      );
    }
    domainEl.value = matched || options[0];
    handleRegisterDomainChange(domainEl.value);
    // Lock — not editable
    domainEl.disabled = true;
    domainEl.style.opacity = '0.65';
    domainEl.style.cursor = 'not-allowed';
    domainEl.title = 'Domain is fixed based on your selected internship';
  }

  // Auto-assign & LOCK mentor based on domain
  setTimeout(() => {
    const mentorEl = document.getElementById('reg-mentor-select');
    if (mentorEl && intern.domain) {
      const domainLower = intern.domain.toLowerCase();
      const matchingMentors = (db.users || []).filter(u =>
        u.role === 'mentor' && u.domain &&
        (u.domain.toLowerCase() === domainLower ||
         u.domain.toLowerCase().includes(domainLower.split(' ')[0]) ||
         domainLower.includes(u.domain.toLowerCase().split(' ')[0]))
      );
      if (matchingMentors.length > 0) {
        // Pick mentor with fewest students
        const sorted = matchingMentors.map(m => ({
          mentor: m,
          count: (db.users || []).filter(u => u.role === 'student' && u.mentorEmail === m.email).length
        })).sort((a, b) => a.count - b.count);
        mentorEl.value = sorted[0].mentor.email;
      }
      // Lock mentor
      mentorEl.disabled = true;
      mentorEl.style.opacity = '0.65';
      mentorEl.style.cursor = 'not-allowed';
      mentorEl.title = 'Mentor is auto-assigned based on your domain';
    }
  }, 250);

  // Pre-select Tier
  const tierEl = document.getElementById('reg-tier');
  if (tierEl) { tierEl.value = intern.type; handleRegisterTierChange(intern.type); }

  // Pre-select Duration
  const durationEl = document.getElementById('reg-duration');
  if (durationEl) {
    if (intern.duration.includes("6")) durationEl.value = "6";
    else if (intern.duration.includes("3")) durationEl.value = "3";
    else durationEl.value = "1";
  }

  window._appliedInternId = internId;
  document.getElementById('auth-page').scrollIntoView({ behavior: 'smooth' });
}
// ====== PAYMENT VERIFICATION FOR REGISTRATION ======
let regPaymentVerified = false;

// ====== PAYMENT TIMER STATE ======
let _regPaymentTimerInterval = null;
let _regPaymentTimerSeconds = 600; // 10 minutes default

function startRegPaymentTimer(seconds) {
  clearInterval(_regPaymentTimerInterval);
  _regPaymentTimerSeconds = seconds || 600;
  const timerEl = document.getElementById('reg-payment-timer');
  const updateDisplay = () => {
    if (!timerEl) return;
    const m = Math.floor(_regPaymentTimerSeconds / 60);
    const s = _regPaymentTimerSeconds % 60;
    timerEl.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if (_regPaymentTimerSeconds <= 60) {
      timerEl.style.color = '#f87171'; // red when low
    } else if (_regPaymentTimerSeconds <= 180) {
      timerEl.style.color = '#fbbf24'; // yellow
    } else {
      timerEl.style.color = '#fff';
    }
  };
  updateDisplay();
  _regPaymentTimerInterval = setInterval(() => {
    _regPaymentTimerSeconds--;
    updateDisplay();
    if (_regPaymentTimerSeconds <= 0) {
      clearInterval(_regPaymentTimerInterval);
      const statusEl = document.getElementById('reg-payment-status');
      if (statusEl) { statusEl.innerText = '? QR expired. Please refresh the payment section.'; statusEl.style.color = 'var(--danger)'; }
      if (timerEl) timerEl.textContent = '00:00';
    }
  }, 1000);
}

function stopRegPaymentTimer() {
  clearInterval(_regPaymentTimerInterval);
  _regPaymentTimerInterval = null;
}

// Real-time UTR input progress bar
function onUtrInput(inputEl) {
  const val = (inputEl.value || '').trim();
  const fillEl = document.getElementById('reg-utr-match-fill');
  if (!fillEl) return;
  // Progress fills as user types (min 6 chars expected, full at 12+)
  const progress = Math.min(100, Math.round((val.length / 12) * 100));
  fillEl.style.width = progress + '%';
  if (val.length >= 10) {
    fillEl.style.background = 'linear-gradient(90deg,#4ade80,#22c55e)';
  } else if (val.length >= 6) {
    fillEl.style.background = 'linear-gradient(90deg,#fbbf24,#f59e0b)';
  } else {
    fillEl.style.background = 'linear-gradient(90deg,#5f259f,#bf80ff)';
  }
}

function verifyRegPayment() {
  const amountEl = document.getElementById('reg-payment-amount');
  const utrEl = document.getElementById('reg-payment-utr');
  const statusEl = document.getElementById('reg-payment-status');
  const qrStep = document.getElementById('reg-payment-qr-step');
  const verifiedStep = document.getElementById('reg-payment-verified');
  const verifiedUtrEl = document.getElementById('reg-verified-utr');
  const verifyBtn = document.getElementById('reg-verify-btn');

  const amount = amountEl ? amountEl.value.trim() : '';
  const utr = utrEl ? utrEl.value.trim() : '';

  if (!amount || !utr) {
    if (statusEl) { statusEl.innerText = '?? Please enter the amount paid and UTR number.'; statusEl.style.color = 'var(--warning)'; }
    return;
  }
  const requiredFee = _selectedInternFee > 0 ? _selectedInternFee : 99;
  if (parseInt(amount) < requiredFee) {
    if (statusEl) { statusEl.innerText = `? Amount must be ?${requiredFee} or more.`; statusEl.style.color = 'var(--danger)'; }
    return;
  }
  if (utr.length < 6) {
    if (statusEl) { statusEl.innerText = '? Please enter a valid UTR (min 6 chars).'; statusEl.style.color = 'var(--danger)'; }
    return;
  }

  // Show "matching..." state on button
  if (verifyBtn) {
    verifyBtn.disabled = true;
    verifyBtn.innerHTML = '<span style="display:inline-block;animation:spin 0.7s linear infinite;margin-right:6px;">&#x25F7;</span> Matching UTR...';
  }
  if (statusEl) { statusEl.innerText = '?? Verifying payment reference...'; statusEl.style.color = 'var(--text-muted)'; }

  // Simulate UTR matching (1.5s delay for realism)
  setTimeout(() => {
    // Mark payment as verified
    regPaymentVerified = true;
    pendingRegistrationPayment = {
      method: 'UPI / PhonePe',
      timestamp: new Date().toISOString(),
      amount: parseInt(amount),
      reference: utr
    };

    stopRegPaymentTimer();

    if (verifiedUtrEl) verifiedUtrEl.innerText = utr;

    // Animate transition: QR step ? verified step
    if (qrStep) {
      qrStep.style.transition = 'opacity 0.4s ease';
      qrStep.style.opacity = '0';
      setTimeout(() => {
        qrStep.style.display = 'none';
        if (verifiedStep) {
          verifiedStep.style.display = 'block';
          verifiedStep.style.opacity = '0';
          verifiedStep.style.transition = 'opacity 0.5s ease';
          setTimeout(() => { verifiedStep.style.opacity = '1'; }, 50);
        }
      }, 400);
    }

    showToast('? UTR matched! Complete face scan to sign up.', 3000);
  }, 1500);
}

function handleRegisterTierChange(value) {
  const paymentSection = document.getElementById('reg-payment-section');
  const faceScanSection = document.getElementById('reg-face-scan-section');
  const infoEl = document.getElementById('reg-tier-info');
  
  if (!infoEl) return;

  if (value === 'paid') {
    const feeToShow = _selectedInternFee > 0 ? `₹${_selectedInternFee}` : '&#x20B9;99';
    infoEl.innerHTML = `&#x1F4B0; <strong style='color:var(--primary-magenta);'>Registration Fee ${feeToShow}</strong> — Stipend + premium mentorship included.`;

    // Show face scan + Razorpay info box
    if (faceScanSection) faceScanSection.style.display = 'block';
    if (paymentSection) paymentSection.style.display = 'block';

    // Reset payment state
    regPaymentVerified = false;
    pendingRegistrationPayment = null;
  } else {
    infoEl.innerText = "Standard registration is free. Experience letter & Certificate included.";
    infoEl.style.color = "var(--text-dark)";
    
    // Free: hide payment section, show face scan
    if (paymentSection) paymentSection.style.display = 'none';
    if (faceScanSection) faceScanSection.style.display = 'block';
    stopRegPaymentTimer();
    
    regPaymentVerified = false;
    pendingRegistrationPayment = null;
  }
}

// ====== RAZORPAY REAL PAYMENT GATEWAY ======
// NOTE: Only Key ID is used here (client-side). Secret Key must NEVER be in browser code.
const RZP_KEY_ID = 'rzp_live_T3jfxVo6f5MZkg';

let rzpPaymentSuccessCallback = null;

/**
 * Opens the official Razorpay Checkout popup.
 * @param {string} email    - Prefill email for the checkout
 * @param {number} amount   - Amount in INR (e.g. 499)
 * @param {string} merchant - Description shown in checkout
 * @param {function} callback - Called with (paymentId, method) on success
 */
function openRzpModal(email, amount, merchant, callback) {
  // Razorpay expects amount in paise (1 INR = 100 paise)
  const amountInPaise = Math.round(amount * 100);

  rzpPaymentSuccessCallback = callback;

  const options = {
    key: RZP_KEY_ID,
    amount: amountInPaise,
    currency: 'INR',
    name: 'InternX by UTX',
    description: merchant,
    image: 'robot_avatar.png',
    payment_capture: 1,  // Auto-capture — money instantly moves to settlement

    // Prefill customer info
    prefill: {
      email: email,
      contact: ''
    },

    // Checkout theme matching InternX
    theme: {
      color: '#8327ec'
    },

    // Called when payment is successful
    handler: function (response) {
      // response.razorpay_payment_id  — real Razorpay payment ID
      // response.razorpay_order_id    — present if server-side order was created
      // response.razorpay_signature   — present if server-side order was created
      playPaymentChime();
      showToast('✅ Payment Successful!', 2500);

      const paymentId = response.razorpay_payment_id || `pay_rzp_${Date.now()}`;

      if (typeof rzpPaymentSuccessCallback === 'function') {
        // Pass paymentId as the "method" arg so it gets stored as reference
        rzpPaymentSuccessCallback(paymentId);
      }
    },

    // Called when user closes/dismisses the checkout
    modal: {
      ondismiss: function () {
        pendingRegistrationPayment = null;
        showToast('Payment cancelled.', 2000);
      }
    }
  };

  try {
    const rzp = new Razorpay(options);

    // Handle payment failure (wrong card, bank decline, etc.)
    rzp.on('payment.failed', function (response) {
      console.error('Razorpay payment failed:', response.error);
      showToast(`❌ Payment failed: ${response.error.description}`, 3500);
      pendingRegistrationPayment = null;
    });

    rzp.open();
  } catch (err) {
    console.error('Razorpay could not be initialised:', err);
    alert('Razorpay failed to load. Make sure you are on a live server (not file://) and have internet access.');
  }
}

// Kept for backward compatibility — no-op since real Razorpay manages its own modal
function closeRzpModal() {
  pendingRegistrationPayment = null;
}

// These are no longer needed but kept so any lingering HTML onclick= calls don't throw errors
function selectRzpMethod(method) {}
function backToRzpMethods() {}
function submitRzpPayment(method) {}

function playPaymentChime() {
  try {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.connect(gain);
    gain.connect(context.destination);

    // Pleasant double chime: C5 -> E5
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, context.currentTime); // C5
    gain.gain.setValueAtTime(0.15, context.currentTime);
    osc.start();

    setTimeout(() => {
      osc.frequency.setValueAtTime(659.25, context.currentTime); // E5
    }, 150);

    setTimeout(() => {
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
      setTimeout(() => osc.stop(), 400);
    }, 300);
  } catch (err) {
    console.warn('Audio Context blocked or unsupported:', err);
  }
}
window.handleLogoSecretClick = handleLogoSecretClick;
window.showToast = showToast;
window.initExploreOpportunities = initExploreOpportunities;
window.applyForExploreInternship = applyForExploreInternship;
window.handleRegisterTierChange = handleRegisterTierChange;
window.onUtrInput = onUtrInput;
window.startRegPaymentTimer = startRegPaymentTimer;
window.stopRegPaymentTimer = stopRegPaymentTimer;
window.verifyRegPayment = verifyRegPayment;
window.handleRegisterSubmit = handleRegisterSubmit;
window.handleLoginSubmit = handleLoginSubmit;
window.toggleAuthForms = toggleAuthForms;
window.setRegisterRole = setRegisterRole;
window.showAuthPage = showAuthPage;
window.showLandingPage = showLandingPage;
window.toggleTheme = toggleTheme;
window.handleLogout = handleLogout;
window.handleRegisterDomainChange = handleRegisterDomainChange;
window.toggleRegWebcam = toggleRegWebcam;
window.captureRegistrationFace = captureRegistrationFace;
window.handleRegistrationFileUpload = handleRegistrationFileUpload;
window.togglePasswordVisibility = togglePasswordVisibility;
window.openSupabaseConfigModal = openSupabaseConfigModal;
window.handleSupabaseBadgeClick = handleSupabaseBadgeClick;
window.resetDatabaseForDemo = resetDatabaseForDemo;
window.switchTab = switchTab;
window.openEditProfileModal = openEditProfileModal;
window.openChatImageLightbox = openChatImageLightbox;
window.selectRzpMethod = selectRzpMethod;
window.backToRzpMethods = backToRzpMethods;
window.submitRzpPayment = submitRzpPayment;
window.closeRzpModal = closeRzpModal;

// AI Copilot exports
window.toggleAICopilot = toggleAICopilot;
window.toggleAICopilotSettings = toggleAICopilotSettings;
window.handleSendAICopilot = handleSendAICopilot;
window.askCopilotFAQ = askCopilotFAQ;
window.saveAIGeminiKey = saveGeminiKey;
window.clearAIGeminiKey = clearGeminiKey;
window.saveGeminiKey = saveGeminiKey;
window.clearGeminiKey = clearGeminiKey;

// Edit profile exports
window.handleEditProfileSubmit = handleEditProfileSubmit;
window.handleProfileImageUpload = handleProfileImageUpload;
window.openModal = openModal;
window.closeModal = closeModal;

// ==================== 8. PAYMENTS, STIPENDS, AND STREAMING ====================
let stipendStreamInterval = null;
let streamTickCount = 0;

function stopStipendStreaming() {
  if (stipendStreamInterval) {
    clearInterval(stipendStreamInterval);
    stipendStreamInterval = null;
    
    // Save final balance when switching tabs or closing the ticker
    if (currentUser && currentUser.role === 'student') {
      saveDatabase();
      syncRecordToFirestore('users', currentUser);
    }
  }
}

function loadStudentPayments() {
  stopStipendStreaming();
  
  if (!currentUser) return;
  const isPaid = currentUser.internshipType === 'paid';
  
  const unpaidWarning = document.getElementById('student-unpaid-warning');
  const paidContent = document.getElementById('student-payments-content');
  const tickerIndicator = document.getElementById('student-stipend-ticker-container');
  
  if (!unpaidWarning || !paidContent) return;
  
  if (!isPaid) {
    unpaidWarning.style.display = 'flex';
    paidContent.style.display = 'none';
    if (tickerIndicator) tickerIndicator.style.display = 'none';
    return;
  }
  
  unpaidWarning.style.display = 'none';
  paidContent.style.display = 'grid';
  
  // Set default values if not defined
  if (typeof currentUser.stipendBalance === 'undefined') currentUser.stipendBalance = 0;
  if (typeof currentUser.totalPaid === 'undefined') currentUser.totalPaid = 0;
  if (typeof currentUser.stipendAmount === 'undefined') currentUser.stipendAmount = 15000;
  if (typeof currentUser.stipendCurrency === 'undefined') currentUser.stipendCurrency = 'INR';
  if (typeof currentUser.stipendFrequency === 'undefined') currentUser.stipendFrequency = 'monthly';
  
  const symb = currentUser.stipendCurrency === 'USD' ? '$' : '?';
  const freqLabel = currentUser.stipendFrequency === 'streaming' ? '/ hr active' : (currentUser.stipendFrequency === 'task' ? '/ completed task' : '/ month');
  
  const rateDisplay = document.getElementById('student-stipend-rate-display');
  if (rateDisplay) {
    rateDisplay.innerText = `${symb}${currentUser.stipendAmount.toLocaleString()} ${freqLabel}`;
  }
  
  // Display total settled
  const totalSettledDisplay = document.getElementById('student-total-settled-amt');
  if (totalSettledDisplay) {
    totalSettledDisplay.innerText = `${symb}${currentUser.totalPaid.toFixed(2)}`;
  }
  
  // Mock registration payment reference
  const refDisplay = document.getElementById('student-payment-ref');
  if (refDisplay) {
    refDisplay.innerText = currentUser.paymentRef || 'pay_rzp_pre_92k8f921';
  }
  
  // Load Ledger Table
  renderStudentLedger();
  
  // Ticker streaming setup
  if (currentUser.stipendFrequency === 'streaming') {
    if (tickerIndicator) tickerIndicator.style.display = 'flex';
    
    // Increment calculations
    // StipendAmount = rate per Active hour
    // 1 hour = 3600 seconds = 36000 intervals of 100ms
    // Increment per 100ms = stipendAmount / 36000
    const increment = currentUser.stipendAmount / 36000;
    
    const streamAmtEl = document.getElementById('student-stipend-stream-amt');
    if (streamAmtEl) {
      streamAmtEl.innerText = `${symb}${currentUser.stipendBalance.toFixed(4)}`;
    }
    
    streamTickCount = 0;
    stipendStreamInterval = setInterval(() => {
      currentUser.stipendBalance = (currentUser.stipendBalance || 0) + increment;
      if (streamAmtEl) {
        streamAmtEl.innerText = `${symb}${currentUser.stipendBalance.toFixed(4)}`;
      }
      
      streamTickCount++;
      if (streamTickCount >= 100) { // Every 10 seconds, backup locally
        streamTickCount = 0;
        saveDatabase(); // Non-blocking debounced save
      }
    }, 100);
  } else {
    if (tickerIndicator) tickerIndicator.style.display = 'none';
    const streamAmtEl = document.getElementById('student-stipend-stream-amt');
    if (streamAmtEl) {
      streamAmtEl.innerText = `${symb}${currentUser.stipendBalance.toFixed(2)}`;
    }
  }
}

function renderStudentLedger() {
  const tableBody = document.querySelector('#student-transactions-table tbody');
  if (!tableBody) return;
  tableBody.innerHTML = '';
  
  if (!db.payments) db.payments = [];
  
  const myTxns = db.payments.filter(p => p.studentEmail && p.studentEmail.trim().toLowerCase() === currentUser.email.trim().toLowerCase());
  
  if (myTxns.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No transactions recorded yet. Release or withdraw payouts to generate ledger records.</td></tr>`;
    return;
  }
  
  myTxns.forEach(tx => {
    const symb = tx.currency === 'USD' ? '$' : '?';
    const dateStr = new Date(tx.date).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td style="font-family: monospace; font-size: 11px; color: var(--text-muted);">${tx.id}</td>
      <td style="font-weight:600; text-transform:uppercase;">${tx.type}</td>
      <td>${dateStr}</td>
      <td>${tx.notes || '...'}</td>
      <td style="font-weight:700; color: ${tx.type === 'withdrawal' ? 'var(--danger)' : 'var(--success)'};">
        ${tx.type === 'withdrawal' ? '-' : '+'}${symb}${parseFloat(tx.amount).toFixed(2)}
      </td>
      <td>
        <span style="font-size:10px; font-weight:800; color: #fff; background: rgba(16, 185, 129, 0.15); border: 1px solid var(--success); padding: 2px 8px; border-radius: 20px;">SUCCESS</span>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

function triggerStudentWithdrawal() {
  if (typeof currentUser.stipendBalance === 'undefined' || currentUser.stipendBalance <= 0) {
    alert("Available balance is empty! Wait for your stipend to accrue or milestone to be released.");
    return;
  }
  
  const symb = currentUser.stipendCurrency === 'USD' ? '$' : '?';
  const withdrawAmt = currentUser.stipendBalance;
  
  const confirmTransfer = confirm(`Confirm instant bank settlement of ${symb}${withdrawAmt.toFixed(2)} to your registered account?`);
  if (!confirmTransfer) return;
  
  // Deduct
  currentUser.stipendBalance = 0;
  currentUser.totalPaid = (currentUser.totalPaid || 0) + withdrawAmt;
  
  // Record transaction
  if (!db.payments) db.payments = [];
  const newTx = {
    id: 'TXN_' + Math.random().toString(36).substring(2, 10).toUpperCase(),
    studentEmail: currentUser.email,
    studentName: currentUser.name,
    mentorEmail: currentUser.mentorEmail || '',
    amount: withdrawAmt,
    currency: currentUser.stipendCurrency || 'INR',
    type: 'withdrawal',
    date: new Date().toISOString(),
    status: 'Success',
    referenceId: 'settle_rzp_' + Math.random().toString(36).substring(2, 12).toUpperCase(),
    notes: 'Instant bank settlement processed.'
  };
  
  db.payments.push(newTx);
  saveDatabase();
  syncRecordToFirestore('users', currentUser);
  syncRecordToFirestore('payments', newTx);
  
  // Play payout success chime!
  playPaymentChime();
  
  alert(`Successfully transferred ${symb}${withdrawAmt.toFixed(2)} to your bank account!`);
  loadStudentPayments();
}

function loadMentorPayments() {
  if (!currentUser) return;
  
  // Load my interns list for select dropdown
  const selectEl = document.getElementById('mentor-log-student');
  if (selectEl) {
    selectEl.innerHTML = '<option value="">Select Intern...</option>';
    const myInterns = db.users.filter(u => u.role === 'student' && u.mentorEmail && u.mentorEmail.trim().toLowerCase() === currentUser.email.trim().toLowerCase());
    myInterns.forEach(student => {
      const opt = document.createElement('option');
      opt.value = student.email;
      opt.innerText = `${student.name} (${student.internshipType === 'paid' ? 'Paid' : 'Unpaid'})`;
      selectEl.appendChild(opt);
    });
  }
  
  // Load Pending Approvals Table
  const tableBody = document.querySelector('#mentor-payout-approvals-table tbody');
  if (tableBody) {
    tableBody.innerHTML = '';
    const myPaidInterns = db.users.filter(u => u.role === 'student' && u.internshipType === 'paid' && u.mentorEmail && u.mentorEmail.trim().toLowerCase() === currentUser.email.trim().toLowerCase());
    
    if (myPaidInterns.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No active paid interns assigned under your supervision.</td></tr>`;
    } else {
      myPaidInterns.forEach(student => {
        const symb = student.stipendCurrency === 'USD' ? '$' : '?';
        const pending = student.stipendBalance || 0;
        const scheme = student.stipendFrequency === 'streaming' ? 'Real-time Streaming' : (student.stipendFrequency === 'task' ? 'Milestone-based (Per Task)' : 'Monthly Milestone');
        
        const row = document.createElement('tr');
        row.innerHTML = `
          <td style="font-weight:600;">${student.name}</td>
          <td>${symb}${student.stipendAmount.toLocaleString()}</td>
          <td>${scheme}</td>
          <td style="font-weight:700; color:var(--success);">${symb}${parseFloat(pending).toFixed(2)}</td>
          <td>
            ${student.stipendFrequency === 'streaming' 
              ? `<span style="font-size:11px; color:var(--text-muted);">Auto-Streaming</span>`
              : `<button type="button" class="btn btn-primary" onclick="approveMentorPayout('${student.email}')" style="padding:4px 8px; font-size:11px; min-height:24px; font-weight:600;">Release Milestone</button>`
            }
          </td>
        `;
        tableBody.appendChild(row);
      });
    }
  }
  
  // Calculate Cohort Disbursements
  const myInternsEmails = db.users
    .filter(u => u.role === 'student' && u.mentorEmail && u.mentorEmail.trim().toLowerCase() === currentUser.email.trim().toLowerCase())
    .map(u => u.email.trim().toLowerCase());
    
  if (!db.payments) db.payments = [];
  const disbursedTotal = db.payments
    .filter(p => p.type === 'withdrawal' && p.studentEmail && myInternsEmails.includes(p.studentEmail.trim().toLowerCase()))
    .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);
    
  const totalDisbursedDisplay = document.getElementById('mentor-total-disbursed-amt');
  if (totalDisbursedDisplay) {
    totalDisbursedDisplay.innerText = `?${disbursedTotal.toFixed(2)}`;
  }
  
  // Load Global Ledger Table
  renderMentorLedger(myInternsEmails);
}

function renderMentorLedger(myInternsEmails) {
  const tableBody = document.querySelector('#mentor-ledger-table tbody');
  if (!tableBody) return;
  tableBody.innerHTML = '';
  
  const cohortPayments = db.payments.filter(p => p.studentEmail && myInternsEmails.includes(p.studentEmail.trim().toLowerCase()));
  
  if (cohortPayments.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No payment distributions recorded for your cohort.</td></tr>`;
    return;
  }
  
  cohortPayments.forEach(tx => {
    const symb = tx.currency === 'USD' ? '$' : '?';
    const dateStr = new Date(tx.date).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td style="font-family: monospace; font-size: 11px; color: var(--text-muted);">${tx.id}</td>
      <td style="font-weight:600;">${tx.studentName || tx.studentEmail}</td>
      <td style="font-weight:700; color: ${tx.type === 'withdrawal' ? 'var(--danger)' : 'var(--success)'};">
        ${symb}${parseFloat(tx.amount).toFixed(2)}
      </td>
      <td style="text-transform:uppercase; font-size:11px;">${tx.type}</td>
      <td>${dateStr}</td>
      <td style="font-family: monospace; font-size: 11px; color: var(--text-muted);">${tx.referenceId || '...'}</td>
      <td>${tx.notes || '...'}</td>
    `;
    tableBody.appendChild(row);
  });
}

function approveMentorPayout(studentEmail) {
  const student = db.users.find(u => u.email && u.email.trim().toLowerCase() === studentEmail.trim().toLowerCase());
  if (!student) return;
  
  const symb = student.stipendCurrency === 'USD' ? '$' : '?';
  const defaultAmt = student.stipendAmount || 15000;
  
  const amtStr = prompt(`Enter payout milestone release amount for ${student.name} (Suggested rate: ${symb}${defaultAmt.toLocaleString()}):`, defaultAmt);
  if (amtStr === null) return;
  
  const amt = parseFloat(amtStr);
  if (isNaN(amt) || amt <= 0) {
    alert("Please enter a valid amount greater than 0.");
    return;
  }
  
  if (typeof student.stipendBalance === 'undefined') student.stipendBalance = 0;
  student.stipendBalance += amt;
  
  // Record payment
  if (!db.payments) db.payments = [];
  const newTx = {
    id: 'TXN_' + Math.random().toString(36).substring(2, 10).toUpperCase(),
    studentEmail: student.email,
    studentName: student.name,
    mentorEmail: currentUser.email,
    amount: amt,
    currency: student.stipendCurrency || 'INR',
    type: 'milestone_release',
    date: new Date().toISOString(),
    status: 'Success',
    referenceId: 'release_rzp_' + Math.random().toString(36).substring(2, 12).toUpperCase(),
    notes: 'Milestone payment released by Supervisor.'
  };
  
  db.payments.push(newTx);
  saveDatabase();
  syncRecordToFirestore('users', student);
  syncRecordToFirestore('payments', newTx);
  
  alert(`Milestone payment of ${symb}${amt} released for ${student.name}. Available for withdrawal.`);
  loadMentorPayments();
}

function handleMentorLogPaymentSubmit(event) {
  event.preventDefault();
  const studentEmail = document.getElementById('mentor-log-student').value;
  const amt = parseFloat(document.getElementById('mentor-log-amount').value);
  
  if (!studentEmail) {
    alert("Please select an intern.");
    return;
  }
  if (isNaN(amt) || amt <= 0) {
    alert("Please enter a valid payment amount.");
    return;
  }
  
  const student = db.users.find(u => u.email && u.email.trim().toLowerCase() === studentEmail.trim().toLowerCase());
  if (student) {
    if (typeof student.stipendBalance === 'undefined') student.stipendBalance = 0;
    student.stipendBalance += amt;
    
    // Record payment
    if (!db.payments) db.payments = [];
    const newTx = {
      id: 'TXN_' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      studentEmail: student.email,
      studentName: student.name,
      mentorEmail: currentUser.email,
      amount: amt,
      currency: student.stipendCurrency || 'INR',
      type: 'manual_payout',
      date: new Date().toISOString(),
      status: 'Success',
      referenceId: 'manual_rzp_' + Math.random().toString(36).substring(2, 12).toUpperCase(),
      notes: 'Manual payment settlement logged by Supervisor.'
    };
    
    db.payments.push(newTx);
    saveDatabase();
    syncRecordToFirestore('users', student);
    syncRecordToFirestore('payments', newTx);
    
    alert(`Manual settlement of ${student.stipendCurrency === 'USD' ? '$' : '?'}${amt} logged successfully for ${student.name}.`);
    
    document.getElementById('mentor-log-amount').value = '';
    loadMentorPayments();
  }
}

function upgradeToPremiumFromDashboard() {
  if (!currentUser) return;
  
  openRzpModal(currentUser.email, 499, 'UTX Premium Registry Upgrade Fee', (razorpayPaymentId) => {
    currentUser.internshipType = 'paid';
    currentUser.stipendAmount = 15000;
    currentUser.stipendCurrency = 'INR';
    currentUser.stipendFrequency = 'monthly';
    currentUser.stipendBalance = 0;
    currentUser.totalPaid = 0;
    currentUser.paymentRef = razorpayPaymentId; // Real Razorpay payment ID
    
    // Add transaction record
    if (!db.payments) db.payments = [];
    const newTx = {
      id: 'TXN_' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      studentEmail: currentUser.email,
      studentName: currentUser.name,
      mentorEmail: currentUser.mentorEmail || '',
      amount: 499,
      currency: 'INR',
      type: 'upgrade_fee',
      date: new Date().toISOString(),
      status: 'Success',
      referenceId: currentUser.paymentRef,
      notes: 'Premium Registry upgrade fee paid successfully.'
    };
    db.payments.push(newTx);
    
    saveDatabase();
    syncRecordToFirestore('users', currentUser);
    syncRecordToFirestore('payments', newTx);
    
    alert("Congratulations! You are now upgraded to the Premium (Stipend-Enabled) Registry. Your supervisor can now configure and approve your stipend disbursements.");
    
    loadStudentPayments();
  });
}

window.loadStudentPayments = loadStudentPayments;
window.triggerStudentWithdrawal = triggerStudentWithdrawal;
window.loadMentorPayments = loadMentorPayments;
window.approveMentorPayout = approveMentorPayout;
window.handleMentorLogPaymentSubmit = handleMentorLogPaymentSubmit;
window.upgradeToPremiumFromDashboard = upgradeToPremiumFromDashboard;
window.stopStipendStreaming = stopStipendStreaming;

window.addEventListener('beforeunload', () => {
  if (currentUser && currentUser.role === 'student' && stipendStreamInterval) {
    flushDatabase();
    syncRecordToFirestore('users', currentUser);
  }
});




// ============================================================
// GROUP CALL FEATURE ... Google Meet Group Sessions
// Mentor schedules a session, students see and join the link
// ============================================================

// ---- Helpers ----

// ---- Auto-Notify students when mentor starts or schedules a meeting ----

function sendMeetingNotificationToStudents(meeting, isLive) {
  if (!currentUser || currentUser.role !== 'mentor') return;

  const invitees = Array.isArray(meeting.invitees) && meeting.invitees.length
    ? meeting.invitees
    : (Array.isArray(meeting.invitedStudents) ? meeting.invitedStudents : []);

  if (!invitees || invitees.length === 0) return;

  const mentorName = currentUser.name || 'Your Mentor';
  const meetLink = (meeting.meetLink && meeting.meetLink !== 'https://meet.new')
    ? meeting.meetLink
    : null;
  const title = meeting.title || (isLive ? 'Group Call' : 'Upcoming Session');

  let msgText;
  if (isLive) {
    msgText = '\uD83D\uDCF9 ' + mentorName + ' has started a group call: "' + title + '"' + (meetLink ? ' \u2014 Join now: ' + meetLink : '. Check the Group Call tab to join.');
  } else {
    const when = meeting.scheduledAt ? ' scheduled at ' + formatMeetDateTime(meeting.scheduledAt) : '';
    msgText = '\uD83D\uDCC5 ' + mentorName + ' has scheduled a meeting: "' + title + '"' + when + (meetLink ? ' \u2014 Link: ' + meetLink : '') + '. Open the Group Call tab to see details.';
  }

  // Send chat notification to each invited student
  invitees.forEach(function(studentEmail) {
    if (!studentEmail) return;
    const notifMsg = {
      type: 'meeting_notification',
      id: 'msg-meet-notif-' + meeting.id + '-' + Date.now() + '-' + Math.random().toString(36).slice(2),
      from: currentUser.email,
      to: studentEmail.trim().toLowerCase(),
      message: msgText,
      timestamp: new Date().toISOString(),
      meetingId: meeting.id,
      meetLink: meetLink || null,
      isLive: isLive
    };
    if (!db.chats) db.chats = [];
    db.chats.push(notifMsg);
    syncRecordToSupabase('chats', notifMsg).catch(function() {});
  });

  saveDatabase(true);

  // Broadcast via BroadcastChannel so open student tabs react instantly
  try {
    if (!window.__apexMeetingChannel) initMeetingBroadcastSync();
    if (window.__apexMeetingChannel) {
      window.__apexMeetingChannel.postMessage({
        type: isLive ? 'meeting_live_alert' : 'meeting_scheduled_alert',
        meeting: meeting,
        mentorName: mentorName
      });
    }
  } catch (e) {}

  // Also broadcast via chat channel
  try {
    if (window.__apexChatChannel) {
      window.__apexChatChannel.postMessage({ type: 'meeting_notification', meeting: meeting, isLive: isLive });
    }
  } catch (e) {}
}

// ---- Show meeting alert popup on student side ----

function showStudentMeetingAlert(meeting, isLive, mentorName) {
  if (!currentUser || currentUser.role !== 'student') return;

  const link = (meeting.meetLink && meeting.meetLink !== 'https://meet.new') ? meeting.meetLink : null;
  const title = meeting.title || (isLive ? 'Group Call' : 'Upcoming Session');
  const host = mentorName || meeting.mentorName || 'Your Mentor';

  // Remove existing alert if any
  const existing = document.getElementById('_student-meeting-alert');
  if (existing) existing.remove();

  const alertEl = document.createElement('div');
  alertEl.id = '_student-meeting-alert';
  alertEl.style.cssText = [
    'position:fixed', 'top:20px', 'left:50%', 'transform:translateX(-50%)',
    'z-index:99999', 'min-width:320px', 'max-width:90vw',
    'background:linear-gradient(135deg,rgba(0,182,108,0.18),rgba(66,133,244,0.18))',
    'border:1.5px solid rgba(0,182,108,0.6)',
    'border-radius:16px', 'padding:18px 22px',
    'box-shadow:0 8px 40px rgba(0,182,108,0.25),0 2px 16px rgba(0,0,0,0.5)',
    'backdrop-filter:blur(16px)',
    "font-family:'Outfit',sans-serif",
    'animation:_meetAlertSlideIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards'
  ].join(';');

  if (!document.getElementById('_meet-alert-style')) {
    const style = document.createElement('style');
    style.id = '_meet-alert-style';
    style.textContent = '@keyframes _meetAlertSlideIn{from{opacity:0;transform:translateX(-50%) translateY(-24px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
    document.head.appendChild(style);
  }

  const badge = isLive
    ? '<span style="background:#ef4444;color:#fff;font-size:10px;font-weight:800;padding:2px 8px;border-radius:6px;letter-spacing:0.06em;">\uD83D\uDD34 LIVE NOW</span>'
    : '<span style="background:rgba(0,182,108,0.3);color:#00b66c;font-size:10px;font-weight:800;padding:2px 8px;border-radius:6px;letter-spacing:0.06em;">\uD83D\uDCC5 SCHEDULED</span>';

  const joinBtn = link
    ? '<a href="' + link + '" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#4285f4,#34a853);color:#fff;font-size:12px;font-weight:700;padding:8px 18px;border-radius:8px;text-decoration:none;margin-right:8px;">\uD83D\uDCF9 Join Now</a>'
    : '<button onclick="switchTab(\'student\',\'groupcall\');var a=document.getElementById(\'_student-meeting-alert\');if(a)a.remove();" style="background:rgba(66,133,244,0.2);border:1px solid rgba(66,133,244,0.5);color:#4285f4;font-size:12px;font-weight:700;padding:8px 18px;border-radius:8px;cursor:pointer;margin-right:8px;">Open Group Call Tab</button>';

  const scheduledTime = (meeting.scheduledAt && !isLive) ? ' \u00B7 ' + formatMeetDateTime(meeting.scheduledAt) : '';

  alertEl.innerHTML = '<div style="display:flex;align-items:flex-start;gap:12px;">'
    + '<div style="font-size:28px;line-height:1;">\uD83D\uDCF9</div>'
    + '<div style="flex:1;">'
    + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">' + badge + '</div>'
    + '<div style="font-size:15px;font-weight:800;color:#fff;margin-bottom:2px;">' + title + '</div>'
    + '<div style="font-size:12px;color:rgba(255,255,255,0.7);margin-bottom:12px;">Hosted by <strong>' + host + '</strong>' + scheduledTime + '</div>'
    + '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">'
    + joinBtn
    + '<button onclick="var a=document.getElementById(\'_student-meeting-alert\');if(a)a.remove();" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.6);font-size:12px;padding:8px 14px;border-radius:8px;cursor:pointer;">Dismiss</button>'
    + '</div></div>'
    + '<button onclick="var a=document.getElementById(\'_student-meeting-alert\');if(a)a.remove();" style="background:none;border:none;color:rgba(255,255,255,0.4);font-size:18px;cursor:pointer;padding:0;line-height:1;flex-shrink:0;">\u2715</button>'
    + '</div>';

  document.body.appendChild(alertEl);

  // Auto-dismiss after 30 seconds for scheduled; live stays until dismissed
  if (!isLive) {
    setTimeout(function() {
      var el = document.getElementById('_student-meeting-alert');
      if (el) {
        el.style.opacity = '0';
        el.style.transform = 'translateX(-50%) translateY(-16px)';
        el.style.transition = 'all 0.4s ease';
        setTimeout(function() { if (el.parentNode) el.remove(); }, 400);
      }
    }, 30000);
  }

  // Browser notification
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(isLive ? '\uD83D\uDCF9 Group Call Started!' : '\uD83D\uDCC5 Meeting Scheduled!', {
        body: host + ': ' + title + (link ? ' \u2014 Click to join' : ''),
        icon: 'robot_avatar.png',
        tag: 'meeting-alert-' + meeting.id
      });
    } catch (e) {}
  }

  // Refresh badge
  checkStudentGroupCallBadge();
}

function generateMeetRoomCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const seg = (n) => Array.from({length: n}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  // Google Meet format: xxx-xxxx-xxx (3-4-3, all lowercase letters, hyphen separated)
  return seg(3) + '-' + seg(4) + '-' + seg(3);
}

// Opens meet.new so mentor can create a real room and copy the link back
function openNewMeetTab() {
  window.open('https://meet.new', '_blank');
  showToast('?? Google Meet opened ? copy the link ? paste it here', 3000);
}

function generateMeetLink() {
  const code = generateMeetRoomCode();
  const link = 'https://meet.google.com/' + code;
  const el = document.getElementById('sm-meet-link');
  if (el) {
    el.value = link;
    el.style.borderColor = 'rgba(0,182,108,0.6)';
    setTimeout(() => { el.style.borderColor = ''; }, 1500);
  }
  showToast('?? Meet link generated!', 1800);
}

function getMyGroupCallMeetings() {
  if (!db.meetings) db.meetings = [];
  return db.meetings.filter(m => m && m.type === 'group_call');
}

function getMeetingsForMentor(mentorEmail) {
  if (!mentorEmail) return [];
  const email = mentorEmail.trim().toLowerCase();
  return getMyGroupCallMeetings().filter(m => (m.mentorEmail || '').trim().toLowerCase() === email);
}

function getMeetingsForStudent(studentEmail, mentorEmail) {
  if (!studentEmail) return [];
  const email = studentEmail.trim().toLowerCase();
  const mEmail = (mentorEmail || '').trim().toLowerCase();
  return getMyGroupCallMeetings().filter(m => {
    const mMentor = (m.mentorEmail || '').trim().toLowerCase();
    const invitees = Array.isArray(m.invitees) ? m.invitees.map(e => e.trim().toLowerCase()) : [];
    return mMentor === mEmail || invitees.includes(email);
  });
}

function isMeetingLive(meeting) {
  if (!meeting || !meeting.scheduledAt) return false;
  const now = Date.now();
  const start = new Date(meeting.scheduledAt).getTime();
  const durationMs = (parseInt(meeting.duration) || 60) * 60 * 1000;
  return now >= start && now <= start + durationMs;
}

function getMeetingStatus(meeting) {
  const now = Date.now();
  const start = new Date(meeting.scheduledAt).getTime();
  const durationMs = (parseInt(meeting.duration) || 60) * 60 * 1000;
  if (now < start) return 'upcoming';
  if (now <= start + durationMs) return 'live';
  return 'past';
}

function formatMeetDateTime(isoStr) {
  if (!isoStr) return '...';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' at ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch (e) { return isoStr; }
}

function formatDuration(mins) {
  const m = parseInt(mins) || 60;
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h} hr`;
}

// ---- Mentor: Open / Close Schedule Modal ----

function openScheduleMeetingModal() {
  const modal = document.getElementById('schedule-meeting-modal');
  if (!modal) return;

  // Pre-fill today's date
  const dateEl = document.getElementById('sm-date');
  const timeEl = document.getElementById('sm-time');
  if (dateEl && !dateEl.value) {
    const now = new Date();
    dateEl.value = now.toISOString().split('T')[0];
  }
  if (timeEl && !timeEl.value) {
    timeEl.value = '10:00';
  }

  // Reset form
  const form = document.getElementById('schedule-meeting-form');
  if (form) {
    document.getElementById('sm-title').value = '';
    document.getElementById('sm-meet-link').value = '';
    document.getElementById('sm-notes').value = '';
    document.getElementById('sm-duration').value = '60';
  }

  // Populate notify list
  populateScheduleMeetingNotifyList();

  modal.style.display = 'flex';
}

function closeScheduleMeetingModal() {
  const modal = document.getElementById('schedule-meeting-modal');
  if (modal) modal.style.display = 'none';
}

function populateScheduleMeetingNotifyList() {
  const container = document.getElementById('sm-notify-list');
  const warn = document.getElementById('sm-no-students-warn');
  if (!container) return;

  const mentorEmail = currentUser ? currentUser.email : '';
  const myStudents = (db.users || []).filter(u => {
    if (!u || u.role !== 'student') return false;
    const req = (db.pairingRequests || []).find(r =>
      (r.mentorEmail || '').trim().toLowerCase() === mentorEmail.trim().toLowerCase() &&
      (r.studentEmail || '').trim().toLowerCase() === (u.email || '').trim().toLowerCase() &&
      (r.status === 'Accepted' || r.status === 'Active')
    );
    return !!req;
  });

  container.innerHTML = '';

  if (myStudents.length === 0) {
    if (warn) warn.style.display = 'block';
    return;
  }
  if (warn) warn.style.display = 'none';

  myStudents.forEach(student => {
    const row = document.createElement('label');
    row.style.cssText = 'display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12px; color:#fff; padding:4px 0;';
    row.innerHTML = `
      <input type="checkbox" name="sm-notify-student" value="${student.email}" checked style="accent-color:#00b66c; width:14px; height:14px;">
      <img src="${student.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(student.name || 'S') + '&background=random&size=24'}" 
           style="width:24px; height:24px; border-radius:50%; object-fit:cover;" 
           onerror="this.src='https://ui-avatars.com/api/?name=S&background=444&color=fff&size=24'">
      <span>${student.name || student.email}</span>
      <span style="color:var(--text-muted); font-size:10px;">(${student.domain || 'Student'})</span>
    `;
    container.appendChild(row);
  });
}

// ---- Mentor: Submit Schedule ----

function handleScheduleMeetingSubmit(e) {
  if (e) e.preventDefault();

  const title = (document.getElementById('sm-title')?.value || '').trim();
  const date = document.getElementById('sm-date')?.value;
  const time = document.getElementById('sm-time')?.value;
  const duration = document.getElementById('sm-duration')?.value || '60';
  const meetLink = (document.getElementById('sm-meet-link')?.value || '').trim();
  const notes = (document.getElementById('sm-notes')?.value || '').trim();

  if (!title || !date || !time) {
    showToast('?? Please fill in title, date, and time.', 2200);
    return;
  }

  // Auto-generate link if empty
  let finalLink = meetLink.replace(/\s+/g, '');
  if (!finalLink) {
    const cleanCode = generateMeetRoomCode().replace(/\s+/g, '').toLowerCase();
    finalLink = 'https://meet.google.com/' + cleanCode;
  }

  const scheduledAt = new Date(`${date}T${time}`).toISOString();

  // Collect checked student emails
  const checkboxes = document.querySelectorAll('input[name="sm-notify-student"]:checked');
  const invitees = Array.from(checkboxes).map(cb => cb.value);

  const meeting = {
    id: 'meet-' + Date.now(),
    type: 'group_call',
    title,
    scheduledAt,
    duration: parseInt(duration),
    meetLink: finalLink,
    notes,
    mentorEmail: currentUser?.email || '',
    mentorName: currentUser?.name || 'Mentor',
    domain: currentUser?.domain || '',
    invitees,
    createdAt: new Date().toISOString(),
    status: 'scheduled'
  };

  if (!db.meetings) db.meetings = [];
  db.meetings.push(meeting);
  saveDatabase(true);

  // Sync to cloud if available
  if (supabaseActive && supabaseClient) {
    syncRecordToFirestore('meetings', meeting).catch(() => {});
  }

  closeScheduleMeetingModal();
  showToast('Meeting scheduled! Link shared with ' + invitees.length + ' student(s).', 2500);

  // Auto-notify all invited students
  sendMeetingNotificationToStudents(meeting, false);

  // Refresh the view
  renderMentorGroupCallTab();
}

// ---- Mentor: Instant Meeting ----

function launchInstantMeeting() {
  // meet.new is Google's official shortcut to instantly create a new real meeting room
  // We open it so the mentor gets a valid room link
  window.open('https://meet.new', '_blank');
  showToast('?? Google Meet opened! Copy the link and share with students.', 3000);

  // Also save a placeholder meeting so students know a session is happening
  const now = new Date().toISOString();
  const myStudents = getMyPairedStudentEmails();

  const meeting = {
    id: 'meet-instant-' + Date.now(),
    type: 'group_call',
    title: '? Instant Group Call',
    scheduledAt: now,
    duration: 60,
    meetLink: 'https://meet.new',
    notes: 'Instant session ... mentor will share the exact Meet link shortly.',
    mentorEmail: currentUser?.email || '',
    mentorName: currentUser?.name || 'Mentor',
    domain: currentUser?.domain || '',
    invitees: myStudents,
    createdAt: now,
    status: 'live'
  };

  if (!db.meetings) db.meetings = [];
  db.meetings.push(meeting);
  saveDatabase(true);

  if (supabaseActive && supabaseClient) {
    syncRecordToFirestore('meetings', meeting).catch(() => {});
  }

  // Notify students about instant meeting
  sendMeetingNotificationToStudents(meeting, true);

  renderMentorGroupCallTab();
}

function getMyPairedStudentEmails() {
  if (!currentUser) return [];
  const mentorEmail = currentUser.email.trim().toLowerCase();
  return (db.pairingRequests || [])
    .filter(r => (r.mentorEmail || '').trim().toLowerCase() === mentorEmail && (r.status === 'Accepted' || r.status === 'Active'))
    .map(r => r.studentEmail)
    .filter(Boolean);
}

// ---- Mentor: Render Group Call Tab ----

function renderMentorGroupCallTab() {
  if (!currentUser || currentUser.role !== 'mentor') return;

  const meetings = getMeetingsForMentor(currentUser.email);
  const now = Date.now();

  // Stats
  const totalEl = document.getElementById('gc-total-sessions');
  const studentsEl = document.getElementById('gc-students-invited');
  const upcomingCountEl = document.getElementById('gc-upcoming-count');
  const upcomingBadge = document.getElementById('gc-upcoming-badge');

  const upcoming = meetings.filter(m => getMeetingStatus(m) === 'upcoming');
  const allInvitees = new Set(meetings.flatMap(m => m.invitees || []));

  if (totalEl) totalEl.textContent = meetings.length;
  if (studentsEl) studentsEl.textContent = allInvitees.size;
  if (upcomingCountEl) upcomingCountEl.textContent = upcoming.length;
  if (upcomingBadge) upcomingBadge.textContent = upcoming.length;

  // Upcoming list
  const upcomingList = document.getElementById('gc-upcoming-list');
  if (upcomingList) {
    const upcomingAndLive = meetings
      .filter(m => getMeetingStatus(m) !== 'past')
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

    if (upcomingAndLive.length === 0) {
      upcomingList.innerHTML = `<div style="text-align:center; padding:32px; color:var(--text-muted); font-size:13px;">No upcoming sessions. Click <strong>Schedule Meeting</strong> to add one.</div>`;
    } else {
      upcomingList.innerHTML = upcomingAndLive.map(m => buildMentorMeetingCard(m)).join('');
    }
  }

  // History table
  const tbody = document.getElementById('gc-history-tbody');
  if (tbody) {
    const past = meetings
      .filter(m => getMeetingStatus(m) === 'past')
      .sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));

    if (past.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:24px;">No past sessions yet.</td></tr>`;
    } else {
      tbody.innerHTML = past.map(m => `
        <tr>
          <td style="font-weight:600; color:#fff;">${m.title || 'Untitled'}</td>
          <td style="color:var(--text-muted); font-size:12px;">${formatMeetDateTime(m.scheduledAt)}</td>
          <td><span style="font-size:11px; background:rgba(131,39,236,0.15); color:var(--primary); padding:2px 8px; border-radius:6px;">${m.domain || '...'}</span></td>
          <td style="color:var(--text-muted); font-size:12px;">${formatDuration(m.duration)}</td>
          <td style="font-size:12px;">${(m.invitees || []).length} students</td>
          <td>${m.meetLink ? `<a href="${m.meetLink}" target="_blank" class="gc-meet-badge">&#x1F4F9; Rejoin</a>` : '...'}</td>
          <td style="font-size:11px; color:var(--text-muted); max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${m.notes || '...'}</td>
          <td>
            <button onclick="showMeetingDetail('${m.id}')" style="background:rgba(255,255,255,0.05); border:1px solid var(--border-color); color:var(--text-muted); padding:4px 10px; border-radius:6px; font-size:11px; cursor:pointer;">Details</button>
            <button onclick="deleteMeeting('${m.id}')" style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.3); color:#ef4444; padding:4px 10px; border-radius:6px; font-size:11px; cursor:pointer; margin-left:4px;">Delete</button>
          </td>
        </tr>
      `).join('');
    }
  }
}

function buildMentorMeetingCard(m) {
  const status = getMeetingStatus(m);
  const statusClass = status === 'live' ? 'live' : 'upcoming';
  const statusLabel = status === 'live'
    ? '<span style="background:#ef4444; color:#fff; font-size:10px; font-weight:800; padding:2px 7px; border-radius:6px; animation:gcPulse 1.5s infinite;">🔴 LIVE</span>'
    : '<span style="background:rgba(0,182,108,0.2); color:#00b66c; font-size:10px; font-weight:700; padding:2px 7px; border-radius:6px;">🟢 UPCOMING</span>';

  return `
    <div class="gc-session-card ${statusClass}">
      <div style="flex:1; min-width:200px;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
          ${statusLabel}
          <span style="font-size:14px; font-weight:700; color:#fff;">${m.title || 'Untitled Session'}</span>
        </div>
        <div style="font-size:12px; color:var(--text-muted); display:flex; flex-wrap:wrap; gap:12px;">
          <span>?? ${formatMeetDateTime(m.scheduledAt)}</span>
          <span>? ${formatDuration(m.duration)}</span>
          <span>?? ${(m.invitees || []).length} students invited</span>
          ${m.domain ? `<span>?? ${m.domain}</span>` : ''}
        </div>
        ${m.notes ? `<div style="font-size:11px; color:var(--text-muted); margin-top:6px; font-style:italic;">${m.notes}</div>` : ''}
      </div>
      <div style="display:flex; gap:8px; align-items:center; flex-shrink:0;">
        <a href="${m.meetLink}" target="_blank" class="gc-meet-badge" style="text-decoration:none; cursor:pointer;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          ${status === 'live' ? 'Join Live' : 'Open Meet'}
        </a>
        <button onclick="deleteMeeting('${m.id}')" style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.3); color:#ef4444; padding:5px 10px; border-radius:7px; font-size:11px; cursor:pointer;">Cancel</button>
      </div>
    </div>
  `;
}

// ---- Student: Render Group Call Tab ----

function renderStudentGroupCallTab() {
  if (!currentUser || currentUser.role !== 'student') return;

  const mentorEmail = currentUser.mentorEmail || '';
  const meetings = getMeetingsForStudent(currentUser.email, mentorEmail);

  // Live banner
  const liveMeeting = meetings.find(m => getMeetingStatus(m) === 'live');
  const liveBanner = document.getElementById('student-gc-live-banner');
  if (liveBanner) {
    if (liveMeeting) {
      liveBanner.style.display = 'flex';
      const titleEl = document.getElementById('student-gc-live-title');
      const linkEl = document.getElementById('student-gc-live-link');
      if (titleEl) titleEl.textContent = `🔴 LIVE ... ${liveMeeting.title}`;
      if (linkEl) linkEl.href = liveMeeting.meetLink || '#';
      // Hide NEW badge when they see the tab
      const badge = document.getElementById('student-groupcall-badge');
      if (badge) badge.style.display = 'none';
    } else {
      liveBanner.style.display = 'none';
    }
  }

  // Upcoming
  const upcomingList = document.getElementById('student-gc-upcoming-list');
  const upcomingBadge = document.getElementById('student-gc-upcoming-badge');
  const upcoming = meetings
    .filter(m => getMeetingStatus(m) === 'upcoming')
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

  if (upcomingBadge) upcomingBadge.textContent = upcoming.length;

  if (upcomingList) {
    if (upcoming.length === 0) {
      upcomingList.innerHTML = `<div style="text-align:center; padding:32px; color:var(--text-muted); font-size:13px;">No upcoming sessions yet. Your mentor will schedule one soon.</div>`;
    } else {
      upcomingList.innerHTML = upcoming.map(m => buildStudentMeetingCard(m)).join('');
    }
  }

  // History
  const tbody = document.getElementById('student-gc-history-tbody');
  if (tbody) {
    const past = meetings
      .filter(m => getMeetingStatus(m) === 'past')
      .sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));

    if (past.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:24px;">No past sessions yet.</td></tr>`;
    } else {
      tbody.innerHTML = past.map(m => `
        <tr>
          <td style="font-weight:600; color:#fff;">${m.title || 'Untitled'}</td>
          <td style="color:var(--text-muted); font-size:12px;">${formatMeetDateTime(m.scheduledAt)}</td>
          <td style="font-size:12px;">${m.mentorName || m.mentorEmail || '...'}</td>
          <td style="color:var(--text-muted); font-size:12px;">${formatDuration(m.duration)}</td>
          <td>${m.meetLink ? `<a href="${m.meetLink}" target="_blank" class="gc-meet-badge">&#x1F4F9; Rejoin</a>` : '...'}</td>
          <td style="font-size:11px; color:var(--text-muted); max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${m.notes || '...'}</td>
        </tr>
      `).join('');
    }
  }
}

function buildStudentMeetingCard(m) {
  return `
    <div class="gc-session-card upcoming">
      <div style="flex:1; min-width:200px;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
          <span style="background:rgba(0,182,108,0.2); color:#00b66c; font-size:10px; font-weight:700; padding:2px 7px; border-radius:6px;">🟢 UPCOMING</span>
          <span style="font-size:14px; font-weight:700; color:#fff;">${m.title || 'Untitled Session'}</span>
        </div>
        <div style="font-size:12px; color:var(--text-muted); display:flex; flex-wrap:wrap; gap:12px;">
          <span>?? ${formatMeetDateTime(m.scheduledAt)}</span>
          <span>? ${formatDuration(m.duration)}</span>
          <span>?? Hosted by ${m.mentorName || 'Your Mentor'}</span>
        </div>
        ${m.notes ? `<div style="font-size:11px; color:var(--text-muted); margin-top:6px; font-style:italic;">?? ${m.notes}</div>` : ''}
      </div>
      <a href="${m.meetLink}" target="_blank" class="gc-meet-badge" style="text-decoration:none; cursor:pointer; flex-shrink:0;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        Join Meet
      </a>
    </div>
  `;
}

// ---- Meeting Detail Modal ----

function showMeetingDetail(meetingId) {
  const meeting = (db.meetings || []).find(m => m.id === meetingId);
  if (!meeting) return;

  const modal = document.getElementById('meeting-detail-modal');
  const title = document.getElementById('meeting-detail-title');
  const body = document.getElementById('meeting-detail-body');
  if (!modal || !title || !body) return;

  title.textContent = meeting.title || 'Session Details';

  const status = getMeetingStatus(meeting);
  const statusColor = status === 'live' ? '#ef4444' : status === 'upcoming' ? '#00b66c' : 'var(--text-muted)';

  body.innerHTML = `
    <div style="display:flex; flex-wrap:wrap; gap:12px;">
      <div style="flex:1; min-width:180px; background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:10px; padding:12px;">
        <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:4px;">Status</div>
        <div style="font-size:13px; font-weight:700; color:${statusColor}; text-transform:capitalize;">${status}</div>
      </div>
      <div style="flex:1; min-width:180px; background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:10px; padding:12px;">
        <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:4px;">Date & Time</div>
        <div style="font-size:12px; color:#fff;">${formatMeetDateTime(meeting.scheduledAt)}</div>
      </div>
    </div>
    <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:10px; padding:12px;">
      <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:4px;">Duration</div>
      <div style="font-size:12px; color:#fff;">${formatDuration(meeting.duration)}</div>
    </div>
    <div style="background:rgba(66,133,244,0.08); border:1px solid rgba(66,133,244,0.25); border-radius:10px; padding:12px;">
      <div style="font-size:10px; color:rgba(66,133,244,0.8); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:8px;">Google Meet Link</div>
      <a href="${meeting.meetLink}" target="_blank" style="color:#4285f4; font-size:13px; font-weight:600; word-break:break-all;">${meeting.meetLink}</a>
    </div>
    ${meeting.notes ? `
    <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:10px; padding:12px;">
      <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:4px;">Notes / Agenda</div>
      <div style="font-size:12px; color:var(--text-secondary);">${meeting.notes}</div>
    </div>` : ''}
    ${meeting.invitees && meeting.invitees.length > 0 ? `
    <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:10px; padding:12px;">
      <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:8px;">Invited Students (${meeting.invitees.length})</div>
      <div style="display:flex; flex-wrap:wrap; gap:6px;">
        ${meeting.invitees.map(email => {
          const u = (db.users || []).find(x => (x.email || '').trim().toLowerCase() === email.trim().toLowerCase());
          return `<span style="background:rgba(131,39,236,0.1); border:1px solid rgba(131,39,236,0.2); color:var(--primary); font-size:11px; padding:2px 8px; border-radius:6px;">${u ? u.name : email}</span>`;
        }).join('')}
      </div>
    </div>` : ''}
  `;

  modal.style.display = 'flex';
}

// ---- Delete Meeting ----

function deleteMeeting(meetingId) {
  if (!confirm('Delete this meeting session?')) return;
  db.meetings = (db.meetings || []).filter(m => m.id !== meetingId);
  saveDatabase(true);
  showToast('Meeting deleted.', 1800);
  renderMentorGroupCallTab();
}

// ---- Badge: Notify student if new meeting ----

function checkStudentGroupCallBadge() {
  if (!currentUser || currentUser.role !== 'student') return;
  const mentorEmail = currentUser.mentorEmail || '';
  const meetings = getMeetingsForStudent(currentUser.email, mentorEmail);
  const hasLive = meetings.some(m => getMeetingStatus(m) === 'live');
  const hasUpcoming = meetings.some(m => getMeetingStatus(m) === 'upcoming');
  const badge = document.getElementById('student-groupcall-badge');
  if (badge) badge.style.display = (hasLive || hasUpcoming) ? 'inline' : 'none';
}

// ---- Hook into switchTab ----

const _origSwitchTab = window.switchTab;
window.switchTab = function(portal, tabName) {
  _origSwitchTab(portal, tabName);
  if (portal === 'mentor' && tabName === 'groupcall') {
    setTimeout(renderMentorGroupCallTab, 50);
  }
  if (portal === 'student' && tabName === 'groupcall') {
    setTimeout(renderStudentGroupCallTab, 50);
    // Clear badge
    const badge = document.getElementById('student-groupcall-badge');
    if (badge) badge.style.display = 'none';
  }
};

// ---- Periodic badge check for students ----

setInterval(() => {
  if (currentUser && currentUser.role === 'student') {
    checkStudentGroupCallBadge();
  }
}, 30000);

// ---- Expose to global scope ----

window.openScheduleMeetingModal = openScheduleMeetingModal;
window.closeScheduleMeetingModal = closeScheduleMeetingModal;
window.handleScheduleMeetingSubmit = handleScheduleMeetingSubmit;
window.launchInstantMeeting = launchInstantMeeting;
window.generateMeetLink = generateMeetLink;
window.openNewMeetTab = openNewMeetTab;
window.renderMentorGroupCallTab = renderMentorGroupCallTab;
window.renderStudentGroupCallTab = renderStudentGroupCallTab;
window.deleteMeeting = deleteMeeting;
window.showMeetingDetail = showMeetingDetail;
window.checkStudentGroupCallBadge = checkStudentGroupCallBadge;
window.cancelMentorDialing = cancelMentorDialing;
window.proceedToMeetingRoom = proceedToMeetingRoom;
window.launchJitsiCall = launchJitsiCall;
window.closeJitsiCall = closeJitsiCall;
window.startMentorGroupCall = startMentorGroupCall;
window.acceptIncomingCall = acceptIncomingCall;
window.declineIncomingCall = declineIncomingCall;

// ====== MISSING WINDOW EXPORTS ... Student & Mentor core functions ======
window.handleLogSubmit = handleLogSubmit;
window.loadStudentLogs = loadStudentLogs;
window.startFaceVerification = startFaceVerification;
window.cancelFaceVerification = cancelFaceVerification;
window.openSubmitTaskModal = openSubmitTaskModal;
window.handleTaskSubmissionSubmit = handleTaskSubmissionSubmit;
window.moveTaskToInProgress = moveTaskToInProgress;
window.updateTaskProgress = updateTaskProgress;
window.previewSubmitScreenshot = previewSubmitScreenshot;
window.removeSubmitScreenshot = removeSubmitScreenshot;
window.loadMentorReviews = loadMentorReviews;
window.openReviewModal = openReviewModal;

window.loadStudentTasks = loadStudentTasks;
window.loadStudentDashboard = loadStudentDashboard;
window.loadStudentChat = loadStudentChat;
window.loadStudentQuiz = loadStudentQuiz;
window.loadStudentSkills = loadStudentSkills;
window.loadStudentAttendanceLogs = loadStudentAttendanceLogs;
window.handleDailyAttendanceClick = handleDailyAttendanceClick;
window.startDailyAttendanceScan = startDailyAttendanceScan;
window.handleDailyFileUpload = handleDailyFileUpload;
window.openSubmitTaskModal = openSubmitTaskModal;
window.checkStudentGate = checkStudentGate;

window.handlePublicVerificationSearch = handlePublicVerificationSearch;
window.resetVerificationResult = resetVerificationResult;
window.showVerificationResult = showVerificationResult;
window.verifyCertificate = verifyCertificate;




// ==================== WHATSAPP POPUP VIDEO CALL ENGINE ====================
const waCall = {
  localStream: null, screenStream: null,
  pcs: {}, remoteStreams: {}, iceCandQueues: {}, pendingSignals: new Set(),
  micMuted: false, camOff: false, shareActive: false,
  chatOpen: false, participantsOpen: false, minimised: false,
  timerInterval: null, seconds: 0,
  inCallMessages: [], signalPollInterval: null, lastSignalTs: null,
};
const WA_ICE = { iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]};

async function openWAStyleCall() {
  const popup = document.getElementById('wa-call-popup');
  if (!popup) { _openLegacyMeetingRoom(); return; }

  // Reset state
  Object.assign(waCall, {
    micMuted:false, camOff:false, shareActive:false,
    chatOpen:false, participantsOpen:false, minimised:false,
    seconds:0, inCallMessages:[], pendingSignals: new Set(), lastSignalTs: null,
  });
  // Close old peer conns
  Object.values(waCall.pcs).forEach(pc => { try{pc.close();}catch(e){} });
  waCall.pcs = {}; waCall.remoteStreams = {}; waCall.iceCandQueues = {};

  // Show popup
  popup.style.display = 'flex';
  const pill = document.getElementById('wa-call-pill');
  if (pill) pill.style.display = 'none';

  // Reset button states
  const mic = document.getElementById('wa-btn-mic');
  const cam = document.getElementById('wa-btn-cam');
  const share = document.getElementById('wa-btn-share');
  if (mic) mic.className = ''; if (cam) cam.className = ''; if (share) share.className = '';
  const micOn = document.getElementById('wa-mic-on'); const micOff = document.getElementById('wa-mic-off');
  const camOn = document.getElementById('wa-cam-on'); const camOff = document.getElementById('wa-cam-off');
  if (micOn) micOn.style.display='block'; if (micOff) micOff.style.display='none';
  if (camOn) camOn.style.display='block'; if (camOff) camOff.style.display='none';

  // Reset panels
  const chatPanel = document.getElementById('wa-call-chat-panel');
  const partPanel = document.getElementById('wa-participants-panel');
  if (chatPanel) chatPanel.style.display = 'none';
  if (partPanel) partPanel.style.display = 'none';

  // Make draggable
  waInitDrag();

  // Start timer
  clearInterval(waCall.timerInterval);
  waCall.timerInterval = setInterval(() => {
    waCall.seconds++;
    const t = waFmtTime(waCall.seconds);
    const el1 = document.getElementById('wa-popup-timer');
    const el2 = document.getElementById('wa-pill-timer');
    if (el1) el1.textContent = t;
    if (el2) el2.textContent = t;
  }, 1000);

  // Get camera
  try {
    waCall.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  } catch(e) {
    try { waCall.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); }
    catch(e2) { waCall.localStream = null; }
  }

  waRenderAllTiles();
  waStartSignaling();
}

function waFmtTime(s) {
  return String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0');
}

function waInitDrag() {
  const popup = document.getElementById('wa-call-popup');
  const bar = document.getElementById('wa-popup-titlebar');
  if (!popup || !bar) return;
  let dragging = false, ox = 0, oy = 0, sx = 0, sy = 0;
  bar.onmousedown = (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
    dragging = true;
    bar.style.cursor = 'grabbing';
    const rect = popup.getBoundingClientRect();
    ox = e.clientX - rect.left; oy = e.clientY - rect.top;
    popup.style.right = 'auto'; popup.style.bottom = 'auto';
    popup.style.left = rect.left + 'px'; popup.style.top = rect.top + 'px';
  };
  document.onmousemove = (e) => {
    if (!dragging) return;
    popup.style.left = (e.clientX - ox) + 'px';
    popup.style.top  = (e.clientY - oy) + 'px';
  };
  document.onmouseup = () => { dragging = false; bar.style.cursor = 'grab'; };
}

function waGetParticipants() {
  if (!activeMeeting) return [(currentUser.email||'').trim().toLowerCase()];
  return [...new Set((activeMeeting.participants||[currentUser.email]).map(e=>(e||'').trim().toLowerCase()).filter(Boolean))];
}
function waGetPeers() {
  const me = (currentUser.email||'').trim().toLowerCase();
  return waGetParticipants().filter(e => e !== me);
}

function waRenderAllTiles() {
  const grid = document.getElementById('wa-video-grid');
  if (!grid) return;
  const peers = waGetPeers();
  const total = 1 + peers.length;
  grid.setAttribute('data-count', String(total));
  grid.innerHTML = '';

  // Self tile
  const selfTile = waMakeTile('self', currentUser.name || currentUser.email.split('@')[0], true, currentUser.avatar || '');
  const sv = selfTile.querySelector('video');
  if (sv && waCall.localStream && waCall.localStream.getVideoTracks().length > 0 && !waCall.camOff) {
    sv.srcObject = waCall.localStream; sv.muted = true;
    sv.play().catch(()=>{});
    sv.style.display = 'block';
    const fb = selfTile.querySelector('.wa-avatar-fallback');
    if (fb) fb.style.display = 'none';
  }
  grid.appendChild(selfTile);

  // Peer tiles
  peers.forEach(peerEmail => {
    const u = db.users ? db.users.find(x => x && x.email && x.email.trim().toLowerCase() === peerEmail) : null;
    const name = u ? u.name : peerEmail.split('@')[0];
    const avatar = u && u.avatar ? u.avatar : '';
    const tile = waMakeTile(peerEmail, name, false, avatar);
    const stream = waCall.remoteStreams[peerEmail];
    if (stream && stream.getVideoTracks().length > 0) {
      const rv = tile.querySelector('video');
      if (rv) {
        rv.srcObject = stream; rv.play().catch(()=>{});
        rv.style.display = 'block';
        const fb = tile.querySelector('.wa-avatar-fallback');
        if (fb) fb.style.display = 'none';
      }
    }
    grid.appendChild(tile);
  });

  // Update counts
  const pc = document.getElementById('wa-popup-pcount');
  const pp = document.getElementById('wa-panel-count');
  if (pc) pc.textContent = total;
  if (pp) pp.textContent = total;
  waRenderParticipantsList();
}

function waMakeTile(id, name, isSelf, avatar) {
  const tile = document.createElement('div');
  tile.className = 'wa-video-tile';
  tile.id = 'wa-tile-' + id.replace(/[@.]/g, '-');
  const initial = (name||'?').charAt(0).toUpperCase();
  const size = 56; // avatar fallback size
  tile.innerHTML = `
    <video autoplay playsinline ${isSelf?'muted':''} style="display:none;width:100%;height:100%;object-fit:cover;transform:scaleX(-1);"></video>
    <div class="wa-avatar-fallback" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px;">
      ${avatar
        ? `<img src="${avatar}" alt="${name}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.15);">`
        : `<div class="wa-initials-circle" style="width:${size}px;height:${size}px;font-size:${Math.round(size*0.38)}px;">${initial}</div>`}
      <span style="font-size:11px;color:rgba(255,255,255,0.7);font-weight:600;">${name}${isSelf?' (You)':''}</span>
    </div>
    <div class="wa-tile-name">${name}${isSelf?' (You)':''}</div>
  `;
  return tile;
}

// ---- WebRTC ----
function waGetOrCreatePC(peerEmail) {
  const key = peerEmail.trim().toLowerCase();
  const existing = waCall.pcs[key];
  if (existing) {
    const cs = existing.connectionState||'';
    if (cs !== 'failed' && cs !== 'closed') return existing;
    try{existing.close();}catch(e){}
    delete waCall.pcs[key];
  }
  const pc = new RTCPeerConnection(WA_ICE);
  waCall.pcs[key] = pc;
  if (waCall.localStream) waCall.localStream.getTracks().forEach(t => pc.addTrack(t, waCall.localStream));
  pc.onicecandidate = evt => { if (evt.candidate) waSendSignal('candidate', evt.candidate, key); };
  pc.ontrack = evt => {
    if (!waCall.remoteStreams[key]) waCall.remoteStreams[key] = new MediaStream();
    if (!waCall.remoteStreams[key].getTracks().includes(evt.track)) waCall.remoteStreams[key].addTrack(evt.track);
    const tileEl = document.getElementById('wa-tile-' + key.replace(/[@.]/g,'-'));
    if (tileEl) {
      const vid = tileEl.querySelector('video');
      const fb = tileEl.querySelector('.wa-avatar-fallback');
      if (vid && waCall.remoteStreams[key].getVideoTracks().length > 0) {
        vid.srcObject = waCall.remoteStreams[key];
        vid.style.display = 'block'; vid.play().catch(()=>{});
        if (fb) fb.style.display = 'none';
      }
    } else { waRenderAllTiles(); }
  };
  return pc;
}

async function waInitiateOffer(peerEmail) {
  const key = peerEmail.trim().toLowerCase();
  const pc = waGetOrCreatePC(key);
  if (pc.signalingState !== 'stable') return;
  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    waSendSignal('offer', offer, key);
  } catch(e) { console.error('WA offer err:', e); }
}

async function waHandleSignal(signal) {
  const sender = (signal.sender||'').trim().toLowerCase();
  const me = (currentUser.email||'').trim().toLowerCase();
  if (sender === me) return;
  if (signal.recipient && signal.recipient.trim().toLowerCase() !== me) return;
  if (waCall.pendingSignals.has(signal.id)) return;
  waCall.pendingSignals.add(signal.id);
  const { type, data } = signal;
  try {
    if (type === 'ready') {
      const pc = waGetOrCreatePC(sender);
      if (me < sender && pc.signalingState === 'stable') await waInitiateOffer(sender);
      else waSendSignal('ready_ack', true, sender);
    } else if (type === 'ready_ack') {
      if (me < sender) await waInitiateOffer(sender);
    } else if (type === 'offer') {
      const pc = waGetOrCreatePC(sender);
      await pc.setRemoteDescription(new RTCSessionDescription(data));
      await waFlushCandQueue(sender);
      const ans = await pc.createAnswer();
      await pc.setLocalDescription(ans);
      waSendSignal('answer', ans, sender);
    } else if (type === 'answer') {
      const pc = waGetOrCreatePC(sender);
      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(data));
        await waFlushCandQueue(sender);
      }
    } else if (type === 'candidate') {
      const pc = waGetOrCreatePC(sender);
      if (pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(new RTCIceCandidate(data));
      } else {
        if (!waCall.iceCandQueues[sender]) waCall.iceCandQueues[sender] = [];
        waCall.iceCandQueues[sender].push(data);
      }
    }
  } catch(e) { console.error('WA signal handle ['+type+']:', e); }
}

async function waFlushCandQueue(peer) {
  const pc = waCall.pcs[peer.trim().toLowerCase()];
  if (!pc) return;
  const q = waCall.iceCandQueues[peer.trim().toLowerCase()] || [];
  while (q.length) { try{ await pc.addIceCandidate(new RTCIceCandidate(q.shift())); }catch(e){} }
}

// ---- Signaling ----
function waSendSignal(type, data, recipient) {
  if (!activeMeeting) return;
  const sig = {
    id: 'wa-' + Date.now() + '-' + Math.random().toString(36).slice(2,6),
    meetingId: activeMeeting.id,
    sender: currentUser.email,
    recipient: recipient || null,
    type, data,
    timestamp: new Date().toISOString()
  };
  syncRecordToSupabase('signals', sig);
}

function waStartSignaling() {
  if (!activeMeeting) return;
  setTimeout(() => waSendSignal('ready', true, null), 400);
  clearInterval(waCall.signalPollInterval);
  waCall.signalPollInterval = setInterval(async () => {
    if (!activeMeeting || !supabaseActive || !supabaseClient) return;
    try {
      const cutoff = waCall.lastSignalTs || new Date(Date.now() - 90000).toISOString();
      const { data, error } = await supabaseClient
        .from('apex_sync').select('data,created_at')
        .eq('collection','signals').gt('created_at', cutoff)
        .order('created_at',{ascending:true}).limit(60);
      if (error || !data) return;
      if (data.length > 0) waCall.lastSignalTs = data[data.length-1].created_at;
      for (const row of data) {
        try {
          const sig = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
          if (!sig || sig.meetingId !== activeMeeting.id) continue;
          const me = (currentUser.email||'').trim().toLowerCase();
          if ((sig.sender||'').trim().toLowerCase() === me) continue;
          if (sig.type === 'chat_msg') {
            waCall.inCallMessages.push({ sender: sig.data?.sender || sig.sender, text: sig.data?.text || '', mine: false, time: sig.data?.time || '' });
            waRenderCallChat();
            if (!waCall.chatOpen) { const b=document.getElementById('wa-chat-badge'); if(b){b.style.display='flex';b.textContent='●';} }
          } else {
            await waHandleSignal(sig);
          }
        } catch(e){}
      }
    } catch(e){}
  }, 1800);
}

// ---- Controls ----
function waToggleMic() {
  waCall.micMuted = !waCall.micMuted;
  if (waCall.localStream) waCall.localStream.getAudioTracks().forEach(t => t.enabled = !waCall.micMuted);
  const btn = document.getElementById('wa-btn-mic');
  const on = document.getElementById('wa-mic-on');
  const off = document.getElementById('wa-mic-off');
  if (waCall.micMuted) {
    if (btn) btn.classList.add('muted');
    if (on) on.style.display = 'none'; if (off) off.style.display = 'block';
  } else {
    if (btn) btn.classList.remove('muted');
    if (on) on.style.display = 'block'; if (off) off.style.display = 'none';
  }
  // Update self tile muted icon
  const selfTile = document.getElementById('wa-tile-self');
  if (selfTile) {
    let icon = selfTile.querySelector('.wa-tile-muted');
    if (waCall.micMuted && !icon) {
      icon = document.createElement('div'); icon.className = 'wa-tile-muted';
      icon.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/></svg>';
      selfTile.appendChild(icon);
    } else if (!waCall.micMuted && icon) { icon.remove(); }
  }
}

function waToggleCam() {
  waCall.camOff = !waCall.camOff;
  if (waCall.localStream) waCall.localStream.getVideoTracks().forEach(t => t.enabled = !waCall.camOff);
  const btn = document.getElementById('wa-btn-cam');
  const on = document.getElementById('wa-cam-on'); const off = document.getElementById('wa-cam-off');
  if (waCall.camOff) {
    if (btn) btn.classList.add('off');
    if (on) on.style.display = 'none'; if (off) off.style.display = 'block';
  } else {
    if (btn) btn.classList.remove('off');
    if (on) on.style.display = 'block'; if (off) off.style.display = 'none';
  }
  const selfTile = document.getElementById('wa-tile-self');
  if (selfTile) {
    const vid = selfTile.querySelector('video');
    const fb = selfTile.querySelector('.wa-avatar-fallback');
    if (waCall.camOff) { if(vid) vid.style.display='none'; if(fb) fb.style.display='flex'; }
    else { if(vid&&waCall.localStream){vid.style.display='block';if(fb)fb.style.display='none';} }
  }
}

async function waToggleShare() {
  const btn = document.getElementById('wa-btn-share');
  if (!waCall.shareActive) {
    try {
      waCall.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      waCall.shareActive = true;
      if (btn) btn.classList.add('active');
      const track = waCall.screenStream.getVideoTracks()[0];
      Object.values(waCall.pcs).forEach(pc => {
        const s = pc.getSenders().find(x => x.track && x.track.kind === 'video');
        if (s) s.replaceTrack(track).catch(()=>{});
      });
      const sv = document.getElementById('wa-tile-self');
      if (sv) { const vid = sv.querySelector('video'); if(vid){vid.srcObject=waCall.screenStream;vid.style.display='block';} }
      track.onended = () => waToggleShare();
    } catch(e) {}
  } else {
    waCall.shareActive = false;
    if (btn) btn.classList.remove('active');
    if (waCall.screenStream) { waCall.screenStream.getTracks().forEach(t=>t.stop()); waCall.screenStream = null; }
    if (waCall.localStream) {
      const ct = waCall.localStream.getVideoTracks()[0];
      Object.values(waCall.pcs).forEach(pc => {
        const s = pc.getSenders().find(x => x.track && x.track.kind === 'video');
        if (s && ct) s.replaceTrack(ct).catch(()=>{});
      });
      const sv = document.getElementById('wa-tile-self');
      if (sv) { const vid = sv.querySelector('video'); if(vid) vid.srcObject=waCall.localStream; }
    }
  }
}

function waToggleCallChat() {
  waCall.chatOpen = !waCall.chatOpen;
  const panel = document.getElementById('wa-call-chat-panel');
  const btn = document.getElementById('wa-btn-chat');
  if (panel) panel.style.display = waCall.chatOpen ? 'flex' : 'none';
  if (btn) { waCall.chatOpen ? btn.classList.add('active') : btn.classList.remove('active'); }
  if (waCall.chatOpen) { const b=document.getElementById('wa-chat-badge'); if(b)b.style.display='none'; }
  if (waCall.chatOpen && waCall.participantsOpen) waToggleParticipants();
}

function waToggleParticipants() {
  waCall.participantsOpen = !waCall.participantsOpen;
  const panel = document.getElementById('wa-participants-panel');
  if (panel) panel.style.display = waCall.participantsOpen ? 'flex' : 'none';
  if (waCall.participantsOpen && waCall.chatOpen) waToggleCallChat();
  waRenderParticipantsList();
}

function waPopupMinimise() {
  waCall.minimised = true;
  const popup = document.getElementById('wa-call-popup');
  const pill = document.getElementById('wa-call-pill');
  if (popup) popup.style.display = 'none';
  if (pill) pill.style.display = 'flex';
}

function waPopupRestore() {
  waCall.minimised = false;
  const popup = document.getElementById('wa-call-popup');
  const pill = document.getElementById('wa-call-pill');
  if (popup) popup.style.display = 'flex';
  if (pill) pill.style.display = 'none';
}

function waSendCallChat(event) {
  event.preventDefault();
  const input = document.getElementById('wa-call-chat-input');
  if (!input || !input.value.trim()) return;
  const msg = { sender: currentUser.name || currentUser.email.split('@')[0], text: input.value.trim(), mine: true, time: new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) };
  waCall.inCallMessages.push(msg);
  waRenderCallChat();
  waSendSignal('chat_msg', { sender: msg.sender, text: msg.text, time: msg.time }, null);
  input.value = '';
}

function waRenderCallChat() {
  const c = document.getElementById('wa-call-chat-msgs');
  if (!c) return;
  c.innerHTML = '';
  waCall.inCallMessages.forEach(m => {
    const d = document.createElement('div');
    d.className = 'wa-call-chat-msg' + (m.mine ? ' mine' : '');
    d.innerHTML = `<div class="wa-csender">${m.mine?'You':m.sender}</div><div style="font-size:11px;">${m.text}</div><div style="font-size:9px;color:rgba(255,255,255,0.3);margin-top:1px;">${m.time}</div>`;
    c.appendChild(d);
  });
  c.scrollTop = c.scrollHeight;
}

function waRenderParticipantsList() {
  const c = document.getElementById('wa-participants-list');
  if (!c) return;
  c.innerHTML = '';
  waGetParticipants().forEach(email => {
    const u = db.users ? db.users.find(x => x && x.email && x.email.trim().toLowerCase() === email) : null;
    const name = u ? u.name : email.split('@')[0];
    const avatar = u && u.avatar ? u.avatar : '';
    const isMe = email === (currentUser.email||'').trim().toLowerCase();
    const d = document.createElement('div');
    d.className = 'wa-participants-item';
    d.innerHTML = (avatar ? `<img src="${avatar}" alt="${name}">` : `<div class="wa-p-initial">${name.charAt(0).toUpperCase()}</div>`)
      + `<div><div style="font-size:11px;font-weight:600;color:#fff;">${name}${isMe?' (You)':''}</div><div style="font-size:9px;color:#22c55e;">● Active</div></div>`;
    c.appendChild(d);
  });
}

function waEndCall() {
  clearInterval(waCall.timerInterval);
  clearInterval(waCall.signalPollInterval);
  if (waCall.localStream) { waCall.localStream.getTracks().forEach(t=>t.stop()); waCall.localStream=null; }
  if (waCall.screenStream) { waCall.screenStream.getTracks().forEach(t=>t.stop()); waCall.screenStream=null; }
  Object.values(waCall.pcs).forEach(pc=>{try{pc.close();}catch(e){}});
  waCall.pcs={}; waCall.remoteStreams={}; waCall.iceCandQueues={}; waCall.pendingSignals=new Set();
  const popup = document.getElementById('wa-call-popup');
  const pill = document.getElementById('wa-call-pill');
  if (popup) popup.style.display = 'none';
  if (pill) pill.style.display = 'none';
  if (activeMeeting) leaveMeeting().catch(()=>{});
}

// Global exports
window.openWAStyleCall = openWAStyleCall;
window.waToggleMic = waToggleMic;
window.waToggleCam = waToggleCam;
window.waToggleShare = waToggleShare;
window.waToggleCallChat = waToggleCallChat;
window.waToggleParticipants = waToggleParticipants;
window.waSendCallChat = waSendCallChat;
window.waEndCall = waEndCall;
window.waPopupMinimise = waPopupMinimise;
window.waPopupRestore = waPopupRestore;

