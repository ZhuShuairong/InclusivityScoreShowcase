let allEvents = [];
let filteredEvents = [];
let currentChart = null;

// Load CSV on page load
document.addEventListener('DOMContentLoaded', function() {
    loadCSV();
    setupEventListeners();
});

function loadCSV() {
    const container = document.getElementById('eventsContainer');
    container.innerHTML = '<div class="col-12 loading">Loading events...</div>';
    
    Papa.parse('finaldataset.csv', {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: function(results) {
            allEvents = results.data.filter(row => row.event_id); // Remove empty rows
            filteredEvents = [...allEvents];
            
            populateFilterOptions();
            applyFilters();
            updateResultCount();
        },
        error: function(error) {
            container.innerHTML = `<div class="col-12 alert alert-danger">Error loading data: ${error.message}</div>`;
        }
    });
}

function populateFilterOptions() {
    // Populate month filter
    const months = [...new Set(allEvents.map(e => e.month))].sort();
    const monthFilter = document.getElementById('monthFilter');
    months.forEach(month => {
        if (month) {
            const option = document.createElement('option');
            option.value = month;
            option.textContent = month;
            monthFilter.appendChild(option);
        }
    });
}

function setupEventListeners() {
    // Search box
    document.getElementById('searchBox').addEventListener('input', applyFilters);
    
    // Dropdowns
    document.getElementById('monthFilter').addEventListener('change', applyFilters);
    document.getElementById('costFilter').addEventListener('change', applyFilters);
    document.getElementById('activityFilter').addEventListener('change', applyFilters);
    
    // Score range
    const scoreFilter = document.getElementById('scoreFilter');
    scoreFilter.addEventListener('input', function() {
        document.getElementById('scoreValue').textContent = this.value;
        applyFilters();
    });
    
    // Age checkboxes
    document.querySelectorAll('.age-filter').forEach(checkbox => {
        checkbox.addEventListener('change', applyFilters);
    });
    
    // Sort
    document.getElementById('sortBy').addEventListener('change', function() {
        sortAndDisplayEvents();
    });
    
    // Reset button
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
}

function applyFilters() {
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();
    const monthFilter = document.getElementById('monthFilter').value;
    const costFilter = document.getElementById('costFilter').value;
    const activityFilter = document.getElementById('activityFilter').value;
    const minScore = parseFloat(document.getElementById('scoreFilter').value);
    
    // Age filters
    const youngChecked = document.getElementById('youngFilter').checked;
    const adultChecked = document.getElementById('adultFilter').checked;
    const seniorChecked = document.getElementById('seniorFilter').checked;
    
    filteredEvents = allEvents.filter(event => {
        // Search filter
        if (searchTerm && !event.name.toLowerCase().includes(searchTerm)) {
            return false;
        }
        
        // Month filter
        if (monthFilter && event.month !== monthFilter) {
            return false;
        }
        
        // Cost filter
        if (costFilter && event.cost !== costFilter) {
            return false;
        }
        
        // Activity filter
        if (activityFilter && event.activity_level !== activityFilter) {
            return false;
        }
        
        // Score filter
        if (event.inclusivity_score_100 < minScore) {
            return false;
        }
        
        // Age filter
        if (!youngChecked && event.suitable_for_young) {
            return false;
        }
        if (!adultChecked && event.suitable_for_adult) {
            return false;
        }
        if (!seniorChecked && event.suitable_for_senior) {
            return false;
        }
        
        return true;
    });
    
    sortAndDisplayEvents();
    updateResultCount();
}

function sortAndDisplayEvents() {
    const sortBy = document.getElementById('sortBy').value;
    
    filteredEvents.sort((a, b) => {
        switch(sortBy) {
            case 'score_desc':
                return b.inclusivity_score_100 - a.inclusivity_score_100;
            case 'score_asc':
                return a.inclusivity_score_100 - b.inclusivity_score_100;
            case 'name_asc':
                return a.name.localeCompare(b.name);
            case 'month_asc':
                return a.month.localeCompare(b.month);
            default:
                return 0;
        }
    });
    
    displayEvents();
}

