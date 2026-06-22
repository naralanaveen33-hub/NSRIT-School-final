import React, {useState, useCallback} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import Animated, {FadeInDown} from 'react-native-reanimated';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {ConfirmationModal} from '../../components';
import timetableService from '../../services/timetable/timetableService';
import {colors, radius, shadows, spacing, typography} from '../../theme';

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SUBJECT_COLORS = [
  colors.primary, colors.secondary, colors.info, colors.success,
  colors.warning, colors.danger, colors.purple, '#E11D48',
];

const getSubjectColor = subject => {
  if (!subject) {return colors.border;}
  let hash = 0;
  for (const c of subject) {hash = (hash * 31 + c.charCodeAt(0)) % SUBJECT_COLORS.length;}
  return SUBJECT_COLORS[hash];
};

const PeriodCell = ({period, onPress}) => {
  const hasSubject = Boolean(period.subject);
  const color = getSubjectColor(period.subject);
  return (
    <Pressable
      onPress={() => onPress(period)}
      style={[styles.cell, hasSubject ? {borderColor: color, backgroundColor: `${color}15`} : styles.cellEmpty]}>
      {hasSubject ? (
        <>
          <Text style={[styles.cellSubject, {color}]} numberOfLines={2}>{period.subject}</Text>
          {period.teacherName ? (
            <Text style={styles.cellTeacher} numberOfLines={1}>{period.teacherName}</Text>
          ) : null}
        </>
      ) : (
        <MaterialCommunityIcons name="plus" size={14} color={colors.border} />
      )}
    </Pressable>
  );
};

