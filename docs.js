/**
 * Genes Documentation Site - Dynamic Content Generator
 * Generates HTML body dynamically from JSON specifications
 */

// ============================================================================
// GLOBAL VARIABLES AND INITIALIZATION
// ============================================================================

/** @type {Object} Application configuration and specifications */
let appSpec = null;

/** @type {Array} List of markdown files loaded from specs */
let files = [];

/** @type {Object} Markdown-it instance for rendering markdown */
let md = null;

/** @type {Object|null} Intersection observer for table of contents */
let onThisPageObserver = null;

// Initialize markdown-it when the library is available
function initializeMarkdown() {
  if (window.markdownit && !md) {
    md = window.markdownit({
      html: true,
      linkify: true
    });
    console.log('Markdown-it initialized successfully');
  }
}

// Check for markdown-it availability
if (window.markdownit) {
  initializeMarkdown();
} else {
  // Wait for markdown-it to load
  window.addEventListener('load', () => {
    if (window.markdownit) {
      initializeMarkdown();
    }
  });
}

// ============================================================================
// MAIN APPLICATION INITIALIZATION
// ============================================================================

/**
 * Main application class
 */
class GenesDocumentationApp {
  constructor() {
    this.specUrl = 'docs.json';
    this.init();
  }

  async init() {
    console.log('Initializing Genes Documentation App...');
    
    try {
      // Wait for markdown-it to be available
      if (!md) {
        console.log('Waiting for markdown-it to be available...');
        await this.waitForMarkdownIt();
      }
      
      // Load specifications
      await this.loadSpecifications();
      
      // Generate application
      this.generateApplication();
      
    } catch (error) {
      console.error('Error initializing application:', error);
      this.showError('Failed to initialize application: ' + error.message);
    }
  }

  waitForMarkdownIt() {
    return new Promise((resolve) => {
      if (md) {
        resolve();
        return;
      }
      
      const checkInterval = setInterval(() => {
        if (md) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        console.error('Timeout waiting for markdown-it');
        resolve(); // Continue anyway
      }, 10000);
    });
  }

  async loadSpecifications() {
    console.log('Loading specifications from:', this.specUrl);
    const response = await fetch(this.specUrl);
    if (!response.ok) throw new Error('Failed to fetch specifications');
    
    appSpec = await response.json();
    console.log('Loaded app specifications:', appSpec);
  }

  generateApplication() {
    console.log('Generating application...');
    this.generateHTMLStructure();
    this.initializeApp();
  }

