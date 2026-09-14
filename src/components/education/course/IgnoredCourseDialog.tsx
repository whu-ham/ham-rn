/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2026/9/14
 */
import React, {useEffect} from 'react';
import '@/i18n/i18n';
import {BackHandler, ScrollView, StyleSheet, Text, View} from 'react-native';
import Color from 'color';
import {useTranslation} from 'react-i18next';
import type {CourseEntity} from '@/business/education/course';
import {useColor} from '@/utils/color/color';
import PrimaryButton from '@/utils/ui/PrimaryButton';

/**
 * Tells the user which courses the parser could not place on the timetable,
 * and why. It is a notice, not a choice: the user cannot fix a week string the
 * education system sent, so offering "import anyway" only asks them to
 * authorise a timetable they cannot evaluate. The import proceeds once they
 * acknowledge it.
 */
const IgnoredCourseDialog = ({
  courses,
  canImport,
  onAcknowledge,
  testID,
}: {
  courses: CourseEntity[];
  canImport: boolean;
  onAcknowledge: () => void;
  testID?: string;
}): React.ReactElement => {
  const {t} = useTranslation();
  const color = useColor();

  // The host app blocks on a callback, so the back button must run the same
  // acknowledgement it would on a tap — otherwise it dismisses the dialog and
  // leaves the host waiting forever.
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        onAcknowledge();
        return true;
      },
    );
    return () => subscription.remove();
  }, [onAcknowledge]);

  return (
    <View
      testID={testID}
      style={[
        styles.overlay,
        {backgroundColor: Color(color.ham_text_primary).alpha(0.45).hexa()},
      ]}>
      <View
        testID={testID ? `${testID}-card` : undefined}
        style={[styles.card, {backgroundColor: color.ham_bg_b2}]}>
        <Text
          testID={testID ? `${testID}-title` : undefined}
          style={[styles.title, {color: color.ham_text_primary}]}>
          {t('education.ignored_course_title')}
        </Text>
        <Text
          testID={testID ? `${testID}-summary` : undefined}
          style={[styles.summary, {color: color.ham_text_secondary}]}>
          {canImport
            ? t('education.ignored_course_summary', {count: courses.length})
            : t('education.ignored_course_summary_all_failed', {
                count: courses.length,
              })}
        </Text>

        <ScrollView
          accessibilityLabel="ignoredCourseList"
          testID={testID ? `${testID}-list` : undefined}
          style={styles.list}
          nestedScrollEnabled>
          {courses.map((course, index) => (
            <View
              key={`${course.courseId}-${index}`}
              accessibilityLabel={`ignoredCourse-${course.name}`}
              testID={testID ? `${testID}-item-${index}` : undefined}
              style={styles.item}>
              <Text
                testID={testID ? `${testID}-item-name-${index}` : undefined}
                style={[styles.itemName, {color: color.ham_text_primary}]}>
                {course.name ||
                  course.courseId ||
                  t('education.unnamed_course')}
              </Text>
              <Text
                testID={testID ? `${testID}-item-reason-${index}` : undefined}
                style={[styles.itemReason, {color: color.ham_text_secondary}]}>
                {course.rawWeekText
                  ? t('education.ignored_course_reason', {
                      weekText: course.rawWeekText,
                    })
                  : t('education.ignored_course_reason_missing')}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.buttonRow}>
          <PrimaryButton
            accessibilityLabel="ignoredCourseAcknowledge"
            testID={testID ? `${testID}-confirm` : undefined}
            label={t('education.ignored_course_ok')}
            onPress={onAcknowledge}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // The button is full-width inside the card, so centring it is just a matter
  // of not constraining it; the row exists to keep the list from pushing it.
  buttonRow: {
    alignItems: 'center',
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    maxHeight: '80%',
    padding: 20,
    width: '85%',
  },
  item: {
    paddingVertical: 6,
  },
  itemName: {
    fontSize: 14,
  },
  itemReason: {
    fontSize: 12,
    marginTop: 2,
  },
  list: {
    marginBottom: 8,
    marginTop: 12,
  },
  overlay: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  summary: {
    fontSize: 13,
    marginTop: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
});

export default IgnoredCourseDialog;
