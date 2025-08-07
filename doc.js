/**
 * Documentation Site - Main JavaScript
 * Handles markdown rendering, search functionality, navigation, and UI interactions
 */

// ============================================================================
// GLOBAL VARIABLES AND INITIALIZATION
// ============================================================================

/** @type {Array} List of markdown files loaded from docs.json */
let files = [];

/** @type {Object} Markdown-it instance for rendering markdown */
const md = window.markdownit({
  html: true,
  linkify: true
});

/** @type {Object|null} Intersection observer for table of contents */
let onThisPageObserver = null;

// ============================================================================
// DOM ELEMENTS
// ============================================================================

// Search elements
const searchOverlay = document.getElementById('search-overlay');
const searchOverlayInput = document.getElementById('search-overlay-input');
const searchOverlayResults = document.getElementById('search-overlay-results');
const closeSearchOverlayBtn = document.getElementById('close-search-overlay');
const searchInput = document.getElementById('search');
const searchResults = document.getElementById('search-results');

// Navigation elements
const navEl = document.getElementById('nav');
const menuBtn = document.getElementById('menu-btn');
const closeNavBtn = document.getElementById('close-nav-btn');

// UI elements
const themeBtn = document.getElementById('theme-btn');
const hljsLink = document.getElementById('hljs-style');

// Pagination elements
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Highlights search terms in text
 * @param {string} text - Text to highlight
 * @param {string} query - Search query
 * @returns {string} Text with highlighted search terms
 */
function highlightText(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${query.trim().split(/\s+/).filter(Boolean).join('|')})`, 'gi');
  return text.replace(regex, '<span class="highlight">$1</span>');
}

/**
 * Navigates to a specific slug
 * @param {string} slug - Target slug to navigate to
 */
function navigateToSlug(slug) {
  if (location.hash !== `#${slug}`) {
    location.hash = slug;
  } else {
    loadMarkdown(slug);
  }
}

/**
 * Toggles element visibility
 * @param {HTMLElement} element - Element to toggle
 * @param {string} showClass - CSS class to add/remove for showing
 */
function toggleElement(element, showClass = 'show') {
  if (element) {
    element.classList.toggle(showClass);
  }
}

/**
 * Closes element if it's open
 * @param {HTMLElement} element - Element to close
 * @param {string} showClass - CSS class that indicates element is open
 */
function closeElement(element, showClass = 'show') {
  if (element && element.classList.contains(showClass)) {
    element.classList.remove(showClass);
  }
}

// ============================================================================
// SEARCH FUNCTIONALITY
// ============================================================================

/**
 * Performs search across all files
 * @param {string} query - Search query
 * @param {HTMLElement} resultsContainer - Container to display results
 * @param {string} resultClass - CSS class for result items
 */
function performSearch(query, resultsContainer, resultClass = 'search-overlay-result') {
  resultsContainer.innerHTML = '';

  if (query.length < 2) return;

  const results = [];
  const queryWords = query.split(/\s+/).filter(w => w);

  // Search through all files
  files.forEach(file => {
    const title = file.name;
    const content = file.content || '';
    const slug = file.slug;

    const titleMatch = title.toLowerCase().includes(query);
    const matchedLines = [];

    // Search content lines
    content.split('\n').forEach((line, index) => {
      const lowerLine = line.toLowerCase();
      if (queryWords.every(word => lowerLine.includes(word))) {
        matchedLines.push({ line: line.trim(), index: index });
      }
    });

    if (titleMatch || matchedLines.length > 0) {
      results.push({
        title: title,
        slug: slug,
        matchedLines: matchedLines,
        titleMatch: titleMatch
      });
    }
  });

  // Display results
  if (results.length > 0) {
    results.forEach(result => {
      const resultLink = document.createElement('a');
      resultLink.href = `#${result.slug}`;
      resultLink.className = resultClass;

      let snippetHTML = '';
      if (result.matchedLines.length > 0) {
        const snippetText = result.matchedLines[0].line;
        snippetHTML = `<div class="${resultClass}-snippet">${highlightText(snippetText, query)}</div>`;
      } else if (result.titleMatch) {
        snippetHTML = `<div class="${resultClass}-snippet"><em>Match in title</em></div>`;
      }

      resultLink.innerHTML = `
        <div class="${resultClass}-title">${highlightText(result.title, query)}</div>
        ${snippetHTML}
      `;

      // Handle result click
      resultLink.addEventListener('click', (e) => {
        e.preventDefault();
        const slug = new URL(resultLink.href).hash.substring(1);
        
        // Close search overlay if open
        if (searchOverlay.classList.contains('active')) {
          hideSearchOverlay();
        }
        
        // Hide original search results
        if (searchResults) {
          searchResults.style.display = 'none';
          searchInput.value = '';
        }

        navigateToSlug(slug);
      });

      resultsContainer.appendChild(resultLink);
    });
  } else {
    const noResults = document.createElement('div');
    noResults.className = resultClass;
    noResults.innerHTML = `<div class="${resultClass}-snippet">No results found</div>`;
    resultsContainer.appendChild(noResults);
  }
}

