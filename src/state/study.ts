/**
 * Study mode hides Try mode's coaching, so usability-test participants find each control themselves.
 * It applies only to a link that starts a side: `?mode=try&as=maya&study` or `as=marcus`.
 */
const params = new URLSearchParams(window.location.search);
const side = params.get('as');

export const STUDY =
  params.get('mode') === 'try' && (side === 'maya' || side === 'marcus') && params.has('study');
