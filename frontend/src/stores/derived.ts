// Derived stores that combine personal + collections — things every
// page needs (current stage, personalized horizon, etc.)
import { derived } from 'svelte/store';
import { LIFESPAN } from '../config';
import { COUNTRY_NOTES, getStage } from '../data';
import {
  todayAge, sex, country, smoker, exerciseLevel, sleepHours, familyLongevity,
} from './personal';

// Current life stage based on today's age. Falls back to the last stage
// if user is past LIFESPAN; returns null while in blank-state.
export const currentStage = derived(todayAge, ($age) => {
  if ($age < 0) return null;
  return getStage($age);
});

// Personalized expected horizon (years), combining country/sex base
// life-expectancy with lifestyle adjustments. Used by the "ahead"
// stat-row math on the Today page.
export const personalHorizon = derived(
  [sex, country, smoker, exerciseLevel, sleepHours, familyLongevity],
  ([$sex, $country, $smoker, $exercise, $sleep, $family]) => {
    let base = LIFESPAN;
    if ($country && COUNTRY_NOTES[$country]) {
      const exp = COUNTRY_NOTES[$country].lifeExp;
      base = $sex === 'female' ? exp.female : exp.male;
    }
    let adj = 0;
    if ($smoker === 'current') adj -= 9;
    else if ($smoker === 'quit') adj -= 2;
    if ($exercise === 'never') adj -= 2;
    else if ($exercise === 'regularly') adj += 4;
    else if ($exercise === 'often') adj += 6;
    if ($sleep) {
      if ($sleep < 6) adj -= 2;
      else if ($sleep < 7) adj -= 1;
      else if ($sleep >= 9) adj += 1;
    }
    if ($family) {
      const off = $family - 80;
      adj += Math.max(-5, Math.min(5, off / 4));
    }
    return Math.max(40, Math.min(110, Math.round(base + adj)));
  }
);
