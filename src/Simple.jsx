import React, { useState, useMemo } from 'react';
import { AlertCircle, CheckCircle, Calendar, Clock, XCircle } from 'lucide-react';
import { oneLiners, timetable, priorities } from './constants';
import { buildScheduleSimple } from './utils/scheduler';

const Simple = () => {
  const normalizeName = (s) => (s || '').toLowerCase();

  const oneLinersNormalized = useMemo(() => {
    const map = {};
    Object.entries(oneLiners).forEach(([name, line]) => {
      map[normalizeName(name)] = line;
    });
    return map;
  }, []);

  const getOneLiner = (artist) => oneLinersNormalized[normalizeName(artist)];

  const ArtistName = ({ name, className }) => {
    const tip = getOneLiner(name);
    return (
      <span className={`relative group ${className || ''}`}>
        {name}
        {tip ? (
          <span className="pointer-events-none absolute left-0 top-full mt-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-20 shadow">
            {tip}
          </span>
        ) : null}
      </span>
    );
  };

  const { clashes, schedule, missedBands } = useMemo(() => buildScheduleSimple(timetable, priorities), []);

  const [view, setView] = useState('schedule');

  const scheduleByDay = useMemo(() => {
    const byDay = { Thu: [], Fri: [], Sat: [] };
    schedule.forEach(show => byDay[show.day].push(show));
    return byDay;
  }, [schedule]);

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-gray-50 text-gray-900">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h1 className="text-3xl font-bold mb-2 text-gray-900">Left of the Dial (simple)</h1>
        <p className="text-gray-600 mb-4">Optimized schedule with {schedule.length} bands · {missedBands.length} missed</p>
        
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setView('schedule')}
            className={`px-4 py-2 rounded ${view === 'schedule' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            <Calendar className="inline mr-2" size={16} />
            Final Schedule
          </button>
          <button
            onClick={() => setView('missed')}
            className={`px-4 py-2 rounded ${view === 'missed' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            <XCircle className="inline mr-2" size={16} />
            Missed Bands ({missedBands.length})
          </button>
          <button
            onClick={() => setView('clashes')}
            className={`px-4 py-2 rounded ${view === 'clashes' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            <AlertCircle className="inline mr-2" size={16} />
            Clash Report ({clashes.length})
          </button>
        </div>

        {view === 'schedule' && (
          <div className="space-y-6">
            {['Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="border rounded-lg p-4">
                <h2 className="text-2xl font-bold mb-4 text-gray-900">
                  {day === 'Thu' ? 'Thursday' : day === 'Fri' ? 'Friday' : 'Saturday'}
                </h2>
                <div className="space-y-2">
                  {scheduleByDay[day].map((show, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded border-l-4 border-blue-500">
                      <div className="flex-1">
                        <ArtistName name={show.artist} className="font-bold text-lg text-gray-900" />
                        <div className="text-sm text-gray-600">{show.stage}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm font-mono">
                            <Clock size={14} />
                            {show.start} - {show.end}
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded text-sm font-bold ${
                          priorities[show.artist] === 7 ? 'bg-green-100 text-green-800' :
                          priorities[show.artist] === 6 ? 'bg-yellow-100 text-yellow-800' :
                          priorities[show.artist] === 5 ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          P{priorities[show.artist]}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'missed' && (
          <div className="space-y-3">
            {missedBands.map((band, i) => (
              <div key={i} className="border rounded-lg p-4 bg-red-50">
                <div className="flex items-center justify-between mb-2">
                  <ArtistName name={band.artist} className="font-bold text-lg text-gray-900" />
                  <div className={`px-3 py-1 rounded text-sm font-bold ${
                    band.priority === 7 ? 'bg-green-100 text-green-800' :
                    band.priority === 6 ? 'bg-yellow-100 text-yellow-800' :
                    band.priority === 5 ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    P{band.priority}
                  </div>
                </div>
                <div className="text-sm space-y-1">
                  <div className="font-semibold text-gray-700">All performances conflict:</div>
                  {band.shows.map((show, j) => (
                    <div key={j} className="text-gray-600">
                      • {show.day} {show.start}-{show.end} at {show.stage}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'clashes' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">Day</th>
                  <th className="p-2 text-left">Artist 1</th>
                  <th className="p-2 text-left">Artist 2</th>
                  <th className="p-2 text-left">Stage 1</th>
                  <th className="p-2 text-left">Stage 2</th>
                  <th className="p-2 text-left">Time</th>
                  <th className="p-2 text-left">Chosen</th>
                </tr>
              </thead>
              <tbody>
                {clashes.map((clash, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2">{clash.day}</td>
                    <td className="p-2">
                      <ArtistName name={clash.artist1} />
                      <span className="ml-2 text-xs bg-gray-200 px-1 rounded">P{clash.priority1}</span>
                    </td>
                    <td className="p-2">
                      <ArtistName name={clash.artist2} />
                      <span className="ml-2 text-xs bg-gray-200 px-1 rounded">P{clash.priority2}</span>
                    </td>
                    <td className="p-2 text-xs text-gray-600">{clash.stage1}</td>
                    <td className="p-2 text-xs text-gray-600">{clash.stage2}</td>
                    <td className="p-2 text-xs font-mono">{clash.time1}</td>
                    <td className="p-2">
                      {clash.chosen !== 'Neither' ? (
                        <span className="font-bold text-green-700" title={getOneLiner(clash.chosen)}>
                          <CheckCircle className="inline mr-1" size={14} />
                          <ArtistName name={clash.chosen} />
                        </span>
                      ) : (
                        <span className="font-bold text-red-700">
                          <XCircle className="inline mr-1" size={14} />
                          Neither
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-bold mb-2 text-gray-900">Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-600">Total Priority Bands</div>
            <div className="text-2xl font-bold">{Object.keys(priorities).length}</div>
          </div>
          <div>
            <div className="text-gray-600">Bands in Schedule</div>
            <div className="text-2xl font-bold text-green-600">{schedule.length}</div>
          </div>
          <div>
            <div className="text-gray-600">Bands Missed</div>
            <div className="text-2xl font-bold text-red-600">{missedBands.length}</div>
          </div>
          <div>
            <div className="text-gray-600">Total Clashes</div>
            <div className="text-2xl font-bold">{clashes.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Simple;
