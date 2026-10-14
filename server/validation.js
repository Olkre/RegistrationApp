const { badRequest } = require("./errors");

function requireObjectBody(body) {
    if (!body) {
        throw badRequest('MISSING_BODY', 'Request body is required.');
    }
}

function requireString(value) {
    if (typeof value !== 'string') {
        throw badRequest('INVALID_TYPE', 'Expected a string.');
    }
}

function requireCourseId(courseId) {
    if(!courseId) {
        throw badRequest('INVALID_COURSE_ID', 'Course ID is not valid.')
    }
}