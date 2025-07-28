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


// === SEARCH BY USERNAME OR FILTER ===
document.getElementById("searchForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const form = e.target;

    const username = form.username.value.trim();
    const month = form.month.value;
    const date = form.date.value;
    const startDate = form.start_date.value;
    const endDate = form.end_date.value;

    if (!username) {
        alert("Please enter a username.");
        return;
    }

    const params = new URLSearchParams();
    params.append("username", username);
    if (month) params.append("month", month);
    if (date) params.append("date", date);
    if (startDate && endDate) {
        // If both start and end are given, use filter_by_date
        params.append("start_date", startDate);
        params.append("end_date", endDate);

        try {
            const response = await fetch(`/filter_by_date?${params.toString()}`);
            const data = await response.json();

            if (!response.ok) throw new Error(data.message || "Filter failed");

            displayLeaves(data);
        } catch (error) {
            document.getElementById("resultBox").innerHTML = `
                <div class="alert alert-danger">${error.message}</div>
            `;
        }

    } else {
        // Otherwise fallback to search_leaves
        try {
            const response = await fetch(`/search_leaves?${params.toString()}`);
            const data = await response.json();

            if (!response.ok) throw new Error(data.message || "Search failed");

            displayLeaves(data);
        } catch (error) {
            document.getElementById("resultBox").innerHTML = `
                <div class="alert alert-danger">${error.message}</div>
            `;
        }
    }
});

document.getElementById('filterForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const startDate = this.start_date.value;
  const endDate = this.end_date.value;

  // ✅ Get the username from the search form
  const usernameInput = document.querySelector('#searchForm input[name="username"]');
  const username = usernameInput ? usernameInput.value.trim() : '';

  // ❗ Ensure username is provided
  if (!username) {
    alert('Please enter a username before filtering.');
    return;
  }

  // ✅ Build query parameters
  const params = new URLSearchParams();
  params.append('username', username);
  params.append('start_date', startDate);
  params.append('end_date', endDate);

  try {
    const res = await fetch(`/filter_by_date?${params}`);
    const data = await res.json();

    const box = document.getElementById('filterResult');
    if (!data || data.length === 0) {
      box.innerHTML = `<div class="alert alert-warning">No leaves found for <b>${username}</b> in the selected date range.</div>`;
    } else {
      box.innerHTML = `
        <table class="table table-bordered table-striped">
          <thead>
            <tr><th>Name</th><th>Date</th><th>Leave Type</th></tr>
          </thead>
          <tbody>
            ${data.map(d => `
              <tr>
                <td>${d.username}</td>
                <td>${d.date}</td>
                <td>${d.leave_type}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      `;
    }
  } catch (err) {
    console.error(err);
    alert("Error fetching filtered results.");
  }
});




// === DISPLAY SEARCH RESULT TABLE ===
function displayLeaves(leaves) {
    if (!leaves.length) {
        document.getElementById("resultBox").innerHTML = `
            <div class="alert alert-warning">No leave records found.</div>
        `;
        return;
    }

    let html = `<table class="table table-bordered">
        <thead>
            <tr>
                <th>Name</th>
                <th>Date</th>
                <th>Leave Type</th>
            </tr>
        </thead>
        <tbody>`;

    leaves.forEach(leave => {
        html += `
            <tr>
                <td>${leave.username}</td>
                <td>${leave.date}</td>
                <td>${leave.leave_type}</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    document.getElementById("resultBox").innerHTML = html;
}
