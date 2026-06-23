import React, {useState, useCallback, useMemo} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import Animated, {FadeInDown} from 'react-native-reanimated';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSelector} from 'react-redux';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {ConfirmationModal} from '../../components';
import timetableService, {
  canManageTimetable,
  canPublishTimetable,
  canDeleteTimetable,
  getTimetableStatus,
} from '../../services/timetable/timetableService';
import teacherService from '../../services/teachers/teacherService';
import {TIMETABLE_STATUS} from '../../config/constants';
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

// ── Period Cell ───────────────────────────────────────────────────────────────

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
          {period.startTime ? (
            <Text style={styles.cellTime} numberOfLines={1}>{period.startTime}</Text>
          ) : null}
        </>
      ) : (
        <MaterialCommunityIcons name="plus" size={14} color={colors.border} />
      )}
    </Pressable>
  );
};

// ── Teacher Picker Modal ──────────────────────────────────────────────────────

const TeacherPickerModal = ({visible, teachers, onSelect, onClose}) => {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search.trim()) {return teachers;}
    const q = search.toLowerCase();
    return teachers.filter(t => (t.name || '').toLowerCase().includes(q));
  }, [teachers, search]);

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Teacher</Text>
            <Pressable onPress={onClose} style={styles.pickerClose}>
              <MaterialCommunityIcons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          </View>
          <View style={styles.pickerSearch}>
            <MaterialCommunityIcons name="magnify" size={16} color={colors.textMuted} />
            <TextInput
              style={styles.pickerSearchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search teacher..."
              placeholderTextColor={colors.textSoft}
              autoFocus
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={t => t.id}
            renderItem={({item}) => (
              <Pressable
                style={({pressed}) => [styles.teacherRow, pressed && {backgroundColor: colors.primaryFaint}]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                  setSearch('');
                }}>
                <View style={styles.teacherAvatar}>
                  <Text style={styles.teacherAvatarText}>{(item.name || 'T')[0].toUpperCase()}</Text>
                </View>
                <View style={styles.teacherInfo}>
                  <Text style={styles.teacherName}>{item.name}</Text>
                  {item.designation ? (
                    <Text style={styles.teacherDes}>{item.designation}</Text>
                  ) : null}
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.pickerEmpty}>
                <Text style={styles.pickerEmptyText}>No teachers found</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
};

// ── Section Picker Modal (for Copy From) ─────────────────────────────────────

const SectionPickerModal = ({visible, sections, onSelect, onClose}) => (
  <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
    <Pressable style={styles.overlay} onPress={onClose}>
      <Pressable style={styles.sectionPickerModal} onPress={e => e.stopPropagation()}>
        <Text style={styles.modalTitle}>Copy Timetable From</Text>
        <Text style={styles.sectionPickerSub}>Select a section to copy its timetable</Text>
        <FlatList
          data={sections}
          keyExtractor={s => s.sectionId}
          style={styles.sectionPickerList}
          renderItem={({item}) => (
            <Pressable
              style={({pressed}) => [styles.sectionPickerRow, pressed && {backgroundColor: colors.primaryFaint}]}
              onPress={() => {onSelect(item); onClose();}}>
              <MaterialCommunityIcons name="school-outline" size={16} color={colors.primary} />
              <Text style={styles.sectionPickerLabel}>{item.className} — Section {item.sectionName}</Text>
            </Pressable>
          )}
        />
        <Pressable style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </Pressable>
      </Pressable>
    </Pressable>
  </Modal>
);

// ── Period Modal ──────────────────────────────────────────────────────────────

