// initial data endpoint receiver

const server_url = 'http://localhost:3001/api';

export async function serverLogin(email, password) {
  const response = await fetch(`${server_url}/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error?.message ?? `Login failed (${response.status})`);
  }

  return data.user;
}

export async function serverLogout() {
  const response = await fetch(`${server_url}/logout`, {
    credentials: 'include',
    method: 'POST'
  });
}

export async function serverCurrentUser() {
  const response = await fetch(`${server_url}/me`, {
    credentials: 'include',
  });

  if (response.status === 401) return null;

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error?.message ?? `Request failed (${response.status})`);
  }

  return data.user;
}



export async function getCourses() {
  console.log('fetching courses...');
  const response = await fetch(`${server_url}/courses`, {
    credentials: 'include',
  });

  console.log('response:', response);
  if (!response.ok) {
    throw new Error(`Couldn't fetch courses (${response.status})`);
  }

  const data = await response.json();
  console.log(data)

  return data;
}

export async function getCourseDetails(courseId) {
  const response = await fetch(`${server_url}/course/${courseId}`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Couldn't fetch course details (${response.status})`);
  }

  const data = await response.json();
  return data.course;
}

export async function getSchedule() {
  const response = await fetch(`${server_url}/enrollments`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Couldn't fetch courses (${response.status})`);
  }
  const data = await response.json();

  return data.courses;
}

export async function registerCourse(courseId) {
  console.log("registering to " + courseId);
  const response = await fetch(`${server_url}/enrollments`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseId: courseId }),
  });

  if (!response.ok) {
    throw new Error(`Couldn't fetch courses (${response.status})`);
  }
  const data = await response.json();

  return;
}

export async function dropCourse(courseId) {
  console.log("dropping to " + courseId);

  const response = await fetch(`${server_url}/enrollments/${courseId}`, {
    credentials: 'include',
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error(`Couldn't drop courses (${response.status})`);
  }

  return;
}