/**
 * Shows search overlay with close effect
 */
function showSearchOverlay() {
  // Add closing effect to search bar
  if (searchInput) {
    // Add ripple effect
    searchInput.classList.add('ripple');
    
    // Start closing animation
    setTimeout(() => {
      searchInput.classList.add('closing');
      searchInput.classList.remove('ripple');
    }, 150);
    
    // After close effect, open overlay
    setTimeout(() => {
      searchInput.classList.remove('closing');
      searchInput.classList.add('opening');
      
      searchOverlay.classList.add('active');
      searchOverlayInput.focus();
      document.body.style.overflow = 'hidden';
      
      // Remove opening effect after overlay is shown
      setTimeout(() => {
        searchInput.classList.remove('opening');
      }, 200);
    }, 350);
  } else {
    // Fallback if search input not found
    searchOverlay.classList.add('active');
    searchOverlayInput.focus();
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Hides search overlay
 */
function hideSearchOverlay() {
  searchOverlay.classList.remove('active');
  searchOverlayInput.value = '';
  searchOverlayResults.innerHTML = '';
  document.body.style.overflow = '';
}

// ============================================================================
// NAVIGATION FUNCTIONS
// ============================================================================

/**
 * Renders sidebar navigation grouped by doc-section
 */
function renderNav() {
  const nav = document.getElementById('nav');
  nav.innerHTML = '';

  // Group files by doc-section
  const groups = files.reduce((acc, file) => {
    const label = file['doc-section'] || 'General';
    if (!acc[label]) acc[label] = [];
    acc[label].push(file);
    return acc;
  }, {});

  const ul = document.createElement('ul');

  // Maintain order of sections as they appear in files
  const labelOrder = [];
  const seenLabels = new Set();
  files.forEach(file => {
    const label = file['doc-section'] || 'General';
    if (!seenLabels.has(label)) {
      labelOrder.push(label);
      seenLabels.add(label);
    }
  });

  // Create navigation structure
  labelOrder.forEach(label => {
    const sectionLi = document.createElement('li');
    sectionLi.textContent = label;
    sectionLi.className = 'nav-section';
    ul.appendChild(sectionLi);

    // Add documents under this section
    groups[label].forEach(file => {
      const li = document.createElement('li');
      li.dataset.path = file.path;
      const a = document.createElement('a');
      a.href = `#${file.slug}`;
      a.textContent = file.name;
      li.appendChild(a);
      ul.appendChild(li);
    });
  });

  nav.appendChild(ul);
}

/**
 * Sets active link in navigation
 * @param {string} slug - Current active slug
 */
function setActiveLink(slug) {
  document.querySelectorAll('#nav a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === `#${slug}`);
  });
}

/**
 * Loads and renders markdown content
 * @param {string} slug - Slug of the file to load
 */
function loadMarkdown(slug) {
  const file = files.find(f => f.slug === slug);

  if (file && typeof file.content !== 'undefined') {
    document.getElementById('content').innerHTML = md.render(file.content);
    
    // Scroll container to top
    const containerEl = document.getElementById('container');
    if (containerEl) {
      containerEl.scrollTo({ top: 0 });
    }
    
    setActiveLink(slug);
    enhanceCodeBlocks();
  } else {
    document.getElementById('content').innerHTML = 'Failed to load Markdown file.';
    console.error(`Content for ${slug} not pre-loaded or file not found.`);
  }
}

/**
 * Updates pagination controls
 * @param {string} currentSlug - Current active slug
 */
function updatePagination(currentSlug) {
  if (!files.length) return;
  
  const idx = files.findIndex(f => f.slug === currentSlug);
  prevBtn.disabled = idx <= 0;
  nextBtn.disabled = idx === -1 || idx >= files.length - 1;

  prevBtn.dataset.target = idx > 0 ? files[idx - 1].slug : '';
  nextBtn.dataset.target = idx < files.length - 1 ? files[idx + 1].slug : '';
}

// ============================================================================
// UI ENHANCEMENTS
// ============================================================================

/**
 * Enhances code blocks with syntax highlighting and copy buttons
 */
function enhanceCodeBlocks() {
  document.querySelectorAll('#content pre code').forEach(block => {
    // Syntax highlighting
    if (window.hljs) {
      hljs.highlightElement(block);
    }
    
    // Avoid adding multiple copy buttons
    if (block.parentNode.querySelector('.copy-btn')) return;

    // Create copy button
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.innerHTML = '<i class="bi bi-copy"></i>';
    
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(block.innerText);
        btn.classList.add('copied');
        btn.innerHTML = '<i class="bi bi-check2-square"></i>';
        
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = '<i class="bi bi-copy"></i>';
        }, 2000);
      } catch (err) {
        console.error('Copy failed', err);
      }
    });
    
    // Position button
    block.parentNode.style.position = 'relative';
    btn.style.position = 'absolute';
    btn.style.top = '8px';
    btn.style.right = '8px';
    block.parentNode.appendChild(btn);
  });
}