  generateHTMLStructure() {
    console.log('Generating HTML structure...');
    
    // Clear existing content
    document.body.innerHTML = '';
    
    const htmlStructure = `
      <div id="header" style="background: #f8f9fa; padding: 1rem; border-bottom: 1px solid #dee2e6; display: flex; align-items: center; justify-content: space-between;">
        <div class="header-left" style="display: flex; align-items: center; gap: 1rem;">
          <button id="menu-btn" class="icon-btn" aria-label="Toggle navigation" style="padding: 0.5rem; border: 1px solid #dee2e6; background: white; border-radius: 4px; cursor: pointer;">
            <i data-feather="menu"></i>
          </button>
          <button id="mobile-search-btn" class="icon-btn mobile-search-btn" aria-label="Search" title="Search (Ctrl+K)" style="padding: 0.5rem; border: 1px solid #dee2e6; background: white; border-radius: 4px; cursor: pointer;">
            <i class="bi bi-search"></i>
          </button>
        </div>
        <h1 style="margin: 0; color: #333;">${appSpec.title || 'Genes'}</h1>
        <div class="search-container-wrapper" title="Search (Ctrl+K)" style="display: flex; align-items: center; gap: 1rem;">
          <div class="search-container">
            <input type="text" id="search" placeholder="search..." style="padding: 0.5rem; border: 1px solid #dee2e6; border-radius: 4px;" />
            <div id="search-results"></div>
          </div>
          <div class="on-this-page-btn-container">
            <button id="on-this-page-btn" class="icon-btn" aria-label="Toggle table of contents" title="On This Page (Ctrl+O)" style="padding: 0.5rem; border: 1px solid #dee2e6; background: white; border-radius: 4px; cursor: pointer;">
              <i class="bi bi-card-list"></i>
            </button>
            <div id="on-this-page" class="on-this-page">
              <ul id="on-this-page-list"></ul>
            </div>
          </div>
          <button id="theme-btn" class="icon-btn" aria-label="Toggle dark mode" title="Toggle dark/light" style="padding: 0.5rem; border: 1px solid #dee2e6; background: white; border-radius: 4px; cursor: pointer;">
            <i class="bi bi-moon-stars-fill"></i>
          </button>
        </div>
      </div>

      <!-- Search Overlay Modal -->
      <div id="search-overlay" class="search-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000;">
        <div class="search-overlay-content" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 2rem; border-radius: 8px; width: 80%; max-width: 600px;">
          <div class="search-overlay-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h2>Search content or any topic</h2>
            <button id="close-search-overlay" class="close-search-overlay-btn" aria-label="Close search" style="padding: 0.5rem; border: none; background: none; cursor: pointer; font-size: 1.5rem;">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="search-overlay-input-container">
            <input type="text" id="search-overlay-input" placeholder="Type to search titles or content..." autofocus style="width: 100%; padding: 1rem; border: 1px solid #dee2e6; border-radius: 4px; font-size: 1.1rem;" />
            <div id="search-overlay-results"></div>
          </div>
        </div>
      </div>

      <div style="display: flex; height: calc(100vh - 80px);">
        <nav id="nav" style="background: #f8f9fa; padding: 1rem; border-right: 1px solid #dee2e6; width: 250px; overflow-y: auto;">
          <div class="nav-header" style="margin-bottom: 1rem;">
            <button id="close-nav-btn" class="icon-btn close-nav-btn" aria-label="Close navigation" style="padding: 0.5rem; border: 1px solid #dee2e6; background: white; border-radius: 4px; cursor: pointer;">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </nav>

        <div id="container" style="flex: 1; padding: 2rem; overflow-y: auto;">
          <div id="content" style="min-height: 400px; background: white; padding: 2rem; border: 1px solid #dee2e6; border-radius: 4px;">Loading markdown...</div>
          <div id="pagination" class="pagination-container" style="margin-top: 2rem; text-align: center;">
            <div class="btn-group" role="group" aria-label="Pagination">
              <button id="prev-btn" type="button" class="btn btn-primary" disabled aria-label="Previous" style="padding: 0.5rem 1rem; margin: 0 0.25rem; border: 1px solid #007bff; background: #007bff; color: white; border-radius: 4px; cursor: pointer;">
                <i class="bi bi-arrow-left"></i>
              </button>
              <button id="next-btn" type="button" class="btn btn-primary" disabled aria-label="Next" style="padding: 0.5rem 1rem; margin: 0 0.25rem; border: 1px solid #007bff; background: #007bff; color: white; border-radius: 4px; cursor: pointer;">
                <i class="bi bi-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.innerHTML = htmlStructure;
    console.log('HTML structure inserted');
  }

  showError(message) {
    document.body.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: #dc3545;">
        <h2>Error</h2>
        <p>${message}</p>
      </div>
    `;
  }

  async initializeApp() {
    try {
      // Load documentation files from specs
      await this.loadDocumentationFiles();
      
      // Setup the application
      this.setupApplication();
      
      // Initialize theme
      this.initializeTheme();
      
      // Replace feather icons
      if (window.feather) {
        window.feather.replace();
      }
    } catch (error) {
      console.error('Error initializing application:', error);
    }
  }

