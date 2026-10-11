// initial data endpoint receiver

export async function getCourses() {
  console.log('fetching courses...');
  const response = await fetch(`http://localhost:3001/api/courses`);

  console.log('response:', response);
  if (!response.ok) {
    throw new Error(`Couldn't fetch courses (${response.status})`);
  }

  const data = await response.json();
  console.log(data)

  return data;
}

export async function getCourseDetails(courseId) {
  const response = await fetch(`http://localhost:3001/api/course/${courseId}`);
  if (!response.ok) {
    throw new Error(`Couldn't fetch course details (${response.status})`);
  }

  const data = await response.json();
  return data.course;
}
