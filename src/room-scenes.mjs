import hitboxes from '../public/images/garden/hitboxes.json' with { type: 'json' };
const labels = {
  bedroom: 'Phòng ngủ',
  living: 'Phòng khách',
  kitchen: 'Phòng bếp',
  bathroom: 'Phòng tắm',
};
export const rooms = Object.keys(labels).map((id) => ({
  id,
  label: labels[id],
  image: `images/garden/${id}.png`,
  targets: Object.entries(hitboxes[id]).map(([wordId, box]) => ({
    wordId: wordId === 'tv' ? 'television' : wordId,
    box,
  })),
}));
