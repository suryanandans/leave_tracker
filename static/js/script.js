// === FLATPICKR INITIALIZATION ===
flatpickr("#sortMonth", {
    dateFormat: "Y-m",
    plugins: [new monthSelectPlugin({ shorthand: true, dateFormat: "Y-m", altFormat: "F Y" })]
});
flatpickr("#rangeStart", { dateFormat: "Y-m-d" });
flatpickr("#rangeEnd", { dateFormat: "Y-m-d" });

// === UPLOAD CSV FILE ===
document.getElementById("csvUploadForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = new FormData(this);

    try {
        const response = await fetch("/upload_csv", {
            method: "POST",
            body: formData
        });

        const result = await response.json();
        alert(result.message || "CSV uploaded successfully!");
    } catch (error) {
        alert("Error uploading CSV: " + error.message);
    }
});


// === SEARCH BY USERNAME, MONTH, DATE RANGE ===
document.getElementById('searchForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const username = e.target.username.value.trim();
    const month = e.target.month.value;
    const startDate = e.target.start_date.value;
    const endDate = e.target.end_date.value;
    const specificDate = e.target.date.value;

    let url = `/leaves?username=${encodeURIComponent(username)}`;

    if (month) {
        url += `&month=${month}`;
    } else if (startDate && endDate) {
        url += `&start_date=${startDate}&end_date=${endDate}`;
    } else if (specificDate) {
        url += `&start_date=${specificDate}&end_date=${specificDate}`;
    }

    fetch(url)
        .then(res => res.json())
        .then(data => {
            displayResults(data, 'resultBox');
        })
        .catch(err => {
            console.error('Search error:', err);
        });
});

// === FILTER FORM SUBMIT ===
document.getElementById('filterForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const startDate = this.start_date.value;
    const endDate = this.end_date.value;

    const usernameInput = document.querySelector('#searchForm input[name="username"]');
    const username = usernameInput ? usernameInput.value.trim() : '';

    if (!username) {
        alert('Please enter a username before filtering.');
        return;
    }

    const params = new URLSearchParams();
    params.append('username', username);
    params.append('start_date', startDate);
    params.append('end_date', endDate);

    try {
        const res = await fetch(`/leaves?${params}`);
        const data = await res.json();
        displayResults(data, 'filterResult');
    } catch (err) {
        console.error(err);
        alert("Error fetching filtered results.");
    }
});


// === SHOW ALL LEAVES WITH SORTING ===
document.getElementById('showAllBtn').addEventListener('click', () => {
    const sortOption = document.getElementById('sortSelect')?.value;
    const sortMonth = document.getElementById('sortMonth')?.value;
    const rangeStart = document.getElementById('rangeStart')?.value;
    const rangeEnd = document.getElementById('rangeEnd')?.value;

    let url = '/leaves';

    if (sortOption === 'month' && sortMonth) {
        url += `?month=${sortMonth}`;
    } else if (sortOption === 'range' && rangeStart && rangeEnd) {
        url += `?start_date=${rangeStart}&end_date=${rangeEnd}`;
    }

    fetch(url)
        .then(res => res.json())
        .then(data => {
            displayResults(data, 'allLeavesResult');
        })
        .catch(err => {
            console.error('Error loading leaves:', err);
        });
});

// === DISPLAY RESULTS ===
function displayResults(data, containerId) {
    const container = document.getElementById(containerId);
    if (!Array.isArray(data) || data.length === 0) {
        container.innerHTML = '<p class="text-muted">No records found.</p>';
        return;
    }

    let html = `
        <table class="table table-bordered table-striped">
            <thead>
                <tr>
                    <th>Username</th>
                    <th>Date</th>
                    <th>Leave Type</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach(item => {
        html += `
            <tr>
                <td>${item.username}</td>
                <td>${item.date}</td>
                <td>${item.leave_type}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// === HANDLE FILTER UI VISIBILITY ===
document.getElementById("sortSelect").addEventListener("change", function () {
    const value = this.value;
    document.getElementById("monthFilter").style.display = value === "month" ? "block" : "none";
    document.getElementById("rangeFilter").style.display = value === "range" ? "block" : "none";
});
