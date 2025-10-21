import solver from 'javascript-lp-solver';
import { compareShowsByDayThenStart } from './sort';

export const timeToMinutes = (time) => {
  const [hours, mins] = String(time).split(':').map(Number);
  return hours * 60 + mins;
};

const timesOverlap = (start1, end1, start2, end2) => {
  let s1 = timeToMinutes(start1);
  let e1 = timeToMinutes(end1);
  let s2 = timeToMinutes(start2);
  let e2 = timeToMinutes(end2);
  if (e1 < s1) e1 += 1440; // midnight crossing
  if (e2 < s2) e2 += 1440; // midnight crossing
  return s1 < e2 && s2 < e1;
};

export function buildSchedule(timetable, priorities) {
  const allPriorityShows = timetable.filter(show => priorities[show.artist] > 0);

  // Group shows by artist
  const showsByArtist = {};
  allPriorityShows.forEach(show => {
    if (!showsByArtist[show.artist]) {
      showsByArtist[show.artist] = [];
    }
    showsByArtist[show.artist].push(show);
  });

  // Lexicographic optimization: solve per priority level, highest first
  const priorityLevels = Array.from(new Set(Object.values(priorities))).sort((a, b) => b - a);
  const chosen = [];

  const conflictsWithChosen = (candidate) => {
    return chosen.some(s => s.day === candidate.day && timesOverlap(s.start, s.end, candidate.start, candidate.end));
  };

  priorityLevels.forEach(level => {
    const candidates = allPriorityShows.filter(s => priorities[s.artist] === level && !conflictsWithChosen(s));
    if (candidates.length === 0) return;

    const variables = {};
    const constraints = {};
    const binaries = {};

    // At most one show per artist within this tier
    const artistsAtLevel = new Set(candidates.map(s => s.artist));
    artistsAtLevel.forEach(artist => {
      constraints[`artist_${artist}`] = { max: 1 };
    });

    // Variables and artist constraints
    candidates.forEach((show, idx) => {
      const varName = `x${idx}`;
      variables[varName] = { value: 1, [`artist_${show.artist}`]: 1 };
      binaries[varName] = 1;
    });

    // Overlap constraints among candidates on same day
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        const a = candidates[i];
        const b = candidates[j];
        if (a.day === b.day && timesOverlap(a.start, a.end, b.start, b.end)) {
          const cname = `olap_${i}_${j}`;
          constraints[cname] = { max: 1 };
          variables[`x${i}`][cname] = 1;
          variables[`x${j}`][cname] = 1;
        }
      }
    }

    const model = {
      optimize: 'value',
      opType: 'max',
      constraints,
      variables,
      binaries
    };

    try {
      const result = solver.Solve(model);
      if (result) {
        candidates.forEach((show, idx) => {
          const name = `x${idx}`;
          if (result[name] && result[name] > 0.5) {
            chosen.push(show);
          }
        });
      }
    } catch (e) {
       
      console.log(e);
    }
  });

  // Missed bands: priority artists not scheduled
  const scheduledArtists = new Set(chosen.map(s => s.artist));
  const missedBands = Object.keys(priorities)
    .filter(artist => !scheduledArtists.has(artist))
    .map(artist => ({ artist, priority: priorities[artist], shows: showsByArtist[artist] || [] }))
    .sort((left, right) => right.priority - left.priority);

  // Clash report for diagnostics
  const clashes = [];
  allPriorityShows.forEach((show1, i) => {
    allPriorityShows.slice(i + 1).forEach(show2 => {
      if (show1.day === show2.day && timesOverlap(show1.start, show1.end, show2.start, show2.end)) {
        const chosenArtist = chosen.some(s => s.artist === show1.artist && s.day === show1.day && s.start === show1.start)
          ? show1.artist
          : (chosen.some(s => s.artist === show2.artist && s.day === show2.day && s.start === show2.start)
            ? show2.artist
            : 'Neither');

        clashes.push({
          day: show1.day,
          artist1: show1.artist,
          artist2: show2.artist,
          stage1: show1.stage,
          stage2: show2.stage,
          time1: `${show1.start}-${show1.end}`,
          time2: `${show2.start}-${show2.end}`,
          priority1: priorities[show1.artist],
          priority2: priorities[show2.artist],
          chosen: chosenArtist
        });
      }
    });
  });

  const schedule = chosen.sort((left, right) => compareShowsByDayThenStart(left, right));

  return { clashes, schedule, missedBands };
}

export function buildScheduleSimple(timetable, priorities) {
  const showsByArtist = {};
  timetable.forEach(show => {
    if (priorities[show.artist]) {
      if (!showsByArtist[show.artist]) {
        showsByArtist[show.artist] = [];
      }
      showsByArtist[show.artist].push(show);
    }
  });

  const artistOptions = Object.entries(showsByArtist).map(([artist, shows]) => ({
    artist,
    priority: priorities[artist],
    shows
  }));

  artistOptions.sort((a, b) => b.priority - a.priority);

  const finalSchedule = [];
  const missedList = [];

  artistOptions.forEach(({ artist, shows }) => {
    let scheduled = false;
    
    for (const show of shows) {
      const hasConflict = finalSchedule.some(s => 
        s.day === show.day && 
        timesOverlap(s.start, s.end, show.start, show.end)
      );
      
      if (!hasConflict) {
        finalSchedule.push(show);
        scheduled = true;
        break;
      }
    }
    
    if (!scheduled) {
      missedList.push({
        artist,
        priority: priorities[artist],
        shows
      });
    }
  });

  const clashList = [];
  const allPriorityShows = timetable.filter(s => priorities[s.artist] > 0);
  
  allPriorityShows.forEach((show1, i) => {
    allPriorityShows.slice(i + 1).forEach(show2 => {
      if (show1.day === show2.day && 
          timesOverlap(show1.start, show1.end, show2.start, show2.end)) {
        const p1 = priorities[show1.artist];
        const p2 = priorities[show2.artist];
        
        const chosen = finalSchedule.some(s => 
          s.artist === show1.artist && 
          s.day === show1.day && 
          s.start === show1.start
        ) ? show1.artist : (
          finalSchedule.some(s => 
            s.artist === show2.artist && 
            s.day === show2.day && 
            s.start === show2.start
          ) ? show2.artist : 'Neither'
        );
        
        clashList.push({
          day: show1.day,
          artist1: show1.artist,
          artist2: show2.artist,
          stage1: show1.stage,
          stage2: show2.stage,
          time1: `${show1.start}-${show1.end}`,
          time2: `${show2.start}-${show2.end}`,
          priority1: p1,
          priority2: p2,
          chosen
        });
      }
    });
  });

  return { 
    clashes: clashList, 
    schedule: finalSchedule.sort((a, b) => {
      const dayOrder = { 'Thu': 0, 'Fri': 1, 'Sat': 2 };
      const dayDiff = dayOrder[a.day] - dayOrder[b.day];
      if (dayDiff !== 0) return dayDiff;
      return timeToMinutes(a.start) - timeToMinutes(b.start);
    }),
    missedBands: missedList.sort((a, b) => b.priority - a.priority)
  };
}
