// Custom Swagger UI enhancements
// Case-insensitive search filter

(function() {
  'use strict';

  // Set favicon
  function setFavicon() {
    // Remove existing favicons
    const existingLinks = document.querySelectorAll('link[rel*="icon"]');
    existingLinks.forEach(link => link.remove());

    // Add new favicon
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = '/favicon.svg';
    document.head.appendChild(link);
  }

  // Call immediately
  setFavicon();

  // Wait for Swagger UI to fully load
  function initCustomFilter() {
    const filterInput = document.querySelector('.filter-container input');

    if (!filterInput) {
      // Retry if not loaded yet
      setTimeout(initCustomFilter, 100);
      return;
    }

    console.log('Swagger custom filter initialized');

    // Remove default Swagger filter behavior
    const clone = filterInput.cloneNode(true);
    filterInput.parentNode.replaceChild(clone, filterInput);

    // Add custom case-insensitive filter
    clone.addEventListener('input', function(e) {
      const searchTerm = e.target.value.trim().toLowerCase();

      // Get all operation blocks and their parent sections
      const sections = document.querySelectorAll('.opblock-tag-section');

      if (searchTerm === '') {
        // Show everything if search is empty
        sections.forEach(function(section) {
          section.style.display = '';
          const operations = section.querySelectorAll('.opblock');
          operations.forEach(function(op) {
            op.style.display = '';
          });
        });
        return;
      }

      // Filter each section and its operations
      sections.forEach(function(section) {
        const tagElement = section.querySelector('.opblock-tag');
        const tagName = tagElement ? tagElement.textContent.toLowerCase() : '';
        const operations = section.querySelectorAll('.opblock');

        let sectionHasMatch = tagName.includes(searchTerm);
        let hasVisibleOperations = false;

        // Check each operation in this section
        operations.forEach(function(operation) {
          const opText = operation.textContent.toLowerCase();
          const summaryPath = operation.querySelector('.opblock-summary-path');
          const summaryDesc = operation.querySelector('.opblock-summary-description');

          let matches = opText.includes(searchTerm);

          // Also check path and description specifically
          if (summaryPath) {
            matches = matches || summaryPath.textContent.toLowerCase().includes(searchTerm);
          }
          if (summaryDesc) {
            matches = matches || summaryDesc.textContent.toLowerCase().includes(searchTerm);
          }

          if (matches || sectionHasMatch) {
            operation.style.display = '';
            hasVisibleOperations = true;
          } else {
            operation.style.display = 'none';
          }
        });

        // Show/hide the entire section based on matches
        if (sectionHasMatch || hasVisibleOperations) {
          section.style.display = '';
        } else {
          section.style.display = 'none';
        }
      });
    });
  }

  // Start initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCustomFilter);
  } else {
    initCustomFilter();
  }
})();