const PeriodModal = ({visible, period, onSave, onClear, onClose}) => {
  const [subject, setSubject] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [room, setRoom] = useState('');

  React.useEffect(() => {
    if (visible && period) {
      setSubject(period.subject || '');
      setTeacherName(period.teacherName || '');
      setRoom(period.room || '');
    }
  }, [visible, period]);

  const handleSave = () => {
    if (!subject.trim()) {
      Alert.alert('Required', 'Please enter a subject name.');
      return;
    }
    onSave({subject: subject.trim(), teacherName: teacherName.trim(), room: room.trim()});
  };

  if (!period) {return null;}

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={e => e.stopPropagation()}>
          <Text style={styles.modalTitle}>
            {period.day} — Period {period.periodNum}
          </Text>

          <Text style={styles.fieldLabel}>Subject *</Text>
          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="book-open-outline" size={16} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              value={subject}
              onChangeText={setSubject}
              placeholder="e.g. Mathematics"
              placeholderTextColor={colors.textSoft}
              autoFocus
            />
          </View>

          <Text style={styles.fieldLabel}>Teacher Name</Text>
          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="account-tie-outline" size={16} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              value={teacherName}
              onChangeText={setTeacherName}
              placeholder="Teacher name (optional)"
              placeholderTextColor={colors.textSoft}
            />
          </View>

          <Text style={styles.fieldLabel}>Room</Text>
          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="door-open" size={16} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              value={room}
              onChangeText={setRoom}
              placeholder="e.g. Room 101"
              placeholderTextColor={colors.textSoft}
            />
          </View>

          <View style={styles.modalActions}>
            {period.subject ? (
              <Pressable style={styles.clearBtn} onPress={onClear}>
                <Text style={styles.clearBtnText}>Clear</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const TimetableEditorScreen = ({route, navigation}) => {
  const {sectionId, sectionName, classId, className, branchId} = route.params || {};
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  const {data: timetable, isLoading, refetch} = useQuery({
    queryKey: ['timetableSection', sectionId],
    queryFn: () => timetableService.getTimetableForSection(sectionId),
    enabled: Boolean(sectionId),
  });

  const getPeriod = useCallback((day, periodNum) => {
    const periods = timetable?.periods || [];
    return periods.find(p => p.day === day && p.periodNum === periodNum) ||
      {day, periodNum, subject: '', teacherName: '', room: ''};
  }, [timetable]);

  const handleCellPress = period => {
    setSelectedPeriod(period);
    setModalVisible(true);
  };

  const handleSavePeriod = async ({subject, teacherName, room}) => {
    if (!selectedPeriod) {return;}
    setSaving(true);
    setModalVisible(false);
    try {
      await timetableService.updatePeriod(sectionId, selectedPeriod.day, selectedPeriod.periodNum, {
        subject, teacherName, room,
      });
      queryClient.invalidateQueries({queryKey: ['timetableSection', sectionId]});
      queryClient.invalidateQueries({queryKey: ['timetablesForBranch', branchId]});
      refetch();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to save period.');
    } finally {
      setSaving(false);
    }
  };

  const handleClearPeriod = async () => {
    if (!selectedPeriod) {return;}
    setSaving(true);
    setModalVisible(false);
    try {
      await timetableService.updatePeriod(sectionId, selectedPeriod.day, selectedPeriod.periodNum, {
        subject: '', teacherName: '', room: '',
      });
      queryClient.invalidateQueries({queryKey: ['timetableSection', sectionId]});
      queryClient.invalidateQueries({queryKey: ['timetablesForBranch', branchId]});
      refetch();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to clear period.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTimetable = () => {
    setDeleteConfirmVisible(true);
  };

  const confirmDeleteTimetable = async () => {
    setDeleteConfirmVisible(false);
    try {
      await timetableService.deleteTimetable(sectionId);
      queryClient.invalidateQueries({queryKey: ['timetableSection', sectionId]});
      queryClient.invalidateQueries({queryKey: ['timetablesForBranch', branchId]});
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to delete timetable.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const periodNums = Array.from({length: timetableService.MAX_PERIODS}, (_, i) => i + 1);

  return (
    <>
      <ScrollView
        style={styles.root}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>

        {/* ── Header ── */}
        <Animated.View entering={FadeInDown.duration(260).springify()} style={styles.header}>
          <View style={styles.headerDecor} />
          <View style={styles.headerRow}>
            <View style={styles.headerIcon}>
              <MaterialCommunityIcons name="calendar-clock" size={20} color={colors.white} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>{className} — {sectionName}</Text>
              <Text style={styles.headerSub}>Tap any cell to set subject and teacher</Text>
            </View>
            {saving ? <ActivityIndicator size="small" color={colors.white} /> : null}
          </View>
          {timetable ? (
            <Pressable style={styles.deleteBtn} onPress={handleDeleteTimetable}>
              <MaterialCommunityIcons name="delete-outline" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.deleteBtnText}>Clear All</Text>
            </Pressable>
          ) : null}
        </Animated.View>

        {/* ── Grid ── */}
        <Animated.View entering={FadeInDown.delay(80).duration(280).springify()} style={styles.grid}>
          {/* Column header row */}
          <View style={styles.gridRow}>
            <View style={styles.periodHeader} />
            {DAYS_SHORT.map(day => (
              <View key={day} style={styles.dayHeader}>
                <Text style={styles.dayHeaderText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Period rows */}
          {periodNums.map(pNum => (
            <View key={pNum} style={styles.gridRow}>
              <View style={styles.periodHeader}>
                <Text style={styles.periodHeaderText}>P{pNum}</Text>
              </View>
              {timetableService.DAYS.map(day => (
                <PeriodCell
                  key={`${day}_${pNum}`}
                  period={getPeriod(day, pNum)}
                  onPress={handleCellPress}
                />
              ))}
            </View>
          ))}
        </Animated.View>

        {/* ── Legend ── */}
        <View style={styles.legendRow}>
          <MaterialCommunityIcons name="information-outline" size={12} color={colors.textMuted} />
          <Text style={styles.legendText}>
            Tap empty cell to assign · Tap filled cell to edit or clear
          </Text>
        </View>

        <View style={{height: spacing.xxxl}} />
      </ScrollView>

      <PeriodModal
        visible={modalVisible}
        period={selectedPeriod}
        onSave={handleSavePeriod}
        onClear={handleClearPeriod}
        onClose={() => setModalVisible(false)}
      />
      <ConfirmationModal
        visible={deleteConfirmVisible}
        title="Delete Timetable?"
        message={`Remove all timetable data for ${className} ${sectionName}? This cannot be undone.`}
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        isDestructive
        onConfirm={confirmDeleteTimetable}
        onCancel={() => setDeleteConfirmVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  content: {padding: spacing.md},
  center: {alignItems: 'center', flex: 1, justifyContent: 'center'},

  header: {
    backgroundColor: colors.primary,
    borderRadius: radius.hero,
    marginBottom: spacing.md,
    overflow: 'hidden',
    padding: spacing.lg,
    ...shadows.clayDeep,
  },
  headerDecor: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 70,
    height: 120,
    position: 'absolute',
    right: -20,
    top: -30,
    width: 120,
  },
  headerRow: {alignItems: 'center', flexDirection: 'row', gap: spacing.md},
  headerIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.md,
    height: 40, width: 40,
    justifyContent: 'center',
  },
  headerCopy: {flex: 1},
  headerTitle: {color: colors.white, fontSize: 16, fontWeight: '800'},
  headerSub: {color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 2},
  deleteBtn: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 4,
    marginTop: spacing.sm,
    opacity: 0.75,
  },
  deleteBtnText: {color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700'},

  grid: {
    ...shadows.clay,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1.5,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  gridRow: {flexDirection: 'row'},
  periodHeader: {
    alignItems: 'center',
    backgroundColor: colors.neutralSoft,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    borderRightColor: colors.border,
    borderRightWidth: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    width: 30,
  },
  periodHeaderText: {color: colors.textMuted, fontSize: 9, fontWeight: '800'},
  dayHeader: {
    alignItems: 'center',
    backgroundColor: colors.neutralSoft,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    borderRightColor: colors.border,
    borderRightWidth: 1,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  dayHeaderText: {color: colors.text, fontSize: 10, fontWeight: '800'},

  cell: {
    alignItems: 'center',
    borderBottomColor: colors.borderLight,
    borderBottomWidth: 1,
    borderRadius: radius.md,
    borderRightColor: colors.borderLight,
    borderRightWidth: 1,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    margin: 2,
    minHeight: 54,
    padding: 4,
  },
  cellEmpty: {
    backgroundColor: colors.background,
    borderColor: `${colors.border}88`,
  },
  cellSubject: {fontSize: 9, fontWeight: '800', textAlign: 'center'},
  cellTeacher: {color: colors.textMuted, fontSize: 8, marginTop: 2, textAlign: 'center'},

  legendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  legendText: {...typography.caption, color: colors.textMuted, textAlign: 'center'},

  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(14,165,233,0.08)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.xl,
    width: '100%',
    ...shadows.clayModal,
  },
  modalTitle: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  fieldLabel: {
    ...typography.captionBold,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
    textTransform: 'uppercase',
  },
  inputWrap: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    marginTop: spacing.xl,
  },
  clearBtn: {
    borderColor: colors.danger,
    borderRadius: radius.card,
    borderWidth: 1.5,
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  clearBtnText: {color: colors.danger, fontSize: 13, fontWeight: '700'},
  cancelBtn: {
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  cancelBtnText: {...typography.captionBold, color: colors.textMuted},
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    ...shadows.fab,
  },
  saveBtnText: {color: colors.white, fontSize: 13, fontWeight: '800'},
});

export default TimetableEditorScreen;
