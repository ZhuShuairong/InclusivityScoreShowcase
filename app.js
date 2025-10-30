let allEvents = [];
let filteredEvents = [];
let currentChart = null;

// Pagination settings
let currentPage = 1;
const itemsPerPage = 24; // Show 24 events per page
let totalPages = 1;

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
            allEvents = results.data.filter(row => row.event_id);
            filteredEvents = [...allEvents];
            
            populateFilterOptions();
            currentPage = 1; // Reset to first page
            updatePagination();
            displayCurrentPage();
            updateResultCount();
        },
        error: function(error) {
            container.innerHTML = `<div class="col-12 alert alert-danger">Error loading data: ${error.message}</div>`;
        }
    });
}

function populateFilterOptions() {
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
    document.getElementById('searchBox').addEventListener('input', applyFilters);
    document.getElementById('monthFilter').addEventListener('change', applyFilters);
    document.getElementById('costFilter').addEventListener('change', applyFilters);
    document.getElementById('activityFilter').addEventListener('change', applyFilters);
    
    const scoreFilter = document.getElementById('scoreFilter');
    scoreFilter.addEventListener('input', function() {
        document.getElementById('scoreValue').textContent = this.value;
        applyFilters();
    });
    
    document.querySelectorAll('.age-filter').forEach(checkbox => {
        checkbox.addEventListener('change', applyFilters);
    });
    
    document.getElementById('sortBy').addEventListener('change', function() {
        sortAndDisplayEvents();
    });
    
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
}

function applyFilters() {
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();
    const monthFilter = document.getElementById('monthFilter').value;
    const costFilter = document.getElementById('costFilter').value;
    const activityFilter = document.getElementById('activityFilter').value;
    const minScore = parseFloat(document.getElementById('scoreFilter').value);
    
    const youngChecked = document.getElementById('youngFilter').checked;
    const adultChecked = document.getElementById('adultFilter').checked;
    const seniorChecked = document.getElementById('seniorFilter').checked;
    
    filteredEvents = allEvents.filter(event => {
        if (searchTerm && !event.name.toLowerCase().includes(searchTerm)) {
            return false;
        }
        
        if (monthFilter && event.month !== monthFilter) {
            return false;
        }
        
        if (costFilter && event.cost !== costFilter) {
            return false;
        }
        
        if (activityFilter && event.activity_level !== activityFilter) {
            return false;
        }
        
        if (event.inclusivity_score_100 < minScore) {
            return false;
        }
        
        // Handle both boolean and string values
        const isYoungSuitable = event.suitable_for_young === true || event.suitable_for_young === 'True' || event.suitable_for_young === 1;
        const isAdultSuitable = event.suitable_for_adult === true || event.suitable_for_adult === 'True' || event.suitable_for_adult === 1;
        const isSeniorSuitable = event.suitable_for_senior === true || event.suitable_for_senior === 'True' || event.suitable_for_senior === 1;
        
        if (!youngChecked && isYoungSuitable) {
            return false;
        }
        if (!adultChecked && isAdultSuitable) {
            return false;
        }
        if (!seniorChecked && isSeniorSuitable) {
            return false;
        }
        
        return true;
    });
    
    currentPage = 1; // Reset to first page when filters change
    sortAndDisplayEvents();
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
    
    updatePagination();
    displayCurrentPage();
    updateResultCount();
}

function updatePagination() {
    totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
    renderPaginationControls();
}

function displayCurrentPage() {
    const container = document.getElementById('eventsContainer');
    
    if (filteredEvents.length === 0) {
        container.innerHTML = '<div class="col-12 alert alert-info">No events match your filters.</div>';
        return;
    }
    
    // Calculate slice indices for current page
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentEvents = filteredEvents.slice(startIndex, endIndex);
    
    container.innerHTML = '';
    
    currentEvents.forEach(event => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4 mb-4';
        
        const scoreClass = getScoreClass(event.inclusivity_score_100);
        
        // Handle both boolean and string values for suitable_for fields
        const isYoungSuitable = event.suitable_for_young === true || event.suitable_for_young === 'True' || event.suitable_for_young === 1;
        const isAdultSuitable = event.suitable_for_adult === true || event.suitable_for_adult === 'True' || event.suitable_for_adult === 1;
        const isSeniorSuitable = event.suitable_for_senior === true || event.suitable_for_senior === 'True' || event.suitable_for_senior === 1;
        
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
                        ${isYoungSuitable ? '<span class="badge bg-success age-badge">Youth</span>' : ''}
                        ${isAdultSuitable ? '<span class="badge bg-success age-badge">Adult</span>' : ''}
                        ${isSeniorSuitable ? '<span class="badge bg-success age-badge">Senior</span>' : ''}
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
    
    // Scroll to top of results
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderPaginationControls() {
    const paginationContainer = document.getElementById('paginationControls');
    if (!paginationContainer) return;
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHTML = '<nav><ul class="pagination justify-content-center">';
    
    // Previous button
    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}">Previous</a>
        </li>
    `;
    
    // Page numbers with smart truncation
    const maxVisiblePages = 7;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // First page
    if (startPage > 1) {
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
        if (startPage > 2) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `;
    }
    
    // Last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
    }
    
    // Next button
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}">Next</a>
        </li>
    `;
    
    paginationHTML += '</ul></nav>';
    paginationContainer.innerHTML = paginationHTML;
    
    // Add click handlers
    paginationContainer.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            if (!this.parentElement.classList.contains('disabled')) {
                const page = parseInt(this.dataset.page);
                if (page && page !== currentPage) {
                    currentPage = page;
                    displayCurrentPage();
                    renderPaginationControls();
                }
            }
        });
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
    document.getElementById('modalEventName').textContent = event.name;
    
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
    createRadarChart(event);
    
    const modal = new bootstrap.Modal(document.getElementById('eventModal'));
    modal.show();
}

function createRadarChart(event) {
    const ctx = document.getElementById('radarChart').getContext('2d');
    
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
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, filteredEvents.length);
    countElement.textContent = `Showing ${startIndex}-${endIndex} of ${filteredEvents.length} events (Page ${currentPage} of ${totalPages})`;
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
    
    currentPage = 1;
    applyFilters();
}
