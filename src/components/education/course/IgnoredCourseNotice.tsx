/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2026/9/14
 */
import React from 'react';
import '@/i18n/i18n';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
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
 *
 * This renders inline rather than as a modal. The host already presents the
 * course screen inside a `.sheet` (CourseSettingViewBasicSection), so a dialog
 * here would be a modal stacked on a sheet — a second layer of chrome, a
 * scrim behind the scrim, and on Android a second back-target. Filling the
 * sheet we were given is the simpler thing and matches how the host frames it.
 */
const IgnoredCourseNotice = ({
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

  return (
    <View
      testID={testID}
      style={[styles.container, {backgroundColor: color.ham_bg_b1}]}>
      <View style={styles.content}>
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
          style={styles.list}>
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
  buttonRow: {
    marginTop: 8,
  },
  container: {
    flex: 1,
    width: '100%',
  },
  // Sized by its content instead of filling the sheet. As `flex: 1` the column
  // claimed every pixel the sheet had and pushed the button down to the bottom
  // edge, ~1600dp below the last row. Now it sits just under the list.
  content: {
    flexShrink: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
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
  // The ScrollView must take its rows' height and no more. React Native gives
  // ScrollView a default `flexGrow: 1`, so without pinning it to 0 the list
  // swallows every spare pixel: a short list strands the button at the very
  // bottom of the sheet, and a long one pushes it off-screen entirely.
  list: {
    flexGrow: 0,
    marginTop: 12,
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

export default IgnoredCourseNotice;