/**
 * Sets highlight.js theme
 * @param {boolean} isDark - Whether dark theme is active
 */
function setHljsTheme(isDark) {
  const base = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/';
  hljsLink.href = `${base}github-dark.min.css`;
}

// ============================================================================
// TABLE OF CONTENTS
// ============================================================================

/**
 * Generates table of contents from page headings
 */
function generateTableOfContents() {
  const content = document.getElementById('content');
  const tocList = document.getElementById('on-this-page-list');
  
  if (!content || !tocList) return;
  
  tocList.innerHTML = '';
  
  const headings = content.querySelectorAll('h2, h3, h4, h5, h6');
  
  if (headings.length === 0) {
    const onThisPage = document.getElementById('on-this-page');
    if (onThisPage) onThisPage.style.display = 'none';
    return;
  }
  
  const onThisPage = document.getElementById('on-this-page');
  if (onThisPage) onThisPage.style.display = 'block';
  
  headings.forEach((heading, index) => {
    // Generate ID if not present
    if (!heading.id) {
      heading.id = `heading-${index}`;
    }
    
    const li = document.createElement('li');
    const a = document.createElement('a');
    
    a.href = `#${heading.id}`;
    a.textContent = heading.textContent;
    a.dataset.headingLevel = heading.tagName.toLowerCase();
    
    // Add indentation for nested headings
    const level = parseInt(heading.tagName.charAt(1));
    if (level > 2) {
      a.style.paddingLeft = `${16 + (level - 2) * 12}px`;
    }
    
    li.appendChild(a);
    tocList.appendChild(li);
    
    // Smooth scroll to heading
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const targetHeading = document.getElementById(heading.id);
      if (targetHeading) {
        const container = document.getElementById('container');
        const headerHeight = 60;
        const offset = targetHeading.offsetTop - headerHeight - 20;
        
        container.scrollTo({
          top: offset,
          behavior: 'smooth'
        });
        
        history.replaceState(null, null, `#${heading.id}`);
      }
    });
  });
  
  setupIntersectionObserver();
}

/**
 * Sets up intersection observer for active heading highlighting
 */
function setupIntersectionObserver() {
  if (onThisPageObserver) {
    onThisPageObserver.disconnect();
  }
  
  const content = document.getElementById('content');
  const headings = content.querySelectorAll('h2, h3, h4, h5, h6');
  
  if (headings.length === 0) return;
  
  const tocLinks = document.querySelectorAll('#on-this-page-list a');
  
  onThisPageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const headingId = entry.target.id;
      const tocLink = document.querySelector(`#on-this-page-list a[href="#${headingId}"]`);
      
      if (tocLink && entry.isIntersecting) {
        tocLinks.forEach(link => link.classList.remove('active'));
        tocLink.classList.add('active');
      }
    });
  }, {
    root: document.getElementById('container'),
    rootMargin: '-20% 0px -70% 0px',
    threshold: 0
  });
  
  headings.forEach(heading => {
    onThisPageObserver.observe(heading);
  });
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Sets up all event listeners
 */
