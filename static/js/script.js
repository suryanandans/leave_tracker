document.getElementById('csvUploadForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const formData = new FormData(this);

    const res = await fetch('/upload-csv', {
        method: 'POST',
        body: formData
    });
    const data = await res.text();
    alert(data);
});

document.getElementById('searchForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const params = new URLSearchParams(new FormData(this));
    const res = await fetch(`/search-by-name?${params}`);
    const data = await res.json();

    const box = document.getElementById('resultBox');
    box.innerHTML = "<ul>" + data.map(d => `<li>${d.date} - ${d.leave_type}</li>`).join('') + "</ul>";
});

document.getElementById('filterForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const params = new URLSearchParams(new FormData(this));
    const res = await fetch(`/leaves-by-date?${params}`);
    const data = await res.json();

    const box = document.getElementById('filterResult');
    box.innerHTML = "<ul>" + data.map(d => `<li>${d.user_name} - ${d.date} - ${d.leave_type}</li>`).join('') + "</ul>";
});
