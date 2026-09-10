export const TAU = Math.PI * 2;
export const FRONT = {x: .015, y: -.08};
export function wrapAngle(angle) { return Math.atan2(Math.sin(angle), Math.cos(angle)); }
export function makeSpin(x, y, duration = 8, reduced = false) {
  const delta = ((FRONT.y - y) % TAU + TAU) % TAU;
  return {x, y, duration, end: reduced ? y + wrapAngle(FRONT.y-y) : y + TAU * 6 + delta, reduced};
}
// The sound's currentTime is the only clock: buffering and pausing freeze the pose.
export function sampleSpin(spin, seconds) {
  const progress = Math.max(0, Math.min(1, seconds / spin.duration));
  const eased = 1 - (1-progress)**3;
  return {
    x: spin.x + (FRONT.x-spin.x)*eased + (spin.reduced ? 0 : Math.sin(Math.PI*progress)*.12*(1-progress)),
    y: spin.y + (spin.end-spin.y)*eased,
    progress, time: progress * spin.duration, done: progress >= 1,
    phase: progress >= 1 ? '定格 · 你只管做你想做的' : progress < .42 ? '流转' : progress < .85 ? '缓落' : '将此刻收藏',
  };
}
export function clipTiming(start, duration, mediaDuration) {
  const total = Number.isFinite(mediaDuration) ? Math.max(.1, mediaDuration) : 30;
  const offset = Math.max(0, Math.min(Number(start)||0, Math.max(0, total-.5)));
  return {start: offset, duration: Math.min(30, Math.max(.5, Number(duration)||8), total-offset)};
}
