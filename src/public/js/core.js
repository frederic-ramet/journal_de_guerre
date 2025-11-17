// Core JavaScript - Shared functionality

// Mobile navigation toggle
document.addEventListener('DOMContentLoaded', () => {
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.main-nav')) {
        navLinks.classList.remove('active');
      }
    });

    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
      });
    });
  }
});

// Utility functions
const Utils = {
  // Format date for display
  formatDate(dateString) {
    if (!dateString) return '';
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  },

  // Debounce function
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Show notification
  notify(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Style
    Object.assign(notification.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      padding: '1rem 1.5rem',
      borderRadius: '8px',
      color: 'white',
      fontWeight: '600',
      zIndex: '10000',
      animation: 'slideIn 0.3s ease'
    });

    // Color based on type
    const colors = {
      info: '#3498DB',
      success: '#27AE60',
      warning: '#F39C12',
      error: '#E74C3C'
    };
    notification.style.background = colors[type] || colors.info;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, duration);
  },

  // API request helper
  async api(endpoint, options = {}) {
    const defaults = {
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const config = { ...defaults, ...options };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(`/api${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Convert HTML to plain text
  htmlToText(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  },

  // Escape HTML for safe display
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Add CSS animation keyframes
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Export for use in other modules
window.Utils = Utils;
