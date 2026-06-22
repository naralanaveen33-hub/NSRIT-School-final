import React, {useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import Animated, {FadeInDown, FadeInRight} from 'react-native-reanimated';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSelector} from 'react-redux';
import {useQuery} from '@tanstack/react-query';
import {EmptyState} from '../../components';
import timetableService from '../../services/timetable/timetableService';
import {colors, radius, shadows, spacing, typography} from '../../theme';

const DAY_COLORS = {
  Monday: colors.primary,
  Tuesday: colors.secondary,
  Wednesday: colors.info,
  Thursday: colors.success,
  Friday: colors.warning,
  Saturday: colors.purple,
};

const PeriodCard = ({period, index}) => (
  <Animated.View
    entering={FadeInRight.delay(index * 50).duration(220).springify()}
    style={styles.periodCard}>
    <View style={[styles.periodNumBadge, {backgroundColor: `${colors.primary}15`}]}>
      <Text style={[styles.periodNum, {color: colors.primary}]}>P{period.periodNum}</Text>
    </View>
    <View style={styles.periodInfo}>
      <Text style={styles.periodSubject}>{period.subject}</Text>
      {period.sectionLabel ? (
        <Text style={styles.periodSection}>{period.sectionLabel}</Text>
      ) : null}
      {period.room ? (
        <Text style={styles.periodRoom}>
          <MaterialCommunityIcons name="door-open" size={10} color={colors.textMuted} /> {period.room}
        </Text>
      ) : null}
    </View>
  </Animated.View>
);

const DayBlock = ({day, periods, index}) => {
  const dayColor = DAY_COLORS[day] || colors.primary;
  if (periods.length === 0) {return null;}
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).duration(260).springify()}
      style={styles.dayBlock}>
      <View style={[styles.dayHeader, {backgroundColor: `${dayColor}15`, borderLeftColor: dayColor}]}>
        <MaterialCommunityIcons name="calendar-today" size={14} color={dayColor} />
        <Text style={[styles.dayTitle, {color: dayColor}]}>{day}</Text>
        <Text style={styles.dayCount}>{periods.length} period{periods.length !== 1 ? 's' : ''}</Text>
      </View>
      {periods.map((p, i) => (
        <PeriodCard key={`${p.day}_${p.periodNum}_${p.sectionId}`} period={p} index={i} />
      ))}
    </Animated.View>
  );
};

const TimetableScreen = () => {
  const user = useSelector(state => state.auth.user);
  const teacherId = user?.teacherId || user?.id;
  const branchId = user?.branchId;
  const [selectedDay, setSelectedDay] = useState('All');

  const {data: timetables = [], isLoading} = useQuery({
    queryKey: ['teacherTimetable', teacherId, branchId],
    queryFn: () => timetableService.getTimetablesForTeacher(teacherId, branchId),
    enabled: Boolean(teacherId && branchId),
  });

  const periodsGroupedByDay = React.useMemo(() => {
    const grouped = {};
    for (const day of timetableService.DAYS) {grouped[day] = [];}
    for (const tt of timetables) {
      for (const period of tt.periods || []) {
        if (period.subject && period.teacherId === teacherId) {
          grouped[period.day]?.push({
            ...period,
            sectionId: tt.sectionId,
            sectionLabel: `${tt.className} ${tt.sectionName}`,
          });
        }
      }
    }
    for (const day of Object.keys(grouped)) {
      grouped[day].sort((a, b) => a.periodNum - b.periodNum);
    }
    return grouped;
  }, [timetables, teacherId]);

  const allPeriods = Object.values(periodsGroupedByDay).flat();
  const days = selectedDay === 'All'
    ? timetableService.DAYS.filter(d => periodsGroupedByDay[d]?.length > 0)
    : timetableService.DAYS.filter(d => d === selectedDay);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>

      {/* ── Hero ── */}
      <Animated.View entering={FadeInDown.duration(260).springify()} style={styles.hero}>
        <View style={styles.heroDecor} />
        <View style={styles.heroRow}>
          <MaterialCommunityIcons name="calendar-clock" size={24} color={colors.white} />
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>My Timetable</Text>
            <Text style={styles.heroSub}>
              {allPeriods.length} assigned period{allPeriods.length !== 1 ? 's' : ''} this week
            </Text>
          </View>
        </View>
        {/* Day filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {['All', ...timetableService.DAYS.map(d => d.slice(0, 3))].map((label, i) => {
            const fullDay = i === 0 ? 'All' : timetableService.DAYS[i - 1];
            const active = selectedDay === fullDay;
            return (
              <View
                key={label}
                style={[styles.chip, active && styles.chipActive]}
                onStartShouldSetResponder={() => true}
                onResponderRelease={() => setSelectedDay(fullDay)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
              </View>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* ── Day blocks ── */}
      {allPeriods.length === 0 ? (
        <EmptyState
          title="No periods assigned"
          message="Your timetable will appear here once the principal has assigned your classes."
        />
      ) : (
        days.map((day, i) => (
          <DayBlock
            key={day}
            day={day}
            periods={periodsGroupedByDay[day] || []}
            index={i}
          />
        ))
      )}

      <View style={{height: spacing.xxxl}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  content: {padding: spacing.lg},
  center: {alignItems: 'center', flex: 1, justifyContent: 'center'},

  hero: {
    backgroundColor: colors.secondary,
    borderRadius: radius.hero,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    ...shadows.clayDeep,
  },
  heroDecor: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 90,
    height: 160,
    position: 'absolute',
    right: -30,
    top: -50,
    width: 160,
  },
  heroRow: {alignItems: 'center', flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg},
  heroCopy: {flex: 1},
  heroTitle: {color: colors.white, fontSize: 18, fontWeight: '800'},
  heroSub: {color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2},
  chips: {gap: spacing.sm},
  chip: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipActive: {backgroundColor: 'rgba(255,255,255,0.9)'},
  chipText: {color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '700'},
  chipTextActive: {color: colors.secondary},

  dayBlock: {marginBottom: spacing.md},
  dayHeader: {
    alignItems: 'center',
    borderLeftWidth: 3,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.sm,
  },
  dayTitle: {flex: 1, fontSize: 13, fontWeight: '800'},
  dayCount: {...typography.caption, color: colors.textMuted},

  periodCard: {
    ...shadows.clay,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xs,
    padding: spacing.md,
  },
  periodNumBadge: {
    alignItems: 'center',
    borderRadius: radius.sm,
    height: 36, width: 36,
    justifyContent: 'center',
  },
  periodNum: {fontSize: 11, fontWeight: '900'},
  periodInfo: {flex: 1},
  periodSubject: {...typography.bodyBold, color: colors.text},
  periodSection: {...typography.caption, color: colors.primary, fontWeight: '700', marginTop: 1},
  periodRoom: {...typography.caption, color: colors.textMuted, marginTop: 2},
});

export default TimetableScreen;
