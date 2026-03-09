 const carouselContainer = document.getElementById('carousel');
  const bgLayer = document.getElementById('bgLayer');
  const modal = document.getElementById('modal');
  const modalImg = document.getElementById('modalImg');
  const modalTitle = document.getElementById('modalTitle');
  const downloadBtn = document.getElementById('downloadBtn');
  const closeModal = document.getElementById('closeModal');
  
  // New UI Elements
  const searchInput = document.getElementById('searchInput');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const speedSlider = document.getElementById('speedSlider');

  let $items = [];
  let carouselData = [];
  let progress = 0;
  let startX = 0;
  let isDown = false;
  let dragDistance = 0;
  let activeIndex = 0;
  let currentBg = '';

  // Auto-play variables
  let isPlaying = false;
  let playDirection = 1; // 1 for forward, -1 for backward
  let animationFrameId;

  const speedWheel = 0.03;
  const speedDrag = -0.15;

  async function initCarousel() {
    try {
      const response = await fetch('assets.json');
      if (!response.ok) throw new Error("JSON not found");
      carouselData = await response.json();
    } catch (error) {
      console.warn("Using fallback data.");
      carouselData = fallbackData;
    }

    carouselData.forEach((item, index) => {
      const el = document.createElement('div');
      el.className = 'carousel-item';
      el.innerHTML = `
        <div class="carousel-box" data-index="${index}">
          <div class="title">${item.title}</div>
          <div class="num">${item.id}</div>
          <img src="${item.image}" alt="${item.title}" />
        </div>
      `;
      el.dataset.highres = item.highRes;
      el.dataset.title = item.title;
      el.dataset.image = item.image;
      carouselContainer.appendChild(el);
    });

    $items = document.querySelectorAll('.carousel-item');
    $items.forEach(item => item.style.setProperty('--items', $items.length));
    
    attachEvents();
    animate();
    autoPlayLoop(); // Start loop (but it's paused by default)
  }

  const getZindex = (array, index) => (array.map((_, i) => (index === i) ? array.length : array.length - Math.abs(index - i)));

  const animate = () => {
    progress = Math.max(0, Math.min(progress, 100));
    activeIndex = Math.floor((progress / 100) * ($items.length - 1));
    
    $items.forEach((item, index) => {
      const zIndex = getZindex([...$items], activeIndex)[index];
      item.style.setProperty('--zIndex', zIndex);
      item.style.setProperty('--active', (index - (progress / 100) * ($items.length - 1)));
      item.dataset.isActive = (index === activeIndex) ? "true" : "false";
    });

    if ($items[activeIndex]) {
      const newBg = $items[activeIndex].dataset.image;
      if (currentBg !== newBg) {
        currentBg = newBg;
        bgLayer.style.backgroundImage = `url(${currentBg})`;
      }
    }
  };

  // --- New Features Logic ---

  // 1. Auto-play Loop (Ping-Pong effect)
  function autoPlayLoop() {
    if (isPlaying && !isDown) { // Pause while user is dragging
      const speed = parseFloat(speedSlider.value);
      progress += speed * playDirection;

      if (progress >= 100) {
        progress = 100;
        playDirection = -1; // Reverse
      } else if (progress <= 0) {
        progress = 0;
        playDirection = 1; // Forward
      }
      animate();
    }
    animationFrameId = requestAnimationFrame(autoPlayLoop);
  }

  playPauseBtn.addEventListener('click', () => {
    isPlaying = !isPlaying;
    playPauseBtn.textContent = isPlaying ? 'l l' : '▶';
  });

  // 2. Search Bar Filter
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    if (!query) return;

    // Find first item that includes the search string
    const matchIndex = carouselData.findIndex(item => item.title.toLowerCase().includes(query));
    
    if (matchIndex !== -1) {
      // Pause auto-play if user is searching
      isPlaying = false;
      playPauseBtn.textContent = '▶';
      
      progress = (matchIndex / ($items.length - 1)) * 100;
      animate();
    }
  });

  // 3. Arrow Keys Navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      isPlaying = false; // Pause on manual override
      playPauseBtn.textContent = '▶';
      
      let targetIndex = activeIndex;
      if (e.key === 'ArrowRight') targetIndex = Math.min(activeIndex + 1, $items.length - 1);
      if (e.key === 'ArrowLeft') targetIndex = Math.max(activeIndex - 1, 0);
      
      progress = (targetIndex / ($items.length - 1)) * 100;
      animate();
    }
  });


  // --- Standard Events ---
  function attachEvents() {
    $items.forEach((item, i) => {
      item.addEventListener('click', () => {
        if (Math.abs(dragDistance) > 5) return;

        if (item.dataset.isActive === "true") {
          openModal(item.dataset.title, item.dataset.highres);
        } else {
          progress = (i / ($items.length - 1)) * 100;
          animate();
        }
      });
    });

    document.addEventListener('wheel', e => {
      progress += e.deltaY * speedWheel;
      animate();
    }, { passive: true });

    const startDrag = (e) => {
      if(e.target === searchInput || e.target === speedSlider) return; // Ignore inputs
      isDown = true;
      dragDistance = 0;
      startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    };

    const moveDrag = (e) => {
      if (!isDown) return;
      const x = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const mouseProgress = (x - startX) * speedDrag;
      dragDistance += mouseProgress;
      progress += mouseProgress;
      startX = x;
      animate();
    };

    const endDrag = () => { isDown = false; };

    document.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', moveDrag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchstart', startDrag, { passive: true });
    document.addEventListener('touchmove', moveDrag, { passive: true });
    document.addEventListener('touchend', endDrag);
  }

  // Gyroscope
  window.addEventListener('deviceorientation', (e) => {
    if (!e.gamma || !e.beta) return;
    const tiltX = Math.min(Math.max(e.gamma / 45, -1), 1); 
    const tiltY = Math.min(Math.max(e.beta / 45, -1), 1);
    document.documentElement.style.setProperty('--gyro-x', `${tiltX * 12}deg`);
    document.documentElement.style.setProperty('--gyro-y', `${tiltY * -12}deg`);
  });

  // Modal
  function openModal(title, highResUrl) {
    modalImg.src = highResUrl;
    modalTitle.textContent = title;
    downloadBtn.href = highResUrl;
    downloadBtn.download = title + "_HighRes"; 
    modal.classList.add('active');
    
    // Pause auto-slide when modal opens
    if(isPlaying) {
      isPlaying = false;
      playPauseBtn.textContent = '▶';
    }
  }

  closeModal.addEventListener('click', () => modal.classList.remove('active'));
  modal.addEventListener('click', (e) => {
    if(e.target === modal) modal.classList.remove('active');
  });

  initCarousel();
