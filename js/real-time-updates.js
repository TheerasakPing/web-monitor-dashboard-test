/**
 * Real-time Updates Module for Web Monitor Dashboard
 * 
 * This module handles real-time data updates using WebSockets
 * and updates the UI components accordingly.
 */

// Configuration
const config = {
    updateInterval: 5000, // Milliseconds between updates in demo mode
    animationDuration: 300, // Milliseconds for transition animations
    websocketUrl: 'wss://api.example.com/ws', // Replace with actual WebSocket endpoint
    useMockData: true // Set to false when using a real WebSocket server
};

// Service status constants
const STATUS = {
    HEALTHY: 'Healthy',
    WARNING: 'Warning',
    DOWN: 'Down'
};

// Store for current data
let currentData = {
    services: {},
    stats: {
        total: 0,
        healthy: 0,
        warning: 0,
        down: 0
    },
    lastUpdated: null
};

// WebSocket connection
let socket = null;

/**
 * Initialize the real-time updates module
 */
function initRealTimeUpdates() {
    // Initialize the last updated timestamp
    updateTimestamp();
    
    // Add last updated indicator to the header
    addLastUpdatedIndicator();
    
    if (config.useMockData) {
        console.log('Using mock data for real-time updates');
        // Start mock data updates
        startMockDataUpdates();
    } else {
        // Connect to WebSocket server
        connectWebSocket();
    }
    
    // Initialize current data from the DOM
    initializeDataFromDOM();
}

/**
 * Add last updated indicator to the dashboard header
 */
function addLastUpdatedIndicator() {
    const header = document.querySelector('header');
    const lastUpdatedEl = document.createElement('div');
    lastUpdatedEl.id = 'last-updated';
    lastUpdatedEl.className = 'text-sm text-gray-500 hidden md:block';
    lastUpdatedEl.innerHTML = 'Last updated: <span>Just now</span>';
    
    // Insert before the buttons
    const buttonsContainer = header.querySelector('.flex.items-center.space-x-4');
    header.insertBefore(lastUpdatedEl, buttonsContainer);
}

/**
 * Initialize current data from the DOM elements
 */
function initializeDataFromDOM() {
    // Get all service cards
    const serviceCards = document.querySelectorAll('.service-card');
    
    // Initialize stats
    currentData.stats.total = serviceCards.length;
    currentData.stats.healthy = document.querySelectorAll('.service-card .text-success').length;
    currentData.stats.warning = document.querySelectorAll('.service-card .text-warning').length;
    currentData.stats.down = document.querySelectorAll('.service-card .text-danger').length;
    
    // Initialize services data
    serviceCards.forEach(card => {
        const nameEl = card.querySelector('h4');
        const urlEl = card.querySelector('p.text-sm.text-gray-500');
        const statusEl = card.querySelector('span.px-2.py-1.text-xs.font-medium.rounded-full');
        const uptimeEl = card.querySelector('.flex.items-center.justify-between:nth-of-type(1) .text-sm.font-medium');
        const responseTimeEl = card.querySelector('.flex.items-center.justify-between:nth-of-type(2) .text-sm.font-medium');
        
        if (nameEl && urlEl && statusEl) {
            const name = nameEl.textContent.trim();
            const url = urlEl.textContent.trim();
            const status = statusEl.textContent.trim();
            const uptime = uptimeEl ? parseFloat(uptimeEl.textContent) : 0;
            const responseTime = responseTimeEl ? responseTimeEl.textContent.trim() : '--';
            
            currentData.services[name] = {
                name,
                url,
                status,
                uptime,
                responseTime,
                element: card
            };
        }
    });
    
    console.log('Initialized current data from DOM:', currentData);
}

/**
 * Connect to WebSocket server
 */
function connectWebSocket() {
    try {
        socket = new WebSocket(config.websocketUrl);
        
        socket.onopen = () => {
            console.log('WebSocket connection established');
            // Subscribe to updates
            socket.send(JSON.stringify({ action: 'subscribe', topic: 'services' }));
        };
        
        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleDataUpdate(data);
        };
        
        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            // Fall back to mock data if WebSocket fails
            startMockDataUpdates();
        };
        
        socket.onclose = () => {
            console.log('WebSocket connection closed');
            // Attempt to reconnect after a delay
            setTimeout(connectWebSocket, 5000);
        };
    } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        // Fall back to mock data if WebSocket fails
        startMockDataUpdates();
    }
}

