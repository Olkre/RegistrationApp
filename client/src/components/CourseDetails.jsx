import { useEffect, useState } from 'react';
import { dropCourse, getCourseDetails, registerCourse } from '../api.js';

// component setup mirrored from course list
export default function CourseDetails({ courseId, clickKey, dataKey, onChange }) {
  const [retryKey, setRetryKey] = useState(0);
  const [state, setState] = useState({ status: 'loading', course: null, error: null });
  const [actionState, setActionState] = useState({ pending: false, error: null });

  async function handleEnrollmentAction(action) {
    setActionState({ pending: true, error: null });
    try {
      await action(courseId);
      onChange?.();
    } catch (error) {
      setActionState({ pending: false, error: error.message });
      return;
    }
    setActionState({ pending: false, error: null });
  }

  // makes sure to reset the errors 
  useEffect(() => {
    setActionState({ pending: false, error: null });
  }, [courseId]);

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


  const prerequisites = state.course.prerequisites ?? [];
  const enrollmentStatus = state.course.currentEnrollment?.status;

  return (
    <article className="space-y-3">
      <h3 className="text-xl font-semibold">{state.course.title}</h3>
      <p className="text-sm">{state.course.description}</p>

      <div className="flex flex-col gap-1 text-sm">
        <p><span className="label">Day:</span> <DayNumberAsText day={state.course.day_of_week} /></p>
        <p><span className="label">Time:</span> {state.course.start_time}</p>
        <p><span className="label">Seats:</span> {state.course.capacity - state.course.takenSeats} of {state.course.capacity} available</p>
        <p><span className="label">Status:</span> {state.course.currentEnrollment?.status ?? 'Not enrolled'}</p>
      </div>

      <div>
        <p className="label">Prerequisites</p>
        {prerequisites.length > 0 ? (
          <ul className="list-disc ps-5 text-sm">
            {prerequisites.map((prerequisite) => (
              <li key={prerequisite}>{prerequisite}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">None</p>
        )}
      </div>

      {actionState.error && <p className="error" role="alert">{actionState.error}</p>}
      {(enrollmentStatus === 'enrolled' || !enrollmentStatus) && (
        <button
          type="button"
          onClick={() => handleEnrollmentAction(enrollmentStatus === 'enrolled' ? dropCourse : registerCourse)}
          disabled={actionState.pending}
          className="primary"
        >
          {actionState.pending ? 'Please wait…' : enrollmentStatus === 'enrolled' ? 'Drop course' : 'Register'}
        </button>
      )}

      {(enrollmentStatus === 'completed') && (
        <p className="text-green-700">You have completed this course already so you cant add or drop it again.</p>
      )} 
    </article>
  );
}



const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function DayNumberAsText({ day }) {
  return <>{DAYS_OF_WEEK[Number(day) - 1] ?? day}</>;
}
