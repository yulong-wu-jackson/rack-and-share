import { PHONE_ID, STATION_ID, stageBoxOf } from './geometry';

const FLIGHT_MS = 1250;
const CONTACT_AT = 0.36;
const RELEASE_AT = 0.6;
/** How far the phone overlaps the station at the moment of contact. */
const OVERLAP = 30;

/** Swings the phone against the station and back. `onContact` fires when they touch. */
export async function flyPhoneToStation(onContact: () => void): Promise<void> {
  const phone = document.getElementById(PHONE_ID);
  if (!phone) throw new Error('The phone is not mounted');
  const from = stageBoxOf(PHONE_ID);
  const to = stageBoxOf(STATION_ID);

  const besideStation = from.x >= to.x + to.width - OVERLAP;
  const contact = besideStation
    ? `translate(${to.x + to.width - from.x - OVERLAP}px, 0) rotate(-8deg)`
    : `translate(0, ${to.y + to.height - from.y - OVERLAP}px) rotate(-4deg)`;

  const flight = phone.animate(
    [
      { transform: 'none', easing: 'cubic-bezier(0.3, 0, 0.1, 1)' },
      { transform: contact, offset: CONTACT_AT },
      {
        transform: contact,
        offset: RELEASE_AT,
        easing: 'cubic-bezier(0.4, 0, 0.1, 1)',
      },
      { transform: 'none' },
    ],
    { duration: FLIGHT_MS },
  );
  window.setTimeout(onContact, FLIGHT_MS * CONTACT_AT);
  await flight.finished;
}
