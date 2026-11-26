(() => {
  const plot = document.querySelector('#report-plot');
  if (!plot || !window.Chart) return;

  // Use the same escaped labels and exact counts as the accessible HTML table.
  const table = document.querySelector('#report-sections');
  const rows = Array.from(table.tBodies[0].rows, row => ({
    label: row.cells[0].textContent.trim(),
    counts: Array.from(row.cells).slice(1, 4).map(cell => Number(cell.textContent)),
  }));
  const range = plot.querySelector('[data-chart-range]');
  const pageSize = 10;
  for (let start = 0; start < rows.length; start += pageSize) {
    range.add(new Option(`${start + 1}–${Math.min(start + pageSize, rows.length)} of ${rows.length}`, start));
  }
  range.parentElement.hidden = rows.length <= pageSize;
  plot.hidden = false;
  const canvas = plot.querySelector('canvas');
  const labels = Array.from(table.tHead.rows[0].cells).slice(1, 4).map(cell => cell.textContent);
  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: [],
      datasets: labels.map((label, index) => ({ label, stack: index === 2 ? 'waitlist' : 'seats', data: [] })),
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        x: { beginAtZero: true, stacked: true, ticks: { precision: 0 } },
        y: { stacked: true, grid: { display: false } },
      },
    },
  });

  function showRange() {
    const start = Number(range.value);
    const sections = rows.slice(start, start + pageSize);
    canvas.parentElement.style.height = (sections.length * 2.75 + 6) + 'rem';
    chart.data.labels = sections.map(section => section.label);
    chart.data.datasets.forEach((dataset, index) => {
      dataset.data = sections.map(section => section.counts[index]);
    });
    chart.update();
  }

  function applyColors() {
    const theme = getComputedStyle(document.documentElement);
    const color = name => theme.getPropertyValue(name).trim();
    const colors = ['--accent-text', '--control-border', '--gold'];
    chart.data.datasets.forEach((dataset, index) => { dataset.backgroundColor = color(colors[index]); });
    chart.options.plugins.legend.labels.color = color('--ink');
    for (const axis of Object.values(chart.options.scales)) {
      axis.ticks.color = color('--muted');
      axis.grid.color = color('--border');
    }
    chart.update();
  }

  showRange();
  applyColors();
  range.addEventListener('change', showRange);
  new MutationObserver(applyColors).observe(document.documentElement, {
    attributes: true, attributeFilter: ['data-theme', 'data-accent'],
  });
})();
