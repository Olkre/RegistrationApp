import { useEffect, useState } from 'react';
import { getCourseDetails } from '../api.js';

// component setup mirrored from course list
export default function CourseDetails({ courseId, clickKey, dataKey, onChange }) {
  const [retryKey, setRetryKey] = useState(0);
  const [state, setState] = useState({ status: 'loading', course: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading', course: null, error: null });

    getCourseDetails(courseId, { signal: controller.signal })
      .then((course) => {
        setState({ status: 'ready', course, error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setState({ status: 'error', course: null, error: error.message });
        }
      });

    return () => controller.abort();
  }, [courseId, clickKey, dataKey, retryKey]);

  if (state.status === 'loading') {
    return <p className="muted" role="status">Loading course…</p>;
  }

  if (state.status === 'error') {
    return (
      <div>
        <p className="error" role="alert">{state.error}</p>
        <button type="button" onClick={() => setRetryKey((key) => key + 1)}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <article>
      <h3>{state.course.title}</h3>
      <p>{state.course.description}</p>
      <p>day_of_week: {state.course.day_of_week}</p>
      <p>start_time: {state.course.start_time}</p>
      <p>capacity: {state.course.capacity}</p>
    </article>
  );
}
