import { type VocabularyWord } from './vocabulary';

// Shapes and symbols are rendered geometrically so their teaching content is exact.
function Shape({ name }: { name?: string }) {
  const shapes: Record<string, React.ReactNode> = {
    circle: <circle cx="50" cy="50" r="35" />,
    square: <rect x="16" y="16" width="68" height="68" rx="1" />,
    triangle: <polygon points="50,12 90,85 10,85" />,
    rectangle: <rect x="6" y="27" width="88" height="46" rx="1" />,
    oval: <ellipse cx="50" cy="50" rx="43" ry="27" />,
    star: (
      <polygon points="50,8 62,35 92,38 69,59 77,90 50,74 23,90 31,59 8,38 38,35" />
    ),
    heart: (
      <path d="M50 86C35 73 9 53 9 32C9 9 39 6 50 27C61 6 91 9 91 32C91 53 65 73 50 86Z" />
    ),
    diamond: <polygon points="50,6 83,50 50,94 17,50" />,
  };
  return (
    <svg
      viewBox="0 0 100 100"
      className="shape-symbol"
      fill="#477dc7"
      aria-hidden="true"
    >
      {shapes[name ?? 'circle']}
    </svg>
  );
}

export function WordVisual({
  word,
  className = '',
}: {
  word: VocabularyWord;
  className?: string;
}) {
  const base = import.meta.env.BASE_URL;
  return (
    <span
      className={`word-visual ${className} visual-${word.kind}`}
      aria-hidden="true"
    >
      {word.kind === 'picture' &&
        (word.spriteIndex === undefined ? (
          <img
            src={`${base}${word.imageFile}`}
            alt=""
            loading="lazy"
            draggable="false"
          />
        ) : (
          <span
            className="sprite-picture"
            style={{
              backgroundImage: `url(${base}${word.imageFile})`,
              backgroundPosition: `${(word.spriteIndex % 3) * 50}% ${Math.floor(word.spriteIndex / 3) * 50}%`,
            }}
          />
        ))}
      {word.kind === 'letter' && (
        <span className="letter-symbol" lang="en">
          {word.value}
        </span>
      )}
      {word.kind === 'number' && (
        <span className="number-content">
          <strong>{word.value}</strong>
          <span className="counting-dots">
            {Array.from({ length: Number(word.value) }, (_, i) => (
              <i key={i} />
            ))}
          </span>
        </span>
      )}
      {word.kind === 'color' && (
        <span className="color-swatch" style={{ background: word.value }} />
      )}
      {word.kind === 'shape' && <Shape name={word.value} />}
      {(word.kind === 'day' || word.kind === 'month') && (
        <span className="calendar-symbol">
          <span>{word.kind === 'day' ? 'NGÀY TRONG TUẦN' : 'THÁNG'}</span>
          <strong>
            {word.kind === 'day'
              ? word.value === '7'
                ? 'CN'
                : `T${Number(word.value) + 1}`
              : word.value}
          </strong>
          <small lang="en">{word.word}</small>
        </span>
      )}
    </span>
  );
}