function setupEventListeners() {
  // Search overlay events
  searchInput?.addEventListener('click', showSearchOverlay);
  closeSearchOverlayBtn?.addEventListener('click', hideSearchOverlay);
  
  // Search overlay click outside
  searchOverlay?.addEventListener('click', (e) => {
    if (e.target === searchOverlay) {
      hideSearchOverlay();
    }
  });
  
  // Search input handlers
  searchOverlayInput?.addEventListener('input', () => {
    const query = searchOverlayInput.value.toLowerCase().trim();
    performSearch(query, searchOverlayResults, 'search-overlay-result');
  });
  
  // Original search input (for backward compatibility)
  searchInput?.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    
    if (query.length < 2) {
      searchResults.style.display = 'none';
      return;
    }
    
    performSearch(query, searchResults, 'result');
    searchResults.style.display = 'block';
  });
  
  // Hide search results when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container-wrapper')) {
      searchResults.style.display = 'none';
    }
  });
  
  // Mobile navigation
  menuBtn?.addEventListener('click', () => {
    navEl.classList.toggle('open');
  });
  
  closeNavBtn?.addEventListener('click', () => {
    navEl.classList.remove('open');
  });
  
  // Close sidebar after navigation on mobile
  navEl?.addEventListener('click', e => {
    if (e.target.tagName === 'A' && window.innerWidth <= 768) {
      navEl.classList.remove('open');
    }
  });
  
  // Dark mode toggle
  themeBtn?.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    const iconClass = isDark ? 'bi-brightness-high-fill' : 'bi-moon-stars-fill';
    themeBtn.innerHTML = `<i class="bi ${iconClass}"></i>`;
    setHljsTheme();
  });
  
  // Pagination
  prevBtn?.addEventListener('click', () => {
    const target = prevBtn.dataset.target;
    if (target) location.hash = target;
  });
  
  nextBtn?.addEventListener('click', () => {
    const target = nextBtn.dataset.target;
    if (target) location.hash = target;
  });
  
  // On This Page functionality
  const onThisPageBtn = document.getElementById('on-this-page-btn');
  const onThisPage = document.getElementById('on-this-page');
  
  onThisPageBtn?.addEventListener('click', () => {
    toggleElement(onThisPage, 'show');
  });
  
  // Close On This Page when clicking outside
  document.addEventListener('click', (e) => {
    if (onThisPage && onThisPage.classList.contains('show') && 
        !onThisPage.contains(e.target) && 
        !onThisPageBtn?.contains(e.target)) {
      onThisPage.classList.remove('show');
    }
  });
  
  // Global keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);
  
  // Arrow key navigation
  window.addEventListener('keydown', handleArrowKeyNavigation);
  
  // Hash change navigation
  window.addEventListener('hashchange', () => {
    const slug = location.hash.substring(1) || (files[0] ? files[0].slug : '');
    loadMarkdown(slug);
    updatePagination(slug);
  });
}

/**
 * Handles keyboard shortcuts
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleKeyboardShortcuts(e) {
  // Escape key - close overlays
  if (e.key === 'Escape') {
    closeElement(searchOverlay, 'active');
    closeElement(document.getElementById('on-this-page'), 'show');
  }
  
  // Ctrl+K / Cmd+K - toggle search
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    if (searchOverlay.classList.contains('active')) {
      hideSearchOverlay();
    } else {
      showSearchOverlay();
    }
  }
  
  // Ctrl+O / Cmd+O - toggle On This Page
  if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
    e.preventDefault();
    const onThisPage = document.getElementById('on-this-page');
    toggleElement(onThisPage, 'show');
  }
}

/**
 * Handles arrow key navigation for pagination
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleArrowKeyNavigation(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  
  if (e.key === 'ArrowLeft' && !prevBtn.disabled) {
    prevBtn.click();
  }
  if (e.key === 'ArrowRight' && !nextBtn.disabled) {
    nextBtn.click();
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes the application
 */
function initializeApp() {
  // Load documentation files
  fetch('docs.json')
    .then(resp => {
      if (!resp.ok) throw new Error('Failed to fetch docs.json');
      return resp.json();
    })
    .then(data => {
      // Add slugs to files
      data.forEach(file => {
        file.slug = file.name.toLowerCase().replace(/\s+/g, '-');
      });

      // Load file contents
      const contentPromises = data.map(file =>
        fetch(file.path)
          .then(res => {
            if (!res.ok) throw new Error(`Failed to load ${file.path}`);
            return res.text();
          })
          .then(text => {
            file.content = text;
            return file;
          })
      );
      return Promise.all(contentPromises);
    })
    .then(filesWithContent => {
      files = filesWithContent;
      renderNav();

      // Load initial content
      const slug = location.hash.substring(1) || (files[0] ? files[0].slug : '');
      loadMarkdown(slug);
      updatePagination(slug);
    })
    .catch(err => {
      console.error('Unable to load file list or content', err);
      document.getElementById('content').textContent = 'Failed to load documentation list.';
    });

  // Setup event listeners
  setupEventListeners();
  
  // Initialize theme
  setHljsTheme();
}

// Enhanced loadMarkdown function to generate TOC
const originalLoadMarkdown = loadMarkdown;
loadMarkdown = function(slug) {
  originalLoadMarkdown(slug);
  
  // Generate table of contents after content is loaded
  setTimeout(() => {
    generateTableOfContents();
  }, 100);
};

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp); 