function displayEvents() {
    const container = document.getElementById('eventsContainer');
    
    if (filteredEvents.length === 0) {
        container.innerHTML = '<div class="col-12 alert alert-info">No events match your filters.</div>';
        return;
    }
    
    container.innerHTML = '';
    
    filteredEvents.forEach(event => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4 mb-4';
        
        const scoreClass = getScoreClass(event.inclusivity_score_100);
        
        col.innerHTML = `
            <div class="card event-card" data-event-id="${event.event_id}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <h5 class="card-title">${event.name}</h5>
                        <span class="badge score-badge ${scoreClass}">${event.inclusivity_score_100.toFixed(1)}</span>
                    </div>
                    
                    <p class="text-muted mb-2"><small><i class="bi bi-calendar"></i> ${event.month}</small></p>
                    
                    <div class="mb-3">
                        <span class="badge bg-primary badge-pill">${formatLabel(event.cost)}</span>
                        <span class="badge bg-info badge-pill">${formatLabel(event.activity_level)}</span>
                        <span class="badge bg-secondary badge-pill">${formatLabel(event.complexity)}</span>
                    </div>
                    
                    <div class="mb-2">
                        <strong>Suitable for:</strong><br>
                        ${event.suitable_for_young ? '<span class="badge bg-success age-badge">Youth</span>' : ''}
                        ${event.suitable_for_adult ? '<span class="badge bg-success age-badge">Adult</span>' : ''}
                        ${event.suitable_for_senior ? '<span class="badge bg-success age-badge">Senior</span>' : ''}
                    </div>
                    
                    <div class="mt-3">
                        <small><strong>Key Factors:</strong></small>
                        <div class="progress mb-1" style="height: 8px;" title="Accessibility">
                            <div class="progress-bar bg-success" style="width: ${event.bus_proximity_score * 100}%"></div>
                        </div>
                        <div class="progress mb-1" style="height: 8px;" title="Cost Score">
                            <div class="progress-bar bg-info" style="width: ${event.cost_score * 100}%"></div>
                        </div>
                        <div class="progress" style="height: 8px;" title="Age Diversity">
                            <div class="progress-bar bg-warning" style="width: ${event.age_diversity_score * 100}%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        col.querySelector('.event-card').addEventListener('click', function() {
            showEventDetails(event);
        });
        
        container.appendChild(col);
    });
}

function getScoreClass(score) {
    if (score >= 80) return 'score-excellent';
    if (score >= 60) return 'score-good';
    if (score >= 40) return 'score-fair';
    return 'score-poor';
}

function formatLabel(text) {
    if (!text) return '';
    return text.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function showEventDetails(event) {
    // Set modal title
    document.getElementById('modalEventName').textContent = event.name;
    
    // Create details HTML
    const detailsHTML = `
        <h6>Overall Inclusivity Score</h6>
        <h2 class="text-primary">${event.inclusivity_score_100.toFixed(2)} / 100</h2>
        
        <hr>
        
        <h6>Event Characteristics</h6>
        <ul class="list-unstyled">
            <li><strong>Month:</strong> ${event.month}</li>
            <li><strong>Cost:</strong> ${formatLabel(event.cost)}</li>
            <li><strong>Complexity:</strong> ${formatLabel(event.complexity)}</li>
            <li><strong>Activity Level:</strong> ${formatLabel(event.activity_level)}</li>
            <li><strong>Noise Level:</strong> ${formatLabel(event.noise_level)}</li>
            <li><strong>Type:</strong> ${formatLabel(event.cultural_type)}</li>
            <li><strong>Scope:</strong> ${formatLabel(event.audience_scope)}</li>
        </ul>
        
        <hr>
        
        <h6>Score Components</h6>
        <div class="factor-item">
            <span>Bus Proximity:</span>
            <span class="text-primary fw-bold">${(event.bus_proximity_score * 100).toFixed(1)}%</span>
        </div>
        <div class="factor-item">
            <span>Parking Proximity:</span>
            <span class="text-primary fw-bold">${(event.parking_proximity_score * 100).toFixed(1)}%</span>
        </div>
        <div class="factor-item">
            <span>Traffic Score:</span>
            <span class="text-primary fw-bold">${(event.traffic_score * 100).toFixed(1)}%</span>
        </div>
        <div class="factor-item">
            <span>Cost Accessibility:</span>
            <span class="text-primary fw-bold">${(event.cost_score * 100).toFixed(1)}%</span>
        </div>
        <div class="factor-item">
            <span>Complexity:</span>
            <span class="text-primary fw-bold">${(event.complexity_score * 100).toFixed(1)}%</span>
        </div>
        <div class="factor-item">
            <span>Activity Level:</span>
            <span class="text-primary fw-bold">${(event.activity_score * 100).toFixed(1)}%</span>
        </div>
        <div class="factor-item">
            <span>Age Diversity:</span>
            <span class="text-primary fw-bold">${(event.age_diversity_score * 100).toFixed(1)}%</span>
        </div>
        
        <hr>
        
        <h6>Location Details</h6>
        <ul class="list-unstyled">
            <li><strong>Nearest Bus Stop:</strong> ${event.nearest_bus_stop_km.toFixed(3)} km</li>
            <li><strong>Nearest Parking:</strong> ${event.nearest_parking_lot_name} (${event.nearest_parking_lot_km.toFixed(3)} km)</li>
            <li><strong>Coordinates:</strong> ${event.latitude.toFixed(6)}, ${event.longitude.toFixed(6)}</li>
        </ul>
    `;
    
    document.getElementById('modalEventDetails').innerHTML = detailsHTML;
    
    // Create radar chart
    createRadarChart(event);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('eventModal'));
    modal.show();
}

function createRadarChart(event) {
    const ctx = document.getElementById('radarChart').getContext('2d');
    
    // Destroy previous chart if exists
    if (currentChart) {
        currentChart.destroy();
    }
    
    currentChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: [
                'Bus Access',
                'Parking Access',
                'Low Traffic',
                'Cost Access',
                'Simplicity',
                'Low Activity',
                'Age Diversity'
            ],
            datasets: [{
                label: 'Inclusivity Factors',
                data: [
                    event.bus_proximity_score * 100,
                    event.parking_proximity_score * 100,
                    event.traffic_score * 100,
                    event.cost_score * 100,
                    event.complexity_score * 100,
                    event.activity_score * 100,
                    event.age_diversity_score * 100
                ],
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(54, 162, 235, 1)'
            }]
        },
        options: {
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function updateResultCount() {
    const countElement = document.getElementById('resultCount');
    countElement.textContent = `Showing ${filteredEvents.length} of ${allEvents.length} events`;
}

function resetFilters() {
    document.getElementById('searchBox').value = '';
    document.getElementById('monthFilter').value = '';
    document.getElementById('costFilter').value = '';
    document.getElementById('activityFilter').value = '';
    document.getElementById('scoreFilter').value = 0;
    document.getElementById('scoreValue').textContent = '0';
    
    document.querySelectorAll('.age-filter').forEach(checkbox => {
        checkbox.checked = true;
    });
    
    applyFilters();
}
