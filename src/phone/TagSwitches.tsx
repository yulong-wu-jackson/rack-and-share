import { ArrowLeftRight, HandHelping, MessageCircleQuestion } from 'lucide-react';
import type { ReactElement } from 'react';
import { Switch } from '../components/Switch';
import type { ToggleTag } from '../state/model';
import { actions, useApp } from '../state/store';

const TAGS: { tag: ToggleTag; label: string; icon: ReactElement }[] = [
  { tag: 'workIn', label: 'Open to work in', icon: <ArrowLeftRight /> },
  { tag: 'spot', label: 'Can spot', icon: <HandHelping /> },
  {
    tag: 'questions',
    label: 'Open to questions',
    icon: <MessageCircleQuestion />,
  },
];

/** The three tags a lifter can switch at any time, also mid-session. */
export function TagSwitches(): ReactElement {
  const tags = useApp((state) => state.rack.tags);
  return (
    <ul className="tag-switches">
      {TAGS.map(({ tag, label, icon }) => (
        <li key={tag}>
          {icon}
          <span>{label}</span>
          <Switch on={tags[tag]} label={label} onChange={(on) => actions.setTag(tag, on)} />
        </li>
      ))}
    </ul>
  );
}
