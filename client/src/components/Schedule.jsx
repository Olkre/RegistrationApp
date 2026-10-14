import { useEffect, useState } from 'react';
import { dropCourse, getSchedule } from '../api.js';


export default function Schedule({ dataKey, onChange }) {
  const [state, setState] = useState({ status: 'loading', courses: [], error: null });
  const [retryKey, setRetryKey] = useState(0);

  const handleDrop = (courseId) => {
    dropCourse(courseId);
  };

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading', courses: [], error: null });
    getSchedule()
      .then((courses) => setState({status: 'ready', courses, error: null }))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setState({ status: 'error', courses: [], error: err.message });
      });
    return () => controller.abort();
  }, [retryKey]);

  if (state.status === 'loading') {
    return (
      <p className="muted" role="status">
        Loading courses…
      </p>
    );
  }
  if (state.status === 'error') {
    return (
      <div>
        <p className="error" role="alert">
          {state.error}
        </p>
        <button type="button" onClick={() => setRetryKey((key) => key + 1)}>
          Try again
        </button>
      </div>
    );
  }
  if (state.courses.length === 0) {
    return <p className="muted">No courses are being offered right now.</p>;
  }

  return (
    <ul className="course-list">
      {state.courses.map((course) => (
        <li key={course.id}>
          {course.title} - {course.start_time} - {course.day_of_week}
          <button onClick={() => handleDrop(course.id)}>Drop</button>
        </li>
      ))}
    </ul>
  );
}
