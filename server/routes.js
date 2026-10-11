// disabled auth for now
router.get('/courses', async (ctx) => {
  const courses = db.prepare('SELECT * FROM courses').all();
  ctx.body = { courses };
});

router.get('/course/:id', async (ctx) => {
  const id = ctx.params.id;
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
  console.log("course called")
  console.log(course)
  ctx.body = { course };
});
