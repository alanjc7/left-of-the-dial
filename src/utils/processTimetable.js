import { priorities as prioritiesObj } from "../constants"
import { timeToMinutes } from "./scheduler"

// const thursday = await fetch('https://tmsqr.app/api/timetable/67b3567f1f462/stage/11782')
// const thu = await thursday.json()
const friday = await fetch('https://tmsqr.app/api/timetable/67b3567f1f462/stage/11783')
const fri = await friday.json()
const saturday = await fetch('https://tmsqr.app/api/timetable/67b3567f1f462/stage/11784')
const sat = await saturday.json()

const priorities = Object.keys(prioritiesObj);

// create a sanitized copy of thu without artistJson on performances and print it
const sanitize = (full) => {
  const artists = []
  const stag = {
    stages: (full.stages || [])
      .map(stage => {
        const performances = (stage.performances || [])
          .map(performance => {
            const { _artistJson, _id, artist, ...rest } = performance || {};
            // Strip characters matching this regex from the name .\([A-Z][A-Z]\)
            const pattern = /.\([A-Z][A-Z]\)/g;
            let name = artist.replace(pattern, '');
            const pattern2 = /.\([A-Z][A-Z][A-Z]\)/g;
            name = name.replace(pattern2, '');
            const pattern3 = /.\([A-Z][A-Z]\/[A-Z][A-Z]\)/g;
            name = name.replace(pattern3, '');
            const pattern4 = /.\([A-Z][A-Z]\/[A-Z][A-Z][A-Z]\)/g;
            name = name.replace(pattern4, '');
            return { ...rest, artist: name };
          })
          .filter(perf => {
            if (
              priorities.some(
                p => (perf.artist || '').toLowerCase().trim().includes((p || '').toLowerCase().trim())
              )
            ) {
              artists.push(perf.artist);
              return true;
            }
            // console.log("No match: ", perf.artist)
            return false;
          });
        return { ...stage, performances };
      })
      .filter(stage => Array.isArray(stage.performances) && stage.performances.length > 0)
  }
  return {artists, stag}
};

const format = (obj) => {
  // Maps this shape: {stages: [{title: "", performances: [{start: "", end: "", artist: ""}]}]}
  // To this shape: {timetable: [{ day: 'Thu', stage: 'ANNABEL DOWN', artist: 'Silver Gore', start: '19:00', end: '19:40' },]}
  if (!obj || !Array.isArray(obj.stages)) return [];

  let formatted = [];

  obj.stages.forEach(stageObj => {
    const { title: stage, performances = [] } = stageObj;

    performances.forEach(perf => {
      const { start, end, artist } = perf;
      const st = start.replace(/2025-10-2[3-6] /g, "").replace(/0:00\b/g, "0")
      const en = end.replace(/2025-10-2[3-6] /g, "").replace(/0:00\b/g, "0")
      const day = start.includes("2025-10-23") ? "Thu" : start.includes("2025-10-24") ? "Fri" : "Sat"
      // Drop performances starting before 16:40
      if (timeToMinutes(st) < timeToMinutes("16:40")) return;
      if (timeToMinutes(st) > timeToMinutes("23:29")) return;
      
      formatted.push({ 
        day, 
        stage, 
        artist, 
        start: st, 
        end: en
      });
    });
  });

  return formatted;
};

export function getTimetable() {
  // const {artists: _artistsThu , stag: sanitizedThu} = sanitize(thu)
  const {artists: _artistsFri, stag: sanitizedFri} = sanitize(fri)
  const {artists: _artistsSat, stag: sanitizedSat} = sanitize(sat)
  // console.log(artistsThu)
  // console.log(sanitizedThu)
  // const full = {stages: [...sanitizedThu.stages, ...sanitizedFri.stages, ...sanitizedSat.stages]}
  const full = {stages: [...sanitizedFri.stages, ...sanitizedSat.stages]}
  const formattedFull = format(full)
  // console.log(full.stages[0])
  // console.log({formattedFull})
  // const fullArtists = [...new Set([...artistsThu, ...artistsFri, ...artistsSat])];
  // console.log(fullArtists)
  // console.log(JSON.stringify(full, null, 2));
  return formattedFull
}
