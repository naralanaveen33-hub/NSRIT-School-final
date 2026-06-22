import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {Text} from 'react-native-paper';
import Animated, {FadeInDown, FadeInUp} from 'react-native-reanimated';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, radius, shadows, spacing, typography} from '../../theme';

const TimetableDashboardScreen = ({navigation}) => (
  <View style={styles.root}>
    {/* Background decoration */}
    <View style={styles.topBlob} />
    <View style={styles.bottomBlob} />

    <View style={styles.content}>
      {/* Illustration card */}
      <Animated.View entering={FadeInDown.delay(60).duration(380).springify()} style={styles.illustrationCard}>
        <View style={styles.iconRing}>
          <View style={styles.iconInner}>
            <MaterialCommunityIcons name="calendar-clock" size={52} color={colors.secondary} />
          </View>
        </View>

        <View style={styles.comingSoonBadge}>
          <MaterialCommunityIcons name="clock-outline" size={11} color={colors.warning} />
          <Text style={styles.comingSoonBadgeText}>Coming Soon</Text>
        </View>

        <Text style={styles.featureTitle}>Timetable Management</Text>
        <Text style={styles.featureDesc}>
          Build and manage weekly class schedules for every section in your
          branch — period-by-period, day-by-day.
        </Text>

        <View style={styles.divider} />

        <View style={styles.featureList}>
          {[
            {icon: 'table-edit',             label: 'Visual period-by-period editor'},
            {icon: 'account-tie-outline',    label: 'Assign teachers to each slot'},
            {icon: 'calendar-week-outline',  label: 'Monday–Saturday scheduling'},
            {icon: 'school-outline',         label: 'Section-wise timetable overview'},
          ].map(f => (
            <View key={f.label} style={styles.featureItem}>
              <View style={styles.featureItemDot}>
                <MaterialCommunityIcons name={f.icon} size={14} color={colors.secondary} />
              </View>
              <Text style={styles.featureItemText}>{f.label}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Info strip */}
      <Animated.View entering={FadeInUp.delay(220).duration(340).springify()} style={styles.infoStrip}>
        <MaterialCommunityIcons name="information-outline" size={16} color={colors.primary} style={{marginTop: 1}} />
        <Text style={styles.infoText}>
          This feature is under active development and will be available in an upcoming release.
        </Text>
      </Animated.View>

      {/* Back button */}
      <Animated.View entering={FadeInUp.delay(300).duration(320).springify()}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({pressed}) => [styles.backBtn, pressed && styles.backBtnPressed]}>
          <MaterialCommunityIcons name="arrow-left" size={18} color={colors.white} />
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </Animated.View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    flex: 1,
    overflow: 'hidden',
  },
  topBlob: {
    backgroundColor: `${colors.secondary}08`,
    borderRadius: 200,
    height: 340,
    position: 'absolute',
    right: -80,
    top: -100,
    width: 340,
  },
  bottomBlob: {
    backgroundColor: `${colors.primary}07`,
    borderRadius: 200,
    bottom: -80,
    height: 280,
    left: -60,
    position: 'absolute',
    width: 280,
  },

  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },

  illustrationCard: {
    ...shadows.clayDeep,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.hero,
    borderWidth: 1.5,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    width: '100%',
  },

  iconRing: {
    alignItems: 'center',
    backgroundColor: `${colors.secondary}10`,
    borderColor: `${colors.secondary}25`,
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 108,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    width: 108,
  },
  iconInner: {
    alignItems: 'center',
    backgroundColor: `${colors.secondary}14`,
    borderRadius: radius.pill,
    height: 84,
    justifyContent: 'center',
    width: 84,
  },

  comingSoonBadge: {
    alignItems: 'center',
    backgroundColor: `${colors.warning}18`,
    borderColor: `${colors.warning}40`,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 5,
    marginBottom: spacing.md,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  comingSoonBadgeText: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  featureTitle: {
    ...typography.title,
    color: colors.text,
    fontSize: 22,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  featureDesc: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 20,
    textAlign: 'center',
  },

  divider: {
    backgroundColor: colors.borderLight,
    height: 1.5,
    marginVertical: spacing.lg,
    width: '100%',
  },

  featureList: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  featureItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  featureItemDot: {
    alignItems: 'center',
    backgroundColor: `${colors.secondary}12`,
    borderRadius: radius.sm,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  featureItemText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 13,
  },

  infoStrip: {
    alignItems: 'flex-start',
    backgroundColor: colors.primaryFaint,
    borderColor: colors.primarySoft,
    borderRadius: radius.card,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    width: '100%',
  },
  infoText: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 18,
  },

  backBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xxl,
    paddingVertical: 14,
    ...shadows.fab,
  },
  backBtnPressed: {opacity: 0.88},
  backBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
});

export default TimetableDashboardScreen;
