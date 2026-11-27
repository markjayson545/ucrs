exports.defaultCourseCover = course => {
    const department = (course?.department || '').toLowerCase();
    if (department.includes('humanit')) return '/images/teaching-studio.webp';
    if (department.includes('math')) return '/images/campus-courtyard.webp';
    return '/images/library-study.webp';
};

exports.courseCover = course => course?.imageVersion
    ? '/catalog/courses/' + course._id + '/image?v=' + course.imageVersion
    : exports.defaultCourseCover(course);

exports.profilePhoto = user => user?.imageVersion ? '/account/photo?v=' + user.imageVersion : '';
exports.initials = name => name.trim().split(/\s+/).slice(0, 2).map(word => Array.from(word)[0]).join('').toUpperCase();