const PeriodModal = ({visible, period, teachers, onSave, onClear, onClose}) => {
  const [subject, setSubject] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [room, setRoom] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [teacherPickerVisible, setTeacherPickerVisible] = useState(false);

  React.useEffect(() => {
    if (visible && period) {
      setSubject(period.subject || '');
      setSelectedTeacher(period.teacherId
        ? {id: period.teacherId, name: period.teacherName || ''}
        : null);
      setRoom(period.room || '');
      setStartTime(period.startTime || '');
      setEndTime(period.endTime || '');
    }
  }, [visible, period]);

  const handleSave = () => {
    if (!subject.trim()) {
      Alert.alert('Required', 'Please enter a subject name.');
      return;
    }
    onSave({
      subject: subject.trim(),
      teacherId: selectedTeacher?.id || null,
      teacherName: selectedTeacher?.name || '',
      room: room.trim(),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
    });
  };

  if (!period) {return null;}

  return (
    <>
      <Modal transparent animationType="fade" visible={visible && !teacherPickerVisible} onRequestClose={onClose}>
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

            <Text style={styles.fieldLabel}>Teacher</Text>
            <Pressable
              style={[styles.inputWrap, styles.teacherPickerBtn]}
              onPress={() => setTeacherPickerVisible(true)}>
              <MaterialCommunityIcons name="account-tie-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.input, !selectedTeacher && {color: colors.textSoft}]}>
                {selectedTeacher ? selectedTeacher.name : 'Tap to select teacher...'}
              </Text>
              {selectedTeacher ? (
                <Pressable onPress={() => setSelectedTeacher(null)}>
                  <MaterialCommunityIcons name="close-circle" size={16} color={colors.textMuted} />
                </Pressable>
              ) : (
                <MaterialCommunityIcons name="chevron-right" size={16} color={colors.textMuted} />
              )}
            </Pressable>

            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Text style={styles.fieldLabel}>Start Time</Text>
                <View style={styles.inputWrap}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color={colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    value={startTime}
                    onChangeText={setStartTime}
                    placeholder="09:00"
                    placeholderTextColor={colors.textSoft}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>
              <View style={styles.timeField}>
                <Text style={styles.fieldLabel}>End Time</Text>
                <View style={styles.inputWrap}>
                  <MaterialCommunityIcons name="clock-check-outline" size={14} color={colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    value={endTime}
                    onChangeText={setEndTime}
                    placeholder="09:45"
                    placeholderTextColor={colors.textSoft}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>
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

      <TeacherPickerModal
        visible={teacherPickerVisible}
        teachers={teachers}
        onSelect={t => setSelectedTeacher(t)}
        onClose={() => setTeacherPickerVisible(false)}
      />
    </>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────

const TimetableEditorScreen = ({route, navigation}) => {
  const {sectionId, sectionName, className, branchId} = route.params || {};
  const user = useSelector(state => state.auth.user);
  const role = useSelector(state => state.auth.role);
  const userId = user?.id;
  const queryClient = useQueryClient();

  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [publishConfirmVisible, setPublishConfirmVisible] = useState(false);
  const [unpublishConfirmVisible, setUnpublishConfirmVisible] = useState(false);
  const [copyPickerVisible, setCopyPickerVisible] = useState(false);

  // Fetch this section's timetable
  const {data: timetable, isLoading, refetch} = useQuery({
    queryKey: ['timetableSection', sectionId],
    queryFn: () => timetableService.getTimetableForSection(sectionId),
    enabled: Boolean(sectionId),
  });

  // Fetch all branch timetables (for conflict detection)
  const {data: branchTimetables = []} = useQuery({
    queryKey: ['timetablesForBranch', branchId],
    queryFn: () => timetableService.getTimetablesForBranch(branchId),
    enabled: Boolean(branchId),
  });

  // Fetch teachers for picker
  const {data: teachersData} = useQuery({
    queryKey: ['teachersByBranch', branchId],
    queryFn: () => teacherService.getTeachers({branchId}, {role, branchId}),
    enabled: Boolean(branchId),
  });
  const teachers = useMemo(() => (teachersData?.teachers || []).map(t => ({
    id: t.id,
    name: t.user?.name || t.name || '',
    designation: t.designation || '',
  })), [teachersData]);

  // Timetable status
  const timetableStatus = useMemo(
    () => getTimetableStatus(timetable?.periods || []),
    [timetable],
  );
  const isPublished = timetableStatus.status === TIMETABLE_STATUS.PUBLISHED;

  const getPeriod = useCallback((day, periodNum) => {
    const periods = timetable?.periods || [];
    return periods.find(p => p.day === day && p.periodNum === periodNum) ||
      {day, periodNum, subject: '', teacherName: '', teacherId: '', room: '', startTime: '', endTime: ''};
  }, [timetable]);

  const handleCellPress = period => {
    setSelectedPeriod(period);
    setModalVisible(true);
  };

  const doSave = async ({subject, teacherId, teacherName, room, startTime, endTime}) => {
    setSaving(true);
    setModalVisible(false);
    try {
      await timetableService.updatePeriodFull(sectionId, selectedPeriod.day, selectedPeriod.periodNum, {
        subject, teacherId, teacherName, room, startTime, endTime,
        status: isPublished ? TIMETABLE_STATUS.PUBLISHED : TIMETABLE_STATUS.DRAFT,
        timetableType: 'REGULAR',
      }, branchId);
      queryClient.invalidateQueries({queryKey: ['timetableSection', sectionId]});
      queryClient.invalidateQueries({queryKey: ['timetablesForBranch', branchId]});
      refetch();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to save period.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePeriod = async payload => {
    const conflict = timetableService.detectTeacherConflict(
      payload.teacherId, selectedPeriod.day, selectedPeriod.periodNum,
      branchTimetables, sectionId,
    );
    if (conflict) {
      Alert.alert(
        'Conflict Detected',
        `${payload.teacherName} is already assigned to ${conflict.className} Section ${conflict.sectionName} on ${selectedPeriod.day}, Period ${selectedPeriod.periodNum}.`,
        [
          {text: 'Save Anyway', onPress: () => doSave(payload)},
          {text: 'Cancel', style: 'cancel'},
        ],
      );
      return;
    }
    doSave(payload);
  };

  const handleClearPeriod = async () => {
    if (!selectedPeriod) {return;}
    setSaving(true);
    setModalVisible(false);
    try {
      await timetableService.updatePeriodFull(sectionId, selectedPeriod.day, selectedPeriod.periodNum, {
        subject: '', teacherId: null, teacherName: '', room: '', startTime: '', endTime: '',
        status: TIMETABLE_STATUS.DRAFT,
        timetableType: 'REGULAR',
      }, branchId);
      queryClient.invalidateQueries({queryKey: ['timetableSection', sectionId]});
      queryClient.invalidateQueries({queryKey: ['timetablesForBranch', branchId]});
      refetch();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to clear period.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTimetable = () => setDeleteConfirmVisible(true);

  const confirmDeleteTimetable = async () => {
    setDeleteConfirmVisible(false);
    try {
      await timetableService.deleteTimetable(sectionId, branchId);
      queryClient.invalidateQueries({queryKey: ['timetableSection', sectionId]});
      queryClient.invalidateQueries({queryKey: ['timetablesForBranch', branchId]});
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to delete timetable.');
    }
  };

  const handlePublish = () => setPublishConfirmVisible(true);

  const confirmPublish = async () => {
    setPublishConfirmVisible(false);
    setPublishing(true);
    try {
      await timetableService.publishTimetable(sectionId, branchId, userId, role);
      queryClient.invalidateQueries({queryKey: ['timetableSection', sectionId]});
      queryClient.invalidateQueries({queryKey: ['timetablesForBranch', branchId]});
      refetch();
      Alert.alert('Published!', 'The timetable is now visible to students, parents, and teachers.');
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to publish timetable.');
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = () => setUnpublishConfirmVisible(true);

  const confirmUnpublish = async () => {
    setUnpublishConfirmVisible(false);
    try {
      await timetableService.unpublishTimetable(sectionId, branchId, role);
      queryClient.invalidateQueries({queryKey: ['timetableSection', sectionId]});
      queryClient.invalidateQueries({queryKey: ['timetablesForBranch', branchId]});
      refetch();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to unpublish timetable.');
    }
  };

  const handleCopyFrom = async section => {
    if (!section?.sectionId) {return;}
    try {
      const copied = await timetableService.copyTimetable(section.sectionId, sectionId, branchId, role);
      queryClient.invalidateQueries({queryKey: ['timetableSection', sectionId]});
      queryClient.invalidateQueries({queryKey: ['timetablesForBranch', branchId]});
      refetch();
      Alert.alert('Copied!', `${copied} periods copied from ${section.className} Section ${section.sectionName}.`);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to copy timetable.');
    }
  };

  // Sections available to copy from (all other sections in branch)
  const copyableSections = useMemo(
    () => branchTimetables.filter(tt => tt.sectionId !== sectionId && tt.periods?.some(p => p.subject)),
    [branchTimetables, sectionId],
  );

  const canPublish = canPublishTimetable(role);
  const canDelete = canDeleteTimetable(role);
  const canManage = canManageTimetable(role);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const periodNums = Array.from({length: timetableService.MAX_PERIODS}, (_, i) => i + 1);
  const {filledCount, totalSlots} = timetableStatus;

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
              <Text style={styles.headerSub}>
                {filledCount}/{totalSlots} periods filled
              </Text>
            </View>
            {saving || publishing ? <ActivityIndicator size="small" color={colors.white} /> : null}
          </View>

          {/* Status + Actions row */}
          <View style={styles.headerActions}>
            {/* Status badge */}
            <View style={[styles.headerStatusBadge,
              {backgroundColor: isPublished ? 'rgba(34,197,94,0.25)' : 'rgba(234,179,8,0.25)'}]}>
              <MaterialCommunityIcons
                name={isPublished ? 'check-circle' : 'pencil-circle'}
                size={12}
                color={isPublished ? '#86efac' : '#fde047'}
              />
              <Text style={[styles.headerStatusText, {color: isPublished ? '#86efac' : '#fde047'}]}>
                {isPublished ? 'Published' : 'Draft'}
              </Text>
            </View>

            <View style={styles.headerActionBtns}>
              {/* Copy from section */}
              {canManage && copyableSections.length > 0 ? (
                <Pressable style={styles.headerActionBtn} onPress={() => setCopyPickerVisible(true)}>
                  <MaterialCommunityIcons name="content-copy" size={13} color="rgba(255,255,255,0.75)" />
                  <Text style={styles.headerActionBtnText}>Copy</Text>
                </Pressable>
              ) : null}

              {/* Publish / Unpublish */}
              {canPublish && timetable ? (
                isPublished ? (
                  canDelete ? (
                    <Pressable style={[styles.headerActionBtn, styles.unpublishBtn]} onPress={handleUnpublish}>
                      <MaterialCommunityIcons name="eye-off-outline" size={13} color={colors.white} />
                      <Text style={styles.headerActionBtnText}>Unpublish</Text>
                    </Pressable>
                  ) : null
                ) : (
                  <Pressable style={[styles.headerActionBtn, styles.publishBtn]} onPress={handlePublish}>
                    <MaterialCommunityIcons name="send-check-outline" size={13} color={colors.white} />
                    <Text style={styles.headerActionBtnText}>Publish</Text>
                  </Pressable>
                )
              ) : null}

              {/* Delete */}
              {canDelete && timetable ? (
                <Pressable style={styles.deleteBtn} onPress={handleDeleteTimetable}>
                  <MaterialCommunityIcons name="delete-outline" size={14} color="rgba(255,255,255,0.6)" />
                </Pressable>
              ) : null}
            </View>
          </View>
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
                  onPress={canManage ? handleCellPress : () => {}}
                />
              ))}
            </View>
          ))}
        </Animated.View>

        {/* ── Validation summary ── */}
        {timetable && canManage ? (() => {
          const validation = timetableService.validateTimetable(timetable.periods);
          if (validation.errors.length === 0 && validation.warnings.length === 0) {return null;}
          return (
            <Animated.View entering={FadeInDown.delay(120).duration(240).springify()} style={styles.validationBox}>
              {validation.errors.map((e, i) => (
                <View key={i} style={styles.validationRow}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={13} color={colors.danger} />
                  <Text style={[styles.validationText, {color: colors.danger}]}>{e.message}</Text>
                </View>
              ))}
              {validation.warnings.map((w, i) => (
                <View key={i} style={styles.validationRow}>
                  <MaterialCommunityIcons name="information-outline" size={13} color={colors.warning} />
                  <Text style={[styles.validationText, {color: colors.warning}]}>{w}</Text>
                </View>
              ))}
            </Animated.View>
          );
        })() : null}

        {/* ── Legend ── */}
        <View style={styles.legendRow}>
          <MaterialCommunityIcons name="information-outline" size={12} color={colors.textMuted} />
          <Text style={styles.legendText}>
            {canManage
              ? 'Tap empty cell to assign · Tap filled cell to edit or clear'
              : 'View-only mode'}
          </Text>
        </View>

        <View style={{height: spacing.xxxl}} />
      </ScrollView>

      <PeriodModal
        visible={modalVisible}
        period={selectedPeriod}
        teachers={teachers}
        onSave={handleSavePeriod}
        onClear={handleClearPeriod}
        onClose={() => setModalVisible(false)}
      />

      <SectionPickerModal
        visible={copyPickerVisible}
        sections={copyableSections}
        onSelect={handleCopyFrom}
        onClose={() => setCopyPickerVisible(false)}
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

      <ConfirmationModal
        visible={publishConfirmVisible}
        title="Publish Timetable?"
        message="Once published, students, parents, and teachers will immediately see this timetable."
        confirmLabel="Publish Now"
        cancelLabel="Cancel"
        onConfirm={confirmPublish}
        onCancel={() => setPublishConfirmVisible(false)}
      />

      <ConfirmationModal
        visible={unpublishConfirmVisible}
        title="Unpublish Timetable?"
        message="The timetable will be hidden from students, parents, and teachers until republished."
        confirmLabel="Unpublish"
        cancelLabel="Cancel"
        isDestructive
        onConfirm={confirmUnpublish}
        onCancel={() => setUnpublishConfirmVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  content: {padding: spacing.md},
  center: {alignItems: 'center', flex: 1, justifyContent: 'center'},

  // ── Header ──
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
  headerRow: {alignItems: 'center', flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md},
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

  headerActions: {alignItems: 'center', flexDirection: 'row', gap: spacing.sm},
  headerStatusBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  headerStatusText: {fontSize: 10, fontWeight: '800'},
  headerActionBtns: {alignItems: 'center', flex: 1, flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end'},
  headerActionBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.card,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  publishBtn: {backgroundColor: 'rgba(34,197,94,0.35)'},
  unpublishBtn: {backgroundColor: 'rgba(239,68,68,0.3)'},
  headerActionBtnText: {color: colors.white, fontSize: 11, fontWeight: '700'},
  deleteBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
    paddingHorizontal: 4,
  },

  // ── Grid ──
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
    minHeight: 58,
    padding: 3,
  },
  cellEmpty: {
    backgroundColor: colors.background,
    borderColor: `${colors.border}88`,
  },
  cellSubject: {fontSize: 8, fontWeight: '800', textAlign: 'center'},
  cellTeacher: {color: colors.textMuted, fontSize: 7, marginTop: 1, textAlign: 'center'},
  cellTime: {color: colors.textSoft, fontSize: 7, marginTop: 1, textAlign: 'center'},

  // ── Validation ──
  validationBox: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1.5,
    gap: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  validationRow: {alignItems: 'flex-start', flexDirection: 'row', gap: spacing.xs},
  validationText: {flex: 1, fontSize: 11, lineHeight: 16},

  legendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  legendText: {...typography.caption, color: colors.textMuted, textAlign: 'center'},

  // ── Period Modal ──
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
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
  teacherPickerBtn: {cursor: 'pointer'},
  timeRow: {flexDirection: 'row', gap: spacing.sm},
  timeField: {flex: 1},
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    marginTop: spacing.xl,
  },
  clearBtn: {
    alignItems: 'center',
    borderColor: colors.danger,
    borderRadius: radius.card,
    borderWidth: 1.5,
    flex: 1,
    paddingVertical: spacing.sm,
  },
  clearBtnText: {color: colors.danger, fontSize: 13, fontWeight: '700'},
  cancelBtn: {
    alignItems: 'center',
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

  // ── Teacher Picker ──
  pickerOverlay: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.hero,
    borderTopRightRadius: radius.hero,
    maxHeight: '75%',
    ...shadows.clayModal,
  },
  pickerHeader: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  pickerTitle: {...typography.subtitle, color: colors.text},
  pickerClose: {padding: 4},
  pickerSearch: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: spacing.sm,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pickerSearchInput: {color: colors.text, flex: 1, fontSize: 14},
  teacherRow: {
    alignItems: 'center',
    borderBottomColor: colors.borderLight,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  teacherAvatar: {
    alignItems: 'center',
    backgroundColor: colors.primaryFaint,
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  teacherAvatarText: {color: colors.primary, fontSize: 15, fontWeight: '800'},
  teacherInfo: {flex: 1},
  teacherName: {...typography.body, color: colors.text, fontWeight: '600'},
  teacherDes: {...typography.caption, color: colors.textMuted},
  pickerEmpty: {alignItems: 'center', padding: spacing.xxl},
  pickerEmptyText: {...typography.caption, color: colors.textMuted},

  // ── Section Picker ──
  sectionPickerModal: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    maxHeight: '70%',
    padding: spacing.lg,
    width: '100%',
    ...shadows.clayModal,
  },
  sectionPickerSub: {...typography.caption, color: colors.textMuted, marginBottom: spacing.md, textAlign: 'center'},
  sectionPickerList: {maxHeight: 280},
  sectionPickerRow: {
    alignItems: 'center',
    borderBottomColor: colors.borderLight,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  sectionPickerLabel: {...typography.body, color: colors.text, flex: 1},
});

export default TimetableEditorScreen;
