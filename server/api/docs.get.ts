export default defineEventHandler((event) => {
  return sendRedirect(event, '/_scalar', 301)
})
