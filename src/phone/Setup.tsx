import { type ReactElement, useState } from 'react';
import type { Experience } from '../state/model';
import { actions, useApp } from '../state/store';
import { TagSwitches } from './TagSwitches';

const LEVELS: { value: Experience; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'experienced', label: 'Experienced' },
];

/** First use: the lifter decides what strangers at the rack will see. */
export function Setup(): ReactElement {
  const name = useApp((state) => state.name);
  const experience = useApp((state) => state.tags.experience);
  const [missed, setMissed] = useState(false);

  const save = (): void => {
    if (experience) actions.saveTags();
    else setMissed(true);
  };

  return (
    <div className="phone-view phone-setup">
      <h2 className="phone-title">Your tags</h2>
      <input
        className="phone-input"
        value={name}
        aria-label="Name"
        autoComplete="off"
        maxLength={14}
        onChange={(event) => actions.setName(event.target.value)}
      />
      <div
        className="phone-segment"
        role="radiogroup"
        aria-label="Experience"
        data-missed={missed && !experience ? '' : undefined}
      >
        {LEVELS.map(({ value, label }) => (
          // biome-ignore lint/a11y/useSemanticElements: a two-option segmented control reads better as buttons
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={experience === value}
            onClick={() => actions.setExperience(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {missed && !experience && <p className="phone-error">Pick Beginner or Experienced.</p>}
      <TagSwitches />
      <button type="button" className="phone-primary" onClick={save}>
        Save
      </button>
    </div>
  );
}
