import Bluebird from 'bluebird';

import firebase from '../../config/firebase';
import withTimestamps, { Model } from '../../helpers/withTimestamps';

import { EventAlreadyExistsError, EventNotFoundError } from './errors';

/**
 * Main structure for events.
 */
export interface Event {
  readonly id?: string;
  year: number;
}

const eventsRef = firebase.ref().child('events');

/**
 * Given an event payload, stores a new Event in Firebase
 *
 * @param {Event} event a new event payload
 * @throws if the event already exists for a given year
 * @returns the newly created Event from Firebase
 */
export const createEvent = Bluebird.method<Event & Model>(
  async (event: Event) => {
    const dbEvent = await eventsRef
      .orderByChild('year')
      .equalTo(event.year)
      .once('value');

    if (dbEvent.exists()) {
      throw new EventAlreadyExistsError(
        409,
        `Event already exists for the year ${event.year}`,
      );
    }

    const createdEventRef = await eventsRef
      .push(withTimestamps(event))
      .once('value');
    const createdEvent = {
      id: createdEventRef.key,
      ...createdEventRef.val(),
    };

    return createdEvent;
  },
);

/**
 * Retrieves all Events from the Firebase database
 * TODO: enable filtering
 *
 * @returns all Events from Firebase
 */
export async function getEvents() {
  const events = await eventsRef.once('value');
  const value: { [key: string]: Event } | null = events.val();

  // Either the /events ref exists but has no children,
  // OR the /events ref doesn't exist at all.
  if (value === null) {
    return [];
  }

  // Convert the resulting object to an array
  const parsedEvents = Object.keys(value).map((id) => ({
    ...value[id],
    id,
  }));

  return parsedEvents;
}

/**
 * Given a Firebase key, retrieves the Event if one exists.
 *
 * @param eventId an /events child Firebase key
 * @throws if the event cannot be found at the given Firebase key
 * @returns the Event given a Firebase key
 */
export const getEvent = Bluebird.method<Event & Model>(
  async (eventId: Event['id']) => {
    const dbEvent = await eventsRef.child(eventId as string).once('value');

    if (!dbEvent.exists()) {
      throw new EventNotFoundError(
        404,
        `Event not found whose key is "${eventId}".`,
      );
    }

    const event = { ...dbEvent.val(), id: dbEvent.key };

    return event;
  },
);
