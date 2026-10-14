const { AppError } = require('./errors');


function register(db, userId, courseId) {
    // check if exists
    const course = db.prepare('SELECT * FROM courses WHERE id = ? ').get(courseId);
    if(!course) {
        console.log('course doesnt exist');
        throw new AppError(404, 'COURSE_NOT_FOUND', 'Course doesnt exist in the database');
    }


    // check if already enrolled or completed
    const existingEnrollment = db.prepare('SELECT * FROM enrollments WHERE course_id = ? AND user_id = ?').get(courseId, userId);
    if (existingEnrollment) {
        if(existingEnrollment.status === "enrolled") {
        throw new AppError(409, 'ALREADY_ENROLLED', 'You  already have registered this course.');
        } else if (existingEnrollment.status === "completed") {
        throw new AppError(409, 'ALREADY_COMPLETED', 'You  already have completed this course.');
        }
    }

    // check prerequisites
    // gets prereq - use pluck() to return an array
    const prereqs = db.prepare('SELECT prerequisite_id FROM prerequisites WHERE course_id = ?').pluck().all(courseId)
    // console.log("prereqs")
    // console.log(prereqs)

    // verify if prereqs are in completed assignments
    if (prereqs) {
        // get completed
        const completed = db.prepare('SELECT course_id FROM enrollments WHERE user_id = ? AND status = ?').pluck().all(userId, 'completed');
        // compare the two

        for (const prereqId of prereqs) {
        if (!completed.includes(prereqId)) {
            throw new AppError(409, 'MISSING_PREREQUISITE',
                'Complete all prereqs courses please. Missing at least the course with id ' + prereqId
            );
        }
        }
    }


    // check conflicts with other courses time wise
    const timeConflicts = db
        .prepare(` SELECT courses.id, courses.title, courses.start_time, courses.day_of_week
        FROM courses
        INNER JOIN enrollments ON enrollments.course_id = courses.id
        WHERE enrollments.user_id = ? AND enrollments.status = ?
        AND courses.day_of_week = ? AND courses.start_time = ?
        `)
        .all(userId, 'enrolled', course.day_of_week, course.start_time);

    if (timeConflicts.length > 0) {
        const conflict = timeConflicts[0];
        throw new AppError(409, 'TIME_CONFLICT',
        `${course.title} meets at the same time as ${conflict.title} on day ${conflict.day_of_week} at ${conflict.start_time}`
        );
    }


    // check for open seats
    const takenSeats = db
        .prepare(
        "SELECT COUNT(*) FROM enrollments WHERE course_id = ? AND status = ?"
        )
        .pluck()
        .get(courseId, 'enrolled');

    if (takenSeats >= course.capacity) {
        throw new AppError(409, 'COURSE_FULL', 'This course is full.');
    }

    db.prepare(
        "INSERT INTO enrollments (course_id, user_id, status) VALUES (?, ?, 'enrolled')"
    ).run(courseId, userId);
}

module.exports = { register }