/**
 * Start mock data updates for demonstration
 */
function startMockDataUpdates() {
    setInterval(() => {
        const mockUpdate = generateMockUpdate();
        handleDataUpdate(mockUpdate);
    }, config.updateInterval);
}

/**
 * Generate mock update data for demonstration
 */
function generateMockUpdate() {
    // Get a random service
    const serviceNames = Object.keys(currentData.services);
    const randomServiceName = serviceNames[Math.floor(Math.random() * serviceNames.length)];
    const service = currentData.services[randomServiceName];
    
    // Randomly change status occasionally
    let newStatus = service.status;
    if (Math.random() < 0.2) { // 20% chance to change status
        const statuses = [STATUS.HEALTHY, STATUS.WARNING, STATUS.DOWN];
        const currentIndex = statuses.indexOf(service.status);
        const newIndex = (currentIndex + (Math.random() > 0.5 ? 1 : -1) + 3) % 3;
        newStatus = statuses[newIndex];
    }
    
    // Randomly change response time
    let newResponseTime;
    if (service.responseTime === '--') {
        newResponseTime = newStatus === STATUS.DOWN ? '--' : Math.floor(Math.random() * 300) + 'ms';
    } else {
        const currentTime = parseInt(service.responseTime);
        const variation = Math.floor(Math.random() * 30) - 15; // -15 to +15 ms
        newResponseTime = newStatus === STATUS.DOWN ? '--' : Math.max(20, currentTime + variation) + 'ms';
    }
    
    // Randomly change uptime
    let newUptime;
    if (newStatus === STATUS.DOWN) {
        newUptime = Math.max(90, service.uptime - Math.random() * 0.5).toFixed(2);
    } else if (newStatus === STATUS.WARNING) {
        newUptime = Math.max(95, service.uptime - Math.random() * 0.2).toFixed(2);
    } else {
        newUptime = Math.min(100, service.uptime + Math.random() * 0.1).toFixed(2);
    }
    
    // Create mock update
    return {
        service: randomServiceName,
        status: newStatus,
        responseTime: newResponseTime,
        uptime: newUptime + '%'
    };
}

/**
 * Handle data updates from WebSocket or mock data
 */
function handleDataUpdate(data) {
    console.log('Received update:', data);
    
    // Update timestamp
    updateTimestamp();
    
    // Update service data
    if (data.service && currentData.services[data.service]) {
        const service = currentData.services[data.service];
        const oldStatus = service.status;
        
        // Update service data
        if (data.status) service.status = data.status;
        if (data.responseTime) service.responseTime = data.responseTime;
        if (data.uptime) service.uptime = parseFloat(data.uptime);
        
        // Update UI
        updateServiceUI(service, oldStatus);
        
        // Update stats if status changed
        if (oldStatus !== service.status) {
            updateStats(oldStatus, service.status);
        }
    }
}

/**
 * Update the service UI with new data
 */