  async loadDocumentationFiles() {
    if (!appSpec.documentation || !appSpec.documentation.files) {
      throw new Error('No documentation files specified in configuration');
    }

    files = appSpec.documentation.files;
    console.log('Documentation files to load:', files);
    
    // Add slugs to files
    files.forEach(file => {
      file.slug = file.name.toLowerCase().replace(/\s+/g, '-');
    });
    
    // Load file contents
    const contentPromises = files.map(file =>
      fetch(file.path)
        .then(res => {
          if (!res.ok) throw new Error(`Failed to load ${file.path}`);
          return res.text();
        })
        .then(text => {
          file.content = text;
          console.log(`Loaded content for ${file.name}:`, text.substring(0, 100) + '...');
          return file;
        })
    );

    await Promise.all(contentPromises);
    console.log('All documentation files loaded successfully');
  }

  setupApplication() {
    console.log('Setting up application...');
    // Render navigation
    this.renderNav();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Load initial content
    const slug = location.hash.substring(1) || (files[0] ? files[0].slug : '');
    console.log('Loading initial content with slug:', slug);
    this.loadMarkdown(slug);
    this.updatePagination(slug);
  }

  initializeTheme() {
    // Set initial theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
      document.body.classList.add('dark');
      this.setHljsTheme(true);
    }
  }

  setHljsTheme(isDark) {
    const hljsLink = document.getElementById('hljs-style');
    if (hljsLink) {
      const base = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/';
      hljsLink.href = isDark ? `${base}github-dark.min.css` : `${base}github.min.css`;
    }
  }

  // ============================================================================
  // NAVIGATION AND CONTENT METHODS
  // ============================================================================

  renderNav() {
    const nav = document.getElementById('nav');
    if (!nav) return;
    
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
      sectionLi.className = 'nav-section-container';
      
      // Create section header with toggle button
      const sectionHeader = document.createElement('div');
      sectionHeader.className = 'nav-section-header';
      
      const sectionTitle = document.createElement('span');
      sectionTitle.textContent = label;
      sectionTitle.className = 'nav-section-title';
      
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'nav-section-toggle';
      toggleBtn.innerHTML = '<i class="bi bi-chevron-down"></i>';
      toggleBtn.setAttribute('aria-label', `Toggle ${label} section`);
      
      sectionHeader.appendChild(sectionTitle);
      sectionHeader.appendChild(toggleBtn);
      sectionLi.appendChild(sectionHeader);
      
      // Create documents container
      const docsContainer = document.createElement('ul');
      docsContainer.className = 'nav-docs-list';
      
      // Add documents under this section
      groups[label].forEach(file => {
        const li = document.createElement('li');
        li.dataset.path = file.path;
        const a = document.createElement('a');
        a.href = `#${file.slug}`;
        a.textContent = file.name;
        li.appendChild(a);
        docsContainer.appendChild(li);
      });
      
      sectionLi.appendChild(docsContainer);
      
      // Add click handler for section toggle
      sectionHeader.addEventListener('click', () => {
        const isExpanded = sectionLi.classList.contains('expanded');
        if (isExpanded) {
          sectionLi.classList.remove('expanded');
          toggleBtn.innerHTML = '<i class="bi bi-chevron-down"></i>';
        } else {
          sectionLi.classList.add('expanded');
          toggleBtn.innerHTML = '<i class="bi bi-chevron-up"></i>';
        }
      });
      
      // Expand the section containing the current active page
      const currentSlug = location.hash.substring(1);
      if (currentSlug && groups[label].some(file => file.slug === currentSlug)) {
        sectionLi.classList.add('expanded');
        toggleBtn.innerHTML = '<i class="bi bi-chevron-up"></i>';
      }
      
      ul.appendChild(sectionLi);
    });

    nav.appendChild(ul);
  }

  loadMarkdown(slug) {
    console.log('Loading markdown for slug:', slug);
    const file = files.find(f => f.slug === slug);

    if (file && typeof file.content !== 'undefined') {
      console.log('Found file:', file.name, 'with content length:', file.content.length);
      
      // Check if markdown-it is available
      if (!md) {
        console.error('markdown-it not available');
        document.getElementById('content').innerHTML = 'Error: markdown-it library not loaded';
        return;
      }
      
      try {
        const renderedContent = md.render(file.content);
        console.log('Rendered content length:', renderedContent.length);
        document.getElementById('content').innerHTML = renderedContent;
        
        // Scroll container to top
        const containerEl = document.getElementById('container');
        if (containerEl) {
          containerEl.scrollTo({ top: 0 });
        }
        
        this.setActiveLink(slug);
        this.enhanceCodeBlocks();
        this.generateTableOfContents();
      } catch (error) {
        console.error('Error rendering markdown:', error);
        document.getElementById('content').innerHTML = 'Error rendering markdown content';
      }
    } else {
      console.error('File not found or content not loaded for slug:', slug);
      document.getElementById('content').innerHTML = 'Failed to load Markdown file.';
    }
  }

  setActiveLink(slug) {
    // Remove active class from all links
    document.querySelectorAll('#nav a').forEach(a => {
      a.classList.remove('active');
    });
    
    // Add active class to current link
    const activeLink = document.querySelector(`#nav a[href="#${slug}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
      
      // Ensure the section containing this link is expanded
      const sectionContainer = activeLink.closest('.nav-section-container');
      if (sectionContainer && !sectionContainer.classList.contains('expanded')) {
        sectionContainer.classList.add('expanded');
        const toggleBtn = sectionContainer.querySelector('.nav-section-toggle');
        if (toggleBtn) {
          toggleBtn.innerHTML = '<i class="bi bi-chevron-up"></i>';
        }
      }
    }
  }

  updatePagination(currentSlug) {
    if (!files.length) return;
    
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    if (!prevBtn || !nextBtn) return;
    
    const idx = files.findIndex(f => f.slug === currentSlug);
    prevBtn.disabled = idx <= 0;
    nextBtn.disabled = idx === -1 || idx >= files.length - 1;

    prevBtn.dataset.target = idx > 0 ? files[idx - 1].slug : '';
    nextBtn.dataset.target = idx < files.length - 1 ? files[idx + 1].slug : '';
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  enhanceCodeBlocks() {
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

    // Enhance tables for mobile responsiveness and Bootstrap styling
    document.querySelectorAll('#content table').forEach(table => {
      // Add Bootstrap table classes
      table.classList.add('table', 'table-striped', 'table-hover', 'table-bordered', 'table-sm');
      
      const headers = table.querySelectorAll('th');
      const rows = table.querySelectorAll('tbody tr');
      
      if (headers.length > 0) {
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          cells.forEach((cell, index) => {
            if (headers[index]) {
              cell.setAttribute('data-label', headers[index].textContent.trim());
            }
          });
        });
      }
    });
  }

  generateTableOfContents() {
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
    
    this.setupIntersectionObserver();
  }

  setupIntersectionObserver() {
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

  setupEventListeners() {
    // Search overlay events
    const searchInput = document.getElementById('search');
    const closeSearchOverlayBtn = document.getElementById('close-search-overlay');
    const searchOverlay = document.getElementById('search-overlay');
    const searchOverlayInput = document.getElementById('search-overlay-input');
    const searchOverlayResults = document.getElementById('search-overlay-results');
    const searchResults = document.getElementById('search-results');
    const mobileSearchBtn = document.getElementById('mobile-search-btn');
    const menuBtn = document.getElementById('menu-btn');
    const closeNavBtn = document.getElementById('close-nav-btn');
    const navEl = document.getElementById('nav');
    const themeBtn = document.getElementById('theme-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const onThisPageBtn = document.getElementById('on-this-page-btn');
    const onThisPage = document.getElementById('on-this-page');

    // Search overlay events
    searchInput?.addEventListener('click', () => this.showSearchOverlay());
    closeSearchOverlayBtn?.addEventListener('click', () => this.hideSearchOverlay());
    
    // Mobile search button
    mobileSearchBtn?.addEventListener('click', () => this.showSearchOverlay());
    
    // Search overlay click outside
    searchOverlay?.addEventListener('click', (e) => {
      if (e.target === searchOverlay) {
        this.hideSearchOverlay();
      }
    });
    
    // Search input handlers
    searchOverlayInput?.addEventListener('input', () => {
      const query = searchOverlayInput.value.toLowerCase().trim();
      this.performSearch(query, searchOverlayResults, 'search-overlay-result');
    });
    
    // Hide search results when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container-wrapper')) {
        if (searchResults) searchResults.style.display = 'none';
        const searchInput = document.getElementById('search');
        if (searchInput) searchInput.value = '';
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
      this.setHljsTheme(isDark);
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
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
    onThisPageBtn?.addEventListener('click', () => {
      onThisPage.classList.toggle('show');
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
    document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    
    // Arrow key navigation
    window.addEventListener('keydown', (e) => this.handleArrowKeyNavigation(e));
    
    // Hash change navigation
    window.addEventListener('hashchange', () => {
      const slug = location.hash.substring(1) || (files[0] ? files[0].slug : '');
      this.loadMarkdown(slug);
      this.updatePagination(slug);
    });
  }

  // ============================================================================
  // SEARCH FUNCTIONALITY
  // ============================================================================

  showSearchOverlay() {
    const searchOverlay = document.getElementById('search-overlay');
    const searchOverlayInput = document.getElementById('search-overlay-input');
    const searchInput = document.getElementById('search');
    
    if (searchOverlay) {
      searchOverlay.style.display = 'block';
      searchOverlayInput.focus();
      document.body.style.overflow = 'hidden';
    }
  }

  hideSearchOverlay() {
    const searchOverlay = document.getElementById('search-overlay');
    const searchOverlayInput = document.getElementById('search-overlay-input');
    const searchOverlayResults = document.getElementById('search-overlay-results');
    
    if (searchOverlay) {
      searchOverlay.style.display = 'none';
      searchOverlayInput.value = '';
      searchOverlayResults.innerHTML = '';
      document.body.style.overflow = '';
    }
  }

  performSearch(query, resultsContainer, resultClass = 'search-overlay-result') {
    resultsContainer.innerHTML = '';

    if (query.length < 2) {
      resultsContainer.innerHTML = '<div class="search-hint">Type at least 2 characters to search...</div>';
      return;
    }

    // Show loading state
    resultsContainer.innerHTML = '<div class="search-loading">Searching...</div>';

    // Small delay to show loading state and prevent flickering
    setTimeout(() => {
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
      this.displaySearchResults(results, resultsContainer, resultClass, query);
    }, 100);
  }

  displaySearchResults(results, resultsContainer, resultClass, query) {
    resultsContainer.innerHTML = '';

    if (results.length > 0) {
      results.forEach(result => {
        const resultLink = document.createElement('a');
        resultLink.href = `#${result.slug}`;
        resultLink.className = resultClass;

        let snippetHTML = '';
        if (result.matchedLines.length > 0) {
          const snippetText = result.matchedLines[0].line;
          let renderedSnippet;
          try {
            renderedSnippet = md && md.renderInline ? md.renderInline(snippetText) : snippetText;
          } catch (e) {
            console.warn('Failed to render markdown snippet:', e);
            renderedSnippet = snippetText;
          }
          snippetHTML = `<div class="${resultClass}-snippet">${this.highlightText(renderedSnippet, query)}</div>`;
        } else if (result.titleMatch) {
          snippetHTML = `<div class="${resultClass}-snippet"><em>Match in title</em></div>`;
        }

        resultLink.innerHTML = `
          <div class="${resultClass}-title">${this.highlightText(result.title, query)}</div>
          ${snippetHTML}
        `;

        // Store search data for navigation
        resultLink.dataset.searchData = JSON.stringify({
          slug: result.slug,
          matchedLines: result.matchedLines
        });

        // Handle result click
        resultLink.addEventListener('click', (e) => {
          e.preventDefault();
          
          // Close search overlay if open
          const searchOverlay = document.getElementById('search-overlay');
          if (searchOverlay.style.display === 'block') {
            this.hideSearchOverlay();
          }
          
          // Hide original search results
          const searchResults = document.getElementById('search-results');
          if (searchResults) {
            searchResults.style.display = 'none';
            const searchInput = document.getElementById('search');
            if (searchInput) searchInput.value = '';
          }

          // Navigate to the document
          this.navigateToSlug(result.slug);
          
          // Scroll to the first matched line after content loads
          if (result.matchedLines.length > 0) {
            setTimeout(() => {
              this.scrollToSearchResult(result.matchedLines[0]);
            }, 300); // Wait for content to render
          }
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

  highlightText(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query.trim().split(/\s+/).filter(Boolean).join('|')})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
  }

  navigateToSlug(slug) {
    if (location.hash !== `#${slug}`) {
      location.hash = slug;
    } else {
      this.loadMarkdown(slug);
    }
  }

  scrollToSearchResult(matchedLine) {
    const content = document.getElementById('content');
    if (!content) return;

    // Try to find the exact line in the rendered content
    const contentLines = content.textContent.split('\n');
    const targetLineIndex = matchedLine.index;
    
    if (targetLineIndex < contentLines.length) {
      // First try to find by exact text match
      const targetText = matchedLine.line.trim();
      let targetElement = null;
      
      // Search through all elements in the content
      const allElements = content.querySelectorAll('*');
      
      for (const element of allElements) {
        if (element.textContent && element.textContent.includes(targetText)) {
          // Check if this is the most specific match (smallest element containing the text)
          if (!targetElement || element.children.length < targetElement.children.length) {
            targetElement = element;
          }
        }
      }
      
      if (targetElement) {
        // Scroll to the target element
        const container = document.getElementById('container');
        const headerHeight = 60;
        const offset = targetElement.offsetTop - headerHeight - 20;
        
        container.scrollTo({
          top: Math.max(0, offset),
          behavior: 'smooth'
        });
        
        // Highlight the target element temporarily
        targetElement.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
        targetElement.style.transition = 'background-color 0.3s ease';
        
        setTimeout(() => {
          targetElement.style.backgroundColor = '';
        }, 2000);
      } else {
        // Fallback: scroll to approximate position based on line number
        const container = document.getElementById('container');
        const headerHeight = 60;
        const contentHeight = content.scrollHeight;
        const approximateOffset = (targetLineIndex / contentLines.length) * contentHeight;
        
        container.scrollTo({
          top: Math.max(0, approximateOffset - headerHeight),
          behavior: 'smooth'
        });
      }
    }
  }

  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================

  handleKeyboardShortcuts(e) {
    // Escape key - close overlays
    if (e.key === 'Escape') {
      this.hideSearchOverlay();
      const onThisPage = document.getElementById('on-this-page');
      if (onThisPage) onThisPage.classList.remove('show');
    }
    
    // Ctrl+K / Cmd+K - toggle search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const searchOverlay = document.getElementById('search-overlay');
      if (searchOverlay.style.display === 'block') {
        this.hideSearchOverlay();
      } else {
        this.showSearchOverlay();
      }
    }
    
    // Ctrl+O / Cmd+O - toggle On This Page
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
      e.preventDefault();
      const onThisPage = document.getElementById('on-this-page');
      if (onThisPage) onThisPage.classList.toggle('show');
    }
  }

  handleArrowKeyNavigation(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    if (e.key === 'ArrowLeft' && prevBtn && !prevBtn.disabled) {
      prevBtn.click();
    }
    if (e.key === 'ArrowRight' && nextBtn && !nextBtn.disabled) {
      nextBtn.click();
    }
  }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new GenesDocumentationApp();
}); 