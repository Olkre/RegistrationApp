import { useEffect, useState } from 'react';
import { getSchedule } from '../api.js';
import { DayNumberAsText } from './CourseDetails.jsx';

export default function Schedule({ dataKey }) {
  const [state, setState] = useState({ status: 'loading', courses: [], error: null });
  const [retryKey, setRetryKey] = useState(0);

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
  }, [retryKey, dataKey]);

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
          {course.title} - {course.start_time} - <DayNumberAsText day={course.day_of_week} />
        </li>
      ))}
    </ul>
  );
}