function updateServiceUI(service, oldStatus) {
    const card = service.element;
    
    // Update status badge
    const statusBadge = card.querySelector('span.px-2.py-1.text-xs.font-medium.rounded-full');
    if (statusBadge) {
        // Remove old status classes
        statusBadge.classList.remove('bg-green-100', 'bg-yellow-100', 'bg-red-100');
        statusBadge.classList.remove('text-success', 'text-warning', 'text-danger');
        statusBadge.classList.remove('pulse');
        
        // Add new status classes
        if (service.status === STATUS.HEALTHY) {
            statusBadge.classList.add('bg-green-100', 'text-success');
        } else if (service.status === STATUS.WARNING) {
            statusBadge.classList.add('bg-yellow-100', 'text-warning');
        } else if (service.status === STATUS.DOWN) {
            statusBadge.classList.add('bg-red-100', 'text-danger', 'pulse');
        }
        
        // Update text
        statusBadge.textContent = service.status;
        
        // Add animation if status changed
        if (oldStatus !== service.status) {
            statusBadge.style.transition = `all ${config.animationDuration}ms ease`;
            statusBadge.classList.add('animate-pulse');
            setTimeout(() => {
                statusBadge.classList.remove('animate-pulse');
            }, config.animationDuration);
        }
    }
    
    // Update uptime
    const uptimeEl = card.querySelector('.flex.items-center.justify-between:nth-of-type(1) .text-sm.font-medium');
    const uptimeBar = card.querySelector('.bg-success, .bg-warning, .bg-danger');
    
    if (uptimeEl && uptimeBar) {
        // Update text
        uptimeEl.textContent = service.uptime + '%';
        
        // Update progress bar
        uptimeBar.style.width = service.uptime + '%';
        
        // Update bar color
        uptimeBar.classList.remove('bg-success', 'bg-warning', 'bg-danger');
        if (service.status === STATUS.HEALTHY) {
            uptimeBar.classList.add('bg-success');
        } else if (service.status === STATUS.WARNING) {
            uptimeBar.classList.add('bg-warning');
        } else if (service.status === STATUS.DOWN) {
            uptimeBar.classList.add('bg-danger');
        }
    }
    
    // Update response time
    const responseTimeEl = card.querySelector('.flex.items-center.justify-between:nth-of-type(2) .text-sm.font-medium');
    if (responseTimeEl) {
        responseTimeEl.textContent = service.responseTime;
        
        // Add animation
        responseTimeEl.style.transition = `all ${config.animationDuration}ms ease`;
        responseTimeEl.classList.add('animate-pulse');
        setTimeout(() => {
            responseTimeEl.classList.remove('animate-pulse');
        }, config.animationDuration);
    }
}

/**
 * Update stats when a service status changes
 */
function updateStats(oldStatus, newStatus) {
    // Decrement old status count
    if (oldStatus === STATUS.HEALTHY) currentData.stats.healthy--;
    else if (oldStatus === STATUS.WARNING) currentData.stats.warning--;
    else if (oldStatus === STATUS.DOWN) currentData.stats.down--;
    
    // Increment new status count
    if (newStatus === STATUS.HEALTHY) currentData.stats.healthy++;
    else if (newStatus === STATUS.WARNING) currentData.stats.warning++;
    else if (newStatus === STATUS.DOWN) currentData.stats.down++;
    
    // Update stats UI
    updateStatsUI();
}

/**
 * Update the stats UI with new data
 */
function updateStatsUI() {
    // Update healthy count
    const healthyEl = document.querySelector('.stats-healthy');
    if (healthyEl) {
        healthyEl.textContent = currentData.stats.healthy;
        animateElement(healthyEl);
    }
    
    // Update warning count
    const warningEl = document.querySelector('.stats-warning');
    if (warningEl) {
        warningEl.textContent = currentData.stats.warning;
        animateElement(warningEl);
    }
    
    // Update down count
    const downEl = document.querySelector('.stats-down');
    if (downEl) {
        downEl.textContent = currentData.stats.down;
        animateElement(downEl);
    }
}

/**
 * Animate an element with a pulse effect
 */
function animateElement(element) {
    element.style.transition = `all ${config.animationDuration}ms ease`;
    element.classList.add('animate-pulse');
    setTimeout(() => {
        element.classList.remove('animate-pulse');
    }, config.animationDuration);
}

/**
 * Update the last updated timestamp
 */
function updateTimestamp() {
    currentData.lastUpdated = new Date();
    
    const lastUpdatedEl = document.querySelector('#last-updated span');
    if (lastUpdatedEl) {
        lastUpdatedEl.textContent = formatTimestamp(currentData.lastUpdated);
    }
}

/**
 * Format a timestamp for display
 */
function formatTimestamp(date) {
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // Difference in seconds
    
    if (diff < 5) return 'Just now';
    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    
    return date.toLocaleTimeString();
}

// Export functions for use in main script
window.realTimeUpdates = {
    init: initRealTimeUpdates
};