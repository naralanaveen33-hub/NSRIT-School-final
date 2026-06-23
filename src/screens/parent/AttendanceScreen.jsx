import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  AppState,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import Animated, {FadeInDown, FadeInUp} from 'react-native-reanimated';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSelector} from 'react-redux';
import {useQuery} from '@tanstack/react-query';
import {AttendanceRing, CalendarAttendance, EmptyState, SelectField} from '../../components';
import {
  ATTENDANCE_STATUS,
  ATTENDANCE_STATUS_COLORS,
  ATTENDANCE_STATUS_ICONS,
  ATTENDANCE_STATUS_LABELS,
  HOLIDAY_TYPE_LABELS,
} from '../../config/constants';
import attendanceService from '../../services/attendance/attendanceService';
import holidayService from '../../services/holidays/holidayService';
import parentService from '../../services/parents/parentService';
import VoiceAnnouncementButton from '../../components/common/VoiceAnnouncementButton';
import {TELUGU} from '../../services/tts/teluguTemplates';
import {colors, radius, shadows, spacing} from '../../theme';
import {normalizeAttendanceStatus} from '../../utils/helpers/attendanceHelpers';

const pad = n => String(n).padStart(2, '0');
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const SHORT_MONTH = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const nowYear  = new Date().getFullYear();
const nowMonth = new Date().getMonth();

// ── Low Attendance Warning Banner ─────────────────────────────────────────────
const LowAttendanceBanner = ({percentage}) => {
  const thresholds = [
    {at: 75, color: '#EF4444', icon: 'alert-circle',          severity: 'critical'},
    {at: 80, color: '#F97316', icon: 'alert-circle-outline',  severity: 'warning'},
    {at: 90, color: '#EAB308', icon: 'alert-outline',         severity: 'notice'},
  ];
  const hit = thresholds.find(t => percentage < t.at);
  if (!hit) { return null; }
  return (
    <Animated.View entering={FadeInDown.duration(250).springify()}
      style={[banner.wrap, {backgroundColor: `${hit.color}15`, borderColor: `${hit.color}40`}]}>
      <MaterialCommunityIcons name={hit.icon} size={15} color={hit.color} />
      <Text style={[banner.text, {color: hit.color}]}>
        {percentage.toFixed(1)}% attendance is below the {hit.at}% minimum.
        {hit.severity === 'critical' ? ' Immediate action required.' : ' Please contact the school.'}
      </Text>
    </Animated.View>
  );
};

// ── Stat Pill ─────────────────────────────────────────────────────────────────
const StatPill = ({icon, count, label, color}) => (
  <View style={[stat.wrap, {backgroundColor: `${color}10`, borderColor: `${color}25`}]}>
    <MaterialCommunityIcons name={icon} size={14} color={color} />
    <Text style={[stat.count, {color}]}>{count}</Text>
    <Text style={stat.label}>{label}</Text>
  </View>
);

