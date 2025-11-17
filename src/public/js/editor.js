// Editor Page JavaScript

document.addEventListener('DOMContentLoaded', () => {
  const pageData = window.pageData || {};

  // DOM Elements
  const pageImage = document.getElementById('pageImage');
  const transcriptionEditor = document.getElementById('transcriptionEditor');
  const htmlPreview = document.getElementById('htmlPreview');
  const notesEditor = document.getElementById('notesEditor');
  const statusSelect = document.getElementById('statusSelect');
  const statusBadge = document.getElementById('statusBadge');
  const saveBtn = document.getElementById('saveBtn');

  // Image manipulation state
  let rotation = pageData.adjustments?.rotation || 0;
  let zoom = 1;
  let brightness = pageData.adjustments?.brightness || 100;
  let contrast = pageData.adjustments?.contrast || 100;

  // Tab switching
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;

      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(`${tabName}-tab`).classList.add('active');
    });
  });

  // Image tools
  document.getElementById('rotateLeft')?.addEventListener('click', () => {
    rotation -= 90;
    applyImageTransform();
  });

  document.getElementById('rotateRight')?.addEventListener('click', () => {
    rotation += 90;
    applyImageTransform();
  });

  document.getElementById('zoomIn')?.addEventListener('click', () => {
    zoom = Math.min(zoom + 0.25, 3);
    applyImageTransform();
  });

  document.getElementById('zoomOut')?.addEventListener('click', () => {
    zoom = Math.max(zoom - 0.25, 0.5);
    applyImageTransform();
  });

  document.getElementById('resetView')?.addEventListener('click', () => {
    rotation = 0;
    zoom = 1;
    brightness = 100;
    contrast = 100;
    applyImageTransform();
    document.getElementById('brightnessSlider').value = 100;
    document.getElementById('contrastSlider').value = 100;
    updateSliderLabels();
  });

  // Brightness/Contrast tool
  document.getElementById('brightnessTool')?.addEventListener('click', () => {
    const panel = document.getElementById('adjustmentPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });

  document.getElementById('brightnessSlider')?.addEventListener('input', (e) => {
    brightness = e.target.value;
    updateSliderLabels();
    applyImageTransform();
  });

  document.getElementById('contrastSlider')?.addEventListener('input', (e) => {
    contrast = e.target.value;
    updateSliderLabels();
    applyImageTransform();
  });

  function updateSliderLabels() {
    document.getElementById('brightnessValue').textContent = brightness;
    document.getElementById('contrastValue').textContent = contrast;
  }

  function applyImageTransform() {
    if (pageImage) {
      pageImage.style.transform = `rotate(${rotation}deg) scale(${zoom})`;
      pageImage.style.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    }
  }

  // Text formatting helpers
  const formatBtns = document.querySelectorAll('.format-btn');
  formatBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const format = btn.dataset.format;
      const textarea = transcriptionEditor;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);

      let newText = '';
      switch (format) {
        case 'bold':
          newText = `<strong>${selectedText || 'texte'}</strong>`;
          break;
        case 'italic':
          newText = `<em>${selectedText || 'texte'}</em>`;
          break;
        case 'heading':
          newText = `<h4>${selectedText || 'Titre'}</h4>`;
          break;
        case 'list':
          newText = `<ul>\n  <li>${selectedText || 'élément'}</li>\n</ul>`;
          break;
        case 'paragraph':
          newText = `<p>${selectedText || 'paragraphe'}</p>`;
          break;
      }

      textarea.value = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
      updatePreview();
      textarea.focus();
    });
  });

  // Live preview
  function updatePreview() {
    if (htmlPreview && transcriptionEditor) {
      // Convert plain text to HTML if needed
      let html = transcriptionEditor.value;

      // If no HTML tags, wrap in paragraphs
      if (!html.includes('<')) {
        html = html.split('\n\n').map(p => `<p>${p.trim()}</p>`).join('\n');
      }

      htmlPreview.innerHTML = html;
    }
  }

  transcriptionEditor?.addEventListener('input', Utils.debounce(updatePreview, 300));

  // Status change
  statusSelect?.addEventListener('change', () => {
    const newStatus = statusSelect.value;
    statusBadge.className = `badge badge-${newStatus}`;
    const statusText = {
      'draft': 'Brouillon',
      'verified': 'Vérifié',
      'validated': 'Validé'
    };
    statusBadge.textContent = statusText[newStatus];
  });

  // Save functionality
  saveBtn?.addEventListener('click', async () => {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sauvegarde...';

    try {
      // Prepare HTML content
      let htmlContent = transcriptionEditor.value;
      if (!htmlContent.includes('<')) {
        htmlContent = htmlContent.split('\n\n').map(p => `<p>${p.trim()}</p>`).join('\n');
      }

      // Save transcription
      await Utils.api(`/transcriptions/${pageData.id}`, {
        method: 'PUT',
        body: {
          content_html: htmlContent,
          transcriptor_notes: notesEditor.value,
          status: statusSelect.value
        }
      });

      // Save adjustments
      await Utils.api(`/adjustments/${pageData.id}`, {
        method: 'PUT',
        body: {
          rotation,
          crop_x: 0,
          crop_y: 0,
          crop_width: 100,
          crop_height: 100,
          brightness,
          contrast
        }
      });

      Utils.notify('Sauvegarde réussie !', 'success');
    } catch (error) {
      Utils.notify('Erreur lors de la sauvegarde', 'error');
      console.error('Save error:', error);
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fas fa-save"></i> Sauvegarder';
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl+S to save
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      saveBtn?.click();
    }
  });

  // Initial transform
  applyImageTransform();
});
