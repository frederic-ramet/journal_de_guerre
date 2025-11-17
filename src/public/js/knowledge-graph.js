/**
 * Knowledge Graph Visualization
 * Interactive graph display for the Étude space
 */

class KnowledgeGraph {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error('Graph container not found:', containerId);
      return;
    }

    this.nodes = [];
    this.edges = [];
    this.selectedNode = null;
    this.simulation = null;
    this.svg = null;
    this.width = 0;
    this.height = 0;
    this.zoom = null;

    this.colors = {
      person: '#FF6B6B',
      concept: '#4ECDC4',
      place: '#45B7D1',
      object: '#96CEB4',
      theme: '#DDA0DD'
    };

    this.init();
  }

  async init() {
    await this.loadData();
    this.createSVG();
    this.createSimulation();
    this.render();
    this.createLegend();
    this.createInfoPanel();
  }

  async loadData() {
    try {
      const response = await fetch('/api/ontology/graph');
      if (!response.ok) throw new Error('Failed to load graph data');
      const data = await response.json();
      this.nodes = data.nodes;
      this.edges = data.edges;
    } catch (err) {
      console.error('Error loading graph:', err);
      // Use sample data if API fails
      this.nodes = [];
      this.edges = [];
    }
  }

  createSVG() {
    // Clear container
    this.container.innerHTML = '';

    // Get dimensions
    this.width = this.container.clientWidth || 800;
    this.height = this.container.clientHeight || 600;

    // Create SVG
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('class', 'knowledge-graph-svg');

    // Add zoom behavior
    this.zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        this.graphGroup.attr('transform', event.transform);
      });

    this.svg.call(this.zoom);

    // Create main group for graph elements
    this.graphGroup = this.svg.append('g').attr('class', 'graph-group');

    // Add arrow marker for directed edges
    this.svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#999');
  }

  createSimulation() {
    this.simulation = d3.forceSimulation(this.nodes)
      .force('link', d3.forceLink(this.edges)
        .id(d => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody()
        .strength(-300))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .force('collision', d3.forceCollide().radius(30));
  }

  render() {
    // Create edges
    this.edgeElements = this.graphGroup.append('g')
      .attr('class', 'edges')
      .selectAll('line')
      .data(this.edges)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrowhead)');

    // Create edge labels
    this.edgeLabels = this.graphGroup.append('g')
      .attr('class', 'edge-labels')
      .selectAll('text')
      .data(this.edges)
      .enter()
      .append('text')
      .attr('font-size', '8px')
      .attr('fill', '#666')
      .attr('text-anchor', 'middle')
      .text(d => d.type);

    // Create nodes
    this.nodeElements = this.graphGroup.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(this.nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .call(this.drag())
      .on('click', (event, d) => this.selectNode(d))
      .on('mouseover', (event, d) => this.highlightNode(d, true))
      .on('mouseout', (event, d) => this.highlightNode(d, false));

    // Add circles to nodes
    this.nodeElements.append('circle')
      .attr('r', d => this.getNodeRadius(d))
      .attr('fill', d => this.colors[d.category] || '#ccc')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Add labels to nodes
    this.nodeElements.append('text')
      .attr('dy', 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#333')
      .text(d => this.truncateLabel(d.label));

    // Update positions on simulation tick
    this.simulation.on('tick', () => this.ticked());
  }

  ticked() {
    this.edgeElements
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    this.edgeLabels
      .attr('x', d => (d.source.x + d.target.x) / 2)
      .attr('y', d => (d.source.y + d.target.y) / 2);

    this.nodeElements
      .attr('transform', d => `translate(${d.x},${d.y})`);
  }

  drag() {
    return d3.drag()
      .on('start', (event, d) => {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
  }

  getNodeRadius(node) {
    const baseRadius = 15;
    const freqFactor = node.frequency ? Math.log(node.frequency + 1) * 2 : 0;
    return baseRadius + freqFactor;
  }

  truncateLabel(label) {
    return label.length > 12 ? label.substring(0, 10) + '...' : label;
  }

  selectNode(node) {
    this.selectedNode = node;
    this.showNodeInfo(node);

    // Highlight selected node
    this.nodeElements.selectAll('circle')
      .attr('stroke', d => d.id === node.id ? '#FF9900' : '#fff')
      .attr('stroke-width', d => d.id === node.id ? 4 : 2);
  }

  highlightNode(node, highlight) {
    if (highlight) {
      // Find connected edges
      const connectedEdges = this.edges.filter(
        e => e.source.id === node.id || e.target.id === node.id
      );

      // Highlight edges
      this.edgeElements
        .attr('stroke', e => {
          if (e.source.id === node.id || e.target.id === node.id) {
            return this.colors[node.category];
          }
          return '#999';
        })
        .attr('stroke-width', e => {
          if (e.source.id === node.id || e.target.id === node.id) {
            return 3;
          }
          return 1.5;
        });
    } else {
      // Reset edges
      this.edgeElements
        .attr('stroke', '#999')
        .attr('stroke-width', 1.5);
    }
  }

  showNodeInfo(node) {
    const infoPanel = document.getElementById('node-info');
    if (!infoPanel) return;

    const connectedNodes = this.getConnectedNodes(node);
    const incomingRels = this.edges.filter(e => e.target.id === node.id);
    const outgoingRels = this.edges.filter(e => e.source.id === node.id);

    infoPanel.innerHTML = `
      <button class="node-info-close" onclick="this.parentElement.classList.remove('visible')">
        <i class="fas fa-times"></i>
      </button>
      <h4>${node.label}</h4>
      <div class="node-info-content">
        <p><strong>Type:</strong> ${node.type || node.category}</p>
        ${node.frequency ? `<p><strong>Fréquence:</strong> ~${node.frequency} occurrences</p>` : ''}

        ${outgoingRels.length > 0 ? `
          <p><strong>Relations sortantes:</strong></p>
          <ul>
            ${outgoingRels.map(r => `<li>${r.type} → ${r.target.label}</li>`).join('')}
          </ul>
        ` : ''}

        ${incomingRels.length > 0 ? `
          <p><strong>Relations entrantes:</strong></p>
          <ul>
            ${incomingRels.map(r => `<li>${r.source.label} → ${r.type}</li>`).join('')}
          </ul>
        ` : ''}

        <p><strong>Connexions:</strong> ${connectedNodes.length} nœuds</p>
      </div>
    `;

    infoPanel.classList.add('visible');
  }

  getConnectedNodes(node) {
    const connectedIds = new Set();

    this.edges.forEach(edge => {
      if (edge.source.id === node.id) {
        connectedIds.add(edge.target.id);
      }
      if (edge.target.id === node.id) {
        connectedIds.add(edge.source.id);
      }
    });

    return this.nodes.filter(n => connectedIds.has(n.id));
  }

  createLegend() {
    const legend = document.createElement('div');
    legend.className = 'graph-legend';
    legend.innerHTML = `
      <h5>Légende</h5>
      ${Object.entries(this.colors).map(([type, color]) => `
        <div class="legend-item">
          <span class="legend-color" style="background-color: ${color}"></span>
          <span class="legend-label">${this.translateType(type)}</span>
        </div>
      `).join('')}
    `;
    this.container.appendChild(legend);
  }

  createInfoPanel() {
    const infoPanel = document.createElement('div');
    infoPanel.id = 'node-info';
    infoPanel.className = 'node-info';
    this.container.appendChild(infoPanel);
  }

  translateType(type) {
    const translations = {
      person: 'Personne',
      concept: 'Concept',
      place: 'Lieu',
      object: 'Objet',
      theme: 'Thème'
    };
    return translations[type] || type;
  }

  // Controls
  zoomIn() {
    this.svg.transition().call(this.zoom.scaleBy, 1.3);
  }

  zoomOut() {
    this.svg.transition().call(this.zoom.scaleBy, 0.7);
  }

  resetZoom() {
    this.svg.transition().call(
      this.zoom.transform,
      d3.zoomIdentity.translate(this.width / 2, this.height / 2).scale(1)
    );
  }

  filter(category) {
    if (category === 'all') {
      this.nodeElements.style('opacity', 1);
      this.edgeElements.style('opacity', 0.6);
    } else {
      this.nodeElements.style('opacity', d =>
        d.category === category ? 1 : 0.2
      );
      this.edgeElements.style('opacity', e => {
        const sourceMatch = e.source.category === category;
        const targetMatch = e.target.category === category;
        return (sourceMatch || targetMatch) ? 0.6 : 0.1;
      });
    }
  }

  destroy() {
    if (this.simulation) {
      this.simulation.stop();
    }
    this.container.innerHTML = '';
  }
}

// Export for use
window.KnowledgeGraph = KnowledgeGraph;
