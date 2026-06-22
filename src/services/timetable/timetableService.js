import dataConnectClient from '../dataconnect/dataConnectClient';
import {DATA_CONNECT_QUERIES, DATA_CONNECT_MUTATIONS} from '../dataconnect/operations';

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MAX_PERIODS = 8;

const toPeriod = row => ({
  // Composite primary key — generate synthetic id for React list keys
  id: `${row.sectionId}-${row.day}-${row.periodNum}`,
  sectionId: row.sectionId,
  branchId: row.branchId,
  teacherId: row.teacherId || '',
  day: row.day,
  periodNum: row.periodNum,
  subject: row.subject || '',
  teacherName: row.teacherName || '',
  room: row.room || '',
});

// Returns {periods: [...]} matching the shape screens expect.
const timetableService = {
  DAYS,
  MAX_PERIODS,

  async getTimetableForSection(sectionId) {
    if (!sectionId) {return null;}
    try {
      const response = await dataConnectClient.query(
        DATA_CONNECT_QUERIES.GET_TIMETABLE_FOR_SECTION,
        {sectionId},
      );
      const periods = (response.timetablePeriods || []).map(toPeriod);
      return {sectionId, periods};
    } catch (err) {
      console.warn('[TimetableService] getTimetableForSection failed:', err?.message);
      return null;
    }
  },

  async getTimetablesForBranch(branchId) {
    if (!branchId) {return [];}
    try {
      const response = await dataConnectClient.query(
        DATA_CONNECT_QUERIES.GET_TIMETABLES_FOR_BRANCH,
        {branchId},
      );
      const allPeriods = (response.timetablePeriods || []).map(toPeriod);
      // Group by sectionId → return array of {sectionId, periods, className, sectionName}
      const map = {};
      allPeriods.forEach(p => {
        if (!map[p.sectionId]) {
          const raw = response.timetablePeriods.find(r => r.sectionId === p.sectionId);
          map[p.sectionId] = {
            sectionId: p.sectionId,
            branchId: p.branchId,
            className: raw?.section?.academicClass?.name || '',
            sectionName: raw?.section?.name || '',
            periods: [],
          };
        }
        map[p.sectionId].periods.push(p);
      });
      return Object.values(map);
    } catch (err) {
      console.warn('[TimetableService] getTimetablesForBranch failed:', err?.message);
      return [];
    }
  },

  async getTimetablesForTeacher(teacherId, branchId) {
    if (!teacherId || !branchId) {return [];}
    try {
      const response = await dataConnectClient.query(
        DATA_CONNECT_QUERIES.GET_TIMETABLE_FOR_TEACHER,
        {teacherId, branchId},
      );
      const allPeriods = (response.timetablePeriods || []).map(toPeriod);
      // Group by sectionId
      const map = {};
      allPeriods.forEach(p => {
        if (!map[p.sectionId]) {
          const raw = response.timetablePeriods.find(r => r.sectionId === p.sectionId);
          map[p.sectionId] = {
            sectionId: p.sectionId,
            branchId: p.branchId,
            className: raw?.section?.academicClass?.name || '',
            sectionName: raw?.section?.name || '',
            periods: [],
          };
        }
        map[p.sectionId].periods.push(p);
      });
      return Object.values(map);
    } catch (err) {
      console.warn('[TimetableService] getTimetablesForTeacher failed:', err?.message);
      return [];
    }
  },

  // Used by TimetableEditorScreen when opening a fresh section.
  buildEmptyTimetable(branchId, classId, className, sectionId, sectionName) {
    const periods = [];
    for (const day of DAYS) {
      for (let periodNum = 1; periodNum <= MAX_PERIODS; periodNum++) {
        periods.push({day, periodNum, subject: '', teacherId: '', teacherName: '', room: ''});
      }
    }
    return {branchId, classId, className, sectionId, sectionName, periods};
  },

  async updatePeriod(sectionId, day, periodNum, {subject, teacherId, teacherName, room}, branchId) {
    if (!sectionId) {throw new Error('Section ID required.');}
    await dataConnectClient.mutate(DATA_CONNECT_MUTATIONS.UPSERT_TIMETABLE_PERIOD, {
      sectionId,
      branchId: branchId || '',
      day,
      periodNum,
      subject: subject || '',
      teacherId: teacherId || null,
      teacherName: teacherName || '',
      room: room || '',
    });
  },

  async deleteTimetable(sectionId, branchId) {
    if (!sectionId) {throw new Error('Section ID required.');}
    await dataConnectClient.mutate(DATA_CONNECT_MUTATIONS.CLEAR_TIMETABLE_FOR_SECTION, {
      sectionId,
      branchId: branchId || '',
    });
  },
};

export default timetableService;