// ── Holiday Panel ─────────────────────────────────────────────────────────────
const HolidayPanel = ({holidays, title}) => {
  const [expanded, setExpanded] = useState(false);
  if (!holidays.length) { return null; }
  const visible = expanded ? holidays : holidays.slice(0, 3);
  return (
    <Animated.View entering={FadeInDown.delay(60).duration(280).springify()} style={hp.wrap}>
      <Pressable onPress={() => setExpanded(e => !e)} style={hp.header}>
        <MaterialCommunityIcons name="calendar-star" size={16} color={colors.primary} />
        <Text style={hp.title}>{title}</Text>
        <View style={hp.badge}>
          <Text style={hp.badgeText}>{holidays.length}</Text>
        </View>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </Pressable>
      {visible.map((h, i) => {
        const isUpcoming = h.date >= new Date().toISOString().slice(0, 10);
        return (
          <View key={h.id || i} style={hp.row}>
            <View style={[hp.dot, {backgroundColor: isUpcoming ? colors.primary : colors.border}]} />
            <View style={hp.info}>
              <Text style={hp.name}>{h.name}</Text>
              <Text style={hp.meta}>
                {new Date(h.date + 'T00:00:00').toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'})}
                {h.type ? `  ·  ${HOLIDAY_TYPE_LABELS[h.type] || h.type}` : ''}
              </Text>
            </View>
            {isUpcoming ? (
              <View style={hp.upcomingChip}>
                <Text style={hp.upcomingText}>Upcoming</Text>
              </View>
            ) : null}
          </View>
        );
      })}
      {holidays.length > 3 ? (
        <Pressable onPress={() => setExpanded(e => !e)} style={hp.showMore}>
          <Text style={hp.showMoreText}>
            {expanded ? 'Show less' : `Show ${holidays.length - 3} more`}
          </Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
};

// ── Main Screen ────────────────────────────────────────────────────────────────
const ParentAttendanceScreen = () => {
  const user     = useSelector(state => state.auth.user);
  const appState = useRef(AppState.currentState);

  const [selectedChild, setSelectedChild] = useState(null);
  const [viewYear,      setViewYear]      = useState(nowYear);
  const [viewMonth,     setViewMonth]     = useState(nowMonth);

  const childrenQuery = useQuery({
    queryKey: ['parentChildren', user?.id],
    queryFn:  () => parentService.getParentChildren(user?.id),
    enabled:  Boolean(user?.id),
  });
  const children = useMemo(() => childrenQuery.data || [], [childrenQuery.data]);

  useEffect(() => {
    if (!selectedChild && children[0]) { setSelectedChild(children[0]); }
  }, [children, selectedChild]);

  const yearMonth = `${viewYear}-${pad(viewMonth + 1)}`;
  const lastDay   = new Date(viewYear, viewMonth + 1, 0).getDate();
  const fromDate  = `${yearMonth}-01`;
  const toDate    = `${yearMonth}-${pad(lastDay)}`;

  const studentId = selectedChild?.studentId;
  const branchId  = selectedChild?.branchId || user?.branchId;
  const academicYearId = selectedChild?.academicYearId || user?.academicYearId;

  const attendanceQuery = useQuery({
    queryKey: ['parentAttendance', studentId, yearMonth],
    queryFn:  () => attendanceService.getAttendance({studentId, fromDate, toDate}),
    enabled:  Boolean(studentId),
    staleTime: 2 * 60 * 1000,
  });

  // Full-year attendance for academic year percentage
  const ayStart = selectedChild?.ayStartDate || `${viewYear}-06-01`;
  const ayEnd   = selectedChild?.ayEndDate   || `${viewYear + 1}-03-31`;
  const fullYearQuery = useQuery({
    queryKey: ['parentAttendanceYear', studentId, academicYearId],
    queryFn:  () => attendanceService.getAttendance({
      studentId, fromDate: ayStart, toDate: ayEnd,
    }),
    enabled:  Boolean(studentId),
    staleTime: 5 * 60 * 1000,
  });

  // Holiday map for the viewed month
  const holidayMonthQuery = useQuery({
    queryKey: ['holidayMap', branchId, yearMonth],
    queryFn:  () => holidayService.getHolidayMonthMap(branchId, yearMonth),
    enabled:  Boolean(branchId),
    staleTime: 10 * 60 * 1000,
  });

  // Full-year holidays for Holiday Panel
  const holidayYearQuery = useQuery({
    queryKey: ['holidayYearList', branchId, ayStart, ayEnd],
    queryFn:  () => holidayService.getHolidaysByBranch(branchId, ayStart, ayEnd),
    enabled:  Boolean(branchId),
    staleTime: 10 * 60 * 1000,
  });

  const records     = useMemo(() => attendanceQuery.data || [],   [attendanceQuery.data]);
  const allRecords  = useMemo(() => fullYearQuery.data || [],     [fullYearQuery.data]);
  const holidayMap  = useMemo(() => holidayMonthQuery.data || {}, [holidayMonthQuery.data]);
  const allHolidays = useMemo(() => holidayYearQuery.data || [],  [holidayYearQuery.data]);

  const summary = useMemo(() => attendanceService.summarizeAttendance(records), [records]);

  const ayPct = useMemo(() => {
    if (!allRecords.length) { return null; }
    const s = attendanceService.summarizeAttendance(allRecords);
    return s.percentage;
  }, [allRecords]);

  // Build calendar map: {dateStr: color-key}
  const calendarMap = useMemo(() => {
    const map = {};
    records.forEach(r => {
      const s = normalizeAttendanceStatus(r.status) || r.status;
      switch (s) {
        case ATTENDANCE_STATUS.PRESENT:        map[r.attendanceDate] = 'present';  break;
        case ATTENDANCE_STATUS.ABSENT:         map[r.attendanceDate] = 'absent';   break;
        case ATTENDANCE_STATUS.HALF_DAY:       map[r.attendanceDate] = 'half';     break;
        case ATTENDANCE_STATUS.LATE:           map[r.attendanceDate] = 'late';     break;
        case ATTENDANCE_STATUS.MEDICAL_LEAVE:  map[r.attendanceDate] = 'medical';  break;
        case ATTENDANCE_STATUS.APPROVED_LEAVE: map[r.attendanceDate] = 'approved'; break;
        default: break;
      }
    });
    Object.entries(holidayMap).forEach(([date, h]) => {
      if (!map[date]) { map[date] = h.isPublicHoliday ? 'publicHoliday' : 'holiday'; }
    });
    return map;
  }, [records, holidayMap]);

  const upcomingHolidays = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return allHolidays.filter(h => h.date >= todayStr).slice(0, 10);
  }, [allHolidays]);

  const isRefreshing = attendanceQuery.isFetching || fullYearQuery.isFetching;
  const onRefresh = () => {
    attendanceQuery.refetch();
    fullYearQuery.refetch();
    holidayYearQuery.refetch();
  };

  // Re-fetch on app foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (appState.current.match(/inactive|background/) && state === 'active') {
        attendanceQuery.refetch();
      }
      appState.current = state;
    });
    return () => sub.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const childOptions = children.map(c => ({label: c.fullName, value: c.id}));

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else { setViewMonth(m => m - 1); }
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else { setViewMonth(m => m + 1); }
    const isNowOrFuture = viewYear > nowYear || (viewYear === nowYear && viewMonth >= nowMonth);
    if (isNowOrFuture) { return; }
  };
  const isCurrentMonth = viewYear === nowYear && viewMonth === nowMonth;

  if (!children.length && !childrenQuery.isLoading) {
    return (
      <View style={styles.root}>
        <EmptyState
          icon="account-child"
          title="No Children Found"
          message="No student profiles are linked to your account. Please contact the school administrator."
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}>

      {/* Child selector */}
      {children.length > 1 ? (
        <View style={styles.childSelector}>
          <SelectField
            label="Child"
            value={selectedChild?.id}
            options={childOptions}
            onChange={id => setSelectedChild(children.find(c => c.id === id))}
          />
        </View>
      ) : selectedChild ? (
        <View style={styles.childNameRow}>
          <MaterialCommunityIcons name="account-school" size={16} color={colors.primary} />
          <Text style={styles.childName}>{selectedChild.fullName}</Text>
          {selectedChild.section?.name ? (
            <Text style={styles.childSection}>{selectedChild.section.name}</Text>
          ) : null}
        </View>
      ) : null}

      {/* Low attendance banner */}
      {summary.total > 0 ? <LowAttendanceBanner percentage={summary.percentage} /> : null}

      {/* Month nav */}
      <Animated.View entering={FadeInDown.duration(250).springify()} style={styles.monthNav}>
        <Pressable onPress={prevMonth} hitSlop={12} style={styles.monthNavBtn}>
          <MaterialCommunityIcons name="chevron-left" size={22} color={colors.primary} />
        </Pressable>
        <View style={styles.monthCenter}>
          <Text style={styles.monthTitle}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
          {!isCurrentMonth ? (
            <Pressable onPress={() => { setViewYear(nowYear); setViewMonth(nowMonth); }}>
              <Text style={styles.todayLink}>Back to current month</Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable onPress={nextMonth} hitSlop={12}
          disabled={isCurrentMonth}
          style={[styles.monthNavBtn, isCurrentMonth && styles.monthNavBtnDis]}>
          <MaterialCommunityIcons name="chevron-right" size={22}
            color={isCurrentMonth ? colors.border : colors.primary} />
        </Pressable>
      </Animated.View>

      {/* Attendance ring */}
      <Animated.View entering={FadeInDown.delay(40).duration(280).springify()} style={styles.ringCard}>
        <AttendanceRing percentage={summary.percentage} size={110} strokeWidth={10} />
        <View style={styles.ringStats}>
          <Text style={styles.ringPct}>{summary.percentage}%</Text>
          <Text style={styles.ringLabel}>This Month</Text>
          {ayPct != null ? (
            <View style={styles.ayPctRow}>
              <Text style={styles.ayPctLabel}>Academic Year:</Text>
              <Text style={[styles.ayPctVal, {color: ayPct < 75 ? colors.danger : ayPct < 85 ? colors.warning : colors.success}]}>
                {ayPct}%
              </Text>
            </View>
          ) : null}
        </View>
        {selectedChild ? (
          <VoiceAnnouncementButton
            text={TELUGU.attendanceAlert(
              selectedChild.fullName,
              ayPct != null ? ayPct : summary.percentage,
            )}
            size={18}
          />
        ) : null}
      </Animated.View>

      {/* Stats pills */}
      {summary.total > 0 ? (
        <Animated.View entering={FadeInDown.delay(60).duration(280).springify()} style={styles.statsRow}>
          <StatPill icon="check-circle"            count={summary.present}      label="Present"  color={colors.success} />
          <StatPill icon="close-circle"            count={summary.absent}       label="Absent"   color={colors.danger}  />
          {summary.halfDay > 0 ? (
            <StatPill icon="circle-half-full"      count={summary.halfDay}      label="Half Day" color="#F97316" />
          ) : null}
          {summary.late > 0 ? (
            <StatPill icon="clock-alert-outline"   count={summary.late}         label="Late"     color="#EAB308" />
          ) : null}
          {summary.medicalLeave > 0 ? (
            <StatPill icon="medical-bag"           count={summary.medicalLeave} label="Medical"  color="#8B5CF6" />
          ) : null}
          {summary.approvedLeave > 0 ? (
            <StatPill icon="calendar-check-outline" count={summary.approvedLeave} label="Approved" color="#3B82F6" />
          ) : null}
        </Animated.View>
      ) : null}

      {/* Calendar */}
      <Animated.View entering={FadeInDown.delay(80).duration(280).springify()} style={styles.calCard}>
        <Text style={styles.calTitle}>Daily Attendance</Text>
        <CalendarAttendance
          monthDate={new Date(viewYear, viewMonth, 1)}
          records={calendarMap}
        />
        {/* Calendar legend */}
        <View style={styles.legend}>
          {[
            {key: 'present',  color: colors.success,  label: 'Present'},
            {key: 'absent',   color: colors.danger,   label: 'Absent'},
            {key: 'half',     color: '#F97316',       label: 'Half Day'},
            {key: 'late',     color: '#EAB308',       label: 'Late'},
            {key: 'medical',  color: '#8B5CF6',       label: 'Medical'},
            {key: 'approved', color: '#3B82F6',       label: 'Approved'},
            {key: 'holiday',  color: '#F97316',       label: 'Holiday'},
          ].map(item => (
            <View key={item.key} style={styles.legendItem}>
              <View style={[styles.legendDot, {backgroundColor: item.color}]} />
              <Text style={styles.legendText}>{item.label}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Holiday Panel */}
      {upcomingHolidays.length > 0 ? (
        <HolidayPanel holidays={upcomingHolidays} title="Upcoming Holidays" />
      ) : null}
      {allHolidays.length > 0 && !upcomingHolidays.length ? (
        <HolidayPanel holidays={allHolidays} title="Academic Year Holidays" />
      ) : null}

      <View style={{height: 32}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root:        {backgroundColor: colors.background, flex: 1},
  content:     {padding: spacing.lg},

  childSelector: {marginBottom: spacing.md},
  childNameRow:  {alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md},
  childName:     {color: colors.text, fontSize: 15, fontWeight: '800'},
  childSection:  {color: colors.textMuted, fontSize: 12, fontWeight: '600'},

  monthNav:      {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md},
  monthNavBtn:   {padding: 4},
  monthNavBtnDis:{opacity: 0.3},
  monthCenter:   {alignItems: 'center'},
  monthTitle:    {color: colors.text, fontSize: 17, fontWeight: '800'},
  todayLink:     {color: colors.primary, fontSize: 11, fontWeight: '600', marginTop: 2},

  ringCard:   {alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card, borderWidth: 1.5, flexDirection: 'row', gap: spacing.xl, marginBottom: spacing.md, padding: spacing.lg, ...shadows.clay},
  ringStats:  {flex: 1},
  ringPct:    {color: colors.text, fontSize: 28, fontWeight: '900'},
  ringLabel:  {color: colors.textMuted, fontSize: 12, fontWeight: '600'},
  ayPctRow:   {alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: spacing.sm},
  ayPctLabel: {color: colors.textMuted, fontSize: 11, fontWeight: '600'},
  ayPctVal:   {fontSize: 13, fontWeight: '800'},

  statsRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md},

  calCard:     {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card, borderWidth: 1.5, marginBottom: spacing.md, padding: spacing.md, ...shadows.clay},
  calTitle:    {color: colors.text, fontSize: 14, fontWeight: '800', marginBottom: spacing.sm},
  legend:      {borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm, paddingTop: spacing.sm},
  legendItem:  {alignItems: 'center', flexDirection: 'row', gap: 4},
  legendDot:   {borderRadius: 3, height: 6, width: 6},
  legendText:  {color: colors.textMuted, fontSize: 10, fontWeight: '700'},
});

const banner = StyleSheet.create({
  wrap: {alignItems: 'center', borderRadius: radius.card, borderWidth: 1.5, flexDirection: 'row', gap: 8, marginBottom: spacing.md, padding: spacing.md},
  text: {flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 18},
});

const stat = StyleSheet.create({
  wrap:  {alignItems: 'center', borderRadius: radius.pill, borderWidth: 1, flexDirection: 'row', gap: 5, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs},
  count: {fontSize: 14, fontWeight: '800'},
  label: {color: colors.textMuted, fontSize: 10, fontWeight: '600'},
});

const hp = StyleSheet.create({
  wrap:    {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card, borderWidth: 1.5, marginBottom: spacing.md, padding: spacing.md},
  header:  {alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm},
  title:   {color: colors.text, flex: 1, fontSize: 14, fontWeight: '800'},
  badge:   {alignItems: 'center', backgroundColor: `${colors.primary}15`, borderRadius: radius.pill, height: 20, justifyContent: 'center', minWidth: 20, paddingHorizontal: 5},
  badgeText: {color: colors.primary, fontSize: 10, fontWeight: '800'},
  row:     {alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm},
  dot:     {borderRadius: 5, height: 6, marginTop: 5, width: 6},
  info:    {flex: 1},
  name:    {color: colors.text, fontSize: 13, fontWeight: '700'},
  meta:    {color: colors.textMuted, fontSize: 11, fontWeight: '500', marginTop: 2},
  upcomingChip: {backgroundColor: `${colors.primary}15`, borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 2},
  upcomingText: {color: colors.primary, fontSize: 9, fontWeight: '800'},
  showMore:  {alignItems: 'center', paddingTop: spacing.xs},
  showMoreText: {color: colors.primary, fontSize: 12, fontWeight: '600'},
});

export default ParentAttendanceScreen;
