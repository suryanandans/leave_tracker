document.addEventListener("DOMContentLoaded", function () {
    // === Flatpickr Initialization ===
    flatpickr("#sortMonth", {
        dateFormat: "Y-m",
        plugins: [new monthSelectPlugin({ shorthand: true, dateFormat: "Y-m", altFormat: "F Y" })]
    });
    flatpickr("#rangeStart", { dateFormat: "Y-m-d" });
    flatpickr("#rangeEnd", { dateFormat: "Y-m-d" });

    // === Show All Button Handler ===
    document.getElementById('showAllBtn').addEventListener('click', () => {
        const sortOption = document.getElementById('sortSelect')?.value;
        const sortMonth = document.getElementById('sortMonth')?.value;
        const rangeStart = document.getElementById('rangeStart')?.value;
        const rangeEnd = document.getElementById('rangeEnd')?.value;
        const username = document.getElementById('usernameInput')?.value.trim();

        let url = '/leaves';
        const params = new URLSearchParams();

        if (username) params.append('username', username);
        if (sortOption === 'month' && sortMonth) {
            params.append('month', sortMonth);
        } else if (sortOption === 'range' && rangeStart && rangeEnd) {
            params.append('start_date', rangeStart);
            params.append('end_date', rangeEnd);
        }

        if (params.toString()) {
            url += `?${params.toString()}`;
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

    // === Toggle Filter Visibility ===
    document.getElementById("sortSelect").addEventListener("change", function () {
        const value = this.value;
        document.getElementById("monthFilter").style.display = value === "month" ? "block" : "none";
        document.getElementById("rangeFilter").style.display = value === "range" ? "block" : "none";
    });

    // === Display Results Helper ===
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

    // === CSV Upload Handler ===
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
});
