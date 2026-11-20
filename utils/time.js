const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function formatTime(minutes) {
    const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
    return `${hours}:${String(minutes % 60).padStart(2, '0')}`;
}

function overlaps(first, second) {
    return first.day === second.day && first.start < second.end && second.start < first.end;
}

module.exports = { days, formatTime, overlaps };
