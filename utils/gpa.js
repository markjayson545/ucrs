const pointsByLetter = Object.freeze({
    A: 4, 'A-': 3.7, 'B+': 3.3, B: 3, 'B-': 2.7, 'C+': 2.3, C: 2, D: 1, F: 0,
});

function calculateGpa(records) {
    const credits = records.reduce((sum, record) => sum + record.credits, 0);
    const weightedPoints = records.reduce((sum, record) => sum + record.credits * record.points, 0);
    return credits ? Math.round(weightedPoints / credits * 100) / 100 : null;
}

module.exports = { pointsByLetter, calculateGpa };
