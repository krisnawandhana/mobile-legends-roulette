import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const ROLES = [
  { key: 'jungler', label: 'Jungler', tone: 'tone-jungle' },
  { key: 'gold', label: 'Gold Lane', tone: 'tone-gold' },
  { key: 'exp', label: 'EXP Lane', tone: 'tone-exp' },
  { key: 'roam', label: 'Roaming', tone: 'tone-roam' },
  { key: 'mid', label: 'Mid Lane', tone: 'tone-mid' },
];

function parseRoster(html) {
  return html;
}

const heroImageModules = import.meta.glob('../images/*.{png,jpg,jpeg,webp,gif}', {
  eager: true,
  import: 'default',
});

function humanizeHeroName(fileStem) {
  const replaced = fileStem.replace(/_/g, ' ');
  return replaced.replace(/\b\w/g, (match) => match.toUpperCase());
}

function parseRosterFromImages() {
  return Object.entries(heroImageModules)
    .map(([path, image]) => {
      const fileName = path.split('/').pop() ?? '';
      const stem = fileName.replace(/\.[^.]+$/, '');

      return {
        name: humanizeHeroName(stem),
        image,
      };
    })
    .filter((hero) => hero.name && hero.image)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function shuffle(list) {
  const copy = [...list];
  const randomValues = new Uint32Array(copy.length);

  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(randomValues);
  }

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomValue = randomValues[index] ?? Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    const swapIndex = randomValue % (index + 1);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function assignmentsKey(assignments) {
  return assignments.map((assignment) => assignment.hero?.name ?? '').join('|');
}

function pickDifferentAssignment(roster, previousAssignments) {
  const previousKey = assignmentsKey(previousAssignments);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const nextAssignments = buildAssignments(roster);

    if (assignmentsKey(nextAssignments) !== previousKey) {
      return nextAssignments;
    }
  }

  return buildAssignments(roster);
}

function buildAssignments(roster) {
  const picks = shuffle(roster).slice(0, ROLES.length);

  return ROLES.map((role, index) => ({
    ...role,
    hero: picks[index] ?? null,
  }));
}

function emptyAssignments() {
  return ROLES.map((role) => ({
    ...role,
    hero: null,
  }));
}

function HeroCard({ role, hero, isRolling }) {
  return (
    <article className={`hero-card ${role.tone} ${isRolling ? 'is-rolling' : ''}`}>
      <div className="hero-card__top">
        <span className="role-badge">{role.label}</span>
        <span className="role-key">{role.key}</span>
      </div>

      {hero ? (
        <>
          <div className="hero-card__image-wrap">
            <img className="hero-card__image" src={hero.image} alt={hero.name} />
          </div>
          <h2 className="hero-card__name">{hero.name}</h2>
        </>
      ) : (
        <div className="hero-card__empty">
          <div className="hero-card__pulse" />
          <p>{isRolling ? 'Rolling...' : 'Ready'}</p>
        </div>
      )}
    </article>
  );
}

function App() {
  const roster = useMemo(() => parseRosterFromImages(), []);
  const [assignments, setAssignments] = useState(() => emptyAssignments());
  const [previewAssignments, setPreviewAssignments] = useState(() => emptyAssignments());
  const [rolling, setRolling] = useState(false);
  const [message, setMessage] = useState('Ready to roll.');
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const previousAssignmentsRef = useRef(emptyAssignments());

  useEffect(() => {
    if (roster.length >= ROLES.length) {
      const initial = pickDifferentAssignment(roster, previousAssignmentsRef.current);
      setAssignments(initial);
      setPreviewAssignments(initial);
      previousAssignmentsRef.current = initial;
    }
  }, [roster]);

  useEffect(() => () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
  }, []);

  const handleRoll = () => {
    if (rolling || roster.length < ROLES.length) {
      return;
    }

    setRolling(true);
    setMessage('Rolling...');

    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }

    const previewIntervalMs = 60 + Math.floor((window.crypto?.getRandomValues ? window.crypto.getRandomValues(new Uint32Array(1))[0] : Math.floor(Math.random() * 1000)) % 70);
    const rollDurationMs = 1400 + Math.floor((window.crypto?.getRandomValues ? window.crypto.getRandomValues(new Uint32Array(1))[0] : Math.floor(Math.random() * 1000)) % 900);

    intervalRef.current = window.setInterval(() => {
      setPreviewAssignments(buildAssignments(roster));
    }, previewIntervalMs);

    timeoutRef.current = window.setTimeout(() => {
      const finalAssignments = pickDifferentAssignment(roster, previousAssignmentsRef.current);

      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }

      intervalRef.current = null;
      timeoutRef.current = null;
      setAssignments(finalAssignments);
      setPreviewAssignments(finalAssignments);
      previousAssignmentsRef.current = finalAssignments;
      setRolling(false);
      setMessage('Locked. No duplicates.');
    }, rollDurationMs);
  };

  const activeAssignments = rolling ? previewAssignments : assignments;

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-panel__copy hero-panel__copy--bottom">
          <p className="eyebrow">Mobile Legends Roulette</p>
          <h1>5 Man Party Play</h1>
          <div className="stats-row">
            <div className="stat-chip">
              <span className="stat-chip__label">Rule</span>
              <strong>Unique hero for every lane</strong>
            </div>

            <button className="roll-button" type="button" onClick={handleRoll} disabled={rolling || roster.length < ROLES.length}>
              {rolling ? 'Rolling...' : 'Roll'}
            </button>
          </div>

          <div className="actions-row">
            <p className="status-copy">{message}</p>
          </div>
        </div>

        <div className="hero-panel__grid">
          {activeAssignments.map((assignment) => (
            <HeroCard
              key={assignment.key}
              role={assignment}
              hero={assignment.hero}
              isRolling={rolling}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);